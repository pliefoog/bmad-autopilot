import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../store/themeStore';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  trackColor?: {
    false?: string;
    true?: string;
  };
  thumbColor?: string;
  style?: ViewStyle;
  testID?: string;
}

/**
 * Custom Switch component using ThemeSwitcher toggle pattern
 * Pure View-based implementation that properly respects theme colors
 * Matches ThemeSwitcher.tsx lines 199-212 exactly
 */
const Switch: React.FC<SwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
  trackColor,
  thumbColor,
  style,
  testID,
}) => {
  const theme = useTheme();
  
  // Use theme colors as defaults (matching ThemeSwitcher exactly)
  const defaultTrackColorOn = theme.interactive;
  const defaultTrackColorOff = theme.border;
  const defaultThumbColor = theme.surface;
  
  const finalTrackColor = value 
    ? (trackColor?.true || defaultTrackColorOn)
    : (trackColor?.false || defaultTrackColorOff);
  
  const finalThumbColor = thumbColor || defaultThumbColor;
  
  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  return (
    <View
      // @ts-ignore - web-specific props
      onClick={disabled ? undefined : handlePress}
      onTouchStart={disabled ? undefined : handlePress}
      testID={testID}
      style={[
        styles.toggle,
        {
          backgroundColor: finalTrackColor,
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'default' : 'pointer',
        },
        style,
      ]}
    >
      <View
        style={[
          styles.toggleThumb,
          {
            backgroundColor: finalThumbColor,
            transform: [{ translateX: value ? 14 : 0 }],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  toggle: {
    width: 36,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
});

export default Switch;