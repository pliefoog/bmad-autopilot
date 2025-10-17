import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';
import { PlatformStyles } from '../utils/animationUtils';

interface ThemedViewProps {
  children: React.ReactNode;
  style?: any;
  surface?: boolean;
  card?: boolean;
  testID?: string;
}

export const ThemedView: React.FC<ThemedViewProps> = ({
  children,
  style,
  surface = false,
  card = false,
  testID,
}) => {
  const { colors, borderRadius, spacing, shadows } = useTheme();

  const containerStyle = [
    { backgroundColor: colors.background },
    surface && {
      backgroundColor: colors.surface,
      borderRadius,
      borderWidth: 1,
      borderColor: colors.border,
    },
    card && {
      backgroundColor: colors.cardBackground,
      borderRadius,
      padding: spacing.md,
      marginVertical: spacing.sm,
      ...(shadows && {
        ...PlatformStyles.boxShadow(colors.shadow, { x: 0, y: 2 }, 4, 0.1),
        elevation: 3,
      }),
    },
    style,
  ];

  return (
    <View style={containerStyle} testID={testID}>
      {children}
    </View>
  );
};

interface ThemedTextProps {
  children: React.ReactNode;
  style?: any;
  variant?: 'body' | 'heading' | 'subheading' | 'secondary' | 'error' | 'warning' | 'success';
  testID?: string;
}

export const ThemedText: React.FC<ThemedTextProps> = ({
  children,
  style,
  variant = 'body',
  testID,
}) => {
  const { colors, fontSize, fontWeight } = useTheme();

  const getTextStyle = () => {
    const baseStyle = {
      color: colors.text,
      fontSize,
      fontWeight: fontWeight as any,
    };

    switch (variant) {
      case 'heading':
        return {
          ...baseStyle,
          fontSize: fontSize * 1.25,
          fontWeight: '600' as any,
        };
      case 'subheading':
        return {
          ...baseStyle,
          fontSize: fontSize * 1.125,
          fontWeight: '500' as any,
          color: colors.textSecondary,
        };
      case 'secondary':
        return {
          ...baseStyle,
          fontSize: fontSize * 0.875,
          color: colors.textSecondary,
        };
      case 'error':
        return {
          ...baseStyle,
          color: colors.error,
        };
      case 'warning':
        return {
          ...baseStyle,
          color: colors.warning,
        };
      case 'success':
        return {
          ...baseStyle,
          color: colors.success,
        };
      default:
        return baseStyle;
    }
  };

  return (
    <Text style={[getTextStyle(), style]} testID={testID}>
      {children}
    </Text>
  );
};

interface MarineValueDisplayProps {
  value: string | number;
  unit?: string;
  label?: string;
  status?: 'normal' | 'warning' | 'error' | 'success';
  size?: 'small' | 'medium' | 'large';
  testID?: string;
}

export const MarineValueDisplay: React.FC<MarineValueDisplayProps> = ({
  value,
  unit,
  label,
  status = 'normal',
  size = 'medium',
  testID,
}) => {
  const { colors, fontSize, spacing } = useTheme();

  const getStatusColor = () => {
    switch (status) {
      case 'warning': return colors.warning;
      case 'error': return colors.error;
      case 'success': return colors.success;
      default: return colors.text;
    }
  };

  const getValueSize = () => {
    switch (size) {
      case 'small': return fontSize * 1.5;
      case 'medium': return fontSize * 2;
      case 'large': return fontSize * 2.5;
      default: return fontSize * 2;
    }
  };

  return (
    <View style={styles.container} testID={testID}>
      {label && (
        <ThemedText variant="secondary" style={styles.label}>
          {label}
        </ThemedText>
      )}
      <View style={styles.valueContainer}>
        <Text
          style={[
            styles.value,
            { 
              color: getStatusColor(), 
              fontSize: getValueSize(),
              fontWeight: '700' as any,
            }
          ]}
          testID={testID ? `${testID}-value` : undefined}
        >
          {value}
        </Text>
        {unit && (
          <ThemedText 
            variant="secondary" 
            style={[styles.unit, { fontSize: fontSize * 0.875 }]}
            testID={testID ? `${testID}-unit` : undefined}
          >
            {unit}
          </ThemedText>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    marginBottom: 4,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    textAlign: 'center',
  },
  unit: {
    marginLeft: 4,
  },
});