/**
 * useClamped - Declarative Value Clamping Hook
 *
 * Purpose: Provide memoized clamped values without manual ref-based change detection.
 * Performance: Returns same reference if value unchanged, enabling React.memo optimization.
 *
 * Why not refs? Refs require manual change detection in effects (error-prone).
 * Memoization is declarative and plays well with React's rendering model.
 *
 * Usage:
 *   const clampedValue = useClamped(userValue, { min: 0, max: 100 });
 */

import { useMemo } from 'react';

interface Range {
  min: number;
  max: number;
}

/**
 * Clamp a value to a range.
 * @param value - Value to clamp
 * @param range - Range with min and max
 * @returns Clamped value (same reference if value unchanged)
 */
export const useClamped = (value: number | undefined, range: Range): number | undefined => {
  return useMemo(() => {
    if (value === undefined) return undefined;
    return Math.min(Math.max(value, range.min), range.max);
  }, [value, range.min, range.max]);
};
