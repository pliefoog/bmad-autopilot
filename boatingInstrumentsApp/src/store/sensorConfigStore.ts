/**
 * Sensor Configuration Store - Persistent Storage for Sensor Settings
 * 
 * Primary-Cache Pattern:
 * - This store is the SOURCE OF TRUTH for sensor configurations
 * - Uses Zustand persist middleware for AsyncStorage persistence
 * - nmeaStore is volatile cache that syncs from this store on app startup
 * 
 * Stores per-sensor-instance configuration:
 * - Custom names
 * - Alarm thresholds (critical/warning)
 * - Hysteresis settings
 * - Context (battery chemistry, engine type, etc.)
 * - Sound patterns
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SensorType, SensorAlarmThresholds } from '../types/SensorData';

/**
 * Unique sensor configuration key
 */
export interface SensorConfigKey {
  sensorType: SensorType;
  instance: number;
}

/**
 * Stored sensor configuration
 */
export interface StoredSensorConfig extends SensorAlarmThresholds {
  // Inherited from SensorAlarmThresholds:
  // name, context, critical, warning, direction, 
  // criticalSoundPattern, warningSoundPattern,
  // criticalHysteresis, warningHysteresis, enabled, lastModified
  
  // Storage metadata
  createdAt?: number; // When this config was first created
  updatedAt?: number; // Last update timestamp
}

/**
 * Sensor configuration storage map
 * Key format: "sensorType:instance" (e.g., "battery:0", "engine:1")
 */
export type SensorConfigMap = Record<string, StoredSensorConfig>;

/**
 * Sensor Configuration Store State
 */
interface SensorConfigStoreState {
  // Configuration storage
  configs: SensorConfigMap;
  
  // Store metadata
  version: number; // Schema version for migrations
  lastSyncTimestamp?: number; // Last sync with nmeaStore
  
  // Actions
  getConfig: (sensorType: SensorType, instance: number) => StoredSensorConfig | undefined;
  setConfig: (sensorType: SensorType, instance: number, config: Partial<SensorAlarmThresholds>) => void;
  deleteConfig: (sensorType: SensorType, instance: number) => void;
  getAllConfigs: () => SensorConfigMap;
  clearAll: () => void;
  
  // Utility
  generateKey: (sensorType: SensorType, instance: number) => string;
}

/**
 * Generate storage key for sensor configuration
 */
const generateKey = (sensorType: SensorType, instance: number): string => {
  return `${sensorType}:${instance}`;
};

/**
 * Sensor Configuration Store with AsyncStorage persistence
 */
export const useSensorConfigStore = create<SensorConfigStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      configs: {},
      version: 1,
      lastSyncTimestamp: undefined,

      // Generate storage key
      generateKey,

      // Get configuration for specific sensor instance
      getConfig: (sensorType: SensorType, instance: number) => {
        const key = generateKey(sensorType, instance);
        return get().configs[key];
      },

      // Set/update configuration for sensor instance
      setConfig: (sensorType: SensorType, instance: number, config: Partial<SensorAlarmThresholds>) => {
        const key = generateKey(sensorType, instance);
        const now = Date.now();
        const existingConfig = get().configs[key];
        
        const updatedConfig: StoredSensorConfig = {
          ...existingConfig,
          ...config,
          updatedAt: now,
          createdAt: existingConfig?.createdAt || now,
          lastModified: now,
        };

        set((state) => ({
          configs: {
            ...state.configs,
            [key]: updatedConfig,
          },
        }));

        console.log(`[SensorConfigStore] Updated config for ${key}:`, updatedConfig);
      },

      // Delete configuration for sensor instance
      deleteConfig: (sensorType: SensorType, instance: number) => {
        const key = generateKey(sensorType, instance);
        
        set((state) => {
          const newConfigs = { ...state.configs };
          delete newConfigs[key];
          return { configs: newConfigs };
        });

        console.log(`[SensorConfigStore] Deleted config for ${key}`);
      },

      // Get all configurations
      getAllConfigs: () => {
        return get().configs;
      },

      // Clear all configurations (for reset/testing)
      clearAll: () => {
        set({ configs: {}, lastSyncTimestamp: undefined });
        console.log('[SensorConfigStore] Cleared all configurations');
      },
    }),
    {
      name: 'sensor-config-storage', // AsyncStorage key
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      
      // Partial persistence - only persist configs, not derived state
      partialize: (state) => ({
        configs: state.configs,
        version: state.version,
        lastSyncTimestamp: state.lastSyncTimestamp,
      }),

      // Handle storage errors gracefully
      onRehydrateStorage: () => {
        console.log('[SensorConfigStore] Hydrating from AsyncStorage...');
        return (state, error) => {
          if (error) {
            console.error('[SensorConfigStore] Hydration error:', error);
          } else {
            const configCount = Object.keys(state?.configs || {}).length;
            console.log(`[SensorConfigStore] Hydrated ${configCount} sensor configurations`);
          }
        };
      },
    }
  )
);

/**
 * Export utility function to sync configurations from sensorConfigStore to nmeaStore
 * Call this on app startup to populate nmeaStore cache from persistent storage
 */
export const syncConfigsToNmeaStore = (nmeaStoreUpdateFn: (
  sensorType: SensorType,
  instance: number,
  config: SensorAlarmThresholds
) => void) => {
  const allConfigs = useSensorConfigStore.getState().getAllConfigs();
  let syncCount = 0;

  Object.entries(allConfigs).forEach(([key, config]) => {
    const [sensorType, instanceStr] = key.split(':');
    const instance = parseInt(instanceStr, 10);

    if (sensorType && !isNaN(instance)) {
      nmeaStoreUpdateFn(sensorType as SensorType, instance, config);
      syncCount++;
    }
  });

  // Update sync timestamp
  useSensorConfigStore.setState({ lastSyncTimestamp: Date.now() });
  
  console.log(`[SensorConfigStore] Synced ${syncCount} configurations to nmeaStore`);
  return syncCount;
};
