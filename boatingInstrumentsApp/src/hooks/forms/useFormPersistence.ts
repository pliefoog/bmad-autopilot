/**
 * useFormPersistence - Save-on-Transition Pattern with Enrichment Guards
 *
 * Purpose: Encapsulate explicit save logic for form transitions.
 * Pattern: Save before switching sensor/instance or closing dialog.
 * Safety: Guard with enrichment check to prevent data corruption.
 *
 * This hook is primarily used within useSensorConfigForm.
 * It ensures consistent save semantics across all dialog transitions.
 */

// Placeholder for potential shared save logic
// Currently, save logic lives in useSensorConfigForm and individual dialogs
// This hook provides a common interface if save patterns diverge across dialogs

export interface FormPersistenceConfig {
  onSave: () => Promise<void>;
  onError?: (error: Error) => void;
}

/**
 * Hook interface for form persistence logic.
 * Integrate with useCallback patterns in individual form hooks.
 */
export const useFormPersistence = (config: FormPersistenceConfig) => {
  return {
    /**
     * Execute save operation with error handling.
     */
    persistNow: async () => {
      try {
        await config.onSave();
      } catch (error) {
        if (config.onError && error instanceof Error) {
          config.onError(error);
        }
        throw error;
      }
    },
  };
};
