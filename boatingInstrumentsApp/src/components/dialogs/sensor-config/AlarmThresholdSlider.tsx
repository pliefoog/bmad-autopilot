/**
 * AlarmThresholdSlider - Dumb Component (KISS Refactor Jan 2025)
 *
 * Simplified dual-threshold slider that receives validated props.
 * Parent handles validation, data fetching, and enrichment.
 *
 * Responsibilities:
 * - Render dual slider with current values
 * - Display formatted values with units
 * - Show formula hints if provided
 * - Call onChange when user drags sliders
 *
 * KISS Improvements:
 * - 790 → ~250 lines (68% reduction)
 * - No validation, no fetching, no caching
 * - All hooks at top (React Rules compliant)
 * - Single state object
 * - No try-catch blocks
 * - Formula hints via useMemo (React auto-caches)
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Animated } from 'react-native';
import RangeSlider from 'rn-range-slider';
import { ThemeColors } from '../../../store/themeStore';
import { MOBILE_BREAKPOINT, settingsTokens } from '../../../theme/settingsTokens';
import { evaluateFormula } from '../../../utils/formulaEvaluator';

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate effective threshold value from slider position
 * For ratio mode: Evaluates formula with thumb's ratio value
 * For direct mode: Returns thumb value as-is (formatted)
 */
function calculateEffectiveValue(
  thumbValue: number,
  isRatioMode: boolean,
  formulaContext: { formula: string; parameters: Record<string, number> } | undefined,
  presentation: { format: (v: number) => string; symbol: string } | undefined,
  ratioUnit?: string
): string {
  // Debug logging
  if (__DEV__) {
    console.log('[AlarmThresholdSlider] calculateEffectiveValue:', {
      thumbValue,
      isRatioMode,
      hasFormulaContext: !!formulaContext,
      hasPresentation: !!presentation,
      formula: formulaContext?.formula,
      parameters: formulaContext?.parameters,
    });
  }
  
  if (!isRatioMode || !formulaContext || !presentation) {
    // Direct mode: format as-is
    return presentation ? `${presentation.format(thumbValue)} ${presentation.symbol}` : thumbValue.toString();
  }
  
  try {
    // Ratio mode: evaluate formula with thumb position
    const result = evaluateFormula(formulaContext.formula, {
      ...formulaContext.parameters,
      indirectThreshold: thumbValue,
    });
    
    if (__DEV__) {
      console.log('[AlarmThresholdSlider] Formula result:', { result, formatted: presentation.format(result) });
    }
    
    if (typeof result === 'number' && !isNaN(result)) {
      const formattedResult = `${presentation.format(result)} ${presentation.symbol}`;
      if (__DEV__) {
        console.log('[AlarmThresholdSlider] Returning formatted:', {
          result,
          formatted: presentation.format(result),
          symbol: presentation.symbol,
          final: formattedResult,
        });
      }
      return formattedResult;
    }
  } catch (err) {
    // Formula evaluation failed - fallback to ratio display
    if (__DEV__) {
      console.error('[AlarmThresholdSlider] Formula evaluation failed:', err);
    }
  }
  
  // Fallback: show ratio value
  return `${thumbValue.toFixed(2)}${ratioUnit ? ` ${ratioUnit}` : ''}`;
}

// ==================== TYPES ====================

export interface AlarmThresholdSliderProps {
  /** Threshold range minimum (SI units or ratio) */
  min: number;
  
  /** Threshold range maximum (SI units or ratio) */
  max: number;
  
  /** Alarm direction: 'above' = critical > warning, 'below' = critical < warning */
  direction: 'above' | 'below';
  
  /** Current critical threshold value */
  currentCritical: number;
  
  /** Current warning threshold value */
  currentWarning: number;
  
  /** Presentation for formatting and units */
  presentation: {
    format: (value: number) => string;
    symbol: string;
  };
  
  /** Optional: Formula for ratio mode (e.g., "capacity * ratio") */
  formula?: string;
  
