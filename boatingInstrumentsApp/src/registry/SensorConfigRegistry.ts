/**
 * Central Sensor Configuration Registry
 *
 * **Purpose:**
 * Single source of truth for all sensor-specific configuration requirements.
 * Eliminates conditional sensor logic throughout the codebase by centralizing
 * configuration in a declarative registry pattern.
 *
 * **Design Principle**: Configuration over Code
 * - ✅ Add new sensor = add registry entry only (no component changes)
 * - ✅ No hardcoded sensor-specific conditionals in UI components
 * - ✅ Type-safe sensor configuration via TypeScript
 * - ✅ Extensible without modifying existing code
 *
 * **Architecture Benefits:**
 * 1. **Maintainability**: All sensor config in one file, easy to audit/update
 * 2. **Extensibility**: New sensors work automatically in SensorConfigDialog
 * 3. **Consistency**: Same rendering logic for all sensors
 * 4. **Testability**: Registry can be unit tested independently
 *
 * **Usage Example:**
 * ```typescript
 * // Get sensor configuration
 * const sensorConfig = getSensorConfig('battery');
 *
 * // Render fields dynamically
 * sensorConfig.fields.map(field => renderField(field));
 *
 * // Get default thresholds
 * const defaults = sensorConfig.getDefaults?.({ batteryChemistry: 'lithium' });
 * ```
 *
 * **Adding New Sensor:**
 * ```typescript
 * newSensor: {
 *   sensorType: 'newSensor',
 *   displayName: 'New Sensor',
 *   fields: [
 *     { key: 'name', label: 'Name', type: 'text' },
 *     // ... custom fields
 *   ],
 *   alarmSupport: 'single-metric', // or 'multi-metric' or 'none'
 *   getDefaults: (context) => getSmartDefaults('newSensor', context),
 * }
 * ```
 *
 * **Field Types:**
 * - `text`: String input (name, location)
 * - `number`: Numeric input (capacity, maxRpm)
 * - `picker`: Dropdown selection (chemistry, engineType)
 * - `toggle`: Boolean switch (not yet implemented)
 * - `slider`: Range selector (not yet implemented)
 *
 * **Hardware Integration:**
 * Fields can be marked read-only if provided by sensor hardware:
 * ```typescript
 * {
 *   key: 'batteryChemistry',
 *   readOnly: true,              // Check hardware first
 *   hardwareField: 'chemistry',   // Sensor data property name
 *   // If hardware provides value, field shows read-only
 *   // Otherwise falls back to user input
 * }
 * ```
 */

import { SensorType, SensorConfiguration } from '../types/SensorData';
import { DataCategory } from '../presentation/categories';

export type AlarmSupport = 'multi-metric' | 'single-metric' | 'none';
export type IOState = 'readOnly' | 'readWrite' | 'readOnlyIfValue';

/**
 * ISO 9692 Maritime Alarm Sound Patterns
 * - rapid_pulse: Critical alarms (shallow water, engine failure)
 * - morse_u: Warning alarms (shallow water warning)
 * - warble: Engine alarms (overheat, low pressure)
 * - triple_blast: Electrical alarms (low battery)
 * - intermittent: General warnings
 */
export const ALARM_SOUND_PATTERNS = {
  critical: 'rapid_pulse', // ISO 9692 critical alarm
  warning: 'morse_u', // ISO 9692 warning alarm
  engine_critical: 'warble', // ISO 9692 engine alarm
  battery_critical: 'triple_blast', // ISO 9692 electrical alarm
  info: 'intermittent',
  none: 'none',
} as const;

export type AlarmSoundPattern = (typeof ALARM_SOUND_PATTERNS)[keyof typeof ALARM_SOUND_PATTERNS];

/**
 * Field configuration for sensor-specific inputs
 *
 * **Architecture - Separation of Concerns:**
 * - `valueType`: Data storage type (string/number/boolean)
 * - `uiType`: UI component to render (textInput/picker/toggle/null)
 * - `unitType`: Unit conversion category (only for numeric measurements)
 *
 * **IOState Behavior:**
 * - `readOnly`: Always load from sensor[instance][hardwareField], disable editing
 * - `readWrite`: Load from sensor[instance][hardwareField], allow editing
 * - `readOnlyIfValue`: If sensor has value → read-only, if no value → editable with defaults
 *
 * **Field Roles:**
 * - Configuration fields: name, batteryChemistry, engineType - no unitType (strings/config values)
 * - Data fields: voltage, temperature, rpm - have unitType for unit conversion
 *
 * Future extensibility:
 * - uiType: 'custom' with customRenderer?: (props) => JSX.Element for specialized controls
 */

/**
 * Base field properties shared by all field types
 */
interface BaseFieldConfig {
  readonly key: string; // FormData key (immutable)
  label: string; // Display label
  readonly iostate: IOState; // Read/write behavior (immutable)
  readonly hardwareField?: string; // Sensor data property name (immutable)
  default?: any; // Default value when no sensor value
  helpText?: string; // User guidance tooltip
}

/**
 * Numeric field with unit conversion (voltage, temperature, pressure, etc.)
 * Requires min/max for threshold slider bounds
 */
interface NumericWithUnit extends BaseFieldConfig {
  readonly valueType: 'number';
  unitType: DataCategory; // Enables SI ↔ user unit conversion
  readonly min: number; // Threshold slider minimum (SI units)
  readonly max: number; // Threshold slider maximum (SI units)
  uiType: 'numericInput' | null; // null = not exposed in UI
}

/**
 * Numeric field without unit conversion (percentages, counts, ratios)
 * min/max optional (not always have thresholds)
 */
interface NumericRaw extends BaseFieldConfig {
  readonly valueType: 'number';
  unitType?: never; // No unit conversion
  readonly min?: number; // Optional threshold bounds
  readonly max?: number;
  uiType: 'numericInput' | null;
}

/**
 * String field (text input or picker enum)
 */
interface StringField extends BaseFieldConfig {
  readonly valueType: 'string';
  unitType?: never; // Strings don't have unit conversion
  min?: never; // No numeric constraints
  max?: never;
  uiType: 'textInput' | 'picker' | null;
  options?: Array<{ label: string; value: string; default?: boolean }>; // For picker type
}

/**
 * Boolean field (toggle switch)
 */
interface BooleanField extends BaseFieldConfig {
  readonly valueType: 'boolean';
  unitType?: never; // Booleans don't have unit conversion
  min?: never; // No numeric constraints
  max?: never;
  uiType: 'toggle' | null;
}

/**
 * Discriminated union of all field types
 * TypeScript enforces constraints at compile time
 */
export type SensorFieldConfig = NumericWithUnit | NumericRaw | StringField | BooleanField;

