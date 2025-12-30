import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../store/themeStore';
import { FlashingText } from './FlashingText';
import { ALARM_VISUAL_STATES } from '../types/AlarmTypes';
import type { AlarmLevel } from '../types/AlarmTypes';
import type { SensorType } from '../types/SensorData';
import { useSensorContext } from '../contexts/SensorContext';
import { getSensorField } from '../registry/SensorConfigRegistry';

/**
 * SecondaryMetricCell Props
 * 
 * **Registry-First Auto-Fetch Pattern:**
 * Only requires metricKey - everything else auto-fetched from context.
 */
interface SecondaryMetricCellProps {
  /** 
   * Metric key to display (e.g., 'voltage', 'rpm', 'depth')
   * Must match field key in SensorConfigRegistry
   */
  metricKey: string;
  /**
   * Sensor key for multi-sensor widgets (e.g., 'gps', 'speed')
   * Defaults to primary sensor if not specified.
   */
  sensorKey?: SensorType;  
  // Optional styling overrides
  style?: any;
  cellWidth?: number;
  cellHeight?: number;
  testID?: string;
  fontSize?: {
    mnemonic?: number;
    value?: number;
    unit?: number;
  };
}

/**
 * SecondaryMetricCell - Registry-first auto-fetch secondary metric display
 * 
 * **Auto-Fetch Pattern:**
 * Same as PrimaryMetricCell but with smaller, inline styling.
 * 
 * **For AI Agents:**
 * Secondary cells are for less critical metrics in bottom section of widgets.
 */
export const SecondaryMetricCell: React.FC<SecondaryMetricCellProps> = ({
  metricKey,
  sensorKey,
  style,
  cellWidth,
  cellHeight,
  testID,
  fontSize: customFontSize,
}) => {
  const theme = useTheme();

  // Auto-fetch sensor data from context (primary or secondary sensor)
  const { sensorInstance, sensorType } = useSensorContext(sensorKey);
  
  // Auto-fetch metric value from sensor instance
  const metricValue = sensorInstance?.getMetric(metricKey);
  
  // Auto-fetch field configuration from registry
  const fieldConfig = useMemo(() => {
    try {
      return getSensorField(sensorType, metricKey);
    } catch (error) {
      console.error(`SecondaryMetricCell: Invalid metricKey "${metricKey}" for sensor "${sensorType}"`, error);
      return null;
    }
  }, [sensorType, metricKey]);

  // Extract display values (all pre-enriched by MetricValue)
  const mnemonic = fieldConfig?.mnemonic ?? metricKey.toUpperCase().slice(0, 5);
  const value = metricValue?.formattedValue ?? '---';
  const unit = metricValue?.unit ?? '';
  const alarmLevel: AlarmLevel = sensorInstance?.getAlarmState(metricKey) ?? 0;

  const displayValue = value;

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

    if (cellWidth && cellWidth > 0) {
      const actualAvailableWidth = cellWidth;
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
  }, [displayValue, cellWidth, cellHeight, customFontSize]);

  // Get alarm-based color
  const valueColor = (() => {
    const visualState = ALARM_VISUAL_STATES[alarmLevel];
    if (visualState.color === 'red') return theme.error;
    if (visualState.color === 'orange') return theme.warning;
    return theme.textSecondary;
  })();

  const styles = createStyles(theme, dynamicSizes, valueColor);

  // DEBUG: Render orange translucent box to visualize dimensions
  return (
    <View 
      style={[
        styles.container,
        cellWidth && { width: cellWidth },
        cellHeight && { height: cellHeight },
        { 
          backgroundColor: 'rgba(255, 165, 0, 0.5)', // Orange with 50% opacity
          justifyContent: 'center',
          alignItems: 'center',
        }
      ]} 
      testID={testID || `secondary-metric-${metricKey}`}
    >
      <Text style={{ fontSize: 10, color: '#000' }}>
        {cellWidth ? `${cellWidth.toFixed(0)}×${cellHeight?.toFixed(0)}` : 'no dims'}
      </Text>
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
      // Don't use flex: 1 - explicit width from TemplatedWidget
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
