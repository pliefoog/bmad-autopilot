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

  /* Optional: Computed absolute threshold values (for ratio mode) */
  computedWarning?: string;
  computedCritical?: string;

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
  computedWarning,
  computedCritical,
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
        <View style={styles.thumbValueContainer}>
          <Text style={[styles.thumbLabel, styles.thumbLabelBottom, { color: thumbColor }]}>
            {thresholdValue !== undefined ? formatValue(thresholdValue) : ''} {unitSymbol}
          </Text>
          {/* Show computed absolute value if provided (ratio mode) */}
          {(isWarning ? computedWarning : computedCritical) && (
            <Text style={[styles.thumbLabel, styles.thumbLabelComputed, { color: theme.textSecondary }]}>
              → {isWarning ? computedWarning : computedCritical}
            </Text>
          )}
        </View>
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
    left: -30,
    right: -30,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  thumbLabelTop: {
    bottom: 28,
  },
  thumbLabelBottom: {
    top: 28,
  },
  thumbValueContainer: {
    position: 'absolute',
    top: 28,
    left: -40,
    right: -40,
    alignItems: 'center',
  },
  thumbLabelComputed: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 2,
  },
  thumbCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 3,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  railContainer: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  railSegment: {
    position: 'absolute',
    height: 8,
  },
  railSelectedTransparent: {
    flex: 1,
    height: 6,
    backgroundColor: 'transparent',
  },
});