/**
 * Alarm metric configuration for multi-metric sensors
 *
 * Multi-metric sensors (like battery, engine) have multiple alarm points.
 * Each metric defines how that specific alarm behaves and presents data.
 *
 * **Example - Battery with 4 metrics:**
 * ```typescript
 * alarmMetrics: [
 *   { key: 'voltage', label: 'Voltage', unitType: 'voltage', direction: 'below' },
 *   { key: 'current', label: 'Current', unitType: 'current', direction: 'above' },
 *   { key: 'soc', label: 'State of Charge', direction: 'below' },  // No unitType = raw value
 *   { key: 'temperature', label: 'Temperature', unitType: 'temperature', direction: 'above' },
 * ]
 * ```
 *
 * **Field Documentation:**
 * - `key`: Metric identifier used in FormData and threshold storage (camelCase)
 * - `label`: Human-readable name shown in UI
 * - `unitType`: DataCategory for unit conversion system (voltage, temperature, current, etc.)
 *               Optional - omit for raw values that don't need unit conversion (like percentages)
 * - `direction`: Alarm triggers 'above' threshold (overtemp) or 'below' threshold (low voltage)
 */
export interface SensorAlarmMetricConfig {
  key: string; // Metric identifier (e.g., 'voltage')
  label: string; // Display name
  unitType?: DataCategory; // For unit conversion system (optional for raw values like percentages)
  direction: 'above' | 'below'; // Alarm direction
  // NOTE: No 'unit' field - values are ALWAYS stored in SI units
  // Presentation system handles conversion to user-selected units
}

/**
 * Threshold configuration for a single alarm level
 */
export interface ThresholdConfig {
  critical: number;
  warning: number;
  direction: 'above' | 'below';
  enabled: boolean;
  criticalSoundPattern: AlarmSoundPattern;
  warningSoundPattern: AlarmSoundPattern;
  criticalHysteresis: number;
  warningHysteresis: number;
  min?: number; // Slider minimum value (SI units)
  max?: number; // Slider maximum value (SI units)
}

/**
 * Default alarm configuration structure
 */
export interface AlarmDefaults {
  // For context-aware sensors (battery, engine, temperature, tank)
  contextKey?: string; // Which field determines context ('batteryChemistry', 'engineType', etc.)
  contexts?: Record<string, any>; // Context-specific threshold configurations

  // For simple sensors (depth, wind, speed) - direct threshold config
  threshold?: ThresholdConfig;
}

/**
 * Complete sensor configuration definition
 */
export interface SensorConfigDefinition {
  sensorType: SensorType;
  displayName: string;
  description?: string;

  // What fields are configurable for this sensor
  fields: SensorFieldConfig[];

  // Alarm configuration
  alarmSupport: AlarmSupport;
  alarmMetrics?: SensorAlarmMetricConfig[]; // For multi-metric sensors
  defaultAlarmDirection?: 'above' | 'below'; // For single-metric

  // Default values (PURE DATA - no functions)
  defaults?: AlarmDefaults;
}

/**
 * REGISTRY - Single source of truth for all sensor configuration requirements
 */
