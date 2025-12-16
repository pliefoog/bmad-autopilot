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
      critical: 2.0, // Critical minimum depth (SI units: meters)
      warning: 2.5, // Warning depth (SI units: meters)
      direction: 'below' as const,
      enabled: true,
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 0.3, // 30cm hysteresis
      warningHysteresis: 0.2, // 20cm hysteresis
    },
  },

  // Temperature sensor defaults by location (celsius)
  temperature: {
    default: {
      critical: 50, // Generic temperature alarm (SI units: celsius)
      warning: 40, // Generic high temperature (SI units: celsius)
      direction: 'above' as const,
      enabled: false, // Disabled by default - user should configure for specific use case
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 3, // 3°C hysteresis
      warningHysteresis: 2, // 2°C hysteresis
    },
    engine: {
      critical: 95, // Critical overheat (SI units: celsius)
      warning: 85, // High temperature warning (SI units: celsius)
      direction: 'above' as const,
      enabled: true,
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 3, // 3°C hysteresis
      warningHysteresis: 2, // 2°C hysteresis
    },
    exhaust: {
      critical: 65, // Exhaust overheat
      warning: 55,
      direction: 'above' as const,
      enabled: true,
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 3,
      warningHysteresis: 2,
    },
    engineRoom: {
      critical: 50,
      warning: 40,
      direction: 'above' as const,
      enabled: true,
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 3,
      warningHysteresis: 2,
    },
    seawater: {
      critical: 35, // Very warm water affecting engine cooling efficiency
      warning: 32, // Warm water - monitor engine temps
      direction: 'above' as const,
      enabled: false, // Usually informational only - enable if monitoring cooling water
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 2,
      warningHysteresis: 1,
    },
    cabin: {
      critical: 40,
      warning: 35,
      direction: 'above' as const,
      enabled: false, // Comfort only, not safety-critical
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 3,
      warningHysteresis: 2,
    },
    outside: {
      critical: 40,
      warning: 35,
      direction: 'above' as const,
      enabled: false,
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 3,
      warningHysteresis: 2,
    },
    refrigeration: {
      critical: 10,
      warning: -10,
      direction: 'above' as const,
      enabled: true,
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 2,
      warningHysteresis: 1,
    },
    freezer: {
      critical: -10,
      warning: -15,
      direction: 'above' as const,
      enabled: true,
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 2,
      warningHysteresis: 1,
    },
    liveWell: {
      critical: 30,
      warning: 25,
      direction: 'above' as const,
      enabled: false,
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 2,
      warningHysteresis: 1,
    },
    baitWell: {
      critical: 30,
      warning: 25,
      direction: 'above' as const,
      enabled: false,
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 2,
      warningHysteresis: 1,
    },
  },

  // Engine sensor defaults - context-aware by engine type
  engine: {
    rpm: {
      // Diesel engine defaults (lower RPM range)
      diesel: {
        critical: 2800, // Diesel red line typically lower
        warning: 2500,
        direction: 'above' as const,
        criticalHysteresis: 100, // 100 RPM recovery band
        warningHysteresis: 100,
        criticalSoundPattern: 'rapid_pulse',
        warningSoundPattern: 'warble',
        enabled: true,
      },
      // Gasoline engine defaults (higher RPM range)
      gasoline: {
        critical: 3600, // Gas engine red line
        warning: 3300,
        direction: 'above' as const,
        criticalHysteresis: 100, // 100 RPM recovery band
        warningHysteresis: 100,
        criticalSoundPattern: 'rapid_pulse',
        warningSoundPattern: 'warble',
        enabled: true,
      },
      // Outboard defaults (similar to gasoline)
      outboard: {
        critical: 5800, // Outboards can rev higher
        warning: 5500,
        direction: 'above' as const,
        criticalHysteresis: 150, // 150 RPM recovery band for higher revving
        warningHysteresis: 150,
        criticalSoundPattern: 'rapid_pulse',
        warningSoundPattern: 'warble',
        enabled: true,
      },
    },
    coolantTemp: {
      // Universal for all engine types (celsius)
      critical: 95,
      warning: 85,
      direction: 'above' as const,
      criticalHysteresis: 3, // 3°C recovery band
      warningHysteresis: 3,
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      enabled: true,
    },
    oilPressure: {
      // Pascals (kPa * 1000)
      // Diesel typically requires higher oil pressure
      diesel: {
        critical: 138000, // 20 PSI minimum
        warning: 207000, // 30 PSI warning
        direction: 'below' as const,
        criticalHysteresis: 34500, // ~5 PSI recovery band
        warningHysteresis: 34500,
        criticalSoundPattern: 'rapid_pulse',
        warningSoundPattern: 'warble',
        enabled: true,
      },
      // Gasoline can operate at lower pressure
      gasoline: {
        critical: 103000, // 15 PSI minimum
        warning: 172000, // 25 PSI warning
        direction: 'below' as const,
        criticalHysteresis: 34500, // ~5 PSI recovery band
        warningHysteresis: 34500,
        criticalSoundPattern: 'rapid_pulse',
        warningSoundPattern: 'warble',
        enabled: true,
      },
      // Outboard defaults
      outboard: {
        critical: 103000, // 15 PSI minimum
        warning: 172000, // 25 PSI warning
        direction: 'below' as const,
        criticalHysteresis: 34500, // ~5 PSI recovery band
        warningHysteresis: 34500,
        criticalSoundPattern: 'rapid_pulse',
        warningSoundPattern: 'warble',
        enabled: true,
      },
    },
    alternatorVoltage: {
      // Universal charging system thresholds
      critical: 13.0, // Not charging (below)
      warning: 13.5, // Low charging
      direction: 'below' as const,
      criticalHysteresis: 0.3, // 0.3V recovery band
      warningHysteresis: 0.3,
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      enabled: true,
    },
  },

  // Battery sensor defaults (volts) - context-aware by chemistry
  battery: {
    voltage: {
      // Lead-acid (flooded) defaults
      'lead-acid': {
        critical: 11.8, // 50% DOD for lead-acid
        warning: 12.2, // 70% SOC
        direction: 'below' as const,
        criticalHysteresis: 0.2, // 0.2V recovery band
        warningHysteresis: 0.2,
        criticalSoundPattern: 'rapid_pulse',
        warningSoundPattern: 'warble',
        enabled: true,
      },
      // AGM (Absorbed Glass Mat) defaults
      agm: {
        critical: 12.0, // Better voltage stability than flooded
        warning: 12.4, // 80% SOC
        direction: 'below' as const,
        criticalHysteresis: 0.2, // 0.2V recovery band
        warningHysteresis: 0.2,
        criticalSoundPattern: 'rapid_pulse',
        warningSoundPattern: 'warble',
        enabled: true,
      },
      // LiFePO4 (Lithium Iron Phosphate) defaults
      lifepo4: {
        critical: 12.8, // ~20% SOC for LiFePO4
        warning: 13.0, // ~50% SOC
        direction: 'below' as const,
        criticalHysteresis: 0.15, // Smaller hysteresis for stable LiFePO4
        warningHysteresis: 0.15,
        criticalSoundPattern: 'rapid_pulse',
        warningSoundPattern: 'warble',
        enabled: true,
      },
    },
    stateOfCharge: {
      // Percentage 0-100 (chemistry-agnostic)
      critical: 20,
      warning: 50,
      direction: 'below' as const,
      criticalHysteresis: 5, // 5% recovery band
      warningHysteresis: 5,
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      enabled: true,
    },
  },

  // Wind sensor defaults (m/s)
  wind: {
    speed: {
      critical: 17.5, // ~35 knots - gale force (SI units: m/s)
      warning: 12.5, // ~25 knots (SI units: m/s)
      direction: 'above' as const,
      enabled: true,
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 1.0, // 1 m/s hysteresis
      warningHysteresis: 0.5, // 0.5 m/s hysteresis
    },
  },

  // Speed sensor defaults (m/s) - Speed Through Water (STW) from paddlewheel
  speed: {
    default: {
      critical: 25.7, // ~50 knots (SI units: m/s)
      warning: 20.6, // ~40 knots (SI units: m/s)
      direction: 'above' as const,
      enabled: false, // Usually not safety-critical
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 1.0,
      warningHysteresis: 0.5,
    },
  },

  // GPS sensor defaults - Speed Over Ground (SOG) from GPS calculation
  gps: {
    speedOverGround: {
      critical: 25.7, // ~50 knots (SI units: m/s)
      warning: 20.6, // ~40 knots (SI units: m/s)
      direction: 'above' as const,
      enabled: false, // Usually not safety-critical
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 1.0,
      warningHysteresis: 0.5,
    },
  },

  // Tank level defaults (ratio 0.0-1.0)
  tank: {
    fuel: {
      critical: 0.1, // 10% remaining (SI units: ratio)
      warning: 0.25, // 25% remaining (SI units: ratio)
      direction: 'below' as const,
      enabled: true,
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 0.05, // 5% hysteresis
      warningHysteresis: 0.03, // 3% hysteresis
    },
    water: {
      critical: 0.1,
      warning: 0.25,
      direction: 'below' as const,
      enabled: true,
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 0.05,
      warningHysteresis: 0.03,
    },
    waste: {
      critical: 0.9, // 90% full alarm
      warning: 0.75, // 75% full warning
      direction: 'above' as const,
      enabled: true,
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 0.05,
      warningHysteresis: 0.03,
    },
    blackwater: {
      critical: 0.9,
      warning: 0.75,
      direction: 'above' as const,
      enabled: true,
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 0.05,
      warningHysteresis: 0.03,
    },
  },
} as const;

