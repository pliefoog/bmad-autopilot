/**
 * Input Focus Management Hook
 * Story 13.2.2 - Task 5.1: Focus management for input components
 *
 * Provides focus control and keyboard detection for input fields
 * Integrates with platform detection to enable keyboard features on desktop
 */

import { useRef, useCallback, useMemo } from 'react';
import { TextInput } from 'react-native';
import { hasKeyboard } from '../utils/platformDetection';

/**
 * Return type for useInputFocus hook
 */
export interface UseInputFocusReturn {
  /** Ref to attach to TextInput component */
  inputRef: React.RefObject<TextInput | null>;

  /** Programmatically focus the input */
  focus: () => void;

  /** Programmatically blur the input */
  blur: () => void;

  /** Whether keyboard input is available (desktop) */
  keyboardEnabled: boolean;
}

/**
 * Hook for managing input focus state and keyboard detection
 *
 * @returns Focus management utilities and keyboard availability
 *
 * @example
 * ```tsx
 * const { inputRef, focus, blur, keyboardEnabled } = useInputFocus();
 *
 * <TextInput
 *   ref={inputRef}
 *   onSubmitEditing={handleSubmit}
 *   // Show focus indicator on desktop only
 *   style={[styles.input, focused && keyboardEnabled && styles.focusedInput]}
 * />
 * ```
 */
export const useInputFocus = (): UseInputFocusReturn => {
  const inputRef = useRef<TextInput>(null);

  // Memoize keyboard detection (only changes on platform change)
  const keyboardEnabled = useMemo(() => hasKeyboard(), []);

  /**
   * Focus the input field
   * Safe to call even if ref is not attached
   */
  const focus = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  /**
   * Blur the input field
   * Safe to call even if ref is not attached
   */
  const blur = useCallback(() => {
    inputRef.current?.blur();
  }, []);

  return {
    inputRef,
    focus,
    blur,
    keyboardEnabled,
  };
};
