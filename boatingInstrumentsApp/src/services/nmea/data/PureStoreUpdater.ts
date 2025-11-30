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
  
  // Throttling management
  private lastUpdateTimes: Map<string, number> = new Map();
  private readonly DEFAULT_THROTTLE_MS = 1000; // 1 second default throttling
  
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
   * Process parsed NMEA message using NmeaSensorProcessor
   * Direct sensor-based processing path
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
   * Get field-specific throttle settings for sensor types
   */
  private getFieldThrottleMs(sensorType: string): number {
    // Different sensors have different throttling requirements
    switch (sensorType) {
      case 'gps':
        return 500; // GPS updates every 500ms for smooth movement
      case 'wind':
        return 500;  // Wind updates more frequently
      case 'engine':
        return 0; // Engine data: NO THROTTLING - multi-measurement XDR requires immediate updates
      case 'speed':
      case 'compass':
        return 1000; // Navigation data every second
      case 'depth':
        return 1500; // Depth updates every 1.5 seconds
      case 'tank':
        return 2000; // Tank levels every 2 seconds
      case 'battery':
        return 1000; // Battery data every second
      case 'temperature':
        return 2000; // Temperature every 2 seconds
      default:
        return this.DEFAULT_THROTTLE_MS;
    }
  }

  /**
   * Check if a specific field is throttled
   */
  private isThrottled(fieldKey: string, throttleMs: number): boolean {
    const lastUpdate = this.lastUpdateTimes.get(fieldKey);
    if (!lastUpdate) return false;
    return (Date.now() - lastUpdate) < throttleMs;
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
      throttleRate: Math.round(throttleRate * 100) / 100
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
}

// Export singleton instance
export const pureStoreUpdater = PureStoreUpdater.getInstance();