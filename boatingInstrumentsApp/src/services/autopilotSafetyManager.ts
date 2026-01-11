import { useNmeaStore } from '../store/nmeaStore';
import { log } from '../utils/logging/logger';

/**
 * Safety event types for autopilot system monitoring
 */
export enum SafetyEventType {
  CONNECTION_LOSS = 'connection_loss',
  AUTOPILOT_FAULT = 'autopilot_fault',
  MANUAL_OVERRIDE = 'manual_override',
  GPS_FAILURE = 'gps_failure',
  COMPASS_FAILURE = 'compass_failure',
  COMMAND_TIMEOUT = 'command_timeout',
  SYSTEM_DEGRADATION = 'system_degradation',
}

/**
 * Safety alert levels matching alarm system
 */
export enum SafetyAlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

/**
 * Safety event interface for logging and monitoring
 */
export interface SafetyEvent {
  id: string;
  type: SafetyEventType;
  level: SafetyAlertLevel;
  message: string;
  timestamp: number;
  data?: any;
  resolved?: boolean;
  resolvedAt?: number;
}

/**
 * System health metrics for monitoring
 */
export interface SystemHealthMetrics {
  connectionStatus: 'healthy' | 'degraded' | 'failed';
  lastDataReceived: number;
  commandResponseTime: number;
  commandSuccessRate: number;
  totalCommands: number;
  failedCommands: number;
  autopilotStatus: 'operational' | 'fault' | 'unknown';
  gpsStatus: 'operational' | 'degraded' | 'failed' | 'unknown';
  compassStatus: 'operational' | 'degraded' | 'failed' | 'unknown';
}

/**
 * AutopilotSafetyManager - Central safety coordinator for autopilot systems
 * Implements Story 3.3 safety and fault handling requirements
 */
export class AutopilotSafetyManager {
  private static readonly CONNECTION_TIMEOUT_MS = 5000;
  private static readonly GPS_TIMEOUT_MS = 10000;
  private static readonly COMPASS_TIMEOUT_MS = 5000;
  private static readonly COMMAND_TIMEOUT_MS = 5000;
  private static readonly MANUAL_OVERRIDE_THRESHOLD = 5; // degrees

  private safetyEvents: SafetyEvent[] = [];
  private healthMetrics: SystemHealthMetrics;
  private monitoringIntervals: ReturnType<typeof setInterval>[] = [];
  private lastKnownHeading?: number;
  private lastManualOverrideCheck = 0;
  private commandHistory: { timestamp: number; success: boolean; responseTime: number }[] = [];

  constructor() {
    this.healthMetrics = {
      connectionStatus: 'healthy',
      lastDataReceived: Date.now(),
      commandResponseTime: 0,
      commandSuccessRate: 100,
      totalCommands: 0,
      failedCommands: 0,
      autopilotStatus: 'unknown',
      gpsStatus: 'unknown',
      compassStatus: 'unknown',
    };

    this.initializeMonitoring();
  }

  /**
   * AC1: Connection loss detection with immediate visual/audio alerts
   */
  private initializeConnectionMonitoring(): void {
    const connectionMonitor = setInterval(() => {
      const store = useNmeaStore.getState();
      const timeSinceLastData = Date.now() - this.healthMetrics.lastDataReceived;

      if (timeSinceLastData > AutopilotSafetyManager.CONNECTION_TIMEOUT_MS) {
        if (this.healthMetrics.connectionStatus === 'healthy') {
          this.raiseEvent({
            id: `connection_loss_${Date.now()}`,
            type: SafetyEventType.CONNECTION_LOSS,
            level: SafetyAlertLevel.CRITICAL,
            message: 'NMEA connection lost - Autopilot unavailable',
            timestamp: Date.now(),
            data: { timeSinceLastData },
          });

          this.healthMetrics.connectionStatus = 'failed';

          // Immediately disengage autopilot for safety
          this.handleConnectionLoss();
        }
      } else if (this.healthMetrics.connectionStatus === 'failed') {
        // Connection restored
        this.resolveConnectionIssues();
      }
    }, 1000);

    this.monitoringIntervals.push(connectionMonitor);
  }

