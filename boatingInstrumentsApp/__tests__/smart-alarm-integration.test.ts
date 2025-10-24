/**
 * Basic Smart Alarm System Integration Test
 * Quick validation that the smart alarm system components are functional
 */

import { AlarmGroupingEngine } from '../AlarmGroupingEngine';
import { VesselContextDetector } from '../VesselContextDetector';
import { AdaptiveLearningEngine } from '../AdaptiveLearningEngine';
import { MaintenanceScheduler } from '../MaintenanceScheduler';
import { SmartAlarmManager } from '../SmartAlarmManager';
import { Alarm } from '../../../store/alarmStore';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

// Mock alarm store
jest.mock('../../../stores/alarmStore', () => ({
  useAlarmStore: {
    getState: () => ({
      activeAlarms: [],
      alarmHistory: [],
      thresholds: [],
      settings: {
        soundEnabled: true,
        vibrationEnabled: true,
        autoAcknowledge: false,
        autoAcknowledgeTime: 30000,
        levelMuting: { info: false, warning: false, critical: false },
      },
    }),
    subscribe: jest.fn(),
  },
}));

describe('Smart Alarm System Integration', () => {
  describe('AlarmGroupingEngine', () => {
    it('should initialize and process alarms', () => {
      const groupingEngine = new AlarmGroupingEngine();
      
      const testAlarms: Alarm[] = [
        {
          id: 'test-1',
          message: 'Engine temperature high',
          level: 'warning',
          timestamp: Date.now(),
          source: 'engine_temperature',
        },
      ];
      
      const groups = groupingEngine.processAlarms(testAlarms);
      expect(Array.isArray(groups)).toBe(true);
    });
  });
  
  describe('VesselContextDetector', () => {
    it('should initialize and detect context', () => {
      const contextDetector = new VesselContextDetector();
      
      const context = contextDetector.updateWithNmeaData({
        speed: 5.0,
        engineRunning: true,
      });
      
      expect(context).toBeDefined();
      expect(context.state).toBeDefined();
      expect(context.confidence).toBeGreaterThanOrEqual(0);
      
      if (contextDetector.cleanup) {
        contextDetector.cleanup();
      }
    });
  });
  
  describe('AdaptiveLearningEngine', () => {
    it('should initialize and handle learning operations', () => {
      const learningEngine = new AdaptiveLearningEngine();
      
      const stats = learningEngine.getLearningStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalInteractions).toBe('number');
      
      learningEngine.cleanup();
    });
  });
  
  describe('MaintenanceScheduler', () => {
    it('should initialize and handle maintenance operations', () => {
      const maintenanceScheduler = new MaintenanceScheduler();
      
      const stats = maintenanceScheduler.getMaintenanceStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalItems).toBe('number');
      
      maintenanceScheduler.cleanup();
    });
  });
  
  describe('SmartAlarmManager', () => {
    it('should initialize and process alarms', async () => {
      const smartManager = new SmartAlarmManager({
        debugLogging: false,
        criticalAlarmBypass: true,
      });
      
      const testAlarm: Alarm = {
        id: 'smart-test-1',
        message: 'Test alarm for smart processing',
        level: 'warning',
        timestamp: Date.now(),
        source: 'test_source',
      };
      
      const processed = await smartManager.processAlarm(testAlarm);
      
      expect(processed).toBeDefined();
      expect(processed.id).toBe(testAlarm.id);
      expect(processed.smartFeaturesApplied).toBeDefined();
      expect(Array.isArray(processed.smartFeaturesApplied)).toBe(true);
      
      const stats = smartManager.getStatistics();
      expect(stats).toBeDefined();
      expect(stats.totalAlarms).toBeGreaterThan(0);
      
      smartManager.cleanup();
    });
    
    it('should handle critical alarms with bypass', async () => {
      const smartManager = new SmartAlarmManager({
        criticalAlarmBypass: true,
        maxResponseTime: 500,
      });
      
      const criticalAlarm: Alarm = {
        id: 'critical-test-1',
        message: 'Critical system failure',
        level: 'critical',
        timestamp: Date.now(),
        source: 'critical_system',
      };
      
      const startTime = performance.now();
      const processed = await smartManager.processAlarm(criticalAlarm);
      const processingTime = performance.now() - startTime;
      
      expect(processed.level).toBe('critical');
      expect(processed.smartSuppressed).toBe(false);
      expect(processingTime).toBeLessThan(500);
      expect(processed.smartFeaturesApplied).toContain('criticalBypass');
      
      smartManager.cleanup();
    });
    
    it('should export system data for analysis', () => {
      const smartManager = new SmartAlarmManager();
      
      const exportData = smartManager.exportSmartData();
      
      expect(exportData).toBeDefined();
      expect(exportData.configuration).toBeDefined();
      expect(exportData.statistics).toBeDefined();
      expect(exportData.exportTimestamp).toBeDefined();
      
      smartManager.cleanup();
    });
  });
});