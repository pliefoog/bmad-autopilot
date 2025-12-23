import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';

interface DividerProps {
  variant?: 'horizontal' | 'vertical';
  thickness?: 'thin' | 'medium' | 'thick';
  color?: string;
  margin?: 'none' | 'small' | 'medium' | 'large';
  style?: ViewStyle;
  testID?: string;
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    divider: {
      backgroundColor: theme.borderLight,
    },
    divider_horizontal: {
      width: '100%',
      height: 1,
    },
    divider_vertical: {
      height: '100%',
      width: 1,
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

const Divider: React.FC<DividerProps> = ({
  variant = 'horizontal',
  thickness = 'thin',
  color,
  margin = 'medium',
  style,
  testID,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const dividerStyle = [
    styles.divider,
    styles[`divider_${variant}`],
    styles[`thickness_${thickness}`],
    styles[`margin_${variant}_${margin}`],
    color ? { backgroundColor: color } : null,
    style,
  ];

  return <View style={dividerStyle} testID={testID} />;
};

export default Divider;
