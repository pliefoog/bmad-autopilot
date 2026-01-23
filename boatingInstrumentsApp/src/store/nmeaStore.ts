/**
 * nmeaStore.ts - Unified NMEA Store (v5.0)
 * 
 * Purpose:
 * - Provide UI-facing state: connection status, alarms, message metadata
 * - Store persistent sensor configurations (names, thresholds, contexts)
 * - Bridge threshold reads/writes to SensorInstance per-metric storage
 * 
 * Key Features:
 * - Unified store eliminates dual-store pattern (Phase 2 refactor)
 * - Partial persistence: only sensorConfigs persists to AsyncStorage
 * - DevTools enabled for config + data in single view
 * - Per-metric threshold APIs with backward compatibility
 * 
 * Critical Implementation Details:
 * - Volatile state: connectionStatus, alarms, messageCount (in-memory only)
 * - Persistent state: sensorConfigs (AsyncStorage via Zustand persist)
 * - Schema version 4: Unified metrics object (from Phase 1)
 * - Migration from old sensorConfigStore (one-time on first app launch)
 * 
 * Dependencies:
 * - SensorDataRegistry: sensor access and threshold storage
 * - AlarmEvaluator: compile active alarms into store
 * - PureStoreUpdater: updates metadata and routes sensor updates
 * - AsyncStorage: persistent config storage
 * 
 * Related Files:
 * - SensorDataRegistry.ts, AlarmEvaluator.ts, PureStoreUpdater.ts
 */

import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sensorRegistry } from '../services/SensorDataRegistry';
import { log } from '../utils/logging/logger';
import { useToastStore } from './toastStore';
import { getSensorSchema } from '../registry';

import type { SensorType, SensorData, SensorConfiguration } from '../types/SensorData';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'no-data';
export type AlarmLevel = 'info' | 'warning' | 'critical';

export interface Alarm {
  id: string;
  message: string;
  level: AlarmLevel;
  timestamp: number;
}

/**
 * Stored sensor configuration (from sensorConfigStore migration)
 */
export interface StoredSensorConfig extends SensorConfiguration {
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
 * NMEA Data Structure v5.0
 * Minimal UI state - sensors stored in SensorDataRegistry
 */
export interface NmeaData {
  timestamp: number;
  messageCount: number;
  messageFormat?: 'NMEA 0183' | 'NMEA 2000'; // Last detected message format
}

/**
 * NMEA Store Interface v5.0
 * Unified store with both volatile UI state and persistent sensor configuration
 */
interface NmeaStore {
  // Volatile UI state (not persisted)
  connectionStatus: ConnectionStatus;
  nmeaData: NmeaData;
  alarms: Alarm[];
  lastError?: string;
  debugMode: boolean;

  // Persistent sensor configuration (AsyncStorage backed)
  sensorConfigs: SensorConfigMap;
  configVersion: number; // Schema version for migrations
  _hasHydrated: boolean; // Hydration completion flag (prevents race conditions)

  // Connection management
  setConnectionStatus: (status: ConnectionStatus) => void;
  setLastError: (err?: string) => void;
  setDebugMode: (enabled: boolean) => void;

  // NMEA message metadata (for UI display)
  updateMessageMetadata: (messageFormat?: 'NMEA 0183' | 'NMEA 2000') => void;

  // Configuration management (replaces sensorConfigStore)
  getSensorConfig: (sensorType: SensorType, instance: number) => StoredSensorConfig | undefined;
  setSensorConfig: (sensorType: SensorType, instance: number, config: Partial<SensorConfiguration>) => void;
  deleteSensorConfig: (sensorType: SensorType, instance: number) => void;
  getAllSensorConfigs: () => SensorConfigMap;
  clearAllSensorConfigs: () => void;

  // Threshold management (delegates to SensorInstance)
  /**
   * Get thresholds for a sensor metric
   * 
   * Implementation Notes:
   * - Bridges directly to SensorInstance per-metric thresholds Map
   * - Supports multi-metric sensors via optional metricKey
   * - Backward compatible: defaults to first metric when metricKey omitted
   * 
   * @param sensorType - Sensor type identifier
   * @param instance - Sensor instance number
   * @param metricKey - Optional metric field name (e.g., 'voltage')
   * @returns Threshold object for the metric or undefined
   */
  getSensorThresholds: (sensorType: SensorType, instance: number, metricKey?: string) => any | undefined;

  /**
   * Update thresholds for a sensor metric
   * 
   * Implementation Notes:
   * - Validates metricKey exists on SensorInstance
   * - Logs informative errors for missing sensors/metrics
   * - Backward compatible: defaults to first metric when metricKey omitted
   * 
   * @param sensorType - Sensor type identifier
   * @param instance - Sensor instance number
   * @param thresholds - Threshold configuration object
   * @param metricKey - Optional metric field name (e.g., 'current')
   */
  updateSensorThresholds: (sensorType: SensorType, instance: number, thresholds: any, metricKey?: string) => void;

