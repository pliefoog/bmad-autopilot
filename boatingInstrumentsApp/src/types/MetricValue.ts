/**
 * MetricValue - Single Metric Encapsulation
 *
 * **Purpose:**
 * Encapsulates a single sensor metric with its SI value, category,
 * and enriched display values. Provides automatic conversion and
 * formatting through ConversionRegistry.
 *
 * **Architecture:**
 * - Immutable SI value (set once at construction)
 * - Mutable display fields (set by enrich())
 * - Automatic enrichment via ConversionRegistry
 * - Alarm state caching with version tracking
 * - Serialization support for Zustand persistence
 *
 * **Usage:**
 * ```typescript
 * // Create and enrich
 * const metric = new MetricValue(2.5, 'depth');
 * metric.enrich(); // Populates display fields
 *
 * // Access enriched values
 * console.log(metric.formattedValue);        // "8.2"
 * console.log(metric.formattedValueWithUnit); // "8.2 ft"
 * console.log(metric.value);            // 8.202
 * console.log(metric.unit);             // "ft"
 *
 * // Manual conversions
 * const displayValue = metric.convertToDisplay(3.0); // 9.84 ft
 * const siValue = metric.convertToSI(10.0);          // 3.048 m
 *
 * // Alarm checking
 * const alarmState = metric.getAlarmState(thresholds, version);
 * ```
 *
 * **Benefits:**
 * - ✅ Single source of truth for metric + display
 * - ✅ Automatic enrichment (no manual calls needed)
 * - ✅ Type-safe conversions
 * - ✅ Alarm state caching
 * - ✅ Serializable for persistence
 */

import { DataCategory } from '../presentation/categories';
import { ConversionRegistry } from '../utils/ConversionRegistry';
import { AppError } from '../utils/AppError';
import { log } from '../utils/logging/logger';

/**
 * Alarm state for a metric
 */
export interface AlarmState {
  level: 'none' | 'warning' | 'critical';
  message?: string;
  threshold?: number; // SI units
}

/**
 * Threshold configuration for a metric
 */
export interface MetricThresholds {
  critical?: number; // SI units
  warning?: number; // SI units
  direction?: 'above' | 'below';
  enabled: boolean;
}

/**
 * MetricValue - Encapsulates single sensor metric
 *
 * Stores SI value + enriched display values.
 * Provides conversion methods and alarm checking.
 */
export class MetricValue {
  // Immutable core data (set at construction)
  readonly si_value: number | string; // Value in SI units (number) or raw string metadata
  readonly category?: DataCategory; // Data category (required for numeric, optional for strings)

  // Enriched display values (only for numeric values)
  value?: number; // Display value (converted from SI) - undefined for strings
  unit?: string; // Unit symbol (e.g., "ft", "°C", "V") - undefined for strings
  formattedValue: string = '---'; // Formatted WITHOUT unit (e.g., "8.2") or raw string
  formattedValueWithUnit: string = '---'; // Formatted WITH unit (e.g., "8.2 ft") or raw string

  // Cached alarm state (only for numeric values)
  private _alarmState?: AlarmState;
  private _alarmVersion?: number;

  /**
   * Create MetricValue with SI value and optional category
   *
   * For numeric metrics:
   * @param si_value - Value in SI units (must be finite)
   * @param category - Data category for conversion (required)
   *
   * For string metadata:
   * @param si_value - String value (location, name, etc.)
   * @param category - Omit for string values
   *
   * @throws AppError if numeric si_value is not finite
   */
  constructor(si_value: number | string, category?: DataCategory) {
    // Validation for numeric values
    if (typeof si_value === 'number' && !Number.isFinite(si_value)) {
      throw new AppError(
        'INVALID_SI_VALUE',
        `MetricValue: numeric si_value must be finite, got ${si_value} for category ${category}`,
        'Invalid sensor reading',
      );
    }

    this.si_value = si_value;
    this.category = category;

    // For string values, set formattedValue immediately
    if (typeof si_value === 'string') {
      this.formattedValue = si_value;
      this.formattedValueWithUnit = si_value;
    }

    log.app('MetricValue created', () => ({
      si_value,
      category,
      type: typeof si_value,
    }));
  }

  /**
   * Enrich with display values
   * Called automatically by SensorInstance after creation
   *
   * For numeric values: Converts SI → display and formats according to user preferences
   * For string values: Already formatted in constructor, this is a no-op
   *
   * @throws AppError if conversion fails for numeric values
   */
  enrich(): void {
    // Skip enrichment for string values (already set in constructor)
    if (typeof this.si_value === 'string') {
      return;
    }

    // Require category for numeric values
    if (!this.category) {
      throw new AppError(
        'MISSING_CATEGORY',
        `MetricValue: category required for numeric values`,
        'Configuration error',
      );
    }

    try {
      // Convert SI to display units
      this.value = ConversionRegistry.convertToDisplay(this.si_value, this.category);

      // Get unit symbol
      this.unit = ConversionRegistry.getUnit(this.category);

      // Format without unit
      this.formattedValue = ConversionRegistry.format(this.value, this.category, false);

      // Format with unit
      this.formattedValueWithUnit = ConversionRegistry.format(this.value, this.category, true);

      log.app('MetricValue enriched', () => ({
        si: this.si_value,
        display: this.value,
        formatted: this.formattedValueWithUnit,
        category: this.category,
      }));
    } catch (error) {
      if (error instanceof AppError) {
        error.logError();
      }
      throw error; // Re-throw for fail-fast
    }
  }

