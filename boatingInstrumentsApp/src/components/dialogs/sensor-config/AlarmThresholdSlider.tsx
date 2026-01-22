/**
 * Alarm Threshold Slider Component - Self-Contained Architecture
 *
 * Fully self-contained dual-threshold slider with:
 * - Internal config fetching (useSensorConfigStore)
 * - Internal enrichment (ThresholdPresentationService)
 * - Ratio mode detection (direct vs indirect thresholds)
 * - Formula caching with context
 * - Debounced live updates (150ms)
 * - Responsive mobile/desktop layout (400px breakpoint)
 * - AnimatedThresholdValue, legend, range indicator - all internal
 *
 * Minimal props pattern - slider is fully self-sufficient:
 * - Fetches schema via getSensorSchema(sensorType)
 * - Fetches saved config via useSensorConfigStore
 * - Returns SI values directly (ratios for indirect, SI for direct)
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Animated } from 'react-native';
import RangeSlider from 'rn-range-slider';
import { useDebouncedCallback } from 'use-debounce';
import { ErrorBoundary } from 'react-error-boundary';
import { ThemeColors } from '../../../store/themeStore';
import { SensorType } from '../../../types/SensorData';
import { useSensorConfigStore } from '../../../store/sensorConfigStore';
import { getSensorSchema, getAlarmDefaults } from '../../../registry';
import { evaluateThresholdFormula } from '../../../utils/formulaEvaluator';
import { useNmeaStore } from '../../../store/nmeaStore';
import { usePresentationStore } from '../../../presentation/presentationStore';
import { MOBILE_BREAKPOINT, settingsTokens } from '../../../theme/settingsTokens';
import { log } from '../../../utils/logging/logger';

export interface AlarmThresholdSliderProps {
  /* Minimal props - slider is self-contained */
  sensorType: SensorType;
  instance: number;
  metric: string;
  onThresholdsChange: (critical: number | undefined, warning: number | undefined) => void;
  theme: ThemeColors;
}

/**
 * AnimatedThresholdValue - Smooth value updates with pulse feedback
 * Moved from SensorConfigDialog.tsx for slider self-containment
 */
interface AnimatedThresholdValueProps {
  label: string;
  value: string;
  color: string;
  theme: ThemeColors;
}

const AnimatedThresholdValue: React.FC<AnimatedThresholdValueProps> = ({
  label,
  value,
  color,
  theme,
}) => {
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation when value changes
    Animated.sequence([
      Animated.timing(opacityAnim, {
        toValue: 0.6,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [value, opacityAnim]);

  return (
    <Animated.View style={[{ opacity: opacityAnim }]}>
      <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.legendValue, { color }]}>{value}</Text>
    </Animated.View>
  );
};

/**
 * Formula cache for computed threshold hints
 * Key: sensorType-instance-metric-context-ratioValue
 */
const formulaCache = new Map<string, string>();

/**
 * Error Fallback Component
 */
interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error }) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorText}>Threshold slider error: {error.message}</Text>
  </View>
);

