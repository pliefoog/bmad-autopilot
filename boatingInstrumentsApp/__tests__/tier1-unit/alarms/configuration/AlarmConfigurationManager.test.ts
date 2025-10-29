/**
 * Alarm Configuration Manager Tests - Task 5
 * Tests for user-configurable thresholds, alarm testing, history, and snooze functionality
 */

import AlarmConfigurationManager from '../../../src/services/alarms/AlarmConfigurationManager';
import { CriticalAlarmType, AlarmEscalationLevel } from '../../../src/services/alarms/types';
import { AlarmLevel } from '../../../src/store/alarmStore';

// Mock dependencies
jest.mock('../../../src/services/alarms/AlarmManager');
jest.mock('../../../src/services/alarms/MarineAudioAlertManager');

// Mock AlarmManager
const mockAlarmManager = {
  getInstance: jest.fn().mockReturnValue({
    getMarineSafetyComplianceStatus: jest.fn().mockReturnValue({
      compliant: true,
      averageResponseTime: 450,
      falsePositiveRate: 0.005,
      falseNegativeRate: 0.001,
      issues: [],
    }),
  }),
};

// Mock MarineAudioAlertManager
const mockAudioManager = {
  testAlarmSound: jest.fn().mockResolvedValue(true),
};

jest.mock('../../../src/services/alarms/AlarmManager', () => ({
  AlarmManager: mockAlarmManager,
}));

jest.mock('../../../src/services/alarms/MarineAudioAlertManager', () => ({
  MarineAudioAlertManager: jest.fn().mockImplementation(() => mockAudioManager),
}));

