/**
 * TEMPORARY DEBUG APP
 *
 * Used during Sensor-First Architecture migration to verify core functionality
 * without UI compilation errors blocking verification.
 */

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { DebugSensorArchitecture } from '../debug/DebugSensorArchitecture';
import { initializeConnection } from '../services/connectionDefaults';

const DebugApp = () => {
  // Initialize NMEA connection (copied from original App)
  useEffect(() => {
    const initializeConnectionService = async () => {
      try {
        await initializeConnection();
      } catch (error) {
        console.error('🔥 [DEBUG-TEST] ❌ Failed to initialize connection:', error);
      }
    };

    // Small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      initializeConnectionService();
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
        🔬 Sensor-First Architecture Debug
      </Text>
      <DebugSensorArchitecture />
    </View>
  );
};

export default DebugApp;
