/**
 * Threshold Presentation Service
 *
 * **Purpose:**
 * Provides display-enriched threshold information for sensor alarms.
 * Aligns SensorConfigDialog with the project's core architectural principle:
 * "Never transform/convert data - use pre-cached display fields"
 *
 * **Architecture:**
 * - Reads raw SI threshold values from nmeaStore
 * - Looks up categories from SensorConfigRegistry
 * - Uses presentation system for unit conversion and formatting
 * - Returns enriched thresholds with display info
 * - Provides helper for converting display values back to SI
 *
 * **Usage in SensorConfigDialog:**
 * ```typescript
 * // Load thresholds with display info
 * const enriched = ThresholdPresentationService.getEnrichedThresholds(
 *   'battery', 0, 'voltage'
 * );
 *
 * // Display formatted values
 * <Text>{enriched.display.critical.formattedValue}</Text>
 * <Text>Range: {enriched.display.min.formattedValue} - {enriched.display.max.formattedValue}</Text>
 *
 * // Save display value back to SI
 * const criticalSI = ThresholdPresentationService.convertDisplayToSI(
 *   enriched.unitType,
 *   formData.criticalValue
 * );
 * updateSensorThresholds(sensorType, instance, { critical: criticalSI });
 * ```
 *
 * **Benefits:**
 * - ✅ Dialog becomes dumb consumer (like widgets)
 * - ✅ No direct presentation hook calls in dialog
 * - ✅ No manual convert/convertBack logic in dialog
 * - ✅ Single responsibility: service handles all threshold presentation
 * - ✅ Consistent with SensorPresentationCache pattern
 */

import { SensorType } from '../types/SensorData';
import { useNmeaStore } from '../store/nmeaStore';
import { usePresentationStore } from '../presentation/presentationStore';
import { SENSOR_CONFIG_REGISTRY, getAlarmDefaults } from '../registry/SensorConfigRegistry';
import { DataCategory } from '../presentation/categories';
import {
  findPresentation,
  getConvertFunction,
  getConvertBackFunction,
  ensureFormatFunction,
} from '../presentation/presentations';

/**
 * Enriched threshold information with display details
 */
export interface EnrichedThresholdInfo {
  // Raw SI values
  critical?: number;
  warning?: number;
  min?: number;
  max?: number;
  direction?: 'above' | 'below';

  // Metadata
  unitType: DataCategory;

  // Display information (formatted with user's preferred units)
  display: {
    critical?: {
      value: number;
      unit: string;
      formattedValue: string;
    };
    warning?: {
      value: number;
      unit: string;
      formattedValue: string;
    };
    min: {
      value: number;
      unit: string;
      formattedValue: string;
    };
    max: {
      value: number;
      unit: string;
      formattedValue: string;
    };
  };

  // Helper functions
  convertToSI: (displayValue: number) => number;
  convertFromSI: (siValue: number) => number;
  formatValue: (displayValue: number) => string;
}

