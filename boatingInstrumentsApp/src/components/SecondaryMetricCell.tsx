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
    
    // BASE COMPOSITION - Standard sizes for MetricCell
    const BASE_MNEMONIC_SIZE = customFontSize?.mnemonic ?? 12;
    const BASE_VALUE_SIZE = customFontSize?.value ?? 36;
    const BASE_UNIT_SIZE = customFontSize?.unit ?? 12; // Same as mnemonic
    const BASE_SPACE_SIZE = 4; // Constant space between mnemonic and value
    
    // Calculate total base height
    const BASE_TOTAL_HEIGHT = BASE_MNEMONIC_SIZE + BASE_SPACE_SIZE + BASE_VALUE_SIZE;
    
    let mnemonicFontSize = BASE_MNEMONIC_SIZE;
    let valueFontSize = BASE_VALUE_SIZE;
    let unitFontSize = BASE_UNIT_SIZE;
    let spaceSize = BASE_SPACE_SIZE;
    
    // HEIGHT SCALING - Scale all elements proportionally to fit available height
    if (cellHeight && cellHeight > 0) {
      const availableHeight = cellHeight;
      
      // Calculate height scaling factor
      const heightScaleFactor = availableHeight / BASE_TOTAL_HEIGHT;
      
      // Apply height scaling to all elements
      mnemonicFontSize = BASE_MNEMONIC_SIZE * heightScaleFactor;
      valueFontSize = BASE_VALUE_SIZE * heightScaleFactor;
      unitFontSize = BASE_UNIT_SIZE * heightScaleFactor;
      spaceSize = BASE_SPACE_SIZE * heightScaleFactor;
    }
    
    // WIDTH SCALING - Only scale value if it exceeds available width
    if (maxWidth && maxWidth > 0) {
      // Account for internal container padding (paddingRight: 6)
      const CONTAINER_PADDING_RIGHT = 0;
      const actualAvailableWidth = maxWidth - CONTAINER_PADDING_RIGHT;
      
      // Character width estimation for monospace
      // Account for degree symbols, directional letters, special characters
      const CHAR_WIDTH_RATIO = 0.6;
      const PADDING_RESERVE = 0.95; // Use 95% of actual width, leave 5% padding
      
      // Calculate required width for scaled value
      const scaledValueWidth = displayValue.length * (valueFontSize * CHAR_WIDTH_RATIO);
      const targetWidth = actualAvailableWidth * PADDING_RESERVE;
      
      // If value exceeds available width, calculate width scaling factor
      if (scaledValueWidth > targetWidth) {
        const widthScaleFactor = targetWidth / scaledValueWidth;
        
        // Apply width scaling ONLY to value (not mnemonic, not unit, not space)
        valueFontSize = valueFontSize * widthScaleFactor;
      }
    }
    
    return {
      value: Math.max(1, valueFontSize), // Minimum 1pt to prevent zero-size
      mnemonic: Math.max(1, mnemonicFontSize),
      unit: Math.max(1, unitFontSize),
      space: Math.max(1, spaceSize), // Return calculated space for layout
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
  sizes: { value: number; mnemonic: number; unit: number; space: number },
  align: 'left' | 'right' | 'center' = 'right'
) =>
  StyleSheet.create({
    container: {
      width: '100%', // Fill parent cell width
      height: '100%', // Fill parent cell height
      flexDirection: 'column', // Stack vertically
      alignItems: 'flex-end', // Always right-align (UnifiedWidgetGrid v2 requirement)
      justifyContent: 'flex-start', // Align to top, let flex handle spacing
      paddingVertical: 0, // No padding for tight fit
      paddingHorizontal: 0,
      paddingRight: 6, // Inset from cell border to prevent text overflow
    },
    mnemonicUnitRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'flex-end', // Always right-align (UnifiedWidgetGrid v2 requirement)
      marginBottom: sizes.space, // Constant scaled space between mnemonic and value
    },
    mnemonic: {
      fontSize: sizes.mnemonic, // Dynamic sizing based on content and maxWidth
      lineHeight: sizes.mnemonic, // Explicit tight line height
      fontWeight: '600',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginRight: 4, // Match PrimaryMetricCell spacing
      flexShrink: 1, // Allow shrinking if needed
    },
    unit: {
      fontSize: sizes.unit, // Dynamic sizing based on content and maxWidth
      lineHeight: sizes.unit, // Explicit tight line height
      fontWeight: '400',
      color: theme.textSecondary,
      letterSpacing: 0,
      marginLeft: 2, // Match PrimaryMetricCell spacing
      marginTop: 0, // baseline alignment
      flexShrink: 0, // Don't shrink units
    },
    valueContainer: {
      flex: 1, // Take all remaining space to push value to bottom
      flexDirection: 'row',
      alignItems: 'flex-end', // Align text to bottom of container
      justifyContent: align === 'center' ? 'center' : (align === 'right' ? 'flex-end' : 'flex-start'),
    },
    value: {
      fontSize: sizes.value, // Dynamic sizing based on content and maxWidth
      fontWeight: '700',
      fontFamily: 'monospace',
      letterSpacing: 0,
      lineHeight: sizes.value, // Tight line height = font size for full vertical fill
      flexShrink: 0, // Prevent shrinking to maintain consistent width
    },
  });

export default SecondaryMetricCell;