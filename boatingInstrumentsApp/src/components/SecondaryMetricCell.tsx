import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../store/themeStore';
import { MetricDisplayData } from '../types/MetricDisplayData';

interface SecondaryMetricCellProps {
  // New unified interface (preferred)
  data?: MetricDisplayData;
  
  // Legacy individual props (for backward compatibility)
  mnemonic?: string;              // "AVG", "MAX", "MIN" (10pt, semibold, uppercase)
  value?: string | number | null; // Secondary value (24pt, monospace, bold)
  unit?: string;                 // Unit label (10pt, regular, light gray)
  precision?: number;            // Decimal places (default: 1)
  
  // Common props
  state?: 'normal' | 'warning' | 'alarm'; // Inherits from parent widget
  compact?: boolean;             // Use minimal spacing for dense 2×3 layouts
  align?: 'left' | 'right';      // Horizontal alignment (default: left)
  style?: any;
  testID?: string;               // Accessibility identifier
}

/**
 * SecondaryMetricCell - Secondary metric display component for expanded widget views
 * Matches PrimaryMetricCell sizing but with reduced visual weight (muted colors)
 * - Mnemonic: 12pt, uppercase, semibold, theme.textSecondary
 * - Value: 36pt, monospace, bold, theme.textSecondary (MUTED - not theme.text)
 * - Unit: 12pt, regular, theme.textSecondary
 * - Compact mode: Reduced spacing for dense 2×3 layouts
 * - Key difference: Values use textSecondary instead of text for reduced emphasis
 */
export const SecondaryMetricCell: React.FC<SecondaryMetricCellProps> = ({
  data,
  mnemonic: legacyMnemonic,
  value: legacyValue,
  unit: legacyUnit,
  precision = 1,
  state = 'normal',
  compact = false,
  align: legacyAlign = 'left',
  style,
  testID,
}) => {
  const theme = useTheme();
  
  // Extract values - prefer data prop over legacy individual props
  const mnemonic = data?.mnemonic ?? legacyMnemonic ?? '';
  const value = data?.value ?? legacyValue ?? null;
  const unit = data?.unit ?? legacyUnit ?? '';
  
  // Use layout information from MetricDisplayData if available
  const alignment = data?.layout?.alignment === 'left' ? 'left' : 
                   data?.layout?.alignment === 'right' ? 'right' : legacyAlign;
  
  const styles = createStyles(theme, compact, alignment);

  const getValueColor = () => {
    switch (state) {
      case 'alarm':
        return theme.error;
      case 'warning':
        return theme.warning;
      case 'normal':
      default:
        // Use textSecondary for reduced visual weight (vs theme.text in PrimaryMetricCell)
        return theme.textSecondary;
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

  // Apply layout styling from MetricDisplayData if available
  const containerStyle = [
    styles.container,
    style,
    data?.layout && {
      minWidth: data.layout.minWidth,
      alignItems: alignment === 'right' ? 'flex-end' : 'flex-start',
    }
  ];

  return (
    <View style={containerStyle} testID={testID || "secondary-metric-cell"}>
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
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {displayValue}
        </Text>
      </View>
    </View>
  );
};

const createStyles = (theme: any, compact: boolean, align: 'left' | 'right' = 'left') =>
  StyleSheet.create({
    container: {
      alignItems: align === 'right' ? 'flex-end' : 'flex-start',
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
      fontSize: 12, // Match PrimaryMetricCell (was 10pt)
      fontWeight: '600',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginRight: 4, // Match PrimaryMetricCell spacing
    },
    unit: {
      fontSize: 12, // Match PrimaryMetricCell (was 10pt)
      fontWeight: '400',
      color: theme.textSecondary,
      letterSpacing: 0,
      marginLeft: 2, // Match PrimaryMetricCell spacing
    },
    valueContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
    },
    value: {
      fontSize: 36, // Match PrimaryMetricCell (was 24pt)
      fontWeight: '700',
      fontFamily: 'monospace',
      letterSpacing: 0,
      lineHeight: 40, // Match PrimaryMetricCell line height
    },
  });

export default SecondaryMetricCell;