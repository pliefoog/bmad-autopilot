/**
 * Animation Configuration Utilities
 * Handles cross-platform animation settings, particularly for web compatibility
 */
import { Platform } from 'react-native';

/**
 * Get the appropriate useNativeDriver value for the current platform
 * Web platform doesn't support native animations, so we disable it there
 */
export const getUseNativeDriver = (): boolean => {
  return Platform.OS !== 'web';
};

/**
 * Common animation configurations with platform-specific settings
 */
export const AnimationConfig = {
  // Standard timing animation
  timing: {
    duration: 300,
    useNativeDriver: getUseNativeDriver(),
  },

  // Fast timing animation
  timingFast: {
    duration: 200,
    useNativeDriver: getUseNativeDriver(),
  },

  // Slow timing animation
  timingSlow: {
    duration: 500,
    useNativeDriver: getUseNativeDriver(),
  },

  // Menu slide animation
  menuSlide: {
    duration: 300,
    useNativeDriver: getUseNativeDriver(),
  },

  // Toast animation
  toast: {
    duration: 250,
    useNativeDriver: getUseNativeDriver(),
  },

  // Loading spinner animation
  spinner: {
    duration: 1000,
    useNativeDriver: getUseNativeDriver(),
  },
};

/**
 * Platform-specific style utilities
 */
export const PlatformStyles = {
  /**
   * Cross-platform text shadow
   * Uses textShadow on web, textShadow* properties on native
   */
  textShadow: (color = 'rgba(0,0,0,0.5)', offset = { x: 0, y: 1 }, radius = 2) =>
    Platform.select({
      web: {
        textShadow: `${offset.x}px ${offset.y}px ${radius}px ${color}`,
      },
      default: {
        textShadowColor: color,
        textShadowOffset: { width: offset.x, height: offset.y },
        textShadowRadius: radius,
      },
    }),

  /**
   * Cross-platform box shadow
   * Uses boxShadow on web, shadow* properties on native
   */
  boxShadow: (color = 'rgba(0,0,0,0.1)', offset = { x: 0, y: 2 }, radius = 4, opacity = 0.1) =>
    Platform.select({
      web: {
        boxShadow: `${offset.x}px ${offset.y}px ${radius}px ${color}`,
      },
      default: {
        shadowColor: color,
        shadowOffset: { width: offset.x, height: offset.y },
        shadowOpacity: opacity,
        shadowRadius: radius,
      },
    }),
};
