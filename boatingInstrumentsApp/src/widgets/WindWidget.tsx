import React from 'react';
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
 *
 * NO SUBSCRIPTIONS: Widget is pure layout, TemplatedWidget handles store access
 */
export const WindWidget: React.FC<WindWidgetProps> = React.memo(({ id, instanceNumber = 0 }) => {
  return (
    <TemplatedWidget
      template="2Rx1C-SEP-2Rx1C"
      sensorType="wind"
      instanceNumber={instanceNumber}
      testID={`wind-widget-${instanceNumber}`}
    >
      {/* Primary Grid: 2x1 apparent wind */}
      <PrimaryMetricCell sensorType="wind" instance={instanceNumber} metricKey="speed" />
      <PrimaryMetricCell sensorType="wind" instance={instanceNumber} metricKey="direction" />

      {/* Secondary Grid: 2x1 true wind */}
      <SecondaryMetricCell sensorType="wind" instance={instanceNumber} metricKey="trueSpeed" />
      <SecondaryMetricCell sensorType="wind" instance={instanceNumber} metricKey="trueDirection" />
    </TemplatedWidget>
  );
});
