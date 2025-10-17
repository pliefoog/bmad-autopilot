// Connection Error Boundary Component
// Specialized error boundary for NMEA connection and network-related errors

import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BaseErrorBoundary, CustomErrorInfo, ErrorBoundaryProps } from './BaseErrorBoundary';

export interface ConnectionErrorBoundaryProps extends Omit<ErrorBoundaryProps, 'category'> {
  connectionId?: string;
  connectionType?: 'wifi' | 'bluetooth' | 'usb' | 'serial';
  hostAddress?: string;
  port?: number;
  enableAutoReconnect?: boolean;
  onReconnectAttempt?: () => void;
  onConnectionReset?: () => void;
  onFallbackMode?: () => void;
}

export interface ConnectionErrorInfo extends CustomErrorInfo {
  connectionId?: string;
  connectionType?: string;
  networkDetails?: {
    host?: string;
    port?: number;
    protocol?: string;
    lastConnected?: number;
    attemptCount?: number;
  };
  diagnostics?: {
    pingResult?: boolean;
    dnsResolution?: boolean;
    portAccessible?: boolean;
    firewallIssue?: boolean;
  };
}

export class ConnectionErrorBoundary extends React.Component<ConnectionErrorBoundaryProps, { hasError: boolean; error?: ConnectionErrorInfo }> {
  constructor(props: ConnectionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Create enhanced connection error info
    const connectionErrorInfo: ConnectionErrorInfo = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack || undefined,
      timestamp: Date.now(),
      severity: this.determineConnectionErrorSeverity(error),
      category: 'connection',
      connectionId: this.props.connectionId,
      connectionType: this.props.connectionType,
      networkDetails: {
        host: this.props.hostAddress,
        port: this.props.port,
        protocol: this.props.connectionType === 'wifi' ? 'TCP' : 'unknown',
      },
      diagnostics: this.performQuickDiagnostics(error),
      context: {
        enableAutoReconnect: this.props.enableAutoReconnect,
        connectionType: this.props.connectionType,
      },
    };

    // Store the enhanced error
    this.setState({ 
      error: connectionErrorInfo,
      hasError: true,
    });

    // Call the error handler with enhanced info
    this.props.onError?.(connectionErrorInfo, errorInfo);

