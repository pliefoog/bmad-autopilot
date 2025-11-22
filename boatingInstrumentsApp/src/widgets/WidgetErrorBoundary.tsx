import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { themeStore, ThemeColors } from '../store/themeStore';

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
      const theme = themeStore.getState().colors;
      const dynamicStyles = createStyles(theme);
      
      return (
        <View style={dynamicStyles.errorContainer}>
          <View style={dynamicStyles.errorHeader}>
            <UniversalIcon name="warning-outline" size={32} color={theme.error} />
            <Text style={dynamicStyles.errorTitle}>Widget Error</Text>
          </View>
          
          <Text style={dynamicStyles.errorWidget}>{this.props.widgetId}</Text>
          
          {this.state.error && (
            <Text style={dynamicStyles.errorMessage} numberOfLines={2}>
              {this.state.error.message}
            </Text>
          )}
          
          <View style={dynamicStyles.errorActions}>
            <TouchableOpacity 
              style={[dynamicStyles.errorButton, dynamicStyles.reloadButton]} 
              onPress={this.handleReload}
            >
              <UniversalIcon name="refresh-outline" size={16} color={theme.text} />
              <Text style={dynamicStyles.reloadButtonText}>Reload</Text>
            </TouchableOpacity>
            
            {this.props.onRemove && (
              <TouchableOpacity 
                style={[dynamicStyles.errorButton, dynamicStyles.removeButton]} 
                onPress={this.handleRemove}
              >
                <UniversalIcon name="close-outline" size={16} color={theme.text} />
                <Text style={dynamicStyles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  errorContainer: {
    backgroundColor: theme.surfaceDim,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.error,
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
    color: theme.error,
    marginTop: 4,
  },
  errorWidget: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 12,
    color: theme.textTertiary,
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
    backgroundColor: theme.success,
  },
  reloadButtonText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  removeButton: {
    backgroundColor: theme.error,
  },
  removeButtonText: {
    color: theme.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
});