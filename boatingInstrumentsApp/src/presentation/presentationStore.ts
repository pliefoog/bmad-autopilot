/**
 * Presentation Settings Store
 *
 * Zustand store managing user presentation preferences.
 * Clean replacement for complex unit conversion settings.
 *
 * Stores which presentation each category should use.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DataCategory } from './categories';
import { Presentation, getDefaultPresentation, findPresentation } from './presentations';

export interface PresentationSettings {
  // Selected presentation ID for each category
  selectedPresentations: Record<DataCategory, string>;

  // User's marine region preference (affects defaults)
  marineRegion: 'eu' | 'us' | 'uk' | 'international';

  // Actions
  setPresentationForCategory: (category: DataCategory, presentationId: string) => void;
  setMarineRegion: (region: 'eu' | 'us' | 'uk' | 'international') => void;
  resetToDefaults: () => void;

  // Getters (computed from state)
  getPresentationForCategory: (category: DataCategory) => Presentation | undefined;
}

// Default presentation IDs for each category
const DEFAULT_PRESENTATION_IDS: Record<DataCategory, string> = {
  depth: 'm_1', // Meters (1 decimal)
  speed: 'kts_1', // Knots (1 decimal)
  wind: 'wind_kts_1', // Wind knots (1 decimal)
  temperature: 'c_1', // Celsius (1 decimal)
  pressure: 'bar_3', // Bar (3 decimals)
  angle: 'deg_0', // Degrees (integer)
  coordinates: 'dd_6', // Decimal degrees (6 decimals)
  voltage: 'v_2', // Volts (2 decimals)
  current: 'a_2', // Amperes (2 decimals)
  volume: 'l_0', // Liters (integer)
  time: 'h_1', // Hours (1 decimal)
  distance: 'nm_1', // Nautical miles (1 decimal)
  capacity: 'ah_0', // Amp-hours (integer)
  flowRate: 'lph_1', // Liters per hour (1 decimal)
  frequency: 'hz_1', // Hertz (1 decimal)
  power: 'kw_1', // Kilowatts (1 decimal)
  rpm: 'rpm_0', // RPM (integer)
};

// Region-specific defaults (override above for specific regions)
const REGION_DEFAULTS: Record<
  'eu' | 'us' | 'uk' | 'international',
  Partial<Record<DataCategory, string>>
> = {
  eu: {
    depth: 'm_1',
    speed: 'kts_1',
    wind: 'wind_kts_1',
    temperature: 'c_1',
    pressure: 'bar_3',
    angle: 'deg_0',
    coordinates: 'ddm_3',
    voltage: 'v_2',
    current: 'a_2',
    volume: 'l_0',
    time: 'h_1',
    distance: 'nm_1',
    capacity: 'ah_0',
    flowRate: 'lph_1',
    frequency: 'hz_1',
    power: 'kw_1',
    rpm: 'rpm_0',
  },
  us: {
    depth: 'ft_1',
    speed: 'kts_1',
    wind: 'wind_kts_1',
    temperature: 'f_1',
    pressure: 'psi_1',
    angle: 'deg_0',
    coordinates: 'ddm_3',
    voltage: 'v_2',
    current: 'a_2',
    volume: 'gal_us_1',
    time: 'h_1',
    distance: 'nm_1',
    capacity: 'ah_0',
    flowRate: 'gph_us_1',
    frequency: 'hz_1',
    power: 'hp_0',
    rpm: 'rpm_0',
  },
  uk: {
    depth: 'fth_1',
    speed: 'kts_1',
    wind: 'bf_desc',
    temperature: 'c_1',
    pressure: 'inhg_2',
    angle: 'deg_0',
    coordinates: 'dms_1',
    voltage: 'v_2',
    current: 'a_2',
    volume: 'gal_uk_1',
    time: 'h_1',
    distance: 'nm_1',
    capacity: 'ah_0',
    flowRate: 'gph_uk_1',
    frequency: 'hz_1',
    power: 'hp_0',
    rpm: 'rpm_0',
  },
  international: {
    depth: 'm_1',
    speed: 'kts_1',
    wind: 'wind_kts_1',
    temperature: 'c_1',
    pressure: 'bar_3',
    angle: 'deg_0',
    coordinates: 'dd_6',
    voltage: 'v_2',
    current: 'a_2',
    volume: 'l_0',
    time: 'h_1',
    distance: 'nm_1',
    capacity: 'ah_0',
    flowRate: 'lph_1',
    frequency: 'hz_1',
    power: 'kw_1',
    rpm: 'rpm_0',
  },
};

export const usePresentationStore = create<PresentationSettings>()(
  persist(
    (set, get) => ({
      // Initial state
      selectedPresentations: DEFAULT_PRESENTATION_IDS,
      marineRegion: 'international',

      // Actions
      setPresentationForCategory: (category: DataCategory, presentationId: string) => {
        set((state) => ({
          selectedPresentations: {
            ...state.selectedPresentations,
            [category]: presentationId,
          },
        }));
      },

      setMarineRegion: (region: 'eu' | 'us' | 'uk' | 'international') => {
        set((state) => {
          // Update region and apply region defaults
          const regionDefaults = REGION_DEFAULTS[region];
          const updatedPresentations = { ...state.selectedPresentations };

          // Apply region-specific defaults
          Object.entries(regionDefaults).forEach(([category, presentationId]) => {
            if (presentationId) {
              updatedPresentations[category as DataCategory] = presentationId;
            }
          });

          return {
            marineRegion: region,
            selectedPresentations: updatedPresentations,
          };
        });
      },

      resetToDefaults: () => {
        const { marineRegion } = get();
        const regionDefaults = REGION_DEFAULTS[marineRegion];
        const resetPresentations = { ...DEFAULT_PRESENTATION_IDS };

        // Apply current region defaults
        Object.entries(regionDefaults).forEach(([category, presentationId]) => {
          if (presentationId) {
            resetPresentations[category as DataCategory] = presentationId;
          }
        });

        set({
          selectedPresentations: resetPresentations,
        });
      },

      // Getters
      getPresentationForCategory: (category: DataCategory) => {
        const { selectedPresentations } = get();
        const presentationId = selectedPresentations[category];

        if (!presentationId) {
          // Fallback to default
          return getDefaultPresentation(category);
        }

        // Find specific presentation
        const presentation = findPresentation(category, presentationId);

        // Fallback to default if not found
        return presentation || getDefaultPresentation(category);
      },
    }),
    {
      name: 'bmad-presentation-settings',
      storage: {
        getItem: async (name: string) => {
          try {
            const value = await AsyncStorage.getItem(name);
            return value ? JSON.parse(value) : null;
          } catch (error) {
            console.warn('[PresentationStore] Failed to load settings:', error);
            return null;
          }
        },
        setItem: async (name: string, value: any) => {
          try {
            await AsyncStorage.setItem(name, JSON.stringify(value));
          } catch (error) {
            console.warn('[PresentationStore] Failed to save settings:', error);
          }
        },
        removeItem: async (name: string) => {
          try {
            await AsyncStorage.removeItem(name);
          } catch (error) {
            console.warn('[PresentationStore] Failed to remove settings:', error);
          }
        },
      },
    },
  ),
);

// ===== CONVENIENCE HOOKS =====

/**
 * Get current presentation for a specific category
 */
export function useCurrentPresentation(category: DataCategory): Presentation | undefined {
  return usePresentationStore((state) => state.getPresentationForCategory(category));
}

/**
 * Get setter for a specific category
 */
export function usePresentationSetter(category: DataCategory) {
  return usePresentationStore(
    (state) => (presentationId: string) =>
      state.setPresentationForCategory(category, presentationId),
  );
}

/**
 * Get current marine region
 */
export function useMarineRegion() {
  return usePresentationStore((state) => state.marineRegion);
}

/**
 * Get marine region setter
 */
export function useMarineRegionSetter() {
  return usePresentationStore((state) => state.setMarineRegion);
}

/**
 * Get all current presentation selections
 */
export function useAllPresentationSelections() {
  return usePresentationStore((state) => state.selectedPresentations);
}

/**
 * Get reset action
 */
export function usePresentationReset() {
  return usePresentationStore((state) => state.resetToDefaults);
}
