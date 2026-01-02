import React, { useMemo } from 'react';
import { TrendLine } from '../components/TrendLine';
import { useNmeaStore } from '../store/nmeaStore';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { TemplatedWidget } from '../components/TemplatedWidget';
import { useWidgetVisibilityOptional } from '../contexts/WidgetVisibilityContext';

interface DepthWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * Depth Widget - Registry-First Declarative Implementation
 * 
 * **Before (263 lines):**
 * - Manual metric extraction
 * - Manual display value creation
 * - Manual alarm state extraction
 * - Manual source info parsing
 * - UnifiedWidgetGrid setup
 * 
 * **After (~85 lines):**
 * - Pure configuration
 * - Auto-fetch everything
 * - TemplatedWidget handles layout
 * - MetricCells handle display
 * - TrendLine self-subscribes
 * 
 * **Layout:** 2Rx1C primary (depth value + TrendLine) + 2Rx1C secondary (min/max stats)
 * 
 * **Virtual Metrics Pattern (Single Sensor):**
 * - Current depth: `metricKey="depth"` (no sensorKey needed - primary sensor implicit)
 * - Session minimum: `metricKey="depth.min"` (calculated from history buffer)
 * - Session maximum: `metricKey="depth.max"` (calculated from history buffer)
 * - Session average: `metricKey="depth.avg"` (calculated from history buffer)
 * 
 * **How Virtual Metrics Work:**
 * 1. SecondaryMetricCell receives `metricKey="depth.min"`
 * 2. Strips `.min` suffix to look up "depth" field config in SensorConfigRegistry
 * 3. Calls `sensorInstance.getMetric('depth.min')` which:
 *    - Parses suffix using regex `/\.(min|max|avg)$/`
 *    - Fetches history buffer via `getHistory('depth')`
 *    - Calculates `Math.min(...values)` across all history points
 *    - Returns enriched MetricValue with proper units/formatting
 * 4. Component adds stat prefix to mnemonic: "DEPTH" → "MIN DEPTH"
 * 
 * **TrendLine Integration:**
 * - TrendLine component also supports virtual metrics with same dot notation
 * - Can render trends of min/max/avg values: `<TrendLine metricKey="depth.max" />`
 */
export const DepthWidget: React.FC<DepthWidgetProps> = React.memo(({ id }) => {
  // Check visibility before any store subscriptions
  const { isVisible } = useWidgetVisibilityOptional();
  
  // Early return for off-screen widgets (prevents all hooks/subscriptions below)
  if (!isVisible) {
    return null;
  }

  // Extract instance number from widget ID
  const instanceNumber = useMemo(() => {
    const match = id.match(/depth-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }, [id]);

  // Get SensorInstance - single source of truth
  const depthSensorInstance = useNmeaStore(
    (state) => state.nmeaData.sensors.depth?.[instanceNumber]
  );

  // Subscribe to timestamp to trigger re-renders when data changes
  const _timestamp = useNmeaStore(
    (state) => state.nmeaData.sensors.depth?.[instanceNumber]?.timestamp
  );

  return (
    <TemplatedWidget
      template="2Rx1C-SEP-2Rx1C"
      sensorInstance={depthSensorInstance}
      sensorType="depth"
      debugLayout={true}
      testID={`depth-widget-${instanceNumber}`}
    >
      {/* Primary Grid: Current depth + trend visualization */}
      <PrimaryMetricCell metricKey="depth" />
      
      {/* TrendLine: Auto-fetch pattern via SensorContext */}
      <TrendLine
        metricKey="depth"
        timeWindowMs={5 * 60 * 1000}
        usePrimaryLine
        showXAxis
        showYAxis
        xAxisPosition="top"
        yAxisDirection="down"
        showTimeLabels
        showGrid
        strokeWidth={2}
        forceZero
      />
      
      {/* Secondary Grid: Session statistics using virtual metrics */}
      <SecondaryMetricCell metricKey="depth.min" />
      <SecondaryMetricCell metricKey="depth.max" />
    </TemplatedWidget>
  );
});

export default DepthWidget;
