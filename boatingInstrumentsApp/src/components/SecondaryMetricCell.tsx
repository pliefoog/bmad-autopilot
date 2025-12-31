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

  // Render metric display (same layout as PrimaryMetricCell, just different color)
  return (
    <View style={styles.container} testID={testID || `secondary-metric-${metricKey}`}>
      <View style={styles.mnemonicUnitRow}>
        <Text style={styles.mnemonic}>{mnemonic}</Text>
        {unit && <Text style={styles.unit}> ({unit})</Text>}
      </View>
      <Text style={styles.value}>{displayValue}</Text>
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
      // No width: '100%' - explicit width from TemplatedWidget via cellWidth prop
      // No height: '100%' - explicit height from TemplatedWidget via cellHeight prop
      flexDirection: 'column', // Stack vertically
      alignItems: 'flex-end', // Right-align all content within the cell
      justifyContent: 'flex-start', // Align to top, let flex handle spacing
      paddingVertical: 0, // No padding for tight fit
      paddingHorizontal: 0,
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

    // AC 2: Value: 36-48pt, monospace, bold, alarm-based color (now dynamic)
    value: {
      fontSize: sizes.value,
      fontWeight: '700', // Bold
      fontFamily: 'monospace', // AC 16: monospace font provides consistent digit widths
      color: valueColor,
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
    value: {
      fontSize: sizes.value,
      lineHeight: sizes.value,
      fontWeight: '700',
      fontFamily: 'monospace',
      color: valueColor,
    },
  });

export default SecondaryMetricCell;
