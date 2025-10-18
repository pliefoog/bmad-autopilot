// Data Error Boundary Component
// Specialized error boundary for NMEA data parsing and processing errors

import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { BaseErrorBoundary, CustomErrorInfo, ErrorBoundaryProps } from './BaseErrorBoundary';

export interface DataErrorBoundaryProps extends Omit<ErrorBoundaryProps, 'category'> {
  dataType?: 'nmea0183' | 'nmea2000' | 'json' | 'binary';
  sourceId?: string;
  enableDataValidation?: boolean;
  maxParsingErrors?: number;
  onDataError?: (errorData: DataErrorInfo) => void;
  onParsingReset?: () => void;
  onDataRecovery?: () => void;
  onFallbackParser?: () => void;
}

export interface DataErrorInfo extends CustomErrorInfo {
  dataType?: string;
  sourceId?: string;
  parsingDetails?: {
    rawData?: string;
    expectedFormat?: string;
    parsePosition?: number;
    lastValidData?: any;
    errorPattern?: string;
    corruptionLevel?: 'low' | 'medium' | 'high';
  };
  statistics?: {
    totalMessages?: number;
    errorCount?: number;
    errorRate?: number;
    lastSuccessfulParse?: number;
    consecutiveErrors?: number;
  };
  suggestions?: string[];
}

export class DataErrorBoundary extends BaseErrorBoundary {
  private parsingErrorCount = 0;
  private lastErrorTime = 0;

  constructor(props: DataErrorBoundaryProps) {
    super({ ...props, category: 'data' });
  }

  private get dataProps(): DataErrorBoundaryProps {
    return this.props as DataErrorBoundaryProps;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.parsingErrorCount++;
    this.lastErrorTime = Date.now();

    // Create enhanced data error info
    const dataErrorInfo: DataErrorInfo = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack || undefined,
      timestamp: Date.now(),
      severity: this.determineDataErrorSeverity(error),
      category: 'data',
      dataType: this.dataProps.dataType,
      sourceId: this.dataProps.sourceId,
      parsingDetails: this.extractParsingDetails(error),
      statistics: this.generateStatistics(),
      suggestions: this.generateSuggestions(error),
      context: {
        enableDataValidation: this.dataProps.enableDataValidation,
        maxParsingErrors: this.dataProps.maxParsingErrors,
        dataType: this.dataProps.dataType,
      },
    };

    // Store the enhanced error
    this.setState({ 
      error: dataErrorInfo,
      hasError: true,
    });

    // Call both error handlers
    this.props.onError?.(dataErrorInfo, errorInfo);
    this.dataProps.onDataError?.(dataErrorInfo);

    // Log data-specific error details
    this.logDataError(dataErrorInfo, error);

