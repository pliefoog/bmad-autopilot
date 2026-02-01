/**
 * Sensor Alarm Utilities
 *
 * Provides utility functions for sensor alarm configuration.
 * 
 * CRITICAL: Alarm direction is now read from schema (SINGLE SOURCE OF TRUTH)
 * Use getAlarmDirection() from '../registry' instead of hardcoded logic.
 */

import { SensorType } from '../types/SensorData';
import { getAlarmDirection } from '../registry';

/**
 * Get user-friendly description of alarm trigger behavior
 *
 * @param sensorType - Type of sensor
 * @param metric - Optional metric name
 * @returns Human-readable description of when alarms trigger
 *
 * @example
 * ```typescript
 * getAlarmTriggerHint('depth', 'depth')
 * // => "Triggers when depth becomes shallower than threshold"
 *
 * getAlarmTriggerHint('engine', 'coolantTemp')
 * // => "Triggers when coolantTemp rises above threshold"
 * ```
 */
export function getAlarmTriggerHint(sensorType: SensorType, metric?: string): string {
  const direction = getAlarmDirection(sensorType, metric ?? '') ?? 'below';

  const actionVerbs = {
    below: {
      depth: 'becomes shallower than',
      battery: 'drops below',
      tank: 'falls below',
      engine: 'drops below',
      default: 'drops below',
    },
    above: {
      temperature: 'rises above',
      engine: 'exceeds',
      wind: 'exceeds',
      speed: 'exceeds',
      default: 'exceeds',
    },
  };

  const verb =
    direction === 'below'
      ? actionVerbs.below[sensorType as keyof typeof actionVerbs.below] || actionVerbs.below.default
      : actionVerbs.above[sensorType as keyof typeof actionVerbs.above] ||
        actionVerbs.above.default;

  const metricLabel = metric || sensorType;

  return `Triggers when ${metricLabel} ${verb} threshold`;
}
