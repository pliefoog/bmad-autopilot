/**
 * Clean Sensor Data Interfaces for Marine Instruments
 *
 * These interfaces define the essential data structure that widgets need,
 * abstracting away NMEA protocol differences (0183 vs 2000).
 *
 * Each interface matches exactly what the corresponding widget displays.
 */

import type { TimeSeriesBuffer } from '../utils/memoryStorageManagement';

// NMEA 0183 Autopilot Support:
// - RSA: Rudder Sensor Angle (rudder position)
// - APB: Autopilot Sentence B (navigation to waypoint)
// - APA: Autopilot Sentence A (simplified navigation)
// NMEA 2000 Autopilot Support:
// - PGN 127245: Rudder position
// - PGN 65288: Autopilot status (via PCDIN/binary)

/**
 * Context-aware configuration for sensors
 */
export interface SensorContext {
  batteryChemistry?: 'lead-acid' | 'agm' | 'gel' | 'lifepo4'; // Battery chemistry type
  engineType?: 'diesel' | 'gasoline' | 'outboard'; // Engine type
  tankType?: 'fuel' | 'water' | 'waste' | 'ballast' | 'blackwater'; // Tank type
  temperatureLocation?: 'engine' | 'cabin' | 'water' | 'refrigerator'; // Temperature sensor location
}

/**
 * Alarm threshold configuration for sensor instances
 * Values are in SI units (meters, celsius, volts, etc.)
 * 
 * For multi-metric sensors (battery, engine), alarms are stored per metric.
 * Use metric key as property name: 'voltage', 'soc', 'temperature', 'current', 
 * 'coolantTemp', 'oilPressure', 'rpm'
 */
export interface SensorAlarmThresholds {
  name?: string; // User-assigned name for this sensor instance (e.g., "House Battery")
  context?: SensorContext; // Context information for intelligent defaults

  // Single-metric alarm configuration (for simple sensors: depth, tank, wind, speed, temperature)
  critical?: number; // Critical alarm threshold (SI units)
  warning?: number; // Warning alarm threshold (SI units)
  direction?: 'above' | 'below'; // Alarm when value goes above or below threshold
  criticalSoundPattern?: string; // Sound pattern for critical alarms
  warningSoundPattern?: string; // Sound pattern for warning alarms
  criticalHysteresis?: number; // Hysteresis for critical alarm recovery (SI units)
  warningHysteresis?: number; // Hysteresis for warning alarm recovery (SI units)
  enabled: boolean; // Whether alarms are active for this instance

  // Multi-metric alarm configuration (for battery, engine)
  // Each metric stores its own complete alarm configuration
  metrics?: {
    [metricKey: string]: {
      critical?: number;
      warning?: number;
      direction?: 'above' | 'below';
      criticalSoundPattern?: string;
      warningSoundPattern?: string;
      criticalHysteresis?: number;
      warningHysteresis?: number;
      enabled: boolean;
    };
  };

  audioEnabled?: boolean; // Whether to play sound when alarm triggers
  lastModified?: number; // Timestamp of last threshold change
}

export interface BaseSensorData {
  name: string; // Human-readable instance name
  timestamp: number; // When this data was last updated
  history?: TimeSeriesBuffer<number>; // Single-value history for most sensors
  historyMulti?: TimeSeriesBuffer<Record<string, number>>; // Multi-dimensional history for complex sensors
  alarmThresholds?: SensorAlarmThresholds; // Per-instance alarm configuration
}

export interface TankSensorData extends BaseSensorData {
  type: 'fuel' | 'water' | 'waste' | 'ballast' | 'blackwater';
  level: number; // 0.0 to 1.0 ratio - PRIMARY metric for TankWidget
  capacity?: number; // Liters - secondary metric
  temperature?: number; // Optional additional metric
}

export interface EngineSensorData extends BaseSensorData {
  rpm?: number; // PRIMARY metric
  coolantTemp?: number; // PRIMARY metric
  oilPressure?: number; // PRIMARY metric
  alternatorVoltage?: number; // Secondary metric (also called 'voltage' in some contexts)
  fuelRate?: number; // Secondary metric
  hours?: number; // Secondary metric
}

export interface BatterySensorData extends BaseSensorData {
  voltage?: number; // PRIMARY metric - actual voltage
  current?: number; // PRIMARY metric - current draw/charge
  stateOfCharge?: number; // PRIMARY metric (0-100%) - battery SOC
  temperature?: number; // PRIMARY metric - battery temperature
  nominalVoltage?: number; // Secondary metric - rated voltage
  capacity?: number; // Secondary metric - capacity in Ah
  chemistry?: string; // Secondary metric - battery chemistry type
}

export interface WindSensorData extends BaseSensorData {
  direction?: number; // PRIMARY metric (0-360° or ±180°) - apparent wind direction
  speed?: number; // PRIMARY metric - apparent wind speed
  trueDirection?: number; // Secondary metric - true wind direction
  trueSpeed?: number; // Secondary metric - true wind speed
  // Legacy fields for backward compatibility
  angle?: number; // @deprecated Use 'direction' instead
  trueAngle?: number; // @deprecated Use 'trueDirection' instead
}

