/**
 * Pure Store Updater Component
 *
 * Single point for updating NMEA store with intelligent throttling and batching.
 * Handles data freshness, update frequency control, and store synchronization.
 *
 * Key Principles:
 * - Single responsibility - only store updates
 * - Intelligent throttling to prevent UI thrashing
 * - Batch updates for performance
 * - Data freshness validation
 */

import { log } from '../../../utils/logging/logger';

import { useNmeaStore } from '../../../store/nmeaStore';
import { sensorRegistry } from '../../SensorDataRegistry';
import { nmeaSensorProcessor, type SensorUpdate } from './NmeaSensorProcessor';
import type { ParsedNmeaMessage } from '../parsing/PureNmeaParser';
import type { BinaryPgnFrame } from '../connection/PureConnectionManager';
import { pgnParser } from '../pgnParser';
// Errors and warnings ALWAYS show regardless of logging toggle
const error = console.error.bind(console);
const warn = console.warn.bind(console);

export interface UpdateResult {
  updated: boolean;
  throttled: boolean;
  batchedFields: string[];
  reason?: string;
}

export interface UpdateOptions {
  throttleMs?: number;
  forceBatch?: boolean;
  skipThrottling?: boolean;
}

export class PureStoreUpdater {
  private static instance: PureStoreUpdater;

  // Throttling management
  private lastUpdateTimes: Map<string, number> = new Map();
  private readonly DEFAULT_THROTTLE_MS = 1000; // 1 second default throttling
  
  // Global message-level throttling to prevent iOS "Maximum update depth exceeded"
  // iOS processes messages faster than web, causing too many rapid store updates
  private lastMessageProcessTime = 0;
  private readonly MESSAGE_THROTTLE_MS = 50; // Minimum 50ms between message processing

  // Update statistics
  private updateCount = 0;
  private throttledCount = 0;

  static getInstance(): PureStoreUpdater {
    if (!PureStoreUpdater.instance) {
      PureStoreUpdater.instance = new PureStoreUpdater();
    }
    return PureStoreUpdater.instance;
  }

  /**
   * Update connection status in store
   */
  updateConnectionStatus(status: {
    state: 'disconnected' | 'connecting' | 'connected' | 'error';
  }): void {
    // Map connection manager states to store states
    const storeState = status.state === 'error' ? 'disconnected' : status.state;
    useNmeaStore.getState().setConnectionStatus(storeState);
  }

  /**
   * Update error in store
   */
  updateError(error: string): void {
    useNmeaStore.getState().setLastError(error);
  }

  /**
   * Add raw NMEA sentence to store - NMEA Store v2.0 (sensor data only)
   */
  addRawMessage(sentence: string): void {
    // NMEA Store v2.0 focuses on clean sensor data - raw sentences not stored
    // Log for debugging if needed
    if (useNmeaStore.getState().debugMode) {
      log('[PureStoreUpdater] Raw NMEA:', sentence);
    }
  }

