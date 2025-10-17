// Store Architecture - Domain-Separated Zustand Stores
// Centralized exports for all stores with clean domain separation

// Core data stores
export { useNmeaStore } from './nmeaStore';
export type { NmeaData, NmeaMetrics } from './nmeaStore';

// Connection management
export { useConnectionStore } from './connectionStore';
export type { 
  ConnectionStatus, 
  ConnectionConfig, 
  ConnectionMetrics 
} from './connectionStore';

// Alarm and threshold management
export { useAlarmStore } from './alarmStore';
export type { 
  Alarm, 
  AlarmLevel, 
  AlarmThreshold, 
  AlarmSettings 
} from './alarmStore';

// Widget and dashboard management
export { useWidgetStore } from './widgetStore';
export type { 
  WidgetConfig, 
  WidgetLayout, 
  DashboardConfig, 
  WidgetPreset 
} from './widgetStore';

// Settings and preferences
export { useSettingsStore } from './settingsStore';
export type { 
  ThemeMode, 
  ThemeColors, 
  ThemeSettings 
} from './settingsStore';

// Store composition for global state management
export const useStores = () => {
  const nmea = useNmeaStore();
  const connection = useConnectionStore();
  const alarms = useAlarmStore();
  const widgets = useWidgetStore();
  const settings = useSettingsStore();
  
  return {
    nmea,
    connection,
    alarms,
    widgets,
    settings,
  };
};