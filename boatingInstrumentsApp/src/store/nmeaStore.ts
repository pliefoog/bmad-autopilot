import { create } from 'zustand';
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
  AutopilotSensorData
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
  
  // Connection management
  setConnectionStatus: (status: ConnectionStatus) => void;
  setLastError: (err?: string) => void;
  setDebugMode: (enabled: boolean) => void;
  
  // Sensor data management
  updateSensorData: <T extends SensorType>(sensorType: T, instance: number, data: Partial<SensorData>) => void;
  getSensorData: <T extends SensorType>(sensorType: T, instance: number) => SensorData | undefined;
  getSensorInstances: <T extends SensorType>(sensorType: T) => Array<{ instance: number; data: SensorData }>;
  
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
      autopilot: {}
    },
    timestamp: Date.now(),
    messageCount: 0
  },
  alarms: [],
  lastError: undefined,
  debugMode: false,

  // Connection management
  setConnectionStatus: (status: ConnectionStatus) => set({ connectionStatus: status }),
  setLastError: (err?: string) => set({ lastError: err }),
  setDebugMode: (enabled: boolean) => set({ debugMode: enabled }),

  // Core sensor data management
  updateSensorData: <T extends SensorType>(sensorType: T, instance: number, data: Partial<SensorData>) => 
    set((state) => {
      const currentSensorData = state.nmeaData.sensors[sensorType][instance] || {};
      const updatedSensorData = {
        ...currentSensorData,
        ...data,
        timestamp: Date.now()
      };

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

      // Evaluate alarms with new data
      const alarms = evaluateAlarms(newNmeaData);

      return {
        nmeaData: newNmeaData,
        alarms
      };
    }),

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
        autopilot: {}
      },
      timestamp: Date.now(),
      messageCount: 0
    },
    alarms: [],
    lastError: undefined,
    debugMode: false
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
