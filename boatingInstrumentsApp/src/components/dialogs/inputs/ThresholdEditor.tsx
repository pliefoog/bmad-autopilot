/**
 * ThresholdEditor Component
 *
 * Reusable threshold value editor with:
 * - Smart step calculation from formatSpec.decimals
 * - Boundary enforcement (min/max from formatSpec.testCases)
 * - Long-press acceleration (1x→2x→4x→8x→10x)
 * - Keyboard support (Arrow keys, PageUp/Down, Home/End)
 * - Direction-aware validation (warning < critical for 'above')
 * - Validation animations (shake on touch, red border on desktop)
 * - Display with presentation.format() for correct decimals and units
 * - React.memo for performance optimization
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform, Animated } from 'react-native';
import { useTheme, ThemeColors } from '../../../store/themeStore';
import { UniversalIcon } from '../../atoms/UniversalIcon';

export interface ThresholdEditorProps {
  /** Display label for the threshold */
  label: string;

  /** Current threshold value (in display units) */
  value: number;

  /** Alarm direction - which way is dangerous */
  direction: 'above' | 'below';

  /** Format specification with decimals and test cases */
  formatSpec: {
    decimals: number;
    testCases: {
      min: number;
      max: number;
    };
  };

  /** Minimum valid value (from formatSpec.testCases.min) */
  minValue?: number;

  /** Maximum valid value (from formatSpec.testCases.max) */
  maxValue?: number;

  /** Other threshold for validation (warning/critical counterpart) */
  otherThreshold?: number;

  /** Unit symbol for display */
  unitSymbol?: string;

  /** Callback when value changes */
  onChange: (value: number) => void;

  /** Callback when field loses focus (for immediate save) */
  onBlur?: () => void;

  /** Disable editing */
  disabled?: boolean;

  /** Test ID for automated testing */
  testID?: string;
}

/**
 * ThresholdEditor Component
 *
 * Provides increment/decrement buttons with long-press support,
 * text input with keyboard navigation, and validation feedback.
 */
