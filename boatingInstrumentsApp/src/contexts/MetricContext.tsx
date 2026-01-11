/**
 * MetricContext - React Integration for SensorDataRegistry
 *
 * **Purpose:**
 * Provides React hooks for subscribing to sensor metrics from SensorDataRegistry.
 * Replaces the old useMetric hook with registry-based subscriptions.
 *
 * **Architecture:**
 * - Components subscribe via useMetricValue(sensorType, instance, metricKey)
 * - Registry calls subscription callbacks when metrics change
 * - Automatic cleanup on unmount
 *
 * **Usage:**
 * ```tsx
 * // In component
 * const depthData = useMetricValue('depth', 0, 'depth');
 * 
 * // Access enriched properties
 * const displayValue = depthData?.formattedValue; // "8.2"
 * const unit = depthData?.unit; // "ft"
 * const alarmLevel = depthData?.alarmLevel; // 0|1|2|3
 * ```
 *
 * **For AI Agents:**
 * This is the React integration layer for the registry architecture.
 * Components use these hooks instead of subscribing to nmeaStore.
 * Provides targeted subscriptions (only re-render when specific metric changes).
 */

import { useEffect, useState, useMemo } from 'react';
import { sensorRegistry } from '../services/SensorDataRegistry';
import type { SensorType } from '../types/SensorData';
import type { EnrichedMetricData } from '../types/SensorInstance';
import type { DataPoint } from '../utils/AdaptiveHistoryBuffer';

/**
 * Hook to subscribe to a single metric value
 * 
 * @param sensorType - Sensor type (e.g., 'depth', 'battery')
 * @param instance - Instance number (0-based)
 * @param metricKey - Metric field name (e.g., 'depth', 'voltage')
 * @returns Enriched metric data or undefined
 */
export function useMetricValue(
  sensorType: SensorType,
  instance: number,
  metricKey: string,
): EnrichedMetricData | undefined {
  // Get initial value
  const getMetricData = useMemo(() => {
    return () => {
      const sensor = sensorRegistry.get(sensorType, instance);
      return sensor?.getMetric(metricKey);
    };
  }, [sensorType, instance, metricKey]);

  const [metricData, setMetricData] = useState<EnrichedMetricData | undefined>(
    getMetricData(),
  );

  useEffect(() => {
    // Subscribe to metric changes
    const unsubscribe = sensorRegistry.subscribe(
      sensorType,
      instance,
      metricKey,
      () => {
        // Callback fires when this specific metric changes
        const newData = getMetricData();
        setMetricData(newData);
      },
    );

    // Update immediately in case value changed while hook was setting up
    setMetricData(getMetricData());

    // Cleanup on unmount
    return unsubscribe;
  }, [sensorType, instance, metricKey, getMetricData]);

  return metricData;
}

/**
 * Hook to subscribe to multiple metrics from the same sensor
 * More efficient than calling useMetricValue multiple times
 * 
 * @param sensorType - Sensor type
 * @param instance - Instance number
 * @param metricKeys - Array of metric field names
 * @returns Map of metric key to enriched data
 */
export function useMetricValues(
  sensorType: SensorType,
  instance: number,
  metricKeys: string[],
): Map<string, EnrichedMetricData | undefined> {
  const getMetricsData = useMemo(() => {
    return () => {
      const sensor = sensorRegistry.get(sensorType, instance);
      const data = new Map<string, EnrichedMetricData | undefined>();
      
      for (const key of metricKeys) {
        data.set(key, sensor?.getMetric(key));
      }
      
      return data;
    };
  }, [sensorType, instance, metricKeys]);

  const [metricsData, setMetricsData] = useState<Map<string, EnrichedMetricData | undefined>>(
    getMetricsData(),
  );

  useEffect(() => {
    // Subscribe to all metrics
    const unsubscribes = metricKeys.map((metricKey) =>
      sensorRegistry.subscribe(sensorType, instance, metricKey, () => {
        // Any metric change triggers full re-fetch
        // This is acceptable because we're already subscribing to multiple metrics
        setMetricsData(getMetricsData());
      }),
    );

    // Update immediately
    setMetricsData(getMetricsData());

    // Cleanup all subscriptions
    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [sensorType, instance, metricKeys, getMetricsData]);

  return metricsData;
}

/**
 * Hook to get sensor instance directly (non-reactive)
 * Use this when you need the full sensor instance but don't need reactivity
 * 
 * @param sensorType - Sensor type
 * @param instance - Instance number
 * @returns SensorInstance or null
 */
export function useSensorInstance(sensorType: SensorType, instance: number) {
  return useMemo(() => {
    return sensorRegistry.get(sensorType, instance);
  }, [sensorType, instance]);
}

/**
 * Hook to subscribe to sensor creation events
 * Useful for widget registration and auto-detection
 * 
 * @param callback - Called when new sensor is detected
 */
export function useSensorCreated(
  callback: (event: { sensorType: SensorType; instance: number; timestamp: number }) => void,
) {
  useEffect(() => {
    sensorRegistry.on('sensorCreated', callback);
    
    return () => {
      sensorRegistry.off('sensorCreated', callback);
    };
  }, [callback]);
}

/**
 * Hook to subscribe to metric history (for trend lines)
 * Fetches history data and re-subscribes when metric changes
 * 
 * @param sensorType - Sensor type
 * @param instance - Instance number
 * @param metricKey - Metric field name
 * @param options - History options (timeWindowMs, etc.)
 * @returns Array of DataPoints
 */
export function useMetricHistory(
  sensorType: SensorType,
  instance: number,
  metricKey: string,
  options?: { timeWindowMs?: number },
): DataPoint<number | string>[] {
  const getHistory = useMemo(() => {
    return () => {
      const sensor = sensorRegistry.get(sensorType, instance);
      if (!sensor) return [];
      
      const historyData = sensor.getHistoryForMetric(metricKey);
      
      // Filter by time window if specified
      if (options?.timeWindowMs) {
        const cutoffTime = Date.now() - options.timeWindowMs;
        return historyData.filter((point) => point.timestamp >= cutoffTime);
      }
      
      return historyData;
    };
  }, [sensorType, instance, metricKey, options?.timeWindowMs]);

  const [history, setHistory] = useState<DataPoint<number | string>[]>(getHistory());

  useEffect(() => {
    // Subscribe to metric changes (history updates trigger metric change)
    const unsubscribe = sensorRegistry.subscribe(
      sensorType,
      instance,
      metricKey,
      () => {
        // Metric changed, re-fetch history
        setHistory(getHistory());
      },
    );

    // Update immediately
    setHistory(getHistory());

    // Cleanup on unmount
    return unsubscribe;
  }, [sensorType, instance, metricKey, getHistory]);

  return history;
}
