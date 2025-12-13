/**
 * Built-in Widget Registrations
 * 
 * Defines sensor dependencies and creation logic for all 15 built-in widget types.
 * Each registration declares which sensors are required vs optional, replacing
 * the old polling-based detection system.
 */

import type { WidgetRegistration } from '../services/WidgetRegistrationService';
import type { WidgetConfig } from '../types/widget.types';
import { WidgetFactory } from '../services/WidgetFactory';

/**
 * Helper to create widget configuration
 */
function createWidgetConfig(
  widgetType: string,
  instance: number,
  title: string,
  icon: string
): WidgetConfig {
  const instanceId = WidgetFactory.generateInstanceWidgetId(widgetType, instance);
  return WidgetFactory.createWidgetConfig(instanceId, { instance }, {
    title,
    settings: { icon },
  });
}

/**
 * NAVIGATION WIDGETS
 */

// 1. Depth Widget - Shows depth below transducer/waterline/keel
export const DEPTH_WIDGET_REGISTRATION: WidgetRegistration = {
  widgetType: 'depth',
  displayName: 'Depth',
  category: 'navigation',
  icon: 'water-outline',
  multiInstance: true,
  maxInstances: 3, // DPT, DBT, DBK
  priority: 90,
  requiredSensors: [
    {
      category: 'depth',
      measurementType: 'depth',
      required: true,
      label: 'Depth',
    },
  ],
  optionalSensors: [],
  createWidget: (instance, sensorData) => {
    return createWidgetConfig('depth', instance, `Depth ${instance}`, 'water-outline');
  },
};

// 2. Speed Widget - Shows SOG (GPS) or STW (Log)
export const SPEED_WIDGET_REGISTRATION: WidgetRegistration = {
  widgetType: 'speed',
  displayName: 'Speed',
  category: 'navigation',
  icon: 'speedometer-outline',
  multiInstance: true,
  maxInstances: 2, // GPS speed, log speed
  priority: 95,
  requiredSensors: [
    {
      category: 'speed',
      measurementType: 'overGround', // SOG
      required: true,
      label: 'Speed Over Ground',
    },
  ],
  optionalSensors: [
    {
      category: 'speed',
      measurementType: 'throughWater', // STW
      required: false,
      label: 'Speed Through Water',
    },
  ],
  createWidget: (instance, sensorData) => {
    return createWidgetConfig('speed', instance, `Speed ${instance}`, 'speedometer-outline');
  },
};

// 3. Wind Widget - Shows apparent and true wind
export const WIND_WIDGET_REGISTRATION: WidgetRegistration = {
  widgetType: 'wind',
  displayName: 'Wind',
  category: 'navigation',
  icon: 'flag-outline',
  multiInstance: true,
  maxInstances: 2,
  priority: 85,
  requiredSensors: [
    {
      category: 'wind',
      measurementType: 'direction',
      required: true,
      label: 'Apparent Wind Direction',
    },
    {
      category: 'wind',
      measurementType: 'speed',
      required: true,
      label: 'Apparent Wind Speed',
    },
  ],
  optionalSensors: [
    {
      category: 'wind',
      measurementType: 'trueDirection',
      required: false,
      label: 'True Wind Direction',
    },
    {
      category: 'wind',
      measurementType: 'trueSpeed',
      required: false,
      label: 'True Wind Speed',
    },
  ],
  createWidget: (instance, sensorData) => {
    return createWidgetConfig('wind', instance, `Wind ${instance}`, 'flag-outline');
  },
};

// 4. Compass Widget - Shows heading
export const COMPASS_WIDGET_REGISTRATION: WidgetRegistration = {
  widgetType: 'compass',
  displayName: 'Compass',
  category: 'navigation',
  icon: 'compass-outline',
  multiInstance: true,
  maxInstances: 2,
  priority: 80,
  requiredSensors: [
    {
      category: 'compass',
      measurementType: 'heading',
      required: true,
      label: 'Heading',
    },
  ],
  optionalSensors: [
    {
      category: 'compass',
      measurementType: 'variation',
      required: false,
      label: 'Magnetic Variation',
    },
    {
      category: 'compass',
      measurementType: 'rateOfTurn',
      required: false,
      label: 'Rate of Turn',
    },
  ],
  createWidget: (instance, sensorData) => {
    return createWidgetConfig('compass', instance, `Compass ${instance}`, 'compass-outline');
  },
};

