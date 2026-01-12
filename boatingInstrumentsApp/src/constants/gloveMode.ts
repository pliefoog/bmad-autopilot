/**
 * Glove Mode Utilities - Touch Target and Spacing Calculations
 *
 * Purpose: Provide glove-mode-aware sizing functions for maritime safety.
 * When gloveMode is active, all interactive elements scale up for gloved operation.
 *
 * Maritime context: Users often wear gloves or have wet hands during operation.
 * Larger touch targets prevent accidental taps and improve safety.
 */

import {
  BASE_TOUCH_TARGET,
  GLOVE_MODE_TOUCH_TARGET,
  BASE_FIELD_HEIGHT,
  GLOVE_MODE_FIELD_HEIGHT,
} from './ui';

/**
 * Get appropriate touch target size based on glove mode.
 * @param gloveMode - Whether glove mode is active
 * @returns Touch target size in pixels (44 or 56)
 */
export const getTouchTargetSize = (gloveMode: boolean): number =>
  gloveMode ? GLOVE_MODE_TOUCH_TARGET : BASE_TOUCH_TARGET;

/**
 * Get appropriate input field height based on glove mode.
 * @param gloveMode - Whether glove mode is active
 * @returns Field height in pixels (44 or 56)
 */
export const getFieldHeight = (gloveMode: boolean): number =>
  gloveMode ? GLOVE_MODE_FIELD_HEIGHT : BASE_FIELD_HEIGHT;

/**
 * Scale spacing values based on glove mode.
 * Only adjusts touch targets, not fonts or padding (prevents readability issues).
 *
 * @param gloveMode - Whether glove mode is active
 * @param baseSpacing - Base spacing value in pixels
 * @returns Scaled spacing (increased if gloveMode, otherwise original)
 */
export const getSpacing = (gloveMode: boolean, baseSpacing: number): number => {
  if (!gloveMode) return baseSpacing;
  // Proportional scaling: 44→56 is 1.27x
  return Math.round(baseSpacing * 1.27);
};
