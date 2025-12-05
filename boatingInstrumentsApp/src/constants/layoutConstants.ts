/**
 * Layout Constants - Centralized Magic Numbers
 * 
 * All hardcoded layout values extracted into named constants for:
 * - Maintainability
 * - Consistency
 * - Easy updates across codebase
 * 
 * Nautical Context Optimizations:
 * - Viewing distance: 2-3 feet typical (helm station)
 * - Environment: Bright sunlight, motion/vibration, wet hands possible
 * - Priority: Quick glanceability over information density
 * - Touch targets: Larger than iOS minimum (wet/gloved hands)
 */

// ===== SCREEN BREAKPOINTS =====
export const BREAKPOINTS = {
  /** Mobile portrait - single column vertical scroll */
  MOBILE_PORTRAIT: 0,
  /** Mobile landscape - 2 columns vertical scroll */
  MOBILE_LANDSCAPE: 600,
  /** Tablet portrait - 3 columns with pagination (iPad: 768pt minimum) */
  TABLET_PORTRAIT: 768,
  /** Tablet landscape - 5 columns with pagination (iPad: 1024pt landscape) */
  TABLET_LANDSCAPE: 1024,
  /** Desktop - 6 columns with pagination */
  DESKTOP: 1280,
  /** Large desktop - 8 columns with pagination */
  LARGE_DESKTOP: 1920,
} as const;

// ===== GRID COLUMNS BY BREAKPOINT =====
// Optimized for nautical viewing: Fewer columns = larger widgets = better glanceability
export const GRID_COLUMNS = {
  /** Mobile portrait: 1 column (full screen per widget) */
  MOBILE_PORTRAIT: 1,
  /** Mobile landscape: 2 columns (side-by-side comparison) */
  MOBILE_LANDSCAPE: 2,
  /** Tablet portrait: 3 columns (iPad 768pt+ in portrait) */
  TABLET_PORTRAIT: 3,
  /** Tablet landscape: 4 columns (iPad 1024pt+ landscape - reduced from 5 for larger widgets) */
  TABLET_LANDSCAPE: 4,
  /** Desktop: 5 columns (reduced from 6 for better readability at distance) */
  DESKTOP: 5,
  /** Large desktop: 6 columns (reduced from 8 - max for glanceability) */
  LARGE_DESKTOP: 6,
  /** Absolute maximum columns (safety limit) */
  MAX: 6,
} as const;

// ===== LAYOUT SPACING =====
export const SPACING = {
  /** Widget-to-widget spacing */
  WIDGET: 0,
  /** Screen edge margin */
  MARGIN: 0,
  /** Minimum touch target size (iOS HIG) */
  MIN_TOUCH_TARGET: 44,
} as const;

// ===== HEADER/FOOTER HEIGHTS =====
export const UI_HEIGHTS = {
  /** Default header height */
  HEADER: 60,
  /** Default footer height (navigation bar) */
  FOOTER: 88,
  /** Pagination controls height */
  PAGINATION: 60,
  /** FAB button size */
  FAB: 56,
  /** FAB button radius */
  FAB_RADIUS: 28,
} as const;

// ===== WIDGET DIMENSIONS =====
export const WIDGET_SIZE = {
  /** Default widget width in grid units */
  DEFAULT_WIDTH: 2,
  /** Default widget height in grid units */
  DEFAULT_HEIGHT: 2,
  /** Minimum widget width */
  MIN_WIDTH: 1,
  /** Minimum widget height */
  MIN_HEIGHT: 1,
} as const;

// ===== PAGINATION BEHAVIOR =====
export const PAGINATION = {
  /** Enable pagination above this width */
  MIN_WIDTH_FOR_PAGINATION: BREAKPOINTS.TABLET_PORTRAIT,
  /** Dot indicator size */
  DOT_SIZE: 8,
  /** Active dot indicator size */
  DOT_SIZE_ACTIVE: 12,
  /** Dot spacing */
  DOT_SPACING: 8,
} as const;

