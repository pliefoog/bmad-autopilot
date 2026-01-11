/**
 * AlarmEvaluator - Global Alarm Evaluation Service
 *
 * **Purpose:**
 * Evaluates alarm states across all sensor instances and metrics.
 * Decoupled from SensorDataRegistry for separation of concerns.
 *
 * **Key Features:**
 * - Aggregates alarms from all sensors
 * - Filters by alarm level (warning, critical)
 * - Provides deduplicated alarm list for UI
 *
 * **Usage:**
 * ```typescript
 * const evaluator = new AlarmEvaluator(sensorRegistry);
 * const alarms = evaluator.evaluate();
 * ```
 *
 * **For AI Agents:**
 * This service queries all sensors and compiles active alarms.
 * Called after every sensor update in SensorDataRegistry.
 * Alarm state is determined by SensorInstance.getAlarmState().
 */

import { log } from '../utils/logging/logger';
import type { Alarm, AlarmLevel } from '../store/nmeaStore';
import type { SensorDataRegistry } from './SensorDataRegistry';

export class AlarmEvaluator {
  constructor(private registry: SensorDataRegistry) {}

  /**
   * Evaluate alarms from all sensor instances
   * Returns array of active alarms (warning + critical only)
   *
   * @returns Array of alarms
   */
  evaluate(): Alarm[] {
    const alarms: Alarm[] = [];
    const now = Date.now();
    const sensors = this.registry.getAllSensors();

    for (const sensorInstance of sensors) {
      const sensorKey = `${sensorInstance.sensorType}:${sensorInstance.instance}`;

      // Get all metric keys from history
      // TODO: Replace with public API once SensorInstance exposes getMetricKeys()
      const historyMap = (sensorInstance as any)._history as Map<string, any>;
      if (!historyMap || historyMap.size === 0) continue;

      // Check alarm state for each metric
      for (const metricKey of historyMap.keys()) {
        const alarmLevel = sensorInstance.getAlarmState(metricKey);

        // AlarmLevel: 0=NONE, 1=STALE, 2=WARNING, 3=CRITICAL
        if (alarmLevel >= 2) {
          const level: AlarmLevel = alarmLevel === 3 ? 'critical' : 'warning';

          alarms.push({
            id: `${sensorKey}.${metricKey}`,
            message: `${sensorKey}.${metricKey}: ${level.toUpperCase()}`,
            level,
            timestamp: now,
          });
        }
      }
    }

    log.alarm('Alarm evaluation complete', () => ({
      totalSensors: sensors.length,
      activeAlarms: alarms.length,
      warnings: alarms.filter((a) => a.level === 'warning').length,
      critical: alarms.filter((a) => a.level === 'critical').length,
    }));

    return alarms;
  }
}
