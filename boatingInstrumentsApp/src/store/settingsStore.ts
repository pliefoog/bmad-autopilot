import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
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
  iconPrimary: string; // Primary icon color (theme-aware)
  iconSecondary: string; // Secondary icon color (muted)
  iconAccent: string; // Accent icon color for important elements
  iconDisabled: string; // Disabled/inactive icon color
  // iOS semantic colors (HIG compliance)
  iosSystemBlue: string;
  iosSystemGreen: string;
  iosSystemIndigo: string;
  iosSystemOrange: string;
  iosSystemPink: string;
  iosSystemPurple: string;
  iosSystemRed: string;
  iosSystemTeal: string;
  iosSystemYellow: string;
  iosSystemGray: string;
  iosSystemGray2: string;
  iosSystemGray3: string;
  iosSystemGray4: string;
  iosSystemGray5: string;
  iosSystemGray6: string;
  // iOS label colors (adapt to theme)
  iosLabel: string; // Primary text
  iosSecondaryLabel: string; // Secondary text (60% opacity)
  iosTertiaryLabel: string; // Tertiary text (30% opacity)
  iosQuaternaryLabel: string; // Quaternary text (18% opacity)
  // iOS fill colors
  iosSystemBackground: string; // Primary background
  iosSecondarySystemBackground: string; // Secondary background
  iosTertiarySystemBackground: string; // Tertiary background
  iosSystemFill: string; // Fill color
  iosSecondarySystemFill: string; // Secondary fill
  iosTertiarySystemFill: string; // Tertiary fill
  iosQuaternarySystemFill: string; // Quaternary fill
  // iOS separator
  iosSeparator: string; // Hairline separator
  iosOpaqueSeparator: string; // Opaque separator
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
  
  /**
   * ⚠️ DEPRECATED: Legacy unit configuration
   * 
   * This object is NO LONGER used for widget display.
   * All widgets now use:
   *   1. MetricValue.formattedValue (respects presentationStore settings)
   *   2. presentationStore.REGION_DEFAULTS (single source of truth)
   * 
   * **Current Usage:**
   * - Only used internally by useUnitConversion hook
   * - useUnitConversion only used by GPSWidget for date/time formatting (non-numeric)
   * 
   * **Do NOT:**
   * - Read from this in widgets (use MetricValue instead)
   * - Add new categories here (add to presentationStore instead)
   * - Use for sensor data conversion (use ConversionRegistry + MetricValue)
   * 
   * @deprecated Use presentationStore.REGION_DEFAULTS for unit preferences
   * @see src/presentation/presentationStore.ts
   * @see src/types/MetricValue.ts
   */
  units: {
    depth: 'meters' | 'feet' | 'fathoms';
    speed: 'knots' | 'mph' | 'kmh' | 'ms';
    distance: 'nautical' | 'statute' | 'metric';
    temperature: 'celsius' | 'fahrenheit';
    pressure: 'bar' | 'psi' | 'kpa';
    volume: 'liters' | 'gallons' | 'imperial-gallons';
    wind: 'knots' | 'mph' | 'kmh' | 'ms' | 'beaufort';
  };
  
  gps: {
    coordinateFormat: 'decimal_degrees' | 'degrees_minutes' | 'degrees_minutes_seconds' | 'utm';
    dateFormat: 'iso_date' | 'us_date' | 'eu_date' | 'uk_date' | 'nautical_date';
    timeFormat: 'time_24h_full' | 'time_24h' | 'time_12h_full' | 'time_12h' | 'time_compact';
    timezone: string; // Timezone ID from MARITIME_TIMEZONES
  };
  shipTime: {
    dateFormat: 'iso_date' | 'us_date' | 'eu_date' | 'uk_date' | 'nautical_date';
    timeFormat: 'time_24h_full' | 'time_24h' | 'time_12h_full' | 'time_12h' | 'time_compact';
    timezone: string; // Timezone ID from MARITIME_TIMEZONES
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
  setGpsSetting: (setting: keyof SettingsState['gps'], value: string) => void;
  setShipTimeSetting: (setting: keyof SettingsState['shipTime'], value: string) => void;
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
  gps: {
    coordinateFormat: 'degrees_minutes',
    dateFormat: 'nautical_date',
    timeFormat: 'time_24h_full',
    timezone: 'utc',
  },
  shipTime: {
    dateFormat: 'nautical_date',
    timeFormat: 'time_24h_full',
    timezone: 'local_device',
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
    debugMode: true,
    showRawData: true,
    simulationMode: false,
    logLevel: 'debug',
  },
};

