/**
 * Central Sensor Configuration Registry
 * 
 * Single source of truth for all sensor-specific configuration requirements.
 * Drives SensorConfigDialog rendering without conditional sensor logic in the component.
 * 
 * **Design Principle**: Configuration over Code
 * - Add new sensor = add registry entry
 * - No conditional logic scattered in dialog component
 * - Type-safe sensor configuration
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
 * Helper to get sensor configuration by type
 */
export function getSensorConfig(sensorType: SensorType): SensorConfigDefinition {
  return SENSOR_CONFIG_REGISTRY[sensorType];
}

/**
 * Helper to check if sensor supports alarms
 */
export function sensorSupportsAlarms(sensorType: SensorType): boolean {
  return SENSOR_CONFIG_REGISTRY[sensorType].alarmSupport !== 'none';
}

/**
 * Helper to get alarm metrics for a sensor
 */
export function getSensorAlarmMetrics(sensorType: SensorType): SensorAlarmMetricConfig[] | undefined {
  return SENSOR_CONFIG_REGISTRY[sensorType].alarmMetrics;
}
