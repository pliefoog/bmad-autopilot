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
import { persist, createJSONStorage, devtools } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SensorType, SensorConfiguration } from '../types/SensorData';
import { useToastStore } from './toastStore';

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
export interface StoredSensorConfig extends SensorConfiguration {
  // Inherited from SensorConfiguration:
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
  setConfig: (
    sensorType: SensorType,
    instance: number,
    config: Partial<SensorConfiguration>,
  ) => void;
  deleteConfig: (sensorType: SensorType, instance: number) => void;
  getAllConfigs: () => SensorConfigMap;
  getMetricThresholds: (
    sensorType: SensorType,
    instance: number,
    metricKey: string,
  ) => any | undefined;
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
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        configs: {},
        version: 3, // Schema version (category→unitType refactor) // v2: MetricValue/SensorInstance refactor - clean slate
        lastSyncTimestamp: undefined,

        // Generate storage key
        generateKey,

        // Get configuration for specific sensor instance
        getConfig: (sensorType: SensorType, instance: number) => {
          const key = generateKey(sensorType, instance);
          return get().configs[key];
        },

        // Set/update configuration for sensor instance
        setConfig: (
          sensorType: SensorType,
          instance: number,
          config: Partial<SensorConfiguration>,
        ) => {
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
        },

        // Delete configuration for sensor instance
        deleteConfig: (sensorType: SensorType, instance: number) => {
          const key = generateKey(sensorType, instance);

          set((state) => {
            const newConfigs = { ...state.configs };
            delete newConfigs[key];
            return { configs: newConfigs };
          });
        },

        // Get all configurations
        getAllConfigs: () => {
          return get().configs;
        },

        // Get metric-specific thresholds (for new MetricThresholds interface)
        getMetricThresholds: (sensorType: SensorType, instance: number, metricKey: string) => {
          const config = get().getConfig(sensorType, instance);
          if (!config) return undefined;

          // Extract metric-specific thresholds from sensor config
          // This will be enhanced when we add per-metric threshold storage
          return {
            critical: config.critical || {},
            warning: config.warning || {},
            hysteresis: config.criticalHysteresis || config.warningHysteresis,
            criticalSoundPattern: config.criticalSoundPattern,
            warningSoundPattern: config.warningSoundPattern,
            staleThresholdMs: 5000, // Default 5s, will be made configurable
            enabled: config.enabled ?? true,
          };
        },

        // Clear all configurations (for reset/testing)
        clearAll: () => {
          set({ configs: {}, lastSyncTimestamp: undefined });
        },
      }),
      {
        name: 'sensor-config-storage', // AsyncStorage key
        storage: createJSONStorage(() => AsyncStorage),
        version: 3, // Bumped from 2 → 3 for category→unitType refactor

        // Partial persistence - only persist configs, not derived state
        partialize: (state) => ({
          configs: state.configs,
          version: state.version,
          lastSyncTimestamp: state.lastSyncTimestamp,
        }),

        // Migration strategy: Clean slate on version mismatch
        migrate: (persistedState: any, version: number) => {
          if (version !== 3) {
            console.warn(
              '[SensorConfigStore] Migration: Clearing configs due to schema version change',
              `(stored: v${version}, expected: v3 - category→unitType refactor)`,
            );

            // Show user-friendly notification
            useToastStore.getState().addToast({
              type: 'info',
              message:
                'Sensor configurations cleared due to app update. Please reconfigure sensors.',
              duration: 8000,
              priority: 'high',
            });

            return {
              configs: {},
              version: 3,
              lastSyncTimestamp: undefined,
            };
          }
          return persistedState;
        },

        // Handle storage errors gracefully
        onRehydrateStorage: () => {
          return (state, error) => {
            if (error) {
              console.error('[SensorConfigStore] Hydration error:', error);
            } else {
              const configCount = Object.keys(state?.configs || {}).length;
            }
          };
        },
      },
    ),
    { name: 'Sensor Config Store', enabled: __DEV__ },
  ),
);

/**
 * Export utility function to sync configurations from sensorConfigStore to nmeaStore
 * Call this on app startup to populate nmeaStore cache from persistent storage
 */
export const syncConfigsToNmeaStore = (
  nmeaStoreUpdateFn: (
    sensorType: SensorType,
    instance: number,
    config: SensorConfiguration,
  ) => void,
) => {
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

  return syncCount;
};
