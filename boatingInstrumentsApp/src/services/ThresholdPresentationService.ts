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
  * 
  * Critical Implementation Details:
  * - Reads per-metric thresholds from SensorInstance via nmeaStore
  * - Derives numeric critical/warning values from MetricThresholds using direction
  * - Uses registry defaults for min/max ranges and alarm direction
  * 
  * Dependencies:
  * - nmeaStore.getSensorThresholds(sensorType, instance, metric?)
  * - SENSOR_CONFIG_REGISTRY.getAlarmDefaults(context)
  * - Presentation store for unit conversion/formatting
 */

import { SensorType } from '../types/SensorData';
import { log } from '../utils/logging/logger';
import { useNmeaStore } from '../store/nmeaStore';
import { sensorRegistry } from './SensorDataRegistry';
import { usePresentationStore } from '../presentation/presentationStore';
import { getAlarmDefaults, getSensorSchema } from '../registry';
import { DataCategory } from '../presentation/categories';
import { evaluateFormula } from '../utils/formulaEvaluator';
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

  // IndirectThreshold support (Jan 2025) - for formula-based ratio editing
  ratioMode?: boolean;  // True if threshold uses indirectThreshold
  ratioValue?: {
    critical?: number;   // User-adjustable ratio for critical (e.g., 0.985 for voltage, 1.4 for C-rate)
    warning?: number;    // User-adjustable ratio for warning
  };
  ratioUnit?: string;    // Semantic unit for ratio (e.g., '× Vnom', 'C-rate', '% RPM')
  absoluteValue?: {
    critical?: string;   // Computed absolute value with formula fallbacks (e.g., "11.8 V" when nominalVoltage missing)
    warning?: string;    // Computed absolute value with formula fallbacks
  };
  
  // Resolved range boundaries (Jan 2026) - for static min/max display in ratio mode
  resolvedRange?: {
    min: number;     // SI value: formula evaluated with indirectThreshold = ratio min
    max: number;     // SI value: formula evaluated with indirectThreshold = ratio max
  };
  
  // Formula evaluation context (Jan 2026) - for dynamic thumb label calculation
  formulaContext?: {
    formula: string;              // Schema formula (e.g., "capacity * indirectThreshold")
    parameters: Record<string, number>;  // Current sensor values (capacity: 150, temperature: 25, etc.)
  };

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
      log.app('[ThresholdPresentationService] No category found', () => ({
        sensorType,
        metric,
      }));
      return null;
    }

    // Get presentation for this category
    const presentationStore = usePresentationStore.getState();
    const presentation = presentationStore.getPresentationForCategory(category);
    if (!presentation) {
      log.app('[ThresholdPresentationService] No presentation found for category', () => ({
        category,
        sensorType,
        metric,
      }));
      return null;
    }

    // Get raw thresholds from store (per-metric when provided)
    const nmeaStore = useNmeaStore.getState();
    const thresholds = nmeaStore.getSensorThresholds(sensorType, instance, metric);

    // Get defaults from schema for this sensor/metric
    // Context must come from nmeaStore (persistent), not thresholds (MetricThresholds doesn't have context)
    const sensorInstance = sensorRegistry.get(sensorType, instance);
    const savedConfig = useNmeaStore.getState().getSensorConfig(sensorType, instance);
    const context = savedConfig?.context || {};
    
    // Get the field key for alarm defaults lookup
    const schema = getSensorSchema(sensorType);
    const fieldKey = metric || Object.keys(schema.fields).find(key => schema.fields[key as keyof typeof schema.fields].alarm);
    
    // Get context value for schema lookup (e.g., 'lifepo4', 'diesel', or 'default')
    const contextKey = schema.contextKey;
    const contextValue = contextKey ? (context[contextKey] || 'default') : 'default';
    
    // Get schema defaults for this field and context
    const schemaDefaults = fieldKey ? getAlarmDefaults(sensorType, fieldKey, contextValue) : undefined;

    // Detect indirectThreshold mode (Jan 2025) - check if schema has indirectThreshold
    let ratioMode = false;
    let ratioUnit: string | undefined;
    let ratioCritical: number | undefined;
    let ratioWarning: number | undefined;

    if (schemaDefaults) {
      // Check if critical or warning threshold has indirectThreshold field
      ratioMode = schemaDefaults.critical.indirectThreshold !== undefined || 
                  schemaDefaults.warning.indirectThreshold !== undefined;
      
      if (ratioMode) {
        ratioUnit = schemaDefaults.critical.indirectThresholdUnit || schemaDefaults.warning.indirectThresholdUnit;
        ratioCritical = schemaDefaults.critical.indirectThreshold;
        ratioWarning = schemaDefaults.warning.indirectThreshold;
      }
    }

    // For multi-metric sensors, extract metric-specific thresholds
    let critical: number | undefined;
    let warning: number | undefined;
    let direction: 'above' | 'below' | undefined;

    // Initialize with fallback to ensure they're never undefined
    const fallback = this.getFallbackRange(category);
    let minSI: number = fallback.min;
    let maxSI: number = fallback.max;

    if (metric) {
      // Multi-metric sensor: thresholds are per-metric from SensorInstance
      // Determine alarm direction from schema field's alarm definition
      const field = schema.fields[metric as keyof typeof schema.fields];
      direction = field?.alarm?.direction;

      // Derive numeric thresholds from MetricThresholds structure
      // For 'below' alarms, use .min; for 'above' alarms, use .max
      // For ratio mode, use .indirectThreshold for UI editing
      const t = thresholds as any;
      if (t) {
        if (ratioMode) {
          // Ratio mode: Use indirectThreshold (user's ratio value) from runtime thresholds
          critical = t.critical?.indirectThreshold;
          warning = t.warning?.indirectThreshold;
        } else if (direction === 'below') {
          critical = t.critical?.min;
          warning = t.warning?.min;
        } else if (direction === 'above') {
          critical = t.critical?.max;
          warning = t.warning?.max;
        }
      }
      
      // If no user thresholds, use schema defaults
      if (critical === undefined && schemaDefaults) {
        if (ratioMode) {
          critical = schemaDefaults.critical.indirectThreshold;
        } else {
          critical = direction === 'below' ? schemaDefaults.critical.min : schemaDefaults.critical.max;
        }
      }
      if (warning === undefined && schemaDefaults) {
        if (ratioMode) {
          warning = schemaDefaults.warning.indirectThreshold;
        } else {
          warning = direction === 'below' ? schemaDefaults.warning.min : schemaDefaults.warning.max;
        }
      }

      // Get min/max display range from schema
      // CRITICAL FIX (Jan 2025): Always prefer thresholdRange over field.min/max
      // - thresholdRange = slider range for configuring thresholds (e.g., 0-10m for depth)
      // - field.min/max = physical sensor range (e.g., 0-100m for depth sensor)
      // Slider should use thresholdRange (what user can configure), not physical range
      if (schemaDefaults?.thresholdRange) {
        minSI = schemaDefaults.thresholdRange.min;
        maxSI = schemaDefaults.thresholdRange.max;
      } else if (field && field.min !== undefined && field.max !== undefined) {
        minSI = field.min;
        maxSI = field.max;
      } else {
        // Fallback to reasonable defaults based on category
        log.app('[ThresholdPresentationService] No defaults found for metric, using fallback', () => ({
          sensorType,
          metric,
          category,
        }));
        const fb = this.getFallbackRange(category);
        minSI = fb.min;
        maxSI = fb.max;
      }
    } else {
      // Single-metric sensor: thresholds reflect overall sensor configuration
      // Determine alarm direction from schema field's alarm definition
      const field = fieldKey ? schema.fields[fieldKey as keyof typeof schema.fields] : undefined;
      direction = field?.alarm?.direction;

      // Derive numeric thresholds from MetricThresholds structure
      // For ratio mode, use .indirectThreshold for UI editing
      // For direct mode, use .min or .max based on direction
      const t = thresholds as any;
      if (t) {
        if (ratioMode) {
          // Ratio mode: Use indirectThreshold (user's ratio value) from runtime thresholds
          critical = t.critical?.indirectThreshold;
          warning = t.warning?.indirectThreshold;
        } else if (direction === 'below') {
          critical = t.critical?.min;
          warning = t.warning?.min;
        } else if (direction === 'above') {
          critical = t.critical?.max;
          warning = t.warning?.max;
        }
      }
      
      // If no user thresholds, use schema defaults
      if (critical === undefined && schemaDefaults) {
        if (ratioMode) {
          critical = schemaDefaults.critical.indirectThreshold;
        } else {
          critical = direction === 'below' ? schemaDefaults.critical.min : schemaDefaults.critical.max;
        }
      }
      if (warning === undefined && schemaDefaults) {
        if (ratioMode) {
          warning = schemaDefaults.warning.indirectThreshold;
        } else {
          warning = direction === 'below' ? schemaDefaults.warning.min : schemaDefaults.warning.max;
        }
      }

      // Get min/max from schema
      // CRITICAL FIX (Jan 2025): Always prefer thresholdRange over field.min/max
      // - thresholdRange = slider range for configuring thresholds (e.g., 0-10m for depth)
      // - field.min/max = physical sensor range (e.g., 0-100m for depth sensor)
      // Slider should use thresholdRange (what user can configure), not physical range
      if (schemaDefaults?.thresholdRange) {
        minSI = schemaDefaults.thresholdRange.min;
        maxSI = schemaDefaults.thresholdRange.max;
      } else if (field && field.min !== undefined && field.max !== undefined) {
        minSI = field.min;
        maxSI = field.max;
      } else {
        // Fallback to reasonable defaults based on category
        log.app('[ThresholdPresentationService] No defaults found for sensor, using fallback', () => ({
          sensorType,
          category,
        }));
        const fb = this.getFallbackRange(category);
        minSI = fb.min;
        maxSI = fb.max;
      }
    }

    // Get helper functions for conversions and formatting
    const convertFn = getConvertFunction(presentation);
    const formatFn = ensureFormatFunction(presentation);

    // Convert all values to display units (with safety checks)
    // CRITICAL: In ratio mode, threshold values are ratios (not SI units) - don't convert!
    const criticalDisplay =
      critical !== undefined
        ? (() => {
            const converted = ratioMode ? critical : convertFn(critical);
            return {
              value: converted,
              unit: ratioMode ? (ratioUnit || '') : presentation.symbol,
              formattedValue: ratioMode 
                ? `${formatFn(converted)} ${ratioUnit || ''}`
                : `${formatFn(converted)} ${presentation.symbol}`,
            };
          })()
        : undefined;

    const warningDisplay =
      warning !== undefined
        ? (() => {
            const converted = ratioMode ? warning : convertFn(warning);
            return {
              value: converted,
              unit: ratioMode ? (ratioUnit || '') : presentation.symbol,
              formattedValue: ratioMode 
                ? `${formatFn(converted)} ${ratioUnit || ''}`
                : `${formatFn(converted)} ${presentation.symbol}`,
            };
          })()
        : undefined;

    // Min/Max should always exist due to fallback, but add safety check
    if (minSI === undefined || maxSI === undefined) {
      log.app('[ThresholdPresentationService] minSI or maxSI is undefined', () => ({
        sensorType,
        metric,
        minSI,
        maxSI,
      }));
      const fallback = this.getFallbackRange(category);
      minSI = minSI ?? fallback.min;
      maxSI = maxSI ?? fallback.max;
    }

    // In ratio mode, min/max are ratio values (dimensionless), not SI physical values
    // Don't convert them - they represent the thresholdRange (e.g., 0.9-1.15)
    const minConverted = ratioMode ? minSI : convertFn(minSI);
    const maxConverted = ratioMode ? maxSI : convertFn(maxSI);

    const minDisplay = {
      value: minConverted,
      unit: ratioMode ? (ratioUnit || '') : presentation.symbol,
      formattedValue: ratioMode
        ? `${formatFn(minConverted)} ${ratioUnit || ''}`
        : `${formatFn(minConverted)} ${presentation.symbol}`,
    };

    const maxDisplay = {
      value: maxConverted,
      unit: ratioMode ? (ratioUnit || '') : presentation.symbol,
      formattedValue: ratioMode
        ? `${formatFn(maxConverted)} ${ratioUnit || ''}`
        : `${formatFn(maxConverted)} ${presentation.symbol}`,
    };

    // Build absolute value strings for ratio mode (show computed value with fallback indicators)
    let absoluteCritical: string | undefined;
    let absoluteWarning: string | undefined;
    let resolvedMin: number | undefined;
    let resolvedMax: number | undefined;
    let formula: string | undefined;
    let formulaParameters: Record<string, number> | undefined;

    if (ratioMode && schemaDefaults) {
      // Compute absolute values by resolving formulas with current sensor data
      // Build formula context from sensor instance's current values
      const formulaContext: Record<string, number> = {};
      
      // Extract current sensor values from history buffers
      if (sensorInstance) {
        const fields = ['nominalVoltage', 'capacity', 'maxRpm', 'temperature'];
        for (const field of fields) {
          const metricData = sensorInstance.getMetric(field);
          if (metricData && typeof metricData.si_value === 'number') {
            formulaContext[field] = metricData.si_value;
          }
        }
      }
      
      // Apply fallback defaults for missing base parameters
      formulaContext.nominalVoltage = formulaContext.nominalVoltage ?? 12;
      formulaContext.capacity = formulaContext.capacity ?? 140;
      formulaContext.maxRpm = formulaContext.maxRpm ?? 3000;
      formulaContext.temperature = formulaContext.temperature ?? 25;
      
      // Store formula and parameters for slider's dynamic calculation
      formula = schemaDefaults.critical.formula || schemaDefaults.warning.formula;
      formulaParameters = { ...formulaContext };
      
      // Debug logging
      if (__DEV__) {
        console.log('[ThresholdPresentationService] Formula context computed:', {
          sensorType,
          metric,
          formula,
          parameters: formulaParameters,
          ratioMode,
        });
      }
      
      // Resolve range boundaries (min/max) for static display
      if (formula) {
        try {
          resolvedMin = evaluateFormula(formula, {
            ...formulaContext,
            indirectThreshold: minSI,  // Ratio min (e.g., 0)
          });
          resolvedMax = evaluateFormula(formula, {
            ...formulaContext,
            indirectThreshold: maxSI,  // Ratio max (e.g., 3)
          });
        } catch (err) {
          log.app('[ThresholdPresentationService] Failed to resolve range boundaries', () => ({
            sensorType,
            metric,
            error: err instanceof Error ? err.message : String(err),
          }));
        }
      }
      
      // Evaluate critical threshold formula if it exists
      if (schemaDefaults.critical.formula && critical !== undefined) {
        try {
          const resolvedCritical = evaluateFormula(schemaDefaults.critical.formula, {
            ...formulaContext,
            indirectThreshold: critical,  // Use saved ratio value
          });
          const convertedCritical = convertFn(resolvedCritical);
          absoluteCritical = `${formatFn(convertedCritical)} ${presentation.symbol}`;
        } catch (err) {
          log.app('[ThresholdPresentationService] Failed to evaluate critical formula', () => ({
            sensorType,
            metric,
            error: err instanceof Error ? err.message : String(err),
          }));
        }
      }
      
      // Evaluate warning threshold formula if it exists
      if (schemaDefaults.warning.formula && warning !== undefined) {
        try {
          const resolvedWarning = evaluateFormula(schemaDefaults.warning.formula, {
            ...formulaContext,
            indirectThreshold: warning,  // Use saved ratio value
          });
          const convertedWarning = convertFn(resolvedWarning);
          absoluteWarning = `${formatFn(convertedWarning)} ${presentation.symbol}`;
        } catch (err) {
          log.app('[ThresholdPresentationService] Failed to evaluate warning formula', () => ({
            sensorType,
            metric,
            error: err instanceof Error ? err.message : String(err),
          }));
        }
      }
    }

    const result = {
      critical,
      warning,
      min: minSI,
      max: maxSI,
      direction,
      unitType: category,
      ratioMode,
      ratioValue: ratioMode ? {
        critical: ratioCritical,
        warning: ratioWarning,
      } : undefined,
      ratioUnit,
      absoluteValue: ratioMode ? {
        critical: absoluteCritical,
        warning: absoluteWarning,
      } : undefined,
      resolvedRange: (ratioMode && resolvedMin !== undefined && resolvedMax !== undefined) ? {
        min: resolvedMin,
        max: resolvedMax,
      } : undefined,
      formulaContext: (ratioMode && formula && formulaParameters) ? {
        formula,
        parameters: formulaParameters,
      } : undefined,
      display: {
        critical: criticalDisplay,
        warning: warningDisplay,
        min: minDisplay,
        max: maxDisplay,
      },
      // In ratio mode, values are already ratios (dimensionless) - no conversion needed
      convertToSI: ratioMode ? (v: number) => v : getConvertBackFunction(presentation),
      convertFromSI: ratioMode ? (v: number) => v : getConvertFunction(presentation),
      formatValue: ratioMode
        ? (displayValue: number) => `${formatFn(displayValue)} ${ratioUnit || ''}`
        : (displayValue: number) => `${formatFn(displayValue)} ${presentation.symbol}`,
    };
    
    // Debug logging
    if (__DEV__) {
      console.log('[ThresholdPresentationService] Returning enriched thresholds:', {
        sensorType,
        metric,
        ratioMode: result.ratioMode,
        hasFormulaContext: !!result.formulaContext,
        formulaContext: result.formulaContext,
        hasResolvedRange: !!result.resolvedRange,
      });
    }
    
    return result;
  }

  /**
   * Get the data category for a sensor field or metric
   *
   * @param sensorType - Type of sensor
   * @param fieldKey - Optional field key for multi-field sensors
   * @returns Data category or null if not found
   */
  private getCategoryForSensor(sensorType: SensorType, fieldKey?: string): DataCategory | null {
    const schema = getSensorSchema(sensorType);
    if (!schema) {
      log.app('[ThresholdPresentationService] No schema found for sensor type', () => ({
        sensorType,
      }));
      return null;
    }

    // If fieldKey provided, get category from that specific field
    if (fieldKey) {
      const field = schema.fields[fieldKey as keyof typeof schema.fields];
      if (!field || !field.unitType) {
        log.app('[ThresholdPresentationService] No unitType found for field', () => ({
          sensorType,
          fieldKey,
        }));
        return null;
      }
      return (field.unitType as DataCategory) || null;
    }

    // Find first field with unitType (for single-metric or default lookup)
    const fieldWithUnit = Object.entries(schema.fields).find(
      ([_, field]) => field && 'unitType' in field && field.unitType
    );

    if (!fieldWithUnit) {
      log.app(`No field with unitType found for ${sensorType}`, () => ({}));
      return null;
    }

    return (fieldWithUnit[1] as any)?.unitType || null;
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
