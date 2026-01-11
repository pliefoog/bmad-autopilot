/**
 * CalculatedMetricsService - Sensor-Specific Calculated Metrics
 *
 * **Purpose:**
 * Extracts sensor-specific calculation logic from SensorInstance using Strategy Pattern.
 * Each calculator is responsible for computing derived metrics for specific sensor types.
 *
 * **Architecture:**
 * - DewPointCalculator: Weather sensors (from temp + humidity)
 * - RateOfTurnCalculator: Compass sensors (from heading differential)
 * - TrueWindCalculator: Wind sensors (from apparent wind + GPS + compass)
 *
 * **Benefits:**
 * - Single Responsibility: SensorInstance focuses on storage, calculators handle computations
 * - Open/Closed: Adding new calculated metrics doesn't modify SensorInstance
 * - Testable: Each calculator can be tested in isolation
 * - Maintainable: Sensor-specific logic is grouped together
 *
 * **Usage:**
 * ```typescript
 * const service = new CalculatedMetricsService(registry);
 * const results = service.compute(sensorInstance, changedMetrics);
 * // Returns Map of calculated metric names to MetricValue objects
 * ```
 */

import { MetricValue } from '../types/MetricValue';
import { SensorType } from '../types/SensorData';
import type { SensorInstance } from '../types/SensorInstance';
import type { SensorDataRegistry } from './SensorDataRegistry';
import { log } from '../utils/logging/logger';
import { calculateTrueWind } from '../utils/calculations/windCalculations';

/**
 * Interface for metric calculators
 */
export interface MetricCalculator {
  /**
   * Check if this calculator can compute metrics for given sensor type
   */
  canCalculate(sensorType: SensorType): boolean;

  /**
   * Compute calculated metrics for sensor instance
   * @returns Map of metric field names to MetricValue objects
   */
  calculate(sensor: SensorInstance, registry?: SensorDataRegistry): Map<string, MetricValue>;
}

/**
 * Dew Point Calculator (Weather Sensors)
 * Formula: Td = (b*α)/(a-α), where α = ln(RH/100) + (a*T)/(b+T)
 * Constants: a = 17.27, b = 237.7
 */
export class DewPointCalculator implements MetricCalculator {
  canCalculate(sensorType: SensorType): boolean {
    return sensorType === 'weather';
  }

  calculate(sensor: SensorInstance): Map<string, MetricValue> {
    const results = new Map<string, MetricValue>();

    const tempMetric = sensor.getMetric('airTemperature');
    const humidityMetric = sensor.getMetric('humidity');

    if (!tempMetric || !humidityMetric) return results;
    if (typeof tempMetric.si_value !== 'number' || typeof humidityMetric.si_value !== 'number') {
      return results;
    }

    const T = tempMetric.si_value; // Celsius
    const RH = humidityMetric.si_value; // Percentage 0-100

    // Validate ranges
    if (RH <= 0 || RH > 100 || T < -40 || T > 50) return results;

    // Magnus formula constants
    const a = 17.27;
    const b = 237.7;

    // Calculate with validation
    const rhFraction = RH / 100;
    if (rhFraction <= 0) return results; // Prevent log(0) or log(negative)

    const alpha = Math.log(rhFraction) + (a * T) / (b + T);
    
    // Prevent division by zero
    const denominator = a - alpha;
    if (Math.abs(denominator) < 0.001) return results;

    const dewPoint = (b * alpha) / denominator;
    
    // Validate result (dew point must be <= temperature)
    if (!Number.isFinite(dewPoint) || dewPoint > T) return results;

    // Get unitType for dewPoint field
    const unitType = sensor.getUnitType('dewPoint');
    const metric = unitType
      ? new MetricValue(dewPoint, Date.now(), unitType)
      : new MetricValue(dewPoint, Date.now());

    results.set('dewPoint', metric);
    return results;
  }
}

/**
 * Rate of Turn Calculator (Compass Sensors)
 * Formula: ROT (°/min) = (Δheading / Δt_seconds) × 60
 * Handles 359°→0° wrap-around
 */
export class RateOfTurnCalculator implements MetricCalculator {
  canCalculate(sensorType: SensorType): boolean {
    return sensorType === 'compass';
  }

  calculate(sensor: SensorInstance): Map<string, MetricValue> {
    const results = new Map<string, MetricValue>();

    // Get heading history using public API
    const headingBuffer = sensor.getHistoryBuffer('heading');
    if (!headingBuffer) return results;

    const allPoints = headingBuffer.getAll();
    if (allPoints.length < 2) return results;

    const latest = allPoints[allPoints.length - 1];
    const previous = allPoints[allPoints.length - 2];

    // Defensive: Validate both points exist and are numbers
    if (!latest || !previous) return results;
    if (typeof latest.value !== 'number' || typeof previous.value !== 'number') {
      return results;
    }

    const currentHeading = latest.value;
    const previousHeading = previous.value;
    const deltaTime = (latest.timestamp - previous.timestamp) / 1000; // seconds

    // Require at least 100ms between readings
    if (deltaTime < 0.1) return results;

    // Calculate delta heading with wrap-around handling
    let deltaHeading = currentHeading - previousHeading;
    if (deltaHeading > 180) deltaHeading -= 360;
    if (deltaHeading < -180) deltaHeading += 360;

    // Convert to degrees per minute
    const rot = (deltaHeading / deltaTime) * 60;

    const unitType = sensor.getUnitType('rateOfTurn');
    const metric = unitType
      ? new MetricValue(rot, Date.now(), unitType)
      : new MetricValue(rot, Date.now());

    results.set('rateOfTurn', metric);
    return results;
  }
}

