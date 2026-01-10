import React from 'react';
import { TrendLine } from '../components/TrendLine';
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
 *
 * NO SUBSCRIPTIONS: Widget is pure layout, TemplatedWidget handles store access
 */
export const TemperatureWidget: React.FC<TemperatureWidgetProps> = React.memo(({ id, instanceNumber = 0 }) => {
  return (
    <TemplatedWidget
      template="2Rx1C-SEP-2Rx1C"
      sensorType="temperature"
      instanceNumber={instanceNumber}
      testID={`temperature-widget-${instanceNumber}`}
    >
      {/* Primary Grid: Current temperature + trend visualization */}
      <PrimaryMetricCell sensorType="temperature" instance={instanceNumber} metricKey="value" />

      {/* TrendLine: Explicit props pattern */}
      <TrendLine
        sensorType="temperature"
        instance={instanceNumber}
        metricKey="value"
        timeWindowMs={5 * 60 * 1000}
        usePrimaryLine
        showXAxis
        showYAxis
        xAxisPosition="bottom"
        yAxisDirection="up"
        showTimeLabels
        strokeWidth={2}
      />

      {/* Secondary Grid: Sensor metadata (name now in header) */}
      <SecondaryMetricCell sensorType="temperature" instance={instanceNumber} metricKey="location" />
    </TemplatedWidget>
  );
});

export default TemperatureWidget;
