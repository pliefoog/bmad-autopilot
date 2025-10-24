import { create } from 'zustand';

// Add theme types for marine display modes
export type ThemeMode = 'day' | 'night' | 'red-night' | 'auto';

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  accent: string;
  warning: string;
  error: string;
  success: string;
  border: string;
  shadow: string;
}

export type AlarmLevel = 'info' | 'warning' | 'critical';

export interface Alarm {
  id: string;
  message: string;
  level: AlarmLevel;
  timestamp: number;
}
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'no-data';

// Import PGN data types
import type { PgnData, EnginePgnData, BatteryPgnData, TankPgnData } from '../services/nmea/pgnParser';

export interface NmeaData {
  depth?: number;
  depthSource?: 'DBT' | 'DPT' | 'DBK';  // Track which sentence provided depth data
  depthReferencePoint?: 'transducer' | 'waterline' | 'keel';  // What the depth measurement refers to
  depthTimestamp?: number;
  // Multiple depth sources for priority selection (Raymarine-style)
  depthSources?: {
    DBT?: { value: number; timestamp: number; referencePoint: 'transducer' };
    DPT?: { value: number; timestamp: number; referencePoint: 'waterline' };
    DBK?: { value: number; timestamp: number; referencePoint: 'keel' };
  };
  stw?: number;    // Speed Through Water (from VHW/log/paddle wheel)
  windAngle?: number;
  windSpeed?: number;
  relativeWindAngle?: number;  // From $IIVWR
  relativeWindSpeed?: number;  // From $IIVWR
  rateOfTurn?: number;         // From $TIROT
  waterTemperature?: number;
  gpsPosition?: { latitude: number; longitude: number };
  gpsQuality?: { 
    fixType?: number;  // 0=no fix, 1=GPS, 2=DGPS, 3=PPS
    satellites?: number;
    hdop?: number;     // Horizontal dilution of precision
  };
  utcTime?: number; // UTC time from GPS as timestamp
  cog?: number;
  sog?: number;    // Speed Over Ground (from VTG/RMC/GPS)
  heading?: number;
  engine?: {
    rpm?: number;
    coolantTemp?: number;
    oilPressure?: number;
  };
  battery?: {
    house?: number;
    engine?: number;
  };
  tanks?: {
    fuel?: number;
    water?: number;
    waste?: number;
  };
  autopilot?: {
    mode?: string;
    targetHeading?: number;
    actualHeading?: number;
    rudderPosition?: number;
    rateOfTurn?: number;
    active?: boolean;
    commandStatus?: 'sending' | 'success' | 'error' | 'timeout';
    commandMessage?: string;
    lastCommandTime?: number;
  };
  // PGN data for instance detection
  pgnData?: {
    [pgnNumber: string]: PgnData | PgnData[];
  };
  // Add more fields as needed
}

interface NmeaStore {
  connectionStatus: ConnectionStatus;
  nmeaData: NmeaData;
  alarms: Alarm[];
  alarmHistory: Alarm[];
  lastError?: string;
  debugMode: boolean;
  rawSentences: string[];
  setConnectionStatus: (status: ConnectionStatus) => void;
  setNmeaData: (data: Partial<NmeaData>) => void;
  updateAlarms: (alarms: Alarm[]) => void;
  setLastError: (err?: string) => void;
  setDebugMode: (enabled: boolean) => void;
  addRawSentence: (sentence: string) => void;
  clearRawSentences: () => void;
  addPgnData: (pgnData: PgnData) => void;
  reset: () => void;
}

// Utility: Evaluate NMEA data and return triggered alarms
function evaluateAlarms(nmeaData: NmeaData): Alarm[] {
  const alarms: Alarm[] = [];
  const now = Date.now();
  if (nmeaData.depth !== undefined && nmeaData.depth < 2) {
    alarms.push({
      id: 'shallow-depth',
      message: `Shallow depth: ${nmeaData.depth}m`,
      level: 'critical',
      timestamp: now,
    });
  }
  if (nmeaData.battery?.house !== undefined && nmeaData.battery.house < 11.5) {
    alarms.push({
      id: 'low-house-battery',
      message: `Low house battery: ${nmeaData.battery.house}V`,
      level: 'warning',
      timestamp: now,
    });
  }
  if (nmeaData.engine?.coolantTemp !== undefined && nmeaData.engine.coolantTemp > 95) {
    alarms.push({
      id: 'engine-overheat',
      message: `Engine coolant temp high: ${nmeaData.engine.coolantTemp}°C`,
      level: 'critical',
      timestamp: now,
    });
  }
  // Add more alarm rules as needed
  return alarms;
}

