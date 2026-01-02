import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dimensions, Platform } from 'react-native';

/**
 * Platform breakpoints based on UI Architecture v2.3 specification
 * Extended for 4K+ displays
 */
const BREAKPOINTS = {
  phone: 480, // ≤480px width
  tablet: 1024, // 481px-1024px width
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
    portrait: { cols: 1, rows: 1 }, // 1×1 grid
    landscape: { cols: 2, rows: 1 }, // 2×1 grid
  },
  tablet: {
    portrait: { cols: 2, rows: 2 }, // 2×2 grid (4 widgets)
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
  isLoading: boolean;
}

/**
 * Hook for responsive grid calculations with platform-specific densities
 * Implements AC 1-5: Responsive Grid System requirements
 */
export const useResponsiveGrid = (
  headerHeight: number = 60,
): ResponsiveGridState => {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));
  const [isLoading, setIsLoading] = useState(true);

  // AC 4: Real-time adaptation to screen rotation and window resize events
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    // Initial load complete
    setIsLoading(false);

    return () => subscription?.remove();
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
  // Note: No footer exists, pagination overlays bottom row
  const availableSpace = useMemo(() => {
    return {
      width: dimensions.width,  // Full width (no horizontal padding)
      height: dimensions.height - headerHeight,  // Only subtract header height
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

    // Calculate actual container dimensions needed
    const containerWidth = cellWidth * cols + totalGapWidth;
    const containerHeight = cellHeight * rows + totalGapHeight;

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
 * Utility function to get platform-specific maximum widgets per page
 * Used for AC 12: Widget per page limits enforcement
 */
export const getMaxWidgetsPerPage = (platform: PlatformType): number => {
  switch (platform) {
    case 'phone':
      return 2; // 1-2 widgets per page
    case 'tablet':
      return 6; // 4-6 widgets per page
    case 'desktop':
      return 16; // Up to 16 widgets per page (4×4 grid)
    case 'largeDesktop':
      return 24; // Up to 24 widgets per page (6×4 grid)
    default:
      return 6;
  }
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
