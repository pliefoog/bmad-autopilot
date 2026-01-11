/**
 * CrossSensorCalculations - Cross-Sensor Dependency Logic
 *
 * **DEPRECATED (Jan 2026):**
 * Cross-sensor calculations moved to CalculatedMetricsService.
 * This class remains for backwards compatibility but does nothing.
 * Will be removed in next major version.
 *
 * **Migration:**
 * Use CalculatedMetricsService instead - it handles:
 * - True wind calculation (AWS + GPS + compass → TWS/TWD)
 * - Dew point calculation (temperature + humidity → dew point)
 * - Rate of turn calculation (heading history → ROT)
 *
 * **Previous Purpose (OBSOLETE):**
 * Handled calculations requiring multiple sensor types.
 * Logic moved to Strategy Pattern in CalculatedMetricsService.
 *
 * **For AI Agents:**
 * This file is deprecated. All cross-sensor calculations now in
 * CalculatedMetricsService.ts with proper Strategy Pattern architecture.
 */

import { log } from '../utils/logging/logger';
import type { SensorInstance } from '../types/SensorInstance';
import type { SensorDataRegistry } from './SensorDataRegistry';

export class CrossSensorCalculations {
  constructor(private registry: SensorDataRegistry) {}

  /**
   * Calculate true wind from apparent wind + boat speed + heading
   *
   * **DEPRECATED (Jan 2026):** True wind calculation moved to CalculatedMetricsService.
   * This method is kept for backwards compatibility but does nothing.
   * Will be removed in next major version.
   *
   * Dependencies:
   * - Wind sensor: apparent wind speed (AWS), apparent wind angle (AWA)
   * - GPS sensor: speed over ground (SOG), course over ground (COG)
   * - Compass sensor: heading
   *
   * @param windSensor - Wind sensor instance (unused)
   * @deprecated Use CalculatedMetricsService instead
   */
  calculateTrueWind(windSensor: SensorInstance): void {
    // No-op: CalculatedMetricsService now handles true wind calculation
    // This method remains for backwards compatibility during transition
  }
}
