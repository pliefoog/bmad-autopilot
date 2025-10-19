import { create } from 'zustand';
import { persist } from 'zustand/middleware';
// Theme compliance validation moved to development-only environment

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
  headerBackground: string;
  cardBackground: string;
  buttonPrimary: string;
  buttonSecondary: string;
  statusConnected: string;
  statusDisconnected: string;
  statusError: string;
  statusWarning: string;
  // Icon-specific colors for theme compliance
  iconPrimary: string;     // Primary icon color (theme-aware)
  iconSecondary: string;   // Secondary icon color (muted)
  iconAccent: string;      // Accent icon color for important elements
  iconDisabled: string;    // Disabled/inactive icon color
}

export interface ThemeSettings {
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  fontWeight: 'normal' | 'medium' | 'bold';
  borderRadius: 'none' | 'small' | 'medium' | 'large';
  shadows: boolean;
  animations: boolean;
  highContrast: boolean;
  colorBlindFriendly: boolean;
  autoTheme: boolean;
  autoThemeLatitude?: number;
  autoThemeLongitude?: number;
  // Enhanced accessibility options
  reducedMotion: boolean; // Respect reduced motion accessibility preference
  largeText: boolean; // Enable larger text sizes across the app
  marineMode: boolean; // Toggle marine-optimized contrast & touch targets
  voiceOverAnnouncements: boolean; // Enable in-app announcement helpers for screen readers
  hapticFeedback: boolean; // Device vibration/haptic feedback for important actions
  gloveMode: boolean; // AC15: Enhanced touch targets and gesture tolerances for wearing gloves
}

