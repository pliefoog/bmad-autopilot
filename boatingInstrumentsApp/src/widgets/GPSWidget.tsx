import React from 'react';
import { useNmeaStore } from '../store/nmeaStore';
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
 */
export const GPSWidget: React.FC<GPSWidgetProps> = React.memo(
  ({ id }) => {
    const gpsInstance = useNmeaStore(
      (state) => state.nmeaData.sensors.gps?.[0]
    );

    // Subscribe to timestamp to trigger re-renders (SensorInstance is mutable)
    const _timestamp = useNmeaStore(
      (state) => state.nmeaData.sensors.gps?.[0]?.timestamp
    );

    return (
      <TemplatedWidget
        template="2Rx1C-SEP-2Rx1C"
        sensorInstance={gpsInstance}
        sensorType="gps"
        testID={id}
      >
        {/* Primary Grid: Coordinates */}
        <PrimaryMetricCell metricKey="latitude" />
        <PrimaryMetricCell metricKey="longitude" />

        {/* Secondary Grid: Date/Time (UTC always via forceTimezone in field config) */}
        <SecondaryMetricCell metricKey="utcDate" />
        <SecondaryMetricCell metricKey="utcTime" />
      </TemplatedWidget>
    );
  },
);

GPSWidget.displayName = 'GPSWidget';

export default GPSWidget;
