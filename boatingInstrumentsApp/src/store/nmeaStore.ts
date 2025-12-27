/**
 * NMEA Store v3.0 - SensorInstance Architecture
 *
 * Clean implementation using SensorInstance class for:
 * - Automatic metric enrichment (no manual display conversion)
 * - Built-in history management
 * - Centralized alarm evaluation
 * - Type-safe sensor data access
 *
 * Key simplifications from v2:
 * - No manual enrichSensorData calls (SensorInstance handles it)
 * - No manual history management (SensorInstance handles it)
 * - No display field generation (MetricValue handles it)
 * - Cleaner separation of concerns
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { EventEmitter } from 'events';
import { SensorInstance } from '../types/SensorInstance';
import { ReEnrichmentCoordinator } from '../utils/ReEnrichmentCoordinator';
import { getAlarmDefaults } from '../registry/SensorConfigRegistry';
import { log } from '../utils/logging/logger';

import type {
  SensorsData,
  SerializedSensorsData,
  SensorType,
  SensorData,
  SensorAlarmThresholds,
} from '../types/SensorData';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'no-data';
export type AlarmLevel = 'info' | 'warning' | 'critical';

export interface Alarm {
  id: string;
  message: string;
  level: AlarmLevel;
  timestamp: number;
}

/**
 * NMEA Data Structure v3.0
 * Stores SensorInstance class instances instead of plain objects
 */
export interface NmeaData {
  sensors: SensorsData; // Now stores SensorInstance<T> instances
  timestamp: number;
  messageCount: number;
}

/**
 * NMEA Store Interface v3.0
 */
interface NmeaStore {
  // Core state
  connectionStatus: ConnectionStatus;
  nmeaData: NmeaData;
  alarms: Alarm[];
  lastError?: string;
  debugMode: boolean;

  // Event system for real-time updates
  sensorEventEmitter: EventEmitter;

  // Connection management
  setConnectionStatus: (status: ConnectionStatus) => void;
  setLastError: (err?: string) => void;
  setDebugMode: (enabled: boolean) => void;

  // Sensor data management (simplified - SensorInstance handles complexity)
  updateSensorData: <T extends SensorType>(
    sensorType: T,
    instance: number,
    data: Partial<SensorData>,
  ) => void;

  getSensorInstance: <T extends SensorType>(
    sensorType: T,
    instance: number,
  ) => SensorInstance<any> | undefined;

  getAllSensorInstances: <T extends SensorType>(
    sensorType: T,
  ) => Array<{ instance: number; sensorInstance: SensorInstance<any> }>;

  // Threshold management
  updateSensorThresholds: <T extends SensorType>(
    sensorType: T,
    instance: number,
    thresholds: Partial<SensorAlarmThresholds>,
  ) => void;

  getSensorThresholds: <T extends SensorType>(
    sensorType: T,
    instance: number,
  ) => SensorAlarmThresholds | undefined;

  // History and statistics (for widget compatibility)
  getSensorHistory: <T extends SensorType>(
    sensorType: T,
    instance: number,
    metricName: string,
    options?: { timeWindowMs?: number },
  ) => Array<{ value: number; timestamp: number }>;

  getSessionStats: <T extends SensorType>(
    sensorType: T,
    instance: number,
    metricName: string,
  ) => { min: number | null; max: number | null; avg: number | null };

  // System methods
  updateAlarms: (alarms: Alarm[]) => void;
  performFactoryReset: () => void;
}

// Throttle map to prevent rapid duplicate updates
const lastUpdateTimes = new Map<string, number>();
const ALARM_EVALUATION_THROTTLE_MS = 1000;
let lastAlarmEvaluation = 0;

/**
 * Evaluate alarms from all sensor instances
 * SensorInstance provides getAlarmState(metricName) for each metric
 */
