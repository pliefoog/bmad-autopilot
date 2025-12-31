import React, { useMemo } from 'react';
import { useNmeaStore } from '../store/nmeaStore';
import { TemplatedWidget } from '../components/TemplatedWidget';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';

interface CompassWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * CompassWidget - Registry-First Declarative Implementation
 * 
 * **Before (351 lines):**
 * - Manual metric extraction for headings, variation, deviation
 * - Manual display value creation and formatting
 * - Manual stale data detection
 * - UnifiedWidgetGrid with explicit props
 * - Complex heading calculation logic
 * 
 * **After (~60 lines):**
 * - Pure declarative configuration
 * - Auto-fetch via MetricCells
 * - TemplatedWidget handles layout
 * - All formatting in ConversionRegistry
 * 
 * **Layout:** 2Rx1C primary (TRUE/MAG headings) + 2Rx1C secondary (VAR/DEV)
 * 
 * **Removed features:**
 * - Interactive mode toggle (TRUE/MAGNETIC) - not used in practice
 * - SVG CompassRose visualization - could be added back if needed
 * - Manual cardinal direction calculation - handled by formatter
 */
export const CompassWidget: React.FC<CompassWidgetProps> = React.memo(
  ({ id }) => {
    // Extract instance number from widget ID
    const instanceNumber = useMemo(() => {
      const match = id.match(/compass-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }, [id]);

    // Get sensor instance
    const compassInstance = useNmeaStore(
      (state) => state.nmeaData.sensors.compass?.[instanceNumber]
    );

    // Subscribe to timestamp to trigger re-renders (SensorInstance is mutable)
    const _timestamp = useNmeaStore(
      (state) => state.nmeaData.sensors.compass?.[instanceNumber]?.timestamp
    );

    return (
      <TemplatedWidget
        template="2Rx1C-SEP-2Rx1C"
        sensorInstance={compassInstance}
        sensorType="compass"
        testID={`compass-widget-${instanceNumber}`}
      >
        {/* Primary Grid: True and Magnetic Heading */}
        <PrimaryMetricCell metricKey="trueHeading" />
        <PrimaryMetricCell metricKey="magneticHeading" />
        
        {/* Secondary Grid: Variation and Deviation */}
        <SecondaryMetricCell metricKey="variation" />
        <SecondaryMetricCell metricKey="deviation" />
      </TemplatedWidget>
    );
  },
);

CompassWidget.displayName = 'CompassWidget';

export default CompassWidget;

