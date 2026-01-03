/**
 * Alarm Evaluation - Pure alarm state evaluation function
 *
 * Implements priority-based alarm evaluation:
 * 1. Stale check FIRST - if data too old, stop (can't trust it)
 * 2. Critical threshold check
 * 3. Warning threshold check with hysteresis
 */

import { MetricThresholds } from '../types/SensorData';

/**
 * Evaluates alarm state for a metric with priority-based logic
 *
 * Priority order:
 * 1. Stale check (if data too old, stop - can't trust it)
 * 2. Critical threshold check
 * 3. Warning threshold check
 *
 * @param value - Current SI value
 * @param timestamp - Value timestamp
 * @param thresholds - Configured thresholds (optional)
 * @param previousState - Previous alarm state (for hysteresis)
 * @param staleThresholdMs - Time after which data is considered stale
 * @returns Alarm level: 0 (none), 1 (stale), 2 (warning), 3 (critical)
 */
export function evaluateAlarm(
  value: number,
  timestamp: number,
  thresholds: MetricThresholds | undefined,
  previousState: 0 | 1 | 2 | 3,
  staleThresholdMs: number,
): 0 | 1 | 2 | 3 {
  // Priority 1: Check stale FIRST - if stale, stop here
  // Can't trust old data for threshold evaluation
  if (Date.now() - timestamp > staleThresholdMs) {
    return 1; // STALE
  }

  // If no thresholds configured, data is fresh and valid
  if (!thresholds) {
    return 0; // NONE
  }

  // Priority 2: Check critical thresholds
  if (
    (thresholds.critical.min !== undefined && value <= thresholds.critical.min) ||
    (thresholds.critical.max !== undefined && value >= thresholds.critical.max)
  ) {
    return 3; // CRITICAL
  }

  // Priority 3: Check warning thresholds with hysteresis
  const isCurrentlyInWarning = previousState === 2;
  const hysteresis = thresholds.hysteresis ?? 0.1;

  const warningMinWithHysteresis =
    thresholds.warning.min !== undefined
      ? thresholds.warning.min * (1 + (isCurrentlyInWarning ? hysteresis : 0))
      : undefined;

  const warningMaxWithHysteresis =
    thresholds.warning.max !== undefined
      ? thresholds.warning.max * (1 - (isCurrentlyInWarning ? hysteresis : 0))
      : undefined;

  if (
    (warningMinWithHysteresis !== undefined && value <= warningMinWithHysteresis) ||
    (warningMaxWithHysteresis !== undefined && value >= warningMaxWithHysteresis)
  ) {
    return 2; // WARNING
  }

  return 0; // NONE
}
