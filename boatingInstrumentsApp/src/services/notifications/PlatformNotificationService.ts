import { Platform } from 'react-native';
import { IOSNotificationsModule, AndroidNotificationsModule } from './NativeModules';
import { AlarmNotificationData, NotificationAction } from './NotificationManager';

export interface PlatformNotificationCapabilities {
  criticalAlerts: boolean;
  backgroundProcessing: boolean;
  customSounds: boolean;
  actions: boolean;
  badges: boolean;
  bypassDnd: boolean;
  richContent: boolean;
  foregroundService: boolean; // Android only
}

export interface NotificationPermissionState {
  granted: boolean;
  alert: boolean;
  badge: boolean;
  sound: boolean;
  criticalAlert: boolean;
}

/**
 * Platform-specific notification service for marine alarm system
 * Provides unified interface while leveraging platform-specific capabilities
 */
export class PlatformNotificationService {
  private static instance: PlatformNotificationService;
  
  private capabilities: PlatformNotificationCapabilities;
  private permissionState: NotificationPermissionState;
  private isInitialized = false;
  
  // Android foreground service state
  private foregroundServiceActive = false;
  
  private constructor() {
    this.capabilities = this.detectPlatformCapabilities();
    this.permissionState = {
      granted: false,
      alert: false,
      badge: false,
      sound: false,
      criticalAlert: false
    };
  }
  
  public static getInstance(): PlatformNotificationService {
    if (!PlatformNotificationService.instance) {
      PlatformNotificationService.instance = new PlatformNotificationService();
    }
    return PlatformNotificationService.instance;
  }
  
  /**
   * Initialize platform-specific notification system
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      // Request platform-specific permissions
      await this.requestPermissions();
      
      // Setup platform-specific configuration
      if (Platform.OS === 'ios') {
        await this.initializeiOS();
      } else if (Platform.OS === 'android') {
        await this.initializeAndroid();
      }
      
      this.isInitialized = true;
      console.log('[Platform Notifications] Initialization complete');
      
    } catch (error) {
      console.error('[Platform Notifications] Initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * Detect platform-specific notification capabilities
   */
  private detectPlatformCapabilities(): PlatformNotificationCapabilities {
    if (Platform.OS === 'ios') {
      return {
        criticalAlerts: true,
        backgroundProcessing: true,
        customSounds: true,
        actions: true,
        badges: true,
        bypassDnd: true,
        richContent: true,
        foregroundService: false
      };
    } else if (Platform.OS === 'android') {
      return {
        criticalAlerts: true,
        backgroundProcessing: true,
        customSounds: true,
        actions: true,
        badges: false, // Limited support
        bypassDnd: true,
        richContent: true,
        foregroundService: true
      };
    } else {
      // Web/Desktop
      return {
        criticalAlerts: false,
        backgroundProcessing: false,
        customSounds: true,
        actions: true,
        badges: false,
        bypassDnd: false,
        richContent: true,
        foregroundService: false
      };
    }
  }
  
  /**
   * Request notification permissions for current platform
   */
  public async requestPermissions(): Promise<NotificationPermissionState> {
    try {
      if (Platform.OS === 'ios') {
        const result = await IOSNotificationsModule.requestPermissions({
          alert: true,
          badge: true,
          sound: true,
          criticalAlert: true
        });
        
        this.permissionState = {
          granted: result.granted,
          alert: result.alert,
          badge: result.badge,
          sound: result.sound,
          criticalAlert: result.criticalAlert
        };
        
        console.log('[iOS] Notification permissions:', this.permissionState);
        
      } else if (Platform.OS === 'android') {
        const result = await AndroidNotificationsModule.requestPermissions();
        
        this.permissionState = {
          granted: result.granted,
          alert: result.granted,
          badge: false,
          sound: result.granted,
          criticalAlert: result.granted
        };
        
        // Request battery optimization exemption for background processing
        if (result.granted) {
          await AndroidNotificationsModule.requestBatteryOptimizationExemption();
        }
        
        console.log('[Android] Notification permissions:', this.permissionState);
        
      } else {
        // Desktop/Web permissions
        if (typeof window !== 'undefined' && 'Notification' in window) {
          const permission = await Notification.requestPermission();
          
          this.permissionState = {
            granted: permission === 'granted',
            alert: permission === 'granted',
            badge: false,
            sound: permission === 'granted',
            criticalAlert: false
          };
        }
      }
      
      return this.permissionState;
      
    } catch (error) {
      console.error('[Platform Notifications] Permission request failed:', error);
      throw error;
    }
  }
  
