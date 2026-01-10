import React from 'react';
import TemplatedWidget from '../components/TemplatedWidget';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';

interface GPSWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * GPS Widget - Declarative Configuration
 * Template: 2Rx1C-SEP-2Rx1C (2 primary rows, separator, 2 secondary rows, 1 column each)
 * Primary: Latitude, Longitude (coordinate formatting with MetricValue)
 * Secondary: UTC Date, UTC Time (datetime formatting with forceTimezone: 'utc')
 * 
 * **NO SUBSCRIPTIONS:** Widget is pure layout. TemplatedWidget fetches sensor,
 * MetricCells subscribe individually via useMetric hook. This enables fine-grained
 * reactivity - only affected cells re-render on updates.
 */
export const GPSWidget: React.FC<GPSWidgetProps> = React.memo(({ id, instanceNumber = 0 }) => {
  return (
    <TemplatedWidget
      template="2Rx1C-SEP-2Rx1C"
      sensorType="gps"
      instanceNumber={instanceNumber}
      testID={id}
      additionalSensors={[
        { sensorType: 'depth', instance: 0 }
      ]}
    >
      {/* Primary Grid: Coordinates */}
      <PrimaryMetricCell metricKey="latitude" />
      <PrimaryMetricCell metricKey="longitude" />

      {/* Secondary Grid: Date/Time (UTC always via forceTimezone in field config)
      <SecondaryMetricCell metricKey="utcDate" />
      <SecondaryMetricCell metricKey="utcTime" /> */}
      <SecondaryMetricCell sensorKey="depth" metricKey="depth" />
      <SecondaryMetricCell sensorKey="depth" metricKey="depth.avg" /> 
    </TemplatedWidget>
  );
});

GPSWidget.displayName = 'GPSWidget';

export default GPSWidget;
