/**
 * Built-in Widget Registrations
 *
 * Defines sensor dependencies and creation logic for all 15 built-in widget types.
 * Each registration declares which sensors are required vs optional, replacing
 * the old polling-based detection system.
 */

import type { WidgetRegistration } from '../services/WidgetRegistrationService';
import type { WidgetConfig } from '../types/widget.types';

/**
 * Helper to create widget configuration
 */
function createWidgetConfig(
  widgetType: string,
  instance: number,
  title: string,
  icon: string,
): WidgetConfig {
  const instanceId = `${widgetType}-${instance}`;
  return {
    id: instanceId,
    type: widgetType,
    title,
    settings: {
      icon,
      instance,
      instanceId,
    },
  };
}

/**
 * NAVIGATION WIDGETS
 */

// 1. Depth Widget - Shows depth below transducer/waterline/keel
export const DEPTH_WIDGET_REGISTRATION: WidgetRegistration = {
  widgetType: 'depth',
  displayName: 'Depth',
  icon: 'water-outline',
  multiInstance: true,
  maxInstances: 3, // DPT, DBT, DBK
  priority: 90,
  requiredSensors: [
    {
      sensorType: 'depth',
      metricName: 'depth',
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
  icon: 'speedometer-outline',
  multiInstance: true,
  maxInstances: 2, // GPS speed, log speed
  priority: 95,
  requiredSensors: [
    {
      sensorType: 'speed',
      metricName: 'overGround', // SOG
      required: true,
      label: 'Speed Over Ground',
    },
  ],
  optionalSensors: [
    {
      sensorType: 'speed',
      metricName: 'throughWater', // STW
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
  icon: 'flag-outline',
  multiInstance: true,
  maxInstances: 2,
  priority: 85,
  requiredSensors: [
    {
      sensorType: 'wind',
      metricName: 'direction',
      required: true,
      label: 'Apparent Wind Direction',
    },
    {
      sensorType: 'wind',
      metricName: 'speed',
      required: true,
      label: 'Apparent Wind Speed',
    },
  ],
  optionalSensors: [
    {
      sensorType: 'wind',
      metricName: 'trueDirection',
      required: false,
      label: 'True Wind Direction',
    },
    {
      sensorType: 'wind',
      metricName: 'trueSpeed',
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
  icon: 'compass-outline',
  multiInstance: true,
  maxInstances: 2,
  priority: 80,
  requiredSensors: [
    {
      sensorType: 'heading',
      metricName: 'magnetic',
      required: true,
      label: 'Heading',
    },
  ],
  optionalSensors: [
    {
      sensorType: 'heading',
      metricName: 'variation',
      required: false,
      label: 'Magnetic Variation',
    },
    {
      sensorType: 'heading',
      metricName: 'rateOfTurn',
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
  icon: 'navigate-outline',
  multiInstance: true,
  maxInstances: 2,
  priority: 75,
  requiredSensors: [
    {
      sensorType: 'gps',
      metricName: 'latitude',
      required: true,
      label: 'Latitude',
    },
    {
      sensorType: 'gps',
      metricName: 'longitude',
      required: true,
      label: 'Longitude',
    },
  ],
  optionalSensors: [
    {
      sensorType: 'gps',
      metricName: 'courseOverGround',
      required: false,
      label: 'Course Over Ground',
    },
    {
      sensorType: 'gps',
      metricName: 'speedOverGround',
      required: false,
      label: 'Speed Over Ground',
    },
    {
      sensorType: 'gps',
      metricName: 'utcTime',
      required: false,
      label: 'UTC Time',
    },
    {
      sensorType: 'gps',
      metricName: 'quality',
      required: false,
      label: 'GPS Quality',
    },
  ],
  createWidget: (instance, sensorData) => {
    return createWidgetConfig('gps', instance, `GPS ${instance}`, 'navigate-outline');
  },
};

// 6. Navigation Widget - Shows waypoint navigation data
export const NAVIGATION_WIDGET_REGISTRATION: WidgetRegistration = {
  widgetType: 'navigation',
  displayName: 'Navigation',
  icon: 'navigate-circle-outline',
  multiInstance: false,
  priority: 70,
  requiredSensors: [
    {
      sensorType: 'position',
      metricName: 'latitude',
      required: true,
      label: 'Latitude',
    },
  ],
  optionalSensors: [
    {
      sensorType: 'position',
      metricName: 'longitude',
      required: false,
      label: 'Longitude',
    },
  ],
  createWidget: (instance, sensorData) => {
    return createWidgetConfig('navigation', instance, 'Navigation', 'navigate-circle-outline');
  },
};

/**
 * AUTOPILOT WIDGETS
 */

// 7. Autopilot Widget - Shows autopilot status and controls
export const AUTOPILOT_WIDGET_REGISTRATION: WidgetRegistration = {
  widgetType: 'autopilot',
  displayName: 'Autopilot',
  icon: 'boat-outline',
  multiInstance: false,
  priority: 100,
  requiredSensors: [
    {
      sensorType: 'autopilot',
      metricName: 'rudderAngle',
      required: true,
      label: 'Rudder Angle',
    },
  ],
  optionalSensors: [
    {
      sensorType: 'autopilot',
      metricName: 'engaged',
      required: false,
      label: 'Engaged Status',
    },
    {
      sensorType: 'autopilot',
      metricName: 'mode',
      required: false,
      label: 'Autopilot Mode',
    },
    {
      sensorType: 'autopilot',
      metricName: 'actualHeading',
      required: false,
      label: 'Actual Heading',
    },
    {
      sensorType: 'autopilot',
      metricName: 'targetHeading',
      required: false,
      label: 'Target Heading',
    },
    {
      sensorType: 'heading',
      metricName: 'rateOfTurn',
      required: false,
      label: 'Rate of Turn',
    },
    {
      sensorType: 'autopilot',
      metricName: 'actualHeading',
      required: false,
      label: 'Actual Heading',
    },
    {
      sensorType: 'autopilot',
      metricName: 'rudderAngle',
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
  icon: 'cog-outline',
  multiInstance: true,
  maxInstances: 8,
  priority: 70,
  requiredSensors: [
    {
      sensorType: 'engine',
      metricName: 'rpm',
      required: true,
      label: 'RPM',
    },
  ],
  optionalSensors: [
    {
      sensorType: 'engine',
      metricName: 'coolantTemp',
      required: false,
      label: 'Coolant Temperature',
    },
    {
      sensorType: 'engine',
      metricName: 'oilPressure',
      required: false,
      label: 'Oil Pressure',
    },
    {
      sensorType: 'engine',
      metricName: 'alternatorVoltage',
      required: false,
      label: 'Alternator Voltage',
    },
    {
      sensorType: 'engine',
      metricName: 'fuelRate',
      required: false,
      label: 'Fuel Rate',
    },
    {
      sensorType: 'engine',
      metricName: 'hours',
      required: false,
      label: 'Engine Hours',
    },
    {
      sensorType: 'engine',
      metricName: 'shaftRpm',
      required: false,
      label: 'Shaft RPM',
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
  icon: 'battery-charging-outline',
  multiInstance: true,
  maxInstances: 8,
  priority: 65,
  requiredSensors: [
    {
      sensorType: 'battery',
      metricName: 'voltage',
      required: true,
      label: 'Voltage',
    },
  ],
  optionalSensors: [
    {
      sensorType: 'battery',
      metricName: 'current',
      required: false,
      label: 'Current',
    },
    {
      sensorType: 'battery',
      metricName: 'stateOfCharge',
      required: false,
      label: 'State of Charge',
    },
    {
      sensorType: 'battery',
      metricName: 'temperature',
      required: false,
      label: 'Temperature',
    },
  ],
  createWidget: (instance, sensorData) => {
    return createWidgetConfig(
      'battery',
      instance,
      `Battery ${instance}`,
      'battery-charging-outline',
    );
  },
};

/**
 * TANK WIDGETS
 */

// 9. Tank Widget - Shows fluid level
export const TANK_WIDGET_REGISTRATION: WidgetRegistration = {
  widgetType: 'tank',
  displayName: 'Tank',
  icon: 'water',
  multiInstance: true,
  maxInstances: 8,
  priority: 60,
  requiredSensors: [
    {
      sensorType: 'tank',
      metricName: 'level',
      required: true,
      label: 'Tank Level',
    },
  ],
  optionalSensors: [
    {
      sensorType: 'tank',
      metricName: 'capacity',
      required: false,
      label: 'Tank Capacity',
    },
    {
      sensorType: 'tank',
      metricName: 'temperature',
      required: false,
      label: 'Tank Temperature',
    },
  ],
  createWidget: (instance, sensorData) => {
    // Determine tank type for title and icon
    const tankType = sensorData[`tank.${instance}.type`] || 'Tank';
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
  icon: 'thermometer-outline',
  multiInstance: true,
  maxInstances: 8,
  priority: 55,
  requiredSensors: [
    {
      sensorType: 'temperature',
      metricName: 'temperature',
      required: true,
      label: 'Temperature',
    },
  ],
  optionalSensors: [],
  createWidget: (instance, sensorData) => {
    // Location is a direct property, not a metric measurement
    const location = sensorData[`temperature.${instance}.location`] || 'Temperature';
    return createWidgetConfig(
      'temperature',
      instance,
      `${location} ${instance}`,
      'thermometer-outline',
    );
  },
};

/**
 * WEATHER STATION WIDGETS
 */

// 11. Weather Widget - Atmospheric conditions monitoring
export const WEATHER_WIDGET_REGISTRATION: WidgetRegistration = {
  widgetType: 'weather',
  displayName: 'Weather Station',
  icon: 'partly-sunny-outline',
  multiInstance: true,
  maxInstances: 5,
  priority: 54,
  requiredSensors: [
    {
      sensorType: 'weather',
      metricName: 'pressure',
      required: true,
      label: 'Barometric Pressure',
    },
  ],
  optionalSensors: [
    {
      sensorType: 'weather',
      metricName: 'airTemperature',
      required: false,
      label: 'Air Temperature',
    },
    {
      sensorType: 'weather',
      metricName: 'humidity',
      required: false,
      label: 'Humidity',
    },
  ],
  createWidget: (instance, sensorData) => {
    const name = sensorData[`weather.${instance}.name`] || 'Weather Station';
    const displayName = typeof name === 'string' ? name : 'Weather Station';
    return createWidgetConfig(
      'weather',
      instance,
      instance === 0 ? displayName : `Weather ${instance}`,
      'partly-sunny-outline',
    );
  },
};

/**
 * CONSOLIDATED REGISTRATIONS ARRAY
 * All built-in widget types in priority order
 */
export const BUILT_IN_WIDGET_REGISTRATIONS: WidgetRegistration[] = [
  AUTOPILOT_WIDGET_REGISTRATION, // Priority: 100
  SPEED_WIDGET_REGISTRATION, // Priority: 95
  DEPTH_WIDGET_REGISTRATION, // Priority: 90
  WIND_WIDGET_REGISTRATION, // Priority: 85
  COMPASS_WIDGET_REGISTRATION, // Priority: 80
  GPS_WIDGET_REGISTRATION, // Priority: 75
  NAVIGATION_WIDGET_REGISTRATION, // Priority: 70
  ENGINE_WIDGET_REGISTRATION, // Priority: 70
  BATTERY_WIDGET_REGISTRATION, // Priority: 65
  TANK_WIDGET_REGISTRATION, // Priority: 60
  TEMPERATURE_WIDGET_REGISTRATION, // Priority: 55
  WEATHER_WIDGET_REGISTRATION, // Priority: 54
];

/**
 * Register all built-in widgets with the registration service
 */
export function registerBuiltInWidgets(
  registrationService: any, // WidgetRegistrationService
): void {
  BUILT_IN_WIDGET_REGISTRATIONS.forEach((registration) => {
    registrationService.registerWidget(registration);
  });
}
