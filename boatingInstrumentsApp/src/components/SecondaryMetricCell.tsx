import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../store/themeStore';
import { FlashingText } from './FlashingText';
import { ALARM_VISUAL_STATES } from '../types/AlarmTypes';
import type { AlarmLevel } from '../types/AlarmTypes';
import type { SensorType, SensorMetricProps } from '../types/SensorData';
import { getFieldDefinition } from '../registry';
import { ConversionRegistry } from '../utils/ConversionRegistry';
import { useMetricValue, useSensorInstance } from '../contexts/MetricContext';
import { log } from '../utils/logging/logger';

/**
 * SecondaryMetricCell Props (Explicit Props Pattern - Dec 2024 Refactor)
 *
 * **Explicit Props Architecture:**
 * Requires sensorType, instance, and metricKey as direct props.
 * No React Context - all sensor data passed explicitly.
 *
 * **Virtual Metrics Support (Dot Notation):**
 * Identical to PrimaryMetricCell - supports computed statistics:
 * - `metricKey="depth"` → current depth value
 * - `metricKey="depth.min"` → MIN DEPTH (session minimum)
 * - `metricKey="depth.max"` → MAX DEPTH (session maximum)
 * - `metricKey="pressure.avg"` → AVG PRESSURE (session average)
 *
 * Virtual metrics calculated in SensorInstance.getMetric() from history buffer.
 */
interface SecondaryMetricCellProps extends SensorMetricProps {
  // SensorMetricProps provides: sensorType, instance, metricKey
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
 * SecondaryMetricCell - Registry-first auto-fetch secondary metric display with virtual metrics
 *
 * **Auto-Fetch Pattern:**
 * Same as PrimaryMetricCell but with smaller, inline styling for secondary metrics.
 * Fully supports virtual stat metrics with dot notation.
 *
 * **Virtual Metrics (Dot Notation):**
 * - Component strips `.stat` suffix for registry lookup
 * - Calls `sensorInstance.getMetric(metricKey)` which handles calculation
 * - Adds stat prefix to mnemonic: "DEPTH" → "MIN DEPTH"
 *
 * **For AI Agents:**
 * Secondary cells display less critical metrics in bottom section of widgets.
 * Use for session stats, metadata, or auxiliary measurements.
 * Pattern identical to PrimaryMetricCell - NEVER add calculation logic here.
 *
 * **Performance Optimization:**
 * - Wrapped with React.memo to prevent parent-triggered re-renders
 * - Only re-renders when props actually change (sensor type, instance, metric key, sizing)
 * - Reduces React Native bridge crossings on high-frequency dashboards (64 cells × 10Hz updates)
 */
export const SecondaryMetricCell: React.FC<SecondaryMetricCellProps> = React.memo(({
  sensorType,
  instance,
  metricKey,
  style,
  cellWidth,
  cellHeight,
  testID,
  fontSize: customFontSize,
}) => {
  const theme = useTheme();

  // Subscribe to specific metric using MetricContext
  // This replaces the old useMetric hook that subscribed to nmeaStore
  const metricValue = useMetricValue(sensorType, instance, metricKey);

  // Get sensor instance for string field handling
  const sensorInstance = useSensorInstance(sensorType, instance);

  // NOTE: MetricContext provides fine-grained subscriptions via SensorDataRegistry.
  // Only re-renders when THIS specific metric changes, not the entire sensor.

  // Extract base field name for registry lookup (remove .min/.max/.avg suffix if present)
  const baseMetricKey = metricKey.replace(/\.(min|max|avg)$/, '');

  // Auto-fetch field configuration from registry (use base field name)
  const fieldConfig = useMemo(() => {
    try {
      return getFieldDefinition(sensorType, baseMetricKey);
    } catch (error) {
      log.app('SecondaryMetricCell: Invalid metricKey', () => ({
        metricKey: baseMetricKey,
        sensorType,
        error: error instanceof Error ? error.message : String(error),
      }));
      return null;
    }
  }, [sensorType, baseMetricKey]);

  // Extract display values
  const mnemonic = useMemo(() => {
    const baseMnemonic = fieldConfig?.mnemonic ?? baseMetricKey.toUpperCase().slice(0, 5);
    // Add stat prefix if this is a virtual stat metric
    const statMatch = metricKey.match(/\.(min|max|avg)$/);
    if (statMatch) {
      return `${statMatch[1].toUpperCase()} ${baseMnemonic}`;
    }
    return baseMnemonic;
  }, [fieldConfig?.mnemonic, baseMetricKey, metricKey]);

  // Handle string fields (name, type, chemistry, etc.) vs numeric fields
  const value = useMemo(() => {
    if (fieldConfig?.type === 'text' || fieldConfig?.type === 'picker') {
      // String/picker fields: retrieve from sensor instance
      // These are stored as raw values, not MetricValues
      const stringMetric = sensorInstance?.getMetric(metricKey);
      return stringMetric?.formattedValue ?? '---';
    }
    if (fieldConfig?.type === 'toggle') {
      // Toggle fields: retrieve boolean and display as ON/OFF
      const toggleMetric = sensorInstance?.getMetric(metricKey);
      const boolValue = toggleMetric?.si_value;
      return boolValue === true ? 'ON' : boolValue === false ? 'OFF' : '---';
    }
    // Numeric fields: use pre-enriched formattedValue from MetricValue
    // This includes virtual stat metrics (depth_min, depth_max, etc.)
    return metricValue?.formattedValue ?? '---';
  }, [fieldConfig?.valueType, sensorInstance, metricKey, metricValue?.formattedValue]);

  // Get unit: prefer from MetricValue (when data exists), fallback to registry category
  const unit = useMemo(() => {
    // String/picker fields don't have units
    if (fieldConfig?.type === 'text' || fieldConfig?.type === 'picker' || fieldConfig?.type === 'toggle') {
      return '';
    }

    // If metricValue has a unit (data exists), use it
    if (metricValue?.unit) {
      return metricValue.unit;
    }

    // If no data but field has unitType, get unit from ConversionRegistry
    if (fieldConfig?.unitType) {
      try {
        return ConversionRegistry.getUnit(fieldConfig.unitType);
      } catch (error) {
        // Category not found, return empty string
        return '';
      }
    }

    return '';
  }, [fieldConfig?.valueType, fieldConfig?.unitType, metricValue?.unit]);

  // Get alarm state from subscription (includes alarmState in EnrichedMetric)
  const alarmLevel: AlarmLevel = metricValue?.alarmState ?? 0;

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

  // Sanitize unit - prevent text node leaks (period character, empty strings)
  const hasValidUnit = unit && unit.trim() !== '' && unit.trim() !== '.';

  // Render metric display (same layout as PrimaryMetricCell, just different color)
  return (
    <View style={styles.container} testID={testID || `secondary-metric-${metricKey}`}>
      <View style={styles.mnemonicUnitRow}>
        <Text style={styles.mnemonic}>{mnemonic}</Text>
        {hasValidUnit ? <Text style={styles.unit}> ({unit})</Text> : null}
      </View>
      <Text style={styles.value}>{displayValue}</Text>
    </View>
  );
});

SecondaryMetricCell.displayName = 'SecondaryMetricCell';

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
  });

SecondaryMetricCell.displayName = 'SecondaryMetricCell';

export default SecondaryMetricCell;
