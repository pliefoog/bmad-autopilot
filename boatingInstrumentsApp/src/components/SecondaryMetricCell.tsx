import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../store/themeStore';
import { FlashingText } from './FlashingText';
import { ALARM_VISUAL_STATES } from '../types/AlarmTypes';
import type { AlarmLevel } from '../types/AlarmTypes';

interface SecondaryMetricCellProps {
  // Unified interface (required)
  data: any;
  
  // Common props
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

  // Extract values from data prop
  const mnemonic = data.mnemonic ?? '';
  const value = data.value ?? '';
  const unit = data.unit ?? '';

  const displayValue =
    value !== null && value !== undefined && value !== ''
      ? typeof value === 'number'
        ? value.toFixed(precision)
        : String(value)
      : '---';

  // Determine alarm level - prefer data.alarmState over legacy state prop
  const alarmLevel: AlarmLevel = data.alarmState ?? (
    state === 'alarm' ? 3 : state === 'warning' ? 2 : 0
  );

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

  // Get alarm-based color
  const valueColor = (() => {
    const visualState = ALARM_VISUAL_STATES[alarmLevel];
    if (visualState.color === 'red') return theme.error;
    if (visualState.color === 'orange') return theme.warning;
    return theme.textSecondary;
  })();

  const styles = createStyles(theme, dynamicSizes, valueColor);

  return (
    <View style={styles.container}>
      <Text style={styles.mnemonic}>
        {mnemonic.toUpperCase()}
        {unit && unit.trim() !== '' ? ` (${unit})` : ''}
      </Text>
      <FlashingText alarmLevel={alarmLevel} style={styles.value}>
        {displayValue}
      </FlashingText>
    </View>
  );
};

const createStyles = (
  theme: any,
  sizes: { value: number; mnemonic: number; unit: number; space: number },
  valueColor: string,
) =>
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
      color: valueColor,
    },
  });

export default SecondaryMetricCell;