  /**
   * AC3: Autopilot fault detection and user notification
   */
  private initializeAutopilotFaultMonitoring(): void {
    const faultMonitor = setInterval(() => {
      const autopilotData = useNmeaStore.getState().nmeaData.autopilot;

      if (autopilotData) {
        // Check for command timeouts
        if (
          autopilotData.commandStatus === 'sending' &&
          autopilotData.lastCommandTime &&
          Date.now() - autopilotData.lastCommandTime > AutopilotSafetyManager.COMMAND_TIMEOUT_MS
        ) {
          this.raiseEvent({
            id: `command_timeout_${Date.now()}`,
            type: SafetyEventType.COMMAND_TIMEOUT,
            level: SafetyAlertLevel.WARNING,
            message: 'Autopilot command timed out',
            timestamp: Date.now(),
            data: { lastCommandTime: autopilotData.lastCommandTime },
          });

          // Update command status in store
          useNmeaStore.getState().setNmeaData({
            autopilot: { ...autopilotData, commandStatus: 'timeout' },
          });
        }

        // Monitor autopilot status for faults
        if (autopilotData.active && this.detectAutopilotFault(autopilotData)) {
          this.raiseEvent({
            id: `autopilot_fault_${Date.now()}`,
            type: SafetyEventType.AUTOPILOT_FAULT,
            level: SafetyAlertLevel.CRITICAL,
            message: 'Autopilot system fault detected',
            timestamp: Date.now(),
            data: autopilotData,
          });

          this.healthMetrics.autopilotStatus = 'fault';
        }
      }
    }, 1000);

    this.monitoringIntervals.push(faultMonitor);
  }

  /**
   * AC4: Manual override detection (wheel/tiller movement)
   */
  private initializeManualOverrideDetection(): void {
    const overrideMonitor = setInterval(() => {
      const nmeaData = useNmeaStore.getState().nmeaData;
      const autopilotData = nmeaData.autopilot;

      if (autopilotData?.active && nmeaData.heading !== undefined) {
        if (this.lastKnownHeading !== undefined) {
          const headingDifference = Math.abs(nmeaData.heading - this.lastKnownHeading);
          const targetDifference = autopilotData.targetHeading
            ? Math.abs(nmeaData.heading - autopilotData.targetHeading)
            : 0;

          // Detect manual override if heading changes significantly without autopilot command
          if (
            headingDifference > AutopilotSafetyManager.MANUAL_OVERRIDE_THRESHOLD &&
            targetDifference > AutopilotSafetyManager.MANUAL_OVERRIDE_THRESHOLD &&
            Date.now() - this.lastManualOverrideCheck > 5000
          ) {
            const compassInstance = useNmeaStore.getState().getSensorInstance('compass', 0);
            this.raiseEvent({
              id: `manual_override_${Date.now()}`,
              type: SafetyEventType.MANUAL_OVERRIDE,
              level: SafetyAlertLevel.WARNING,
              message: 'Manual steering override detected',
              timestamp: Date.now(),
              data: {
                currentHeading: compassInstance?.getMetric('magneticHeading')?.si_value,
                targetHeading: autopilotData.targetHeading,
                difference: headingDifference,
              },
            });

            this.lastManualOverrideCheck = Date.now();
          }
        }

        this.lastKnownHeading = nmeaData.heading;
      }
    }, 2000);

    this.monitoringIntervals.push(overrideMonitor);
  }

  /**
   * AC5: GPS/compass failure handling
   */
  private initializeNavigationSystemMonitoring(): void {
    const navMonitor = setInterval(() => {
      const nmeaData = useNmeaStore.getState().nmeaData;
      const now = Date.now();

      // GPS monitoring
      if (nmeaData.gpsPosition) {
        this.healthMetrics.lastDataReceived = now;
        if (this.healthMetrics.gpsStatus === 'failed') {
          this.resolveGpsFailure();
        }
      } else if (
        now - this.healthMetrics.lastDataReceived >
        AutopilotSafetyManager.GPS_TIMEOUT_MS
      ) {
        if (this.healthMetrics.gpsStatus !== 'failed') {
          this.raiseEvent({
            id: `gps_failure_${now}`,
            type: SafetyEventType.GPS_FAILURE,
            level: SafetyAlertLevel.CRITICAL,
            message: 'GPS signal lost - Navigation unreliable',
            timestamp: now,
          });
          this.healthMetrics.gpsStatus = 'failed';
        }
      }

      // Compass monitoring
      if (nmeaData.heading !== undefined) {
        if (this.healthMetrics.compassStatus === 'failed') {
          this.resolveCompassFailure();
        }
      } else if (this.healthMetrics.compassStatus !== 'failed') {
        this.raiseEvent({
          id: `compass_failure_${now}`,
          type: SafetyEventType.COMPASS_FAILURE,
          level: SafetyAlertLevel.CRITICAL,
          message: 'Compass data unavailable - Autopilot unreliable',
          timestamp: now,
        });
        this.healthMetrics.compassStatus = 'failed';
      }
    }, 2000);

    this.monitoringIntervals.push(navMonitor);
  }

  /**
   * Initialize all monitoring systems
   */
  private initializeMonitoring(): void {
    this.initializeConnectionMonitoring();
    this.initializeAutopilotFaultMonitoring();
    this.initializeManualOverrideDetection();
    this.initializeNavigationSystemMonitoring();
  }

