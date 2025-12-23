/**
 * Settings Storage Service
 * Handles persistence of user preferences and application settings
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type DisplayMode = 'light' | 'dark' | 'auto';

export interface AppSettings {
  theme: DisplayMode;
  units: {
    speed: 'knots' | 'mph' | 'kmh';
    depth: 'feet' | 'meters' | 'fathoms';
    temperature: 'celsius' | 'fahrenheit';
    pressure: 'psi' | 'bar' | 'kpa';
  };
  notifications: {
    enabled: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
  };
  dataRefreshRate: number; // milliseconds
  autopilotSettings: {
    confirmCommands: boolean;
    safetyLimits: {
      maxHeadingChange: number; // degrees
      maxSpeedChange: number; // knots
    };
  };
  layout: {
    gridSnap: boolean;
    showGrid: boolean;
    lockLayout: boolean;
  };
}

export interface SettingsStorageService {
  saveSettings(settings: AppSettings): Promise<void>;
  loadSettings(): Promise<AppSettings>;
  saveThemePreference(theme: DisplayMode): Promise<void>;
  loadThemePreference(): Promise<DisplayMode>;
  resetToDefaults(): Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'auto',
  units: {
    speed: 'knots',
    depth: 'feet',
    temperature: 'celsius',
    pressure: 'psi',
  },
  notifications: {
    enabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
  },
  dataRefreshRate: 1000,
  autopilotSettings: {
    confirmCommands: true,
    safetyLimits: {
      maxHeadingChange: 45,
      maxSpeedChange: 5,
    },
  },
  layout: {
    gridSnap: true,
    showGrid: false,
    lockLayout: false,
  },
};

class SettingsStorageServiceImpl implements SettingsStorageService {
  private static instance: SettingsStorageServiceImpl;
  private readonly SETTINGS_KEY = 'app_settings';
  private readonly THEME_KEY = 'theme_preference';

  static getInstance(): SettingsStorageServiceImpl {
    if (!SettingsStorageServiceImpl.instance) {
      SettingsStorageServiceImpl.instance = new SettingsStorageServiceImpl();
    }
    return SettingsStorageServiceImpl.instance;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      const settingsData = JSON.stringify(settings);
      await AsyncStorage.setItem(this.SETTINGS_KEY, settingsData);
    } catch (error) {
      console.error('Failed to save app settings:', error);
      throw new Error(`Settings save failed: ${error}`);
    }
  }

  async loadSettings(): Promise<AppSettings> {
    try {
      const settingsData = await AsyncStorage.getItem(this.SETTINGS_KEY);

      if (!settingsData) {
        await this.saveSettings(DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }

      const settings = JSON.parse(settingsData) as AppSettings;

      // Merge with defaults to handle new settings added in updates
      const mergedSettings = this.mergeWithDefaults(settings);
      return mergedSettings;
    } catch (error) {
      console.error('Failed to load app settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  async saveThemePreference(theme: DisplayMode): Promise<void> {
    try {
      await AsyncStorage.setItem(this.THEME_KEY, theme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
      throw new Error(`Theme save failed: ${error}`);
    }
  }

  async loadThemePreference(): Promise<DisplayMode> {
    try {
      const theme = await AsyncStorage.getItem(this.THEME_KEY);
      return (theme as DisplayMode) || DEFAULT_SETTINGS.theme;
    } catch (error) {
      console.error('Failed to load theme preference:', error);
      return DEFAULT_SETTINGS.theme;
    }
  }

  async resetToDefaults(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.SETTINGS_KEY);
      await AsyncStorage.removeItem(this.THEME_KEY);
      await this.saveSettings(DEFAULT_SETTINGS);
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw new Error(`Settings reset failed: ${error}`);
    }
  }

  private mergeWithDefaults(settings: Partial<AppSettings>): AppSettings {
    return {
      theme: settings.theme || DEFAULT_SETTINGS.theme,
      units: { ...DEFAULT_SETTINGS.units, ...settings.units },
      notifications: { ...DEFAULT_SETTINGS.notifications, ...settings.notifications },
      dataRefreshRate: settings.dataRefreshRate || DEFAULT_SETTINGS.dataRefreshRate,
      autopilotSettings: {
        ...DEFAULT_SETTINGS.autopilotSettings,
        ...settings.autopilotSettings,
        safetyLimits: {
          ...DEFAULT_SETTINGS.autopilotSettings.safetyLimits,
          ...settings.autopilotSettings?.safetyLimits,
        },
      },
      layout: { ...DEFAULT_SETTINGS.layout, ...settings.layout },
    };
  }
}

// Export singleton instance
export const settingsStorageService = SettingsStorageServiceImpl.getInstance();
