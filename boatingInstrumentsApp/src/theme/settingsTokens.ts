/**
 * Settings Design Tokens
 * Story 13.2.1 - Phase 1: Create Settings Design Tokens
 * Enhanced with platform-specific variants for iOS, Android, and TV
 *
 * Centralized design system for all settings modals
 * Ensures cross-platform consistency with marine-optimized touch targets
 */

import { Platform } from 'react-native';
import { getPlatformVariant, getViewingDistanceScale } from '../utils/platformDetection';

/**
 * Responsive breakpoints
 * Mobile: 360px-430px (most common range, 400px chosen)
 * Tablet: 768px standard (existing in codebase)
 */
export const MOBILE_BREAKPOINT = 400;

/**
 * Modal dimension configuration
 * Platform-responsive sizing for optimal layout
 */
export const settingsTokens = {
  modal: {
    // Width varies by platform
    width: {
      phone: '90%', // 90% viewport width on phones
      tablet: 500, // Fixed 500pt on tablets
      desktop: 600, // Fixed 600pt on desktop
    },
    maxWidth: 800, // Maximum width constraint
    maxHeight: '90%', // Maximum height as viewport percentage
    minHeight: 400, // Minimum height to prevent collapsing
  },

  /**
   * Touch target sizes - Marine-optimized for glove use
   * Based on designTokens.ts touchTargets
   */
  touchTargets: {
    phone: 44, // iOS minimum (bare hands)
    tablet: 56, // Marine-optimized (dashboard/helm)
    glove: 64, // Enhanced for glove use
  },

  /**
   * Spacing scale - 4pt base grid
   * Consistent spacing throughout settings dialogs
   */
  spacing: {
    xs: 4, // Extra small - tight spacing
    sm: 8, // Small - compact layouts
    md: 12, // Medium - standard spacing
    lg: 16, // Large - section separation
    xl: 24, // Extra large - major sections
    xxl: 32, // Extra extra large - modal padding
    
    // Threshold slider responsive spacing (mobile/desktop)
    thresholdHintMobile: 12,
    thresholdHintDesktop: 16,
    thresholdLegendGapMobile: 8,
    thresholdLegendGapDesktop: 12,
    rangeLabelMobile: 9,
    rangeLabelDesktop: 11,
  },

  /**
   * Animation timings (milliseconds)
   * Fast enough to feel responsive, slow enough to be smooth
   */
  animation: {
    enter: 300, // Modal entrance animation
    exit: 250, // Modal exit animation (faster for responsiveness)
    transition: 200, // General transitions (tabs, sections)
  },

  /**
   * Typography scale for settings
   */
  typography: {
    title: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
    sectionHeader: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    label: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
    },
    body: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    hint: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
      fontStyle: 'italic' as const,
    },
  },

  /**
   * Border radius values
   */
  borderRadius: {
    modal: 12, // Modal container corners
    card: 12, // Settings card/section corners
    button: 8, // Button corners
    input: 6, // Input field corners
    badge: 4, // Small badges/tags
  },

  /**
   * Shadow definitions
   */
  shadows: {
    modal: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
      elevation: 12, // Android elevation
    },
    button: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2, // Android elevation
    },
  },

  /**
   * Layout constants
   */
  layout: {
    headerHeight: 60, // Modal header height
    footerHeight: 80, // Modal footer height (with padding)
    buttonHeight: {
      phone: 44, // Minimum iOS touch target
      tablet: 56, // Marine-optimized
      glove: 64, // Glove-friendly
    },
  },

  /**
   * Backdrop overlay configuration
   */
  backdrop: {
    opacity: 0.6, // 60% opacity for backdrop
    color: '#000000', // Black backdrop
  },

  /**
   * Opacity values for various states
   */
  opacity: {
    disabled: 0.5, // 50% opacity for disabled elements
  },
} as const;

/**
 * Helper function to get current platform-specific modal width
 */
export function getModalWidth(): number | string {
  if (Platform.OS === 'web') {
    return settingsTokens.modal.width.desktop;
  }
  // For native platforms, use dimensions to determine phone vs tablet
  // This is a simplified check - could be enhanced with device detection
  return settingsTokens.modal.width.tablet;
}

/**
 * Helper function to get touch target size based on context
 * @param gloveMode - Whether glove mode is active
 * @param isTablet - Whether device is a tablet
 */
export function getTouchTargetSize(gloveMode: boolean, isTablet: boolean = false): number {
  if (gloveMode) {
    return settingsTokens.touchTargets.glove;
  }
  if (isTablet || Platform.OS === 'web') {
    return settingsTokens.touchTargets.tablet;
  }
  return settingsTokens.touchTargets.phone;
}

/**
 * Helper function to get button height based on context
 * @param gloveMode - Whether glove mode is active
 * @param isTablet - Whether device is a tablet
 */
export function getButtonHeight(gloveMode: boolean, isTablet: boolean = false): number {
  if (gloveMode) {
    return settingsTokens.layout.buttonHeight.glove;
  }
  if (isTablet || Platform.OS === 'web') {
    return settingsTokens.layout.buttonHeight.tablet;
  }
  return settingsTokens.layout.buttonHeight.phone;
}

