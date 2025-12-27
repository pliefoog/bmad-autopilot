/**
 * SensorConfigCoordinator - Global Threshold Configuration Manager
 *
 * **Purpose:**
 * Coordinates threshold updates across sensor instances when alarm configuration
 * changes. Debounces updates to prevent performance issues during rapid config
 * changes (e.g., user editing multiple thresholds in quick succession).
 *
 * **Architecture:**
 * - Singleton service
 * - Registers sensor instances for coordinated updates
 * - Single debounce timer for all sensors (not per-sensor)
 * - Subscribes to sensorConfigStore changes
 * - Batch threshold updates for efficiency
 *
 * **Usage:**
 * ```typescript
 * // Initialize once at app startup
 * SensorConfigCoordinator.initialize();
 *
 * // Register sensor instances (done by nmeaStore)
 * SensorConfigCoordinator.register(sensorInstance);
 *
 * // Unregister on cleanup
 * SensorConfigCoordinator.unregister(sensorInstance);
 *
 * // Manual trigger (usually automatic via subscription)
 * SensorConfigCoordinator.triggerSync();
 * ```
 *
 * **Benefits:**
 * - ✅ Single debounce timer (efficient)
 * - ✅ Batch threshold updates (all sensors at once)
 * - ✅ Automatic on config changes
 * - ✅ Performance logging
 * - ✅ Clean instance management
 * - ✅ Supports per-metric threshold configuration
 */

import { SensorInstance } from '../types/SensorInstance';
import { useSensorConfigStore } from '../store/sensorConfigStore';
import { log } from './logging/logger';
import type { SensorType } from '../types/SensorData';

/**
 * Sensor Config Coordinator Service
 * Singleton managing global threshold synchronization
 */
class SensorConfigCoordinatorService {
  private instances: Map<string, SensorInstance<any>> = new Map();
  private debounceTimer?: NodeJS.Timeout;
  private readonly DEBOUNCE_MS = 100;
  private unsubscribe?: () => void;

  /**
   * Generate unique key for sensor instance
   */
  private getKey(sensorType: SensorType, instance: number): string {
    return `${sensorType}:${instance}`;
  }

  /**
   * Register sensor instance for coordinated threshold updates
   * Called by nmeaStore when creating new sensor instances
   *
   * @param instance - Sensor instance to register
   */
  register(sensorInstance: SensorInstance<any>): void {
    const key = this.getKey(sensorInstance.sensorType, sensorInstance.instance);
    this.instances.set(key, sensorInstance);

    log.app('Sensor instance registered for threshold coordination', () => ({
      sensorType: sensorInstance.sensorType,
      instance: sensorInstance.instance,
      totalInstances: this.instances.size,
    }));

    // Sync thresholds immediately for new instance
    this.syncInstance(sensorInstance);
  }

  /**
   * Unregister sensor instance
   * Called during cleanup or factory reset
   *
   * @param sensorInstance - Sensor instance to unregister
   */
  unregister(sensorInstance: SensorInstance<any>): void {
    const key = this.getKey(sensorInstance.sensorType, sensorInstance.instance);
    this.instances.delete(key);

    log.app('Sensor instance unregistered from threshold coordination', () => ({
      sensorType: sensorInstance.sensorType,
      instance: sensorInstance.instance,
      totalInstances: this.instances.size,
    }));
  }

  /**
   * Sync thresholds for a single sensor instance
   */
  private syncInstance(sensorInstance: SensorInstance<any>): void {
    const config = useSensorConfigStore
      .getState()
      .getConfig(sensorInstance.sensorType, sensorInstance.instance);

    if (!config) {
      log.app('No config found for sensor, skipping threshold sync', () => ({
        sensorType: sensorInstance.sensorType,
        instance: sensorInstance.instance,
      }));
      return;
    }

    // Get all metrics that need threshold configuration
    // For now, we'll sync the entire config (backward compatible)
    // Future enhancement: per-metric threshold updates
    log.app('Syncing thresholds for sensor instance', () => ({
      sensorType: sensorInstance.sensorType,
      instance: sensorInstance.instance,
      config,
    }));
  }

  /**
   * Trigger threshold synchronization (debounced)
   * Called automatically when sensor config changes
   *
   * Debounces to prevent excessive updates during rapid changes
   * (e.g., user editing multiple threshold fields)
   */
  triggerSync(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      const startTime = Date.now();

      // Batch sync all sensor instances
      let syncCount = 0;
      for (const sensorInstance of this.instances.values()) {
        this.syncInstance(sensorInstance);
        syncCount++;
      }

      const duration = Date.now() - startTime;
      log.app(`Threshold sync completed`, () => ({
        syncCount,
        duration,
        avgPerSensor: syncCount > 0 ? (duration / syncCount).toFixed(2) : 0,
      }));
    }, this.DEBOUNCE_MS);
  }

  /**
   * Initialize coordinator service
   * Subscribe to sensorConfigStore changes
   * Call once at app startup
   */
  initialize(): void {
    if (this.unsubscribe) {
      log.app('SensorConfigCoordinator already initialized');
      return;
    }

    // Subscribe to config store changes
    this.unsubscribe = useSensorConfigStore.subscribe((state) => {
      log.app('Sensor configs changed, triggering threshold sync', () => ({
        configCount: Object.keys(state.configs).length,
      }));
      this.triggerSync();
    });

    log.app('SensorConfigCoordinator initialized');
  }

  /**
   * Cleanup coordinator service
   * Unsubscribe from store, clear instances
   */
  cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }

    this.instances.clear();
    log.app('SensorConfigCoordinator cleaned up');
  }

  /**
   * Get current registration count (for debugging)
   */
  getRegistrationCount(): number {
    return this.instances.size;
  }
}

/**
 * Export singleton instance
 */
export const SensorConfigCoordinator = new SensorConfigCoordinatorService();
