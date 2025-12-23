/**
 * ReEnrichmentCoordinator - Global Re-Enrichment Manager
 *
 * **Purpose:**
 * Coordinates re-enrichment across all sensor instances when presentation
 * preferences change. Debounces re-enrichment to prevent performance issues
 * during rapid preference changes.
 *
 * **Architecture:**
 * - Singleton service
 * - Registers sensor instances for coordinated updates
 * - Single debounce timer for all sensors (not per-sensor)
 * - Subscribes to presentation store changes
 * - Batch re-enrichment for efficiency
 *
 * **Usage:**
 * ```typescript
 * // Initialize once at app startup
 * ReEnrichmentCoordinator.initialize();
 *
 * // Register sensor instances (done by nmeaStore)
 * ReEnrichmentCoordinator.register(sensorInstance);
 *
 * // Unregister on cleanup
 * ReEnrichmentCoordinator.unregister(sensorInstance);
 *
 * // Manual trigger (usually automatic via subscription)
 * ReEnrichmentCoordinator.triggerReEnrichment();
 * ```
 *
 * **Benefits:**
 * - ✅ Single debounce timer (efficient)
 * - ✅ Batch re-enrichment (all sensors at once)
 * - ✅ Automatic on presentation changes
 * - ✅ Performance logging
 * - ✅ Clean instance management
 */

import { SensorInstance } from '../types/SensorInstance';
import { usePresentationStore } from '../presentation/presentationStore';
import { log } from './logging/logger';

/**
 * Re-Enrichment Coordinator Service
 * Singleton managing global re-enrichment
 */
class ReEnrichmentCoordinatorService {
  private instances: Set<SensorInstance<any>> = new Set();
  private debounceTimer?: NodeJS.Timeout;
  private readonly DEBOUNCE_MS = 100;
  private unsubscribe?: () => void;

  /**
   * Register sensor instance for coordinated re-enrichment
   * Called by nmeaStore when creating new sensor instances
   *
   * @param instance - Sensor instance to register
   */
  register(instance: SensorInstance<any>): void {
    this.instances.add(instance);

    log.app('Sensor instance registered for re-enrichment', () => ({
      type: instance.type,
      instance: instance.instance,
      totalInstances: this.instances.size,
    }));
  }

  /**
   * Unregister sensor instance
   * Called during cleanup or factory reset
   *
   * @param instance - Sensor instance to unregister
   */
  unregister(instance: SensorInstance<any>): void {
    this.instances.delete(instance);

    log.app('Sensor instance unregistered from re-enrichment', () => ({
      type: instance.type,
      instance: instance.instance,
      totalInstances: this.instances.size,
    }));
  }

  /**
   * Trigger re-enrichment (debounced)
   * Called automatically when presentation preferences change
   *
   * Debounces to prevent excessive re-enrichment during rapid changes
   * (e.g., user scrolling through unit preferences)
   */
  triggerReEnrichment(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      const startTime = Date.now();

      // Batch re-enrich all sensor instances
      for (const instance of this.instances) {
        instance.reEnrich();
      }

      const duration = Date.now() - startTime;

      log.app('Global re-enrichment complete', () => ({
        instanceCount: this.instances.size,
        durationMs: duration,
        avgPerInstance: this.instances.size > 0 ? duration / this.instances.size : 0,
      }));
    }, this.DEBOUNCE_MS);
  }

  /**
   * Initialize subscription to presentation changes
   * Call once at app startup
   *
   * @example
   * // In App.tsx or index.js
   * ReEnrichmentCoordinator.initialize();
   */
  initialize(): void {
    if (this.unsubscribe) {
      // Already initialized
      return;
    }

    this.unsubscribe = usePresentationStore.subscribe((state, prevState) => {
      if (state.selectedPresentations !== prevState.selectedPresentations) {
        log.app('Presentation change detected, triggering re-enrichment');
        this.triggerReEnrichment();
      }
    });

    log.app('ReEnrichmentCoordinator initialized');
  }

  /**
   * Cleanup (for testing or shutdown)
   */
  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }

    this.instances.clear();

    log.app('ReEnrichmentCoordinator destroyed');
  }

  /**
   * Get coordinator statistics (for debugging)
   */
  getStats(): { registeredInstances: number; isInitialized: boolean } {
    return {
      registeredInstances: this.instances.size,
      isInitialized: !!this.unsubscribe,
    };
  }
}

/**
 * Singleton instance
 * Import and use this in your application
 */
export const ReEnrichmentCoordinator = new ReEnrichmentCoordinatorService();
