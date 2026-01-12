import React from 'react';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import TemplatedWidget from '../components/TemplatedWidget';

interface SpeedWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * Speed Widget - Declarative Configuration
 * Template: 2Rx2C-SEP-2Rx2C
 * Primary: SOG, STW, Trip Distance, Total Distance
 * Secondary: MAX SOG, MAX STW, AVG SOG, AVG STW
 * Multi-sensor: Uses both 'gps' (SOG) and 'speed' (STW/distances) sensors
 * Virtual metrics: Uses .max and .avg suffixes for session statistics
 * 
 * **NO SUBSCRIPTIONS:** Widget is pure layout. TemplatedWidget fetches sensor,
 * MetricCells subscribe individually via MetricContext hooks (useMetricValue). Enables fine-grained reactivity.
 */
export const SpeedWidget: React.FC<SpeedWidgetProps> = React.memo(({ id, instanceNumber = 0 }) => {
  return (
    <TemplatedWidget
      template="2Rx2C-SEP-2Rx2C"
      sensorType="speed"
      instanceNumber={instanceNumber}
      testID={id}
    >
      {/* Primary Grid Row 1: Current SOG and STW */}
      <PrimaryMetricCell sensorType="gps" instance={instanceNumber} metricKey="speedOverGround" />
      <PrimaryMetricCell sensorType="speed" instance={instanceNumber} metricKey="throughWater" />

      {/* Primary Grid Row 2: Trip and Total Distance */}
      <PrimaryMetricCell sensorType="speed" instance={instanceNumber} metricKey="tripDistance" />
      <PrimaryMetricCell sensorType="speed" instance={instanceNumber} metricKey="totalDistance" />

      {/* Secondary Grid: MAX and AVG speeds */}
      <SecondaryMetricCell sensorType="gps" instance={instanceNumber} metricKey="speedOverGround.max" />
      <SecondaryMetricCell sensorType="speed" instance={instanceNumber} metricKey="throughWater.max" />
      <SecondaryMetricCell sensorType="gps" instance={instanceNumber} metricKey="speedOverGround.avg" />
      <SecondaryMetricCell sensorType="speed" instance={instanceNumber} metricKey="throughWater.avg" />
    </TemplatedWidget>
  );
});

SpeedWidget.displayName = 'SpeedWidget';

export default SpeedWidget;
