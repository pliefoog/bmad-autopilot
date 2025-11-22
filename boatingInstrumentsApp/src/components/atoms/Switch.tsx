import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../store/themeStore';

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

/**
 * Custom Switch component using ThemeWidget toggle pattern
 * Pure View-based implementation that properly respects theme colors
 */
const Switch: React.FC<SwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
  size = 'medium',
  trackColor,
  thumbColor,
  style,
  testID,
}) => {
  const theme = useTheme();
  
  // Size dimensions matching ThemeWidget pattern
  const dimensions = {
    small: { width: 32, height: 16, thumbSize: 12, padding: 2 },
    medium: { width: 36, height: 20, thumbSize: 16, padding: 2 },
    large: { width: 44, height: 24, thumbSize: 20, padding: 2 },
  }[size];
  
  // Use theme colors as defaults (matching ThemeWidget)
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
  
  // Calculate thumb position (matching ThemeWidget calculation)
  const thumbTranslateX = value ? (dimensions.width - dimensions.thumbSize - dimensions.padding * 2) : 0;

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.8}
      testID={testID}
      style={style}
    >
      <View
        style={[
          styles.track,
          {
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: dimensions.height / 2,
            backgroundColor: finalTrackColor,
            padding: dimensions.padding,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.thumb,
            {
              width: dimensions.thumbSize,
              height: dimensions.thumbSize,
              borderRadius: dimensions.thumbSize / 2,
              backgroundColor: finalThumbColor,
              transform: [{ translateX: thumbTranslateX }],
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  track: {
    justifyContent: 'center',
  },
  thumb: {
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
});

export default Switch;