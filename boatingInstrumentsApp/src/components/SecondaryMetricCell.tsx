import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../store/themeStore';

interface SecondaryMetricCellProps {
  data?: any;
  mnemonic?: string;
  value?: string | number | null;
  unit?: string;
  precision?: number;
  state?: 'normal' | 'warning' | 'alarm';
  compact?: boolean;
  align?: 'left' | 'right';
  style?: any;
  maxWidth?: number;
  cellHeight?: number;
  minWidth?: number;
  testID?: string;
  fontSize?: {
    mnemonic?: number;
    value?: number;
    unit?: number;
  };
}

/**
 * SecondaryMetricCell - Secondary metric display component for expanded widget views
 * Uses inline styles to avoid React Native Web textTransform issues
 */
export const SecondaryMetricCell: React.FC<SecondaryMetricCellProps> = ({
  data,
  mnemonic: legacyMnemonic,
  value: legacyValue,
  unit: legacyUnit,
  precision = 1,
  state = 'normal',
  align = 'right',
  style,
  maxWidth,
  cellHeight,
  minWidth,
  testID,
  fontSize: customFontSize,
}) => {
  const theme = useTheme();

  // Extract values - prefer data prop over legacy individual props
  const mnemonic = data?.mnemonic ?? legacyMnemonic ?? '';
  const value = data?.value ?? legacyValue ?? '';
  const unit = data?.unit ?? legacyUnit ?? '';

  const displayValue = value !== null && value !== undefined && value !== '' 
    ? (typeof value === 'number' ? value.toFixed(precision) : String(value))
    : '---';

  // Calculate dynamic font sizes
  const dynamicSizes = useMemo(() => {
    const BASE_MNEMONIC_SIZE = customFontSize?.mnemonic ?? 12;
    const BASE_VALUE_SIZE = customFontSize?.value ?? 36;
    const BASE_UNIT_SIZE = customFontSize?.unit ?? 12;
    const BASE_SPACE_SIZE = 4;
    const BASE_TOTAL_HEIGHT = BASE_MNEMONIC_SIZE + BASE_SPACE_SIZE + BASE_VALUE_SIZE;
    
    let mnemonicFontSize = BASE_MNEMONIC_SIZE;
    let valueFontSize = BASE_VALUE_SIZE;
    let unitFontSize = BASE_UNIT_SIZE;
    let spaceSize = BASE_SPACE_SIZE;
    
    if (cellHeight && cellHeight > 0) {
      const heightScaleFactor = cellHeight / BASE_TOTAL_HEIGHT;
      mnemonicFontSize = BASE_MNEMONIC_SIZE * heightScaleFactor;
      valueFontSize = BASE_VALUE_SIZE * heightScaleFactor;
      unitFontSize = BASE_UNIT_SIZE * heightScaleFactor;
      spaceSize = BASE_SPACE_SIZE * heightScaleFactor;
    }
    
    if (maxWidth && maxWidth > 0) {
      const actualAvailableWidth = maxWidth;
      const CHAR_WIDTH_RATIO = 0.6;
      const PADDING_RESERVE = 0.95;
      const scaledValueWidth = displayValue.length * (valueFontSize * CHAR_WIDTH_RATIO);
      const targetWidth = actualAvailableWidth * PADDING_RESERVE;
      
      if (scaledValueWidth > targetWidth) {
        valueFontSize = valueFontSize * (targetWidth / scaledValueWidth);
      }
    }
    
    return {
      value: Math.max(1, valueFontSize),
      mnemonic: Math.max(1, mnemonicFontSize),
      unit: Math.max(1, unitFontSize),
      space: Math.max(1, spaceSize),
    };
  }, [displayValue, maxWidth, cellHeight, customFontSize]);

  const styles = createStyles(theme, dynamicSizes);

  return (
    <View style={styles.container}>
      <Text style={styles.mnemonic}>
        {mnemonic.toUpperCase()}{unit && unit.trim() !== '' ? ` (${unit})` : ''}
      </Text>
      <Text style={styles.value}>{displayValue}</Text>
    </View>
  );
};

const createStyles = (theme: any, sizes: { value: number; mnemonic: number; unit: number; space: number }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'flex-end',
      justifyContent: 'flex-start',
      paddingRight: 6,
    },
    mnemonic: {
      fontSize: sizes.mnemonic,
      color: theme.textSecondary,
    },
    value: {
      fontSize: sizes.value,
      fontWeight: '700',
      fontFamily: 'monospace',
      color: theme.textSecondary,
    },
  });

export default SecondaryMetricCell;
