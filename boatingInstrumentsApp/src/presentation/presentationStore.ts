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
  depth: 'm_1',          // Meters (1 decimal)
  speed: 'kts_1',        // Knots (1 decimal) 
  wind: 'kts_1',         // Knots (1 decimal)
  temperature: 'c_1',    // Celsius (1 decimal)
  pressure: '',          // TODO: Will add when implementing pressure presentations
  angle: '',             // TODO: Will add when implementing angle presentations
  coordinates: '',       // TODO: Will add when implementing coordinate presentations
  voltage: '',           // TODO: Will add when implementing voltage presentations
  current: '',           // TODO: Will add when implementing current presentations
  volume: '',            // TODO: Will add when implementing volume presentations
  time: '',              // TODO: Will add when implementing time presentations
  distance: ''           // TODO: Will add when implementing distance presentations
};

// Region-specific defaults (override above for specific regions)
const REGION_DEFAULTS: Record<'eu' | 'us' | 'uk' | 'international', Partial<Record<DataCategory, string>>> = {
  eu: {
    depth: 'm_1',
    speed: 'kts_1',
    wind: 'kts_1', 
    temperature: 'c_1'
  },
  us: {
    depth: 'ft_0',
    speed: 'kts_1',
    wind: 'kts_1',
    temperature: 'f_1'
  },
  uk: {
    depth: 'fth_1',
    speed: 'kts_1', 
    wind: 'bf_desc',
    temperature: 'c_1'
  },
  international: {
    depth: 'm_1',
    speed: 'kts_1',
    wind: 'kts_1',
    temperature: 'c_1'
  }
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
            [category]: presentationId
          }
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
            selectedPresentations: updatedPresentations
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
          selectedPresentations: resetPresentations
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
      }
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
        }
      }
    }
  )
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
  return usePresentationStore((state) => 
    (presentationId: string) => state.setPresentationForCategory(category, presentationId)
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
