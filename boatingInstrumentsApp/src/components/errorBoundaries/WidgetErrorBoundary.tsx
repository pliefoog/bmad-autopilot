// Widget Error Boundary Component
// Specialized error boundary for marine instrument widgets with recovery strategies

import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BaseErrorBoundary, CustomErrorInfo, ErrorBoundaryProps } from './BaseErrorBoundary';
import { ThemeColors } from '../../store/themeStore';
import { themeStore } from '../../store/themeStore';

export interface WidgetErrorBoundaryProps extends Omit<ErrorBoundaryProps, 'category'> {
  widgetId: string;
  widgetType: string;
  widgetTitle?: string;
  enableWidgetRecovery?: boolean;
  onWidgetReplace?: (widgetId: string, newWidgetType: string) => void;
  onWidgetRemove?: (widgetId: string) => void;
  fallbackWidgets?: string[]; // Alternative widget types to try
}

export interface WidgetErrorInfo extends CustomErrorInfo {
  widgetId: string;
  widgetType: string;
  widgetProps?: Record<string, any>;
  dataSource?: string;
  lastValidData?: any;
}

export class WidgetErrorBoundary extends BaseErrorBoundary<WidgetErrorBoundaryProps> {
  constructor(props: WidgetErrorBoundaryProps) {
    super({ ...props, category: 'widget' });
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Create enhanced widget error info
    const widgetErrorInfo: WidgetErrorInfo = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack || undefined,
      timestamp: Date.now(),
      severity: this.determineWidgetErrorSeverity(error),
      category: 'widget',
      widgetId: this.props.widgetId,
      widgetType: this.props.widgetType,
      widgetProps: this.extractSafeProps(),
      context: {
        widgetTitle: this.props.widgetTitle,
        enableRecovery: this.props.enableWidgetRecovery,
        fallbackWidgets: this.props.fallbackWidgets,
      },
    };

    // Store the enhanced error
    this.setState({
      error: widgetErrorInfo,
      hasError: true,
    });

    // Call the error handler with enhanced info
    this.props.onError?.(widgetErrorInfo, errorInfo);

