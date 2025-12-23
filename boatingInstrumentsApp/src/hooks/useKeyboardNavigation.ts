/**
 * React Hooks for Keyboard Navigation
 * Story 4.4 AC14: Desktop keyboard navigation integration
 */

import { useEffect, useRef } from 'react';
import {
  keyboardNavigationService,
  NavigableElement,
  GlobalShortcut,
} from '../services/navigation/KeyboardNavigationService';

/**
 * Hook to register an element for keyboard navigation
 */
export function useNavigableElement(
  id: string,
  type: NavigableElement['type'],
  options: {
    onFocus?: () => void;
    onActivate?: () => void;
    priority?: number;
    enabled?: boolean;
  } = {},
) {
  const focusRef = useRef<any>(null);
  const { onFocus, onActivate, priority, enabled = true } = options;

  useEffect(() => {
    if (!enabled || !keyboardNavigationService.isSupported()) {
      return;
    }

    const element: NavigableElement = {
      id,
      type,
      focusRef,
      onFocus,
      onActivate,
      priority,
    };

    keyboardNavigationService.registerElement(element);

    return () => {
      keyboardNavigationService.unregisterElement(id);
    };
  }, [id, type, onFocus, onActivate, priority, enabled]);

  return {
    focusRef,
    isFocused: keyboardNavigationService.getCurrentFocus() === id,
    focus: () => keyboardNavigationService.focusElement(id),
  };
}

/**
 * Hook to register global keyboard shortcuts
 */
export function useKeyboardShortcut(shortcuts: GlobalShortcut[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled || !keyboardNavigationService.isSupported()) {
      return;
    }

    // Register all shortcuts
    shortcuts.forEach((shortcut) => {
      keyboardNavigationService.registerShortcut(shortcut);
    });

    return () => {
      // Unregister all shortcuts
      shortcuts.forEach((shortcut) => {
        const key = [
          shortcut.ctrlKey && 'Ctrl',
          shortcut.shiftKey && 'Shift',
          shortcut.metaKey && 'Meta',
          shortcut.key,
        ]
          .filter(Boolean)
          .join('+');
        keyboardNavigationService.unregisterShortcut(key);
      });
    };
  }, [shortcuts, enabled]);
}

/**
 * Hook to manage focus lock (for modals)
 */
export function useFocusLock(elementIds: string[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled || !keyboardNavigationService.isSupported()) {
      return;
    }

    keyboardNavigationService.lockFocus(elementIds);

    return () => {
      keyboardNavigationService.unlockFocus();
    };
  }, [elementIds, enabled]);
}

/**
 * Hook to initialize keyboard navigation in App
 */
export function useKeyboardNavigation() {
  useEffect(() => {
    if (!keyboardNavigationService.isSupported()) {
      return;
    }

    keyboardNavigationService.initialize();

    return () => {
      keyboardNavigationService.cleanup();
    };
  }, []);

  return {
    isSupported: keyboardNavigationService.isSupported(),
    focusNext: () => keyboardNavigationService.focusNext(),
    focusPrevious: () => keyboardNavigationService.focusPrevious(),
    getCurrentFocus: () => keyboardNavigationService.getCurrentFocus(),
  };
}
