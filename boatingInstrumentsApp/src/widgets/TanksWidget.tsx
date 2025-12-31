import React, { useMemo } from 'react';
import { useNmeaStore } from '../store/nmeaStore';
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
 */
export const TanksWidget: React.FC<TanksWidgetProps> = React.memo(
  ({ id, instanceNumber: propInstanceNumber }) => {
    // Use provided instanceNumber or extract from widget ID
    const instanceNumber = useMemo(() => {
      if (propInstanceNumber !== undefined) return propInstanceNumber;
      const match = id.match(/tank-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }, [id, propInstanceNumber]);

    const tankInstance = useNmeaStore(
      (state) => state.nmeaData.sensors.tank?.[instanceNumber]
    );

    return (
      <TemplatedWidget
        template="2Rx1C-SEP-2Rx1C"
        sensorInstance={tankInstance}
        sensorType="tank"
      >
        {[
          <PrimaryMetricCell key="level" metricKey="level" />,
          <PrimaryMetricCell key="capacity" metricKey="capacity" />,
          <SecondaryMetricCell key="type" metricKey="type" />,
          <SecondaryMetricCell key="name" metricKey="name" />,
        ] as React.ReactElement[]}
      </TemplatedWidget>
    );
  },
);

TanksWidget.displayName = 'TanksWidget';

export default TanksWidget;
