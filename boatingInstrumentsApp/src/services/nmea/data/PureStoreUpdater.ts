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
  
  // Store bindings
  private setNmeaData = useNmeaStore.getState().setNmeaData;
  private setConnectionStatus = useNmeaStore.getState().setConnectionStatus;
  private setLastError = useNmeaStore.getState().setLastError;
  private addRawSentence = useNmeaStore.getState().addRawSentence;
  
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
  updateConnectionStatus(status: any): void {
    this.setConnectionStatus(status);
  }

  /**
   * Update error in store
   */
  updateError(error: string): void {
    this.setLastError(error);
  }

  /**
   * Add raw NMEA sentence to store
   */
  addRawMessage(sentence: string): void {
    this.addRawSentence(sentence);
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
   * Perform immediate store update
   */
  private immediateUpdate(data: TransformedNmeaData, fields: string[]): UpdateResult {
    try {
      this.setNmeaData(data);
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
      this.setNmeaData(batchData);
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
        return 1000; // Engine data every second
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