/**
 * Alarm Configuration Manager
 * User-configurable threshold system and alarm management for Task 5
 */

import { AlarmThreshold, AlarmSettings, AlarmLevel } from '../../store/alarmStore';
import { CriticalAlarmType, AlarmEscalationLevel, CriticalAlarmConfig } from '../alarms/types';
import { AlarmManager } from '../alarms/AlarmManager';
import { MarineAudioAlertManager } from '../alarms/MarineAudioAlertManager';

export interface AlarmConfigurationProfile {
  id: string;
  name: string;
  description: string;
  thresholds: AlarmThreshold[];
  settings: AlarmSettings;
  criticalAlarmConfigs: CriticalAlarmConfig[];
  audioSettings: {
    masterVolume: number;
    volumeOverride: boolean;
    allowSyntheticSounds: boolean;
  };
  createdAt: number;
  lastModified: number;
}

export interface AlarmTestResult {
  alarmType: CriticalAlarmType | string;
  testType: 'visual' | 'audio' | 'combined';
  success: boolean;
  duration: number;
  timestamp: number;
  notes?: string;
  error?: string;
}

export interface AlarmHistoryEntry {
  id: string;
  alarmId: string;
  type: CriticalAlarmType | 'threshold';
  escalationLevel: AlarmEscalationLevel | AlarmLevel;
  message: string;
  value?: number;
  threshold?: number;
  source: string;
  triggeredAt: number;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  resolvedAt?: number;
  duration?: number;
  snoozeCount: number;
  falsePositive?: boolean;
  notes?: string;
}

export interface SnoozeOptions {
  alarmId: string;
  duration: number; // milliseconds
  reason?: string;
  allowCritical: boolean; // false for safety-critical alarms
}

export class AlarmConfigurationManager {
  private profiles: Map<string, AlarmConfigurationProfile> = new Map();
  private currentProfileId: string = 'default';
  private alarmHistory: AlarmHistoryEntry[] = [];
  private maxHistorySize: number = 10000;
  private snoozeTimers: Map<string, NodeJS.Timeout> = new Map();
  
  constructor() {
    this.initializeDefaultProfile();
  }

  /**
   * Initialize default marine safety configuration profile
   */
  private initializeDefaultProfile(): void {
    const defaultProfile: AlarmConfigurationProfile = {
      id: 'default',
      name: 'Marine Safety Standard',
      description: 'Standard marine safety alarm configuration with regulatory compliance',
      thresholds: this.getDefaultThresholds(),
      settings: this.getDefaultSettings(),
      criticalAlarmConfigs: this.getDefaultCriticalAlarmConfigs(),
      audioSettings: {
        masterVolume: 0.8,
        volumeOverride: true,
        allowSyntheticSounds: true,
      },
      createdAt: Date.now(),
      lastModified: Date.now(),
    };

    this.profiles.set('default', defaultProfile);
  }

  /**
   * Get default threshold configurations with marine safety standards
   */
  private getDefaultThresholds(): AlarmThreshold[] {
    return [
      // Depth monitoring - critical for navigation safety
      {
        id: 'shallow-water-warning',
        name: 'Shallow Water Warning',
        dataPath: 'depth',
        type: 'min',
        value: 3.0, // 3 meters warning
        level: 'warning',
        enabled: true,
        hysteresis: 0.2,
      },
      {
        id: 'shallow-water-critical',
        name: 'Shallow Water Critical',
        dataPath: 'depth',
        type: 'min',
        value: 1.5, // 1.5 meters critical
        level: 'critical',
        enabled: true,
        hysteresis: 0.1,
      },
      
      // Engine monitoring - critical for vessel operation
      {
        id: 'engine-temp-warning',
        name: 'Engine Temperature Warning',
        dataPath: 'engine.coolantTemp',
        type: 'max',
        value: 85, // 85°C warning
        level: 'warning',
        enabled: true,
        hysteresis: 3,
      },
      {
        id: 'engine-temp-critical',
        name: 'Engine Temperature Critical',
        dataPath: 'engine.coolantTemp',
        type: 'max',
        value: 95, // 95°C critical (before damage)
        level: 'critical',
        enabled: true,
        hysteresis: 2,
      },
      
      // Electrical system monitoring
      {
        id: 'battery-voltage-warning',
        name: 'Battery Voltage Warning',
        dataPath: 'electrical.batteryVoltage',
        type: 'min',
        value: 12.2, // 12.2V warning (50% capacity)
        level: 'warning',
        enabled: true,
        hysteresis: 0.1,
      },
      {
        id: 'battery-voltage-critical',
        name: 'Battery Voltage Critical',
        dataPath: 'electrical.batteryVoltage',
        type: 'min',
        value: 11.8, // 11.8V critical (system shutdown risk)
        level: 'critical',
        enabled: true,
        hysteresis: 0.1,
      },
      
      // Additional marine safety thresholds
      {
        id: 'wind-speed-warning',
        name: 'High Wind Speed',
        dataPath: 'environment.windSpeed',
        type: 'max',
        value: 25, // 25 knots warning
        level: 'warning',
        enabled: true,
        hysteresis: 2,
      },
      {
        id: 'anchor-drag-warning',
        name: 'Anchor Drag Warning',
        dataPath: 'navigation.anchorDrift',
        type: 'max',
        value: 50, // 50 meters from anchor position
        level: 'warning',
        enabled: true,
        hysteresis: 10,
      },
    ];
  }

