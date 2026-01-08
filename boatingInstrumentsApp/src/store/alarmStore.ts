import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CriticalAlarmType } from '../services/alarms/types';
import { AlarmLevel } from '../types/AlarmTypes';

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
  levelMuting: Record<AlarmLevel, boolean>;
}

interface AlarmState {
  activeAlarms: Alarm[];
  alarmHistory: Alarm[];
  thresholds: AlarmThreshold[];
  settings: AlarmSettings;
  maxHistorySize: number;
  // Critical alarm system integration
  criticalAlarmManager?: any; // AlarmManager type not available
  criticalAlarmMonitors?: any; // CriticalAlarmMonitors type not available
  criticalAlarmsEnabled: boolean;
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
  // Critical alarm system actions
  initializeCriticalAlarmSystem: () => Promise<void>;
  triggerCriticalAlarm: (
    type: CriticalAlarmType,
    data: { value: number; threshold: number; message?: string },
  ) => Promise<void>;
  enableCriticalAlarms: (enabled: boolean) => void;
  // GPS and Autopilot monitoring actions
  updateGPSStatus: (gpsData: {
    fixType?: number;
    satellites?: number;
    lastUpdate?: number;
  }) => void;
  updateAutopilotStatus: (autopilotData: {
    engaged?: boolean;
    status?: 'active' | 'standby' | 'failed' | 'disconnected';
    lastHeartbeat?: number;
    mode?: string;
  }) => void;
}

type AlarmStore = AlarmState & AlarmActions;

const STORAGE_VERSION = 2; // v2: numeric alarm levels (0|1|2|3)

