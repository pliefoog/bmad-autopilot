import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, Animated } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useHaptics } from '../../services/haptics/Haptics';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  style,
  textStyle,
  testID,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const buttonStyle = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    disabled && styles.button_disabled,
    style,
  ];

  const buttonTextStyle = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
    disabled && styles.text_disabled,
    textStyle,
  ];

  const theme = useTheme();

  // Micro-interaction: press scale
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const animateTo = (toValue: number) => {
    if (!theme.animations || theme.reducedMotion) return;
    Animated.spring(scaleAnim, {
      toValue,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start();
  };

  const handlePressIn = () => animateTo(0.97);
  const handlePressOut = () => animateTo(1);

  const { vibrate } = useHaptics();

  const handlePress = () => {
    vibrate('light');
    onPress && onPress();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      testID={testID}
    >
      <Animated.View style={[buttonStyle, { transform: [{ scale: scaleAnim }] }]}> 
        <Text style={buttonTextStyle}>{title}</Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  button_primary: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  button_secondary: {
    backgroundColor: '#6B7280',
    borderColor: '#6B7280',
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderColor: '#007AFF',
  },
  button_ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  button_small: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44, // Ensure minimum 44pt touch target for marine use
  },
  button_medium: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44, // Ensure minimum 44pt touch target for marine use
  },
  button_large: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 56,
  },
  button_disabled: {
    opacity: 0.5,
  },
  button_pressed: {
    opacity: 0.8,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  text_primary: {
    color: '#FFFFFF',
  },
  text_secondary: {
    color: '#FFFFFF',
  },
  text_outline: {
    color: '#007AFF',
  },
  text_ghost: {
    color: '#007AFF',
  },
  text_small: {
    fontSize: 14,
  },
  text_medium: {
    fontSize: 16,
  },
  text_large: {
    fontSize: 18,
  },
  text_disabled: {
    opacity: 0.7,
  },
});

export default Button;