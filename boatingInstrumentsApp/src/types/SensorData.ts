/**
 * Auto-Generated Sensor Data Interfaces
 * 
 * Purpose:
 * - Interfaces generated via type inference from SENSOR_SCHEMAS
 * - Eliminates 300+ lines of manual interface definitions
 * - Guaranteed sync with sensor schema (no mismatches possible)
 * 
 * Migration from Old Architecture:
 * - OLD: 13 manually-defined interfaces (BatterySensorData, EngineSensorData, etc.)
 * - NEW: Auto-generated from unified schema via InferSensorData<T>
 * - Pattern: type XSensorData = BaseSensorData & InferSensorData<typeof SENSOR_SCHEMAS.x>
 * 
 * Critical Implementation Details:
 * - All sensor data types auto-generated (compile-time type safety)
 * - Base interface provides common fields (name, timestamp, etc.)
 * - Sensor-specific fields inferred from schema
 * - Union type SensorData = all sensor types combined
 * 
 * Related Files:
 * - sensorSchemas.ts: Source of truth for type inference
 * - SensorInstance.ts: Uses these interfaces for data storage
 */

import type { TimeSeriesBuffer } from '../utils/memoryStorageManagement';
import type { SensorInstance } from './SensorInstance';
import { SENSOR_SCHEMAS, type InferSensorData, type SensorType } from '../registry/sensorSchemas';

/**
 * Context-aware configuration for sensors (DEPRECATED - use schema contextKey)
 * Kept for backward compatibility with existing code
 */
export interface SensorContext {
  batteryChemistry?: 'lead-acid' | 'agm' | 'gel' | 'lifepo4';
  engineType?: 'diesel' | 'gasoline' | 'outboard';
  tankType?: 'fuel' | 'water' | 'waste' | 'ballast' | 'blackwater';
  temperatureLocation?: 'engine' | 'cabin' | 'water' | 'refrigerator';
}

/**
 * Per-metric threshold configuration
 * Used by SensorInstance for per-metric alarm evaluation
 */
export interface MetricThresholds {
  critical: {
    min?: number;
    max?: number;
  };
  warning: {
    min?: number;
    max?: number;
  };
  hysteresis?: number;
  criticalSoundPattern?: string;
  warningSoundPattern?: string;
  staleThresholdMs: number;
  enabled: boolean;
}

/**
 * Persistent configuration for sensor instances
 * Includes user-assigned names, alarm thresholds, context, and settings
 */
export interface SensorConfiguration {
  name?: string;
  context?: string; // Generic context value (e.g., 'agm', 'diesel', 'fuel') - schema-driven
  critical?: number;
  warning?: number;
  direction?: 'above' | 'below';
  criticalSoundPattern?: string;
  warningSoundPattern?: string;
  criticalHysteresis?: number;
  warningHysteresis?: number;
  enabled: boolean;
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
  audioEnabled?: boolean;
  lastModified?: number;
}

/**
 * Base sensor data interface (common fields)
 */
export interface BaseSensorData {
  name: string;
  timestamp: number;
  history?: TimeSeriesBuffer<number>;
  historyMulti?: TimeSeriesBuffer<Record<string, number>>;
}

// ============================================================
// Auto-Generated Sensor Data Interfaces (via Type Inference)
// ============================================================
// These interfaces are generated from SENSOR_SCHEMAS using TypeScript's
// type inference capabilities. This eliminates manual maintenance and
// guarantees synchronization between schemas and types.

/**
 * Battery Sensor Data
 * Auto-generated from SENSOR_SCHEMAS.battery via InferSensorData<T>
 */
export type BatterySensorData = BaseSensorData & InferSensorData<typeof SENSOR_SCHEMAS.battery>;

/**
 * Depth Sensor Data
 * Auto-generated from SENSOR_SCHEMAS.depth via InferSensorData<T>
 * 
 * Special notes:
 * - Single depth value selected by NMEA parser with priority: DPT > DBT > DBK
 * - depthSource indicates which NMEA sentence provided the value
 * - Instance mapping based on talker ID (physical sensor)
 */
