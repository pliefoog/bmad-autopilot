// Simple Error Boundary Components
// Lightweight error boundaries for testing and basic functionality

import React, { ReactNode, Component, ErrorInfo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface BaseErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface BaseErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export class SimpleBaseErrorBoundary extends Component<BaseErrorBoundaryProps, BaseErrorBoundaryState> {
  constructor(props: BaseErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): BaseErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  renderDefaultFallback = (error: Error, retry: () => void): ReactNode => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={retry}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }
      return this.renderDefaultFallback(this.state.error, this.handleRetry);
    }

    return this.props.children;
  }
}

// Widget Error Boundary
interface WidgetErrorBoundaryProps extends BaseErrorBoundaryProps {
  widgetId: string;
  widgetType: string;
}

export class SimpleWidgetErrorBoundary extends Component<WidgetErrorBoundaryProps, BaseErrorBoundaryState> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): BaseErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  renderWidgetFallback = (error: Error, retry: () => void): ReactNode => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Widget Error ({this.props.widgetType})</Text>
      <Text style={styles.errorMessage}>Widget "{this.props.widgetId}" encountered an error</Text>
      <TouchableOpacity style={styles.retryButton} onPress={retry}>
        <Text style={styles.retryButtonText}>Reload Widget</Text>
      </TouchableOpacity>
    </View>
  );

  render() {
    if (this.state.hasError && this.state.error) {
      return this.renderWidgetFallback(this.state.error, this.handleRetry);
    }

    return this.props.children;
  }
}

// Connection Error Boundary
interface ConnectionErrorBoundaryProps extends BaseErrorBoundaryProps {
  connectionType?: 'wifi' | 'bluetooth' | 'usb' | 'serial';
  hostAddress?: string;
  port?: number;
}

export class SimpleConnectionErrorBoundary extends Component<ConnectionErrorBoundaryProps, BaseErrorBoundaryState> {
  constructor(props: ConnectionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): BaseErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  renderConnectionFallback = (error: Error, retry: () => void): ReactNode => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>📡</Text>
      <Text style={styles.errorTitle}>Connection Error ({this.props.connectionType?.toUpperCase() || 'UNKNOWN'})</Text>
      <Text style={styles.errorMessage}>Failed to connect to NMEA bridge</Text>
      {this.props.hostAddress && (
        <Text style={styles.errorDetails}>Host: {this.props.hostAddress}:{this.props.port}</Text>
      )}
      <TouchableOpacity style={styles.retryButton} onPress={retry}>
        <Text style={styles.retryButtonText}>Reconnect</Text>
      </TouchableOpacity>
    </View>
  );

  render() {
    if (this.state.hasError && this.state.error) {
      return this.renderConnectionFallback(this.state.error, this.handleRetry);
    }

    return this.props.children;
  }
}

// Data Error Boundary
interface DataErrorBoundaryProps extends BaseErrorBoundaryProps {
  dataType?: 'nmea0183' | 'nmea2000' | 'json' | 'binary';
  sourceId?: string;
}

export class SimpleDataErrorBoundary extends Component<DataErrorBoundaryProps, BaseErrorBoundaryState> {
  constructor(props: DataErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): BaseErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  renderDataFallback = (error: Error, retry: () => void): ReactNode => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>📊</Text>
      <Text style={styles.errorTitle}>Data Processing Error ({this.props.dataType?.toUpperCase() || 'UNKNOWN'})</Text>
      <Text style={styles.errorMessage}>Failed to process marine data</Text>
      {this.props.sourceId && (
        <Text style={styles.errorDetails}>Source: {this.props.sourceId}</Text>
      )}
      <TouchableOpacity style={styles.retryButton} onPress={retry}>
        <Text style={styles.retryButtonText}>Retry Parsing</Text>
      </TouchableOpacity>
    </View>
  );

  render() {
    if (this.state.hasError && this.state.error) {
      return this.renderDataFallback(this.state.error, this.handleRetry);
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDetails: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#F3F4F6',
    fontSize: 14,
    fontWeight: '600',
  },
});

// Export aliases for backward compatibility
export const BaseErrorBoundary = SimpleBaseErrorBoundary;
export const WidgetErrorBoundary = SimpleWidgetErrorBoundary;
export const ConnectionErrorBoundary = SimpleConnectionErrorBoundary;
export const DataErrorBoundary = SimpleDataErrorBoundary;