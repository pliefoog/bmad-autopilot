/**
 * Pure Store Updater Component
 *
 * Single point for updating NMEA store.
 * Handles data freshness validation and store synchronization.
 *
 * Key Principles:
 * - Single responsibility - only store updates
 * - Immediate updates - no throttling or delays
 * - Data freshness validation
 */

import { log } from '../../../utils/logging/logger';

import { useNmeaStore } from '../../../store/nmeaStore';
import { sensorRegistry } from '../../SensorDataRegistry';
import { nmeaSensorProcessor, type SensorUpdate } from './NmeaSensorProcessor';
import type { ParsedNmeaMessage } from '../parsing/PureNmeaParser';
import type { BinaryPgnFrame } from '../connection/PureConnectionManager';
import { pgnParser } from '../pgnParser';

export interface UpdateResult {
  updated: boolean;
  updatedFields: string[];
  reason?: string;
}


export class PureStoreUpdater {
  // Stateless utility class - no singleton needed
  constructor() {}

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
   * Process parsed NMEA message using NmeaSensorProcessor
   * Direct sensor-based processing path
   */
  processNmeaMessage(parsedMessage: ParsedNmeaMessage): UpdateResult {
    try {
      // Detect message format: NMEA 2000 (PCDIN/BINARY/PGN*) vs NMEA 0183
      const messageFormat = 
        parsedMessage.messageType === 'PCDIN' || 
        parsedMessage.messageType === 'BINARY' ||
        parsedMessage.messageType.startsWith('PGN')
          ? 'NMEA 2000'
          : 'NMEA 0183';

      // Process message using new NmeaSensorProcessor
      const result = nmeaSensorProcessor.processMessage(parsedMessage);

      if (!result.success) {
        // Log processing errors but don't treat as failures
        if (useNmeaStore.getState().debugMode) {
          log.app('NMEA processing error', () => ({ errors: result.errors?.join(', ') }));
        }
        return {
          updated: false,
          updatedFields: [],
          reason: `Processing failed: ${result.errors?.join(', ')}`,
        };
      }

      // Apply sensor updates to store (with messageFormat)
      if (result.updates && result.updates.length > 0) {
        return this.applySensorUpdates(result.updates, messageFormat);
      }
      return {
        updated: false,
        updatedFields: [],
        reason: 'No sensor updates generated',
      };
    } catch (err) {
      log.app('Error processing NMEA message', () => ({
        error: err instanceof Error ? err.message : String(err),
      }));
      return {
        updated: false,
        updatedFields: [],
        reason: `Exception: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Process binary NMEA 2000 PGN frame directly
   */
  processBinaryPgnFrame(frame: BinaryPgnFrame): UpdateResult {
    try {
      // Convert binary frame to sensor updates based on PGN
      const updates = this.parseBinaryPgnToUpdates(frame);

      if (updates.length > 0) {
        // Binary frames are always NMEA 2000
        return this.applySensorUpdates(updates, 'NMEA 2000');
      }

      return {
        updated: false,
        updatedFields: [],
        reason: 'No sensor updates generated from binary PGN',
      };
    } catch (err) {
      log.app('Error processing binary PGN frame', () => ({
        error: err instanceof Error ? err.message : String(err),
      }));
      return {
        updated: false,
        updatedFields: [],
        reason: `Binary frame exception: ${
          err instanceof Error ? err.message : 'Unknown error'
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
                  data: {
                    value: envData.temperature,
                    location: 'seawater' as const,
                    units: 'C' as const,
                  },
                });
              }
            } else if (source === 1 || source === 2) {
              // Source 1/2 = Outside/Inside air → weather sensor
              const weatherData: any = {};

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
            const weatherData: any = {};

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
              data: {
                voltage: batteryData.batteryVoltage,
                current: batteryData.batteryCurrent,
                temperature: batteryData.batteryTemperature,
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
    } catch (err) {
      log.app('Error parsing PGN', () => ({
        pgn: frame.pgn,
        error: err instanceof Error ? err.message : String(err),
      }));
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
    messageFormat?: 'NMEA 0183' | 'NMEA 2000',
  ): UpdateResult {
    const updatedFields: string[] = [];
    let anyUpdated = false;

    // Apply each update immediately - no delays
    for (const update of updates) {
      const fieldKey = `${update.sensorType}.${update.instance}`;

      // Update sensor data in store
      try {
        // Update sensor via registry (primary data path)
        sensorRegistry.update(update.sensorType, update.instance, update.data);
        
        updatedFields.push(fieldKey);
        anyUpdated = true;
      } catch (err) {
        log.app('Store update failed', () => ({
          sensor: fieldKey,
          error: err instanceof Error ? err.message : String(err),
        }));
      }
    }
    
    // Update UI metadata once (not per-sensor)
    if (anyUpdated && messageFormat) {
      useNmeaStore.getState().updateMessageMetadata(messageFormat);
    }
    
    return {
      updated: anyUpdated,
      updatedFields: updatedFields,
      reason: anyUpdated ? `Updated ${updatedFields.length} sensors` : 'No updates applied',
    };
  }
}

// Export instance - stateless utility
export const pureStoreUpdater = new PureStoreUpdater();
