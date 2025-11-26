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
  cellHeight?: number; // Cell height from UnifiedWidgetGrid
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
  cellHeight,
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
    
    let baseValueSize = customFontSize?.value ?? 36;
    let baseMnemonicSize = customFontSize?.mnemonic ?? 12;
    let baseUnitSize = customFontSize?.unit ?? 12;
    
    // Scale fonts based on cellHeight if provided
    if (cellHeight && cellHeight > 0) {
      // Use full available height (no padding)
      const availableHeight = cellHeight;
      // Mnemonic + Value should fill the height with minimal gap
      
      // Calculate scale factor to fit content
      const desiredTotalSize = availableHeight; // Use full height
      const currentTotalSize = baseMnemonicSize + baseValueSize;
      const scaleFactor = desiredTotalSize / currentTotalSize;
      
      // Apply scaling with reasonable limits (don't go below 50% or above 150%)
      const clampedScale = Math.max(0.5, Math.min(1.5, scaleFactor));
      baseValueSize = baseValueSize * clampedScale;
      baseMnemonicSize = baseMnemonicSize * clampedScale;
      baseUnitSize = baseUnitSize * clampedScale;
    }
    
    // Adjust value font size based on text length and available width
    let valueFontSize = baseValueSize;
    let mnemonicFontSize = baseMnemonicSize;
    let unitFontSize = baseUnitSize;
    
    if (maxWidth && maxWidth > 0) {
      // More accurate character width estimation for monospace numbers
      // Average character width is ~0.55 of font size for monospace digits
      const charWidthRatio = 0.55;
      const estimatedValueWidth = displayValue.length * (baseValueSize * charWidthRatio);
      
      // Only scale down if content significantly exceeds available width
      // Use 90% of maxWidth to leave padding for unit text
      const targetWidth = maxWidth * 0.90;
      
      if (estimatedValueWidth > targetWidth) {
        // Calculate required font size to fit
        const requiredSize = (targetWidth) / (displayValue.length * charWidthRatio);
        // More aggressive scaling: minimum 50% of base size (was 70%)
        valueFontSize = Math.max(baseValueSize * 0.5, Math.min(baseValueSize, requiredSize));
      }
      
      // Labels and units use smaller font, more aggressive scaling
      const labelCharWidth = baseMnemonicSize * 0.5;
      const unitCharWidth = baseUnitSize * 0.5;
      const estimatedMnemonicWidth = mnemonic.length * labelCharWidth;
      const estimatedUnitWidth = unit.length * unitCharWidth;
      
      // Scale mnemonic if too wide
      if (estimatedMnemonicWidth > targetWidth * 0.4) {
        const scale = (targetWidth * 0.4) / estimatedMnemonicWidth;
        mnemonicFontSize = Math.max(baseMnemonicSize * 0.6, baseMnemonicSize * scale);
      }
      
      // Scale unit if too wide (reserve space for value)
      if (estimatedUnitWidth > targetWidth * 0.3) {
        const scale = (targetWidth * 0.3) / estimatedUnitWidth;
        unitFontSize = Math.max(baseUnitSize * 0.6, baseUnitSize * scale);
      }
    }
    
    return {
      value: valueFontSize,
      mnemonic: mnemonicFontSize,
      unit: unitFontSize,
    };
  }, [value, mnemonic, unit, maxWidth, cellHeight, customFontSize]);

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
    cellHeight && { height: cellHeight },
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
        {unit && <Text style={styles.unit} testID="metric-unit">({unit})</Text>}
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
      width: '100%', // Fill parent cell width
      height: '100%', // Fill parent cell height
      flexDirection: 'column', // Stack vertically
      alignItems: 'flex-end', // Right-align all content within the cell
      justifyContent: 'space-between', // Distribute mnemonic and value to fill height
      paddingVertical: 0, // No padding for tight fit
      paddingHorizontal: 0,
      paddingRight: 2, // Small inset from cell border
    },
    // Add row style for mnemonic + unit
    mnemonicUnitRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'flex-end', // Right-align mnemonic and unit
      marginBottom: 0, // No extra margin, let space-between handle it
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