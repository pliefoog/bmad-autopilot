/**
 * Settings Design Tokens
 * Story 13.2.1 - Phase 1: Create Settings Design Tokens
 * 
 * Centralized design system for all settings modals
 * Ensures cross-platform consistency with marine-optimized touch targets
 */

import { Platform } from 'react-native';

/**
 * Modal dimension configuration
 * Platform-responsive sizing for optimal layout
 */
export const settingsTokens = {
  modal: {
    // Width varies by platform
    width: {
      phone: '90%',    // 90% viewport width on phones
      tablet: 500,     // Fixed 500pt on tablets
      desktop: 600,    // Fixed 600pt on desktop
    },
    maxWidth: 800,     // Maximum width constraint
    maxHeight: '90%',  // Maximum height as viewport percentage
    minHeight: 400,    // Minimum height to prevent collapsing
  },

  /**
   * Touch target sizes - Marine-optimized for glove use
   * Based on designTokens.ts touchTargets
   */
  touchTargets: {
    phone: 44,         // iOS minimum (bare hands)
    tablet: 56,        // Marine-optimized (dashboard/helm)
    glove: 64,         // Enhanced for glove use
  },

  /**
   * Spacing scale - 4pt base grid
   * Consistent spacing throughout settings dialogs
   */
  spacing: {
    xs: 4,             // Extra small - tight spacing
    sm: 8,             // Small - compact layouts
    md: 12,            // Medium - standard spacing
    lg: 16,            // Large - section separation
    xl: 24,            // Extra large - major sections
    xxl: 32,           // Extra extra large - modal padding
  },

  /**
   * Animation timings (milliseconds)
   * Fast enough to feel responsive, slow enough to be smooth
   */
  animation: {
    enter: 300,        // Modal entrance animation
    exit: 250,         // Modal exit animation (faster for responsiveness)
    transition: 200,   // General transitions (tabs, sections)
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
  },

  /**
   * Border radius values
   */
  borderRadius: {
    modal: 12,         // Modal container corners
    button: 8,         // Button corners
    input: 6,          // Input field corners
    badge: 4,          // Small badges/tags
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
      elevation: 12,   // Android elevation
    },
    button: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,    // Android elevation
    },
  },

  /**
   * Layout constants
   */
  layout: {
    headerHeight: 60,  // Modal header height
    footerHeight: 80,  // Modal footer height (with padding)
    buttonHeight: {
      phone: 44,       // Minimum iOS touch target
      tablet: 56,      // Marine-optimized
      glove: 64,       // Glove-friendly
    },
  },

  /**
   * Backdrop overlay configuration
   */
  backdrop: {
    opacity: 0.6,      // 60% opacity for backdrop
    color: '#000000',  // Black backdrop
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