export const SENSOR_CONFIG_REGISTRY: Record<SensorType, SensorConfigDefinition> = {
  battery: {
    sensorType: 'battery',
    displayName: 'Battery',
    description: 'DC power system monitoring',

    fields: [
      // UI/Configuration fields
      {
        key: 'name',
        label: 'Battery Name',
        valueType: 'string',
        uiType: 'textInput',
        iostate: 'readWrite',
        default: '',
        helpText: 'Descriptive name for this battery (e.g., House Bank, Starter)',
      },
      {
        key: 'batteryChemistry',
        label: 'Battery Chemistry',
        valueType: 'string',
        uiType: 'picker',
        iostate: 'readOnlyIfValue',
        hardwareField: 'chemistry',
        options: [
          { label: 'Lead Acid', value: 'lead-acid', default: true },
          { label: 'AGM', value: 'agm' },
          { label: 'Gel', value: 'gel' },
          { label: 'LiFePO4', value: 'lifepo4' },
        ],
        helpText: 'Battery chemistry type. Hardware may provide this value.',
      },
      {
        key: 'capacity',
        label: 'Capacity (Ah)',
        valueType: 'number',
        unitType: 'capacity',
        uiType: 'numericInput',
        iostate: 'readOnlyIfValue',
        hardwareField: 'capacity',
        default: 140,
        min: 40,
        max: 5000,
        helpText: 'Battery capacity in amp-hours. Hardware may provide this value.',
      },
      // Data fields (with unitType for presentation)
      {
        key: 'voltage',
        label: 'Voltage',
        valueType: 'number',
        unitType: 'voltage',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'voltage',
        min: 10.5,
        max: 16.0,
      },
      {
        key: 'nominalVoltage',
        label: 'Nominal Voltage',
        valueType: 'number',
        unitType: 'voltage',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'nominalVoltage',
        helpText: 'Rated/nominal voltage (e.g., 12V, 24V, 48V)',
      },
      {
        key: 'current',
        label: 'Current',
        valueType: 'number',
        unitType: 'current',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'current',
        min: 0,
        max: 500,
      },
      {
        key: 'temperature',
        label: 'Temperature',
        valueType: 'number',
        unitType: 'temperature',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'temperature',
        min: -20,
        max: 80,
      },
      {
        key: 'soc',
        label: 'State of Charge',
        valueType: 'number',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'stateOfCharge',
        min: 0,
        max: 100,
        // Raw percentage 0-100, no unitType = no unit conversion
      },
    ],

    alarmSupport: 'multi-metric',
    alarmMetrics: [
      {
        key: 'voltage',
        label: 'Voltage',
        unitType: 'voltage',
        direction: 'below',
      },
      {
        key: 'current',
        label: 'Current',
        unitType: 'current',
        direction: 'above',
      },
      {
        key: 'temperature',
        label: 'Temperature',
        unitType: 'temperature',
        direction: 'above',
      },
      {
        key: 'soc',
        label: 'State of Charge',
        direction: 'below',
        // Raw percentage 0-100, no unitType = no unit conversion
      },
    ],

    defaults: {
      contextKey: 'batteryChemistry',
      contexts: {
        'lead-acid': {
          metrics: {
            voltage: {
              critical: 11.8,
              warning: 12.0,
              direction: 'below' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical, // triple_blast
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 0.2,
              warningHysteresis: 0.2,
              staleThresholdMs: 10000, // 10s - battery data
              min: 10.5,
              max: 16.0,
            },
            soc: {
              critical: 20,
              warning: 30,
              direction: 'below' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical, // triple_blast
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 5,
              warningHysteresis: 5,
              staleThresholdMs: 10000, // 10s - battery data
              min: 0,
              max: 100,
            },
            temperature: {
              critical: 50,
              warning: 45,
              direction: 'above' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical, // triple_blast
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 2,
              warningHysteresis: 2,
              staleThresholdMs: 10000, // 10s - battery data
            },
            current: {
              critical: 200,
              warning: 150,
              direction: 'above' as const,
              enabled: false,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical, // triple_blast
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 10,
              warningHysteresis: 10,
              staleThresholdMs: 10000, // 10s - battery data
              min: 0,
              max: 500,
            },
          },
        },
        agm: {
          metrics: {
            voltage: {
              critical: 12.0,
              warning: 12.2,
              direction: 'below' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical, // triple_blast
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 0.2,
              warningHysteresis: 0.2,
              staleThresholdMs: 10000, // 10s - battery data
              min: 10.5,
              max: 16.0,
            },
            soc: {
              critical: 20,
              warning: 30,
              direction: 'below' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical, // triple_blast
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 5,
              warningHysteresis: 5,
              staleThresholdMs: 10000, // 10s - battery data
              min: 0,
              max: 100,
            },
            temperature: {
              critical: 50,
              warning: 45,
              direction: 'above' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical, // triple_blast
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 2,
              warningHysteresis: 2,
              staleThresholdMs: 10000, // 10s - battery data
              min: -20,
              max: 80,
            },
            current: {
              critical: 250,
              warning: 200,
              direction: 'above' as const,
              enabled: false,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical, // triple_blast
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 10,
              warningHysteresis: 10,
              staleThresholdMs: 10000, // 10s - battery data
              min: 0,
              max: 500,
            },
          },
        },
        gel: {
          metrics: {
            voltage: {
              critical: 11.9,
              warning: 12.1,
              direction: 'below' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical, // triple_blast
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 0.2,
              warningHysteresis: 0.2,
              staleThresholdMs: 10000, // 10s - battery data
              min: 10.5,
              max: 16.0,
            },
            soc: {
              critical: 20,
              warning: 30,
              direction: 'below' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical, // triple_blast
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 5,
              warningHysteresis: 5,
              staleThresholdMs: 10000, // 10s - battery data
              min: 0,
              max: 100,
            },
            temperature: {
              critical: 45,
              warning: 40,
              direction: 'above' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical, // triple_blast
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 2,
              warningHysteresis: 2,
              staleThresholdMs: 10000, // 10s - battery data
              min: -20,
              max: 70,
            },
            current: {
              critical: 180,
              warning: 140,
              direction: 'above' as const,
              enabled: false,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical, // triple_blast
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 10,
              warningHysteresis: 10,
              staleThresholdMs: 10000, // 10s - battery data
              min: 0,
              max: 400,
            },
          },
        },
        lifepo4: {
          metrics: {
            voltage: {
              critical: 12.8,
              warning: 13.0,
              direction: 'below' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical, // triple_blast
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 0.2,
              warningHysteresis: 0.2,
              staleThresholdMs: 10000, // 10s - battery data
              min: 12.0,
              max: 15.0,
            },
            soc: {
              critical: 10,
              warning: 20,
              direction: 'below' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical, // triple_blast
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 5,
              warningHysteresis: 5,
              staleThresholdMs: 10000, // 10s - battery data
            },
            temperature: {
              critical: 55,
              warning: 50,
              direction: 'above' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical, // triple_blast
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 2,
              warningHysteresis: 2,
              staleThresholdMs: 10000, // 10s - battery data
              min: -20,
              max: 60,
            },
            current: {
              critical: 300,
              warning: 250,
              direction: 'above' as const,
              enabled: false,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.battery_critical, // triple_blast
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 10,
              warningHysteresis: 10,
              min: 0,
              max: 600,
            },
          },
        },
      },
    },
  },

  depth: {
    sensorType: 'depth',
    displayName: 'Depth Sounder',
    description: 'Water depth measurement',

    fields: [
      // UI/Configuration fields
      {
        key: 'name',
        label: 'Depth Sounder Name',
        valueType: 'string',
        uiType: 'textInput',
        iostate: 'readWrite',
        default: '',
        helpText: 'Descriptive name for this depth sounder (e.g., Bow Sounder)',
      },
      // Data fields
      {
        key: 'depth',
        label: 'Depth',
        valueType: 'number',
        unitType: 'depth',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'depth',
        min: 0,
        max: 100,
      },
      {
        key: 'depthSource',
        label: 'Depth Source',
        valueType: 'string',
        uiType: 'textInput',
        iostate: 'readOnly',
        hardwareField: 'depthSource',
        helpText: 'NMEA sentence type providing depth (DPT/DBT/DBK)',
      },
      {
        key: 'depthReferencePoint',
        label: 'Reference Point',
        valueType: 'string',
        uiType: 'textInput',
        iostate: 'readOnly',
        hardwareField: 'depthReferencePoint',
        helpText: 'Measurement reference (waterline/transducer/keel)',
      },
    ],

    alarmSupport: 'single-metric',
    defaultAlarmDirection: 'below',

    defaults: {
      threshold: {
        critical: 2.0,
        warning: 2.5,
        direction: 'below' as const,
        enabled: true,
        criticalSoundPattern: ALARM_SOUND_PATTERNS.critical, // rapid_pulse
        warningSoundPattern: ALARM_SOUND_PATTERNS.warning, // morse_u
        criticalHysteresis: 0.3,
        warningHysteresis: 0.3,
        staleThresholdMs: 2000, // 2s - navigation-critical sensor
        min: 0,
        max: 100,
      },
    },
  },

  engine: {
    sensorType: 'engine',
    displayName: 'Engine',
    description: 'Engine monitoring and diagnostics',

    fields: [
      // UI/Configuration fields
      {
        key: 'name',
        label: 'Engine Name',
        valueType: 'string',
        uiType: 'textInput',
        iostate: 'readWrite',
        default: '',
        helpText: 'Descriptive name for this engine (e.g., Port Engine, Main)',
      },
      {
        key: 'engineType',
        label: 'Engine Type',
        valueType: 'string',
        uiType: 'picker',
        iostate: 'readWrite',
        options: [
          { label: 'Diesel', value: 'diesel', default: true },
          { label: 'Gasoline', value: 'gasoline' },
          { label: 'Outboard', value: 'outboard' },
        ],
        helpText: 'Type of engine installation',
      },
      {
        key: 'maxRpm',
        label: 'Maximum RPM',
        valueType: 'number',
        uiType: 'numericInput',
        iostate: 'readWrite',
        default: 3000,
        min: 1000,
        max: 8000,
        helpText: 'Maximum rated RPM for this engine',
      },
      // Data fields (with unitType for presentation)
      {
        key: 'rpm',
        label: 'Engine RPM',
        valueType: 'number',
        unitType: 'rpm',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'rpm',
        min: 0,
        max: 6500,
      },
      {
        key: 'coolantTemp',
        label: 'Coolant Temperature',
        valueType: 'number',
        unitType: 'temperature',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'coolantTemp',
        min: 0,
        max: 130,
      },
      {
        key: 'oilPressure',
        label: 'Oil Pressure',
        valueType: 'number',
        unitType: 'mechanical_pressure',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'oilPressure',
        min: 0,
        max: 600,
      },
      {
        key: 'alternatorVoltage',
        label: 'Alternator Voltage',
        valueType: 'number',
        unitType: 'voltage',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'alternatorVoltage',
      },
      {
        key: 'fuelRate',
        label: 'Fuel Rate',
        valueType: 'number',
        unitType: 'flowRate',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'fuelRate',
      },
      {
        key: 'hours',
        label: 'Engine Hours',
        valueType: 'number',
        unitType: 'time',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'hours',
      },
      {
        key: 'shaftRpm',
        label: 'Shaft RPM',
        valueType: 'number',
        unitType: 'rpm',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'shaftRpm',
        helpText: 'Propeller shaft revolutions per minute',
      },
    ],

    alarmSupport: 'multi-metric',
    alarmMetrics: [
      {
        key: 'temperature',
        label: 'Coolant Temperature',
        unitType: 'temperature',
        direction: 'above',
      },
      {
        key: 'oilPressure',
        label: 'Oil Pressure',
        unitType: 'mechanical_pressure',
        direction: 'below',
      },
      {
        key: 'rpm',
        label: 'Engine RPM',
        unitType: 'rpm',
        direction: 'above',
      },
    ],

    defaults: {
      contextKey: 'engineType',
      contexts: {
        diesel: {
          metrics: {
            rpm: {
              critical: 2800,
              warning: 2600,
              direction: 'above' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.engine_critical, // warble
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning, // morse_u
              criticalHysteresis: 50,
              warningHysteresis: 50,
              staleThresholdMs: 5000, // 5s - engine data
              min: 0,
              max: 3500,
            },
            temperature: {
              critical: 105,
              warning: 95,
              direction: 'above' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.engine_critical, // warble
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning, // morse_u
              criticalHysteresis: 3,
              warningHysteresis: 3,
              staleThresholdMs: 5000, // 5s - engine data
              min: 0,
              max: 120,
            },
            oilPressure: {
              critical: 15,
              warning: 20,
              direction: 'below' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.engine_critical, // warble
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning, // morse_u
              criticalHysteresis: 3,
              warningHysteresis: 3,
              staleThresholdMs: 5000, // 5s - engine data
              min: 0,
              max: 600,
            },
          },
        },
        gasoline: {
          metrics: {
            rpm: {
              critical: 3600,
              warning: 3400,
              direction: 'above' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.engine_critical, // warble
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning, // morse_u
              criticalHysteresis: 100,
              warningHysteresis: 100,
              staleThresholdMs: 5000, // 5s - engine data
              min: 0,
              max: 4500,
            },
            temperature: {
              critical: 110,
              warning: 100,
              direction: 'above' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.engine_critical, // warble
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning, // morse_u
              criticalHysteresis: 3,
              warningHysteresis: 3,
              staleThresholdMs: 5000, // 5s - engine data
              min: 0,
              max: 130,
            },
            oilPressure: {
              critical: 10,
              warning: 15,
              direction: 'below' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.engine_critical, // warble
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning, // morse_u
              criticalHysteresis: 2,
              warningHysteresis: 2,
              staleThresholdMs: 5000, // 5s - engine data
              min: 0,
              max: 500,
            },
          },
        },
        outboard: {
          metrics: {
            rpm: {
              critical: 5800,
              warning: 5500,
              direction: 'above' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.engine_critical, // warble
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning, // morse_u
              criticalHysteresis: 100,
              warningHysteresis: 100,
              staleThresholdMs: 5000, // 5s - engine data
              min: 0,
              max: 6500,
            },
            temperature: {
              critical: 85,
              warning: 75,
              direction: 'above' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.engine_critical, // warble
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning, // morse_u
              criticalHysteresis: 3,
              warningHysteresis: 3,
              staleThresholdMs: 5000, // 5s - engine data
              min: 0,
              max: 100,
            },
            oilPressure: {
              critical: 8,
              warning: 12,
              direction: 'below' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.engine_critical, // warble
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning, // morse_u
              criticalHysteresis: 2,
              warningHysteresis: 2,
              staleThresholdMs: 5000, // 5s - engine data
              min: 0,
              max: 400,
            },
          },
        },
      },
    },
  },

  wind: {
    sensorType: 'wind',
    displayName: 'Wind Sensor',
    description: 'Wind speed and direction',

    fields: [
      // UI/Configuration fields
      {
        key: 'name',
        label: 'Wind Sensor Name',
        valueType: 'string',
        uiType: 'textInput',
        iostate: 'readWrite',
        default: '',
        helpText: 'Descriptive name for this wind sensor (e.g., Masthead Wind)',
      },
      // Data fields
      {
        key: 'speed',
        label: 'Wind Speed',
        valueType: 'number',
        unitType: 'wind',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'speed',
        min: 0,
        max: 60,
      },
      {
        key: 'direction',
        label: 'Wind Direction',
        valueType: 'number',
        unitType: 'angle',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'direction',
      },
      {
        key: 'trueSpeed',
        label: 'True Wind Speed',
        valueType: 'number',
        unitType: 'wind',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'trueSpeed',
        canBeCalculated: true, // Auto-calculated from AWS + GPS + heading if hardware VWT unavailable
      },
      {
        key: 'trueDirection',
        label: 'True Wind Direction',
        valueType: 'number',
        unitType: 'angle',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'trueDirection',
        canBeCalculated: true, // Auto-calculated from AWA + GPS + heading if hardware VWT unavailable
      },
    ],

    alarmSupport: 'single-metric',
    defaultAlarmDirection: 'above',

    defaults: {
      threshold: {
        critical: 40,
        warning: 30,
        direction: 'above' as const,
        enabled: false,
        criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
        warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
        criticalHysteresis: 3,
        warningHysteresis: 3,
        staleThresholdMs: 5000, // 5s - wind data (navigation-critical)
        min: 0,
        max: 60,
      },
    },
  },

  speed: {
    sensorType: 'speed',
    displayName: 'Speed Log',
    description: 'Boat speed measurement',

    fields: [
      // UI/Configuration fields
      {
        key: 'name',
        label: 'Speed Log Name',
        valueType: 'string',
        uiType: 'textInput',
        iostate: 'readWrite',
        default: '',
        helpText: 'Descriptive name for this speed sensor (e.g., Paddle Wheel)',
      },
      // Data fields
      {
        key: 'throughWater',
        label: 'Speed Through Water',
        valueType: 'number',
        unitType: 'speed',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'throughWater',
        min: 0,
        max: 15,
      },
      {
        key: 'overGround',
        label: 'Speed Over Ground',
        valueType: 'number',
        unitType: 'speed',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'overGround',
      },
    ],

    alarmSupport: 'single-metric',
    defaultAlarmDirection: 'above',

    defaults: {
      threshold: {
        critical: 8,
        warning: 7,
        direction: 'above' as const,
        enabled: false,
        criticalSoundPattern: ALARM_SOUND_PATTERNS.warning,
        warningSoundPattern: ALARM_SOUND_PATTERNS.info,
        criticalHysteresis: 0.5,
        warningHysteresis: 0.5,
        staleThresholdMs: 5000, // 5s - speed data (navigation-critical)
        min: 0,
        max: 15,
      },
    },
  },

  temperature: {
    sensorType: 'temperature',
    displayName: 'Temperature Sensor',
    description: 'Environmental temperature monitoring',

    fields: [
      // String metadata fields (stored as MetricValues without unitType)
      {
        key: 'name',
        label: 'Sensor Name',
        valueType: 'string',
        uiType: 'textInput',
        iostate: 'readWrite',
        hardwareField: 'name',
        default: '',
        helpText: 'Descriptive name for this temperature sensor (e.g., Engine Room)',
      },
      {
        key: 'location',
        label: 'Location',
        valueType: 'string',
        uiType: 'textInput',
        iostate: 'readWrite',
        hardwareField: 'location',
        default: 'unknown',
        helpText: 'Physical location - string MetricValue without formatting/conversion',
      },
      {
        key: 'units',
        label: 'Temperature Units',
        valueType: 'string',
        uiType: 'textInput',
        iostate: 'readOnly',
        hardwareField: 'units',
        default: 'C',
        helpText: 'Temperature units (C or F) - string MetricValue',
      },
      // Numeric data field (stored as MetricValue with unitType)
      {
        key: 'value',
        label: 'Temperature',
        valueType: 'number',
        unitType: 'temperature',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'value',
        min: -30,
        max: 150,
      },
    ],

    alarmSupport: 'single-metric',
    defaultAlarmDirection: 'above',

    defaults: {
      contextKey: 'location',
      contexts: {
        engineRoom: {
          threshold: {
            critical: 105,
            warning: 85,
            direction: 'above' as const,
            enabled: true,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
            warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            criticalHysteresis: 5,
            warningHysteresis: 5,
            staleThresholdMs: 15000, // 15s - temperature data
            min: 0,
            max: 150,
          },
        },
        cabin: {
          threshold: {
            critical: 40,
            warning: 35,
            direction: 'above' as const,
            enabled: false,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.warning,
            warningSoundPattern: ALARM_SOUND_PATTERNS.info,
            criticalHysteresis: 2,
            warningHysteresis: 2,
            staleThresholdMs: 15000, // 15s - temperature data
            min: -10,
            max: 50,
          },
        },
        fridge: {
          threshold: {
            critical: 10,
            warning: 8,
            direction: 'above' as const,
            enabled: true,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.warning,
            warningSoundPattern: ALARM_SOUND_PATTERNS.info,
            criticalHysteresis: 1,
            warningHysteresis: 1,
            staleThresholdMs: 15000, // 15s - temperature data
            min: -10,
            max: 20,
          },
        },
        freezer: {
          threshold: {
            critical: -10,
            warning: -15,
            direction: 'above' as const,
            enabled: true,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.warning,
            warningSoundPattern: ALARM_SOUND_PATTERNS.info,
            criticalHysteresis: 2,
            warningHysteresis: 2,
            staleThresholdMs: 15000, // 15s - temperature data
            min: -30,
            max: 0,
          },
        },
        outside: {
          threshold: {
            critical: 45,
            warning: 40,
            direction: 'above' as const,
            enabled: false,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.info,
            warningSoundPattern: ALARM_SOUND_PATTERNS.none,
            criticalHysteresis: 3,
            warningHysteresis: 3,
            staleThresholdMs: 15000, // 15s - temperature data
            min: -20,
            max: 60,
          },
        },
        seaWater: {
          threshold: {
            critical: 35,
            warning: 30,
            direction: 'above' as const,
            enabled: false,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.info,
            warningSoundPattern: ALARM_SOUND_PATTERNS.none,
            criticalHysteresis: 2,
            warningHysteresis: 2,
            staleThresholdMs: 15000, // 15s - temperature data
            min: -5,
            max: 40,
          },
        },
      },
    },
  },

  compass: {
    sensorType: 'compass',
    displayName: 'Compass',
    description: 'Magnetic heading',

    fields: [
      // UI/Configuration fields
      {
        key: 'name',
        label: 'Compass Name',
        valueType: 'string',
        uiType: 'textInput',
        iostate: 'readWrite',
        default: '',
        helpText: 'Descriptive name for this compass (e.g., Fluxgate Compass)',
      },
      // Data fields - Heading (both magnetic and true)
      {
        key: 'magneticHeading',
        label: 'Magnetic Heading',
        valueType: 'number',
        unitType: 'angle',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'magneticHeading',
        helpText: 'Magnetic heading (0-360°) - not corrected for variation',
      },
      {
        key: 'trueHeading',
        label: 'True Heading',
        valueType: 'number',
        unitType: 'angle',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'trueHeading',
        helpText: 'True heading (0-360°) - corrected for magnetic variation',
      },
      {
        key: 'variation',
        label: 'Magnetic Variation',
        valueType: 'number',
        unitType: 'angle',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'variation',
        helpText: 'Magnetic variation (difference between true and magnetic north)',
      },
      {
        key: 'deviation',
        label: 'Compass Deviation',
        valueType: 'number',
        unitType: 'angle',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'deviation',
        helpText: 'Compass deviation (local magnetic disturbance)',
      },
      {
        key: 'rateOfTurn',
        label: 'Rate of Turn',
        valueType: 'number',
        unitType: 'angularVelocity',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'rateOfTurn',
        helpText: 'Rate of turn in degrees per minute (calculated from heading if not provided by hardware)',
      },
    ],

    alarmSupport: 'none',
  },

  gps: {
    sensorType: 'gps',
    displayName: 'GPS',
    description: 'Position and navigation',

    fields: [
      // UI/Configuration fields
      {
        key: 'name',
        label: 'GPS Name',
        valueType: 'string',
        uiType: 'textInput',
        iostate: 'readWrite',
        default: '',
        helpText: 'Descriptive name for this GPS (e.g., Chart Plotter)',
      },
      // Position fields - proper MetricValues with coordinate formatting
      {
        key: 'latitude',
        label: 'Latitude',
        valueType: 'number',
        unitType: 'coordinates',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'latitude',
        helpText:
          "GPS latitude in decimal degrees (formatted per user preference: DD.ddddd° or DD° MM.mmm' N/S)",
      },
      {
        key: 'longitude',
        label: 'Longitude',
        valueType: 'number',
        unitType: 'coordinates',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'longitude',
        helpText:
          "GPS longitude in decimal degrees (formatted per user preference: DDD.ddddd° or DDD° MM.mmm' E/W)",
      },
      // Time field - proper MetricValue with time formatting
      {
        key: 'utcTime',
        label: 'UTC Time',
        valueType: 'number',
        unitType: 'time',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'utcTime',
        helpText:
          'UTC timestamp from GPS in milliseconds (formatted per user date/time preferences)',
      },
      // Navigation fields - proper MetricValues
      {
        key: 'speedOverGround',
        label: 'Speed Over Ground',
        valueType: 'number',
        unitType: 'speed',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'speedOverGround',
      },
      {
        key: 'courseOverGround',
        label: 'Course Over Ground',
        valueType: 'number',
        unitType: 'angle',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'courseOverGround',
      },
      // GPS Quality fields - split from quality object
      {
        key: 'fixType',
        label: 'Fix Type',
        valueType: 'number',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'fixType',
        helpText: 'GPS fix type (0=No fix, 1=GPS, 2=DGPS, etc.)',
      },
      {
        key: 'satellites',
        label: 'Satellites',
        valueType: 'number',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'satellites',
        helpText: 'Number of satellites in use',
      },
      {
        key: 'hdop',
        label: 'HDOP',
        valueType: 'number',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'hdop',
        helpText: 'Horizontal Dilution of Precision',
      },
      {
        key: 'timeSource',
        label: 'Time Source',
        valueType: 'string',
        uiType: 'textInput',
        iostate: 'readOnly',
        hardwareField: 'timeSource',
        helpText: 'Source sentence for time priority: RMC (1) > ZDA (2) > GGA (3)',
      },
    ],

    alarmSupport: 'none',
  },

  autopilot: {
    sensorType: 'autopilot',
    displayName: 'Autopilot',
    description: 'Automatic steering control',

    fields: [
      // UI/Configuration fields
      {
        key: 'name',
        label: 'Autopilot Name',
        valueType: 'string',
        uiType: 'textInput',
        iostate: 'readWrite',
        default: '',
        helpText: 'Descriptive name for this autopilot (e.g., Raymarine)',
      },
      // Data fields
      {
        key: 'engaged',
        label: 'Autopilot Engaged',
        valueType: 'boolean',
        uiType: 'toggle',
        iostate: 'readOnly',
        hardwareField: 'engaged',
        helpText: 'Whether autopilot is currently engaged',
      },
      {
        key: 'active',
        label: 'Autopilot Active',
        valueType: 'boolean',
        uiType: 'toggle',
        iostate: 'readOnly',
        hardwareField: 'active',
        helpText: 'Whether autopilot is actively controlling (separate from engaged)',
      },
      {
        key: 'mode',
        label: 'Autopilot Mode',
        valueType: 'string',
        uiType: 'textInput',
        iostate: 'readOnly',
        hardwareField: 'mode',
        helpText: 'Current autopilot mode (STANDBY, AUTO, WIND, TRACK, NAV)',
      },
      {
        key: 'targetHeading',
        label: 'Target Heading',
        valueType: 'number',
        unitType: 'angle',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'targetHeading',
        helpText: 'Target heading in degrees',
      },
      {
        key: 'actualHeading',
        label: 'Actual Heading',
        valueType: 'number',
        unitType: 'angle',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'actualHeading',
        helpText: 'Current actual heading being maintained (degrees)',
      },
      {
        key: 'headingSource',
        label: 'Heading Source',
        valueType: 'string',
        uiType: 'textInput',
        iostate: 'readOnly',
        hardwareField: 'headingSource',
        helpText: 'Source of heading data (COMPASS, GPS, GYRO)',
      },
      {
        key: 'rudderAngle',
        label: 'Rudder Angle',
        valueType: 'number',
        unitType: 'angle',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'rudderAngle',
        helpText: 'Current rudder position (-35 to +35 degrees, positive = starboard)',
      },
      {
        key: 'locked',
        label: 'Heading Locked',
        valueType: 'boolean',
        uiType: 'toggle',
        iostate: 'readOnly',
        hardwareField: 'locked',
        helpText: 'Whether heading is locked',
      },
      {
        key: 'alarm',
        label: 'Autopilot Alarm',
        valueType: 'boolean',
        uiType: 'toggle',
        iostate: 'readOnly',
        hardwareField: 'alarm',
        helpText: 'Autopilot alarm condition (threshold-based)',
      },
    ],

    alarmSupport: 'none',
  },

  navigation: {
    sensorType: 'navigation',
    displayName: 'Navigation',
    description: 'Navigation and routing data',

    fields: [
      // UI/Configuration fields
      {
        key: 'name',
        label: 'System Name',
        valueType: 'string',
        uiType: 'textInput',
        iostate: 'readWrite',
        default: '',
        helpText: 'Descriptive name for this navigation system',
      },
      // Data fields
      {
        key: 'bearingToWaypoint',
        label: 'Bearing to Waypoint',
        valueType: 'number',
        unitType: 'angle',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'bearingToWaypoint',
      },
      {
        key: 'distanceToWaypoint',
        label: 'Distance to Waypoint',
        valueType: 'number',
        unitType: 'distance',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'distanceToWaypoint',
      },
      {
        key: 'crossTrackError',
        label: 'Cross Track Error',
        valueType: 'number',
        unitType: 'distance',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'crossTrackError',
      },
    ],

    alarmSupport: 'none',
  },

  weather: {
    sensorType: 'weather',
    displayName: 'Weather Station',
    description: 'Atmospheric conditions monitoring',

    fields: [
      // Configuration fields
      {
        key: 'name',
        label: 'Station Name',
        valueType: 'string',
        uiType: 'textInput',
        iostate: 'readWrite',
        hardwareField: 'name',
        default: 'Weather Station',
        helpText: 'Descriptive name for this weather station',
      },
      // Hardware data fields
      {
        key: 'pressure',
        label: 'Barometric Pressure',
        valueType: 'number',
        unitType: 'atmospheric_pressure',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'pressure',
        min: 90000,
        max: 110000,
        helpText: 'Atmospheric pressure in Pascals (PRIMARY metric)',
      },
      {
        key: 'airTemperature',
        label: 'Air Temperature',
        valueType: 'number',
        unitType: 'temperature',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'airTemperature',
        min: -40,
        max: 50,
        helpText: 'Outside air temperature in Celsius',
      },
      {
        key: 'humidity',
        label: 'Relative Humidity',
        valueType: 'number',
        unitType: 'percentage',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'humidity',
        min: 0,
        max: 100,
        helpText: 'Relative humidity percentage (0-100%)',
      },
      {
        key: 'dewPoint',
        label: 'Dew Point',
        valueType: 'number',
        unitType: 'temperature',
        uiType: null, // Not editable - calculated or hardware provided
        iostate: 'readOnly',
        hardwareField: 'dewPoint',
        helpText: 'Dew point temperature (calculated if not provided by hardware)',
      },
    ],

    alarmSupport: 'multi-metric',

    alarmMetrics: [
      {
        key: 'pressure',
        label: 'Barometric Pressure',
        unitType: 'atmospheric_pressure',
        direction: 'both',
        context: 'marine',
        helpText: 'Alert on rapid pressure changes indicating weather systems',
      },
      {
        key: 'airTemperature',
        label: 'Air Temperature',
        unitType: 'temperature',
        direction: 'above',
        context: 'outside',
        helpText: 'Alert when temperature exceeds safe operating range',
      },
    ],

    defaults: {
      metrics: {
        pressure: {
          threshold: {
            critical: {
              min: 95000,
              max: 106000,
            },
            warning: {
              min: 97000,
              max: 104000,
            },
            direction: 'both' as const,
            enabled: true,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
            warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            criticalHysteresis: 500,
            warningHysteresis: 500,
            staleThresholdMs: 300000, // 5 minutes - atmospheric data changes slowly
            min: 90000,
            max: 110000,
          },
        },
        airTemperature: {
          threshold: {
            critical: {
              max: 45,
            },
            warning: {
              max: 40,
            },
            direction: 'above' as const,
            enabled: false, // Disabled by default (marine context - heat warnings optional)
            criticalSoundPattern: ALARM_SOUND_PATTERNS.warning,
            warningSoundPattern: ALARM_SOUND_PATTERNS.info,
            criticalHysteresis: 2,
            warningHysteresis: 2,
            staleThresholdMs: 300000, // 5 minutes
            min: -40,
            max: 50,
          },
        },
      },
    },
  },

  tank: {
    sensorType: 'tank',
    displayName: 'Tank Level',
    description: 'Fluid tank monitoring',

    fields: [
      // String metadata fields (stored as MetricValues without unitType)
      {
        key: 'name',
        label: 'Tank Name',
        valueType: 'string',
        uiType: 'textInput',
        iostate: 'readWrite',
        hardwareField: 'name',
        default: '',
        helpText: 'Descriptive name for this tank (e.g., Port Fuel, Main Water)',
      },
      {
        key: 'type',
        label: 'Tank Type',
        valueType: 'string',
        uiType: 'textInput',
        iostate: 'readWrite',
        hardwareField: 'type',
        default: 'fuel',
        helpText: 'Type of fluid stored - string MetricValue without formatting/conversion',
      },
      // Numeric data fields (stored as MetricValues with unitType)
      {
        key: 'level',
        label: 'Tank Level',
        valueType: 'number',
        uiType: 'numericInput',
        iostate: 'readOnly',
        hardwareField: 'level',
        min: 0,
        max: 100,
        helpText: 'Current tank level (0.0-1.0 ratio) - no unitType, widget converts to %',
      },
      {
        key: 'capacity',
        label: 'Capacity',
        valueType: 'number',
        unitType: 'volume',
        uiType: 'numericInput',
        iostate: 'readWrite',
        hardwareField: 'capacity',
        default: 200,
        min: 10,
        max: 5000,
        helpText: 'Total capacity of tank in liters',
      },
    ],

    alarmSupport: 'single-metric',
    defaultAlarmDirection: 'below',

    defaults: {
      contextKey: 'tankType',
      contexts: {
        fuel: {
          threshold: {
            critical: 15,
            warning: 25,
            direction: 'below' as const,
            enabled: true,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
            warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            criticalHysteresis: 5,
            warningHysteresis: 5,
            staleThresholdMs: 30000, // 30s - tank data (low frequency)
            min: 0,
            max: 100,
          },
        },
        freshWater: {
          threshold: {
            critical: 10,
            warning: 20,
            direction: 'below' as const,
            enabled: true,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.warning,
            warningSoundPattern: ALARM_SOUND_PATTERNS.info,
            criticalHysteresis: 5,
            warningHysteresis: 5,
            staleThresholdMs: 30000, // 30s - tank data (low frequency)
            min: 0,
            max: 100,
          },
        },
        grayWater: {
          threshold: {
            critical: 90,
            warning: 85,
            direction: 'above' as const,
            enabled: true,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.warning,
            warningSoundPattern: ALARM_SOUND_PATTERNS.info,
            criticalHysteresis: 5,
            warningHysteresis: 5,
            staleThresholdMs: 30000, // 30s - tank data (low frequency)
            min: 0,
            max: 100,
          },
        },
        blackWater: {
          threshold: {
            critical: 95,
            warning: 90,
            direction: 'above' as const,
            enabled: true,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
            warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            criticalHysteresis: 3,
            warningHysteresis: 3,
            staleThresholdMs: 30000, // 30s - tank data (low frequency)
            min: 0,
            max: 100,
          },
        },
        liveWell: {
          threshold: {
            critical: 10,
            warning: 15,
            direction: 'below' as const,
            enabled: true,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.warning,
            warningSoundPattern: ALARM_SOUND_PATTERNS.info,
            criticalHysteresis: 5,
            warningHysteresis: 5,
            staleThresholdMs: 30000, // 30s - tank data (low frequency)
            min: 0,
            max: 100,
          },
        },
        oil: {
          threshold: {
            critical: 20,
            warning: 30,
            direction: 'below' as const,
            enabled: true,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
            warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            criticalHysteresis: 5,
            warningHysteresis: 5,
            staleThresholdMs: 30000, // 30s - tank data (low frequency)
            min: 0,
            max: 100,
          },
        },
      },
    },
  },
};

