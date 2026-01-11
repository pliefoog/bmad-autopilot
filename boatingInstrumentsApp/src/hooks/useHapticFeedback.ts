/**
 * Haptic Feedback Hook
 * Story 13.2.2 - Task 5.4: Platform-specific haptic feedback
 *
 * Provides tactile feedback on mobile platforms (iOS/Android)
 * No-op on web/desktop platforms
 */

import { useCallback } from 'react';
import { Platform } from 'react-native';
import { log } from '../utils/logging/logger';

// Conditional import for expo-haptics (only available on mobile)
let Haptics: any;
try {
  Haptics = require('expo-haptics');
} catch (e) {
  // expo-haptics not available (web platform)
  Haptics = null;
}

/**
 * Return type for useHapticFeedback hook
 */
export interface UseHapticFeedbackReturn {
  /** Light impact feedback (e.g., button tap) */
  triggerLight: () => Promise<void>;

  /** Medium impact feedback (e.g., toggle switch) */
  triggerMedium: () => Promise<void>;

  /** Success notification (e.g., form submitted) */
  triggerSuccess: () => Promise<void>;

  /** Error notification (e.g., validation failed) */
  triggerError: () => Promise<void>;

  /** Whether haptics are available on this platform */
  isAvailable: boolean;
}

/**
 * Hook for triggering platform-specific haptic feedback
 *
 * Only triggers on iOS and Android platforms
 * Safe no-op on web/desktop platforms
 *
 * @returns Haptic trigger functions and availability status
 *
 * @example
 * ```tsx
 * const haptics = useHapticFeedback();
 *
 * const handleButtonPress = () => {
 *   haptics.triggerLight();
 *   onPress();
 * };
 *
 * const handleToggle = () => {
 *   haptics.triggerMedium();
 *   setEnabled(!enabled);
 * };
 * ```
 */
export const useHapticFeedback = (): UseHapticFeedbackReturn => {
  // Check if haptics are available on this platform
  const isAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

  /**
   * Trigger light impact feedback
   * Suitable for button taps, picker selection
   */
  const triggerLight = useCallback(async () => {
    if (!isAvailable || !Haptics) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Silently fail if haptics not available on device
      log.app('Haptic feedback failed', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, [isAvailable]);

  /**
   * Trigger medium impact feedback
   * Suitable for toggle switches, significant actions
   */
  const triggerMedium = useCallback(async () => {
    if (!isAvailable || !Haptics) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      log.app('Haptic feedback failed', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, [isAvailable]);

  /**
   * Trigger success notification feedback
   * Suitable for successful form submission, save confirmation
   */
  const triggerSuccess = useCallback(async () => {
    if (!isAvailable || !Haptics) return;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      log.app('Haptic feedback failed', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, [isAvailable]);

  /**
   * Trigger error notification feedback
   * Suitable for validation errors, failed actions
   */
  const triggerError = useCallback(async () => {
    if (!isAvailable || !Haptics) return;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      log.app('Haptic feedback failed', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, [isAvailable]);

  return {
    triggerLight,
    triggerMedium,
    triggerSuccess,
    triggerError,
    isAvailable,
  };
};