class ThresholdPresentationServiceClass {
  /**
   * Get enriched threshold information for a sensor's alarm configuration
   *
   * @param sensorType - Type of sensor (battery, engine, depth, etc.)
   * @param instance - Sensor instance number (0-based)
   * @param metric - Optional metric key for multi-metric sensors (voltage, soc, rpm, etc.)
   * @returns Enriched threshold info with display details
   */
  getEnrichedThresholds(
    sensorType: SensorType,
    instance: number,
    metric?: string,
  ): EnrichedThresholdInfo | null {
    // Get category for this sensor/metric
    const category = this.getCategoryForSensor(sensorType, metric);
    if (!category) {
      console.warn(
        `[ThresholdPresentationService] No category found for ${sensorType}${
          metric ? `.${metric}` : ''
        }`,
      );
      return null;
    }

    // Get presentation for this category
    const presentationStore = usePresentationStore.getState();
    const presentation = presentationStore.getPresentationForCategory(category);
    if (!presentation) {
      console.error(
        `[ThresholdPresentationService] No presentation found for category '${category}' (${sensorType}${
          metric ? `.${metric}` : ''
        })`,
      );
      return null;
    }

    // Get raw thresholds from store
    const nmeaStore = useNmeaStore.getState();
    const thresholds = nmeaStore.getSensorThresholds(sensorType, instance);

    // Get defaults from registry for min/max
    const sensorData = nmeaStore.nmeaData.sensors[sensorType]?.[instance];
    const context = thresholds?.context || {};
    const defaults = getAlarmDefaults(sensorType, context);

    // For multi-metric sensors, extract metric-specific thresholds
    let critical: number | undefined;
    let warning: number | undefined;
    let direction: 'above' | 'below' | undefined;

    // Initialize with fallback to ensure they're never undefined
    const fallback = this.getFallbackRange(category);
    let minSI: number = fallback.min;
    let maxSI: number = fallback.max;

    if (metric && thresholds?.metrics?.[metric]) {
      // Multi-metric sensor
      const metricConfig = thresholds.metrics[metric];
      critical = metricConfig.critical;
      warning = metricConfig.warning;
      direction = metricConfig.direction;

      // Get min/max from defaults
      if (defaults?.metrics?.[metric]) {
        minSI = defaults.metrics[metric].min;
        maxSI = defaults.metrics[metric].max;
      } else {
        // Fallback to reasonable defaults based on category
        console.warn(
          `[ThresholdPresentationService] No defaults found for ${sensorType}.${metric}, using fallback range for category '${category}'`,
        );
        const fallback = this.getFallbackRange(category);
        minSI = fallback.min;
        maxSI = fallback.max;
      }
    } else {
      // Single-metric sensor
      critical = thresholds?.critical;
      warning = thresholds?.warning;
      direction = thresholds?.direction;

      // Get min/max from defaults
      if (defaults?.min !== undefined && defaults?.max !== undefined) {
        minSI = defaults.min;
        maxSI = defaults.max;
      } else {
        // Fallback to reasonable defaults based on category
        console.warn(
          `[ThresholdPresentationService] No defaults found for ${sensorType}, using fallback range for category '${category}'`,
        );
        const fallback = this.getFallbackRange(category);
        minSI = fallback.min;
        maxSI = fallback.max;
      }
    }

    // Get helper functions for conversions and formatting
    const convertFn = getConvertFunction(presentation);
    const formatFn = ensureFormatFunction(presentation);

    // Convert all values to display units (with safety checks)
    const criticalDisplay =
      critical !== undefined
        ? (() => {
            const converted = convertFn(critical);
            return {
              value: converted,
              unit: presentation.symbol,
              formattedValue: `${formatFn(converted)} ${presentation.symbol}`,
            };
          })()
        : undefined;

    const warningDisplay =
      warning !== undefined
        ? (() => {
            const converted = convertFn(warning);
            return {
              value: converted,
              unit: presentation.symbol,
              formattedValue: `${formatFn(converted)} ${presentation.symbol}`,
            };
          })()
        : undefined;

    // Min/Max should always exist due to fallback, but add safety check
    if (minSI === undefined || maxSI === undefined) {
      console.error(
        `[ThresholdPresentationService] minSI or maxSI is undefined for ${sensorType}${
          metric ? `.${metric}` : ''
        }`,
      );
      const fallback = this.getFallbackRange(category);
      minSI = minSI ?? fallback.min;
      maxSI = maxSI ?? fallback.max;
    }

    const minConverted = convertFn(minSI);
    const maxConverted = convertFn(maxSI);

    const minDisplay = {
      value: minConverted,
      unit: presentation.symbol,
      formattedValue: `${formatFn(minConverted)} ${presentation.symbol}`,
    };

    const maxDisplay = {
      value: maxConverted,
      unit: presentation.symbol,
      formattedValue: `${formatFn(maxConverted)} ${presentation.symbol}`,
    };

    return {
      critical,
      warning,
      min: minSI,
      max: maxSI,
      direction,
      unitType: category,
      display: {
        critical: criticalDisplay,
        warning: warningDisplay,
        min: minDisplay,
        max: maxDisplay,
      },
      convertToSI: getConvertBackFunction(presentation),
      convertFromSI: getConvertFunction(presentation),
      formatValue: (displayValue: number) => `${formatFn(displayValue)} ${presentation.symbol}`,
    };
  }