export type DepthSensorData = BaseSensorData & InferSensorData<typeof SENSOR_SCHEMAS.depth>;

/**
 * Engine Sensor Data
 * Auto-generated from SENSOR_SCHEMAS.engine via InferSensorData<T>
 * 
 * Context-dependent alarms: engineType (diesel, gasoline, outboard)
 */
export type EngineSensorData = BaseSensorData & InferSensorData<typeof SENSOR_SCHEMAS.engine>;

/**
 * Wind Sensor Data
 * Auto-generated from SENSOR_SCHEMAS.wind via InferSensorData<T>
 */
export type WindSensorData = BaseSensorData & InferSensorData<typeof SENSOR_SCHEMAS.wind>;

/**
 * Speed Sensor Data
 * Auto-generated from SENSOR_SCHEMAS.speed via InferSensorData<T>
 */
export type SpeedSensorData = BaseSensorData & InferSensorData<typeof SENSOR_SCHEMAS.speed>;

/**
 * Temperature Sensor Data
 * Auto-generated from SENSOR_SCHEMAS.temperature via InferSensorData<T>
 */
export type TemperatureSensorData = BaseSensorData & InferSensorData<typeof SENSOR_SCHEMAS.temperature>;

/**
 * Tank Sensor Data
 * Auto-generated from SENSOR_SCHEMAS.tank via InferSensorData<T>
 * 
 * Context-dependent alarms: tankType (fuel, water, waste, blackwater)
 */
export type TankSensorData = BaseSensorData & InferSensorData<typeof SENSOR_SCHEMAS.tank>;

/**
 * Weather Sensor Data
 * Auto-generated from SENSOR_SCHEMAS.weather via InferSensorData<T>
 */
export type WeatherSensorData = BaseSensorData & InferSensorData<typeof SENSOR_SCHEMAS.weather>;

/**
 * GPS Sensor Data
 * Auto-generated from SENSOR_SCHEMAS.gps via InferSensorData<T>
 * 
 * Special notes:
 * - timeSource indicates priority for time data: RMC > ZDA > GGA
 * - Legacy 'position' field maintained for backward compatibility
 */
export type GpsSensorData = BaseSensorData & InferSensorData<typeof SENSOR_SCHEMAS.gps>;

/**
 * Autopilot Sensor Data
 * Auto-generated from SENSOR_SCHEMAS.autopilot via InferSensorData<T>
 */
export type AutopilotSensorData = BaseSensorData & InferSensorData<typeof SENSOR_SCHEMAS.autopilot>;

/**
 * Position Sensor Data
 * Auto-generated from SENSOR_SCHEMAS.position via InferSensorData<T>
 */
export type PositionSensorData = BaseSensorData & InferSensorData<typeof SENSOR_SCHEMAS.position>;

/**
 * Heading/Compass Sensor Data
 * Auto-generated from SENSOR_SCHEMAS.heading via InferSensorData<T>
 */
export type HeadingSensorData = BaseSensorData & InferSensorData<typeof SENSOR_SCHEMAS.heading>;

/**
 * Log Sensor Data (Distance Tracking)
 * Auto-generated from SENSOR_SCHEMAS.log via InferSensorData<T>
 */
export type LogSensorData = BaseSensorData & InferSensorData<typeof SENSOR_SCHEMAS.log>;

// Legacy aliases for backward compatibility
export type CompassSensorData = HeadingSensorData;
export type NavigationSensorData = PositionSensorData;

// Union type for all sensor data
export type SensorData =
  | BatterySensorData
  | DepthSensorData
  | EngineSensorData
  | WindSensorData
  | SpeedSensorData
  | TemperatureSensorData
  | TankSensorData
  | WeatherSensorData
  | GpsSensorData
  | AutopilotSensorData
  | PositionSensorData
  | HeadingSensorData
  | LogSensorData;

