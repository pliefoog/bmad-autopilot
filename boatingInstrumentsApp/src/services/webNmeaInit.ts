/**
 * Web-specific NMEA connection initialization
 * Auto-connects to local NMEA Bridge Simulator for web testing
 */

import { NmeaConnectionManager, NmeaConnectionOptions } from './nmeaConnection';
import { getConnectionDefaults } from './connectionDefaults';

export class WebNmeaInit {
  private static manager: NmeaConnectionManager | null = null;

  /**
   * Initialize NMEA connection for web environment
   * Auto-connects to localhost NMEA Bridge Simulator
   */
  static initialize(): void {
    if (this.manager) {
      console.log('[Web NMEA] Connection already initialized');
      return;
    }

    // Use platform-specific defaults
    const defaults = getConnectionDefaults();
    const options: NmeaConnectionOptions = {
      ip: defaults.ip,
      port: defaults.port,
      protocol: defaults.protocol
    };

    console.log('[Web NMEA] Initializing connection to NMEA Bridge Simulator...');
    console.log('[Web NMEA] Configuration:', options);

    this.manager = new NmeaConnectionManager(options);
    
    // Auto-connect after a short delay to allow UI to load
    setTimeout(() => {
      if (this.manager) {
        console.log('[Web NMEA] Attempting connection...');
        this.manager.connect();
      }
    }, 1000);
  }

  /**
   * Update connection settings and reconnect
   * Gracefully closes existing connection before establishing new one
   */
  static updateConnection(newOptions: NmeaConnectionOptions): void {
    console.log('[Web NMEA] Updating connection settings:', newOptions);
    
    // Gracefully disconnect existing connection
    if (this.manager) {
      console.log('[Web NMEA] Disconnecting existing connection...');
      this.manager.disconnect();
    }

    // Create new connection manager with updated settings
    this.manager = new NmeaConnectionManager(newOptions);
    
    // Connect after a brief delay to ensure clean disconnection
    setTimeout(() => {
      if (this.manager) {
        console.log('[Web NMEA] Connecting with new settings...');
        this.manager.connect();
      }
    }, 500);
  }

  /**
   * Get the current connection manager instance
   */
  static getManager(): NmeaConnectionManager | null {
    return this.manager;
  }

  /**
   * Disconnect and cleanup
   */
  static cleanup(): void {
    if (this.manager) {
      console.log('[Web NMEA] Cleaning up connection...');
      this.manager.disconnect();
      this.manager = null;
    }
  }
}

// Note: Auto-initialization is now handled by GlobalConnectionService
// This class is used internally by the global service for web-specific connections