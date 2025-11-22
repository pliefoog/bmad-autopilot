import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet, ViewStyle, Animated } from 'react-native';
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
 * Custom Switch implementation for web that properly respects thumbColor
 * React Native Web doesn't properly apply thumbColor prop, so we implement our own
 */
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
  
  // Debug: Verify this web component is being used
  React.useEffect(() => {
    console.log('[Switch.web.tsx] Custom web Switch loaded with thumbColor:', thumbColor || '#FFFFFF');
  }, []);
  
  // Use theme colors as defaults
  const defaultTrackColor = useMemo(() => ({
    false: theme.borderLight,
    true: theme.interactive,
  }), [theme]);
  
  const defaultThumbColor = '#FFFFFF';
  
  const finalTrackColor = trackColor || defaultTrackColor;
  const finalThumbColor = thumbColor || defaultThumbColor;
  
  // Use theme-based thumb color for consistency with other themed components
  const actualThumbColor = finalThumbColor === '#FFFFFF' ? theme.surface : finalThumbColor;
  
  const currentTrackColor = value ? finalTrackColor.true : finalTrackColor.false;
  
  // Animation for thumb position
  const thumbPosition = React.useRef(new Animated.Value(value ? 1 : 0)).current;
  
  React.useEffect(() => {
    Animated.timing(thumbPosition, {
      toValue: value ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [value, thumbPosition]);
  
  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };
  
  // Size dimensions
  const dimensions = {
    small: { width: 32, height: 16, thumbSize: 12, padding: 2 },
    medium: { width: 40, height: 20, thumbSize: 16, padding: 2 },
    large: { width: 48, height: 24, thumbSize: 20, padding: 2 },
  }[size];
  
  const thumbTranslateX = thumbPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, dimensions.width - dimensions.thumbSize - dimensions.padding * 2],
  });
  
  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.container,
        {
          width: dimensions.width,
          height: dimensions.height,
          backgroundColor: currentTrackColor,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      testID={testID}
    >
      <Animated.View
        style={[
          styles.thumb,
          {
            width: dimensions.thumbSize,
            height: dimensions.thumbSize,
            backgroundColor: actualThumbColor,
            transform: [{ translateX: thumbTranslateX }],
          },
        ]}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 100,
    padding: 2,
    justifyContent: 'center',
    cursor: 'pointer',
  },
  thumb: {
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default Switch;
