import { useAlarmStore, Alarm } from '../../store/alarmStore';
import { useNmeaStore } from '../../store/nmeaStore';
import { NotificationManager } from '../notifications/NotificationManager';
import { BackgroundProcessingManager } from '../background/BackgroundProcessingManager';
import { VesselContextData } from '../notifications/NotificationContentManager';
import { useToastStore } from '../../store/toastStore';

/**
 * Integration service that connects the notification system with existing alarm infrastructure
 * Handles NMEA data flow, alarm store integration, and background processing coordination
 */
export class NotificationIntegrationService {
  private static instance: NotificationIntegrationService;

  private notificationManager: NotificationManager;
  private backgroundManager: BackgroundProcessingManager;

  // Integration state
  private isInitialized = false;
  private lastAlarmCheck = 0;
  private alarmCheckInterval = 1000; // Check for new alarms every second
  private alarmCheckTimer?: NodeJS.Timeout;

  // Alarm tracking to prevent duplicate notifications
  private notifiedAlarms: Set<string> = new Set();
  private lastNotificationTimes: Map<string, number> = new Map();
  private notificationCooldown = 30000; // 30 seconds minimum between duplicate notifications

  private constructor() {
    this.notificationManager = NotificationManager.getInstance();
    this.backgroundManager = BackgroundProcessingManager.getInstance();
  }

  public static getInstance(): NotificationIntegrationService {
    if (!NotificationIntegrationService.instance) {
      NotificationIntegrationService.instance = new NotificationIntegrationService();
    }
    return NotificationIntegrationService.instance;
  }

  /**
   * Initialize the integration service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize notification manager
      await this.notificationManager.initialize();

      // Setup alarm store listeners
      this.setupAlarmStoreListeners();

      // Start alarm monitoring
      this.startAlarmMonitoring();

      this.isInitialized = true;
    } catch (error) {
      console.error('[Integration] Failed to initialize notification integration:', error);
      throw error;
    }
  }

  /**
   * Setup listeners for alarm store changes
   */
  private setupAlarmStoreListeners(): void {
    // Monitor for new alarms in the store
    const checkForNewAlarms = () => {
      const alarmState = useAlarmStore.getState();
      const currentAlarms = alarmState.activeAlarms;

      // Find alarms that haven't been notified yet
      const newAlarms = currentAlarms.filter((alarm) => {
        const alarmKey = `${alarm.id}_${alarm.timestamp}`;
        return !this.notifiedAlarms.has(alarmKey) && this.shouldNotifyAlarm(alarm);
      });

      // Send notifications for new alarms
      newAlarms.forEach((alarm) => {
        this.handleNewAlarm(alarm);
      });
    };

    // Set up periodic checking (backup to subscription)
    this.alarmCheckTimer = setInterval(checkForNewAlarms, this.alarmCheckInterval);
  }

  /**
   * Start monitoring for alarms
   */
  private startAlarmMonitoring(): void {
    // Additional monitoring setup could go here
  }

  /**
   * Check if alarm should trigger notification
   */
  private shouldNotifyAlarm(alarm: Alarm): boolean {
    const alarmKey = `${alarm.source}_${alarm.level}`;
    const lastNotificationTime = this.lastNotificationTimes.get(alarmKey) || 0;
    const now = Date.now();

    // Always notify critical alarms
    if (alarm.level === 'critical') {
      return true;
    }

    // Check cooldown for non-critical alarms
    if (now - lastNotificationTime < this.notificationCooldown) {
      return false;
    }

    // Don't notify acknowledged alarms
    if (alarm.acknowledged) {
      return false;
    }

    return true;
  }

  /**
   * Handle new alarm detected in store
   */
  private async handleNewAlarm(alarm: Alarm): Promise<void> {
    try {
      // Mark as notified to prevent duplicates
      const alarmKey = `${alarm.id}_${alarm.timestamp}`;
      this.notifiedAlarms.add(alarmKey);

      // Update last notification time for this alarm type
      const typeKey = `${alarm.source}_${alarm.level}`;
      this.lastNotificationTimes.set(typeKey, Date.now());

      // Convert alarm store alarm to notification data format
      const notificationData = this.convertAlarmToNotificationData(alarm);

      // Get current vessel context from NMEA store
      const vesselContext = this.getCurrentVesselContext();

      // Send notification through notification manager
      await this.notificationManager.sendAlarmNotification(notificationData, vesselContext);

      // Also display in-app toast for immediate user awareness
      this.showAlarmToast(alarm);
    } catch (error) {
      console.error(`[Integration] Failed to handle alarm ${alarm.id}:`, error);
    }
  }

