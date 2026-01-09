import React, { useMemo } from 'react';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { TemplatedWidget } from '../components/TemplatedWidget';

interface SpeedWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * Speed Widget - Registry-First Declarative Implementation
 *
 * **Multi-Sensor Architecture:**
 * - Primary sensor: 'speed' (STW - Speed Through Water)
 * - Additional sensor: 'gps' (SOG - Speed Over Ground)
 * - Uses sensorKey prop to access GPS metrics cleanly
 *
 * **Before (214 lines with manual SensorContext.Provider wrapping):**
 * - Manual metric extraction from 2 sensors (GPS + speed)
 * - Manual display value creation
 * - Manual alarm state extraction
 * - Nested SensorContext.Provider for each GPS metric
 *
 * **After (~80 lines with additionalSensors + virtual metrics pattern):**
 * - Clean declarative configuration
 * - TemplatedWidget handles multi-sensor context
 * - MetricCells use sensorKey prop for secondary sensors
 * - Auto-fetch everything via context
 * - Virtual stat metrics for session statistics (min/max/avg)
 *
 * **Layout:** 2Rx2C primary (SOG, STW, MAX SOG, MAX STW) + 2Rx2C secondary (AVG SOG, AVG STW + 2 empty)
 *
 * **Virtual Metrics Pattern (Dot Notation):**
 * - Current values: `metricKey="speedOverGround"`, `metricKey="throughWater"`
 * - Session max: `metricKey="speedOverGround.max"`, `metricKey="throughWater.max"`
 * - Session avg: `metricKey="speedOverGround.avg"`, `metricKey="throughWater.avg"`
 * - Session min: `metricKey="speedOverGround.min"`, `metricKey="throughWater.min"`
 *
 * **How Virtual Metrics Work:**
 * 1. MetricCell strips `.min/.max/.avg` suffix to look up field config in SensorConfigRegistry
 * 2. Calls `sensorInstance.getMetric('fieldName.stat')` which parses suffix, fetches history, calculates stat
 * 3. Returns enriched MetricValue with proper units/formatting (e.g., "12.5 kts")
 * 4. MetricCell adds stat prefix to mnemonic: "SOG" → "MAX SOG", "STW" → "AVG STW"
 *
 * **Sensor Reference Rules:**
 * - Primary sensor (speed): NO sensorKey needed - `<PrimaryMetricCell metricKey="throughWater" />`
 * - Additional sensor (gps): MUST use sensorKey - `<PrimaryMetricCell sensorKey="gps" metricKey="speedOverGround" />`
 * - Virtual metrics work with both: `sensorKey="gps" metricKey="speedOverGround.max"`
 *
 * NO SUBSCRIPTIONS: Widget is pure layout, TemplatedWidget handles store access
 */
export const SpeedWidget: React.FC<SpeedWidgetProps> = React.memo(({ id }) => {
  // Extract instance number from widget ID
  const instanceNumber = useMemo(() => {
    const match = id.match(/speed-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }, [id]);

  return (
    <TemplatedWidget
      template="2Rx2C-SEP-2Rx2C"
      sensorType="speed"
      instanceNumber={instanceNumber}
      additionalSensors={[{ sensorType: 'gps', instance: instanceNumber }]}
      testID={`speed-widget-${instanceNumber}`}
    >
      {/* Primary Grid Row 1: Current SOG and STW */}
      <PrimaryMetricCell sensorKey="gps" metricKey="speedOverGround" />
      <PrimaryMetricCell metricKey="throughWater" />

      {/* Primary Grid Row 2: MAX SOG and MAX STW (using virtual stat metrics) */}
      <PrimaryMetricCell sensorKey="gps" metricKey="speedOverGround.max" />
      <PrimaryMetricCell metricKey="throughWater.max" />

      {/* Secondary Grid: AVG SOG and AVG STW (using virtual stat metrics) */}
      <SecondaryMetricCell sensorKey="gps" metricKey="speedOverGround.avg" />
      <SecondaryMetricCell metricKey="throughWater.avg" />

      {/* Empty cells for layout consistency */}
      <SecondaryMetricCell metricKey="throughWater" />
      <SecondaryMetricCell metricKey="throughWater" />
    </TemplatedWidget>
  );
});

export default SpeedWidget;