    // Check if we should reset due to too many errors
    if (this.shouldResetParser(dataErrorInfo)) {
      setTimeout(() => this.handleParsingReset(), 2000);
    }
  }

  private determineDataErrorSeverity(error: Error): DataErrorInfo['severity'] {
    const message = error.message.toLowerCase();
    
    // Critical data errors
    if (message.includes('corrupted') || 
        message.includes('invalid format') ||
        message.includes('malformed') ||
        this.parsingErrorCount > (this.dataProps.maxParsingErrors || 10)) {
      return 'high';
    }
    
    // Medium severity data errors
    if (message.includes('parsing error') ||
        message.includes('validation failed') ||
        message.includes('unexpected') ||
        this.parsingErrorCount > 5) {
      return 'medium';
    }
    
    // Low severity data errors
    if (message.includes('checksum') ||
        message.includes('incomplete') ||
        message.includes('missing field')) {
      return 'low';
    }
    
    return 'medium';
  }

  private extractParsingDetails(error: Error): DataErrorInfo['parsingDetails'] {
    const message = error.message;
    const stack = error.stack || '';

    // Try to extract data from common parsing error patterns
    const rawDataMatch = message.match(/data: (.+?)(?:\n|$)/);
    const positionMatch = message.match(/position (\d+)/);
    const formatMatch = message.match(/expected (.+?) but got/);

    return {
      rawData: rawDataMatch?.[1]?.substring(0, 200), // Limit raw data length
      expectedFormat: formatMatch?.[1] || this.dataProps.dataType || 'unknown',
      parsePosition: positionMatch ? parseInt(positionMatch[1], 10) : undefined,
      lastValidData: this.getLastValidData(),
      errorPattern: this.identifyErrorPattern(message),
      corruptionLevel: this.assessCorruptionLevel(message),
    };
  }

  private getLastValidData(): any {
    // In a real implementation, this would retrieve the last successfully parsed data
    // For now, return a placeholder
    return null;
  }

  private identifyErrorPattern(message: string): string {
    if (message.includes('checksum')) return 'checksum_mismatch';
    if (message.includes('incomplete')) return 'incomplete_message';
    if (message.includes('invalid')) return 'invalid_format';
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('overflow')) return 'buffer_overflow';
    return 'unknown';
  }

  private assessCorruptionLevel(message: string): 'low' | 'medium' | 'high' {
    if (message.includes('completely') || message.includes('corrupted') || message.includes('malformed')) {
      return 'high';
    }
    if (message.includes('partial') || message.includes('missing') || message.includes('invalid')) {
      return 'medium';
    }
    return 'low';
  }

  private generateStatistics(): DataErrorInfo['statistics'] {
    const errorRate = this.parsingErrorCount > 0 ? this.parsingErrorCount / 100 : 0; // Simplified calculation

    return {
      totalMessages: 100, // Placeholder - would be tracked in real implementation
      errorCount: this.parsingErrorCount,
      errorRate: Math.min(errorRate * 100, 100),
      lastSuccessfulParse: Date.now() - this.lastErrorTime,
      consecutiveErrors: this.parsingErrorCount,
    };
  }

  private generateSuggestions(error: Error): string[] {
    const suggestions: string[] = [];
    const message = error.message.toLowerCase();

    if (message.includes('checksum')) {
      suggestions.push('Check NMEA data transmission quality');
      suggestions.push('Verify cable connections');
    }

    if (message.includes('format') || message.includes('parsing')) {
      suggestions.push('Verify NMEA sentence format');
      suggestions.push('Check data source configuration');
    }

    if (message.includes('timeout') || message.includes('incomplete')) {
      suggestions.push('Check data transmission rate');
      suggestions.push('Verify network stability');
    }

    if (this.parsingErrorCount > 5) {
      suggestions.push('Consider resetting the data parser');
      suggestions.push('Switch to fallback parsing mode');
    }

    return suggestions;
  }

  private shouldResetParser(error: DataErrorInfo): boolean {
    const maxErrors = this.dataProps.maxParsingErrors || 10;
    return this.parsingErrorCount >= maxErrors || error.severity === 'high';
  }

  private logDataError(dataError: DataErrorInfo, originalError: Error) {
    const logData = {
      timestamp: new Date(dataError.timestamp).toISOString(),
      dataType: dataError.dataType,
      sourceId: dataError.sourceId,
      severity: dataError.severity,
      message: dataError.message,
      parsingDetails: dataError.parsingDetails,
      statistics: dataError.statistics,
      suggestions: dataError.suggestions,
    };

    if (__DEV__) {
      console.group(`📊 Data Error: ${dataError.dataType || 'Unknown'}`);
      console.error('Original Error:', originalError);
      console.log('Data Error Info:', logData);
      console.groupEnd();
    }
  }

  private handleDataRecovery = () => {
    this.dataProps.onDataRecovery?.();
    this.parsingErrorCount = Math.max(0, this.parsingErrorCount - 2); // Reduce error count
    this.handleRetry();
  };

  private handleParsingReset = () => {
    this.dataProps.onParsingReset?.();
    this.parsingErrorCount = 0;
    this.lastErrorTime = 0;
    setTimeout(() => this.handleRetry(), 500);
  };

  private handleFallbackParser = () => {
    this.dataProps.onFallbackParser?.();
    this.parsingErrorCount = 0;
    // Don't automatically retry in fallback mode
  };

  private renderDataFallback = (error: DataErrorInfo, retry: () => void): ReactNode => {
    const { dataType = 'unknown' } = this.dataProps;
    const { parsingDetails, statistics, suggestions } = error;

    return (
      <ScrollView style={styles.dataErrorContainer}>
        <View style={styles.dataErrorHeader}>
          <Text style={styles.dataErrorIcon}>📊</Text>
          <Text style={styles.dataErrorTitle}>
            Data Processing Error ({dataType.toUpperCase()})
          </Text>
        </View>

        <View style={styles.dataErrorBody}>
          <Text style={styles.dataErrorMessage}>
            {error.severity === 'high'
              ? 'Critical data parsing error detected. The data format may be corrupted or unsupported.'
              : 'Data parsing temporarily interrupted. Some marine data may be unavailable.'
            }
          </Text>

          {parsingDetails && (
            <View style={styles.parsingInfo}>
              <Text style={styles.parsingTitle}>Parsing Details:</Text>
              {parsingDetails.expectedFormat && (
                <Text style={styles.parsingText}>Expected: {parsingDetails.expectedFormat}</Text>
              )}
              {parsingDetails.parsePosition && (
                <Text style={styles.parsingText}>Error at position: {parsingDetails.parsePosition}</Text>
              )}
              {parsingDetails.errorPattern && (
                <Text style={styles.parsingText}>Pattern: {parsingDetails.errorPattern}</Text>
              )}
              {parsingDetails.corruptionLevel && (
                <Text style={[styles.parsingText, { 
                  color: parsingDetails.corruptionLevel === 'high' ? '#dc3545' : 
                         parsingDetails.corruptionLevel === 'medium' ? '#ffc107' : '#28a745'
                }]}>
                  Corruption Level: {parsingDetails.corruptionLevel}
                </Text>
              )}
              {parsingDetails.rawData && (
                <View style={styles.rawDataContainer}>
                  <Text style={styles.rawDataTitle}>Raw Data (truncated):</Text>
                  <Text style={styles.rawDataText}>{parsingDetails.rawData}</Text>
                </View>
              )}
            </View>
          )}

          {statistics && (
            <View style={styles.statisticsInfo}>
              <Text style={styles.statisticsTitle}>Statistics:</Text>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Messages:</Text>
                <Text style={styles.statValue}>{statistics.totalMessages || 0}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Error Count:</Text>
                <Text style={styles.statValue}>{statistics.errorCount || 0}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Error Rate:</Text>
                <Text style={[styles.statValue, { 
                  color: (statistics.errorRate || 0) > 50 ? '#dc3545' : '#28a745'
                }]}>
                  {(statistics.errorRate || 0).toFixed(1)}%
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Consecutive Errors:</Text>
                <Text style={styles.statValue}>{statistics.consecutiveErrors || 0}</Text>
              </View>
            </View>
          )}

          {suggestions && suggestions.length > 0 && (
            <View style={styles.suggestionsInfo}>
              <Text style={styles.suggestionsTitle}>Suggestions:</Text>
              {suggestions.map((suggestion, index) => (
                <Text key={index} style={styles.suggestionText}>• {suggestion}</Text>
              ))}
            </View>
          )}

          {__DEV__ && (
            <View style={styles.dataDebugInfo}>
              <Text style={styles.debugTitle}>Debug Info:</Text>
              <Text style={styles.debugText}>Severity: {error.severity}</Text>
              <Text style={styles.debugText}>Data Type: {dataType}</Text>
              <Text style={styles.debugText}>Source ID: {error.sourceId || 'unknown'}</Text>
              <Text style={styles.debugText}>Message: {error.message}</Text>
            </View>
          )}
        </View>

        <View style={styles.dataErrorActions}>
          <TouchableOpacity 
            style={styles.recoveryButton} 
            onPress={this.handleDataRecovery}
          >
            <Text style={styles.recoveryButtonText}>Retry Parsing</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.resetButton} 
            onPress={this.handleParsingReset}
          >
            <Text style={styles.resetButtonText}>Reset Parser</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.fallbackButton} 
            onPress={this.handleFallbackParser}
          >
            <Text style={styles.fallbackButtonText}>Fallback Mode</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return this.renderDataFallback(this.state.error as DataErrorInfo, this.handleRetry);
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  dataErrorContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  dataErrorHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  dataErrorIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  dataErrorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc3545',
    textAlign: 'center',
  },
  dataErrorBody: {
    padding: 20,
  },
  dataErrorMessage: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  parsingInfo: {
    backgroundColor: '#e9ecef',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  parsingTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 6,
  },
  parsingText: {
    fontSize: 11,
    color: '#6c757d',
    marginBottom: 2,
  },
  rawDataContainer: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 4,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  rawDataTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 4,
  },
  rawDataText: {
    fontSize: 9,
    color: '#6c757d',
    fontFamily: 'monospace',
    backgroundColor: '#ffffff',
    padding: 4,
    borderRadius: 2,
  },
  statisticsInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  statisticsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6c757d',
  },
  statValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#495057',
  },
  suggestionsInfo: {
    backgroundColor: '#d4edda',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 6,
  },
  suggestionText: {
    fontSize: 11,
    color: '#155724',
    marginBottom: 3,
    paddingLeft: 4,
  },
  dataDebugInfo: {
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
  dataErrorActions: {
    alignItems: 'center',
    padding: 20,
    gap: 10,
  },
  recoveryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  recoveryButtonText: {
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
});