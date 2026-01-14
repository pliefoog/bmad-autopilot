import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useNmeaStore } from '../store/nmeaStore';
import type { SensorMetricProps } from '../types/SensorData';
import { ConversionRegistry } from '../utils/ConversionRegistry';
import { getFieldDefinition } from '../registry';

interface StatMetricCellProps extends SensorMetricProps {
  // SensorMetricProps provides: sensorType, instance, metricKey
  statType: 'min' | 'max' | 'avg';
  style?: ViewStyle;
  cellWidth?: number;
  cellHeight?: number;
  testID?: string;
}

/**
 * StatMetricCell - Display session statistics (MIN/MAX/AVG)
 *
 * Similar to SecondaryMetricCell but shows session stats instead of current value.
 *
 * **Auto-Fetch Pattern:**
 * 1. Uses SensorContext to get sensor instance
 * 2. Fetches session stats from nmeaStore
 * 3. Converts to display units using ConversionRegistry
 * 4. Formats for display
 *
 * **Display Format:**
 * - Label: "MIN" / "MAX" / "AVG" (uppercase, 10pt)
 * - Value: stat value (24pt, monospace, bold)
 * - Unit: from ConversionRegistry (10pt)
 */
export const StatMetricCell: React.FC<StatMetricCellProps> = ({
  sensorType,
  instance,
  metricKey,
  statType,
  style,
  cellWidth,
  cellHeight,
  testID,
}) => {
  const theme = useTheme();

  // Get session stats from store using explicit props
  const stats = useNmeaStore(
    (state) => {
      return state.getSessionStats(sensorType, instance, metricKey);
    },
    (a, b) => {
      if (!a && !b) return true;
      if (!a || !b) return false;
      return a.min === b.min && a.max === b.max && a.avg === b.avg;
    },
  );

  // Auto-fetch field configuration from registry
  const fieldConfig = useMemo(() => {
    try {
      return getFieldDefinition(sensorType, metricKey);
    } catch (error) {
      return null;
    }
  }, [sensorType, metricKey]);

  // Extract stat value based on type
  const statValue = stats?.[statType] ?? null;

  // Get unit from ConversionRegistry
  const unit = useMemo(() => {
    if (!fieldConfig?.unitType) return '';
    try {
      return ConversionRegistry.getUnit(fieldConfig.unitType);
    } catch (error) {
      return '';
    }
  }, [fieldConfig?.unitType]);

  // Convert SI value to display value and format
  const displayValue = useMemo(() => {
    if (statValue === null) return '---';

    if (!fieldConfig?.unitType) {
      return statValue.toFixed(1);
    }

    try {
      const converted = ConversionRegistry.convertToDisplay(fieldConfig.unitType, statValue);
      const precision = ConversionRegistry.getPrecision(fieldConfig.unitType);
      return converted.toFixed(precision);
    } catch (error) {
      return statValue.toFixed(1);
    }
  }, [statValue, fieldConfig?.unitType]);

  // Dynamic font sizes based on cell dimensions
  const labelFontSize = Math.min(
    cellWidth ? cellWidth * 0.15 : 10,
    cellHeight ? cellHeight * 0.15 : 10,
    10,
  );
  const valueFontSize = Math.min(
    cellWidth ? cellWidth * 0.35 : 24,
    cellHeight ? cellHeight * 0.35 : 24,
    24,
  );
  const unitFontSize = Math.min(
    cellWidth ? cellWidth * 0.15 : 10,
    cellHeight ? cellHeight * 0.15 : 10,
    10,
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
          width: cellWidth,
          height: cellHeight,
        },
        style,
      ]}
      testID={testID}
    >
      {/* Stat Label (MIN/MAX/AVG) */}
      <Text
        style={[
          styles.label,
          {
            color: theme.textSecondary,
            fontSize: labelFontSize,
          },
        ]}
        numberOfLines={1}
      >
        {statType.toUpperCase()}
      </Text>

      {/* Stat Value */}
      <Text
        style={[
          styles.value,
          {
            color: theme.text,
            fontSize: valueFontSize,
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {displayValue}
      </Text>

      {/* Unit */}
      {unit && (
        <Text
          style={[
            styles.unit,
            {
              color: theme.textSecondary,
              fontSize: unitFontSize,
            },
          ]}
          numberOfLines={1}
        >
          {unit}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  label: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  unit: {
    fontWeight: '400',
  },
});

export default StatMetricCell;
