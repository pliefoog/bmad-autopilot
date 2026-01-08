import { useState, useEffect, useMemo } from 'react';
import { Dimensions, Platform } from 'react-native';
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Platform breakpoints based on UI Architecture v2.3 specification
 * Extended for 4K+ displays
 * Note: Phone breakpoint increased to 900 to accommodate modern phones in landscape
 * (e.g., iPhone 14: 844pt wide in landscape)
 */
const BREAKPOINTS = {
  phone: 900, // ≤900px width (includes phones in landscape)
  tablet: 1024, // 901px-1024px width
  desktop: 1920, // 1025px-1920px width (Full HD)
  largeDesktop: 1921, // >1920px width (4K+)
} as const;

/**
 * Grid density configurations per platform and orientation
 * Based on AC 1: Platform-Specific Widget Density requirements
 * Optimized for marine use: maximize visible instruments at glance
 */
const GRID_DENSITY = {
  phone: {
    portrait: { cols: 2, rows: 3 }, // 2×4 grid (8 widgets per page)
    landscape: { cols: 3, rows: 1 }, // 4×2 grid (8 widgets per page)
  },
  tablet: {
    portrait: { cols: 2, rows: 3 }, // 2×3 grid (6 widgets)
    landscape: { cols: 3, rows: 2 }, // 3×2 grid (6 widgets)
  },
  desktop: {
    portrait: { cols: 3, rows: 4 }, // 3×4 grid (12 widgets) - increased rows
    landscape: { cols: 4, rows: 4 }, // 4×4 grid (16 widgets) - increased rows
  },
  largeDesktop: {
    portrait: { cols: 4, rows: 5 }, // 4×5 grid (20 widgets)
    landscape: { cols: 6, rows: 4 }, // 6×4 grid (24 widgets) - requested 6 columns
  },
} as const;

/**
 * Grid gap between widgets (0 = border-to-border)
 */
const WIDGET_GAP = 0;

export type PlatformType = 'phone' | 'tablet' | 'desktop' | 'largeDesktop';
export type OrientationType = 'portrait' | 'landscape';

export interface GridLayout {
  cols: number;
  rows: number;
  widgetsPerPage: number;
  cellWidth: number;
  cellHeight: number;
  containerWidth: number;
  containerHeight: number;
}

export interface ResponsiveGridState {
  platform: PlatformType;
  orientation: OrientationType;
  screenWidth: number;
  screenHeight: number;
  layout: GridLayout;
  isLoading: boolean; // True during initial render to prevent accessing uninitialized stores
  frameOffset: { x: number; y: number; right: number }; // Safe area frame offset from screen edges
}

/**
 * Hook for responsive grid calculations with platform-specific densities
 * Implements AC 1-5: Responsive Grid System requirements
 * @param headerHeight Height of the header to subtract from available space
 */
