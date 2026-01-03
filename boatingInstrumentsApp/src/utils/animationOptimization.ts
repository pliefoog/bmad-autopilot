/**
 * Animation Optimization Utilities
 *
 * Performance-optimized animation patterns for marine widgets using native drivers.
 * Native-driven animations run on the UI thread at 60fps without blocking JavaScript thread.
 *
 * Key Principles:
 * - Always use useNativeDriver: true for transform and opacity animations
 * - Avoid layout animations (width, height, margin, padding) as they cannot use native driver
 * - Use Animated.timing for controlled animations, Animated.spring for natural motion
 * - Batch animations with Animated.parallel for smooth multi-property changes
 * - Minimize interruptions - let animations complete before starting new ones
 *
 * Marine-Specific Optimizations:
 * - Compass rotations: Shortest path algorithm to prevent 359° → 0° full rotation
 * - Wind direction: Smooth interpolation for rapidly changing values
 * - Speed changes: Ease-in-out for realistic acceleration/deceleration feel
 * - Value fades: Cross-fade transitions for value changes without jarring updates
 */

import { useRef, useEffect, useCallback } from 'react';
import { Animated, Easing, Platform } from 'react-native';

// ============================================================================
// Configuration Constants
// ============================================================================

/**
 * Animation durations optimized for marine data update frequencies
 */
export const ANIMATION_DURATIONS = {
  /** Very fast transitions for high-frequency data (speed, depth) */
  FAST: 150,
  /** Standard transitions for moderate-frequency data (wind, compass) */
  NORMAL: 300,
  /** Slow transitions for low-frequency data (battery, tanks) */
  SLOW: 500,
  /** Cross-fade duration for value changes */
  FADE: 200,
} as const;

/**
 * Easing functions for different animation types
 */
export const ANIMATION_EASINGS = {
  /** Linear motion - constant speed (compass rotations) */
  LINEAR: Easing.linear,
  /** Ease in-out - natural acceleration/deceleration (speed, depth) */
  EASE_IN_OUT: Easing.inOut(Easing.ease),
  /** Ease out - quick start, slow end (value changes) */
  EASE_OUT: Easing.out(Easing.ease),
  /** Bezier curve - custom timing for complex animations */
  BEZIER: Easing.bezier(0.42, 0, 0.58, 1),
} as const;

/**
 * Spring animation configurations for natural motion
 */
export const SPRING_CONFIGS = {
  /** Gentle spring - smooth, minimal bounce (default) */
  GENTLE: {
    tension: 40,
    friction: 8,
    useNativeDriver: true,
  },
  /** Bouncy spring - playful motion (alerts, notifications) */
  BOUNCY: {
    tension: 80,
    friction: 6,
    useNativeDriver: true,
  },
  /** Stiff spring - quick, minimal oscillation (critical alerts) */
  STIFF: {
    tension: 100,
    friction: 10,
    useNativeDriver: true,
  },
} as const;

// ============================================================================
// Animation Hooks
// ============================================================================

/**
 * Hook for rotating compass needle with shortest path algorithm
 *
 * Prevents visual issues when rotating from 359° to 0° (wraps smoothly)
 * Uses native driver for 60fps performance on UI thread
 *
 * @param targetDegrees - Target rotation in degrees (0-360)
 * @param duration - Animation duration in ms (default: NORMAL)
 * @returns Animated value for rotation transform
 *
 * @example
 * ```tsx
 * const rotationAnim = useCompassRotation(heading, ANIMATION_DURATIONS.NORMAL);
 *
 * <Animated.View style={{ transform: [{ rotate: rotationAnim.interpolate({
 *   inputRange: [0, 360],
 *   outputRange: ['0deg', '360deg']
 * })}]}}>
 *   <CompassNeedle />
 * </Animated.View>
 * ```
 */
export function useCompassRotation(
  targetDegrees: number,
  duration: number = ANIMATION_DURATIONS.NORMAL,
): Animated.Value {
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const currentRotation = useRef(0);

  useEffect(() => {
    // Normalize target to 0-360 range
    const normalizedTarget = ((targetDegrees % 360) + 360) % 360;

    // Calculate shortest path
    let delta = normalizedTarget - currentRotation.current;

    // Wrap around if delta > 180 (shorter to go the other way)
    if (delta > 180) {
      delta -= 360;
    } else if (delta < -180) {
      delta += 360;
    }

    const newRotation = currentRotation.current + delta;

    // Animate to new rotation
    Animated.timing(rotationAnim, {
      toValue: newRotation,
      duration,
      easing: ANIMATION_EASINGS.LINEAR,
      useNativeDriver: true,
    }).start(() => {
      currentRotation.current = newRotation;
    });
  }, [targetDegrees, duration, rotationAnim]);

  return rotationAnim;
}