// Theme color definitions - Marine compliant colors with iOS semantic colors
const dayTheme: ThemeColors = {
  // Marine-specific colors (preserved for navigation safety)
  primary: '#CC3300', // Dark red instead of blue
  secondary: '#666666', // Neutral gray
  background: '#FFFFFF',
  surface: '#F8F8F8', // Light gray without blue tint
  text: '#1E1E1E', // Dark gray
  textSecondary: '#666666', // Medium gray
  accent: '#CC3300', // Red accent instead of cyan
  warning: '#CC6600', // Orange-red warning
  error: '#CC0000', // Pure red error
  success: '#CC3300', // Red instead of green for consistency
  border: '#E0E0E0', // Light gray border
  shadow: '#00000020', // Valid shadow format
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
  // iOS semantic colors (standard palette for UI elements)
  iosSystemBlue: '#007AFF',
  iosSystemGreen: '#34C759',
  iosSystemIndigo: '#5856D6',
  iosSystemOrange: '#FF9500',
  iosSystemPink: '#FF2D55',
  iosSystemPurple: '#AF52DE',
  iosSystemRed: '#FF3B30',
  iosSystemTeal: '#5AC8FA',
  iosSystemYellow: '#FFCC00',
  iosSystemGray: '#8E8E93',
  iosSystemGray2: '#AEAEB2',
  iosSystemGray3: '#C7C7CC',
  iosSystemGray4: '#D1D1D6',
  iosSystemGray5: '#E5E5EA',
  iosSystemGray6: '#F2F2F7',
  // iOS label colors (light mode)
  iosLabel: '#000000',
  iosSecondaryLabel: 'rgba(60, 60, 67, 0.6)',
  iosTertiaryLabel: 'rgba(60, 60, 67, 0.3)',
  iosQuaternaryLabel: 'rgba(60, 60, 67, 0.18)',
  // iOS backgrounds (light mode)
  iosSystemBackground: '#FFFFFF',
  iosSecondarySystemBackground: '#F2F2F7',
  iosTertiarySystemBackground: '#FFFFFF',
  iosSystemFill: 'rgba(120, 120, 128, 0.2)',
  iosSecondarySystemFill: 'rgba(120, 120, 128, 0.16)',
  iosTertiarySystemFill: 'rgba(118, 118, 128, 0.12)',
  iosQuaternarySystemFill: 'rgba(116, 116, 128, 0.08)',
  // iOS separators
  iosSeparator: 'rgba(60, 60, 67, 0.29)',
  iosOpaqueSeparator: '#C6C6C8',
};

const nightTheme: ThemeColors = {
  // Marine-specific colors (preserved for navigation safety)
  primary: '#CC3300', // Dark red instead of blue
  secondary: '#666666', // Neutral gray
  background: '#1A1A1A', // Dark gray background
  surface: '#2A2A2A', // Slightly lighter dark gray
  text: '#F0F0F0', // Light gray text
  textSecondary: '#AAAAAA', // Medium gray text
  accent: '#CC3300', // Red accent
  warning: '#CC6600', // Orange-red warning
  error: '#CC0000', // Red error
  success: '#CC3300', // Red instead of green
  border: '#444444', // Dark gray border
  shadow: '#00000040', // Valid shadow format
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
  // iOS semantic colors (adjusted for dark mode)
  iosSystemBlue: '#0A84FF',
  iosSystemGreen: '#30D158',
  iosSystemIndigo: '#5E5CE6',
  iosSystemOrange: '#FF9F0A',
  iosSystemPink: '#FF375F',
  iosSystemPurple: '#BF5AF2',
  iosSystemRed: '#FF453A',
  iosSystemTeal: '#64D2FF',
  iosSystemYellow: '#FFD60A',
  iosSystemGray: '#8E8E93',
  iosSystemGray2: '#636366',
  iosSystemGray3: '#48484A',
  iosSystemGray4: '#3A3A3C',
  iosSystemGray5: '#2C2C2E',
  iosSystemGray6: '#1C1C1E',
  // iOS label colors (dark mode)
  iosLabel: '#FFFFFF',
  iosSecondaryLabel: 'rgba(235, 235, 245, 0.6)',
  iosTertiaryLabel: 'rgba(235, 235, 245, 0.3)',
  iosQuaternaryLabel: 'rgba(235, 235, 245, 0.18)',
  // iOS backgrounds (dark mode)
  iosSystemBackground: '#000000',
  iosSecondarySystemBackground: '#1C1C1E',
  iosTertiarySystemBackground: '#2C2C2E',
  iosSystemFill: 'rgba(120, 120, 128, 0.36)',
  iosSecondarySystemFill: 'rgba(120, 120, 128, 0.32)',
  iosTertiarySystemFill: 'rgba(118, 118, 128, 0.24)',
  iosQuaternarySystemFill: 'rgba(116, 116, 128, 0.18)',
  // iOS separators (dark mode)
  iosSeparator: 'rgba(84, 84, 88, 0.6)',
  iosOpaqueSeparator: '#38383A',
};

