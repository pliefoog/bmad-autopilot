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
  defaultValue?: any;             // Default when creating new (MUST be real value, not placeholder)
  placeholder?: string;           // For text inputs only - NOT for setting defaults
  section?: 'basic' | 'context' | 'alarms';  // UI grouping
  hardwareField?: string;         // Sensor data field name if read-only from hardware
  min?: number;                   // For number/slider types - minimum value (in SI units)
  max?: number;                   // For number/slider types - maximum value (in SI units)
  step?: number;                  // For slider types - step increment
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
        placeholder: 'House Bank, Starter Battery, etc.',
      },
      {
        key: 'batteryChemistry',
        label: 'Battery Chemistry',
        type: 'picker',
        section: 'context',
        readOnly: true, // Check hardware first (BMS provides this)
        hardwareField: 'chemistry',
        options: [
          { label: 'Lead Acid', value: 'lead-acid' },
          { label: 'AGM', value: 'agm' },
          { label: 'Gel', value: 'gel' },
          { label: 'LiFePO4', value: 'lifepo4' },
        ],
        defaultValue: 'lead-acid',
      },
      {
        key: 'capacity',
        label: 'Capacity',
        type: 'number',
        section: 'context',
        placeholder: 'Amp-hours (Ah)',
        defaultValue: 200,
        min: 10,
        max: 2000,
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
        placeholder: 'Bow Sounder, Stern Transducer, etc.',
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
        placeholder: 'Port Engine, Main Engine, etc.',
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
        placeholder: 'Engine redline RPM',
        defaultValue: 3000,
        min: 1000,
        max: 8000,
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
        placeholder: 'Masthead Wind, etc.',
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
        placeholder: 'Paddlewheel, Ultrasonic, etc.',
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
        placeholder: 'Cabin Temp, Water Temp, etc.',
      },
      {
        key: 'location',
        label: 'Location',
        type: 'picker',
        section: 'context',
        options: [
          { label: 'Engine Room', value: 'engineRoom' },
          { label: 'Cabin/Saloon', value: 'cabin' },
          { label: 'Refrigerator', value: 'fridge' },
          { label: 'Freezer', value: 'freezer' },
          { label: 'Outside Air', value: 'outside' },
          { label: 'Sea Water', value: 'seaWater' },
        ],
        defaultValue: 'cabin',
      },
    ],
    
    alarmSupport: 'single-metric',
    defaultAlarmDirection: 'above',
    
    getDefaults: (context) => {
      // Location-aware temperature thresholds
      // Engine room: higher limits (105°C), Freezer: below zero (-18°C), etc.
      return getSmartDefaults('temperature', { temperatureLocation: context?.location || 'cabin' });
    },
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
        placeholder: 'Fluxgate Compass, etc.',
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
        placeholder: 'Chart Plotter, Handheld, etc.',
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
        placeholder: 'Raymarine, Garmin, etc.',
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
        placeholder: 'Navigation System',
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
        placeholder: 'Fuel Port, Fresh Water, etc.',
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
        label: 'Capacity',
        type: 'number',
        section: 'context',
        placeholder: 'Liters',
        defaultValue: 200,
        min: 10,
        max: 5000,
      },
    ],
    
    alarmSupport: 'single-metric',
    defaultAlarmDirection: 'below',
    
    getDefaults: (context) => {
      // Tank type affects alarm thresholds (fuel vs water vs black water)
      return getSmartDefaults('tank', { tankType: context?.tankType || 'fuel' });
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
 * CONTEXT-AWARE DEFAULT THRESHOLDS
 * ============================================================================
 * 
 * Provides smart defaults for alarm thresholds based on sensor context:
 * - Battery: Chemistry-based voltage thresholds (lead-acid, AGM, LiFePO4)
 * - Engine: Type-based RPM limits and oil pressure (diesel, gasoline, outboard)
 * - Temperature: Location-based ranges (freezer, fridge, engine, cabin)
 * - Tank: Type-based critical levels (fuel, water, black water)
 * 
 * All values are in SI units. Presentation system handles conversion to user units.
 */

/**
 * Get context-aware default alarm thresholds for a sensor
 * 
 * @param sensorType - Type of sensor
 * @param context - Context parameters (chemistry, type, location, etc.)
 * @returns Complete alarm threshold configuration ready for NMEA store
 */
export function getSmartDefaults(
  sensorType: SensorType,
  context?: {
    batteryChemistry?: 'lead-acid' | 'agm' | 'gel' | 'lifepo4';
    engineType?: 'diesel' | 'gasoline' | 'outboard';
    tankType?: string;
    temperatureLocation?: string;
  }
): SensorAlarmThresholds | undefined {
  
  // ========== BATTERY: Multi-metric, chemistry-aware ==========
  if (sensorType === 'battery') {
    const chemistry = context?.batteryChemistry || 'lead-acid';
    
    const metrics: any = {};
    
    // Voltage thresholds by chemistry
    switch (chemistry) {
      case 'lifepo4':
        metrics.voltage = {
          critical: 12.8,  // ~10% SOC
          warning: 13.0,   // ~20% SOC
          direction: 'below' as const,
          enabled: true,
          criticalSoundPattern: 'rapid_pulse',
          warningSoundPattern: 'warble',
          criticalHysteresis: 0.2,
          warningHysteresis: 0.2,
        };
        break;
      case 'agm':
      case 'gel':
        metrics.voltage = {
          critical: 12.0,  // ~20% SOC
          warning: 12.2,   // ~40% SOC
          direction: 'below' as const,
          enabled: true,
          criticalSoundPattern: 'rapid_pulse',
          warningSoundPattern: 'warble',
          criticalHysteresis: 0.2,
          warningHysteresis: 0.2,
        };
        break;
      case 'lead-acid':
      default:
        metrics.voltage = {
          critical: 11.8,  // ~20% SOC
          warning: 12.0,   // ~40% SOC
          direction: 'below' as const,
          enabled: true,
          criticalSoundPattern: 'rapid_pulse',
          warningSoundPattern: 'warble',
          criticalHysteresis: 0.2,
          warningHysteresis: 0.2,
        };
    }
    
    // State of charge (universal)
    metrics.soc = {
      critical: 20,  // 20%
      warning: 40,   // 40%
      direction: 'below' as const,
      enabled: true,
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 5,
      warningHysteresis: 5,
    };
    
    // Temperature (chemistry-dependent limits)
    const maxTemp = chemistry === 'lifepo4' ? 50 : (chemistry === 'agm' || chemistry === 'gel' ? 45 : 40);
    metrics.temperature = {
      critical: maxTemp,
      warning: maxTemp - 5,
      direction: 'above' as const,
      enabled: false,  // Enable when sensor provides it
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 2,
      warningHysteresis: 2,
    };
    
    // Current draw
    metrics.current = {
      critical: 200,  // 200A
      warning: 150,   // 150A
      direction: 'above' as const,
      enabled: false,  // Enable when sensor provides it
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 10,
      warningHysteresis: 10,
    };
    
    return {
      enabled: true,
      context: { batteryChemistry: chemistry },
      metrics,
    };
  }
  
  // ========== ENGINE: Multi-metric, type-aware ==========
  if (sensorType === 'engine') {
    const engineType = context?.engineType || 'diesel';
    
    const metrics: any = {};
    
    // RPM limits by engine type
    switch (engineType) {
      case 'outboard':
        metrics.rpm = {
          critical: 5800,
          warning: 5500,
          direction: 'above' as const,
          enabled: true,
          criticalSoundPattern: 'rapid_pulse',
          warningSoundPattern: 'warble',
          criticalHysteresis: 150,
          warningHysteresis: 150,
        };
        break;
      case 'gasoline':
        metrics.rpm = {
          critical: 3600,
          warning: 3300,
          direction: 'above' as const,
          enabled: true,
          criticalSoundPattern: 'rapid_pulse',
          warningSoundPattern: 'warble',
          criticalHysteresis: 100,
          warningHysteresis: 100,
        };
        break;
      case 'diesel':
      default:
        metrics.rpm = {
          critical: 2800,
          warning: 2500,
          direction: 'above' as const,
          enabled: true,
          criticalSoundPattern: 'rapid_pulse',
          warningSoundPattern: 'warble',
          criticalHysteresis: 100,
          warningHysteresis: 100,
        };
    }
    
    // Coolant temperature (universal)
    metrics.temperature = {
      critical: 95,  // 95°C
      warning: 85,   // 85°C
      direction: 'above' as const,
      enabled: true,
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 3,
      warningHysteresis: 3,
    };
    
    // Oil pressure (in Pascals - 138kPa = 20 PSI)
    metrics.oilPressure = {
      critical: 138000,   // 20 PSI minimum
      warning: 207000,    // 30 PSI warning
      direction: 'below' as const,
      enabled: true,
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 34500,  // ~5 PSI
      warningHysteresis: 34500,
    };
    
    return {
      enabled: true,
      context: { engineType },
      metrics,
    };
  }
  
  // ========== TEMPERATURE: Single-metric, location-aware ==========
  if (sensorType === 'temperature') {
    const location = context?.temperatureLocation || 'cabin';
    
    let critical: number, warning: number;
    
    switch (location) {
      case 'engineRoom':
        critical = 105;  // Engine room overheat
        warning = 85;
        break;
      case 'freezer':
        critical = -10;  // Freezer rising temp
        warning = -15;
        break;
      case 'fridge':
        critical = 10;   // Food safety
        warning = 8;
        break;
      case 'outside':
        critical = 45;   // Extreme heat
        warning = 40;
        break;
      case 'seaWater':
        critical = 35;   // Cooling system issue
        warning = 30;
        break;
      case 'cabin':
      default:
        critical = 40;   // Comfort/safety
        warning = 35;
    }
    
    return {
      critical,
      warning,
      direction: 'above' as const,
      enabled: location === 'engineRoom' || location === 'freezer' || location === 'fridge',
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 2,
      warningHysteresis: 2,
    };
  }
  
  // ========== TANK: Single-metric, type-aware ==========
  if (sensorType === 'tank') {
    const tankType = context?.tankType || 'fuel';
    
    let critical: number, warning: number, direction: 'above' | 'below';
    
    switch (tankType) {
      case 'blackWater':
        critical = 95;   // Needs pump-out
        warning = 90;
        direction = 'above';
        break;
      case 'grayWater':
        critical = 90;   // High warning
        warning = 85;
        direction = 'above';
        break;
      case 'freshWater':
        critical = 10;   // Low water
        warning = 20;
        direction = 'below';
        break;
      case 'fuel':
      default:
        critical = 15;   // Reserve fuel
        warning = 25;
        direction = 'below';
    }
    
    return {
      critical,
      warning,
      direction,
      enabled: true,
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 5,
      warningHysteresis: 5,
    };
  }
  
  // ========== DEPTH: Single-metric, universal ==========
  if (sensorType === 'depth') {
    return {
      critical: 2.0,   // 2 meters
      warning: 2.5,    // 2.5 meters
      direction: 'below' as const,
      enabled: true,
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 0.3,
      warningHysteresis: 0.2,
    };
  }
  
  // ========== WIND: Single-metric, universal ==========
  if (sensorType === 'wind') {
    return {
      critical: 30,    // 30 m/s (~58 knots) storm
      warning: 25,     // 25 m/s (~48 knots) gale
      direction: 'above' as const,
      enabled: false,  // User preference
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 2,
      warningHysteresis: 2,
    };
  }
  
  // ========== SPEED: Single-metric, universal ==========
  if (sensorType === 'speed') {
    return {
      critical: 6,     // 6 m/s (~12 knots)
      warning: 5,      // 5 m/s (~10 knots)
      direction: 'above' as const,
      enabled: false,  // User preference
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 0.5,
      warningHysteresis: 0.5,
    };
  }
  
  // Sensors with no alarm support
  return undefined;
}
