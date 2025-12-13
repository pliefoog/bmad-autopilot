// Store and State Types
// Centralized type definitions for state management, stores, and data persistence

import { NmeaData } from './nmea.types';
import { ConnectionConfig, ConnectionMetrics } from './connection.types';
import { WidgetConfig, DashboardConfig } from './widget.types';
import { ThemeSettings } from './theme.types';

/**
 * Store configuration and metadata
 */
export interface StoreConfig {
  name: string;
  version: string;
  persistent: boolean;
  storageKey?: string;
  migrations?: StoreMigration[];
  middleware?: StoreMiddleware[];
  devtools?: boolean;
}

export interface StoreMigration {
  version: string;
  migrate: (state: any) => any;
}

export type StoreMiddleware = (config: any) => (set: any, get: any, api: any) => any;

/**
 * Alarm system types
 */
export type AlarmLevel = 'info' | 'warning' | 'critical' | 'emergency';

export type AlarmCategory = 
  | 'navigation'
  | 'engine'
  | 'safety'
  | 'weather'
  | 'system'
  | 'communication'
  | 'autopilot';

export interface Alarm {
  id: string;
  type: string;
  category: AlarmCategory;
  level: AlarmLevel;
  title: string;
  message: string;
  value?: number;
  threshold?: number;
  unit?: string;
  timestamp: number;
  acknowledged: boolean;
  resolved: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  resolvedAt?: number;
  source: string;
  context?: Record<string, any>;
}

export interface AlarmThreshold {
  id: string;
  dataType: keyof NmeaData;
  condition: 'above' | 'below' | 'equal' | 'not-equal' | 'rate-change';
  value: number;
  hysteresis?: number;
  level: AlarmLevel;
  enabled: boolean;
  description?: string;
  unit?: string;
  category: AlarmCategory;
}

export interface AlarmSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  flashEnabled: boolean;
  popupEnabled: boolean;
  logEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  autoAcknowledge: boolean;
  autoAcknowledgeDelay: number;
  snoozeEnabled: boolean;
  snoozeDuration: number;
  levelSettings: Record<AlarmLevel, AlarmLevelSettings>;
}

export interface AlarmLevelSettings {
  soundFile?: string;
  volume: number;
  repeat: boolean;
  repeatInterval: number;
  color: string;
  priority: number;
}

/**
 * Store state interfaces
 */
export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'no-data' | 'error' | 'reconnecting';
  config: ConnectionConfig;
  metrics: ConnectionMetrics;
  lastError?: string;
  isAutoConnecting: boolean;
  debugMode: boolean;
}

export interface NmeaState {
  data: NmeaData;
  metrics: {
    totalMessages: number;
    validMessages: number;
    invalidMessages: number;
    messageTypes: Record<string, number>;
    parseErrors: string[];
    dataFreshness: Record<keyof NmeaData, number>;
    lastUpdate: number;
  };
  isReceivingData: boolean;
  debugMode: boolean;
}

export interface AlarmState {
  alarms: Alarm[];
  thresholds: AlarmThreshold[];
  settings: AlarmSettings;
  activeCount: number;
  unacknowledgedCount: number;
  criticalCount: number;
  lastAlarmTime?: number;
  silenced: boolean;
  silencedUntil?: number;
}



