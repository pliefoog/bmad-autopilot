/**
 * Drag-and-Drop Haptic Feedback
 * 
 * Provides tactile feedback for drag gestures on supported devices.
 * Gracefully falls back to no-op on web platform.
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptic feedback patterns for drag-and-drop interactions
 * Only fires on native platforms (iOS/Android), no-op on web
 */
export const dragHaptics = {
  /**
   * Widget lifted - medium impact
   * Fires when long-press activates drag mode
   */
  onLift: () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  },

  /**
   * Widget dropped - light impact
   * Fires when widget is placed in new position
   */
  onDrop: () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  },

  /**
   * Page transition - success notification
   * Fires when dragging triggers page change
   */
  onPageTransition: () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  },

  /**
   * Drag cancelled - warning notification
   * Fires when user cancels drag (Escape key, etc.)
   */
  onCancel: () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  },
};