/**
 * True Wind Calculator (Wind Sensors)
 * Calculates true wind speed/direction from apparent wind + boat speed/heading
 * Requires GPS and Compass data from registry
 */
export class TrueWindCalculator implements MetricCalculator {
  private readonly STALENESS_THRESHOLD_MS = 1000; // 1 second

  canCalculate(sensorType: SensorType): boolean {
    return sensorType === 'wind';
  }

  calculate(sensor: SensorInstance, registry?: SensorDataRegistry): Map<string, MetricValue> {
    const results = new Map<string, MetricValue>();
    if (!registry) return results;

    const now = Date.now();

    // Check if hardware true wind values are fresh
    const hardwareTrueSpeed = sensor.getMetric('trueSpeed');
    const hardwareTrueDirection = sensor.getMetric('trueDirection');

    if (hardwareTrueSpeed && hardwareTrueDirection) {
      const speedAge = now - hardwareTrueSpeed.timestamp;
      const directionAge = now - hardwareTrueDirection.timestamp;

      // If both hardware values are fresh, don't calculate
      if (speedAge < this.STALENESS_THRESHOLD_MS && directionAge < this.STALENESS_THRESHOLD_MS) {
        log.wind('Hardware true wind values fresh, skipping calculation');
        return results;
      }
    }

    // Get apparent wind from this sensor
    const awsMetric = sensor.getMetric('speed');
    const awaMetric = sensor.getMetric('direction');

    if (!awsMetric || !awaMetric) return results;
    if (typeof awsMetric.si_value !== 'number' || typeof awaMetric.si_value !== 'number') {
      return results;
    }

    // Get GPS and compass data
    const gpsInstance = registry.get('gps', 0);
    const compassInstance = registry.get('compass', 0);

    if (!gpsInstance || !compassInstance) {
      log.wind('Missing GPS or compass instance for true wind calculation');
      return results;
    }

    const sogMetric = gpsInstance.getMetric('speedOverGround');
    const cogMetric = gpsInstance.getMetric('courseOverGround');
    const headingMetric =
      compassInstance.getMetric('magneticHeading') ?? compassInstance.getMetric('trueHeading');

    if (!sogMetric || !cogMetric || !headingMetric) return results;
    if (
      typeof sogMetric.si_value !== 'number' ||
      typeof cogMetric.si_value !== 'number' ||
      typeof headingMetric.si_value !== 'number'
    ) {
      return results;
    }

    // Calculate true wind using vector math
    const trueWind = calculateTrueWind(
      awsMetric.si_value,
      awaMetric.si_value,
      sogMetric.si_value,
      cogMetric.si_value,
      headingMetric.si_value,
    );

    log.wind('Calculated true wind', () => ({
      input: { aws: awsMetric.si_value, awa: awaMetric.si_value, sog: sogMetric.si_value },
      result: trueWind,
    }));

    // Create MetricValue objects
    const speedUnitType = sensor.getUnitType('trueSpeed');
    const directionUnitType = sensor.getUnitType('trueDirection');

    const speedMetric = speedUnitType
      ? new MetricValue(trueWind.speed, now, speedUnitType)
      : new MetricValue(trueWind.speed, now);

    const directionMetric = directionUnitType
      ? new MetricValue(trueWind.direction, now, directionUnitType)
      : new MetricValue(trueWind.direction, now);

    results.set('trueSpeed', speedMetric);
    results.set('trueDirection', directionMetric);

    return results;
  }
}

/**
 * Main service that orchestrates all calculators
 */
export class CalculatedMetricsService {
  private calculators: MetricCalculator[];

  constructor(private registry: SensorDataRegistry) {
    this.calculators = [
      new DewPointCalculator(),
      new RateOfTurnCalculator(),
      new TrueWindCalculator(),
    ];
  }

  /**
   * Compute all applicable calculated metrics for sensor instance
   * 
   * @param sensor - Sensor instance to compute metrics for
   * @param changedMetrics - Set of metrics that changed (used for input filtering only)
   * @returns Map of calculated metric names to MetricValue objects
   */
  compute(sensor: SensorInstance, changedMetrics: Set<string>): Map<string, MetricValue> {
    const allResults = new Map<string, MetricValue>();

    for (const calculator of this.calculators) {
      if (!calculator.canCalculate(sensor.sensorType)) continue;

      try {
        const results = calculator.calculate(sensor, this.registry);
        
        // Merge results (no mutation of input changedMetrics)
        results.forEach((metric, key) => {
          allResults.set(key, metric);
        });
      } catch (error) {
        log.app('❌ Calculator error', () => ({
          calculator: calculator.constructor.name,
          sensorType: sensor.sensorType,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        }));
      }
    }

    return allResults;
  }
}