/**
 * Get sensor configuration by type
 *
 * **Usage:**
 * ```typescript
 * const config = getSensorConfig('battery');
 * ```
 *
 * @param sensorType - One of the valid SensorType values
 * @returns Complete sensor configuration definition
 */
export function getSensorConfig(sensorType: SensorType): SensorConfigDefinition {
  return SENSOR_CONFIG_REGISTRY[sensorType];
}

/**
 * Validate field dependencies for a sensor configuration
 *
 * Checks if all field dependencies are satisfied based on current form values.
 * Used to determine if dependent fields should be shown/enabled.
 *
 * **Usage:**
 * ```typescript
 * const errors = validateFieldDependencies('battery', formData);
 * if (errors.length > 0) {
 * }
 * ```
 *
 * @param sensorType - Type of sensor
 * @param formData - Current form values
 * @returns Array of validation error messages (empty if all valid)
 */
export function validateFieldDependencies(
  sensorType: SensorType,
  formData: Record<string, any>,
): string[] {
  // Field dependencies removed in refactor - no validation needed
  return [];
}

/**
 * Check if a specific field should be shown based on dependencies
 *
 * **NOTE:** Field dependencies (dependsOn) were removed in the category→unitType refactor.
 * This function is maintained for backward compatibility but always returns true.
 *
 * @param field - Field configuration
 * @param formData - Current form values
 * @returns true if field should be shown, false if dependencies not satisfied
 * @deprecated Field dependencies removed - this function always returns true
 */
