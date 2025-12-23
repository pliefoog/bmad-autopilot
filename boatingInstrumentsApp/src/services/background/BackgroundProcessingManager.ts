import { AppState, AppStateStatus, Platform } from 'react-native';
import { useNmeaStore } from '../../store/nmeaStore';
import { useAlarmStore } from '../../store/alarmStore';
import { NmeaService } from '../nmea/NmeaService';
import { NotificationManager } from '../notifications/NotificationManager';

export interface BackgroundServiceConfig {
  enabled: boolean;
  batteryOptimization: boolean;
  processingSamplingRate: number; // ms between NMEA data processing when backgrounded
  heartbeatInterval: number; // ms between system health checks
  maxBackgroundDuration: number; // ms before forcing reconnection (iOS constraint)
}

export interface BackgroundProcessingState {
  isBackgrounded: boolean;
  serviceActive: boolean;
  lastProcessingTime: number;
  connectionMaintained: boolean;
  batteryLevel?: number;
  processingRate: number; // current sampling rate
}

/**
 * Manages background processing for marine instrument monitoring
 * Ensures critical alarm detection continues when app is backgrounded
 * Implements platform-specific background modes and optimizations
 */
export class BackgroundProcessingManager {
  private static instance: BackgroundProcessingManager;

  private config: BackgroundServiceConfig;
  private state: BackgroundProcessingState;
  private nmeaService: NmeaService | null = null;
  private notificationManager: NotificationManager;

  // Timers for background operations
  private processingTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  // App state listener
  private appStateSubscription: any = null;

  private constructor(config: Partial<BackgroundServiceConfig> = {}) {
    this.config = {
      enabled: true,
      batteryOptimization: true,
      processingSamplingRate: 2000, // 2 seconds when backgrounded (vs 1s foreground)
      heartbeatInterval: 30000, // 30 seconds
      maxBackgroundDuration: 180000, // 3 minutes (iOS constraint)
      ...config,
    };

    this.state = {
      isBackgrounded: false,
      serviceActive: false,
      lastProcessingTime: Date.now(),
      connectionMaintained: false,
      processingRate: 1000, // Start with foreground rate
    };

    this.notificationManager = NotificationManager.getInstance();

    this.setupAppStateListener();
  }

  public static getInstance(
    config?: Partial<BackgroundServiceConfig>,
  ): BackgroundProcessingManager {
    if (!BackgroundProcessingManager.instance) {
      BackgroundProcessingManager.instance = new BackgroundProcessingManager(config);
    }
    return BackgroundProcessingManager.instance;
  }

  /**
   * Initialize background processing system
   */
  public async initialize(nmeaService: NmeaService): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    this.nmeaService = nmeaService;

    // Initialize notification system for background alerts
    await this.notificationManager.initialize();

    // Request background permissions if needed
    await this.requestBackgroundPermissions();

