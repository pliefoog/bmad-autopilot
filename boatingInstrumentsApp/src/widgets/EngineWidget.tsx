import React, { useMemo } from 'react';
import { useNmeaStore } from '../store/nmeaStore';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { TemplatedWidget } from '../components/TemplatedWidget';

interface EngineWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * Engine Widget - Registry-First Declarative Implementation
 * 
 * **Before (252 lines):**
 * - Manual metric extraction (7 useMemo calls)
 * - Manual display value creation
 * - Manual alarm state extraction
 * - Manual mnemonic mapping
 * - UnifiedWidgetGrid setup
 * 
 * **After (~30 lines):**
 * - Pure configuration
 * - Auto-fetch everything
 * - Uses WIDE template variant (2Rx2C + 2Rx1C)
 * 
 * **Layout:** 2Rx2C primary (RPM, ECT, EOP, ALT) + 2Rx1C-WIDE secondary (FLOW, EHR full-width)
 */
export const EngineWidget: React.FC<EngineWidgetProps> = React.memo(({ id }) => {

  // Extract instance number from widget ID
  const instanceNumber = useMemo(() => {
    const match = id.match(/engine-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }, [id]);

  // Get SensorInstance - single source of truth
  const engineSensorInstance = useNmeaStore(
    (state) => state.nmeaData.sensors.engine?.[instanceNumber]
  );

  // Subscribe to timestamp to trigger re-renders (SensorInstance is mutable)
  const _timestamp = useNmeaStore(
    (state) => state.nmeaData.sensors.engine?.[instanceNumber]?.timestamp
  );

  return (
    <TemplatedWidget
      template="2Rx2C-SEP-2Rx2C-WIDE"
      sensorInstance={engineSensorInstance}
      sensorType="engine"
      testID={`engine-widget-${instanceNumber}`}
    >
      {/* Primary Grid: 2x2 critical metrics */}
      <PrimaryMetricCell metricKey="rpm" />
      <PrimaryMetricCell metricKey="coolantTemp" />
      <PrimaryMetricCell metricKey="oilPressure" />
      <PrimaryMetricCell metricKey="alternatorVoltage" />
      
      {/* Secondary Grid: 2x1 WIDE (full-width cells) */}
      <SecondaryMetricCell metricKey="fuelRate" />
      <SecondaryMetricCell metricKey="hours" />
    </TemplatedWidget>
  );
});

export default EngineWidget;
