import React, { useMemo } from 'react';
import { useNmeaStore } from '../store/nmeaStore';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { TemplatedWidget } from '../components/TemplatedWidget';
import { SensorContext } from '../contexts/SensorContext';

interface SpeedWidgetProps {
  id: string;
  title: string;
  width?: number;
  height?: number;
}

/**
 * Speed Widget - Registry-First Declarative Implementation
 * 
 * **Before (214 lines):**
 * - Manual metric extraction from 2 sensors (GPS + speed)
 * - Manual display value creation
 * - Manual alarm state extraction
 * - Manual session stats formatting
 * - UnifiedWidgetGrid setup
 * 
 * **After (~90 lines):**
 * - Pure configuration
 * - Dual sensor pattern (GPS for SOG, speed for STW)
 * - Auto-fetch everything per sensor
 * - TemplatedWidget handles layout
 * - MetricCells handle display
 * 
 * **Layout:** 2Rx2C primary (SOG, STW, MAX SOG, MAX STW) + 2Rx2C secondary (AVG SOG, AVG STW + 2 empty)
 * 
 * **Special Features:**
 * - Dual sensor architecture (nested SensorProvider for GPS metrics)
 * - STW from speed sensor, SOG from GPS sensor
 * - Session stats shown as MAX/AVG in primary/secondary
 * 
 * NOTE: Using speed sensor as primary (STW), GPS as secondary (SOG)
 * This is a workaround since TemplatedWidget only supports one sensorInstance
 * TODO: Enhance TemplatedWidget to support multiple sensor sources
 */
export const SpeedWidget: React.FC<SpeedWidgetProps> = React.memo(({ id }) => {
  // Extract instance number from widget ID
  const instanceNumber = useMemo(() => {
    const match = id.match(/speed-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }, [id]);

  // Get both sensor instances
  const speedSensorInstance = useNmeaStore(
    (state) => state.nmeaData.sensors.speed?.[instanceNumber]
  );
  const gpsSensorInstance = useNmeaStore(
    (state) => state.nmeaData.sensors.gps?.[instanceNumber]
  );

  return (
    <TemplatedWidget
      template="2Rx2C-SEP-2Rx2C"
      sensorInstance={speedSensorInstance}
      sensorType="speed"
      testID={`speed-widget-${instanceNumber}`}
    >
      {/* Primary Grid Row 1: Current SOG and STW */}
      {/* SOG from GPS sensor - needs manual context override */}
      <SensorContext.Provider value={{ sensorInstance: gpsSensorInstance, sensorType: 'gps' }}>
        <PrimaryMetricCell metricKey="speedOverGround" />
      </SensorContext.Provider>
      
      {/* STW from speed sensor (default context) */}
      <PrimaryMetricCell metricKey="throughWater" />
      
      {/* Primary Grid Row 2: MAX SOG and MAX STW
          NOTE: Session stats (max/min/avg) not yet supported by MetricCells
          Using standard cells for now - will show current values
          TODO: Create StatMetricCell component with stat="max|min|avg" prop
      */}
      <SensorContext.Provider value={{ sensorInstance: gpsSensorInstance, sensorType: 'gps' }}>
        <PrimaryMetricCell metricKey="speedOverGround" />
      </SensorContext.Provider>
      <PrimaryMetricCell metricKey="throughWater" />
      
      {/* Secondary Grid: AVG SOG and AVG STW
          NOTE: Same limitation - showing current values until StatMetricCell exists
      */}
      <SensorContext.Provider value={{ sensorInstance: gpsSensorInstance, sensorType: 'gps' }}>
        <SecondaryMetricCell metricKey="speedOverGround" />
      </SensorContext.Provider>
      <SecondaryMetricCell metricKey="throughWater" />
      
      {/* Empty cells for layout consistency */}
      <SecondaryMetricCell metricKey="throughWater" />
      <SecondaryMetricCell metricKey="throughWater" />
    </TemplatedWidget>
  );
});

export default SpeedWidget;
