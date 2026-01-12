/**
 * useFormState Hook
 *
 * Consolidates multiple useState hooks into single form state manager with:
 * - Debounced auto-save (300ms default)
 * - Immediate save on explicit saveNow() call (for onBlur, onClose, onTabChange)
 * - Dirty tracking (compare current vs initial)
 * - Zod schema validation with error messages
 * - isSaving state for loading indicators
 *
 * @example
 * ```typescript
 * const { formData, updateField, errors, saveNow } = useFormState<MyFormData>(
 *   initialData,
 *   {
 *     validationSchema: MyFormDataSchema,
 *     debounceMs: 300,
 *     onSave: async (data) => {
 *       await saveSensorConfig(data);
 *       await saveToAsyncStorage(data);
 *     }
 *   }
 * );
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { z } from 'zod';

/**
 * Options for useFormState hook
 */
export interface UseFormStateOptions<T> {
  /** Callback to save form data (called on debounce or explicit save) */
  onSave?: (data: T) => Promise<void> | void;

  /** Debounce delay in milliseconds (default: 300ms) */
  debounceMs?: number;

  /** Zod schema for validation */
  validationSchema?: z.ZodSchema<T>;

  /** Callback when validation fails */
  onValidationError?: (errors: Partial<Record<keyof T, string>>) => void;

  /** Callback when save succeeds */
  onSaveSuccess?: () => void;

  /** Callback when save fails */
  onSaveError?: (error: Error) => void;
}

/**
 * Return type for useFormState hook
 */
export interface UseFormStateReturn<T> {
  /** Current form data */
  formData: T;

  /** Update a single field (triggers debounced save) */
  updateField: <K extends keyof T>(field: K, value: T[K]) => void;

  /** Update multiple fields at once */
  updateFields: (updates: Partial<T>) => void;

  /** Reset form to initial or provided data */
  reset: (data?: T) => void;

  /** Check if form has unsaved changes */
  isDirty: boolean;

  /** Validation errors by field */
  errors: Partial<Record<keyof T, string>>;

  /** Validate current form data */
  validate: () => boolean;

  /** Save immediately (bypasses debounce) */
  saveNow: () => Promise<void>;

  /** Indicates save operation in progress */
  isSaving: boolean;

  /** Clear all validation errors */
  clearErrors: () => void;
}

/**
 * useFormState Hook
 *
 * Manages form state with debounced auto-save, validation, and dirty tracking.
 *
 * @template T - Form data type (must be a plain object with serializable values)
 * @param initialData - Initial form values (becomes baseline for dirty tracking)
 * @param options - Configuration options for save, validation, and callbacks
 * @returns Form state manager with update functions and validation
 *
 * **Limitations:**
 * - Only works with plain objects (no circular references, functions, or complex classes)
 * - Debouncing uses setTimeout - rapid saves may be batched
 * - isDirty uses JSON.stringify for comparison (objects must be serializable)
 * - Validation runs synchronously - async validation not supported
 *
 * **Usage Notes:**
 * - updateField() triggers debounced save (default 300ms)
 * - saveNow() bypasses debounce for immediate persistence (use on blur/close)
 * - Validation errors are cleared automatically when user edits field
 * - All save operations await onSave completion before updating isSaving
 */
export function useFormState<T extends Record<string, any>>(
  initialData: T,
  options?: UseFormStateOptions<T>,
): UseFormStateReturn<T> {
  const {
    onSave,
    debounceMs = 300,
    validationSchema,
    onValidationError,
    onSaveSuccess,
    onSaveError,
  } = options || {};

  // Form data state
  const [formData, setFormData] = useState<T>(initialData);

  // Validation errors state
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  // Save operation state
  const [isSaving, setIsSaving] = useState(false);

  // Store initial data for dirty tracking
  const initialDataRef = useRef<T>(initialData);

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if form is dirty (has unsaved changes)
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialDataRef.current);

  /**
   * Validate form data against schema
   */
  const validate = useCallback((): boolean => {
    if (!validationSchema) return true;

    try {
      validationSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof T, string>> = {};
        error.issues.forEach((err) => {
          const field = err.path[0] as keyof T;
          if (field) {
            fieldErrors[field] = err.message;
          }
        });
        setErrors(fieldErrors);
        onValidationError?.(fieldErrors);
      }
      return false;
    }
  }, [formData, validationSchema, onValidationError]);

  /**
   * Clear all validation errors
   */
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Save immediately (bypasses debounce)
   */
  const saveNow = useCallback(async (): Promise<void> => {
    // Clear any pending debounced save
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Validate before saving
    if (validationSchema && !validate()) {
      return;
    }

    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave(formData);
      // Update initial data reference after successful save
      initialDataRef.current = formData;
      onSaveSuccess?.();
    } catch (error) {
      console.error('[useFormState] Save error:', error);
      onSaveError?.(error as Error);
    } finally {
      setIsSaving(false);
    }
  }, [formData, onSave, validate, validationSchema, onSaveSuccess, onSaveError]);

  /**
   * Update a single field (triggers debounced save)
   */
  const updateField = useCallback(
    <K extends keyof T>(field: K, value: T[K]): void => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Clear error for this field when user makes changes
      // Use functional update to avoid depending on errors state
      setErrors((prev) => {
        if (!prev[field]) return prev; // No error to clear, return same object
        const next = { ...prev };
        delete next[field];
        return next;
      });

      // Debounced save
      if (onSave) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          saveNow();
        }, debounceMs);
      }
    },
    [onSave, debounceMs, saveNow],
  );

  /**
   * Update multiple fields at once
   */
  const updateFields = useCallback(
    (updates: Partial<T>): void => {
      setFormData((prev) => ({ ...prev, ...updates }));

      // Clear errors for updated fields
      const updatedFields = Object.keys(updates) as (keyof T)[];
      setErrors((prev) => {
        const next = { ...prev };
        updatedFields.forEach((field) => {
          delete next[field];
        });
        return next;
      });

      // Debounced save
      if (onSave) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          saveNow();
        }, debounceMs);
      }
    },
    [onSave, debounceMs, saveNow],
  );

  /**
   * Reset form to initial or provided data
   */
  const reset = useCallback((data?: T): void => {
    const resetData = data || initialDataRef.current;
    setFormData(resetData);
    setErrors({});
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    formData,
    updateField,
    updateFields,
    reset,
    isDirty,
    errors,
    validate,
    saveNow,
    isSaving,
    clearErrors,
  };
}
