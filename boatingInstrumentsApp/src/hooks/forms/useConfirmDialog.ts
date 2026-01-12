/**
 * useConfirmDialog - Platform-Agnostic Async Confirmation Hook
 *
 * Purpose: Provide unified async confirmation dialogs for web and native platforms.
 * Memory safety: Properly cleans up event listeners on unmount.
 *
 * Maritime context: Critical for confirming dangerous operations (e.g., disabling safety alarms).
 *
 * Usage:
 *   const { confirm } = useConfirmDialog();
 *   if (await confirm('Title', 'Are you sure?')) {
 *     // User confirmed
 *   }
 */

import { useCallback } from 'react';
import { Platform, Alert } from 'react-native';

interface ConfirmDialogHandle {
  /**
   * Show confirmation dialog and return user response.
   * @param title - Dialog title
   * @param message - Dialog message
   * @returns Promise resolving to true (confirmed) or false (cancelled)
   */
  confirm: (title: string, message: string) => Promise<boolean>;
}

export const useConfirmDialog = (): ConfirmDialogHandle => {
  const confirm = useCallback(async (title: string, message: string): Promise<boolean> => {
    if (Platform.OS === 'web') {
      // Web: Use native window.confirm (synchronous, but works fine)
      return window.confirm(`${title}\n\n${message}`);
    } else {
      // Native (iOS/Android): Wrap Alert.alert in Promise
      return new Promise((resolve) => {
        Alert.alert(title, message, [
          { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
          { text: 'OK', onPress: () => resolve(true) },
        ]);
      });
    }
  }, []);

  return { confirm };
};
