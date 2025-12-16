import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import * as Brightness from 'expo-brightness';
// Theme compliance validation moved to development-only environment

// Conditional AsyncStorage import with web fallback
let AsyncStorage: any;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  // Fallback storage for web/development when native module not available
  AsyncStorage = {
    getItem: async (key: string) => localStorage.getItem(key),
    setItem: async (key: string, value: string) => localStorage.setItem(key, value),
    removeItem: async (key: string) => localStorage.removeItem(key),
  };
}

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
  textTertiary: string;    // Muted/disabled text
  textInverse: string;     // Text on colored backgrounds (e.g., selected tabs)
  accent: string;
  warning: string;
  warningLight: string;    // Light warning background (15% opacity)
  error: string;
  errorLight: string;      // Light error background (15% opacity)
  success: string;
  successLight: string;    // Light success background (15% opacity)
  border: string;
  borderLight: string;     // Lighter border variant
  borderDark: string;      // Darker border variant
  shadow: string;
  shadowDark: string;      // Darker shadow variant
  // Background variants
  surfaceHighlight: string; // Highlighted surface (hover/selected)
  surfaceDim: string;      // Dimmed surface (inactive)
  surfaceElevated: string; // Elevated surface (modals, dropdowns, cards)
  inputBackground: string; // Input field backgrounds
  overlay: string;         // Modal/dialog overlay
  overlayDark: string;     // Darker overlay variant
  // Icon-specific colors for theme compliance
  iconPrimary: string;     // Primary icon color (theme-aware)
  iconSecondary: string;   // Secondary icon color (muted)
  iconAccent: string;      // Accent icon color for important elements
  iconDisabled: string;    // Disabled/inactive icon color
  // Trendline colors (nested for better organization)
  trendline: {
    primary: string;        // Primary trendline color (solid)
    secondary: string;      // Secondary trendline color (can be dashed)
    thresholdMin: string;   // Minimum threshold line color
    thresholdWarning: string; // Warning threshold line color
    thresholdMax: string;   // Maximum threshold line color
    axis: string;           // Axis line color
    grid: string;           // Grid line color
    label: string;          // Label text color
  };
  // Interactive states
  interactive: string;     // Interactive elements (buttons, links)
  interactiveHover: string; // Hover state
  interactiveActive: string; // Active/pressed state
  interactiveDisabled: string; // Disabled state
  // Toggle/Switch specific colors
  toggle: {
    trackOn: string;         // Track color when toggle is ON (enabled)
    trackOff: string;        // Track color when toggle is OFF (enabled)
    trackOnDisabled: string; // Track color when toggle is ON (disabled)
    trackOffDisabled: string; // Track color when toggle is OFF (disabled)
    thumb: string;           // Thumb color (enabled)
    thumbDisabled: string;   // Thumb color (disabled)
  };
}

// Day theme - bright, high contrast for daylight use
const dayTheme: ThemeColors = {
  primary: '#0284C7',      // Sky blue
  secondary: '#0891B2',    // Cyan
  background: '#F8FAFC',   // Very light gray for widget headers (test expected)
  surface: '#FFFFFF',      // White for widget content
  appBackground: '#FFFFFF', // Pure white for maximum daylight brightness
  text: '#0F172A',         // Dark slate
  textSecondary: '#475569', // Medium slate
  textTertiary: '#94A3B8', // Muted gray
  textInverse: '#FFFFFF',  // White text for colored backgrounds
  accent: '#059669',       // Emerald
  warning: '#D97706',      // Amber
  warningLight: 'rgba(217, 119, 6, 0.15)', // Light amber background
  error: '#DC2626',        // Red
  errorLight: 'rgba(220, 38, 38, 0.15)', // Light red background
  success: '#059669',      // Green
  successLight: 'rgba(5, 150, 105, 0.15)', // Light green background
  border: '#CBD5E1',       // Light slate
  borderLight: '#E2E8F0',  // Very light border
  borderDark: '#94A3B8',   // Darker border
  shadow: '#00000020',     // Subtle shadow
  shadowDark: '#00000040', // Darker shadow
  surfaceHighlight: '#F1F5F9', // Highlighted surface
  surfaceDim: '#F8FAFC',   // Dimmed surface
  surfaceElevated: '#FFFFFF', // Elevated surface (same as surface for day)
  inputBackground: '#FFFFFF', // White input backgrounds
  overlay: 'rgba(0, 0, 0, 0.3)', // Modal overlay
  overlayDark: 'rgba(0, 0, 0, 0.6)', // Darker overlay
  // Icon colors for day theme
  iconPrimary: '#0F172A',  // Dark text for visibility
  iconSecondary: '#64748B', // Medium gray for secondary icons
  iconAccent: '#0284C7',   // Primary blue for accent icons
  iconDisabled: '#CBD5E1', // Light gray for disabled state
  // Trendline colors for day theme
  trendline: {
    primary: '#0284C7',      // Sky blue for primary trendlines
    secondary: '#64748B',    // Medium gray for secondary trendlines
    thresholdMin: '#DC2626',     // Red for minimum thresholds
    thresholdWarning: '#D97706', // Amber for warning thresholds
    thresholdMax: '#059669',     // Green for maximum thresholds
    axis: '#CBD5E1',         // Light slate for axis lines
    grid: '#E2E8F0',         // Very light gray for grid lines
    label: '#64748B',        // Medium gray for labels
  },
  // Interactive states
  interactive: '#0284C7',  // Primary blue
  interactiveHover: '#0369A1', // Darker blue
  interactiveActive: '#075985', // Even darker blue
  interactiveDisabled: '#E2E8F0', // Light gray
  // Toggle/Switch colors for day theme
  toggle: {
    trackOn: '#0284C7',      // Sky blue when ON
    trackOff: '#CBD5E1',     // Light slate when OFF
    trackOnDisabled: '#E2E8F0',  // Very light gray when ON+disabled
    trackOffDisabled: '#F1F5F9', // Almost white when OFF+disabled
    thumb: '#FFFFFF',        // White thumb
    thumbDisabled: '#94A3B8', // Medium gray thumb when disabled
  },
};