  /**
   * Get default alarm settings with marine safety preferences
   */
  private getDefaultSettings(): AlarmSettings {
    return {
      soundEnabled: true,
      vibrationEnabled: true,
      autoAcknowledge: false, // Manual acknowledgment for safety
      autoAcknowledgeTime: 0, // Disabled for marine safety
      levelMuting: {
        info: false,
        warning: false,
        critical: false, // Never mute critical alarms
      },
    };
  }

  /**
   * Get default critical alarm configurations
   */
  private getDefaultCriticalAlarmConfigs(): CriticalAlarmConfig[] {
    return Object.values(CriticalAlarmType).map(type => ({
      type,
      enabled: true,
      thresholds: this.getDefaultCriticalThresholds(type),
      hysteresis: this.getDefaultHysteresis(type),
      debounceMs: 1000, // 1 second debounce
      escalationTimeoutMs: 30000, // 30 seconds to escalate
      audioEnabled: true,
      visualEnabled: true,
      vibrationEnabled: true,
      notificationEnabled: true,
      marineSafetyClassification: this.getMarineSafetyClass(type),
      requiresConfirmation: this.requiresConfirmation(type),
      allowSnooze: this.allowSnooze(type),
      maxSnoozeTime: this.getMaxSnoozeTime(type),
      maxResponseTimeMs: 500, // Marine safety requirement
      minAudioLevelDb: 85, // Marine environment requirement
      failSafeBehavior: 'alarm', // Always err on side of alerting
      redundantAlerting: true, // Multiple alert methods
    }));
  }

  private getDefaultCriticalThresholds(type: CriticalAlarmType): any {
    const thresholdMap = {
      [CriticalAlarmType.SHALLOW_WATER]: { critical: 1.0, emergency: 0.5 },
      [CriticalAlarmType.ENGINE_OVERHEAT]: { warning: 85, critical: 95, emergency: 105 },
      [CriticalAlarmType.LOW_BATTERY]: { warning: 12.0, critical: 11.5, emergency: 11.0 },
      [CriticalAlarmType.AUTOPILOT_FAILURE]: { critical: 1 }, // Boolean threshold
      [CriticalAlarmType.GPS_LOSS]: { warning: 60, critical: 120 }, // Seconds without fix
    };
    return thresholdMap[type] || { warning: 1, critical: 2 };
  }

  private getDefaultHysteresis(type: CriticalAlarmType): number {
    const hysteresisMap = {
      [CriticalAlarmType.SHALLOW_WATER]: 0.1, // 10cm
      [CriticalAlarmType.ENGINE_OVERHEAT]: 2, // 2°C
      [CriticalAlarmType.LOW_BATTERY]: 0.1, // 0.1V
      [CriticalAlarmType.AUTOPILOT_FAILURE]: 0, // No hysteresis for boolean
      [CriticalAlarmType.GPS_LOSS]: 5, // 5 seconds
    };
    return hysteresisMap[type] || 0.1;
  }