export interface SpeedSensorData extends BaseSensorData {
  throughWater?: number; // Speed through water (STW) - PRIMARY for log
  overGround?: number; // Speed over ground (SOG) - PRIMARY for GPS
}

export interface GpsSensorData extends BaseSensorData {
  position?: {
    latitude: number;
    longitude: number;
  }; // PRIMARY metric
  courseOverGround?: number; // PRIMARY metric
  speedOverGround?: number; // PRIMARY metric
  quality?: {
    fixType: number; // 0=no fix, 1=GPS, 2=DGPS, 3=PPS
    satellites: number;
    hdop: number; // Horizontal dilution of precision
  };
  utcTime?: number; // UTC timestamp from GPS
  timeSource?: 'RMC' | 'ZDA' | 'GGA'; // Source sentence for priority selection (RMC > ZDA > GGA)
}

export interface TemperatureSensorData extends BaseSensorData {
  location:
    | 'seawater'
    | 'engine'
    | 'cabin'
    | 'outside'
    | 'exhaust'
    | 'refrigeration'
    | 'engineRoom'
    | 'liveWell'
    | 'baitWell'
    | 'freezer';
  value: number; // Temperature in Celsius - PRIMARY metric
  units: 'C' | 'F'; // Temperature units
}

export interface DepthSensorData extends BaseSensorData {
  // PRIMARY metric - Widget selects based on priority: DPT > DBT > DBK
  depth?: number; // Consolidated depth value in meters

  // All depth measurements from the same physical sensor
  // Different NMEA sentence types update different fields, all merged into same instance
  depthBelowWaterline?: number; // DPT - Depth from waterline (HIGHEST PRIORITY)
  depthBelowTransducer?: number; // DBT - Depth below transducer (MEDIUM PRIORITY)
  depthBelowKeel?: number; // DBK - Depth below keel (LOWEST PRIORITY)

  // Instance mapping: Based on talker ID (physical sensor)
  // - Multiple physical sensors distinguished by talker ID (SD, II, etc.)
  // - Each sensor can send DPT, DBT, DBK - all update same instance
  // - Widget uses priority logic to select which measurement to display
}

export interface CompassSensorData extends BaseSensorData {
  heading?: number; // PRIMARY metric (0-360°)
  variation?: number; // Magnetic variation
  deviation?: number; // Compass deviation
  rateOfTurn?: number; // Rate of turn in degrees per minute
}

export interface AutopilotSensorData extends BaseSensorData {
  engaged: boolean; // PRIMARY status
  mode?: 'compass' | 'gps' | 'wind' | 'nav';
  targetHeading?: number; // Target heading
  currentHeading?: number; // Current heading
  rudderAngle?: number; // Current rudder position (-35 to +35 degrees)
  locked?: boolean; // Heading lock status
  alarm?: boolean; // Autopilot alarm condition
}

export interface NavigationSensorData extends BaseSensorData {
  // Waypoint information
  waypointId?: string; // PRIMARY - waypoint identifier
  waypointName?: string; // Waypoint name/description
  waypointPosition?: {
    latitude: number;
    longitude: number;
  };

  // Navigation metrics
  bearingToWaypoint?: number; // PRIMARY metric - bearing to destination (0-360°)
  distanceToWaypoint?: number; // PRIMARY metric - distance to destination (nautical miles)
  crossTrackError?: number; // PRIMARY metric - XTE in nautical miles (negative = left, positive = right)

  // Course information
  originWaypointId?: string; // Origin waypoint for current leg
  destinationWaypointId?: string; // Destination waypoint for current leg
  bearingOriginToDest?: number; // Bearing from origin to destination

  // Speed/time estimates
  velocityMadeGood?: number; // Speed toward waypoint (knots)
  timeToWaypoint?: number; // Estimated time to arrival (seconds)

  // Navigation status
  arrivalStatus?: 'active' | 'arrived' | 'perpendicular';
  steerDirection?: 'left' | 'right'; // Which way to steer to correct XTE
}

// Union type for all sensor data
export type SensorData =
  | TankSensorData
  | EngineSensorData
  | BatterySensorData
  | WindSensorData
  | SpeedSensorData
  | GpsSensorData
  | TemperatureSensorData
  | DepthSensorData
  | CompassSensorData
  | AutopilotSensorData
  | NavigationSensorData;

// Sensor type identifiers
export type SensorType =
  | 'tank'
  | 'engine'
  | 'battery'
  | 'wind'
  | 'speed'
  | 'gps'
  | 'temperature'
  | 'depth'
  | 'compass'
  | 'autopilot'
  | 'navigation';

// Main sensors data structure
export interface SensorsData {
  tank: { [instance: number]: TankSensorData };
  engine: { [instance: number]: EngineSensorData };
  battery: { [instance: number]: BatterySensorData };
  wind: { [instance: number]: WindSensorData };
  speed: { [instance: number]: SpeedSensorData };
  gps: { [instance: number]: GpsSensorData };
  temperature: { [instance: number]: TemperatureSensorData };
  depth: { [instance: number]: DepthSensorData };
  compass: { [instance: number]: CompassSensorData };
  autopilot: { [instance: number]: AutopilotSensorData };
  navigation: { [instance: number]: NavigationSensorData };
}
