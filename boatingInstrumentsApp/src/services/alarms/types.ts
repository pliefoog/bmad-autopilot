/**
 * Types and enums for Critical Safety Alarm System
 * Marine safety standards compliance and fail-safe design patterns
 */

/**
 * Critical alarm types for marine safety monitoring
 * Based on marine industry standards and safety requirements
 * Expanded to cover all sensor metrics requiring threshold monitoring
 */
export enum CriticalAlarmType {
  // Navigation alarms
  SHALLOW_WATER = 'SHALLOW_WATER',
  DEEP_WATER = 'DEEP_WATER',
  HIGH_SPEED = 'HIGH_SPEED',
  
  // Engine alarms
  ENGINE_OVERHEAT = 'ENGINE_OVERHEAT',
  ENGINE_LOW_TEMP = 'ENGINE_LOW_TEMP',
  ENGINE_HIGH_RPM = 'ENGINE_HIGH_RPM',
  ENGINE_LOW_OIL_PRESSURE = 'ENGINE_LOW_OIL_PRESSURE',
  
  // Electrical alarms
  LOW_BATTERY = 'LOW_BATTERY',
  HIGH_BATTERY = 'HIGH_BATTERY',
  LOW_ALTERNATOR = 'LOW_ALTERNATOR',
  HIGH_CURRENT = 'HIGH_CURRENT',
  
  // Wind alarms
  HIGH_WIND = 'HIGH_WIND',
  WIND_GUST = 'WIND_GUST',
  
  // System alarms
  AUTOPILOT_FAILURE = 'AUTOPILOT_FAILURE',
  GPS_LOSS = 'GPS_LOSS',
  
  // Tank alarms
  LOW_FUEL = 'LOW_FUEL',
  LOW_WATER = 'LOW_WATER',
  HIGH_WASTE_WATER = 'HIGH_WASTE_WATER',
}

/**
 * Marine-grade escalation system for alarm severity
 * Follows maritime alarm escalation standards
 */
export enum AlarmEscalationLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CAUTION = 'CAUTION',
  CRITICAL = 'CRITICAL',
  EMERGENCY = 'EMERGENCY',
}

/**
 * Critical alarm event structure with marine safety metadata
 */
export interface CriticalAlarmEvent {
  id: string;
  type: CriticalAlarmType;
  escalationLevel: AlarmEscalationLevel;
  
  // Timing for marine safety compliance
  detectedAt: number; // timestamp when alarm was detected
  acknowledgedAt: number | null; // timestamp when acknowledged by user
  acknowledgedBy?: string; // user who acknowledged the alarm
  
  // Value and threshold information
  value: number; // actual measured value
  threshold: number; // configured threshold that was breached
  
  // Messaging and source
  message: string; // human-readable alarm message
  source: string; // source system or sensor
  metadata: Record<string, any>; // additional context data
  
  // Priority and classification
  priority: number; // numeric priority for queue sorting (higher = more urgent)
  marineSafetyClassification: string; // classification per marine safety standards
}

/**
 * Configuration for critical alarm types with marine safety validation
 * Standardized threshold structure: min, max, warning
 * Use 9999 for thresholds that don't apply to the specific alarm type
 */
export interface CriticalAlarmConfig {
  type: CriticalAlarmType;
  enabled: boolean;
  
  // Standardized threshold configuration (use 9999 for N/A)
  thresholds: {
    min: number;      // Minimum acceptable value (9999 if not applicable)
    max: number;      // Maximum acceptable value (9999 if not applicable)
    warning: number;  // Warning threshold value (9999 if not applicable)
  };
  
  // Hysteresis to prevent alarm flickering (marine stability requirement)
  hysteresis: number; // percentage or absolute value
  
  // Timing configuration
  debounceMs: number; // minimum time between alarm triggers
  escalationTimeoutMs: number; // time before escalating to next level
  
  // Audio/visual settings
  audioEnabled: boolean;
  audioPattern?: 'rapid_pulse' | 'warble' | 'intermittent' | 'triple_blast' | 'morse_u' | 'continuous_descending'; // Alarm sound pattern (ISO 9692)
  visualEnabled: boolean;
  vibrationEnabled: boolean;
  notificationEnabled: boolean;
  
