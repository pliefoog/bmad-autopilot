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
import { devtools } from 'zustand/middleware';
import { EventEmitter } from 'events';
import { SensorInstance } from '../types/SensorInstance';
import { ReEnrichmentCoordinator } from '../utils/ReEnrichmentCoordinator';
import { SensorConfigCoordinator } from '../utils/SensorConfigCoordinator';
import { getAlarmDefaults } from '../registry/SensorConfigRegistry';
import { log } from '../utils/logging/logger';

import type {
  SensorsData,
  SensorType,
  SensorData,
  SensorConfiguration,
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
    thresholds: Partial<SensorConfiguration>,
  ) => void;

  getSensorThresholds: <T extends SensorType>(
    sensorType: T,
    instance: number,
  ) => SensorConfiguration | undefined;

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

// Alarm evaluation throttle to prevent excessive re-evaluation
const ALARM_EVALUATION_THROTTLE_MS = 1000;
let lastAlarmEvaluation = 0;

/**
 * Evaluate alarms from all sensor instances
 * SensorInstance provides getAlarmState(metricKey) returning numeric 0|1|2|3
 */
function evaluateAlarms(sensors: SensorsData): Alarm[] {
  const alarms: Alarm[] = [];
  const now = Date.now();

  // Check all sensor types
  Object.entries(sensors).forEach(([sensorType, instances]) => {
    Object.entries(instances).forEach(([instanceNum, sensorInstance]) => {
      if (!(sensorInstance instanceof SensorInstance)) return;

      // Access _history Map to get all metric keys
      const historyMap = (sensorInstance as any)._history as Map<string, any>;
      if (!historyMap || historyMap.size === 0) return;

      // Check alarm state for each metric in the history
      for (const metricKey of historyMap.keys()) {
        const alarmLevel = sensorInstance.getAlarmState(metricKey);

        // AlarmLevel: 0=NONE, 1=STALE, 2=WARNING, 3=CRITICAL
        if (alarmLevel >= 2) {
          // WARNING or CRITICAL
          const level: AlarmLevel = alarmLevel === 3 ? 'critical' : 'warning';

          alarms.push({
            id: `${sensorType}-${instanceNum}-${metricKey}`,
            message: `${sensorType}[${instanceNum}].${metricKey}: ${level.toUpperCase()}`,
            level,
            timestamp: now,
          });
        }
      }
    });
  });

  return alarms;
}

/**
 * Create NMEA Store with SensorInstance architecture
 * Note: No persistence - NMEA data is volatile stream data
 */
export const useNmeaStore = create<NmeaStore>()(
  devtools(
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
          // ARCHITECTURE v2.0: No throttling needed with version-based subscriptions
          // Each metric has its own version counter - only affected cells re-render
          // Version only increments when value actually changes (handled in updateMetrics)
          
          // Skip empty updates
          if (!data || Object.keys(data).length === 0) {
            return;
          }

          const now = Date.now();
          const currentState = get();
          const isNewInstance = !currentState.nmeaData.sensors[sensorType]?.[instance];

          // Get or create sensor instance
          let sensorInstance = currentState.nmeaData.sensors[sensorType]?.[instance];
          let needsStoreUpdate = isNewInstance;

          if (!sensorInstance) {
            // Create new instance with simplified constructor (no thresholds parameter)
            sensorInstance = new SensorInstance(sensorType, instance);

            // Register with coordinators
            ReEnrichmentCoordinator.register(sensorInstance);
            SensorConfigCoordinator.register(sensorInstance);

            log.storeInit(`🆕 NEW SENSOR: ${sensorType}[${instance}]`, () => ({
              sensorType,
              instance,
            }));
            needsStoreUpdate = true;
          }

          // Update metrics - returns true if any values actually changed
          const hasChanges = sensorInstance.updateMetrics(data);

          // Calculate derived metrics for wind sensor after primary updates
          if (sensorType === 'wind' && hasChanges) {
            log.wind('Wind sensor updated, checking for true wind calculation', () => ({
              sensorType,
              instance,
              data: Object.keys(data),
            }));
            const gpsInstance = get().nmeaData.sensors.gps?.[0];
            const compassInstance = get().nmeaData.sensors.compass?.[0];
            log.wind('Fetched GPS and compass instances', () => ({
              hasGPS: !!gpsInstance,
              hasCompass: !!compassInstance,
            }));
            if (gpsInstance && compassInstance) {
              (sensorInstance as any)._maybeCalculateTrueWind(gpsInstance, compassInstance);
            } else {
              log.wind('Missing GPS or compass instance for true wind calculation');
            }
          }

          // ARCHITECTURE v2.0: Check if we need to notify subscribers
          // Skip set() if no changes AND not a new instance - prevents infinite loops
          // Version counter already tracks changes, so subscribers only react to version changes
          if (!hasChanges && !needsStoreUpdate) {
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
          thresholds: Partial<SensorConfiguration>,
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
      name: 'NMEA Store v3 (volatile)',
      enabled: __DEV__,
    },
  ),
);

/**
 * Initialize ReEnrichmentCoordinator and SensorConfigCoordinator
 * Call once at app startup
 */
export function initializeNmeaStore() {
  ReEnrichmentCoordinator.initialize();
  SensorConfigCoordinator.initialize();
  log.app('NMEA Store v3 initialized with coordinators');
  
  // Expose store to window for debugging in development
  if (__DEV__ && typeof window !== 'undefined') {
    (window as any).useNmeaStore = useNmeaStore;
    console.log('🔧 Debug: useNmeaStore exposed to window.useNmeaStore');
  }
}
