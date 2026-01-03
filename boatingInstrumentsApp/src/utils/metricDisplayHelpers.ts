/**
 * @file metricDisplayHelpers.ts
 * @module utils/metricDisplayHelpers
 *
 * # Metric Display Data Factory Utilities
 *
 * Shared factory functions for creating MetricDisplayData objects for widget display cells.
 * Reduces boilerplate when passing data to PrimaryMetricCell/SecondaryMetricCell.
 *
 * ## Usage Pattern
 *
 * ```typescript
 * import { createMetricDisplay } from '@/utils/metricDisplayHelpers';
 *
 * // Minimal - just label, value, unit, alarm state
 * const depthDisplay = createMetricDisplay(
 *   'DEPTH',
 *   depthMetric?.formattedValue,
 *   depthMetric?.unit,
 *   depthAlarmState
 * );
 *
 * // With optional layout hints
 * const speedDisplay = createMetricDisplay(
 *   'SOG',
 *   speedMetric?.formattedValue,
 *   speedMetric?.unit,
 *   speedAlarmState,
 *   { minWidth: 80, alignment: 'center' }
 * );
 * ```
 *
 * ## Simplified Architecture (Dec 2024)
 *
 * MetricDisplayData now contains ONLY what display cells need:
 * - mnemonic (label)
 * - value (formatted string)
 * - unit (symbol)
 * - alarmState (for visual styling)
 * - layout (optional hints)
 *
 * Removed unnecessary fields: rawValue, presentation metadata, status flags.
 *
 * @see {@link MetricDisplayData} - Interface definition
 * @see {@link PrimaryMetricCell} - Primary consumer
 * @see {@link SecondaryMetricCell} - Secondary consumer
 */

import type { AlarmLevel } from '../types/AlarmTypes';
import type { MetricDisplayData } from '../types/MetricDisplayData';

/**
 * Create minimal MetricDisplayData object for widget display cells.
 *
 * Factory function for creating clean MetricDisplayData objects. Display cells
 * are "dumb" components that just render formatted data - they don't need
 * raw values, presentation metadata, or status flags.
 *
 * @param mnemonic - Display label (e.g., "DEPTH", "SOG", "HDG")
 * @param value - Formatted value string from MetricValue.formattedValue
 * @param unit - Unit symbol from MetricValue.unit
 * @param alarmState - Visual alarm state (0=NONE, 1=STALE, 2=WARNING, 3=CRITICAL)
 * @param layout - Optional layout hints (minWidth, alignment)
 * @returns Minimal MetricDisplayData object for PrimaryMetricCell/SecondaryMetricCell
 *
 * @example
 * ```typescript
 * // Simple case - just the essentials
 * const depth = createMetricDisplay(
 *   'DEPTH',
 *   depthMetric?.formattedValue,
 *   depthMetric?.unit,
 *   depthAlarmState
 * );
 *
 * // With layout hints
 * const speed = createMetricDisplay(
 *   'SOG',
 *   speedMetric?.formattedValue,
 *   speedMetric?.unit,
 *   speedAlarmState,
 *   { minWidth: 80, alignment: 'center' }
 * );
 * ```
 */
export function createMetricDisplay(
  mnemonic: string,
  value: string | undefined,
  unit: string | undefined,
  alarmState: AlarmLevel,
  layout?: { minWidth?: number; alignment?: 'left' | 'center' | 'right' },
): MetricDisplayData {
  return {
    mnemonic,
    value,
    unit,
    alarmState,
    layout,
  };
}
