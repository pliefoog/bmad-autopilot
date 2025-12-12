import { create } from 'zustand';
import { EventEmitter } from 'events';
import { TimeSeriesBuffer } from '../utils/memoryStorageManagement';
import type { 
  SensorsData, 
  SensorType, 
  SensorData,
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
  NavigationSensorData
} from '../types/SensorData';

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
  updateSensorData: <T extends SensorType>(sensorType: T, instance: number, data: Partial<SensorData>) => void;
  getSensorData: <T extends SensorType>(sensorType: T, instance: number) => SensorData | undefined;
  getSensorInstances: <T extends SensorType>(sensorType: T) => Array<{ instance: number; data: SensorData }>;
  
  // History management - NEW: Auto-managed history with adaptive sampling
  getSensorHistory: <T extends SensorType>(
    sensorType: T,
    instance: number,
    options?: {
      timeWindowMs?: number;
      resolution?: 'full' | 'decimated' | 'auto';
      chartWidth?: number;
    }
  ) => Array<{ value: number | Record<string, number>; timestamp: number }>;
  getSessionStats: <T extends SensorType>(
    sensorType: T,
    instance: number
  ) => { min: number | null; max: number | null; avg: number | null; count: number };
  clearSensorHistory: <T extends SensorType>(sensorType: T, instance: number) => void;
  
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
 */
function extractTrackableValue(sensorType: SensorType, data: any): number | null {
  switch(sensorType) {
    case 'depth': return data.depth ?? null;
    case 'speed': return data.overGround ?? data.throughWater ?? null;
    case 'wind': return data.speed ?? null;
    case 'engine': return data.rpm ?? null;
    case 'battery': return data.voltage ?? null;
    case 'temperature': return data.value ?? null;
    default: return null;
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
      navigation: {}
    },
    timestamp: Date.now(),
    messageCount: 0
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
  updateSensorData: <T extends SensorType>(sensorType: T, instance: number, data: Partial<SensorData>) => {
    // 🛡️ PREVENT INFINITE LOOPS: Throttle duplicate updates
    // If the same sensor data comes in within 100ms, skip it entirely
    const updateKey = `${sensorType}-${instance}`;
    const now = Date.now();
    const lastUpdate = lastUpdateTimes.get(updateKey);
    
    if (lastUpdate && (now - lastUpdate) < 100) {
      // Too soon - skip this update to prevent infinite loops
      return;
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
        const hasChanges = Object.keys(data).some(key => {
          const oldVal = (currentSensorData as any)[key];
          const newVal = (data as any)[key];
          // Skip history and timestamp fields in comparison
          if (key === 'history' || key === 'timestamp') {
            return false;
          }
          // Deep comparison for objects, shallow for primitives
          if (typeof newVal === 'object' && newVal !== null && typeof oldVal === 'object' && oldVal !== null) {
            return JSON.stringify(oldVal) !== JSON.stringify(newVal);
          }
          return oldVal !== newVal;
        });
        
        if (!hasChanges) {
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
          600,  // maxRecentEntries
          60,   // maxOldEntries
          60000, // oldDataThresholdMs (1 minute)
          10    // decimationFactor
        );
      }
      
      // GPS-specific priority logic for UTC time updates
      let finalData = data;
      if (sensorType === 'gps' && (data as any).timeSource && (data as any).utcTime) {
        const currentGps = currentSensorData as any;
        const newTimeSource = (data as any).timeSource;
        const currentTimeSource = currentGps?.timeSource;
        
        // Priority: RMC (1) > ZDA (2) > GGA (3)
        const priorities: Record<string, number> = { 'RMC': 1, 'ZDA': 2, 'GGA': 3 };
        const newPriority = priorities[newTimeSource] || 99;
        const currentPriority = currentTimeSource ? (priorities[currentTimeSource] || 99) : 99;
        
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
        timestamp: updateNow
      };
      
      // AUTO-ADD to history (based on sensor type)
      const trackableValue = extractTrackableValue(sensorType, updatedSensorData);
      if (trackableValue !== null && history) {
        history.add(trackableValue, updateNow);
      }
      
      const newNmeaData = {
        ...state.nmeaData,
        sensors: {
          ...state.nmeaData.sensors,
          [sensorType]: {
            ...state.nmeaData.sensors[sensorType],
            [instance]: updatedSensorData
          }
        },
        timestamp: Date.now(),
        messageCount: state.nmeaData.messageCount + 1
      };

      // MEMORY LEAK FIX: Throttle alarm evaluation to prevent 80+ evaluations per second
      let alarms = state.alarms; // Keep existing alarms by default
      
      if ((updateNow - lastAlarmEvaluation) > ALARM_EVALUATION_THROTTLE_MS) {
        alarms = evaluateAlarms(newNmeaData);
        lastAlarmEvaluation = updateNow;
      }

      return {
        nmeaData: newNmeaData,
        alarms
      };
    });
    
    // Emit sensor update event AFTER state update completes (Phase 1 optimization)
    // Only emit if this is a new instance or data has fields to update
    if (isNewInstance || Object.keys(data).length > 0) {
      // Use setTimeout 0 for async emission (React Native compatible)
      setTimeout(() => {
        const currentStore = get();
        currentStore.sensorEventEmitter.emit('sensorUpdate', {
          sensorType,
          instance,
          timestamp: Date.now()
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
    return Object.entries(sensorGroup).map(([instance, data]) => ({
      instance: parseInt(instance, 10),
      data: data as SensorData
    }));
  },

  // Get sensor history - returns ALL data points in time window (no downsampling)
  getSensorHistory: <T extends SensorType>(sensorType: T, instance: number, options?: { timeWindowMs?: number }) => {
    const sensor = get().nmeaData.sensors[sensorType][instance];
    if (!sensor || !(sensor as any).history) return [];
    
    const history = (sensor as any).history as TimeSeriesBuffer<number>;
    
    // Return all data points in time window - no sampling, no decimation
    return options?.timeWindowMs 
      ? history.getRange(Date.now() - options.timeWindowMs, Date.now())
      : history.getAll();
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
      count: stats.count
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

  updateAlarms: (alarms: Alarm[]) => set({ alarms }),

  reset: () => set({
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
        navigation: {}
      },
      timestamp: Date.now(),
      messageCount: 0
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