/**
 * Get default alarm thresholds for a sensor type and location
 */
export function getDefaultThresholds(
  sensorType: string,
  location?: string,
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
    tank: 'fuel',
    gps: 'speedOverGround',
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
  fieldName: string,
): SensorAlarmThresholds | undefined {
  const defaults = (ALARM_THRESHOLD_DEFAULTS as any)[sensorType];

  if (!defaults || !defaults[fieldName]) {
    return undefined;
  }

  return { ...defaults[fieldName] };
}

/**
 * Get smart context-aware thresholds based on sensor type and context
 * Takes battery chemistry, engine type, etc. into account
 * Returns multi-metric structure for battery and engine sensors
 */
export function getSmartDefaults(
  sensorType: string,
  context?: {
    batteryChemistry?: 'lead-acid' | 'agm' | 'lifepo4';
    engineType?: 'diesel' | 'gasoline' | 'outboard';
    tankType?: string;
    temperatureLocation?: string;
  },
  location?: string,
): SensorAlarmThresholds | undefined {
  const defaults = (ALARM_THRESHOLD_DEFAULTS as any)[sensorType];

  if (!defaults) {
    return undefined;
  }

  // Battery: return multi-metric structure with all metrics
  if (sensorType === 'battery') {
    const chemistry = context?.batteryChemistry || 'lead-acid';
    const voltageDefaults = defaults.voltage?.[chemistry] || defaults.voltage?.['lead-acid'];
    const socDefaults = defaults.stateOfCharge;
    
    // Create multi-metric structure
    const metrics: any = {};
    
    if (voltageDefaults) {
      metrics.voltage = {
        ...voltageDefaults,
        enabled: true,
      };
    }
    
    if (socDefaults) {
      metrics.soc = {
        ...socDefaults,
        enabled: true,
      };
    }
    
    // Temperature and current can be added when available
    // For now, we'll add placeholders that can be configured
    metrics.temperature = {
      critical: 45, // 45°C critical
      warning: 40, // 40°C warning
      direction: 'above' as const,
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 2,
      warningHysteresis: 2,
      enabled: false, // Disabled by default, enable if sensor provides it
    };
    
    metrics.current = {
      critical: 200, // 200A draw
      warning: 150, // 150A draw
      direction: 'above' as const,
      criticalSoundPattern: 'rapid_pulse',
      warningSoundPattern: 'warble',
      criticalHysteresis: 10,
      warningHysteresis: 10,
      enabled: false, // Disabled by default
    };
    
    return {
      enabled: true,
      context: { batteryChemistry: chemistry },
      metrics,
    };
  }

  // Engine: return multi-metric structure with all metrics
  if (sensorType === 'engine') {
    const engineType = context?.engineType || 'diesel';
    const rpmDefaults = defaults.rpm?.[engineType] || defaults.rpm?.['diesel'];
    const coolantDefaults = defaults.coolantTemp?.[engineType] || defaults.coolantTemp?.['diesel'];
    const oilPressureDefaults = defaults.oilPressure?.[engineType] || defaults.oilPressure?.['diesel'];
    
    // Create multi-metric structure
    const metrics: any = {};
    
    if (rpmDefaults) {
      metrics.rpm = {
        ...rpmDefaults,
        enabled: true,
      };
    }
    
    if (coolantDefaults) {
      metrics.coolantTemp = {
        ...coolantDefaults,
        enabled: true,
      };
    }
    
    if (oilPressureDefaults) {
      metrics.oilPressure = {
        ...oilPressureDefaults,
        enabled: true,
      };
    }
    
    return {
      enabled: true,
      context: { engineType },
      metrics,
    };
  }

  // GPS: return multi-metric structure with SOG metric
  if (sensorType === 'gps') {
    const sogDefaults = defaults.speedOverGround;
    
    // Create multi-metric structure
    const metrics: any = {};
    
    if (sogDefaults) {
      metrics.speedOverGround = {
        ...sogDefaults,
      };
    }
    
    return {
      enabled: false, // GPS alarms not safety-critical by default
      metrics,
    };
  }

  // Temperature: use location-specific defaults
  if (sensorType === 'temperature' && location) {
    const tempDefaults = defaults[location];
    if (tempDefaults) {
      return { ...tempDefaults };
    }
  }

  // Fall back to standard getDefaultThresholds logic for single-metric sensors
  return getDefaultThresholds(sensorType, location);
}
