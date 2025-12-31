/**
 * SensorContext - Context Provider for Auto-Fetch Widget Pattern
 * 
 * Provides sensor instance and type to all metric cells within a widget.
 * Eliminates prop drilling and enables auto-fetch pattern where cells
 * independently retrieve their data using metricKey + context.
 * 
 * **Registry-First Architecture:**
 * Cells call `useSensorContext()` to get sensor instance,
 * then `instance.getMetric(metricKey)` + `getSensorFieldConfig(sensorType, metricKey)`
 * to auto-fetch all display properties (mnemonic, value, unit, alarmState).
 * 
 * **For AI Agents:**
 * - TemplatedWidget creates this context wrapping all cells
 * - Cells use useSensorContext() hook to access sensor data
 * - No manual prop passing - everything auto-fetched from context
 * 
 * **Example Usage:**
 * ```typescript
 * // Widget provides context
 * <SensorContext.Provider value={{ sensorInstance: instance, sensorType: 'battery' }}>
 *   <PrimaryMetricCell metricKey="voltage" />
 *   <PrimaryMetricCell metricKey="current" />
 * </SensorContext.Provider>
 * 
 * // Cell consumes context
 * function PrimaryMetricCell({ metricKey }: { metricKey: string }) {
 *   const { sensorInstance, sensorType } = useSensorContext();
 *   const metric = sensorInstance?.getMetric(metricKey);
 *   const fieldConfig = getSensorFieldConfig(sensorType, metricKey);
 *   // Now have everything: metric.formattedValue, fieldConfig.mnemonic, etc.
 * }
 * ```
 */

import React, { createContext, useContext } from 'react';
import type { SensorInstance } from '@/types/SensorInstance';
import type { SensorType } from '@/types/SensorData';

/**
 * Sensor context value
 * 
 * Contains the sensor instance being displayed and its type.
 * Provided by TemplatedWidget, consumed by metric cells.
 * 
 * **Multi-Sensor Support:**
 * `additionalSensors` allows widgets to access multiple sensor types
 * (e.g., SpeedWidget needs both 'speed' and 'gps' sensors).
 */
export interface SensorContextValue {
  /** Primary sensor instance with live data */
  sensorInstance: SensorInstance | null | undefined;
  
  /** Primary sensor type identifier (battery, engine, etc.) */
  sensorType: SensorType;
  
  /** Additional sensors accessible by type (multi-sensor widgets) */
  additionalSensors?: Map<SensorType, SensorInstance | null | undefined>;
}

/**
 * React Context for sensor data
 * 
 * Created by TemplatedWidget, consumed by PrimaryMetricCell/SecondaryMetricCell.
 */
export const SensorContext = createContext<SensorContextValue | undefined>(undefined);

/**
 * Hook to access sensor context
 * 
 * **Auto-Fetch Pattern:**
 * 1. Call this hook to get sensor instance + type
 * 2. Call `instance.getMetric(metricKey)` to get MetricValue
 * 3. Call `getSensorFieldConfig(sensorType, metricKey)` to get field config
 * 4. Access `metric.formattedValue`, `fieldConfig.mnemonic`, etc.
 * 
 * **Multi-Sensor Support:**
 * Pass optional `sensorKey` to access secondary sensors:
 * ```typescript
 * const { sensorInstance, sensorType } = useSensorContext('gps');
 * ```
 * 
 * **For AI Agents:**
 * This is THE primary way cells access sensor data.
 * No props needed except metricKey - everything else auto-fetched.
 * 
 * @param sensorKey Optional sensor type key for multi-sensor widgets (defaults to primary)
 * @returns Sensor context value
 * @throws Error if called outside SensorContext.Provider or sensorKey not found
 * 
 * @example
 * ```typescript
 * // Primary sensor (default)
 * const { sensorInstance, sensorType } = useSensorContext();
 * 
 * // Secondary sensor (multi-sensor widgets)
 * const { sensorInstance, sensorType } = useSensorContext('gps');
 * ```
 */
export function useSensorContext(sensorKey?: SensorType): SensorContextValue {
  const context = useContext(SensorContext);
  
  if (context === undefined) {
    throw new Error(
      'useSensorContext must be used within a SensorContext.Provider\n' +
      'Metric cells must be wrapped by TemplatedWidget or manual provider.'
    );
  }
  
  // If no sensorKey specified, return primary sensor
  if (!sensorKey) {
    return context;
  }
  
  // For multi-sensor widgets, lookup secondary sensor
  // Check if the sensor key is registered in the map
  if (!context.additionalSensors || !context.additionalSensors.has(sensorKey)) {
    throw new Error(
      `useSensorContext: Sensor "${sensorKey}" not found in context.\n` +
      `Available sensors: primary (${context.sensorType})` +
      (context.additionalSensors ? `, additional: ${Array.from(context.additionalSensors.keys()).join(', ')}` : '')
    );
  }
  
  // Get the sensor instance (may be null/undefined if data hasn't arrived yet)
  const additionalSensor = context.additionalSensors.get(sensorKey);
  
  return {
    sensorInstance: additionalSensor,
    sensorType: sensorKey,
    additionalSensors: context.additionalSensors,
  };
}
