/**
 * Electrical Widget Validation Scenario
 * Generates comprehensive battery XDR sentences for Battery Widget testing
 * Based on marine-assets/test-scenarios/epic-11-widget-testing/engine/electrical-widget-validation.yaml
 */

module.exports = {
  name: 'Electrical Widget Validation',
  description: 'Comprehensive electrical system monitoring with multi-instance batteries, alternator charging, and marine safety thresholds',
  version: '1.0.0',
  category: 'engine',
  domain: 'electrical-systems',
  duration: 180000, // 3 minutes
  
  // Bridge mode configuration
  bridgeMode: 'nmea0183',
  
  // NMEA sentence timing (Hz = messages per second)
  timing: {
    depth: 1,              // 1 Hz - Standard depth sounder
    speed: 1,              // 1 Hz - Speed through water
    wind: 0.5,             // 0.5 Hz - Wind data
    gps: 1,                // 1 Hz - GPS position
    heading: 2,            // 2 Hz - Compass heading
    battery_voltage: 0.2,  // 0.2 Hz - Battery monitoring (every 5 seconds)
    engine_rpm: 1,         // 1 Hz - Engine data
    temperature: 0.1       // 0.1 Hz - Temperature sensors
  },
  
  // Multi-instance battery configuration
  data: {
    battery_voltage: {
      // House battery bank (primary service battery)
      house_battery: {
        type: 'voltage_profile',
        unit: 'volts',
        instance: 0,
        name: 'House Battery',
        nominal_voltage: 12.0,
        capacity_ah: 400,
        chemistry: 'AGM',
        charging_profile: 'house_load'
      },
      
      // Engine/starter battery (high current capability)
      engine_battery: {
        type: 'voltage_profile', 
        unit: 'volts',
        instance: 1,
        name: 'Engine Battery',
        nominal_voltage: 12.0,
        capacity_ah: 100,
        chemistry: 'Lead-Acid',
        charging_profile: 'alternator_charge'
      },
      
      // Thruster battery (high discharge rates)
      thruster_battery: {
        type: 'voltage_profile',
        unit: 'volts', 
        instance: 2,
        name: 'Thruster Battery',
        nominal_voltage: 12.0,
        capacity_ah: 200,
        chemistry: 'AGM',
        charging_profile: 'thruster_load'
      }
    },
    
    battery_current: {
      // Corresponding current measurements for each battery
      house_current: {
        type: 'current_profile',
        unit: 'amps',
        instance: 0,
        load_type: 'house_systems'
      },
      
      engine_current: {
        type: 'current_profile',
        unit: 'amps',
        instance: 1,
        load_type: 'alternator_charging'
      },
      
      thruster_current: {
        type: 'current_profile',
        unit: 'amps',
        instance: 2,
        load_type: 'thruster_operation'
      }
    }
  },
  
  // Scenario execution phases
  phases: [
    {
      name: 'initialization',
      duration: 10000, // 10 seconds
      description: 'System startup and battery status check',
      generators: ['depth', 'speed', 'wind', 'gps', 'heading', 'battery_voltage'],
      battery_states: {
        house: { voltage: [12.4, 12.6], current: [-5, -8], state: 'discharging' },
        engine: { voltage: [12.2, 12.4], current: [-1, -2], state: 'idle' },
        thruster: { voltage: [12.5, 12.7], current: [0, -1], state: 'standby' }
      }
    },
    
    {
      name: 'engine_start_charging',
      duration: 30000, // 30 seconds  
      description: 'Engine started, alternator charging batteries',
      generators: ['depth', 'speed', 'wind', 'gps', 'heading', 'battery_voltage', 'engine_rpm'],
      battery_states: {
        house: { voltage: [12.8, 13.4], current: [5, 15], state: 'charging' },
        engine: { voltage: [13.2, 13.8], current: [10, 25], state: 'bulk_charge' },
        thruster: { voltage: [12.6, 13.0], current: [2, 8], state: 'float_charge' }
      }
    },
    
    {
      name: 'thruster_operation',
      duration: 20000, // 20 seconds
      description: 'Bow thruster operation with high current draw',
      generators: ['depth', 'speed', 'wind', 'gps', 'heading', 'battery_voltage', 'engine_rpm'],
      battery_states: {
        house: { voltage: [12.6, 13.2], current: [3, 12], state: 'charging' },
        engine: { voltage: [13.0, 13.6], current: [8, 20], state: 'charging' },
        thruster: { voltage: [11.8, 12.4], current: [-80, -150], state: 'heavy_discharge' }
      }
    },
    
    {
      name: 'low_battery_warning',
      duration: 15000, // 15 seconds
      description: 'House battery low voltage warning simulation',
      generators: ['depth', 'speed', 'wind', 'gps', 'heading', 'battery_voltage', 'engine_rpm'],
      battery_states: {
        house: { voltage: [11.8, 12.0], current: [-10, -15], state: 'low_voltage' },
        engine: { voltage: [12.8, 13.2], current: [5, 15], state: 'charging' },
        thruster: { voltage: [12.2, 12.4], current: [-2, -5], state: 'discharging' }
      }
    },
    
    {
      name: 'recovery_charging', 
      duration: 45000, // 45 seconds
      description: 'Battery recovery with solar and alternator charging',
      generators: ['depth', 'speed', 'wind', 'gps', 'heading', 'battery_voltage', 'engine_rpm'],
      battery_states: {
        house: { voltage: [12.2, 12.8], current: [8, 20], state: 'recovery_charge' },
        engine: { voltage: [13.0, 13.6], current: [12, 25], state: 'charging' },
        thruster: { voltage: [12.4, 12.8], current: [1, 5], state: 'float_charge' }
      }
    }
  ],
  
  // Marine electrical safety thresholds
  safety_thresholds: {
    voltage_warning: 12.0,    // Low battery warning
    voltage_critical: 11.5,   // Critical battery level
    voltage_emergency: 11.0,  // Emergency shutdown level
    voltage_overcharge: 14.8, // Overcharge warning
    current_high: 100,        // High current warning (amps)
    current_critical: 200     // Critical current level (amps)
  },
  
  // Expected widget behavior for validation
  widget_validation: {
    battery_widgets_expected: 3,
    widget_ids: ['battery-0', 'battery-1', 'battery-2'],
    battery_names: ['House Battery', 'Engine Battery', 'Thruster Battery'],
    metrics_displayed: ['voltage', 'current', 'temperature', 'stateOfCharge'],
    safety_indicators: ['normal', 'warning', 'alarm'],
    update_frequency: '5 seconds maximum'
  }
};