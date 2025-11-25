import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../store/themeStore';
import { MetricDisplayData } from '../types/MetricDisplayData';

interface PrimaryMetricCellProps {
  // New unified interface (preferred)
  data?: MetricDisplayData;
  
  // Legacy individual props (for backward compatibility)
  mnemonic?: string;
  value?: string | number;
  unit?: string;
  
  // Common props
  state?: 'normal' | 'warning' | 'alarm';
  style?: any;
  maxWidth?: number; // Optional max width constraint
  minWidth?: number; // Optional min width constraint (legacy - use data.layout.minWidth)
  testID?: string;
  
  // Responsive font sizes (optional - overrides defaults)
  fontSize?: {
    mnemonic?: number;
    value?: number;
    unit?: number;
  };
}

/**
 * Standardized primary metric display component with dynamic sizing support:
 * - Mnemonic: 12pt, uppercase, semibold, theme.textSecondary
 * - Value: 36pt, monospace, bold, theme.text (or state color)
 * - Unit: 16pt, regular, theme.textSecondary
 * - Spacing: 4pt between mnemonic and value, 2pt between value and unit
 * - Dynamic sizing: Adjusts font size based on content length and available width
 * 
 * Story 9.6: Removed legacy useUnitConversion - uses MetricDisplayData exclusively
 */
export const PrimaryMetricCell: React.FC<PrimaryMetricCellProps> = ({
  data,
  mnemonic: legacyMnemonic,
  value: legacyValue,
  unit: legacyUnit,
  state = 'normal',
  style,
  maxWidth,
  minWidth: legacyMinWidth,
  testID,
  fontSize: customFontSize,
}) => {
  const theme = useTheme();

  // Extract values - prefer data prop over legacy individual props
  const mnemonic = data?.mnemonic ?? legacyMnemonic ?? '';
  const value = data?.value ?? legacyValue ?? '';
  const unit = data?.unit ?? legacyUnit ?? '';
  
  // Use layout information from MetricDisplayData if available
  const minWidth = data?.layout?.minWidth ?? legacyMinWidth;
  const alignment = data?.layout?.alignment ?? 'right';

  // Calculate dynamic font sizes based on content length and constraints
  const dynamicSizes = useMemo(() => {
    const displayValue = (value !== undefined && value !== null && value !== '') 
      ? value.toString() 
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
  }, [value, mnemonic, unit, maxWidth]);

  const styles = createStyles(theme, dynamicSizes);

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

  // Format value for display
  const displayValue = (value !== undefined && value !== null && value !== '') 
    ? value.toString() 
    : '---';

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
    <View style={containerStyle} testID={testID || "primary-metric-cell"}>
      {/* First line: Mnemonic and Unit */}
      <View style={styles.mnemonicUnitRow}>
        <Text style={styles.mnemonic} testID="metric-mnemonic">{mnemonic.toUpperCase()}</Text>
        <Text style={styles.unit} testID="metric-unit">({unit || ''})</Text>
      </View>
      {/* Second line: Value */}
      <View style={valueContainerStyle}>
        <Text 
          style={valueTextStyle}
          testID="metric-value"
        >
          {displayValue}
        </Text>
      </View>
    </View>
  );
};

const createStyles = (theme: any, sizes: { value: number; mnemonic: number; unit: number }) =>
  StyleSheet.create({
    container: {
      alignItems: 'flex-end', // Right-align all content within the cell
      justifyContent: 'center',
      paddingVertical: 4,
      paddingHorizontal: 8,
      minHeight: 70,
    },
    // Add row style for mnemonic + unit
    mnemonicUnitRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'flex-end', // Right-align mnemonic and unit
      marginBottom: 4, // spacing between first and second line
    },
    mnemonic: {
      fontSize: sizes.mnemonic,
      fontWeight: '600',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginRight: 4, // spacing between mnemonic and unit
      flexShrink: 1, // Allow shrinking if needed
    },
    
    valueContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'flex-end', // Right-align the value within its container
    },
    
    // AC 2: Value: 36-48pt, monospace, bold, theme.text (now dynamic)
    value: {
      fontSize: sizes.value,
      fontWeight: '700', // Bold
      fontFamily: 'monospace', // AC 16: monospace font provides consistent digit widths
      letterSpacing: 0,
      lineHeight: sizes.value + 4, // Ensure consistent line height
      flexShrink: 0, // Prevent shrinking to maintain consistent width
    },
    
    // AC 2: Unit: 14-16pt, regular, theme.textSecondary (now dynamic)
    unit: {
      fontSize: sizes.unit,
      fontWeight: '400', // Regular
      color: theme.textSecondary,
      letterSpacing: 0,
      marginLeft: 2, // tighter spacing between mnemonic and unit
      marginTop: 0, // baseline alignment
      flexShrink: 0, // Don't shrink units
    },
  });

export default PrimaryMetricCell;