/**
 * PlatformButton Component
 * Story 13.2.2 - Task 4: Consistent button with platform feel
 * 
 * Features:
 * - Adaptive touch target sizing (44pt phone, 56pt tablet)
 * - Variants: primary, secondary, danger
 * - Press state animation (opacity 0.7, 100ms)
 * - Haptic feedback on mobile
 * - Loading state with spinner
 * - Theme integration
 */

import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { useTheme } from '../../../store/themeStore';
import { settingsTokens } from '../../../theme/settingsTokens';
import { UniversalIcon } from '../../atoms/UniversalIcon';
import { useTouchTargetSize, useHapticFeedback } from '../../../hooks';

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
  testID = 'platform-button',
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const touchTargetSize = useTouchTargetSize();
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
          <Text style={[styles.text, variantStyles.text]}>
            {title}
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
          color: theme.text,
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
const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: settingsTokens.spacing.lg,
    borderRadius: settingsTokens.borderRadius.button,
    // Minimum touch target is handled by height prop from useTouchTargetSize
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
    fontSize: settingsTokens.typography.body.fontSize,
  },
});
