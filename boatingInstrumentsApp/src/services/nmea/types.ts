/**
 * NMEA Domain Types
 * TypeScript interfaces and types for NMEA data structures
 */

// Core NMEA Data Types
export interface NMEAParseResult {
  type: string;
  data: Record<string, any>;
  timestamp: number;
  checksum: string;
  talker?: string;
  valid: boolean;
  errors?: string[];
}

export interface PGNDecodeResult {
  pgn: number;
  source: number;
  destination: number;
  data: Record<string, any>;
  timestamp: number;
  instanceId?: number;
}

// NMEA Sentence Types
export interface NMEASentence {
  raw: string;
  type: string;
  talker: string;
  fields: string[];
  checksum: string;
  timestamp: number;
}

// Autopilot Command Types
export interface AutopilotCommand {
  type: 'heading' | 'speed' | 'mode' | 'wind';
  value: number | string;
  timestamp: number;
  priority: 'low' | 'normal' | 'high' | 'emergency';
  confirmation?: boolean;
}

export interface AutopilotState {
  engaged: boolean;
  mode: 'standby' | 'auto' | 'wind' | 'nav' | 'track';
  targetHeading?: number;
  targetSpeed?: number;
  currentHeading?: number;
  currentSpeed?: number;
  lastUpdate: number;
}

// Navigation Data Types
export interface NavigationData {
  position?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  heading?: {
    magnetic: number;
    true: number;
    variation?: number;
  };
  speed?: {
    sog: number; // Speed over ground
    stw: number; // Speed through water
    units: 'knots' | 'mph' | 'kmh';
  };
  depth?: {
    value: number;
    units: 'feet' | 'meters' | 'fathoms';
    offset?: number;
  };
  wind?: {
    direction: number;
    speed: number;
    apparent: boolean;
    units: 'knots' | 'mph' | 'kmh';
  };
  timestamp: number;
}

// Engine Data Types
export interface EngineData {
  instanceId: number;
  rpm?: number;
  temperature?: {
    coolant: number;
    oil: number;
    exhaust: number;
    units: 'celsius' | 'fahrenheit';
  };
  pressure?: {
    oil: number;
    fuel: number;
    boost: number;
    units: 'psi' | 'bar' | 'kpa';
  };
  fuel?: {
    rate: number; // consumption rate
    economy: number;
    units: 'gph' | 'lph';
  };
  hours?: number;
  alerts?: string[];
  timestamp: number;
}

// Electrical Data Types
export interface BatteryData {
  instanceId: number;
  voltage: number;
  current: number;
  temperature?: number;
  stateOfCharge?: number; // percentage
  timeRemaining?: number; // minutes
  capacity?: number; // amp hours
  type: 'starter' | 'house' | 'thruster' | 'winch';
  timestamp: number;
}

// Tank Data Types
export interface TankData {
  instanceId: number;
  type: 'fuel' | 'water' | 'waste' | 'oil' | 'livewell';
  level: number; // percentage
  capacity?: number; // liters or gallons
  units: 'liters' | 'gallons';
  temperature?: number;
  timestamp: number;
}

// Connection Types
export interface NMEAConnectionOptions {
  host: string;
  port: number;
  autoReconnect: boolean;
  reconnectInterval: number;
  timeout: number;
  dataRate?: number;
  protocol: 'tcp' | 'udp';
}

export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  lastConnected?: number;
  lastError?: string;
  messagesReceived: number;
  dataRate: number; // messages per second
  uptime: number; // milliseconds
}

// Error Types
export interface NMEAError {
  code: string;
  message: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  context?: Record<string, any>;
}

// Parsing Options
export interface ParseOptions {
  strictMode: boolean;
  validateChecksums: boolean;
  includeRawData: boolean;
  filterByTalker?: string[];
  filterByType?: string[];
  maxAge?: number; // milliseconds
}

// Event Types
export type NMEAEventType =
  | 'data'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'autopilot_command'
  | 'navigation_update'
  | 'engine_update'
  | 'battery_update'
  | 'tank_update';

export interface NMEAEvent {
  type: NMEAEventType;
  data: any;
  timestamp: number;
  source?: string;
}

// Message Rate Tracking
export interface MessageRateStats {
  messageType: string;
  count: number;
  rate: number; // messages per second
  lastSeen: number;
  averageInterval: number;
}

// Validation Results
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checksumValid?: boolean;
  lengthValid?: boolean;
  formatValid?: boolean;
}

// Common NMEA Message Types
export type NMEAMessageType =
  | 'GGA' // GPS fix data
  | 'RMC' // Recommended minimum
  | 'VTG' // Track made good
  | 'GLL' // Geographic position
  | 'GSV' // Satellites in view
  | 'HDG' // Heading
  | 'VHW' // Water speed and heading
  | 'VWR' // Relative wind speed
  | 'VWT' // True wind speed
  | 'DPT' // Depth
  | 'DBT' // Depth below transducer
  | 'MTW' // Mean temperature of water
  | 'XTE' // Cross-track error
  | 'APB' // Autopilot sentence B
  | 'BWC' // Bearing and distance to waypoint
  | 'BWR'; // Bearing and distance to waypoint rhumb line;

export type PGNMessageType =
  | 127245 // Rudder
  | 127250 // Vessel Heading
  | 127488 // Engine Parameters, Rapid Update
  | 127505 // Fluid Level
  | 127508 // Battery Status
  | 128259 // Speed
  | 128267 // Water Depth
  | 128275 // Distance Log
  | 129025 // Position, Rapid Update
  | 129026 // COG & SOG, Rapid Update
  | 129029 // GNSS Position Data
  | 130306; // Wind Data
