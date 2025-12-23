import { useMemo } from 'react';
import { Dimensions } from 'react-native';
import { getColumnsForWidth } from '../constants/layoutConstants';

export interface ResponsiveFontSizes {
  label: number;
  value: number;
  unit: number;
  rowHeight: number; // Standard row height for alignment across widgets
}

/**
 * Calculate responsive font sizes and row heights based on widget dimensions AND column count
 *
 * Key insight: Font size should scale with the NUMBER OF COLUMNS, not raw widget dimensions.
 * A 300px widget in a 2-column layout needs larger fonts than a 300px widget in a 6-column layout
 * because viewing distance and information density differ.
 *
 * Nautical optimization: Larger fonts in multi-column layouts for glanceability at helm distance
 *
 * Column-based scaling:
 * - 1-2 columns (phone): Base scale 1.0 (compact, close viewing)
 * - 3-4 columns (tablet portrait): Scale 0.85 (medium density)
 * - 5-6 columns (tablet landscape/desktop): Scale 0.70 (higher density, needs readable text)
 * - 7+ columns (large desktop): Scale 0.60 (maximum density)
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
        label: 10,
        value: 28,
        unit: 10,
        rowHeight: 50,
      };
    }

    // Get current column count based on screen width
    const screenWidth = Dimensions.get('window').width;
    const columns = getColumnsForWidth(screenWidth);

    // Column-based scale factor (more columns = proportionally smaller fonts)
    // But not linear - use stepped approach for better readability
    let columnScale: number;
    if (columns <= 2) {
      columnScale = 1.0; // Phone: full size
    } else if (columns <= 4) {
      columnScale = 0.85; // Tablet portrait: slightly reduced
    } else if (columns <= 6) {
      columnScale = 0.7; // Tablet landscape/desktop: moderately reduced
    } else {
      columnScale = 0.6; // Large desktop: maximum reduction
    }

    // Base calculations using smaller dimension
    const baseSize = Math.min(width, height);

    // Base scale factors (before column adjustment)
    // These represent ideal proportions for a reference widget size
    const baseValueScale = 0.13; // Value is 13% of widget dimension
    const baseLabelScale = 0.045; // Labels are 4.5% of widget dimension
    const baseUnitScale = 0.04; // Units are 4% of widget dimension

    // Apply column scale to font sizes
    const valueFontSize = Math.floor(baseSize * baseValueScale * columnScale);
    const labelFontSize = Math.floor(baseSize * baseLabelScale * columnScale);
    const unitFontSize = Math.floor(baseSize * baseUnitScale * columnScale);

    // Calculate row height based on widget height
    // Reserve space for header (~40px in multi-column layouts)
    const headerHeight = columns >= 4 ? 40 : 50;
    const availableHeight = height - headerHeight;
    // Standard 5 rows per widget
    const estimatedRows = 5;
    const rowHeight = Math.floor(availableHeight / estimatedRows);

    // Enforce minimum sizes for readability (nautical context: motion, sunlight, distance)
    const minValueSize = columns <= 2 ? 20 : columns <= 4 ? 16 : 14;
    const minLabelSize = columns <= 2 ? 10 : 8;
    const minUnitSize = columns <= 2 ? 9 : 8;
    const minRowHeight = 30;

    // Enforce maximum sizes to prevent oversized text
    const maxValueSize = 48;
    const maxLabelSize = 16;
    const maxUnitSize = 14;
    const maxRowHeight = 80;

    return {
      label: Math.max(minLabelSize, Math.min(maxLabelSize, labelFontSize)),
      value: Math.max(minValueSize, Math.min(maxValueSize, valueFontSize)),
      unit: Math.max(minUnitSize, Math.min(maxUnitSize, unitFontSize)),
      rowHeight: Math.max(minRowHeight, Math.min(maxRowHeight, rowHeight)),
    };
  }, [width, height]);
};