// 5. GPS Widget - Shows position, COG, SOG
export const GPS_WIDGET_REGISTRATION: WidgetRegistration = {
  widgetType: 'gps',
  displayName: 'GPS',
  category: 'navigation',
  icon: 'navigate-outline',
  multiInstance: true,
  maxInstances: 2,
  priority: 75,
  requiredSensors: [
    {
      category: 'gps',
      measurementType: 'position',
      required: true,
      label: 'Position',
    },
  ],
  optionalSensors: [
    {
      category: 'gps',
      measurementType: 'courseOverGround',
      required: false,
      label: 'Course Over Ground',
    },
    {
      category: 'gps',
      measurementType: 'speedOverGround',
      required: false,
      label: 'Speed Over Ground',
    },
    {
      category: 'gps',
      measurementType: 'quality',
      required: false,
      label: 'GPS Quality',
    },
  ],
  createWidget: (instance, sensorData) => {
    return createWidgetConfig('gps', instance, `GPS ${instance}`, 'navigate-outline');
  },
};

/**
 * AUTOPILOT WIDGETS
 */

// 6. Autopilot Widget - Shows autopilot status and controls
export const AUTOPILOT_WIDGET_REGISTRATION: WidgetRegistration = {
  widgetType: 'autopilot',
  displayName: 'Autopilot',
  category: 'autopilot',
  icon: 'boat-outline',
  multiInstance: false,
  priority: 100,
  requiredSensors: [
    {
      category: 'autopilot',
      measurementType: 'engaged',
      required: true,
      label: 'Engaged Status',
    },
  ],
  optionalSensors: [
    {
      category: 'autopilot',
      measurementType: 'mode',
      required: false,
      label: 'Autopilot Mode',
    },
    {
      category: 'autopilot',
      measurementType: 'targetHeading',
      required: false,
      label: 'Target Heading',
    },
    {
      category: 'autopilot',
      measurementType: 'currentHeading',
      required: false,
      label: 'Current Heading',
    },
    {
      category: 'autopilot',
      measurementType: 'rudderAngle',
      required: false,
      label: 'Rudder Angle',
    },
  ],
  createWidget: (instance, sensorData) => {
    return createWidgetConfig('autopilot', instance, 'Autopilot', 'boat-outline');
  },
};

/**
 * ENGINE WIDGETS
 */

// 7. Engine Widget - Shows RPM, temperature, oil pressure
export const ENGINE_WIDGET_REGISTRATION: WidgetRegistration = {
  widgetType: 'engine',
  displayName: 'Engine',
  category: 'engine',
  icon: 'cog-outline',
  multiInstance: true,
  maxInstances: 8,
  priority: 70,
  requiredSensors: [
    {
      category: 'engine',
      measurementType: 'rpm',
      required: true,
      label: 'RPM',
    },
  ],
  optionalSensors: [
    {
      category: 'engine',
      measurementType: 'coolantTemp',
      required: false,
      label: 'Coolant Temperature',
    },
    {
      category: 'engine',
      measurementType: 'oilPressure',
      required: false,
      label: 'Oil Pressure',
    },
    {
      category: 'engine',
      measurementType: 'alternatorVoltage',
      required: false,
      label: 'Alternator Voltage',
    },
    {
      category: 'engine',
      measurementType: 'fuelRate',
      required: false,
      label: 'Fuel Rate',
    },
    {
      category: 'engine',
      measurementType: 'hours',
      required: false,
      label: 'Engine Hours',
    },
  ],
  createWidget: (instance, sensorData) => {
    return createWidgetConfig('engine', instance, `Engine ${instance}`, 'cog-outline');
  },
};

/**
 * POWER WIDGETS
 */

