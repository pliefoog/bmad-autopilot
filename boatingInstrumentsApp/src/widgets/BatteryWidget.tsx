import React, { useMemo } from 'react';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { TemplatedWidget } from '../components/TemplatedWidget';
import { useNmeaStore } from '../store/nmeaStore';
import { EmptyCell } from 'components/EmptyCell';

interface BatteryWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * Battery Widget - Registry-First Declarative Implementation (Architecture v2.0)
 * 
 * **Version-Based Reactivity:**
 * - Uses useSensorVersion() for efficient re-renders
 * - Eliminates timestamp subscription workaround
 * - Only re-renders when battery sensor data actually changes
 * 
 * **Before (237 lines):**
 * - Manual metric extraction
 * - Manual display value creation
 * - Manual alarm state extraction  
 * - Manual mnemonic mapping
 * - UnifiedWidgetGrid setup
 * - Dual subscriptions (instance + timestamp)
 * 
 * **After (25 lines):**
 * - Pure configuration
 * - Auto-fetch everything
 * - TemplatedWidget handles layout
 * - MetricCells handle display
 * - Single version-based subscription
 * 
 * **Layout:** 2Rx2C primary (VLT, AMP, TMP, SOC) + 2Rx2C secondary (CAP, CHEM, NOM, NAME)
 */
export const BatteryWidget: React.FC<BatteryWidgetProps> = React.memo(({ id }) => {

  // Extract instance number from widget ID
  const instanceNumber = useMemo(() => {
    const match = id.match(/battery-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }, [id]);

  // Get SensorInstance for context (MetricCells subscribe individually)
  // Widget no longer needs subscription - cells handle their own reactivity
  const batterySensorInstance = useNmeaStore(
    (state) => state.nmeaData.sensors.battery?.[instanceNumber]
  );

  return (
    <TemplatedWidget
      template="2Rx2C-SEP-2Rx2C"
      sensorInstance={batterySensorInstance}
      sensorType="battery"
      testID={`battery-widget-${instanceNumber}`}
    >
      {/* Primary Grid: 2x2 critical metrics */}
      <PrimaryMetricCell metricKey="voltage" />
      <PrimaryMetricCell metricKey="current" />
      <PrimaryMetricCell metricKey="temperature" />
      <PrimaryMetricCell metricKey="stateOfCharge" />
      
      {/* Secondary Grid: 2x2 configuration/status (name now in header) */}
      <SecondaryMetricCell metricKey="capacity" />
      <SecondaryMetricCell metricKey="chemistry" />
      <SecondaryMetricCell metricKey="nominalVoltage" />
      <EmptyCell />
    </TemplatedWidget>
  );
});

export default BatteryWidget;
