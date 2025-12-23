/**
 * Design Tokens System
 * Story 4.4 AC1-5: Comprehensive design system for consistency
 *
 * Provides:
 * - Color tokens with semantic naming
 * - Spacing scale (4px base unit)
 * - Typography scale with line heights
 * - Shadow system for depth
 * - Border radius tokens
 * - Transition timings
 * - Z-index layers
 */

// ============================================================================
// COLOR TOKENS
// ============================================================================

export const colors = {
  // Primary palette (blues for marine theme)
  primary: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#2196F3', // Main primary
    600: '#1E88E5',
    700: '#1976D2',
    800: '#1565C0',
    900: '#0D47A1',
  },

  // Secondary palette (oranges for accents)
  secondary: {
    50: '#FFF3E0',
    100: '#FFE0B2',
    200: '#FFCC80',
    300: '#FFB74D',
    400: '#FFA726',
    500: '#FF9800', // Main secondary
    600: '#FB8C00',
    700: '#F57C00',
    800: '#EF6C00',
    900: '#E65100',
  },

  // Success (green)
  success: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50', // Main success
    600: '#43A047',
    700: '#388E3C',
    800: '#2E7D32',
    900: '#1B5E20',
  },

  // Warning (orange)
  warning: {
    50: '#FFF8E1',
    100: '#FFECB3',
    200: '#FFE082',
    300: '#FFD54F',
    400: '#FFCA28',
    500: '#FFC107', // Main warning
    600: '#FFB300',
    700: '#FFA000',
    800: '#FF8F00',
    900: '#FF6F00',
  },

  // Error (red)
  error: {
    50: '#FFEBEE',
    100: '#FFCDD2',
    200: '#EF9A9A',
    300: '#E57373',
    400: '#EF5350',
    500: '#F44336', // Main error
    600: '#E53935',
    700: '#D32F2F',
    800: '#C62828',
    900: '#B71C1C',
  },

  // Neutral grays
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },

  // Semantic colors
  semantic: {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    border: '#E0E0E0',
    divider: '#BDBDBD',
    overlay: 'rgba(0, 0, 0, 0.5)',
    text: {
      primary: '#212121',
      secondary: '#757575',
      disabled: '#BDBDBD',
      inverse: '#FFFFFF',
    },
  },
};

// ============================================================================
// SPACING SCALE (4px base unit)
// ============================================================================

export const spacing = {
  0: 0,
  1: 4, // 0.25rem
  2: 8, // 0.5rem
  3: 12, // 0.75rem
  4: 16, // 1rem
  5: 20, // 1.25rem
  6: 24, // 1.5rem
  8: 32, // 2rem
  10: 40, // 2.5rem
  12: 48, // 3rem
  16: 64, // 4rem
  20: 80, // 5rem
  24: 96, // 6rem
};

// ============================================================================
// TYPOGRAPHY SCALE
// ============================================================================

export const typography = {
  fontFamily: {
    default: 'System', // React Native default
    mono: 'monospace',
  },

  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },

  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },

  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },
};

// ============================================================================
// iOS TYPOGRAPHY SCALE (Human Interface Guidelines)
// ============================================================================

/**
 * iOS standard text styles with proper line heights and letter spacing
 * Use with Dynamic Type hook for accessibility compliance
 *
 * Marine optimization: Base sizes suitable for 2-3m viewing distance
 * when combined with dashboard scaling in useDynamicType hook
 */
export const iosTypography = {
  largeTitle: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700' as const,
    letterSpacing: 0.37,
  },
  title1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '400' as const,
    letterSpacing: 0.36,
  },
  title2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '400' as const,
    letterSpacing: 0.35,
  },
  title3: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '400' as const,
    letterSpacing: 0.38,
  },
  headline: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.41,
  },
  body: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '400' as const,
    letterSpacing: -0.41,
  },
  callout: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '400' as const,
    letterSpacing: -0.32,
  },
  subheadline: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400' as const,
    letterSpacing: -0.24,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
    letterSpacing: -0.08,
  },
  caption1: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  caption2: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '400' as const,
    letterSpacing: 0.07,
  },
};

// ============================================================================
// SHADOW SYSTEM
// ============================================================================

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 8.0,
    elevation: 12,
  },
  '2xl': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.35,
    shadowRadius: 12.0,
    elevation: 16,
  },
};

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  base: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};

// ============================================================================
// iOS BORDER RADIUS (Human Interface Guidelines)
// ============================================================================

/**
 * iOS standard corner radius values
 * Used for native iOS component styling consistency
 */
export const iosBorderRadius = {
  none: 0,
  small: 8, // List items, small buttons
  medium: 10, // Cards, medium buttons, text fields
  large: 13, // Large cards, modal sheets
  xlarge: 20, // Full-screen modals
  continuous: 10, // iOS continuous corner (approximation)
  full: 9999,
};

// ============================================================================
// TRANSITIONS
// ============================================================================

export const transitions = {
  duration: {
    instant: 0,
    fast: 150,
    base: 250,
    slow: 350,
    slower: 500,
  },
  easing: {
    default: 'ease',
    in: 'ease-in',
    out: 'ease-out',
    inOut: 'ease-in-out',
    linear: 'linear',
  },
};

// ============================================================================
// Z-INDEX LAYERS
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modal: 1300,
  popover: 1400,
  toast: 1500,
  tooltip: 1600,
};

// ============================================================================
// BREAKPOINTS (for responsive design)
// ============================================================================

export const breakpoints = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
};

// ============================================================================
// TOUCH TARGET SIZES (marine-optimized)
// ============================================================================

export const touchTargets = {
  minimum: 44, // iOS minimum
  standard: 48, // Material Design
  marine: 56, // Marine-optimized (AC15)
  marineLarge: 64, // Large marine targets
  glove: 68, // Glove mode (AC15)
};

// ============================================================================
// ICON SIZES
// ============================================================================

export const iconSizes = {
  xs: 16,
  sm: 20,
  base: 24,
  md: 28,
  lg: 32,
  xl: 40,
  '2xl': 48,
};

// ============================================================================
// OPACITY LEVELS
// ============================================================================

export const opacity = {
  disabled: 0.4,
  hover: 0.8,
  active: 0.6,
  overlay: 0.5,
  subtle: 0.1,
};

// ============================================================================
// EXPORT COMPLETE DESIGN SYSTEM
// ============================================================================

export const designTokens = {
  colors,
  spacing,
  typography,
  iosTypography,
  shadows,
  borderRadius,
  iosBorderRadius,
  transitions,
  zIndex,
  breakpoints,
  touchTargets,
  iconSizes,
  opacity,
};

export default designTokens;
