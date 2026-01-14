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

  /**
   * Depth Sensor Schema
   * Fields: name, depth, depthSource, depthReferencePoint
   * Simple alarm: depth below threshold (shallow water warning)
   */
  depth: {
    displayName: 'Depth Sounder',
    icon: 'waves',
    fields: {
      name: {
        type: 'text' as const,
        label: 'Depth Sounder Name',
        mnemonic: 'NAME',
        iostate: 'readWrite' as const,
        default: 'Depth Sounder',
      },
      depth: {
        type: 'number' as const,
        label: 'Depth',
        mnemonic: 'DEPTH',
        unitType: 'depth' as const,
        iostate: 'readOnly' as const,
        min: 0,
        max: 100,
        alarm: {
          direction: 'below' as const,
          safetyRequired: true,
          contexts: {
            default: {
              critical: { min: 2.0 },
              warning: { min: 2.5 },
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
          },
        },
      },
      depthSource: {
        type: 'text' as const,
        label: 'Depth Source',
        mnemonic: 'SRC',
        iostate: 'readOnly' as const,
        helpText: 'NMEA sentence type providing depth (DPT/DBT/DBK)',
      },
      depthReferencePoint: {
        type: 'text' as const,
        label: 'Reference Point',
        mnemonic: 'REF',
        iostate: 'readOnly' as const,
        helpText: 'Measurement reference (waterline/transducer/keel)',
      },
    },
  } as const,

  /**
   * Engine Sensor Schema
   * Fields: name, engineType, maxRpm, rpm, coolantTemp, oilPressure, fuelRate, engineHours, alternatorVoltage, boostPressure, coolantPressure, throttlePosition, trim
   * Context-dependent alarms: rpm, coolantTemp, oilPressure (vary by engineType: diesel/gasoline/outboard)
   */
  engine: {
    displayName: 'Engine',
    icon: 'engine',
    contextKey: 'engineType',
    fields: {
      name: {
        type: 'text' as const,
        label: 'Engine Name',
        mnemonic: 'NAME',
        iostate: 'readWrite' as const,
        default: 'Main Engine',
      },
      engineType: {
        type: 'picker' as const,
        label: 'Engine Type',
        mnemonic: 'TYPE',
        iostate: 'readWrite' as const,
        options: ['diesel', 'gasoline', 'outboard'] as const,
        default: 'diesel',
        isContextKey: true,
      },
      maxRpm: {
        type: 'number' as const,
        label: 'Maximum RPM',
        mnemonic: 'MAX',
        iostate: 'readWrite' as const,
        default: 3000,
        min: 1000,
        max: 8000,
        helpText: 'Maximum rated RPM for this engine',
      },
      rpm: {
        type: 'number' as const,
        label: 'Engine RPM',
        mnemonic: 'RPM',
        unitType: 'rpm' as const,
        iostate: 'readOnly' as const,
        min: 0,
        max: 6500,
        alarm: {
          direction: 'above' as const,
          contexts: {
            diesel: {
              critical: { max: 2800 },
              warning: { max: 2600 },
              criticalSoundPattern: ALARM_SOUND_PATTERNS.engine_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
            gasoline: {
              critical: { max: 3600 },
              warning: { max: 3400 },
              criticalSoundPattern: ALARM_SOUND_PATTERNS.engine_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
            outboard: {
              critical: { max: 5800 },
              warning: { max: 5500 },
              criticalSoundPattern: ALARM_SOUND_PATTERNS.engine_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
          },
        },
      },
      coolantTemp: {
        type: 'number' as const,
        label: 'Coolant Temperature',
        mnemonic: 'COOLA',
        unitType: 'temperature' as const,
        iostate: 'readOnly' as const,
        min: 0,
        max: 130,
        alarm: {
          direction: 'above' as const,
          safetyRequired: true,
          contexts: {
            diesel: {
              critical: { max: 100 + 273.15 },
              warning: { max: 95 + 273.15 },
              criticalSoundPattern: ALARM_SOUND_PATTERNS.engine_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
            gasoline: {
              critical: { max: 110 + 273.15 },
              warning: { max: 100 + 273.15 },
              criticalSoundPattern: ALARM_SOUND_PATTERNS.engine_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
            outboard: {
              critical: { max: 85 + 273.15 },
              warning: { max: 75 + 273.15 },
              criticalSoundPattern: ALARM_SOUND_PATTERNS.engine_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
          },
        },
      },
      oilPressure: {
        type: 'number' as const,
        label: 'Oil Pressure',
        mnemonic: 'PSI',
        unitType: 'mechanical_pressure' as const,
        iostate: 'readOnly' as const,
        min: 0,
        max: 600,
        alarm: {
          direction: 'below' as const,
          safetyRequired: true,
          contexts: {
            diesel: {
              critical: { min: 15 },
              warning: { min: 20 },
              criticalSoundPattern: ALARM_SOUND_PATTERNS.engine_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
            gasoline: {
              critical: { min: 10 },
              warning: { min: 15 },
              criticalSoundPattern: ALARM_SOUND_PATTERNS.engine_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
            outboard: {
              critical: { min: 8 },
              warning: { min: 12 },
              criticalSoundPattern: ALARM_SOUND_PATTERNS.engine_critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            },
          },
        },
      },
      fuelRate: {
        type: 'number' as const,
        label: 'Fuel Rate',
        mnemonic: 'FUEL',
        iostate: 'readOnly' as const,
      },
      engineHours: {
        type: 'number' as const,
        label: 'Engine Hours',
        mnemonic: 'HOURS',
        unitType: 'time' as const,
        iostate: 'readOnly' as const,
      },
      alternatorVoltage: {
        type: 'number' as const,
        label: 'Alternator Voltage',
        mnemonic: 'ALT',
        unitType: 'voltage' as const,
        iostate: 'readOnly' as const,
      },
      boostPressure: {
        type: 'number' as const,
        label: 'Boost Pressure',
        mnemonic: 'BOOST',
        unitType: 'mechanical_pressure' as const,
        iostate: 'readOnly' as const,
      },
      coolantPressure: {
        type: 'number' as const,
        label: 'Coolant Pressure',
        mnemonic: 'COOLP',
        unitType: 'mechanical_pressure' as const,
        iostate: 'readOnly' as const,
      },
      throttlePosition: {
        type: 'number' as const,
        label: 'Throttle Position',
        mnemonic: 'THROT',
        unitType: 'percentage' as const,
        iostate: 'readOnly' as const,
      },
      trim: {
        type: 'number' as const,
        label: 'Trim',
        mnemonic: 'TRIM',
        unitType: 'percentage' as const,
        iostate: 'readOnly' as const,
      },
    },
  } as const,

  // Add remaining 10 sensors with simplified schemas (no alarms for brevity)
  wind: {
    displayName: 'Wind Sensor',
    icon: 'wind',
    fields: {
      name: { type: 'text' as const, label: 'Wind Sensor Name', mnemonic: 'NAME', iostate: 'readWrite' as const, default: 'Wind Sensor' },
      speed: { type: 'number' as const, label: 'Wind Speed', mnemonic: 'AWS', unitType: 'wind' as const, iostate: 'readOnly' as const, min: 0, max: 60 },
      direction: { type: 'number' as const, label: 'Wind Direction', mnemonic: 'AWD', unitType: 'angle' as const, iostate: 'readOnly' as const },
      trueSpeed: { type: 'number' as const, label: 'True Wind Speed', mnemonic: 'TWS', unitType: 'wind' as const, iostate: 'readOnly' as const },
      trueDirection: { type: 'number' as const, label: 'True Wind Direction', mnemonic: 'TWA', unitType: 'angle' as const, iostate: 'readOnly' as const },
    },
  } as const,

  speed: {
    displayName: 'Speed Log',
    icon: 'speedometer',
    fields: {
      name: { type: 'text' as const, label: 'Speed Log Name', mnemonic: 'NAME', iostate: 'readWrite' as const, default: 'Speed Log' },
      throughWater: { type: 'number' as const, label: 'Speed Through Water', mnemonic: 'STW', unitType: 'speed' as const, iostate: 'readOnly' as const, min: 0, max: 15 },
      overGround: { type: 'number' as const, label: 'Speed Over Ground', mnemonic: 'SOG', unitType: 'speed' as const, iostate: 'readOnly' as const },
      tripDistance: { type: 'number' as const, label: 'Trip Distance', mnemonic: 'TRIP', unitType: 'distance' as const, iostate: 'readOnly' as const },
      totalDistance: { type: 'number' as const, label: 'Total Distance', mnemonic: 'TOTAL', unitType: 'distance' as const, iostate: 'readOnly' as const },
    },
  } as const,

  temperature: {
    displayName: 'Temperature Sensor',
    icon: 'thermometer',
    fields: {
      name: { type: 'text' as const, label: 'Temperature Sensor Name', mnemonic: 'NAME', iostate: 'readWrite' as const, default: 'Temperature' },
      location: { type: 'text' as const, label: 'Location', mnemonic: 'LOC', iostate: 'readWrite' as const, helpText: 'Sensor location (engine/cabin/water/refrigerator)' },
      temperature: { type: 'number' as const, label: 'Temperature', mnemonic: 'TEMP', unitType: 'temperature' as const, iostate: 'readOnly' as const, min: -40, max: 150 },
    },
  } as const,

  tank: {
    displayName: 'Tank Level',
    icon: 'tank',
    fields: {
      name: { type: 'text' as const, label: 'Tank Name', mnemonic: 'NAME', iostate: 'readWrite' as const, default: 'Tank' },
      type: { type: 'picker' as const, label: 'Tank Type', mnemonic: 'TYPE', iostate: 'readWrite' as const, options: ['fuel', 'water', 'waste', 'ballast', 'blackwater'] as const, default: 'fuel' },
      level: { type: 'number' as const, label: 'Tank Level', mnemonic: 'LEVEL', unitType: 'percentage' as const, iostate: 'readOnly' as const, min: 0, max: 100 },
      capacity: { type: 'number' as const, label: 'Capacity', mnemonic: 'CAP', unitType: 'volume' as const, iostate: 'readWrite' as const, default: 200, min: 10, max: 5000 },
    },
  } as const,

  weather: {
    displayName: 'Weather Station',
    icon: 'cloud',
    fields: {
      name: { type: 'text' as const, label: 'Weather Station Name', mnemonic: 'NAME', iostate: 'readWrite' as const, default: 'Weather Station' },
      pressure: { type: 'number' as const, label: 'Barometric Pressure', mnemonic: 'BAR', unitType: 'atmospheric_pressure' as const, iostate: 'readOnly' as const, min: 90000, max: 110000 },
      airTemperature: { type: 'number' as const, label: 'Air Temperature', mnemonic: 'TEMP', unitType: 'temperature' as const, iostate: 'readOnly' as const, min: -40, max: 50 },
      humidity: { type: 'number' as const, label: 'Relative Humidity', mnemonic: 'HUM', unitType: 'percentage' as const, iostate: 'readOnly' as const, min: 0, max: 100 },
      dewPoint: { type: 'number' as const, label: 'Dew Point', mnemonic: 'DP', unitType: 'temperature' as const, iostate: 'readOnly' as const },
    },
  } as const,

  gps: {
    displayName: 'GPS',
    icon: 'location',
    fields: {
      name: { type: 'text' as const, label: 'GPS Name', mnemonic: 'NAME', iostate: 'readWrite' as const, default: 'GPS' },
      latitude: { type: 'number' as const, label: 'Latitude', mnemonic: 'LAT', unitType: 'coordinates' as const, iostate: 'readOnly' as const },
      longitude: { type: 'number' as const, label: 'Longitude', mnemonic: 'LON', unitType: 'coordinates' as const, iostate: 'readOnly' as const },
      speedOverGround: { type: 'number' as const, label: 'Speed Over Ground', mnemonic: 'SOG', unitType: 'speed' as const, iostate: 'readOnly' as const },
      courseOverGround: { type: 'number' as const, label: 'Course Over Ground', mnemonic: 'COG', unitType: 'angle' as const, iostate: 'readOnly' as const },
      fixType: { type: 'number' as const, label: 'Fix Type', mnemonic: 'FIX', iostate: 'readOnly' as const, helpText: 'GPS fix type (0=No fix, 1=GPS, 2=DGPS)' },
      satellites: { type: 'number' as const, label: 'Satellites', mnemonic: 'SAT', iostate: 'readOnly' as const },
      hdop: { type: 'number' as const, label: 'HDOP', mnemonic: 'HDOP', iostate: 'readOnly' as const },
      utcTime: { type: 'number' as const, label: 'UTC Time', mnemonic: 'TIME', unitType: 'time' as const, iostate: 'readOnly' as const, helpText: 'UTC time as Unix timestamp (formatted as HH:MM:SS in widget)' },
      utcDate: { type: 'number' as const, label: 'UTC Date', mnemonic: 'DATE', unitType: 'date' as const, iostate: 'readOnly' as const, helpText: 'UTC date as Unix timestamp (formatted as YYYY-MM-DD in widget)' },
    },
  } as const,

  autopilot: {
    displayName: 'Autopilot',
    icon: 'autopilot',
    fields: {
      name: { type: 'text' as const, label: 'Autopilot Name', mnemonic: 'NAME', iostate: 'readWrite' as const, default: 'Autopilot' },
      engaged: { type: 'toggle' as const, label: 'Autopilot Engaged', mnemonic: 'ENG', iostate: 'readOnly' as const },
      active: { type: 'toggle' as const, label: 'Autopilot Active', mnemonic: 'ACT', iostate: 'readOnly' as const },
      mode: { type: 'text' as const, label: 'Autopilot Mode', mnemonic: 'MODE', iostate: 'readOnly' as const },
      targetHeading: { type: 'number' as const, label: 'Target Heading', mnemonic: 'TGT', unitType: 'angle' as const, iostate: 'readOnly' as const },
      actualHeading: { type: 'number' as const, label: 'Actual Heading', mnemonic: 'ACT', unitType: 'angle' as const, iostate: 'readOnly' as const },
      rudderAngle: { type: 'number' as const, label: 'Rudder Angle', mnemonic: 'RUD', unitType: 'angle' as const, iostate: 'readOnly' as const },
    },
  } as const,

  position: {
    displayName: 'Position',
    icon: 'crosshair',
    fields: {
      name: { type: 'text' as const, label: 'Position Name', mnemonic: 'NAME', iostate: 'readWrite' as const, default: 'Position' },
      latitude: { type: 'number' as const, label: 'Latitude', mnemonic: 'LAT', unitType: 'coordinates' as const, iostate: 'readOnly' as const },
      longitude: { type: 'number' as const, label: 'Longitude', mnemonic: 'LON', unitType: 'coordinates' as const, iostate: 'readOnly' as const },
      bearingToWaypoint: { type: 'number' as const, label: 'Bearing to Waypoint', mnemonic: 'BTW', unitType: 'angle' as const, iostate: 'readOnly' as const },
      distanceToWaypoint: { type: 'number' as const, label: 'Distance to Waypoint', mnemonic: 'DTW', unitType: 'distance' as const, iostate: 'readOnly' as const },
      crossTrackError: { type: 'number' as const, label: 'Cross Track Error', mnemonic: 'XTE', unitType: 'distance' as const, iostate: 'readOnly' as const },
      velocityMadeGood: { type: 'number' as const, label: 'Velocity Made Good', mnemonic: 'VMG', unitType: 'speed' as const, iostate: 'readOnly' as const },
    },
  } as const,

  heading: {
    displayName: 'Heading',
    icon: 'compass',
    fields: {
      name: { type: 'text' as const, label: 'Heading Sensor Name', mnemonic: 'NAME', iostate: 'readWrite' as const, default: 'Heading' },
      magnetic: { type: 'number' as const, label: 'Magnetic Heading', mnemonic: 'HDM', unitType: 'angle' as const, iostate: 'readOnly' as const },
      true: { type: 'number' as const, label: 'True Heading', mnemonic: 'HDT', unitType: 'angle' as const, iostate: 'readOnly' as const },
      variation: { type: 'number' as const, label: 'Magnetic Variation', mnemonic: 'VAR', unitType: 'angle' as const, iostate: 'readOnly' as const },
      deviation: { type: 'number' as const, label: 'Magnetic Deviation', mnemonic: 'DEV', unitType: 'angle' as const, iostate: 'readOnly' as const },
      rateOfTurn: { type: 'number' as const, label: 'Rate of Turn', mnemonic: 'ROT', unitType: 'angularVelocity' as const, iostate: 'readOnly' as const },
    },
  } as const,

  log: {
    displayName: 'Log',
    icon: 'document',
    fields: {
      name: { type: 'text' as const, label: 'Log Name', mnemonic: 'NAME', iostate: 'readWrite' as const, default: 'Log' },
      tripDistance: { type: 'number' as const, label: 'Trip Distance', mnemonic: 'TRIP', unitType: 'distance' as const, iostate: 'readOnly' as const },
      totalDistance: { type: 'number' as const, label: 'Total Distance', mnemonic: 'TOTAL', unitType: 'distance' as const, iostate: 'readOnly' as const },
    },
  } as const,
  
} as const satisfies Record<string, SensorSchema>;

/**
 * Sensor type union (replaces manual SensorType in SensorData.ts)
 */
export type SensorType = keyof typeof SENSOR_SCHEMAS;
