/**
 * PlatformTextInput Component
 * Story 13.2.2 - Task 1: Cross-platform text input with adaptive sizing
 * 
 * Features:
 * - Platform-aware touch target sizing (44pt phone, 56pt tablet)
 * - Keyboard navigation support (Tab, Enter)
 * - Focus indicators for desktop (2px blue border)
 * - Input validation with error display
 * - Theme integration (day/night/red-night)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  Platform,
  KeyboardTypeOptions,
} from 'react-native';
import { useTheme } from '../../../store/themeStore';
import { settingsTokens } from '../../../theme/settingsTokens';
import { useInputFocus, useTouchTargetSize, useInputValidation } from '../../../hooks';
import type { ValidatorFunction } from '../../../hooks/useInputValidation';

/**
 * PlatformTextInput Props
 */
export interface PlatformTextInputProps {
  /** Current input value */
  value: string;
  
  /** Change handler */
  onChangeText: (text: string) => void;
  
  /** Placeholder text */
  placeholder?: string;
  
  /** Input label */
  label?: string;
  
  /** External error message (overrides validation) */
  error?: string;
  
  /** Keyboard type for mobile platforms */
  keyboardType?: KeyboardTypeOptions;
  
  /** Auto-focus on mount */
  autoFocus?: boolean;
  
  /** Disabled state */
  disabled?: boolean;
  
  /** Maximum character length */
  maxLength?: number;
  
  /** Validation function */
  validator?: ValidatorFunction;
  
  /** Submit handler (Enter key or keyboard done) */
  onSubmit?: () => void;
  
  /** Test ID for testing */
  testID?: string;
}

/**
 * Cross-platform text input with validation and adaptive sizing
 * 
 * @example
 * <PlatformTextInput
 *   label="IP Address"
 *   value={ipAddress}
 *   onChangeText={setIpAddress}
 *   placeholder="192.168.1.1"
 *   keyboardType="numeric"
 *   validator={validators.ipAddress}
 *   onSubmit={handleSave}
 * />
 */
export const PlatformTextInput: React.FC<PlatformTextInputProps> = ({
  value,
  onChangeText,
  placeholder,
  label,
  error: externalError,
  keyboardType = 'default',
  autoFocus = false,
  disabled = false,
  maxLength,
  validator,
  onSubmit,
  testID = 'platform-text-input',
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  
  const touchTargetSize = useTouchTargetSize();
  const { inputRef, focus, keyboardEnabled } = useInputFocus();
  const { error: validationError, touched, setTouched } = useInputValidation(value, validator);
  
  const [focused, setFocused] = useState(false);
  
  // Use external error if provided, otherwise validation error
  const displayError = externalError || (touched && validationError);
  
  /**
   * Handle text change
   * Clears validation on user input
   */
  const handleChangeText = useCallback((text: string) => {
    onChangeText(text);
  }, [onChangeText]);
  
  /**
   * Handle focus
   */
  const handleFocus = useCallback(() => {
    setFocused(true);
  }, []);
  
  /**
   * Handle blur
   * Marks input as touched for validation
   */
  const handleBlur = useCallback(() => {
    setFocused(false);
    setTouched(true);
  }, [setTouched]);
  
  /**
   * Handle submit (Enter key or keyboard done button)
   */
  const handleSubmit = useCallback(() => {
    setTouched(true);
    if (!displayError && onSubmit) {
      onSubmit();
    }
  }, [displayError, onSubmit, setTouched]);
  
  // Platform-specific keyboard props
  const keyboardProps = Platform.select({
    ios: { returnKeyType: 'done' as const },
    android: { returnKeyType: 'done' as const },
    default: {},
  });
  
  return (
    <View style={styles.container} testID={testID}>
      {label && (
        <Text style={styles.label}>
          {label}
        </Text>
      )}
      
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onSubmitEditing={handleSubmit}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        editable={!disabled}
        maxLength={maxLength}
        style={[
          styles.input,
          { height: touchTargetSize, minHeight: touchTargetSize },
          focused && keyboardEnabled && styles.focusedInput,
          displayError && styles.errorInput,
          disabled && styles.disabledInput,
        ]}
        {...keyboardProps}
        testID={`${testID}-input`}
      />
      
      {displayError && (
        <Text style={styles.errorText} testID={`${testID}-error`}>
          {displayError}
        </Text>
      )}
    </View>
  );
};

/**
 * Create themed styles
 */
const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: {
    marginBottom: settingsTokens.spacing.md,
  },
  
  label: {
    fontSize: settingsTokens.typography.label.fontSize,
    fontWeight: settingsTokens.typography.label.fontWeight,
    color: theme.text,
    marginBottom: settingsTokens.spacing.xs,
  },
  
  input: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: settingsTokens.borderRadius.input,
    paddingHorizontal: settingsTokens.spacing.md,
    fontSize: settingsTokens.typography.body.fontSize,
    color: theme.text,
  },
  
  focusedInput: {
    borderWidth: 2,
    borderColor: theme.primary,
  },
  
  errorInput: {
    borderColor: theme.error,
  },
  
  disabledInput: {
    opacity: 0.5,
    backgroundColor: theme.appBackground,
  },
  
  errorText: {
    fontSize: settingsTokens.typography.caption.fontSize,
    color: theme.error,
    marginTop: settingsTokens.spacing.xs,
  },
});
