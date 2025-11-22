import React, { useMemo } from 'react';
import { Switch as RNSwitch, StyleSheet, ViewStyle } from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  trackColor?: {
    false?: string;
    true?: string;
  };
  thumbColor?: string;
  ios_backgroundColor?: string;
  style?: ViewStyle;
  testID?: string;
}

const Switch: React.FC<SwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
  size = 'medium',
  trackColor,
  thumbColor,
  ios_backgroundColor,
  style,
  testID,
}) => {
  const theme = useTheme();
  
  // Use theme colors as defaults
  const defaultTrackColor = useMemo(() => ({
    false: theme.borderLight,
    true: theme.interactive,
  }), [theme]);
  
  const defaultThumbColor = theme.surface;
  const defaultIosBackgroundColor = theme.borderLight;
  const switchStyle = [
    styles.switch,
    styles[`switch_${size}`],
    style,
  ];

  return (
    <RNSwitch
      style={switchStyle}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={trackColor || defaultTrackColor}
      thumbColor={thumbColor || defaultThumbColor}
      ios_backgroundColor={ios_backgroundColor || defaultIosBackgroundColor}
      testID={testID}
    />
  );
};

const styles = StyleSheet.create({
  switch: {
    // Base styles
  },
  switch_small: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  switch_medium: {
    // Default size
  },
  switch_large: {
    transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
  },
});

export default Switch;