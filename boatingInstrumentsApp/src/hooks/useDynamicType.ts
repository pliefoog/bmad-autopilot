/**
 * Dynamic Type Support Hook
 * 
 * Provides iOS Dynamic Type support for scalable typography
 * ensuring readability at various distances (2-3 meters for dashboard view,
 * close-up for settings with multifocal glasses consideration)
 * 
 * iOS HIG Compliance: Respects user's text size preferences
 * Marine Safety: Ensures legibility at distance for tablet dashboard mounting
 */

import { useWindowDimensions } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';

interface DynamicTypeScale {
  scaleFont: (baseSize: number) => number;
  fontScale: number;
  // iOS text style sizes
  largeTitle: number;
  title1: number;
  title2: number;
  title3: number;
  headline: number;
  body: number;
  callout: number;
  subheadline: number;
  footnote: number;
  caption1: number;
  caption2: number;
}

/**
 * Dynamic Type scaling factors for marine use
 * 
 * Distance considerations:
 * - Dashboard view: 2-3 meters viewing distance
 * - Settings view: 30-50cm (held in hand)
 * - Older users with multifocal glasses: Need larger base sizes
 */
const MARINE_SCALE_FACTORS = {
  dashboard: 1.5,  // 50% larger for dashboard/cockpit mounting
  standard: 1.0,   // Standard handheld use
  settings: 1.0,   // Settings are handheld, use standard scale
} as const;

export const useDynamicType = (context: 'dashboard' | 'standard' | 'settings' = 'standard'): DynamicTypeScale => {
  const { fontScale } = useWindowDimensions();
  const { themeSettings } = useSettingsStore();
  
  // Base scale factor from settings
  let settingsScale = 1.0;
  switch (themeSettings.fontSize) {
    case 'small':
      settingsScale = 0.9;
      break;
    case 'medium':
      settingsScale = 1.0;
      break;
    case 'large':
      settingsScale = 1.15;
      break;
    case 'extra-large':
      settingsScale = 1.3;
      break;
  }
  
  // Apply marine context scaling
  const contextScale = MARINE_SCALE_FACTORS[context];
  
  // Apply large text accessibility boost if enabled
  const accessibilityScale = themeSettings.largeText ? 1.15 : 1.0;
  
  // Combine all scaling factors
  // iOS fontScale (system preference) × settings × context × accessibility
  const combinedScale = fontScale * settingsScale * contextScale * accessibilityScale;
  
  /**
   * Scale a font size value
   * Applies combined scaling with sensible min/max bounds
   */
  const scaleFont = (baseSize: number): number => {
    const scaled = Math.round(baseSize * combinedScale);
    // Ensure minimum readability (iOS minimum is typically 11pt)
    const minSize = context === 'dashboard' ? 16 : 11;
    // Cap maximum size to prevent layout breakage
    const maxSize = context === 'dashboard' ? 80 : 48;
    return Math.max(minSize, Math.min(maxSize, scaled));
  };
  
  // iOS standard text style sizes (scaled)
  // Base sizes from iOS Human Interface Guidelines
  return {
    scaleFont,
    fontScale: combinedScale,
    // iOS text styles with proper scaling
    largeTitle: scaleFont(34),
    title1: scaleFont(28),
    title2: scaleFont(22),
    title3: scaleFont(20),
    headline: scaleFont(17),
    body: scaleFont(17),
    callout: scaleFont(16),
    subheadline: scaleFont(15),
    footnote: scaleFont(13),
    caption1: scaleFont(12),
    caption2: scaleFont(11),
  };
};

/**
 * Get iOS-compliant line height for a given font size
 * iOS uses approximately 1.29x multiplier for body text
 */
export const getLineHeight = (fontSize: number): number => {
  return Math.round(fontSize * 1.29);
};

/**
 * Get iOS-compliant letter spacing for a given font size
 * iOS uses slight negative tracking for text 17pt and below
 */
export const getLetterSpacing = (fontSize: number): number => {
  if (fontSize >= 20) return 0.38;
  if (fontSize >= 17) return -0.41;
  if (fontSize >= 15) return -0.24;
  if (fontSize >= 13) return -0.08;
  return 0;
};

export default useDynamicType;