  /**
   * Process parsed NMEA message using NmeaSensorProcessor
   * Direct sensor-based processing path
   */
  processNmeaMessage(parsedMessage: ParsedNmeaMessage, options: UpdateOptions = {}): UpdateResult {
    try {
      // CRITICAL: Global message-level throttling for iOS
      // Prevents "Maximum update depth exceeded" by spacing out message processing
      const now = Date.now();
      if (now - this.lastMessageProcessTime < this.MESSAGE_THROTTLE_MS) {
        return {
          updated: false,
          throttled: true,
          batchedFields: [],
          reason: `Message throttled (${now - this.lastMessageProcessTime}ms since last)`,
        };
      }
      this.lastMessageProcessTime = now;

      // Detect message format (NMEA 0183 vs NMEA 2000)
      const messageFormat = this.detectMessageFormat(parsedMessage);

      // Process message using new NmeaSensorProcessor
      const result = nmeaSensorProcessor.processMessage(parsedMessage);

      if (!result.success) {
        // Log processing errors but don't treat as failures
        if (useNmeaStore.getState().debugMode) {
          warn('[PureStoreUpdater] NMEA processing:', result.errors?.join(', '));
        }
        return {
          updated: false,
          throttled: false,
          batchedFields: [],
          reason: `Processing failed: ${result.errors?.join(', ')}`,
        };
      }

      // Apply sensor updates to store (with messageFormat)
      if (result.updates && result.updates.length > 0) {
        return this.applySensorUpdates(result.updates, options, messageFormat);
      }
      return {
        updated: false,
        throttled: false,
        batchedFields: [],
        reason: 'No sensor updates generated',
      };
    } catch (error) {
      error('[PureStoreUpdater] Error processing NMEA message:', error);
      return {
        updated: false,
        throttled: false,
        batchedFields: [],
        reason: `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Process binary NMEA 2000 PGN frame directly
   */
  processBinaryPgnFrame(frame: BinaryPgnFrame, options: UpdateOptions = {}): UpdateResult {
    try {
      const hexData = Array.from(frame.data)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join('');

      // Convert binary frame to sensor updates based on PGN
      const updates = this.parseBinaryPgnToUpdates(frame);

      if (updates.length > 0) {
        // Binary frames are always NMEA 2000
        return this.applySensorUpdates(updates, options, 'NMEA 2000');
      }

      return {
        updated: false,
        throttled: false,
        batchedFields: [],
        reason: 'No sensor updates generated from binary PGN',
      };
    } catch (error) {
      error('[PureStoreUpdater] Error processing binary PGN frame:', error);
      return {
        updated: false,
        throttled: false,
        batchedFields: [],
        reason: `Binary frame exception: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * Parse binary PGN frame to sensor updates
   */
  private parseBinaryPgnToUpdates(frame: BinaryPgnFrame): SensorUpdate[] {
    const hexData = Array.from(frame.data)
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join('');

    const timestamp = Date.now();
    const updates: SensorUpdate[] = [];

    try {
      switch (frame.pgn) {
        case 128267: {
          // Water Depth
          const depthData = pgnParser.parseDepthPgn(hexData);
          if (depthData) {
            updates.push({
              sensorType: 'depth',
              instance: 0,
              value: depthData.depth,
              unit: 'meters',
              timestamp,
              data: {
                depth: depthData.depth,
                referencePoint: 'transducer' as const,
                sentenceType: 'DPT' as const,
              },
            });
          }
          break;
        }

        case 128259: {
          // Speed
          const speedData = pgnParser.parseSpeedPgn(hexData);
          if (speedData) {
            updates.push({
              sensorType: 'speed',
              instance: 0,
              value: speedData.speed,
              unit: 'knots',
              timestamp,
              data: {
                throughWater: speedData.speed,
              },
            });
          }
          break;
        }

        case 130306: {
          // Wind
          const windData = pgnParser.parseWindPgn(hexData);
          if (windData) {
            updates.push({
              sensorType: 'wind',
              instance: 0,
              value: windData.windSpeed,
              unit: 'knots',
              timestamp,
              data: {
                speed: windData.windSpeed,
                direction: windData.windAngle,
              },
            });
          }
          break;
        }

        case 129029: {
          // GPS
          const gpsData = pgnParser.parseGPSPgn(hexData);
          if (gpsData) {
            updates.push({
              sensorType: 'gps',
              instance: 0,
              value: gpsData.latitude, // Primary value for tracking
              unit: 'degrees',
              timestamp,
              data: {
                position: {
                  latitude: gpsData.latitude,
                  longitude: gpsData.longitude,
                },
              },
            });
          }
          break;
        }

        case 127250: {
          // Heading (PGN doesn't specify magnetic/true, assume magnetic)
          const headingData = pgnParser.parseHeadingPgn(hexData);
          if (headingData) {
            updates.push({
              sensorType: 'compass',
              instance: 0,
              value: headingData.heading,
              unit: 'degrees',
              timestamp,
              data: {
                magneticHeading: headingData.heading,
              },
            });
          }
          break;
        }

        case 130310: {
          // Environmental Data (Temperature, Humidity, Pressure) - Source-based routing
          const envData = pgnParser.parseTemperaturePgn(hexData);
          if (envData) {
            const source = envData.source;

            if (source === 0) {
              // Source 0 = Sea temperature → temperature sensor
              if (envData.temperature !== undefined) {
                updates.push({
                  sensorType: 'temperature',
                  instance: 0,
                  value: envData.temperature,
                  unit: 'celsius',
                  timestamp,
                  data: {
                    value: envData.temperature,
                    location: 'seawater' as const,
                    units: 'C' as const,
                  },
                });
              }
            } else if (source === 1 || source === 2) {
              // Source 1/2 = Outside/Inside air → weather sensor
              const weatherData: any = { timestamp };

              if (envData.temperature !== undefined) {
                weatherData.airTemperature = envData.temperature;
              }
              if (envData.humidity !== undefined) {
                weatherData.humidity = envData.humidity;
              }
              if (envData.pressure !== undefined) {
                weatherData.pressure = envData.pressure;
              }

              updates.push({
                sensorType: 'weather',
                instance: 0,
                value: envData.pressure || envData.temperature || 0,
                unit: envData.pressure ? 'pascals' : 'celsius',
                timestamp,
                data: weatherData,
              });
            } else {
              // Source 3-255 = Other locations → temperature sensor
              if (envData.temperature !== undefined) {
                const locationMap: Record<number, string> = {
                  3: 'engine-room',
                  4: 'cabin',
                  5: 'refrigerator',
                  6: 'freezer',
                  // Add more as needed
                };
                const location = locationMap[source] || 'unknown';

                updates.push({
                  sensorType: 'temperature',
                  instance: source,
                  value: envData.temperature,
                  unit: 'celsius',
                  timestamp,
                  data: {
                    value: envData.temperature,
                    location: location as any,
                    units: 'C' as const,
                  },
                });
              }
            }
          }
          break;
        }

        case 130311: {
          // Environmental Parameters (Atmospheric) - Always → weather sensor
          const atmData = pgnParser.parseEnvironmentalPgn(hexData);
          if (atmData) {
            const weatherData: any = { timestamp };

            if (atmData.temperature !== undefined) {
              weatherData.airTemperature = atmData.temperature;
            }
            if (atmData.humidity !== undefined) {
              weatherData.humidity = atmData.humidity;
            }
            if (atmData.pressure !== undefined) {
              weatherData.pressure = atmData.pressure;
            }

            updates.push({
              sensorType: 'weather',
              instance: atmData.instance || 0,
              value: atmData.pressure || atmData.temperature || 0,
              unit: atmData.pressure ? 'pascals' : 'celsius',
              timestamp,
              data: weatherData,
            });
          }
          break;
        }

        case 127245: {
          // Rudder
          const rudderData = pgnParser.parseRudderPgn(hexData);
          if (rudderData) {
            updates.push({
              sensorType: 'autopilot',
              instance: 0,
              value: rudderData.rudderAngle,
              unit: 'degrees',
              timestamp,
              data: {
                rudderAngle: rudderData.rudderAngle,
              },
            });
          }
          break;
        }

        case 127488: // Engine Rapid
        case 127489: {
          // Engine Dynamic
          const engineData = pgnParser.parseEnginePgn(frame.pgn, hexData, frame.source);
          if (engineData && engineData.engineSpeed !== undefined) {
            updates.push({
              sensorType: 'engine',
              instance: frame.source, // Engine instance from source address
              value: engineData.engineSpeed,
              unit: 'rpm',
              timestamp,
              data: {
                rpm: engineData.engineSpeed,
              },
            });
          }
          break;
        }

        case 127508: {
          // Battery
          const batteryData = pgnParser.parseBatteryPgn(frame.pgn, hexData, frame.source);
          if (batteryData) {
            updates.push({
              sensorType: 'battery',
              instance: batteryData.instance,
              value: batteryData.batteryVoltage || 0,
              unit: 'volts',
              timestamp,
              data: {
                voltage: batteryData.batteryVoltage,
                current: batteryData.batteryCurrent,
                stateOfCharge: batteryData.stateOfCharge,
                temperature: batteryData.temperature,
              },
            });
          }
          break;
        }

        case 127505: {
          // Tank
          const tankData = pgnParser.parseTankPgn(frame.pgn, hexData, frame.source);
          if (tankData && tankData.level !== undefined) {
            updates.push({
              sensorType: 'tank',
              instance: tankData.instance,
              value: tankData.level,
              unit: 'percent',
              timestamp,
              data: {
                level: tankData.level,
                type: tankData.fluidType,
                capacity: tankData.capacity,
              },
            });
          }
          break;
        }
      }
    } catch (error) {
      console.error(`[PureStoreUpdater] Error parsing PGN ${frame.pgn}:`, error);
    }

    return updates;
  }

  /**
   * Apply sensor updates from NmeaSensorProcessor to NMEA Store v2.0
   *
   * ARCHITECTURE v2.0: NO MERGING - Each update passes through independently
   * - Each NMEA message → one metric update → immediate updateSensorData call
   * - No accumulation, no batching, no merging across updates
   * - SensorInstance handles versioning, history, and change detection
   * - Version counters only increment when values actually change
   *
   * WHY NO MERGING:
   * - Battery XDR sends 4 separate messages (V/I/C/P) that should trigger 4 separate updates
   * - Merging causes: "fields: Array(3)" instead of "fields: Array(1)"
   * - Each metric should update independently to trigger fine-grained subscriptions
   */
  private applySensorUpdates(
    updates: SensorUpdate[],
    options: UpdateOptions = {},
    messageFormat?: 'NMEA 0183' | 'NMEA 2000',
  ): UpdateResult {
    const updatedFields: string[] = [];
    let anyUpdated = false;

    const { throttleMs = this.DEFAULT_THROTTLE_MS, skipThrottling = false } = options;

    // Apply each update independently with field-specific throttling
    for (const update of updates) {
      const fieldKey = `${update.sensorType}.${update.instance}`;
      // Use field-specific throttle settings (engine=0ms, wind/gps=500ms, depth=1500ms, etc.)
      const fieldThrottle = this.getFieldThrottleMs(update.sensorType);
      const effectiveThrottle = skipThrottling ? 0 : fieldThrottle;

      if (effectiveThrottle > 0 && this.isThrottled(fieldKey, effectiveThrottle)) {
        continue;
      }

      // Update sensor data in store
      try {
        // Debug: Log depth updates to trace data flow
        if (update.sensorType === 'depth') {
          log.depth('PureStoreUpdater calling updateSensorData', () => ({
            sensorType: update.sensorType,
            instance: update.instance,
            data: update.data,
            hasDepth: 'depth' in update.data,
            depthValue: (update.data as any).depth,
          }));
        }

        // Debug: Log battery updates to trace string field flow (chemistry field)
        if (update.sensorType === 'battery') {
          log.app('PureStoreUpdater calling updateSensorData for battery', () => ({
            sensorType: update.sensorType,
            instance: update.instance,
            data: update.data,
            hasChemistry: 'chemistry' in update.data,
            chemistryValue: (update.data as any).chemistry,
          }));
        }

        // Debug: Log engine updates to trace field flow
        if (update.sensorType == 'engine') {
          log.engine('PureStoreUpdater calling updateSensorData for engine', () => ({
            sensorType: update.sensorType,
            instance: update.instance,
            data: update.data,
            fields: Object.keys(update.data),
            coolantTemp: (update.data as any).coolantTemp,
            oilPressure: (update.data as any).oilPressure,
          }));
        }

        // Debug: Log speed updates to trace SOG/STW
        if (update.sensorType === 'speed') {
          log.speed('PureStoreUpdater calling updateSensorData for speed', () => ({
            sensorType: update.sensorType,
            instance: update.instance,
            data: update.data,
            fields: Object.keys(update.data),
            overGround: (update.data as any).overGround,
            throughWater: (update.data as any).throughWater,
          }));
        }

        // Update sensor via registry (primary data path)
        sensorRegistry.update(update.sensorType, update.instance, update.data);
        
        // Update UI metadata (message count, format)
        useNmeaStore.getState().updateMessageMetadata(messageFormat);
        updatedFields.push(fieldKey);
        anyUpdated = true;

        // Update throttle timestamp
        this.lastUpdateTimes.set(fieldKey, Date.now());
      } catch (error) {
        console.error(`[PureStoreUpdater] ❌ Store update FAILED for ${fieldKey}:`, error);
      }
    }
    return {
      updated: anyUpdated,
      throttled: false,
      batchedFields: updatedFields,
      reason: anyUpdated ? `Updated ${updatedFields.length} sensors` : 'All updates throttled',
    };
  }

  /**
   * Get field-specific throttle settings for sensor types
   */
  private getFieldThrottleMs(sensorType: string): number {
    // NO THROTTLING: Version-based subscriptions handle efficiency at React layer
    // Each NMEA message updates its metric immediately
    // Store handles version counters, only changed metrics trigger re-renders
    // This matches architecture principle: parse → update → done (no delays)
    return 0;
  }

  /**
   * Check if a specific field is throttled
   */
  private isThrottled(fieldKey: string, throttleMs: number): boolean {
    const lastUpdate = this.lastUpdateTimes.get(fieldKey);
    if (!lastUpdate) return false;
    return Date.now() - lastUpdate < throttleMs;
  }

  /**
   * Get update statistics
   */
  getStats(): {
    updateCount: number;
    throttledCount: number;
    throttleRate: number;
  } {
    const throttleRate = this.updateCount > 0 ? (this.throttledCount / this.updateCount) * 100 : 0;

    return {
      updateCount: this.updateCount,
      throttledCount: this.throttledCount,
      throttleRate: Math.round(throttleRate * 100) / 100,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.updateCount = 0;
    this.throttledCount = 0;
  }

  /**
   * Clear all throttling state
   */
  clearThrottling(): void {
    this.lastUpdateTimes.clear();
  }

  /**
   * Detect message format based on parsed message
   */
  private detectMessageFormat(parsedMessage: ParsedNmeaMessage): 'NMEA 0183' | 'NMEA 2000' {
    // Detect NMEA format from message type
    // NMEA 2000: PCDIN, BINARY, or PGN-related message types
    // NMEA 0183: Standard sentence types (DBT, VHW, MWV, etc.)
    const isNmea2000 = 
      parsedMessage.messageType === 'PCDIN' || 
      parsedMessage.messageType === 'BINARY' ||
      parsedMessage.messageType.startsWith('PGN');
    
    return isNmea2000 ? 'NMEA 2000' : 'NMEA 0183';
  }
}

// Export singleton instance
export const pureStoreUpdater = PureStoreUpdater.getInstance();