function evaluateAlarms(sensors: SensorsData): Alarm[] {
  const alarms: Alarm[] = [];
  const now = Date.now();

  // Check all sensor types
  Object.entries(sensors).forEach(([sensorType, instances]) => {
    Object.entries(instances).forEach(([instanceNum, sensorInstance]) => {
      if (!(sensorInstance instanceof SensorInstance)) return;

      // Check each metric in the sensor
      const allMetrics = sensorInstance.getAllMetrics();
      for (const [metricKey, metric] of Object.entries(allMetrics)) {
        const alarmState = sensorInstance.getAlarmState(metricKey);

        if (alarmState.level !== 'none' && alarmState.message) {
          alarms.push({
            id: `${sensorType}-${instanceNum}-${metricKey}`,
            message: alarmState.message,
            level: alarmState.level === 'critical' ? 'critical' : 'warning',
            timestamp: now,
          });
        }
      }
    });
  });

  return alarms;
}

/**
 * Serialize SensorsData for persistence
 * Converts SensorInstance class instances to plain objects
 */
function serializeSensorsData(sensors: SensorsData): SerializedSensorsData {
  const serialized: SerializedSensorsData = {} as SerializedSensorsData;

  for (const [sensorType, instances] of Object.entries(sensors)) {
    serialized[sensorType as SensorType] = {};

    for (const [instanceNum, sensorInstance] of Object.entries(instances)) {
      if (sensorInstance instanceof SensorInstance) {
        serialized[sensorType as SensorType][parseInt(instanceNum, 10)] = sensorInstance.toJSON();
      }
    }
  }

  return serialized;
}

/**
 * Deserialize SensorsData from persistence
 * Reconstructs SensorInstance class instances from plain objects
 */
function deserializeSensorsData(serialized: SerializedSensorsData): SensorsData {
  const sensors: SensorsData = {
    tank: {},
    engine: {},
    battery: {},
    wind: {},
    speed: {},
    gps: {},
    temperature: {},
    depth: {},
    compass: {},
    autopilot: {},
    navigation: {},
  };

  for (const [sensorType, instances] of Object.entries(serialized)) {
    for (const [instanceNum, plainData] of Object.entries(instances)) {
      const sensorInstance = SensorInstance.fromPlain(plainData);

      // Re-register with ReEnrichmentCoordinator
      ReEnrichmentCoordinator.register(sensorInstance);

      sensors[sensorType as SensorType][parseInt(instanceNum, 10)] = sensorInstance;
    }
  }

  return sensors;
}

/**
 * Create NMEA Store with SensorInstance architecture
 */