  /**
   * Detect autopilot fault conditions
   */
  private detectAutopilotFault(autopilotData: any): boolean {
    // Check for inconsistent autopilot state
    if (autopilotData.active && !autopilotData.targetHeading) {
      return true;
    }

    // Check for excessive rudder position without course correction
    if (autopilotData.rudderPosition && Math.abs(autopilotData.rudderPosition) > 20) {
      return true;
    }

    // Check for high rate of turn without heading change
    if (autopilotData.rateOfTurn && Math.abs(autopilotData.rateOfTurn) > 5) {
      return true;
    }

    return false;
  }

  /**
   * Handle connection loss scenario
   */
  private handleConnectionLoss(): void {
    const store = useNmeaStore.getState();

    // Immediately set autopilot to inactive for safety
    store.setNmeaData({
      autopilot: {
        ...store.nmeaData.autopilot,
        active: false,
        commandStatus: 'error',
        commandMessage: 'Connection lost - Autopilot disengaged',
      },
    });

    // Update connection status
    store.setConnectionStatus('disconnected');
  }

  /**
   * Resolve connection issues when connection is restored
   */
  private resolveConnectionIssues(): void {
    this.healthMetrics.connectionStatus = 'healthy';
    this.healthMetrics.lastDataReceived = Date.now();

    // Resolve related safety events
    this.resolveSafetyEvents(SafetyEventType.CONNECTION_LOSS);

    useNmeaStore.getState().setConnectionStatus('connected');
  }

  /**
   * Resolve GPS failure when signal is restored
   */
  private resolveGpsFailure(): void {
    this.healthMetrics.gpsStatus = 'operational';
    this.resolveSafetyEvents(SafetyEventType.GPS_FAILURE);
  }

  /**
   * Resolve compass failure when data is restored
   */
  private resolveCompassFailure(): void {
    this.healthMetrics.compassStatus = 'operational';
    this.resolveSafetyEvents(SafetyEventType.COMPASS_FAILURE);
  }

  /**
   * Raise a safety event and trigger alerts
   */
  private raiseEvent(event: SafetyEvent): void {
    this.safetyEvents.push(event);

    // Add to NMEA store alarms
    useNmeaStore.getState().updateAlarms([
      {
        id: event.id,
        message: event.message,
        level: event.level,
        timestamp: event.timestamp,
      },
    ]);

    // Log to conditional logger for debugging
    log.app('[AutopilotSafety] Safety event', () => ({
      type: event.type,
      message: event.message,
      data: event.data,
    }));
  }

  /**
   * Resolve safety events of a specific type
   */
  private resolveSafetyEvents(eventType: SafetyEventType): void {
    const now = Date.now();
    this.safetyEvents
      .filter((event) => event.type === eventType && !event.resolved)
      .forEach((event) => {
        event.resolved = true;
        event.resolvedAt = now;
      });
  }

  /**
   * Public API: Record command execution for metrics
   */
  recordCommandExecution(success: boolean, responseTime: number): void {
    this.commandHistory.push({
      timestamp: Date.now(),
      success,
      responseTime,
    });

    // Keep only last 100 commands for metrics
    if (this.commandHistory.length > 100) {
      this.commandHistory.shift();
    }

    // Update metrics
    this.healthMetrics.totalCommands++;
    if (!success) {
      this.healthMetrics.failedCommands++;
    }

    this.healthMetrics.commandSuccessRate =
      ((this.healthMetrics.totalCommands - this.healthMetrics.failedCommands) /
        this.healthMetrics.totalCommands) *
      100;

    this.healthMetrics.commandResponseTime = responseTime;
  }

  /**
   * Public API: Get current system health metrics
   */
  getHealthMetrics(): SystemHealthMetrics {
    return { ...this.healthMetrics };
  }

  /**
   * Public API: Get safety events (optionally filtered)
   */
  getSafetyEvents(resolved?: boolean): SafetyEvent[] {
    if (resolved !== undefined) {
      return this.safetyEvents.filter((event) => event.resolved === resolved);
    }
    return [...this.safetyEvents];
  }

  /**
   * Public API: Clear resolved safety events older than specified time
   */
  clearOldEvents(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - olderThanMs;
    this.safetyEvents = this.safetyEvents.filter(
      (event) => !event.resolved || (event.resolvedAt && event.resolvedAt > cutoff),
    );
  }

  /**
   * Cleanup method to stop all monitoring
   */
  destroy(): void {
    this.monitoringIntervals.forEach((interval) => clearInterval(interval));
    this.monitoringIntervals = [];
  }
}

// Singleton instance for global use
export const autopilotSafetyManager = new AutopilotSafetyManager();
