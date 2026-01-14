/**
 * Registry Public API - Helper Functions
 * 
 * Purpose:
 * - Provides convenience functions for accessing sensor schema
 * - Replaces old SensorConfigRegistry exports
 * - Centralizes schema access patterns
 * 
 * Migration from Old API:
 * - OLD: getSensorConfig(sensorType) → { fields, alarmMetrics, getDefaults }
 * - NEW: getSensorSchema(sensorType) → complete schema with inline alarms
 * - OLD: field.key to access field name
 * - NEW: Object.keys(schema.fields) to list field names
 * 
 * Usage:
 * ```typescript
 * // Get complete schema
 * const schema = getSensorSchema('battery');
 * 
 * // Get list of field names
 * const fieldNames = getSensorFields('battery');  // ['name', 'chemistry', 'voltage', ...]
 * 
 * // Get fields with alarms
 * const alarmFields = getAlarmFields('battery');  // ['voltage', 'current', 'temperature', 'stateOfCharge']
 * 
 * // Get context key (field that determines alarm defaults)
 * const contextKey = getContextKey('battery');  // 'chemistry'
 * 
 * // Get alarm defaults for specific context
 * const defaults = getAlarmDefaults('battery', 'voltage', 'lifepo4');
 * // Returns: { critical: { min: 12.8 }, warning: { min: 13.0 }, ... }
 * ```
 * 
 * Related Files:
 * - sensorSchemas.ts: Source data
 * - globalSensorCache.ts: Pre-computed lookups
 * - useSensorConfigForm.ts: Uses these helpers for dynamic form generation
 */

import { SENSOR_SCHEMAS, type SensorType, type SensorSchema, type FieldDefinition, type ContextAlarmDefinition } from './sensorSchemas';

// Re-export everything from sensorSchemas for convenience
export * from './sensorSchemas';

// Re-export global cache functions
export * from './globalSensorCache';

/**
 * Get complete sensor schema
 * @param sensorType - Sensor type (e.g., 'battery', 'depth')
 * @returns Complete sensor schema with all fields and alarm config
 */
export function getSensorSchema(sensorType: SensorType): SensorSchema {
  return SENSOR_SCHEMAS[sensorType];
}

/**
 * Get array of field names for a sensor
 * @param sensorType - Sensor type
 * @returns Array of field keys (e.g., ['name', 'chemistry', 'voltage', ...])
 */
export function getSensorFields(sensorType: SensorType): string[] {
  return Object.keys(SENSOR_SCHEMAS[sensorType].fields);
}

/**
 * Get array of field names that have alarm configuration
 * Used by forms/dialogs to render alarm threshold inputs
 * 
 * @param sensorType - Sensor type
 * @returns Array of field keys with alarm config
 * 
 * @example
 * ```typescript
 * getAlarmFields('battery')
 * // Returns: ['voltage', 'current', 'temperature', 'stateOfCharge']
 * ```
 */
export function getAlarmFields(sensorType: SensorType): string[] {
  const schema = SENSOR_SCHEMAS[sensorType];
  return Object.entries(schema.fields)
    .filter(([_, field]) => 'alarm' in field && field.alarm !== undefined)
    .map(([key, _]) => key);
}

/**
 * Get context key for a sensor (field that determines alarm context)
 * @param sensorType - Sensor type
 * @returns Context key field name, or undefined if no context-dependent alarms
 * 
 * @example
 * ```typescript
 * getContextKey('battery')  // 'chemistry'
 * getContextKey('engine')   // 'engineType'
 * getContextKey('depth')    // undefined (no context)
 * ```
 */
export function getContextKey(sensorType: SensorType): string | undefined {
  return SENSOR_SCHEMAS[sensorType].contextKey;
}

/**
 * Get alarm defaults for a specific field and context
 * @param sensorType - Sensor type
 * @param fieldKey - Field name
 * @param contextValue - Context value (e.g., 'lifepo4', 'diesel')
 * @returns Alarm thresholds for the context, or undefined if not found
 * 
 * @example
 * ```typescript
 * getAlarmDefaults('battery', 'voltage', 'lifepo4')
 * // Returns: {
 * //   critical: { min: 12.8 },
 * //   warning: { min: 13.0 },
 * //   criticalSoundPattern: 'battery_critical',
 * //   warningSoundPattern: 'warning'
 * // }
 * ```
 */
export function getAlarmDefaults(
  sensorType: SensorType,
  fieldKey: string,
  contextValue: string
): ContextAlarmDefinition | undefined {
  const schema = SENSOR_SCHEMAS[sensorType];
  const field = schema.fields[fieldKey as keyof typeof schema.fields];
  
  if (!field || !('alarm' in field) || !field.alarm) {
    return undefined;
  }
  
  return field.alarm.contexts[contextValue as keyof typeof field.alarm.contexts] as ContextAlarmDefinition | undefined;
}

/**
 * Check if a sensor has context-dependent alarms
 * @param sensorType - Sensor type
 * @returns True if sensor has contextKey defined
 */
export function hasContextDependentAlarms(sensorType: SensorType): boolean {
  return SENSOR_SCHEMAS[sensorType].contextKey !== undefined;
}

/**
 * Get field definition by key
 * @param sensorType - Sensor type
 * @param fieldKey - Field name
 * @returns Field definition or undefined if not found
 */
export function getFieldDefinition(sensorType: SensorType, fieldKey: string): FieldDefinition | undefined {
  const schema = SENSOR_SCHEMAS[sensorType];
  return schema.fields[fieldKey as keyof typeof schema.fields] as FieldDefinition | undefined;
}

/**
 * Get all context values for a sensor (if context-dependent)
 * @param sensorType - Sensor type
 * @returns Array of context values (e.g., ['lead-acid', 'agm', 'gel', 'lifepo4'])
 */
export function getContextValues(sensorType: SensorType): string[] {
  const contextKey = getContextKey(sensorType);
  if (!contextKey) {
    return [];
  }
  
  const schema = SENSOR_SCHEMAS[sensorType];
  const field = schema.fields[contextKey as keyof typeof schema.fields];
  if (!field || field.type !== 'picker' || !('options' in field)) {
    return [];
  }
  
  return Array.from(field.options ?? []);
}
