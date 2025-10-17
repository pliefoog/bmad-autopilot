// NMEA Types
// Centralized type definitions for NMEA data structures, parsing, and processing

/**
 * Core NMEA data structure
 */
export interface NmeaData {
  // GPS Position Data
  latitude?: number;
  longitude?: number;
  altitude?: number;
  heading?: number;
  speed?: number;  // Speed over ground in knots
  course?: number; // Course over ground in degrees

  // GPS Quality and Status
  satellites?: number;
  hdop?: number;    // Horizontal dilution of precision
  fixType?: number; // 0=no fix, 1=GPS, 2=DGPS, 3=PPS
  timestamp?: number;

  // Wind Data
  windSpeed?: number;     // True wind speed in knots
  windDirection?: number; // True wind direction in degrees
  apparentWindSpeed?: number;     // Apparent wind speed in knots
  apparentWindDirection?: number; // Apparent wind direction in degrees

  // Water and Navigation
  depth?: number;        // Depth in meters
  waterTemperature?: number; // Water temperature in Celsius
  waterSpeed?: number;   // Speed through water in knots

  // Engine Data
  engineRpm?: number;
  engineTemperature?: number;
  enginePressure?: number;
  fuelLevel?: number;
  batteryVoltage?: number;

  // Environmental
  airTemperature?: number;
  barometricPressure?: number;
  humidity?: number;

  // Autopilot Data
  autopilotHeading?: number;
  autopilotMode?: string;
  autopilotStatus?: string;
}

/**
 * NMEA message parsing types
 */
export interface ParsedNmeaData {
  messageType: string;
  talker: string;
  data: Record<string, any>;
  timestamp: number;
  raw: string;
  valid: boolean;
  errors?: string[];
  checksum?: string;
  checksumValid?: boolean;
}

export interface NmeaParseResult {
  success: boolean;
  data?: ParsedNmeaData;
  error?: string;
  sentence: string;
}

/**
 * NMEA sentence types and their specific data structures
 */
export interface GGAData {
  time: string;
  latitude: number | null;
  longitude: number | null;
  quality: number;
  satellites: number;
  hdop: number;
  altitude: number;
  altitudeUnit: string;
  geoidHeight?: number;
  geoidUnit?: string;
  dgpsAge?: number;
  dgpsId?: string;
}

export interface RMCData {
  time: string;
  status: 'A' | 'V'; // A=Active, V=Void
  latitude: number | null;
  longitude: number | null;
  speed: number;  // Speed over ground in knots
  course: number; // Course over ground in degrees
  date: string;
  magneticVariation?: number;
  variationDirection?: 'E' | 'W';
  modeIndicator?: 'A' | 'D' | 'E' | 'M' | 'S' | 'N';
}

export interface VWRData {
  windAngle: number;
  windDirection: 'L' | 'R'; // L=Left, R=Right
  windSpeed: number;
  windSpeedUnit: 'N' | 'M' | 'K'; // N=Knots, M=m/s, K=km/h
  windSpeedMps?: number;
  windSpeedKmh?: number;
}

export interface DPTData {
  depth: number;
  offset: number;
  scale: number;
}

export interface HDGData {
  heading: number;
  deviation: number | null;
  deviationDirection: 'E' | 'W' | null;
  variation: number | null;
  variationDirection: 'E' | 'W' | null;
}

export interface RPMData {
  source: 'S' | 'E'; // S=Shaft, E=Engine
  engineNumber: number;
  rpm: number;
  pitch?: number;
  status: 'A' | 'V';
}

/**
 * NMEA metrics and statistics
 */
export interface NmeaMetrics {
  totalMessages: number;
  validMessages: number;
  invalidMessages: number;
  messageTypes: Record<string, number>;
  parseErrors: string[];
  dataFreshness: Record<keyof NmeaData, number>;
  lastUpdate: number;
}

export interface NmeaDataQuality {
  gpsQuality: 'no-fix' | 'gps' | 'dgps' | 'pps' | 'rtk' | 'float-rtk';
  satelliteCount: number;
  hdop: number;
  signalStrength: 'poor' | 'fair' | 'good' | 'excellent';
  dataAge: number; // milliseconds since last update
  staleData: boolean;
}

/**
 * NMEA message types and talker IDs
 */
export type NmeaMessageType = 
  | 'GGA' | 'GSA' | 'GSV' | 'RMC' | 'VTG' | 'GLL'  // GPS
  | 'VWR' | 'VWT' | 'MWV' | 'MWD'                   // Wind
  | 'DPT' | 'DBT' | 'MTW'                           // Depth/Water
  | 'HDG' | 'HDT' | 'HDM'                           // Heading
  | 'RPM' | 'RSA'                                   // Engine/Rudder
  | 'MDA' | 'MMB'                                   // Meteorological
  | 'APB' | 'BWC' | 'BWR' | 'WPL'                   // Autopilot/Waypoint
  | 'VDR' | 'VLW' | 'VPW';                          // Miscellaneous

export type NmeaTalkerId = 
  | 'GP' | 'GL' | 'GA' | 'GB' | 'GN'  // GNSS
  | 'II' | 'IN'                       // Integrated Instrumentation
  | 'WI'                              // Weather Instruments
  | 'YX' | 'ST' | 'TR'               // Transducers
  | 'AP' | 'AG';                      // Autopilot

/**
 * NMEA validation and error types
 */
export interface NmeaValidationResult {
  valid: boolean;
  errors: NmeaValidationError[];
  warnings: string[];
  sentence: string;
}

export interface NmeaValidationError {
  type: 'syntax' | 'checksum' | 'field' | 'format';
  message: string;
  position?: number;
  field?: string;
}

/**
 * NMEA processing configuration
 */
export interface NmeaProcessingConfig {
  enabledMessageTypes: NmeaMessageType[];
  enabledTalkers: NmeaTalkerId[];
  validateChecksum: boolean;
  strictParsing: boolean;
  maxParseErrors: number;
  dataTimeout: number; // milliseconds
  batchSize: number;
  debugMode: boolean;
}

/**
 * NMEA stream and connection types
 */
export interface NmeaStreamConfig {
  source: 'tcp' | 'udp' | 'websocket' | 'serial' | 'file';
  host?: string;
  port?: number;
  baudRate?: number;
  device?: string;
  filePath?: string;
  autoReconnect: boolean;
  reconnectInterval: number;
  bufferSize: number;
}

export interface NmeaConnectionStatus {
  connected: boolean;
  connecting: boolean;
  lastConnected?: number;
  lastDisconnected?: number;
  reconnectAttempts: number;
  bytesReceived: number;
  messagesReceived: number;
  errors: string[];
}

/**
 * Export utility types
 */
export type NmeaFieldValue = string | number | null | undefined;
export type NmeaSentence = string;
export type NmeaTimestamp = number;