import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';

interface LabelProps {
  children: string;
  variant?: 'default' | 'required' | 'optional' | 'error';
  size?: 'small' | 'medium' | 'large';
  htmlFor?: string;
  style?: TextStyle;
  testID?: string;
}

const Label: React.FC<LabelProps> = ({
  children,
  variant = 'default',
  size = 'medium',
  style,
  testID,
}) => {
  const textStyle = [
    styles.label,
    styles[`label_${variant}`],
    styles[`label_${size}`],
    style,
  ];

  const displayText = variant === 'required' 
    ? `${children} *` 
    : variant === 'optional'
    ? `${children} (optional)`
    : children;

  return (
    <Text style={textStyle} testID={testID}>
      {displayText}
    </Text>
  );
};

const styles = StyleSheet.create({
  label: {
    fontWeight: '500',
    marginBottom: 4,
  },
  label_default: {
    color: '#374151',
  },
  label_required: {
    color: '#374151',
  },
  label_optional: {
    color: '#6B7280',
  },
  label_error: {
    color: '#DC2626',
  },
  label_small: {
    fontSize: 12,
  },
  label_medium: {
    fontSize: 14,
  },
  label_large: {
    fontSize: 16,
  },
});

export default Label;