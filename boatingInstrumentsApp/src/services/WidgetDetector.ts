/**
 * WidgetDetector - Handles sensor-to-widget matching and detection logic
 *
 * Purpose:
 * - Match sensors to widget requirements
 * - Build sensor value maps for widget creation
 * - Find widgets affected by sensor changes
 *
 * Responsibilities:
 * - Required sensor presence validation
 * - Sensor value map construction with type guards
 * - Affected widget discovery
 * - Sensor key formatting
 */

import type { SensorType, SensorsData } from '../types/SensorData';
import type { WidgetRegistration, SensorValueMap } from './WidgetRegistrationService';

export class WidgetDetector {
  /**
   * Check if all required sensors are present in the sensor value map
   *
   * @param registration - Widget registration with required sensor list
   * @param sensorData - Map of sensor values (only contains valid entries)
   * @returns true if all required sensors have valid data
   */
  hasRequiredSensors(
    registration: WidgetRegistration,
    sensorData: SensorValueMap,
  ): boolean {
    return registration.requiredSensors.every((dep) => {
      if (dep.instance === undefined) {
        // Multi-instance: check if ANY instance exists
        const pattern = new RegExp(`^${dep.sensorType}\\.\\d+\\.${dep.metricName}$`);
        return Object.keys(sensorData).some((key) => pattern.test(key));
      } else {
        // Specific instance required
        const key = this.buildSensorKey(dep.sensorType, dep.instance, dep.metricName);
        return key in sensorData;
      }
    });
  }

  /**
   * Find widget types affected by a sensor update
   * 
   * @param sensorType - Sensor type that changed
   * @param instance - Sensor instance number
   * @param registrations - Map of all widget registrations
   * @returns Array of affected widget registrations
   */
  findAffectedWidgets(
    sensorType: SensorType,
    instance: number,
    registrations: Map<string, WidgetRegistration>,
  ): WidgetRegistration[] {
    const affected: WidgetRegistration[] = [];

    registrations.forEach((registration) => {
      const isAffected = [...registration.requiredSensors, ...registration.optionalSensors].some(
        (dep) => {
          if (dep.sensorType !== sensorType) return false;
          if (dep.instance !== undefined && dep.instance !== instance) return false;
          return true;
        },
      );

      if (isAffected) {
        affected.push(registration);
      }
    });

    return affected;
  }

  /**
   * Build sensor value map for a widget registration
   *
   * Extracts numeric metric values from SensorInstance, filtering out:
   * - Null/undefined values
   * - String values (HistoryPoint.si_value can be number | string)
   * - Invalid sensor instances
   *
   * @param registration - Widget registration with sensor dependencies
   * @param instance - Sensor instance number
   * @param allSensors - Full sensor state from nmeaStore
   * @returns Map of sensor values (only valid numeric entries)
   */
  buildSensorValueMap(
    registration: WidgetRegistration,
    instance: number,
    allSensors: SensorsData,
  ): SensorValueMap {
    const valueMap: SensorValueMap = {};
    const allDependencies = [...registration.requiredSensors, ...registration.optionalSensors];

    allDependencies.forEach((dep) => {
      const targetInstance = dep.instance ?? instance;
      const sensorData = allSensors[dep.sensorType]?.[targetInstance];

      if (sensorData) {
        let value: number | null | undefined = null;
        
        if (sensorData.getMetric) {
          // SensorInstance - use getMetric()
          const metric = sensorData.getMetric(dep.metricName);
          // HistoryPoint.si_value can be number | string, filter to numbers only
          const rawValue = metric?.si_value;
          value = typeof rawValue === 'number' ? rawValue : null;
        } else {
          // Legacy direct access (fallback)
          const rawValue = (sensorData as any)[dep.metricName];
          value = typeof rawValue === 'number' ? rawValue : null;
        }

        // Only add numeric values to map
        if (value !== null && value !== undefined) {
          const key = this.buildSensorKey(dep.sensorType, targetInstance, dep.metricName);
          valueMap[key] = value;
        }
      }
    });

    return valueMap;
  }

  /**
   * Build standardized sensor key for value map
   * 
   * @param sensorType - Sensor type (e.g., 'depth', 'engine')
   * @param instance - Instance number
   * @param metricName - Metric field name
   * @returns Key in format "sensorType.instance.metricName"
   */
  buildSensorKey(sensorType: SensorType, instance: number, metricName: string): string {
    return `${sensorType}.${instance}.${metricName}`;
  }
}
