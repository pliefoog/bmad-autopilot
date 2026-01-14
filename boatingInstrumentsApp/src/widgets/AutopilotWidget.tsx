import React from 'react';
import TemplatedWidget from '../components/TemplatedWidget';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';

interface AutopilotWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * Autopilot Widget - Declarative Configuration
 * Template: 2Rx2C-SEP-2Rx2C-WIDE (4 primary cells, secondary cells span full width)
 * Primary: Actual Heading, Target Heading, Rudder Angle, Rate of Turn
 * Secondary: Mode (single cell, full width)
 * Multi-sensor: Uses both 'autopilot' and 'heading' sensors
 * 
 * **NO SUBSCRIPTIONS:** Widget is pure layout. TemplatedWidget fetches sensor,
 * MetricCells subscribe individually via MetricContext hooks (useMetricValue). Enables fine-grained reactivity.
 */
export const AutopilotWidget: React.FC<AutopilotWidgetProps> = React.memo(({ id, instanceNumber = 0 }) => {
  return (
    <TemplatedWidget
      template="2Rx2C-SEP-2Rx2C-WIDE"
      sensorType="autopilot"
      instanceNumber={instanceNumber}
      testID={id}
    >
      {/* Primary Grid: Headings and Rudder (4 cells in 2x2 grid) */}
      <PrimaryMetricCell sensorType="autopilot" instance={instanceNumber} metricKey="actualHeading" />
      <PrimaryMetricCell sensorType="autopilot" instance={instanceNumber} metricKey="targetHeading" />
      <PrimaryMetricCell sensorType="autopilot" instance={instanceNumber} metricKey="rudderAngle" />
      <PrimaryMetricCell sensorType="heading" instance={instanceNumber} metricKey="rateOfTurn" />

      {/* Secondary Grid: Mode (single cell, full width) */}
      <SecondaryMetricCell sensorType="autopilot" instance={instanceNumber} metricKey="mode" />
    </TemplatedWidget>
  );
});

AutopilotWidget.displayName = 'AutopilotWidget';

export default AutopilotWidget;
