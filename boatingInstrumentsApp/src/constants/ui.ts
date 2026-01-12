/**
 * UI Constants - Touch Targets, Sizing, and Styling
 *
 * Glove mode support: Touch targets scale 44px → 56px for gloved operation.
 * Maritime context: Optimized for one-handed operation on rocking boats.
 * Theme compliance: All shadow/spacing values extracted for consistent styling.
 */

// Touch target sizing
export const BASE_TOUCH_TARGET = 44; // iOS/Android standard
export const GLOVE_MODE_TOUCH_TARGET = 56; // Larger target for gloved hands

// Form field sizing
export const BASE_FIELD_HEIGHT = 44;
export const GLOVE_MODE_FIELD_HEIGHT = 56;

// Card and shadow styling
export const CARD_SHADOW_RADIUS = 8;
export const CARD_SHADOW_OPACITY = 0.1;
export const CARD_ELEVATION_ANDROID = 2; // Android elevation property