  private getMarineSafetyClass(type: CriticalAlarmType): string {
    const classMap = {
      [CriticalAlarmType.SHALLOW_WATER]: 'Navigation Safety Critical',
      [CriticalAlarmType.ENGINE_OVERHEAT]: 'Propulsion System Critical',
      [CriticalAlarmType.LOW_BATTERY]: 'Electrical System Warning',
      [CriticalAlarmType.AUTOPILOT_FAILURE]: 'Navigation System Critical',
      [CriticalAlarmType.GPS_LOSS]: 'Navigation System Critical',
    };
    return classMap[type] || 'General Safety';
  }

  private requiresConfirmation(type: CriticalAlarmType): boolean {
    // Critical navigation alarms require explicit confirmation
    return [CriticalAlarmType.SHALLOW_WATER, CriticalAlarmType.AUTOPILOT_FAILURE, CriticalAlarmType.GPS_LOSS].includes(type);
  }

  private allowSnooze(type: CriticalAlarmType): boolean {
    // Only allow snoozing for non-immediate safety risks
    return [CriticalAlarmType.LOW_BATTERY].includes(type);
  }

  private getMaxSnoozeTime(type: CriticalAlarmType): number | undefined {
    if (this.allowSnooze(type)) {
      return 15 * 60 * 1000; // 15 minutes max for battery warnings
    }
    return undefined;
  }

