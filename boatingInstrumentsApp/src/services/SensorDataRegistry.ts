/**
 * SensorDataRegistry - Pure JavaScript Sensor Data Storage
 *
 * **Architecture v3.0 (Jan 2026 Refactor):**
 * Decouples sensor data from React state management. Stores SensorInstance
 * objects outside Zustand, provides subscription API for React components.
 *
 * **Key Benefits:**
 * - ✅ No more SensorInstance in Zustand (enables devtools)
 * - ✅ Targeted subscriptions (only notify changed metrics)
 * - ✅ Single source of truth for sensor data
 * - ✅ Event-driven architecture (widget detection, alarms)
 * - ✅ Cross-sensor calculations (true wind)
 *
 * **Usage:**
 * ```typescript
 * // Update sensor data (from NMEA parser)
 * sensorRegistry.update('depth', 0, { depth: 2.5, offset: 0.3 });
 *
 * // Subscribe to specific metric (from React component)
 * const unsubscribe = sensorRegistry.subscribe('depth', 0, 'depth', () => {
 *   // Re-render when depth metric changes
 * });
 *
 * // Get sensor instance (from services)
 * const sensor = sensorRegistry.get('depth', 0);
 * const depthMetric = sensor?.getMetric('depth');
 * ```
 *
 * **For AI Agents:**
 * This is the foundation of the new architecture. All sensor data lives here.
 * React components subscribe via MetricProvider, services query directly.
 * Replaces the old pattern of storing sensors in nmeaStore.
 */

import { EventEmitter } from 'events';
import { SensorInstance } from '../types/SensorInstance';
import { useNmeaStore } from '../store/nmeaStore';
import { log } from '../utils/logging/logger';

import type { SensorType, SensorData, Alarm, AlarmLevel } from '../types/SensorData';

/**
 * Subscription callback type
 */
type SubscriptionCallback = () => void;

/**
 * Sensor Data Registry
 * Pure JavaScript storage for all sensor instances
 */
export class SensorDataRegistry {
  private sensors = new Map<string, SensorInstance>();
  private subscriptions = new Map<string, Set<SubscriptionCallback>>();
  private eventEmitter = new EventEmitter();

  /**
   * Generate unique key for sensor
   */
  private getKey(sensorType: SensorType, instance: number): string {
    return `${sensorType}:${instance}`;
  }

  /**
   * Generate unique key for metric subscription
   */
  private getMetricKey(sensorType: SensorType, instance: number, metricKey: string): string {
    return `${sensorType}:${instance}:${metricKey}`;
  }

  /**
   * Get sensor instance
   *
   * @param sensorType - Sensor type (e.g., 'depth', 'battery')
   * @param instance - Instance number (0-based)
   * @returns SensorInstance or null if not found
   */
  get(sensorType: SensorType, instance: number): SensorInstance | null {
    const key = this.getKey(sensorType, instance);
    return this.sensors.get(key) || null;
  }

  /**
   * Get all sensor instances (for coordinators)
   *
   * @returns Array of all sensor instances
   */
  getAllSensors(): SensorInstance[] {
    return Array.from(this.sensors.values());
  }

