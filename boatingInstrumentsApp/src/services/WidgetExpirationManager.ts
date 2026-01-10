/**
 * WidgetExpirationManager - Manages widget lifecycle based on sensor data freshness
 *
 * Purpose:
 * - Track sensor data staleness and remove expired widgets
 * - Provide freshness validation for widget creation
 * - Manage expiration timer with dynamic intervals
 *
 * Responsibilities:
 * - Sensor timestamp validation
 * - Required sensor freshness checking
 * - Periodic expiration checks with user preference respect
 * - Timer lifecycle management
 */

import type { SensorData, SensorsData } from '../types/SensorData';
import type { WidgetRegistration } from './WidgetRegistrationService';
import { log } from '../utils/logging/logger';

export class WidgetExpirationManager {
  private sensorDataStalenessThreshold: number = 300000; // 5 minutes default
  private readonly gracePeriod: number = 30000; // 30 seconds grace period
  private expirationCheckTimer: NodeJS.Timeout | null = null;
  private checkCallback: (() => void) | null = null;

  /**
   * Set staleness threshold and restart timer with new interval
   * 
   * @param thresholdMs - Staleness threshold in milliseconds
   */
  setStalenessThreshold(thresholdMs: number): void {
    this.sensorDataStalenessThreshold = thresholdMs;
    log.widgetRegistration('Staleness threshold updated', () => ({
      thresholdMs,
      thresholdMinutes: Math.round(thresholdMs / 60000),
    }));

    this.restartTimer();
  }

  /**
   * Start expiration check timer
   * 
   * @param callback - Function to call on each check interval
   */
  startTimer(callback: () => void): void {
    this.checkCallback = callback;
    this.restartTimer();
  }

  /**
   * Stop expiration check timer
   */
  stopTimer(): void {
    if (this.expirationCheckTimer) {
      clearInterval(this.expirationCheckTimer);
      this.expirationCheckTimer = null;
    }
  }

  /**
   * Restart timer with current threshold settings
   * 
   * @private
   */
  private restartTimer(): void {
    if (!this.checkCallback) return;

    this.stopTimer();

    const checkInterval = Math.max(
      Math.floor(this.sensorDataStalenessThreshold / 4),
      60000
    );

    this.expirationCheckTimer = setInterval(() => {
      this.checkCallback!();
    }, checkInterval);

    log.widgetRegistration('Expiration timer restarted', () => ({
      checkIntervalMs: checkInterval,
      checkIntervalMinutes: Math.round(checkInterval / 60000),
    }));
  }

  /**
   * Check if sensor data is fresh enough for widget creation/retention
   * 
   * @param sensorData - Sensor instance with timestamp
   * @returns true if sensor data is fresh enough
   */
  isSensorDataFresh(sensorData: Partial<SensorData>): boolean {
    const sensorTimestamp = sensorData.timestamp || 0;
    if (sensorTimestamp === 0) return false;

    const now = Date.now();
    const age = now - sensorTimestamp;
    const threshold = this.sensorDataStalenessThreshold + this.gracePeriod;

    return age <= threshold;
  }

  /**
   * Check if all required sensors for a widget have fresh data
   * 
   * @param registration - Widget registration with required sensor list
   * @param instance - Widget instance number
   * @param allSensors - Full sensor state from nmeaStore
   * @param skipFreshnessCheck - If true, only checks existence (initial scan)
   * @returns true if all required sensors have valid AND fresh data
   */
  areRequiredSensorsFresh(
    registration: WidgetRegistration,
    instance: number,
    allSensors: SensorsData,
    skipFreshnessCheck: boolean = false,
  ): boolean {
    return registration.requiredSensors.every((dep) => {
      const targetInstance = dep.instance ?? instance;
      const sensorData = allSensors[dep.sensorType]?.[targetInstance];

      if (!sensorData) return false;

      // Check metric value exists
      const metric = sensorData.getMetric?.(dep.metricName);
      if (!metric || metric.si_value === null || metric.si_value === undefined) {
        return false;
      }

      // Check timestamp freshness (unless skipped for initial scan)
      if (skipFreshnessCheck) return true;
      return this.isSensorDataFresh(sensorData);
    });
  }

  /**
   * Get current staleness threshold
   */
  getStalenessThreshold(): number {
    return this.sensorDataStalenessThreshold;
  }

  /**
   * Get grace period
   */
  getGracePeriod(): number {
    return this.gracePeriod;
  }
}
