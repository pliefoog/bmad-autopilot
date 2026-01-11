import React from 'react';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import TemplatedWidget from '../components/TemplatedWidget';
import { EmptyCell } from 'components/EmptyCell';

interface BatteryWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * Battery Widget - Declarative Configuration
 * Template: 2Rx2C-SEP-2Rx2C
 * Primary: Voltage, Current, Temperature, State of Charge
 * Secondary: Capacity, Chemistry, Nominal Voltage
 * 
 * **NO SUBSCRIPTIONS:** Widget is pure layout. TemplatedWidget fetches sensor,
 * MetricCells subscribe individually via MetricContext hooks (useMetricValue). Enables fine-grained reactivity.
 */
export const BatteryWidget: React.FC<BatteryWidgetProps> = React.memo(({ id, instanceNumber = 0 }) => {
  return (
    <TemplatedWidget
      template="2Rx2C-SEP-2Rx2C"
      sensorType="battery"
      instanceNumber={instanceNumber}
      testID={id}
    >
      {/* Primary Grid: 2x2 critical metrics */}
      <PrimaryMetricCell sensorType="battery" instance={instanceNumber} metricKey="voltage" />
      <PrimaryMetricCell sensorType="battery" instance={instanceNumber} metricKey="current" />
      <PrimaryMetricCell sensorType="battery" instance={instanceNumber} metricKey="temperature" />
      <PrimaryMetricCell sensorType="battery" instance={instanceNumber} metricKey="stateOfCharge" />

      {/* Secondary Grid: 2x2 configuration/status (name now in header) */}
      <SecondaryMetricCell sensorType="battery" instance={instanceNumber} metricKey="capacity" />
      <SecondaryMetricCell sensorType="battery" instance={instanceNumber} metricKey="chemistry" />
      <SecondaryMetricCell sensorType="battery" instance={instanceNumber} metricKey="nominalVoltage" />
      <EmptyCell />
    </TemplatedWidget>
  );
});

BatteryWidget.displayName = 'BatteryWidget';

export default BatteryWidget;