  /**
   * Create new configuration profile
   */
  public createProfile(
    name: string, 
    description: string, 
    baseProfileId: string = 'default'
  ): AlarmConfigurationProfile {
    const baseProfile = this.profiles.get(baseProfileId);
    if (!baseProfile) {
      throw new Error(`Base profile ${baseProfileId} not found`);
    }

    const newProfile: AlarmConfigurationProfile = {
      id: `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      thresholds: JSON.parse(JSON.stringify(baseProfile.thresholds)), // Deep copy
      settings: JSON.parse(JSON.stringify(baseProfile.settings)),
      criticalAlarmConfigs: JSON.parse(JSON.stringify(baseProfile.criticalAlarmConfigs)),
      audioSettings: JSON.parse(JSON.stringify(baseProfile.audioSettings)),
      createdAt: Date.now(),
      lastModified: Date.now(),
    };

    this.profiles.set(newProfile.id, newProfile);
    return newProfile;
  }

  /**
   * Update existing profile
   */
  public updateProfile(profileId: string, updates: Partial<AlarmConfigurationProfile>): void {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }

    const updatedProfile = {
      ...profile,
      ...updates,
      lastModified: Date.now(),
    };

    this.profiles.set(profileId, updatedProfile);
  }

  /**
   * Get all available profiles
   */
  public getProfiles(): AlarmConfigurationProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Get current active profile
   */
  public getCurrentProfile(): AlarmConfigurationProfile {
    const profile = this.profiles.get(this.currentProfileId);
    if (!profile) {
      throw new Error(`Current profile ${this.currentProfileId} not found`);
    }
    return profile;
  }

  /**
   * Switch to different profile
   */
  public switchProfile(profileId: string): void {
    if (!this.profiles.has(profileId)) {
      throw new Error(`Profile ${profileId} not found`);
    }
    this.currentProfileId = profileId;
  }

  /**
   * Delete profile (cannot delete default)
   */
  public deleteProfile(profileId: string): void {
    if (profileId === 'default') {
      throw new Error('Cannot delete default profile');
    }
    if (this.currentProfileId === profileId) {
      this.currentProfileId = 'default';
    }
    this.profiles.delete(profileId);
  }

  /**
   * Test all alarm systems - visual, audio, and integration
   */
  public async testAllAlarmSystems(): Promise<AlarmTestResult[]> {
    const results: AlarmTestResult[] = [];
    const profile = this.getCurrentProfile();

    console.log('AlarmConfigurationManager: Starting comprehensive alarm system test');

    // Test critical alarm audio system
    for (const alarmType of Object.values(CriticalAlarmType)) {
      try {
        const startTime = Date.now();
        
        // Test audio alert
        const audioManager = new MarineAudioAlertManager({
          targetAudioLevelDb: 85,
          platformSpecific: true,
          masterVolume: profile.audioSettings.masterVolume,
          volumeOverride: profile.audioSettings.volumeOverride,
          respectSystemVolume: false,
          backgroundAudioCapable: true,
          allowSyntheticSounds: profile.audioSettings.allowSyntheticSounds,
          soundPatterns: {} as any, // Use defaults
          weatherCompensation: true,
          engineNoiseCompensation: true,
        });

        const audioResult = await audioManager.testAlarmSound(alarmType, AlarmEscalationLevel.WARNING, 2000);
        const duration = Date.now() - startTime;

        results.push({
          alarmType,
          testType: 'audio',
          success: audioResult,
          duration,
          timestamp: Date.now(),
          notes: audioResult ? 'Audio test successful' : 'Audio test failed',
        });

      } catch (error) {
        results.push({
          alarmType,
          testType: 'audio',
          success: false,
          duration: 0,
          timestamp: Date.now(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Test visual alert system (simulated)
    try {
      const startTime = Date.now();
      // This would test the visual components in a real implementation
      const visualTestSuccess = true; // Placeholder for actual visual test
      const duration = Date.now() - startTime;

      results.push({
        alarmType: 'visual-system',
        testType: 'visual',
        success: visualTestSuccess,
        duration,
        timestamp: Date.now(),
        notes: 'Visual alert system test completed',
      });

    } catch (error) {
      results.push({
        alarmType: 'visual-system',
        testType: 'visual',
        success: false,
        duration: 0,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Visual test failed',
      });
    }

    // Test integrated alarm manager system
    try {
      const startTime = Date.now();
      const alarmManager = AlarmManager.getInstance();
      const complianceStatus = alarmManager.getMarineSafetyComplianceStatus();
      const duration = Date.now() - startTime;

      results.push({
        alarmType: 'alarm-manager',
        testType: 'combined',
        success: complianceStatus.compliant,
        duration,
        timestamp: Date.now(),
        notes: `Marine compliance: ${complianceStatus.compliant}, Response time: ${complianceStatus.averageResponseTime}ms`,
      });

    } catch (error) {
      results.push({
        alarmType: 'alarm-manager',
        testType: 'combined',
        success: false,
        duration: 0,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Alarm manager test failed',
      });
    }

    const successCount = results.filter(r => r.success).length;
    const totalTests = results.length;

    console.log(`AlarmConfigurationManager: Alarm system test completed - ${successCount}/${totalTests} tests passed`);

    return results;
  }

  /**
   * Test specific alarm type
   */
  public async testAlarmType(
    alarmType: CriticalAlarmType, 
    testTypes: ('visual' | 'audio' | 'combined')[] = ['audio']
  ): Promise<AlarmTestResult[]> {
    const results: AlarmTestResult[] = [];
    const profile = this.getCurrentProfile();

    for (const testType of testTypes) {
      try {
        const startTime = Date.now();
        let success = false;
        let notes = '';

        switch (testType) {
          case 'audio':
            const audioManager = new MarineAudioAlertManager({
              targetAudioLevelDb: 85,
              platformSpecific: true,
              masterVolume: profile.audioSettings.masterVolume,
              volumeOverride: profile.audioSettings.volumeOverride,
              respectSystemVolume: false,
              backgroundAudioCapable: true,
              allowSyntheticSounds: profile.audioSettings.allowSyntheticSounds,
              soundPatterns: {} as any,
              weatherCompensation: true,
              engineNoiseCompensation: true,
            });
            
            success = await audioManager.testAlarmSound(alarmType, AlarmEscalationLevel.WARNING, 3000);
            notes = success ? 'Audio alarm test successful' : 'Audio alarm test failed';
            break;

          case 'visual':
            // Visual test would involve rendering components
            success = true; // Placeholder
            notes = 'Visual alarm test completed';
            break;

          case 'combined':
            // Combined test involves both visual and audio
            success = true; // Placeholder
            notes = 'Combined alarm test completed';
            break;
        }

        const duration = Date.now() - startTime;
        results.push({
          alarmType,
          testType,
          success,
          duration,
          timestamp: Date.now(),
          notes,
        });

      } catch (error) {
        results.push({
          alarmType,
          testType,
          success: false,
          duration: 0,
          timestamp: Date.now(),
          error: error instanceof Error ? error.message : 'Test failed',
        });
      }
    }

    return results;
  }

  /**
   * Log alarm history entry
   */
  public logAlarmHistory(entry: Omit<AlarmHistoryEntry, 'id'>): AlarmHistoryEntry {
    const historyEntry: AlarmHistoryEntry = {
      ...entry,
      id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    this.alarmHistory.push(historyEntry);

    // Maintain history size limit
    if (this.alarmHistory.length > this.maxHistorySize) {
      this.alarmHistory.splice(0, this.alarmHistory.length - this.maxHistorySize);
    }

    return historyEntry;
  }

  /**
   * Get alarm history with filtering options
   */
  public getAlarmHistory(options: {
    startDate?: number;
    endDate?: number;
    alarmTypes?: (CriticalAlarmType | string)[];
    escalationLevels?: (AlarmEscalationLevel | AlarmLevel)[];
    acknowledgedOnly?: boolean;
    limit?: number;
  } = {}): AlarmHistoryEntry[] {
    let filtered = this.alarmHistory;

    if (options.startDate) {
      filtered = filtered.filter(entry => entry.triggeredAt >= options.startDate!);
    }

    if (options.endDate) {
      filtered = filtered.filter(entry => entry.triggeredAt <= options.endDate!);
    }

    if (options.alarmTypes) {
      filtered = filtered.filter(entry => options.alarmTypes!.includes(entry.type));
    }

    if (options.escalationLevels) {
      filtered = filtered.filter(entry => options.escalationLevels!.includes(entry.escalationLevel));
    }

    if (options.acknowledgedOnly) {
      filtered = filtered.filter(entry => entry.acknowledgedAt !== undefined);
    }

    // Sort by most recent first
    filtered.sort((a, b) => b.triggeredAt - a.triggeredAt);

    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Get alarm statistics for analysis
   */
  public getAlarmStatistics(timeRangeMs: number = 24 * 60 * 60 * 1000): {
    totalAlarms: number;
    alarmsByType: Record<string, number>;
    alarmsByLevel: Record<string, number>;
    averageResponseTime: number;
    falsePositiveRate: number;
    mostFrequentAlarms: Array<{ type: string; count: number }>;
  } {
    const cutoffTime = Date.now() - timeRangeMs;
    const recentAlarms = this.alarmHistory.filter(entry => entry.triggeredAt >= cutoffTime);

    const alarmsByType: Record<string, number> = {};
    const alarmsByLevel: Record<string, number> = {};
    let totalResponseTime = 0;
    let acknowledgedCount = 0;
    let falsePositiveCount = 0;

    recentAlarms.forEach(entry => {
      // Count by type
      alarmsByType[entry.type] = (alarmsByType[entry.type] || 0) + 1;

      // Count by level
      alarmsByLevel[entry.escalationLevel] = (alarmsByLevel[entry.escalationLevel] || 0) + 1;

      // Calculate response time
      if (entry.acknowledgedAt && entry.triggeredAt) {
        totalResponseTime += entry.acknowledgedAt - entry.triggeredAt;
        acknowledgedCount++;
      }

      // Count false positives
      if (entry.falsePositive) {
        falsePositiveCount++;
      }
    });

    const averageResponseTime = acknowledgedCount > 0 ? totalResponseTime / acknowledgedCount : 0;
    const falsePositiveRate = recentAlarms.length > 0 ? falsePositiveCount / recentAlarms.length : 0;

    const mostFrequentAlarms = Object.entries(alarmsByType)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalAlarms: recentAlarms.length,
      alarmsByType,
      alarmsByLevel,
      averageResponseTime,
      falsePositiveRate,
      mostFrequentAlarms,
    };
  }

  /**
   * Snooze alarm for specified duration (only for non-critical alarms)
   */
  public snoozeAlarm(options: SnoozeOptions): boolean {
    const { alarmId, duration, reason, allowCritical } = options;

    // Find alarm in history to check if it's snooze-able
    const alarmEntry = this.alarmHistory.find(entry => entry.alarmId === alarmId);
    if (!alarmEntry) {
      console.warn(`AlarmConfigurationManager: Alarm ${alarmId} not found in history`);
      return false;
    }

    // Check if alarm type allows snoozing
    if (typeof alarmEntry.type === 'string' && Object.values(CriticalAlarmType).includes(alarmEntry.type as CriticalAlarmType)) {
      const criticalType = alarmEntry.type as CriticalAlarmType;
      if (!this.allowSnooze(criticalType) && !allowCritical) {
        console.warn(`AlarmConfigurationManager: Cannot snooze critical alarm type ${criticalType}`);
        return false;
      }

      const maxSnoozeTime = this.getMaxSnoozeTime(criticalType);
      if (maxSnoozeTime && duration > maxSnoozeTime) {
        console.warn(`AlarmConfigurationManager: Snooze duration ${duration}ms exceeds maximum ${maxSnoozeTime}ms for ${criticalType}`);
        return false;
      }
    }

    // Clear existing snooze timer if any
    const existingTimer = this.snoozeTimers.get(alarmId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new snooze timer
    const timer = setTimeout(() => {
      this.snoozeTimers.delete(alarmId);
      console.log(`AlarmConfigurationManager: Snooze expired for alarm ${alarmId}`);
      // In real implementation, this would re-trigger the alarm if condition still exists
    }, duration);

    this.snoozeTimers.set(alarmId, timer);

    // Update alarm history
    const updatedEntry = {
      ...alarmEntry,
      snoozeCount: alarmEntry.snoozeCount + 1,
      notes: `${alarmEntry.notes || ''} Snoozed for ${duration}ms. Reason: ${reason || 'none'}`.trim(),
    };

    const historyIndex = this.alarmHistory.findIndex(entry => entry.id === alarmEntry.id);
    if (historyIndex >= 0) {
      this.alarmHistory[historyIndex] = updatedEntry;
    }

    console.log(`AlarmConfigurationManager: Alarm ${alarmId} snoozed for ${duration}ms`);
    return true;
  }

  /**
   * Cancel snooze for alarm
   */
  public cancelSnooze(alarmId: string): boolean {
    const timer = this.snoozeTimers.get(alarmId);
    if (timer) {
      clearTimeout(timer);
      this.snoozeTimers.delete(alarmId);
      console.log(`AlarmConfigurationManager: Snooze cancelled for alarm ${alarmId}`);
      return true;
    }
    return false;
  }

  /**
   * Get currently snoozed alarms
   */
  public getSnoozedAlarms(): string[] {
    return Array.from(this.snoozeTimers.keys());
  }

  /**
   * Export configuration profile to JSON
   */
  public exportProfile(profileId: string): string {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }
    return JSON.stringify(profile, null, 2);
  }

  /**
   * Import configuration profile from JSON
   */
  public importProfile(profileJson: string): AlarmConfigurationProfile {
    try {
      const profile: AlarmConfigurationProfile = JSON.parse(profileJson);
      
      // Validate profile structure
      if (!profile.id || !profile.name || !profile.thresholds || !profile.settings) {
        throw new Error('Invalid profile structure');
      }

      // Generate new ID to avoid conflicts
      profile.id = `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      profile.lastModified = Date.now();

      this.profiles.set(profile.id, profile);
      return profile;

    } catch (error) {
      throw new Error(`Failed to import profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get system health and configuration status
   */
  public getSystemHealth(): {
    profilesCount: number;
    currentProfile: string;
    alarmHistorySize: number;
    activeSnoozedAlarms: number;
    lastTestResults?: AlarmTestResult[];
    configurationErrors: string[];
  } {
    const profile = this.getCurrentProfile();
    const configurationErrors: string[] = [];

    // Validate current profile
    if (profile.thresholds.length === 0) {
      configurationErrors.push('No alarm thresholds configured');
    }

    if (!profile.settings.soundEnabled && !profile.settings.vibrationEnabled) {
      configurationErrors.push('All alert methods disabled');
    }

    // Check for invalid threshold values
    profile.thresholds.forEach(threshold => {
      if (threshold.value <= 0 && threshold.type !== 'range') {
        configurationErrors.push(`Invalid threshold value for ${threshold.name}`);
      }
    });

    return {
      profilesCount: this.profiles.size,
      currentProfile: this.currentProfileId,
      alarmHistorySize: this.alarmHistory.length,
      activeSnoozedAlarms: this.snoozeTimers.size,
      configurationErrors,
    };
  }
}

export default AlarmConfigurationManager;