  /**
   * Initialize iOS-specific notification features
   */
  private async initializeiOS(): Promise<void> {
    console.log('[iOS] Setting up notification categories and critical alerts');
    
    // Register notification categories with marine-specific actions
    await IOSNotificationsModule.registerNotificationCategories([
      {
        id: 'CRITICAL_MARINE_ALARM',
        actions: [
          {
            id: 'acknowledge',
            title: 'Acknowledge',
            options: ['foreground']
          },
          {
            id: 'silence_10',
            title: 'Silence 10min',
            options: ['destructive']
          },
          {
            id: 'open_app',
            title: 'Open App',
            options: ['foreground']
          }
        ]
      },
      {
        id: 'WARNING_MARINE_ALARM',
        actions: [
          {
            id: 'acknowledge',
            title: 'Acknowledge'
          },
          {
            id: 'snooze_5',
            title: 'Snooze 5min'
          },
          {
            id: 'open_app',
            title: 'Open App',
            options: ['foreground']
          }
        ]
      },
      {
        id: 'INFO_MARINE_ALERT',
        actions: [
          {
            id: 'dismiss',
            title: 'Dismiss'
          },
          {
            id: 'open_app',
            title: 'View Details',
            options: ['foreground']
          }
        ]
      }
    ]);
  }
  
  /**
   * Initialize Android-specific notification channels and foreground service
   */
  private async initializeAndroid(): Promise<void> {
    console.log('[Android] Creating notification channels for marine alarms');
    
    // Create notification channels for different alarm levels
    await AndroidNotificationsModule.createNotificationChannel({
      id: 'critical_marine_alarms',
      name: 'Critical Marine Alarms',
      description: 'Life-threatening marine emergencies requiring immediate attention',
      importance: 'max',
      sound: 'marine_critical_alarm.wav',
      vibrationPattern: [0, 500, 200, 500, 200, 500], // Urgent pattern
      lightColor: '#FF0000',
      bypassDnd: true
    });
    
    await AndroidNotificationsModule.createNotificationChannel({
      id: 'warning_marine_alarms',
      name: 'Warning Marine Alarms',
      description: 'Important marine warnings requiring attention',
      importance: 'high',
      sound: 'marine_warning_alarm.wav',
      vibrationPattern: [0, 300, 100, 300], // Standard pattern
      lightColor: '#FFA500',
      bypassDnd: false
    });
    
    await AndroidNotificationsModule.createNotificationChannel({
      id: 'info_marine_alerts',
      name: 'Marine Information',
      description: 'General marine information and status updates',
      importance: 'default',
      vibrationPattern: [0, 200], // Gentle pattern
      lightColor: '#0080FF',
      bypassDnd: false
    });
    
    await AndroidNotificationsModule.createNotificationChannel({
      id: 'background_monitoring',
      name: 'Background Monitoring',
      description: 'Background NMEA data monitoring service',
      importance: 'low',
      bypassDnd: false
    });
  }
  
  /**
   * Send critical alarm notification with platform-specific optimizations
   */
  public async sendCriticalAlarmNotification(alarm: AlarmNotificationData): Promise<void> {
    if (!this.isInitialized || !this.permissionState.granted) {
      throw new Error('Notification system not ready');
    }
    
    try {
      if (Platform.OS === 'ios') {
        await this.sendiOSCriticalNotification(alarm);
      } else if (Platform.OS === 'android') {
        await this.sendAndroidCriticalNotification(alarm);
      } else {
        await this.sendDesktopCriticalNotification(alarm);
      }
      
      console.log(`[Platform Notifications] Critical alarm sent: ${alarm.message}`);
      
    } catch (error) {
      console.error('[Platform Notifications] Failed to send critical alarm:', error);
      throw error;
    }
  }
  
  /**
   * Send iOS critical notification with critical alert capability
   */
  private async sendiOSCriticalNotification(alarm: AlarmNotificationData): Promise<void> {
    await IOSNotificationsModule.scheduleNotification({
      id: `critical_alarm_${alarm.id}`,
      title: `🚨 CRITICAL MARINE ALARM`,
      body: alarm.message,
      sound: 'marine_critical_alarm.wav',
      criticalAlert: this.permissionState.criticalAlert,
      interruptionLevel: 'critical',
      data: {
        type: 'critical_alarm',
        alarmId: alarm.id,
        level: alarm.level,
        source: alarm.source,
        timestamp: alarm.timestamp,
        value: alarm.value,
        threshold: alarm.threshold
      },
      actions: [
        { id: 'acknowledge', title: 'Acknowledge' },
        { id: 'silence_10', title: 'Silence 10min' },
        { id: 'open_app', title: 'Open App' }
      ]
    });
    
    // Update badge count for critical alarms
    if (this.permissionState.badge) {
      const currentBadge = await IOSNotificationsModule.getBadgeCount();
      await IOSNotificationsModule.setBadgeCount(currentBadge + 1);
    }
  }
  
  /**
   * Send Android critical notification with high priority and bypass DND
   */
  private async sendAndroidCriticalNotification(alarm: AlarmNotificationData): Promise<void> {
    await AndroidNotificationsModule.sendNotification({
      id: `critical_alarm_${alarm.id}`,
      channelId: 'critical_marine_alarms',
      title: '🚨 CRITICAL MARINE ALARM',
      body: alarm.message,
      priority: 'max',
      ongoing: true, // Persistent until acknowledged
      autoCancel: false,
      data: {
        type: 'critical_alarm',
        alarmId: alarm.id,
        level: alarm.level,
        source: alarm.source,
        timestamp: alarm.timestamp,
        value: alarm.value,
        threshold: alarm.threshold
      },
      actions: [
        { id: 'acknowledge', title: 'Acknowledge', icon: 'ic_check' },
        { id: 'silence_10', title: 'Silence 10min', icon: 'ic_volume_off' },
        { id: 'open_app', title: 'Open App', icon: 'ic_launch' }
      ]
    });
  }
  
