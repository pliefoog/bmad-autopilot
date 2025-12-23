import React, { useMemo } from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';

interface LabelProps {
  children: string;
  variant?: 'default' | 'required' | 'optional' | 'error';
  size?: 'small' | 'medium' | 'large';
  htmlFor?: string;
  style?: TextStyle;
  testID?: string;
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    label: {
      fontWeight: '500',
      marginBottom: 4,
    },
    label_default: {
      color: theme.text,
    },
    label_required: {
      color: theme.text,
    },
    label_optional: {
      color: theme.textSecondary,
    },
    label_error: {
      color: theme.error,
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

const Label: React.FC<LabelProps> = ({
  children,
  variant = 'default',
  size = 'medium',
  style,
  testID,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const textStyle = [styles.label, styles[`label_${variant}`], styles[`label_${size}`], style];

  const displayText =
    variant === 'required'
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

export default Label;
