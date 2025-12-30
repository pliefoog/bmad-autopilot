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
 */
export interface SensorContextValue {
  /** Current sensor instance with live data */
  sensorInstance: SensorInstance | null | undefined;
  
  /** Sensor type identifier (battery, engine, etc.) */
  sensorType: SensorType;
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
 * **For AI Agents:**
 * This is THE primary way cells access sensor data.
 * No props needed except metricKey - everything else auto-fetched.
 * 
 * @returns Sensor context value
 * @throws Error if called outside SensorContext.Provider
 * 
 * @example
 * ```typescript
 * function PrimaryMetricCell({ metricKey }: { metricKey: string }) {
 *   const { sensorInstance, sensorType } = useSensorContext();
 *   
 *   if (!sensorInstance) {
 *     return <Text>---</Text>;
 *   }
 *   
 *   const metric = sensorInstance.getMetric(metricKey);
 *   const fieldConfig = getSensorFieldConfig(sensorType, metricKey);
 *   
 *   return (
 *     <View>
 *       <Text>{fieldConfig.mnemonic}</Text>
 *       <Text>{metric?.formattedValue ?? '---'}</Text>
 *       <Text>{metric?.unit ?? ''}</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function useSensorContext(): SensorContextValue {
  const context = useContext(SensorContext);
  
  if (context === undefined) {
    throw new Error(
      'useSensorContext must be used within a SensorContext.Provider\n' +
      'Metric cells must be wrapped by TemplatedWidget or manual provider.'
    );
  }
  
  return context;
}