// Night theme - dark background, reduced brightness for night use
// Marine-compliant: Uses neutral grays to avoid night vision disruption
const nightTheme: ThemeColors = {
  primary: '#CBD5E1',      // Light neutral gray (primary elements)
  secondary: '#94A3B8',    // Medium gray (secondary elements)
  background: '#0F172A',   // Dark slate
  surface: '#1E293B',      // Darker slate
  appBackground: '#000000', // Pure black for dashboard background
  text: '#F1F5F9',         // Light text
  textSecondary: '#94A3B8', // Medium gray
  textTertiary: '#64748B', // Muted gray
  textInverse: '#0F172A',  // Dark text for light backgrounds
  accent: '#94A3B8',       // Medium gray accent (neutral, no color disruption)
  warning: '#FBBF24',      // Light amber (semantic color kept)
  warningLight: 'rgba(251, 191, 36, 0.15)', // Light amber background
  error: '#F87171',        // Light red (semantic color kept)
  errorLight: 'rgba(248, 113, 113, 0.15)', // Light red background
  success: '#94A3B8',      // Medium gray (neutral instead of cyan)
  successLight: 'rgba(148, 163, 184, 0.15)', // Light gray background
  border: '#334155',       // Dark border
  borderLight: '#475569',  // Lighter border
  borderDark: '#1E293B',   // Darker border
  shadow: '#00000040',     // Darker shadow
  shadowDark: '#00000060', // Even darker shadow
  surfaceHighlight: '#334155', // Highlighted surface
  surfaceDim: '#0F172A',   // Dimmed surface
  surfaceElevated: '#334155', // Elevated surface (lighter than base surface)
  inputBackground: '#1E293B', // Same as surface for consistency
  overlay: 'rgba(0, 0, 0, 0.5)', // Modal overlay
  overlayDark: 'rgba(0, 0, 0, 0.8)', // Darker overlay
  // Icon colors for night theme
  iconPrimary: '#F1F5F9',  // Light text for visibility on dark background
  iconSecondary: '#94A3B8', // Medium gray for secondary icons
  iconAccent: '#CBD5E1',   // Light gray for accent icons (neutral)
  iconDisabled: '#64748B', // Dark gray for disabled state
  // Trendline colors for night theme
  trendline: {
    primary: '#CBD5E1',      // Light neutral gray for primary trendlines
    secondary: '#94A3B8',    // Medium gray for secondary trendlines
    thresholdMin: '#F87171',     // Light red for minimum thresholds (semantic)
    thresholdWarning: '#FBBF24', // Light amber for warning thresholds (semantic)
    thresholdMax: '#94A3B8',     // Medium gray for maximum thresholds (neutral)
    axis: '#475569',         // Lighter border for axis lines
    grid: '#334155',         // Dark border for grid lines
    label: '#94A3B8',        // Medium gray for labels
  },
  // Interactive states
  interactive: '#94A3B8',  // Medium gray (neutral)
  interactiveHover: '#CBD5E1', // Light gray on hover
  interactiveActive: '#64748B', // Darker gray when active
  interactiveDisabled: '#334155', // Dark gray for disabled
  // Toggle/Switch colors for night theme (marine-compliant neutral grays)
  toggle: {
    trackOn: '#64748B',      // Medium gray when ON (neutral, visible)
    trackOff: '#334155',     // Dark gray when OFF
    trackOnDisabled: '#475569',  // Lighter gray when ON+disabled (visible but muted)
    trackOffDisabled: '#475569', // Same gray when OFF+disabled (visible but muted)
    thumb: '#CBD5E1',        // Light neutral gray thumb (high contrast)
    thumbDisabled: '#94A3B8', // Medium gray thumb when disabled (visible)
  },
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
  textTertiary: '#991B1B', // Very dark red
  textInverse: '#000000',  // Black text for red backgrounds (better contrast)
  accent: '#EF4444',       // Red accent
  warning: '#DC2626',      // Red warning (red spectrum for night vision, same as error)
  warningLight: 'rgba(220, 38, 38, 0.15)', // Light red background
  error: '#DC2626',        // Dark red error
  errorLight: 'rgba(220, 38, 38, 0.15)', // Light red background
  success: '#DC2626',      // Red success (no green for night vision)
  successLight: 'rgba(220, 38, 38, 0.15)', // Light red background
  border: '#7F1D1D',       // Dark red border
  borderLight: '#991B1B',  // Lighter red border
  borderDark: '#450A0A',   // Darker red border
  shadow: '#00000060',     // Black shadow
  shadowDark: '#00000080', // Darker black shadow
  surfaceHighlight: '#450A0A', // Highlighted surface
  surfaceDim: '#000000',   // Dimmed surface (pure black)
  surfaceElevated: '#450A0A', // Elevated surface (same as highlight)
  inputBackground: '#1F1917', // Same as surface for consistency
  overlay: 'rgba(0, 0, 0, 0.7)', // Modal overlay
  overlayDark: 'rgba(0, 0, 0, 0.9)', // Darker overlay
  // Icon colors for red-night theme (marine night vision compliance)
  iconPrimary: '#FCA5A5',  // Light red for primary icons
  iconSecondary: '#DC2626', // Dark red for secondary icons
  iconAccent: '#EF4444',   // Red accent for important icons
  iconDisabled: '#7F1D1D', // Very dark red for disabled icons
  // Trendline colors for red-night theme
  trendline: {
    primary: '#FCA5A5',      // Light red for primary trendlines
    secondary: '#DC2626',    // Dark red for secondary trendlines
    thresholdMin: '#EF4444',     // Red for minimum thresholds
    thresholdWarning: '#DC2626', // Dark red for warning thresholds
    thresholdMax: '#991B1B',     // Darker red for maximum thresholds
    axis: '#991B1B',         // Lighter red border for axis lines
    grid: '#7F1D1D',         // Dark red border for grid lines
    label: '#DC2626',        // Dark red for labels
  },
  // Interactive states
  interactive: '#EF4444',  // Red accent
  interactiveHover: '#DC2626', // Dark red
  interactiveActive: '#991B1B', // Darker red
  interactiveDisabled: '#450A0A', // Very dark red
  // Toggle/Switch colors for red-night theme
  toggle: {
    trackOn: '#DC2626',      // Dark red when ON
    trackOff: '#7F1D1D',     // Very dark red when OFF
    trackOnDisabled: '#991B1B',  // Medium red when ON+disabled
    trackOffDisabled: '#450A0A', // Almost black when OFF+disabled
    thumb: '#000000',        // Black thumb (best contrast)
    thumbDisabled: '#7F1D1D', // Dark red thumb when disabled
  },
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
    
    if (gpsPosition && gpsPosition.latitude && gpsPosition.longitude) {
      // Use GPS-based solar calculation
      const { getSolarBasedThemeMode } = require('../utils/solarCalculator');
      return getSolarBasedThemeMode(gpsPosition.latitude, gpsPosition.longitude);
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
  // Skip brightness control on web (expo-brightness not available)
  if (Platform.OS === 'web') {
    return;
  }
  
  try {
    const { status } = await Brightness.requestPermissionsAsync();
    if (status === 'granted') {
      // Apply different brightness levels based on marine theme mode
      let adjustedBrightness = brightness;
      if (mode === 'night') {
        adjustedBrightness = Math.min(brightness * 0.4, 0.4); // Max 40% for night mode
      } else if (mode === 'red-night') {
        adjustedBrightness = Math.min(brightness * 0.05, 0.05); // Max 5% for red-night mode (IMO SOLAS compliance)
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
      }),
      onRehydrateStorage: (state) => {
        // After rehydration completes, re-apply the theme to trigger color updates
        return (rehydratedState, error) => {
          if (!error && rehydratedState) {
            // Use a microtask to ensure store is fully initialized
            Promise.resolve().then(() => {
              // Calling setMode will properly update colors and notify all subscribers
              rehydratedState.setMode(rehydratedState.mode);
            });
          }
        };
      }
    }
  )
);

