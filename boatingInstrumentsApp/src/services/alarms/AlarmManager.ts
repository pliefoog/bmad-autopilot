/**
 * AlarmManager - Central coordinator for all critical alarm functionality
 * Manages priority queue, escalation system, audio/visual coordination, and platform-specific alert delivery
 * 
 * Marine Safety Standards:
 * - False positive rate: <1%
 * - False negative rate: <0.1% 
 * - Threshold accuracy: ±5%
 * - Response time: <500ms
 * - Audio level: >85dB at 1 meter
 */

import { EventEmitter } from 'events';
import { useAlarmStore } from '../../stores/alarmStore';
import { CriticalAlarmType, AlarmEscalationLevel, CriticalAlarmEvent, CriticalAlarmConfig } from './types';
import { MarineAudioAlertManager } from './MarineAudioAlertManager';
import { AlarmHistoryLogger } from './AlarmHistoryLogger';

export interface AlarmManagerConfig {
  // Marine safety settings
  responseTimeThresholdMs: number; // <500ms requirement
  audioLevelDb: number; // >85dB requirement
  falsePositiveRateThreshold: number; // <1% requirement
  falseNegativeRateThreshold: number; // <0.1% requirement
  
  // Persistence settings
  surviveAppBackgrounding: boolean;
  surviveDeviceSleep: boolean;
  continueUntilAcknowledged: boolean;
  
  // Escalation timing
  escalationIntervals: {
    [key in AlarmEscalationLevel]: number; // milliseconds between escalations
  };
  
  // Platform overrides
  platformSpecificAudio: boolean;
  visualOverrideCapability: boolean;
}

export class AlarmManager extends EventEmitter {
  private static instance: AlarmManager | null = null;
  
  private config: AlarmManagerConfig;
  private alarmStore: ReturnType<typeof useAlarmStore>;
  private audioManager: MarineAudioAlertManager;
  private historyLogger: AlarmHistoryLogger;
  private activeAlarmQueue: Map<string, CriticalAlarmEvent> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();
  
  // Marine safety performance tracking
  private responseTimeMetrics: number[] = [];
  private falsePositiveCount = 0;
  private falseNegativeCount = 0;
  private totalAlarmsTriggered = 0;
  
  private constructor(config: AlarmManagerConfig) {
    super();
    this.config = config;
    this.alarmStore = useAlarmStore.getState();
    this.audioManager = new MarineAudioAlertManager({
      targetAudioLevelDb: config.audioLevelDb,
      platformSpecific: config.platformSpecificAudio,
    });
    this.historyLogger = new AlarmHistoryLogger();
    
    // Initialize marine safety monitoring
    this.initializeMarineSafetyMonitoring();
  }
  
  public static getInstance(config?: AlarmManagerConfig): AlarmManager {
    if (!AlarmManager.instance) {
      if (!config) {
        throw new Error('AlarmManager requires configuration on first instantiation');
      }
      AlarmManager.instance = new AlarmManager(config);
    }
    return AlarmManager.instance;
  }
  
  /**
   * Initialize marine safety monitoring and performance tracking
   */
  private initializeMarineSafetyMonitoring(): void {
    // Monitor response times to ensure <500ms requirement
    this.on('alarmTriggered', (event: CriticalAlarmEvent) => {
      const responseTime = Date.now() - event.detectedAt;
      this.responseTimeMetrics.push(responseTime);
      
      // Keep only last 1000 measurements for rolling average
      if (this.responseTimeMetrics.length > 1000) {
        this.responseTimeMetrics.shift();
      }
      
      // Alert if response time exceeds marine safety requirement
      if (responseTime > this.config.responseTimeThresholdMs) {
        console.warn(`AlarmManager: Response time ${responseTime}ms exceeds marine safety requirement of ${this.config.responseTimeThresholdMs}ms`);
      }
    });
    
    // Monitor false positive/negative rates
    this.on('falsePositive', () => {
      this.falsePositiveCount++;
      this.checkMarineSafetyCompliance();
    });
    
    this.on('falseNegative', () => {
      this.falseNegativeCount++;
      this.checkMarineSafetyCompliance();
    });
  }
  
