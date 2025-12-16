import { create } from 'zustand';
import { EventEmitter } from 'events';
import { TimeSeriesBuffer } from '../utils/memoryStorageManagement';

// Debug logging toggle - set to true to enable verbose store update logs
const DEBUG_STORE_UPDATES = false;

import type {
  SensorsData,
  SensorType,
  SensorData,
  SensorAlarmThresholds,
  TankSensorData,
  EngineSensorData,
  BatterySensorData,
  WindSensorData,
  SpeedSensorData,
  GpsSensorData,
  TemperatureSensorData,
  DepthSensorData,
  CompassSensorData,
  AutopilotSensorData,
  NavigationSensorData,
} from '../types/SensorData';
import { getSmartDefaults } from '../registry/SensorConfigRegistry';
import { logger } from '../utils/logger';

// MEMORY LEAK FIX: Throttle alarm evaluation (expensive operation)
let lastAlarmEvaluation = 0;
const ALARM_EVALUATION_THROTTLE_MS = 1000; // Max 1 alarm check per second

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'no-data';
export type AlarmLevel = 'info' | 'warning' | 'critical';

export interface Alarm {
  id: string;
  message: string;
  level: AlarmLevel;
  timestamp: number;
}

/**
 * Clean NMEA Data Structure v2.0
 *
 * Widget-centric design with protocol-agnostic sensor data.
 * Each widget type has a single entry point in sensors.
 */
export interface NmeaData {
  // Clean widget-centric sensor data
  sensors: SensorsData;

  // System-level metadata
  timestamp: number;
  messageCount: number;
}

/**
 * Clean NMEA Store Interface v2.0
 *
 * Widget-centric design with simplified sensor data management.
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

  // Sensor data management
  updateSensorData: <T extends SensorType>(
    sensorType: T,
    instance: number,
    data: Partial<SensorData>,
  ) => void;
  getSensorData: <T extends SensorType>(sensorType: T, instance: number) => SensorData | undefined;
  getSensorInstances: <T extends SensorType>(
    sensorType: T,
  ) => Array<{ instance: number; data: SensorData }>;

  // History management - NEW: Auto-managed history with adaptive sampling
  getSensorHistory: <T extends SensorType>(
    sensorType: T,
    instance: number,
    options?: {
      timeWindowMs?: number;
      resolution?: 'full' | 'decimated' | 'auto';
      chartWidth?: number;
    },
  ) => Array<{ value: number | Record<string, number>; timestamp: number }>;
  getSessionStats: <T extends SensorType>(
    sensorType: T,
    instance: number,
  ) => { min: number | null; max: number | null; avg: number | null; count: number };
  clearSensorHistory: <T extends SensorType>(sensorType: T, instance: number) => void;

  // Alarm threshold management
  updateSensorThresholds: <T extends SensorType>(
    sensorType: T,
    instance: number,
    thresholds: Partial<import('../types/SensorData').SensorAlarmThresholds>,
  ) => void;
  getSensorThresholds: <T extends SensorType>(
    sensorType: T,
    instance: number,
  ) => import('../types/SensorData').SensorAlarmThresholds | undefined;
  initializeDefaultThresholds: <T extends SensorType>(
    sensorType: T,
    instance: number,
    location?: string,
  ) => void;

  // System methods
  updateAlarms: (alarms: Alarm[]) => void;
  reset: () => void;

  // Legacy methods for backward compatibility during migration
  getTankData: (instance: number) => TankSensorData | undefined;
  getEngineData: (instance: number) => EngineSensorData | undefined;
  getBatteryData: (instance: number) => BatterySensorData | undefined;
  getTemperatureData: (instance: number) => TemperatureSensorData | undefined;
}

// Utility: Evaluate sensor data and return triggered alarms
function evaluateAlarms(nmeaData: NmeaData): Alarm[] {
  const alarms: Alarm[] = [];
  const now = Date.now();

  // Check depth sensors for shallow water
  Object.values(nmeaData.sensors.depth || {}).forEach((depthSensor) => {
    if (depthSensor.depth !== undefined && depthSensor.depth < 2) {
      alarms.push({
        id: `shallow-depth-${depthSensor.name}`,
        message: `Shallow depth: ${depthSensor.depth}m (${depthSensor.name})`,
        level: 'critical',
        timestamp: now,
      });
    }
  });

  // Check battery sensors for low voltage
  Object.values(nmeaData.sensors.battery || {}).forEach((batterySensor) => {
    if (batterySensor.voltage !== undefined && batterySensor.voltage < 11.5) {
      alarms.push({
        id: `low-battery-${batterySensor.name}`,
        message: `Low battery: ${batterySensor.voltage}V (${batterySensor.name})`,
        level: 'warning',
        timestamp: now,
      });
    }
  });

  // Check engine sensors for overheating
  Object.values(nmeaData.sensors.engine || {}).forEach((engineSensor) => {
    if (engineSensor.coolantTemp !== undefined && engineSensor.coolantTemp > 95) {
      alarms.push({
        id: `engine-overheat-${engineSensor.name}`,
        message: `Engine overheat: ${engineSensor.coolantTemp}°C (${engineSensor.name})`,
        level: 'critical',
        timestamp: now,
      });
    }
  });

  return alarms;
}

/**
 * Extract trackable value from sensor data for history
 * Each sensor tracks its PRIMARY metric as defined in SensorData.ts
 */