  // Marine-specific settings
  marineSafetyClassification: string;
  requiresConfirmation: boolean; // true for critical navigation alarms
  allowSnooze: boolean; // false for safety-critical alarms
  maxSnoozeTime?: number; // maximum snooze time in milliseconds
  
  // Performance requirements
  maxResponseTimeMs: number; // must be <500ms for marine safety
  minAudioLevelDb: number; // must be >85dB for marine environment
  
  // Fail-safe behavior
  failSafeBehavior: 'alarm' | 'silent' | 'default'; // behavior when uncertain
  redundantAlerting: boolean; // multiple alert methods for critical alarms
}

/**
 * Alarm history entry for marine incident documentation
 */
export interface AlarmHistoryEntry {
  id: string;
  alarmEvent: CriticalAlarmEvent;
  
  // Timing information
  startTime: number;
  endTime?: number;
  duration?: number; // milliseconds from detection to acknowledgment
  
  // Response information
  responseTime: number; // milliseconds from detection to first user interaction
  escalationCount: number; // number of times alarm escalated
  acknowledgedBy: string;
  acknowledgmentMethod: string; // 'manual', 'timeout', 'system'
  
  // Performance metrics for marine safety compliance
  falsePositive: boolean; // manually marked as false positive
  falseNegative: boolean; // should have triggered but didn't
  complianceIssues: string[]; // any marine safety standard violations
  
  // Context for marine incident reporting
  vesselState: {
    position?: { lat: number; lon: number };
    course?: number;
    speed?: number;
    conditions?: string; // weather, sea state, etc.
  };
  
  // Related alarms and cascading effects
  relatedAlarms: string[]; // IDs of related simultaneous alarms
  cascadeEffects: string[]; // alarms that were triggered as a result
}

/**
 * Marine audio alert configuration
 */
export interface MarineAudioConfig {
  // Audio level requirements for marine environment
  targetAudioLevelDb: number; // >85dB requirement
  platformSpecific: boolean; // use iOS/Android native audio systems
  
  // Volume control
  masterVolume: number; // 0-1, master volume control for all alarms
  volumeOverride: boolean; // true to override system volume for safety
  respectSystemVolume: boolean; // false for emergency alarms
  backgroundAudioCapable: boolean; // continue audio when app backgrounded
  
  // Sound generation options
  allowSyntheticSounds: boolean; // allow generated alarm patterns
  
  // Sound patterns for different alarm types
  soundPatterns: {
    [key in CriticalAlarmType]: {
      filename?: string; // custom sound file
      pattern: 'continuous' | 'intermittent' | 'pulsing' | 'warble';
      frequency?: number; // Hz for generated tones
      dutyCycle?: number; // for pulsing patterns (0-1)
      repetitions?: number; // for intermittent patterns
    };
  };
  
  // Marine environment adaptations
  weatherCompensation: boolean; // adjust volume based on conditions
  engineNoiseCompensation: boolean; // boost volume near engine RPM ranges
}

/**
 * Visual alarm display configuration for marine conditions
 */
export interface MarineVisualConfig {
  // High-contrast colors for marine visibility
  colors: {
    [key in AlarmEscalationLevel]: {
      primary: string; // main alarm color
      background: string; // background color
      text: string; // text color for readability
      border: string; // border/outline color
    };
  };
  
  // Animation settings for attention-getting
  animations: {
    flashingEnabled: boolean;
    flashingRate: number; // flashes per second
    pulsingEnabled: boolean;
    pulsingRate: number; // pulses per second
    shakingEnabled: boolean; // for critical alarms
  };
  
  // Display behavior
  fullScreenOverlay: boolean; // for emergency alarms
  transparencyLevel: number; // 0-1, for overlay on instruments
  persistUntilAcknowledged: boolean;
  
  // Marine environment considerations
  nightVisionPreservation: boolean; // use red-night mode colors
  directSunlightReadability: boolean; // high contrast for bright conditions
  polarizedSunglassCompatibility: boolean; // avoid certain color combinations
}

/**
 * Alarm system performance metrics for marine safety compliance
 */
export interface AlarmPerformanceMetrics {
  // Response time statistics (must be <500ms average)
  averageResponseTimeMs: number;
  maxResponseTimeMs: number;
  responseTimePercentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
  