interface SettingsState {
  themeMode: ThemeMode;
  themeSettings: ThemeSettings;
  units: {
    depth: 'meters' | 'feet' | 'fathoms';
    speed: 'knots' | 'mph' | 'kmh' | 'ms';
    distance: 'nautical' | 'statute' | 'metric';
    temperature: 'celsius' | 'fahrenheit';
    pressure: 'bar' | 'psi' | 'kpa';
    volume: 'liters' | 'gallons' | 'imperial-gallons';
    wind: 'knots' | 'mph' | 'kmh' | 'ms' | 'beaufort';
  };
  display: {
    screenTimeout: number; // minutes, 0 = never
    brightness: number; // 0-100
    keepScreenOn: boolean;
    showSeconds: boolean;
    show24Hour: boolean;
    showGrid: boolean;
    snapToGrid: boolean;
    compactMode: boolean;
  };
  navigation: {
    defaultZoom: number;
    trackingMode: 'north-up' | 'course-up' | 'head-up';
    showTrack: boolean;
    trackLength: number; // minutes
    showWaypoints: boolean;
    magneticVariation?: number;
  };
  dataLogging: {
    enabled: boolean;
    interval: number; // seconds
    maxFileSize: number; // MB
    autoExport: boolean;
    exportFormat: 'csv' | 'json' | 'nmea';
  };
  developer: {
    debugMode: boolean;
    showRawData: boolean;
    simulationMode: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
}

interface SettingsActions {
  setThemeMode: (mode: ThemeMode) => void;
  updateThemeSettings: (settings: Partial<ThemeSettings>) => void;
  setUnit: (category: keyof SettingsState['units'], unit: string) => void;
  updateDisplaySettings: (settings: Partial<SettingsState['display']>) => void;
  updateNavigationSettings: (settings: Partial<SettingsState['navigation']>) => void;
  updateDataLoggingSettings: (settings: Partial<SettingsState['dataLogging']>) => void;
  updateDeveloperSettings: (settings: Partial<SettingsState['developer']>) => void;
  resetToDefaults: () => void;
  exportSettings: () => SettingsState;
  importSettings: (settings: Partial<SettingsState>) => void;
  getCurrentThemeColors: () => ThemeColors;
}

type SettingsStore = SettingsState & SettingsActions;

const defaultSettings: SettingsState = {
  themeMode: 'auto',
  themeSettings: {
    fontSize: 'medium',
    fontWeight: 'normal',
    borderRadius: 'medium',
    shadows: true,
    animations: true,
    highContrast: false,
    colorBlindFriendly: false,
    autoTheme: true,
    // Accessibility defaults
    reducedMotion: false,
    largeText: false,
    marineMode: false,
    voiceOverAnnouncements: false,
    hapticFeedback: true,
    gloveMode: false, // AC15: Glove mode disabled by default
  },
  units: {
    depth: 'meters',
    speed: 'knots',
    distance: 'nautical',
    temperature: 'celsius',
    pressure: 'bar',
    volume: 'liters',
    wind: 'knots',
  },
  display: {
    screenTimeout: 0,
    brightness: 80,
    keepScreenOn: true,
    showSeconds: false,
    show24Hour: true,
    showGrid: false,
    snapToGrid: true,
    compactMode: false,
  },
  navigation: {
    defaultZoom: 15,
    trackingMode: 'north-up',
    showTrack: true,
    trackLength: 60,
    showWaypoints: true,
  },
  dataLogging: {
    enabled: false,
    interval: 1,
    maxFileSize: 100,
    autoExport: false,
    exportFormat: 'csv',
  },
  developer: {
    debugMode: false,
    showRawData: false,
    simulationMode: false,
    logLevel: 'info',
  },
};

// Theme color definitions - Marine compliant colors
const dayTheme: ThemeColors = {
  primary: '#CC3300',      // Dark red instead of blue
  secondary: '#666666',    // Neutral gray
  background: '#FFFFFF',
  surface: '#F8F8F8',      // Light gray without blue tint
  text: '#1E1E1E',         // Dark gray
  textSecondary: '#666666', // Medium gray
  accent: '#CC3300',       // Red accent instead of cyan
  warning: '#CC6600',      // Orange-red warning
  error: '#CC0000',        // Pure red error
  success: '#CC3300',      // Red instead of green for consistency
  border: '#E0E0E0',       // Light gray border
  shadow: '#00000020',     // Valid shadow format
  headerBackground: '#F0F0F0',
  cardBackground: '#FFFFFF',
  buttonPrimary: '#CC3300',
  buttonSecondary: '#E0E0E0',
  statusConnected: '#CC3300',
  statusDisconnected: '#666666',
  statusError: '#CC0000',
  statusWarning: '#CC6600',
  iconPrimary: '#1E1E1E',
  iconSecondary: '#666666',
  iconAccent: '#CC3300',
  iconDisabled: '#E0E0E0',
};

const nightTheme: ThemeColors = {
  primary: '#CC3300',      // Dark red instead of blue
  secondary: '#666666',    // Neutral gray
  background: '#1A1A1A',   // Dark gray background
  surface: '#2A2A2A',      // Slightly lighter dark gray
  text: '#F0F0F0',         // Light gray text
  textSecondary: '#AAAAAA', // Medium gray text
  accent: '#CC3300',       // Red accent
  warning: '#CC6600',      // Orange-red warning
  error: '#CC0000',        // Red error
  success: '#CC3300',      // Red instead of green
  border: '#444444',       // Dark gray border
  shadow: '#00000040',     // Valid shadow format
  headerBackground: '#444444',
  cardBackground: '#2A2A2A',
  buttonPrimary: '#CC3300',
  buttonSecondary: '#444444',
  statusConnected: '#CC3300',
  statusDisconnected: '#666666',
  statusError: '#CC0000',
  statusWarning: '#CC6600',
  iconPrimary: '#F0F0F0',
  iconSecondary: '#AAAAAA',
  iconAccent: '#CC3300',
  iconDisabled: '#666666',
};

const redNightTheme: ThemeColors = {
  primary: '#FF0000',      // Pure red - marine compliant
  secondary: '#CC0000',    // Dark red
  background: '#000000',   // Pure black
  surface: '#330000',      // Very dark red
  text: '#FF0000',         // Pure red text
  textSecondary: '#CC0000', // Dark red text
  accent: '#FF0000',       // Pure red accent
  warning: '#FF0000',      // Red warning (no orange/yellow)
  error: '#CC0000',        // Dark red error
  success: '#FF0000',      // Red success (no green)
  border: '#660000',       // Dark red border
  shadow: '#00000060',     // Black shadow
  headerBackground: '#660000',
  cardBackground: '#330000',
  buttonPrimary: '#FF0000',
  buttonSecondary: '#660000',
  statusConnected: '#FF0000',
  statusDisconnected: '#990000',
  statusError: '#CC0000',
  statusWarning: '#FF0000',
  iconPrimary: '#FF0000',  // Pure red icons
  iconSecondary: '#CC0000',
  iconAccent: '#FF0000',
  iconDisabled: '#330000',
};

// Theme compliance validation disabled for runtime performance
// Validation should only be done during theme development with VALIDATE_THEMES=true

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...defaultSettings,

