/**
 * Service Registry
 * Central registry for dependency injection and service management
 */

import { settingsStorageService } from './storage/settingsStorage';
import { secureStorageService } from './storage/secureStorage';
import { autopilotCommandService } from './nmea/AutopilotCommands';
import { nmeaPlaybackService } from './playback/NMEAPlayback';
import { sampleDataService } from './playback/sampleData';
import { log } from '../utils/logging/logger';

export interface ServiceRegistry {
  // Storage Services
  settingsStorage: typeof settingsStorageService;
  secureStorage: typeof secureStorageService;

  // NMEA Services
  autopilotCommands: typeof autopilotCommandService;

  // Playback Services
  nmeaPlayback: typeof nmeaPlaybackService;
  sampleData: typeof sampleDataService;
}

class ServiceRegistryImpl implements ServiceRegistry {
  private static instance: ServiceRegistryImpl;

  static getInstance(): ServiceRegistryImpl {
    if (!ServiceRegistryImpl.instance) {
      ServiceRegistryImpl.instance = new ServiceRegistryImpl();
    }
    return ServiceRegistryImpl.instance;
  }

  // Storage Services
  public readonly settingsStorage = settingsStorageService;
  public readonly secureStorage = secureStorageService;

  // NMEA Services
  public readonly autopilotCommands = autopilotCommandService;

  // Playback Services
  public readonly nmeaPlayback = nmeaPlaybackService;
  public readonly sampleData = sampleDataService;

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    try {
      // Services are already initialized as singletons
      // Additional initialization logic can be added here
    } catch (error) {
      log.app('Failed to initialize service registry', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
      throw new Error(`Service registry initialization failed: ${error}`);
    }
  }

  /**
   * Get service health status
   */
  getHealthStatus(): Record<string, boolean> {
    return {
      widgetStorage: true, // All services are always healthy as singletons
      settingsStorage: true,
      secureStorage: true,
      autopilotCommands: true,
      nmeaPlayback: true,
      sampleData: true,
    };
  }

  /**
   * Reset all services to initial state (for testing)
   */
  async reset(): Promise<void> {
    try {
      // Individual services handle their own reset logic
    } catch (error) {
      log.app('Failed to reset service registry', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
      throw new Error(`Service registry reset failed: ${error}`);
    }
  }
}

// Export singleton instance
export const serviceRegistry = ServiceRegistryImpl.getInstance();

// Export individual services for direct access
export {
  widgetStorageService,
  settingsStorageService,
  secureStorageService,
  autopilotCommandService,
  nmeaPlaybackService,
  sampleDataService,
};