/**
 * Hook for smooth value transitions with optional cross-fade
 *
 * Animates numeric value changes with configurable easing
 * Useful for speed, depth, wind speed displays
 *
 * @param targetValue - Target numeric value
 * @param duration - Animation duration in ms (default: NORMAL)
 * @param easing - Easing function (default: EASE_IN_OUT)
 * @returns Animated value
 *
 * @example
 * ```tsx
 * const speedAnim = useValueAnimation(currentSpeed, ANIMATION_DURATIONS.FAST);
 *
 * <Animated.Text>
 *   {speedAnim.interpolate({
 *     inputRange: [0, 20],
 *     outputRange: ['0.0', '20.0']
 *   })}
 * </Animated.Text>
 * ```
 */
export function useValueAnimation(
  targetValue: number,
  duration: number = ANIMATION_DURATIONS.NORMAL,
  easing: (value: number) => number = ANIMATION_EASINGS.EASE_IN_OUT,
): Animated.Value {
  const valueAnim = useRef(new Animated.Value(targetValue)).current;

  useEffect(() => {
    Animated.timing(valueAnim, {
      toValue: targetValue,
      duration,
      easing,
      useNativeDriver: true, // Note: Won't work for text content, use for transforms
    }).start();
  }, [targetValue, duration, easing, valueAnim]);

  return valueAnim;
}

/**
 * Hook for fade-in/fade-out transitions
 *
 * Controls opacity with native driver for smooth 60fps fades
 * Useful for showing/hiding elements, value change indicators
 *
 * @param visible - Whether element should be visible
 * @param duration - Fade duration in ms (default: FADE)
 * @returns Animated opacity value (0 to 1)
 *
 * @example
 * ```tsx
 * const opacityAnim = useFadeAnimation(isAlarmActive, ANIMATION_DURATIONS.FADE);
 *
 * <Animated.View style={{ opacity: opacityAnim }}>
 *   <AlarmIndicator />
 * </Animated.View>
 * ```
 */
export function useFadeAnimation(
  visible: boolean,
  duration: number = ANIMATION_DURATIONS.FADE,
): Animated.Value {
  const opacityAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: visible ? 1 : 0,
      duration,
      easing: ANIMATION_EASINGS.EASE_OUT,
      useNativeDriver: true,
    }).start();
  }, [visible, duration, opacityAnim]);

  return opacityAnim;
}

/**
 * Hook for scale animations (pulse, pop effects)
 *
 * Animates scale transform with native driver
 * Useful for attention-grabbing effects (new alarms, critical alerts)
 *
 * @param targetScale - Target scale value (1.0 = normal size)
 * @param duration - Animation duration in ms (default: NORMAL)
 * @param springConfig - Optional spring configuration for bouncy effect
 * @returns Animated scale value
 *
 * @example
 * ```tsx
 * const scaleAnim = useScaleAnimation(isAlertActive ? 1.1 : 1.0);
 *
 * <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
 *   <AlertIcon />
 * </Animated.View>
 * ```
 */
export function useScaleAnimation(
  targetScale: number,
  duration: number = ANIMATION_DURATIONS.NORMAL,
  springConfig?: typeof SPRING_CONFIGS.GENTLE,
): Animated.Value {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (springConfig) {
      // Use spring animation for bouncy effect
      Animated.spring(scaleAnim, {
        toValue: targetScale,
        ...springConfig,
      }).start();
    } else {
      // Use timing animation for controlled effect
      Animated.timing(scaleAnim, {
        toValue: targetScale,
        duration,
        easing: ANIMATION_EASINGS.EASE_IN_OUT,
        useNativeDriver: true,
      }).start();
    }
  }, [targetScale, duration, springConfig, scaleAnim]);

  return scaleAnim;
}

/**
 * Hook for pulsing animation (heartbeat effect)
 *
 * Creates continuous pulse effect for active/alive indicators
 * Automatically loops until component unmounts
 *
 * @param pulsing - Whether pulse should be active
 * @param minScale - Minimum scale (default: 0.9)
 * @param maxScale - Maximum scale (default: 1.1)
 * @param duration - Pulse duration in ms (default: SLOW)
 * @returns Animated scale value
 *
 * @example
 * ```tsx
 * const pulseAnim = usePulseAnimation(isRecording);
 *
 * <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
 *   <RecordingIndicator />
 * </Animated.View>
 * ```
 */
