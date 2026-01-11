// NMEA Domain Services
// Services responsible for NMEA data parsing, processing, and connection management

// New modular NMEA architecture
export { NmeaService } from './NmeaService';
export type { NmeaServiceConfig, NmeaServiceStatus } from './NmeaService';

// Pure functional components
export { PureConnectionManager } from './connection/PureConnectionManager';
export type { ConnectionConfig, ConnectionStatus } from './connection/PureConnectionManager';

export { PureNmeaParser } from './parsing/PureNmeaParser';
export type { ParsedNmeaMessage } from './parsing/PureNmeaParser';

export { PureStoreUpdater } from './data/PureStoreUpdater';
export type { UpdateResult } from './data/PureStoreUpdater';

// Legacy parsers (for compatibility)
export * from './nmeaParser';
export * from './pgnParser';

// Autopilot command services
export * from './AutopilotCommands';

// NMEA data types
export * from './types';

// Re-export commonly used types for convenience
export type {
  NMEAParseResult,
  PGNDecodeResult,
  AutopilotCommand,
  AutopilotState,
  NavigationData,
  EngineData,
  BatteryData,
  TankData,
  NMEAError,
} from './types';
//   NmeaMessage,
//   SentenceType,
//   ParsedData,
// } from './types';
