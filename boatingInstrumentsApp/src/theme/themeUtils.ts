import { StyleSheet } from 'react-native';
import { ThemeColors } from '../store/themeStore';
import { PlatformStyles } from '../utils/animationUtils';

// Base theme utilities for creating consistent styles
export const createThemeStyles = (colors: ThemeColors, options?: {
  fontSize?: number;
  fontWeight?: string;
  borderRadius?: number;
  spacing?: { xs: number; sm: number; md: number; lg: number; xl: number };
}) => {
  const {
    fontSize = 14,
    fontWeight = '400',
    borderRadius = 8,
    spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 }
  } = options || {};

  return StyleSheet.create({
    // Layout
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    surface: {
      backgroundColor: colors.surface,
      borderRadius,
      borderWidth: 1,
      borderColor: colors.border,
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius,
      padding: spacing.md,
      marginVertical: spacing.sm,
      ...PlatformStyles.boxShadow(colors.shadow, { x: 0, y: 2 }, 4, 0.1),
      elevation: 3,
    },
    
    // Typography
    text: {
      color: colors.text,
      fontSize,
      fontWeight: fontWeight as any,
    },
    textSecondary: {
      color: colors.textSecondary,
      fontSize: fontSize * 0.875,
      fontWeight: fontWeight as any,
    },
    heading: {
      color: colors.text,
      fontSize: fontSize * 1.25,
      fontWeight: '600',
    },
    subheading: {
      color: colors.textSecondary,
      fontSize: fontSize * 1.125,
      fontWeight: '500',
    },
    
    // Buttons
    button: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonPrimary: {
      backgroundColor: colors.buttonPrimary,
    },
    buttonSecondary: {
      backgroundColor: colors.buttonSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonText: {
      color: colors.text,
      fontSize,
      fontWeight: '500',
    },
    buttonTextPrimary: {
      color: '#FFFFFF',
      fontSize,
      fontWeight: '500',
    },
    
    // Form elements
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      fontSize,
      color: colors.text,
    },
    inputFocused: {
      borderColor: colors.primary,
    },
    inputError: {
      borderColor: colors.error,
    },
    
    // Status indicators
    statusConnected: {
      color: colors.statusConnected,
    },
    statusDisconnected: {
      color: colors.statusDisconnected,
    },
    statusError: {
      color: colors.statusError,
    },
    statusWarning: {
      color: colors.statusWarning,
    },
    
    // Spacing utilities
    marginXS: { margin: spacing.xs },
    marginSM: { margin: spacing.sm },
    marginMD: { margin: spacing.md },
    marginLG: { margin: spacing.lg },
    marginXL: { margin: spacing.xl },
    
    paddingXS: { padding: spacing.xs },
    paddingSM: { padding: spacing.sm },
    paddingMD: { padding: spacing.md },
    paddingLG: { padding: spacing.lg },
    paddingXL: { padding: spacing.xl },
    
    // Borders
    border: {
      borderWidth: 1,
      borderColor: colors.border,
    },
    borderTop: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    borderBottom: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    
    // Flexbox utilities
    row: {
      flexDirection: 'row',
    },
    column: {
      flexDirection: 'column',
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    spaceBetween: {
      justifyContent: 'space-between',
    },
    
    // Marine-specific styles
    widget: {
      backgroundColor: colors.cardBackground,
      borderRadius,
      padding: spacing.md,
      margin: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 120,
    },
    widgetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    widgetTitle: {
      fontSize: fontSize * 1.125,
      fontWeight: '600',
      color: colors.text,
    },
    widgetValue: {
      fontSize: fontSize * 2,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    widgetUnit: {
      fontSize: fontSize * 0.875,
      color: colors.textSecondary,
      marginLeft: spacing.xs,
    },
    
    // Navigation
    header: {
      backgroundColor: colors.headerBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    headerTitle: {
      fontSize: fontSize * 1.25,
      fontWeight: '600',
      color: colors.text,
    },
    
    // Overlays and modals
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    modal: {
      backgroundColor: colors.surface,
      borderRadius,
      padding: spacing.lg,
      margin: spacing.md,
      maxHeight: '80%',
    },
    
    // Shadows (when enabled)
    shadow: {
      ...PlatformStyles.boxShadow(colors.shadow, { x: 0, y: 2 }, 4, 0.1),
      elevation: 3,
    },
    shadowLarge: {
      ...PlatformStyles.boxShadow(colors.shadow, { x: 0, y: 4 }, 8, 0.15),
      elevation: 6,
    },
  });
};

// Preset theme style combinations
export const createMarineWidgetStyles = (colors: ThemeColors, options?: any) => {
  const base = createThemeStyles(colors, options);
  
  return StyleSheet.create({
    ...base,
    // Marine-specific widget overrides
    depthWidget: {
      ...base.widget,
      backgroundColor: colors.primary + '10', // 10% opacity
    },
    speedWidget: {
      ...base.widget,
      backgroundColor: colors.success + '10',
    },
    windWidget: {
      ...base.widget,
      backgroundColor: colors.accent + '10',
    },
    engineWidget: {
      ...base.widget,
      backgroundColor: colors.warning + '10',
    },
    criticalValue: {
      ...base.widgetValue,
      color: colors.error,
    },
    warningValue: {
      ...base.widgetValue,
      color: colors.warning,
    },
    normalValue: {
      ...base.widgetValue,
      color: colors.success,
    },
  });
};