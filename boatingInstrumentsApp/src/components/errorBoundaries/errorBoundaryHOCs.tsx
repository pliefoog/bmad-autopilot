// Error Boundary HOCs (Higher Order Components)
// Utility functions for wrapping components with error boundaries

import React from 'react';
import { BaseErrorBoundary } from './BaseErrorBoundary';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';
import { ConnectionErrorBoundary } from './ConnectionErrorBoundary';
import { DataErrorBoundary } from './DataErrorBoundary';

export interface ErrorBoundaryConfig {
  enableRetry?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  isolateError?: boolean;
  fallbackComponent?: React.ComponentType<any>;
}

// Helper function to create error boundary with default config
export const createErrorBoundary = <T extends React.ComponentType<any>>(
  WrappedComponent: T,
  config: ErrorBoundaryConfig = {}
): React.ComponentType<React.ComponentProps<T>> => {
  const {
    enableRetry = true,
    retryAttempts = 3,
    retryDelay = 1000,
    isolateError = true,
  } = config;

  return (props: React.ComponentProps<T>) => (
    <BaseErrorBoundary
      enableRetry={enableRetry}
      retryAttempts={retryAttempts}
      retryDelay={retryDelay}
      isolateError={isolateError}
    >
      <WrappedComponent {...props} />
    </BaseErrorBoundary>
  );
};

// HOC for widget components with error boundaries
export const withWidgetErrorBoundary = <T extends React.ComponentType<any>>(
  WrappedComponent: T,
  widgetType?: string,
  widgetId?: string
): React.ComponentType<React.ComponentProps<T>> => {
  return (props: React.ComponentProps<T>) => (
    <WidgetErrorBoundary
      widgetId={widgetId || `widget-${Date.now()}`}
      widgetType={widgetType || 'unknown'}
      enableRetry={true}
      retryAttempts={3}
      enableWidgetRecovery={true}
    >
      <WrappedComponent {...props} />
    </WidgetErrorBoundary>
  );
};

// HOC for connection components with error boundaries
export const withConnectionErrorBoundary = <T extends React.ComponentType<any>>(
  WrappedComponent: T,
  connectionType?: 'wifi' | 'bluetooth' | 'usb' | 'serial',
  hostAddress?: string,
  port?: number
): React.ComponentType<React.ComponentProps<T>> => {
  return (props: React.ComponentProps<T>) => (
    <ConnectionErrorBoundary
      connectionType={connectionType}
      hostAddress={hostAddress}
      port={port}
      enableAutoReconnect={true}
      enableRetry={true}
      retryAttempts={5}
    >
      <WrappedComponent {...props} />
    </ConnectionErrorBoundary>
  );
};

// HOC for data processing components with error boundaries
export const withDataErrorBoundary = <T extends React.ComponentType<any>>(
  WrappedComponent: T,
  dataType?: 'nmea0183' | 'nmea2000' | 'json' | 'binary',
  sourceId?: string
): React.ComponentType<React.ComponentProps<T>> => {
  return (props: React.ComponentProps<T>) => (
    <DataErrorBoundary
      dataType={dataType}
      sourceId={sourceId}
      enableDataValidation={true}
      maxParsingErrors={10}
      enableRetry={true}
      retryAttempts={3}
    >
      <WrappedComponent {...props} />
    </DataErrorBoundary>
  );
};