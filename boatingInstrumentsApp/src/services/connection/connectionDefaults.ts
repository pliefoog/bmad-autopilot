/**
 * Platform-specific connection defaults for NMEA Bridge
 */
import { Platform } from 'react-native';

export interface ConnectionDefaults {
  ip: string;
  port: number;
  protocol: 'tcp' | 'udp' | 'websocket';
}

/**
 * Get platform-specific default connection settings
 */
export const getConnectionDefaults = (): ConnectionDefaults => {
  // Check if running in web environment
  if (typeof window !== 'undefined' && Platform.OS === 'web') {
    return {
      ip: '127.0.0.1',
      port: 8080, // WebSocket for web
      protocol: 'websocket'
    };
  }
  
  // Mobile platforms (iOS/Android)
  return {
    ip: '192.168.0.100', // Typical WiFi bridge IP
    port: 2000, // TCP for mobile
    protocol: 'tcp'
  };
};

/**
 * Get the appropriate connection description for the platform
 */
export const getConnectionDescription = (): string => {
  if (typeof window !== 'undefined' && Platform.OS === 'web') {
    return 'WebSocket connection to local NMEA Bridge Simulator';
  }
  
  return 'TCP connection to WiFi NMEA Bridge';
};