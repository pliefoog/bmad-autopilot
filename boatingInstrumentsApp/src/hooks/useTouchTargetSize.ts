/**
 * Touch Target Size Hook
 * Story 13.2.2 - Task 5.2: Platform-aware touch target sizing
 *
 * Returns appropriate touch target size based on platform detection
 * - Phone: 44pt (iOS HIG minimum)
 * - Tablet: 56pt (marine-optimized)
 * - Glove Mode: 64pt (enhanced for gloves)
 */

import { useMemo } from 'react';
import { isTablet, isGloveMode } from '../utils/platformDetection';
import { settingsTokens } from '../theme/settingsTokens';

/**
 * Hook that returns platform-appropriate touch target size
 *
 * @returns Touch target size in points (44, 56, or 64)
 *
 * @example
 * ```tsx
 * const touchTargetSize = useTouchTargetSize();
 * <View style={{ height: touchTargetSize, minHeight: touchTargetSize }}>
 *   <Text>Button</Text>
 * </View>
 * ```
 */
export const useTouchTargetSize = (): number => {
  const size = useMemo(() => {
    // Check glove mode first (highest priority)
    if (isGloveMode()) {
      return settingsTokens.touchTargets.glove; // 64pt
    }

    // Check if tablet
    if (isTablet()) {
      return settingsTokens.touchTargets.tablet; // 56pt
    }

    // Default to phone size
    return settingsTokens.touchTargets.phone; // 44pt
  }, []); // Empty dependency array - recalculates on mount only

  return size;
};
