import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Brightness from 'expo-brightness';
// Theme compliance validation moved to development-only environment

// Theme types for marine display modes
export type ThemeMode = 'day' | 'night' | 'red-night' | 'auto';

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;      // Widget headers
  surface: string;         // Widget content
  appBackground: string;   // Main dashboard background
  text: string;
  textSecondary: string;
  accent: string;
  warning: string;
  error: string;
  success: string;
  border: string;
  shadow: string;
  // Icon-specific colors for theme compliance
  iconPrimary: string;     // Primary icon color (theme-aware)
  iconSecondary: string;   // Secondary icon color (muted)
  iconAccent: string;      // Accent icon color for important elements
  iconDisabled: string;    // Disabled/inactive icon color
}

// Day theme - bright, high contrast for daylight use
const dayTheme: ThemeColors = {
  primary: '#0284C7',      // Sky blue
  secondary: '#0891B2',    // Cyan
  background: '#F8FAFC',   // Very light gray for widget headers (test expected)
  surface: '#FFFFFF',      // White for widget content
  appBackground: '#F3F4F6', // Very light gray for dashboard background
  text: '#0F172A',         // Dark slate
  textSecondary: '#475569', // Medium slate
  accent: '#059669',       // Emerald
  warning: '#D97706',      // Amber
  error: '#DC2626',        // Red
  success: '#059669',      // Green
  border: '#CBD5E1',       // Light slate
  shadow: '#00000020',     // Subtle shadow
  // Icon colors for day theme
  iconPrimary: '#0F172A',  // Dark text for visibility
  iconSecondary: '#64748B', // Medium gray for secondary icons
  iconAccent: '#0284C7',   // Primary blue for accent icons
  iconDisabled: '#CBD5E1'  // Light gray for disabled state
};

// Night theme - dark background, reduced brightness for night use
const nightTheme: ThemeColors = {
  primary: '#38BDF8',      // Light blue
  secondary: '#22D3EE',    // Cyan
  background: '#0F172A',   // Dark slate
  surface: '#1E293B',      // Darker slate
  appBackground: '#000000', // Pure black for dashboard background
  text: '#F1F5F9',         // Light text
  textSecondary: '#94A3B8', // Medium gray
  accent: '#34D399',       // Light green
  warning: '#FBBF24',      // Light amber
  error: '#F87171',        // Light red
  success: '#34D399',      // Light green
  border: '#334155',       // Dark border
  shadow: '#00000040',     // Darker shadow
  // Icon colors for night theme
  iconPrimary: '#F1F5F9',  // Light text for visibility on dark background
  iconSecondary: '#94A3B8', // Medium gray for secondary icons
  iconAccent: '#38BDF8',   // Light blue for accent icons
  iconDisabled: '#64748B'  // Dark gray for disabled state
};

// Red-night theme - red/black only for night vision preservation
const redNightTheme: ThemeColors = {
  primary: '#DC2626',      // Dark red (test expected)
  secondary: '#991B1B',    // Darker red
  background: '#000000',   // Pure black
  surface: '#1F1917',      // Very dark surface
  appBackground: '#000000', // Pure black for dashboard background
  text: '#FCA5A5',         // Light red (test expected)
  textSecondary: '#DC2626', // Dark red for secondary text
  accent: '#EF4444',       // Red accent
  warning: '#F59E0B',      // Amber warning (still visible)
  error: '#DC2626',        // Dark red error
  success: '#DC2626',      // Red success (no green for night vision)
  border: '#7F1D1D',       // Dark red border
  shadow: '#00000060',     // Black shadow
  // Icon colors for red-night theme (marine night vision compliance)
  iconPrimary: '#FCA5A5',  // Light red for primary icons
  iconSecondary: '#DC2626', // Dark red for secondary icons
  iconAccent: '#EF4444',   // Red accent for important icons
  iconDisabled: '#7F1D1D'  // Very dark red for disabled icons
};

const themes = {
  day: dayTheme,
  night: nightTheme,
  'red-night': redNightTheme
};

// Theme compliance validation disabled for runtime performance
// Validation should only be done during theme development with VALIDATE_THEMES=true

