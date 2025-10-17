// Theme System - Complete theme architecture for marine displays
// Centralized exports for theme provider, utilities, and components

// Core theme provider and hooks
export { ThemeProvider, useTheme, useThemeColors, useThemeMode, useThemeSpacing, useThemeTypography } from './ThemeProvider';

// Theme utilities for custom styling
export { createThemeStyles, createMarineWidgetStyles } from './themeUtils';

// Pre-built themed components
export { ThemedView, ThemedText, MarineValueDisplay } from './ThemedComponents';

// Demo component
export { ThemePreview } from './ThemePreview';

// Theme types (re-export from stores)
export type { ThemeColors, ThemeMode, ThemeSettings } from '../stores/settingsStore';