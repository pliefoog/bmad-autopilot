import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import { getUseNativeDriver } from '../utils/animationUtils';

/**
 * Custom hook for managing hamburger menu animation state
 * Provides slide-in/slide-out animations with 300ms timing
 */
export const useMenuState = (visible: boolean) => {
  const slideAnimation = useRef(new Animated.Value(-400)).current; // Start off-screen
  const fadeAnimation = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    // Slide in from left and fade in overlay
    Animated.parallel([
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: getUseNativeDriver(),
      }),
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: getUseNativeDriver(),
      }),
    ]).start();
  }, [slideAnimation, fadeAnimation]);

  const animateOut = useCallback((callback?: () => void) => {
    // Slide out to left and fade out overlay
    Animated.parallel([
      Animated.timing(slideAnimation, {
        toValue: -400,
        duration: 300,
        useNativeDriver: getUseNativeDriver(),
      }),
      Animated.timing(fadeAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: getUseNativeDriver(),
      }),
    ]).start(() => {
      if (callback) {
        callback();
      }
    });
  }, [slideAnimation, fadeAnimation]);

  return {
    slideAnimation,
    fadeAnimation,
    animateIn,
    animateOut,
  };
};