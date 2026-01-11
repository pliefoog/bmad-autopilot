/**
 * Universal Icon Component - Cross-Platform Icon System
 *
 * Provides consistent icon rendering across web and mobile platforms:
 * - Mobile: Uses react-native-vector-icons/Ionicons (vector icons)
 * - Web: Uses enhanced __mocks__/Ionicons.js (monochromatic fallbacks)
 * - Integrates with theme system for automatic color adaptation
 * - Uses Widget Metadata Registry for consistent icon naming
 *
 * This replaces direct Ionicons imports and provides a single icon API.
 */

import React from 'react';
import { Platform } from 'react-native';
import { useTheme } from '../../store/themeStore';
import { log } from '../../utils/logging/logger';

// Platform-specific icon imports
// Use @expo/vector-icons for better web compatibility
import { Ionicons } from '@expo/vector-icons';

export interface UniversalIconProps {
  /** Ionicon name (e.g., 'navigate-outline', 'water-outline') */
  name: string;
  /** Icon size in pixels */
  size?: number;
  /** Icon color (hex or theme color name) */
  color?: string;
  /** Additional styles */
  style?: any;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Universal Icon Component
 *
 * Automatically handles platform differences and theme integration.
 * Uses Widget Metadata Registry for icon validation and consistency.
 *
 * @example
 * // Basic usage
 * <UniversalIcon name="navigate-outline" size={24} />
 *
 * // With theme colors
 * <UniversalIcon name="water-outline" color={theme.primary} />
 *
 * // With accessibility
 * <UniversalIcon
 *   name="battery-charging-outline"
 *   accessibilityLabel="Battery status"
 * />
 */
export const UniversalIcon: React.FC<UniversalIconProps> = ({
  name,
  size = 16,
  color,
  style,
  accessibilityLabel,
  testID,
}) => {
  const theme = useTheme();

  // Debug logging
  if (typeof window !== 'undefined') {
    window.__universalIconCalls = window.__universalIconCalls || [];
    if (window.__universalIconCalls.length < 5) {
      window.__universalIconCalls.push(name);
    }
  }

  // Auto-resolve color if not provided
  const resolvedColor = color || theme.textSecondary;

  // Icon validation (in development)
  if (__DEV__) {
    const validIcons = [
      // Marine instruments
      'navigate-outline',
      'compass-outline',
      'speedometer-outline',
      'cloud-outline',
      'partly-sunny-outline',
      'water-outline',
      'thermometer-outline',
      'boat-outline',
      // Multi-instance devices
      'car-outline',
      'battery-charging-outline',
      'cube-outline',
      'hardware-chip-outline',
      // Alarm configuration icons
      'arrow-down-outline',
      'arrow-forward-outline',
      'swap-horizontal-outline',
      'chevron-back-outline',
      'chevron-forward-outline',
      'chevron-down-outline',
      'chevron-up-outline',
      'volume-high-outline',
      // UI elements
      'add',
      'pin',
      'close',
      'close-outline',
      'checkmark-circle',
      'checkmark-circle-outline',
      'refresh-outline',
      'remove',
      'layers-outline',
      'settings-outline',
      'grid-outline',
      'alert-circle-outline',
      'wifi-outline',
      'information-circle',
      'information-circle-outline',
      'notifications-outline',
      'warning-outline',
      'color-palette-outline',
      'extension-puzzle-outline',
      // Menu and navigation
      'menu-outline',
      'home-outline',
      'list-outline',
    ];

    if (!validIcons.includes(name)) {
      log.app('UniversalIcon: Unknown icon', () => ({
        name,
        suggestion: 'Consider adding to Widget Metadata Registry',
      }));
    }
  }

  // Platform-specific rendering
  return (
    <Ionicons
      name={name}
      size={size}
      color={resolvedColor}
      style={style}
      accessibilityLabel={accessibilityLabel || name}
      testID={testID}
    />
  );
};

/**
 * Convenience hook for theme-aware icon colors
 *
 * @example
 * const iconColors = useIconColors();
 * <UniversalIcon name="alert" color={iconColors.warning} />
 */
export const useIconColors = () => {
  const theme = useTheme();

  return {
    primary: theme.iconPrimary || theme.primary,
    secondary: theme.textSecondary,
    success: theme.success,
    warning: theme.warning,
    error: theme.error,
    muted: theme.textSecondary,
    accent: theme.accent,
  };
};

/**
 * Icon size presets for consistency
 */
export const IconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export type IconSize = keyof typeof IconSizes;

/**
 * Preset Icon Component with standard sizes
 *
 * @example
 * <PresetIcon name="navigate-outline" size="lg" />
 */
interface PresetIconProps extends Omit<UniversalIconProps, 'size'> {
  size?: IconSize | number;
}

export const PresetIcon: React.FC<PresetIconProps> = ({ size = 'sm', ...props }) => {
  const resolvedSize = typeof size === 'string' ? IconSizes[size] : size;

  return <UniversalIcon {...props} size={resolvedSize} />;
};

// Export default for convenience
export default UniversalIcon;
