import React from 'react';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import TemplatedWidget from '../components/TemplatedWidget';

interface WindWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * Wind Widget - Declarative Configuration
 * Template: 2Rx1C-SEP-2Rx1C
 * Primary: Apparent Wind Speed and Direction
 * Secondary: True Wind Speed and Direction
 * 
 * **NO SUBSCRIPTIONS:** Widget is pure layout. TemplatedWidget fetches sensor,
 * MetricCells subscribe individually via useMetric hook. Enables fine-grained reactivity.
 */
export const WindWidget: React.FC<WindWidgetProps> = React.memo(({ id, instanceNumber = 0 }) => {
  return (
    <TemplatedWidget
      template="2Rx1C-SEP-2Rx1C"
      sensorType="wind"
      instanceNumber={instanceNumber}
      testID={id}
    >
      {/* Primary Grid: Apparent wind */}
      <PrimaryMetricCell sensorType="wind" instance={instanceNumber} metricKey="speed" />
      <PrimaryMetricCell sensorType="wind" instance={instanceNumber} metricKey="direction" />

      {/* Secondary Grid: True wind */}
      <SecondaryMetricCell sensorType="wind" instance={instanceNumber} metricKey="trueSpeed" />
      <SecondaryMetricCell sensorType="wind" instance={instanceNumber} metricKey="trueDirection" />
    </TemplatedWidget>
  );
});

WindWidget.displayName = 'WindWidget';

export default WindWidget;
