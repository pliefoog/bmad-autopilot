/**
 * Smart Alarm System - Main exports
 * Exports all smart alarm management components for easy integration
 */

// Main orchestrator
export { SmartAlarmManager } from './SmartAlarmManager';
export type { SmartAlarmConfiguration, ProcessedAlarm, SmartAlarmStats } from './SmartAlarmManager';

// Core components
export { AlarmGroupingEngine } from './AlarmGroupingEngine';
export type { AlarmGroup, MarineSystemCategory, GroupingRule } from './AlarmGroupingEngine';

export { PriorityQueueManager } from './PriorityQueueManager';
export type { PriorityQueueEntry, VesselContext, QueueConfiguration } from './PriorityQueueManager';

export { VesselContextDetector } from './VesselContextDetector';
export type {
  NmeaDataSnapshot,
  MovementPattern,
  ContextDetectionConfig,
} from './VesselContextDetector';

export { AdaptiveLearningEngine } from './AdaptiveLearningEngine';
export type {
  AlarmInteraction,
  LearnedPattern,
  ThresholdAdjustment,
  LearningConfig,
} from './AdaptiveLearningEngine';

export { MaintenanceScheduler } from './MaintenanceScheduler';
export type {
  MaintenanceItem,
  MaintenanceAlarm,
  EngineUsage,
  PredictiveConfig,
} from './MaintenanceScheduler';

// Existing alarm types (re-export for convenience)
export type { CriticalAlarmType, AlarmEscalationLevel } from './types';