// 8. Battery Widget - Shows voltage, current, SOC
export const BATTERY_WIDGET_REGISTRATION: WidgetRegistration = {
  widgetType: 'battery',
  displayName: 'Battery',
  category: 'engine',
  icon: 'battery-charging-outline',
  multiInstance: true,
  maxInstances: 8,
  priority: 65,
  requiredSensors: [
    {
      category: 'battery',
      measurementType: 'voltage',
      required: true,
      label: 'Voltage',
    },
  ],
  optionalSensors: [
    {
      category: 'battery',
      measurementType: 'current',
      required: false,
      label: 'Current',
    },
    {
      category: 'battery',
      measurementType: 'stateOfCharge',
      required: false,
      label: 'State of Charge',
    },
    {
      category: 'battery',
      measurementType: 'temperature',
      required: false,
      label: 'Temperature',
    },
  ],
  createWidget: (instance, sensorData) => {
    return createWidgetConfig('battery', instance, `Battery ${instance}`, 'battery-charging-outline');
  },
};

/**
 * TANK WIDGETS
 */

// 9. Tank Widget - Shows fluid level
export const TANK_WIDGET_REGISTRATION: WidgetRegistration = {
  widgetType: 'tank',
  displayName: 'Tank',
  category: 'environment',
  icon: 'water',
  multiInstance: true,
  maxInstances: 8,
  priority: 60,
  requiredSensors: [
    {
      category: 'tank',
      measurementType: 'level',
      required: true,
      label: 'Tank Level',
    },
    {
      category: 'tank',
      measurementType: 'type',
      required: true,
      label: 'Tank Type',
    },
  ],
  optionalSensors: [
    {
      category: 'tank',
      measurementType: 'capacity',
      required: false,
      label: 'Tank Capacity',
    },
    {
      category: 'tank',
      measurementType: 'temperature',
      required: false,
      label: 'Tank Temperature',
    },
  ],
  createWidget: (instance, sensorData) => {
    // Determine tank type for title and icon
    const tankType = sensorData['tank.0.type'] || 'Tank';
    return createWidgetConfig('tank', instance, `${tankType} ${instance}`, 'water');
  },
};

/**
 * TEMPERATURE WIDGETS
 */

// 10. Temperature Widget - Shows temperature readings
export const TEMPERATURE_WIDGET_REGISTRATION: WidgetRegistration = {
  widgetType: 'temperature',
  displayName: 'Temperature',
  category: 'environment',
  icon: 'thermometer-outline',
  multiInstance: true,
  maxInstances: 8,
  priority: 55,
  requiredSensors: [
    {
      category: 'temperature',
      measurementType: 'value',
      required: true,
      label: 'Temperature',
    },
    {
      category: 'temperature',
      measurementType: 'location',
      required: true,
      label: 'Location',
    },
  ],
  optionalSensors: [],
  createWidget: (instance, sensorData) => {
    const location = sensorData['temperature.0.location'] || 'Temperature';
    return createWidgetConfig('temperature', instance, `${location} ${instance}`, 'thermometer-outline');
  },
};

/**
 * CONSOLIDATED REGISTRATIONS ARRAY
 * All built-in widget types in priority order
 */
export const BUILT_IN_WIDGET_REGISTRATIONS: WidgetRegistration[] = [
  AUTOPILOT_WIDGET_REGISTRATION,      // Priority: 100
  SPEED_WIDGET_REGISTRATION,          // Priority: 95
  DEPTH_WIDGET_REGISTRATION,          // Priority: 90
  WIND_WIDGET_REGISTRATION,           // Priority: 85
  COMPASS_WIDGET_REGISTRATION,        // Priority: 80
  GPS_WIDGET_REGISTRATION,            // Priority: 75
  ENGINE_WIDGET_REGISTRATION,         // Priority: 70
  BATTERY_WIDGET_REGISTRATION,        // Priority: 65
  TANK_WIDGET_REGISTRATION,           // Priority: 60
  TEMPERATURE_WIDGET_REGISTRATION,    // Priority: 55
];

/**
 * Register all built-in widgets with the registration service
 */
export function registerBuiltInWidgets(
  registrationService: any // WidgetRegistrationService
): void {
  console.log('📋 Registering built-in widgets...');
  
  BUILT_IN_WIDGET_REGISTRATIONS.forEach(registration => {
    registrationService.registerWidget(registration);
  });
  
  console.log(`✅ Registered ${BUILT_IN_WIDGET_REGISTRATIONS.length} built-in widget types`);
}
