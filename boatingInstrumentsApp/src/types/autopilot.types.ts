// Autopilot Types
// Centralized type definitions for autopilot control, commands, and safety systems

/**
 * Autopilot modes and states
 */
export type AutopilotMode = 
  | 'standby'
  | 'compass' 
  | 'wind' 
  | 'gps'
  | 'track'
  | 'no-drift'
  | 'pilot-wind'
  | 'vane-wind';

export type AutopilotStatus = 
  | 'off'
  | 'standby' 
  | 'engaged'
  | 'turning'
  | 'tracking'
  | 'error'
  | 'calibrating';

export type AutopilotResponseType = 
  | 'none'
  | 'acknowledge'
  | 'error'
  | 'status'
  | 'warning'
  | 'alarm';

/**
 * Autopilot command types
 */
export type AutopilotCommandType = 
  | 'heading'
  | 'wind_angle'
  | 'track'
  | 'waypoint'
  | 'standby'
  | 'auto'
  | 'port'
  | 'starboard'
  | 'response';

export interface AutopilotCommand {
  id?: string;
  type: AutopilotCommandType;
  value?: number;
  direction?: 'port' | 'starboard' | 'left' | 'right';
  magnitude?: 'small' | 'medium' | 'large';
  timestamp: number;
  source: string;
  priority: AutopilotCommandPriority;
  validation?: AutopilotCommandValidation;
  retryCount?: number;
  timeout?: number;
}

export type AutopilotCommandPriority = 'low' | 'normal' | 'high' | 'emergency';

/**
 * Command validation and constraints
 */
export interface AutopilotCommandValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  constraints: {
    minValue?: number;
    maxValue?: number;
    allowedDirections?: string[];
    requiredConditions?: string[];
    safetyChecks?: string[];
  };
}

/**
 * Autopilot capabilities and configuration
 */
export interface AutopilotCapabilities {
  supportedCommands: AutopilotCommandType[];
  supportedModes: AutopilotMode[];
  headingRange: { min: number; max: number };
  windAngleRange: { min: number; max: number };
  incrementSizes: number[];
  
  // Feature support
  hasCompassMode: boolean;
  hasWindMode: boolean;
  hasGpsMode: boolean;
  hasTrackMode: boolean;
  hasNoDriftMode: boolean;
  hasWaypointNavigation: boolean;
  hasAutoTrim: boolean;
  hasDodge: boolean;
  
  // Performance characteristics
  maxCommandRate: number; // commands per minute
  responseTime: number; // milliseconds
  accuracy: number; // degrees
  stability: number; // degrees RMS
  maxTurnRate: number; // degrees per second
  
  // Hardware info
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  serialNumber?: string;
}

/**
 * Autopilot state and data
 */
export interface AutopilotState {
  mode: AutopilotMode;
  status: AutopilotStatus;
  targetHeading?: number;
  currentHeading?: number;
  targetWindAngle?: number;
  currentWindAngle?: number;
  headingError?: number;
  windAngleError?: number;
  rudderAngle?: number;
  rudderPosition?: number;
  turnRate?: number;
  engaged: boolean;
  locked: boolean;
  lastUpdate: number;
}

/**
 * Autopilot performance metrics
 */
export interface AutopilotPerformance {
  // Accuracy metrics
  headingAccuracy: number; // RMS error in degrees
  courseKeeping: number; // percentage on course
  averageError: number;
  maxError: number;
  
  // Efficiency metrics
  rudderActivity: number; // degrees per minute
  energyEfficiency: number; // 0-100 score
  fuelEfficiency: number; // relative to manual steering
  
  // Usage statistics
  engagedTime: number; // total time engaged
  commandsExecuted: number;
  successRate: number; // percentage successful
  averageResponseTime: number;
  
  // Environmental adaptation
  seaStatePerformance: Record<number, number>; // sea state 0-9 vs performance
  windSpeedPerformance: Record<number, number>; // wind speed vs performance
  
  timestamp: number;
}

/**
 * Safety systems and monitoring
 */
export interface AutopilotSafety {
  // Safety limits
  maxHeadingDeviation: number;
  maxWindAngleDeviation: number;
  maxTurnRate: number;
  stallTimeout: number;
  
