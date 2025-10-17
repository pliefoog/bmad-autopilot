import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../core/themeStore';

interface SecondaryMetricCellProps {
  mnemonic: string;              // "AVG", "MAX", "MIN" (10pt, semibold, uppercase)
  value: string | number | null; // Secondary value (24pt, monospace, bold)
  unit?: string;                 // Unit label (10pt, regular, light gray)
  precision?: number;            // Decimal places (default: 1)
  state?: 'normal' | 'warning' | 'alarm'; // Inherits from parent widget
  compact?: boolean;             // Use minimal spacing for dense 2×3 layouts
  style?: any;
  testID?: string;               // Accessibility identifier
}

/**
 * SecondaryMetricCell - Smaller secondary metric display component for expanded widget views
 * - Mnemonic: 10pt, uppercase, semibold, theme.textSecondary
 * - Value: 24pt, monospace, bold, theme.text (or state color)
 * - Unit: 10pt, regular, theme.textSecondary (light gray)
 * - Compact mode: Reduced spacing for dense 2×3 layouts
 */
export const SecondaryMetricCell: React.FC<SecondaryMetricCellProps> = ({
  mnemonic,
  value,
  unit,
  precision = 1,
  state = 'normal',
  compact = false,
  style,
  testID,
}) => {
  const theme = useTheme();
  const styles = createStyles(theme, compact);

  const getValueColor = () => {
    switch (state) {
      case 'alarm':
        return theme.error;
      case 'warning':
        return theme.warning;
      case 'normal':
      default:
        return theme.text;
    }
  };

  // Format value for display with precision
  const formatValue = (val: string | number | null): string => {
    if (val === undefined || val === null || val === '') {
      return '---';
    }
    
    if (typeof val === 'number') {
      return val.toFixed(precision);
    }
    
    return val.toString();
  };

  const displayValue = formatValue(value);

  return (
    <View style={[styles.container, style]} testID={testID || "secondary-metric-cell"}>
      {/* First line: Mnemonic and Unit */}
      <View style={styles.mnemonicUnitRow}>
        <Text style={styles.mnemonic} testID="secondary-metric-mnemonic">
          {mnemonic.toUpperCase()}
        </Text>
        {unit && (
          <Text style={styles.unit} testID="secondary-metric-unit">
            ({unit})
          </Text>
        )}
      </View>
      {/* Second line: Value */}
      <View style={styles.valueContainer}>
        <Text 
          style={[styles.value, { color: getValueColor() }]} 
          testID="secondary-metric-value"
        >
          {displayValue}
        </Text>
      </View>
    </View>
  );
};

const createStyles = (theme: any, compact: boolean) =>
  StyleSheet.create({
    container: {
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingVertical: compact ? 2 : 3,
      paddingHorizontal: compact ? 4 : 6,
      minHeight: compact ? 50 : 60,
    },
    mnemonicUnitRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: compact ? 2 : 3,
    },
    mnemonic: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginRight: 3,
    },
    unit: {
      fontSize: 10,
      fontWeight: '400',
      color: theme.textSecondary,
      letterSpacing: 0,
      marginLeft: 1,
    },
    valueContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'flex-start',
    },
    value: {
      fontSize: 24,
      fontWeight: '700',
      fontFamily: 'monospace',
      letterSpacing: 0,
      lineHeight: 28,
    },
  });

export default SecondaryMetricCell;