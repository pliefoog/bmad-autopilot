/**
 * Threshold Formula Validator
 * 
 * Validates that all formula-based thresholds reference valid sensor fields.
 * Should be run once at application startup to catch schema errors early.
 * 
 * Validation Rules:
 * - All field names in formulas must exist in the sensor's field definitions
 * - Formulas can only reference fields defined in the same sensor type
 * - Invalid field references throw descriptive errors with context
 * 
 * Example Error:
 * "Invalid formula in battery sensor: 'nominalVotage * 0.985' references 
 *  non-existent field 'nominalVotage'. Valid fields: nominalVoltage, capacity, temperature"
 */

import { SENSOR_SCHEMAS } from '../registry/sensorSchemas';
import { extractFieldNames } from './formulaEvaluator';
import type { ThresholdConfig } from '../registry/sensorSchemas';

/**
 * Validates a single formula against a sensor type's field definitions
 * 
 * @param formula - Formula string to validate
 * @param sensorType - Sensor type (battery, engine, etc.)
 * @param context - Additional context for error messages (e.g., "battery.voltage.lead-acid.critical")
 * @param threshold - Threshold config to check indirectThreshold consistency
 * @throws Error if formula references non-existent fields or indirectThreshold mismatch
 */
function validateFormula(
  formula: string,
  sensorType: string,
  context: string,
  threshold?: ThresholdConfig
): void {
  // Extract field names referenced in the formula
  const referencedFields = extractFieldNames(formula);
  
  // Get valid field names for this sensor type
  const sensorSchema = SENSOR_SCHEMAS[sensorType as keyof typeof SENSOR_SCHEMAS];
  if (!sensorSchema) {
    throw new Error(
      `Schema validation error: Unknown sensor type '${sensorType}' in context '${context}'`
    );
  }
  
  const validFields = Object.keys(sensorSchema.fields);
  
  // Check for indirectThreshold consistency (Jan 2025)
  const usesIndirectThreshold = referencedFields.includes('indirectThreshold');
  const hasIndirectThresholdField = threshold?.indirectThreshold !== undefined;
  
  if (usesIndirectThreshold && !hasIndirectThresholdField) {
    throw new Error(
      `Schema validation error in ${sensorType} sensor (${context}):\n` +
      `  Formula uses 'indirectThreshold' variable but field is missing\n` +
      `  Formula: "${formula}"\n` +
      `  Add indirectThreshold field to ThresholdConfig`
    );
  }
  
  if (!usesIndirectThreshold && hasIndirectThresholdField) {
    throw new Error(
      `Schema validation error in ${sensorType} sensor (${context}):\n` +
      `  Field has indirectThreshold but formula doesn't use it\n` +
      `  Formula: "${formula}"\n` +
      `  Either remove indirectThreshold field or update formula to reference it`
    );
  }
  
  // Check each referenced field exists in the schema (exclude 'indirectThreshold' - it's injected at runtime)
  const invalidFields: string[] = [];
  for (const field of referencedFields) {
    if (field !== 'indirectThreshold' && !validFields.includes(field)) {
      invalidFields.push(field);
    }
  }
  
  if (invalidFields.length > 0) {
    throw new Error(
      `Schema validation error in ${sensorType} sensor (${context}):\n` +
      `  Formula: "${formula}"\n` +
      `  Invalid field(s): ${invalidFields.join(', ')}\n` +
      `  Valid fields: ${validFields.join(', ')}`
    );
  }
}

/**
 * Validates all threshold formulas in a sensor schema
 * 
 * @param sensorType - Sensor type to validate
 */
function validateSensorThresholds(sensorType: string): void {
  const sensorSchema = SENSOR_SCHEMAS[sensorType as keyof typeof SENSOR_SCHEMAS];
  if (!sensorSchema) {
    return; // Skip unknown sensor types
  }
  
  // Iterate through all fields in the sensor
  for (const [fieldName, fieldConfig] of Object.entries(sensorSchema.fields)) {
    const alarm = (fieldConfig as any).alarm;
    if (!alarm) {
      continue; // Field has no alarm configuration
    }
    
    // Check if alarm has context-based thresholds (battery, engine)
    if (alarm.contexts) {
      for (const [contextName, contextConfig] of Object.entries(alarm.contexts)) {
        const context = contextConfig as any;
        
        // Validate critical threshold formula
        if (context.critical?.formula) {
          validateFormula(
            context.critical.formula,
            sensorType,
            `${fieldName}.${contextName}.critical`,
            context.critical
          );
        }
        
        // Validate warning threshold formula
        if (context.warning?.formula) {
          validateFormula(
            context.warning.formula,
            sensorType,
            `${fieldName}.${contextName}.warning`,
            context.warning
          );
        }
      }
    } else {
      // Simple alarm without contexts (depth, wind, etc.)
      const criticalThreshold = alarm.critical as ThresholdConfig | undefined;
      const warningThreshold = alarm.warning as ThresholdConfig | undefined;
      
      if (criticalThreshold?.formula) {
        validateFormula(
          criticalThreshold.formula,
          sensorType,
          `${fieldName}.critical`,
          criticalThreshold
        );
      }
      
      if (warningThreshold?.formula) {
        validateFormula(
          warningThreshold.formula,
          sensorType,
          `${fieldName}.warning`,
          warningThreshold
        );
      }
    }
  }
}

/**
 * Validates all threshold formulas across all sensor schemas
 * 
 * Should be called once at application startup before any threshold resolution.
 * Throws an error if any formula references invalid fields.
 * 
 * @throws Error if any formula validation fails
 */
export function validateAllThresholdFormulas(): void {
  const sensorTypes = Object.keys(SENSOR_SCHEMAS);
  const errors: string[] = [];
  
  for (const sensorType of sensorTypes) {
    try {
      validateSensorThresholds(sensorType);
    } catch (error) {
      if (error instanceof Error) {
        errors.push(error.message);
      }
    }
  }
  
  if (errors.length > 0) {
    throw new Error(
      `Threshold formula validation failed:\n\n${errors.join('\n\n')}\n\n` +
      `Fix these schema errors before starting the application.`
    );
  }
}

/**
 * Validates formulas for a specific sensor type
 * Useful for testing or partial validation
 * 
 * @param sensorType - Sensor type to validate
 * @throws Error if validation fails
 */
export function validateSensorFormulas(sensorType: string): void {
  validateSensorThresholds(sensorType);
}
