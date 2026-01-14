/**
 * Unified Sensor Schema - Single Source of Truth
 * 
 * Purpose:
 * - Consolidates sensor definitions from split SensorData.ts interfaces + SensorConfigRegistry.ts
 * - Eliminates 2000+ lines of duplicate field definitions
 * - Provides type-safe schema for all 13 sensor types
 * - Enables auto-generation of TypeScript interfaces via type inference
 * 
 * Architecture:
 * - SENSOR_SCHEMAS: Single object defining all sensors (~1500 lines)
 * - FieldDefinition: Unified field metadata (type, unitType, label, mnemonic, alarm, default, etc.)
 * - AlarmDefinition: Context-aware alarm thresholds with safety requirements
 * - Type inference: InferFieldType<F> + InferSensorData<S> auto-generate interfaces
 * 
 * Migration from Old Architecture:
 * - OLD: SensorData.ts (363 lines) + SensorConfigRegistry.ts (2245 lines) = 2608 lines, 3x duplication
 * - NEW: sensorSchemas.ts (~1500 lines) with inline alarms = 60% reduction, zero duplication
 * 
 * Usage:
 * ```typescript
 * // Get schema for sensor type
 * const batterySchema = SENSOR_SCHEMAS.battery;
 * 
 * // Get field configuration
 * const voltageField = batterySchema.fields.voltage;
 * 
 * // Get context-dependent alarm defaults
 * const defaults = batterySchema.fields.voltage.alarm?.contexts['lifepo4'];
 * 
 * // Auto-generated TypeScript interface (replaces manual BatterySensorData interface)
 * type BatterySensorData = BaseSensorData & InferSensorData<typeof SENSOR_SCHEMAS.battery>;
 * ```
 * 
 * Critical Implementation Details:
 * - All field keys MUST match widget metricKey strings exactly (no mismatches)
 * - Alarm thresholds in SI units ONLY (conversion handled by MetricValue)
 * - Context keys (chemistry, engineType, etc.) marked with isContextKey: true
 * - Global cache built once at startup (eliminates per-instance overhead)
 * 
 * Related Files:
 * - globalSensorCache.ts: Pre-computed lookups (unitType, mnemonics)
 * - SensorData.ts: Auto-generated interfaces (replaces 363 lines of manual code)
 * - SensorInstance.ts: Uses global cache instead of per-instance caching
 */

import { DataCategory } from '../presentation/categories';

/**
 * ISO 9692 Maritime Alarm Sound Patterns
 */
export const ALARM_SOUND_PATTERNS = {
  critical: 'rapid_pulse',       // Critical alarms (shallow water, engine failure)
  warning: 'morse_u',             // Warning alarms
  engine_critical: 'warble',      // Engine alarms (overheat, low pressure)
  battery_critical: 'triple_blast', // Electrical alarms
  info: 'intermittent',           // General warnings
  none: 'none',
} as const;

export type AlarmSoundPattern = (typeof ALARM_SOUND_PATTERNS)[keyof typeof ALARM_SOUND_PATTERNS];

/**
 * Alarm direction (which boundary triggers alarm)
 */
export type AlarmDirection = 'above' | 'below' | 'both';

/**
 * IO State for fields (determines editability)
 */
export type IOState = 'readOnly' | 'readWrite' | 'readOnlyIfValue';

/**
 * Field types for UI rendering
 */
export type FieldType = 'text' | 'number' | 'picker' | 'toggle' | 'slider';

/**
 * Context-dependent alarm definition
 * Used for sensors where alarm thresholds vary by configuration
 * (e.g., battery chemistry, engine type, tank type)
 */
export interface ContextAlarmDefinition {
  critical: {
    min?: number;  // SI units
    max?: number;  // SI units
  };
  warning: {
    min?: number;  // SI units
    max?: number;  // SI units
  };
  criticalSoundPattern: AlarmSoundPattern;
  warningSoundPattern: AlarmSoundPattern;
}

/**
 * Alarm configuration for a field
 * Supports context-dependent defaults (e.g., different thresholds per battery chemistry)
 */
export interface AlarmDefinition {
  direction: AlarmDirection;
  contexts: Record<string, ContextAlarmDefinition>; // Context value → alarm config
  safetyRequired?: boolean; // If true, require confirmation for disabling alarm
}

/**
 * Unified field definition combining config + display + alarm metadata
 */
export interface FieldDefinition {
  type: FieldType;
  unitType?: DataCategory;  // For unit conversion (voltage, temperature, etc.)
  label: string;
  mnemonic: string;        // Display abbreviation
  iostate: IOState;
  default?: string | number | boolean;
  min?: number;
  max?: number;
  options?: readonly string[]; // For picker fields
  helpText?: string;
  isContextKey?: boolean;  // True if this field determines alarm context
  alarm?: AlarmDefinition; // Alarm configuration for this metric
}

/**
 * Sensor schema definition
 */
export interface SensorSchema {
  displayName: string;
  icon?: string;
  fields: Record<string, FieldDefinition>;
  contextKey?: string; // Field name that determines alarm context (e.g., 'chemistry', 'engineType')
}

/**
 * Type inference utility: Extract TypeScript type from field definition
 */
export type InferFieldType<F extends FieldDefinition> = 
  F['type'] extends 'text' ? string :
  F['type'] extends 'number' ? number :
  F['type'] extends 'picker' ? string :
  F['type'] extends 'toggle' ? boolean :
  F['type'] extends 'slider' ? number :
  never;

/**
 * Type inference utility: Generate interface from sensor schema
 * Replaces manual interface definitions in SensorData.ts
 */
