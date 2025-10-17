// Error Boundaries Index
// Centralized exports for all error boundary components

export { BaseErrorBoundary } from './BaseErrorBoundary';
export type { ErrorBoundaryProps, CustomErrorInfo } from './BaseErrorBoundary';

export { WidgetErrorBoundary } from './WidgetErrorBoundary';
export type { WidgetErrorBoundaryProps, WidgetErrorInfo } from './WidgetErrorBoundary';

export { ConnectionErrorBoundary } from './ConnectionErrorBoundary';
export type { ConnectionErrorBoundaryProps, ConnectionErrorInfo } from './ConnectionErrorBoundary';

export { DataErrorBoundary } from './DataErrorBoundary';
export type { DataErrorBoundaryProps, DataErrorInfo } from './DataErrorBoundary';

// HOC utilities
export {
  createErrorBoundary,
  withWidgetErrorBoundary,
  withConnectionErrorBoundary,
  withDataErrorBoundary,
} from './errorBoundaryHOCs';
export type { ErrorBoundaryConfig } from './errorBoundaryHOCs';

// Error severity levels for consistent error handling
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

// Error categories for error classification
export enum ErrorCategory {
  WIDGET = 'widget',
  CONNECTION = 'connection',
  DATA = 'data',
  GENERAL = 'general',
}

// Common error types for marine applications
export const MarineErrorTypes = {
  NMEA_PARSING_ERROR: 'nmea_parsing_error',
  CONNECTION_LOST: 'connection_lost',
  SENSOR_MALFUNCTION: 'sensor_malfunction',
  DATA_CORRUPTION: 'data_corruption',
  AUTOPILOT_ERROR: 'autopilot_error',
  GPS_SIGNAL_LOST: 'gps_signal_lost',
  NETWORK_TIMEOUT: 'network_timeout',
  VALIDATION_FAILED: 'validation_failed',
} as const;

export type MarineErrorType = typeof MarineErrorTypes[keyof typeof MarineErrorTypes];