function extractTrackableValue(sensorType: SensorType, data: any): number | null {
  switch (sensorType) {
    case 'depth':
      return data.depth ?? null;
    case 'speed':
      return data.throughWater ?? null; // STW from paddlewheel (VHW)
    case 'gps':
      return data.speedOverGround ?? null; // SOG from GPS (VTG/RMC)
    case 'wind':
      return data.speed ?? null;
    case 'engine':
      return data.rpm ?? null;
    case 'battery':
      return data.voltage ?? null;
    case 'temperature':
      return data.value ?? null;
    default:
      return null;
  }
}

// Throttle map to prevent infinite loops from rapid duplicate updates
const lastUpdateTimes = new Map<string, number>();

export const useNmeaStore = create<NmeaStore>((set, get) => ({
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

  // Event system for real-time sensor updates
  sensorEventEmitter: new EventEmitter(),

  // Connection management
  setConnectionStatus: (status: ConnectionStatus) => set({ connectionStatus: status }),
  setLastError: (err?: string) => set({ lastError: err }),
  setDebugMode: (enabled: boolean) => set({ debugMode: enabled }),

  // Core sensor data management with inline history tracking
  updateSensorData: <T extends SensorType>(
    sensorType: T,
    instance: number,
    data: Partial<SensorData>,
  ) => {
    // 🛡️ PREVENT INFINITE LOOPS: Throttle duplicate updates
    // If the same sensor data comes in within 100ms, skip it entirely
    const updateKey = `${sensorType}-${instance}`;
    const now = Date.now();
    const lastUpdate = lastUpdateTimes.get(updateKey);

    if (lastUpdate && now - lastUpdate < 100) {
      // Debug: Log throttled updates for speed sensor
      if (sensorType === 'speed') {
        console.log(
          `⏱️ THROTTLED: ${sensorType}-${instance} update (${now - lastUpdate}ms since last)`,
        );
      }
      return;
    }

    // Debug: Log all speed sensor updates
    if (sensorType === 'speed') {
      if (DEBUG_STORE_UPDATES) console.log(`📥 Store update: ${sensorType}-${instance}`, data);
    }

    lastUpdateTimes.set(updateKey, now);

    // Track if this is a new sensor instance (for event emission)
    const isNewInstance = !get().nmeaData.sensors[sensorType]?.[instance];

    set((state) => {
      // Safely access sensor instance (may not exist yet)
      const sensorTypeObj = state.nmeaData.sensors[sensorType] || {};
      const currentSensorData = sensorTypeObj[instance];

      // 🛡️ PREVENT INFINITE LOOPS: Skip if data hasn't changed
      // CRITICAL: Check this BEFORE any mutations (like history.add())
      if (currentSensorData && Object.keys(data).length > 0) {
        const hasChanges = Object.keys(data).some((key) => {
          const oldVal = (currentSensorData as any)[key];
          const newVal = (data as any)[key];
          // Skip history and timestamp fields in comparison
          if (key === 'history' || key === 'timestamp') {
            return false;
          }
          // Deep comparison for objects, shallow for primitives
          if (
            typeof newVal === 'object' &&
            newVal !== null &&
            typeof oldVal === 'object' &&
            oldVal !== null
          ) {
            return JSON.stringify(oldVal) !== JSON.stringify(newVal);
          }
          return oldVal !== newVal;
        });

        if (!hasChanges) {
          // Debug: Log rejected updates for speed sensor
          if (sensorType === 'speed') {
            if (DEBUG_STORE_UPDATES)
              console.log(`❌ NO CHANGES: Rejected update for ${sensorType}-${instance}`, {
                current: currentSensorData,
                new: data,
              });
          }
          // NO CHANGES: Return existing state without mutations
          // This prevents infinite loops from history buffer mutations
          return state;
        }
      }

      const updateNow = Date.now();

      // Initialize history buffer if this is a new sensor
      let history = currentSensorData?.history;
      if (!history) {
        history = new TimeSeriesBuffer<number>(
          600, // maxRecentEntries (600 entries for full 5-minute window)
          60, // maxOldEntries (decimated historical data)
          300000, // recentThresholdMs (5 minutes - matches TrendLine display window)
          10, // decimationFactor (reduce to 1/10th resolution after 5 minutes)
        );
      }

      // GPS-specific priority logic for UTC time updates
      let finalData = data;
      if (sensorType === 'gps' && (data as any).timeSource && (data as any).utcTime) {
        const currentGps = currentSensorData as any;
        const newTimeSource = (data as any).timeSource;
        const currentTimeSource = currentGps?.timeSource;

        // Priority: RMC (1) > ZDA (2) > GGA (3)
        const priorities: Record<string, number> = { RMC: 1, ZDA: 2, GGA: 3 };
        const newPriority = priorities[newTimeSource] || 99;
        const currentPriority = currentTimeSource ? priorities[currentTimeSource] || 99 : 99;

        // Only update UTC time if new source has equal or higher priority (lower number)
        if (newPriority > currentPriority && currentGps?.utcTime) {
          // Lower priority source - preserve existing utcTime and timeSource
          finalData = { ...data };
          delete (finalData as any).utcTime;
          delete (finalData as any).timeSource;
        }
      }

      const updatedSensorData = {
        ...currentSensorData,
        ...finalData,
        history, // Explicitly preserve history reference
        timestamp: updateNow,
      };

      // AUTO-ADD to history (based on sensor type)
      const trackableValue = extractTrackableValue(sensorType, updatedSensorData);
      if (trackableValue !== null && history) {
        history.add(trackableValue, updateNow);

        // Debug: Log depth history updates occasionally
        if (sensorType === 'depth' && Math.random() < 0.05) {
          const stats = history.getStats();
          if (DEBUG_STORE_UPDATES)
            console.log(
              `📊 Depth history: value=${trackableValue.toFixed(2)}, total=${
                stats.totalCount
              } points`,
            );
        }
      } else if (sensorType === 'depth') {
        // Debug: Log if depth value is null
        console.log(`⚠️ Depth trackable value is null:`, updatedSensorData);
      }

      const newNmeaData = {
        ...state.nmeaData,
        sensors: {
          ...state.nmeaData.sensors,
          [sensorType]: {
            ...state.nmeaData.sensors[sensorType],
            [instance]: updatedSensorData,
          },
        },
        timestamp: Date.now(),
        messageCount: state.nmeaData.messageCount + 1,
      };

      // MEMORY LEAK FIX: Throttle alarm evaluation to prevent 80+ evaluations per second
      let alarms = state.alarms; // Keep existing alarms by default

      if (updateNow - lastAlarmEvaluation > ALARM_EVALUATION_THROTTLE_MS) {
        alarms = evaluateAlarms(newNmeaData);
        lastAlarmEvaluation = updateNow;
      }

      return {
        nmeaData: newNmeaData,
        alarms,
      };
    });

    // Auto-initialize default thresholds for new sensor instances
    if (isNewInstance) {
      logger.sensor(`🆕 NEW SENSOR DETECTED: ${sensorType}[${instance}]`);
      
      // New sensor instance detected - initialize default thresholds
      const sensor = get().nmeaData.sensors[sensorType][instance];
      const location = (sensor as any)?.location;

      logger.sensor(`🔍 Checking thresholds for ${sensorType}[${instance}]:`, {
        hasAlarmThresholds: !!sensor?.alarmThresholds,
        location,
        sensorData: sensor
      });

      // Only auto-initialize if thresholds don't exist
      if (!sensor?.alarmThresholds) {
        // Use smart defaults (context-aware for battery chemistry, engine type)
        const context = {
          batteryChemistry: (sensor as any)?.chemistry,
          engineType: (sensor as any)?.type,
        };
        
        logger.sensor(`📋 Getting smart defaults for ${sensorType}[${instance}]:`, { context, location });
        const defaults = getSmartDefaults(sensorType, context, location);
        
        if (defaults) {
          // Critical sensors should be auto-enabled, others keep their default enabled state
          const criticalSensors = ['depth', 'battery', 'engine'];
          const shouldAutoEnable = criticalSensors.includes(sensorType);
          
          logger.sensor(`💾 Applying defaults for ${sensorType}[${instance}]:`, { defaults, shouldAutoEnable });
          
          get().updateSensorThresholds(sensorType, instance, {
            ...defaults,
            enabled: shouldAutoEnable ? true : defaults.enabled,
            lastModified: Date.now(),
          });
          logger.sensor(
            `✅ Auto-initialized ${shouldAutoEnable ? 'ENABLED' : 'disabled'} default thresholds for ${sensorType}[${instance}] at ${
              location || 'default'
            }`,
          );
        } else {
          logger.sensor(`⚠️ No defaults available for ${sensorType}[${instance}] at ${location || 'default'}`);
        }
      } else {
        logger.sensor(`⏭️ Skipping ${sensorType}[${instance}] - already has thresholds`);
      }
    }

    // Emit sensor update event AFTER state update completes (Phase 1 optimization)
    // Only emit if this is a new instance or data has fields to update
    if (isNewInstance || Object.keys(data).length > 0) {
      const currentTimestamp = Date.now();

      // Use setTimeout 0 for async emission (React Native compatible)
      setTimeout(() => {
        const currentStore = get();
        currentStore.sensorEventEmitter.emit('sensorUpdate', {
          sensorType,
          instance,
          timestamp: currentTimestamp,
        });
      }, 0);
    }
  },

  getSensorData: <T extends SensorType>(sensorType: T, instance: number) => {
    const state = get();
    return state.nmeaData.sensors[sensorType]?.[instance];
  },

  getSensorInstances: <T extends SensorType>(sensorType: T) => {
    const state = get();
    const sensorGroup = state.nmeaData.sensors[sensorType];

    console.log(`[getSensorInstances] Checking ${sensorType}:`, {
      hasSensorGroup: !!sensorGroup,
      sensorGroupType: typeof sensorGroup,
      sensorGroupKeys: sensorGroup ? Object.keys(sensorGroup) : [],
      sensorGroupData: sensorGroup,
    });

    if (!sensorGroup || typeof sensorGroup !== 'object') return [];

    const instances = Object.entries(sensorGroup)
      .filter(([_, data]) => {
        const hasData = data && data.timestamp;
        console.log(`[getSensorInstances] Instance check:`, {
          hasData,
          data: data,
          timestamp: data?.timestamp,
        });
        return hasData;
      })
      .map(([instance, data]) => ({
        instance: parseInt(instance, 10),
        data: data as SensorData,
      }));

    console.log(`[getSensorInstances] Result for ${sensorType}:`, {
      count: instances.length,
      instances: instances.map((i) => ({ instance: i.instance, name: i.data.name })),
    });

    return instances;
  },

  // Get sensor history - returns ALL data points in time window (no downsampling)
  getSensorHistory: <T extends SensorType>(
    sensorType: T,
    instance: number,
    options?: { timeWindowMs?: number },
  ) => {
    const sensor = get().nmeaData.sensors[sensorType][instance];
    if (!sensor || !(sensor as any).history) {
      // Debug: Log if sensor or history missing
      if (sensorType === 'depth' && Math.random() < 0.1) {
        console.log(
          `⚠️ getSensorHistory: ${sensorType}[${instance}] - sensor=${!!sensor}, history=${!!(
            sensor as any
          )?.history}`,
        );
      }
      return [];
    }

    const history = (sensor as any).history as TimeSeriesBuffer<number>;

    // Return all data points in time window - no sampling, no decimation
    const data = options?.timeWindowMs
      ? history.getRange(Date.now() - options.timeWindowMs, Date.now())
      : history.getAll();

    // Debug: Log data retrieval occasionally
    if (sensorType === 'depth' && Math.random() < 0.1) {
      if (DEBUG_STORE_UPDATES)
        console.log(`📊 getSensorHistory(${sensorType}, ${instance}): ${data.length} points`);
    }

    return data;
  },

  // NEW: Get session statistics efficiently
  getSessionStats: <T extends SensorType>(sensorType: T, instance: number) => {
    const sensor = get().nmeaData.sensors[sensorType][instance];
    if (!sensor || !(sensor as any).history) {
      return { min: null, max: null, avg: null, count: 0 };
    }

    const history = (sensor as any).history as TimeSeriesBuffer<number>;
    const stats = history.getDataStats();

    if (!stats) {
      return { min: null, max: null, avg: null, count: 0 };
    }

    return {
      min: stats.min as number,
      max: stats.max as number,
      avg: stats.avg as number,
      count: stats.count,
    };
  },

  // NEW: Clear specific sensor history
  clearSensorHistory: <T extends SensorType>(sensorType: T, instance: number) =>
    set((state) => {
      const sensor = state.nmeaData.sensors[sensorType][instance];
      if (sensor && (sensor as any).history) {
        ((sensor as any).history as TimeSeriesBuffer<number>).clear();
      }
      return state;
    }),

  // Alarm threshold management
  updateSensorThresholds: <T extends SensorType>(
    sensorType: T,
    instance: number,
    thresholds: Partial<SensorAlarmThresholds>,
  ) => {
    set((state) => {
      const sensor = state.nmeaData.sensors[sensorType][instance];
      if (!sensor) {
        console.warn(`Cannot update thresholds: ${sensorType}[${instance}] not found`);
        return state;
      }

      // Merge new thresholds with existing
      const updatedThresholds: SensorAlarmThresholds = {
        ...sensor.alarmThresholds,
        ...thresholds,
        lastModified: Date.now(),
      } as SensorAlarmThresholds;

      // Update sensor data with new thresholds
      const updatedSensor = {
        ...sensor,
        alarmThresholds: updatedThresholds,
      };

      return {
        nmeaData: {
          ...state.nmeaData,
          sensors: {
            ...state.nmeaData.sensors,
            [sensorType]: {
              ...state.nmeaData.sensors[sensorType],
              [instance]: updatedSensor,
            },
          },
        },
      };
    });

    // Emit event for threshold update
    get().sensorEventEmitter.emit('threshold-update', { sensorType, instance });
  },

  getSensorThresholds: <T extends SensorType>(
    sensorType: T,
    instance: number,
  ): SensorAlarmThresholds | undefined => {
    const sensor = get().nmeaData.sensors[sensorType][instance];
    return sensor?.alarmThresholds;
  },

  initializeDefaultThresholds: <T extends SensorType>(
    sensorType: T,
    instance: number,
    location?: string,
  ) => {
    const sensor = get().nmeaData.sensors[sensorType][instance];

    // Don't overwrite existing thresholds
    if (sensor?.alarmThresholds) {
      return;
    }

    // Get location from sensor metadata if not provided
    const sensorLocation = location || sensor?.location;

    // Get context from existing thresholds if available
    const context = sensor?.alarmThresholds?.context;

    // Get smart context-aware defaults
    const defaults = getSmartDefaults(sensorType, context, sensorLocation);

    if (!defaults) {
      console.log(
        `No default thresholds available for ${sensorType} at ${sensorLocation || 'default'}`,
      );
      return;
    }

    // Apply defaults with timestamp
    get().updateSensorThresholds(sensorType, instance, {
      ...defaults,
      lastModified: Date.now(),
    });

    console.log(
      `✅ Initialized smart defaults for ${sensorType}[${instance}] at ${
        sensorLocation || 'default'
      } with context:`,
      context,
    );
  },

  updateAlarms: (alarms: Alarm[]) => set({ alarms }),

  reset: () =>
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
      debugMode: false,
    }),

  // Legacy compatibility methods (will be removed after migration)
  getTankData: (instance: number) => {
    const state = get();
    return state.nmeaData.sensors.tank[instance] as TankSensorData | undefined;
  },

  getEngineData: (instance: number) => {
    const state = get();
    return state.nmeaData.sensors.engine[instance] as EngineSensorData | undefined;
  },

  getBatteryData: (instance: number) => {
    const state = get();
    return state.nmeaData.sensors.battery[instance] as BatterySensorData | undefined;
  },

  getTemperatureData: (instance: number) => {
    const state = get();
    return state.nmeaData.sensors.temperature[instance] as TemperatureSensorData | undefined;
  },
}));