/**
 * Platform-Specific Modal Presentation Styles
 * Follows iOS HIG and Material Design 3 guidelines
 */
export const modalPresentationStyles = {
  ios: {
    phone: {
      borderRadius: 16,
      marginHorizontal: 20,
      marginVertical: 40,
      shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
    },
    tablet: {
      borderRadius: 16,
      width: 540,
      maxHeight: '85%',
      centered: true,
      shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
    },
  },
  android: {
    phone: {
      borderRadius: 28, // Material Design 3 large radius
      elevation: 8,
      bottomSheet: true, // Slide up from bottom
    },
    tablet: {
      borderRadius: 28,
      width: 560,
      maxHeight: '85%',
      centered: true,
      elevation: 8,
    },
  },
  tv: {
    borderRadius: 12, // Simpler for TV
    width: '80%',
    maxWidth: 1200,
    maxHeight: '80%',
    centered: true,
    // No shadows on TV (performance)
    focusBorder: {
      width: 4,
      color: '#007AFF', // Will be theme-aware at runtime
    },
  },
} as const;

/**
 * Platform-Specific Typography
 * Based on viewing distance scaling
 */
export const platformTypography = {
  ios: {
    // SF Pro Text family
    fontFamily: Platform.select({
      ios: 'System',
      default: 'sans-serif',
    }),
    title: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
    sectionHeader: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
    label: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
    body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
    hint: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16, fontStyle: 'italic' as const },
  },
  android: {
    // Sans-serif family (Roboto on Android native, generic sans-serif on web)
    fontFamily: Platform.select({
      android: 'Roboto',
      default: 'sans-serif',
    }),
    title: { fontSize: 22, fontWeight: '500' as const, lineHeight: 28 }, // Material title-large
    sectionHeader: { fontSize: 16, fontWeight: '500' as const, lineHeight: 24 }, // Material title-medium
    label: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20 }, // Material label-large
    body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 }, // Material body-medium
    caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 }, // Material body-small
    hint: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16, fontStyle: 'italic' as const },
  },
  tv: {
    // 2x scale for 10-foot viewing
    fontFamily: Platform.select({
      ios: 'System',
      default: 'sans-serif',
    }),
    title: { fontSize: 32, fontWeight: '600' as const, lineHeight: 40 },
    sectionHeader: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
    label: { fontSize: 20, fontWeight: '500' as const, lineHeight: 28 },
    body: { fontSize: 20, fontWeight: '400' as const, lineHeight: 28 },
    caption: { fontSize: 18, fontWeight: '400' as const, lineHeight: 24 },
    hint: { fontSize: 18, fontWeight: '400' as const, lineHeight: 24, fontStyle: 'italic' as const },
  },
} as const;

/**
 * Platform-Specific Spacing
 */
export const platformSpacing = {
  phone: {
    section: 16,
    row: 12,
    inset: 16,
  },
  tablet: {
    section: 20,
    row: 16,
    inset: 20,
  },
  tv: {
    section: 32, // 2x for TV
    row: 24,
    inset: 24,
  },
} as const;

/**
 * Touch Target Sizes (Marine-optimized)
 */
export const touchTargets = {
  phone: 44, // iOS minimum
  tablet: 56, // Marine-optimized
  tv: 60, // D-pad/remote navigation
  glove: 64, // Enhanced for glove use (all platforms)
} as const;

/**
 * Platform-Specific Animation Settings
 * TV uses shorter, simpler animations for low-end devices
 */
export const platformAnimations = {
  phone: {
    modalEntrance: 300,
    modalExit: 250,
    focusTransition: 200,
    useNativeDriver: true,
  },
  tablet: {
    modalEntrance: 300,
    modalExit: 250,
    focusTransition: 200,
    useNativeDriver: true,
  },
  tv: {
    modalEntrance: 150, // 50% faster on TV
    modalExit: 150,
    focusTransition: 100, // Snappy focus changes
    useNativeDriver: true,
    reducedMotion: true, // Simpler animations
  },
} as const;

/**
 * Get tokens for current platform
 * Returns platform-specific design tokens based on current device
 */
export function getPlatformTokens() {
  const variant = getPlatformVariant();
  const scale = getViewingDistanceScale();
  const isTV = variant === 'tvos' || variant === 'androidtv';
  const isTablet = variant.includes('tablet');
  const isIOS = variant.startsWith('ios');

  return {
    modal: isTV
      ? modalPresentationStyles.tv
      : isIOS
      ? modalPresentationStyles.ios[isTablet ? 'tablet' : 'phone']
      : modalPresentationStyles.android[isTablet ? 'tablet' : 'phone'],
    typography: isTV
      ? platformTypography.tv
      : isIOS
      ? platformTypography.ios
      : platformTypography.android,
    spacing: isTV ? platformSpacing.tv : isTablet ? platformSpacing.tablet : platformSpacing.phone,
    borderRadius: settingsTokens.borderRadius,
    touchTarget: isTV ? touchTargets.tv : isTablet ? touchTargets.tablet : touchTargets.phone,
    animations: isTV
      ? platformAnimations.tv
      : isTablet
      ? platformAnimations.tablet
      : platformAnimations.phone,
    viewingDistanceScale: scale,
  };
}
