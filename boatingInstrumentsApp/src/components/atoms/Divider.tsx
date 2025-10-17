import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface DividerProps {
  variant?: 'horizontal' | 'vertical';
  thickness?: 'thin' | 'medium' | 'thick';
  color?: string;
  margin?: 'none' | 'small' | 'medium' | 'large';
  style?: ViewStyle;
  testID?: string;
}

const Divider: React.FC<DividerProps> = ({
  variant = 'horizontal',
  thickness = 'thin',
  color = '#E5E7EB',
  margin = 'medium',
  style,
  testID,
}) => {
  const dividerStyle = [
    styles.divider,
    styles[`divider_${variant}`],
    styles[`thickness_${thickness}`],
    styles[`margin_${variant}_${margin}`],
    { backgroundColor: color },
    style,
  ];

  return <View style={dividerStyle} testID={testID} />;
};

const styles = StyleSheet.create({
  divider: {
    backgroundColor: '#E5E7EB',
  },
  divider_horizontal: {
    width: '100%',
  },
  divider_vertical: {
    height: '100%',
  },
  thickness_thin: {
    width: 1,
    height: 1,
  },
  thickness_medium: {
    width: 2,
    height: 2,
  },
  thickness_thick: {
    width: 4,
    height: 4,
  },
  margin_horizontal_none: {
    marginVertical: 0,
  },
  margin_horizontal_small: {
    marginVertical: 8,
  },
  margin_horizontal_medium: {
    marginVertical: 16,
  },
  margin_horizontal_large: {
    marginVertical: 24,
  },
  margin_vertical_none: {
    marginHorizontal: 0,
  },
  margin_vertical_small: {
    marginHorizontal: 8,
  },
  margin_vertical_medium: {
    marginHorizontal: 16,
  },
  margin_vertical_large: {
    marginHorizontal: 24,
  },
});

// Override thickness for horizontal dividers
StyleSheet.create({
  ...styles,
  divider_horizontal: {
    ...styles.divider_horizontal,
    height: 1, // Override for horizontal
  },
  divider_vertical: {
    ...styles.divider_vertical,
    width: 1, // Override for vertical
  },
});

export default Divider;