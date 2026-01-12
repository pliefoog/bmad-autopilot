/**
 * Form Utilities Barrel Export
 *
 * Centralized export for all form-related hooks:
 * - useConfirmDialog: Platform-agnostic async confirmations
 * - useClamped: Declarative value clamping with memoization
 * - useKeyboardShortcuts: One-handed operation shortcuts (Escape, Enter, Ctrl+S)
 * - useFormPersistence: Save-on-transition pattern
 *
 * Import: `import { useConfirmDialog, useClamped } from '@/hooks/forms'`
 */

export { useConfirmDialog } from './useConfirmDialog';
export { useClamped } from './useClamped';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export { useFormPersistence } from './useFormPersistence';
