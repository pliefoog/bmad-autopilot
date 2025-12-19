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

import { SensorType, SensorAlarmThresholds } from '../types/SensorData';
import { DataCategory } from '../presentation/categories';

export type FieldType = 'text' | 'picker' | 'toggle' | 'slider' | 'number';
export type AlarmSupport = 'multi-metric' | 'single-metric' | 'none';
export type IOState = 'readOnly' | 'readWrite' | 'readOnlyIfValue';

/**
 * Standard sound patterns for alarms
 */
export const ALARM_SOUND_PATTERNS = {
  critical: 'rapid_pulse',
  warning: 'warble',
  info: 'single_beep',
  none: 'none',
} as const;

export type AlarmSoundPattern = typeof ALARM_SOUND_PATTERNS[keyof typeof ALARM_SOUND_PATTERNS];

/**
 * Field configuration for sensor-specific inputs
 * 
 * **IOState Behavior:**
 * - `readOnly`: Always load from sensor[instance][hardwareField], disable editing
 * - `readWrite`: Load from sensor[instance][hardwareField], allow editing  
 * - `readOnlyIfValue`: If sensor has value → read-only, if no value → editable with defaults
 * 
 * **Field Roles:**
 * - UI/Configuration fields: batteryChemistry, engineType, capacity - no category
 * - Data fields: voltage, temperature, rpm - have category for presentation
 */
export interface SensorFieldConfig {
  key: string;                    // FormData key
  label: string;                  // Display label
  type: FieldType;                // Input type
  iostate: IOState;               // Read/write behavior
  hardwareField?: string;         // Sensor data field name to read from sensor[instance][field]
  
  // Type-specific configurations
  default?: any;                  // Default value for text/number when no sensor value
  options?: Array<{               // For picker type
    label: string;
    value: string;
    default?: boolean;            // Mark default option
  }>;
  
  // Number/Slider constraints
  min?: number;                   // Minimum value (SI units)
  max?: number;                   // Maximum value (SI units)
  step?: number;                  // Step increment for slider
  
  // Validation rules
  required?: boolean;             // Field must have value
  dependsOn?: string;             // Only valid if another field is set
  
  // UI metadata
  helpText?: string;              // User guidance tooltip
  
  // Presentation (for data fields only - UI fields don't have category)
  category?: DataCategory;        // For presentation cache (voltage, temperature, etc.)
  direction?: 'above' | 'below';  // Default alarm direction for this field
}

/**
 * Alarm metric configuration for multi-metric sensors
 * 
 * Multi-metric sensors (like battery, engine) have multiple alarm points.
 * Each metric defines how that specific alarm behaves and presents data.
 * 
 * **Example - Battery with 4 metrics:**
 * ```typescript
 * alarmMetrics: [
 *   { key: 'voltage', label: 'Voltage', category: 'voltage', unit: 'V', direction: 'below' },
 *   { key: 'current', label: 'Current', category: 'current', unit: 'A', direction: 'above' },
 *   { key: 'soc', label: 'State of Charge', unit: '%', direction: 'below' },  // No category = raw value
 *   { key: 'temperature', label: 'Temperature', category: 'temperature', unit: '°C', direction: 'above' },
 * ]
 * ```
 * 
 * **Field Documentation:**
 * - `key`: Metric identifier used in FormData and threshold storage (camelCase)
 * - `label`: Human-readable name shown in UI
 * - `category`: DataCategory for presentation system (voltage, temperature, current, etc.)
 *              Optional - omit for raw values that don't need unit conversion (like percentages)
 * - `unit`: SI unit for storage (V, A, °C, kPa, etc.) or display unit for raw values (%)
 * - `direction`: Alarm triggers 'above' threshold (overtemp) or 'below' threshold (low voltage)
 */
export interface SensorAlarmMetricConfig {
  key: string;                    // Metric identifier (e.g., 'voltage')
  label: string;                  // Display name
  category?: DataCategory;        // For presentation system (optional for raw values like percentages)
  direction: 'above' | 'below';   // Alarm direction
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
  min?: number;                   // Slider minimum value (SI units)
  max?: number;                   // Slider maximum value (SI units)
}

/**
 * Default alarm configuration structure
 */
