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
    
    // If we're accessing via network IP, suggest similar range for bridge
    if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      // Extract network portion (first 3 octets) and suggest .100 for bridge
      const parts = hostname.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}.100`;
      }
    }
    
    // For hostname access, suggest common bridge hostname
    return 'bridge.local';
  }
  
  // For mobile, suggest common WiFi bridge patterns
  return '192.168.1.100';
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