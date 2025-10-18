/**
 * Simplified Global Connection Service
 * Uses the unified connection manager for consistent behavior across platforms
 */

import { UnifiedConnectionManager, NmeaConnectionConfig, ConnectionStatus } from './unifiedConnectionManager';
import { getConnectionDefaults } from './connectionDefaults';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Legacy interface compatibility
export interface NmeaConnectionOptions {
  ip: string;
  port: number;
  protocol: 'tcp' | 'udp' | 'websocket';
}

export class GlobalConnectionService {
  private static instance: GlobalConnectionService | null = null;
  private connectionManager: UnifiedConnectionManager;

  private constructor() {
    this.connectionManager = new UnifiedConnectionManager();
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
   * Initialize with saved settings or defaults
   */
  async initialize(): Promise<void> {
    console.log('[Global Connection] Initializing...');
    
    const defaults = getConnectionDefaults();
    let savedConfig: NmeaConnectionConfig | null = null;
    
    // Try to load saved settings
    try {
      const saved = await AsyncStorage.getItem('nmea-connection-config');
      if (saved) {
        const parsed = JSON.parse(saved);
        savedConfig = {
          ip: parsed.ip || defaults.ip,
          port: parseInt(parsed.port) || defaults.port,
          protocol: parsed.protocol || defaults.protocol
        };
      }
    } catch (error) {
      console.warn('[Global Connection] Failed to load saved settings:', error);
    }

    const config = savedConfig || defaults;
    
    // Attempt to connect with saved/default configuration
    // Don't await - let it connect in background
    this.connect(config, false); // Don't save during initialization
  }

  /**
   * Connect with configuration
   * @param config Connection configuration
   * @param saveSettings Whether to save settings (default: true)
   */
  async connect(config: NmeaConnectionConfig, saveSettings: boolean = true): Promise<boolean> {
    console.log(`[Global Connection] Connect request: ${config.protocol}://${config.ip}:${config.port}`);
    
    // Save settings if requested
    if (saveSettings) {
      await this.saveSettings(config);
    }
    
    // Attempt connection
    return await this.connectionManager.connect(config);
  }

  /**
   * Legacy method for backward compatibility
   */
  async updateConnection(newOptions: NmeaConnectionOptions, saveSettings: boolean = true): Promise<void> {
    await this.connect(newOptions, saveSettings);
  }

  /**
   * Disconnect current connection
   */
  disconnect(): void {
    console.log('[Global Connection] Disconnect requested');
    this.connectionManager.disconnect();
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.connectionManager.getStatus();
  }

  /**
   * Check if connect button should be enabled
   * (disabled when config is same as current)
   */
  shouldEnableConnectButton(config: NmeaConnectionConfig): boolean {
    return !this.connectionManager.isConfigSameAsCurrent(config);
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.connectionManager.isConnected();
  }

  /**
   * Check if receiving data
   */
  isReceivingData(): boolean {
    return this.connectionManager.isReceivingData();
  }

  /**
   * Get current configuration (for UI display)
   */
  getCurrentConfig(): NmeaConnectionConfig | null {
    return this.getStatus().currentConfig;
  }

  /**
   * Legacy method for backward compatibility
   */
  getCurrentOptions(): NmeaConnectionOptions | null {
    return this.getCurrentConfig();
  }

  /**
   * Legacy method for backward compatibility  
   */
  getConnectionManager(): UnifiedConnectionManager | null {
    return this.connectionManager;
  }

  /**
   * Save connection settings to storage
   */
  private async saveSettings(config: NmeaConnectionConfig): Promise<void> {
    const settingsData = {
      ip: config.ip,
      port: config.port.toString(),
      protocol: config.protocol
    };

    try {
      await AsyncStorage.setItem('nmea-connection-config', JSON.stringify(settingsData));
      console.log('[Global Connection] Settings saved');
    } catch (error) {
      console.error('[Global Connection] Failed to save settings:', error);
    }
  }
}

// Export singleton instance
export const globalConnectionService = GlobalConnectionService.getInstance();

// Re-export types for convenience
export type { NmeaConnectionConfig, ConnectionStatus, ConnectionState } from './unifiedConnectionManager';