  /**
   * Get the data category for a sensor field or metric
   *
   * @param sensorType - Type of sensor
   * @param metric - Optional metric key for multi-metric sensors
   * @returns Data category or null if not found
   */
  private getCategoryForSensor(sensorType: SensorType, metric?: string): DataCategory | null {
    const config = SENSOR_CONFIG_REGISTRY[sensorType];
    if (!config) {
      console.error(
        `[ThresholdPresentationService] No config found for sensor type '${sensorType}'`,
      );
      return null;
    }

    // For multi-metric sensors, REQUIRE metric parameter
    if (config.alarmSupport === 'multi-metric') {
      if (!metric) {
        console.error(
          `[ThresholdPresentationService] Multi-metric sensor '${sensorType}' requires metric parameter`,
        );
        return null;
      }
      if (!config.alarmMetrics) {
        console.error(
          `[ThresholdPresentationService] Multi-metric sensor '${sensorType}' has no alarmMetrics defined`,
        );
        return null;
      }
      const metricConfig = config.alarmMetrics.find((m) => m.key === metric);
      if (!metricConfig?.unitType) {
        console.warn(
          `[ThresholdPresentationService] No unitType found for ${sensorType}.${metric}`,
        );
      }
      return metricConfig?.unitType || null;
    }

    // For single-metric sensors, find the data field with a unitType
    // Priority: field that appears in defaults.threshold (indicates primary alarm field)
    const fieldWithUnit = config.fields.find((f) => f.unitType);
    if (!fieldWithUnit?.unitType) {
      console.warn(`[ThresholdPresentationService] No field with unitType found for ${sensorType}`);
    }
    return (fieldWithUnit?.unitType as DataCategory) || null;
  }

  /**
   * Get fallback min/max range for a unitType when defaults are not available
   *
   * @param unitType - Data category
   * @returns Fallback range in SI units
   */
  private getFallbackRange(category: DataCategory): { min: number; max: number } {
    switch (category) {
      case 'voltage':
        return { min: 0, max: 30 }; // Volts
      case 'current':
        return { min: -200, max: 200 }; // Amps
      case 'temperature':
        return { min: -40, max: 150 }; // Celsius
      case 'depth':
        return { min: 0, max: 200 }; // Meters
      case 'speed':
        return { min: 0, max: 50 }; // m/s (approx 100 knots)
      case 'pressure':
        return { min: 0, max: 1000000 }; // Pascals (10 bar)
      case 'flowRate':
        return { min: 0, max: 100 }; // L/h
      case 'volume':
        return { min: 0, max: 1000 }; // Liters
      case 'capacity':
        return { min: 0, max: 1000 }; // Ah
      case 'power':
        return { min: 0, max: 10000 }; // Watts
      case 'distance':
        return { min: 0, max: 185200 }; // meters (100 nautical miles)
      case 'rpm':
        return { min: 0, max: 5000 }; // RPM
      case 'wind':
        return { min: 0, max: 50 }; // m/s
      case 'angle':
        return { min: 0, max: 360 }; // Degrees
      case 'frequency':
        return { min: 0, max: 100 }; // Hz
      case 'coordinates':
      case 'time':
        return { min: 0, max: 100 }; // Not applicable
      default:
        return { min: 0, max: 100 }; // Generic fallback
    }
  }
}

// Export singleton instance
export const ThresholdPresentationService = new ThresholdPresentationServiceClass();