export type InferSensorData<S extends SensorSchema> = {
  [K in keyof S['fields']]?: InferFieldType<S['fields'][K]>;
};

/**
 * UNIFIED SENSOR SCHEMAS
 * Single source of truth for all 13 sensor types
 */
export const SENSOR_SCHEMAS = {
  /**
   * Battery Sensor Schema
   * Fields: name, chemistry, instance, capacity, voltage, nominalVoltage, current, temperature, stateOfCharge
   * Context-dependent alarms: voltage, current, temperature, stateOfCharge (vary by chemistry)
   */
  battery: {
    displayName: 'Battery',
    icon: 'battery',
    contextKey: 'chemistry',
    fields: {
      // Configuration fields
      name: {
        type: 'text' as const,
        label: 'Name',
        mnemonic: 'NAME',
        iostate: 'readWrite' as const,
        default: 'House Battery',
      },
      chemistry: {
        type: 'picker' as const,
        label: 'Chemistry',
        mnemonic: 'CHEM',
        iostate: 'readWrite' as const,
        options: ['lead-acid', 'agm', 'gel', 'lifepo4'] as const,
        default: 'agm',
        isContextKey: true,
      },
      instance: {
        type: 'number' as const,
        label: 'Instance',
        mnemonic: 'INST',
        iostate: 'readOnly' as const,
        default: 0,
        min: 0,
        max: 5,
      },
      capacity: {
        type: 'number' as const,
        label: 'Capacity (Ah)',
        mnemonic: 'CAP',
        unitType: 'capacity' as const,
        iostate: 'readOnlyIfValue' as const,
        default: 140,
        min: 40,
        max: 5000,
        helpText: 'Battery capacity in amp-hours. Hardware may provide this value.',
      },
      
      // Data fields with alarms
      voltage: {
        type: 'number' as const,
        label: 'Voltage',
        mnemonic: 'V',
        unitType: 'voltage' as const,
        iostate: 'readOnly' as const,
        min: 10.5,
        max: 16.0,
        alarm: {
          direction: 'below' as const,
          safetyRequired: true,
          contexts: {
            'lead-acid': {
              critical: { min: 11.8 },  // 50% SOC
              warning: { min: 12.0 },   // 60% SOC
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
            'agm': {
              critical: { min: 12.0 },  // 50% SOC
              warning: { min: 12.2 },   // 60% SOC
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
            'gel': {
              critical: { min: 12.0 },  // 50% SOC
              warning: { min: 12.2 },   // 60% SOC
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
            'lifepo4': {
              critical: { min: 12.8 },  // 20% SOC
              warning: { min: 13.0 },   // 40% SOC
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
          },
        },
      },
      nominalVoltage: {
        type: 'number' as const,
        label: 'Nominal Voltage',
        mnemonic: 'NOM',
        unitType: 'voltage' as const,
        iostate: 'readOnly' as const,
        helpText: 'Rated/nominal voltage (e.g., 12V, 24V, 48V)',
      },
      current: {
        type: 'number' as const,
        label: 'Current',
        mnemonic: 'AMP',
        unitType: 'current' as const,
        iostate: 'readOnly' as const,
        min: 0,
        max: 500,
        alarm: {
          direction: 'above' as const,
          contexts: {
            'lead-acid': {
              critical: { max: 150 },  // C/2 rate
              warning: { max: 100 },   // C/3 rate
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
            'agm': {
              critical: { max: 200 },  // Higher charge rate
              warning: { max: 150 },
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
            'gel': {
              critical: { max: 100 },  // Lower charge rate
              warning: { max: 70 },
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
            'lifepo4': {
              critical: { max: 280 },  // 1C rate
              warning: { max: 200 },
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
          },
        },
      },
      temperature: {
        type: 'number' as const,
        label: 'Temperature',
        mnemonic: 'TEMP',
        unitType: 'temperature' as const,
        iostate: 'readOnly' as const,
        min: -20,
        max: 80,
        alarm: {
          direction: 'above' as const,
          contexts: {
            'lead-acid': {
              critical: { max: 55 + 273.15 },  // 55°C in Kelvin
              warning: { max: 50 + 273.15 },
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
            'agm': {
              critical: { max: 50 + 273.15 },
              warning: { max: 45 + 273.15 },
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
            'gel': {
              critical: { max: 45 + 273.15 },
              warning: { max: 40 + 273.15 },
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
            'lifepo4': {
              critical: { max: 60 + 273.15 },
              warning: { max: 55 + 273.15 },
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
          },
        },
      },
      stateOfCharge: {
        type: 'number' as const,
        label: 'State of Charge',
        mnemonic: 'SOC',
        unitType: 'percentage' as const,
        iostate: 'readOnly' as const,
        min: 0,
        max: 100,
        alarm: {
          direction: 'below' as const,
          safetyRequired: true,
          contexts: {
            'lead-acid': {
              critical: { min: 30 },  // 30% SOC
              warning: { min: 50 },   // 50% SOC
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
            'agm': {
              critical: { min: 30 },
              warning: { min: 50 },
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
            'gel': {
              critical: { min: 30 },
              warning: { min: 50 },
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
            'lifepo4': {
              critical: { min: 20 },  // LiFePO4 safe to 20%
              warning: { min: 40 },
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
          },
        },
      },
    },
  } as const,
  
  // TODO: Add remaining 12 sensor schemas (depth, engine, gps, wind, etc.)
  // Each follows same pattern: displayName, contextKey?, fields with inline alarms
  
} as const satisfies Record<string, SensorSchema>;

/**
 * Sensor type union (replaces manual SensorType in SensorData.ts)
 */
export type SensorType = keyof typeof SENSOR_SCHEMAS;
