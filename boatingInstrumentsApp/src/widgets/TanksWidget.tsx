import React, { useMemo } from 'react';
import { TemplatedWidget } from '../components/TemplatedWidget';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';

interface TanksWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * TanksWidget - Multi-instance tank level monitoring
 * Template: 2Rx1C-SEP-2Rx1C
 * Primary: Level (%), Capacity
 * Secondary: Type, Name
 *
 * NO SUBSCRIPTIONS: Widget is pure layout, TemplatedWidget handles store access
 */
export const TanksWidget: React.FC<TanksWidgetProps> = React.memo(
  ({ id, instanceNumber: propInstanceNumber }) => {
    // Use provided instanceNumber or extract from widget ID
    const instanceNumber = useMemo(() => {
      if (propInstanceNumber !== undefined) return propInstanceNumber;
      const match = id.match(/tank-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }, [id, propInstanceNumber]);

    return (
      <TemplatedWidget
        template="2Rx1C-SEP-2Rx1C"
        sensorType="tank"
        instanceNumber={instanceNumber}
      >
        {
          [
            <PrimaryMetricCell key="level" sensorType="tank" instance={instanceNumber} metricKey="level" />,
            <PrimaryMetricCell key="capacity" sensorType="tank" instance={instanceNumber} metricKey="capacity" />,
            <SecondaryMetricCell key="type" sensorType="tank" instance={instanceNumber} metricKey="type" />,
          ] as React.ReactElement[]
        }
      </TemplatedWidget>
    );
  },
);

TanksWidget.displayName = 'TanksWidget';

export default TanksWidget;
