import React, { useMemo } from 'react';
import { TemplatedWidget } from '../components/TemplatedWidget';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { useNmeaStore } from '../store/nmeaStore';

interface AutopilotWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * AutopilotWidget - Registry-First Declarative Display Widget
 * 
 * **Multi-Sensor Architecture:**
 * - Primary: autopilot (actualHeading, targetHeading, rudderAngle, mode, headingSource)
 * - Secondary: compass (rateOfTurn)
 * - Uses sensorKey prop for compass metrics
 * 
 * **Before (371 lines):**
 * - Manual metric extraction from multiple sensors
 * - Manual display value creation  
 * - Manual alarm state extraction
 * - UnifiedWidgetGrid setup with explicit props
 * - Complex control button logic and command manager
 * 
 * **After (60 lines):**
 * - Pure declarative display configuration
 * - Auto-fetch via MetricCells with sensorKey
 * - TemplatedWidget handles layout
 * - Display-only (control functionality removed)
 * 
 * **Layout:** 2Rx2C primary (HDG/TGT, RUDR/TURN) + 2Rx2C secondary (MODE/HDG SRC with full-width)
 */
export const AutopilotWidget: React.FC<AutopilotWidgetProps> = React.memo(({ id }) => {
  // Extract instance number from widget ID
  const instanceNumber = useMemo(() => {
    const match = id.match(/autopilot-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }, [id]);

  // Get sensor instance
  const autopilotInstance = useNmeaStore(
    (state) => state.nmeaData.sensors.autopilot?.[instanceNumber]
  );

  // Subscribe to timestamp to trigger re-renders (SensorInstance is mutable)
  const _timestamp = useNmeaStore(
    (state) => state.nmeaData.sensors.autopilot?.[instanceNumber]?.timestamp
  );

  return (
    <TemplatedWidget
      template="2Rx2C-SEP-2Rx2C-WIDE"
      sensorInstance={autopilotInstance}
      sensorType="autopilot"
      additionalSensors={[
        { sensorType: 'compass', instance: instanceNumber }
      ]}
      testID={`autopilot-widget-${instanceNumber}`}
    >
      {/* Primary Grid: Headings and Rudder */}
      <PrimaryMetricCell metricKey="actualHeading" />
      <PrimaryMetricCell metricKey="targetHeading" />
      <PrimaryMetricCell metricKey="rudderAngle" />
      <PrimaryMetricCell sensorKey="compass" metricKey="rateOfTurn" />
      
      {/* Secondary Grid: Mode and Heading Source (full-width cells) */}
      <SecondaryMetricCell metricKey="mode" />
      <SecondaryMetricCell metricKey="headingSource" />
    </TemplatedWidget>
  );
});

export default AutopilotWidget;
