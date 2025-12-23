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
    const displayValue =
      value !== undefined && value !== null && value !== '' ? value.toString() : '---';

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
  const displayValue =
    value !== undefined && value !== null && value !== '' ? value.toString() : '---';

  // Apply consistent width styling - prefer MetricDisplayData layout info
  const containerStyle = [
    styles.container,
    style,
    minWidth ? { minWidth } : null,
    maxWidth ? { maxWidth } : null,
    cellHeight ? { height: cellHeight } : null,
    // Use MetricDisplayData layout info if available
    data?.layout
      ? {
          minWidth: data.layout.minWidth,
          alignItems:
            alignment === 'center'
              ? ('center' as const)
              : alignment === 'right'
              ? ('flex-end' as const)
              : ('flex-start' as const),
        }
      : null,
  ].filter(Boolean);

  // Value container styling with consistent width and typography for stability
  const valueContainerStyle = [
    styles.valueContainer,
    // Use MetricDisplayData layout info if available
    data?.layout
      ? {
          alignItems:
            alignment === 'center'
              ? ('center' as const)
              : alignment === 'right'
              ? ('flex-end' as const)
              : ('flex-start' as const),
        }
      : null,
  ].filter(Boolean);

  // Value text styling
  const valueTextStyle = {
    ...styles.value,
    color: getValueColor(),
  };

  return (
    <View style={containerStyle} testID={testID || 'primary-metric-cell'}>
      <View style={styles.mnemonicUnitRow}>
        <Text style={styles.mnemonic} testID="metric-mnemonic">
          {mnemonic.toUpperCase()}
        </Text>
        {unit && unit.trim() !== '' ? (
          <Text style={styles.unit} testID="metric-unit">
            ({unit})
          </Text>
        ) : null}
      </View>
      <View style={valueContainerStyle}>
        <Text style={valueTextStyle} testID="metric-value">
          {displayValue}
        </Text>
      </View>
    </View>
  );
};

const createStyles = (
  theme: any,
  sizes: { value: number; mnemonic: number; unit: number; space: number },
) =>
  StyleSheet.create({
    container: {
      width: '100%', // Fill parent cell width
      height: '100%', // Fill parent cell height
      flexDirection: 'column', // Stack vertically
      alignItems: 'flex-end', // Right-align all content within the cell
      justifyContent: 'flex-start', // Align to top, let flex handle spacing
      paddingVertical: 0, // No padding for tight fit
      paddingHorizontal: 0,
      paddingRight: 6, // Inset from cell border to prevent text overflow
    },
    // Add row style for mnemonic + unit
    mnemonicUnitRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'flex-end', // Right-align mnemonic and unit
      marginBottom: sizes.space, // Constant scaled space between mnemonic and value
    },
    mnemonic: {
      fontSize: sizes.mnemonic,
      lineHeight: sizes.mnemonic, // Explicit tight line height
      fontWeight: '600',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginRight: 4, // spacing between mnemonic and unit
      flexShrink: 1, // Allow shrinking if needed
    },

    valueContainer: {
      flex: 1, // Take all remaining space to push value to bottom
      flexDirection: 'row',
      alignItems: 'flex-end', // Align text to bottom of container
      justifyContent: 'flex-end', // Right-align the value within its container
    },

    // AC 2: Value: 36-48pt, monospace, bold, theme.text (now dynamic)
    value: {
      fontSize: sizes.value,
      fontWeight: '700', // Bold
      fontFamily: 'monospace', // AC 16: monospace font provides consistent digit widths
      letterSpacing: 0,
      lineHeight: sizes.value, // Tight line height = font size for full vertical fill
      flexShrink: 0, // Prevent shrinking to maintain consistent width
    },

    // AC 2: Unit: 14-16pt, regular, theme.textSecondary (now dynamic)
    unit: {
      fontSize: sizes.unit,
      lineHeight: sizes.unit, // Explicit tight line height
      fontWeight: '400', // Regular
      color: theme.textSecondary,
      letterSpacing: 0,
      marginLeft: 2, // tighter spacing between mnemonic and unit
      marginTop: 0, // baseline alignment
      flexShrink: 0, // Don't shrink units
    },
  });

export default PrimaryMetricCell;