export const useResponsiveGrid = (
  headerHeight: number = 60
): ResponsiveGridState => {
  // Use safe area insets - these directly provide padding values for all edges
  const safeAreaInsets = useSafeAreaInsets();
  
  // Track screen dimensions
  const [screenDimensions, setScreenDimensions] = useState(() => Dimensions.get('window'));
  
  // Calculate available space by subtracting insets from screen dimensions
  // NOTE: We subtract left/right/bottom but NOT top - header handles top safe area
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>(() => {
    const screen = Dimensions.get('window');
    return {
      width: screen.width - safeAreaInsets.left - safeAreaInsets.right,
      height: screen.height - safeAreaInsets.bottom, // Only subtract bottom (home indicator)
    };
  });
  const [isLoading, setIsLoading] = useState(true);

  // Update dimensions when safe area insets change OR when screen rotates
  useEffect(() => {
    const updateDimensions = () => {
      const newScreenDimensions = Dimensions.get('window');
      setScreenDimensions(newScreenDimensions);
      
      setDimensions({
        width: newScreenDimensions.width - safeAreaInsets.left - safeAreaInsets.right,
        height: newScreenDimensions.height - safeAreaInsets.bottom, // Only subtract bottom (home indicator)
      });
    };

    // Update on mount and when insets change
    updateDimensions();

    // Also listen for Dimensions change events (rotation, split-screen, etc.)
    const subscription = Dimensions.addEventListener('change', updateDimensions);

    return () => {
      subscription?.remove();
    };
  }, [safeAreaInsets.top, safeAreaInsets.right, safeAreaInsets.bottom, safeAreaInsets.left]);

  // Mark as loaded after first render - gives stores time to initialize
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // Determine current platform based on screen width
  const platform: PlatformType = useMemo(() => {
    if (dimensions.width <= BREAKPOINTS.phone) return 'phone';
    if (dimensions.width <= BREAKPOINTS.tablet) return 'tablet';
    if (dimensions.width <= BREAKPOINTS.desktop) return 'desktop';
    return 'largeDesktop'; // 4K+ displays
  }, [dimensions.width]);

  // Determine orientation
  const orientation: OrientationType = useMemo(() => {
    return dimensions.width > dimensions.height ? 'landscape' : 'portrait';
  }, [dimensions.width, dimensions.height]);

  // Calculate available space for dashboard content
  // useSafeAreaFrame already provides dimensions AFTER safe areas (notch, home indicator)
  // Only subtract header height, NOT bottomInset (would be double-accounting)
  const availableSpace = useMemo(() => {
    return {
      width: dimensions.width,
      height: dimensions.height - headerHeight,
    };
  }, [dimensions, headerHeight]);

  // Calculate grid layout based on platform and orientation
  const layout: GridLayout = useMemo(() => {
    const density = GRID_DENSITY[platform][orientation];
    const { cols, rows } = density;

    // Calculate cell dimensions considering gaps
    // AC 5: Equal cell sizing with 8pt gaps between cells
    const totalGapWidth = (cols - 1) * WIDGET_GAP;
    const totalGapHeight = (rows - 1) * WIDGET_GAP;

    // Calculate cell size to fill available space exactly
    // Widget dimensions are independent - height fills vertical space, width fills horizontal
    // This ensures rows are equally distributed over available height (not locked to aspect ratio)
    const cellWidth = (availableSpace.width - totalGapWidth) / cols;
    const cellHeight = (availableSpace.height - totalGapHeight) / rows;

    // Container dimensions match available space exactly (gap=0 means no extra space needed)
    const containerWidth = availableSpace.width;
    const containerHeight = availableSpace.height;

    // AC 12: Widget Per Page Limits enforcement
    const widgetsPerPage = cols * rows;

    return {
      cols,
      rows,
      widgetsPerPage,
      cellWidth,
      cellHeight,
      containerWidth,
      containerHeight,
    };
  }, [platform, orientation, availableSpace]);

  return {
    platform,
    orientation,
    screenWidth: dimensions.width,
    screenHeight: dimensions.height,
    layout,
    isLoading,
    frameOffset: { 
      x: safeAreaInsets.left,     // Left notch padding
      y: 0,                        // No top padding - header handles top safe area
      right: safeAreaInsets.right, // Right notch padding
    },
  };
};

/**
 * Utility function to calculate page information for widget array
 * Implements AC 2: Dynamic Layout Algorithm - widgets flow top-left → bottom-right
 */
export const calculatePages = <T>(
  items: T[],
  widgetsPerPage: number,
): { pages: T[][]; totalPages: number } => {
  if (items.length === 0) {
    return { pages: [], totalPages: 0 };
  }

  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += widgetsPerPage) {
    pages.push(items.slice(i, i + widgetsPerPage));
  }

  return {
    pages,
    totalPages: pages.length,
  };
};

/**
 * Check if device is touch-enabled for AC 16: Touch Interaction support
 */
export const isTouchDevice = (): boolean => {
  return Platform.OS === 'ios' || Platform.OS === 'android';
};

/**
 * Check if device supports mouse interactions for AC 17: Desktop Mouse Support
 */
export const isDesktopDevice = (): boolean => {
  return Platform.OS === 'web';
};
