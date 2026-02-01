/**
 * useAlarmThresholds Hook - Per-Instance Alarm Thresholds
 * Reads alarm thresholds from sensor instances in NMEA store
 * Returns current threshold configuration for rendering alarm overlays
 */

import { useNmeaStore } from '../store/nmeaStore';
import type { SensorType, SensorConfiguration } from '../types/SensorData';

export interface AlarmThresholdValues {
  warning?: number;        // Warning threshold value (SI units)
  critical?: number;       // Critical threshold value (SI units)
  enabled: boolean;
  status: 'loading' | 'loaded' | 'disabled' | 'error';
  message?: string;
}

/**
 * Get alarm threshold values for a specific sensor instance
 * Returns evaluated threshold values (formula mode is evaluated automatically)
 * @param sensorType - The sensor type (e.g., 'depth', 'temperature', 'engine')
 * @param instance - The sensor instance number (default: 0)
 * @param metricKey - Optional metric key to get thresholds for specific field (defaults to first alarm field)
 * @returns Object containing evaluated critical and warning threshold values (SI units)
 */
export function useAlarmThresholds(
  sensorType: SensorType,
  instance: number = 0,
  metricKey?: string,
): AlarmThresholdValues {
  // Get evaluated thresholds from store (handles both direct and formula modes)
  const getSensorThresholds = useNmeaStore((state) => state.getSensorThresholds);
  const thresholds = getSensorThresholds(sensorType, instance, metricKey);

  // Return disabled state if no thresholds configured
  if (!thresholds) {
    return {
      enabled: false,
      status: 'disabled',
      message: `No alarm thresholds configured for ${sensorType}[${instance}]${metricKey ? `.${metricKey}` : ''}`,
    };
  }

  // Return evaluated thresholds (already evaluated by SensorInstance)
  return {
    critical: thresholds.critical,
    warning: thresholds.warning,
    enabled: true,
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

// Tanks (use 'tank' sensor type with metricKey for specific tank type)
export const useFuelLevelAlarmThresholds = (instance: number = 0) =>
  useAlarmThresholds('tank', instance, 'level');
export const useWaterLevelAlarmThresholds = (instance: number = 0) =>
  useAlarmThresholds('tank', instance, 'level');
export const useWasteWaterLevelAlarmThresholds = (instance: number = 0) =>
  useAlarmThresholds('tank', instance, 'level');
