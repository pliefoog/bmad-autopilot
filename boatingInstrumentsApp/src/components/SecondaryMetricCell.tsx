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
  cellHeight?: number; // Cell height from UnifiedWidgetGrid
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
  cellHeight,
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
  }, [value, mnemonic, unit, maxWidth, cellHeight, customFontSize, precision]);
  
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
      width: '100%', // Fill parent cell width
      height: '100%', // Fill parent cell height
      flexDirection: 'column', // Stack vertically
      alignItems: 'flex-end', // Always right-align (UnifiedWidgetGrid v2 requirement)
      justifyContent: 'space-between', // Distribute mnemonic and value to fill height
      paddingVertical: 0, // No padding for tight fit
      paddingHorizontal: 0,
      paddingRight: 2, // Small inset from cell border
    },
    mnemonicUnitRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'flex-end', // Always right-align (UnifiedWidgetGrid v2 requirement)
      marginBottom: 0, // No extra margin, let space-between handle it
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