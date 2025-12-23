import { StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { ThemeColors } from '../store/themeStore';
import { createShadow } from '../../utils/shadowUtils';

/**
 * Creates a comprehensive themed stylesheet for all widget components.
 * This centralized system ensures consistency across all marine instruments
 * and enables automatic theme switching (Day/Night/Red-Night modes).
 *
 * @param theme - ThemeColors object from useTheme()
 * @returns StyleSheet object with all themed styles organized by category
 *
 * @example
 * ```typescript
 * const theme = useTheme();
 * const styles = createThemedStyles(theme);
 *
 * <View style={styles.widgetContainer}>
 *   <View style={styles.widgetHeader}>
 *     <Text style={styles.title}>DEPTH</Text>
 *   </View>
 *   <Text style={styles.mnemonic}>DEPTH</Text>
 *   <Text style={styles.valueMonospace}>12.4</Text>
 *   <Text style={styles.unit}>m</Text>
 * </View>
 * ```
 */
export const createThemedStyles = (theme: ThemeColors) => {
  return StyleSheet.create({
    // =========================
    // 1. CONTAINER STYLES
    // =========================

    /**
     * Base widget wrapper container with theme-aware surface styling.
     * Includes proper shadow, border, and background for marine instrument displays.
     */
    widgetContainer: {
      backgroundColor: theme.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 0,
      margin: 4,
      minWidth: 120,
      ...createShadow({ color: theme.shadow, offsetY: 2, radius: 4, opacity: 0.1 }),
      overflow: 'hidden',
    } as ViewStyle,

    /**
     * Widget header section containing title, icon, and controls.
     * Uses background color distinct from main content area.
     */
    widgetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    } as ViewStyle,

    /**
     * Main content area for widget metrics and data display.
     */
    widgetBody: {
      paddingHorizontal: 12,
      paddingVertical: 12,
    } as ViewStyle,

    /**
     * Optional footer section for secondary information or controls.
     */
    widgetFooter: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.background,
    } as ViewStyle,

    // =========================
    // 2. TYPOGRAPHY STYLES
    // =========================

    /**
     * Widget title style (16pt semibold) for header sections.
     * Used for main widget identification.
     */
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    } as TextStyle,

    /**
     * Metric mnemonic labels (12pt uppercase bold) for data identifiers.
     * Example: "DEPTH", "SPEED", "RPM"
     */
    mnemonic: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 4,
    } as TextStyle,

    /**
     * Primary data values (36pt monospace bold) for main metrics.
     * Uses monospace font to prevent value jitter during updates.
     */
    valueMonospace: {
      fontSize: 36,
      fontWeight: '800',
      color: theme.text,
      fontFamily: 'monospace',
      letterSpacing: 0.5,
    } as TextStyle,

    /**
     * Medium data values (24pt monospace bold) for secondary metrics.
     * Used in multi-metric layouts where 36pt would be too large.
     */
    valueMedium: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
      fontFamily: 'monospace',
      letterSpacing: 0.3,
    } as TextStyle,

    /**
     * Small data values (18pt monospace bold) for compact layouts.
     * Used in grid layouts with many metrics.
     */
    valueSmall: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      fontFamily: 'monospace',
      letterSpacing: 0.2,
    } as TextStyle,

    /**
     * Unit labels (16pt regular) for measurement units.
     * Example: "m", "kn", "°C", "rpm"
     */
    unit: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textSecondary,
      marginLeft: 6,
      marginTop: 4,
    } as TextStyle,

    /**
     * Small unit labels (12pt regular) for compact displays.
     */
    unitSmall: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.textSecondary,
      marginLeft: 4,
      marginTop: 2,
    } as TextStyle,

    /**
     * Secondary information text (12pt regular) for status and descriptions.
     */
    secondary: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    } as TextStyle,

    /**
     * Small caption text (10pt regular) for minimal information.
     */
    caption: {
      fontSize: 10,
      fontWeight: '400',
      color: theme.textSecondary,
      textAlign: 'center',
    } as TextStyle,

    // =========================
    // 3. LAYOUT STYLES
    // =========================

    /**
     * Single metric centered layout (1×1).
     * Centers one primary metric with optimal spacing.
     */
    grid1x1: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
    } as ViewStyle,

    /**
     * Vertical two-metric layout (1×2).
     * Stacks two metrics vertically with equal spacing.
     */
    grid1x2: {
      flexDirection: 'column',
      justifyContent: 'space-around',
      paddingVertical: 8,
    } as ViewStyle,

    /**
     * Horizontal two-metric layout (2×1).
     * Places two metrics side by side with equal spacing.
     */
    grid2x1: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: 12,
    } as ViewStyle,

    /**
     * Four-metric grid layout (2×2).
     * Arranges four metrics in a 2x2 grid pattern.
     */
    grid2x2: {
      flexDirection: 'column',
      paddingVertical: 8,
    } as ViewStyle,

    /**
     * Six-metric grid layout (2×3).
     * Arranges six metrics in 2 columns, 3 rows.
     */
    grid2x3: {
      flexDirection: 'column',
      paddingVertical: 6,
    } as ViewStyle,

    /**
     * Six-metric grid layout (3×2).
     * Arranges six metrics in 3 columns, 2 rows.
     */
    grid3x2: {
      flexDirection: 'column',
      paddingVertical: 8,
    } as ViewStyle,

    /**
     * Grid row container for multi-metric layouts.
     */
    gridRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: 4,
    } as ViewStyle,

    /**
     * Grid cell for individual metrics within grid layouts.
     */
    gridCell: {
      flex: 1,
      marginHorizontal: 4,
      alignItems: 'center',
    } as ViewStyle,

    /**
     * Centered grid cell for single metric in row.
     */
    gridCellCentered: {
      flex: 0.6,
      alignSelf: 'center',
      alignItems: 'center',
    } as ViewStyle,

    // =========================
    // 4. BUTTON STYLES
    // =========================

    /**
     * Primary action button with accent color background.
     */
    buttonPrimary: {
      backgroundColor: theme.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,

    /**
     * Secondary action button with transparent background and border.
     */
    buttonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,

    /**
     * Danger/destructive action button with error color.
     */
    buttonDanger: {
      backgroundColor: theme.error,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,

    /**
     * Disabled button state with reduced opacity.
     */
    buttonDisabled: {
      backgroundColor: theme.textSecondary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0.5,
    } as ViewStyle,

    /**
     * Primary button text styling.
     */
    buttonTextPrimary: {
      color: theme.surface,
      fontSize: 14,
      fontWeight: '600',
    } as TextStyle,

    /**
     * Secondary button text styling.
     */
    buttonTextSecondary: {
      color: theme.text,
      fontSize: 14,
      fontWeight: '600',
    } as TextStyle,

    /**
     * Danger button text styling.
     */
    buttonTextDanger: {
      color: theme.surface,
      fontSize: 14,
      fontWeight: '600',
    } as TextStyle,

    // =========================
    // 5. STATE INDICATOR STYLES
    // =========================

    /**
     * Normal state styling for metrics and components.
     */
    stateNormal: {
      color: theme.text,
    } as TextStyle,

    /**
     * Warning state styling for cautionary conditions.
     */
    stateWarning: {
      color: theme.warning,
    } as TextStyle,

    /**
     * Error/alarm state styling for critical conditions.
     */
    stateError: {
      color: theme.error,
    } as TextStyle,

    /**
     * Success state styling for positive conditions.
     */
    stateSuccess: {
      color: theme.success,
    } as TextStyle,

    /**
     * No-data state styling for unavailable information.
     */
    stateNoData: {
      color: theme.textSecondary,
      fontStyle: 'italic',
    } as TextStyle,

    // =========================
    // 6. UTILITY STYLES
    // =========================

    /**
     * Value and unit horizontal container.
     */
    valueContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'flex-start',
    } as ViewStyle,

    /**
     * Centered value and unit container.
     */
    valueContainerCentered: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
    } as ViewStyle,

    /**
     * Divider line for separating content sections.
     */
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: 8,
    } as ViewStyle,

    /**
     * Chevron icon for expand/collapse indicators.
     */
    chevron: {
      fontSize: 14,
      color: theme.textSecondary,
      marginLeft: 8,
    } as TextStyle,

    /**
     * General icon styling for widget headers.
     */
    icon: {
      color: theme.textSecondary,
      marginRight: 6,
    } as TextStyle,

    // =========================
    // ENGINE WIDGET METRICS
    // =========================

    /**
     * Container for multiple metrics in expanded widgets.
     */
    metricsContainer: {
      paddingTop: 8,
    } as ViewStyle,

    /**
     * Row container for simple metric display (label + value + unit).
     */
    simpleMetricRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 12,
    } as ViewStyle,

    /**
     * Label text for simple metric rows.
     */
    simpleMetricLabel: {
      fontSize: 12,
      fontFamily: 'monospace',
      fontWeight: '400',
    } as TextStyle,

    /**
     * Container for metric value + unit on right side of row.
     */
    simpleMetricValue: {
      flexDirection: 'row',
      alignItems: 'baseline',
    } as ViewStyle,

    /**
     * Numeric value text in simple metric rows.
     */
    simpleMetricNumber: {
      fontSize: 14,
      fontFamily: 'monospace',
      fontWeight: '600',
    } as TextStyle,

    /**
     * Unit text in simple metric rows.
     */
    simpleMetricUnit: {
      fontSize: 11,
      fontFamily: 'monospace',
      fontWeight: '400',
    } as TextStyle,

    /**
     * Spacer for consistent vertical spacing.
     */
    spacer: {
      height: 8,
    } as ViewStyle,

    /**
     * Large spacer for section separation.
     */
    spacerLarge: {
      height: 16,
    } as ViewStyle,
  });
};

/**
 * Helper function to get state-specific color from theme.
 *
 * @param state - Widget state: 'normal' | 'warning' | 'error' | 'success' | 'no-data'
 * @param theme - ThemeColors object
 * @returns Color string for the specified state
 */
export const getStateColor = (
  state: 'normal' | 'warning' | 'error' | 'success' | 'no-data' | 'alarm' | 'highlighted',
  theme: ThemeColors,
): string => {
  switch (state) {
    case 'warning':
      return theme.warning;
    case 'error':
    case 'alarm':
      return theme.error;
    case 'success':
      return theme.success;
    case 'highlighted':
      return theme.accent;
    case 'no-data':
      return theme.textSecondary;
    case 'normal':
    default:
      return theme.text;
  }
};

/**
 * Export type for the themed styles object.
 * Useful for TypeScript component props that accept style overrides.
 */
export type ThemedStyles = ReturnType<typeof createThemedStyles>;
