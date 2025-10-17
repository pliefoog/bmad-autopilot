import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore, ThemeColors, ThemeMode } from '../stores/settingsStore';

interface ThemeContextValue {
  colors: ThemeColors;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  fontSize: number;
  fontWeight: string;
  borderRadius: number;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  shadows: boolean;
  animations: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const deviceColorScheme = useColorScheme();
  const {
    themeMode,
    themeSettings,
    setThemeMode,
    getCurrentThemeColors,
  } = useSettingsStore();

  // Auto-theme detection
  useEffect(() => {
    if (themeMode === 'auto') {
      // For now, use device preference. Could be enhanced with time-based switching
      const preferredMode = deviceColorScheme === 'dark' ? 'night' : 'day';
      // Don't update store, just use for rendering
    }
  }, [deviceColorScheme, themeMode]);

  const effectiveMode = useMemo(() => {
    if (themeMode === 'auto') {
      const hour = new Date().getHours();
      const isDayTime = hour >= 6 && hour < 18;
      return isDayTime ? 'day' : 'night';
    }
    return themeMode;
  }, [themeMode]);

  const colors = useMemo(() => getCurrentThemeColors(), [
    themeMode,
    themeSettings,
    deviceColorScheme,
  ]);

  const fontSize = useMemo(() => {
    switch (themeSettings.fontSize) {
      case 'small': return 12;
      case 'medium': return 14;
      case 'large': return 16;
      case 'extra-large': return 18;
      default: return 14;
    }
  }, [themeSettings.fontSize]);

  const fontWeight = useMemo(() => {
    switch (themeSettings.fontWeight) {
      case 'normal': return '400';
      case 'medium': return '500';
      case 'bold': return '700';
      default: return '400';
    }
  }, [themeSettings.fontWeight]);

  const borderRadius = useMemo(() => {
    switch (themeSettings.borderRadius) {
      case 'none': return 0;
      case 'small': return 4;
      case 'medium': return 8;
      case 'large': return 16;
      default: return 8;
    }
  }, [themeSettings.borderRadius]);

  const spacing = useMemo(() => ({
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  }), []);

  const isDark = useMemo(() => {
    return effectiveMode === 'night' || effectiveMode === 'red-night';
  }, [effectiveMode]);

  const toggleTheme = () => {
    const modes: ThemeMode[] = ['day', 'night', 'red-night', 'auto'];
    const currentIndex = modes.indexOf(themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setThemeMode(modes[nextIndex]);
  };

  const contextValue: ThemeContextValue = useMemo(() => ({
    colors,
    mode: effectiveMode,
    isDark,
    setMode: setThemeMode,
    toggleTheme,
    fontSize,
    fontWeight,
    borderRadius,
    spacing,
    shadows: themeSettings.shadows,
    animations: themeSettings.animations,
  }), [
    colors,
    effectiveMode,
    isDark,
    setThemeMode,
    toggleTheme,
    fontSize,
    fontWeight,
    borderRadius,
    spacing,
    themeSettings.shadows,
    themeSettings.animations,
  ]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Legacy compatibility hook for existing code
export const useThemeColors = (): ThemeColors => {
  const { colors } = useTheme();
  return colors;
};

// Convenience hooks for specific theme aspects
export const useThemeMode = () => {
  const { mode, setMode, toggleTheme } = useTheme();
  return { mode, setMode, toggleTheme };
};

export const useThemeSpacing = () => {
  const { spacing } = useTheme();
  return spacing;
};

export const useThemeTypography = () => {
  const { fontSize, fontWeight } = useTheme();
  return { fontSize, fontWeight };
};