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

console.log('🚀 [DEBUG-TEST] DebugApp.tsx file is being loaded - this should be THE FIRST log in console');

const DebugApp = () => {
  console.log('🔥 [DEBUG-TEST] DebugApp component is loading!!! This should appear immediately in browser console');

  // Initialize NMEA connection (copied from original App)
  useEffect(() => {
    console.log('🔥 [DEBUG-TEST] Setting up connection initialization...');
    
    const initializeConnectionService = async () => {
      console.log('🔥 [DEBUG-TEST] Starting auto-connection initialization...');
      
      try {
        await initializeConnection();
        console.log('🔥 [DEBUG-TEST] ✅ Connection service initialized successfully');
      } catch (error) {
        console.error('🔥 [DEBUG-TEST] ❌ Failed to initialize connection:', error);
      }
    };

    // Small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      console.log('🔥 [DEBUG-TEST] Timer fired, calling initializeConnectionService...');
      initializeConnectionService();
    }, 1000);

    return () => {
      console.log('🔥 [DEBUG-TEST] Cleaning up connection initialization timer');
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