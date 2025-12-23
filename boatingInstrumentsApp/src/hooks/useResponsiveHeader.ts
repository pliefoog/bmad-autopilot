import { useMemo } from 'react';

/**
 * Hook for responsive header sizing based on widget dimensions
 *
 * Uses the same base-size scaling approach as MetricCells:
 * 1. Define base composition sizes
 * 2. Calculate header height from widget height (15%, min 40px)
 * 3. Scale all elements proportionally to fit header height
 *
 * @param widgetHeight Widget height in pixels
 * @returns Responsive icon and font sizes for header
 */
export const useResponsiveHeader = (widgetHeight?: number) => {
  return useMemo(() => {
    // BASE COMPOSITION for widget header
    const BASE_ICON_SIZE = 14;
    const BASE_FONT_SIZE = 12;
    const BASE_HEADER_HEIGHT = 30; // Standard header height at base widget size

    // Calculate actual header height (matches UnifiedWidgetGrid calculation)
    const actualHeaderHeight = widgetHeight
      ? Math.max(30, widgetHeight * 0.1) // 10% of widget height, min 30px
      : BASE_HEADER_HEIGHT;

    // Calculate height scaling factor
    const heightScaleFactor = actualHeaderHeight / BASE_HEADER_HEIGHT;

    // Apply scaling to all header elements
    const iconSize = BASE_ICON_SIZE * heightScaleFactor;
    const fontSize = BASE_FONT_SIZE * heightScaleFactor;

    return {
      iconSize: Math.max(8, iconSize), // Minimum 8px to prevent zero-size
      fontSize: Math.max(6, fontSize), // Minimum 6px to prevent zero-size
      headerHeight: actualHeaderHeight,
    };
  }, [widgetHeight]);
};