// Hook for getting current theme colors
export const useTheme = () => {
  const { colors, brightness } = useThemeStore();
  
  // Apply brightness to all colors for comprehensive brightness control
  const adjustedColors: ThemeColors = {
    ...colors,
    primary: adjustBrightness(colors.primary, brightness),
    secondary: adjustBrightness(colors.secondary, brightness),
    background: adjustBrightness(colors.background, brightness),
    surface: adjustBrightness(colors.surface, brightness),
    appBackground: adjustBrightness(colors.appBackground, brightness),
    text: adjustBrightness(colors.text, brightness),
    textSecondary: adjustBrightness(colors.textSecondary, brightness),
    textTertiary: adjustBrightness(colors.textTertiary, brightness),
    textInverse: adjustBrightness(colors.textInverse, brightness),
    accent: adjustBrightness(colors.accent, brightness),
    warning: adjustBrightness(colors.warning, brightness),
    warningLight: adjustBrightness(colors.warningLight, brightness),
    error: adjustBrightness(colors.error, brightness),
    errorLight: adjustBrightness(colors.errorLight, brightness),
    success: adjustBrightness(colors.success, brightness),
    successLight: adjustBrightness(colors.successLight, brightness),
    border: adjustBrightness(colors.border, brightness),
    borderLight: adjustBrightness(colors.borderLight, brightness),
    borderDark: adjustBrightness(colors.borderDark, brightness),
    shadow: adjustBrightness(colors.shadow, brightness),
    shadowDark: adjustBrightness(colors.shadowDark, brightness),
    surfaceHighlight: adjustBrightness(colors.surfaceHighlight, brightness),
    surfaceDim: adjustBrightness(colors.surfaceDim, brightness),
    surfaceElevated: adjustBrightness(colors.surfaceElevated, brightness),
    inputBackground: adjustBrightness(colors.inputBackground, brightness),
    overlay: adjustBrightness(colors.overlay, brightness),
    overlayDark: adjustBrightness(colors.overlayDark, brightness),
    iconPrimary: adjustBrightness(colors.iconPrimary, brightness),
    iconSecondary: adjustBrightness(colors.iconSecondary, brightness),
    iconAccent: adjustBrightness(colors.iconAccent, brightness),
    iconDisabled: adjustBrightness(colors.iconDisabled, brightness),
    trendline: {
      primary: adjustBrightness(colors.trendline.primary, brightness),
      secondary: adjustBrightness(colors.trendline.secondary, brightness),
      thresholdMin: adjustBrightness(colors.trendline.thresholdMin, brightness),
      thresholdWarning: adjustBrightness(colors.trendline.thresholdWarning, brightness),
      thresholdMax: adjustBrightness(colors.trendline.thresholdMax, brightness),
      axis: adjustBrightness(colors.trendline.axis, brightness),
      grid: adjustBrightness(colors.trendline.grid, brightness),
      label: adjustBrightness(colors.trendline.label, brightness),
    },
    interactive: adjustBrightness(colors.interactive, brightness),
    interactiveHover: adjustBrightness(colors.interactiveHover, brightness),
    interactiveActive: adjustBrightness(colors.interactiveActive, brightness),
    interactiveDisabled: adjustBrightness(colors.interactiveDisabled, brightness),
    toggle: {
      trackOn: adjustBrightness(colors.toggle.trackOn, brightness),
      trackOff: adjustBrightness(colors.toggle.trackOff, brightness),
      trackOnDisabled: adjustBrightness(colors.toggle.trackOnDisabled, brightness),
      trackOffDisabled: adjustBrightness(colors.toggle.trackOffDisabled, brightness),
      thumb: adjustBrightness(colors.toggle.thumb, brightness),
      thumbDisabled: adjustBrightness(colors.toggle.thumbDisabled, brightness),
    },
  };
  
  return adjustedColors;
};

// Utility to adjust color brightness
const adjustBrightness = (color: string, factor: number): string => {
  // Simple brightness adjustment - in production might use more sophisticated color manipulation
  if (factor === 1.0) return color;
  
  // Handle rgba colors
  if (color.startsWith('rgba')) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
    if (match) {
      const r = Math.round(parseInt(match[1]) * factor);
      const g = Math.round(parseInt(match[2]) * factor);
      const b = Math.round(parseInt(match[3]) * factor);
      const a = match[4] || '1';
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  }
  
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const newR = Math.round(r * factor);
  const newG = Math.round(g * factor);
  const newB = Math.round(b * factor);
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};