  // Alarm management
  updateAlarms: (alarms: Alarm[]) => void;

  // System methods
  performFactoryReset: () => void;
}

/**
 * Generate storage key for sensor configuration
 */
const generateConfigKey = (sensorType: SensorType, instance: number): string => {
  return `${sensorType}:${instance}`;
};

/**
 * Create NMEA Store with Zustand DevTools + Persist Middleware
 * 
 * Persistence Strategy:
 * - Only sensorConfigs persists to AsyncStorage (volatile state remains in-memory)
 * - Partial persistence reduces AsyncStorage writes
 * - Migration from old sensorConfigStore (sensor-config-storage key)
 */
export const useNmeaStore = create<NmeaStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Volatile UI state (not persisted)
        connectionStatus: 'disconnected',
        nmeaData: {
          timestamp: Date.now(),
          messageCount: 0,
          messageFormat: undefined,
        },
        alarms: [],
        lastError: undefined,
        debugMode: false,

        // Persistent sensor configuration (AsyncStorage backed)
        sensorConfigs: {},
        configVersion: 4, // Schema version 4 from Phase 1
        _hasHydrated: false,

      // Connection management
      setConnectionStatus: (status: ConnectionStatus) =>
        set(
          (state) => {
            // Reset message counter when transitioning to 'connected'
            if (status === 'connected' && state.connectionStatus !== 'connected') {
              return {
                connectionStatus: status,
                nmeaData: {
                  ...state.nmeaData,
                  messageCount: 0,
                },
              };
            }
            return { connectionStatus: status };
          },
          false,
          'setConnectionStatus',
        ),

      setLastError: (err?: string) => set({ lastError: err }, false, 'setLastError'),
      setDebugMode: (enabled: boolean) => set({ debugMode: enabled }, false, 'setDebugMode'),

      // Configuration management (replaces sensorConfigStore)
      getSensorConfig: (sensorType: SensorType, instance: number) => {
        const key = generateConfigKey(sensorType, instance);
        return get().sensorConfigs[key];
      },

      setSensorConfig: (sensorType: SensorType, instance: number, config: Partial<SensorConfiguration>) => {
        const key = generateConfigKey(sensorType, instance);
        const now = Date.now();
        const existingConfig = get().sensorConfigs[key];

        const updatedConfig: StoredSensorConfig = {
          ...existingConfig,
          ...config,
          updatedAt: now,
          createdAt: existingConfig?.createdAt || now,
          lastModified: now,
        };

        set((state) => ({
          sensorConfigs: {
            ...state.sensorConfigs,
            [key]: updatedConfig,
          },
        }), false, 'setSensorConfig');
      },

      deleteSensorConfig: (sensorType: SensorType, instance: number) => {
        const key = generateConfigKey(sensorType, instance);
        set((state) => {
          const newConfigs = { ...state.sensorConfigs };
          delete newConfigs[key];
          return { sensorConfigs: newConfigs };
        }, false, 'deleteSensorConfig');
      },

      getAllSensorConfigs: () => {
        return get().sensorConfigs;
      },

      clearAllSensorConfigs: () => {
        set({ sensorConfigs: {} }, false, 'clearAllSensorConfigs');
      },

      /**
       * Update message metadata - called by PureStoreUpdater
       * Updates message count and format for UI display
       */
      updateMessageMetadata: (messageFormat?: 'NMEA 0183' | 'NMEA 2000') => {
        set(
          (state) => ({
            nmeaData: {
              ...state.nmeaData,
              timestamp: Date.now(),
              messageCount: state.nmeaData.messageCount + 1,
              messageFormat: messageFormat || state.nmeaData.messageFormat,
            },
          }),
          false,
          'updateMessageMetadata',
        );
      },

      // Alarm management - called by SensorDataRegistry
      updateAlarms: (alarms: Alarm[]) =>
        set({ alarms }, false, 'updateAlarms'),

      // Threshold management - bridges to SensorInstance
      getSensorThresholds: (sensorType: SensorType, instance: number, metricKey?: string) => {
        const sensorInstance = sensorRegistry.get(sensorType, instance);
        if (!sensorInstance) return undefined;

        // Get metric keys for this sensor (thresholds stored per-metric)
        const metricKeys = sensorInstance.getMetricKeys();
        if (metricKeys.length === 0) return undefined;

        // Support multi-metric threshold access
        // If metricKey provided, use it; otherwise default to first metric
        const targetMetricKey = metricKey || metricKeys[0];
        return (sensorInstance as any)._thresholds.get(targetMetricKey);
      },

