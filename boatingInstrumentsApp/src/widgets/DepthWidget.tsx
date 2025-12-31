import React, { useMemo } from 'react';
import { TrendLine } from '../components/TrendLine';
import { useNmeaStore } from '../store/nmeaStore';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { TemplatedWidget } from '../components/TemplatedWidget';

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
 * **Special Features:**
 * - TrendLine renders as primary metric (self-subscribing pattern)
 * - Session stats in secondary cells (need stat-based cell component)
 */
export const DepthWidget: React.FC<DepthWidgetProps> = React.memo(({ id }) => {
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
      
      {/* Secondary Grid: Session statistics 
          NOTE: Using standard SecondaryMetricCell - will show current depth value
          TODO: Create StatMetricCell component for min/max/avg stats display
          For now, depth will repeat in secondary cells (functional but not ideal)
      */}
      <SecondaryMetricCell metricKey="depth" />
      <SecondaryMetricCell metricKey="depth" />
    </TemplatedWidget>
  );
});

export default DepthWidget;
