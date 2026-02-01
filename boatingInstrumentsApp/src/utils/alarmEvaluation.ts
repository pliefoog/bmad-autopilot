/**
 * Alarm Evaluation - Simplified alarm state evaluation
 *
 * Simplified Architecture (Jan 2026):
 * - Single threshold value per level (critical/warning)
 * - Direction determines comparison logic
 * - Hysteresis applied as absolute value
 * - Formula thresholds evaluated on-the-fly
 * 
 * Priority order:
 * 1. Stale check (if data too old, stop - can't trust it)
 * 2. Critical threshold check
 * 3. Warning threshold check with hysteresis
 */

import { MetricThresholds } from '../types/SensorData';
import { evaluateFormula } from './formulaEvaluator';

/**
 * Evaluates alarm state for a metric with simplified logic
 *
 * @param value - Current SI value
 * @param timestamp - Value timestamp
 * @param thresholds - Configured thresholds (optional)
 * @param previousState - Previous alarm state (for hysteresis)
 * @param direction - Alarm direction ('above' or 'below')
 * @param staleThresholdMs - Time after which data is considered stale
 * @param formulaContext - Context for formula evaluation (if formula mode)
 * @returns Alarm level: 0 (none), 1 (stale), 2 (warning), 3 (critical)
 */
export function evaluateAlarm(
  value: number,
  timestamp: number,
  thresholds: MetricThresholds | undefined,
  previousState: 0 | 1 | 2 | 3,
  direction: 'above' | 'below',
  staleThresholdMs: number,
  formulaContext?: Record<string, number>,
): 0 | 1 | 2 | 3 {
  // Priority 1: Check stale FIRST - if stale, stop here
  if (Date.now() - timestamp > staleThresholdMs) {
    return 1; // STALE
  }

  // If no thresholds configured or disabled, data is fresh and valid
  if (!thresholds || !thresholds.enabled) {
    return 0; // NONE
  }

  // Get threshold values (evaluate formula if needed)
  let criticalThreshold: number;
  let warningThreshold: number;

  if (thresholds.mode === 'formula') {
    if (!formulaContext) {
      console.warn('[evaluateAlarm] Formula mode but no context provided');
      return 0;
    }
    try {
      criticalThreshold = evaluateFormula(thresholds.formula, {
        ...formulaContext,
        indirectThreshold: thresholds.criticalRatio,
      });
      warningThreshold = evaluateFormula(thresholds.formula, {
        ...formulaContext,
        indirectThreshold: thresholds.warningRatio,
      });
    } catch (err) {
      console.error('[evaluateAlarm] Formula evaluation failed:', err);
      return 0;
    }
  } else {
    criticalThreshold = thresholds.critical;
    warningThreshold = thresholds.warning;
  }

  const hysteresis = thresholds.hysteresis ?? 0;

  // Priority 2: Check critical threshold
  if (direction === 'below') {
    // Alarm when value goes BELOW threshold
    if (value <= criticalThreshold) {
      return 3; // CRITICAL
    }
  } else {
    // Alarm when value goes ABOVE threshold
    if (value >= criticalThreshold) {
      return 3; // CRITICAL
    }
  }

  // Priority 3: Check warning threshold with hysteresis
  const isCurrentlyInWarning = previousState === 2;
  
  if (direction === 'below') {
    // Alarm when value goes BELOW warning
    // Hysteresis: clear alarm when value rises ABOVE (warning + hysteresis)
    const clearThreshold = warningThreshold + (isCurrentlyInWarning ? hysteresis : 0);
    if (value <= clearThreshold) {
      return 2; // WARNING
    }
  } else {
    // Alarm when value goes ABOVE warning
    // Hysteresis: clear alarm when value drops BELOW (warning - hysteresis)
    const clearThreshold = warningThreshold - (isCurrentlyInWarning ? hysteresis : 0);
    if (value >= clearThreshold) {
      return 2; // WARNING
    }
  }

  return 0; // NONE
}
