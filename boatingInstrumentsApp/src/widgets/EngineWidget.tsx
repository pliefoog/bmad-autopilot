import React, { useMemo } from 'react';
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
 *
 * NO SUBSCRIPTIONS: Widget is pure layout, TemplatedWidget handles store access
 */
export const EngineWidget: React.FC<EngineWidgetProps> = React.memo(({ id }) => {
  // Extract instance number from widget ID
  const instanceNumber = useMemo(() => {
    const match = id.match(/engine-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }, [id]);

  return (
    <TemplatedWidget
      template="2Rx2C-SEP-2Rx2C-WIDE"
      sensorType="engine"
      instanceNumber={instanceNumber}
      testID={`engine-widget-${instanceNumber}`}
    >
      {/* Primary Grid: 2x2 critical metrics */}
      <PrimaryMetricCell sensorType="engine" instance={instanceNumber} metricKey="rpm" />
      <PrimaryMetricCell sensorType="engine" instance={instanceNumber} metricKey="coolantTemp" />
      <PrimaryMetricCell sensorType="engine" instance={instanceNumber} metricKey="oilPressure" />
      <PrimaryMetricCell sensorType="engine" instance={instanceNumber} metricKey="alternatorVoltage" />

      {/* Secondary Grid: 2x1 WIDE (full-width cells) */}
      <SecondaryMetricCell sensorType="engine" instance={instanceNumber} metricKey="fuelRate" />
      <SecondaryMetricCell sensorType="engine" instance={instanceNumber} metricKey="hours" />
    </TemplatedWidget>
  );
});

export default EngineWidget;
