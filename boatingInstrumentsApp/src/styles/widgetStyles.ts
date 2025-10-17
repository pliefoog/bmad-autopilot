import { StyleSheet } from 'react-native';
import { ThemeColors } from '../core/themeStore';
import { PlatformStyles } from '../utils/animationUtils';

/**
 * Standardized widget styles for consistent theming across all marine instruments
 * Used by all widget components to ensure color consistency and proper theme switching
 */
export const createWidgetStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    // Base widget wrapper container
    widgetContainer: {
      backgroundColor: theme.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 0,
      margin: 4,
      minWidth: 120,
      ...PlatformStyles.boxShadow(theme.shadow, { x: 0, y: 2 }, 4, 0.1),
      elevation: 2,
      overflow: 'hidden',
    },

    // Widget header with title and optional chevron
    widgetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      // Ensure background color is visible and distinct from surface
      opacity: 1,
      elevation: 0,
      shadowOpacity: 0,
    },

    // Header title text
    widgetTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      flex: 1,
    },

    // Header chevron for expand/collapse
    widgetChevron: {
      fontSize: 14,
      color: theme.textSecondary,
      marginLeft: 8,
    },

    // Icon in header
    widgetIcon: {
      marginRight: 6,
      color: theme.textSecondary,
    },

    // Main content area for widget values
    widgetContent: {
      paddingHorizontal: 12,
      paddingVertical: 12,
    },

    // Mnemonic label style (AC 6: 12pt, uppercase, theme.textSecondary)
    metricLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 4,
    },

    // Primary value style (AC 6: 36pt, monospace, theme.text)
    metricValue: {
      fontSize: 36,
      fontWeight: '800',
      color: theme.text,
      fontFamily: 'monospace',
      letterSpacing: 0.5,
    },

    // Unit label style (AC 6: 16pt, theme.textSecondary)
    metricUnit: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textSecondary,
      marginLeft: 6,
      marginTop: 4,
    },

    // Value and unit container (horizontal layout)
    valueContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'flex-start',
    },

    // Secondary information text
    secondaryText: {
      fontSize: 14,
      color: theme.textSecondary,
      fontWeight: '500',
      marginTop: 4,
    },

    // State-based colors for alarms, warnings, etc.
    stateNormal: {
      color: theme.text, // Normal state uses monochrome, not green
    },

    stateAlarm: {
      color: theme.error,
    },

    stateWarning: {
      color: theme.warning,
    },

    stateNoData: {
      color: theme.textSecondary,
      opacity: 0.6,
    },

    stateHighlighted: {
      color: theme.accent,
    },

    // Compact layout styles for smaller widgets
    compactContainer: {
      minWidth: 100,
      margin: 2,
    },

    compactValue: {
      fontSize: 24,
      fontWeight: '700',
    },

    compactUnit: {
      fontSize: 12,
      marginLeft: 4,
    },

    // Full-width layout for detailed widgets
    fullWidthContainer: {
      margin: 8,
      minWidth: 200,
    },

    // Expanded content area (when widget is expanded)
    expandedContent: {
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      marginTop: 8,
    },

    // Chart/graph background
    chartBackground: {
      backgroundColor: theme.background,
      borderRadius: 4,
      padding: 8,
    },

    // Progress bar styles
    progressTrack: {
      backgroundColor: theme.border,
      height: 4,
      borderRadius: 2,
    },

    progressFill: {
      backgroundColor: theme.primary,
      height: 4,
      borderRadius: 2,
    },

    // Loading state
    loadingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },

    loadingText: {
      color: theme.textSecondary,
      fontSize: 14,
      marginTop: 8,
    },
  });

/**
 * Helper function to get state-based colors from theme
 */
export const getStateColor = (
  state: 'normal' | 'alarm' | 'warning' | 'no-data' | 'highlighted',
  theme: ThemeColors
): string => {
  switch (state) {
    case 'alarm':
      return theme.error;
    case 'warning':
    case 'highlighted':
      return theme.warning;
    case 'no-data':
      return theme.textSecondary;
    case 'normal':
    default:
      return theme.text; // Normal state uses monochrome text color, not green
  }
};

/**
 * Helper function to get state-based background colors
 */
export const getStateBackgroundColor = (
  state: 'normal' | 'alarm' | 'warning' | 'no-data' | 'highlighted',
  theme: ThemeColors
): string => {
  switch (state) {
    case 'alarm':
      return theme.error + '20'; // 20% opacity
    case 'warning':
    case 'highlighted':
      return theme.warning + '20';
    case 'no-data':
      return theme.textSecondary + '10';
    case 'normal':
    default:
      return theme.surface;
  }
};

export default createWidgetStyles;