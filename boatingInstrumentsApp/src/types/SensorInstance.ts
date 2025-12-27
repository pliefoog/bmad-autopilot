/**
 * SensorInstance - Complete Sensor Lifecycle Management
 *
 * **Purpose:**
 * Manages a single sensor instance with its metrics, history, thresholds,
 * and automatic enrichment. This is the SINGLE SOURCE OF TRUTH for all
 * sensor data in the application.
 *
 * **Architecture:**
 * - Stores Map of MetricValue instances (one per data field)
 * - Automatic enrichment on data updates
 * - History management with plain objects (not class instances)
 * - Threshold management with alarm evaluation
 * - Serialization support for Zustand persistence
 * - Subscription to presentation changes (re-enrichment)
 *
 * **Usage:**
 * ```typescript
 * // Create new sensor instance
 * const instance = new SensorInstance('depth', 0, thresholds);
 *
 * // Update metrics (automatic enrichment)
 * instance.updateMetrics({ depth: 2.5, offset: 0.3 });
 *
 * // Access enriched metric
 * const depthMetric = instance.getMetric('depth');
 * console.log(depthMetric?.formattedValue); // "8.2"
 *
 * // Get history (plain objects)
 * const history = instance.getHistoryForMetric('depth', 5 * 60 * 1000);
 *
 * // Check alarm state
 * const alarmState = instance.getAlarmState('depth');
 *
 * // Re-enrich on presentation change
 * instance.reEnrich();
 *
 * // Cleanup
 * instance.destroy();
 * ```
 *
 * **Benefits:**
 * - ✅ Single source of truth for sensor + metrics + alarms
 * - ✅ Automatic enrichment (no manual calls)
 * - ✅ Type-safe metric access
 * - ✅ History with display values included
 * - ✅ Alarm state caching with version tracking
 * - ✅ Serializable for persistence
 */

import { MetricValue, AlarmState, MetricThresholds } from './MetricValue';
import { SensorType, SensorData, SensorAlarmThresholds } from './SensorData';
import { TimeSeriesBuffer } from '../utils/memoryStorageManagement';
import { getAlarmFields, getConfigFields, getDataFields } from '../registry/SensorConfigRegistry';
import { log } from '../utils/logging/logger';
import { AppError } from '../utils/AppError';

/**
 * History point with all display values (plain object, not class)
 * Stored in history buffer for chart rendering
 */
export interface HistoryPoint {
  si_value: number;
  value: number; // Display value
  formattedValue: string; // Without unit
  formattedValueWithUnit: string; // With unit
  unit: string;
  timestamp: number;
}

/**
 * SensorInstance - Manages complete sensor lifecycle
 *
 * Generic over sensor data type for type safety
 */
export class SensorInstance<T extends SensorData = SensorData> {
  // Immutable identification
  readonly type: SensorType;
  readonly instance: number;

  // Metric storage (Map for fast lookup)
  private _metrics: Map<string, MetricValue> = new Map();

  // History storage (Map of buffers, one per metric)
  private _history: Map<string, TimeSeriesBuffer<HistoryPoint>> = new Map();

  // Threshold management
  private _thresholds: SensorAlarmThresholds;
  private _thresholdVersion: number = 0;

  // Metadata
  name: string;
  timestamp: number;
  context?: any;

  /**
   * Get current thresholds (read-only access)
   */
  get thresholds(): SensorAlarmThresholds {
    return this._thresholds;
  }

  /**
   * Create sensor instance
   *
   * @param type - Sensor type (e.g., 'depth', 'battery', 'engine')
   * @param instance - Instance number (0-based)
   * @param thresholds - Initial threshold configuration
   */
  constructor(type: SensorType, instance: number, thresholds: SensorAlarmThresholds) {
    this.type = type;
    this.instance = instance;
    this._thresholds = thresholds;
    this.name = thresholds.name || `${type}-${instance}`;
    this.timestamp = Date.now();

    log.app('SensorInstance created', () => ({
      type,
      instance,
      name: this.name,
    }));
  }

