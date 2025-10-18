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
 * Get suggested default host for network access
 * Returns a sensible default but doesn't force it
 */
const getSuggestedNetworkHost = (): string => {
  // For web, try to detect current host or provide WiFi bridge suggestion
  if (typeof window !== 'undefined' && Platform.OS === 'web') {
    const hostname = window.location.hostname;
    
    // If we're accessing via network IP, suggest the simulator running on same host
    if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      // For development, suggest the same host where the simulator is likely running
      return hostname;
    }
    
    // For localhost access, suggest localhost simulator
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return '127.0.0.1';
    }
    
    // For hostname access, suggest the local host
    return hostname;
  }
  
  // For mobile, suggest localhost (most common during development)
  return '192.168.1.52'; // Use the current network IP that's actually running services
};

/**
 * Get platform-specific default connection settings
 */
export const getConnectionDefaults = (): ConnectionDefaults => {
  // Check if running in web environment
  if (typeof window !== 'undefined' && Platform.OS === 'web') {
    return {
      ip: getSuggestedNetworkHost(), // Smart suggestion based on current access
      port: 8080, // WebSocket for web
      protocol: 'websocket'
    };
  }
  
  // Mobile platforms (iOS/Android)
  return {
    ip: getSuggestedNetworkHost(), // Smart suggestion for mobile
    port: 2000, // TCP for mobile
    protocol: 'tcp'
  };
};

/**
 * Get the appropriate connection description for the platform
 */
export const getConnectionDescription = (): string => {
  if (typeof window !== 'undefined' && Platform.OS === 'web') {
    return 'WebSocket connection to NMEA Bridge Simulator (accessible from network)';
  }
  
  return 'TCP connection to WiFi NMEA Bridge (accessible from network)';
};