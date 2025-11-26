import { useMemo } from 'react';

export interface ResponsiveFontSizes {
  label: number;
  value: number;
  unit: number;
  rowHeight: number; // Standard row height for alignment across widgets
}

/**
 * Calculate responsive font sizes and row heights based on widget dimensions
 * 
 * Uses the widget width and height to determine optimal font sizes and row heights
 * that fill the available space while maintaining consistency across all widgets.
 * Row heights are calculated to ensure perfect alignment across different widgets.
 * 
 * Base ratios (from original 200×140 widget):
 * - Label: 12px (6% of width)
 * - Value: 36px (18% of width)
 * - Unit: 12px (6% of width)
 * - Row Height: ~30% of widget height per row (accounting for header + separator)
 * 
 * @param width Widget width in pixels
 * @param height Widget height in pixels
 * @returns Font sizes and row height for consistent alignment
 */
export const useResponsiveFontSize = (width?: number, height?: number): ResponsiveFontSizes => {
  return useMemo(() => {
    // Default fallback sizes if dimensions not provided
    if (!width || !height) {
      return {
        label: 12,
        value: 36,
        unit: 12,
        rowHeight: 60,
      };
    }
    
    // Calculate based on width (primary factor)
    // Use the smaller dimension to ensure text fits
    const baseSize = Math.min(width, height);
    
    // Scale factors relative to base size
    // More aggressive scaling for smaller widgets to prevent overlap
    // Use non-linear scaling: smaller widgets scale down more aggressively
    const scaleFactor = baseSize < 300 ? 0.11 : baseSize < 400 ? 0.12 : 0.14;
    const valueFontSize = Math.floor(baseSize * scaleFactor);
    const labelFontSize = Math.floor(baseSize * 0.04); // More aggressive from 0.045
    const unitFontSize = Math.floor(baseSize * 0.04); // More aggressive from 0.045
    
    // Calculate row height based on widget height
    // Reserve space for header (~60px fixed) and distribute remaining space among rows
    // Typical widget has 4-6 rows, so calculate dynamically
    const headerHeight = 60; // Fixed header height in pixels
    const availableHeight = height - headerHeight;
    // Assuming average of 5 rows per widget, calculate per-row height
    const estimatedRows = 5;
    const rowHeight = Math.floor(availableHeight / estimatedRows);
    
    // Enforce minimum sizes for readability - more aggressive minimums
    const minValueSize = 10; // Reduced from 14 to allow more shrinking
    const minLabelSize = 6; // Reduced from 7
    const minUnitSize = 6; // Reduced from 7
    const minRowHeight = 30; // Reduced from 35
    
    // Enforce maximum sizes for very large widgets
    const maxValueSize = 60;
    const maxLabelSize = 18;
    const maxUnitSize = 16;
    const maxRowHeight = 100;
    
    return {
      label: Math.max(minLabelSize, Math.min(maxLabelSize, labelFontSize)),
      value: Math.max(minValueSize, Math.min(maxValueSize, valueFontSize)),
      unit: Math.max(minUnitSize, Math.min(maxUnitSize, unitFontSize)),
      rowHeight: Math.max(minRowHeight, Math.min(maxRowHeight, rowHeight)),
    };
  }, [width, height]);
};