  /**
   * Convert alarm store alarm to notification data format
   */
  private convertAlarmToNotificationData(alarm: Alarm): any {
    return {
      id: alarm.id,
      message: alarm.message,
      level: alarm.level,
      timestamp: alarm.timestamp,
      source: alarm.source,
      value: alarm.value,
      threshold: alarm.threshold,
    };
  }

  /**
   * Display alarm as in-app toast using global toast system
   */
  private showAlarmToast(alarm: Alarm): void {
    const toastStore = useToastStore.getState();

    // Map alarm levels to toast types and priorities
    const getToastConfig = (level: string) => {
      switch (level.toLowerCase()) {
        case 'critical':
          return {
            type: 'alarm' as const,
            priority: 'critical' as const,
            persistent: true,
            action: {
              label: 'Acknowledge',
              action: () => this.acknowledgeAlarm(alarm.id),
            },
          };
        case 'warning':
          return {
            type: 'warning' as const,
            priority: 'high' as const,
            duration: 8000,
          };
        case 'info':
          return {
            type: 'info' as const,
            priority: 'normal' as const,
            duration: 5000,
          };
        default:
          return {
            type: 'error' as const,
            priority: 'normal' as const,
            duration: 6000,
          };
      }
    };

    const config = getToastConfig(alarm.level);

    // Create formatted message with source context
    const message = alarm.source ? `${alarm.source}: ${alarm.message}` : alarm.message;

    // Add toast to global store
    toastStore.addToast({
      ...config,
      message,
      source: 'marine-alarm',
    });
  }

  /**
   * Acknowledge alarm (called from toast action button)
   */
  private acknowledgeAlarm(alarmId: string): void {
    // Here you would implement alarm acknowledgment logic
    // This could involve updating the alarm store, logging, etc.

    // You might want to update the alarm store to mark as acknowledged
    const alarmState = useAlarmStore.getState();
    // alarmState.acknowledgeAlarm?.(alarmId);
  }

  /**
   * Get current vessel context from NMEA data
   */
  private getCurrentVesselContext(): VesselContextData {
    const nmeaState = useNmeaStore.getState();
    const data = nmeaState.nmeaData;

    return {
      position: data.gpsPosition
        ? {
            latitude: data.gpsPosition.latitude,
            longitude: data.gpsPosition.longitude,
            accuracy: data.gpsQuality?.hdop,
          }
        : undefined,
      heading: data.heading,
      speed: data.speed || data.sog,
      depth: data.depth,
      windSpeed: data.windSpeed || data.relativeWindSpeed,
      windDirection: data.windAngle || data.relativeWindAngle,
      engineStatus: this.getEngineStatus(data),
      autopilotStatus: this.getAutopilotStatus(data),
      timestamp: Date.now(),
    };
  }

  /**
   * Determine engine status from NMEA data
   */
  private getEngineStatus(data: any): string {
    if (data.engine?.rpm && data.engine.rpm > 0) {
      return `Running (${data.engine.rpm} RPM)`;
    }

    if (data.engine?.temperature && data.engine.temperature > 60) {
      return 'Warm (Engine Off)';
    }

    return 'Unknown';
  }

  /**
   * Determine autopilot status from NMEA data
   */
  private getAutopilotStatus(data: any): string {
    if (data.autopilot?.engaged) {
      return `Engaged (${data.autopilot.mode || 'Unknown Mode'})`;
    }

    if (data.autopilot?.status) {
      return data.autopilot.status;
    }

    return 'Disconnected';
  }

