import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { PlatformNotificationService } from './PlatformNotificationService';
import { NotificationContentManager, VesselContextData } from './NotificationContentManager';
import { SmartNotificationManager } from './SmartNotificationManager';
import { log } from '../../utils/logging/logger';

// Platform-specific imports (would be handled by native modules in production)
interface NotificationPermission {
  granted: boolean;
  canRequestAgain: boolean;
}

interface NotificationChannel {
  id: string;
  name: string;
  importance: 'low' | 'default' | 'high' | 'max';
  sound?: string;
  vibration?: boolean;
  bypassDnd?: boolean; // Bypass Do Not Disturb for critical alarms
}

export interface NotificationConfig {
  criticalAlertsEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  badgeEnabled: boolean;
  bannerEnabled: boolean;
  lockScreenEnabled: boolean;
  channels: NotificationChannel[];
}

export interface AlarmNotificationData {
  id: string;
  message: string;
  level: 'info' | 'warning' | 'critical';
  timestamp: number;
  source?: string;
  value?: number;
  threshold?: number;
  richContent?: any;
  template?: any;
}

export interface NotificationAction {
  id: string;
  title: string;
  type: 'acknowledge' | 'snooze' | 'open_app' | 'silence';
}

/**
 * Cross-platform notification manager for marine alarm system
 * Handles background notifications, critical alerts, and platform-specific behaviors
 */
export class NotificationManager {
  private static instance: NotificationManager;

  private config: NotificationConfig;
  private isInitialized = false;
  private permissionsGranted = false;
  private platformService: PlatformNotificationService;
  private contentManager: NotificationContentManager;
  private smartManager: SmartNotificationManager;

  // Notification batching to prevent spam
  private pendingNotifications: Map<string, AlarmNotificationData> = new Map();
  private batchingTimer: NodeJS.Timeout | null = null;
  private readonly batchingDelay = 3000; // 3 seconds

  private constructor() {
    this.config = {
      criticalAlertsEnabled: true,
      soundEnabled: true,
      vibrationEnabled: true,
      badgeEnabled: true,
      bannerEnabled: true,
      lockScreenEnabled: true,
      channels: this.createDefaultChannels(),
    };

    this.platformService = PlatformNotificationService.getInstance();
    this.contentManager = NotificationContentManager.getInstance();
    this.smartManager = SmartNotificationManager.getInstance();
  }

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * Initialize notification system with platform-specific setup
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize platform-specific service
      await this.platformService.initialize();

      const capabilities = this.platformService.getCapabilities();
      this.permissionsGranted = capabilities.permissions.granted;

      if (!this.permissionsGranted) {
        log.app('[Notifications] Notification permissions not granted');
        return;
      }

