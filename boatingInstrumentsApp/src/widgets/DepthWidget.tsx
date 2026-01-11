import React from 'react';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import TemplatedWidget from '../components/TemplatedWidget';
import TrendLine from '../components/TrendLine';
interface DepthWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * Depth Widget - Declarative Configuration
 * Template: 2Rx1C-SEP-2Rx1C (depth value + trend, min/max stats)
 * Primary: Current depth with trend visualization
 * Secondary: Session minimum and maximum depth
 * 
 * **NO SUBSCRIPTIONS:** Widget is pure layout. TemplatedWidget fetches sensor,
 * MetricCells subscribe individually via MetricContext hooks (useMetricValue). This enables fine-grained
 * reactivity - only affected cells re-render on updates.
 */
export const DepthWidget: React.FC<DepthWidgetProps> = React.memo(({ id, instanceNumber = 0 }) => {
  return (
    <TemplatedWidget
      template="2Rx1C-SEP-2Rx1C"
      sensorType="depth"
      instanceNumber={instanceNumber}
      testID={id}
    >
      {/* Primary Grid: Current depth + trend visualization */}
      <PrimaryMetricCell sensorType="depth" instance={instanceNumber} metricKey="depth" />
      <TrendLine
        sensorType="depth"
        instance={instanceNumber}
        metricKey="depth"
        timeWindowMs={5 * 60 * 1000}
        usePrimaryLine
        showXAxis
        showYAxis
        xAxisPosition="top"
        yAxisDirection="down"
        showTimeLabels
        strokeWidth={2}
        forceZero
      />
      {/* Secondary Grid: Session statistics using virtual metrics */}
      <SecondaryMetricCell sensorType="depth" instance={instanceNumber} metricKey="depth.min" />
      <SecondaryMetricCell sensorType="depth" instance={instanceNumber} metricKey="depth.max" />
    </TemplatedWidget>
  );
});

DepthWidget.displayName = 'DepthWidget';

export default DepthWidget;
