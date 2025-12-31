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
 * PrimaryMetricCell Props
 * 
 * **Registry-First Auto-Fetch Pattern:**
 * Only requires metricKey - everything else auto-fetched from context:
 * - Sensor instance from useSensorContext()
 * - Metric data via instance.getMetric(metricKey)
 * - Field config via getSensorField(sensorType, metricKey)
 * 
 * **For AI Agents:**
 * This is the new widget architecture - cells are pure config,
 * all data fetching happens internally via context + registry.
 */
interface PrimaryMetricCellProps {
  /** 
   * Metric key to display (e.g., 'voltage', 'rpm', 'depth')
   * Must match field key in SensorConfigRegistry
   */
  metricKey: string;

  /**
   * Sensor key for multi-sensor widgets (e.g., 'gps', 'speed')
   * Defaults to primary sensor if not specified.
   * Use for widgets that display metrics from multiple sensors.
   */
  sensorKey?: SensorType;

  // Optional styling overrides
  style?: any;
  cellWidth?: number; // Optional width constraint from parent
  cellHeight?: number; // Cell height from UnifiedWidgetGrid
  testID?: string;

  // Responsive font sizes (optional - overrides defaults)
  fontSize?: {
    mnemonic?: number;
    value?: number;
    unit?: number;
  };
}

/**
 * PrimaryMetricCell - Registry-first auto-fetch metric display
 * 
 * **Auto-Fetch Pattern:**
 * 1. Reads sensor context (instance + type)
 * 2. Fetches MetricValue via instance.getMetric(metricKey)
 * 3. Fetches field config via getSensorField(sensorType, metricKey)
 * 4. Displays: mnemonic, value, unit, alarm state
 * 
 * **Dynamic Sizing:**
 * - Mnemonic: 12pt, uppercase, semibold, theme.textSecondary
 * - Value: 36pt, monospace, bold, theme.text (or alarm color)
 * - Unit: 12pt, regular, theme.textSecondary
 * - Auto-scales based on cellHeight and cellWidth
 * 
 * **For AI Agents:**
 * This component is now "dumb" - it just displays what it fetches.
 * All logic happens in SensorInstance (metric calculation) and
 * ConversionRegistry (unit conversion + formatting).
 */
export const PrimaryMetricCell: React.FC<PrimaryMetricCellProps> = ({
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
      console.error(`PrimaryMetricCell: Invalid metricKey "${metricKey}" for sensor "${sensorType}"`, error);
      return null;
    }
  }, [sensorType, metricKey]);

  // Extract display values (all pre-enriched by MetricValue)
  const mnemonic = fieldConfig?.mnemonic ?? metricKey.toUpperCase().slice(0, 5);
  const value = metricValue?.formattedValue ?? '---';
  const unit = metricValue?.unit ?? '';
  const alarmLevel: AlarmLevel = sensorInstance?.getAlarmState(metricKey) ?? 0;

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
    if (cellWidth && cellWidth > 0) {
      // Use full cellWidth for scaling calculations
      const actualAvailableWidth = cellWidth;

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
  }, [value, mnemonic, unit, cellWidth, cellHeight, customFontSize]);

  const styles = createStyles(theme, dynamicSizes);

  // Get color based on alarm level
  const getValueColor = () => {
    const visualState = ALARM_VISUAL_STATES[alarmLevel];
    return visualState.color === 'red' 
      ? theme.error 
      : visualState.color === 'orange' 
      ? theme.warning 
      : theme.text;
  };

  // Format value for display (already formatted by MetricValue)
  const displayValue = value;

  // Container styling - explicit dimensions from TemplatedWidget
  const containerStyle = [
    styles.container,
    style,
    cellWidth ? { width: cellWidth } : null,
    cellHeight ? { height: cellHeight } : null,
  ].filter(Boolean);

  // Value container styling
  const valueContainerStyle = styles.valueContainer;

  // Value text styling
  const valueTextStyle = {
    ...styles.value,
    color: getValueColor(),
  };

  // Render metric display
  return (
    <View style={containerStyle} testID={testID || `primary-metric-${metricKey}`}>
      <View style={styles.mnemonicUnitRow}>
        <Text style={styles.mnemonic}>{mnemonic}</Text>
        {unit && <Text style={styles.unit}> ({unit})</Text>}
      </View>
      <Text style={valueTextStyle}>{displayValue}</Text>
    </View>
  );
};

const createStyles = (
  theme: any,
  sizes: { value: number; mnemonic: number; unit: number; space: number },
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