    // Log widget-specific error details
    this.logWidgetError(widgetErrorInfo, error);
  }

  private determineWidgetErrorSeverity(error: Error): WidgetErrorInfo['severity'] {
    const message = error.message.toLowerCase();

    // Critical widget errors
    if (
      message.includes('memory leak') ||
      message.includes('maximum update depth') ||
      message.includes('infinite loop')
    ) {
      return 'critical';
    }

    // High severity widget errors
    if (
      message.includes('cannot read property') ||
      message.includes('undefined is not') ||
      message.includes('null is not') ||
      message.includes('render')
    ) {
      return 'high';
    }

    // Medium severity widget errors
    if (message.includes('data') || message.includes('connection') || message.includes('nmea')) {
      return 'medium';
    }

    return 'medium';
  }

  private extractSafeProps(): Record<string, any> {
    try {
      // Extract only safe-to-serialize props
      const safeProps: Record<string, any> = {};
      const { children, onError, onWidgetReplace, onWidgetRemove, ...otherProps } = this.props;

      Object.entries(otherProps).forEach(([key, value]) => {
        // Only include serializable values
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean' ||
          Array.isArray(value)
        ) {
          safeProps[key] = value;
        }
      });

      return safeProps;
    } catch {
      return { extractionError: true };
    }
  }

  private logWidgetError(widgetError: WidgetErrorInfo, originalError: Error) {
    const logData = {
      timestamp: new Date(widgetError.timestamp).toISOString(),
      widgetId: widgetError.widgetId,
      widgetType: widgetError.widgetType,
      severity: widgetError.severity,
      message: widgetError.message,
      stack: widgetError.stack,
      componentStack: widgetError.componentStack,
      props: widgetError.widgetProps,
      context: widgetError.context,
    };

    if (__DEV__) {
      console.group(`🔧 Widget Error: ${widgetError.widgetType} (${widgetError.widgetId})`);
      console.error('Original Error:', originalError);
      console.groupEnd();
    }
  }

  private handleWidgetReplace = (newWidgetType: string) => {
    this.props.onWidgetReplace?.(this.props.widgetId, newWidgetType);
    this.handleRetry();
  };

  private handleWidgetRemove = () => {
    this.props.onWidgetRemove?.(this.props.widgetId);
  };

  private renderWidgetFallback = (error: WidgetErrorInfo, retry: () => void): ReactNode => {
    const { enableWidgetRecovery = true, fallbackWidgets = [] } = this.props;
    const canReplace = enableWidgetRecovery && fallbackWidgets.length > 0;
    const theme = themeStore.getState().theme;

    return (
      <View style={styles(theme).widgetErrorContainer}>
        <View style={styles(theme).widgetErrorHeader}>
          <Text style={styles(theme).widgetErrorIcon}>⚠️</Text>
          <Text style={styles(theme).widgetErrorTitle}>
            {this.props.widgetTitle || this.props.widgetType} Error
          </Text>
        </View>

        <View style={styles(theme).widgetErrorBody}>
          <Text style={styles(theme).widgetErrorMessage}>
            {error.severity === 'critical'
              ? 'This widget encountered a critical error and needs to be replaced or removed.'
              : 'This widget is temporarily unavailable due to an error.'}
          </Text>

          {__DEV__ && (
            <View style={styles(theme).widgetDebugInfo}>
              <Text style={styles(theme).debugTitle}>Widget Debug Info:</Text>
              <Text style={styles(theme).debugText}>ID: {error.widgetId}</Text>
              <Text style={styles(theme).debugText}>Type: {error.widgetType}</Text>
              <Text style={styles(theme).debugText}>Severity: {error.severity}</Text>
              <Text style={styles(theme).debugText}>Message: {error.message}</Text>
            </View>
          )}
        </View>

        <View style={styles(theme).widgetErrorActions}>
          {error.severity !== 'critical' && (
            <TouchableOpacity style={styles(theme).retryButton} onPress={retry}>
              <Text style={styles(theme).retryButtonText}>Retry Widget</Text>
            </TouchableOpacity>
          )}
          {canReplace && (
            <View style={styles(theme).replacementOptions}>
              <Text style={styles(theme).replacementTitle}>Try Alternative:</Text>
              {fallbackWidgets.slice(0, 3).map((widgetType, index) => (
                <TouchableOpacity
                  key={widgetType}
                  style={styles(theme).replaceButton}
                  onPress={() => this.handleWidgetReplace(widgetType)}
                >
                  <Text style={styles(theme).replaceButtonText}>
                    {widgetType.charAt(0).toUpperCase() + widgetType.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles(theme).removeButton} onPress={this.handleWidgetRemove}>
            <Text style={styles(theme).removeButtonText}>Remove Widget</Text>
          </TouchableOpacity>
        </View>

        {error.severity === 'critical' && (
          <View style={styles(theme).criticalWidgetWarning}>
            <Text style={styles(theme).criticalText}>
              This widget has been disabled due to critical errors. Please replace or remove it to
              continue.
            </Text>
          </View>
        )}
      </View>
    );
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return this.renderWidgetFallback(this.state.error as WidgetErrorInfo, this.handleRetry);
    }

    return this.props.children;
  }
}

const styles = (theme: ThemeColors) =>
  StyleSheet.create({
    widgetErrorContainer: {
      flex: 1,
      padding: 16,
      backgroundColor: theme.warning,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 150,
    },
    widgetErrorHeader: {
      alignItems: 'center',
      marginBottom: 12,
    },
    widgetErrorIcon: {
      fontSize: 24,
      marginBottom: 4,
    },
    widgetErrorTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.text,
      textAlign: 'center',
    },
    widgetErrorBody: {
      marginBottom: 12,
      alignItems: 'center',
    },
    widgetErrorMessage: {
      fontSize: 12,
      color: theme.text,
      textAlign: 'center',
      lineHeight: 16,
      marginBottom: 8,
    },
    widgetDebugInfo: {
      backgroundColor: theme.surfaceDim,
      padding: 8,
      borderRadius: 4,
      width: '100%',
      maxWidth: 200,
    },
    debugTitle: {
      fontSize: 10,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    debugText: {
      fontSize: 9,
      color: theme.textSecondary,
      fontFamily: 'monospace',
      marginBottom: 2,
    },
    widgetErrorActions: {
      alignItems: 'center',
      gap: 8,
    },
    retryButton: {
      backgroundColor: theme.success,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 4,
    },
    retryButtonText: {
      color: theme.surface,
      fontSize: 12,
      fontWeight: '600',
    },
    replacementOptions: {
      alignItems: 'center',
      marginVertical: 8,
    },
    replacementTitle: {
      fontSize: 10,
      color: theme.text,
      marginBottom: 4,
      fontWeight: '500',
    },
    replaceButton: {
      backgroundColor: theme.interactive,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 3,
      marginVertical: 2,
    },
    replaceButtonText: {
      color: theme.surface,
      fontSize: 10,
      fontWeight: '500',
    },
    removeButton: {
      backgroundColor: theme.error,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 3,
    },
    removeButtonText: {
      color: theme.surface,
      fontSize: 10,
      fontWeight: '500',
    },
    criticalWidgetWarning: {
      backgroundColor: theme.error,
      padding: 8,
      borderRadius: 4,
      marginTop: 8,
      borderWidth: 1,
      borderColor: theme.borderDark,
    },
    criticalText: {
      fontSize: 10,
      color: theme.surface,
      textAlign: 'center',
      fontWeight: '500',
    },
  });
