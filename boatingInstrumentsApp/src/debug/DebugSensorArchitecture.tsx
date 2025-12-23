/**
 * TEMPORARY DEBUG COMPONENT
 *
 * Used during Sensor-First Architecture migration to verify core functionality
 * without UI compilation errors blocking verification.
 */

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';

export const DebugSensorArchitecture: React.FC = () => {
  const { connectionStatus, nmeaData } = useNmeaStore();

  useEffect(() => {
    // Log every second to monitor sensor data
    const interval = setInterval(() => {
      if (nmeaData?.sensors) {
        // Check for engines (this should prove our RPM parser fix worked)
        const engines = nmeaData.sensors.engine;
        if (engines && Object.keys(engines).length > 0) {
          Object.entries(engines).forEach(([instance, engine]) => {});
        } else {
        }

        // Check for other critical sensors
        if (nmeaData.sensors.depth && Object.keys(nmeaData.sensors.depth).length > 0) {
          const firstDepth = Object.values(nmeaData.sensors.depth)[0];
        }

        if (nmeaData.sensors.speed && Object.keys(nmeaData.sensors.speed).length > 0) {
          const firstSpeed = Object.values(nmeaData.sensors.speed)[0];
        }

        if (nmeaData.sensors.gps && Object.keys(nmeaData.sensors.gps).length > 0) {
          const firstGps = Object.values(nmeaData.sensors.gps)[0];
        }
      } else {
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [connectionStatus, nmeaData]);

  return (
    <View style={{ padding: 20, backgroundColor: '#f0f0f0', margin: 10 }}>
      <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
        🔬 Debug: Sensor-First Architecture
      </Text>
      <Text>
        Connection:{' '}
        {typeof connectionStatus === 'string' ? connectionStatus : JSON.stringify(connectionStatus)}
      </Text>
      <Text>Message Count: {nmeaData?.messageCount || 0}</Text>
      <Text>
        Engines: {nmeaData?.sensors?.engine ? Object.keys(nmeaData.sensors.engine).length : 0}{' '}
        detected
      </Text>
      <Text>Check browser console for detailed logs</Text>
    </View>
  );
};