// Main sensors data structure
// NEW: Stores SensorInstance class instances instead of plain objects
// Provides automatic enrichment, history management, and alarm evaluation
export interface SensorsData {
  battery: { [instance: number]: SensorInstance<BatterySensorData> };
  depth: { [instance: number]: SensorInstance<DepthSensorData> };
  engine: { [instance: number]: SensorInstance<EngineSensorData> };
  wind: { [instance: number]: SensorInstance<WindSensorData> };
  speed: { [instance: number]: SensorInstance<SpeedSensorData> };
  temperature: { [instance: number]: SensorInstance<TemperatureSensorData> };
  tank: { [instance: number]: SensorInstance<TankSensorData> };
  weather: { [instance: number]: SensorInstance<WeatherSensorData> };
  gps: { [instance: number]: SensorInstance<GpsSensorData> };
  autopilot: { [instance: number]: SensorInstance<AutopilotSensorData> };
  position: { [instance: number]: SensorInstance<PositionSensorData> };
  heading: { [instance: number]: SensorInstance<HeadingSensorData> };
  log: { [instance: number]: SensorInstance<LogSensorData> };
  // Legacy aliases for backward compatibility
  compass: { [instance: number]: SensorInstance<CompassSensorData> };
  navigation: { [instance: number]: SensorInstance<NavigationSensorData> };
}

// Serialization types for Zustand persistence
// Plain objects for JSON storage, restored to SensorInstance on load
export interface SerializedSensorsData {
  battery: { [instance: number]: ReturnType<SensorInstance<BatterySensorData>['toJSON']> };
  depth: { [instance: number]: ReturnType<SensorInstance<DepthSensorData>['toJSON']> };
  engine: { [instance: number]: ReturnType<SensorInstance<EngineSensorData>['toJSON']> };
  wind: { [instance: number]: ReturnType<SensorInstance<WindSensorData>['toJSON']> };
  speed: { [instance: number]: ReturnType<SensorInstance<SpeedSensorData>['toJSON']> };
  temperature: { [instance: number]: ReturnType<SensorInstance<TemperatureSensorData>['toJSON']> };
  tank: { [instance: number]: ReturnType<SensorInstance<TankSensorData>['toJSON']> };
  weather: { [instance: number]: ReturnType<SensorInstance<WeatherSensorData>['toJSON']> };
  gps: { [instance: number]: ReturnType<SensorInstance<GpsSensorData>['toJSON']> };
  autopilot: { [instance: number]: ReturnType<SensorInstance<AutopilotSensorData>['toJSON']> };
  position: { [instance: number]: ReturnType<SensorInstance<PositionSensorData>['toJSON']> };
  heading: { [instance: number]: ReturnType<SensorInstance<HeadingSensorData>['toJSON']> };
  log: { [instance: number]: ReturnType<SensorInstance<LogSensorData>['toJSON']> };
  // Legacy aliases for backward compatibility
  compass: { [instance: number]: ReturnType<SensorInstance<CompassSensorData>['toJSON']> };
  navigation: { [instance: number]: ReturnType<SensorInstance<NavigationSensorData>['toJSON']> };
}

/**
 * Utility type for explicit props pattern in widgets (Dec 2024 Refactor)
 * 
 * Enforces compile-time validation that sensorType and instance are present
 * when metricKey is specified. Replaces deprecated React Context pattern.
 * 
 * Usage:
 * ```tsx
 * interface Props extends SensorMetricProps<'depth'> {
 *   // Additional component-specific props
 * }
 * 
 * // TypeScript enforces all three props:
 * <PrimaryMetricCell 
 *   sensorType="depth" 
 *   instance={0} 
 *   metricKey="depth" 
 * />
 * ```
 * 
 * @template TMetricKey - Type of metric key (string literal for autocomplete)
 */
export type SensorMetricProps<TMetricKey extends string = string> = {
  /**
   * Sensor type from SensorsData union
   * Examples: 'depth', 'engine', 'gps', 'battery', 'wind'
   */
  sensorType: keyof SensorsData;
  
  /**
   * Sensor instance number (0-indexed)
   * Multiple instances supported for engines, tanks, batteries, etc.
   */
  instance: number;
  
  /**
   * Metric field name within the sensor data
   * Examples: 'depth', 'voltage', 'speedOverGround', 'temperature'
   * Generic type provides autocomplete when sensor type is known
   */
  metricKey: TMetricKey;
};

export type { SensorType };
