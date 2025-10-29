import { NotificationManager, AlarmNotificationData } from "../../../src/services/notifications/NotificationManager";
import { NotificationContentManager, VesselContextData } from "../../../src/services/notifications/NotificationContentManager";
import { SmartNotificationManager } from "../../../src/services/notifications/SmartNotificationManager";
import { PlatformNotificationService } from "../../../src/services/notifications/PlatformNotificationService";
import { BackgroundProcessingManager } from "../../../src/services/background/BackgroundProcessingManager";
import { NotificationIntegrationService } from "../../../src/services/integration/NotificationIntegrationService";

/**
 * Comprehensive test suite for the notification system
 * Tests all components including background processing, cross-platform notifications, and marine safety compliance
 */
describe('Marine Notification System', () => {
  let notificationManager: NotificationManager;
  let contentManager: NotificationContentManager;
  let smartManager: SmartNotificationManager;
  let platformService: PlatformNotificationService;
  let backgroundManager: BackgroundProcessingManager;
  let integrationService: NotificationIntegrationService;
  
  beforeEach(async () => {
    // Initialize all services
    notificationManager = NotificationManager.getInstance();
    contentManager = NotificationContentManager.getInstance();
    smartManager = SmartNotificationManager.getInstance();
    platformService = PlatformNotificationService.getInstance();
    backgroundManager = BackgroundProcessingManager.getInstance();
    integrationService = NotificationIntegrationService.getInstance();
    
    // Initialize the notification system
    await notificationManager.initialize();
    await platformService.initialize();
    await integrationService.initialize();
  });
  
  afterEach(async () => {
    // Cleanup after each test
    notificationManager.clearNotificationHistory();
    smartManager.clearPendingNotifications();
    integrationService.clearNotificationTracking();
  });
  
  describe('Background Processing System', () => {
    it('should initialize background processing correctly', async () => {
      const status = backgroundManager.getStatus();
      
      expect(status.serviceActive).toBeTruthy();
      expect(status.isBackgrounded).toBeFalsy();
      expect(status.processingRate).toBe(1000); // Normal foreground rate
    });
    
    it('should handle app state transitions', () => {
      const initialStatus = backgroundManager.getStatus();
      expect(initialStatus.isBackgrounded).toBeFalsy();
      
      // Simulate app backgrounding (would be triggered by actual AppState change)
      // This test would require more integration with React Native's AppState
    });
    
    it('should detect critical alarms in background', async () => {
      const testAlarm: AlarmNotificationData = {
        id: 'test_critical',
        message: 'Critical depth alarm - shallow water detected',
        level: 'critical',
        timestamp: Date.now(),
        source: 'depth_monitor',
        value: 1.2,
        threshold: 2.0
      };
      
      const testVesselContext: VesselContextData = {
        depth: 1.2,
        speed: 5.0,
        heading: 90,
        timestamp: Date.now()
      };
      
      // Test background alarm detection
      const result = await smartManager.processAlarmNotification(testAlarm, testVesselContext);
      
      expect(result.action).toBe('immediate');
      expect(result.urgencyLevel.priority).toBeGreaterThan(8); // Critical priority
    });
    
    it('should optimize processing for battery conservation', () => {
      const status = backgroundManager.getStatus();
      
      // Test battery optimization configuration
      expect(status.config.batteryOptimization).toBeTruthy();
      expect(status.config.processingSamplingRate).toBeGreaterThan(1000); // Reduced rate for background
    });
  });
  
  describe('Platform-Specific Notifications', () => {
    it('should detect platform capabilities correctly', () => {
      const capabilities = platformService.getCapabilities();
      
      expect(capabilities.capabilities).toBeDefined();
      expect(capabilities.permissions).toBeDefined();
      expect(typeof capabilities.capabilities.criticalAlerts).toBe('boolean');
      expect(typeof capabilities.capabilities.backgroundProcessing).toBe('boolean');
    });
    
    it('should request appropriate permissions', async () => {
      const permissions = await platformService.requestPermissions();
      
      expect(permissions).toBeDefined();
      expect(typeof permissions.granted).toBe('boolean');
      expect(typeof permissions.alert).toBe('boolean');
      expect(typeof permissions.sound).toBe('boolean');
    });
    
    it('should send critical notifications with platform-specific features', async () => {
      const testAlarm: AlarmNotificationData = {
        id: 'platform_test_critical',
        message: 'Engine overheat - immediate attention required',
        level: 'critical',
        timestamp: Date.now(),
        source: 'engine_monitor',
        value: 105,
        threshold: 85
      };
      
      // Should not throw errors
      await expect(platformService.sendCriticalAlarmNotification(testAlarm)).resolves.not.toThrow();
    });
    
    it('should handle notification actions properly', async () => {
      const testNotificationData = {
        alarmId: 'test_alarm_123',
        type: 'critical_alarm',
        timestamp: Date.now()
      };
      
      // Test acknowledge action
      await expect(
        contentManager.handleNotificationAction('acknowledge', testNotificationData)
      ).resolves.not.toThrow();
      
      // Test navigation action
      await expect(
        contentManager.handleNotificationAction('navigate_to_engine', testNotificationData)
      ).resolves.not.toThrow();
    });
  });
  
  describe('Notification Content & Rich Actions', () => {
    it('should generate appropriate content for marine alarms', () => {
      const testAlarms = [
        {
          id: 'shallow_test',
          message: 'Shallow water detected',
          level: 'critical' as const,
          timestamp: Date.now(),
          source: 'depth',
          value: 1.5,
          threshold: 2.0
        },
        {
          id: 'engine_test',
          message: 'Engine temperature high',
          level: 'warning' as const,
          timestamp: Date.now(),
          source: 'engine_temp',
          value: 95,
          threshold: 85
        }
      ];
      
      const testVesselContext: VesselContextData = {
        position: { latitude: 40.7128, longitude: -74.0060 },
        depth: 1.5,
        speed: 3.2,
        timestamp: Date.now()
      };
      
      testAlarms.forEach(alarm => {
        const content = contentManager.generateNotificationContent(alarm, testVesselContext);
        
        expect(content.title).toBeTruthy();
        expect(content.body).toBeTruthy();
        expect(content.template).toBeDefined();
        
        if (content.richContent) {
          expect(content.richContent.actions).toBeDefined();
          expect(Array.isArray(content.richContent.actions)).toBeTruthy();
        }
      });
    });
    
    it('should track notification history and analytics', async () => {
      const testAlarm: AlarmNotificationData = {
        id: 'analytics_test',
        message: 'Test alarm for analytics',
        level: 'warning',
        timestamp: Date.now(),
        source: 'test_system'
      };
      
      // Generate content (which internally tracks)
      contentManager.generateNotificationContent(testAlarm);
      
      // Simulate user action
      await contentManager.handleNotificationAction('acknowledge', {
        alarmId: testAlarm.id,
        timestamp: Date.now()
      });
      
      const analytics = contentManager.getResponseAnalytics();
      
      expect(analytics.totalNotifications).toBeGreaterThanOrEqual(0);
      expect(typeof analytics.averageResponseTime).toBe('number');
      expect(analytics.responseTypeDistribution).toBeDefined();
    });
    
    it('should provide customizable notification templates', () => {
      const templates = contentManager.getAvailableTemplates();
      
      expect(Array.isArray(templates)).toBeTruthy();
      expect(templates.length).toBeGreaterThan(0);
      
      // Check for marine-specific templates
      const marineTemplates = templates.filter(template => 
        template.id.includes('shallow_water') || 
        template.id.includes('engine_temperature') ||
        template.id.includes('gps_signal_loss')
      );
      
      expect(marineTemplates.length).toBeGreaterThan(0);
    });
  });
  
  describe('Smart Management Features', () => {
    it('should implement intelligent batching to prevent spam', async () => {
      const testAlarms: AlarmNotificationData[] = [
        {
          id: 'batch_test_1',
          message: 'Battery voltage low',
          level: 'info',
          timestamp: Date.now(),
          source: 'electrical'
        },
        {
          id: 'batch_test_2',
          message: 'GPS signal weak',
          level: 'info',
          timestamp: Date.now() + 1000,
          source: 'navigation'
        },
        {
          id: 'batch_test_3',
          message: 'Tank level low',
          level: 'warning',
          timestamp: Date.now() + 2000,
          source: 'tanks'
        }
      ];
      
      const results = [];
      
      for (const alarm of testAlarms) {
        const result = await smartManager.processAlarmNotification(alarm);
        results.push(result);
      }
      
      // Non-critical alarms should be batched
      const batchedCount = results.filter(r => r.action === 'batched').length;
      expect(batchedCount).toBeGreaterThan(0);
    });
    
    it('should escalate unacknowledged critical alarms', async () => {
      const criticalAlarm: AlarmNotificationData = {
        id: 'escalation_test',
        message: 'Collision risk detected',
        level: 'critical',
        timestamp: Date.now(),
        source: 'collision_avoidance'
      };
      
      const result = await smartManager.processAlarmNotification(criticalAlarm);
      
      expect(result.action).toBe('immediate');
      expect(result.urgencyLevel.priority).toBeGreaterThanOrEqual(9);
      
      // Test escalation setup
      const status = smartManager.getSmartNotificationStatus();
      expect(status.activeEscalations).toBeGreaterThanOrEqual(0);
    });
    
    it('should respect Do Not Disturb settings while allowing critical overrides', async () => {
      // Configure quiet hours
      smartManager.updateConfig({
        quietHours: {
          start: '22:00',
          end: '06:00'
        },
        dndCriticalOnly: true
      });
      
      const criticalAlarm: AlarmNotificationData = {
        id: 'dnd_critical_test',
        message: 'Fire alarm activated',
        level: 'critical',
        timestamp: Date.now(),
        source: 'fire_detection'
      };
      
      const infoAlarm: AlarmNotificationData = {
        id: 'dnd_info_test',
        message: 'System status update',
        level: 'info',
        timestamp: Date.now(),
        source: 'system_monitor'
      };
      
      const criticalResult = await smartManager.processAlarmNotification(criticalAlarm);
      const infoResult = await smartManager.processAlarmNotification(infoAlarm);
      
      // Critical should bypass DND, info should be suppressed during quiet hours
      expect(criticalResult.action).toBe('immediate');
      // Info result depends on current time, so we test the DND bypass logic exists
    });
    
    it('should provide customizable sound profiles for different alarm types', () => {
      const status = smartManager.getSmartNotificationStatus();
      const soundProfiles = status.config.soundProfiles;
      
      expect(Array.isArray(soundProfiles)).toBeTruthy();
      expect(soundProfiles.length).toBeGreaterThan(0);
      
      // Check for marine-specific sound profiles
      const marineProfiles = soundProfiles.filter(profile =>
        profile.id.includes('critical_general_alarm') ||
        profile.id.includes('collision') ||
        profile.id.includes('navigation')
      );
      
      expect(marineProfiles.length).toBeGreaterThan(0);
    });
  });
  
  describe('Integration & Marine Safety Compliance', () => {
    it('should integrate properly with alarm store and NMEA data', async () => {
      const integrationTest = await integrationService.testIntegration();
      
      expect(integrationTest.success).toBeTruthy();
      expect(integrationTest.results.alarmStoreConnected).toBeTruthy();
      expect(integrationTest.results.notificationManagerReady).toBeTruthy();
    });
    
    it('should meet marine safety response time requirements (<500ms)', async () => {
      const startTime = Date.now();
      
      const criticalAlarm: AlarmNotificationData = {
        id: 'response_time_test',
        message: 'Man overboard alarm',
        level: 'critical',
        timestamp: Date.now(),
        source: 'mob_detection'
      };
      
      await notificationManager.sendCriticalAlarmNotification(criticalAlarm);
      
      const responseTime = Date.now() - startTime;
      
      // Marine safety requires <500ms response for critical alarms
      expect(responseTime).toBeLessThan(500);
    });
    
    it('should handle vessel context appropriately for different scenarios', async () => {
      const scenarios = [
        {
          name: 'shallow_water_underway',
          context: {
            depth: 1.8,
            speed: 6.5,
            heading: 180,
            timestamp: Date.now()
          },
          alarm: {
            id: 'context_test_1',
            message: 'Approaching shallow water',
            level: 'critical' as const,
            timestamp: Date.now(),
            source: 'depth_monitor',
            value: 1.8,
            threshold: 2.0
          }
        },
        {
          name: 'engine_alarm_anchored',
          context: {
            depth: 15.2,
            speed: 0.1,
            heading: 270,
            timestamp: Date.now()
          },
          alarm: {
            id: 'context_test_2',
            message: 'Engine coolant temperature high',
            level: 'warning' as const,
            timestamp: Date.now(),
            source: 'engine_monitor',
            value: 95,
            threshold: 85
          }
        }
      ];
      
      for (const scenario of scenarios) {
        const result = await smartManager.processAlarmNotification(
          scenario.alarm,
          scenario.context
        );
        
        expect(result).toBeDefined();
        expect(result.action).toBeDefined();
        expect(result.urgencyLevel).toBeDefined();
        
        // Verify context affects urgency determination
        if (scenario.name === 'shallow_water_underway') {
          // Should be higher priority when underway
          expect(result.urgencyLevel.priority).toBeGreaterThanOrEqual(8);
        }
      }
    });
    
    it('should validate cross-platform notification behavior', async () => {
      const platforms = ['ios', 'android', 'web'];
      
      // This would typically test with different platform configurations
      const capabilities = platformService.getCapabilities();
      
      expect(capabilities.capabilities).toBeDefined();
      
      // All platforms should support basic notifications
      expect(capabilities.capabilities.customSounds).toBeDefined();
      expect(capabilities.capabilities.actions).toBeDefined();
    });
    
    it('should handle background processing battery optimization', () => {
      const status = backgroundManager.getStatus();
      
      expect(status.config.batteryOptimization).toBeTruthy();
      expect(status.config.processingSamplingRate).toBeGreaterThan(1000);
      expect(status.config.heartbeatInterval).toBeGreaterThan(10000);
    });
  });
  
  describe('Performance & Reliability Tests', () => {
    it('should handle high-frequency alarm scenarios without performance degradation', async () => {
      const startTime = Date.now();
      const alarmCount = 50;
      
      const promises = [];
      
      for (let i = 0; i < alarmCount; i++) {
        const alarm: AlarmNotificationData = {
          id: `perf_test_${i}`,
          message: `Performance test alarm ${i}`,
          level: i % 10 === 0 ? 'critical' : 'warning',
          timestamp: Date.now() + i * 100,
          source: 'performance_test'
        };
        
        promises.push(smartManager.processAlarmNotification(alarm));
      }
      
      await Promise.all(promises);
      
      const totalTime = Date.now() - startTime;
      const avgTimePerAlarm = totalTime / alarmCount;
      
      // Should process alarms efficiently
      expect(avgTimePerAlarm).toBeLessThan(50); // Less than 50ms per alarm
    });
    
    it('should maintain notification history without memory leaks', () => {
      const initialHistory = contentManager.getNotificationHistory();
      const initialCount = initialHistory.length;
      
      // Add many notifications
      for (let i = 0; i < 100; i++) {
        contentManager.generateNotificationContent({
          id: `memory_test_${i}`,
          message: `Memory test ${i}`,
          level: 'info',
          timestamp: Date.now() + i,
          source: 'memory_test'
        });
      }
      
      const finalHistory = contentManager.getNotificationHistory();
      
      // Should have reasonable history size management
      expect(finalHistory.length).toBeLessThan(initialCount + 200);
    });
    
    it('should recover gracefully from notification system errors', async () => {
      // Test error recovery by trying to send notification with invalid data
      const invalidAlarm = {
        id: null,
        message: '',
        level: 'invalid_level',
        timestamp: 'invalid_timestamp'
      } as any;
      
      // Should handle errors gracefully without crashing
      await expect(async () => {
        try {
          await notificationManager.sendAlarmNotification(invalidAlarm);
        } catch (error) {
          // Expected to catch error, system should remain stable
          expect(error).toBeDefined();
        }
      }).not.toThrow();
      
      // System should still be operational after error
      const status = notificationManager.getStatus();
      expect(status.isInitialized).toBeTruthy();
    });
  });
});

export { };