export function usePulseAnimation(
  pulsing: boolean,
  minScale: number = 0.9,
  maxScale: number = 1.1,
  duration: number = ANIMATION_DURATIONS.SLOW,
): Animated.Value {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (pulsing) {
      // Create looping pulse animation
      const pulse = Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: maxScale,
          duration: duration / 2,
          easing: ANIMATION_EASINGS.EASE_IN_OUT,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: minScale,
          duration: duration / 2,
          easing: ANIMATION_EASINGS.EASE_IN_OUT,
          useNativeDriver: true,
        }),
      ]);

      animationRef.current = Animated.loop(pulse);
      animationRef.current.start();
    } else {
      // Stop pulsing and return to normal scale
      animationRef.current?.stop();
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: ANIMATION_DURATIONS.FAST,
        easing: ANIMATION_EASINGS.EASE_OUT,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      animationRef.current?.stop();
    };
  }, [pulsing, minScale, maxScale, duration, pulseAnim]);

  return pulseAnim;
}

/**
 * Hook for slide-in/slide-out animations
 *
 * Animates translateX or translateY with native driver
 * Useful for drawer panels, notification slides
 *
 * @param visible - Whether element should be visible
 * @param direction - Slide direction ('left' | 'right' | 'up' | 'down')
 * @param distance - Slide distance in pixels (default: 300)
 * @param duration - Animation duration in ms (default: NORMAL)
 * @returns Animated translate value
 *
 * @example
 * ```tsx
 * const slideAnim = useSlideAnimation(isDrawerOpen, 'right', 300);
 *
 * <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
 *   <DrawerContent />
 * </Animated.View>
 * ```
 */
export function useSlideAnimation(
  visible: boolean,
  direction: 'left' | 'right' | 'up' | 'down',
  distance: number = 300,
  duration: number = ANIMATION_DURATIONS.NORMAL,
): Animated.Value {
  const slideAnim = useRef(new Animated.Value(visible ? 0 : distance)).current;

  useEffect(() => {
    // Calculate slide direction multiplier
    const multiplier = direction === 'left' || direction === 'up' ? -1 : 1;
    const targetValue = visible ? 0 : distance * multiplier;

    Animated.timing(slideAnim, {
      toValue: targetValue,
      duration,
      easing: ANIMATION_EASINGS.BEZIER,
      useNativeDriver: true,
    }).start();
  }, [visible, direction, distance, duration, slideAnim]);

  return slideAnim;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a parallel animation for multiple properties
 *
 * Runs multiple animations simultaneously for smooth coordinated effects
 * All animations use native driver for optimal performance
 *
 * @param animations - Array of animation configurations
 * @returns Animated.CompositeAnimation that can be started
 *
 * @example
 * ```tsx
 * const fadeScale = createParallelAnimation([
 *   { value: opacityAnim, toValue: 1, duration: 300 },
 *   { value: scaleAnim, toValue: 1.2, duration: 300 }
 * ]);
 * fadeScale.start();
 * ```
 */
export function createParallelAnimation(
  animations: {
    value: Animated.Value;
    toValue: number;
    duration?: number;
    easing?: (value: number) => number;
  }[],
): Animated.CompositeAnimation {
  const animatedValues = animations.map(({ value, toValue, duration, easing }) =>
    Animated.timing(value, {
      toValue,
      duration: duration ?? ANIMATION_DURATIONS.NORMAL,
      easing: easing ?? ANIMATION_EASINGS.EASE_IN_OUT,
      useNativeDriver: true,
    }),
  );

  return Animated.parallel(animatedValues);
}

/**
 * Creates a sequence animation for multiple steps
 *
 * Runs animations in order, one after another
 * Useful for multi-step effects (slide in → pulse → slide out)
 *
 * @param animations - Array of animation configurations
 * @returns Animated.CompositeAnimation that can be started
 *
 * @example
 * ```tsx
 * const notification = createSequenceAnimation([
 *   { value: slideAnim, toValue: 0, duration: 300 },
 *   { value: opacityAnim, toValue: 1, duration: 200 },
 *   { value: opacityAnim, toValue: 0, duration: 200, delay: 2000 }
 * ]);
 * notification.start();
 * ```
 */
export function createSequenceAnimation(
  animations: {
    value: Animated.Value;
    toValue: number;
    duration?: number;
    easing?: (value: number) => number;
    delay?: number;
  }[],
): Animated.CompositeAnimation {
  const animatedValues = animations.map(({ value, toValue, duration, easing, delay }) => {
    const anim = Animated.timing(value, {
      toValue,
      duration: duration ?? ANIMATION_DURATIONS.NORMAL,
      easing: easing ?? ANIMATION_EASINGS.EASE_IN_OUT,
      useNativeDriver: true,
    });

    return delay ? Animated.sequence([Animated.delay(delay), anim]) : anim;
  });

  return Animated.sequence(animatedValues);
}

/**
 * Interpolates rotation for compass-style displays
 *
 * Creates interpolation config for rotating elements (compass, wind direction)
 * Handles degree-to-radian conversion and full rotation range
 *
 * @param animatedValue - Animated value in degrees
 * @returns Interpolation config for transform rotation
 *
 * @example
 * ```tsx
 * const rotationAnim = new Animated.Value(45);
 * const rotation = interpolateRotation(rotationAnim);
 *
 * <Animated.View style={{ transform: [{ rotate: rotation }] }}>
 *   <CompassNeedle />
 * </Animated.View>
 * ```
 */
export function interpolateRotation(
  animatedValue: Animated.Value,
): Animated.AnimatedInterpolation<string | number> {
  return animatedValue.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });
}

