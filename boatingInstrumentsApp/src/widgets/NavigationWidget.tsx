import React from 'react';
import { useNmeaStore } from '../store/nmeaStore';
import TemplatedWidget from '../components/TemplatedWidget';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';

interface NavigationWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * Navigation Widget - Declarative Configuration
 * Template: 4Rx2C-NONE (4 primary rows in 2x2 grid, no secondary section)
 * Primary: Bearing, Distance, XTE, VMG (all with MetricValue formatting)
 * 
 * Note: Waypoint name and ETA not displayed in this compact view.
 * Consider adding 2Rx2C-SEP-2Rx1C template variant for waypoint info.
 */
export const NavigationWidget: React.FC<NavigationWidgetProps> = React.memo(
  ({ id }) => {

    const navigationInstance = useNmeaStore(
      (state) => state.nmeaData.sensors.navigation?.[0]
    );

    // Subscribe to timestamp to trigger re-renders (SensorInstance is mutable)
    const _timestamp = useNmeaStore(
      (state) => state.nmeaData.sensors.navigation?.[0]?.timestamp
    );

    return (
      <TemplatedWidget
        template="4Rx2C-NONE"
        sensorInstance={navigationInstance}
        sensorType="navigation"
        testID={id}
      >
        {/* Primary Grid: Navigation metrics in 2x2 layout */}
        <PrimaryMetricCell metricKey="bearingToWaypoint" />
        <PrimaryMetricCell metricKey="distanceToWaypoint" />
        <PrimaryMetricCell metricKey="crossTrackError" />
        <PrimaryMetricCell metricKey="velocityMadeGood" />
      </TemplatedWidget>
    );
  },
);

NavigationWidget.displayName = 'NavigationWidget';

export default NavigationWidget;