    // Log connection-specific error details
    this.logConnectionError(connectionErrorInfo, error);
  }

  private determineConnectionErrorSeverity(error: Error): ConnectionErrorInfo['severity'] {
    const message = error.message.toLowerCase();
    
    // Critical connection errors
    if (message.includes('network error') || 
        message.includes('connection failed') ||
        message.includes('timeout') ||
        message.includes('unreachable')) {
      return 'high';
    }
    
    // Medium severity connection errors
    if (message.includes('disconnected') ||
        message.includes('lost connection') ||
        message.includes('authentication') ||
        message.includes('permission')) {
      return 'medium';
    }
    
    // Low severity connection errors
    if (message.includes('retry') ||
        message.includes('reconnecting') ||
        message.includes('slow')) {
      return 'low';
    }
    
    return 'medium';
  }

  private performQuickDiagnostics(error: Error): ConnectionErrorInfo['diagnostics'] {
    const message = error.message.toLowerCase();
    
    return {
      pingResult: !message.includes('unreachable') && !message.includes('timeout'),
      dnsResolution: !message.includes('not found') && !message.includes('dns'),
      portAccessible: !message.includes('port') && !message.includes('refused'),
      firewallIssue: message.includes('firewall') || message.includes('blocked'),
    };
  }

  private logConnectionError(connectionError: ConnectionErrorInfo, originalError: Error) {
    const logData = {
      timestamp: new Date(connectionError.timestamp).toISOString(),
      connectionId: connectionError.connectionId,
      connectionType: connectionError.connectionType,
      severity: connectionError.severity,
      message: connectionError.message,
      networkDetails: connectionError.networkDetails,
      diagnostics: connectionError.diagnostics,
      stack: connectionError.stack,
    };

    if (__DEV__) {
      console.group(`🌐 Connection Error: ${connectionError.connectionType || 'Unknown'}`);
      console.error('Original Error:', originalError);
      console.log('Connection Error Info:', logData);
      console.groupEnd();
    }
  }

  private handleReconnect = () => {
    this.props.onReconnectAttempt?.();
    this.handleRetry();
  };

  private handleConnectionReset = () => {
    this.props.onConnectionReset?.();
    // Reset after a short delay to allow reset to complete
    setTimeout(() => this.handleRetry(), 1000);
  };

  private handleFallbackMode = () => {
    this.props.onFallbackMode?.();
    // Don't retry immediately in fallback mode
  };

  private renderConnectionFallback = (error: ConnectionErrorInfo, retry: () => void): ReactNode => {
    const { enableAutoReconnect = true, connectionType = 'unknown' } = this.props;
    const diagnostics = error.diagnostics || {};

    return (
      <View style={styles.connectionErrorContainer}>
        <View style={styles.connectionErrorHeader}>
          <Text style={styles.connectionErrorIcon}>📡</Text>
          <Text style={styles.connectionErrorTitle}>
            Connection Error ({connectionType.toUpperCase()})
          </Text>
        </View>

        <View style={styles.connectionErrorBody}>
          <Text style={styles.connectionErrorMessage}>
            {error.severity === 'high'
              ? 'Unable to establish connection to the NMEA bridge. Please check your network settings.'
              : 'Connection temporarily interrupted. The system is attempting to reconnect.'
            }
          </Text>

          {error.networkDetails && (
            <View style={styles.networkInfo}>
              <Text style={styles.networkTitle}>Connection Details:</Text>
              {error.networkDetails.host && (
                <Text style={styles.networkText}>Host: {error.networkDetails.host}</Text>
              )}
              {error.networkDetails.port && (
                <Text style={styles.networkText}>Port: {error.networkDetails.port}</Text>
              )}
              <Text style={styles.networkText}>Type: {connectionType}</Text>
            </View>
          )}

          <View style={styles.diagnosticsInfo}>
            <Text style={styles.diagnosticsTitle}>Network Diagnostics:</Text>
            <View style={styles.diagnosticRow}>
              <Text style={styles.diagnosticLabel}>Network Reachable:</Text>
              <Text style={[styles.diagnosticValue, diagnostics.pingResult ? styles.success : styles.error]}>
                {diagnostics.pingResult ? '✓' : '✗'}
              </Text>
            </View>
            <View style={styles.diagnosticRow}>
              <Text style={styles.diagnosticLabel}>DNS Resolution:</Text>
              <Text style={[styles.diagnosticValue, diagnostics.dnsResolution ? styles.success : styles.error]}>
                {diagnostics.dnsResolution ? '✓' : '✗'}
              </Text>
            </View>
            <View style={styles.diagnosticRow}>
              <Text style={styles.diagnosticLabel}>Port Accessible:</Text>
              <Text style={[styles.diagnosticValue, diagnostics.portAccessible ? styles.success : styles.error]}>
                {diagnostics.portAccessible ? '✓' : '✗'}
              </Text>
            </View>
            {diagnostics.firewallIssue && (
              <View style={styles.diagnosticRow}>
                <Text style={styles.diagnosticLabel}>Firewall Issue:</Text>
                <Text style={[styles.diagnosticValue, styles.warning]}>⚠️</Text>
              </View>
            )}
          </View>

          {__DEV__ && (
            <View style={styles.connectionDebugInfo}>
              <Text style={styles.debugTitle}>Debug Info:</Text>
              <Text style={styles.debugText}>Severity: {error.severity}</Text>
              <Text style={styles.debugText}>Message: {error.message}</Text>
              {error.connectionId && (
                <Text style={styles.debugText}>Connection ID: {error.connectionId}</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.connectionErrorActions}>
          <TouchableOpacity 
            style={styles.reconnectButton} 
            onPress={this.handleReconnect}
          >
            <Text style={styles.reconnectButtonText}>Reconnect</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.resetButton} 
            onPress={this.handleConnectionReset}
          >
            <Text style={styles.resetButtonText}>Reset Connection</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.fallbackButton} 
            onPress={this.handleFallbackMode}
          >
            <Text style={styles.fallbackButtonText}>Offline Mode</Text>
          </TouchableOpacity>
        </View>

        {error.severity === 'high' && (
          <View style={styles.troubleshootingTips}>
            <Text style={styles.tipsTitle}>Troubleshooting Tips:</Text>
            <Text style={styles.tipText}>• Check WiFi connection</Text>
            <Text style={styles.tipText}>• Verify NMEA bridge is powered on</Text>
            <Text style={styles.tipText}>• Ensure bridge and device are on same network</Text>
            <Text style={styles.tipText}>• Check firewall settings</Text>
          </View>
        )}
      </View>
    );
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return this.renderConnectionFallback(this.state.error as ConnectionErrorInfo, this.handleRetry);
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  connectionErrorContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionErrorHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  connectionErrorIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  connectionErrorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc3545',
    textAlign: 'center',
  },
  connectionErrorBody: {
    maxWidth: 400,
    marginBottom: 20,
  },
  connectionErrorMessage: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  networkInfo: {
    backgroundColor: '#e9ecef',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  networkTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 6,
  },
  networkText: {
    fontSize: 11,
    color: '#6c757d',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  diagnosticsInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  diagnosticsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
  },
  diagnosticRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  diagnosticLabel: {
    fontSize: 11,
    color: '#6c757d',
  },
  diagnosticValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  success: {
    color: '#28a745',
  },
  error: {
    color: '#dc3545',
  },
  warning: {
    color: '#ffc107',
  },
  connectionDebugInfo: {
    backgroundColor: '#f1f3f4',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  debugTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 6,
  },
  debugText: {
    fontSize: 10,
    color: '#6c757d',
    fontFamily: 'monospace',
    marginBottom: 3,
  },
  connectionErrorActions: {
    alignItems: 'center',
    gap: 10,
  },
  reconnectButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  reconnectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  fallbackButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  fallbackButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  troubleshootingTips: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 6,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#ffeaa7',
    alignSelf: 'stretch',
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 6,
  },
  tipText: {
    fontSize: 11,
    color: '#856404',
    marginBottom: 3,
    paddingLeft: 4,
  },
});