      updateSensorThresholds: (sensorType: SensorType, instance: number, thresholds: any, metricKey?: string) => {
        const sensorInstance = sensorRegistry.get(sensorType, instance);
        if (!sensorInstance) {
          log.app('Cannot update thresholds - sensor instance not found', () => ({
            sensorType,
            instance,
            metricKey,
          }));
          return;
        }

        // CRITICAL FIX (Jan 2026): Use SensorInstance's updateThresholdsFromConfig
        // This method properly handles formula resolution for indirectThreshold (ratio-based alarms)
        // 
        // PREVIOUS BUG: nmeaStore did its own conversion which stored raw indirectThreshold values
        // without resolving formulas (e.g., "capacity * indirectThreshold"). This caused alarms
        // to never trigger because evaluateAlarm checks critical.min/max, not critical.indirectThreshold.
        // 
        // SensorInstance.updateThresholdsFromConfig:
        // 1. Detects ratio mode (indirectThreshold present in config)
        // 2. Gets schema ThresholdConfig with formula definition
        // 3. Injects user's indirectThreshold value (e.g., 1.5 C-rate)
        // 4. Calls resolveThreshold to evaluate formula → numeric value
        // 5. Stores resolved value in critical.min or critical.max based on direction
        // 
        // The thresholds parameter is a SensorConfiguration object (despite name),
        // so we can pass it directly to updateThresholdsFromConfig.
        
        sensorInstance.updateThresholdsFromConfig(thresholds as SensorConfiguration);
      },

      /**
       * Factory reset - Clear all data
       */
      performFactoryReset: () => {
        try {
          // Destroy registry (clears all sensors)
          sensorRegistry.destroy();

          // Reset UI state
          set(
            {
              connectionStatus: 'disconnected',
              nmeaData: {
                timestamp: Date.now(),
                messageCount: 0,
                messageFormat: undefined,
              },
              alarms: [],
              lastError: undefined,
            },
            false,
            'performFactoryReset',
          );

          log.app('Factory reset complete');
        } catch (error) {
          log.app('Error during factory reset', () => ({
            error: error instanceof Error ? error.message : String(error),
          }));
        }
      },
    }),
    {
      name: 'nmea-storage', // AsyncStorage key
      storage: createJSONStorage(() => AsyncStorage),
      version: 4, // Schema version (aligned with Phase 1)

      // Partial persistence: only persist sensorConfigs
      partialize: (state) => ({
        sensorConfigs: state.sensorConfigs,
        configVersion: state.configVersion,
      }),

      // Migration from old sensorConfigStore AsyncStorage key
      migrate: async (persistedState: any, version: number) => {
        // First, try to migrate from old sensorConfigStore key (one-time migration)
        try {
          const oldData = await AsyncStorage.getItem('sensor-config-storage');
          if (oldData) {
            const parsed = JSON.parse(oldData);
            const oldConfigs = parsed?.state?.configs;
            
            if (oldConfigs && Object.keys(oldConfigs).length > 0) {
              log.app('[NmeaStore] Migration: Importing configs from sensorConfigStore', () => ({
                configCount: Object.keys(oldConfigs).length,
              }));

              useToastStore.getState().addToast({
                type: 'success',
                message: `Migrated ${Object.keys(oldConfigs).length} sensor configuration${Object.keys(oldConfigs).length > 1 ? 's' : ''}`,
                duration: 5000,
              });

              // Optionally delete old key after successful migration
              // await AsyncStorage.removeItem('sensor-config-storage');

              return {
                sensorConfigs: oldConfigs,
                configVersion: parsed?.state?.version || 4,
              };
            }
          }
        } catch (error) {
          log.app('[NmeaStore] Migration: Could not read old sensorConfigStore', () => ({
            error: error instanceof Error ? error.message : String(error),
          }));
        }

        // No old data to migrate, return current state
        return persistedState || { sensorConfigs: {}, configVersion: 4 };
      },

      // Handle storage errors gracefully
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            log.app('[NmeaStore] Hydration error', () => ({
              error: error instanceof Error ? error.message : String(error),
            }));
            // Set hydrated even on error to prevent infinite waiting
            useNmeaStore.setState({ _hasHydrated: true });
          } else {
            const configCount = Object.keys(state?.sensorConfigs || {}).length;
            log.app('[NmeaStore] Hydration complete', () => ({ configCount }));

            // CRITICAL: Mark store as hydrated
            useNmeaStore.setState({ _hasHydrated: true });

            // Emit global event for waiting components
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('nmeaStoreHydrated'));
            }
          }
        };
      },
    },
  ),
    {
      name: 'NmeaStore',
      enabled: true, // DevTools now enabled!
    },
  ),
);

// Expose for debugging in browser console
if (typeof window !== 'undefined') {
  (window as any).useNmeaStore = useNmeaStore;
  (window as any).sensorRegistry = sensorRegistry;
}
