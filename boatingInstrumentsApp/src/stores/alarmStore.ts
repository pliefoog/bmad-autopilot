import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AlarmLevel = 'info' | 'warning' | 'critical';

export interface Alarm {
  id: string;
  message: string;
  level: AlarmLevel;
  timestamp: number;
  source?: string;
  value?: number;
  threshold?: number;
  acknowledged?: boolean;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
}

export interface AlarmThreshold {
  id: string;
  name: string;
  dataPath: string; // e.g., 'depth', 'engine.coolantTemp'
  type: 'min' | 'max' | 'range';
  value: number;
  maxValue?: number; // For range type
  level: AlarmLevel;
  enabled: boolean;
  hysteresis?: number; // Prevent alarm flickering
}

export interface AlarmSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  autoAcknowledge: boolean;
  autoAcknowledgeTime: number; // milliseconds
  muteUntil?: number; // timestamp
  levelMuting: {
    info: boolean;
    warning: boolean;
    critical: boolean;
  };
}

interface AlarmState {
  activeAlarms: Alarm[];
  alarmHistory: Alarm[];
  thresholds: AlarmThreshold[];
  settings: AlarmSettings;
  maxHistorySize: number;
}

interface AlarmActions {
  addAlarm: (alarm: Omit<Alarm, 'id' | 'timestamp'>) => void;
  acknowledgeAlarm: (id: string, acknowledgedBy?: string) => void;
  clearAlarm: (id: string) => void;
  clearAllAlarms: () => void;
  addThreshold: (threshold: Omit<AlarmThreshold, 'id'>) => void;
  updateThreshold: (id: string, threshold: Partial<AlarmThreshold>) => void;
  removeThreshold: (id: string) => void;
  updateSettings: (settings: Partial<AlarmSettings>) => void;
  muteAlarmsFor: (minutes: number) => void;
  evaluateThresholds: (data: any) => void;
  getUnacknowledgedAlarms: () => Alarm[];
  reset: () => void;
}

type AlarmStore = AlarmState & AlarmActions;

const defaultSettings: AlarmSettings = {
  soundEnabled: true,
  vibrationEnabled: true,
  autoAcknowledge: false,
  autoAcknowledgeTime: 30000, // 30 seconds
  levelMuting: {
    info: false,
    warning: false,
    critical: false,
  },
};

const defaultThresholds: AlarmThreshold[] = [
  {
    id: 'shallow-water',
    name: 'Shallow Water',
    dataPath: 'depth',
    type: 'min',
    value: 2.0,
    level: 'warning',
    enabled: true,
    hysteresis: 0.1,
  },
  {
    id: 'critical-depth',
    name: 'Critical Depth',
    dataPath: 'depth',
    type: 'min',
    value: 1.0,
    level: 'critical',
    enabled: true,
    hysteresis: 0.1,
  },
  {
    id: 'engine-temp-high',
    name: 'Engine Temperature High',
    dataPath: 'engine.coolantTemp',
    type: 'max',
    value: 90,
    level: 'warning',
    enabled: true,
    hysteresis: 2,
  },
  {
    id: 'engine-temp-critical',
    name: 'Engine Temperature Critical',
    dataPath: 'engine.coolantTemp',
    type: 'max',
    value: 100,
    level: 'critical',
    enabled: true,
    hysteresis: 2,
  },
];

// Utility to get nested object value by path
const getNestedValue = (obj: any, path: string): number | undefined => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

export const useAlarmStore = create<AlarmStore>()(
  persist(
    (set, get) => ({
      // State
      activeAlarms: [],
      alarmHistory: [],
      thresholds: defaultThresholds,
      settings: defaultSettings,
      maxHistorySize: 1000,

      // Actions
      addAlarm: (alarmData) => {
        const alarm: Alarm = {
          ...alarmData,
          id: `alarm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        };

        set((state) => {
          const newHistory = [...state.alarmHistory, alarm];
          if (newHistory.length > state.maxHistorySize) {
            newHistory.splice(0, newHistory.length - state.maxHistorySize);
          }

          return {
            activeAlarms: [...state.activeAlarms, alarm],
            alarmHistory: newHistory,
          };
        });
      },

      acknowledgeAlarm: (id, acknowledgedBy = 'user') => {
        const now = Date.now();
        set((state) => ({
          activeAlarms: state.activeAlarms.map((alarm) =>
            alarm.id === id
              ? {
                  ...alarm,
                  acknowledged: true,
                  acknowledgedAt: now,
                  acknowledgedBy,
                }
              : alarm
          ),
        }));
      },

      clearAlarm: (id) =>
        set((state) => ({
          activeAlarms: state.activeAlarms.filter((alarm) => alarm.id !== id),
        })),

      clearAllAlarms: () =>
        set({ activeAlarms: [] }),

      addThreshold: (thresholdData) => {
        const threshold: AlarmThreshold = {
          ...thresholdData,
          id: `threshold-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };

        set((state) => ({
          thresholds: [...state.thresholds, threshold],
        }));
      },

      updateThreshold: (id, updates) =>
        set((state) => ({
          thresholds: state.thresholds.map((threshold) =>
            threshold.id === id ? { ...threshold, ...updates } : threshold
          ),
        })),

      removeThreshold: (id) =>
        set((state) => ({
          thresholds: state.thresholds.filter((threshold) => threshold.id !== id),
        })),

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      muteAlarmsFor: (minutes) => {
        const muteUntil = Date.now() + minutes * 60 * 1000;
        set((state) => ({
          settings: { ...state.settings, muteUntil },
        }));
      },

      evaluateThresholds: (data) => {
        const state = get();
        const now = Date.now();

        // Skip if alarms are muted
        if (state.settings.muteUntil && now < state.settings.muteUntil) {
          return;
        }

        state.thresholds.forEach((threshold) => {
          if (!threshold.enabled) return;

          const value = getNestedValue(data, threshold.dataPath);
          if (value === undefined) return;

          let shouldAlarm = false;
          let message = '';

          switch (threshold.type) {
            case 'min':
              shouldAlarm = value < threshold.value;
              message = `${threshold.name}: ${value} below ${threshold.value}`;
              break;
            case 'max':
              shouldAlarm = value > threshold.value;
              message = `${threshold.name}: ${value} above ${threshold.value}`;
              break;
            case 'range':
              shouldAlarm = threshold.maxValue
                ? value < threshold.value || value > threshold.maxValue
                : false;
              message = `${threshold.name}: ${value} outside range ${threshold.value}-${threshold.maxValue}`;
              break;
          }

          // Check if alarm already exists for this threshold
          const existingAlarm = state.activeAlarms.find(
            (alarm) => alarm.source === threshold.id
          );

          if (shouldAlarm && !existingAlarm) {
            // Add new alarm
            get().addAlarm({
              message,
              level: threshold.level,
              source: threshold.id,
              value,
              threshold: threshold.value,
            });
          } else if (!shouldAlarm && existingAlarm) {
            // Clear alarm (value returned to normal)
            get().clearAlarm(existingAlarm.id);
          }
        });
      },

      getUnacknowledgedAlarms: () => {
        const state = get();
        return state.activeAlarms.filter((alarm) => !alarm.acknowledged);
      },

      reset: () =>
        set({
          activeAlarms: [],
          alarmHistory: [],
        }),
    }),
    {
      name: 'alarm-store',
      partialize: (state) => ({
        thresholds: state.thresholds,
        settings: state.settings,
        alarmHistory: state.alarmHistory.slice(-100), // Keep last 100 in storage
      }),
    }
  )
);