export interface AlarmDefaults {
  // For context-aware sensors (battery, engine, temperature, tank)
  contextKey?: string;           // Which field determines context ('batteryChemistry', 'engineType', etc.)
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
  alarmMetrics?: SensorAlarmMetricConfig[];  // For multi-metric sensors
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
        type: 'text',
        iostate: 'readWrite',
        default: '',
        helpText: 'Descriptive name for this battery (e.g., House Bank, Starter)',
      },
      {
        key: 'batteryChemistry',
        label: 'Battery Chemistry',
        type: 'picker',
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
        type: 'number',
        iostate: 'readOnlyIfValue',
        hardwareField: 'capacity',
        default: 140,
        min: 40,
        max: 5000,
        category: 'capacity',
        helpText: 'Battery capacity in amp-hours. Hardware may provide this value.',
      },
      // Data fields (with categories for presentation)
      {
        key: 'voltage',
        label: 'Voltage',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'voltage',
        category: 'voltage',
        direction: 'below',
      },
      {
        key: 'current',
        label: 'Current',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'current',
        category: 'current',
        direction: 'above',
      },
      {
        key: 'temperature',
        label: 'Temperature',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'temperature',
        category: 'temperature',
        direction: 'above',
      },
      {
        key: 'soc',
        label: 'State of Charge',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'stateOfCharge',
        direction: 'below',
        // Raw percentage 0-100, no category = no unit conversion
      },
    ],
    
    alarmSupport: 'multi-metric',
    alarmMetrics: [
      {
        key: 'voltage',
        label: 'Voltage',
        category: 'voltage',
        direction: 'below',
      },
      {
        key: 'current',
        label: 'Current',
        category: 'current',
        direction: 'above',
      },
      {
        key: 'temperature',
        label: 'Temperature',
        category: 'temperature',
        direction: 'above',
      },
      {
        key: 'soc',
        label: 'State of Charge',
        direction: 'below',
        // Raw percentage 0-100, no category = no unit conversion
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
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 0.2,
              warningHysteresis: 0.2,
              min: 10.5,
              max: 16.0,
            },
            soc: {
              critical: 20,
              warning: 30,
              direction: 'below' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 5,
              warningHysteresis: 5,
              min: 0,
              max: 100,
            },
            temperature: {
              critical: 50,
              warning: 45,
              direction: 'above' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 2,
              warningHysteresis: 2,
            },
            current: {
              critical: 200,
              warning: 150,
              direction: 'above' as const,
              enabled: false,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 10,
              warningHysteresis: 10,
              min: 0,
              max: 500,
            },
          },
        },
        'agm': {
          metrics: {
            voltage: {
              critical: 12.0,
              warning: 12.2,
              direction: 'below' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 0.2,
              warningHysteresis: 0.2,
              min: 10.5,
              max: 16.0,
            },
            soc: {
              critical: 20,
              warning: 30,
              direction: 'below' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 5,
              warningHysteresis: 5,
              min: 0,
              max: 100,
            },
            temperature: {
              critical: 50,
              warning: 45,
              direction: 'above' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 2,
              warningHysteresis: 2,
              min: -20,
              max: 80,
            },
            current: {
              critical: 250,
              warning: 200,
              direction: 'above' as const,
              enabled: false,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 10,
              warningHysteresis: 10,
              min: 0,
              max: 500,
            },
          },
        },
        'gel': {
          metrics: {
            voltage: {
              critical: 11.9,
              warning: 12.1,
              direction: 'below' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 0.2,
              warningHysteresis: 0.2,
              min: 10.5,
              max: 16.0,
            },
            soc: {
              critical: 20,
              warning: 30,
              direction: 'below' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 5,
              warningHysteresis: 5,
              min: 0,
              max: 100,
            },
            temperature: {
              critical: 45,
              warning: 40,
              direction: 'above' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 2,
              warningHysteresis: 2,
              min: -20,
              max: 70,
            },
            current: {
              critical: 180,
              warning: 140,
              direction: 'above' as const,
              enabled: false,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 10,
              warningHysteresis: 10,
              min: 0,
              max: 400,
            },
          },
        },
        'lifepo4': {
          metrics: {
            voltage: {
              critical: 12.8,
              warning: 13.0,
              direction: 'below' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 0.2,
              warningHysteresis: 0.2,
              min: 12.0,
              max: 15.0,
            },
            soc: {
              critical: 10,
              warning: 20,
              direction: 'below' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 5,
              warningHysteresis: 5,
            },
            temperature: {
              critical: 55,
              warning: 50,
              direction: 'above' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 2,
              warningHysteresis: 2,
              min: -20,
              max: 60,
            },
            current: {
              critical: 300,
              warning: 250,
              direction: 'above' as const,
              enabled: false,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
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
        type: 'text',
        iostate: 'readWrite',
        default: '',
        helpText: 'Descriptive name for this depth sounder (e.g., Bow Sounder)',
      },
      // Data fields
      {
        key: 'depth',
        label: 'Depth',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'depth',
        category: 'depth',
        direction: 'below',
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
        criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
        warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
        criticalHysteresis: 0.3,
        warningHysteresis: 0.3,
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
        type: 'text',
        iostate: 'readWrite',
        default: '',
        helpText: 'Descriptive name for this engine (e.g., Port Engine, Main)',
      },
      {
        key: 'engineType',
        label: 'Engine Type',
        type: 'picker',
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
        type: 'number',
        iostate: 'readWrite',
        default: 3000,
        min: 1000,
        max: 8000,
        helpText: 'Maximum rated RPM for this engine',
      },
      // Data fields (with categories for presentation)
      {
        key: 'rpm',
        label: 'Engine RPM',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'rpm',
        category: 'rpm',
        direction: 'above',
      },
      {
        key: 'temperature',
        label: 'Coolant Temperature',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'coolantTemp',
        category: 'temperature',
        direction: 'above',
      },
      {
        key: 'oilPressure',
        label: 'Oil Pressure',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'oilPressure',
        category: 'pressure',
        direction: 'below',
      },
      {
        key: 'alternatorVoltage',
        label: 'Alternator Voltage',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'alternatorVoltage',
        category: 'voltage',
      },
      {
        key: 'fuelRate',
        label: 'Fuel Rate',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'fuelRate',
        category: 'flowRate',
      },
      {
        key: 'hours',
        label: 'Engine Hours',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'hours',
        category: 'time',
      },
    ],
    
    alarmSupport: 'multi-metric',
    alarmMetrics: [
      {
        key: 'temperature',
        label: 'Coolant Temperature',
        category: 'temperature',
        direction: 'above',
      },
      {
        key: 'oilPressure',
        label: 'Oil Pressure',
        category: 'pressure',
        direction: 'below',
      },
      {
        key: 'rpm',
        label: 'Engine RPM',
        category: 'rpm',
        direction: 'above',
      },
    ],
    
    defaults: {
      contextKey: 'engineType',
      contexts: {
        'diesel': {
          metrics: {
            rpm: {
              critical: 2800,
              warning: 2600,
              direction: 'above' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 50,
              warningHysteresis: 50,
              min: 0,
              max: 3500,
            },
            temperature: {
              critical: 105,
              warning: 95,
              direction: 'above' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 3,
              warningHysteresis: 3,
              min: 0,
              max: 120,
            },
            oilPressure: {
              critical: 15,
              warning: 20,
              direction: 'below' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 3,
              warningHysteresis: 3,
              min: 0,
              max: 600,
            },
          },
        },
        'gasoline': {
          metrics: {
            rpm: {
              critical: 3600,
              warning: 3400,
              direction: 'above' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 100,
              warningHysteresis: 100,
              min: 0,
              max: 4500,
            },
            temperature: {
              critical: 110,
              warning: 100,
              direction: 'above' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 3,
              warningHysteresis: 3,
              min: 0,
              max: 130,
            },
            oilPressure: {
              critical: 10,
              warning: 15,
              direction: 'below' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 2,
              warningHysteresis: 2,
              min: 0,
              max: 500,
            },
          },
        },
        'outboard': {
          metrics: {
            rpm: {
              critical: 5800,
              warning: 5500,
              direction: 'above' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 100,
              warningHysteresis: 100,
              min: 0,
              max: 6500,
            },
            temperature: {
              critical: 85,
              warning: 75,
              direction: 'above' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 3,
              warningHysteresis: 3,
              min: 0,
              max: 100,
            },
            oilPressure: {
              critical: 8,
              warning: 12,
              direction: 'below' as const,
              enabled: true,
              criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
              warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
              criticalHysteresis: 2,
              warningHysteresis: 2,
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
        type: 'text',
        iostate: 'readWrite',
        default: '',
        helpText: 'Descriptive name for this wind sensor (e.g., Masthead Wind)',
      },
      // Data fields
      {
        key: 'speed',
        label: 'Wind Speed',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'speed',
        category: 'wind',
        direction: 'above',
      },
      {
        key: 'direction',
        label: 'Wind Direction',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'direction',
        category: 'angle',
      },
      {
        key: 'trueSpeed',
        label: 'True Wind Speed',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'trueSpeed',
        category: 'wind',
      },
      {
        key: 'trueDirection',
        label: 'True Wind Direction',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'trueDirection',
        category: 'angle',
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
        type: 'text',
        iostate: 'readWrite',
        default: '',
        helpText: 'Descriptive name for this speed sensor (e.g., Paddle Wheel)',
      },
      // Data fields
      {
        key: 'throughWater',
        label: 'Speed Through Water',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'throughWater',
        category: 'speed',
        direction: 'above',
      },
      {
        key: 'overGround',
        label: 'Speed Over Ground',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'overGround',
        category: 'speed',
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
      // UI/Configuration fields
      {
        key: 'name',
        label: 'Sensor Name',
        type: 'text',
        iostate: 'readWrite',
        default: '',
        helpText: 'Descriptive name for this temperature sensor (e.g., Engine Room)',
      },
      {
        key: 'location',
        label: 'Location',
        type: 'picker',
        iostate: 'readWrite',
        options: [
          { label: 'Engine Room', value: 'engineRoom', default: true },
          { label: 'Cabin/Saloon', value: 'cabin' },
          { label: 'Refrigerator', value: 'fridge' },
          { label: 'Freezer', value: 'freezer' },
          { label: 'Outside Air', value: 'outside' },
          { label: 'Sea Water', value: 'seaWater' },
        ],
        helpText: 'Physical location of temperature sensor',
      },
      // Data fields
      {
        key: 'value',
        label: 'Temperature',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'value',
        category: 'temperature',
        direction: 'above',
      },
    ],
    
    alarmSupport: 'single-metric',
    defaultAlarmDirection: 'above',
    
    defaults: {
      contextKey: 'location',
      contexts: {
        'engineRoom': {
          threshold: {
            critical: 105,
            warning: 85,
            direction: 'above' as const,
            enabled: true,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
            warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            criticalHysteresis: 5,
            warningHysteresis: 5,
            min: 0,
            max: 150,
          },
        },
        'cabin': {
          threshold: {
            critical: 40,
            warning: 35,
            direction: 'above' as const,
            enabled: false,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.warning,
            warningSoundPattern: ALARM_SOUND_PATTERNS.info,
            criticalHysteresis: 2,
            warningHysteresis: 2,
            min: -10,
            max: 50,
          },
        },
        'fridge': {
          threshold: {
            critical: 10,
            warning: 8,
            direction: 'above' as const,
            enabled: true,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.warning,
            warningSoundPattern: ALARM_SOUND_PATTERNS.info,
            criticalHysteresis: 1,
            warningHysteresis: 1,
            min: -10,
            max: 20,
          },
        },
        'freezer': {
          threshold: {
            critical: -10,
            warning: -15,
            direction: 'above' as const,
            enabled: true,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.warning,
            warningSoundPattern: ALARM_SOUND_PATTERNS.info,
            criticalHysteresis: 2,
            warningHysteresis: 2,
            min: -30,
            max: 0,
          },
        },
        'outside': {
          threshold: {
            critical: 45,
            warning: 40,
            direction: 'above' as const,
            enabled: false,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.info,
            warningSoundPattern: ALARM_SOUND_PATTERNS.none,
            criticalHysteresis: 3,
            warningHysteresis: 3,
            min: -20,
            max: 60,
          },
        },
        'seaWater': {
          threshold: {
            critical: 35,
            warning: 30,
            direction: 'above' as const,
            enabled: false,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.info,
            warningSoundPattern: ALARM_SOUND_PATTERNS.none,
            criticalHysteresis: 2,
            warningHysteresis: 2,
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
        type: 'text',
        iostate: 'readWrite',
        default: '',
        helpText: 'Descriptive name for this compass (e.g., Fluxgate Compass)',
      },
      // Data fields
      {
        key: 'heading',
        label: 'Heading',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'heading',
        category: 'angle',
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
        type: 'text',
        iostate: 'readWrite',
        default: '',
        helpText: 'Descriptive name for this GPS (e.g., Chart Plotter)',
      },
      // Data fields
      {
        key: 'speedOverGround',
        label: 'Speed Over Ground',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'speedOverGround',
        category: 'speed',
      },
      {
        key: 'courseOverGround',
        label: 'Course Over Ground',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'courseOverGround',
        category: 'angle',
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
        type: 'text',
        iostate: 'readWrite',
        default: '',
        helpText: 'Descriptive name for this autopilot (e.g., Raymarine)',
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
        type: 'text',
        iostate: 'readWrite',
        default: '',
        helpText: 'Descriptive name for this navigation system',
      },
      // Data fields
      {
        key: 'bearingToWaypoint',
        label: 'Bearing to Waypoint',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'bearingToWaypoint',
        category: 'angle',
      },
      {
        key: 'distanceToWaypoint',
        label: 'Distance to Waypoint',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'distanceToWaypoint',
        category: 'distance',
      },
      {
        key: 'crossTrackError',
        label: 'Cross Track Error',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'crossTrackError',
        category: 'distance',
      },
    ],
    
    alarmSupport: 'none',
  },
  
  tank: {
    sensorType: 'tank',
    displayName: 'Tank Level',
    description: 'Fluid tank monitoring',
    
    fields: [
      // UI/Configuration fields
      {
        key: 'name',
        label: 'Tank Name',
        type: 'text',
        iostate: 'readWrite',
        default: '',
        helpText: 'Descriptive name for this tank (e.g., Port Fuel, Main Water)',
      },
      {
        key: 'tankType',
        label: 'Tank Type',
        type: 'picker',
        iostate: 'readWrite',
        options: [
          { label: 'Fuel', value: 'fuel', default: true },
          { label: 'Fresh Water', value: 'freshWater' },
          { label: 'Gray Water', value: 'grayWater' },
          { label: 'Black Water', value: 'blackWater' },
          { label: 'Live Well', value: 'liveWell' },
          { label: 'Oil', value: 'oil' },
        ],
        helpText: 'Type of fluid stored in this tank',
      },
      {
        key: 'capacity',
        label: 'Capacity (L)',
        type: 'number',
        iostate: 'readWrite',
        default: 200,
        min: 10,
        max: 5000,
        category: 'volume',
        helpText: 'Total capacity of tank in liters',
      },
      // Data fields
      {
        key: 'level',
        label: 'Tank Level',
        type: 'number',
        iostate: 'readOnly',
        hardwareField: 'level',
        direction: 'below',
        helpText: 'Current tank level (0.0-1.0 ratio)',
      },
    ],
    
    alarmSupport: 'single-metric',
    defaultAlarmDirection: 'below',
    
    defaults: {
      contextKey: 'tankType',
      contexts: {
        'fuel': {
          threshold: {
            critical: 15,
            warning: 25,
            direction: 'below' as const,
            enabled: true,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
            warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            criticalHysteresis: 5,
            warningHysteresis: 5,
            min: 0,
            max: 100,
          },
        },
        'freshWater': {
          threshold: {
            critical: 10,
            warning: 20,
            direction: 'below' as const,
            enabled: true,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.warning,
            warningSoundPattern: ALARM_SOUND_PATTERNS.info,
            criticalHysteresis: 5,
            warningHysteresis: 5,
            min: 0,
            max: 100,
          },
        },
        'grayWater': {
          threshold: {
            critical: 90,
            warning: 85,
            direction: 'above' as const,
            enabled: true,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.warning,
            warningSoundPattern: ALARM_SOUND_PATTERNS.info,
            criticalHysteresis: 5,
            warningHysteresis: 5,
            min: 0,
            max: 100,
          },
        },
        'blackWater': {
          threshold: {
            critical: 95,
            warning: 90,
            direction: 'above' as const,
            enabled: true,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
            warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            criticalHysteresis: 3,
            warningHysteresis: 3,
            min: 0,
            max: 100,
          },
        },
        'liveWell': {
          threshold: {
            critical: 10,
            warning: 15,
            direction: 'below' as const,
            enabled: true,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.warning,
            warningSoundPattern: ALARM_SOUND_PATTERNS.info,
            criticalHysteresis: 5,
            warningHysteresis: 5,
            min: 0,
            max: 100,
          },
        },
        'oil': {
          threshold: {
            critical: 20,
            warning: 30,
            direction: 'below' as const,
            enabled: true,
            criticalSoundPattern: ALARM_SOUND_PATTERNS.critical,
            warningSoundPattern: ALARM_SOUND_PATTERNS.warning,
            criticalHysteresis: 5,
            warningHysteresis: 5,
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
 * console.log(config.displayName);        // "Battery"
 * console.log(config.alarmSupport);       // "multi-metric"
 * console.log(config.fields.length);      // 4 (name, location, chemistry, capacity)
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
 *   console.log('Validation errors:', errors);
 * }
 * ```
 * 
 * @param sensorType - Type of sensor
 * @param formData - Current form values
 * @returns Array of validation error messages (empty if all valid)
 */
export function validateFieldDependencies(
  sensorType: SensorType,
  formData: Record<string, any>
): string[] {
  const config = SENSOR_CONFIG_REGISTRY[sensorType];
  const errors: string[] = [];
  
  for (const field of config.fields) {
    if (field.dependsOn) {
      const dependentValue = formData[field.dependsOn];
      
      // Check if dependent field has a value
      if (dependentValue === undefined || dependentValue === null || dependentValue === '') {
        errors.push(`${field.label} requires ${field.dependsOn} to be set first`);
      }
    }
  }
  
  return errors;
}

/**
 * Check if a specific field should be shown based on dependencies
 * 
 * @param field - Field configuration
 * @param formData - Current form values
 * @returns true if field should be shown, false if dependencies not satisfied
 */
export function shouldShowField(
  field: SensorFieldConfig,
  formData: Record<string, any>
): boolean {
  if (!field.dependsOn) return true;
  
  const dependentValue = formData[field.dependsOn];
  return dependentValue !== undefined && dependentValue !== null && dependentValue !== '';
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
 *   console.log(`${metric.label}: ${metric.unit}`);
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
export function getSensorAlarmMetrics(sensorType: SensorType): SensorAlarmMetricConfig[] | undefined {
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
    'fla': 'lead-acid',     // Flooded Lead Acid
    'flooded': 'lead-acid',
    'wet': 'lead-acid',
    'gel': 'gel',
    'lfp': 'lifepo4',       // Lithium Iron Phosphate
    'lithium': 'lifepo4',
  },
  engineType: {
    'gas': 'gasoline',
    'petrol': 'gasoline',
  },
  tankType: {
    'water': 'freshWater',         // Generic water → fresh water
    'fresh': 'freshWater',
    'freshwater': 'freshWater',
    'waste': 'grayWater',          // Generic waste → gray water
    'gray': 'grayWater',
    'grey': 'grayWater',
    'graywater': 'grayWater',
    'greywater': 'grayWater',
    'black': 'blackWater',
    'blackwater': 'blackWater',
    'sewage': 'blackWater',
    'ballast': 'fuel',             // No specific ballast config, use fuel as generic
    'livewell': 'liveWell',
    'live well': 'liveWell',
  },
  location: {
    'engine': 'engineRoom',        // Engine temp → engine room
    'seawater': 'outside',         // Seawater temp → outside (ambient)
    'exhaust': 'engineRoom',       // Exhaust temp → engine room category
    'refrigeration': 'fridge',     // Full name → short form
    'baitwell': 'liveWell',        // Bait well → live well (similar use case)
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
  fieldKey: string
): SensorFieldConfig | undefined {
  const config = SENSOR_CONFIG_REGISTRY[sensorType];
  return config?.fields?.find(f => f.key === fieldKey);
}

/**
 * Get all data fields (fields with category) from a sensor
 * These are fields that represent sensor measurements with units
 * 
 * @param sensorType - Type of sensor
 * @returns Array of data field configurations
 */
export function getDataFields(sensorType: SensorType): SensorFieldConfig[] {
  const config = SENSOR_CONFIG_REGISTRY[sensorType];
  return config?.fields?.filter(f => f.category !== undefined) ?? [];
}

/**
 * Get all UI/configuration fields (fields without category) from a sensor
 * These are fields used for sensor configuration like type, capacity, etc.
 * 
 * @param sensorType - Type of sensor
 * @returns Array of UI field configurations
 */
export function getConfigFields(sensorType: SensorType): SensorFieldConfig[] {
  const config = SENSOR_CONFIG_REGISTRY[sensorType];
  return config?.fields?.filter(f => f.category === undefined) ?? [];
}

/**
 * Get all alarm-capable fields from a sensor
 * For multi-metric sensors: returns fields with category
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
  // This is typically the first data field with a category
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
  context?: Record<string, any>
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
  context?: Record<string, any>
): SensorAlarmThresholds | ThresholdConfig | undefined {
  return getAlarmDefaults(sensorType, context);
}
