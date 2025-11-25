import React, { useMemo } from 'react';
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
  align?: 'left' | 'right';      // Horizontal alignment (default: right)
  style?: any;
  maxWidth?: number; // Optional max width constraint for dynamic sizing
  minWidth?: number; // Optional min width constraint (legacy - use data.layout.minWidth)
  testID?: string;               // Accessibility identifier
  
  // Responsive font sizes (optional - overrides defaults)
  fontSize?: {
    mnemonic?: number;
    value?: number;
    unit?: number;
  };
}

/**
 * SecondaryMetricCell - Secondary metric display component for expanded widget views
 * Matches PrimaryMetricCell sizing and positioning with responsive font sizes
 * - Mnemonic: Responsive (default 12pt), uppercase, semibold, theme.textSecondary
 * - Value: Responsive (default 36pt), monospace, bold, theme.textSecondary (MUTED - not theme.text)
 * - Unit: Responsive (default 12pt), regular, theme.textSecondary
 * - Right-aligned by default to match PrimaryMetricCell
 * - Key difference: Values use textSecondary instead of text for reduced emphasis
 * - Responsive: fontSize prop allows dynamic scaling based on widget size
 */
export const SecondaryMetricCell: React.FC<SecondaryMetricCellProps> = ({
  data,
  mnemonic: legacyMnemonic,
  value: legacyValue,
  unit: legacyUnit,
  precision = 1,
  state = 'normal',
  compact = false,
  align: legacyAlign = 'right', // Default to 'right' to match PrimaryMetricCell
  style,
  maxWidth,
  minWidth: legacyMinWidth,
  testID,
  fontSize: customFontSize,
}) => {
  const theme = useTheme();
  
  // Extract values - prefer data prop over legacy individual props
  const mnemonic = data?.mnemonic ?? legacyMnemonic ?? '';
  const value = data?.value ?? legacyValue ?? null;
  const unit = data?.unit ?? legacyUnit ?? '';
  
  // Use layout information from MetricDisplayData if available
  const minWidth = data?.layout?.minWidth ?? legacyMinWidth;
  const alignment = data?.layout?.alignment === 'left' ? 'left' : 
                   data?.layout?.alignment === 'right' ? 'right' : 
                   legacyAlign === 'left' ? 'left' : 'right';

  // Calculate dynamic font sizes based on content length and constraints
  const dynamicSizes = useMemo(() => {
    const displayValue = (value !== undefined && value !== null && value !== '') 
      ? (typeof value === 'number' ? value.toFixed(precision) : value.toString())
      : '---';
    
    const baseValueSize = customFontSize?.value ?? 36;
    const baseMnemonicSize = customFontSize?.mnemonic ?? 12;
    const baseUnitSize = customFontSize?.unit ?? 12;
    
    // Adjust value font size based on text length and available width
    let valueFontSize = baseValueSize;
    let mnemonicFontSize = baseMnemonicSize;
    let unitFontSize = baseUnitSize;
    
    if (maxWidth) {
      // Estimate text width (rough approximation)
      const estimatedValueWidth = displayValue.length * (baseValueSize * 0.6);
      const estimatedMnemonicWidth = mnemonic.length * (baseMnemonicSize * 0.5);
      const estimatedUnitWidth = unit.length * (baseUnitSize * 0.5);
      
      // Scale down if content would exceed max width
      if (estimatedValueWidth > maxWidth * 0.8) {
        valueFontSize = Math.max(20, (maxWidth * 0.8) / (displayValue.length * 0.6));
      }
      
      if (estimatedMnemonicWidth + estimatedUnitWidth > maxWidth * 0.9) {
        const scale = (maxWidth * 0.9) / (estimatedMnemonicWidth + estimatedUnitWidth);
        mnemonicFontSize = Math.max(10, baseMnemonicSize * scale);
        unitFontSize = Math.max(10, baseUnitSize * scale);
      }
    }
    
    return {
      value: valueFontSize,
      mnemonic: mnemonicFontSize,
      unit: unitFontSize,
    };
  }, [value, mnemonic, unit, maxWidth, customFontSize, precision]);
  
  // Pass dynamic sizes to styles
  const styles = createStyles(theme, dynamicSizes, alignment);

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

  // Apply consistent width styling - prefer MetricDisplayData layout info
  const containerStyle = [
    styles.container,
    style,
    minWidth && { minWidth }, 
    maxWidth && { maxWidth },
    // Use MetricDisplayData layout info if available
    data?.layout && {
      minWidth: data.layout.minWidth,
      alignItems: alignment === 'center' ? 'center' as const : 
                 alignment === 'right' ? 'flex-end' as const : 'flex-start' as const
    }
  ];

  // Value container styling with consistent width and typography for stability  
  const valueContainerStyle = [
    styles.valueContainer,
    // Use MetricDisplayData layout info if available
    data?.layout && {
      alignItems: alignment === 'center' ? 'center' as const : 
                 alignment === 'right' ? 'flex-end' as const : 'flex-start' as const
    }
  ];

  // Value text styling
  const valueTextStyle = {
    ...styles.value,
    color: getValueColor(),
  };

  return (
    <View style={containerStyle} testID={testID || "secondary-metric-cell"}>
      {/* First line: Mnemonic and Unit */}
      <View style={styles.mnemonicUnitRow}>
        <Text style={styles.mnemonic} testID="secondary-metric-mnemonic">
          {mnemonic.toUpperCase()}
        </Text>
        <Text style={styles.unit} testID="secondary-metric-unit">
          ({unit || ''})
        </Text>
      </View>
      {/* Second line: Value */}
      <View style={valueContainerStyle}>
        <Text 
          style={valueTextStyle}
          testID="secondary-metric-value"
        >
          {displayValue}
        </Text>
      </View>
    </View>
  );
};

const createStyles = (
  theme: any, 
  sizes: { value: number; mnemonic: number; unit: number },
  align: 'left' | 'right' | 'center' = 'right'
) =>
  StyleSheet.create({
    container: {
      alignItems: align === 'center' ? 'center' : (align === 'right' ? 'flex-end' : 'flex-start'),
      justifyContent: 'center',
      paddingVertical: 4, // Match PrimaryMetricCell padding
      paddingHorizontal: 8, // Match PrimaryMetricCell padding
      minHeight: 70, // Match PrimaryMetricCell minHeight
    },
    mnemonicUnitRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: align === 'center' ? 'center' : (align === 'right' ? 'flex-end' : 'flex-start'),
      marginBottom: 4, // Match PrimaryMetricCell spacing
    },
    mnemonic: {
      fontSize: sizes.mnemonic, // Dynamic sizing based on content and maxWidth
      fontWeight: '600',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginRight: 4, // Match PrimaryMetricCell spacing
      flexShrink: 1, // Allow shrinking if needed
    },
    unit: {
      fontSize: sizes.unit, // Dynamic sizing based on content and maxWidth
      fontWeight: '400',
      color: theme.textSecondary,
      letterSpacing: 0,
      marginLeft: 2, // Match PrimaryMetricCell spacing
      marginTop: 0, // baseline alignment
      flexShrink: 0, // Don't shrink units
    },
    valueContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: align === 'center' ? 'center' : (align === 'right' ? 'flex-end' : 'flex-start'),
    },
    value: {
      fontSize: sizes.value, // Dynamic sizing based on content and maxWidth
      fontWeight: '700',
      fontFamily: 'monospace',
      letterSpacing: 0,
      lineHeight: sizes.value + 4, // Match PrimaryMetricCell line height calculation
      flexShrink: 0, // Prevent shrinking to maintain consistent width
    },
  });

export default SecondaryMetricCell;