  /**
   * Update metrics from parsed NMEA data
   * Creates MetricValue instances and auto-enriches
   * Handles both numeric metrics (with conversion/formatting) and string metadata (location, name, etc.)
   *
   * @param data - Partial sensor data with SI values or string metadata
   *
   * @example
   * instance.updateMetrics({ depth: 2.5, offset: 0.3 });
   * instance.updateMetrics({ value: 23.5, location: 'engine', units: 'C' });
   * 
   * @returns true if any metric values changed, false if all values are the same
   */
  updateMetrics(data: Partial<T>): boolean {
    const fields = [...getDataFields(this.type), ...getConfigFields(this.type)];
    let hasChanges = false;

    for (const field of fields) {
      const fieldName = field.key;
      // Check both field.key and field.hardwareField for incoming data
      const dataKey = field.hardwareField || fieldName;
      const fieldValue = (data as any)[dataKey];

      // Process numeric MetricValues
      if (fieldValue !== undefined && Number.isFinite(fieldValue)) {
        try {
          // Check if value changed
          const existingMetric = this._metrics.get(fieldName);
          const valueChanged = !existingMetric || existingMetric.si_value !== fieldValue;
          
          if (valueChanged) {
            hasChanges = true;
          }

          // Create numeric MetricValue with or without category
          const metric = new MetricValue(fieldValue, field.category);

          // Automatic enrichment (only if category exists)
          if (field.category) {
            metric.enrich();
          } else {
            // Raw numeric value without conversion (e.g., tank level 0.0-1.0, battery SOC 0-100%)
            // Set display values same as SI value
            metric.value = fieldValue;
            metric.unit = '';
            metric.formattedValue = fieldValue.toFixed(1);
            metric.formattedValueWithUnit = fieldValue.toFixed(1);
          }

          // Store metric using field.key (not hardwareField)
          this._metrics.set(fieldName, metric);

          // Add to history only if changed
          if (valueChanged) {
            this._addToHistory(fieldName, metric);
          }
        } catch (error) {
          log.app('ERROR in updateMetrics (numeric)', () => ({
            fieldName,
            dataKey,
            error: error instanceof Error ? error.message : String(error),
          }));
          if (error instanceof AppError) {
            error.logError();
          }
          // Continue processing other metrics even if one fails
        }
      }
      // Process string MetricValues (metadata like location, units, name)
      else if (fieldValue !== undefined && typeof fieldValue === 'string') {
        try {
          // Check if value changed
          const existingMetric = this._metrics.get(fieldName);
          const valueChanged = !existingMetric || existingMetric.si_value !== fieldValue;
          
          if (valueChanged) {
            hasChanges = true;
          }

          // Create string MetricValue (no category, no enrichment needed)
          const metric = new MetricValue(fieldValue, undefined); // undefined category for strings

          // Store metric using field.key
          this._metrics.set(fieldName, metric);
        } catch (error) {
          log.app('ERROR in updateMetrics (string)', () => ({
            fieldName,
            dataKey,
            error: error instanceof Error ? error.message : String(error),
          }));
          // Continue processing other metrics
        }
      }
    }

    this.timestamp = Date.now();

    log.app('Metrics updated', () => ({
      type: this.type,
      instance: this.instance,
      metricCount: this._metrics.size,
      fields: Array.from(this._metrics.keys()),
      hasChanges,
    }));

    return hasChanges;
  }

  /**
   * Get metric by field name
   *
   * @param fieldName - Field name (e.g., 'depth', 'voltage', 'temperature')
   * @returns MetricValue or undefined
   *
   * @example
   * const depth = instance.getMetric('depth');
   * console.log(depth?.formattedValue); // "8.2"
   */
  getMetric(fieldName: string): MetricValue | undefined {
    return this._metrics.get(fieldName);
  }

  /**
   * Get all metrics as plain object
   * Useful for widgets that need multiple fields
   *
   * @returns Record of field name → MetricValue
   *
   * @example
   * const metrics = instance.getAllMetrics();
   * console.log(metrics.voltage?.formattedValue); // "12.6"
   * console.log(metrics.current?.formattedValue); // "-5.2"
   */
  getAllMetrics(): Record<string, MetricValue> {
    return Object.fromEntries(this._metrics.entries());
  }

  /**
   * Get history for specific metric
   * Returns plain objects (not class instances) for performance
   *
   * @param fieldName - Field name
   * @param timeWindowMs - Optional time window in milliseconds
   * @returns Array of history points with display values
   *
   * @example
   * const history = instance.getHistoryForMetric('depth', 5 * 60 * 1000);
   * history.forEach(point => {
   *   console.log(point.formattedValue); // "8.2"
   *   console.log(point.timestamp);
   * });
   */
  getHistoryForMetric(fieldName: string, timeWindowMs?: number): HistoryPoint[] {
    const buffer = this._history.get(fieldName);
    if (!buffer) return [];

    // TimeSeriesBuffer returns { timestamp, value } where value is our HistoryPoint
    const points = buffer.getAll().map((p) => p.value);

    if (timeWindowMs) {
      const cutoff = Date.now() - timeWindowMs;
      return points.filter((p) => p.timestamp >= cutoff);
    }

    return points;
  }

