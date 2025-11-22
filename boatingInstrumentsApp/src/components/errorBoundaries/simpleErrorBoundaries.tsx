// Simple Error Boundary Components
// Lightweight error boundaries for testing and basic functionality

import React, { ReactNode, Component, ErrorInfo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';

interface BaseErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface BaseErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  theme?: ThemeColors; // Injected theme
}

// Themed error fallback component
const ThemedErrorFallback: React.FC<{
  error: Error;
  retry: () => void;
}> = ({ error, retry }) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={retry}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
};

// Themed widget error fallback
const ThemedWidgetErrorFallback: React.FC<{
  error: Error;
  retry: () => void;
  widgetId: string;
  widgetType: string;
}> = ({ error, retry, widgetId, widgetType }) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Widget Error ({widgetType})</Text>
      <Text style={styles.errorMessage}>Widget "{widgetId}" encountered an error</Text>
      <TouchableOpacity style={styles.retryButton} onPress={retry}>
        <Text style={styles.retryButtonText}>Reload Widget</Text>
      </TouchableOpacity>
    </View>
  );
};

// Themed connection error fallback
const ThemedConnectionErrorFallback: React.FC<{
  error: Error;
  retry: () => void;
  connectionType?: string;
  hostAddress?: string;
  port?: number;
}> = ({ error, retry, connectionType, hostAddress, port }) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>📡</Text>
      <Text style={styles.errorTitle}>Connection Error ({connectionType?.toUpperCase() || 'UNKNOWN'})</Text>
      <Text style={styles.errorMessage}>Failed to connect to NMEA bridge</Text>
      {hostAddress && (
        <Text style={styles.errorDetails}>Host: {hostAddress}:{port}</Text>
      )}
      <TouchableOpacity style={styles.retryButton} onPress={retry}>
        <Text style={styles.retryButtonText}>Reconnect</Text>
      </TouchableOpacity>
    </View>
  );
};

// Themed data error fallback
const ThemedDataErrorFallback: React.FC<{
  error: Error;
  retry: () => void;
  dataType?: string;
  sourceId?: string;
}> = ({ error, retry, dataType, sourceId }) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>📊</Text>
      <Text style={styles.errorTitle}>Data Processing Error ({dataType?.toUpperCase() || 'UNKNOWN'})</Text>
      <Text style={styles.errorMessage}>Failed to process marine data</Text>
      {sourceId && (
        <Text style={styles.errorDetails}>Source: {sourceId}</Text>
      )}
      <TouchableOpacity style={styles.retryButton} onPress={retry}>
        <Text style={styles.retryButtonText}>Retry Parsing</Text>
      </TouchableOpacity>
    </View>
  );
};

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
    <ThemedErrorFallback error={error} retry={retry} />
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
    <ThemedWidgetErrorFallback 
      error={error} 
      retry={retry} 
      widgetId={this.props.widgetId}
      widgetType={this.props.widgetType}
    />
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
    <ThemedConnectionErrorFallback
      error={error}
      retry={retry}
      connectionType={this.props.connectionType}
      hostAddress={this.props.hostAddress}
      port={this.props.port}
    />
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
    <ThemedDataErrorFallback
      error={error}
      retry={retry}
      dataType={this.props.dataType}
      sourceId={this.props.sourceId}
    />
  );

  render() {
    if (this.state.hasError && this.state.error) {
      return this.renderDataFallback(this.state.error, this.handleRetry);
    }

    return this.props.children;
  }
}

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.surface,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.error,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDetails: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  retryButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    color: theme.surface,
    fontSize: 14,
    fontWeight: '600',
  },
});

// Export aliases for backward compatibility
export const BaseErrorBoundary = SimpleBaseErrorBoundary;
export const WidgetErrorBoundary = SimpleWidgetErrorBoundary;
export const ConnectionErrorBoundary = SimpleConnectionErrorBoundary;
export const DataErrorBoundary = SimpleDataErrorBoundary;