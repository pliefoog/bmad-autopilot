// Base Error Boundary Component
// Provides foundational error handling functionality for all specialized boundaries

import React, { Component, ErrorInfo as ReactErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemeColors } from '../../store/themeStore';
import { themeStore } from '../../store/themeStore';

export interface CustomErrorInfo {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'widget' | 'connection' | 'data' | 'ui' | 'navigation' | 'general';
  context?: Record<string, any>;
  userAgent?: string;
  url?: string;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: CustomErrorInfo, retry: () => void) => ReactNode;
  onError?: (error: CustomErrorInfo, errorInfo: ReactErrorInfo) => void;
  enableRetry?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  isolateError?: boolean;
  category?: CustomErrorInfo['category'];
  className?: string;
  testId?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: CustomErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
}

export class BaseErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error: {
        message: error.message,
        stack: error.stack,
        timestamp: Date.now(),
        severity: 'high',
        category: 'general',
      },
    };
  }

  componentDidCatch(error: Error, errorInfo: ReactErrorInfo) {
    const enhancedError: CustomErrorInfo = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack || undefined,
      timestamp: Date.now(),
      severity: this.determineSeverity(error),
      category: this.props.category || 'general',
      context: {
        props: this.props,
        retryCount: this.state.retryCount,
      },
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location?.href : undefined,
    };

    this.setState({ error: enhancedError });

    // Call error handler
    this.props.onError?.(enhancedError, errorInfo);

    // Log error for debugging
    this.logError(enhancedError, error);
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.retryTimeouts = [];
  }

  private determineSeverity(error: Error): CustomErrorInfo['severity'] {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('connection')) {
      return 'medium';
    }

    if (message.includes('parse') || message.includes('syntax')) {
      return 'high';
    }

    if (message.includes('memory') || message.includes('maximum call stack')) {
      return 'critical';
    }

    return 'medium';
  }

  private logError(errorInfo: CustomErrorInfo, originalError: Error) {
    const logData = {
      timestamp: new Date(errorInfo.timestamp).toISOString(),
      category: errorInfo.category,
      severity: errorInfo.severity,
      message: errorInfo.message,
      stack: errorInfo.stack,
      componentStack: errorInfo.componentStack,
      context: errorInfo.context,
      retryCount: this.state.retryCount,
    };

    // In development, log to console
    if (__DEV__) {
      console.group(`🚨 Error Boundary: ${errorInfo.category}`);
      console.error('Error:', originalError);
      console.groupEnd();
    }

    // In production, send to error reporting service
    if (!__DEV__) {
      // This would integrate with services like Sentry, Bugsnag, etc.
      this.reportError(logData);
    }
  }

  private reportError(errorData: any) {
    // Placeholder for error reporting service integration
    // Example: Sentry.captureException(errorData);
  }

  protected handleRetry = () => {
    const { retryAttempts = 3, retryDelay = 1000 } = this.props;

    if (this.state.retryCount >= retryAttempts) {
      return;
    }

    this.setState({ isRetrying: true });

    const timeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        retryCount: this.state.retryCount + 1,
        isRetrying: false,
      });
    }, retryDelay * Math.pow(2, this.state.retryCount)); // Exponential backoff

    this.retryTimeouts.push(timeout);
  };

  private renderDefaultFallback() {
    const { error, retryCount, isRetrying } = this.state;
    const { enableRetry = true, retryAttempts = 3 } = this.props;
    const theme = themeStore.getState().theme;

    if (!error) return null;

    const canRetry = enableRetry && retryCount < retryAttempts;

    return (
      <View style={styles(theme).errorContainer}>
        <View style={styles(theme).errorHeader}>
          <Text style={styles(theme).errorIcon}>⚠️</Text>
          <Text style={styles(theme).errorTitle}>Something went wrong</Text>
        </View>

        <View style={styles(theme).errorBody}>
          <Text style={styles(theme).errorMessage}>
            {error.severity === 'critical'
              ? 'A critical error occurred that requires attention.'
              : 'An unexpected error occurred. The application is trying to recover.'}
          </Text>

          {__DEV__ && (
            <View style={styles(theme).debugInfo}>
              <Text style={styles(theme).debugTitle}>Debug Information:</Text>
              <Text style={styles(theme).debugText}>Category: {error.category}</Text>
              <Text style={styles(theme).debugText}>Severity: {error.severity}</Text>
              <Text style={styles(theme).debugText}>Message: {error.message}</Text>
              {retryCount > 0 && (
                <Text style={styles(theme).debugText}>Retry Attempts: {retryCount}</Text>
              )}
            </View>
          )}
        </View>

        {canRetry && (
          <View style={styles(theme).errorActions}>
            <TouchableOpacity
              style={[styles(theme).retryButton, isRetrying && styles(theme).retryButtonDisabled]}
              onPress={this.handleRetry}
              disabled={isRetrying}
            >
              <Text style={styles(theme).retryButtonText}>
                {isRetrying ? 'Retrying...' : 'Try Again'}
              </Text>
            </TouchableOpacity>

            <Text style={styles(theme).retryInfo}>
              {retryAttempts - retryCount} attempts remaining
            </Text>
          </View>
        )}
        {error.severity === 'critical' && (
          <View style={styles(theme).criticalWarning}>
            <Text style={styles(theme).criticalText}>
              Please restart the application if the problem persists.
            </Text>
          </View>
        )}
      </View>
    );
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.handleRetry);
      }

      return this.renderDefaultFallback();
    }

    return this.props.children;
  }
}

const styles = (theme: ThemeColors) =>
  StyleSheet.create({
    errorContainer: {
      flex: 1,
      padding: 20,
      backgroundColor: theme.appBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorHeader: {
      alignItems: 'center',
      marginBottom: 20,
    },
    errorIcon: {
      fontSize: 48,
      marginBottom: 10,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.error,
      textAlign: 'center',
    },
    errorBody: {
      maxWidth: 400,
      marginBottom: 20,
    },
    errorMessage: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 15,
    },
    debugInfo: {
      backgroundColor: theme.surfaceDim,
      padding: 15,
      borderRadius: 8,
      marginTop: 10,
    },
    debugTitle: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
    },
    debugText: {
      fontSize: 11,
      color: theme.textSecondary,
      fontFamily: 'monospace',
      marginBottom: 4,
    },
    errorActions: {
      alignItems: 'center',
    },
    retryButton: {
      backgroundColor: theme.interactive,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 6,
      marginBottom: 10,
    },
    retryButtonDisabled: {
      backgroundColor: theme.textSecondary,
    },
    retryButtonText: {
      color: theme.text,
      fontSize: 14,
      fontWeight: '600',
    },
    retryInfo: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    criticalWarning: {
      backgroundColor: theme.surfaceHighlight,
      padding: 12,
      borderRadius: 6,
      marginTop: 20,
      borderWidth: 1,
      borderColor: theme.error,
    },
    criticalText: {
      fontSize: 12,
      color: theme.error,
      textAlign: 'center',
      fontWeight: '500',
    },
  });