      this.isInitialized = true;
    } catch (error) {
      log.app('[Notifications] Failed to initialize notification system', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
      throw error;
    }
  }

  /**
   * Request notification permissions from the user
   */
  private async requestPermissions(): Promise<NotificationPermission> {
    try {
      if (Platform.OS === 'ios') {
        return await this.requestiOSPermissions();
      } else if (Platform.OS === 'android') {
        return await this.requestAndroidPermissions();
      } else {
        return await this.requestDesktopPermissions();
      }
    } catch (error) {
      log.app('[Notifications] Error requesting permissions', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
      return { granted: false, canRequestAgain: false };
    }
  }

  /**
   * Request iOS notification permissions including critical alerts
   */
  private async requestiOSPermissions(): Promise<NotificationPermission> {
    // In production, this would use @react-native-async-storage/async-storage
    // or react-native-permissions along with native iOS UserNotifications framework

    // TODO: Implement actual iOS permission request using native modules
    // const { granted } = await requestNotifications(['alert', 'sound', 'badge', 'criticalAlert']);

    // For now, simulate permission grant
    return { granted: true, canRequestAgain: true };
  }

  /**
   * Request Android notification permissions and battery optimization exemption
   */
  private async requestAndroidPermissions(): Promise<NotificationPermission> {
    try {
      // Request POST_NOTIFICATIONS permission (Android 13+)
      if (typeof Platform.Version === 'number' && Platform.Version >= 33) {
        const result = await PermissionsAndroid.request(
          'android.permission.POST_NOTIFICATIONS' as any,
        );

        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          return { granted: false, canRequestAgain: true };
        }
      }

      // Request battery optimization exemption for background notifications
      // TODO: Implement native Android battery optimization request

      return { granted: true, canRequestAgain: true };
    } catch (error) {
      log.app('[Notifications] Android permission error', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
      return { granted: false, canRequestAgain: false };
    }
  }

  /**
   * Request desktop notification permissions (Web/Electron)
   */
  private async requestDesktopPermissions(): Promise<NotificationPermission> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      return {
        granted: permission === 'granted',
        canRequestAgain: permission !== 'denied',
      };
    }

    return { granted: false, canRequestAgain: false };
  }

  /**
   * Setup iOS-specific notification configuration
   */
  private async setupiOS(): Promise<void> {
    // TODO: Configure iOS UserNotifications framework
    // - Register notification categories with actions
    // - Configure critical alert sounds
    // - Setup background processing capabilities
  }

  /**
   * Setup Android-specific notification channels and configuration
   */
  private async setupAndroid(): Promise<void> {
    // Create notification channels
    for (const channel of this.config.channels) {
      await this.createAndroidNotificationChannel(channel);
    }

    // TODO: Configure Android foreground service for background processing
  }

  /**
   * Setup desktop notification configuration
   */
  private async setupDesktop(): Promise<void> {
    // Desktop notifications use browser/Electron API
    // Configuration is minimal compared to mobile platforms
  }

  /**
   * Create default notification channels for marine alarms
   */
  private createDefaultChannels(): NotificationChannel[] {
    return [
      {
        id: 'critical_alarms',
        name: 'Critical Marine Alarms',
        importance: 'max',
        sound: 'marine_alarm_critical.wav',
        vibration: true,
        bypassDnd: true,
      },
      {
        id: 'warning_alarms',
        name: 'Warning Alarms',
        importance: 'high',
        sound: 'marine_alarm_warning.wav',
        vibration: true,
        bypassDnd: false,
      },
      {
        id: 'info_alarms',
        name: 'Information Alerts',
        importance: 'default',
        vibration: false,
        bypassDnd: false,
      },
      {
        id: 'system_status',
        name: 'System Status',
        importance: 'low',
        vibration: false,
        bypassDnd: false,
      },
    ];
  }

  /**
   * Create Android notification channel
   */
  private async createAndroidNotificationChannel(channel: NotificationChannel): Promise<void> {
    // TODO: Implement native Android notification channel creation
  }

  /**
   * Send alarm notification with smart management, batching, and rich content
   */
  public async sendAlarmNotification(
    alarm: AlarmNotificationData,
    vesselContext?: VesselContextData,
  ): Promise<void> {
    if (!this.isInitialized || !this.permissionsGranted) {
      log.app('[Notifications] Cannot send notification - system not ready');
      return;
    }

    try {
      // Use smart management to determine how to handle the notification
      const smartResult = await this.smartManager.processAlarmNotification(alarm, vesselContext);

      if (smartResult.action === 'suppressed') {
        return; // Notification was suppressed
      }

      if (smartResult.action === 'batched') {
        return; // Notification was added to batch, will be sent later
      }

      // For immediate and escalated notifications, send now
      await this.sendImmediateNotification(alarm, vesselContext, smartResult.urgencyLevel);
    } catch (error) {
      log.app('[Notifications] Failed to send alarm notification', () => ({
        error: error instanceof Error ? error.message : String(error),
        alarmId: alarm.id,
      }));
      throw error;
    }
  }

  /**
   * Send immediate notification (legacy method, now wraps smart notification)
   */
  public async sendCriticalAlarmNotification(
    alarm: AlarmNotificationData,
    vesselContext?: VesselContextData,
  ): Promise<void> {
    // Force immediate sending for critical alarms
    await this.sendImmediateNotification(alarm, vesselContext);
  }

  /**
   * Internal method to send notification immediately
   */
  private async sendImmediateNotification(
    alarm: AlarmNotificationData,
    vesselContext?: VesselContextData,
    urgencyLevel?: any,
  ): Promise<void> {
    // Generate rich content for the alarm
    const content = this.contentManager.generateNotificationContent(alarm, vesselContext);

    // Create enhanced alarm data with rich content
    const enhancedAlarm: AlarmNotificationData = {
      ...alarm,
      message: content.body,
      richContent: content.richContent,
      template: content.template,
    };

    // Use platform-specific service to send
    await this.platformService.sendCriticalAlarmNotification(enhancedAlarm);
  }

  /**
   * Add alarm to batched notifications (for non-critical alarms)
   */
  public addToBatch(alarm: AlarmNotificationData): void {
    this.pendingNotifications.set(alarm.id, alarm);

    // Reset batching timer
    if (this.batchingTimer) {
      clearTimeout(this.batchingTimer);
    }

    this.batchingTimer = setTimeout(() => {
      this.sendBatchedNotifications();
    }, this.batchingDelay);
  }

  /**
   * Send batched notifications to prevent spam
   */
  private async sendBatchedNotifications(): Promise<void> {
    if (this.pendingNotifications.size === 0) {
      return;
    }

    const alarms = Array.from(this.pendingNotifications.values());
    this.pendingNotifications.clear();

    if (alarms.length === 1) {
      // Single alarm - send individual notification
      await this.sendSingleAlarmNotification(alarms[0]);
    } else {
      // Multiple alarms - send summary notification
      await this.sendBatchSummaryNotification(alarms);
    }
  }

  /**
   * Send notification for single alarm
   */
  private async sendSingleAlarmNotification(alarm: AlarmNotificationData): Promise<void> {
    const channelId = this.getChannelIdForAlarmLevel(alarm.level);
    const notification = this.createNotificationPayload(alarm, channelId);

    await this.sendPlatformNotification(notification);
  }

  /**
   * Send summary notification for multiple alarms
   */
  private async sendBatchSummaryNotification(alarms: AlarmNotificationData[]): Promise<void> {
    const criticalCount = alarms.filter((a) => a.level === 'critical').length;
    const warningCount = alarms.filter((a) => a.level === 'warning').length;
    const infoCount = alarms.filter((a) => a.level === 'info').length;

    const title = `${alarms.length} Marine Alarms`;
    let message = '';

    if (criticalCount > 0) message += `${criticalCount} Critical`;
    if (warningCount > 0) message += `${message ? ', ' : ''}${warningCount} Warning`;
    if (infoCount > 0) message += `${message ? ', ' : ''}${infoCount} Info`;

    const channelId = criticalCount > 0 ? 'critical_alarms' : 'warning_alarms';

    const notification = {
      title,
      message,
      channelId,
      data: {
        type: 'batch_summary',
        alarmCount: alarms.length,
        alarms: alarms.map((a) => a.id),
      },
      actions: this.createNotificationActions(['open_app', 'acknowledge']),
    };

    await this.sendPlatformNotification(notification);
  }

  /**
   * Schedule local notification (for iOS background constraints)
   */
  public async scheduleLocalAlarmNotification(
    alarm: AlarmNotificationData,
    delaySeconds: number = 0,
  ): Promise<void> {
    // TODO: Implement platform-specific local notification scheduling
    // iOS: Use UNTimeIntervalNotificationTrigger
    // Android: Use AlarmManager or WorkManager
  }

  /**
   * Create notification payload for alarm
   */
  private createNotificationPayload(alarm: AlarmNotificationData, channelId: string): any {
    const actions = this.createNotificationActions(['acknowledge', 'snooze', 'open_app']);

    return {
      title: this.getNotificationTitle(alarm),
      message: alarm.message,
      channelId,
      data: {
        type: 'alarm',
        alarmId: alarm.id,
        level: alarm.level,
        source: alarm.source,
        timestamp: alarm.timestamp,
      },
      actions,
    };
  }

  /**
   * Get notification title based on alarm level and source
   */
  private getNotificationTitle(alarm: AlarmNotificationData): string {
    const levelText = alarm.level.toUpperCase();
    const source = alarm.source ? ` - ${alarm.source}` : '';

    return `${levelText} MARINE ALARM${source}`;
  }

  /**
   * Get notification channel ID for alarm level
   */
  private getChannelIdForAlarmLevel(level: string): string {
    switch (level) {
      case 'critical':
        return 'critical_alarms';
      case 'warning':
        return 'warning_alarms';
      case 'info':
        return 'info_alarms';
      default:
        return 'system_status';
    }
  }

  /**
   * Create notification actions based on alarm type
   */
  private createNotificationActions(actionTypes: string[]): NotificationAction[] {
    const actions: NotificationAction[] = [];

    for (const type of actionTypes) {
      switch (type) {
        case 'acknowledge':
          actions.push({
            id: 'acknowledge',
            title: 'Acknowledge',
            type: 'acknowledge',
          });
          break;
        case 'snooze':
          actions.push({
            id: 'snooze_5',
            title: 'Snooze 5min',
            type: 'snooze',
          });
          break;
        case 'open_app':
          actions.push({
            id: 'open',
            title: 'Open App',
            type: 'open_app',
          });
          break;
        case 'silence':
          actions.push({
            id: 'silence',
            title: 'Silence',
            type: 'silence',
          });
          break;
      }
    }

    return actions;
  }

  /**
   * Send platform-specific notification
   */
  private async sendPlatformNotification(notification: any): Promise<void> {
    if (Platform.OS === 'ios') {
      await this.sendiOSNotification(notification);
    } else if (Platform.OS === 'android') {
      await this.sendAndroidNotification(notification);
    } else {
      await this.sendDesktopNotification(notification);
    }
  }

  /**
   * Send iOS notification using UserNotifications framework
   */
  private async sendiOSNotification(notification: any): Promise<void> {
    // TODO: Implement iOS notification sending via native module
  }

  /**
   * Send Android notification using NotificationManager
   */
  private async sendAndroidNotification(notification: any): Promise<void> {
    // TODO: Implement Android notification sending via native module
  }

  /**
   * Send desktop notification using Web Notification API
   */
  private async sendDesktopNotification(notification: any): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      log.app('[Notifications] Desktop notifications not supported');
      return;
    }

    try {
      const desktopNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/assets/marine-alarm-icon.png', // TODO: Add marine-specific icon
        badge: '/assets/marine-badge.png',
        data: notification.data,
        requireInteraction: notification.channelId === 'critical_alarms',
        silent: false,
      });

      // Handle notification click
      desktopNotification.onclick = () => {
        window.focus();
        desktopNotification.close();
        // TODO: Navigate to appropriate alarm screen
      };
    } catch (error) {
      log.app('[Notifications] Desktop notification error', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  /**
   * Handle notification action responses with rich content support
   */
  public async handleNotificationAction(
    actionId: string,
    notificationData: any,
    vesselContext?: VesselContextData,
  ): Promise<void> {
    try {
      // Use content manager for rich action handling
      await this.contentManager.handleNotificationAction(actionId, notificationData, vesselContext);

      // Clear notification after action (except for snooze)
      if (!actionId.includes('snooze') && !actionId.includes('silence')) {
        await this.platformService.clearAlarmNotifications(notificationData.alarmId);
      }
    } catch (error) {
      log.app('[Notifications] Action handling error', () => ({
        error: error instanceof Error ? error.message : String(error),
        actionId,
      }));

      // Fallback to simple action handling
      await this.handleSimpleAction(actionId, notificationData);
    }
  }

  /**
   * Simple fallback action handling
   */
  private async handleSimpleAction(actionId: string, notificationData: any): Promise<void> {
    switch (actionId) {
      case 'acknowledge':
        await this.acknowledgeAlarm(notificationData.alarmId);
        break;
      case 'snooze_5':
        await this.snoozeAlarm(notificationData.alarmId, 5 * 60 * 1000); // 5 minutes
        break;
      case 'open':
        await this.openApp(notificationData);
        break;
      case 'silence':
        await this.silenceAlarms();
        break;
    }
  }

  /**
   * Acknowledge alarm from notification action
   */
  private async acknowledgeAlarm(alarmId: string): Promise<void> {
    // Stop escalation in smart manager
    this.smartManager.acknowledgeAlarm(alarmId);

    // Clear platform notifications for this alarm
    await this.platformService.clearAlarmNotifications(alarmId);

    // TODO: Integrate with alarm store to acknowledge alarm
  }

  /**
   * Snooze alarm from notification action
   */
  private async snoozeAlarm(alarmId: string, durationMs: number): Promise<void> {
    // TODO: Implement alarm snoozing functionality
  }

  /**
   * Open app from notification action
   */
  private async openApp(data: any): Promise<void> {
    // TODO: Handle deep linking to specific alarm or screen
  }

  /**
   * Silence all alarms from notification action
   */
  private async silenceAlarms(): Promise<void> {
    // TODO: Implement global alarm silencing
  }

  /**
   * Update notification configuration
   */
  public updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get comprehensive notification status and capabilities
   */
  public getStatus(): {
    isInitialized: boolean;
    permissionsGranted: boolean;
    config: NotificationConfig;
    pendingCount: number;
    platformCapabilities: any;
    smartManagement: any;
  } {
    return {
      isInitialized: this.isInitialized,
      permissionsGranted: this.permissionsGranted,
      config: this.config,
      pendingCount: this.pendingNotifications.size,
      platformCapabilities: this.platformService.getCapabilities(),
      smartManagement: this.smartManager.getSmartNotificationStatus(),
    };
  }

  /**
   * Get notification history and analytics
   */
  public getNotificationAnalytics() {
    return {
      history: this.contentManager.getNotificationHistory(100), // Last 100 notifications
      analytics: this.contentManager.getResponseAnalytics(),
      templates: this.contentManager.getAvailableTemplates(),
    };
  }

  /**
   * Clear notification history
   */
  public clearNotificationHistory(): void {
    this.contentManager.clearHistory();
  }

  /**
   * Export notification data for analysis
   */
  public exportNotificationData(): string {
    return this.contentManager.exportHistory();
  }

  /**
   * Test notification system with rich content
   */
  public async testNotifications(): Promise<void> {
    const testAlarm: AlarmNotificationData = {
      id: 'test_notification',
      message: 'Test marine alarm notification',
      level: 'warning',
      timestamp: Date.now(),
      source: 'Test System',
      value: 1.5,
      threshold: 2.0,
    };

    const testVesselContext: VesselContextData = {
      position: { latitude: 40.7128, longitude: -74.006 },
      heading: 90,
      speed: 5.2,
      depth: 1.5,
      timestamp: Date.now(),
    };

    await this.sendCriticalAlarmNotification(testAlarm, testVesselContext);
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.batchingTimer) {
      clearTimeout(this.batchingTimer);
      this.batchingTimer = null;
    }

    this.pendingNotifications.clear();
    this.isInitialized = false;
    this.permissionsGranted = false;
  }
}
