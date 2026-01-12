/**
 * useKeyboardShortcuts - One-Handed Maritime Operation Shortcuts
 *
 * Purpose: Register keyboard shortcuts for marine instrument operation.
 * Platform-aware: Only activates on web, requires external keyboard detection on mobile.
 * Memory safe: Properly removes event listeners on unmount.
 *
 * Maritime context: Enable one-handed operation (gloved hands, emergency situations).
 * Shortcuts: Escape (cancel), Enter (submit), Ctrl+S (save).
 *
 * Usage:
 *   useKeyboardShortcuts({
 *     onEscape: handleCancel,
 *     onEnter: handleSave,
 *     onCtrlS: handleSave
 *   });
 */

import { useEffect } from 'react';
import { Platform } from 'react-native';

interface KeyboardShortcutHandlers {
  onEscape?: () => void;
  onEnter?: () => void;
  onCtrlS?: () => void;
}

export const useKeyboardShortcuts = (handlers: KeyboardShortcutHandlers): void => {
  useEffect(() => {
    // Only register shortcuts on web
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape key - cancel/close
      if (event.key === 'Escape' && handlers.onEscape) {
        event.preventDefault();
        handlers.onEscape();
        return;
      }

      // Enter key - submit/confirm
      if (event.key === 'Enter' && handlers.onEnter) {
        event.preventDefault();
        handlers.onEnter();
        return;
      }

      // Ctrl+S or Cmd+S - save
      if ((event.ctrlKey || event.metaKey) && event.key === 's' && handlers.onCtrlS) {
        event.preventDefault();
        handlers.onCtrlS();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup: Remove event listener on unmount (critical for memory safety)
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlers.onEscape, handlers.onEnter, handlers.onCtrlS]);
};