    this.state.serviceActive = true;
  }

  /**
   * Request platform-specific background permissions
   */
  private async requestBackgroundPermissions(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        // iOS: Request background app refresh and critical alert permissions
        // This would typically be done through native modules
        // TODO: Implement native iOS background permission request
      } else if (Platform.OS === 'android') {
        // Android: Request battery optimization exemption and notification permissions
        // TODO: Implement native Android battery optimization request
      }
    } catch (error) {
      console.error('[Background] Failed to request background permissions:', error);
    }
  }

  /**
   * Setup AppState listener to handle foreground/background transitions
   */
  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this),
    );
  }

  /**
   * Handle app state changes (foreground/background/inactive)
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    const previousState = this.state.isBackgrounded;

    if (nextAppState === 'background') {
      this.state.isBackgrounded = true;
      if (!previousState) {
        this.startBackgroundProcessing();
      }
    } else if (nextAppState === 'active') {
      this.state.isBackgrounded = false;
      if (previousState) {
        this.stopBackgroundProcessing();
      }
    }
    // 'inactive' state (iOS transition state) - no action needed
  }

  /**
   * Start background processing when app is backgrounded
   */
  private startBackgroundProcessing(): void {
    if (!this.config.enabled || !this.nmeaService) {
      return;
    }

    // Switch to reduced processing rate for battery conservation
    this.state.processingRate = this.config.processingSamplingRate;

    // Start background NMEA monitoring with reduced frequency
    this.processingTimer = setInterval(() => {
      this.processBackgroundData();
    }, this.state.processingRate);

    // Start heartbeat for connection health monitoring
    this.heartbeatTimer = setInterval(() => {
      this.performHeartbeat();
    }, this.config.heartbeatInterval);

    // Set maximum background duration timer (iOS constraint)
    this.reconnectTimer = setTimeout(() => {
      this.handleMaxBackgroundDuration();
    }, this.config.maxBackgroundDuration);
  }

  /**
   * Stop background processing when app returns to foreground
   */
  private stopBackgroundProcessing(): void {
    // Clear all background timers
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Return to normal processing rate
    this.state.processingRate = 1000; // Normal foreground rate
  }

  /**
   * Process NMEA data in background mode with reduced frequency
   */
  private processBackgroundData(): void {
    if (!this.nmeaService || !this.state.isBackgrounded) {
      return;
    }

    try {
      // Get current NMEA data from store
      const nmeaData = useNmeaStore.getState().nmeaData;
      const { evaluateThresholds, getUnacknowledgedAlarms } = useAlarmStore.getState();

      // Evaluate alarm thresholds with current data
      evaluateThresholds(nmeaData);

      // Check for new critical alarms
      const unacknowledgedAlarms = getUnacknowledgedAlarms();
      const criticalAlarms = unacknowledgedAlarms.filter(
        (alarm) => alarm.level === 'critical' && Date.now() - alarm.timestamp < 5000, // New alarms within last 5 seconds
      );

      // Send background notifications for critical alarms
      if (criticalAlarms.length > 0) {
        this.handleBackgroundAlarms(criticalAlarms);
      }

      this.state.lastProcessingTime = Date.now();
    } catch (error) {
      console.error('[Background] Error processing background data:', error);
    }
  }

  /**
   * Handle critical alarms detected in background
   */
  private async handleBackgroundAlarms(alarms: any[]): Promise<void> {
    for (const alarm of alarms) {
      try {
        await this.notificationManager.sendCriticalAlarmNotification(alarm);
      } catch (error) {
        console.error(`[Background] Failed to send notification for alarm ${alarm.id}:`, error);
      }
    }
  }

  /**
   * Perform periodic health checks in background
   */
  private performHeartbeat(): void {
    if (!this.state.isBackgrounded) {
      return;
    }

    const now = Date.now();
    const connectionStatus = useNmeaStore.getState().connectionStatus;

    // Check connection health
    this.state.connectionMaintained = connectionStatus === 'connected';

    // Monitor processing delay
    const processingDelay = now - this.state.lastProcessingTime;
    if (processingDelay > this.config.processingSamplingRate * 2) {
      console.warn(`[Background] Processing delay detected: ${processingDelay}ms`);
    }

    // Battery level monitoring (if available)
    this.updateBatteryStatus();

    // Adjust processing rate based on battery level
    this.optimizeForBattery();
  }

  /**
   * Update battery status for optimization decisions
   */
  private updateBatteryStatus(): void {
    // Battery level would be retrieved from native modules in production
    // For now, simulate battery monitoring
    if (this.config.batteryOptimization) {
      // TODO: Implement actual battery level monitoring
      // this.state.batteryLevel = await getBatteryLevel();
    }
  }

  /**
   * Optimize processing based on battery level
   */
  private optimizeForBattery(): void {
    if (!this.config.batteryOptimization || !this.state.batteryLevel) {
      return;
    }

    // Increase processing interval if battery is low
    if (this.state.batteryLevel < 20) {
      this.state.processingRate = Math.min(this.config.processingSamplingRate * 2, 5000);
    } else if (this.state.batteryLevel < 50) {
      this.state.processingRate = Math.min(this.config.processingSamplingRate * 1.5, 3000);
    } else {
      this.state.processingRate = this.config.processingSamplingRate;
    }
  }

  /**
   * Handle maximum background duration reached (iOS constraint)
   */
  private handleMaxBackgroundDuration(): void {
    // For iOS, we need to prepare for system suspension
    // Save critical state and prepare for reconnection when app becomes active

    if (Platform.OS === 'ios') {
      // iOS: Prepare for app suspension
      this.prepareForSuspension();
    } else {
      // Android: Continue with foreground service (if properly configured)
    }
  }

  /**
   * Prepare for app suspension on iOS
   */
  private prepareForSuspension(): void {
    // Save critical alarm state
    const alarmState = useAlarmStore.getState();
    const criticalAlarms = alarmState
      .getUnacknowledgedAlarms()
      .filter((alarm) => alarm.level === 'critical');

    if (criticalAlarms.length > 0) {
      // Schedule local notifications for critical alarms
      criticalAlarms.forEach((alarm) => {
        this.notificationManager.scheduleLocalAlarmNotification(alarm);
      });
    }

    // Reduce processing to minimum
    this.state.processingRate = 10000; // 10 seconds
  }

  /**
   * Get current background processing status
   */
  public getStatus(): BackgroundProcessingState & { config: BackgroundServiceConfig } {
    return {
      ...this.state,
      config: this.config,
    };
  }

  /**
   * Update background processing configuration
   */
  public updateConfig(newConfig: Partial<BackgroundServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Apply new configuration if currently running
    if (this.state.isBackgrounded && this.state.serviceActive) {
      this.stopBackgroundProcessing();
      this.startBackgroundProcessing();
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stopBackgroundProcessing();

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.state.serviceActive = false;
  }
}
