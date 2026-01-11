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
 * - ✅ Calculated metrics via CalculatedMetricsService (dewPoint, ROT, true wind)
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
 * Integrates CalculatedMetricsService for cross-sensor calculations.
 */

import { EventEmitter } from 'events';
import { SensorInstance } from '../types/SensorInstance';
import { useNmeaStore } from '../store/nmeaStore';
import { log } from '../utils/logging/logger';
import { AlarmEvaluator } from './AlarmEvaluator';
import { CalculatedMetricsService } from './CalculatedMetricsService';

import type { SensorType, SensorData } from '../types/SensorData';

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
  private alarmEvaluator: AlarmEvaluator;
  private calculatedMetricsService: CalculatedMetricsService;
  private alarmEvaluationDebounceTimer: NodeJS.Timeout | null = null;
  private lastAlarmEvaluationTime = 0;
  private readonly ALARM_DEBOUNCE_MS = 1000; // Evaluate alarms max once per second
  private readonly ALARM_MAX_DELAY_MS = 5000; // Force evaluation after 5 seconds max
  private destroyed = false;

  constructor() {
    this.alarmEvaluator = new AlarmEvaluator(this);
    this.calculatedMetricsService = new CalculatedMetricsService(this);
    // Prevent EventEmitter warnings - we may have many widget subscriptions
    this.eventEmitter.setMaxListeners(100);
  }

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
    // Prevent use-after-free: Don't process updates after destroy
    if (this.destroyed) {
      log.app('⚠️ Ignoring update after registry destroyed', () => ({ sensorType, instance }));
      return;
    }

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

    // Update metrics - returns { changed, changedMetrics }
    const updateResult = sensor.updateMetrics(data);
    const { changed: hasChanges, changedMetrics } = updateResult;

    // Only proceed if metrics actually changed
    if (!hasChanges && !isNew) {
      return;
    }

    // Calculate derived metrics (dewPoint, ROT, true wind)
    // Service returns Map<fieldName, MetricValue> of calculated metrics
    let calculatedMetrics: Map<string, any>;
    try {
      calculatedMetrics = this.calculatedMetricsService.compute(sensor, changedMetrics);
    } catch (error) {
      log.app('❌ Error computing calculated metrics', () => ({
        sensorType,
        instance,
        error: error instanceof Error ? error.message : String(error),
      }));
      calculatedMetrics = new Map(); // Continue with empty map
    }
    
    // Store calculated metrics in sensor history
    for (const [fieldName, metric] of calculatedMetrics.entries()) {
      try {
        sensor.addCalculatedMetric(fieldName, metric);
        
        // Track calculated metrics as changed (for notification)
        changedMetrics.add(fieldName);
        
        // Notify subscribers of calculated metrics (with error isolation)
        const metricSubKey = this.getMetricKey(sensorType, instance, fieldName);
        const subscribers = this.subscriptions.get(metricSubKey);
        if (subscribers && subscribers.size > 0) {
          this.notifySubscribers(subscribers, sensorType, instance, fieldName);
        }
      } catch (error) {
        log.app('❌ Error storing calculated metric', () => ({
          sensorType,
          instance,
          fieldName,
          error: error instanceof Error ? error.message : String(error),
        }));
      }
    }

    // Debounced alarm evaluation (max once per second)
    // Prevents excessive alarm checks when multiple sensors update rapidly
    this.scheduleAlarmEvaluation();

    // Notify ONLY the subscribers for metrics that actually changed
    // This prevents unnecessary re-renders when other metrics haven't changed
    for (const metricKey of changedMetrics) {
      const metricSubKey = this.getMetricKey(sensorType, instance, metricKey);
      const subscribers = this.subscriptions.get(metricSubKey);
      if (subscribers && subscribers.size > 0) {
        this.notifySubscribers(subscribers, sensorType, instance, metricKey);
      }
      
      // ALSO notify virtual stat metric subscribers (e.g., depth.min, depth.max, depth.avg)
      // Virtual metrics depend on the base metric's history, so they change when base changes
      const virtualStats = ['min', 'max', 'avg'];
      for (const stat of virtualStats) {
        const virtualMetricKey = `${metricKey}.${stat}`;
        const virtualSubKey = this.getMetricKey(sensorType, instance, virtualMetricKey);
        const virtualSubscribers = this.subscriptions.get(virtualSubKey);
        if (virtualSubscribers && virtualSubscribers.size > 0) {
          this.notifySubscribers(virtualSubscribers, sensorType, instance, virtualMetricKey);
        }
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
   * Schedule debounced alarm evaluation
   * Coalesces multiple rapid sensor updates into single alarm check
   * Enforces max delay to prevent infinite rescheduling
   * @private
   */
  private scheduleAlarmEvaluation(): void {
    if (this.destroyed) return;

    const now = Date.now();
    const timeSinceLastEval = now - this.lastAlarmEvaluationTime;
    
    // Force evaluation if max delay exceeded (prevents infinite reschedule)
    if (timeSinceLastEval >= this.ALARM_MAX_DELAY_MS) {
      this.executeAlarmEvaluation();
      return;
    }

    // Clear existing timer
    if (this.alarmEvaluationDebounceTimer) {
      clearTimeout(this.alarmEvaluationDebounceTimer);
    }

    // Schedule new evaluation
    this.alarmEvaluationDebounceTimer = setTimeout(() => {
      this.executeAlarmEvaluation();
    }, this.ALARM_DEBOUNCE_MS);
  }

  /**
   * Execute alarm evaluation with error handling
   * @private
   */
  private executeAlarmEvaluation(): void {
    if (this.destroyed) return;

    try {
      const alarms = this.alarmEvaluator.evaluate();
      useNmeaStore.getState().updateAlarms(alarms);
      this.lastAlarmEvaluationTime = Date.now();
    } catch (error) {
      log.app('❌ Alarm evaluation failed', () => ({
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }));
    } finally {
      this.alarmEvaluationDebounceTimer = null;
    }
  }

  /**
   * Notify subscribers with error isolation
   * If one callback throws, others still execute
   * @private
   */
  private notifySubscribers(
    subscribers: Set<SubscriptionCallback>,
    sensorType: SensorType,
    instance: number,
    metricKey: string,
  ): void {
    subscribers.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        log.app('❌ Subscriber callback error', () => ({
          sensorType,
          instance,
          metricKey,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        }));
      }
    });
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
    metricName: string,
    callback: SubscriptionCallback,
  ): () => void {
    // Input validation
    if (typeof callback !== 'function') {
      throw new Error('Subscription callback must be a function');
    }
    if (typeof sensorType !== 'string' || sensorType.length === 0) {
      throw new Error('Sensor type must be a non-empty string');
    }
    if (!Number.isInteger(instance) || instance < 0) {
      throw new Error('Instance must be a non-negative integer');
    }
    if (typeof metricName !== 'string' || metricName.length === 0) {
      throw new Error('Metric name must be a non-empty string');
    }

    const metricKey = this.getMetricKey(sensorType, instance, metricName);

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
   * Destroy all sensors and cleanup
   * Called on factory reset
   */
  destroy(): void {
    // Prevent double-destroy
    if (this.destroyed) {
      log.app('⚠️ Registry already destroyed, ignoring');
      return;
    }
    this.destroyed = true;

    // Cancel pending alarm evaluation
    if (this.alarmEvaluationDebounceTimer) {
      clearTimeout(this.alarmEvaluationDebounceTimer);
      this.alarmEvaluationDebounceTimer = null;
    }

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
