/**
 * Alarm Threshold Defaults Registry
 * Location-aware default thresholds for sensor instances
 * All values in SI units (meters, celsius, volts, pascals, etc.)
 */

import { SensorAlarmThresholds } from '../types/SensorData';

/**
 * Default thresholds by sensor type and location
 */
export const ALARM_THRESHOLD_DEFAULTS = {
  // Depth sensor defaults (meters)
  depth: {
    default: {
      min: 2.0,           // Critical minimum depth
      warning: 2.5,       // Warning depth
      max: undefined,     // No maximum depth alarm by default
      enabled: true,
      thresholdType: 'min' as const,
    }
  },

  // Temperature sensor defaults by location (celsius)
  temperature: {
    engine: {
      min: 40,            // Engine too cold
      warning: 85,        // High temperature warning
      max: 95,            // Critical overheat
      enabled: true,
      thresholdType: 'max' as const,
    },
    exhaust: {
      min: 30,
      warning: 55,
      max: 65,            // Exhaust overheat
      enabled: true,
      thresholdType: 'max' as const,
    },
    engineRoom: {
      min: 20,
      warning: 40,
      max: 50,
      enabled: true,
      thresholdType: 'max' as const,
    },
    seawater: {
      min: 0,
      warning: 25,
      max: 30,
      enabled: false,     // Usually informational only
      thresholdType: 'max' as const,
    },
    cabin: {
      min: -10,
      warning: 35,
      max: 40,
      enabled: false,     // Comfort only, not safety-critical
      thresholdType: 'max' as const,
    },
    outside: {
      min: -10,
      warning: 35,
      max: 40,
      enabled: false,
      thresholdType: 'max' as const,
    },
    refrigeration: {
      min: -20,
      warning: -10,
      max: 10,
      enabled: true,
      thresholdType: 'max' as const,
    },
    freezer: {
      min: -30,
      warning: -15,
      max: -10,
      enabled: true,
      thresholdType: 'max' as const,
    },
    liveWell: {
      min: 10,
      warning: 25,
      max: 30,
      enabled: false,
      thresholdType: 'max' as const,
    },
    baitWell: {
      min: 10,
      warning: 25,
      max: 30,
      enabled: false,
      thresholdType: 'max' as const,
    },
  },

  // Engine sensor defaults
  engine: {
    rpm: {
      min: undefined,     // No minimum RPM alarm
      warning: 3300,      // High RPM warning
      max: 3600,          // Red line
      enabled: true,
      thresholdType: 'max' as const,
    },
    coolantTemp: {
      min: 40,
      warning: 85,
      max: 95,
      enabled: true,
      thresholdType: 'max' as const,
    },
    oilPressure: {      // Pascals (kPa * 1000)
      min: 138000,       // 20 PSI = 138 kPa
      warning: 207000,   // 30 PSI
      max: undefined,
      enabled: true,
      thresholdType: 'min' as const,
    },
    alternatorVoltage: {
      min: 13.0,         // Not charging
      warning: 13.5,
      max: 15.0,         // Overcharging
      enabled: true,
      thresholdType: 'min' as const,
    },
  },

  // Battery sensor defaults (volts)
  battery: {
    voltage: {
      min: 11.0,         // Critical low voltage
      warning: 12.0,     // Low battery warning
      max: 15.0,         // Overcharge protection
      enabled: true,
      thresholdType: 'min' as const,
    },
    stateOfCharge: {   // Percentage 0-100
      min: 20,           // Critical SOC
      warning: 50,       // Low SOC warning
      max: undefined,
      enabled: true,
      thresholdType: 'min' as const,
    },
  },

  // Wind sensor defaults (m/s)
  wind: {
    speed: {
      min: undefined,
      warning: 12.5,     // ~25 knots
      max: 17.5,         // ~35 knots - gale force
      enabled: true,
      thresholdType: 'max' as const,
    },
  },

  // Speed sensor defaults (m/s)
  speed: {
    overGround: {
      min: undefined,
      warning: 12.5,     // ~25 knots
      max: 15.0,         // ~30 knots
      enabled: false,    // Usually not safety-critical
      thresholdType: 'max' as const,
    },
  },

  // Tank level defaults (ratio 0.0-1.0)
  tank: {
    fuel: {
      min: 0.10,         // 10% remaining
      warning: 0.25,     // 25% remaining
      max: undefined,
      enabled: true,
      thresholdType: 'min' as const,
    },
    water: {
      min: 0.10,
      warning: 0.25,
      max: undefined,
      enabled: true,
      thresholdType: 'min' as const,
    },
    waste: {
      min: undefined,
      warning: 0.75,     // 75% full warning
      max: 0.90,         // 90% full alarm
      enabled: true,
      thresholdType: 'max' as const,
    },
    blackwater: {
      min: undefined,
      warning: 0.75,
      max: 0.90,
      enabled: true,
      thresholdType: 'max' as const,
    },
  },
} as const;

/**
 * Get default alarm thresholds for a sensor type and location
 */
export function getDefaultThresholds(
  sensorType: string,
  location?: string
): SensorAlarmThresholds | undefined {
  const defaults = (ALARM_THRESHOLD_DEFAULTS as any)[sensorType];
  
  if (!defaults) {
    return undefined;
  }

  // If location is provided and exists in defaults, use location-specific defaults
  if (location && defaults[location]) {
    return { ...defaults[location] };
  }

  // Try 'default' key for sensors without location variants
  if (defaults.default) {
    return { ...defaults.default };
  }

  // For multi-field sensors like engine, return defaults for the primary field
  const primaryFields: Record<string, string> = {
    engine: 'coolantTemp',
    battery: 'voltage',
    wind: 'speed',
    speed: 'overGround',
    tank: 'fuel',
  };

  const primaryField = primaryFields[sensorType];
  if (primaryField && defaults[primaryField]) {
    return { ...defaults[primaryField] };
  }

  return undefined;
}

/**
 * Get field-specific thresholds for complex sensors (engine, battery, etc.)
 */
export function getFieldThresholds(
  sensorType: string,
  fieldName: string
): SensorAlarmThresholds | undefined {
  const defaults = (ALARM_THRESHOLD_DEFAULTS as any)[sensorType];
  
  if (!defaults || !defaults[fieldName]) {
    return undefined;
  }

  return { ...defaults[fieldName] };
}
