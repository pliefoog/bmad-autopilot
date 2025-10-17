import React from 'react';
import { TextInput, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  variant?: 'default' | 'outline' | 'filled';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

const Input: React.FC<InputProps> = ({
  value,
  onChangeText,
  placeholder,
  variant = 'default',
  size = 'medium',
  disabled = false,
  multiline = false,
  keyboardType = 'default',
  secureTextEntry = false,
  style,
  textStyle,
  testID,
}) => {
  const inputStyle = [
    styles.input,
    styles[`input_${variant}`],
    styles[`input_${size}`],
    disabled && styles.input_disabled,
    multiline && styles.input_multiline,
    style,
  ];

  const inputTextStyle = [
    styles.text,
    styles[`text_${size}`],
    textStyle,
  ];

  return (
    <TextInput
      style={[inputStyle, inputTextStyle]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      editable={!disabled}
      multiline={multiline}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      testID={testID}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  input_default: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  input_outline: {
    backgroundColor: 'transparent',
    borderColor: '#D1D5DB',
  },
  input_filled: {
    backgroundColor: '#F3F4F6',
    borderColor: 'transparent',
  },
  input_small: {
    paddingVertical: 6,
    minHeight: 32,
  },
  input_medium: {
    paddingVertical: 10,
    minHeight: 40,
  },
  input_large: {
    paddingVertical: 14,
    minHeight: 48,
  },
  input_disabled: {
    opacity: 0.5,
  },
  input_multiline: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  text: {
    color: '#111827',
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
});

export default Input;