export function shouldShowField(field: SensorFieldConfig, formData: Record<string, any>): boolean {
  // Field dependencies removed in refactor - all fields visible
  return true;
}

/**
 * Check if sensor supports alarm configuration
 *
 * **Usage:**
 * ```typescript
 * if (sensorSupportsAlarms('battery')) {
 *   // Show alarm configuration UI
 * }
 *
 * sensorSupportsAlarms('battery')   // true  (multi-metric)
 * sensorSupportsAlarms('depth')     // true  (single-metric)
 * sensorSupportsAlarms('compass')   // false (no alarms)
 * ```
 *
 * @param sensorType - Sensor type to check
 * @returns true if sensor supports alarms (single or multi-metric)
 */
export function sensorSupportsAlarms(sensorType: SensorType): boolean {
  return SENSOR_CONFIG_REGISTRY[sensorType].alarmSupport !== 'none';
}

/**
 * Get alarm metrics for multi-metric sensors
 *
 * **Usage:**
 * ```typescript
 * const metrics = getSensorAlarmMetrics('battery');
 * // Returns: [{ key: 'voltage', ... }, { key: 'current', ... }, ...]
 *
 * metrics?.forEach(metric => {
 * });
 * // Output:
 * // "Voltage: V"
 * // "Current: A"
 * // "State of Charge: %"
 * // "Temperature: °C"
 * ```
 *
 * @param sensorType - Sensor type to get metrics for
 * @returns Array of alarm metric configurations, or undefined for single-metric/no-alarm sensors
 */
