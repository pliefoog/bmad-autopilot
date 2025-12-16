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

import { SensorType } from '../types/SensorData';
import { DataCategory } from '../presentation/categories';
import { getSmartDefaults } from './AlarmThresholdDefaults';

export type FieldType = 'text' | 'picker' | 'toggle' | 'slider' | 'number';
export type AlarmSupport = 'multi-metric' | 'single-metric' | 'none';

/**
 * Field configuration for sensor-specific inputs
 */
export interface SensorFieldConfig {
  key: string;                    // FormData key
  label: string;                  // Display label
  type: FieldType;                // Input type
  required?: boolean;             // Validation
  readOnly?: boolean;             // Check hardware first (e.g., chemistry from BMS)
  options?: Array<{               // For picker type
    label: string;
    value: string;
  }>;
  defaultValue?: any;             // Default when creating new
  placeholder?: string;           // For text inputs
  section?: 'basic' | 'context' | 'alarms';  // UI grouping
  hardwareField?: string;         // Sensor data field name if read-only from hardware
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
  unit: string;                   // SI unit or display unit
  direction: 'above' | 'below';   // Alarm direction
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
  
  // Smart defaults function (can use context like chemistry, location)
  getDefaults?: (context?: any) => any;
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
      {
        key: 'name',
        label: 'Battery Name',
        type: 'text',
        section: 'basic',
        placeholder: 'e.g., House Bank, Starter Battery',
        defaultValue: '',
      },
      {
        key: 'location',
        label: 'Location',
        type: 'text',
        section: 'basic',
        placeholder: 'e.g., Engine Room, Bow Compartment',
      },
      {
        key: 'batteryChemistry',
        label: 'Battery Chemistry',
        type: 'picker',
        section: 'context',
        readOnly: true, // Check hardware first
        hardwareField: 'chemistry',
        options: [
          { label: 'Lead Acid', value: 'lead-acid' },
          { label: 'AGM', value: 'agm' },
          { label: 'LiFePO4', value: 'lifepo4' },
        ],
        defaultValue: 'lead-acid',
      },
      {
        key: 'capacity',
        label: 'Capacity (Ah)',
        type: 'number',
        section: 'context',
        placeholder: 'e.g., 200',
      },
    ],
    
    alarmSupport: 'multi-metric',
    alarmMetrics: [
      {
        key: 'voltage',
        label: 'Voltage',
        category: 'voltage',
        unit: 'V',
        direction: 'below',
      },
      {
        key: 'current',
        label: 'Current',
        category: 'current',
        unit: 'A',
        direction: 'above',
      },
      {
        key: 'temperature',
        label: 'Temperature',
        category: 'temperature',
        unit: '°C',
        direction: 'above',
      },
      {
        key: 'soc',
        label: 'State of Charge',
        unit: '%',  // Raw percentage 0-100, no presentation conversion needed
        direction: 'below',
      },
    ],
    
    getDefaults: (context) => {
      return getSmartDefaults('battery', { batteryChemistry: context?.batteryChemistry || 'lead-acid' });
    },
  },
  
  depth: {
    sensorType: 'depth',
    displayName: 'Depth Sounder',
    description: 'Water depth measurement',
    
    fields: [
      {
        key: 'name',
        label: 'Depth Sounder Name',
        type: 'text',
        section: 'basic',
        placeholder: 'e.g., Bow Sounder, Stern Transducer',
      },
      {
        key: 'offset',
        label: 'Transducer Offset (m)',
        type: 'number',
        section: 'context',
        placeholder: 'e.g., -0.5 (below waterline)',
        defaultValue: 0,
      },
    ],
    
    alarmSupport: 'single-metric',
    defaultAlarmDirection: 'below',
    
    getDefaults: () => getSmartDefaults('depth'),
  },
  
  engine: {
    sensorType: 'engine',
    displayName: 'Engine',
    description: 'Engine monitoring and diagnostics',
    
    fields: [
      {
        key: 'name',
        label: 'Engine Name',
        type: 'text',
        section: 'basic',
        placeholder: 'e.g., Port Engine, Main Engine',
      },
      {
        key: 'location',
        label: 'Location',
        type: 'text',
        section: 'basic',
        placeholder: 'e.g., Engine Room, Stern',
      },
      {
        key: 'engineType',
        label: 'Engine Type',
        type: 'picker',
        section: 'context',
        options: [
          { label: 'Diesel', value: 'diesel' },
          { label: 'Gasoline', value: 'gasoline' },
          { label: 'Outboard', value: 'outboard' },
        ],
        defaultValue: 'diesel',
      },
      {
        key: 'maxRpm',
        label: 'Maximum RPM',
        type: 'number',
        section: 'context',
        placeholder: 'e.g., 3000',
      },
    ],
    
    alarmSupport: 'multi-metric',
    alarmMetrics: [
      {
        key: 'temperature',
        label: 'Coolant Temperature',
        category: 'temperature',
        unit: '°C',
        direction: 'above',
      },
      {
        key: 'oilPressure',
        label: 'Oil Pressure',
        category: 'pressure',
        unit: 'kPa',
        direction: 'below',
      },
      {
        key: 'rpm',
        label: 'Engine RPM',
        category: 'rpm',
        unit: 'RPM',
        direction: 'above',
      },
    ],
    
    getDefaults: (context) => {
      return getSmartDefaults('engine', { engineType: context?.engineType || 'diesel' });
    },
  },
  
  wind: {
    sensorType: 'wind',
    displayName: 'Wind Sensor',
    description: 'Wind speed and direction',
    
    fields: [
      {
        key: 'name',
        label: 'Wind Sensor Name',
        type: 'text',
        section: 'basic',
        placeholder: 'e.g., Masthead Wind, Stern Wind',
      },
      {
        key: 'mastHeight',
        label: 'Mast Height (m)',
        type: 'number',
        section: 'context',
        placeholder: 'e.g., 15',
      },
    ],
    
    alarmSupport: 'single-metric',
    defaultAlarmDirection: 'above',
    
    getDefaults: () => getSmartDefaults('wind'),
  },
  
  speed: {
    sensorType: 'speed',
    displayName: 'Speed Log',
    description: 'Boat speed measurement',
    
    fields: [
      {
        key: 'name',
        label: 'Speed Log Name',
        type: 'text',
        section: 'basic',
        placeholder: 'e.g., Paddlewheel, Ultrasonic Log',
      },
    ],
    
    alarmSupport: 'single-metric',
    defaultAlarmDirection: 'above',
    
    getDefaults: () => getSmartDefaults('speed'),
  },
  
  temperature: {
    sensorType: 'temperature',
    displayName: 'Temperature Sensor',
    description: 'Environmental temperature monitoring',
    
    fields: [
      {
        key: 'name',
        label: 'Sensor Name',
        type: 'text',
        section: 'basic',
        placeholder: 'e.g., Cabin Temp, Water Temp',
      },
      {
        key: 'location',
        label: 'Location',
        type: 'text',
        section: 'basic',
        placeholder: 'e.g., Saloon, Engine Room',
      },
    ],
    
    alarmSupport: 'single-metric',
    defaultAlarmDirection: 'above',
    
    getDefaults: () => getSmartDefaults('temperature'),
  },
  
  compass: {
    sensorType: 'compass',
    displayName: 'Compass',
    description: 'Magnetic heading',
    
    fields: [
      {
        key: 'name',
        label: 'Compass Name',
        type: 'text',
        section: 'basic',
        placeholder: 'e.g., Fluxgate Compass',
      },
      {
        key: 'variation',
        label: 'Magnetic Variation (°)',
        type: 'number',
        section: 'context',
        placeholder: 'e.g., -5.2',
      },
    ],
    
    alarmSupport: 'none',
  },
  
  gps: {
    sensorType: 'gps',
    displayName: 'GPS',
    description: 'Position and navigation',
    
    fields: [
      {
        key: 'name',
        label: 'GPS Name',
        type: 'text',
        section: 'basic',
        placeholder: 'e.g., Chart Plotter, Handheld GPS',
      },
    ],
    
    alarmSupport: 'none',
  },
  
  autopilot: {
    sensorType: 'autopilot',
    displayName: 'Autopilot',
    description: 'Automatic steering control',
    
    fields: [
      {
        key: 'name',
        label: 'Autopilot Name',
        type: 'text',
        section: 'basic',
        placeholder: 'e.g., Raymarine Evolution',
      },
    ],
    
    alarmSupport: 'none',
  },
  
  navigation: {
    sensorType: 'navigation',
    displayName: 'Navigation',
    description: 'Navigation and routing data',
    
    fields: [
      {
        key: 'name',
        label: 'System Name',
        type: 'text',
        section: 'basic',
        placeholder: 'e.g., Chart Plotter Navigation',
      },
    ],
    
    alarmSupport: 'none',
  },
  
  tank: {
    sensorType: 'tank',
    displayName: 'Tank Level',
    description: 'Fluid tank monitoring',
    
    fields: [
      {
        key: 'name',
        label: 'Tank Name',
        type: 'text',
        section: 'basic',
        placeholder: 'e.g., Fuel Port, Fresh Water',
      },
      {
        key: 'tankType',
        label: 'Tank Type',
        type: 'picker',
        section: 'context',
        options: [
          { label: 'Fuel', value: 'fuel' },
          { label: 'Fresh Water', value: 'freshWater' },
          { label: 'Gray Water', value: 'grayWater' },
          { label: 'Black Water', value: 'blackWater' },
          { label: 'Live Well', value: 'liveWell' },
          { label: 'Oil', value: 'oil' },
        ],
        defaultValue: 'fuel',
      },
      {
        key: 'capacity',
        label: 'Capacity (L)',
        type: 'number',
        section: 'context',
        placeholder: 'e.g., 200',
      },
    ],
    
    alarmSupport: 'single-metric',
    defaultAlarmDirection: 'below',
    
    getDefaults: () => getSmartDefaults('tank'),
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
