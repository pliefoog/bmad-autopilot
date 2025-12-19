/**
 * Sensor Presentation Cache Service
 * 
 * **Purpose:**
 * Generates and caches display information for sensor data fields at the moment
 * of sensor detection/update. This eliminates runtime presentation lookups and
 * provides instant access to formatted values with proper units.
 * 
 * **Architecture:**
 * - Lazy initialization: Cache initializes on first sensor update
 * - Store subscription: Reacts to unit preference changes
 * - Version tracking: Increments version on preference changes for React reactivity
 * - Registry-driven: Uses SensorConfigRegistry to find fields with categories
 * 
 * **Usage:**
 * ```typescript
 * // In nmeaStore updateSensorData:
 * const enrichedData = SensorPresentationCache.enrichSensorData(
 *   'battery',
 *   { voltage: 12.6, current: -5.2, temperature: 25.5, soc: 85 }
 * );
 * // Result:
 * {
 *   voltage: 12.6,
 *   current: -5.2,
 *   temperature: 25.5,
 *   soc: 85,
 *   display: {
 *     voltage: { value: 12.6, unit: 'V', formatted: '12.6 V' },
 *     current: { value: -5.2, unit: 'A', formatted: '-5.2 A' },
 *     temperature: { value: 77.9, unit: '°F', formatted: '77.9°F' },
 *     soc: { value: 85, unit: '%', formatted: '85%' }
 *   }
 * }
 * 
 * // In widgets:
 * const voltage = sensor.display?.voltage;
 * return <Text>{voltage?.formatted ?? 'N/A'}</Text>;
 * ```
 * 
 * **Benefits:**
 * - ✅ One-time lookup per sensor update (not per render)
 * - ✅ No hook calls needed in widgets
 * - ✅ Automatic reactivity via version tracking
 * - ✅ Type-safe access to display info
 * - ✅ Eliminates manual category→presentation mapping
 */

import { SensorType, BaseSensorData, DisplayInfo } from '../types/SensorData';
import { getDataFields } from '../registry/SensorConfigRegistry';
import { usePresentationStore } from '../presentation/presentationStore';

/**
 * Presentation cache service - singleton pattern
 */
class SensorPresentationCacheService {
  private initialized = false;
  private version = 0;
  private unsubscribe?: () => void;

  /**
   * Initialize the cache service
   * Sets up subscription to presentation store for unit changes
   */
  private initialize() {
    if (this.initialized) return;

    // Subscribe to presentation store changes
    this.unsubscribe = usePresentationStore.subscribe(
      () => {
        // Increment version when presentation preferences change
        this.version++;
      }
    );

    this.initialized = true;
  }

  /**
   * Get current presentation version
   * Used by React components to detect when to re-render
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * Enrich sensor data with display information
   * 
   * @param sensorType - Type of sensor (battery, engine, etc.)
   * @param data - Raw sensor data object
   * @returns Sensor data with display property populated
   */
  enrichSensorData<T extends Partial<BaseSensorData>>(
    sensorType: SensorType,
    data: T
  ): T & { display?: Record<string, DisplayInfo> } {
    // Lazy initialization
    if (!this.initialized) {
      this.initialize();
    }

    // Get all data fields for this sensor type
    const dataFields = getDataFields(sensorType);
    if (dataFields.length === 0) {
      // No data fields, return as-is
      return data;
    }

    // Build display info for each data field
    const display: Record<string, DisplayInfo> = {};
    const store = usePresentationStore.getState();

    for (const field of dataFields) {
      const value = (data as any)[field.key];
      
      // Skip undefined/null values
      if (value === undefined || value === null) {
        continue;
      }

      // Skip non-numeric values
      if (typeof value !== 'number') {
        continue;
      }

      // Get presentation for this category
      if (!field.category) {
        // No category = raw value (like percentages)
        display[field.key] = {
          value,
          unit: '', // No unit symbol for raw values
          formatted: `${value}`,
        };
        continue;
      }

      // Get presentation using store's getter
      const presentation = store.getPresentationForCategory(field.category);
      if (!presentation) {
        // No presentation found, use raw value
        display[field.key] = {
          value,
          unit: '',
          formatted: `${value}`,
        };
        continue;
      }
      
      // Convert value to user's preferred units
      const convertedValue = presentation.convert(value);
      
      // Format the value using presentation's formatter
      const formatted = presentation.format(convertedValue);

      display[field.key] = {
        value: convertedValue,
        unit: presentation.symbol,
        formatted: `${formatted} ${presentation.symbol}`,
      };
    }

    // Return enriched data with display info
    return {
      ...data,
      display,
    };
  }

  /**
   * Cleanup: unsubscribe from store
   * Should be called on app shutdown (rarely needed)
   */
  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
    this.initialized = false;
  }
}

// Export singleton instance
export const SensorPresentationCache = new SensorPresentationCacheService();