  /**
   * Convert SI value to display value
   * Helper for manual conversions (e.g., in dialogs)
   *
   * @param siValue - Value in SI units
   * @returns Value in display units
   * @throws AppError if called on string MetricValue
   */
  convertToDisplay(siValue: number): number {
    if (!this.isNumeric() || !this.category) {
      throw new AppError(
        'INVALID_OPERATION',
        'MetricValue.convertToDisplay: Conversion only supported for numeric MetricValues',
        'Cannot convert non-numeric value',
      );
    }
    return ConversionRegistry.convertToDisplay(siValue, this.category);
  }

  /**
   * Type guard: Check if this is a numeric MetricValue
   *
   * @returns true if si_value is numeric, false if string
   */
  isNumeric(): this is MetricValue & {
    si_value: number;
    value: number;
    unit: string;
    category: DataCategory;
  } {
    return typeof this.si_value === 'number';
  }

  /**
   * Type guard: Check if this is a string MetricValue
   *
   * @returns true if si_value is string, false if numeric
   */
  isString(): this is MetricValue & { si_value: string } {
    return typeof this.si_value === 'string';
  }

  /**
   * Convert display value to SI value
   * Helper for manual conversions (e.g., saving thresholds)
   *
   * @param displayValue - Value in display units
   * @returns Value in SI units
   * @throws AppError if called on string MetricValue
   */
  convertToSI(displayValue: number): number {
    if (!this.isNumeric() || !this.category) {
      throw new AppError(
        'INVALID_OPERATION',
        'MetricValue.convertToSI: Conversion only supported for numeric MetricValues',
        'Cannot convert non-numeric value',
      );
    }
    return ConversionRegistry.convertToSI(displayValue, this.category);
  }

  /**
   * Get alarm state for this metric
   * Caches result with version tracking for performance
   *
   * @param thresholds - Threshold configuration
   * @param version - Threshold version (from SensorInstance)
   * @returns Alarm state (always 'none' for string MetricValues)
   */
  getAlarmState(thresholds: MetricThresholds, version: number): AlarmState {
    // String MetricValues don't have alarms
    if (!this.isNumeric()) {
      return { level: 'none' };
    }

    // Return cached if version matches
    if (this._alarmState && this._alarmVersion === version) {
      return this._alarmState;
    }

    // Recalculate
    this._alarmState = this._calculateAlarmState(thresholds);
    this._alarmVersion = version;

    return this._alarmState;
  }

  /**
   * Calculate alarm state (internal)
   */
  private _calculateAlarmState(thresholds: MetricThresholds): AlarmState {
    // Should never be called on string MetricValues (guarded by getAlarmState)
    if (!this.isNumeric()) {
      return { level: 'none' };
    }

    if (!thresholds.enabled) {
      return { level: 'none' };
    }

    const { critical, warning, direction = 'above' } = thresholds;
    const numericValue = this.si_value; // Type-narrowed to number

    // Check critical threshold
    if (critical !== undefined) {
      const inCritical = direction === 'above' ? numericValue > critical : numericValue < critical;

      if (inCritical) {
        return {
          level: 'critical',
          message: `${this.formattedValueWithUnit} ${direction} critical threshold`,
          threshold: critical,
        };
      }
    }

    // Check warning threshold
    if (warning !== undefined) {
      const inWarning = direction === 'above' ? numericValue > warning : numericValue < warning;

      if (inWarning) {
        return {
          level: 'warning',
          message: `${this.formattedValueWithUnit} ${direction} warning threshold`,
          threshold: warning,
        };
      }
    }

    return { level: 'none' };
  }

  /**
   * Serialize for Zustand persistence
   * Returns plain object that can be JSON.stringify'd
   */
  toJSON(): any {
    return {
      si_value: this.si_value,
      category: this.category,
      value: this.value,
      unit: this.unit,
      formattedValue: this.formattedValue,
      formattedValueWithUnit: this.formattedValueWithUnit,
    };
  }

  /**
   * Deserialize from Zustand persistence
   * Reconstructs MetricValue from plain object
   *
   * @param plain - Plain object from JSON.parse
   * @returns Reconstructed MetricValue
   */
  static fromPlain(plain: any): MetricValue {
    const metric = new MetricValue(plain.si_value, plain.category);

    // Restore enriched values
    metric.value = plain.value;
    metric.unit = plain.unit;
    metric.formattedValue = plain.formattedValue;
    metric.formattedValueWithUnit = plain.formattedValueWithUnit;

    return metric;
  }
}
