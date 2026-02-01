/**
 * Schema Defaults Application - Single-Phase Initialization
 * 
 * Purpose:
 * - Apply schema-defined default thresholds ONLY when no persisted config exists
 * - Called as fallback when sensor is first created
 * 
 * Clean Architecture (User's Design):
 * 1. Sensor created → Check AsyncStorage FIRST
 * 2. If persisted config exists → Use it (user values)
 * 3. If NO persisted config → Apply schema defaults (this file)
 * 4. User changes → Save to SensorInstance + AsyncStorage
 * 5. App restart → Same as step 1 (check AsyncStorage first)
 * 
 * Critical Implementation Details:
 * - Schema defaults are FALLBACK only
 * - User values ALWAYS preserved, never overwritten
 * - Context changes (battery chemistry, engine type) preserve user customizations
 * - Single-phase initialization eliminates race conditions
 * 
 * Related Files:
 * - SensorDataRegistry.ts: Checks AsyncStorage FIRST, calls this as fallback
 * - sensorConfigStore.ts: Persistent storage for user overrides
 */

import { type SensorType } from '../types/SensorData';
import type { SensorInstance } from '../types/SensorInstance';
import { getSensorSchema, getAlarmDefaults, getAlarmFields, getContextKey } from './index';
import { log } from '../utils/logging/logger';

/**
 * Apply schema-defined default thresholds to a sensor instance
 * Called when sensor is first created, before any user config is applied
 * 
 * @param sensorInstance - The sensor instance to configure
 * 
 * @example
 * ```typescript
 * // In SensorDataRegistry.update():
 * if (!sensor) {
 *   sensor = new SensorInstance(sensorType, instance);
 *   applySchemaDefaults(sensor);  // Apply defaults immediately
 *   this.sensors.set(key, sensor);
 * }
 * ```
 */
export function applySchemaDefaults(sensorInstance: SensorInstance): void {
  const sensorType = sensorInstance.sensorType;
  const schema = getSensorSchema(sensorType);
  
  // Get fields that have alarm configuration
  const alarmFields = getAlarmFields(sensorType);
  
  if (alarmFields.length === 0) {
    // No alarm fields, nothing to configure
    return;
  }
  
  // Get context key and default context value
  const contextKey = getContextKey(sensorType);
  let defaultContextValue = 'default';
  
  // For context-dependent sensors, get the default context value from schema
  if (contextKey) {
    const contextField = schema.fields[contextKey as keyof typeof schema.fields];
    if (contextField && 'default' in contextField) {
      defaultContextValue = String(contextField.default);
    }
  }
  
  log.storeInit(`📋 Applying schema defaults to ${sensorType}[${sensorInstance.instance}]`, () => ({
    sensorType,
    instance: sensorInstance.instance,
    alarmFields,
    contextValue: defaultContextValue,
  }));
  
  // Apply defaults for each alarm field
  for (const fieldKey of alarmFields) {
    const field = schema.fields[fieldKey as keyof typeof schema.fields];
    
    if (!field || !('alarm' in field) || !field.alarm) {
      continue;
    }
    
    // Get schema defaults for this field and context
    const defaults = getAlarmDefaults(sensorType, fieldKey, defaultContextValue);
    
    if (!defaults) {
      log.app(`⚠️ No defaults found for ${sensorType}.${fieldKey} context=${defaultContextValue}`, () => ({}));
      continue;
    }
    
    // Build threshold configuration from schema defaults (new ThresholdConfig structure)
    // ThresholdConfig has: value, formula, indirectThreshold, hysteresis, sound
    // MetricConfiguration (persistent) requires: critical, warning (numeric values or ratio in formula mode)
    const direction = field.alarm.direction;
    
    // Extract threshold values (only static values available during schema initialization)
    // Calculated thresholds will be resolved later when sensor config is available
    const criticalValue = defaults.critical?.value;
    const warningValue = defaults.warning?.value;
    
    // Check if formula mode (has indirectThreshold and formula)
    const hasFormula = defaults.critical?.formula || defaults.warning?.formula;
    const hasIndirect = defaults.critical?.indirectThreshold !== undefined;
    
    const thresholds: any = hasFormula && hasIndirect
      ? {
          mode: 'formula',
          criticalRatio: defaults.critical.indirectThreshold!,
          warningRatio: defaults.warning.indirectThreshold!,
          formula: defaults.critical.formula || defaults.warning.formula!,
          hysteresis: defaults.critical?.hysteresis ?? defaults.warning?.hysteresis,
          enabled: true,
        }
      : {
          mode: 'direct',
          critical: criticalValue ?? 0,
          warning: warningValue ?? 0,
          hysteresis: defaults.critical?.hysteresis ?? defaults.warning?.hysteresis,
          enabled: true,
        };
    
    // Apply to sensor instance
    sensorInstance.updateThresholds(fieldKey, thresholds);
    
    log.storeInit(`  ✓ ${fieldKey}: critical=${criticalValue ?? 'formula'}, warning=${warningValue ?? 'formula'}`, () => ({}));
  }
}
