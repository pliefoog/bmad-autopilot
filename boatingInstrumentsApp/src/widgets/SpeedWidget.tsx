import React, { useMemo } from 'react';
import { useNmeaStore } from '../store/nmeaStore';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { TemplatedWidget } from '../components/TemplatedWidget';

interface SpeedWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * Speed Widget - Registry-First Declarative Implementation
 * 
 * **Multi-Sensor Architecture:**
 * - Primary sensor: 'speed' (STW - Speed Through Water)
 * - Additional sensor: 'gps' (SOG - Speed Over Ground)
 * - Uses sensorKey prop to access GPS metrics cleanly
 * 
 * **Before (214 lines with manual SensorContext.Provider wrapping):**
 * - Manual metric extraction from 2 sensors (GPS + speed)
 * - Manual display value creation
 * - Manual alarm state extraction
 * - Nested SensorContext.Provider for each GPS metric
 * 
 * **After (~50 lines with additionalSensors pattern):**
 * - Clean declarative configuration
 * - TemplatedWidget handles multi-sensor context
 * - MetricCells use sensorKey prop for secondary sensors
 * - Auto-fetch everything via context
 * 
 * **Layout:** 2Rx2C primary (SOG, STW, MAX SOG, MAX STW) + 2Rx2C secondary (AVG SOG, AVG STW + 2 empty)
 * 
 * **Session Stats Note:**
 * MAX/AVG cells currently show current values.
 * TODO: Create StatMetricCell component with stat="max|min|avg" prop
 */
export const SpeedWidget: React.FC<SpeedWidgetProps> = React.memo(({ id }) => {
  // Extract instance number from widget ID
  const instanceNumber = useMemo(() => {
    const match = id.match(/speed-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }, [id]);

  // Get primary sensor instance (speed)
  const speedSensorInstance = useNmeaStore(
    (state) => state.nmeaData.sensors.speed?.[instanceNumber]
  );

  // Subscribe to timestamp to trigger re-renders (SensorInstance is mutable)
  const _timestamp = useNmeaStore(
    (state) => state.nmeaData.sensors.speed?.[instanceNumber]?.timestamp
  );

  return (
    <TemplatedWidget
      template="2Rx2C-SEP-2Rx2C"
      sensorInstance={speedSensorInstance}
      sensorType="speed"
      debugLayout={true}
      additionalSensors={[
        { sensorType: 'gps', instance: instanceNumber }
      ]}
      testID={`speed-widget-${instanceNumber}`}
    >
      {/* Primary Grid Row 1: Current SOG and STW */}
      <PrimaryMetricCell sensorKey="gps" metricKey="speedOverGround" />
      <PrimaryMetricCell metricKey="throughWater" />
      
      {/* Primary Grid Row 2: MAX SOG and MAX STW
          NOTE: Session stats not yet supported - showing current values
          TODO: Create StatMetricCell component with stat="max|min|avg" prop
      */}
      <PrimaryMetricCell sensorKey="gps" metricKey="speedOverGround" />
      <PrimaryMetricCell metricKey="throughWater" />
      
      {/* Secondary Grid: AVG SOG and AVG STW */}
      <SecondaryMetricCell sensorKey="gps" metricKey="speedOverGround" />
      <SecondaryMetricCell metricKey="throughWater" />
      
      {/* Empty cells for layout consistency */}
      <SecondaryMetricCell metricKey="throughWater" />
      <SecondaryMetricCell metricKey="throughWater" />
    </TemplatedWidget>
  );
});

export default SpeedWidget;
