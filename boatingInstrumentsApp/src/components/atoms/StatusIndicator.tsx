import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface StatusIndicatorProps {
  status: 'connected' | 'connecting' | 'disconnected' | 'error' | 'warning';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  testID?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'medium',
  style,
  testID,
}) => {
  const indicatorStyle = [
    styles.indicator,
    styles[`indicator_${size}`],
    styles[`indicator_${status}`],
    style,
  ];

  return <View style={indicatorStyle} testID={testID} />;
};

const styles = StyleSheet.create({
  indicator: {
    borderRadius: 50, // Makes it circular
  },
  indicator_small: {
    width: 8,
    height: 8,
  },
  indicator_medium: {
    width: 12,
    height: 12,
  },
  indicator_large: {
    width: 16,
    height: 16,
  },
  indicator_connected: {
    backgroundColor: '#10B981', // Green
  },
  indicator_connecting: {
    backgroundColor: '#F59E0B', // Yellow/Orange
  },
  indicator_disconnected: {
    backgroundColor: '#6B7280', // Gray
  },
  indicator_error: {
    backgroundColor: '#EF4444', // Red
  },
  indicator_warning: {
    backgroundColor: '#F59E0B', // Yellow/Orange
  },
});

export default StatusIndicator;