/**
 * Interpolates color for status indicators
 *
 * Creates color interpolation for smooth color transitions
 * Note: Color interpolation is less performant than transform/opacity
 * Use sparingly and consider native driver limitations
 *
 * @param animatedValue - Animated value (0 to 1)
 * @param colors - Array of color strings
 * @returns Interpolated color
 *
 * @example
 * ```tsx
 * const colorAnim = new Animated.Value(batteryLevel / 100);
 * const color = interpolateColor(colorAnim, ['#ff0000', '#ffff00', '#00ff00']);
 *
 * <Animated.View style={{ backgroundColor: color }}>
 *   <BatteryIndicator />
 * </Animated.View>
 * ```
 */
export function interpolateColor(
  animatedValue: Animated.Value,
  colors: string[],
): Animated.AnimatedInterpolation<string | number> {
  const inputRange = colors.map((_, i) => i / (colors.length - 1));

  return animatedValue.interpolate({
    inputRange,
    outputRange: colors,
  });
}

/**
 * Performance utility: Measures animation frame rate
 *
 * Tracks animation performance to ensure 60fps target
 * Only active in development mode to avoid production overhead
 *
 * @param animationName - Name for logging purposes
 * @returns Measurement controller with start/stop methods
 *
 * @example
 * ```tsx
 * const measurement = measureAnimationPerformance('CompassRotation');
 * measurement.start();
 * // ... animation runs ...
 * measurement.stop(); // Logs avg FPS to console
 * ```
 */
export function measureAnimationPerformance(animationName: string) {
  if (__DEV__) {
    let frameCount = 0;
    let startTime = 0;
    let rafId: number | null = null;

    const countFrame = () => {
      frameCount++;
      rafId = requestAnimationFrame(countFrame);
    };

    return {
      start: () => {
        frameCount = 0;
        startTime = Date.now();
        rafId = requestAnimationFrame(countFrame);
      },
      stop: () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          const duration = Date.now() - startTime;
          const fps = (frameCount / duration) * 1000;
        }
      },
    };
  }

  // No-op in production
  return {
    start: () => {},
    stop: () => {},
  };
}

/**
 * Gets optimal animation duration based on platform performance
 *
 * Adjusts animation durations for lower-end devices
 * iOS generally handles faster animations better than Android
 *
 * @param baseDuration - Base duration in ms
 * @returns Adjusted duration for current platform
 */
export function getPlatformOptimizedDuration(baseDuration: number): number {
  // iOS devices generally handle faster animations better
  if (Platform.OS === 'ios') {
    return baseDuration;
  }

  // Android: slightly longer durations for smoother perception
  if (Platform.OS === 'android') {
    return baseDuration * 1.2;
  }

  // Web: faster animations feel more responsive
  return baseDuration * 0.8;
}

/**
 * Type guard to check if animation should use native driver
 *
 * Native driver only supports transform and opacity properties
 * Layout properties (width, height, margin, etc.) must use JS driver
 *
 * @param property - CSS property name
 * @returns true if property can use native driver
 */
export function canUseNativeDriver(property: string): boolean {
  const nativeDriverProps = ['opacity', 'transform', 'translateX', 'translateY', 'scale', 'rotate'];
  return nativeDriverProps.includes(property);
}