export const AlarmThresholdSlider: React.FC<AlarmThresholdSliderProps> = ({
  sensorType,
  instance,
  metric,
  onThresholdsChange,
  theme,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;

  // Fetch schema and saved config
  const schema = useMemo(() => {
    const s = getSensorSchema(sensorType);
    if (!s) {
      throw new Error(`Schema not found for sensor type: ${sensorType}`);
    }
    return s;
  }, [sensorType]);

  const fieldDef = useMemo(() => {
    const field = schema.fields[metric];
    if (!field) {
      throw new Error(`Field ${metric} not found in ${sensorType} schema`);
    }
    return field;
  }, [schema, metric]);

  const savedConfig = useSensorConfigStore((state) => state.getConfig(sensorType, instance));
  const sensorInstance = useNmeaStore((state) => state.nmeaData?.sensors?.[sensorType]?.[instance]);

  // Get context for schema defaults lookup
  const context = typeof savedConfig?.context === 'string' ? savedConfig.context : undefined;

  // Get alarm defaults from schema (schema-driven, no fallbacks)
  const alarmDefaults = useMemo(() => {
    if (!fieldDef.alarm) {
      throw new Error(`No alarm configuration for ${sensorType}.${metric}`);
    }

    // Get defaults with context (or undefined for simple sensors)
    const defaults = getAlarmDefaults(sensorType, metric, context);
    if (!defaults) {
      throw new Error(
        `No alarm defaults found for ${sensorType}.${metric}${context ? ` with context "${context}"` : ''}`
      );
    }

    return defaults;
  }, [sensorType, metric, context, fieldDef]);

  // Get presentation for unit conversion/formatting (schema-driven via unitType)
  const presentation = useMemo(() => {
    const category = fieldDef.unitType;
    if (!category) {
      throw new Error(`No unitType defined for ${sensorType}.${metric}`);
    }

    const presentationStore = usePresentationStore.getState();
    const pres = presentationStore.getPresentationForCategory(category);
    if (!pres) {
      throw new Error(`No presentation found for category "${category}"`);
    }

    return pres;
  }, [fieldDef.unitType, sensorType, metric]);

  // Detect ratio mode (indirect thresholds)
  const isRatioMode = !!fieldDef.alarm?.formula;

  // Get min/max/step from schema thresholdRange
  const { min, max, step } = alarmDefaults.thresholdRange;

  // Get alarm direction from schema
  const direction = alarmDefaults.direction;

  // Get current threshold values (SI units or ratios)
  const currentCritical = savedConfig?.metrics?.[metric]?.critical ?? savedConfig?.critical;
  const currentWarning = savedConfig?.metrics?.[metric]?.warning ?? savedConfig?.warning;

  // Local state for slider (initialized from saved config or schema defaults)
  const [warningValue, setWarningValue] = React.useState<number>(
    currentWarning ?? (direction === 'above' ? min + (max - min) * 0.3 : max - (max - min) * 0.3),
  );
  const [criticalValue, setCriticalValue] = React.useState<number>(
    currentCritical ?? (direction === 'above' ? min + (max - min) * 0.5 : max - (max - min) * 0.5),
  );

  // Sync state when saved config changes
  useEffect(() => {
    if (currentWarning !== undefined) setWarningValue(currentWarning);
    if (currentCritical !== undefined) setCriticalValue(currentCritical);
  }, [currentWarning, currentCritical]);

  // Debounced formula evaluation for live updates
  const evaluateFormula = useDebouncedCallback(
    (ratioValue: number): string | null => {
      if (!isRatioMode || !fieldDef.alarm?.formula || !sensorInstance) return null;

      const cacheKey = `${sensorType}-${instance}-${metric}-${context ?? 'none'}-${ratioValue.toFixed(3)}`;
      const cached = formulaCache.get(cacheKey);
      if (cached) return cached;

      try {
        const metrics = sensorInstance.getAllMetrics();
        const computedValue = evaluateThresholdFormula(
          fieldDef.alarm.formula,
          metrics,
          ratioValue,
        );

        if (computedValue !== null) {
          // Format computed value with proper units using presentation
          const formatted = `${presentation.format(computedValue)} ${presentation.unitSymbol}`;
          formulaCache.set(cacheKey, formatted);
          return formatted;
        }
      } catch (error) {
        log.app('[AlarmThresholdSlider] Formula evaluation failed', () => ({
          sensorType,
          metric,
          formula: fieldDef.alarm?.formula,
          ratioValue,
          error: error instanceof Error ? error.message : String(error),
        }));
      }

      return null;
    },
    150, // 150ms debounce
  );

  // Compute live hints for ratio mode
  const warningHint = isRatioMode ? evaluateFormula(warningValue) : null;
  const criticalHint = isRatioMode ? evaluateFormula(criticalValue) : null;

  // Format displayed values (schema-driven)
  const formatDisplayValue = (value: number): string => {
    if (isRatioMode) {
      // Ratio mode: format with unit and space (e.g., "0.95 C-rate")
      const unitWithSpace = fieldDef.alarm?.ratioUnit || '';
      return `${value.toFixed(2)} ${unitWithSpace}`;
    } else {
      // Direct mode: use presentation formatting
      return presentation.format(value);
    }
  };

  const unitSymbol = isRatioMode ? (fieldDef.alarm?.ratioUnit || '') : presentation.unitSymbol;

  // Handle slider changes with debounced callback propagation
  const debouncedOnChange = useDebouncedCallback(
    (critical: number, warning: number) => {
      onThresholdsChange(critical, warning);
    },
    150,
  );

  const handleValueChanged = (newLow: number, newHigh: number) => {
    if (alarmConfig.direction === 'above') {
      setWarningValue(newLow);
      setCriticalValue(newHigh);
      debouncedOnChange(newHigh, newLow);
    } else {
      setCriticalValue(newLow);
      setWarningValue(newHigh);
      debouncedOnChange(newLow, newHigh);
    }
  };

  // Slider low/high mapping based on direction
  const low = alarmConfig.direction === 'above' ? warningValue : criticalValue;
  const high = alarmConfig.direction === 'above' ? criticalValue : warningValue;

  // Render functions for custom slider UI
  const renderThumb = (name: 'low' | 'high') => {
    const isWarning =
      (name === 'low' && alarmConfig.direction === 'above') ||
      (name === 'high' && alarmConfig.direction === 'below');
    const thumbColor = isWarning ? theme.warning : theme.error;
    const thresholdLabel = isWarning ? 'Warning' : 'Critical';
    const thresholdValue = isWarning ? warningValue : criticalValue;
    const computedHint = isWarning ? warningHint : criticalHint;

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
            {formatDisplayValue(thresholdValue)}
          </Text>
          {/* Show computed absolute value in ratio mode */}
          {computedHint && (
            <Text
              style={[
                styles.thumbLabel,
                styles.thumbLabelComputed,
                { color: theme.textSecondary },
              ]}
            >
              → {computedHint}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderRail = () => {
    const range = max - min;
    const warning = warningValue;
    const critical = criticalValue;

    if (direction === 'above') {
      const warningPercent = Math.max(
        0,
        Math.min(100, ((warning - min) / range) * 100),
      );
      const criticalPercent = Math.max(
        0,
        Math.min(100, ((critical - min) / range) * 100),
      );

      return (
        <View style={styles.railContainer}>
          {/* Safe zone (left - green) */}
          <View
            style={[
              styles.railSegment,
              {
                left: 0,
                width: `${warningPercent}%`,
                backgroundColor: theme.success,
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
                backgroundColor: theme.warning,
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
                backgroundColor: theme.error,
              },
            ]}
          />
        </View>
      );
    } else {
      const criticalPercent = Math.max(
        0,
        Math.min(100, ((critical - alarmConfig.min) / range) * 100),
      );
      const warningPercent = Math.max(
        0,
        Math.min(100, ((warning - alarmConfig.min) / range) * 100),
      );

      return (
        <View style={styles.railContainer}>
          {/* Critical zone (left - red) */}
          <View
            style={[
              styles.railSegment,
              {
                left: 0,
                width: `${criticalPercent}%`,
                backgroundColor: theme.error,
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
                backgroundColor: theme.warning,
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
                backgroundColor: theme.success,
              },
            ]}
          />
        </View>
      );
    }
  };

  const renderRailSelected = () => <View style={styles.railSelectedTransparent} />;

  // Responsive spacing tokens
  const hintSpacing = isMobile
    ? settingsTokens.spacing.thresholdHintMobile
    : settingsTokens.spacing.thresholdHintDesktop;
  const legendGap = isMobile
    ? settingsTokens.spacing.thresholdLegendGapMobile
    : settingsTokens.spacing.thresholdLegendGapDesktop;
  const rangeLabelSize = isMobile
    ? settingsTokens.spacing.rangeLabelMobile
    : settingsTokens.spacing.rangeLabelDesktop;

  return (
    <View>
      {/* Color-coded threshold legend with animated values */}
      <View style={[styles.thresholdLegend, { gap: legendGap }]}>
        <View
          style={[styles.legendItem, { borderLeftColor: theme.warning, borderLeftWidth: 4 }]}
        >
          <AnimatedThresholdValue
            label="Warning"
            value={formatDisplayValue(warningValue)}
            color={theme.warning}
            theme={theme}
          />
        </View>

        <View
          style={[styles.legendItem, { borderLeftColor: theme.error, borderLeftWidth: 4 }]}
        >
          <AnimatedThresholdValue
            label="Critical"
            value={formatDisplayValue(criticalValue)}
            color={theme.error}
            theme={theme}
          />
        </View>
      </View>

      {/* Horizontal range indicator above slider */}
      <View style={styles.rangeIndicator}>
        <View style={styles.rangeLabels}>
          <Text style={[styles.rangeLabel, styles.rangeMin, { fontSize: rangeLabelSize }]}>
            Min
          </Text>
          <Text style={[styles.rangeLabel, styles.rangeMid, { fontSize: rangeLabelSize }]}>
            Range
          </Text>
          <Text style={[styles.rangeLabel, styles.rangeMax, { fontSize: rangeLabelSize }]}>
            Max
          </Text>
        </View>
        <View style={[styles.rangeTrack, { backgroundColor: theme.surface }]}>
          <View style={[styles.rangeHighlight, { backgroundColor: theme.primary }]} />
        </View>
      </View>

      {/* Slider */}
      <View style={styles.sliderContainer}>
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
      </View>

      {/* Trigger hint */}
      {alarmDefaults.triggerHint && (
        <Text
          style={[
            styles.helpText,
            { color: theme.textSecondary, marginTop: hintSpacing },
          ]}
        >
          {alarmDefaults.triggerHint}
        </Text>
      )}
    </View>
  );
};

/**
 * Wrapped component with ErrorBoundary
 */
export const AlarmThresholdSliderWithErrorBoundary: React.FC<AlarmThresholdSliderProps> = (
  props,
) => (
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <AlarmThresholdSlider {...props} />
  </ErrorBoundary>
);

const styles = StyleSheet.create({
  // Error fallback
  errorContainer: {
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    marginVertical: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
  },

  // Legend
  thresholdLegend: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingVertical: 12,
  },
  legendItem: {
    flex: 1,
    paddingLeft: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  legendValue: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Range indicator
  rangeIndicator: {
    marginBottom: 12,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  rangeLabel: {
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  rangeMin: {
    textAlign: 'left',
  },
  rangeMid: {
    textAlign: 'center',
  },
  rangeMax: {
    textAlign: 'right',
  },
  rangeTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  rangeHighlight: {
    height: '100%',
    borderRadius: 2,
  },

  // Slider
  sliderContainer: {
    paddingTop: 20,
  },
  helpText: {
    fontSize: 13,
    fontStyle: 'italic',
  },

  // Thumb styling
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

  // Rail styling
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