export interface SettingsState {
  theme: ThemeSettings;
  units: {
    speed: 'knots' | 'mph' | 'kph';
    distance: 'nm' | 'miles' | 'km';
    depth: 'feet' | 'meters' | 'fathoms';
    temperature: 'celsius' | 'fahrenheit';
    pressure: 'hpa' | 'inhg' | 'psi';
    wind: 'knots' | 'mph' | 'kph' | 'mps';
  };
  display: {
    keepScreenOn: boolean;
    brightness: number;
    orientation: 'auto' | 'portrait' | 'landscape';
    fullscreen: boolean;
  };
  audio: {
    enabled: boolean;
    volume: number;
    alarmSounds: boolean;
    clickSounds: boolean;
  };
  privacy: {
    analytics: boolean;
    crashReports: boolean;
    locationSharing: boolean;
  };
  developer: {
    debugMode: boolean;
    showPerformanceMetrics: boolean;
    enableLogging: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

/**
 * Store action interfaces
 */
export interface ConnectionActions {
  setStatus: (status: ConnectionState['status']) => void;
  setConfig: (config: Partial<ConnectionConfig>) => void;
  setLastError: (error?: string) => void;
  setAutoConnecting: (auto: boolean) => void;
  setDebugMode: (enabled: boolean) => void;
  updateMetrics: (metrics: Partial<ConnectionMetrics>) => void;
  incrementPacketsReceived: () => void;
  incrementPacketsDropped: () => void;
  incrementReconnectAttempts: () => void;
  resetMetrics: () => void;
  reset: () => void;
}

export interface NmeaActions {
  updateData: (data: Partial<NmeaData>) => void;
  clearData: () => void;
  setReceivingData: (receiving: boolean) => void;
  incrementValidMessages: () => void;
  incrementInvalidMessages: () => void;
  incrementMessageType: (messageType: string) => void;
  updateDataFreshness: (dataType: keyof NmeaData) => void;
  addParseError: (error: string) => void;
  clearParseErrors: () => void;
  setDebugMode: (enabled: boolean) => void;
  reset: () => void;
}

export interface AlarmActions {
  addAlarm: (alarm: Omit<Alarm, 'id' | 'timestamp'>) => void;
  removeAlarm: (id: string) => void;
  acknowledgeAlarm: (id: string, acknowledgedBy?: string) => void;
  resolveAlarm: (id: string) => void;
  clearAlarms: () => void;
  addThreshold: (threshold: Omit<AlarmThreshold, 'id'>) => void;
  updateThreshold: (id: string, threshold: Partial<AlarmThreshold>) => void;
  removeThreshold: (id: string) => void;
  updateSettings: (settings: Partial<AlarmSettings>) => void;
  silenceAlarms: (duration?: number) => void;
  unsilenceAlarms: () => void;
  testAlarm: (level: AlarmLevel) => void;
  reset: () => void;
}

// REMOVED: Legacy WidgetActions interface
// Current widget actions are defined in src/store/widgetStore.ts
// No manual widget addition - pure auto-discovery architecture

export interface SettingsActions {
  updateTheme: (theme: Partial<ThemeSettings>) => void;
  updateUnits: (units: Partial<SettingsState['units']>) => void;
  updateDisplay: (display: Partial<SettingsState['display']>) => void;
  updateAudio: (audio: Partial<SettingsState['audio']>) => void;
  updatePrivacy: (privacy: Partial<SettingsState['privacy']>) => void;
  updateDeveloper: (developer: Partial<SettingsState['developer']>) => void;
  resetToDefaults: () => void;
  exportSettings: () => string;
  importSettings: (settings: string) => void;
}

/**
 * Combined store types
 */
export type ConnectionStore = ConnectionState & ConnectionActions;
export type NmeaStore = NmeaState & NmeaActions;
export type AlarmStore = AlarmState & AlarmActions;
// WidgetStore: See src/store/widgetStore.ts for current implementation
export type SettingsStore = SettingsState & SettingsActions;

/**
 * Store selectors and computed values
 */
export interface StoreSelectors<T> {
  [key: string]: (state: T, ...args: any[]) => any;
}

export interface ConnectionSelectors extends StoreSelectors<ConnectionStore> {
  isConnected: (state: ConnectionStore) => boolean;
  getConnectionInfo: (state: ConnectionStore) => string;
  getUptime: (state: ConnectionStore) => number;
  getPacketLossRate: (state: ConnectionStore) => number;
}

export interface NmeaSelectors extends StoreSelectors<NmeaStore> {
  getPosition: (state: NmeaStore) => { lat: number; lon: number } | null;
  getWindData: (state: NmeaStore) => { speed: number; direction: number } | null;
  isDataFresh: (state: NmeaStore, dataType: keyof NmeaData, maxAge: number) => boolean;
  getDataAge: (state: NmeaStore, dataType: keyof NmeaData) => number;
}

export interface AlarmSelectors extends StoreSelectors<AlarmStore> {
  getActiveAlarms: (state: AlarmStore) => Alarm[];
  getCriticalAlarms: (state: AlarmStore) => Alarm[];
  getUnacknowledgedAlarms: (state: AlarmStore) => Alarm[];
  getAlarmsByCategory: (state: AlarmStore, category: AlarmCategory) => Alarm[];
  shouldPlaySound: (state: AlarmStore) => boolean;
}

/**
 * Store persistence and hydration
 */
export interface StorePersistence {
  version: number;
  migrate?: (persistedState: any, version: number) => any;
  merge?: (persistedState: any, currentState: any) => any;
  whitelist?: string[];
  blacklist?: string[];
  transform?: {
    in?: (state: any) => any;
    out?: (state: any) => any;
  };
}

export interface StoreHydration {
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
}

/**
 * Store subscriptions and listeners
 */
export type StoreListener<T> = (state: T, previousState: T) => void;

export interface StoreSubscription {
  unsubscribe: () => void;
}

/**
 * Export utility types
 */
export type StoreState = ConnectionState | NmeaState | AlarmState | SettingsState;
export type StoreActions = ConnectionActions | NmeaActions | AlarmActions | SettingsActions;
export type Store = ConnectionStore | NmeaStore | AlarmStore | SettingsStore;

/**
 * Story 6.6 Specific Store Interfaces
 */
export interface GenericStoreState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

export interface NMEAStoreActions {
  updateDepth: (value: number, unit: string) => void;
  updateSpeed: (sog: number | null, stw: number | null, unit: string) => void;
  updateWind: (awa: number, aws: number, twa?: number, tws?: number) => void;
  resetAllData: () => void;
}

// REMOVED: Legacy WidgetStoreActions interface
// Current widget actions are defined in src/store/widgetStore.ts
// Event-driven widget lifecycle with auto-discovery