      // Actions
      setThemeMode: (mode) =>
        set({ themeMode: mode }),

      updateThemeSettings: (settings) =>
        set((state) => ({
          themeSettings: { ...state.themeSettings, ...settings },
        })),

      setUnit: (category, unit) =>
        set((state) => ({
          units: { ...state.units, [category]: unit },
        })),

      updateDisplaySettings: (settings) =>
        set((state) => ({
          display: { ...state.display, ...settings },
        })),

      updateNavigationSettings: (settings) =>
        set((state) => ({
          navigation: { ...state.navigation, ...settings },
        })),

      updateDataLoggingSettings: (settings) =>
        set((state) => ({
          dataLogging: { ...state.dataLogging, ...settings },
        })),

      updateDeveloperSettings: (settings) =>
        set((state) => ({
          developer: { ...state.developer, ...settings },
        })),

      resetToDefaults: () =>
        set(defaultSettings),

      exportSettings: () => get(),

      importSettings: (settings) =>
        set((state) => ({ ...state, ...settings })),

      getCurrentThemeColors: () => {
        const state = get();
        let baseTheme: ThemeColors;

        if (state.themeMode === 'auto') {
          // Simple auto theme based on time (6 AM - 6 PM = day)
          const hour = new Date().getHours();
          const isDayTime = hour >= 6 && hour < 18;
          baseTheme = isDayTime ? dayTheme : nightTheme;
        } else {
          switch (state.themeMode) {
            case 'day':
              baseTheme = dayTheme;
              break;
            case 'night':
              baseTheme = nightTheme;
              break;
            case 'red-night':
              baseTheme = redNightTheme;
              break;
            default:
              baseTheme = dayTheme;
          }
        }

        // Apply modifications based on theme settings
        if (state.themeSettings.highContrast) {
          baseTheme = {
            ...baseTheme,
            text: state.themeMode === 'day' ? '#000000' : '#FFFFFF',
            background: state.themeMode === 'day' ? '#FFFFFF' : '#000000',
          };
        }

        // Color-blind friendly adjustments (opt-in)
        if (state.themeSettings.colorBlindFriendly) {
          baseTheme = {
            ...baseTheme,
            // Use high-contrast, color-blind friendly variants for critical markers
            warning: '#FFD166', // warm yellow for warnings
            error: '#D00000', // strong red for errors
            success: '#007A33', // green for success where applicable
            accent: '#FFD166',
          };
        }

        // Marine mode: optimize contrast and critical UI colors for marine environments
        if (state.themeSettings.marineMode) {
          baseTheme = {
            ...baseTheme,
            // Slightly amplify primary/button colors for better visibility in sun/glare
            buttonPrimary: '#FF2D2D',
            // Ensure text/backdrop maintain contrast
            text: state.themeMode === 'day' ? '#000000' : '#FFFFFF',
          };
        }

        return baseTheme;
      },
    }),
    {
      name: 'settings-store',
      // Persist everything except developer settings which should reset
      partialize: (state) => {
        const { developer, ...persistedState } = state;
        return persistedState;
      },
    }
  )
);