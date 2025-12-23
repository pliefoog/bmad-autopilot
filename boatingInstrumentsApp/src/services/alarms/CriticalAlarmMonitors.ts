/**
 * Critical Alarm Monitors - Active monitoring for autopilot and GPS failures
 * These systems require active monitoring beyond simple threshold checking
 */

import { CriticalAlarmType } from './types';

interface MonitoringConfig {
  gpsTimeoutMs: number;
  autopilotHeartbeatTimeoutMs: number;
  monitoringIntervalMs: number;
}

interface GPSStatus {
  lastUpdate: number;
  fixType: number;
  satellites: number;
  quality: 'none' | 'poor' | 'good' | 'excellent';
}

interface AutopilotStatus {
  engaged: boolean;
  status: 'active' | 'standby' | 'failed' | 'disconnected';
  lastHeartbeat: number;
  mode?: string;
}

type AlarmCallback = (
  type: CriticalAlarmType,
  data: {
    value: number;
    threshold: number;
    message: string;
    metadata?: any;
  },
) => Promise<void>;

export class CriticalAlarmMonitors {
  private config: MonitoringConfig;
  private onAlarmCallback?: AlarmCallback;
  private monitoringIntervals: NodeJS.Timeout[] = [];

  // Status tracking
  private lastGPSStatus: GPSStatus | null = null;
  private lastAutopilotStatus: AutopilotStatus | null = null;
  private gpsLossAlarmActive = false;
  private autopilotFailureAlarmActive = false;

  constructor(config: Partial<MonitoringConfig> = {}, onAlarmCallback?: AlarmCallback) {
    this.config = {
      gpsTimeoutMs: 60000, // 1 minute without GPS update
      autopilotHeartbeatTimeoutMs: 10000, // 10 seconds without autopilot heartbeat
      monitoringIntervalMs: 5000, // Check every 5 seconds
      ...config,
    };

    this.onAlarmCallback = onAlarmCallback;
  }

  /**
   * Start all critical alarm monitoring
   */
  public startMonitoring(): void {
    this.stopMonitoring(); // Clear any existing intervals

    // GPS monitoring
    const gpsMonitor = setInterval(() => {
      this.checkGPSStatus();
    }, this.config.monitoringIntervalMs);

    // Autopilot monitoring
    const autopilotMonitor = setInterval(() => {
      this.checkAutopilotStatus();
    }, this.config.monitoringIntervalMs);

    this.monitoringIntervals.push(gpsMonitor, autopilotMonitor);
  }

  /**
   * Stop all monitoring
   */
  public stopMonitoring(): void {
    this.monitoringIntervals.forEach((interval) => clearInterval(interval));
    this.monitoringIntervals = [];
  }

  /**
   * Update GPS status from NMEA data
   */
  public updateGPSStatus(gpsData: Partial<GPSStatus>): void {
    this.lastGPSStatus = {
      lastUpdate: Date.now(),
      fixType: gpsData.fixType || 0,
      satellites: gpsData.satellites || 0,
      quality: this.calculateGPSQuality(gpsData.fixType || 0, gpsData.satellites || 0),
      ...gpsData,
    };
  }

  /**
   * Update autopilot status from NMEA data
   */
  public updateAutopilotStatus(autopilotData: Partial<AutopilotStatus>): void {
    this.lastAutopilotStatus = {
      engaged: false,
      status: 'disconnected',
      lastHeartbeat: Date.now(),
      ...this.lastAutopilotStatus,
      ...autopilotData,
    };
  }

  /**
   * Check GPS system status and trigger alarms if needed
   */
  private checkGPSStatus(): void {
    if (!this.lastGPSStatus) {
      // No GPS data received yet - trigger alarm after timeout
      if (!this.gpsLossAlarmActive) {
        this.triggerGPSLossAlarm('No GPS data received', 0, 1);
      }
      return;
    }

    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastGPSStatus.lastUpdate;

    // Check if GPS data is stale
    if (timeSinceLastUpdate > this.config.gpsTimeoutMs) {
      if (!this.gpsLossAlarmActive) {
        const secondsSinceUpdate = Math.floor(timeSinceLastUpdate / 1000);
        this.triggerGPSLossAlarm(
          `GPS signal lost - no update for ${secondsSinceUpdate} seconds`,
          secondsSinceUpdate,
          Math.floor(this.config.gpsTimeoutMs / 1000),
        );
      }
      return;
    }

    // Check GPS quality
    if (this.lastGPSStatus.fixType === 0 || this.lastGPSStatus.quality === 'none') {
      if (!this.gpsLossAlarmActive) {
        this.triggerGPSLossAlarm(
          'GPS fix lost - no position available',
          0, // No fix
          1, // Need fix
        );
      }
      return;
    }

    // GPS is working - clear alarm if it was active
    if (this.gpsLossAlarmActive) {
      this.clearGPSLossAlarm();
    }
  }

