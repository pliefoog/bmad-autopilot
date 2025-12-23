/**
 * ErrorBoundary - React Error Boundary with AppError Support
 *
 * **Purpose:**
 * Catches React component errors and displays user-friendly error UI.
 * Supports AppError dual-message system (dev vs user messages).
 *
 * **Architecture:**
 * - React Error Boundary class component
 * - Displays different messages for dev/production
 * - Shows AppError details when available
 * - Provides reload button for recovery
 * - Logs errors automatically
 *
 * **Usage:**
 * ```tsx
 * // Wrap app or specific components
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 *
 * // Wrap individual sections
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <CriticalFeature />
 * </ErrorBoundary>
 * ```
 *
 * **Benefits:**
 * - ✅ Prevents white screen of death
 * - ✅ User-friendly error messages
 * - ✅ Technical details for developers
 * - ✅ Reload capability
 * - ✅ AppError integration
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { AppError } from '../utils/AppError';
import { log } from '../utils/logging/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error | AppError;
  errorInfo?: ErrorInfo;
}

/**
 * React Error Boundary with AppError support
 *
 * Catches errors in child components and displays fallback UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error
    if (error instanceof AppError) {
      error.logError();
    } else {
      log.app('React error caught by ErrorBoundary', () => ({
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      }));
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = (): void => {
    if (Platform.OS === 'web') {
      window.location.reload();
    } else {
      // Reset state to retry render
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
      });
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <CriticalErrorScreen
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReload={this.handleReload}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Critical Error Screen
 * Displayed when ErrorBoundary catches an error
 */
interface CriticalErrorScreenProps {
  error?: Error | AppError;
  errorInfo?: ErrorInfo;
  onReload: () => void;
}

const CriticalErrorScreen: React.FC<CriticalErrorScreenProps> = ({
  error,
  errorInfo,
  onReload,
}) => {
  const isDev = __DEV__;
  const isAppError = error instanceof AppError;

  // Get appropriate message
  const displayMessage = isAppError
    ? error.getDisplayMessage(isDev)
    : error?.message || 'An unexpected error occurred';

  const userMessage = isAppError ? error.userMessage : 'An unexpected error occurred';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Error Icon */}
        <Text style={styles.icon}>⚠️</Text>

        {/* Title */}
        <Text style={styles.title}>{isDev ? 'Application Error' : 'Something went wrong'}</Text>

        {/* User message (always shown) */}
        <Text style={styles.userMessage}>{userMessage}</Text>

        {/* Dev details (development only) */}
        {isDev && (
          <View style={styles.devDetails}>
            {isAppError && (
              <>
                <Text style={styles.devLabel}>Error Code:</Text>
                <Text style={styles.devText}>{error.code}</Text>

                <Text style={styles.devLabel}>Technical Details:</Text>
                <Text style={styles.devText}>{error.devMessage}</Text>

                {error.context && (
                  <>
                    <Text style={styles.devLabel}>Context:</Text>
                    <Text style={styles.devText}>{JSON.stringify(error.context, null, 2)}</Text>
                  </>
                )}
              </>
            )}
            {!isAppError && error && (
              <>
                <Text style={styles.devLabel}>Error:</Text>
                <Text style={styles.devText}>{error.message}</Text>

                {error.stack && (
                  <>
                    <Text style={styles.devLabel}>Stack:</Text>
                    <Text style={styles.devText}>{error.stack}</Text>
                  </>
                )}
              </>
            )}
            {errorInfo && (
              <>
                <Text style={styles.devLabel}>Component Stack:</Text>
                <Text style={styles.devText}>{errorInfo.componentStack}</Text>
              </>
            )}
          </View>
        )}
        <TouchableOpacity style={styles.reloadButton} onPress={onReload}>
          <Text style={styles.reloadButtonText}>
            {Platform.OS === 'web' ? 'Reload Page' : 'Try Again'}
          </Text>
        </TouchableOpacity>

        {/* Help text */}
        <Text style={styles.helpText}>If this problem persists, please contact support.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    maxWidth: 600,
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  userMessage: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  devDetails: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    marginBottom: 24,
  },
  devLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#888',
    marginTop: 12,
    marginBottom: 4,
  },
  devText: {
    fontSize: 12,
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },
  reloadButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  reloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});