  /**
   * Initialize background processing integration
   */
  public async initializeBackgroundProcessing(): Promise<void> {
    try {
      // Get NMEA connection from global connection service
      // This would need to be properly imported and initialized
      // TODO: Initialize background manager with NMEA connection
      // await this.backgroundManager.initialize(nmeaConnection);
    } catch (error) {
      console.error('[Integration] Failed to setup background processing:', error);
    }
  }

  /**
   * Handle alarm acknowledgment from notification actions
   */
  public async acknowledgeAlarmFromNotification(alarmId: string): Promise<void> {
    try {
      // Acknowledge in alarm store
      const alarmState = useAlarmStore.getState();
      alarmState.acknowledgeAlarm(alarmId, 'notification_action');

      // Remove from notified set
      const alarm = alarmState.activeAlarms.find((a) => a.id === alarmId);
      if (alarm) {
        const alarmKey = `${alarm.id}_${alarm.timestamp}`;
        this.notifiedAlarms.delete(alarmKey);
      }
    } catch (error) {
      console.error(`[Integration] Failed to acknowledge alarm ${alarmId}:`, error);
    }
  }

  /**
   * Test the integration system
   */
  public async testIntegration(): Promise<{
    success: boolean;
    results: {
      alarmStoreConnected: boolean;
      notificationManagerReady: boolean;
      backgroundProcessingReady: boolean;
      testAlarmSent: boolean;
    };
  }> {
    const results = {
      alarmStoreConnected: false,
      notificationManagerReady: false,
      backgroundProcessingReady: false,
      testAlarmSent: false,
    };

    try {
      // Test alarm store connection
      const alarmState = useAlarmStore.getState();
      results.alarmStoreConnected = Array.isArray(alarmState.activeAlarms);

      // Test notification manager
      const notificationStatus = this.notificationManager.getStatus();
      results.notificationManagerReady = notificationStatus.isInitialized;

      // Test background processing
      const backgroundStatus = this.backgroundManager.getStatus();
      results.backgroundProcessingReady = backgroundStatus.serviceActive;

      // Test sending a notification
      const testAlarm: Alarm = {
        id: 'integration_test',
        message: 'Integration test alarm - system operational',
        level: 'info',
        timestamp: Date.now(),
        source: 'Integration Test',
      };

      await this.handleNewAlarm(testAlarm);
      results.testAlarmSent = true;

      const success = Object.values(results).every((result) => result === true);

      return { success, results };
    } catch (error) {
      console.error('[Integration] Integration test failed:', error);
      return { success: false, results };
    }
  }

  /**
   * Get integration service status
   */
  public getIntegrationStatus(): {
    isInitialized: boolean;
    notifiedAlarmsCount: number;
    lastAlarmCheck: number;
    notificationManagerStatus: any;
    backgroundManagerStatus: any;
  } {
    return {
      isInitialized: this.isInitialized,
      notifiedAlarmsCount: this.notifiedAlarms.size,
      lastAlarmCheck: this.lastAlarmCheck,
      notificationManagerStatus: this.notificationManager.getStatus(),
      backgroundManagerStatus: this.backgroundManager.getStatus(),
    };
  }

  /**
   * Clear notification history and reset tracking
   */
  public clearNotificationTracking(): void {
    this.notifiedAlarms.clear();
    this.lastNotificationTimes.clear();
    this.notificationManager.clearNotificationHistory();
  }

  /**
   * Update integration configuration
   */
  public updateConfiguration(config: {
    alarmCheckInterval?: number;
    notificationCooldown?: number;
  }): void {
    if (config.alarmCheckInterval) {
      this.alarmCheckInterval = config.alarmCheckInterval;

      // Restart timer with new interval
      if (this.alarmCheckTimer) {
        clearInterval(this.alarmCheckTimer);
        this.setupAlarmStoreListeners();
      }
    }

    if (config.notificationCooldown) {
      this.notificationCooldown = config.notificationCooldown;
    }
  }

  /**
   * Cleanup integration service
   */
  public destroy(): void {
    if (this.alarmCheckTimer) {
      clearInterval(this.alarmCheckTimer);
      this.alarmCheckTimer = undefined;
    }

    this.notifiedAlarms.clear();
    this.lastNotificationTimes.clear();

    this.isInitialized = false;
  }
}
