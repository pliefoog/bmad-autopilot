/**
 * Platform Detection Utilities
 * Story 13.2.1 - Phase 2: Platform Detection Utilities
 * Enhanced for TV platforms (tvOS, Android TV) and viewing distance scaling
 * 
 * Provides platform detection and capability checking for adaptive UI
 */

import { Platform, Dimensions } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { logger } from './logger';

/**
 * Platform type enumeration
 */
export type PlatformType = 'ios' | 'android' | 'web' | 'desktop';

/**
 * Platform variant enumeration (more granular)
 */
export type PlatformVariant = 
  | 'ios-phone' 
  | 'ios-tablet' 
  | 'tvos' 
  | 'android-phone' 
  | 'android-tablet' 
  | 'androidtv' 
  | 'web'
  | 'unknown';

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
 * Detect if app is running in iPad Split View or Slide Over
 * Returns multitasking mode information for responsive layouts
 */
export function getIPadMultitaskingMode(): {
  isSplitView: boolean;
  isSlideOver: boolean;
  isFullScreen: boolean;
  widthPercentage: number;
} {
  if (Platform.OS !== 'ios') {
    return { isSplitView: false, isSlideOver: false, isFullScreen: true, widthPercentage: 100 };
  }

  const { width, height } = Dimensions.get('window');
  const screen = Dimensions.get('screen');
  
  const widthPercentage = (width / screen.width) * 100;
  
  // Slide Over: ~320-375pt width (narrow overlay)
  const isSlideOver = width < 400;
  
  // Split View: 1/3, 1/2, or 2/3 of screen
  const isSplitView = !isSlideOver && widthPercentage < 95;
  
  // Full screen: > 95% of screen width
  const isFullScreen = widthPercentage >= 95;
  
  logger.platform(`iPad Multitasking: ${width}pt (${widthPercentage.toFixed(1)}%), SlideOver: ${isSlideOver}, SplitView: ${isSplitView}, FullScreen: ${isFullScreen}`);
  
  return { isSplitView, isSlideOver, isFullScreen, widthPercentage };
}

/**
 * Detect if hardware keyboard is connected (iPad Smart Keyboard, Magic Keyboard)
 * Note: React Native doesn't provide direct keyboard detection API
 * This is a heuristic based on platform and screen size
 */
export function hasHardwareKeyboard(): boolean {
  // iPad Pro users likely have keyboard accessory
  if (Platform.OS === 'ios') {
    // @ts-ignore - Platform.isPad exists on iOS
    if (Platform.isPad === true) {
      const { width } = Dimensions.get('window');
      // iPad Pro sizes (11" = 834pt, 12.9" = 1024pt) suggest keyboard usage
      return width >= 834;
    }
  }
  
  // Web and desktop always have keyboard
  if (Platform.OS === 'web') {
    return true;
  }
  
  return false;
}

/**
 * Check if the device is a tablet
 * Based on native platform detection (iOS) or screen dimensions (Android/Web)
 */
export function isTablet(): boolean {
  // iOS: Use native isPad property (most reliable)
  if (Platform.OS === 'ios') {
    // @ts-ignore - Platform.isPad exists on iOS
    const nativeIsPad = Platform.isPad === true;
    logger.platform(`iOS native detection - isPad: ${nativeIsPad}`);
    return nativeIsPad;
  }
  
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return false;
    const width = window.screen.width;
    const height = window.screen.height;
    const diagonal = Math.sqrt(width * width + height * height);
    // Tablets typically have 7"+ diagonal (>= 768px width)
    return width >= 768 && width < 1024;
  }

  // Android: Use dimensions (no native isPad equivalent)
  const { width, height } = Dimensions.get('window');
  const aspectRatio = Math.max(width, height) / Math.min(width, height);
  const minDimension = Math.min(width, height);
  
  // Tablets typically have:
  // 1. Larger than 600pt in smallest dimension
  // 2. Aspect ratio closer to 4:3 than 16:9
  const isTabletSize = minDimension >= 600 && aspectRatio < 1.6;
  
  logger.platform(`Android - ${width}×${height}, MinDim: ${minDimension}, Aspect: ${aspectRatio.toFixed(2)}, IsTablet: ${isTabletSize}`);
  
  return isTabletSize;
}

/**
 * Detect if running on TV platform
 * Checks for tvOS or Android TV
 */
export function isTV(): boolean {
  // @ts-ignore - Platform.isTV and Platform.isTVOS may not be in types but exist at runtime
  return Platform.isTV === true || Platform.isTVOS === true;
}

/**
 * Detect specific TV platform
 * Returns 'tvos' for Apple TV, 'androidtv' for Android TV, or null for non-TV platforms
 */
export function getTVPlatform(): 'tvos' | 'androidtv' | null {
  // @ts-ignore - Platform.isTVOS may not be in types
  if (Platform.isTVOS === true) return 'tvos';
  // @ts-ignore - Platform.isTV may not be in types
  if (Platform.isTV === true && Platform.OS === 'android') return 'androidtv';
  return null;
}

/**
 * Get platform variant for component selection
 * Returns granular platform information including phone/tablet/TV distinctions
 */
export function getPlatformVariant(): PlatformVariant {
  const { width, height } = Dimensions.get('window');
  const isLargeScreen = Math.min(width, height) >= 600;
  
  // @ts-ignore - Platform.isTVOS may not be in types
  if (Platform.isTVOS === true) return 'tvos';
  // @ts-ignore - Platform.isTV may not be in types
  if (Platform.isTV === true && Platform.OS === 'android') return 'androidtv';
  if (Platform.OS === 'web') return 'web';
  if (Platform.OS === 'ios') return isLargeScreen ? 'ios-tablet' : 'ios-phone';
  if (Platform.OS === 'android') return isLargeScreen ? 'android-tablet' : 'android-phone';
  
  return 'unknown';
}

/**
 * Calculate viewing distance scale factor
 * Phone: 1.0x (12-18 inches)
 * Tablet: 1.2x (18-24 inches)
 * TV: 2.0x (10+ feet)
 * 
 * Used for scaling typography and UI elements based on typical viewing distance
 */
export function getViewingDistanceScale(): number {
  const variant = getPlatformVariant();
  
  if (variant === 'tvos' || variant === 'androidtv') return 2.0;
  if (variant === 'ios-tablet' || variant === 'android-tablet') return 1.2;
  return 1.0;
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
  platformVariant: PlatformVariant;
  hasKeyboard: boolean;
  hasTouchscreen: boolean;
  isGloveMode: boolean;
  isTablet: boolean;
  isTV: boolean;
  tvPlatform: 'tvos' | 'androidtv' | null;
  supportsKeyboardNav: boolean;
  defaultTouchTarget: number;
  viewingDistanceScale: number;
}

/**
 * Get all platform capabilities at once
 * Useful for conditional rendering and adaptive UI
 */
export function getPlatformCapabilities(): PlatformCapabilities {
  return {
    platform: detectPlatform(),
    platformVariant: getPlatformVariant(),
    hasKeyboard: hasKeyboard(),
    hasTouchscreen: hasTouchscreen(),
    isGloveMode: isGloveMode(),
    isTablet: isTablet(),
    isTV: isTV(),
    tvPlatform: getTVPlatform(),
    supportsKeyboardNav: supportsKeyboardNavigation(),
    defaultTouchTarget: getDefaultTouchTargetSize(),
    viewingDistanceScale: getViewingDistanceScale(),
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