  /** Optional: Sensor metrics for formula evaluation (ratio mode) */
  sensorMetrics?: Map<string, any>;
  
  /** Optional: Resolved range boundaries for static display (Jan 2026) */
  resolvedRange?: {
    min: number;  // SI units
    max: number;  // SI units
  };
  
  /** Optional: Formula context for dynamic calculation (Jan 2026) */
  formulaContext?: {
    formula: string;
    parameters: Record<string, number>;
  };
  
  /** Callback when thresholds change */
  onThresholdsChange: (critical: number, warning: number) => void;
  
  /** Theme colors */
  theme: ThemeColors;
  
  /** Optional: Unit symbol override for ratio mode */
  ratioUnit?: string;
}

interface SliderState {
  warning: number;
  critical: number;
}

// ==================== ANIMATED VALUE DISPLAY ====================

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
    Animated.sequence([
      Animated.timing(opacityAnim, {
        toValue: 0.6,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
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

// ==================== MAIN COMPONENT ====================

export const AlarmThresholdSlider: React.FC<AlarmThresholdSliderProps> = ({
  min,
  max,
  direction,
  currentCritical,
  currentWarning,
  presentation,
  formula,
  sensorMetrics,
  resolvedRange,
  formulaContext,
  onThresholdsChange,
  theme,
  ratioUnit,
}) => {
  // ========== ALL HOOKS FIRST (React Rules of Hooks) ==========
  
  const { width } = useWindowDimensions();
  const isRatioMode = Boolean(formulaContext);  // Ratio mode if formula context provided
  const isMobile = width < MOBILE_BREAKPOINT;
  
  // Single state object for simplicity
  const [sliderState, setSliderState] = useState<SliderState>({
    warning: currentWarning,
    critical: currentCritical,
  });
  
  // Sync with prop changes (external updates)
  useEffect(() => {
    setSliderState({
      warning: currentWarning,
      critical: currentCritical,
    });
  }, [currentCritical, currentWarning]);
  
  // ========== COMPUTED VALUES (All hooks called, safe to compute) ==========
  
  // Compute step (1% of range for granular control)
  const step = useMemo(() => (max - min) / 100, [min, max]);
  
  // Get unit symbol (use presentation symbol since effective values are displayed)
  const unitSymbol = presentation.symbol;
  
  // ========== EVENT HANDLERS ==========
  
  const handleValueChanged = (newLow: number, newHigh: number) => {
    // Validate threshold ordering based on direction
    if (direction === 'above') {
      // Above mode: critical (high) > warning (low)
      if (newHigh <= newLow) return;
      setSliderState({ warning: newLow, critical: newHigh });
      onThresholdsChange(newHigh, newLow);
    } else {
      // Below mode: critical (low) < warning (high)
      if (newLow >= newHigh) return;
      setSliderState({ warning: newHigh, critical: newLow });
      onThresholdsChange(newLow, newHigh);
    }
  };
  
  // ========== RENDER FUNCTIONS ==========
  
  const renderThumb = useCallback((name: 'low' | 'high') => {
    // Determine if this thumb is for warning or critical based on direction
    const isWarning =
      (name === 'low' && direction === 'above') ||
      (name === 'high' && direction === 'below');
    const thumbColor = isWarning ? theme.warning : theme.error;
    const thresholdLabel = isWarning ? 'Warning' : 'Critical';
    const thresholdValue = isWarning ? sliderState.warning : sliderState.critical;
    
    // Calculate effective value (resolved from formula in ratio mode)
    const effectiveValue = calculateEffectiveValue(
      thresholdValue,
      isRatioMode,
      formulaContext,
      presentation,
      ratioUnit
    );
    
    return (
      <View>
        {/* Label above thumb */}
        <Text
          style={[
            styles.thumbLabel,
            styles.thumbLabelTop,
            { color: thumbColor },
          ]}
        >
          {thresholdLabel}
        </Text>

        {/* Thumb circle */}
        <View style={[styles.thumb, { backgroundColor: thumbColor }]} />

        {/* Threshold value below thumb */}
        <View style={styles.thumbValueContainer}>
          <Text style={[styles.thumbLabel, styles.thumbLabelBottom, { color: thumbColor }]}>
            {effectiveValue}
          </Text>
        </View>
      </View>
    );
  }, [direction, theme.warning, theme.error, theme.textSecondary, sliderState.warning, sliderState.critical, isRatioMode, formulaContext, presentation, ratioUnit]);
  
  const renderRail = useCallback(() => {
    return <View style={[styles.rail, { backgroundColor: theme.border }]} />;
  }, [theme.border]);
  
  const renderRailSelected = useCallback(() => {
    return <View style={[styles.railSelected, { backgroundColor: theme.primary }]} />;
  }, [theme.primary]);
  
  // ========== RENDER ==========
  
  // Determine slider low/high based on direction
  const sliderLow = direction === 'above' ? sliderState.warning : sliderState.critical;
  const sliderHigh = direction === 'above' ? sliderState.critical : sliderState.warning;
  
  return (
    <View style={styles.container}>
      {/* Legend */}
      <View style={[styles.legend, isMobile && styles.legendMobile]}>
        <AnimatedThresholdValue
          label="WARNING"
          value={calculateEffectiveValue(sliderState.warning, isRatioMode, formulaContext, presentation, ratioUnit)}
          color={theme.warning}
          theme={theme}
        />
        
        <AnimatedThresholdValue
          label="CRITICAL"
          value={calculateEffectiveValue(sliderState.critical, isRatioMode, formulaContext, presentation, ratioUnit)}
          color={theme.error}
          theme={theme}
        />
      </View>
      
      {/* Range Indicator */}
      <View style={styles.rangeRow}>
        <Text style={[styles.rangeLabel, { color: theme.textSecondary }]}>
          {isRatioMode && resolvedRange && formulaContext
            ? calculateEffectiveValue(min, isRatioMode, formulaContext, presentation, ratioUnit)
            : isRatioMode && ratioUnit
              ? `${min.toFixed(2)} ${ratioUnit}`
              : presentation.format(min)}
        </Text>
        <Text style={[styles.rangeLabel, { color: theme.textSecondary }]}>
          {isRatioMode && resolvedRange && formulaContext
            ? calculateEffectiveValue(max, isRatioMode, formulaContext, presentation, ratioUnit)
            : isRatioMode && ratioUnit
              ? `${max.toFixed(2)} ${ratioUnit}`
              : presentation.format(max)}
        </Text>
      </View>
      
      {/* Slider */}
      <View style={styles.sliderContainer}>
        <RangeSlider
          style={styles.slider}
          min={min}
          max={max}
          step={step}
          low={sliderLow}
          high={sliderHigh}
          floatingLabel={false}
          renderThumb={renderThumb}
          renderRail={renderRail}
          renderRailSelected={renderRailSelected}
          onValueChanged={handleValueChanged}
        />
      </View>
      
      {/* Direction Hint */}
      <Text style={[styles.directionHint, { color: theme.textSecondary }]}>
        {direction === 'above' 
          ? 'Alarms trigger when value exceeds thresholds'
          : 'Alarms trigger when value drops below thresholds'}
      </Text>
    </View>
  );
};

AlarmThresholdSlider.displayName = 'AlarmThresholdSlider';

export default AlarmThresholdSlider;

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    paddingVertical: settingsTokens.spacing.lg,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: settingsTokens.spacing.lg,
  },
  legendMobile: {
    flexDirection: 'column',
    gap: settingsTokens.spacing.lg,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  legendValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  hintText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rangeLabel: {
    fontSize: 12,
  },
  sliderContainer: {
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  thumbLabel: {
    position: 'absolute',
    left: -30,
    right: -30,
    textAlign: 'center',
    fontSize: 11,
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
    fontSize: 10,
    fontWeight: '400',
    marginTop: 2,
  },
  rail: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  railSelected: {
    height: 4,
    borderRadius: 2,
  },
  directionHint: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