  // Monitoring
  watchdog: boolean;
  deadManSwitch: boolean;
  collisionAvoidance: boolean;
  weatherRouting: boolean;
  
  // Emergency procedures
  emergencyDisengage: boolean;
  autoStandbyConditions: string[];
  safetyAlarms: AutopilotAlarm[];
}

export interface AutopilotAlarm {
  id: string;
  type: 'heading' | 'wind' | 'course' | 'system' | 'communication';
  level: 'info' | 'warning' | 'critical' | 'emergency';
  message: string;
  condition: string;
  threshold?: number;
  timestamp: number;
  acknowledged: boolean;
  resolved: boolean;
}

/**
 * Autopilot configuration
 */
export interface AutopilotConfig {
  // Basic settings
  preferredMode: AutopilotMode;
  defaultIncrement: number;
  responseLevel: 'slow' | 'medium' | 'fast';
  damping: number; // 0-100
  
  // Advanced tuning
  proportionalGain: number;
  integralGain: number;
  derivativeGain: number;
  deadband: number;
  rateLimiting: boolean;
  
  // Safety settings
  safetyLimits: AutopilotSafety;
  autoDisengage: {
    onHighWind: boolean;
    windThreshold: number;
    onLowDepth: boolean;
    depthThreshold: number;
    onManOverboard: boolean;
  };
  
  // Display preferences
  showPerformanceMetrics: boolean;
  alertsEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

/**
 * Autopilot history and logging
 */
export interface AutopilotLogEntry {
  timestamp: number;
  eventType: 'command' | 'mode_change' | 'engage' | 'disengage' | 'alarm' | 'error';
  description: string;
  data?: Record<string, any>;
  source: string;
  level: 'debug' | 'info' | 'warning' | 'error';
}

export interface AutopilotSession {
  id: string;
  startTime: number;
  endTime?: number;
  mode: AutopilotMode;
  duration: number;
  performance: AutopilotPerformance;
  commands: AutopilotCommand[];
  alarms: AutopilotAlarm[];
  logs: AutopilotLogEntry[];
  conditions: {
    windSpeed: number;
    seaState: number;
    visibility: number;
    weather: string;
  };
}

/**
 * Error handling and recovery
 */
export interface AutopilotError {
  id: string;
  type: 'communication' | 'hardware' | 'software' | 'configuration' | 'navigation';
  code: string;
  message: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  recoveryActions: string[];
  context?: Record<string, any>;
}

export interface AutopilotRecovery {
  errorId: string;
  recoveryAttempts: number;
  recoveryMethods: string[];
  successfulRecovery: boolean;
  recoveryTime: number;
  timestamp: number;
}

/**
 * Integration with other systems
 */
export interface AutopilotIntegration {
  // NMEA integration
  nmeaVersion: '0183' | '2000';
  talkerIds: string[];
  sentenceTypes: string[];
  
  // Navigation system integration
  gpsIntegration: boolean;
  chartPlotterIntegration: boolean;
  radarIntegration: boolean;
  aisIntegration: boolean;
  
  // Instrument integration
  windInstruments: boolean;
  depthSounders: boolean;
  speedLogs: boolean;
  gyrocompass: boolean;
  
  // Control interfaces
  networkControl: boolean;
  remoteControl: boolean;
  voiceControl: boolean;
  gestureControl: boolean;
}

/**
 * Calibration and setup
 */
export interface AutopilotCalibration {
  compassCalibration: {
    completed: boolean;
    accuracy: number;
    deviation: Record<number, number>; // heading -> deviation
    lastCalibrated: number;
  };
  
  rudderCalibration: {
    centerPosition: number;
    portLimit: number;
    starboardLimit: number;
    gainSettings: Record<string, number>;
    lastCalibrated: number;
  };
  
  seatrialData: {
    completed: boolean;
    conditions: string;
    results: AutopilotPerformance;
    recommendations: string[];
    lastPerformed: number;
  };
}

/**
 * Export utility types
 */
export type AutopilotCommandId = string;
export type AutopilotSessionId = string;
export type AutopilotAlarmId = string;