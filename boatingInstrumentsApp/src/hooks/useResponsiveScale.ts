import { useMemo } from 'react';
import { Dimensions } from 'react-native';

/**
 * Hook for responsive text scaling based on widget dimensions
 * 
 * Strategy:
 * 1. Baseline: 250px widget width (typical for 4-column tablet layout)
 * 2. Scale factor: widgetWidth / baselineWidth
 * 3. Min/max constraints to prevent extremes
 * 
 * @param widgetWidth - Current widget width in pixels
 * @param widgetHeight - Current widget height in pixels (optional, for future use)
 * @returns Scale factor and responsive font sizes
 */
export const useResponsiveScale = (widgetWidth?: number, widgetHeight?: number) => {
  return useMemo(() => {
    // Baseline dimensions (typical 4-column tablet layout widget)
    const BASELINE_WIDTH = 250;
    const BASELINE_HEIGHT = 280;
    
    // Use provided dimensions or calculate from screen
    const effectiveWidth = widgetWidth ?? Dimensions.get('window').width / 4;
    const effectiveHeight = widgetHeight ?? BASELINE_HEIGHT;
    
    // Calculate scale factor based on width
    const widthScale = effectiveWidth / BASELINE_WIDTH;
    
    // Constrain scale factor between 0.7 and 1.5
    // - 0.7: Prevents text from becoming too small on narrow widgets
    // - 1.5: Prevents text from becoming too large on wide screens
    const scaleFactor = Math.max(0.7, Math.min(1.5, widthScale));
    
    /**
     * Calculate responsive font size with constraints
     * @param baseSize - Base font size at baseline dimensions
     * @param minSize - Minimum allowed font size
     * @param maxSize - Maximum allowed font size
     */
    const scale = (baseSize: number, minSize?: number, maxSize?: number): number => {
      const scaled = Math.round(baseSize * scaleFactor);
      if (minSize !== undefined && scaled < minSize) return minSize;
      if (maxSize !== undefined && scaled > maxSize) return maxSize;
      return scaled;
    };
    
    // Pre-calculated common font sizes
    const fontSize = {
      // Widget header/title
      title: scale(11, 9, 14),
      
      // Primary metrics (large values)
      primaryValue: scale(36, 24, 54),
      primaryLabel: scale(12, 10, 16),
      primaryUnit: scale(12, 10, 16),
      
      // Secondary metrics (smaller values)
      secondaryValue: scale(16, 12, 24),
      secondaryLabel: scale(10, 8, 13),
      secondaryUnit: scale(10, 8, 13),
      
      // Compact mode (for dense layouts)
      compactValue: scale(14, 11, 18),
      compactLabel: scale(9, 8, 11),
    };
    
    // Spacing and layout dimensions
    const spacing = {
      padding: scale(16, 12, 24),
      margin: scale(12, 8, 16),
      gap: scale(8, 6, 12),
      borderRadius: scale(8, 6, 12),
      iconSize: scale(16, 14, 20),
    };
    
    return {
      scaleFactor,
      scale,
      fontSize,
      spacing,
      // Expose dimensions for widgets that need them
      dimensions: {
        width: effectiveWidth,
        height: effectiveHeight,
      },
    };
  }, [widgetWidth, widgetHeight]);
};

/**
 * Type definitions for the hook return value
 */
export type ResponsiveScale = ReturnType<typeof useResponsiveScale>;
