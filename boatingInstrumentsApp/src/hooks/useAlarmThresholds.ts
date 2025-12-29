/**
 * useAlarmThresholds Hook - Per-Instance Alarm Thresholds
 * Reads alarm thresholds from sensor instances in NMEA store
 * Subscribes to threshold updates for reactive UI changes
 */

import { useEffect, useState } from 'react';
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
  const sensorEventEmitter = useNmeaStore((state) => state.sensorEventEmitter);

  // Local state to trigger re-renders on threshold updates
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Subscribe to threshold updates for this sensor instance
  useEffect(() => {
    const handleThresholdUpdate = (event: { sensorType: string; instance: number }) => {
      if (event.sensorType === sensorType && event.instance === instance) {
        setUpdateTrigger((prev) => prev + 1);
      }
    };

    sensorEventEmitter.on('threshold-update', handleThresholdUpdate);

    return () => {
      sensorEventEmitter.off('threshold-update', handleThresholdUpdate);
    };
  }, [sensorType, instance, sensorEventEmitter]);

  // Get current thresholds from store (updateTrigger ensures re-fetch)
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
