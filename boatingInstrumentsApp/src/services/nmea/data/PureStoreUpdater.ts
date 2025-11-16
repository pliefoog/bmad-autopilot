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

import { useNmeaStore } from '../../../store/nmeaStore';
import type { TransformedNmeaData } from './PureDataTransformer';
import { nmeaSensorProcessor, type SensorUpdate } from './NmeaSensorProcessor';
import type { ParsedNmeaMessage } from '../parsing/PureNmeaParser';

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
  
  // Store bindings - NMEA Store v2.0 API - Using getters to avoid stale closures
  
  // Throttling management
  private lastUpdateTimes: Map<string, number> = new Map();
  private readonly DEFAULT_THROTTLE_MS = 1000; // 1 second default throttling
  
  // Batching management
  private pendingUpdates: Map<string, any> = new Map();
  private batchTimeout: any = null;
  private readonly BATCH_DELAY_MS = 100; // 100ms batch window
  
  // Update statistics
  private updateCount = 0;
  private throttledCount = 0;
  private batchedCount = 0;

  static getInstance(): PureStoreUpdater {
    if (!PureStoreUpdater.instance) {
      PureStoreUpdater.instance = new PureStoreUpdater();
    }
    return PureStoreUpdater.instance;
  }

  /**
   * Update store with transformed NMEA data
   */
  updateStore(data: TransformedNmeaData, options: UpdateOptions = {}): UpdateResult {
    this.updateCount++;
    
    const {
      throttleMs = this.DEFAULT_THROTTLE_MS,
      forceBatch = false,
      skipThrottling = false
    } = options;

    // Determine which fields are being updated
    const updatedFields = this.getUpdatedFields(data);
    
    // Check throttling for each field
    if (!skipThrottling) {
      const throttledFields = this.checkThrottling(updatedFields, throttleMs);
      if (throttledFields.length > 0) {
        this.throttledCount++;
        return {
          updated: false,
          throttled: true,
          batchedFields: [],
          reason: `Throttled fields: ${throttledFields.join(', ')}`
        };
      }
    }

    // Update timestamps for throttling
    this.updateThrottleTimestamps(updatedFields);

    // Perform store update
    if (forceBatch || this.shouldBatch(data)) {
      return this.batchUpdate(data, updatedFields);
    } else {
      return this.immediateUpdate(data, updatedFields);
    }
  }

  /**
   * Update connection status in store
   */
  updateConnectionStatus(status: { state: 'disconnected' | 'connecting' | 'connected' | 'error' }): void {
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
      console.log('[PureStoreUpdater] Raw NMEA:', sentence);
    }
  }

  /**
   * Process parsed NMEA message using NmeaSensorProcessor - NMEA Store v2.0 Direct Path
   * This is the NEW primary path that bypasses TransformedNmeaData
   */
  processNmeaMessage(parsedMessage: ParsedNmeaMessage, options: UpdateOptions = {}): UpdateResult {
    try {
      // Process message using new NmeaSensorProcessor
      const result = nmeaSensorProcessor.processMessage(parsedMessage);
      
      if (!result.success) {
        // Log processing errors but don't treat as failures
        if (useNmeaStore.getState().debugMode) {
          console.warn('[PureStoreUpdater] NMEA processing:', result.errors?.join(', '));
        }
        return {
          updated: false,
          throttled: false,
          batchedFields: [],
          reason: `Processing failed: ${result.errors?.join(', ')}`
        };
      }

      // Apply sensor updates to store
      if (result.updates && result.updates.length > 0) {
        return this.applySensorUpdates(result.updates, options);
      }
      return {
        updated: false,
        throttled: false,
        batchedFields: [],
        reason: 'No sensor updates generated'
      };

    } catch (error) {
      console.error('[PureStoreUpdater] Error processing NMEA message:', error);
      return {
        updated: false,
        throttled: false,
        batchedFields: [],
        reason: `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Apply sensor updates from NmeaSensorProcessor to NMEA Store v2.0
   * CRITICAL FIX: Merge multiple updates for same sensor/instance before throttling
   * This ensures XDR sentences with multiple measurements (temp+pressure+voltage) don't lose data
   */
  private applySensorUpdates(updates: SensorUpdate[], options: UpdateOptions = {}): UpdateResult {
    const updatedFields: string[] = [];
    let anyUpdated = false;

    const {
      throttleMs = this.DEFAULT_THROTTLE_MS,
      skipThrottling = false
    } = options;

    // CRITICAL: Merge updates for same sensor/instance to prevent data loss
    // XDR sentences often contain multiple measurements (coolantTemp, oilPressure, voltage)
    // that arrive as separate updates but should be applied together
    const mergedUpdates = new Map<string, SensorUpdate>();

    for (const update of updates) {
      const fieldKey = `${update.sensorType}.${update.instance}`;
      
      if (mergedUpdates.has(fieldKey)) {
        // Merge data fields from this update into existing update
        const existing = mergedUpdates.get(fieldKey)!;
        existing.data = { ...existing.data, ...update.data };
      } else {
        // First update for this sensor/instance
        mergedUpdates.set(fieldKey, { ...update, data: { ...update.data } });
      }
    }

    // Apply merged updates with field-specific throttling
    for (const [fieldKey, update] of mergedUpdates.entries()) {
      // Use field-specific throttle settings (engine=0ms, wind/gps=500ms, depth=1500ms, etc.)
      const fieldThrottle = this.getFieldThrottleMs(update.sensorType);
      const effectiveThrottle = skipThrottling ? 0 : fieldThrottle;
      
      if (effectiveThrottle > 0 && this.isThrottled(fieldKey, effectiveThrottle)) {
        console.log(`[PureStoreUpdater] Throttled ${fieldKey} (${effectiveThrottle}ms interval)`);
        continue;
      }

      // Update sensor data in store
      try {
        useNmeaStore.getState().updateSensorData(update.sensorType, update.instance, update.data);
        updatedFields.push(fieldKey);
        anyUpdated = true;
        
        // Update throttle timestamp
        this.lastUpdateTimes.set(fieldKey, Date.now());
        
        console.log(`[PureStoreUpdater] ✅ Updated ${fieldKey}:`, Object.keys(update.data));
      } catch (error) {
        console.error(`[PureStoreUpdater] ❌ Store update FAILED for ${fieldKey}:`, error);
      }
    }    return {
      updated: anyUpdated,
      throttled: false,
      batchedFields: updatedFields,
      reason: anyUpdated ? `Updated ${updatedFields.length} sensors` : 'All updates throttled'
    };
  }

  /**
   * Convert transformed NMEA data to sensor updates - NMEA Store v2.0 Bridge
   */
  private updateSensorDataFromTransformed(data: TransformedNmeaData): void {
    // Bridge method to convert legacy bulk data format to sensor-specific updates
    
    // Handle depth data
    if (data.depth !== undefined) {
      useNmeaStore.getState().updateSensorData('depth', 0, { 
        depth: data.depth,
        referencePoint: data.depthReferencePoint,
        timestamp: Date.now()
      } as any);
    }
    
    // Handle speed data
    if (data.sog !== undefined || data.stw !== undefined) {
      useNmeaStore.getState().updateSensorData('speed', 0, {
        sog: data.sog,
        stw: data.stw,
        timestamp: Date.now()
      } as any);
    }
    
    // Handle GPS data
    if (data.gpsPosition) {
      useNmeaStore.getState().updateSensorData('gps', 0, {
        latitude: data.gpsPosition.latitude,
        longitude: data.gpsPosition.longitude,
        timestamp: Date.now()
      } as any);
    }
    
    // Handle compass data
    if (data.heading !== undefined || data.track !== undefined) {
      useNmeaStore.getState().updateSensorData('compass', 0, {
        heading: data.heading,
        cog: data.track,
        timestamp: Date.now()
      } as any);
    }
    
    // Handle wind data
    if (data.windSpeed !== undefined || data.windAngle !== undefined) {
      useNmeaStore.getState().updateSensorData('wind', 0, {
        speed: data.windSpeed,
        angle: data.windAngle,
        timestamp: Date.now()
      } as any);
    }
    
    // Handle engine data (CRITICAL FIX for engine detection)
    if (data.engineRpm !== undefined || data.engineTemp !== undefined || data.enginePressure !== undefined) {
      const engineInstance = data.engineInstance || 0; // Use instance from parsed data or default to 0
      
      // CRITICAL: Only send fields that are actually present to avoid clearing existing data
      const engineUpdate: any = {
        name: `Engine ${engineInstance + 1}`,
        timestamp: Date.now()
      };
      
      if (data.engineRpm !== undefined) engineUpdate.rpm = data.engineRpm;
      if (data.engineTemp !== undefined) engineUpdate.coolantTemp = data.engineTemp;
      if (data.enginePressure !== undefined) engineUpdate.oilPressure = data.enginePressure;
      
      useNmeaStore.getState().updateSensorData('engine', engineInstance, engineUpdate);
    }
    
    // Handle tank/fuel data
    if (data.fuelLevel !== undefined) {
      const tankInstance = 0; // Default to tank 0 (multi-instance support needs to come from parser)
      useNmeaStore.getState().updateSensorData('tank', tankInstance, {
        name: `Fuel Tank ${tankInstance + 1}`,
        level: data.fuelLevel / 100, // Convert percentage to 0-1 ratio
        type: 'fuel' as const,
        timestamp: Date.now()
      } as any);
    }
    
    // Additional sensor data can be added here as needed
    // The 'as any' cast is used for backward compatibility during migration
  }

  /**
   * Force flush any pending batched updates
   */
  flushBatch(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.executeBatch();
    }
  }

  /**
   * Get update statistics
   */
  getStats(): {
    updateCount: number;
    throttledCount: number;
    batchedCount: number;
    throttleRate: number;
    batchRate: number;
  } {
    const throttleRate = this.updateCount > 0 ? (this.throttledCount / this.updateCount) * 100 : 0;
    const batchRate = this.updateCount > 0 ? (this.batchedCount / this.updateCount) * 100 : 0;
    
    return {
      updateCount: this.updateCount,
      throttledCount: this.throttledCount,
      batchedCount: this.batchedCount,
      throttleRate: Math.round(throttleRate * 100) / 100,
      batchRate: Math.round(batchRate * 100) / 100
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.updateCount = 0;
    this.throttledCount = 0;
    this.batchedCount = 0;
  }

  /**
   * Clear all throttling state
   */
  clearThrottling(): void {
    this.lastUpdateTimes.clear();
  }

  /**
   * Get fields that are being updated
   */
  private getUpdatedFields(data: TransformedNmeaData): string[] {
    const fields: string[] = [];
    
    // Check each possible field
    if (data.gpsPosition !== undefined) fields.push('gps');
    if (data.stw !== undefined || data.sog !== undefined) fields.push('speed');
    if (data.heading !== undefined) fields.push('heading');
    if (data.track !== undefined) fields.push('track');
    if (data.depth !== undefined) fields.push('depth');
    if (data.windSpeed !== undefined || data.windAngle !== undefined) fields.push('wind');
    if (data.engineRpm !== undefined) fields.push('engine');
    if (data.fuelLevel !== undefined) fields.push('fuel');
    if (data.rudderAngle !== undefined) fields.push('rudder');
    if (data.waterTemperature !== undefined) fields.push('waterTemp');
    
    return fields;
  }

  /**
   * Check which fields are throttled
   */
  private checkThrottling(fields: string[], throttleMs: number): string[] {
    const now = Date.now();
    const throttledFields: string[] = [];
    
    for (const field of fields) {
      const lastUpdate = this.lastUpdateTimes.get(field);
      if (lastUpdate && (now - lastUpdate) < throttleMs) {
        throttledFields.push(field);
      }
    }
    
    return throttledFields;
  }

  /**
   * Check if a specific field is throttled - helper for new sensor processing
   */
  private isThrottled(fieldKey: string, throttleMs: number): boolean {
    const lastUpdate = this.lastUpdateTimes.get(fieldKey);
    if (!lastUpdate) return false;
    return (Date.now() - lastUpdate) < throttleMs;
  }

  /**
   * Update throttle timestamps for fields
   */
  private updateThrottleTimestamps(fields: string[]): void {
    const now = Date.now();
    for (const field of fields) {
      this.lastUpdateTimes.set(field, now);
    }
  }

  /**
   * Determine if update should be batched
   */
  private shouldBatch(data: TransformedNmeaData): boolean {
    // Batch if multiple related fields are being updated
    const fieldCount = Object.keys(data).length;
    return fieldCount > 2 || this.pendingUpdates.size > 0;
  }

  /**
   * Perform immediate store update - NMEA Store v2.0 (sensor-based)
   */
  private immediateUpdate(data: TransformedNmeaData, fields: string[]): UpdateResult {
    try {
      this.updateSensorDataFromTransformed(data);
      return {
        updated: true,
        throttled: false,
        batchedFields: []
      };
    } catch (error) {
      return {
        updated: false,
        throttled: false,
        batchedFields: [],
        reason: `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Perform batched store update
   */
  private batchUpdate(data: TransformedNmeaData, fields: string[]): UpdateResult {
    this.batchedCount++;
    
    // Merge with pending updates
    for (const [key, value] of Object.entries(data)) {
      this.pendingUpdates.set(key, value);
    }

    // Set or reset batch timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    this.batchTimeout = setTimeout(() => {
      this.executeBatch();
    }, this.BATCH_DELAY_MS);

    return {
      updated: true,
      throttled: false,
      batchedFields: fields
    };
  }

  /**
   * Execute pending batch updates
   */
  private executeBatch(): void {
    if (this.pendingUpdates.size === 0) return;

    // Convert Map to object
    const batchData: Record<string, any> = {};
    for (const [key, value] of this.pendingUpdates.entries()) {
      batchData[key] = value;
    }

    try {
      // Convert batched data to sensor updates - NMEA Store v2.0
      this.updateSensorDataFromTransformed(batchData as any);
    } catch (error) {
      console.error('[StoreUpdater] Batch update failed:', error);
    }

    // Clear batch state
    this.pendingUpdates.clear();
    this.batchTimeout = null;
  }

  /**
   * Get field-specific throttle settings
   */
  private getFieldThrottleMs(field: string): number {
    // Different fields may have different throttling requirements
    switch (field) {
      case 'gps':
        return 500; // GPS updates every 500ms for smooth movement
      case 'wind':
        return 500;  // Wind updates more frequently
      case 'engine':
        return 0; // Engine data: NO THROTTLING - multi-measurement XDR requires immediate updates
      case 'speed':
      case 'heading':
      case 'track':
        return 1000; // Navigation data every second
      case 'depth':
        return 1500; // Depth updates every 1.5 seconds
      default:
        return this.DEFAULT_THROTTLE_MS;
    }
  }

  /**
   * Advanced throttling with field-specific intervals
   */
  updateStoreAdvanced(data: TransformedNmeaData, options: UpdateOptions = {}): UpdateResult {
    // Use field-specific throttling if not overridden
    if (!options.skipThrottling && !options.throttleMs) {
      const fields = this.getUpdatedFields(data);
      
      // Check each field with its specific throttle interval
      for (const field of fields) {
        const fieldThrottleMs = this.getFieldThrottleMs(field);
        const lastUpdate = this.lastUpdateTimes.get(field);
        
        if (lastUpdate && (Date.now() - lastUpdate) < fieldThrottleMs) {
          this.throttledCount++;
          return {
            updated: false,
            throttled: true,
            batchedFields: [],
            reason: `Field ${field} throttled (${fieldThrottleMs}ms interval)`
          };
        }
      }
    }

    // Proceed with normal update
    return this.updateStore(data, options);
  }
}

// Export singleton instance
export const pureStoreUpdater = PureStoreUpdater.getInstance();