export interface ThemeStore {
  mode: ThemeMode;
  colors: ThemeColors;
  brightness: number;
  autoMode: boolean;
  nativeBrightnessControl: boolean;
  setMode: (mode: ThemeMode) => void;
  setBrightness: (brightness: number) => void;
  toggleAutoMode: () => void;
  applyAutoMode: () => void;
  toggleNativeBrightnessControl: () => void;
  applyNativeBrightness: () => void;
}

const getAutoThemeMode = (): Exclude<ThemeMode, 'auto'> => {
  try {
    // Try to get GPS position from NMEA store for solar-based calculation
    const nmeaStore = require('./nmeaStore').useNmeaStore;
    const gpsPosition = nmeaStore.getState().nmeaData.gpsPosition;
    
    if (gpsPosition && gpsPosition.lat && gpsPosition.lon) {
      // Use GPS-based solar calculation
      const { getSolarBasedThemeMode } = require('../utils/solarCalculator');
      return getSolarBasedThemeMode(gpsPosition.lat, gpsPosition.lon);
    }
  } catch (error) {
    console.warn('GPS-based theme calculation failed:', error);
  }
  
  // Fallback to time-based mode if GPS unavailable
  const hour = new Date().getHours();
  // Auto mode: day 6AM-8PM, night 8PM-6AM
  return (hour >= 6 && hour < 20) ? 'day' : 'night';
};

const getEffectiveMode = (mode: ThemeMode): Exclude<ThemeMode, 'auto'> => {
  return mode === 'auto' ? getAutoThemeMode() : mode;
};

// Native brightness control functions
const applyNativeBrightness = async (brightness: number, mode: ThemeMode) => {
  try {
    const { status } = await Brightness.requestPermissionsAsync();
    if (status === 'granted') {
      // Apply different brightness levels based on marine theme mode
      let adjustedBrightness = brightness;
      if (mode === 'night') {
        adjustedBrightness = Math.min(brightness * 0.4, 0.4); // Max 40% for night mode
      } else if (mode === 'red-night') {
        adjustedBrightness = Math.min(brightness * 0.2, 0.2); // Max 20% for red-night mode
      }
      
      await Brightness.setBrightnessAsync(adjustedBrightness);
    }
  } catch (error) {
    console.warn('Native brightness control failed:', error);
  }
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      mode: 'day',
      brightness: 1.0,
      autoMode: false,
      nativeBrightnessControl: false,
      colors: dayTheme,

      setMode: (mode: ThemeMode) => {
        const effectiveMode = getEffectiveMode(mode);
        const { nativeBrightnessControl, brightness } = get();
        
        set({
          mode,
          colors: themes[effectiveMode]
        });

        // Apply native brightness if enabled
        if (nativeBrightnessControl) {
          applyNativeBrightness(brightness, effectiveMode);
        }
      },

      setBrightness: (brightness: number) => {
        const newBrightness = Math.max(0.1, Math.min(1.0, brightness));
        const { nativeBrightnessControl, mode } = get();
        
        set({ brightness: newBrightness });

        // Apply native brightness if enabled
        if (nativeBrightnessControl) {
          const effectiveMode = getEffectiveMode(mode);
          applyNativeBrightness(newBrightness, effectiveMode);
        }
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
      },

      toggleNativeBrightnessControl: () => {
        const { nativeBrightnessControl, brightness, mode } = get();
        const newNativeBrightnessControl = !nativeBrightnessControl;
        
        set({ nativeBrightnessControl: newNativeBrightnessControl });

        // Apply current brightness if enabling native control
        if (newNativeBrightnessControl) {
          const effectiveMode = getEffectiveMode(mode);
          applyNativeBrightness(brightness, effectiveMode);
        }
      },

      applyNativeBrightness: () => {
        const { nativeBrightnessControl, brightness, mode } = get();
        if (nativeBrightnessControl) {
          const effectiveMode = getEffectiveMode(mode);
          applyNativeBrightness(brightness, effectiveMode);
        }
      }
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        mode: state.mode,
        brightness: state.brightness,
        autoMode: state.autoMode,
        nativeBrightnessControl: state.nativeBrightnessControl
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