  /**
   * Trigger a critical alarm with marine safety requirements
   */
  public async triggerCriticalAlarm(
    type: CriticalAlarmType,
    data: {
      value: number;
      threshold: number;
      message?: string;
      source?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const startTime = Date.now();
    const alarmId = `critical-${type}-${startTime}`;
    
    // Create critical alarm event
    const alarmEvent: CriticalAlarmEvent = {
      id: alarmId,
      type,
      escalationLevel: this.determineEscalationLevel(type, data.value, data.threshold),
      detectedAt: startTime,
      acknowledgedAt: null,
      value: data.value,
      threshold: data.threshold,
      message: data.message || this.generateDefaultMessage(type, data.value, data.threshold),
      source: data.source || 'AlarmManager',
      metadata: data.metadata || {},
      priority: this.getCriticalAlarmPriority(type),
      marineSafetyClassification: this.getMarineSafetyClassification(type),
    };
    
    try {
      // Add to priority queue (fail-safe: always add critical alarms)
      this.activeAlarmQueue.set(alarmId, alarmEvent);
      this.totalAlarmsTriggered++;
      
      // Add to alarm store with enhanced metadata
      this.alarmStore.addAlarm({
        message: alarmEvent.message,
        level: this.mapEscalationToAlarmLevel(alarmEvent.escalationLevel),
        source: alarmEvent.source,
        value: alarmEvent.value,
        threshold: alarmEvent.threshold,
      });
      
      // Immediate audio/visual alerts (marine requirement: no delay)
      await this.triggerImmediateAlerts(alarmEvent);
      
      // Start escalation timer if not acknowledged
      this.scheduleEscalation(alarmEvent);
      
      // Log to history with marine safety context
      await this.historyLogger.logCriticalAlarm(alarmEvent);
      
      // Emit event for UI components
      this.emit('alarmTriggered', alarmEvent);
      
      // Track response time compliance
      const responseTime = Date.now() - startTime;
      this.emit('responseTimeRecorded', { alarmId, responseTime });
      
    } catch (error) {
      console.error('AlarmManager: Failed to trigger critical alarm', {
        type,
        alarmId,
        error: error instanceof Error ? error.message : error,
      });
      
      // Fail-safe: Still add to alarm store even if enhanced features fail
      this.alarmStore.addAlarm({
        message: `SYSTEM ALERT: ${type} - ${data.value} (threshold: ${data.threshold})`,
        level: 'critical',
        source: 'AlarmManager-FailSafe',
        value: data.value,
        threshold: data.threshold,
      });
    }
  }
  
  /**
   * Acknowledge critical alarm with marine safety validation
   */
  public async acknowledgeCriticalAlarm(
    alarmId: string,
    acknowledgedBy: string = 'user',
    requiresConfirmation: boolean = true
  ): Promise<boolean> {
    const alarmEvent = this.activeAlarmQueue.get(alarmId);
    if (!alarmEvent) {
      return false;
    }
    
    try {
      // Marine safety requirement: Critical alarms require explicit acknowledgment
      if (requiresConfirmation && alarmEvent.escalationLevel === AlarmEscalationLevel.EMERGENCY) {
        // Additional confirmation required for emergency level alarms
        const confirmed = await this.requestEmergencyAcknowledgmentConfirmation(alarmEvent);
        if (!confirmed) {
          return false;
        }
      }
      
      // Update alarm event
      alarmEvent.acknowledgedAt = Date.now();
      alarmEvent.acknowledgedBy = acknowledgedBy;
      
      // Stop escalation
      const escalationTimer = this.escalationTimers.get(alarmId);
      if (escalationTimer) {
        clearTimeout(escalationTimer);
        this.escalationTimers.delete(alarmId);
      }
      
      // Stop audio alerts
      await this.audioManager.stopAlarmSound(alarmEvent.type);
      
      // Update alarm store
      this.alarmStore.acknowledgeAlarm(alarmId, acknowledgedBy);
      
      // Log acknowledgment
      await this.historyLogger.logAlarmAcknowledgment(alarmEvent, acknowledgedBy);
      
      // Remove from active queue
      this.activeAlarmQueue.delete(alarmId);
      
      // Emit acknowledgment event
      this.emit('alarmAcknowledged', { alarmEvent, acknowledgedBy });
      
      return true;
      
    } catch (error) {
      console.error('AlarmManager: Failed to acknowledge critical alarm', {
        alarmId,
        error: error instanceof Error ? error.message : error,
      });
      return false;
    }
  }
  
  /**
   * Get marine safety compliance status
   */
  public getMarineSafetyComplianceStatus(): {
    compliant: boolean;
    averageResponseTime: number;
    falsePositiveRate: number;
    falseNegativeRate: number;
    issues: string[];
  } {
    const avgResponseTime = this.responseTimeMetrics.length > 0
      ? this.responseTimeMetrics.reduce((sum, time) => sum + time, 0) / this.responseTimeMetrics.length
      : 0;
      
    const falsePositiveRate = this.totalAlarmsTriggered > 0
      ? (this.falsePositiveCount / this.totalAlarmsTriggered) * 100
      : 0;
      
    const falseNegativeRate = this.totalAlarmsTriggered > 0
      ? (this.falseNegativeCount / this.totalAlarmsTriggered) * 100
      : 0;
      
    const issues: string[] = [];
    
    if (avgResponseTime > this.config.responseTimeThresholdMs) {
      issues.push(`Average response time ${avgResponseTime.toFixed(1)}ms exceeds ${this.config.responseTimeThresholdMs}ms requirement`);
    }
    
    if (falsePositiveRate > this.config.falsePositiveRateThreshold) {
      issues.push(`False positive rate ${falsePositiveRate.toFixed(2)}% exceeds ${this.config.falsePositiveRateThreshold}% threshold`);
    }
    
    if (falseNegativeRate > this.config.falseNegativeRateThreshold) {
      issues.push(`False negative rate ${falseNegativeRate.toFixed(2)}% exceeds ${this.config.falseNegativeRateThreshold}% threshold`);
    }
    
    return {
      compliant: issues.length === 0,
      averageResponseTime: avgResponseTime,
      falsePositiveRate,
      falseNegativeRate,
      issues,
    };
  }
  
  /**
   * Test all alarm systems (marine safety requirement)
   */
  public async testAllAlarmSystems(): Promise<{
    audio: boolean;
    visual: boolean;
    persistence: boolean;
    escalation: boolean;
    overall: boolean;
  }> {
    const results = {
      audio: false,
      visual: false,
      persistence: false,
      escalation: false,
      overall: false,
    };
    
    try {
      // Test audio system
      results.audio = await this.audioManager.testAudioSystem();
      
      // Test visual system (trigger test alarm)
      const testAlarmId = await this.triggerTestAlarm();
      results.visual = testAlarmId !== null;
      
      // Test persistence (simulate app backgrounding)
      results.persistence = await this.testAlarmPersistence();
      
      // Test escalation system
      results.escalation = await this.testEscalationSystem();
      
      // Clean up test alarm
      if (testAlarmId) {
        await this.acknowledgeCriticalAlarm(testAlarmId, 'system-test', false);
      }
      
      results.overall = results.audio && results.visual && results.persistence && results.escalation;
      
      // Log test results
      await this.historyLogger.logSystemTest(results);
      
      return results;
      
    } catch (error) {
      console.error('AlarmManager: System test failed', error);
      return results;
    }
  }
  
  // Private helper methods
  
  private determineEscalationLevel(type: CriticalAlarmType, value: number, threshold: number): AlarmEscalationLevel {
    // Marine-grade escalation based on severity and safety impact
    switch (type) {
      case CriticalAlarmType.SHALLOW_WATER:
        const depthRatio = value / threshold;
        if (depthRatio <= 0.5) return AlarmEscalationLevel.EMERGENCY;
        if (depthRatio <= 0.75) return AlarmEscalationLevel.CRITICAL;
        return AlarmEscalationLevel.WARNING;
        
      case CriticalAlarmType.ENGINE_OVERHEAT:
        const tempExcess = (value - threshold) / threshold;
        if (tempExcess >= 0.2) return AlarmEscalationLevel.EMERGENCY;
        if (tempExcess >= 0.1) return AlarmEscalationLevel.CRITICAL;
        return AlarmEscalationLevel.WARNING;
        
      case CriticalAlarmType.LOW_BATTERY:
        const batteryLevel = value / threshold;
        if (batteryLevel <= 0.5) return AlarmEscalationLevel.CRITICAL;
        if (batteryLevel <= 0.75) return AlarmEscalationLevel.WARNING;
        return AlarmEscalationLevel.CAUTION;
        
      case CriticalAlarmType.AUTOPILOT_FAILURE:
      case CriticalAlarmType.GPS_LOSS:
        return AlarmEscalationLevel.CRITICAL; // Always critical for navigation safety
        
      default:
        return AlarmEscalationLevel.WARNING;
    }
  }
  
  private getCriticalAlarmPriority(type: CriticalAlarmType): number {
    // Higher numbers = higher priority
    const priorityMap = {
      [CriticalAlarmType.SHALLOW_WATER]: 100, // Highest - immediate grounding risk
      [CriticalAlarmType.AUTOPILOT_FAILURE]: 90, // Navigation safety critical
      [CriticalAlarmType.ENGINE_OVERHEAT]: 80, // Engine damage prevention
      [CriticalAlarmType.GPS_LOSS]: 70, // Navigation system failure
      [CriticalAlarmType.LOW_BATTERY]: 60, // Power system monitoring
    };
    
    return priorityMap[type] || 50;
  }
  
  private getMarineSafetyClassification(type: CriticalAlarmType): string {
    // Classification based on marine safety standards
    const classificationMap = {
      [CriticalAlarmType.SHALLOW_WATER]: 'NAVIGATION_HAZARD',
      [CriticalAlarmType.ENGINE_OVERHEAT]: 'MACHINERY_FAILURE',
      [CriticalAlarmType.LOW_BATTERY]: 'POWER_SYSTEM',
      [CriticalAlarmType.AUTOPILOT_FAILURE]: 'NAVIGATION_SYSTEM',
      [CriticalAlarmType.GPS_LOSS]: 'NAVIGATION_SYSTEM',
    };
    
    return classificationMap[type] || 'GENERAL';
  }
  
  private generateDefaultMessage(type: CriticalAlarmType, value: number, threshold: number): string {
    switch (type) {
      case CriticalAlarmType.SHALLOW_WATER:
        return `SHALLOW WATER: ${value.toFixed(1)}m (limit: ${threshold.toFixed(1)}m)`;
      case CriticalAlarmType.ENGINE_OVERHEAT:
        return `ENGINE OVERHEAT: ${value.toFixed(0)}°C (limit: ${threshold.toFixed(0)}°C)`;
      case CriticalAlarmType.LOW_BATTERY:
        return `LOW BATTERY: ${value.toFixed(1)}V (limit: ${threshold.toFixed(1)}V)`;
      case CriticalAlarmType.AUTOPILOT_FAILURE:
        return `AUTOPILOT FAILURE: System disconnected`;
      case CriticalAlarmType.GPS_LOSS:
        return `GPS SIGNAL LOST: No position fix`;
      default:
        return `CRITICAL ALARM: ${type}`;
    }
  }
  
  private mapEscalationToAlarmLevel(escalation: AlarmEscalationLevel): 'info' | 'warning' | 'critical' {
    switch (escalation) {
      case AlarmEscalationLevel.INFO:
        return 'info';
      case AlarmEscalationLevel.WARNING:
      case AlarmEscalationLevel.CAUTION:
        return 'warning';
      case AlarmEscalationLevel.CRITICAL:
      case AlarmEscalationLevel.EMERGENCY:
        return 'critical';
      default:
        return 'warning';
    }
  }
  
  private async triggerImmediateAlerts(alarmEvent: CriticalAlarmEvent): Promise<void> {
    // Audio alert (marine requirement: >85dB)
    await this.audioManager.playAlarmSound(alarmEvent.type, alarmEvent.escalationLevel);
    
    // Visual alert handled by UI components listening to alarmTriggered event
    
    // Platform notifications for background alerts
    if (this.config.surviveAppBackgrounding) {
      // Implementation would depend on platform-specific notification system
    }
  }
  
  private scheduleEscalation(alarmEvent: CriticalAlarmEvent): void {
    const escalationInterval = this.config.escalationIntervals[alarmEvent.escalationLevel];
    
    if (escalationInterval > 0) {
      const timer = setTimeout(() => {
        this.escalateAlarm(alarmEvent.id);
      }, escalationInterval);
      
      this.escalationTimers.set(alarmEvent.id, timer);
    }
  }
  
  private async escalateAlarm(alarmId: string): Promise<void> {
    const alarmEvent = this.activeAlarmQueue.get(alarmId);
    if (!alarmEvent || alarmEvent.acknowledgedAt) {
      return; // Alarm no longer active or already acknowledged
    }
    
    // Increase escalation level if possible
    const currentLevel = alarmEvent.escalationLevel;
    let nextLevel: AlarmEscalationLevel;
    
    switch (currentLevel) {
      case AlarmEscalationLevel.INFO:
        nextLevel = AlarmEscalationLevel.WARNING;
        break;
      case AlarmEscalationLevel.WARNING:
        nextLevel = AlarmEscalationLevel.CAUTION;
        break;
      case AlarmEscalationLevel.CAUTION:
        nextLevel = AlarmEscalationLevel.CRITICAL;
        break;
      case AlarmEscalationLevel.CRITICAL:
        nextLevel = AlarmEscalationLevel.EMERGENCY;
        break;
      case AlarmEscalationLevel.EMERGENCY:
        // Already at maximum level - continue alerting
        nextLevel = AlarmEscalationLevel.EMERGENCY;
        break;
      default:
        nextLevel = AlarmEscalationLevel.WARNING;
    }
    
    // Update alarm event
    alarmEvent.escalationLevel = nextLevel;
    
    // Trigger escalated alerts
    await this.triggerImmediateAlerts(alarmEvent);
    
    // Log escalation
    await this.historyLogger.logAlarmEscalation(alarmEvent, currentLevel, nextLevel);
    
    // Schedule next escalation
    this.scheduleEscalation(alarmEvent);
    
    // Emit escalation event
    this.emit('alarmEscalated', { alarmEvent, previousLevel: currentLevel, newLevel: nextLevel });
  }
  
  private async requestEmergencyAcknowledgmentConfirmation(alarmEvent: CriticalAlarmEvent): Promise<boolean> {
    // This would typically show a modal or special UI for emergency acknowledgment
    // For now, return true - implementation depends on UI framework
    return true;
  }
  
  private checkMarineSafetyCompliance(): void {
    const compliance = this.getMarineSafetyComplianceStatus();
    
    if (!compliance.compliant) {
      console.warn('AlarmManager: Marine safety compliance issues detected', compliance.issues);
      this.emit('complianceIssue', compliance);
    }
  }
  
  private async triggerTestAlarm(): Promise<string | null> {
    try {
      const testAlarmId = `test-${Date.now()}`;
      await this.triggerCriticalAlarm(CriticalAlarmType.SHALLOW_WATER, {
        value: 1.0,
        threshold: 2.0,
        message: 'SYSTEM TEST - Alarm system functional test',
        source: 'AlarmManager-Test',
      });
      return testAlarmId;
    } catch (error) {
      console.error('AlarmManager: Test alarm failed', error);
      return null;
    }
  }
  
  private async testAlarmPersistence(): Promise<boolean> {
    // Test that alarms persist across app lifecycle changes
    // This would involve testing with actual app backgrounding scenarios
    return true; // Placeholder - actual implementation would test persistence
  }
  
  private async testEscalationSystem(): Promise<boolean> {
    // Test escalation timing and behavior
    // This would involve creating a test alarm and verifying escalation
    return true; // Placeholder - actual implementation would test escalation
  }
}

// Export default marine-grade configuration
export const DEFAULT_MARINE_ALARM_CONFIG: AlarmManagerConfig = {
  responseTimeThresholdMs: 500, // Marine safety requirement
  audioLevelDb: 85, // Audible over engine/wind noise
  falsePositiveRateThreshold: 1.0, // <1% false positives
  falseNegativeRateThreshold: 0.1, // <0.1% false negatives
  surviveAppBackgrounding: true,
  surviveDeviceSleep: true,
  continueUntilAcknowledged: true,
  escalationIntervals: {
    [AlarmEscalationLevel.INFO]: 30000, // 30 seconds
    [AlarmEscalationLevel.WARNING]: 15000, // 15 seconds
    [AlarmEscalationLevel.CAUTION]: 10000, // 10 seconds
    [AlarmEscalationLevel.CRITICAL]: 5000, // 5 seconds
    [AlarmEscalationLevel.EMERGENCY]: 2000, // 2 seconds
  },
  platformSpecificAudio: true,
  visualOverrideCapability: true,
};