const defaultSettings: AlarmSettings = {
  soundEnabled: true,
  vibrationEnabled: true,
  autoAcknowledge: false,
  autoAcknowledgeTime: 30000, // 30 seconds
  levelMuting: {
    0: false, // NONE
    1: false, // STALE
    2: false, // WARNING
    3: false, // CRITICAL
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
  // Battery voltage monitoring
  {
    id: 'battery-low-warning',
    name: 'Low Battery Voltage',
    dataPath: 'electrical.batteryVoltage',
    type: 'min',
    value: 12.0,
    level: 'warning',
    enabled: true,
    hysteresis: 0.2,
  },
  {
    id: 'battery-low-critical',
    name: 'Critical Battery Voltage',
    dataPath: 'electrical.batteryVoltage',
    type: 'min',
    value: 11.0,
    level: 'critical',
    enabled: true,
    hysteresis: 0.2,
  },
];

// Utility to get nested object value by path
const getNestedValue = (obj: any, path: string): number | undefined => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

// Map threshold IDs to critical alarm types for marine safety system integration
const mapThresholdToCriticalAlarmType = (thresholdId: string): CriticalAlarmType | null => {
  if (thresholdId.includes('shallow-water') || thresholdId.includes('critical-depth')) {
    return CriticalAlarmType.SHALLOW_WATER;
  }
  if (thresholdId.includes('engine-temp') && thresholdId.includes('critical')) {
    return CriticalAlarmType.ENGINE_OVERHEAT;
  }
  if (thresholdId.includes('battery') && thresholdId.includes('critical')) {
    return CriticalAlarmType.LOW_BATTERY;
  }
  // GPS and autopilot failures would be detected differently - not from thresholds
  return null;
};

export const useAlarmStore = create<AlarmStore>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        activeAlarms: [],
        alarmHistory: [],
        thresholds: defaultThresholds,
        settings: defaultSettings,
        maxHistorySize: 1000,
        // Critical alarm system state
        criticalAlarmManager: undefined,
        criticalAlarmMonitors: undefined,
        criticalAlarmsEnabled: true,

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
                : alarm,
            ),
          }));
        },

        clearAlarm: (id) =>
          set((state) => ({
            activeAlarms: state.activeAlarms.filter((alarm) => alarm.id !== id),
          })),

        clearAllAlarms: () => set({ activeAlarms: [] }),

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
              threshold.id === id ? { ...threshold, ...updates } : threshold,
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

          state.thresholds.forEach(async (threshold) => {
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
            const existingAlarm = state.activeAlarms.find((alarm) => alarm.source === threshold.id);

            if (shouldAlarm && !existingAlarm) {
              // Check if this is a critical alarm type and trigger through critical alarm system
              const criticalAlarmType = mapThresholdToCriticalAlarmType(threshold.id);

              if (criticalAlarmType && state.criticalAlarmsEnabled) {
                // Trigger critical alarm through marine safety system
                try {
                  await get().triggerCriticalAlarm(criticalAlarmType, {
                    value,
                    threshold: threshold.value,
                    message,
                  });
                } catch (error) {
                  console.error(
                    'AlarmStore: Failed to trigger critical alarm, falling back to regular alarm',
                    error,
                  );
                  // Fallback to regular alarm system
                  get().addAlarm({
                    message,
                    level: threshold.level,
                    source: threshold.id,
                    value,
                    threshold: threshold.value,
                  });
                }
              } else {
                // Regular alarm
                get().addAlarm({
                  message,
                  level: threshold.level,
                  source: threshold.id,
                  value,
                  threshold: threshold.value,
                });
              }
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

        // Critical alarm system actions
        initializeCriticalAlarmSystem: async () => {
          try {
            const { AlarmManager, CriticalAlarmMonitors, DEFAULT_MARINE_ALARM_CONFIG } =
              await import('../services/alarms');
            const alarmManager = AlarmManager.getInstance(DEFAULT_MARINE_ALARM_CONFIG);

            // Create monitors with callback to trigger critical alarms
            const monitors = new CriticalAlarmMonitors(
              {
                gpsTimeoutMs: 60000, // 1 minute
                autopilotHeartbeatTimeoutMs: 10000, // 10 seconds
                monitoringIntervalMs: 5000, // 5 seconds
              },
              async (type, data) => {
                // Callback to trigger critical alarms through AlarmManager
                await get().triggerCriticalAlarm(type, data);
              },
            );

            set((state) => ({
              criticalAlarmManager: alarmManager,
              criticalAlarmMonitors: monitors,
            }));

            // Start monitoring GPS and autopilot systems
            monitors.startMonitoring();
          } catch (error) {
            console.error('AlarmStore: Failed to initialize critical alarm system', error);
          }
        },

        triggerCriticalAlarm: async (
          type: CriticalAlarmType,
          data: { value: number; threshold: number; message?: string },
        ) => {
          const state = get();

          if (!state.criticalAlarmsEnabled) {
            console.warn('AlarmStore: Critical alarms are disabled');
            return;
          }

          if (!state.criticalAlarmManager) {
            console.warn('AlarmStore: Critical alarm system not initialized, initializing now...');
            await get().initializeCriticalAlarmSystem();
          }

          const alarmManager = get().criticalAlarmManager;
          if (alarmManager) {
            await alarmManager.triggerCriticalAlarm(type, data);
          }
        },

        enableCriticalAlarms: (enabled: boolean) => {
          set((state) => ({
            criticalAlarmsEnabled: enabled,
          }));
        },

        // GPS and Autopilot monitoring actions
        updateGPSStatus: (gpsData) => {
          const state = get();
          if (state.criticalAlarmMonitors) {
            state.criticalAlarmMonitors.updateGPSStatus(gpsData);
          }
        },

        updateAutopilotStatus: (autopilotData) => {
          const state = get();
          if (state.criticalAlarmMonitors) {
            state.criticalAlarmMonitors.updateAutopilotStatus(autopilotData);
          }
        },
      }),
      {
        name: 'alarm-store',
        storage: createJSONStorage(() => AsyncStorage),
        version: STORAGE_VERSION,

        partialize: (state) => ({
          thresholds: state.thresholds,
          settings: state.settings,
          alarmHistory: state.alarmHistory.slice(-100), // Keep last 100 in storage
        }),

        // Migration: Clean slate on version mismatch (string → numeric levels)
        migrate: (persistedState: any, version: number) => {
          if (version !== STORAGE_VERSION) {
            console.warn(
              '[AlarmStore] Migration: Wiping alarm history due to version mismatch',
              `(stored: v${version}, expected: v${STORAGE_VERSION})`,
            );
            // Return default state, wipe old string-based alarms
            return {
              thresholds: defaultThresholds,
              settings: defaultSettings,
              alarmHistory: [],
            };
          }
          return persistedState;
        },
      },
    ),
    { name: 'Alarm Store', enabled: __DEV__ },
  ),
);
