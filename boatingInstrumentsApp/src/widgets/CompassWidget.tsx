import React from 'react';
import TemplatedWidget from '../components/TemplatedWidget';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';

interface CompassWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * Compass Widget - Declarative Configuration
 * Template: 2Rx1C-SEP-2Rx1C
 * Primary: True and Magnetic Heading
 * Secondary: Variation and Deviation
 * 
 * **NO SUBSCRIPTIONS:** Widget is pure layout. TemplatedWidget fetches sensor,
 * MetricCells subscribe individually via MetricContext hooks (useMetricValue). Enables fine-grained reactivity.
 */
export const CompassWidget: React.FC<CompassWidgetProps> = React.memo(({ id, instanceNumber = 0 }) => {
  return (
    <TemplatedWidget
      template="2Rx1C-SEP-2Rx1C"
      sensorType="heading"
      instanceNumber={instanceNumber}
      testID={id}
    >
      {/* Primary Grid: True and Magnetic Heading */}
      <PrimaryMetricCell sensorType="heading" instance={instanceNumber} metricKey="true" />
      <PrimaryMetricCell sensorType="heading" instance={instanceNumber} metricKey="magnetic" />

      {/* Secondary Grid: Variation and Deviation */}
      <SecondaryMetricCell sensorType="heading" instance={instanceNumber} metricKey="variation" />
      <SecondaryMetricCell sensorType="heading" instance={instanceNumber} metricKey="deviation" />
    </TemplatedWidget>
  );
});

CompassWidget.displayName = 'CompassWidget';

export default CompassWidget;
