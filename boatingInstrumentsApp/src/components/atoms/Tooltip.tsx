import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';

interface TooltipProps {
  children: string;
  variant?: 'default' | 'dark' | 'light';
  size?: 'small' | 'medium' | 'large';
  style?: TextStyle;
  testID?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  children,
  variant = 'default',
  size = 'medium',
  style,
  testID,
}) => {
  const tooltipStyle = [
    styles.tooltip,
    styles[`tooltip_${variant}`],
    styles[`tooltip_${size}`],
    style,
  ];

  return (
    <Text style={tooltipStyle} testID={testID}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  tooltip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    position: 'absolute',
    zIndex: 1000,
    textAlign: 'center',
  },
  tooltip_default: {
    backgroundColor: '#374151',
    color: '#FFFFFF',
  },
  tooltip_dark: {
    backgroundColor: '#1F2937',
    color: '#FFFFFF',
  },
  tooltip_light: {
    backgroundColor: '#F9FAFB',
    color: '#374151',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tooltip_small: {
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tooltip_medium: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tooltip_large: {
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});

export default Tooltip;