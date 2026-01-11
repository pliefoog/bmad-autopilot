/**
 * TEMPORARY DEBUG COMPONENT
 *
 * Used during Sensor-First Architecture migration to verify core functionality
 * without UI compilation errors blocking verification.
 */

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { sensorRegistry } from '../services/SensorDataRegistry';

export const DebugSensorArchitecture: React.FC = () => {
  const { connectionStatus, nmeaData } = useNmeaStore();

  useEffect(() => {
    // Log every second to monitor sensor data
    const interval = setInterval(() => {
      // Check for engines using registry
      const engines = sensorRegistry.getAllOfType('engine');
      if (engines.length > 0) {
        engines.forEach((engine) => {
          // Engine instance detected
        });
      }

      // Check for other critical sensors using registry
      const depthSensors = sensorRegistry.getAllOfType('depth');
      if (depthSensors.length > 0) {
        const firstDepth = depthSensors[0];
        // Depth data available
      }

      const speedSensors = sensorRegistry.getAllOfType('speed');
      if (speedSensors.length > 0) {
        const firstSpeed = speedSensors[0];
        // Speed data available
      }

      const gpsSensors = sensorRegistry.getAllOfType('gps');
      if (gpsSensors.length > 0) {
        const firstGps = gpsSensors[0];
        // GPS data available
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [connectionStatus, nmeaData]);

  const engineCount = sensorRegistry.getAllOfType('engine').length;

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
      <Text>Engines: {engineCount} detected</Text>
      <Text>Check browser console for detailed logs</Text>
    </View>
  );
};
