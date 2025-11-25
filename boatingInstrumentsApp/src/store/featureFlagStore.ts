/**
 * Feature Flag Store
 * 
 * Zustand store with AsyncStorage persistence for VIP Platform feature flags.
 * Provides reactive state management and developer menu integration.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FeatureFlags, DEFAULT_FEATURE_FLAGS } from '../config/featureFlags';

interface FeatureFlagStore extends FeatureFlags {
  // Actions
  setFeatureFlag: (flag: keyof FeatureFlags, enabled: boolean) => void;
  toggleFeatureFlag: (flag: keyof FeatureFlags) => void;
  resetToDefaults: () => void;
  enablePhase: (phase: number) => void;
  disablePhase: (phase: number) => void;
}

/**
 * Phase flag mappings for bulk enable/disable
 */
const PHASE_FLAGS: Record<number, (keyof FeatureFlags)[]> = {
  0: ['USE_FEATURE_FLAG_SYSTEM'],
  1: [
    'USE_UNIFIED_SETTINGS_MODALS',
    'USE_PLATFORM_INPUT_COMPONENTS',
    'USE_UNIFIED_CONNECTION_SETTINGS',
    'USE_UNIFIED_UNITS_ALARMS_SETTINGS',
  ],
  2: [
    'USE_NAVIGATION_SESSION_STORE',
    'USE_CONSOLIDATED_STORE_ARCHITECTURE',
    'USE_UI_DENSITY_SYSTEM',
    'USE_DASHBOARD_DENSITY_INTEGRATION',
  ],
  3: [
    'USE_PLATFORM_NAVIGATION',
    'USE_IOS_TAB_BAR_NAVIGATION',
    'USE_ANDROID_DRAWER_NAVIGATION',
    'USE_WEB_SIDEBAR_NAVIGATION',
  ],
  4: [
    'USE_BLE_PROXIMITY_DETECTION',
    'USE_MULTI_DEVICE_STATE_SYNC',
    'USE_PROXIMITY_DASHBOARD_SWITCHING',
  ],
  5: [
    'USE_TV_PLATFORM_SUPPORT',
    'USE_TV_DPAD_NAVIGATION',
    'USE_TV_10_FOOT_UI',
    'USE_TV_AMBIENT_DISPLAY',
  ],
};

/**
 * Feature Flag Store with AsyncStorage persistence
 */
export const useFeatureFlagStore = create<FeatureFlagStore>()(
  persist(
    (set, get) => ({
      // Initialize with default flags
      ...DEFAULT_FEATURE_FLAGS,

      // Set individual feature flag
      setFeatureFlag: (flag: keyof FeatureFlags, enabled: boolean) => {
        console.log(`[FeatureFlags] ${flag} = ${enabled}`);
        set({ [flag]: enabled });
      },

      // Toggle individual feature flag
      toggleFeatureFlag: (flag: keyof FeatureFlags) => {
        const currentValue = get()[flag];
        const newValue = !currentValue;
        console.log(`[FeatureFlags] ${flag}: ${currentValue} → ${newValue}`);
        set({ [flag]: newValue });
      },

      // Reset all flags to defaults
      resetToDefaults: () => {
        console.log('[FeatureFlags] Resetting to defaults');
        set(DEFAULT_FEATURE_FLAGS);
      },

      // Enable all flags for a specific phase
      enablePhase: (phase: number) => {
        const flags = PHASE_FLAGS[phase];
        if (!flags) {
          console.warn(`[FeatureFlags] Invalid phase: ${phase}`);
          return;
        }
        console.log(`[FeatureFlags] Enabling Phase ${phase}`);
        const updates = flags.reduce((acc, flag) => {
          acc[flag] = true;
          return acc;
        }, {} as Partial<FeatureFlags>);
        set(updates);
      },

      // Disable all flags for a specific phase
      disablePhase: (phase: number) => {
        const flags = PHASE_FLAGS[phase];
        if (!flags) {
          console.warn(`[FeatureFlags] Invalid phase: ${phase}`);
          return;
        }
        console.log(`[FeatureFlags] Disabling Phase ${phase}`);
        const updates = flags.reduce((acc, flag) => {
          acc[flag] = false;
          return acc;
        }, {} as Partial<FeatureFlags>);
        set(updates);
      },
    }),
    {
      name: 'bmad-feature-flags', // AsyncStorage key
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the flag values, not the action functions
      partialize: (state) => {
        const { 
          setFeatureFlag, 
          toggleFeatureFlag, 
          resetToDefaults, 
          enablePhase, 
          disablePhase,
          ...flags 
        } = state;
        return flags;
      },
    }
  )
);

/**
 * Hook to check if a specific feature is enabled
 * Usage: const isEnabled = useFeatureFlag('USE_UNIFIED_SETTINGS_MODALS');
 */
export const useFeatureFlag = (flag: keyof FeatureFlags): boolean => {
  return useFeatureFlagStore((state) => state[flag]);
};

/**
 * Get feature flag value outside React components
 * Usage: const isEnabled = getFeatureFlag('USE_UNIFIED_SETTINGS_MODALS');
 */
export const getFeatureFlag = (flag: keyof FeatureFlags): boolean => {
  return useFeatureFlagStore.getState()[flag];
};