export function getSensorAlarmMetrics(
  sensorType: SensorType,
): SensorAlarmMetricConfig[] | undefined {
  return SENSOR_CONFIG_REGISTRY[sensorType].alarmMetrics;
}

/**
 * ============================================================================
 * CONTEXT-AWARE DEFAULT THRESHOLDS (PURE DATA LOOKUP)
 * ============================================================================
 *
 * All alarm defaults are now stored as declarative data in the registry above.
 * This helper function performs simple property lookups based on sensor context.
 *
 * No procedural code, no switch statements - just pure data retrieval.
 */

/**
 * Context value aliases - maps common abbreviations/variations to registry keys
 */
const CONTEXT_ALIASES: Record<string, Record<string, string>> = {
  batteryChemistry: {
    fla: 'lead-acid', // Flooded Lead Acid
    flooded: 'lead-acid',
    wet: 'lead-acid',
    gel: 'gel',
    lfp: 'lifepo4', // Lithium Iron Phosphate
    lithium: 'lifepo4',
  },
  engineType: {
    gas: 'gasoline',
    petrol: 'gasoline',
  },
  tankType: {
    water: 'freshWater', // Generic water → fresh water
    fresh: 'freshWater',
    freshwater: 'freshWater',
    waste: 'grayWater', // Generic waste → gray water
    gray: 'grayWater',
    grey: 'grayWater',
    graywater: 'grayWater',
    greywater: 'grayWater',
    black: 'blackWater',
    blackwater: 'blackWater',
    sewage: 'blackWater',
    ballast: 'fuel', // No specific ballast config, use fuel as generic
    livewell: 'liveWell',
    'live well': 'liveWell',
  },
  location: {
    engine: 'engineRoom', // Engine temp → engine room
    seawater: 'outside', // Seawater temp → outside (ambient)
    exhaust: 'engineRoom', // Exhaust temp → engine room category
    refrigeration: 'fridge', // Full name → short form
    baitwell: 'liveWell', // Bait well → live well (similar use case)
    'bait well': 'liveWell',
  },
};

