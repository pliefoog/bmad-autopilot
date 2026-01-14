import React from 'react';
import TrendLine from '../components/TrendLine';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import TemplatedWidget from '../components/TemplatedWidget';

interface TemperatureWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * Temperature Widget - Declarative Configuration
 * Template: 2Rx1C-SEP-2Rx1C
 * Primary: Temperature value with trend visualization
 * Secondary: Location metadata
 * 
 * **NO SUBSCRIPTIONS:** Widget is pure layout. TemplatedWidget fetches sensor,
 * MetricCells subscribe individually via MetricContext hooks (useMetricValue). Enables fine-grained reactivity.
 */
export const TemperatureWidget: React.FC<TemperatureWidgetProps> = React.memo(({ id, instanceNumber = 0 }) => {
  return (
    <TemplatedWidget
      template="2Rx1C-SEP-2Rx1C"
      sensorType="temperature"
      instanceNumber={instanceNumber}
      testID={id}
    >
      {/* Primary Grid: Current temperature + trend visualization */}
      <PrimaryMetricCell sensorType="temperature" instance={instanceNumber} metricKey="temperature" />

      {/* TrendLine: Explicit props pattern */}
      <TrendLine
        sensorType="temperature"
        instance={instanceNumber}
        metricKey="temperature"
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

TemperatureWidget.displayName = 'TemperatureWidget';

export default TemperatureWidget;
