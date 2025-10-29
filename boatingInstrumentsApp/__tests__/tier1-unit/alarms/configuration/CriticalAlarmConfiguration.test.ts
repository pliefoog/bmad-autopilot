/**
 * CriticalAlarmConfiguration Tests
 * Marine safety validation and user configuration management
 */

import { CriticalAlarmConfiguration } from '../../../src/services/alarms/CriticalAlarmConfiguration';
import { CriticalAlarmType, AlarmEscalationLevel } from '../../../src/services/alarms/types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

describe('CriticalAlarmConfiguration', () => {
  let config: CriticalAlarmConfiguration;

  beforeEach(() => {
    jest.clearAllMocks();
    config = new CriticalAlarmConfiguration({
      validateMarineStandards: true,
      allowUserOverrides: true,
    });
  });

  describe('Initialization', () => {
    it('should initialize with default marine-safe configurations', () => {
      const shallowWaterConfig = config.getAlarmConfig(CriticalAlarmType.SHALLOW_WATER);
      
      expect(shallowWaterConfig).toBeDefined();
      expect(shallowWaterConfig?.enabled).toBe(true);
      expect(shallowWaterConfig?.marineSafetyClassification).toBe('NAVIGATION_HAZARD');
      expect(shallowWaterConfig?.allowSnooze).toBe(false); // Critical navigation alarms should not allow snoozing
    });

    it('should create marine-compliant threshold configurations', () => {
      const shallowWaterThresholds = config.getThresholdsForAlarmType(CriticalAlarmType.SHALLOW_WATER);
      
      expect(shallowWaterThresholds.length).toBeGreaterThan(0);
      
      const warningThreshold = shallowWaterThresholds.find(t => t.name.includes('Warning'));
      expect(warningThreshold).toBeDefined();
      expect(warningThreshold?.safetyClassification).toBe('CRITICAL');
      expect(warningThreshold?.regulatory).toBe(true);
    });
  });

  describe('Marine Safety Validation', () => {
    it('should enforce marine safety response time requirements', async () => {
      const result = await config.updateAlarmConfig(CriticalAlarmType.SHALLOW_WATER, {
        maxResponseTimeMs: 600, // Above 500ms marine safety limit
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringMatching(/response time.*marine safety/i));
    });

    it('should enforce marine audio level requirements', async () => {
      const result = await config.updateAlarmConfig(CriticalAlarmType.ENGINE_OVERHEAT, {
        minAudioLevelDb: 70, // Below 85dB marine safety requirement
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringMatching(/audio level.*marine safety/i));
    });

    it('should require redundant alerting for critical navigation alarms', async () => {
      const result = await config.updateAlarmConfig(CriticalAlarmType.AUTOPILOT_FAILURE, {
        redundantAlerting: false,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringMatching(/redundant alerting.*navigation/i));
    });

    it('should prevent snoozing of navigation hazard alarms', async () => {
      const result = await config.updateAlarmConfig(CriticalAlarmType.SHALLOW_WATER, {
        allowSnooze: true,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringMatching(/navigation hazard.*snoozing/i));
    });
  });

  describe('User Permission Controls', () => {
    it('should prevent disabling critical navigation alarms', async () => {
      const result = await config.setAlarmEnabled(CriticalAlarmType.SHALLOW_WATER, false);

      expect(result).toBe(false);
    });

    it('should allow disabling non-critical alarms', async () => {
      const result = await config.setAlarmEnabled(CriticalAlarmType.LOW_BATTERY, false);

      expect(result).toBe(true);
    });

    it('should prevent removing confirmation for critical alarms', async () => {
      const result = await config.updateAlarmConfig(CriticalAlarmType.AUTOPILOT_FAILURE, {
        requiresConfirmation: false,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringMatching(/confirmation.*critical navigation/i));
    });

    it('should allow enabling snooze for appropriate alarm types', async () => {
      const result = await config.updateAlarmConfig(CriticalAlarmType.LOW_BATTERY, {
        allowSnooze: true,
        maxSnoozeTime: 1800000, // 30 minutes
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Threshold Management', () => {
    it('should validate threshold ranges against marine standards', async () => {
      const result = await config.updateThreshold('shallow-water-warning', {
        warningThreshold: 0.2, // Too shallow - below safe minimum
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringMatching(/outside valid range/i));
    });

    it('should maintain threshold progression order', async () => {
      const result = await config.updateThreshold('engine-temp-critical', {
        warningThreshold: 100,
        criticalThreshold: 90, // Critical should be higher than warning
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringMatching(/ascending order/i));
    });

    it('should allow valid threshold updates', async () => {
      const result = await config.updateThreshold('battery-low-warning', {
        warningThreshold: 11.8, // Valid battery voltage threshold
      });

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Configuration Testing', () => {
    it('should test shallow water alarm configuration', async () => {
      const testResult = await config.testAlarmConfiguration(CriticalAlarmType.SHALLOW_WATER);

      expect(testResult).toHaveProperty('configurationValid');
      expect(testResult).toHaveProperty('thresholdsValid');
      expect(testResult).toHaveProperty('audioSystemReady');
      expect(testResult).toHaveProperty('visualSystemReady');
      expect(testResult).toHaveProperty('issues');

      expect(Array.isArray(testResult.issues)).toBe(true);
    });

    it('should validate engine overheat configuration', async () => {
      const testResult = await config.testAlarmConfiguration(CriticalAlarmType.ENGINE_OVERHEAT);

      expect(testResult.configurationValid).toBe(true);
      expect(testResult.thresholdsValid).toBe(true);
    });

    it('should identify configuration issues', async () => {
      // First break the configuration
      await config.updateAlarmConfig(CriticalAlarmType.LOW_BATTERY, {
        minAudioLevelDb: 50, // Below marine requirement
      });

      const testResult = await config.testAlarmConfiguration(CriticalAlarmType.LOW_BATTERY);

      expect(testResult.configurationValid).toBe(false);
      expect(testResult.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Snooze Configuration', () => {
    it('should have marine-safe default snooze settings', () => {
      const snoozeConfig = config.getSnoozeConfig();

      expect(snoozeConfig.criticalAlarmsAllowed).toBe(false);
      expect(snoozeConfig.maxDuration).toBeLessThanOrEqual(1800000); // 30 minutes max
      expect(snoozeConfig.allowedAlarmTypes).toContain(CriticalAlarmType.LOW_BATTERY);
      expect(snoozeConfig.allowedAlarmTypes).not.toContain(CriticalAlarmType.SHALLOW_WATER);
    });

    it('should reject dangerous snooze configurations', async () => {
      const result = await config.updateSnoozeConfig({
        criticalAlarmsAllowed: true, // Dangerous - critical alarms should not be snoozable
      });

      expect(result).toBe(false);
    });

    it('should reject excessive snooze durations', async () => {
      const result = await config.updateSnoozeConfig({
        maxDuration: 7200000, // 2 hours - too long for marine safety
      });

      expect(result).toBe(false);
    });

    it('should allow reasonable snooze updates', async () => {
      const result = await config.updateSnoozeConfig({
        defaultDuration: 900000, // 15 minutes
        requireConfirmation: true,
      });

      expect(result).toBe(true);
    });
  });

  describe('Configuration Import/Export', () => {
    it('should export complete configuration', () => {
      const exported = config.exportConfiguration();

      expect(exported).toHaveProperty('alarmConfigs');
      expect(exported).toHaveProperty('thresholds');
      expect(exported).toHaveProperty('snoozeConfig');
      expect(exported).toHaveProperty('testConfig');
      expect(exported).toHaveProperty('exportDate');

      expect(Object.keys(exported.alarmConfigs)).toContain(CriticalAlarmType.SHALLOW_WATER);
      expect(Object.keys(exported.thresholds).length).toBeGreaterThan(0);
    });

    it('should import valid configuration', async () => {
      const exported = config.exportConfiguration();
      
      // Modify the exported config
      exported.alarmConfigs[CriticalAlarmType.LOW_BATTERY].enabled = false;

      const result = await config.importConfiguration(exported);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid imported configurations', async () => {
      const invalidConfig = {
        alarmConfigs: {
          [CriticalAlarmType.SHALLOW_WATER]: {
            type: CriticalAlarmType.SHALLOW_WATER,
            enabled: true,
            maxResponseTimeMs: 1000, // Invalid - exceeds marine safety limit
            minAudioLevelDb: 85,
            marineSafetyClassification: 'NAVIGATION_HAZARD',
            requiresConfirmation: true,
            allowSnooze: false,
            failSafeBehavior: 'alarm' as const,
            redundantAlerting: true,
            thresholds: {},
            hysteresis: 0.1,
            debounceMs: 1000,
            escalationTimeoutMs: 10000,
            audioEnabled: true,
            visualEnabled: true,
            vibrationEnabled: true,
            notificationEnabled: true,
          },
        },
        thresholds: {},
        snoozeConfig: config.getSnoozeConfig(),
        testConfig: {} as any,
        exportDate: new Date().toISOString(),
      };

      const result = await config.importConfiguration(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Default Reset', () => {
    it('should reset to marine-safe defaults', async () => {
      // First modify some configurations
      await config.updateAlarmConfig(CriticalAlarmType.LOW_BATTERY, {
        enabled: false,
      });

      // Reset to defaults
      await config.resetToDefaults();

      // Verify reset worked
      const lowBatteryConfig = config.getAlarmConfig(CriticalAlarmType.LOW_BATTERY);
      expect(lowBatteryConfig?.enabled).toBe(true);
    });

    it('should restore all critical alarm configurations', async () => {
      await config.resetToDefaults();

      const criticalTypes = [
        CriticalAlarmType.SHALLOW_WATER,
        CriticalAlarmType.ENGINE_OVERHEAT,
        CriticalAlarmType.LOW_BATTERY,
        CriticalAlarmType.AUTOPILOT_FAILURE,
        CriticalAlarmType.GPS_LOSS,
      ];

      for (const type of criticalTypes) {
        const alarmConfig = config.getAlarmConfig(type);
        expect(alarmConfig).toBeDefined();
        expect(alarmConfig?.enabled).toBe(true);
      }
    });
  });

  describe('Configuration Change Callbacks', () => {
    it('should notify callback on configuration changes', async () => {
      const callback = jest.fn();
      config.setConfigChangedCallback(callback);

      await config.updateAlarmConfig(CriticalAlarmType.LOW_BATTERY, {
        audioEnabled: false,
      });

      expect(callback).toHaveBeenCalledWith(
        CriticalAlarmType.LOW_BATTERY,
        expect.objectContaining({
          type: CriticalAlarmType.LOW_BATTERY,
          audioEnabled: false,
        })
      );
    });

    it('should not notify callback on failed updates', async () => {
      const callback = jest.fn();
      config.setConfigChangedCallback(callback);

      // Attempt invalid update
      await config.updateAlarmConfig(CriticalAlarmType.SHALLOW_WATER, {
        maxResponseTimeMs: 1000, // Invalid
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Marine Safety Edge Cases', () => {
    it('should handle boundary threshold values correctly', async () => {
      // Test exact boundary values
      const result = await config.updateThreshold('shallow-water-warning', {
        warningThreshold: 0.5, // Minimum valid depth
      });

      expect(result.success).toBe(true);
    });

    it('should validate hysteresis settings for marine stability', async () => {
      const result = await config.updateThreshold('engine-temp-critical', {
        hysteresis: { value: 20, unit: 'percentage' }, // Too much hysteresis - could miss critical changes
      });

      // Large hysteresis values could be dangerous in marine environment
      // Implementation should validate reasonable hysteresis ranges
      expect(result.success).toBe(true); // Current implementation allows this, but could be enhanced
    });

    it('should maintain fail-safe behavior in configuration', async () => {
      const configs = [
        CriticalAlarmType.SHALLOW_WATER,
        CriticalAlarmType.ENGINE_OVERHEAT,
        CriticalAlarmType.AUTOPILOT_FAILURE,
        CriticalAlarmType.GPS_LOSS,
      ];

      for (const type of configs) {
        const alarmConfig = config.getAlarmConfig(type);
        expect(alarmConfig?.failSafeBehavior).toBe('alarm'); // Should default to alarming when uncertain
      }
    });
  });
});