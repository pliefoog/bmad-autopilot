/**
 * Drag and Drop Configuration
 * 
 * Central configuration for widget drag-and-drop behavior.
 * All timing, sizing, and animation constants in one place.
 */

export const DRAG_CONFIG = {
  /**
   * Long press duration to activate drag mode (ms)
   * Maritime UX: 800ms provides good balance between intentional activation
   * and not feeling sluggish. Shorter durations (500ms) risk accidental drags.
   */
  LONG_PRESS_DURATION: 800,

  /**
   * Edge zone width for cross-page dragging (%)
   * When widget is dragged within this percentage of screen edges,
   * page transition timer starts.
   */
  EDGE_ZONE_WIDTH_PERCENT: 15,

  /**
   * Hover delay before page transition (ms)
   * Buffer time allows dragging near edges without triggering page change.
   * User requested configurable value around 500ms.
   */
  EDGE_HOVER_DELAY: 500,

  /**
   * Placeholder widget ID
   * Special ID used for drop preview placeholder.
   * MUST be filtered out during persistence!
   */
  PLACEHOLDER_ID: '__DRAG_PLACEHOLDER__',

  /**
   * Dragged widget opacity (0-1)
   * Semi-transparent while dragging (follows cursor)
   */
  DRAGGED_WIDGET_OPACITY: 0.7,

  /**
   * Dragged widget scale factor
   * Slight lift effect: 1.05 = 5% larger
   */
  DRAGGED_WIDGET_SCALE: 1.05,

  /**
   * Dragged widget elevation (shadow depth)
   * Increased shadow while dragging
   */
  DRAGGED_WIDGET_ELEVATION: 8,

  /**
   * Spring animation config for drop
   * Smooth bounce when widget settles into position
   */
  DROP_SPRING_CONFIG: {
    stiffness: 300,
    damping: 20,
  },

  /**
   * Minimum drag distance to count as move (px)
   * Prevents accidental reordering from tiny movements
   */
  MIN_DRAG_DISTANCE: 10,

  /**
   * Debounce time for drag end (ms)
   * Prevents double-trigger from rapid gestures
   */
  DRAG_END_DEBOUNCE: 300,
} as const;
