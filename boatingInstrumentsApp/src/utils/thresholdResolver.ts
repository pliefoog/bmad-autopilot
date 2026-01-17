/**
 * Threshold Resolver - Converts threshold definitions to numeric values
 *
 * Purpose:
 * - Resolves formula-based thresholds (e.g., "capacity * 0.5") to concrete numbers
 * - Handles static thresholds (direct numeric values)
 * - Bridges schema-defined formulas to runtime alarm evaluation
 *
 * Key Features:
 * - Formula evaluation using evaluateFormula utility
 * - Static threshold pass-through for simple cases
 * - Graceful fallback (returns undefined if formula cannot be evaluated)
 *
 * Critical Implementation Details:
 * - Temperature compensation now embedded in formulas (e.g., "+ (temperature - 25) * -0.05")
 * - All numeric thresholds are in SI units per the system's spec
 * - Returns undefined if formula references missing fields (allows alarm to skip)
 */

import { SensorConfiguration } from '../types/SensorData';
import { SENSOR_SCHEMAS } from '../registry/sensorSchemas';
import type { ThresholdConfig } from '../registry/sensorSchemas';
import { evaluateFormula } from './formulaEvaluator';

/**
 * Resolve a threshold to a numeric value
 *
 * Implementation Notes:
 * - If threshold has static value field, returns the value directly
 * - If threshold has formula field, evaluates formula with sensor config as context
 * - Returns undefined if neither value nor formula present, or if formula evaluation fails
 * - Hysteresis and sound are extracted separately for use in alarm evaluation
 *
 * Formula Evaluation:
 * - Formula can reference any field in sensor config (e.g., "capacity", "nominalVoltage", "temperature")
 * - Formulas are JavaScript expressions evaluated with sensor fields as variables
 * - Temperature compensation embedded in formula: "nominalVoltage * 0.985 + (temperature - 25) * -0.05"
 * - Returns undefined if any field referenced by formula is missing or not numeric
 *
 * IndirectThreshold Support (Jan 2025):
 * - When threshold.indirectThreshold exists, inject it into formula evaluation context
 * - This allows user-adjustable ratios/multipliers in formulas (e.g., "capacity * indirectThreshold")
 * - Fallback defaults applied when base parameters missing: nominalVoltage=12V, capacity=140Ah, maxRpm=3000, temperature=25°C
 *
 * @param threshold - Threshold definition (ThresholdConfig with value or formula fields)
 * @param sensorConfig - Full sensor configuration with all field values
 * @returns Numeric threshold value in SI units, or undefined if cannot resolve
 */
export function resolveThreshold(
  threshold: ThresholdConfig,
  sensorConfig: SensorConfiguration,
): number | undefined {
  // Static threshold: return value directly
  if (threshold.value !== undefined) {
    return threshold.value;
  }

  // Formula-based threshold: evaluate formula with sensor config
  if (threshold.formula) {
    // Build evaluation context with sensor config + indirectThreshold + fallback defaults
    const context: Record<string, number | undefined> = {
      ...(sensorConfig as unknown as Record<string, number | undefined>),
    };

    // Inject indirectThreshold if present
    if (threshold.indirectThreshold !== undefined) {
      context.indirectThreshold = threshold.indirectThreshold;
    }

    // Apply fallback defaults for missing base parameters
    if (context.nominalVoltage === undefined) {
      context.nominalVoltage = 12;  // 12V system default
    }
    if (context.capacity === undefined) {
      context.capacity = 140;  // 140Ah typical house battery
    }
    if (context.maxRpm === undefined) {
      context.maxRpm = 3000;  // 3000 RPM typical marine diesel
    }
    if (context.temperature === undefined) {
      context.temperature = 25;  // 25°C standard reference temperature
    }

    return evaluateFormula(threshold.formula, context);
  }

  // No value or formula - invalid threshold
  return undefined;
}

/**
 * Resolve both critical and warning thresholds for a metric
 *
 * Convenience function that resolves both thresholds and returns a complete
 * threshold structure ready for alarm evaluation.
 *
 * @param criticalDef - Critical threshold definition
 * @param warningDef - Warning threshold definition
 * @param sensorConfig - Sensor configuration
 * @returns Object with critical and warning numeric thresholds
 */
export function resolveThresholdPair(
  criticalDef: ThresholdConfig,
  warningDef: ThresholdConfig,
  sensorConfig: SensorConfiguration,
) {
  return {
    critical: resolveThreshold(criticalDef, sensorConfig),
    warning: resolveThreshold(warningDef, sensorConfig),
  };
}