/**
 * Cross-Platform Shadow Utilities
 *
 * Handles platform differences for shadow styling:
 * - Mobile (iOS/Android): Uses shadowColor, shadowOffset, shadowOpacity, shadowRadius
 * - Web: Uses boxShadow (suppresses deprecation warnings)
 *
 * Usage:
 * ```typescript
 * import { createShadow } from '@/utils/shadowUtils';
 *
 * const styles = StyleSheet.create({
 *   card: {
 *     ...createShadow({ elevation: 3 })
 *   }
 * });
 * ```
 */

import { Platform, ViewStyle } from 'react-native';

export interface ShadowConfig {
  color?: string;
  offsetX?: number;
  offsetY?: number;
  opacity?: number;
  radius?: number;
  elevation?: number;
}

/**
 * Material Design elevation levels mapped to shadow properties
 */
const ELEVATION_SHADOWS: Record<number, Required<Omit<ShadowConfig, 'elevation'>>> = {
  0: {
    color: 'transparent',
    offsetX: 0,
    offsetY: 0,
    opacity: 0,
    radius: 0,
  },
  1: {
    color: '#000',
    offsetX: 0,
    offsetY: 1,
    opacity: 0.18,
    radius: 1.0,
  },
  2: {
    color: '#000',
    offsetX: 0,
    offsetY: 2,
    opacity: 0.22,
    radius: 2.22,
  },
  3: {
    color: '#000',
    offsetX: 0,
    offsetY: 4,
    opacity: 0.25,
    radius: 3.84,
  },
  4: {
    color: '#000',
    offsetX: 0,
    offsetY: 6,
    opacity: 0.27,
    radius: 4.65,
  },
  5: {
    color: '#000',
    offsetX: 0,
    offsetY: 10,
    opacity: 0.3,
    radius: 8.0,
  },
  6: {
    color: '#000',
    offsetX: 0,
    offsetY: 15,
    opacity: 0.35,
    radius: 12.0,
  },
};

/**
 * Creates platform-appropriate shadow styles.
 *
 * On web, returns boxShadow to avoid deprecation warnings.
 * On mobile, returns individual shadow properties.
 *
 * @param config - Shadow configuration or elevation level (0-6)
 * @returns Platform-appropriate shadow styles
 *
 * @example
 * // Using elevation
 * createShadow({ elevation: 3 })
 *
 * @example
 * // Custom shadow
 * createShadow({
 *   color: '#000',
 *   offsetX: 0,
 *   offsetY: 4,
 *   opacity: 0.25,
 *   radius: 8
 * })
 */
export function createShadow(config: ShadowConfig): ViewStyle {
  // Use elevation preset if provided
  const shadow =
    config.elevation !== undefined && config.elevation in ELEVATION_SHADOWS
      ? ELEVATION_SHADOWS[config.elevation]
      : {
          color: config.color ?? '#000',
          offsetX: config.offsetX ?? 0,
          offsetY: config.offsetY ?? 2,
          opacity: config.opacity ?? 0.25,
          radius: config.radius ?? 3.84,
        };

  if (Platform.OS === 'web') {
    // Web: Use boxShadow to avoid deprecation warnings
    const { color, offsetX, offsetY, radius, opacity } = shadow;
    return {
      boxShadow: `${offsetX}px ${offsetY}px ${radius}px rgba(0, 0, 0, ${opacity})`,
    } as ViewStyle;
  }

  // Mobile: Use individual shadow properties
  return {
    shadowColor: shadow.color,
    shadowOffset: { width: shadow.offsetX, height: shadow.offsetY },
    shadowOpacity: shadow.opacity,
    shadowRadius: shadow.radius,
    ...(Platform.OS === 'android' && config.elevation !== undefined
      ? { elevation: config.elevation }
      : {}),
  };
}

/**
 * Preset shadow styles for common use cases
 */
export const shadowPresets = {
  none: createShadow({ elevation: 0 }),
  xs: createShadow({ elevation: 1 }),
  sm: createShadow({ elevation: 2 }),
  md: createShadow({ elevation: 3 }),
  lg: createShadow({ elevation: 4 }),
  xl: createShadow({ elevation: 5 }),
  xxl: createShadow({ elevation: 6 }),

  // Semantic presets
  card: createShadow({ elevation: 2 }),
  button: createShadow({ elevation: 2 }),
  dialog: createShadow({ elevation: 5 }),
  dropdown: createShadow({ elevation: 3 }),
  tooltip: createShadow({ elevation: 4 }),
};
