import React, { useMemo } from 'react';
import { useNmeaStore } from '../store/nmeaStore';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { TemplatedWidget } from '../components/TemplatedWidget';

interface WindWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * Wind Widget - Registry-First Declarative Implementation
 * 
 * **Before (366 lines):**
 * - State management for AWA/TWA toggle
 * - Manual metric extraction
 * - Manual compass rendering logic
 * - Manual display value creation
 * 
 * **After (~30 lines):**
 * - Pure configuration
 * - Auto-fetch everything
 * - Uses 2Rx1C-SEP-2Rx1C template (simple vertical)
 * 
 * **Layout:** 2Rx1C primary (SPD, DIR) + 2Rx1C secondary (TWS, TWD)
 */
export const WindWidget: React.FC<WindWidgetProps> = React.memo(({ id }) => {
  // Extract instance number from widget ID
  const instanceNumber = useMemo(() => {
    const match = id.match(/wind-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }, [id]);

  // Get SensorInstance - single source of truth
  const windSensorInstance = useNmeaStore(
    (state) => state.nmeaData.sensors.wind?.[instanceNumber]
  );

  return (
    <TemplatedWidget
      template="2Rx1C-SEP-2Rx1C"
      sensorInstance={windSensorInstance}
      sensorType="wind"
      testID={`wind-widget-${instanceNumber}`}
    >
      {/* Primary Grid: 2x1 apparent wind */}
      <PrimaryMetricCell metricKey="speed" />
      <PrimaryMetricCell metricKey="direction" />
      
      {/* Secondary Grid: 2x1 true wind */}
      <SecondaryMetricCell metricKey="trueSpeed" />
      <SecondaryMetricCell metricKey="trueDirection" />
    </TemplatedWidget>
  );
});