export const useNmeaStore = create<NmeaStore>((set) => ({
  connectionStatus: 'disconnected',
  nmeaData: {
    // Start with undefined values - widgets will show "--" until real data arrives
    depth: undefined,
    stw: undefined,     // Speed Through Water
    windAngle: undefined,
    windSpeed: undefined,
    waterTemperature: undefined,
    gpsPosition: undefined,
    gpsQuality: undefined,
    cog: undefined,
    sog: undefined,     // Speed Over Ground
    heading: undefined,
    engine: {
      rpm: undefined,
      coolantTemp: undefined,
      oilPressure: undefined,
    },
    battery: {
      house: undefined,
      engine: undefined,
    },
    tanks: {
      fuel: undefined,
      water: undefined,
      waste: undefined,
    },
    autopilot: {
      mode: undefined,
      targetHeading: undefined,
      rudderPosition: undefined,
      rateOfTurn: undefined,
      active: false,
    },
  },
  alarms: [],
  alarmHistory: [],
  lastError: undefined,
  debugMode: false,
  rawSentences: [],
  setConnectionStatus: (status: ConnectionStatus) => set(() => ({ connectionStatus: status })),
  setNmeaData: (data: Partial<NmeaData>) => set((state: NmeaStore) => {
    const newData = { ...state.nmeaData, ...data };
    const alarms = evaluateAlarms(newData);
    const newHistory = [...state.alarmHistory];
    alarms.forEach((alarm: Alarm) => {
      if (!newHistory.some((h: Alarm) => h.id === alarm.id && h.timestamp === alarm.timestamp)) {
        newHistory.push(alarm);
      }
    });
    return { nmeaData: newData, alarms, alarmHistory: newHistory };
  }),
  updateAlarms: (alarms: Alarm[]) => set((state: NmeaStore) => {
    const newHistory = [...state.alarmHistory];
    alarms.forEach((alarm: Alarm) => {
      if (!newHistory.some((h: Alarm) => h.id === alarm.id && h.timestamp === alarm.timestamp)) {
        newHistory.push(alarm);
      }
    });
    return { alarms, alarmHistory: newHistory };
  }),
  setLastError: (err?: string) => set(() => ({ lastError: err })),
  setDebugMode: (enabled: boolean) => set(() => ({ debugMode: enabled })),
  addRawSentence: (sentence: string) => set((state: NmeaStore) => {
    const newSentences = [...state.rawSentences, sentence];
    // Keep only last 100 sentences to prevent memory issues
    if (newSentences.length > 100) {
      newSentences.shift();
    }
    return { rawSentences: newSentences };
  }),
  clearRawSentences: () => set(() => ({ rawSentences: [] })),
  addPgnData: (pgnData: PgnData) => set((state: NmeaStore) => {
    const currentPgnData = state.nmeaData.pgnData || {};
    const pgnNumber = pgnData.pgn.toString();
    
    // Store PGN data, handling multiple instances
    if (currentPgnData[pgnNumber]) {
      // If existing data exists, convert to array or add to array
      if (Array.isArray(currentPgnData[pgnNumber])) {
        // Add to existing array, but limit to 16 instances for performance
        const existingArray = currentPgnData[pgnNumber] as PgnData[];
        const updatedArray = [...existingArray.slice(-15), pgnData];
        currentPgnData[pgnNumber] = updatedArray;
      } else {
        // Convert single item to array
        currentPgnData[pgnNumber] = [currentPgnData[pgnNumber] as PgnData, pgnData];
      }
    } else {
      // First instance of this PGN
      currentPgnData[pgnNumber] = pgnData;
    }
    
    return {
      nmeaData: {
        ...state.nmeaData,
        pgnData: currentPgnData,
      }
    };
  }),
  reset: () => set(() => ({ 
    connectionStatus: 'disconnected', 
    nmeaData: {}, 
    alarms: [], 
    alarmHistory: [], 
    lastError: undefined,
    debugMode: false,
    rawSentences: []
  })),
}));
