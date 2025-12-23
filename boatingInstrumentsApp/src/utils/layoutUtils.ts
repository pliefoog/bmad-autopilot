/**
 * Layout Utilities for Responsive Grid System
 * Implements grid calculations and page management per Story 6.11 technical specs
 */

export interface GridCell {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageLayout {
  pageIndex: number;
  widgets: string[];
  cells: GridCell[];
}

export interface LayoutConstraints {
  containerWidth: number;
  containerHeight: number;
  cols: number;
  rows: number;
  gap: number;
  cellWidth: number;
  cellHeight: number;
}

/**
 * Calculate grid cell positions for widgets
 * Implements AC 2: Dynamic Layout Algorithm - widgets flow top-left → bottom-right
 */
export const calculateGridPositions = (
  widgetCount: number,
  constraints: LayoutConstraints,
): GridCell[] => {
  const { cols, gap, cellWidth, cellHeight } = constraints;
  const positions: GridCell[] = [];

  for (let i = 0; i < widgetCount; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;

    const x = col * (cellWidth + gap);
    const y = row * (cellHeight + gap);

    positions.push({
      x,
      y,
      width: cellWidth,
      height: cellHeight,
    });
  }

  return positions;
};

/**
 * Split widgets into pages based on grid constraints
 * Implements AC 13: Grid Overflow Handling - automatically create new page
 */
export const calculatePageLayouts = (
  widgetIds: string[],
  constraints: LayoutConstraints,
): PageLayout[] => {
  const { cols, rows } = constraints;
  const widgetsPerPage = cols * rows;
  const pages: PageLayout[] = [];

  for (let pageIndex = 0; pageIndex < Math.ceil(widgetIds.length / widgetsPerPage); pageIndex++) {
    const startIndex = pageIndex * widgetsPerPage;
    const endIndex = Math.min(startIndex + widgetsPerPage, widgetIds.length);
    const pageWidgets = widgetIds.slice(startIndex, endIndex);

    const cells = calculateGridPositions(pageWidgets.length, constraints);

    pages.push({
      pageIndex,
      widgets: pageWidgets,
      cells,
    });
  }

  return pages;
};

/**
 * Determine optimal widget placement considering expanded states
 * Implements AC 3: Widget Expansion Consideration in layout calculations
 */
export const calculateOptimalPlacement = (
  widgetIds: string[],
  expandedWidgets: Set<string>,
  constraints: LayoutConstraints,
): PageLayout[] => {
  // For now, treat all widgets as equal size - future enhancement could handle expanded widgets
  // This is a placeholder for more complex layout algorithms
  return calculatePageLayouts(widgetIds, constraints);
};

/**
 * Check if a new widget can fit on the current page
 * Used for AC 13: Automatic page creation when adding widgets
 */
export const canFitOnCurrentPage = (
  currentPageWidgets: number,
  maxWidgetsPerPage: number,
): boolean => {
  return currentPageWidgets < maxWidgetsPerPage;
};

/**
 * Find the optimal page for adding a new widget
 * Returns page index where the widget should be added
 */
export const findOptimalPageForNewWidget = (
  pages: PageLayout[],
  maxWidgetsPerPage: number,
): number => {
  // Find the first page that has space
  for (let i = 0; i < pages.length; i++) {
    if (pages[i].widgets.length < maxWidgetsPerPage) {
      return i;
    }
  }

  // All pages are full, return next page index
  return pages.length;
};

/**
 * Calculate safe areas for different device types
 * Implements AC 20: Safe Area Compliance
 */
export const calculateSafeAreaInsets = (
  screenWidth: number,
  screenHeight: number,
  platform: string,
): { top: number; bottom: number; left: number; right: number } => {
  // Basic safe area calculation - in production, use react-native-safe-area-context
  const isIPhoneX = platform === 'ios' && screenHeight >= 812;

  return {
    top: isIPhoneX ? 44 : 0,
    bottom: isIPhoneX ? 34 : 0,
    left: 0,
    right: 0,
  };
};

/**
 * Animation utilities for page transitions
 * Supports AC 10: Page transition animation with 60fps performance
 */
export const createPageTransitionConfig = () => ({
  duration: 300,
  useNativeDriver: true, // Hardware acceleration for 60fps
  tension: 100,
  friction: 8,
});

/**
 * Validate layout constraints to ensure minimum usability
 */
export const validateLayoutConstraints = (constraints: LayoutConstraints): boolean => {
  const { containerWidth, containerHeight, cols, rows, cellWidth, cellHeight } = constraints;

  // Ensure minimum cell sizes
  if (cellWidth < 120 || cellHeight < 120) {
    return false;
  }

  // Ensure grid fits in container
  const requiredWidth = cols * cellWidth + (cols - 1) * constraints.gap;
  const requiredHeight = rows * cellHeight + (rows - 1) * constraints.gap;

  if (requiredWidth > containerWidth || requiredHeight > containerHeight) {
    return false;
  }

  return true;
};

/**
 * Calculate performance-optimized viewport for large widget lists
 * Implements AC 15: Performance optimization with virtualization
 */
export interface ViewportInfo {
  visiblePageIndices: number[];
  preloadPageIndices: number[];
}

export const calculateOptimalViewport = (
  currentPage: number,
  totalPages: number,
  preloadBuffer: number = 1,
): ViewportInfo => {
  const visiblePageIndices = [currentPage];
  const preloadPageIndices = [];

  // Add pages within preload buffer
  for (
    let i = Math.max(0, currentPage - preloadBuffer);
    i <= Math.min(totalPages - 1, currentPage + preloadBuffer);
    i++
  ) {
    if (i !== currentPage) {
      preloadPageIndices.push(i);
    }
  }

  return {
    visiblePageIndices,
    preloadPageIndices,
  };
};

/**
 * Utility to clamp page index within valid bounds
 */
export const clampPageIndex = (pageIndex: number, totalPages: number): number => {
  return Math.max(0, Math.min(totalPages - 1, pageIndex));
};

/**
 * Calculate grid density based on available space and minimum constraints
 * Used as fallback when responsive breakpoints need adjustment
 */
export const calculateOptimalGridDensity = (
  availableWidth: number,
  availableHeight: number,
  minCellWidth: number = 140,
  minCellHeight: number = 140,
  gap: number = 8,
): { cols: number; rows: number } => {
  const maxCols = Math.floor((availableWidth + gap) / (minCellWidth + gap));
  const maxRows = Math.floor((availableHeight + gap) / (minCellHeight + gap));

  return {
    cols: Math.max(1, maxCols),
    rows: Math.max(1, maxRows),
  };
};