  // Reliability statistics
  totalAlarmsTriggered: number;
  falsePositiveCount: number;
  falseNegativeCount: number;
  falsePositiveRate: number; // must be <1%
  falseNegativeRate: number; // must be <0.1%
  
  // Audio system performance
  audioSystemReliability: number; // percentage of successful audio alerts
  averageAudioLevelDb: number; // must be >85dB
  audioFailureCount: number;
  
  // Visual system performance
  visualSystemReliability: number; // percentage of successful visual alerts
  displayLatencyMs: number; // time to show visual alert
  visualFailureCount: number;
  
  // Marine environment specific
  operatingTemperatureRange: { min: number; max: number };
  operatingConditions: string[]; // conditions where system was tested
  continuousOperationHours: number; // hours of continuous operation
  
  // Compliance status
  marineSafetyCompliant: boolean;
  complianceIssues: string[];
  lastComplianceCheck: number; // timestamp
}

/**
 * Configuration for critical alarm thresholds with marine validation
 */
export interface CriticalAlarmThreshold {
  id: string;
  alarmType: CriticalAlarmType;
  name: string;
  description: string;
  
  // NMEA data source
  dataPath: string; // path in NMEA data object (e.g., 'depth', 'engine.coolantTemp')
  units: string; // measurement units for display
  
  // Threshold values with marine safety validation
  warningThreshold?: number;
  cautionThreshold?: number;
  criticalThreshold?: number;
  emergencyThreshold?: number;
  
  // Validation ranges based on marine equipment standards
  validRange: {
    min: number;
    max: number;
    recommended: number; // recommended safe value
  };
  
  // Hysteresis and debouncing for marine stability
  hysteresis: {
    value: number; // hysteresis amount
    unit: 'percentage' | 'absolute'; // hysteresis type
  };
  debounceMs: number; // minimum time between threshold evaluations
  
  // Configuration status
  enabled: boolean;
  userConfigurable: boolean; // false for safety-critical thresholds
  lastModified: number; // timestamp of last configuration change
  modifiedBy: string; // user who made the change
  
  // Marine safety metadata
  safetyClassification: 'CRITICAL' | 'IMPORTANT' | 'INFORMATIONAL';
  regulatory: boolean; // true if required by maritime regulations
  certificationRequired: boolean; // true if requires marine certification
}

/**
 * Test mode configuration for alarm system validation
 */
export interface AlarmTestConfig {
  // Test types
  audioTest: boolean;
  visualTest: boolean;
  persistenceTest: boolean;
  escalationTest: boolean;
  performanceTest: boolean;
  
  // Test parameters
  testDurationMs: number; // how long to run tests
  testAlarmType: CriticalAlarmType; // which alarm type to test
  testEscalationLevel: AlarmEscalationLevel; // which level to test
  
  // Test validation
  validateResponseTime: boolean; // check <500ms requirement
  validateAudioLevel: boolean; // check >85dB requirement
  validateVisualContrast: boolean; // check marine visibility requirements
  
  // Test results
  testResults?: {
    passed: boolean;
    issues: string[];
    performanceMetrics: Partial<AlarmPerformanceMetrics>;
    timestamp: number;
  };
}

/**
 * Snooze configuration for appropriate alarm types
 */
export interface AlarmSnoozeConfig {
  // Snooze availability per alarm type
  allowedAlarmTypes: CriticalAlarmType[]; // which alarms can be snoozed
  
  // Snooze durations (in milliseconds)
  availableDurations: number[]; // e.g., [300000, 600000, 1800000] for 5, 10, 30 minutes
  defaultDuration: number;
  maxDuration: number; // safety limit - no alarm snoozed longer than this
  
  // Safety restrictions
  maxSnoozeCount: number; // maximum number of snoozes per alarm
  escalationOnMaxSnooze: boolean; // escalate if max snoozes reached
  criticalAlarmsAllowed: boolean; // false - critical alarms cannot be snoozed
  
  // User preferences
  requireConfirmation: boolean; // confirm snooze action
  showTimeRemaining: boolean; // display snooze countdown
  audioWarningBeforeExpiry: boolean; // audio alert before snooze expires
}