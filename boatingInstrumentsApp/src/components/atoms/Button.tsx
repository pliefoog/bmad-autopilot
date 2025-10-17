import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
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

  return (
    <Pressable
      style={({ pressed }) => [
        buttonStyle,
        pressed && !disabled && styles.button_pressed,
      ]}
      onPress={onPress}
      disabled={disabled}
      testID={testID}
    >
      <Text style={buttonTextStyle}>{title}</Text>
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
    paddingVertical: 6,
    minHeight: 32,
  },
  button_medium: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
  },
  button_large: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 48,
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