/**
 * Get a specific field configuration from a sensor
 *
 * @param sensorType - Type of sensor
 * @param fieldKey - Field key to look up
 * @returns Field configuration or undefined if not found
 */
export function getSensorField(
  sensorType: SensorType,
  fieldKey: string,
): SensorFieldConfig | undefined {
  const config = SENSOR_CONFIG_REGISTRY[sensorType];
  return config?.fields?.find((f) => f.key === fieldKey);
}

/**
 * Get all data fields (fields with unitType or hardwareField) from a sensor
 * These are fields that represent sensor measurements with units or hardware-provided values
 *
 * @param sensorType - Type of sensor
 * @returns Array of data field configurations
 */
export function getDataFields(sensorType: SensorType): SensorFieldConfig[] {
  const config = SENSOR_CONFIG_REGISTRY[sensorType];
  // Include fields with unitType (numeric metrics with unit conversion) AND fields with hardwareField but no unitType (string/boolean fields)
  return config?.fields?.filter((f) => f.unitType !== undefined || f.hardwareField !== undefined) ?? [];
}

/**
 * Get all UI/configuration fields (fields without unitType) from a sensor
 * These are fields used for sensor configuration like name, type, capacity, etc.
 *
 * @param sensorType - Type of sensor
 * @returns Array of UI field configurations
 */
