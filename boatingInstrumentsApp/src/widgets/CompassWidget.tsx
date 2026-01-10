import React from 'react';
import { TemplatedWidget } from '../components/TemplatedWidget';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';

interface CompassWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * CompassWidget - Registry-First Declarative Implementation
 *
 * **Before (351 lines):**
 * - Manual metric extraction for headings, variation, deviation
 * - Manual display value creation and formatting
 * - Manual stale data detection
 * - UnifiedWidgetGrid with explicit props
 * - Complex heading calculation logic
 *
 * **After (~60 lines):**
 * - Pure declarative configuration
 * - Auto-fetch via MetricCells
 * - TemplatedWidget handles layout
 * - All formatting in ConversionRegistry
 *
 * **Layout:** 2Rx1C primary (TRUE/MAG headings) + 2Rx1C secondary (VAR/DEV)
 *
 * **Removed features:**
 * - Interactive mode toggle (TRUE/MAGNETIC) - not used in practice
 * - SVG CompassRose visualization - could be added back if needed
 * - Manual cardinal direction calculation - handled by formatter
 *
 * NO SUBSCRIPTIONS: Widget is pure layout, TemplatedWidget handles store access
 */
export const CompassWidget: React.FC<CompassWidgetProps> = React.memo(({ id, instanceNumber = 0 }) => {
  return (
    <TemplatedWidget
      template="2Rx1C-SEP-2Rx1C"
      sensorType="compass"
      instanceNumber={instanceNumber}
      testID={`compass-widget-${instanceNumber}`}
    >
      {/* Primary Grid: True and Magnetic Heading */}
      <PrimaryMetricCell sensorType="compass" instance={instanceNumber} metricKey="trueHeading" />
      <PrimaryMetricCell sensorType="compass" instance={instanceNumber} metricKey="magneticHeading" />

      {/* Secondary Grid: Variation and Deviation */}
      <SecondaryMetricCell sensorType="compass" instance={instanceNumber} metricKey="variation" />
      <SecondaryMetricCell sensorType="compass" instance={instanceNumber} metricKey="deviation" />
    </TemplatedWidget>
  );
});

CompassWidget.displayName = 'CompassWidget';

export default CompassWidget;
