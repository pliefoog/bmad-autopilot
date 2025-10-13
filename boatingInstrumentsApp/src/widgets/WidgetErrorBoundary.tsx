import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface Props {
  children: ReactNode;
  widgetId: string;
  onReload?: () => void;
  onRemove?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Widget ${this.props.widgetId} crashed:`, error, errorInfo);
    
    // Store error info for debugging
    this.setState({
      error,
      errorInfo,
    });
    
    // Could send error to crash reporting service here
    // reportError('WidgetCrash', { widgetId: this.props.widgetId, error: error.message });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onReload?.();
  };

  handleRemove = () => {
    this.props.onRemove?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <View style={styles.errorHeader}>
            <Ionicons name="warning-outline" size={32} color="#DC2626" />
            <Text style={styles.errorTitle}>Widget Error</Text>
          </View>
          
          <Text style={styles.errorWidget}>{this.props.widgetId}</Text>
          
          {this.state.error && (
            <Text style={styles.errorMessage} numberOfLines={2}>
              {this.state.error.message}
            </Text>
          )}
          
          <View style={styles.errorActions}>
            <TouchableOpacity 
              style={[styles.errorButton, styles.reloadButton]} 
              onPress={this.handleReload}
            >
              <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
              <Text style={styles.reloadButtonText}>Reload</Text>
            </TouchableOpacity>
            
            {this.props.onRemove && (
              <TouchableOpacity 
                style={[styles.errorButton, styles.removeButton]} 
                onPress={this.handleRemove}
              >
                <Ionicons name="close-outline" size={16} color="#FFFFFF" />
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 16,
    margin: 8,
    minWidth: 160,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DC2626',
    marginTop: 4,
  },
  errorWidget: {
    fontSize: 14,
    color: '#7F1D1D',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 12,
    color: '#991B1B',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  errorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    gap: 4,
  },
  reloadButton: {
    backgroundColor: '#059669',
  },
  reloadButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  removeButton: {
    backgroundColor: '#DC2626',
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});