  /**
   * Send desktop critical notification
   */
  private async sendDesktopCriticalNotification(alarm: AlarmNotificationData): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      throw new Error('Desktop notifications not supported');
    }
    
    const notification = new Notification('🚨 CRITICAL MARINE ALARM', {
      body: alarm.message,
      icon: '/assets/marine-critical-alarm.png',
      badge: '/assets/marine-badge.png',
      requireInteraction: true, // Keeps notification visible until user interaction
      silent: false,
      data: {
        type: 'critical_alarm',
        alarmId: alarm.id,
        level: alarm.level,
        source: alarm.source,
        timestamp: alarm.timestamp
      }
    });
    
    notification.onclick = () => {
      // Focus window and navigate to alarm
      window.focus();
      notification.close();
    };
  }
  
  /**
   * Start background monitoring service (Android foreground service)
   */
  public async startBackgroundMonitoring(): Promise<void> {
    if (Platform.OS !== 'android' || this.foregroundServiceActive) {
      return;
    }
    
    try {
      await AndroidNotificationsModule.startForegroundService({
        channelId: 'background_monitoring',
        title: 'Marine Instruments Active',
        body: 'Monitoring NMEA data for critical alarms',
        icon: 'ic_marine_monitoring'
      });
      
      this.foregroundServiceActive = true;
      console.log('[Android] Background monitoring service started');
      
    } catch (error) {
      console.error('[Android] Failed to start background service:', error);
      throw error;
    }
  }
  
  /**
   * Stop background monitoring service
   */
  public async stopBackgroundMonitoring(): Promise<void> {
    if (Platform.OS !== 'android' || !this.foregroundServiceActive) {
      return;
    }
    
    try {
      await AndroidNotificationsModule.stopForegroundService();
      this.foregroundServiceActive = false;
      console.log('[Android] Background monitoring service stopped');
      
    } catch (error) {
      console.error('[Android] Failed to stop background service:', error);
    }
  }
  
  /**
   * Clear all notifications for a specific alarm
   */
  public async clearAlarmNotifications(alarmId: string): Promise<void> {
    try {
      const notificationId = `critical_alarm_${alarmId}`;
      
      if (Platform.OS === 'ios') {
        await IOSNotificationsModule.cancelNotification(notificationId);
      } else if (Platform.OS === 'android') {
        await AndroidNotificationsModule.cancelNotification(notificationId);
      }
      
      console.log(`[Platform Notifications] Cleared notifications for alarm: ${alarmId}`);
      
    } catch (error) {
      console.error(`[Platform Notifications] Failed to clear notifications for alarm ${alarmId}:`, error);
    }
  }
  
  /**
   * Clear all marine alarm notifications
   */
  public async clearAllNotifications(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await IOSNotificationsModule.cancelAllNotifications();
        await IOSNotificationsModule.setBadgeCount(0);
      } else if (Platform.OS === 'android') {
        await AndroidNotificationsModule.cancelAllNotifications();
      }
      
      console.log('[Platform Notifications] All notifications cleared');
      
    } catch (error) {
      console.error('[Platform Notifications] Failed to clear all notifications:', error);
    }
  }
  
  /**
   * Get platform capabilities and current state
   */
  public getCapabilities(): {
    capabilities: PlatformNotificationCapabilities;
    permissions: NotificationPermissionState;
    foregroundServiceActive: boolean;
  } {
    return {
      capabilities: this.capabilities,
      permissions: this.permissionState,
      foregroundServiceActive: this.foregroundServiceActive
    };
  }
  
  /**
   * Test platform notification system
   */
  public async testPlatformNotifications(): Promise<void> {
    const testAlarm: AlarmNotificationData = {
      id: 'platform_test',
      message: `${Platform.OS.toUpperCase()} notification test - Marine system operational`,
      level: 'warning',
      timestamp: Date.now(),
      source: 'Platform Test',
      value: 42,
      threshold: 40
    };
    
    await this.sendCriticalAlarmNotification(testAlarm);
    
    // Auto-clear test notification after 5 seconds
    setTimeout(() => {
      this.clearAlarmNotifications(testAlarm.id);
    }, 5000);
  }
  
  /**
   * Cleanup platform-specific resources
   */
  public async cleanup(): Promise<void> {
    try {
      await this.clearAllNotifications();
      
      if (this.foregroundServiceActive) {
        await this.stopBackgroundMonitoring();
      }
      
      this.isInitialized = false;
      console.log('[Platform Notifications] Cleanup complete');
      
    } catch (error) {
      console.error('[Platform Notifications] Cleanup error:', error);
    }
  }
}