  /**
   * Check autopilot system status and trigger alarms if needed
   */
  private checkAutopilotStatus(): void {
    if (!this.lastAutopilotStatus) {
      // No autopilot data - this might be normal if autopilot is not installed
      return;
    }

    const now = Date.now();
    const timeSinceHeartbeat = now - this.lastAutopilotStatus.lastHeartbeat;

    // Only monitor if autopilot is engaged
    if (!this.lastAutopilotStatus.engaged) {
      // Clear alarm if autopilot is intentionally disengaged
      if (this.autopilotFailureAlarmActive) {
        this.clearAutopilotFailureAlarm();
      }
      return;
    }

    // Check for heartbeat timeout when autopilot should be active
    if (timeSinceHeartbeat > this.config.autopilotHeartbeatTimeoutMs) {
      if (!this.autopilotFailureAlarmActive) {
        const secondsSinceHeartbeat = Math.floor(timeSinceHeartbeat / 1000);
        this.triggerAutopilotFailureAlarm(
          `Autopilot communication lost - no response for ${secondsSinceHeartbeat} seconds`,
          secondsSinceHeartbeat,
          Math.floor(this.config.autopilotHeartbeatTimeoutMs / 1000),
        );
      }
      return;
    }

    // Check autopilot status
    if (this.lastAutopilotStatus.status === 'failed') {
      if (!this.autopilotFailureAlarmActive) {
        this.triggerAutopilotFailureAlarm(
          'Autopilot system failure detected - manual steering required',
          1, // Failure state
          1, // Normal operation expected
        );
      }
      return;
    }

    // Autopilot is working - clear alarm if it was active
    if (this.autopilotFailureAlarmActive) {
      this.clearAutopilotFailureAlarm();
    }
  }

  /**
   * Calculate GPS quality based on fix type and satellite count
   */
  private calculateGPSQuality(fixType: number, satellites: number): GPSStatus['quality'] {
    if (fixType === 0 || satellites === 0) return 'none';
    if (fixType === 1 && satellites < 4) return 'poor';
    if (fixType === 1 && satellites >= 4) return 'good';
    if (fixType >= 2) return 'excellent'; // DGPS or better
    return 'poor';
  }

  /**
   * Trigger GPS loss alarm
   */
  private async triggerGPSLossAlarm(
    message: string,
    value: number,
    threshold: number,
  ): Promise<void> {
    this.gpsLossAlarmActive = true;

    if (this.onAlarmCallback) {
      try {
        await this.onAlarmCallback(CriticalAlarmType.GPS_LOSS, {
          value,
          threshold,
          message,
          metadata: {
            lastUpdate: this.lastGPSStatus?.lastUpdate,
            fixType: this.lastGPSStatus?.fixType,
            satellites: this.lastGPSStatus?.satellites,
            quality: this.lastGPSStatus?.quality,
          },
        });
      } catch (error) {
        console.error('CriticalAlarmMonitors: Failed to trigger GPS loss alarm', error);
      }
    }

    console.warn('CriticalAlarmMonitors: GPS loss alarm triggered -', message);
  }

  /**
   * Clear GPS loss alarm
   */
  private clearGPSLossAlarm(): void {
    this.gpsLossAlarmActive = false;
  }

  /**
   * Trigger autopilot failure alarm
   */
  private async triggerAutopilotFailureAlarm(
    message: string,
    value: number,
    threshold: number,
  ): Promise<void> {
    this.autopilotFailureAlarmActive = true;

    if (this.onAlarmCallback) {
      try {
        await this.onAlarmCallback(CriticalAlarmType.AUTOPILOT_FAILURE, {
          value,
          threshold,
          message,
          metadata: {
            engaged: this.lastAutopilotStatus?.engaged,
            status: this.lastAutopilotStatus?.status,
            lastHeartbeat: this.lastAutopilotStatus?.lastHeartbeat,
            mode: this.lastAutopilotStatus?.mode,
          },
        });
      } catch (error) {
        console.error('CriticalAlarmMonitors: Failed to trigger autopilot failure alarm', error);
      }
    }

    console.warn('CriticalAlarmMonitors: Autopilot failure alarm triggered -', message);
  }

  /**
   * Clear autopilot failure alarm
   */
  private clearAutopilotFailureAlarm(): void {
    this.autopilotFailureAlarmActive = false;
  }

  /**
   * Get current monitoring status
   */
  public getMonitoringStatus(): {
    isMonitoring: boolean;
    gpsStatus: GPSStatus | null;
    autopilotStatus: AutopilotStatus | null;
    activeAlarms: {
      gpsLoss: boolean;
      autopilotFailure: boolean;
    };
  } {
    return {
      isMonitoring: this.monitoringIntervals.length > 0,
      gpsStatus: this.lastGPSStatus,
      autopilotStatus: this.lastAutopilotStatus,
      activeAlarms: {
        gpsLoss: this.gpsLossAlarmActive,
        autopilotFailure: this.autopilotFailureAlarmActive,
      },
    };
  }

  /**
   * Update monitoring configuration
   */
  public updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Force check all systems (for testing)
   */
  public forceCheck(): void {
    this.checkGPSStatus();
    this.checkAutopilotStatus();
  }

  /**
   * Reset alarm states (for testing)
   */
  public resetAlarmStates(): void {
    this.gpsLossAlarmActive = false;
    this.autopilotFailureAlarmActive = false;
  }
}
