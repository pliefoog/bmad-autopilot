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
 * Template: 2Rx2C-SEP-2Rx2C-WIDE
 * Primary: Actual Heading, Target Heading, Rudder Angle, Rate of Turn
 * Secondary: Mode, Heading Source (full-width cells)
 * Multi-sensor: Uses both 'autopilot' and 'compass' sensors
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
      {/* Primary Grid: Headings and Rudder */}
      <PrimaryMetricCell sensorType="autopilot" instance={instanceNumber} metricKey="actualHeading" />
      <PrimaryMetricCell sensorType="autopilot" instance={instanceNumber} metricKey="targetHeading" />
      <PrimaryMetricCell sensorType="autopilot" instance={instanceNumber} metricKey="rudderAngle" />
      <PrimaryMetricCell sensorType="compass" instance={instanceNumber} metricKey="rateOfTurn" />

      {/* Secondary Grid: Mode and Heading Source */}
      <SecondaryMetricCell sensorType="autopilot" instance={instanceNumber} metricKey="mode" />
      <SecondaryMetricCell sensorType="autopilot" instance={instanceNumber} metricKey="headingSource" />
    </TemplatedWidget>
  );
});

AutopilotWidget.displayName = 'AutopilotWidget';

export default AutopilotWidget;
