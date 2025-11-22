import React, { useState } from 'react';
import { TextInput, StyleSheet, ViewStyle, TextStyle, Platform } from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  variant?: 'default' | 'outline' | 'filled';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad' | 'decimal-pad' | 'number-pad' | 'url' | 'ascii-capable';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  clearButtonMode?: 'never' | 'while-editing' | 'unless-editing' | 'always'; // iOS clear button
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
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
  autoCapitalize = 'sentences',
  autoCorrect = true,
  clearButtonMode = 'while-editing', // iOS default: show clear button while editing
  style,
  textStyle,
  testID,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const inputStyle = [
    styles.input,
    styles[`input_${variant}`],
    styles[`input_${size}`],
    disabled && styles.input_disabled,
    isFocused && styles.input_focused, // iOS focus state
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
      placeholderTextColor={theme.textTertiary}
      editable={!disabled}
      multiline={multiline}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      clearButtonMode={Platform.OS === 'ios' ? clearButtonMode : undefined} // iOS-only feature
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      accessible={true}
      accessibilityLabel={accessibilityLabel || placeholder}
      accessibilityHint={accessibilityHint}
      testID={testID}
    />
  );
};

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  input: {
    borderRadius: 10, // iOS standard for text fields
    paddingHorizontal: 12,
    backgroundColor: theme.surfaceHighlight,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  input_default: {
    backgroundColor: theme.surfaceHighlight,
    borderColor: theme.borderLight,
  },
  input_outline: {
    backgroundColor: 'transparent',
    borderColor: theme.borderLight,
  },
  input_filled: {
    backgroundColor: theme.surface,
    borderColor: 'transparent',
  },
  input_small: {
    paddingVertical: 8,
    minHeight: 44, // iOS minimum touch target (44pt)
  },
  input_medium: {
    paddingVertical: 10,
    minHeight: 44, // iOS minimum touch target (44pt)
  },
  input_large: {
    paddingVertical: 14,
    minHeight: 56, // Larger marine touch target
  },
  input_disabled: {
    opacity: 0.5,
  },
  input_focused: {
    borderColor: theme.primary, // iOS system blue for focus state
    borderWidth: 2, // Thicker border when focused (iOS pattern)
  },
  input_multiline: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  text: {
    color: theme.text,
  },
  text_small: {
    fontSize: 15, // iOS callout size
  },
  text_medium: {
    fontSize: 17, // iOS body size
  },
  text_large: {
    fontSize: 20, // iOS title3 size
  },
});

export default Input;