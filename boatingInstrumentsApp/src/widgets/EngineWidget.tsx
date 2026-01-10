import React from 'react';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import TemplatedWidget from '../components/TemplatedWidget';

interface EngineWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * Engine Widget - Declarative Configuration
 * Template: 2Rx2C-SEP-2Rx2C-WIDE
 * Primary: RPM, Coolant Temp, Oil Pressure, Alternator Voltage
 * Secondary: Fuel Rate, Engine Hours (full-width cells)
 * 
 * **NO SUBSCRIPTIONS:** Widget is pure layout. TemplatedWidget fetches sensor,
 * MetricCells subscribe individually via useMetric hook. Enables fine-grained reactivity.
 */
export const EngineWidget: React.FC<EngineWidgetProps> = React.memo(({ id, instanceNumber = 0 }) => {
  return (
    <TemplatedWidget
      template="2Rx2C-SEP-2Rx2C-WIDE"
      sensorType="engine"
      instanceNumber={instanceNumber}
      testID={id}
    >
      {/* Primary Grid: Critical metrics */}
      <PrimaryMetricCell sensorType="engine" instance={instanceNumber} metricKey="rpm" />
      <PrimaryMetricCell sensorType="engine" instance={instanceNumber} metricKey="coolantTemp" />
      <PrimaryMetricCell sensorType="engine" instance={instanceNumber} metricKey="oilPressure" />
      <PrimaryMetricCell sensorType="engine" instance={instanceNumber} metricKey="alternatorVoltage" />

      {/* Secondary Grid: Full-width cells */}
      <SecondaryMetricCell sensorType="engine" instance={instanceNumber} metricKey="fuelRate" />
      <SecondaryMetricCell sensorType="engine" instance={instanceNumber} metricKey="hours" />
    </TemplatedWidget>
  );
});

EngineWidget.displayName = 'EngineWidget';

export default EngineWidget;

export default EngineWidget;