export function getConfigFields(sensorType: SensorType): SensorFieldConfig[] {
  const config = SENSOR_CONFIG_REGISTRY[sensorType];
  return config?.fields?.filter((f) => f.unitType === undefined) ?? [];
}

/**
 * Get all alarm-capable fields from a sensor
 * For multi-metric sensors: returns fields with unitType (numeric measurements)
 * For single-metric sensors: returns the primary data field
 *
 * @param sensorType - Type of sensor
 * @returns Array of alarm field configurations
 */
export function getAlarmFields(sensorType: SensorType): SensorFieldConfig[] {
  const config = SENSOR_CONFIG_REGISTRY[sensorType];
  if (!config) return [];

  // Multi-metric sensors: all data fields can have alarms
  if (config.alarmSupport === 'multi-metric') {
    return getDataFields(sensorType);
  }

  // Single-metric sensors: find the primary alarm field
  // This is typically the first data field with a unitType
  if (config.alarmSupport === 'single-metric') {
    const dataFields = getDataFields(sensorType);
    return dataFields.slice(0, 1); // Return first data field
  }

  // No alarm support
  return [];
}

/**
 * Get context-aware default alarm thresholds for a sensor
 *
 * **Usage:**
 * ```typescript
 * // For context-aware sensors (battery, engine, temperature, tank)
 * const batteryDefaults = getAlarmDefaults('battery', { batteryChemistry: 'lifepo4' });
 * const engineDefaults = getAlarmDefaults('engine', { engineType: 'diesel' });
 * const tempDefaults = getAlarmDefaults('temperature', { location: 'engineRoom' });
 * const tankDefaults = getAlarmDefaults('tank', { tankType: 'fuel' });
 *
 * // For simple sensors (depth, wind, speed)
 * const depthDefaults = getAlarmDefaults('depth');
 * ```
 *
 * @param sensorType - Type of sensor
 * @param context - Context values (chemistry, type, location, etc.) - matches field option values exactly
 * @returns Complete alarm threshold configuration, or undefined for no-alarm sensors
 */
export function getAlarmDefaults(
  sensorType: SensorType,
  context?: Record<string, any>,
): any | undefined {
  const config = SENSOR_CONFIG_REGISTRY[sensorType];
  if (!config.defaults) return undefined;

  // Simple sensors - direct threshold lookup
  if ('threshold' in config.defaults) {
    return config.defaults.threshold;
  }

  // Context-aware sensors - lookup by context key value
  if (config.defaults.contexts && config.defaults.contextKey) {
    const contextValue = context?.[config.defaults.contextKey];
    if (!contextValue) {
      // No context provided - return first available context as default
      const firstContext = Object.keys(config.defaults.contexts)[0];
      return config.defaults.contexts[firstContext];
    }
    // Normalize to lowercase to match registry keys (AGM -> agm, LiFePO4 -> lifepo4)
    let normalizedValue = String(contextValue).toLowerCase();

    // Apply alias mapping if available (FLA -> lead-acid, LFP -> lifepo4, etc.)
    const aliases = CONTEXT_ALIASES[config.defaults.contextKey];
    if (aliases && aliases[normalizedValue]) {
      normalizedValue = aliases[normalizedValue];
    }

    return config.defaults.contexts[normalizedValue];
  }

  return undefined;
}

/**
 * @deprecated Use getAlarmDefaults() instead. This function is maintained for backward compatibility only.
 */
export function getSmartDefaults(
  sensorType: SensorType,
  context?: Record<string, any>,
): SensorConfiguration | ThresholdConfig | undefined {
  return getAlarmDefaults(sensorType, context);
}

/**
 * Freeze the registry to prevent runtime mutations
 * This ensures field definitions remain immutable after initialization
 */
Object.freeze(SENSOR_CONFIG_REGISTRY);
Object.values(SENSOR_CONFIG_REGISTRY).forEach((config) => {
  Object.freeze(config);
  Object.freeze(config.fields);
  config.fields.forEach((field) => Object.freeze(field));
  if (config.alarmMetrics) {
    Object.freeze(config.alarmMetrics);
    config.alarmMetrics.forEach((metric) => Object.freeze(metric));
  }
  if (config.defaults) {
    Object.freeze(config.defaults);
    if (config.defaults.threshold) Object.freeze(config.defaults.threshold);
  }
});
