/**
 * Sensor Alarm Utilities
 * 
 * Provides utility functions for sensor alarm configuration, including
 * alarm direction determination based on sensor type and metric.
 */

import { SensorType } from '../types/SensorData';

/**
 * Result of alarm direction determination
 */
export interface AlarmDirectionResult {
  direction: 'above' | 'below';
  reason: string;
}

/**
 * Get alarm direction for a sensor type and optional metric
 * 
 * Determines whether the sensor alarms when values go ABOVE or BELOW thresholds.
 * Based on marine safety conventions (e.g., depth alarms when too shallow, RPM when too high).
 * 
 * @param sensorType - Type of sensor (battery, depth, engine, etc.)
 * @param metric - Optional metric name for multi-metric sensors (e.g., 'voltage', 'rpm')
 * @returns Alarm direction and human-readable explanation
 * 
 * **Limitations:**
 * - Returns sensible defaults for unknown sensor types
 * - Metric names are case-sensitive (use camelCase)
 * - Does not validate if sensor type supports the specified metric
 * - Reason string is English-only (not i18n)
 * 
 * **Usage Notes:**
 * - Multi-metric sensors (battery, engine, gps) require metric parameter
 * - Single-metric sensors (depth, wind, speed) ignore metric parameter
 * - Use returned 'direction' for ThresholdEditor component
 * - Use returned 'reason' for UI hints/tooltips
 * 
 * @example
 * ```typescript
 * // Battery voltage - alarms when too low
 * getAlarmDirection('battery', 'voltage')
 * // => { direction: 'below', reason: 'Battery voltage alarms when too low' }
 * 
 * // Engine temperature - alarms when too high
 * getAlarmDirection('engine', 'coolantTemp')
 * // => { direction: 'above', reason: 'Engine coolant temperature alarms when too high' }
 * 
 * // Tank fuel - alarms when too low
 * getAlarmDirection('tank', 'fuel')
 * // => { direction: 'below', reason: 'Fuel tank alarms when level too low' }
 * ```
 */
export function getAlarmDirection(
  sensorType: SensorType,
  metric?: string
): AlarmDirectionResult {
  // Sensors that alarm when value goes BELOW threshold (danger = too low)
  switch (sensorType) {
    case 'battery':
      // Battery metrics typically alarm when too low
      if (metric === 'voltage' || metric === 'soc' || !metric) {
        return {
          direction: 'below',
          reason: `Battery ${metric || 'level'} alarms when too low`
        };
      }
      // Battery temperature can alarm when too high
      if (metric === 'temperature') {
        return {
          direction: 'above',
          reason: 'Battery temperature alarms when too high'
        };
      }
      // Battery current - could be either, default to absolute value monitoring
      return {
        direction: 'above',
        reason: 'Battery current alarms when excessive'
      };
      
    case 'depth':
      return {
        direction: 'below',
        reason: 'Depth alarms when too shallow (risk of grounding)'
      };
      
    case 'tank':
      // Tank type determines direction
      if (metric === 'fuel' || metric === 'freshWater' || metric === 'liveWell' || metric === 'oil' || metric === 'blackWater') {
        return {
          direction: 'below',
          reason: `${metric || 'Tank'} level alarms when too low`
        };
      }
      if (metric === 'wasteWater' || metric === 'grayWater') {
        return {
          direction: 'above',
          reason: `${metric} alarms when too full`
        };
      }
      // Default for unknown tank types - assume consumable (alarm when low)
      return {
        direction: 'below',
        reason: 'Tank level alarms when too low'
      };
      
    case 'temperature':
      // Most temperature sensors alarm when too high
      return {
        direction: 'above',
        reason: 'Temperature alarms when too high'
      };
      
    case 'engine':
      // Engine metrics typically alarm when too high
      if (metric === 'coolantTemp' || metric === 'rpm' || metric === 'oilTemp' || !metric) {
        return {
          direction: 'above',
          reason: `Engine ${metric || 'parameter'} alarms when too high`
        };
      }
      // Oil pressure alarms when too LOW
      if (metric === 'oilPressure') {
        return {
          direction: 'below',
          reason: 'Engine oil pressure alarms when too low'
        };
      }
      return {
        direction: 'above',
        reason: 'Engine parameter alarms when too high'
      };
      
    case 'wind':
      return {
        direction: 'above',
        reason: 'Wind speed alarms when too strong'
      };
      
    case 'speed':
      return {
        direction: 'above',
        reason: 'Speed alarms when too fast (overspeed protection)'
      };
      
    case 'gps':
      if (metric === 'speedOverGround' || metric === 'sog') {
        return {
          direction: 'above',
          reason: 'Speed over ground alarms when too fast'
        };
      }
      // Default for GPS metrics
      return {
        direction: 'above',
        reason: 'GPS metric alarms when above threshold'
      };
      
    case 'compass':
    case 'autopilot':
    case 'navigation':
      // Informational sensors - shouldn't have alarms typically
      return {
        direction: 'above',
        reason: 'Navigation parameter alarms when above threshold'
      };
      
    default:
      // Default: alarm when value goes above threshold
      return {
        direction: 'above',
        reason: 'Sensor alarms when value above threshold'
      };
  }
}

/**
 * Get user-friendly description of alarm trigger behavior
 * 
 * @param sensorType - Type of sensor
 * @param metric - Optional metric name
 * @returns Human-readable description of when alarms trigger
 * 
 * @example
 * ```typescript
 * getAlarmTriggerHint('depth')
 * // => "Triggers when depth becomes shallower than threshold"
 * 
 * getAlarmTriggerHint('engine', 'coolantTemp')
 * // => "Triggers when engine coolant temperature rises above threshold"
 * ```
 */
export function getAlarmTriggerHint(
  sensorType: SensorType,
  metric?: string
): string {
  const { direction, reason } = getAlarmDirection(sensorType, metric);
  
  const actionVerbs = {
    below: {
      depth: 'becomes shallower than',
      battery: 'drops below',
      tank: 'falls below',
      engine: 'drops below',
      default: 'drops below'
    },
    above: {
      temperature: 'rises above',
      engine: 'exceeds',
      wind: 'exceeds',
      speed: 'exceeds',
      default: 'exceeds'
    }
  };
  
  const verb = direction === 'below'
    ? (actionVerbs.below[sensorType as keyof typeof actionVerbs.below] || actionVerbs.below.default)
    : (actionVerbs.above[sensorType as keyof typeof actionVerbs.above] || actionVerbs.above.default);
  
  const metricLabel = metric || sensorType;
  
  return `Triggers when ${metricLabel} ${verb} threshold`;
}
