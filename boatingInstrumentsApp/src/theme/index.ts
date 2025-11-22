// Theme System - Complete theme architecture for marine displays
// Centralized exports for theme utilities and components
// NOTE: Core theme functionality now in ../store/themeStore

// Re-export theme hooks from store (new centralized location)
export { useTheme, useThemeStore } from '../store/themeStore';
export type { ThemeColors, ThemeMode } from '../store/themeStore';

// Theme utilities for custom styling
export { createThemeStyles, createMarineWidgetStyles } from './themeUtils';

// Design tokens
export { designTokens } from './designTokens';
export { iconSystem } from './iconSystem';

// Legacy compatibility - if needed by old code
export const useThemeColors = () => {
  const theme = require('../store/themeStore').useTheme();
  return theme;
};

export const useThemeMode = () => {
  const { mode, setMode } = require('../store/themeStore').useThemeStore();
  return { mode, setMode };
};