// Types Index
// Centralized export point for all TypeScript type definitions

/**
 * Widget system types
 */
export * from './widget.types';

/**
 * NMEA data and protocol types
 */
export * from './nmea.types';

/**
 * Connection and networking types
 */
export * from './connection.types';

/**
 * Theme and styling types
 */
export * from './theme.types';

/**
 * Autopilot system types
 */
export * from './autopilot.types';

/**
 * Service layer types
 */
export * from './service.types';

// Story 6.6 specific exports
export type { StoryConnectionState, StorageService, PlaybackService } from './service.types';

export type { StoryThemeColors, StoryThemeSpacing, StoryThemeTypography } from './theme.types';

/**
 * Store and state management types (with renamed exports to avoid conflicts)
 */
export type {
  // State interfaces with Store prefix to avoid conflicts
  ConnectionState as StoreConnectionState,
  NmeaState as StoreNmeaState,
  AlarmState as StoreAlarmState,
  WidgetState as StoreWidgetState,
  SettingsState as StoreSettingsState,

  // Action interfaces
  ConnectionActions,
  NmeaActions,
  AlarmActions,
  WidgetActions,
  SettingsActions,

  // Combined store types
  ConnectionStore,
  NmeaStore,
  AlarmStore,
  WidgetStore,
  SettingsStore,

  // Alarm types (renamed to avoid conflicts)
  Alarm as StoreAlarm,
  AlarmLevel,
  AlarmCategory,
  AlarmThreshold,
  AlarmSettings,
  AlarmLevelSettings,

  // Store configuration and utilities
  StoreConfig,
  StoreMigration,
  StoreMiddleware,
  StoreSelectors,
  ConnectionSelectors,
  NmeaSelectors,
  AlarmSelectors,
  StorePersistence,
  StoreHydration,
  StoreListener,
  StoreSubscription,
} from './store.types';

/**
 * Navigation types (existing)
 */
export * from './navigation.types';

/**
 * Utility types and generic helpers
 */
export * from './util.types';

/**
 * Common utility types
 */
export type Timestamp = number;
export type UUID = string;
export type Coordinates = { latitude: number; longitude: number };
export type Dimensions = { width: number; height: number };
export type Position = { x: number; y: number };
export type RGB = { r: number; g: number; b: number };
export type RGBA = RGB & { a: number };
export type HSL = { h: number; s: number; l: number };

/**
 * Data quality and validation types
 */
export type DataQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'invalid';

export interface DataQualityMetrics {
  accuracy: number; // 0-100
  completeness: number; // 0-100
  freshness: number; // age in milliseconds
  consistency: number; // 0-100
  validity: boolean;
  source: string;
  timestamp: Timestamp;
}

/**
 * Marine units and conversions
 */
export type SpeedUnit = 'knots' | 'mph' | 'kph' | 'mps';
export type DistanceUnit = 'nm' | 'miles' | 'km' | 'meters' | 'feet';
export type DepthUnit = 'feet' | 'meters' | 'fathoms';
export type TemperatureUnit = 'celsius' | 'fahrenheit' | 'kelvin';
export type PressureUnit = 'hpa' | 'inhg' | 'psi' | 'kpa' | 'mbar';
export type WindUnit = 'knots' | 'mph' | 'kph' | 'mps' | 'beaufort';
export type AngleUnit = 'degrees' | 'radians' | 'mils';

export interface UnitConversion {
  from: string;
  to: string;
  factor: number;
  offset?: number;
}

/**
 * Geospatial types
 */
export interface GeoPosition {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp?: Timestamp;
}

export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GeoDistance {
  value: number;
  unit: DistanceUnit;
  bearing?: number;
}

/**
 * Time and scheduling types
 */
export interface TimeInterval {
  start: Timestamp;
  end: Timestamp;
  duration: number;
}

export interface ScheduledTask {
  id: string;
  name: string;
  schedule: string; // cron expression
  enabled: boolean;
  lastRun?: Timestamp;
  nextRun?: Timestamp;
  handler: () => Promise<void>;
}

/**
 * Notification and messaging types
 */
export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  title: string;
  message: string;
  level: NotificationLevel;
  timestamp: Timestamp;
  persistent: boolean;
  actions?: NotificationAction[];
  read: boolean;
}

export interface NotificationAction {
  label: string;
  action: string;
  style?: 'default' | 'destructive';
}

/**
 * Error handling types
 */
export interface AppError {
  id: string;
  code: string;
  message: string;
  details?: string;
  timestamp: Timestamp;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  category: string;
  context?: Record<string, any>;
  stack?: string;
  recoverable: boolean;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
  errorId?: string;
}

/**
 * Performance monitoring types
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Timestamp;
  context?: Record<string, any>;
}

export interface PerformanceReport {
  id: string;
  timestamp: Timestamp;
  duration: number;
  metrics: PerformanceMetric[];
  summary: {
    fps: number;
    memoryUsage: number;
    renderTime: number;
    networkLatency: number;
  };
}

/**
 * Accessibility types
 */
export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  voiceControl: boolean;
}

export interface AccessibilityInfo {
  role: string;
  label: string;
  hint?: string;
  value?: string;
  state?: Record<string, boolean>;
  actions?: string[];
}

/**
 * File and data types
 */
export type FileType = 'nmea' | 'log' | 'config' | 'backup' | 'export' | 'chart';

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: FileType;
  created: Timestamp;
  modified: Timestamp;
  checksum?: string;
}

export interface DataExport {
  id: string;
  name: string;
  description?: string;
  format: 'json' | 'csv' | 'xml' | 'binary';
  data: any;
  metadata: {
    version: string;
    timestamp: Timestamp;
    source: string;
    checksum: string;
  };
}

/**
 * Search and filtering types
 */
export interface SearchCriteria {
  query: string;
  filters: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  query: SearchCriteria;
  timestamp: Timestamp;
}

/**
 * Validation types
 */
export interface ValidationRule {
  field: string;
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code?: string;
}

/**
 * API and networking types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Timestamp;
  metadata?: Record<string, any>;
}

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
}

/**
 * Event system types
 */
export interface AppEvent {
  type: string;
  payload?: any;
  timestamp: Timestamp;
  source: string;
  target?: string;
  propagate?: boolean;
}

export type EventListener = (event: AppEvent) => void;

export interface EventSubscription {
  id: string;
  type: string;
  listener: EventListener;
  once: boolean;
  unsubscribe: () => void;
}

/**
 * Re-export commonly used types with shorter names
 */
export type { WidgetConfig as Widget } from './widget.types';
export type { NmeaData as NMEAData } from './nmea.types';
export type { ConnectionConfig as Connection } from './connection.types';
export type { Theme } from './theme.types';
export type { AutopilotCommand as APCommand } from './autopilot.types';
export type {
  Alarm as AlarmData,
  GenericStoreState,
  NMEAStoreActions,
  WidgetStoreActions,
} from './store.types';
