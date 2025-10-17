// Theme Types
// Centralized type definitions for theming, styling, and visual design system

/**
 * Theme mode and configuration
 */
export type ThemeMode = 'day' | 'night' | 'red-night' | 'auto';

export type DisplayMode = 'marine' | 'aviation' | 'automotive' | 'standard';

export type ColorScheme = 'light' | 'dark' | 'high-contrast' | 'custom';

/**
 * Core color definitions
 */
export interface ThemeColors {
  // Primary brand colors
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  secondaryDark: string;
  secondaryLight: string;

  // Background colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  surface: string;
  surfaceVariant: string;

  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  textOnPrimary: string;
  textOnSecondary: string;

  // Border and divider colors
  border: string;
  borderSecondary: string;
  divider: string;
  separator: string;

  // State colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Marine-specific colors
  water: string;
  depth: string;
  wind: string;
  navigation: string;
  
  // Night vision preservation
  redNight: string;
  redNightDim: string;

  // Accessibility
  focus: string;
  disabled: string;
  placeholder: string;

  // Data visualization
  chart: {
    primary: string;
    secondary: string;
    tertiary: string;
    quaternary: string;
    grid: string;
    axis: string;
  };
}

/**
 * Typography definitions
 */
export interface ThemeTypography {
  // Font families
  fontFamily: {
    primary: string;
    secondary: string;
    monospace: string;
    numeric: string; // For digital displays
  };

  // Font sizes
  fontSize: {
    xs: number;
    sm: number;
    base: number;
    lg: number;
    xl: number;
    xxl: number;
    xxxl: number;
    display: number; // Large dashboard numbers
  };

  // Font weights
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    semiBold: number;
    bold: number;
  };

  // Line heights
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };

  // Letter spacing
  letterSpacing: {
    tight: number;
    normal: number;
    wide: number;
  };
}

/**
 * Spacing and layout
 */
export interface ThemeSpacing {
  // Base spacing unit
  unit: number;

  // Predefined spacing values
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;

  // Component-specific spacing
  component: {
    padding: number;
    margin: number;
    gap: number;
  };

  // Grid system
  grid: {
    columns: number;
    gutter: number;
    maxWidth: number;
  };
}

/**
 * Border radius and styling
 */
export interface ThemeBorderRadius {
  none: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
  
  // Component-specific
  button: number;
  card: number;
  input: number;
  modal: number;
  widget: number;
}

/**
 * Shadow and elevation
 */
export interface ThemeShadows {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  
  // Specific elevations
  card: string;
  modal: string;
  dropdown: string;
  tooltip: string;
  widget: string;
}

/**
 * Animation and transitions
 */
export interface ThemeAnimations {
  // Duration values
  duration: {
    fast: number;
    normal: number;
    slow: number;
  };

  // Easing functions
  easing: {
    linear: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
    bounce: string;
  };

  // Common transitions
  transitions: {
    default: string;
    fade: string;
    slide: string;
    scale: string;
  };
}

/**
 * Breakpoints for responsive design
 */
export interface ThemeBreakpoints {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

/**
 * Complete theme interface
 */
export interface Theme {
  mode: ThemeMode;
  displayMode: DisplayMode;
  colorScheme: ColorScheme;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  shadows: ThemeShadows;
  animations: ThemeAnimations;
  breakpoints: ThemeBreakpoints;
  
  // Theme metadata
  name: string;
  version: string;
  description?: string;
  author?: string;
}

/**
 * Theme configuration and settings
 */
export interface ThemeSettings {
  mode: ThemeMode;
  displayMode: DisplayMode;
  autoSwitchTime?: {
    dayStart: string; // HH:MM format
    nightStart: string; // HH:MM format
  };
  customColors?: Partial<ThemeColors>;
  fontSize: number; // Base font size multiplier
  contrast: number; // Contrast level 0-100
  reducedMotion: boolean;
  highContrast: boolean;
}

/**
 * Theme context and provider types
 */
export interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  isDarkMode: boolean;
  isNightMode: boolean;
  settings: ThemeSettings;
  updateSettings: (settings: Partial<ThemeSettings>) => void;
}

/**
 * Component theming
 */
export interface ComponentTheme {
  [componentName: string]: {
    defaultProps?: Record<string, any>;
    variants?: Record<string, Record<string, any>>;
    sizes?: Record<string, Record<string, any>>;
    baseStyle?: Record<string, any>;
  };
}

/**
 * Styled component props
 */
export interface ThemedProps {
  theme: Theme;
  variant?: string;
  size?: string;
  colorScheme?: string;
}

/**
 * Theme utilities and helpers
 */
export interface ThemeUtils {
  // Color manipulation
  lighten: (color: string, amount: number) => string;
  darken: (color: string, amount: number) => string;
  alpha: (color: string, opacity: number) => string;
  contrast: (color: string) => string;

  // Responsive helpers
  mediaQuery: (breakpoint: keyof ThemeBreakpoints) => string;
  spacing: (value: keyof ThemeSpacing | number) => string;
  fontSize: (size: keyof ThemeTypography['fontSize']) => string;

  // Animation helpers
  transition: (property: string, duration?: keyof ThemeAnimations['duration']) => string;
}

/**
 * Marine-specific theming
 */
export interface MarineThemeExtensions {
  // Night vision preservation
  redNightCompatible: boolean;
  minimumContrast: number;
  
  // Environmental considerations
  sunlightReadability: boolean;
  waterResistantColors: boolean;
  
  // Safety requirements
  emergencyColors: {
    alarm: string;
    warning: string;
    critical: string;
    safe: string;
  };
  
  // Navigation colors
  navigationColors: {
    port: string;
    starboard: string;
    stern: string;
    bow: string;
    course: string;
    waypoint: string;
  };
}

/**
 * Accessibility theming
 */
export interface AccessibilityTheme {
  // Color contrast ratios
  contrastRatios: {
    normal: number;
    large: number;
    decorative: number;
  };
  
  // Focus indicators
  focusIndicator: {
    width: number;
    style: string;
    color: string;
    offset: number;
  };
  
  // Motion preferences
  respectReducedMotion: boolean;
  alternativeAnimations: boolean;
  
  // Text scaling
  supportTextScaling: boolean;
  maxTextScale: number;
}

/**
 * Export utility types
 */
export type ThemeProperty = keyof Theme;
export type ColorProperty = keyof ThemeColors;
export type TypographyProperty = keyof ThemeTypography;
export type SpacingProperty = keyof ThemeSpacing;