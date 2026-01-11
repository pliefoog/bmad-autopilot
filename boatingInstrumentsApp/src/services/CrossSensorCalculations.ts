/**
 * CrossSensorCalculations - Cross-Sensor Dependency Logic
 *
 * **Purpose:**
 * Handles calculations that require data from multiple sensor types.
 * Primary use case: True wind calculation from apparent wind + GPS + compass.
 *
 * **Key Features:**
 * - True wind speed calculation (AWS → TWS using boat speed)
 * - True wind angle calculation (AWA → TWA using heading + COG)
 * - Dependency validation (checks for required sensors)
 *
 * **Usage:**
 * ```typescript
 * const calculator = new CrossSensorCalculations(sensorRegistry);
 * calculator.calculateTrueWind(windSensor);
 * ```
 *
 * **For AI Agents:**
 * This service implements the cross-sensor dependency logic that was
 * previously embedded in SensorInstance._maybeCalculateTrueWind().
 * Called when wind sensor updates in SensorDataRegistry.
 */

import { log } from '../utils/logging/logger';
import type { SensorInstance } from '../types/SensorInstance';
import type { SensorDataRegistry } from './SensorDataRegistry';

export class CrossSensorCalculations {
  constructor(private registry: SensorDataRegistry) {}

  /**
   * Calculate true wind from apparent wind + boat speed + heading
   *
   * Dependencies:
   * - Wind sensor: apparent wind speed (AWS), apparent wind angle (AWA)
   * - GPS sensor: speed over ground (SOG), course over ground (COG)
   * - Compass sensor: heading
   *
   * @param windSensor - Wind sensor instance
   */
  calculateTrueWind(windSensor: SensorInstance): void {
    const gps = this.registry.get('gps', 0);
    const compass = this.registry.get('compass', 0);

    if (!gps || !compass) {
      log.wind('Missing GPS or compass for true wind calculation', () => ({
        hasGPS: !!gps,
        hasCompass: !!compass,
        windInstance: windSensor.instance,
      }));
      return;
    }

    log.wind('Calculating true wind', () => ({
      windInstance: windSensor.instance,
      hasGPS: true,
      hasCompass: true,
    }));

    // Call private method on wind sensor
    // TODO: Move this logic here or make public API in SensorInstance
    (windSensor as any)._maybeCalculateTrueWind(gps, compass);
  }
}
