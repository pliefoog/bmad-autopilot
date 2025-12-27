/**
 * FlashingText Component
 *
 * Renders text with optional flashing animation for alarm states.
 * Used by MetricCells to indicate WARNING (2) and CRITICAL (3) alarm levels.
 *
 * **Flashing Pattern:**
 * - NONE (0): No flashing, normal color
 * - STALE (1): No flashing, dimmed color (data is old)
 * - WARNING (2): Slow flash (1s on/off) - Morse U pattern consideration
 * - CRITICAL (3): Fast flash (0.5s on/off) - Rapid pulse pattern
 *
 * **Performance:**
 * - Uses native Animated API for smooth 60fps animations
 * - Efficient opacity transitions
 * - Automatic cleanup on unmount
 */

import React, { useEffect, useRef } from 'react';
import { Animated, TextStyle } from 'react-native';
import type { AlarmLevel } from '../types/AlarmTypes';

export interface FlashingTextProps {
  /** Text content to display */
  children: React.ReactNode;
  
  /** Alarm level: 0=NONE, 1=STALE, 2=WARNING, 3=CRITICAL */
  alarmLevel: AlarmLevel;
  
  /** Base text style (color, fontSize, etc.) */
  style?: TextStyle;
  
  /** Whether flashing is enabled globally (can be disabled in settings) */
  flashingEnabled?: boolean;
}

/**
 * FlashingText Component
 * 
 * Renders text with alarm-appropriate flashing animation.
 */
export const FlashingText: React.FC<FlashingTextProps> = ({
  children,
  alarmLevel,
  style,
  flashingEnabled = true,
}) => {
  const opacity = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // Stop any existing animation
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }

    // Reset opacity
    opacity.setValue(1);

    // No flashing for NONE (0) or STALE (1)
    if (!flashingEnabled || alarmLevel < 2) {
      return;
    }

    // Configure flashing based on alarm level
    const flashDuration = alarmLevel === 3 ? 500 : 1000; // CRITICAL: 0.5s, WARNING: 1s

    // Create flashing animation
    const flashAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3, // Flash to 30% opacity
          duration: flashDuration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1, // Return to 100% opacity
          duration: flashDuration / 2,
          useNativeDriver: true,
        }),
      ]),
    );

    animationRef.current = flashAnimation;
    flashAnimation.start();

    // Cleanup on unmount or alarmLevel change
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
    };
  }, [alarmLevel, flashingEnabled, opacity]);

  return (
    <Animated.Text style={[style, { opacity }]}>
      {children}
    </Animated.Text>
  );
};

export default FlashingText;
