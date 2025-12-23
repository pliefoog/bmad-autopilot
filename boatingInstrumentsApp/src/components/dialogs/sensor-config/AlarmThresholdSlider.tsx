/**
 * Alarm Threshold Slider Component
 *
 * Dual-threshold range slider for alarm configuration with:
 * - Direction-aware zone coloring (safe, warning, critical)
 * - Custom thumb styling with labels and values
 * - Support for "above" and "below" alarm directions
 *
 * Uses rn-range-slider for dual-thumb slider with custom rendering.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import RangeSlider from 'rn-range-slider';
import { ThemeColors } from '../../../store/themeStore';

export interface AlarmThresholdSliderProps {
  /* Slider range configuration */
  min: number;
  max: number;
  step: number;

  /* Current threshold values (in SI units) */
  warningValue: number | undefined;
  criticalValue: number | undefined;

  /* Alarm direction determines slider behavior */
  alarmDirection: 'above' | 'below';

  /* Value formatting and display */
  formatValue: (value: number) => string;
  unitSymbol: string;

  /* Callbacks */
  onWarningChange: (value: number) => void;
  onCriticalChange: (value: number) => void;

  /* Theme colors */
  theme: ThemeColors;
}

export const AlarmThresholdSlider: React.FC<AlarmThresholdSliderProps> = ({
  min,
  max,
  step,
  warningValue,
  criticalValue,
  alarmDirection,
  formatValue,
  unitSymbol,
  onWarningChange,
  onCriticalChange,
  theme,
}) => {
  const low = alarmDirection === 'above' ? warningValue || 0 : criticalValue || 0;
  const high = alarmDirection === 'above' ? criticalValue || 0 : warningValue || 0;

  const handleValueChanged = (newLow: number, newHigh: number) => {
    if (alarmDirection === 'above') {
      onWarningChange(newLow);
      onCriticalChange(newHigh);
    } else {
      onCriticalChange(newLow);
      onWarningChange(newHigh);
    }
  };

  const renderThumb = (name: 'low' | 'high') => {
    const isWarning =
      (name === 'low' && alarmDirection === 'above') ||
      (name === 'high' && alarmDirection === 'below');
    const thumbColor = isWarning ? theme.warning || '#F59E0B' : theme.error || '#EF4444';
    const thresholdLabel = isWarning ? 'Warning' : 'Critical';
    const thresholdValue = isWarning ? warningValue : criticalValue;

    return (
      <View>
        {/* Label above thumb */}
        <Text style={[styles.thumbLabel, styles.thumbLabelTop, { color: thumbColor }]}>
          {thresholdLabel}
        </Text>

        {/* Thumb circle at rail level */}
        <View
          style={[
            styles.thumbCircle,
            {
              backgroundColor: thumbColor,
              borderColor: thumbColor,
            },
          ]}
        />

        {/* Threshold value below thumb */}
        <Text style={[styles.thumbLabel, styles.thumbLabelBottom, { color: thumbColor }]}>
          {thresholdValue !== undefined ? formatValue(thresholdValue) : ''} {unitSymbol}
        </Text>
      </View>
    );
  };

  const renderRail = () => {
    const range = max - min;
    const warning = warningValue ?? 0;
    const critical = criticalValue ?? 0;

    if (alarmDirection === 'above') {
      const warningPercent = Math.max(0, Math.min(100, ((warning - min) / range) * 100));
      const criticalPercent = Math.max(0, Math.min(100, ((critical - min) / range) * 100));

      return (
        <View style={styles.railContainer}>
          {/* Safe zone (left - green) */}
          <View
            style={[
              styles.railSegment,
              {
                left: 0,
                width: `${warningPercent}%`,
                backgroundColor: theme.success || '#22C55E',
              },
            ]}
          />

          {/* Warning zone (middle - yellow/orange) */}
          <View
            style={[
              styles.railSegment,
              {
                left: `${warningPercent}%`,
                width: `${Math.max(0, criticalPercent - warningPercent)}%`,
                backgroundColor: theme.warning || '#F59E0B',
              },
            ]}
          />

          {/* Critical zone (right - red) */}
          <View
            style={[
              styles.railSegment,
              {
                left: `${criticalPercent}%`,
                width: `${Math.max(0, 100 - criticalPercent)}%`,
                backgroundColor: theme.error || '#EF4444',
              },
            ]}
          />
        </View>
      );
    } else {
      const criticalPercent = Math.max(0, Math.min(100, ((critical - min) / range) * 100));
      const warningPercent = Math.max(0, Math.min(100, ((warning - min) / range) * 100));

      return (
        <View style={styles.railContainer}>
          {/* Critical zone (left - red) */}
          <View
            style={[
              styles.railSegment,
              {
                left: 0,
                width: `${criticalPercent}%`,
                backgroundColor: theme.error || '#EF4444',
              },
            ]}
          />

          {/* Warning zone (middle - yellow/orange) */}
          <View
            style={[
              styles.railSegment,
              {
                left: `${criticalPercent}%`,
                width: `${Math.max(0, warningPercent - criticalPercent)}%`,
                backgroundColor: theme.warning || '#F59E0B',
              },
            ]}
          />

          {/* Safe zone (right - green) */}
          <View
            style={[
              styles.railSegment,
              {
                left: `${warningPercent}%`,
                width: `${Math.max(0, 100 - warningPercent)}%`,
                backgroundColor: theme.success || '#22C55E',
              },
            ]}
          />
        </View>
      );
    }
  };

  const renderRailSelected = () => <View style={styles.railSelectedTransparent} />;

  return (
    <RangeSlider
      min={min}
      max={max}
      step={step}
      low={low}
      high={high}
      onValueChanged={handleValueChanged}
      renderThumb={renderThumb}
      renderRail={renderRail}
      renderRailSelected={renderRailSelected}
    />
  );
};

const styles = StyleSheet.create({
  thumbLabel: {
    position: 'absolute',
    left: -20,
    right: -20,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  thumbLabelTop: {
    bottom: 26,
  },
  thumbLabelBottom: {
    top: 24,
  },
  thumbCircle: {
    height: 18,
    width: 18,
    borderRadius: 14,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  railContainer: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  railSegment: {
    position: 'absolute',
    height: 6,
  },
  railSelectedTransparent: {
    flex: 1,
    height: 6,
    backgroundColor: 'transparent',
  },
});
