import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, Animated } from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { useHaptics } from '../../services/haptics/Haptics';
import { useMarineTouch } from '../../services/marine/MarineTouchService';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?:
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'ghost'
    | 'filled'
    | 'tinted'
    | 'gray'
    | 'plain'
    | 'bordered';
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
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

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

  // AC15: Marine touch optimization
  const { getMarineHitSlop, getLongPressDuration } = useMarineTouch();

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
      hitSlop={getMarineHitSlop()} // AC15: Marine-optimized hit slop
      delayLongPress={getLongPressDuration()} // AC15: Marine-optimized long press
      testID={testID}
    >
      <Animated.View style={[buttonStyle, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={buttonTextStyle}>{title}</Text>
      </Animated.View>
    </Pressable>
  );
};

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    button: {
      borderRadius: 10, // iOS standard for buttons/form controls
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    // Legacy variants (preserved for compatibility)
    button_primary: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    button_secondary: {
      backgroundColor: theme.textSecondary,
      borderColor: theme.textSecondary,
    },
    button_outline: {
      backgroundColor: 'transparent',
      borderColor: theme.primary,
    },
    button_ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    },
    // iOS button variants (HIG compliant)
    button_filled: {
      backgroundColor: theme.primary, // iOS tint color (filled)
      borderColor: theme.primary,
      borderWidth: 0,
    },
    button_tinted: {
      backgroundColor: theme.overlay, // 10% tint
      borderColor: 'transparent',
      borderWidth: 0,
    },
    button_gray: {
      backgroundColor: theme.overlay, // iOS gray fill
      borderColor: 'transparent',
      borderWidth: 0,
    },
    button_plain: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      borderWidth: 0,
    },
    button_bordered: {
      backgroundColor: 'transparent',
      borderColor: theme.border, // iOS separator color
      borderWidth: 1,
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
      color: theme.text,
    },
    text_secondary: {
      color: theme.text,
    },
    text_outline: {
      color: theme.primary,
    },
    text_ghost: {
      color: theme.primary,
    },
    // iOS variant text colors
    text_filled: {
      color: theme.text,
    },
    text_tinted: {
      color: theme.primary,
    },
    text_gray: {
      color: theme.text,
    },
    text_plain: {
      color: theme.primary,
    },
    text_bordered: {
      color: theme.primary,
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