// ===== ANIMATION TIMINGS =====
export const ANIMATION = {
  /** Page transition duration (ms) */
  PAGE_TRANSITION: 300,
  /** Widget fade in/out duration (ms) */
  WIDGET_FADE: 200,
  /** Drag feedback duration (ms) */
  DRAG_FEEDBACK: 150,
  /** Error toast duration (ms) */
  TOAST_DURATION: 3000,
} as const;

// ===== WIDGET LIFECYCLE =====
export const LIFECYCLE = {
  /** Default widget expiration timeout (30 seconds) */
  DEFAULT_EXPIRATION_MS: 30000,
  /** Minimum expiration timeout (5 seconds) */
  MIN_EXPIRATION_MS: 5000,
  /** Maximum expiration timeout (5 minutes) */
  MAX_EXPIRATION_MS: 300000,
  /** Cleanup interval (check every 5 seconds) */
  CLEANUP_INTERVAL_MS: 5000,
} as const;

// ===== Z-INDEX LAYERS =====
export const Z_INDEX = {
  /** Base widget layer */
  WIDGET: 1,
  /** Dragging widget */
  WIDGET_DRAGGING: 100,
  /** Pagination controls */
  PAGINATION: 10,
  /** FAB button */
  FAB: 20,
  /** Modal overlay */
  MODAL_OVERLAY: 1000,
  /** Modal content */
  MODAL_CONTENT: 1001,
} as const;

// ===== HELPER FUNCTIONS =====

/**
 * Determine grid columns based on screen width
 * Optimized for nautical use: Larger widgets for better glanceability at 2-3 foot viewing distance
 */
export function getColumnsForWidth(screenWidth: number): number {
  let columns = 1;
  
  if (screenWidth >= BREAKPOINTS.LARGE_DESKTOP) {
    columns = GRID_COLUMNS.LARGE_DESKTOP;  // 6 cols (reduced from 8 for readability)
  } else if (screenWidth >= BREAKPOINTS.DESKTOP) {
    columns = GRID_COLUMNS.DESKTOP;  // 5 cols (reduced from 6)
  } else if (screenWidth >= BREAKPOINTS.TABLET_LANDSCAPE) {
    columns = GRID_COLUMNS.TABLET_LANDSCAPE;  // 4 cols (reduced from 5)
  } else if (screenWidth >= BREAKPOINTS.TABLET_PORTRAIT) {
    columns = GRID_COLUMNS.TABLET_PORTRAIT;  // 3 cols
  } else if (screenWidth >= BREAKPOINTS.MOBILE_LANDSCAPE) {
    columns = GRID_COLUMNS.MOBILE_LANDSCAPE;  // 2 cols
  } else {
    columns = GRID_COLUMNS.MOBILE_PORTRAIT;  // 1 col
  }
  
  return columns;
}

/**
 * Determine if pagination should be used for screen width
 */
export function shouldUsePagination(screenWidth: number): boolean {
  return screenWidth >= PAGINATION.MIN_WIDTH_FOR_PAGINATION;
}

/**
 * Calculate available height for widgets
 */
export function getAvailableHeight(
  screenHeight: number,
  headerHeight: number = UI_HEIGHTS.HEADER,
  footerHeight: number = UI_HEIGHTS.FOOTER
): number {
  return screenHeight - headerHeight - footerHeight;
}

/**
 * Calculate widget width for given screen width and columns
 */
export function getWidgetWidth(screenWidth: number, columns: number): number {
  return Math.floor(screenWidth / columns);
}

/**
 * Validate widget expiration timeout
 */
export function validateExpirationTimeout(timeoutMs: number): number {
  return Math.max(
    LIFECYCLE.MIN_EXPIRATION_MS,
    Math.min(timeoutMs, LIFECYCLE.MAX_EXPIRATION_MS)
  );
}
