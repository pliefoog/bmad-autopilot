import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme types for marine display modes
export type ThemeMode = 'day' | 'night' | 'red-night' | 'auto';

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  accent: string;
  warning: string;
  error: string;
  success: string;
  border: string;
  shadow: string;
}

// Day theme - bright, high contrast for daylight use
const dayTheme: ThemeColors = {
  primary: '#0284C7',      // Sky blue
  secondary: '#0891B2',    // Cyan
  background: '#F8FAFC',   // Light gray
  surface: '#FFFFFF',      // White
  text: '#0F172A',         // Dark slate
  textSecondary: '#475569', // Medium slate
  accent: '#059669',       // Emerald
  warning: '#D97706',      // Amber
  error: '#DC2626',        // Red
  success: '#059669',      // Green
  border: '#CBD5E1',       // Light slate
  shadow: '#00000020'      // Subtle shadow
};

// Night theme - dark background, reduced brightness for night use
const nightTheme: ThemeColors = {
  primary: '#38BDF8',      // Light blue
  secondary: '#22D3EE',    // Cyan
  background: '#0F172A',   // Dark slate
  surface: '#1E293B',      // Darker slate
  text: '#F1F5F9',         // Light text
  textSecondary: '#94A3B8', // Medium gray
  accent: '#34D399',       // Light green
  warning: '#FBBF24',      // Light amber
  error: '#F87171',        // Light red
  success: '#34D399',      // Light green
  border: '#334155',       // Dark border
  shadow: '#00000040'      // Darker shadow
};

// Red-night theme - red/black only for night vision preservation
const redNightTheme: ThemeColors = {
  primary: '#DC2626',      // Red
  secondary: '#B91C1C',    // Dark red
  background: '#000000',   // Pure black
  surface: '#1F1F1F',      // Very dark gray
  text: '#FCA5A5',         // Light red
  textSecondary: '#EF4444', // Medium red
  accent: '#F87171',       // Light red accent
  warning: '#DC2626',      // Red warning
  error: '#B91C1C',        // Dark red error
  success: '#DC2626',      // Red success (no green)
  border: '#404040',       // Dark gray border
  shadow: '#00000060'      // Black shadow
};

const themes = {
  day: dayTheme,
  night: nightTheme,
  'red-night': redNightTheme
};

export interface ThemeStore {
  mode: ThemeMode;
  colors: ThemeColors;
  brightness: number;
  autoMode: boolean;
  setMode: (mode: ThemeMode) => void;
  setBrightness: (brightness: number) => void;
  toggleAutoMode: () => void;
  applyAutoMode: () => void;
}

const getAutoThemeMode = (): Exclude<ThemeMode, 'auto'> => {
  const hour = new Date().getHours();
  // Auto mode: day 6AM-8PM, night 8PM-6AM
  return (hour >= 6 && hour < 20) ? 'day' : 'night';
};

const getEffectiveMode = (mode: ThemeMode): Exclude<ThemeMode, 'auto'> => {
  return mode === 'auto' ? getAutoThemeMode() : mode;
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      mode: 'day',
      brightness: 1.0,
      autoMode: false,
      colors: dayTheme,

      setMode: (mode: ThemeMode) => {
        const effectiveMode = getEffectiveMode(mode);
        set({
          mode,
          colors: themes[effectiveMode]
        });
      },

      setBrightness: (brightness: number) => {
        set({ brightness: Math.max(0.1, Math.min(1.0, brightness)) });
      },

      toggleAutoMode: () => {
        const { autoMode, setMode } = get();
        const newAutoMode = !autoMode;
        set({ autoMode: newAutoMode });
        if (newAutoMode) {
          setMode('auto');
        }
      },

      applyAutoMode: () => {
        const { mode, setMode } = get();
        if (mode === 'auto') {
          setMode('auto'); // Trigger recalculation
        }
      }
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        mode: state.mode,
        brightness: state.brightness,
        autoMode: state.autoMode
      })
    }
  )
);

// Hook for getting current theme colors
export const useTheme = () => {
  const { colors, brightness } = useThemeStore();
  
  // Apply brightness to colors (mainly affects backgrounds and surfaces)
  const adjustedColors = {
    ...colors,
    background: adjustBrightness(colors.background, brightness),
    surface: adjustBrightness(colors.surface, brightness)
  };
  
  return adjustedColors;
};

// Utility to adjust color brightness
const adjustBrightness = (color: string, factor: number): string => {
  // Simple brightness adjustment - in production might use more sophisticated color manipulation
  if (factor === 1.0) return color;
  
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const newR = Math.round(r * factor);
  const newG = Math.round(g * factor);
  const newB = Math.round(b * factor);
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};