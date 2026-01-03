/**
 * Drag-and-Drop Helper Functions
 * 
 * Utility functions for calculating drag positions, hover indices,
 * and managing drag state during widget reordering.
 */

import { type ResponsiveGridState } from '../hooks/useResponsiveGrid';
import { DRAG_CONFIG } from '../config/dragConfig';

/**
 * Calculate which grid cell is being hovered over during drag
 * 
 * @param absoluteX - Absolute X coordinate on screen
 * @param absoluteY - Absolute Y coordinate on screen  
 * @param gridState - Current responsive grid configuration
 * @param pageIndex - Current page index
 * @returns Grid index (0-based) or -1 if outside grid
 */
export function calculateHoverIndex(
  absoluteX: number,
  absoluteY: number,
  gridState: ResponsiveGridState,
  pageIndex: number,
): number {
  const { layout, cols, rows } = gridState;
  const { cellWidth, cellHeight, containerWidth, containerHeight } = layout;

  // Calculate position relative to page
  const relativeX = absoluteX - (pageIndex * containerWidth);
  const relativeY = absoluteY;

  // Check if outside grid bounds
  if (
    relativeX < 0 ||
    relativeX > containerWidth ||
    relativeY < 0 ||
    relativeY > containerHeight
  ) {
    return -1;
  }

  // Calculate grid cell
  const col = Math.floor(relativeX / cellWidth);
  const row = Math.floor(relativeY / cellHeight);

  // Validate column/row bounds
  if (col < 0 || col >= cols || row < 0 || row >= rows) {
    return -1;
  }

  // Convert to linear index
  return row * cols + col;
}

/**
 * Calculate which page is being hovered based on edge zones
 * 
 * @param absoluteX - Absolute X coordinate on screen
 * @param currentPage - Current page index
 * @param totalPages - Total number of pages
 * @param scrollViewWidth - Width of scroll view
 * @returns Target page index or current page if not in edge zone
 */
export function calculateTargetPage(
  absoluteX: number,
  currentPage: number,
  totalPages: number,
  scrollViewWidth: number,
): number {
  const edgeZoneWidth = scrollViewWidth * (DRAG_CONFIG.EDGE_ZONE_WIDTH_PERCENT / 100);

  // Check left edge (previous page)
  if (absoluteX < edgeZoneWidth && currentPage > 0) {
    return currentPage - 1;
  }

  // Check right edge (next page)
  if (absoluteX > scrollViewWidth - edgeZoneWidth && currentPage < totalPages - 1) {
    return currentPage + 1;
  }

  return currentPage;
}

/**
 * Check if drag movement exceeds minimum threshold
 * Prevents accidental reordering from tiny movements
 * 
 * @param translationX - Horizontal translation
 * @param translationY - Vertical translation
 * @returns true if movement exceeds threshold
 */
export function isDragSignificant(translationX: number, translationY: number): boolean {
  const distance = Math.sqrt(translationX ** 2 + translationY ** 2);
  return distance >= DRAG_CONFIG.MIN_DRAG_DISTANCE;
}

/**
 * Calculate absolute widget position from page layout
 * 
 * @param widgetIndex - Widget index within page
 * @param gridState - Current responsive grid configuration
 * @param pageIndex - Page index
 * @returns Absolute x, y coordinates
 */
export function calculateWidgetPosition(
  widgetIndex: number,
  gridState: ResponsiveGridState,
  pageIndex: number,
): { x: number; y: number } {
  const { layout, cols } = gridState;
  const { cellWidth, cellHeight, containerWidth } = layout;

  const row = Math.floor(widgetIndex / cols);
  const col = widgetIndex % cols;

  return {
    x: pageIndex * containerWidth + col * cellWidth,
    y: row * cellHeight,
  };
}
