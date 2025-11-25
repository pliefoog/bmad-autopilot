/**
 * Platform Detection Utilities
 * Story 13.2.1 - Phase 2: Platform Detection Utilities
 * 
 * Provides platform detection and capability checking for adaptive UI
 */

import { Platform, Dimensions } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';

/**
 * Platform type enumeration
 */
export type PlatformType = 'ios' | 'android' | 'web' | 'desktop';

/**
 * Detect the current platform
 * Returns 'desktop' for web platforms with keyboard/mouse
 * Returns 'web' for mobile web browsers
 */
export function detectPlatform(): PlatformType {
  if (Platform.OS === 'ios') {
    return 'ios';
  }
  if (Platform.OS === 'android') {
    return 'android';
  }
  if (Platform.OS === 'web') {
    // Check if it's a desktop browser (has keyboard and larger screen)
    if (hasKeyboard() && !hasTouchscreen()) {
      return 'desktop';
    }
    return 'web';
  }
  // Fallback to web for unknown platforms
  return 'web';
}

/**
 * Check if the platform has a physical keyboard
 * Returns true for desktop browsers
 * Returns false for mobile devices (even if external keyboard is connected)
 */
export function hasKeyboard(): boolean {
  if (Platform.OS !== 'web') {
    return false;
  }

  // Check for desktop browser characteristics
  if (typeof window === 'undefined') {
    return false;
  }

  // Desktop browsers typically have:
  // 1. No touch support OR
  // 2. Large screen with mouse
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const screenWidth = window.screen.width;
  
  // Desktop heuristic: screen > 1024px OR no touch support
  return screenWidth > 1024 || !hasTouch;
}

/**
 * Check if the platform has a touchscreen
 * Returns true for mobile devices and tablets
 * Returns false for desktop browsers without touch
 */
export function hasTouchscreen(): boolean {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return true;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    // Check for touch support
    if ('ontouchstart' in window) return true;
    if (navigator.maxTouchPoints > 0) return true;
    
    // Legacy IE support
    // @ts-ignore
    if (typeof window.DocumentTouch !== 'undefined' && typeof document !== 'undefined' && document instanceof window.DocumentTouch) {
      return true;
    }
    
    return false;
  }

  return false;
}

/**
 * Check if glove mode is currently active
 * Reads from settingsStore to determine if enhanced touch targets are needed
 */
export function isGloveMode(): boolean {
  try {
    const settings = useSettingsStore.getState();
    return settings.themeSettings?.gloveMode ?? false;
  } catch (error) {
    // If store is not available, default to false
    console.warn('platformDetection: Unable to access settings store', error);
    return false;
  }
}

/**
 * Check if the device is a tablet
 * Based on screen dimensions
 */
export function isTablet(): boolean {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return false;
    const width = window.screen.width;
    const height = window.screen.height;
    const diagonal = Math.sqrt(width * width + height * height);
    // Tablets typically have 7"+ diagonal (>= 768px width)
    return width >= 768 && width < 1024;
  }

  // For native platforms, use dimensions
  const { width, height } = Dimensions.get('window');
  const aspectRatio = Math.max(width, height) / Math.min(width, height);
  
  // Tablets typically have:
  // 1. Larger than 600pt in smallest dimension
  // 2. Aspect ratio closer to 4:3 than 16:9
  return Math.min(width, height) >= 600 && aspectRatio < 1.6;
}

/**
 * Check if the platform supports keyboard navigation
 * Alias for hasKeyboard() for semantic clarity
 */
export const supportsKeyboardNavigation = hasKeyboard;

/**
 * Get the current platform's default touch target size
 * Considers glove mode and device type
 */
export function getDefaultTouchTargetSize(): number {
  const gloveMode = isGloveMode();
  const tablet = isTablet();

  if (gloveMode) {
    return 64; // Glove-friendly
  }
  if (tablet || Platform.OS === 'web') {
    return 56; // Marine-optimized for helm/dashboard
  }
  return 44; // Standard iOS minimum
}

/**
 * Platform capabilities object
 * Provides a comprehensive view of current platform capabilities
 */
export interface PlatformCapabilities {
  platform: PlatformType;
  hasKeyboard: boolean;
  hasTouchscreen: boolean;
  isGloveMode: boolean;
  isTablet: boolean;
  supportsKeyboardNav: boolean;
  defaultTouchTarget: number;
}

/**
 * Get all platform capabilities at once
 * Useful for conditional rendering and adaptive UI
 */
export function getPlatformCapabilities(): PlatformCapabilities {
  return {
    platform: detectPlatform(),
    hasKeyboard: hasKeyboard(),
    hasTouchscreen: hasTouchscreen(),
    isGloveMode: isGloveMode(),
    isTablet: isTablet(),
    supportsKeyboardNav: supportsKeyboardNavigation(),
    defaultTouchTarget: getDefaultTouchTargetSize(),
  };
}

/**
 * React hook for platform capabilities
 * Returns platform capabilities with reactive updates
 */
export function usePlatformCapabilities(): PlatformCapabilities {
  // Note: This is a simple implementation that doesn't react to changes
  // In a full implementation, you might want to use useState and effects
  // to update when settings change or window resizes
  return getPlatformCapabilities();
}
