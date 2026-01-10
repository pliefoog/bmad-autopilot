import React from 'react';
import TemplatedWidget from '../components/TemplatedWidget';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';

interface TanksWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * TanksWidget - Multi-instance tank level monitoring
 * Template: 2Rx1C-SEP-2Rx1C
 * Primary: Level (%), Capacity
 * Secondary: Type, Name
 *
 * **NO SUBSCRIPTIONS:** Widget is pure layout. TemplatedWidget fetches sensor,
 * MetricCells subscribe individually via useMetric hook. Enables fine-grained reactivity.
 */
export const TanksWidget: React.FC<TanksWidgetProps> = React.memo(({ id, instanceNumber = 0 }) => {
    return (
      <TemplatedWidget
        template="2Rx1C-SEP-2Rx1C"
        sensorType="tank"
        instanceNumber={instanceNumber}
        testID={id}
      >
        {
          [
            <PrimaryMetricCell key="level" sensorType="tank" instance={instanceNumber} metricKey="level" />,
            <PrimaryMetricCell key="capacity" sensorType="tank" instance={instanceNumber} metricKey="capacity" />,
            <SecondaryMetricCell key="type" sensorType="tank" instance={instanceNumber} metricKey="type" />,
          ] as React.ReactElement[]
        }
      </TemplatedWidget>
    );
  },
);

TanksWidget.displayName = 'TanksWidget';

export default TanksWidget;
