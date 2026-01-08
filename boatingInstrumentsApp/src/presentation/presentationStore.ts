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
  marineRegion: 'eu' | 'us' | 'uk';

  // Actions
  setPresentationForCategory: (category: DataCategory, presentationId: string) => void;
  setMarineRegion: (region: 'eu' | 'us' | 'uk') => void;
  resetToDefaults: () => void;

  // Getters (computed from state)
  getPresentationForCategory: (category: DataCategory) => Presentation | undefined;
}

// Region-specific defaults (override above for specific regions)
// EXPORTED as single source of truth for preset configurations
export const REGION_DEFAULTS: Record<
  'eu' | 'us' | 'uk',
  Partial<Record<DataCategory, string>>
> = {
  eu: {
    depth: 'm_1',
    speed: 'kts_1',
    wind: 'wind_kts_1',
    temperature: 'c_1',
    atmospheric_pressure: 'hpa_1',
    mechanical_pressure: 'bar_1',
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
    angularVelocity: 'deg_per_min_0',
    percentage: 'pct_0',
  },
  us: {
    depth: 'ft_1',
    speed: 'kts_1',
    wind: 'wind_kts_1',
    temperature: 'f_1',
    atmospheric_pressure: 'inhg_2',
    mechanical_pressure: 'psi_1',
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
    angularVelocity: 'deg_per_min_0',
    percentage: 'pct_0',
  },
  uk: {
    depth: 'fth_1',
    speed: 'kts_1',
    wind: 'bf_0',
    temperature: 'c_1',
    atmospheric_pressure: 'inhg_2',
    mechanical_pressure: 'bar_1',
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
    angularVelocity: 'deg_per_min_0',
    percentage: 'pct_0',
  },
};

export const usePresentationStore = create<PresentationSettings>()(
  persist(
    (set, get) => ({
      // Initial state - use EU as default region
      selectedPresentations: REGION_DEFAULTS.eu as Record<DataCategory, string>,
      marineRegion: 'eu',

      // Actions
      setPresentationForCategory: (category: DataCategory, presentationId: string) => {
        set((state) => ({
          selectedPresentations: {
            ...state.selectedPresentations,
            [category]: presentationId,
          },
        }));
      },

      setMarineRegion: (region: 'eu' | 'us' | 'uk') => {
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
        // Start with EU as base, then apply region overrides
        const resetPresentations = { ...REGION_DEFAULTS.eu } as Record<
          DataCategory,
          string
        >;

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
            if (value) {
              const parsed = JSON.parse(value);
              // Migration: Convert old 'international' region to 'eu'
              if (parsed.state?.marineRegion === 'international') {
                parsed.state.marineRegion = 'eu';
                console.log('[PresentationStore] Migrated international region to eu');
              }
              return parsed;
            }
            return null;
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

// ===== REGION METADATA =====

export type MarineRegion = 'eu' | 'us' | 'uk';

export interface RegionMetadata {
  id: MarineRegion;
  name: string;
  description: string;
}

/**
 * Get metadata for all available regions/presets
 */
export function getRegionMetadata(): RegionMetadata[] {
  return [
    {
      id: 'eu',
      name: 'EU',
      description: 'European sailing standard',
    },
    {
      id: 'uk',
      name: 'UK',
      description: 'British sailing standard',
    },
    {
      id: 'us',
      name: 'USA',
      description: 'US sailing standard',
    },
  ];
}

// ===== VALIDATION =====

/**
 * Validate that REGION_DEFAULTS contains all required DataCategory entries
 *
 * Called on startup in dev mode to catch configuration gaps.
 * Returns array of issues found, empty array if valid.
 *
 * @returns Array of validation error messages
 */
export function validateRegionDefaults(): string[] {
  const issues: string[] = [];
  const regions: MarineRegion[] = ['eu', 'us', 'uk'];

  // All DataCategories that should have regional defaults
  const requiredCategories: DataCategory[] = [
    'depth',
    'speed',
    'wind',
    'temperature',
    'atmospheric_pressure',
    'mechanical_pressure',
    'angle',
    'coordinates',
    'voltage',
    'current',
    'volume',
    'time',
    'distance',
    'capacity',
    'flowRate',
    'frequency', // Future-proofed
    'power',
    'rpm',
    'angularVelocity',
    'percentage',
  ];

  for (const region of regions) {
    const regionDefaults = REGION_DEFAULTS[region];
    for (const category of requiredCategories) {
      if (!regionDefaults[category]) {
        issues.push(`❌ Missing '${category}' in '${region}' preset`);
      }
    }
  }

  // Check for unknown categories (typos in REGION_DEFAULTS)
  for (const region of regions) {
    const regionDefaults = REGION_DEFAULTS[region];
    for (const key in regionDefaults) {
      if (!requiredCategories.includes(key as DataCategory)) {
        issues.push(`⚠️ Unknown category '${key}' in '${region}' preset (typo?)`);
      }
    }
  }

  return issues;
}

/**
 * Validate configuration and log issues (dev mode only)
 * Call this on app startup to catch configuration problems early.
 */
export function validateAndLogConfiguration(): void {
  if (__DEV__) {
    const issues = validateRegionDefaults();
    if (issues.length > 0) {
      console.warn('⚠️ PresentationStore Configuration Issues:');
      issues.forEach((issue) => console.warn('  ' + issue));
    }
    // else {
    //   console.log('✅ PresentationStore: All regional presets validated successfully');
    // }
  }
}
