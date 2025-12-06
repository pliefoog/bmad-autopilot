/**
 * useAlarmThresholds Hook
 * Queries CriticalAlarmConfiguration for alarm thresholds to display on trendlines
 * Uses standardized min/max/warning threshold structure (9999 = N/A)
 */

import { useMemo, useEffect, useState } from 'react';
import { CriticalAlarmConfiguration } from '../services/alarms/CriticalAlarmConfiguration';
import { CriticalAlarmType } from '../services/alarms/types';

export interface AlarmThresholdValues {
  warning?: number;
  min?: number;
  max?: number;
  thresholdType: 'min' | 'max';
  status: 'loading' | 'loaded' | 'disabled' | 'error';
  message?: string;
}

// Map data paths to CriticalAlarmType
const DATA_PATH_TO_ALARM_TYPE: Record<string, CriticalAlarmType> = {
  // Navigation
  'depth': CriticalAlarmType.SHALLOW_WATER,
  'depth.belowTransducer': CriticalAlarmType.SHALLOW_WATER,
  'speed.overGround': CriticalAlarmType.HIGH_SPEED,
  
  // Engine
  'engine.coolantTemp': CriticalAlarmType.ENGINE_OVERHEAT,
  'engine.temperature': CriticalAlarmType.ENGINE_OVERHEAT,
  'engine.rpm': CriticalAlarmType.ENGINE_HIGH_RPM,
  'engine.oilPressure': CriticalAlarmType.ENGINE_LOW_OIL_PRESSURE,
  
  // Electrical
  'electrical.batteryVoltage': CriticalAlarmType.LOW_BATTERY,
  'electrical.voltage': CriticalAlarmType.LOW_BATTERY,
  'electrical.current': CriticalAlarmType.HIGH_CURRENT,
  'electrical.alternatorVoltage': CriticalAlarmType.LOW_ALTERNATOR,
  
  // Wind
  'wind.speed': CriticalAlarmType.HIGH_WIND,
  'wind.apparentSpeed': CriticalAlarmType.HIGH_WIND,
  
  // Tanks
  'tanks.fuel.level': CriticalAlarmType.LOW_FUEL,
  'tanks.freshWater.level': CriticalAlarmType.LOW_WATER,
  'tanks.wasteWater.level': CriticalAlarmType.HIGH_WASTE_WATER,
};

/**
 * Get alarm threshold values for a specific data path
 * @param dataPath - The NMEA data path (e.g., 'depth', 'engine.coolantTemp', 'electrical.batteryVoltage')
 * @returns Object containing warning, min, max threshold values, and threshold type
 */
export function useAlarmThresholds(dataPath: string): AlarmThresholdValues {
  // Force re-render when config changes
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Wait for storage to load on mount
  useEffect(() => {
    const init = async () => {
      await CriticalAlarmConfiguration.getInstanceAsync();
      setIsLoading(false);
    };
    init();
  }, []);
  
  // Subscribe to configuration changes
  useEffect(() => {
    const alarmConfig = CriticalAlarmConfiguration.getInstance();
    const unsubscribe = alarmConfig.subscribe((type, config) => {
      // Check if this change affects our dataPath
      const alarmType = DATA_PATH_TO_ALARM_TYPE[dataPath];
      if (type === alarmType) {
        console.log(`[useAlarmThresholds] Config changed for ${type}, updating thresholds`);
        setUpdateTrigger(prev => prev + 1);
      }
    });
    
    return unsubscribe;
  }, [dataPath]);
  
  return useMemo(() => {
    if (isLoading) {
      return { 
        thresholdType: 'min', 
        status: 'loading' as const,
        message: 'Loading alarm configuration...'
      };
    }
    
    console.log(`[useAlarmThresholds] Querying thresholds for dataPath: ${dataPath}`);
    
    const alarmConfig = CriticalAlarmConfiguration.getInstance();
    const alarmType = DATA_PATH_TO_ALARM_TYPE[dataPath];
    
    if (!alarmType) {
      console.log(`[useAlarmThresholds] No alarm type mapped for dataPath: ${dataPath}`);
      return { 
        thresholdType: 'min',
        status: 'error' as const,
        message: `No alarm type mapped for ${dataPath}`
      };
    }
    
    const config = alarmConfig.getAlarmConfig(alarmType);
    
    if (!config) {
      console.log(`[useAlarmThresholds] Alarm ${alarmType} not found`);
      return { 
        thresholdType: 'min',
        status: 'error' as const,
        message: `Alarm configuration not found for ${alarmType}`
      };
    }
    
    if (!config.enabled) {
      console.log(`[useAlarmThresholds] Alarm ${alarmType} is disabled`);
      return { 
        thresholdType: 'min',
        status: 'disabled' as const,
        message: `Alarm ${alarmType} is disabled`
      };
    }
    
    console.log(`[useAlarmThresholds] Found config for ${alarmType}:`, {
      min: config.thresholds.min,
      max: config.thresholds.max,
      warning: config.thresholds.warning
    });
    
    // Determine threshold type based on which thresholds are active (not 9999)
    const hasMin = config.thresholds.min !== 9999;
    const hasMax = config.thresholds.max !== 9999;
    const thresholdType = hasMax ? 'max' : 'min';
    
    // Return threshold values (undefined if 9999 = N/A)
    const result: AlarmThresholdValues = {
      warning: config.thresholds.warning !== 9999 ? config.thresholds.warning : undefined,
      min: hasMin ? config.thresholds.min : undefined,
      max: hasMax ? config.thresholds.max : undefined,
      thresholdType,
      status: 'loaded',
    };
    
    console.log(`[useAlarmThresholds] Returning for ${dataPath}:`, result);
    
    return result;
  }, [dataPath, updateTrigger, isLoading]);
}

/**
 * Convenience hooks for common marine sensors
 */
// Navigation
export const useDepthAlarmThresholds = () => useAlarmThresholds('depth');
export const useSpeedAlarmThresholds = () => useAlarmThresholds('speed.overGround');

// Engine
export const useEngineTemperatureAlarmThresholds = () => useAlarmThresholds('engine.coolantTemp');
export const useEngineRPMAlarmThresholds = () => useAlarmThresholds('engine.rpm');
export const useEngineOilPressureAlarmThresholds = () => useAlarmThresholds('engine.oilPressure');

// Electrical
export const useBatteryVoltageAlarmThresholds = () => useAlarmThresholds('electrical.batteryVoltage');
export const useAlternatorVoltageAlarmThresholds = () => useAlarmThresholds('electrical.alternatorVoltage');
export const useCurrentAlarmThresholds = () => useAlarmThresholds('electrical.current');

// Wind
export const useWindSpeedAlarmThresholds = () => useAlarmThresholds('wind.speed');

// Tanks
export const useFuelLevelAlarmThresholds = () => useAlarmThresholds('tanks.fuel.level');
export const useWaterLevelAlarmThresholds = () => useAlarmThresholds('tanks.freshWater.level');
export const useWasteWaterLevelAlarmThresholds = () => useAlarmThresholds('tanks.wasteWater.level');
