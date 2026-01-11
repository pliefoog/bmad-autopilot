/**
 * useAlarmThresholds Hook - Per-Instance Alarm Thresholds
 * Reads alarm thresholds from sensor instances in NMEA store
 * Returns current threshold configuration for rendering alarm overlays
 */

import { useNmeaStore } from '../store/nmeaStore';
import type { SensorType, SensorConfiguration } from '../types/SensorData';

export interface AlarmThresholdValues {
  warning?: number;
  min?: number;
  max?: number;
  thresholdType: 'min' | 'max';
  enabled: boolean;
  status: 'loading' | 'loaded' | 'disabled' | 'error';
  message?: string;
}

/**
 * Get alarm threshold values for a specific sensor instance
 * @param sensorType - The sensor type (e.g., 'depth', 'temperature', 'engine')
 * @param instance - The sensor instance number (default: 0)
 * @returns Object containing warning, min, max threshold values, enabled state, and threshold type
 */
export function useAlarmThresholds(
  sensorType: SensorType,
  instance: number = 0,
): AlarmThresholdValues {
  // Get threshold retrieval method from store
  const getSensorThresholds = useNmeaStore((state) => state.getSensorThresholds);

  // Get current thresholds from store
  const thresholds = getSensorThresholds(sensorType, instance);

  // Return disabled state if no thresholds configured
  if (!thresholds) {
    return {
      thresholdType: 'min',
      enabled: false,
      status: 'disabled',
      message: `No alarm thresholds configured for ${sensorType}[${instance}]`,
    };
  }

  // Return loaded thresholds
  return {
    warning: thresholds.warning,
    min: thresholds.min,
    max: thresholds.max,
    thresholdType: thresholds.thresholdType,
    enabled: thresholds.enabled,
    status: 'loaded',
  };
}

/**
 * Convenience hooks for common marine sensors
 * Usage: const thresholds = useDepthAlarmThresholds(0); // instance 0
 */
// Navigation
export const useDepthAlarmThresholds = (instance: number = 0) =>
  useAlarmThresholds('depth', instance);
export const useSpeedAlarmThresholds = (instance: number = 0) =>
  useAlarmThresholds('speed', instance);

// Engine
export const useEngineAlarmThresholds = (instance: number = 0) =>
  useAlarmThresholds('engine', instance);

// Temperature
export const useTemperatureAlarmThresholds = (instance: number = 0) =>
  useAlarmThresholds('temperature', instance);

// Battery
export const useBatteryAlarmThresholds = (instance: number = 0) =>
  useAlarmThresholds('battery', instance);

// Wind
export const useWindAlarmThresholds = (instance: number = 0) =>
  useAlarmThresholds('wind', instance);

// Tanks
export const useFuelLevelAlarmThresholds = () => useAlarmThresholds('tanks.fuel.level');
export const useWaterLevelAlarmThresholds = () => useAlarmThresholds('tanks.freshWater.level');
export const useWasteWaterLevelAlarmThresholds = () => useAlarmThresholds('tanks.wasteWater.level');
