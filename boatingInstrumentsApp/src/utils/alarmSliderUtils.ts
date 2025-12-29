/**
 * Alarm Slider Utilities
 *
 * Pure functions for calculating threshold ranges and performing direction-aware
 * clamping for dual-threshold alarm sliders.
 *
 * Direction-aware logic:
 * - 'above' alarms: warning < critical (higher = more severe)
 * - 'below' alarms: warning > critical (lower = more severe)
 */

import { SensorConfiguration } from '../types/SensorData';

/**
 * Calculate valid slider range for critical threshold based on warning value
 * and alarm direction.
 *
 * @param baseMin - Absolute minimum from threshold config
 * @param baseMax - Absolute maximum from threshold config
 * @param warningValue - Current warning threshold value
 * @param direction - Alarm direction ('above' or 'below')
 * @returns Range constraints for critical slider
 */
export function getCriticalSliderRange(
  baseMin: number,
  baseMax: number,
  warningValue: number | undefined,
  direction: 'above' | 'below',
): { min: number; max: number } {
  if (direction === 'above') {
    return {
      min: warningValue ?? baseMin,
      max: baseMax,
    };
  } else {
    return {
      min: baseMin,
      max: warningValue ?? baseMax,
    };
  }
}

/**
 * Calculate valid slider range for warning threshold based on critical value
 * and alarm direction.
 *
 * @param baseMin - Absolute minimum from threshold config
 * @param baseMax - Absolute maximum from threshold config
 * @param criticalValue - Current critical threshold value
 * @param direction - Alarm direction ('above' or 'below')
 * @returns Range constraints for warning slider
 */
export function getWarningSliderRange(
  baseMin: number,
  baseMax: number,
  criticalValue: number | undefined,
  direction: 'above' | 'below',
): { min: number; max: number } {
  if (direction === 'above') {
    return {
      min: baseMin,
      max: criticalValue ?? baseMax,
    };
  } else {
    return {
      min: criticalValue ?? baseMin,
      max: baseMax,
    };
  }
}

/**
 * Clamp a threshold value to its valid range to prevent invalid states.
 * Used after other slider changes that might make a value out of range.
 *
 * @param value - Value to clamp
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Clamped value within [min, max]
 */
export function clampToRange(
  value: number | undefined,
  min: number,
  max: number,
): number | undefined {
  if (value === undefined) return undefined;
  return Math.max(min, Math.min(max, value));
}