  /**
   * Update thresholds and increment version
   * Increments version to invalidate alarm cache
   *
   * @param thresholds - Partial threshold updates
   *
   * @example
   * instance.updateThresholds({
   *   critical: 10.0,  // SI units
   *   warning: 8.0,
   *   direction: 'below'
   * });
   */
  updateThresholds(thresholds: Partial<SensorAlarmThresholds>): void {
    this._thresholds = { ...this._thresholds, ...thresholds };
    this._thresholdVersion++;

    log.app('Thresholds updated', () => ({
      type: this.type,
      instance: this.instance,
      version: this._thresholdVersion,
      thresholds: this._thresholds,
    }));
  }

  /**
   * Get alarm state for specific metric
   * Uses cached alarm state from MetricValue
   *
   * @param metricName - Metric field name
   * @returns Alarm state
   *
   * @example
   * const alarmState = instance.getAlarmState('voltage');
   * if (alarmState.level === 'critical') {
   *   console.log(alarmState.message);
   * }
   */
  getAlarmState(metricName: string): AlarmState {
    const metric = this._metrics.get(metricName);
    if (!metric) {
      return { level: 'none' };
    }

    // Get threshold config (single-metric or multi-metric)
    const thresholdConfig: MetricThresholds = this._thresholds.metrics?.[metricName] || {
      critical: this._thresholds.critical,
      warning: this._thresholds.warning,
      direction: this._thresholds.direction,
      enabled: this._thresholds.enabled,
    };

    return metric.getAlarmState(thresholdConfig, this._thresholdVersion);
  }

  /**
   * Re-enrich all metrics
   * Called by ReEnrichmentCoordinator on presentation change
   *
   * @example
   * // User changes units from meters to feet
   * instance.reEnrich(); // All metrics re-enrich automatically
   */
  reEnrich(): void {
    for (const metric of this._metrics.values()) {
      metric.enrich();
    }

    log.app('Re-enriched all metrics', () => ({
      type: this.type,
      instance: this.instance,
      count: this._metrics.size,
    }));
  }

  /**
   * Add metric to history (internal)
   * Creates plain object (not class instance) for performance
   */
  private _addToHistory(fieldName: string, metric: MetricValue): void {
    // Only track numeric MetricValues in history
    if (!metric.isNumeric()) {
      return;
    }

    if (!this._history.has(fieldName)) {
      // Create buffer with 100 recent points, 100 old points, 60s threshold, 10x decimation
      this._history.set(fieldName, new TimeSeriesBuffer<HistoryPoint>(100, 100, 60000, 10));
    }

    const buffer = this._history.get(fieldName)!;
    const timestamp = Date.now();

    buffer.add(
      {
        si_value: metric.si_value,
        value: metric.value!,
        formattedValue: metric.formattedValue,
        formattedValueWithUnit: metric.formattedValueWithUnit,
        unit: metric.unit!,
        timestamp: timestamp,
      },
      timestamp,
    );
  }

  /**
   * Serialize for Zustand persistence
   * Returns plain object that can be JSON.stringify'd
   */
  toJSON(): any {
    return {
      type: this.type,
      instance: this.instance,
      name: this.name,
      timestamp: this.timestamp,
      context: this.context,
      metrics: Object.fromEntries(
        Array.from(this._metrics.entries()).map(([k, v]) => [k, v.toJSON()]),
      ),
      thresholds: this._thresholds,
      thresholdVersion: this._thresholdVersion,
      // Note: History not persisted (regenerates on reconnect)
    };
  }

  /**
   * Deserialize from Zustand persistence
   * Reconstructs SensorInstance from plain object
   *
   * @param plain - Plain object from JSON.parse
   * @returns Reconstructed SensorInstance
   */
  static fromPlain<T extends SensorData = SensorData>(plain: any): SensorInstance<T> {
    const instance = new SensorInstance<T>(plain.type, plain.instance, plain.thresholds);

    instance.name = plain.name;
    instance.timestamp = plain.timestamp;
    instance.context = plain.context;
    instance._thresholdVersion = plain.thresholdVersion;

    // Restore metrics
    if (plain.metrics) {
      for (const [fieldName, metricPlain] of Object.entries(plain.metrics)) {
        instance._metrics.set(fieldName, MetricValue.fromPlain(metricPlain));
      }
    }

    return instance;
  }

  /**
   * Cleanup method
   * Called on factory reset or sensor removal
   *
   * @example
   * instance.destroy();
   */
  destroy(): void {
    this._metrics.clear();
    this._history.clear();

    log.app('SensorInstance destroyed', () => ({
      type: this.type,
      instance: this.instance,
    }));
  }
}
