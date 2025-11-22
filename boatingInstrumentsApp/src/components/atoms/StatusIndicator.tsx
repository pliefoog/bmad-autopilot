import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../store/themeStore';

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
  const theme = useTheme();
  
  // Create dynamic styles based on current theme
  const dynamicStyles = useMemo(() => ({
    indicator_connected: {
      backgroundColor: theme.success, // Theme-aware (red in red-night mode)
    },
    indicator_connecting: {
      backgroundColor: theme.warning,
    },
    indicator_disconnected: {
      backgroundColor: theme.textSecondary, // Gray
    },
    indicator_error: {
      backgroundColor: theme.error,
    },
    indicator_warning: {
      backgroundColor: theme.warning,
    },
  }), [theme]);

  const indicatorStyle = [
    styles.indicator,
    styles[`indicator_${size}`],
    dynamicStyles[`indicator_${status}`],
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
});

export default StatusIndicator;