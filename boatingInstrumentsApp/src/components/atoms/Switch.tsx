import React from 'react';
import { Switch as RNSwitch, StyleSheet, ViewStyle } from 'react-native';

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
  style?: ViewStyle;
  testID?: string;
}

const Switch: React.FC<SwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
  size = 'medium',
  trackColor = {
    false: '#D1D5DB',
    true: '#3B82F6',
  },
  thumbColor = '#FFFFFF',
  style,
  testID,
}) => {
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
      trackColor={trackColor}
      thumbColor={thumbColor}
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