const redNightTheme: ThemeColors = {
  // Marine red night vision mode (CRITICAL for navigation safety)
  primary: '#FF0000', // Pure red - marine compliant
  secondary: '#CC0000', // Dark red
  background: '#000000', // Pure black
  surface: '#330000', // Very dark red
  text: '#FF0000', // Pure red text
  textSecondary: '#CC0000', // Dark red text
  accent: '#FF0000', // Pure red accent
  warning: '#FF0000', // Red warning (no orange/yellow)
  error: '#CC0000', // Dark red error
  success: '#FF0000', // Red success (no green)
  border: '#660000', // Dark red border
  shadow: '#00000060', // Black shadow
  headerBackground: '#660000',
  cardBackground: '#330000',
  buttonPrimary: '#FF0000',
  buttonSecondary: '#660000',
  statusConnected: '#FF0000',
  statusDisconnected: '#990000',
  statusError: '#CC0000',
  statusWarning: '#FF0000',
  iconPrimary: '#FF0000', // Pure red icons
  iconSecondary: '#CC0000',
  iconAccent: '#FF0000',
  iconDisabled: '#330000',
  // iOS semantic colors (red night vision - all red spectrum)
  iosSystemBlue: '#FF0000', // No blue in red night mode
  iosSystemGreen: '#FF0000', // No green in red night mode
  iosSystemIndigo: '#CC0000', // Dark red substitute
  iosSystemOrange: '#FF0000', // Pure red
  iosSystemPink: '#FF0000', // Pure red
  iosSystemPurple: '#CC0000', // Dark red substitute
  iosSystemRed: '#FF0000', // Pure red
  iosSystemTeal: '#FF0000', // Pure red
  iosSystemYellow: '#FF0000', // Pure red (no yellow)
  iosSystemGray: '#660000', // Dark red gray
  iosSystemGray2: '#550000',
  iosSystemGray3: '#440000',
  iosSystemGray4: '#330000',
  iosSystemGray5: '#220000',
  iosSystemGray6: '#110000',
  // iOS label colors (red night mode)
  iosLabel: '#FF0000',
  iosSecondaryLabel: 'rgba(255, 0, 0, 0.6)',
  iosTertiaryLabel: 'rgba(255, 0, 0, 0.3)',
  iosQuaternaryLabel: 'rgba(255, 0, 0, 0.18)',
  // iOS backgrounds (red night mode)
  iosSystemBackground: '#000000',
  iosSecondarySystemBackground: '#110000',
  iosTertiarySystemBackground: '#220000',
  iosSystemFill: 'rgba(255, 0, 0, 0.2)',
  iosSecondarySystemFill: 'rgba(255, 0, 0, 0.16)',
  iosTertiarySystemFill: 'rgba(255, 0, 0, 0.12)',
  iosQuaternarySystemFill: 'rgba(255, 0, 0, 0.08)',
  // iOS separators (red night mode)
  iosSeparator: 'rgba(255, 0, 0, 0.29)',
  iosOpaqueSeparator: '#660000',
};

// Theme compliance validation disabled for runtime performance
// Validation should only be done during theme development with VALIDATE_THEMES=true

export const useSettingsStore = create<SettingsStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...defaultSettings,

        // Actions
        setThemeMode: (mode) => set({ themeMode: mode }),

        updateThemeSettings: (settings) =>
          set((state) => ({
            themeSettings: { ...state.themeSettings, ...settings },
          })),

        setUnit: (category, unit) =>
          set((state) => ({
            units: { ...state.units, [category]: unit },
          })),

        setGpsSetting: (setting, value) =>
          set((state) => ({
            gps: { ...state.gps, [setting]: value },
          })),

        setShipTimeSetting: (setting, value) =>
          set((state) => ({
            shipTime: { ...state.shipTime, [setting]: value },
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

        resetToDefaults: () => set(defaultSettings),

        exportSettings: () => get(),

        importSettings: (settings) => set((state) => ({ ...state, ...settings })),

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
      },
    ),
    { name: 'Settings Store', enabled: __DEV__ },
  ),
);
