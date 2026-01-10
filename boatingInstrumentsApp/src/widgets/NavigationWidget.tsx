import React from 'react';
import TemplatedWidget from '../components/TemplatedWidget';
import PrimaryMetricCell from '../components/PrimaryMetricCell';

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
 *
 * NO SUBSCRIPTIONS: Widget is pure layout, TemplatedWidget handles store access
 */
export const NavigationWidget: React.FC<NavigationWidgetProps> = React.memo(({ id }) => {
  return (
    <TemplatedWidget
      template="4Rx2C-NONE"
      sensorType="navigation"
      instanceNumber={0}
      testID={id}
    >
      {/* Primary Grid: Navigation metrics in 2x2 layout */}
      <PrimaryMetricCell sensorType="navigation" instance={0} metricKey="bearingToWaypoint" />
      <PrimaryMetricCell sensorType="navigation" instance={0} metricKey="distanceToWaypoint" />
      <PrimaryMetricCell sensorType="navigation" instance={0} metricKey="crossTrackError" />
      <PrimaryMetricCell sensorType="navigation" instance={0} metricKey="velocityMadeGood" />
    </TemplatedWidget>
  );
});

NavigationWidget.displayName = 'NavigationWidget';

export default NavigationWidget;