export const useNmeaStore = create<NmeaStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        connectionStatus: 'disconnected',
        nmeaData: {
          sensors: {
            tank: {},
            engine: {},
            battery: {},
            wind: {},
            speed: {},
            gps: {},
            temperature: {},
            depth: {},
            compass: {},
            autopilot: {},
            navigation: {},
          },
          timestamp: Date.now(),
          messageCount: 0,
        },
        alarms: [],
        lastError: undefined,
        debugMode: false,

        // Event system
        sensorEventEmitter: new EventEmitter(),

        // Connection management
        setConnectionStatus: (status: ConnectionStatus) => set({ connectionStatus: status }),
        setLastError: (err?: string) => set({ lastError: err }),
        setDebugMode: (enabled: boolean) => set({ debugMode: enabled }),

        /**
         * Update sensor data - SIMPLIFIED with SensorInstance
         *
         * Key changes from v2:
         * - No manual enrichSensorData call
         * - No manual history management
         * - SensorInstance.updateMetrics() handles everything
         */
        updateSensorData: <T extends SensorType>(
          sensorType: T,
          instance: number,
          data: Partial<SensorData>,
        ) => {
          // Throttle duplicate updates to prevent infinite render loops
          // Even fast-updating sensors like engine need throttling (50ms = 20 updates/sec max)
          const updateKey = `${sensorType}-${instance}`;
          const now = Date.now();
          const lastUpdate = lastUpdateTimes.get(updateKey);
          const throttleMs = sensorType === 'engine' ? 50 : 100;

          if (lastUpdate && now - lastUpdate < throttleMs) {
            return;
          }
          lastUpdateTimes.set(updateKey, now);

          const currentState = get();
          const isNewInstance = !currentState.nmeaData.sensors[sensorType]?.[instance];
          
          // CRITICAL: Only proceed if we have actual data to update
          if (!data || Object.keys(data).length === 0) {
            return;
          }

          // Get or create sensor instance
          let sensorInstance = currentState.nmeaData.sensors[sensorType]?.[instance];
          let needsStoreUpdate = isNewInstance;

          if (!sensorInstance) {
            // Create new instance
            const context = {
              batteryChemistry: (data as any)?.chemistry,
              engineType: (data as any)?.type,
            };
            const defaults = getAlarmDefaults(sensorType, context) || {
              enabled: false,
              name: `${sensorType}-${instance}`,
            };

            // Auto-enable critical sensors
            const criticalSensors = ['depth', 'battery', 'engine'];
            if (criticalSensors.includes(sensorType)) {
              defaults.enabled = true;
            }

            sensorInstance = new SensorInstance(sensorType, instance, defaults);

            // Register with ReEnrichmentCoordinator
            ReEnrichmentCoordinator.register(sensorInstance);

            log.storeInit(`🆕 NEW SENSOR: ${sensorType}[${instance}]`, () => ({
              thresholds: defaults,
            }));
            needsStoreUpdate = true;
          }

          // Update metrics - returns true if any values actually changed
          const hasChanges = sensorInstance.updateMetrics(data);

          // CRITICAL: Only call set() if values changed or it's a new instance
          // Prevents infinite loops from repeated NMEA messages with same data
          if (!hasChanges && !needsStoreUpdate) {
            // No changes, skip store update entirely
            return;
          }

          // Values changed or new instance - update store
          set((state) => {
            const newNmeaData = {
              ...state.nmeaData,
              sensors: {
                ...state.nmeaData.sensors,
                [sensorType]: {
                  ...state.nmeaData.sensors[sensorType],
                  [instance]: sensorInstance,
                },
              },
              timestamp: now,
              messageCount: state.nmeaData.messageCount + 1,
            };

            // Throttled alarm evaluation
            let alarms = state.alarms;
            if (now - lastAlarmEvaluation > ALARM_EVALUATION_THROTTLE_MS) {
              alarms = evaluateAlarms(newNmeaData.sensors);
              lastAlarmEvaluation = now;
            }

            return {
              nmeaData: newNmeaData,
              alarms,
            };
          });

          // Emit sensor update event ONLY for new instances
          // Widget detection only needs to know when sensors first appear
          if (isNewInstance) {
            setTimeout(() => {
              get().sensorEventEmitter.emit('sensorUpdate', {
                sensorType,
                instance,
                timestamp: now,
              });
            }, 0);
          }
        },

        /**
         * Get sensor instance (returns SensorInstance, not plain data)
         */
        getSensorInstance: <T extends SensorType>(sensorType: T, instance: number) => {
          return get().nmeaData.sensors[sensorType]?.[instance];
        },

        /**
         * Get all instances of a sensor type
         */
        getAllSensorInstances: <T extends SensorType>(sensorType: T) => {
          const instances = get().nmeaData.sensors[sensorType] || {};
          return Object.entries(instances).map(([inst, sensorInstance]) => ({
            instance: parseInt(inst, 10),
            sensorInstance: sensorInstance as SensorInstance<any>,
          }));
        },

        /**
         * Update sensor thresholds
         */
        updateSensorThresholds: <T extends SensorType>(
          sensorType: T,
          instance: number,
          thresholds: Partial<SensorAlarmThresholds>,
        ) => {
          set((state) => {
            const sensorInstance = state.nmeaData.sensors[sensorType]?.[instance];
            if (!sensorInstance) {
              log.app('Cannot update thresholds - sensor not found', () => ({
                sensorType,
                instance,
              }));
              return state;
            }

            // Update thresholds on SensorInstance
            sensorInstance.updateThresholds(thresholds);

            // Trigger re-evaluation of alarms
            const alarms = evaluateAlarms(state.nmeaData.sensors);

            return {
              nmeaData: {
                ...state.nmeaData,
                timestamp: Date.now(),
              },
              alarms,
            };
          });
        },

        /**
         * Get sensor thresholds
         */
        getSensorThresholds: <T extends SensorType>(sensorType: T, instance: number) => {
          const sensorInstance = get().nmeaData.sensors[sensorType]?.[instance];
          return sensorInstance?.thresholds;
        },

        /**
         * Get sensor history for a specific metric
         */
        getSensorHistory: <T extends SensorType>(
          sensorType: T,
          instance: number,
          metricName: string,
          options?: { timeWindowMs?: number },
        ) => {
          const sensorInstance = get().nmeaData.sensors[sensorType]?.[instance];
          if (!sensorInstance) return [];

          const historyPoints = sensorInstance.getHistoryForMetric(
            metricName,
            options?.timeWindowMs,
          );
          return historyPoints.map((point) => ({
            value: point.value,
            timestamp: point.timestamp,
          }));
        },

        /**
         * Get session statistics for a specific metric
         */
        getSessionStats: <T extends SensorType>(
          sensorType: T,
          instance: number,
          metricName: string,
        ) => {
          const history = get().getSensorHistory(sensorType, instance, metricName);

          if (history.length === 0) {
            return { min: null, max: null, avg: null };
          }

          const values = history.map((h) => h.value);
          const min = Math.min(...values);
          const max = Math.max(...values);
          const avg = values.reduce((sum, v) => sum + v, 0) / values.length;

          return { min, max, avg };
        },

        /**
         * Update alarms
         */
        updateAlarms: (alarms: Alarm[]) => set({ alarms }),

        /**
         * Factory reset - clear all sensor data
         */
        performFactoryReset: () => {
          // Unregister all sensor instances from ReEnrichmentCoordinator
          const state = get();
          Object.values(state.nmeaData.sensors).forEach((instances) => {
            Object.values(instances).forEach((sensorInstance) => {
              if (sensorInstance instanceof SensorInstance) {
                ReEnrichmentCoordinator.unregister(sensorInstance);
                sensorInstance.destroy();
              }
            });
          });

          // Reset state
          set({
            connectionStatus: 'disconnected',
            nmeaData: {
              sensors: {
                tank: {},
                engine: {},
                battery: {},
                wind: {},
                speed: {},
                gps: {},
                temperature: {},
                depth: {},
                compass: {},
                autopilot: {},
                navigation: {},
              },
              timestamp: Date.now(),
              messageCount: 0,
            },
            alarms: [],
            lastError: undefined,
          });

          log.app('Factory reset complete - all sensor data cleared');
        },
      }),
      {
        name: 'nmea-storage',
        version: 3, // Increment version for schema change

        // Custom serialization for SensorInstance persistence
        partialize: (state) => ({
          connectionStatus: state.connectionStatus,
          debugMode: state.debugMode,
          nmeaData: {
            sensors: serializeSensorsData(state.nmeaData.sensors),
            timestamp: state.nmeaData.timestamp,
            messageCount: state.nmeaData.messageCount,
          },
        }),

        // Custom deserialization to reconstruct SensorInstance objects
        merge: (persistedState: any, currentState: NmeaStore) => {
          if (!persistedState) return currentState;

          return {
            ...currentState,
            ...persistedState,
            nmeaData: {
              ...currentState.nmeaData,
              ...persistedState.nmeaData,
              sensors: persistedState.nmeaData?.sensors
                ? deserializeSensorsData(persistedState.nmeaData.sensors)
                : currentState.nmeaData.sensors,
            },
          };
        },
      },
    ),
    {
      name: 'NMEA Store v3',
      enabled: __DEV__, // Re-enabled after fixing infinite loop
    },
  ),
);

/**
 * Initialize ReEnrichmentCoordinator
 * Call once at app startup
 */
export function initializeNmeaStore() {
  ReEnrichmentCoordinator.initialize();
  log.app('NMEA Store v3 initialized with ReEnrichmentCoordinator');
}
