import React, { useMemo } from 'react';
import TemplatedWidget from '../components/TemplatedWidget';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import TrendLine from '../components/TrendLine';

interface WeatherWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * WeatherWidget - Declarative Configuration with TrendLines
 * Template: 2Rx2C-SEP-2Rx2C-WIDE (2x2 primary grid, full-width secondary section)
 * Primary: Pressure, Air Temp, Humidity, Dew Point (all with MetricValue formatting)
 * Secondary: Pressure & Temperature trend charts (5-minute history)
 * Supports multi-instance weather stations (instance extracted from widget ID)
 *
 * **Marine Weather Context:**
 * Barometric pressure trends indicate approaching weather systems:
 * - Rapid drop (>3 hPa/hr): Storm approaching
 * - Steady rise: Weather clearing
 * - Stable: Current conditions persisting
 *
 * NO SUBSCRIPTIONS: Widget is pure layout, TemplatedWidget handles store access
 */
export const WeatherWidget: React.FC<WeatherWidgetProps> = React.memo(({ id }) => {
  // Extract instance number from widget ID (e.g., "weather-0" → 0)
  const instanceNumber = useMemo(() => {
    const match = id.match(/weather-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }, [id]);

  return (
    <TemplatedWidget
      template="2Rx2C-SEP-2Rx2C-WIDE"
      sensorType="weather"
      instanceNumber={instanceNumber}
      testID={id}
    >
      {/* Primary Grid: Weather metrics in 2x2 layout */}
      <PrimaryMetricCell metricKey="pressure" />
      <PrimaryMetricCell metricKey="airTemperature" />
      <PrimaryMetricCell metricKey="humidity" />
      <PrimaryMetricCell metricKey="dewPoint" />

      {/* Secondary Grid: Trend visualizations (full-width) */}
      <TrendLine metricKey="pressure" timeWindowMs={300000} showXAxis={true} showYAxis={true} />
      <TrendLine
        metricKey="airTemperature"
        timeWindowMs={300000}
        showXAxis={true}
        showYAxis={true}
      />
    </TemplatedWidget>
  );
});

WeatherWidget.displayName = 'WeatherWidget';

export default WeatherWidget;
