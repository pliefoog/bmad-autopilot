/**
 * Critical Safety Alarm System - Main exports
 * Marine-grade alarm system with fail-safe design and marine safety standards compliance
 * 
 * Performance Requirements:
 * - Response time: <500ms
 * - Audio level: >85dB at 1 meter  
 * - False positive rate: <1%
 * - False negative rate: <0.1%
 * - Threshold accuracy: ±5%
 */

// Core alarm management
export { AlarmManager, DEFAULT_MARINE_ALARM_CONFIG } from './AlarmManager';

// Audio system for marine environment
export { MarineAudioAlertManager, DEFAULT_MARINE_AUDIO_CONFIG } from './MarineAudioAlertManager';

// History logging for marine incident documentation
export { AlarmHistoryLogger } from './AlarmHistoryLogger';

// Active monitoring for GPS and autopilot systems
export { CriticalAlarmMonitors } from './CriticalAlarmMonitors';

// TODO: Sensor-instance-based alarm configuration will be added here

// Types and interfaces
export type {
  CriticalAlarmEvent,
  CriticalAlarmConfig,
  AlarmHistoryEntry,
  MarineAudioConfig,
  MarineVisualConfig,
  AlarmPerformanceMetrics,
  CriticalAlarmThreshold,
  AlarmTestConfig,
  AlarmSnoozeConfig,
} from './types';

export {
  CriticalAlarmType,
  AlarmEscalationLevel,
} from './types';

// Import CriticalAlarmType for use in utilities
import { CriticalAlarmType } from './types';

// Utility functions for marine alarm system integration
export const AlarmSystemUtils = {
  /**
   * Check if alarm type is critical for navigation safety
   */
  isCriticalNavigationAlarm: (type: CriticalAlarmType): boolean => {
    return type === CriticalAlarmType.SHALLOW_WATER ||
           type === CriticalAlarmType.AUTOPILOT_FAILURE ||
           type === CriticalAlarmType.GPS_LOSS;
  },
  
  /**
   * Get marine safety priority for alarm type (higher = more urgent)
   */
  getMarineSafetyPriority: (type: CriticalAlarmType): number => {
    const priorityMap = {
      [CriticalAlarmType.SHALLOW_WATER]: 100, // Immediate grounding risk
      [CriticalAlarmType.AUTOPILOT_FAILURE]: 90, // Navigation safety critical
      [CriticalAlarmType.ENGINE_OVERHEAT]: 80, // Engine damage prevention
      [CriticalAlarmType.GPS_LOSS]: 70, // Navigation system failure
      [CriticalAlarmType.LOW_BATTERY]: 60, // Power system monitoring
    };
    return priorityMap[type] || 50;
  },
  
  /**
   * Validate response time against marine safety requirements
   */
  validateResponseTime: (responseTimeMs: number): { compliant: boolean; issue?: string } => {
    if (responseTimeMs <= 500) {
      return { compliant: true };
    }
    return {
      compliant: false,
      issue: `Response time ${responseTimeMs}ms exceeds marine safety requirement of 500ms`,
    };
  },
  
  /**
   * Validate audio level against marine environment requirements
   */
  validateAudioLevel: (audioLevelDb: number): { compliant: boolean; issue?: string } => {
    if (audioLevelDb >= 85) {
      return { compliant: true };
    }
    return {
      compliant: false,
      issue: `Audio level ${audioLevelDb}dB below marine safety requirement of 85dB`,
    };
  },
  
  /**
   * Calculate marine environment visibility score for visual alarms
   */
  calculateVisibilityScore: (conditions: {
    sunlight: 'direct' | 'indirect' | 'night';
    redNightMode: boolean;
    polarizedSunglasses: boolean;
  }): number => {
    let score = 100;
    
    if (conditions.sunlight === 'direct') {
      score -= 30; // Reduced visibility in direct sunlight
    }
    
    if (conditions.polarizedSunglasses) {
      score -= 20; // Potential issues with certain display types
    }
    
    if (conditions.redNightMode) {
      score -= 10; // Limited color range in red-night mode
    }
    
    return Math.max(0, score);
  },
  
  /**
   * Generate marine-standard alarm message
   */
  generateMarineAlarmMessage: (
    type: CriticalAlarmType,
    value: number,
    threshold: number,
    units?: string
  ): string => {
    const formatValue = (val: number, unit?: string) => {
      const formatted = val < 10 ? val.toFixed(1) : val.toFixed(0);
      return unit ? `${formatted}${unit}` : formatted;
    };
    
    switch (type) {
      case CriticalAlarmType.SHALLOW_WATER:
        return `⚠️ SHALLOW WATER: ${formatValue(value, 'm')} (limit: ${formatValue(threshold, 'm')})`;
      case CriticalAlarmType.ENGINE_OVERHEAT:
        return `🌡️ ENGINE OVERHEAT: ${formatValue(value, '°C')} (limit: ${formatValue(threshold, '°C')})`;
      case CriticalAlarmType.LOW_BATTERY:
        return `🔋 LOW BATTERY: ${formatValue(value, 'V')} (limit: ${formatValue(threshold, 'V')})`;
      case CriticalAlarmType.AUTOPILOT_FAILURE:
        return `🧭 AUTOPILOT FAILURE: System disconnected - Manual steering required`;
      case CriticalAlarmType.GPS_LOSS:
        return `📡 GPS SIGNAL LOST: No position fix - Use backup navigation`;
      default:
        return `⚠️ CRITICAL ALARM: ${type} - ${formatValue(value, units)} (threshold: ${formatValue(threshold, units)})`;
    }
  },
};

// CriticalAlarmType is already exported above in the main types export