export const ThresholdEditor: React.FC<ThresholdEditorProps> = React.memo(
  ({
    label,
    value,
    direction,
    formatSpec,
    minValue,
    maxValue,
    otherThreshold,
    unitSymbol = '',
    onChange,
    onBlur,
    disabled = false,
    testID,
  }) => {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    // Calculate step from decimals
    const step = useMemo(() => Math.pow(10, -formatSpec.decimals), [formatSpec.decimals]);

    // Boundary limits
    const min = minValue ?? formatSpec.testCases.min;
    const max = maxValue ?? formatSpec.testCases.max;

    // Long-press state
    const [pressMultiplier, setPressMultiplier] = useState(1);
    const [pressCount, setPressCount] = useState(0);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const longPressIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Validation animation
    const shakeAnim = useRef(new Animated.Value(0)).current;

    // Text input state (for direct editing)
    const [textValue, setTextValue] = useState(value.toFixed(formatSpec.decimals));

    // Update text when value prop changes
    useEffect(() => {
      setTextValue(value.toFixed(formatSpec.decimals));
    }, [value, formatSpec.decimals]);

    /**
     * Validate threshold against other threshold (warning/critical relationship)
     */
    const validateAgainstOther = useCallback(
      (newValue: number): boolean => {
        if (otherThreshold === undefined) return true;

        // For 'below' direction: warning must be > critical
        // For 'above' direction: warning must be < critical
        if (direction === 'below') {
          return newValue >= otherThreshold;
        } else {
          return newValue <= otherThreshold;
        }
      },
      [direction, otherThreshold],
    );

    /**
     * Trigger shake animation on validation failure
     */
    const triggerShakeAnimation = useCallback(() => {
      const SHAKE_OFFSET = 10; // pixels
      const SHAKE_DURATION = 50; // ms per shake

      shakeAnim.setValue(0);
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: SHAKE_OFFSET,
          duration: SHAKE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -SHAKE_OFFSET,
          duration: SHAKE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: SHAKE_OFFSET,
          duration: SHAKE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, { toValue: 0, duration: SHAKE_DURATION, useNativeDriver: true }),
      ]).start();
    }, [shakeAnim]);

    /**
     * Increment value with boundary checking and validation
     */
    const handleIncrement = useCallback(() => {
      const newValue = Math.min(value + step * pressMultiplier, max);

      if (validateAgainstOther(newValue)) {
        onChange(newValue);
      } else {
        triggerShakeAnimation();
      }
    }, [value, step, pressMultiplier, max, onChange, validateAgainstOther, triggerShakeAnimation]);

    /**
     * Decrement value with boundary checking and validation
     */
    const handleDecrement = useCallback(() => {
      const newValue = Math.max(value - step * pressMultiplier, min);

      if (validateAgainstOther(newValue)) {
        onChange(newValue);
      } else {
        triggerShakeAnimation();
      }
    }, [value, step, pressMultiplier, min, onChange, validateAgainstOther, triggerShakeAnimation]);

    /**
     * Start long-press (begin acceleration after initial delay)
     */
    const startLongPress = useCallback((incrementFn: () => void) => {
      // Long-press timing constants
      const LONG_PRESS_DELAY = 500; // ms before acceleration starts
      const REPEAT_INTERVAL = 100; // ms between increments
      const ACCELERATION_THRESHOLDS = [
        { count: 40, multiplier: 10 },
        { count: 30, multiplier: 8 },
        { count: 20, multiplier: 4 },
        { count: 10, multiplier: 2 },
      ];

      setPressCount(0);
      setPressMultiplier(1);

      // Initial press
      incrementFn();

      // Start acceleration after delay
      longPressTimerRef.current = setTimeout(() => {
        let count = 0;
        longPressIntervalRef.current = setInterval(() => {
          count++;

          // Accelerate based on count
          const threshold = ACCELERATION_THRESHOLDS.find((t) => count > t.count);
          if (threshold) {
            setPressMultiplier(threshold.multiplier);
          }

          setPressCount(count);
          incrementFn();
        }, REPEAT_INTERVAL);
      }, LONG_PRESS_DELAY);
    }, []);

    /**
     * End long-press (reset acceleration)
     */
    const endLongPress = useCallback(() => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (longPressIntervalRef.current) {
        clearInterval(longPressIntervalRef.current);
        longPressIntervalRef.current = null;
      }
      setPressMultiplier(1);
      setPressCount(0);
    }, []);

    /**
     * Handle text input change
     */
    const handleTextChange = useCallback((text: string) => {
      setTextValue(text);
    }, []);

    /**
     * Handle text input blur (validate and save)
     */
    const handleTextBlur = useCallback(() => {
      const parsed = parseFloat(textValue);

      if (isNaN(parsed)) {
        // Invalid input - revert to current value
        setTextValue(value.toFixed(formatSpec.decimals));
        return;
      }

      // Enforce boundaries
      const bounded = Math.max(min, Math.min(max, parsed));

      // Validate against other threshold
      if (validateAgainstOther(bounded)) {
        onChange(bounded);
        setTextValue(bounded.toFixed(formatSpec.decimals));
      } else {
        // Validation failed - revert
        setTextValue(value.toFixed(formatSpec.decimals));
        triggerShakeAnimation();
      }

      onBlur?.();
    }, [
      textValue,
      value,
      formatSpec.decimals,
      min,
      max,
      onChange,
      onBlur,
      validateAgainstOther,
      triggerShakeAnimation,
    ]);

    /**
     * Handle keyboard navigation (Web only)
     */
    const handleKeyPress = useCallback(
      (e: any) => {
        if (Platform.OS !== 'web') return;

        const key = e.nativeEvent.key;

        switch (key) {
          case 'ArrowUp':
            e.preventDefault();
            handleIncrement();
            break;
          case 'ArrowDown':
            e.preventDefault();
            handleDecrement();
            break;
          case 'PageUp':
            e.preventDefault();
            onChange(Math.min(value + step * 10, max));
            break;
          case 'PageDown':
            e.preventDefault();
            onChange(Math.max(value - step * 10, min));
            break;
          case 'Home':
            e.preventDefault();
            onChange(min);
            break;
          case 'End':
            e.preventDefault();
            onChange(max);
            break;
        }
      },
      [value, step, min, max, onChange, handleIncrement, handleDecrement],
    );

    // Cleanup timers on unmount
    useEffect(() => {
      return () => {
        endLongPress();
      };
    }, [endLongPress]);

    // Check if value is valid
    const isValid = useMemo(() => {
      if (otherThreshold === undefined) return true;
      return validateAgainstOther(value);
    }, [value, otherThreshold, validateAgainstOther]);

    // Error message
    const errorMessage = useMemo(() => {
      if (isValid || !otherThreshold) return '';

      if (direction === 'below') {
        return `Must be ≥ ${otherThreshold.toFixed(formatSpec.decimals)} ${unitSymbol}`;
      } else {
        return `Must be ≤ ${otherThreshold.toFixed(formatSpec.decimals)} ${unitSymbol}`;
      }
    }, [isValid, otherThreshold, direction, formatSpec.decimals, unitSymbol]);

    return (
      <Animated.View
        style={[
          styles.container,
          !isValid && styles.containerError,
          { transform: [{ translateX: shakeAnim }] },
        ]}
        testID={testID}
      >
        {/* Label */}
        <Text style={[styles.label, { color: theme.text }, disabled && styles.labelDisabled]}>
          {label}
        </Text>

        {/* Value editor */}
        <View style={styles.editorRow}>
          {/* Decrement button */}
          <Pressable
            style={[
              styles.button,
              { backgroundColor: theme.surface, borderColor: theme.border },
              disabled && styles.buttonDisabled,
            ]}
            onPress={handleDecrement}
            onPressIn={() => startLongPress(handleDecrement)}
            onPressOut={endLongPress}
            disabled={disabled}
            testID={`${testID}-decrement`}
          >
            <UniversalIcon
              name="remove"
              size={20}
              color={disabled ? theme.textSecondary : theme.text}
            />
          </Pressable>

          {/* Text input */}
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                borderColor: isValid ? theme.border : theme.error,
                color: theme.text,
              },
              disabled && styles.inputDisabled,
            ]}
            value={textValue}
            onChangeText={handleTextChange}
            onBlur={handleTextBlur}
            onKeyPress={handleKeyPress}
            keyboardType="numeric"
            editable={!disabled}
            selectTextOnFocus
            testID={`${testID}-input`}
          />

          {/* Unit symbol */}
          {unitSymbol && (
            <Text style={[styles.unit, { color: theme.textSecondary }]}>{unitSymbol}</Text>
          )}

          {/* Increment button */}
          <Pressable
            style={[
              styles.button,
              { backgroundColor: theme.surface, borderColor: theme.border },
              disabled && styles.buttonDisabled,
            ]}
            onPress={handleIncrement}
            onPressIn={() => startLongPress(handleIncrement)}
            onPressOut={endLongPress}
            disabled={disabled}
            testID={`${testID}-increment`}
          >
            <UniversalIcon
              name="add"
              size={20}
              color={disabled ? theme.textSecondary : theme.text}
            />
          </Pressable>
        </View>

        {/* Error message */}
        {!isValid && errorMessage ? (
          <Text style={[styles.errorText, { color: theme.error }]}>{errorMessage}</Text>
        ) : null}

        {/* Acceleration indicator (during long-press) */}
        {pressMultiplier > 1 && (
          <Text style={[styles.accelerationText, { color: theme.textSecondary }]}>
            {pressMultiplier}× speed
          </Text>
        )}
      </Animated.View>
    );
  },
);

ThresholdEditor.displayName = 'ThresholdEditor';

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginVertical: 8,
    },
    containerError: {
      opacity: 0.9,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
      fontFamily: 'sans-serif',
    },
    labelDisabled: {
      opacity: 0.5,
    },
    editorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    button: {
      width: 40,
      height: 40,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    input: {
      flex: 1,
      height: 40,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 16,
      fontWeight: '500',
      textAlign: 'center',
      fontFamily: 'sans-serif',
    },
    inputDisabled: {
      opacity: 0.5,
    },
    unit: {
      fontSize: 14,
      fontWeight: '500',
      fontFamily: 'sans-serif',
      minWidth: 40,
      textAlign: 'left',
    },
    errorText: {
      fontSize: 12,
      marginTop: 4,
      fontFamily: 'sans-serif',
    },
    accelerationText: {
      fontSize: 12,
      marginTop: 4,
      textAlign: 'center',
      fontFamily: 'sans-serif',
    },
  });
