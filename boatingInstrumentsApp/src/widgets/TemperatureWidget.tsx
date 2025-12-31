import React, { useMemo } from 'react';
import { TrendLine } from '../components/TrendLine';
import { useNmeaStore } from '../store/nmeaStore';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { TemplatedWidget } from '../components/TemplatedWidget';

interface TemperatureWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * Temperature Widget - Registry-First Declarative Implementation
 * 
 * **Before (253 lines):**
 * - Manual metric extraction (value, location, units, name)
 * - Manual display value creation
 * - Manual alarm state extraction
 * - Manual stale detection with interval
 * - UnifiedWidgetGrid setup
 * 
 * **After (~75 lines):**
 * - Pure configuration
 * - Auto-fetch everything
 * - TemplatedWidget handles layout
 * - MetricCells handle display
 * - TrendLine self-subscribes
 * 
 * **Layout:** 2Rx1C primary (temp value + TrendLine) + 2Rx1C secondary (location + instance)
 * 
 * **Multi-Instance Support:**
 * Supports multiple temperature sensors (seawater, engine, cabin, exhaust, etc.)
 * Instance number extracted from widget ID (e.g., "temp-0", "temperature-1")
 */
export const TemperatureWidget: React.FC<TemperatureWidgetProps> = React.memo(({ id }) => {
  // Extract instance number from widget ID
  const instanceNumber = useMemo(() => {
    const match = id.match(/temp(?:erature)?-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }, [id]);

  // Get SensorInstance - single source of truth
  const temperatureSensorInstance = useNmeaStore(
    (state) => state.nmeaData.sensors.temperature?.[instanceNumber]
  );

  // Subscribe to timestamp to trigger re-renders when data changes
  const _timestamp = useNmeaStore(
    (state) => state.nmeaData.sensors.temperature?.[instanceNumber]?.timestamp
  );

  return (
    <TemplatedWidget
      template="2Rx1C-SEP-2Rx1C"
      sensorInstance={temperatureSensorInstance}
      sensorType="temperature"
      testID={`temperature-widget-${instanceNumber}`}
    >
      {/* Primary Grid: Current temperature + trend visualization */}
      <PrimaryMetricCell metricKey="value" />
      
      {/* TrendLine: Auto-fetch pattern via SensorContext */}
      <TrendLine
        metricKey="value"
        timeWindowMs={5 * 60 * 1000}
        usePrimaryLine
        showXAxis
        showYAxis
        xAxisPosition="bottom"
        yAxisDirection="up"
        showTimeLabels
        showGrid
        strokeWidth={2}
      />
      
      {/* Secondary Grid: Sensor metadata */}
      <SecondaryMetricCell metricKey="location" />
      <SecondaryMetricCell metricKey="name" />
    </TemplatedWidget>
  );
});

export default TemperatureWidget;
