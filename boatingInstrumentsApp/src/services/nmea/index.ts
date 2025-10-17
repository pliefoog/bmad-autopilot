// NMEA Domain Services
// Services responsible for NMEA data parsing, processing, and connection management

// Core connection classes
export { NmeaConnectionManager } from './nmeaConnection';
export type { NmeaConnectionOptions } from './nmeaConnection';

// NMEA parsing services
export * from './nmeaParser';

// Web initialization utilities
export * from './webNmeaInit';

// NMEA data processing (to be created)
// export * from './nmeaParser';
// export * from './nmeaValidator';
// export * from './dataProcessor';

// Domain types (to be created)
// export type {
//   NmeaMessage,
//   SentenceType,
//   ParsedData,
// } from './types';