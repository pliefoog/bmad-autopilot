/**
 * Modular NMEA Processing Architecture
 *
 * Clean, maintainable NMEA processing with separated concerns:
 * - Connection management (protocol-agnostic)
 * - NMEA parsing (pure functions)
 * - Data transformation (validation & conversion)
 * - Store updates (immediate, zero latency)
 * - Service orchestration (unified API)
 */

// Main service API
export { NmeaService, nmeaService } from '../NmeaService';
export type { NmeaServiceConfig, NmeaServiceStatus, ProcessingMetrics } from '../NmeaService';

// Core components (for advanced usage)
export { PureConnectionManager } from '../connection/PureConnectionManager';
export type {
  ConnectionConfig,
  ConnectionStatus,
  ConnectionEvents,
} from '../connection/PureConnectionManager';

export { PureNmeaParser, pureNmeaParser } from '../parsing/PureNmeaParser';
export type { ParsedNmeaMessage, ParsingResult } from '../parsing/PureNmeaParser';

export { PureStoreUpdater, pureStoreUpdater } from '../data/PureStoreUpdater';
export type { UpdateResult } from '../data/PureStoreUpdater';

// Convenience factory function for easy setup
export const createNmeaService = (config: import('../NmeaService').NmeaServiceConfig) => {
  const { NmeaService } = require('../NmeaService');
  const service = NmeaService.getInstance();
  return {
    service,
    start: () => service.start(config),
    stop: () => service.stop(),
    getStatus: () => service.getStatus(),
    isRunning: () => service.isServiceRunning(),
  };
};

// Types for external consumption
export type { ConnectionState } from '../connection/PureConnectionManager';