  /**
   * Update sensor data
   * Creates sensor if doesn't exist, updates metrics, evaluates alarms,
   * calculates cross-sensor data, and notifies subscribers.
   *
   * @param sensorType - Sensor type
   * @param instance - Instance number
   * @param data - Partial sensor data to update
   */
  update(sensorType: SensorType, instance: number, data: Partial<SensorData>): void {
    const key = this.getKey(sensorType, instance);
    const isNew = !this.sensors.has(key);

    // Get or create sensor instance
    let sensor = this.sensors.get(key);
    if (!sensor) {
      sensor = new SensorInstance(sensorType, instance);
      this.sensors.set(key, sensor);

      log.storeInit(`🆕 NEW SENSOR: ${sensorType}[${instance}]`, () => ({
        sensorType,
        instance,
      }));
    }

    // Update metrics - returns array of changed metric keys
    const changedMetrics = sensor.updateMetrics(data);

    // Only proceed if metrics actually changed
    if (changedMetrics.length === 0 && !isNew) {
      return;
    }

    // Cross-sensor calculations (true wind)
    if (sensorType === 'wind' && changedMetrics.length > 0) {
      this.calculateTrueWind(sensor);
    }

    // Evaluate alarms globally (all sensors, all metrics)
    const alarms = this.evaluateAlarms();

    // Update nmeaStore with alarms (UI state)
    useNmeaStore.getState().setAlarms(alarms);

    // Notify subscribers of changed metrics
    for (const metricKey of changedMetrics) {
      const metricSubKey = this.getMetricKey(sensorType, instance, metricKey);
      const subscribers = this.subscriptions.get(metricSubKey);
      if (subscribers && subscribers.size > 0) {
        subscribers.forEach((callback) => callback());
      }
    }

    // Emit sensor created event (for widget detection)
    if (isNew) {
      this.eventEmitter.emit('sensorCreated', {
        sensorType,
        instance,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Subscribe to metric changes
   * Callback is invoked when the specific metric value changes.
   *
   * @param sensorType - Sensor type
   * @param instance - Instance number
   * @param metricKey - Metric field name (e.g., 'depth', 'voltage')
   * @param callback - Function to call when metric changes
   * @returns Unsubscribe function
   */
  subscribe(
    sensorType: SensorType,
    instance: number,
    metricKey: string,
    callback: SubscriptionCallback,
  ): () => void {
    const metricKey = this.getMetricKey(sensorType, instance, metricKey);

    if (!this.subscriptions.has(metricKey)) {
      this.subscriptions.set(metricKey, new Set());
    }

    this.subscriptions.get(metricKey)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscriptions.get(metricKey);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscriptions.delete(metricKey);
        }
      }
    };
  }

  /**
   * Subscribe to registry events
   *
   * Events:
   * - 'sensorCreated': { sensorType, instance, timestamp }
   * - 'threshold-update': { sensorType, instance }
   *
   * @param event - Event name
   * @param handler - Event handler
   */
  on(event: string, handler: (...args: any[]) => void): void {
    this.eventEmitter.on(event, handler);
  }

  /**
   * Unsubscribe from registry events
   *
   * @param event - Event name
   * @param handler - Event handler to remove
   */
  off(event: string, handler: (...args: any[]) => void): void {
    this.eventEmitter.off(event, handler);
  }

  /**
   * Calculate true wind from apparent wind + boat speed + heading
   * Cross-sensor dependency: wind sensor uses GPS and compass data
   *
   * @param windSensor - Wind sensor instance
   */
  private calculateTrueWind(windSensor: SensorInstance): void {
    const gps = this.get('gps', 0);
    const compass = this.get('compass', 0);

    if (!gps || !compass) {
      log.wind('Missing GPS or compass instance for true wind calculation');
      return;
    }

    log.wind('Calculating true wind', () => ({
      hasGPS: !!gps,
      hasCompass: !!compass,
    }));

    // Call private method (TODO: make this public API in SensorInstance)
    (windSensor as any)._maybeCalculateTrueWind(gps, compass);
  }

  /**
   * Evaluate alarms from all sensor instances
   * Returns array of active alarms (warning + critical)
   *
   * @returns Array of alarms
   */
  private evaluateAlarms(): Alarm[] {
    const alarms: Alarm[] = [];
    const now = Date.now();

    for (const [key, sensorInstance] of this.sensors) {
      // Get all metric keys from history (TODO: use public API)
      const historyMap = (sensorInstance as any)._history as Map<string, any>;
      if (!historyMap || historyMap.size === 0) continue;

      // Check alarm state for each metric
      for (const metricKey of historyMap.keys()) {
        const alarmLevel = sensorInstance.getAlarmState(metricKey);

        // AlarmLevel: 0=NONE, 1=STALE, 2=WARNING, 3=CRITICAL
        if (alarmLevel >= 2) {
          const level: AlarmLevel = alarmLevel === 3 ? 'critical' : 'warning';

          alarms.push({
            id: `${key}.${metricKey}`,
            message: `${key}.${metricKey}: ${level.toUpperCase()}`,
            level,
            timestamp: now,
          });
        }
      }
    }

    return alarms;
  }

  /**
   * Destroy all sensors and cleanup
   * Called on factory reset
   */
  destroy(): void {
    for (const sensor of this.sensors.values()) {
      try {
        sensor.destroy();
      } catch (error) {
        log.app('Error destroying sensor instance', () => ({
          sensorType: sensor.sensorType,
          instance: sensor.instance,
          error: error instanceof Error ? error.message : String(error),
        }));
      }
    }

    this.sensors.clear();
    this.subscriptions.clear();
    this.eventEmitter.removeAllListeners();

    log.app('SensorDataRegistry destroyed - all sensors cleared');
  }
}

/**
 * Global singleton instance
 * Use this throughout the app for sensor data access
 */
export const sensorRegistry = new SensorDataRegistry();
