import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Input, Label } from '../atoms';

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  variant?: 'default' | 'outline' | 'filled';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  required?: boolean;
  error?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  variant = 'default',
  size = 'medium',
  disabled = false,
  required = false,
  error,
  multiline = false,
  keyboardType = 'default',
  secureTextEntry = false,
  style,
  testID,
}) => {
  const labelVariant = error ? 'error' : required ? 'required' : 'default';

  return (
    <View style={[styles.container, style]} testID={testID}>
      <Label
        variant={labelVariant}
        size={size}
        testID={testID ? `${testID}-label` : undefined}
      >
        {label}
      </Label>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        variant={variant}
        size={size}
        disabled={disabled}
        multiline={multiline}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        style={error ? styles.inputError : undefined}
        testID={testID ? `${testID}-input` : undefined}
      />
      {error && (
        <Label
          variant="error"
          size="small"
          style={styles.errorText}
          testID={testID ? `${testID}-error` : undefined}
        >
          {error}
        </Label>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  inputError: {
    borderColor: '#DC2626',
  },
  errorText: {
    marginTop: 4,
  },
});

export default FormField;