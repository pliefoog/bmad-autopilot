/**
 * Connection utilities for the new modular NMEA architecture
 * Simple helpers for configuration and settings persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { NmeaService, NmeaServiceConfig } from './nmea/NmeaService';
import { log } from '../utils/logging/logger';

const STORAGE_KEY = 'nmea-connection-config';
const MANUAL_DISCONNECT_KEY = 'nmea-manual-disconnect';

export interface ConnectionConfig {
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
  return '127.0.0.1'; // Use localhost for simulator during development
};

export const getConnectionDefaults = (): ConnectionConfig => {
  // Check if running in web environment
  if (typeof window !== 'undefined' && Platform.OS === 'web') {
    return {
      ip: getSuggestedNetworkHost(), // Smart suggestion based on current access
      port: 8080, // WebSocket standard port (browser security requires WS)
      protocol: 'websocket',
    };
  }

  // Mobile platforms (iOS/Android)
  // Typical NMEA bridge ports:
  // - TCP: 2000 (SignalK, OpenCPN, many WiFi bridges)
  // - UDP: 10110 (NMEA 0183 multicast standard)
  // - WebSocket: 8080 (SignalK, modern bridges)
  return {
    ip: getSuggestedNetworkHost(), // Smart suggestion for mobile
    port: 2000, // TCP port 2000 is most common for NMEA bridges
    protocol: 'tcp',
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

/**
 * Load saved connection settings or return defaults
 */
export const loadConnectionSettings = async (): Promise<ConnectionConfig> => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const defaults = getConnectionDefaults();
      return {
        ip: parsed.ip || defaults.ip,
        port: parseInt(parsed.port) || defaults.port,
        protocol: parsed.protocol || defaults.protocol,
      };
    }
  } catch (error) {
    log.app('[Connection] Failed to load saved settings', () => ({
      error: error instanceof Error ? error.message : String(error),
    }));
  }

  return getConnectionDefaults();
};

/**
 * Save connection settings to storage
 */
export const saveConnectionSettings = async (config: ConnectionConfig): Promise<void> => {
  const settingsData = {
    ip: config.ip,
    port: config.port.toString(),
    protocol: config.protocol,
  };

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settingsData));
  } catch (error) {
    log.app('[Connection] Failed to save settings', () => ({
      error: error instanceof Error ? error.message : String(error),
    }));
  }
};

/**
 * Connect to NMEA source with configuration
 */
export const connectNmea = async (
  config: ConnectionConfig,
  saveSettings: boolean = true,
): Promise<boolean> => {
  // Clear manual disconnect flag when user explicitly connects
  try {
    await AsyncStorage.removeItem(MANUAL_DISCONNECT_KEY);
  } catch (error) {
    log.app('[Connection] Failed to clear manual disconnect flag', () => ({
      error: error instanceof Error ? error.message : String(error),
    }));
  }

  // Save settings if requested
  if (saveSettings) {
    await saveConnectionSettings(config);
  }

  // Convert to NmeaServiceConfig
  const serviceConfig: NmeaServiceConfig = {
    connection: {
      ip: config.ip,
      port: config.port,
      protocol: config.protocol,
    },
  };

  // Connect using NmeaService
  return await NmeaService.getInstance().start(serviceConfig);
};

/**
 * Disconnect from NMEA source
 */
export const disconnectNmea = async (): Promise<void> => {
  // Set manual disconnect flag to prevent auto-reconnect
  try {
    await AsyncStorage.setItem(MANUAL_DISCONNECT_KEY, 'true');
  } catch (error) {
    log.app('[Connection] Failed to set manual disconnect flag', () => ({
      error: error instanceof Error ? error.message : String(error),
    }));
  }

  NmeaService.getInstance().stop();
};

/**
 * Check if connect button should be enabled (config different from current)
 */
export const shouldEnableConnectButton = (config: ConnectionConfig): boolean => {
  const currentConfig = NmeaService.getInstance().getCurrentConfig();
  if (!currentConfig) return true;

  return !(
    currentConfig.connection.ip === config.ip &&
    currentConfig.connection.port === config.port &&
    currentConfig.connection.protocol === config.protocol
  );
};

/**
 * Get current connection configuration
 */
export const getCurrentConnectionConfig = (): ConnectionConfig | null => {
  const serviceStatus = NmeaService.getInstance().getStatus();
  const connectionStatus = serviceStatus.connection;

  if (!connectionStatus.config) return null;

  return {
    ip: connectionStatus.config.ip,
    port: connectionStatus.config.port,
    protocol: connectionStatus.config.protocol,
  };
};

/**
 * Initialize connection with saved/default settings
 * Only auto-connects if user hasn't manually disconnected
 */
export const initializeConnection = async (): Promise<void> => {
  // Check if user manually disconnected
  try {
    const manuallyDisconnected = await AsyncStorage.getItem(MANUAL_DISCONNECT_KEY);
    if (manuallyDisconnected === 'true') {
      log.connection('Skipping auto-connect - user manually disconnected');
      return;
    }
  } catch (error) {
    log.connection('Failed to check manual disconnect flag', () => ({ error }));
  }

  const config = await loadConnectionSettings();

  // Attempt to connect in background (don't save during initialization)
  connectNmea(config, false);
};
