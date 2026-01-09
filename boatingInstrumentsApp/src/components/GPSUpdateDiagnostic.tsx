/**
 * GPS Update Diagnostic Component
 * Drop this in your app to see real-time GPS timestamp updates
 */

import React, { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';

export const GPSUpdateDiagnostic: React.FC = () => {
  const gpsTimestamp = useNmeaStore((state) => state.nmeaData.sensors.gps?.[0]?.timestamp);
  const gpsData = useNmeaStore((state) => state.nmeaData.sensors.gps?.[0]);
  const renderCountRef = useRef(0);
  const lastTimestampRef = useRef<number>(0);
  const lastRenderTimeRef = useRef<number>(Date.now());

  renderCountRef.current++;

  useEffect(() => {
    if (gpsTimestamp && gpsTimestamp !== lastTimestampRef.current) {
      const now = Date.now();
      const timeSinceLastRender = now - lastRenderTimeRef.current;
      const timeSinceLastUpdate = gpsTimestamp - lastTimestampRef.current;
      
      console.log(`🕐 GPS TIMESTAMP CHANGED:`, {
        timestamp: gpsTimestamp,
        timeSinceLastRender: `${timeSinceLastRender}ms`,
        timeSinceLastUpdate: `${timeSinceLastUpdate}ms`,
        renderCount: renderCountRef.current,
        utcTime: gpsData?.getMetric('utcTime')?.formattedValue,
      });
      
      lastTimestampRef.current = gpsTimestamp;
      lastRenderTimeRef.current = now;
    }
  }, [gpsTimestamp, gpsData]);

  return (
    <View style={{ padding: 20, backgroundColor: '#000', borderWidth: 2, borderColor: '#0f0' }}>
      <Text style={{ color: '#0f0', fontFamily: 'monospace', fontSize: 12 }}>
        GPS DIAGNOSTIC
      </Text>
      <Text style={{ color: '#0f0', fontFamily: 'monospace', fontSize: 12 }}>
        Timestamp: {gpsTimestamp || 'null'}
      </Text>
      <Text style={{ color: '#0f0', fontFamily: 'monospace', fontSize: 12 }}>
        Renders: {renderCountRef.current}
      </Text>
      <Text style={{ color: '#0f0', fontFamily: 'monospace', fontSize: 12 }}>
        UTC Time: {gpsData?.getMetric('utcTime')?.formattedValue || 'null'}
      </Text>
    </View>
  );
};
