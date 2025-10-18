// NMEA Domain Services
// Services responsible for NMEA data parsing, processing, and connection management

// Core connection classes
export { NmeaConnectionManager } from './nmeaConnection';
export type { NmeaConnectionOptions } from './nmeaConnection';

// NMEA parsing services
export * from './nmeaParser';
export * from './pgnParser';

// Autopilot command services
export * from './AutopilotCommands';

// Web initialization utilities
export * from './webNmeaInit';

// Instance detection utilities
export * from './instanceDetection';

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
  ConnectionStatus,
  NMEAError
} from './types';
//   NmeaMessage,
//   SentenceType,
//   ParsedData,
// } from './types';