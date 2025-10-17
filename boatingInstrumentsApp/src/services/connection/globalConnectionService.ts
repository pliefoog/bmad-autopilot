/**
 * Global NMEA Connection Manager Service
 * Provides unified connection management across web and mobile platforms
 */

import { NmeaConnectionManager, NmeaConnectionOptions } from './nmeaConnection';
import { getConnectionDefaults } from './connectionDefaults';

export class GlobalConnectionService {
  private static instance: GlobalConnectionService | null = null;
  private connectionManager: NmeaConnectionManager | null = null;
  private currentOptions: NmeaConnectionOptions | null = null;
  private isWeb: boolean;

  private constructor() {
    this.isWeb = typeof window !== 'undefined';
  }

  /**
   * Get singleton instance
   */
  static getInstance(): GlobalConnectionService {
    if (!this.instance) {
      this.instance = new GlobalConnectionService();
    }
    return this.instance;
  }

  /**
   * Initialize connection with default settings
   */
  async initialize(): Promise<void> {
    // Prevent double initialization (React StrictMode protection)
    if (this.connectionManager) {
      console.log('[Global Connection] Already initialized, skipping...');
      return;
    }
    const defaults = getConnectionDefaults();
    
    // Try to load saved settings from storage
    let savedOptions: NmeaConnectionOptions | null = null;
    
    if (this.isWeb) {
      // For web, use localStorage
      try {
        const saved = localStorage.getItem('nmea-connection-config');
        if (saved) {
          const parsed = JSON.parse(saved);
          savedOptions = {
            ip: parsed.ip || defaults.ip,
            port: parseInt(parsed.port) || defaults.port,
            protocol: parsed.protocol || defaults.protocol
          };
        }
      } catch (error) {
        console.warn('[Global Connection] Failed to load web settings:', error);
      }
    } else {
      // For mobile, use AsyncStorage
      try {
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        const saved = await AsyncStorage.default.getItem('nmea-connection-config');
        if (saved) {
          const parsed = JSON.parse(saved);
          savedOptions = {
            ip: parsed.ip || defaults.ip,
            port: parseInt(parsed.port) || defaults.port,
            protocol: parsed.protocol || defaults.protocol
          };
        }
      } catch (error) {
        console.warn('[Global Connection] Failed to load mobile settings:', error);
      }
    }

    const options = savedOptions || defaults;
    await this.updateConnection(options, false); // Don't save during initialization
  }

  /**
   * Update connection settings and reconnect
   * @param newOptions New connection options
   * @param saveSettings Whether to persist settings to storage (default: true)
   */
  async updateConnection(newOptions: NmeaConnectionOptions, saveSettings: boolean = true): Promise<void> {
    
    // Gracefully disconnect existing connection
    if (this.connectionManager) {
      console.log('[Global Connection] Disconnecting existing connection...');
      this.connectionManager.disconnect();
      this.connectionManager = null;
    }

    // Save settings if requested
    if (saveSettings) {
      await this.saveSettings(newOptions);
    }

    this.currentOptions = newOptions;

    // Disconnect existing connection if any
    if (this.connectionManager) {
      console.log('[Global Connection] Disconnecting existing connection...');
      (this.connectionManager as NmeaConnectionManager).disconnect();
      this.connectionManager = null;
    }

    // Create new connection manager (unified for both web and mobile)
    this.connectionManager = new NmeaConnectionManager(newOptions);
    
    // Connect after a brief delay to ensure clean state
    setTimeout(() => {
      if (this.connectionManager) {
        console.log('[Global Connection] Connecting with new settings...');
        this.connectionManager.connect();
      }
    }, 500);
  }

  /**
   * Save connection settings to appropriate storage
   */
  private async saveSettings(options: NmeaConnectionOptions): Promise<void> {
    const settingsData = {
      ip: options.ip,
      port: options.port.toString(),
      protocol: options.protocol
    };

    try {
      if (this.isWeb) {
        localStorage.setItem('nmea-connection-config', JSON.stringify(settingsData));
      } else {
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        await AsyncStorage.default.setItem('nmea-connection-config', JSON.stringify(settingsData));
      }
      console.log('[Global Connection] Settings saved successfully');
    } catch (error) {
      console.error('[Global Connection] Failed to save settings:', error);
    }
  }

  /**
   * Get current connection options
   */
  getCurrentOptions(): NmeaConnectionOptions | null {
    return this.currentOptions;
  }

  /**
   * Get current connection manager
   */
  getConnectionManager(): NmeaConnectionManager | null {
    return this.connectionManager;
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.connectionManager !== null;
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    if (this.connectionManager) {
      console.log('[Global Connection] Disconnecting...');
      this.connectionManager.disconnect();
      this.connectionManager = null;
    }
  }
}

// Export singleton instance
export const globalConnectionService = GlobalConnectionService.getInstance();