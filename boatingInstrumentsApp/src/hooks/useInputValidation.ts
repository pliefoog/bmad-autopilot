/**
 * Input Validation Hook
 * Story 13.2.2 - Task 5.3: Input validation state management
 *
 * Manages validation state, error messages, and touched tracking
 * Provides debounced validation for real-time feedback without blocking UI
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Validator function type
 * Returns error message string if invalid, undefined if valid
 */
export type ValidatorFunction = (value: string) => string | undefined;

/**
 * Return type for useInputValidation hook
 */
export interface UseInputValidationReturn {
  /** Current validation error message (undefined if valid) */
  error: string | undefined;

  /** Whether the input has been touched/interacted with */
  touched: boolean;

  /** Manually trigger validation and return whether valid */
  validate: () => boolean;

  /** Set touched state (e.g., on blur) */
  setTouched: (touched: boolean) => void;

  /** Clear error state */
  clearError: () => void;
}

/**
 * Hook for managing input validation state with touched tracking
 *
 * @param value - Current input value to validate
 * @param validator - Optional validation function
 * @returns Validation state and control functions
 *
 * @example
 * const { error, touched, validate, setTouched } = useInputValidation(
 *   ipAddress,
 *   validators.ipAddress
 * );
 *
 * // In component:
 * // <TextInput
 * //   value={ipAddress}
 * //   onChangeText={setIpAddress}
 * //   onBlur={() => setTouched(true)}
 * // />
 * // {touched && error && <Text style={styles.error}>{error}</Text>}
 */
export const useInputValidation = (
  value: string,
  validator?: ValidatorFunction,
): UseInputValidationReturn => {
  const [error, setError] = useState<string | undefined>();
  const [touched, setTouched] = useState(false);

  /**
   * Validate current value
   * Only runs if validator provided and input has been touched
   */
  useEffect(() => {
    // Don't validate untouched inputs
    if (!touched || !validator) {
      return;
    }

    // Debounce validation slightly to avoid blocking UI during typing
    const timeoutId = setTimeout(() => {
      const errorMessage = validator(value);
      setError(errorMessage);
    }, 100); // 100ms debounce

    return () => clearTimeout(timeoutId);
  }, [value, validator, touched]);

  /**
   * Manually trigger validation
   * Returns true if valid, false if invalid
   * Useful for form submission
   */
  const validate = useCallback(() => {
    setTouched(true);
    if (!validator) return true;

    const errorMessage = validator(value);
    setError(errorMessage);
    return !errorMessage;
  }, [value, validator]);

  /**
   * Clear error state
   * Useful when resetting form
   */
  const clearError = useCallback(() => {
    setError(undefined);
    setTouched(false);
  }, []);

  return {
    error,
    touched,
    validate,
    setTouched,
    clearError,
  };
};
