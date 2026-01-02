/**
 * PlatformButton Component
 * Story 13.2.2 - Task 4: Consistent button with platform feel
 * Epic 8 - Phase 1: TV Support Extension
 *
 * Features:
 * - Adaptive touch target sizing (44pt phone, 56pt tablet, 60pt TV)
 * - Variants: primary, secondary, danger
 * - Press state animation (opacity 0.7, 100ms)
 * - Haptic feedback on mobile
 * - Loading state with spinner
 * - TV focus border (4px interactive color)
 * - Theme integration
 */

import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Platform,
} from 'react-native';
import { useTheme } from '../../../store/themeStore';
import { settingsTokens, getPlatformTokens } from '../../../theme/settingsTokens';
import { UniversalIcon } from '../../atoms/UniversalIcon';
import { useTouchTargetSize, useHapticFeedback } from '../../../hooks';
import { isTV } from '../../../utils/platformDetection';

/**
 * Button variant types
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger';

/**
 * PlatformButton Props
 */
export interface PlatformButtonProps {
  /** Press handler */
  onPress: () => void;

  /** Button text */
  title: string;

  /** Button variant (default: 'primary') */
  variant?: ButtonVariant;

  /** Disabled state */
  disabled?: boolean;

  /** Full width (stretches to container width) */
  fullWidth?: boolean;

  /** Loading state (shows spinner, disables interaction) */
  loading?: boolean;

  /** Optional icon name (from Ionicons) */
  icon?: string;

  /** TV focus state (for TV navigation) */
  focused?: boolean;

  /** Test ID for testing */
  testID?: string;
}

/**
 * Consistent button component with variants and haptic feedback
 *
 * @example
 * <PlatformButton
 *   title="Save"
 *   variant="primary"
 *   onPress={handleSave}
 *   icon="checkmark-outline"
 * />
 *
 * <PlatformButton
 *   title="Cancel"
 *   variant="secondary"
 *   onPress={handleCancel}
 * />
 *
 * <PlatformButton
 *   title="Delete"
 *   variant="danger"
 *   onPress={handleDelete}
 *   loading={isDeleting}
 * />
 */
export const PlatformButton: React.FC<PlatformButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  disabled = false,
  fullWidth = false,
  loading = false,
  icon,
  focused = false,
  testID = 'platform-button',
}) => {
  const theme = useTheme();
  const platformTokens = getPlatformTokens();
  const tvMode = isTV();
  const styles = React.useMemo(
    () => createStyles(theme, platformTokens, tvMode, focused),
    [theme, platformTokens, tvMode, focused],
  );
  const touchTargetSizeHook = useTouchTargetSize();
  const touchTargetSize = tvMode ? platformTokens.touchTarget : touchTargetSizeHook;
  const haptics = useHapticFeedback();

  /**
   * Handle press with haptic feedback
   */
  const handlePress = useCallback(() => {
    if (disabled || loading) return;

    // Trigger appropriate haptic feedback based on variant
    if (variant === 'danger') {
      haptics.triggerMedium(); // Stronger feedback for destructive action
    } else {
      haptics.triggerLight(); // Light feedback for standard actions
    }

    onPress();
  }, [disabled, loading, variant, haptics, onPress]);

  // Get variant-specific styles
  const variantStyles = getVariantStyles(variant, theme);

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.button,
        { height: touchTargetSize },
        variantStyles.button,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
      ]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator
          color={variantStyles.text.color}
          size="small"
          testID={`${testID}-spinner`}
        />
      ) : (
        <View style={styles.content}>
          {icon && (
            <UniversalIcon
              name={icon}
              size={20}
              color={variantStyles.text.color}
              style={styles.icon}
            />
          )}
          <Text
            style={[
              styles.text,
              variantStyles.text,
              // Force visibility with inline color as last resort
              { color: variantStyles.text.color },
            ]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {title || 'Button'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

/**
 * Get variant-specific styles
 */
const getVariantStyles = (variant: ButtonVariant, theme: ReturnType<typeof useTheme>) => {
  switch (variant) {
    case 'primary':
      return {
        button: {
          backgroundColor: theme.primary,
        },
        text: {
          color: '#FFFFFF', // Always white on primary background
          fontWeight: '600' as const,
        },
      };

    case 'secondary':
      return {
        button: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.border,
        },
        text: {
          color: theme.text || '#000000', // Fallback to black if theme.text is undefined
          fontWeight: '500' as const,
        },
      };

    case 'danger':
      return {
        button: {
          backgroundColor: theme.error,
        },
        text: {
          color: '#FFFFFF', // Always white on danger background
          fontWeight: '600' as const,
        },
      };

    default:
      return {
        button: {
          backgroundColor: theme.primary,
        },
        text: {
          color: '#FFFFFF',
          fontWeight: '600' as const,
        },
      };
  }
};

/**
 * Create themed styles
 */
const createStyles = (
  theme: ReturnType<typeof useTheme>,
  platformTokens: ReturnType<typeof getPlatformTokens>,
  tvMode: boolean,
  focused: boolean,
) =>
  StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: settingsTokens.spacing.lg,
      borderRadius: settingsTokens.borderRadius.button,
      // TV focus border
      ...(tvMode &&
        focused && {
          borderWidth: 4,
          borderColor: theme.interactive,
        }),
    },

    fullWidth: {
      width: '100%',
    },

    disabled: {
      opacity: 0.5,
    },

    content: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    icon: {
      marginRight: settingsTokens.spacing.sm,
    },

    text: {
      fontSize: platformTokens.typography.body.fontSize,
      fontWeight: '500' as const,
      fontFamily: platformTokens.typography.fontFamily,
      // Ensure text is always visible with explicit color
      ...(Platform.OS === 'web' && {
        WebkitFontSmoothing: 'antialiased' as any,
      }),
    },
  });