describe('Alarm Configuration Manager - Task 5', () => {
  let configManager: AlarmConfigurationManager;

  beforeEach(() => {
    jest.clearAllMocks();
    configManager = new AlarmConfigurationManager();
  });

  describe('User-Configurable Threshold System', () => {
    it('should initialize with default marine safety thresholds', () => {
      const defaultProfile = configManager.getCurrentProfile();
      
      expect(defaultProfile.name).toBe('Marine Safety Standard');
      expect(defaultProfile.thresholds.length).toBeGreaterThan(0);
      
      // Check for critical marine safety thresholds
      const shallowWaterThreshold = defaultProfile.thresholds.find(t => 
        t.id === 'shallow-water-critical'
      );
      expect(shallowWaterThreshold).toBeDefined();
      expect(shallowWaterThreshold?.value).toBe(1.5); // 1.5m critical depth
      expect(shallowWaterThreshold?.level).toBe('critical');
    });

    it('should create new configuration profile based on existing profile', () => {
      const newProfile = configManager.createProfile(
        'Custom Profile',
        'Test configuration for specific vessel',
        'default'
      );
      
      expect(newProfile.name).toBe('Custom Profile');
      expect(newProfile.id).not.toBe('default');
      expect(newProfile.thresholds.length).toBeGreaterThan(0);
      
      const profiles = configManager.getProfiles();
      expect(profiles.length).toBe(2); // default + new
    });

    it('should update profile thresholds and settings', () => {
      const profile = configManager.getCurrentProfile();
      const originalThresholdCount = profile.thresholds.length;
      
      configManager.updateProfile('default', {
        thresholds: [
          ...profile.thresholds,
          {
            id: 'custom-wind-warning',
            name: 'Custom Wind Warning',
            dataPath: 'environment.windSpeed',
            type: 'max',
            value: 30,
            level: 'warning' as AlarmLevel,
            enabled: true,
            hysteresis: 2,
          },
        ],
      });
      
      const updatedProfile = configManager.getCurrentProfile();
      expect(updatedProfile.thresholds.length).toBe(originalThresholdCount + 1);
      
      const customThreshold = updatedProfile.thresholds.find(t => 
        t.id === 'custom-wind-warning'
      );
      expect(customThreshold).toBeDefined();
      expect(customThreshold?.value).toBe(30);
    });

    it('should switch between profiles', () => {
      const customProfile = configManager.createProfile('Test Profile', 'Test');
      
      expect(configManager.getCurrentProfile().id).toBe('default');
      
      configManager.switchProfile(customProfile.id);
      expect(configManager.getCurrentProfile().id).toBe(customProfile.id);
      
      configManager.switchProfile('default');
      expect(configManager.getCurrentProfile().id).toBe('default');
    });

    it('should delete non-default profiles', () => {
      const customProfile = configManager.createProfile('Deletable Profile', 'Test');
      expect(configManager.getProfiles().length).toBe(2);
      
      configManager.deleteProfile(customProfile.id);
      expect(configManager.getProfiles().length).toBe(1);
      
      // Should not be able to delete default profile
      expect(() => configManager.deleteProfile('default')).toThrow();
    });
  });

  describe('Alarm Enable/Disable Controls', () => {
    it('should allow enabling/disabling individual alarm types in profile', () => {
      const profile = configManager.getCurrentProfile();
      
      // Find a threshold to disable
      const engineTempThreshold = profile.thresholds.find(t => 
        t.id === 'engine-temp-critical'
      );
      expect(engineTempThreshold).toBeDefined();
      expect(engineTempThreshold?.enabled).toBe(true);
      
      // Update to disable
      configManager.updateProfile('default', {
        thresholds: profile.thresholds.map(t => 
          t.id === 'engine-temp-critical' ? { ...t, enabled: false } : t
        ),
      });
      
      const updatedProfile = configManager.getCurrentProfile();
      const disabledThreshold = updatedProfile.thresholds.find(t => 
        t.id === 'engine-temp-critical'
      );
      expect(disabledThreshold?.enabled).toBe(false);
    });

    it('should configure sound and vibration enable/disable', () => {
      const profile = configManager.getCurrentProfile();
      expect(profile.settings.soundEnabled).toBe(true);
      expect(profile.settings.vibrationEnabled).toBe(true);
      
      configManager.updateProfile('default', {
        settings: {
          ...profile.settings,
          soundEnabled: false,
          vibrationEnabled: false,
        },
      });
      
      const updatedProfile = configManager.getCurrentProfile();
      expect(updatedProfile.settings.soundEnabled).toBe(false);
      expect(updatedProfile.settings.vibrationEnabled).toBe(false);
    });

    it('should configure level muting settings', () => {
      const profile = configManager.getCurrentProfile();
      
      configManager.updateProfile('default', {
        settings: {
          ...profile.settings,
          levelMuting: {
            info: true,
            warning: false,
            critical: false, // Should never mute critical
          },
        },
      });
      
      const updatedProfile = configManager.getCurrentProfile();
      expect(updatedProfile.settings.levelMuting.info).toBe(true);
      expect(updatedProfile.settings.levelMuting.warning).toBe(false);
      expect(updatedProfile.settings.levelMuting.critical).toBe(false);
    });
  });

  describe('Alarm Test Function', () => {
    it('should test all alarm systems comprehensively', async () => {
      const testResults = await configManager.testAllAlarmSystems();
      
      expect(testResults.length).toBeGreaterThan(0);
      
      // Should test all critical alarm types
      const criticalAlarmTests = testResults.filter(r => 
        Object.values(CriticalAlarmType).includes(r.alarmType as CriticalAlarmType)
      );
      expect(criticalAlarmTests.length).toBe(Object.values(CriticalAlarmType).length);
      
      // Should test visual and alarm manager systems
      const visualTest = testResults.find(r => r.alarmType === 'visual-system');
      const managerTest = testResults.find(r => r.alarmType === 'alarm-manager');
      
      expect(visualTest).toBeDefined();
      expect(managerTest).toBeDefined();
      
      // Check that all tests have required properties
      testResults.forEach(result => {
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('duration');
        expect(result).toHaveProperty('timestamp');
        expect(typeof result.success).toBe('boolean');
        expect(typeof result.duration).toBe('number');
      });
    });

    it('should test specific alarm type with different test modes', async () => {
      const audioResults = await configManager.testAlarmType(
        CriticalAlarmType.SHALLOW_WATER,
        ['audio']
      );
      
      expect(audioResults.length).toBe(1);
      expect(audioResults[0].alarmType).toBe(CriticalAlarmType.SHALLOW_WATER);
      expect(audioResults[0].testType).toBe('audio');
      expect(mockAudioManager.testAlarmSound).toHaveBeenCalledWith(
        CriticalAlarmType.SHALLOW_WATER,
        AlarmEscalationLevel.WARNING,
        3000
      );
    });

    it('should handle test failures gracefully', async () => {
      // Mock a test failure
      mockAudioManager.testAlarmSound.mockRejectedValueOnce(new Error('Audio test failed'));
      
      const results = await configManager.testAlarmType(
        CriticalAlarmType.ENGINE_OVERHEAT,
        ['audio']
      );
      
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Audio test failed');
    });
  });

  describe('Alarm History Logging', () => {
    it('should log alarm history entries', () => {
      const historyEntry = configManager.logAlarmHistory({
        alarmId: 'test-alarm-1',
        type: CriticalAlarmType.SHALLOW_WATER,
        escalationLevel: AlarmEscalationLevel.WARNING,
        message: 'Test shallow water alarm',
        value: 1.2,
        threshold: 1.5,
        source: 'depth-sensor',
        triggeredAt: Date.now(),
        snoozeCount: 0,
      });
      
      expect(historyEntry.id).toBeDefined();
      expect(historyEntry.alarmId).toBe('test-alarm-1');
      expect(historyEntry.type).toBe(CriticalAlarmType.SHALLOW_WATER);
    });

    it('should retrieve alarm history with filtering', () => {
      const now = Date.now();
      
      // Log multiple history entries
      configManager.logAlarmHistory({
        alarmId: 'alarm-1',
        type: CriticalAlarmType.SHALLOW_WATER,
        escalationLevel: AlarmEscalationLevel.WARNING,
        message: 'Shallow water warning',
        source: 'test',
        triggeredAt: now - 1000,
        snoozeCount: 0,
      });
      
      configManager.logAlarmHistory({
        alarmId: 'alarm-2',
        type: CriticalAlarmType.ENGINE_OVERHEAT,
        escalationLevel: AlarmEscalationLevel.CRITICAL,
        message: 'Engine overheat critical',
        source: 'test',
        triggeredAt: now - 500,
        acknowledgedAt: now - 400,
        snoozeCount: 0,
      });
      
      // Test filtering by alarm type
      const shallowWaterHistory = configManager.getAlarmHistory({
        alarmTypes: [CriticalAlarmType.SHALLOW_WATER],
      });
      expect(shallowWaterHistory.length).toBe(1);
      expect(shallowWaterHistory[0].type).toBe(CriticalAlarmType.SHALLOW_WATER);
      
      // Test filtering by escalation level
      const criticalHistory = configManager.getAlarmHistory({
        escalationLevels: [AlarmEscalationLevel.CRITICAL],
      });
      expect(criticalHistory.length).toBe(1);
      expect(criticalHistory[0].escalationLevel).toBe(AlarmEscalationLevel.CRITICAL);
      
      // Test filtering by acknowledged status
      const acknowledgedHistory = configManager.getAlarmHistory({
        acknowledgedOnly: true,
      });
      expect(acknowledgedHistory.length).toBe(1);
      expect(acknowledgedHistory[0].acknowledgedAt).toBeDefined();
    });

    it('should calculate alarm statistics', () => {
      const now = Date.now();
      
      // Add test data
      for (let i = 0; i < 5; i++) {
        configManager.logAlarmHistory({
          alarmId: `test-alarm-${i}`,
          type: CriticalAlarmType.SHALLOW_WATER,
          escalationLevel: AlarmEscalationLevel.WARNING,
          message: 'Test alarm',
          source: 'test',
          triggeredAt: now - (i * 1000),
          acknowledgedAt: now - (i * 1000) + 500, // 500ms response time
          snoozeCount: 0,
          falsePositive: i === 4, // Last one is false positive
        });
      }
      
      const stats = configManager.getAlarmStatistics(60000); // Last minute
      
      expect(stats.totalAlarms).toBe(5);
      expect(stats.alarmsByType[CriticalAlarmType.SHALLOW_WATER]).toBe(5);
      expect(stats.alarmsByLevel[AlarmEscalationLevel.WARNING]).toBe(5);
      expect(stats.averageResponseTime).toBe(500);
      expect(stats.falsePositiveRate).toBe(0.2); // 1/5 = 20%
      expect(stats.mostFrequentAlarms[0].type).toBe(CriticalAlarmType.SHALLOW_WATER);
      expect(stats.mostFrequentAlarms[0].count).toBe(5);
    });
  });

  describe('Snooze Functionality', () => {
    beforeEach(() => {
      // Add a battery alarm (which allows snoozing) to history
      configManager.logAlarmHistory({
        alarmId: 'battery-alarm-1',
        type: CriticalAlarmType.LOW_BATTERY,
        escalationLevel: AlarmEscalationLevel.WARNING,
        message: 'Low battery voltage',
        source: 'battery-monitor',
        triggeredAt: Date.now(),
        snoozeCount: 0,
      });
    });

    it('should snooze appropriate alarms', () => {
      const result = configManager.snoozeAlarm({
        alarmId: 'battery-alarm-1',
        duration: 5 * 60 * 1000, // 5 minutes
        reason: 'Known issue, checking in 5 minutes',
        allowCritical: false,
      });
      
      expect(result).toBe(true);
      
      const snoozedAlarms = configManager.getSnoozedAlarms();
      expect(snoozedAlarms).toContain('battery-alarm-1');
    });

    it('should prevent snoozing safety-critical alarms', () => {
      // Add a critical navigation alarm
      configManager.logAlarmHistory({
        alarmId: 'shallow-water-critical',
        type: CriticalAlarmType.SHALLOW_WATER,
        escalationLevel: AlarmEscalationLevel.CRITICAL,
        message: 'Critical shallow water',
        source: 'depth-sensor',
        triggeredAt: Date.now(),
        snoozeCount: 0,
      });
      
      const result = configManager.snoozeAlarm({
        alarmId: 'shallow-water-critical',
        duration: 5 * 60 * 1000,
        reason: 'Test snooze',
        allowCritical: false,
      });
      
      expect(result).toBe(false);
    });

    it('should respect maximum snooze time limits', () => {
      const result = configManager.snoozeAlarm({
        alarmId: 'battery-alarm-1',
        duration: 30 * 60 * 1000, // 30 minutes (exceeds 15 minute limit)
        reason: 'Long snooze test',
        allowCritical: false,
      });
      
      expect(result).toBe(false);
    });

    it('should cancel snooze', () => {
      // First snooze the alarm
      configManager.snoozeAlarm({
        alarmId: 'battery-alarm-1',
        duration: 5 * 60 * 1000,
        reason: 'Test snooze',
        allowCritical: false,
      });
      
      expect(configManager.getSnoozedAlarms()).toContain('battery-alarm-1');
      
      // Cancel the snooze
      const cancelled = configManager.cancelSnooze('battery-alarm-1');
      expect(cancelled).toBe(true);
      expect(configManager.getSnoozedAlarms()).not.toContain('battery-alarm-1');
    });

    it('should track snooze count in history', () => {
      configManager.snoozeAlarm({
        alarmId: 'battery-alarm-1',
        duration: 1000,
        reason: 'Test snooze',
        allowCritical: false,
      });
      
      const history = configManager.getAlarmHistory();
      const snoozedEntry = history.find(entry => entry.alarmId === 'battery-alarm-1');
      
      expect(snoozedEntry?.snoozeCount).toBe(1);
      expect(snoozedEntry?.notes).toContain('Snoozed for 1000ms');
    });
  });

  describe('Profile Import/Export', () => {
    it('should export profile to JSON', () => {
      const profile = configManager.getCurrentProfile();
      const exportedJson = configManager.exportProfile('default');
      
      const parsed = JSON.parse(exportedJson);
      expect(parsed.id).toBe(profile.id);
      expect(parsed.name).toBe(profile.name);
      expect(parsed.thresholds).toEqual(profile.thresholds);
    });

    it('should import profile from JSON', () => {
      const originalProfile = configManager.getCurrentProfile();
      const exportedJson = configManager.exportProfile('default');
      
      // Modify the exported profile
      const profileData = JSON.parse(exportedJson);
      profileData.name = 'Imported Profile';
      profileData.description = 'Imported for testing';
      
      const importedProfile = configManager.importProfile(JSON.stringify(profileData));
      
      expect(importedProfile.name).toBe('Imported Profile');
      expect(importedProfile.id).not.toBe(originalProfile.id);
      expect(configManager.getProfiles().length).toBe(2);
    });

    it('should validate imported profile structure', () => {
      const invalidJson = JSON.stringify({ name: 'Invalid' }); // Missing required fields
      
      expect(() => configManager.importProfile(invalidJson)).toThrow('Invalid profile structure');
    });
  });

  describe('System Health Monitoring', () => {
    it('should report system health status', () => {
      const health = configManager.getSystemHealth();
      
      expect(health.profilesCount).toBe(1); // Default profile
      expect(health.currentProfile).toBe('default');
      expect(health.alarmHistorySize).toBeGreaterThanOrEqual(0);
      expect(health.activeSnoozedAlarms).toBe(0);
      expect(Array.isArray(health.configurationErrors)).toBe(true);
    });

    it('should detect configuration errors', () => {
      // Create a profile with no thresholds
      configManager.updateProfile('default', {
        thresholds: [],
      });
      
      const health = configManager.getSystemHealth();
      expect(health.configurationErrors).toContain('No alarm thresholds configured');
    });

    it('should detect disabled alert methods', () => {
      const profile = configManager.getCurrentProfile();
      
      configManager.updateProfile('default', {
        settings: {
          ...profile.settings,
          soundEnabled: false,
          vibrationEnabled: false,
        },
      });
      
      const health = configManager.getSystemHealth();
      expect(health.configurationErrors).toContain('All alert methods disabled');
    });
  });
});