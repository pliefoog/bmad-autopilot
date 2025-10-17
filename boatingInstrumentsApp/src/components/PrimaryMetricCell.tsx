import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../core/themeStore';

interface PrimaryMetricCellProps {
  mnemonic: string;
  value: string | number;
  unit: string;
  state?: 'normal' | 'warning' | 'alarm';
  style?: any;
  maxWidth?: number; // Optional max width constraint
  minWidth?: number; // Optional min width constraint
}

/**
 * Standardized primary metric display component with dynamic sizing support:
 * - Mnemonic: 12pt, uppercase, semibold, theme.textSecondary
 * - Value: 36pt, monospace, bold, theme.text (or state color)
 * - Unit: 16pt, regular, theme.textSecondary
 * - Spacing: 4pt between mnemonic and value, 2pt between value and unit
 * - Dynamic sizing: Adjusts font size based on content length and available width
 */
export const PrimaryMetricCell: React.FC<PrimaryMetricCellProps> = ({
  mnemonic,
  value,
  unit,
  state = 'normal',
  style,
  maxWidth,
  minWidth = 120,
}) => {
  const theme = useTheme();

  // Calculate dynamic font sizes based on content length and constraints
  const dynamicSizes = useMemo(() => {
    const displayValue = (value !== undefined && value !== null && value !== '') 
      ? value.toString() 
      : '---';
    
    const baseValueSize = 36;
    const baseMnemonicSize = 12;
    const baseUnitSize = 12;
    
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

  return (
    <View style={[styles.container, style, { minWidth, maxWidth }]} testID="primary-metric-cell">
      {/* First line: Mnemonic and Unit */}
      <View style={styles.mnemonicUnitRow}>
        <Text style={styles.mnemonic} testID="metric-mnemonic">{mnemonic.toUpperCase()}</Text>
        <Text style={styles.unit} testID="metric-unit">({unit})</Text>
      </View>
      {/* Second line: Value */}
      <View style={styles.valueContainer}>
        <Text 
          style={[styles.value, { color: getValueColor() }]} 
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
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingVertical: 4,
      paddingHorizontal: 8,
      minHeight: 70,
    },
    // Add row style for mnemonic + unit
    mnemonicUnitRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
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
      justifyContent: 'flex-start',
    },
    
    // AC 2: Value: 36-48pt, monospace, bold, theme.text (now dynamic)
    value: {
      fontSize: sizes.value,
      fontWeight: '700', // Bold
      fontFamily: 'monospace', // AC 16: monospace font to prevent jitter
      letterSpacing: 0,
      lineHeight: sizes.value + 4, // Ensure consistent line height
      flexShrink: 1, // Allow shrinking if needed
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