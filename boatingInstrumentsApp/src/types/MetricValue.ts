/**
 * MetricValue - Minimal Storage with Optional Unit Type
 *
 * **Architecture:**
 * - Stores: si_value (8 bytes) + timestamp (8 bytes) + unitType (optional)
 * - Display values computed on-demand (lazy getters) OR at construction if unitType provided
 * - No persistence methods (toJSON/fromPlain removed)
 * - No alarm state storage (moved to SensorInstance)
 *
 * **Usage:**
 * ```typescript
 * // With unitType (enriched at construction)
 * const metric = new MetricValue(2.5, Date.now(), 'depth');
 * const formatted = metric.getFormattedValue(); // "8.2" (pre-computed)
 *
 * // Without unitType (lazy computation)
 * const metric = new MetricValue(2.5, Date.now());
 * const display = metric.getDisplayValue('depth'); // 8.202 (computed on-demand)
 * ```
 *
 * **NaN Handling:**
 * - NaN is valid sentinel for "no valid reading"
 * - Display values return "---" for NaN
 */

import { DataCategory } from '../presentation/categories';
import { ConversionRegistry } from '../utils/ConversionRegistry';

/**
 * MetricValue - Minimal metric storage
 *
 * Stores SI value, timestamp, and optional unitType.
 * Display values computed on-demand or at construction if unitType provided.
 */
export class MetricValue {
  /** Value in SI units (number or NaN for "no reading") */
  readonly si_value: number;
  
  /** Timestamp in ms */
  readonly timestamp: number;

  /** Unit type for this metric (optional) */
  private _unitType?: DataCategory;

  /**
   * Create MetricValue
   *
   * @param si_value - Value in SI units (can be NaN for "no reading")
   * @param timestamp - Timestamp in ms (defaults to now)
   * @param unitType - Optional unit type for enrichment
   */
  constructor(si_value: number, timestamp: number = Date.now(), unitType?: DataCategory) {
    // Allow NaN as valid sentinel value
    if (typeof si_value !== 'number') {
      throw new Error(`MetricValue: si_value must be number, got ${typeof si_value}`);
    }
    if (!Number.isNaN(si_value) && !Number.isFinite(si_value)) {
      throw new Error(`MetricValue: si_value cannot be Infinity`);
    }

    this.si_value = si_value;
    this.timestamp = timestamp;
    this._unitType = unitType;
  }

  /**
   * Get unitType for this metric
   */
  getUnitType(): DataCategory | undefined {
    return this._unitType;
  }

  /**
   * Get display value (lazy computation)
   * Converts SI → user-preferred units
   *
   * @param unitType - Data unitType for conversion (uses stored unitType if not provided)
   * @returns Display value in user units, or NaN if source is NaN
   */
  getDisplayValue(unitType?: DataCategory): number {
    if (Number.isNaN(this.si_value)) {
      return NaN;
    }
    const category = unitType || this._unitType;
    if (!category) {
      return this.si_value; // No conversion
    }
    return ConversionRegistry.convertToDisplay(this.si_value, category);
  }

  /**
   * Get formatted value without unit (lazy computation)
   *
   * @param unitType - Data unitType for formatting (uses stored unitType if not provided)
   * @returns Formatted value (e.g., "8.2") or "---" for NaN
   */
  getFormattedValue(unitType?: DataCategory): string {
    if (Number.isNaN(this.si_value)) {
      return '---';
    }
    const category = unitType || this._unitType;
    if (!category) {
      return String(this.si_value); // No formatting
    }
    const displayValue = this.getDisplayValue(category);
    return ConversionRegistry.format(displayValue, category, false);
  }

  /**
   * Get unit symbol (lazy computation)
   *
   * @param unitType - Data unitType for unit lookup (uses stored unitType if not provided)
   * @returns Unit symbol (e.g., "ft", "°C") or empty string for NaN/no unitType
   */
  getUnit(unitType?: DataCategory): string {
    if (Number.isNaN(this.si_value)) {
      return '';
    }
    const category = unitType || this._unitType;
    if (!category) {
      return '';
    }
    return ConversionRegistry.getUnit(category);
  }

  /**
   * Get formatted value with unit (lazy computation)
   *
   * @param unitType - Data unitType for formatting (uses stored unitType if not provided)
   * @returns Formatted with unit (e.g., "8.2 ft") or "---" for NaN
   */
  getFormattedValueWithUnit(unitType?: DataCategory): string {
    if (Number.isNaN(this.si_value)) {
      return '---';
    }
    const category = unitType || this._unitType;
    if (!category) {
      return String(this.si_value);
    }
    const displayValue = this.getDisplayValue(category);
    return ConversionRegistry.format(displayValue, category, true);
  }
}
