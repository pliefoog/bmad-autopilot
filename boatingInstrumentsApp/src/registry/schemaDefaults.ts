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
    // ThresholdConfig has: value, calculated, hysteresis, sound (instead of old min/max and sound patterns)
    const direction = field.alarm.direction;
    
    // Extract threshold values (only static values available during schema initialization)
    // Calculated thresholds will be resolved later when sensor config is available
    const criticalValue = defaults.critical?.value;
    const warningValue = defaults.warning?.value;
    
    const thresholds: any = {
      critical: {},
      warning: {},
      direction,
      staleThresholdMs: 5000, // Default stale threshold
      enabled: true, // Alarms enabled by default
    };
    
    // Extract sound patterns and hysteresis from ThresholdConfig
    if (defaults.critical?.sound) {
      thresholds.criticalSoundPattern = defaults.critical.sound;
    }
    if (defaults.warning?.sound) {
      thresholds.warningSoundPattern = defaults.warning.sound;
    }
    if (defaults.critical?.hysteresis !== undefined) {
      thresholds.hysteresis = defaults.critical.hysteresis;
    } else if (defaults.warning?.hysteresis !== undefined) {
      thresholds.hysteresis = defaults.warning.hysteresis;
    }
    
    // Set min/max based on alarm direction using static values
    if (direction === 'below') {
      if (criticalValue !== undefined) thresholds.critical.min = criticalValue;
      if (warningValue !== undefined) thresholds.warning.min = warningValue;
    } else if (direction === 'above') {
      if (criticalValue !== undefined) thresholds.critical.max = criticalValue;
      if (warningValue !== undefined) thresholds.warning.max = warningValue;
    }
    
    // Apply to sensor instance
    sensorInstance.updateThresholds(fieldKey, thresholds);
    
    log.storeInit(`  ✓ ${fieldKey}: critical=${criticalValue ?? 'calculated'}, warning=${warningValue ?? 'calculated'}`, () => ({}));
  }
}
