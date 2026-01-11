import { autopilotSafetyManager } from './autopilotSafetyManager';
import { autopilotRetryManager } from './autopilotRetryManager';
import { AutopilotErrorManager } from './autopilotErrorManager';
import { autopilotMonitoringService } from './autopilotMonitoringService';
import { useNmeaStore } from '../store/nmeaStore';
import { log } from '../utils/logging/logger';

/**
 * Connection state for tracking reconnection attempts
 */
export enum ReconnectionState {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed',
}

/**
 * Reconnection strategy configuration
 */
export interface ReconnectionStrategy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  healthCheckIntervalMs: number;
  connectionTimeoutMs: number;
  successThreshold: number; // Consecutive successful checks before considering stable
}

/**
 * Connection health metrics
 */
export interface ConnectionHealth {
  isConnected: boolean;
  lastSuccessfulConnection: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  totalReconnectionAttempts: number;
  averageReconnectionTime: number;
  lastReconnectionAttempt: number;
}

/**
 * AutopilotReconnectionService - Manages automatic reconnection to boat systems
 * Story 3.3 AC8: Automatic reconnection when systems come back online
 */
export class AutopilotReconnectionService {
  private static readonly DEFAULT_STRATEGY: ReconnectionStrategy = {
    maxAttempts: 10,
    baseDelayMs: 2000,
    maxDelayMs: 60000, // 1 minute max delay
    backoffMultiplier: 1.5,
    healthCheckIntervalMs: 5000, // Check every 5 seconds
    connectionTimeoutMs: 10000, // 10 second timeout
    successThreshold: 3, // 3 consecutive successes = stable
  };

  private state = ReconnectionState.CONNECTED;
  private strategy: ReconnectionStrategy;
  private connectionHealth: ConnectionHealth = {
    isConnected: true,
    lastSuccessfulConnection: Date.now(),
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
    totalReconnectionAttempts: 0,
    averageReconnectionTime: 0,
    lastReconnectionAttempt: 0,
  };

  private healthCheckInterval?: ReturnType<typeof setInterval>;
  private reconnectionTimeout?: ReturnType<typeof setTimeout>;
  private reconnectionTimes: number[] = [];
  private connectionTestFunc?: () => Promise<boolean>;

  constructor(strategy?: Partial<ReconnectionStrategy>, connectionTest?: () => Promise<boolean>) {
    this.strategy = { ...AutopilotReconnectionService.DEFAULT_STRATEGY, ...strategy };
    this.connectionTestFunc = connectionTest || this.defaultConnectionTest;
    this.startHealthChecking();
  }

  /**
   * Start continuous health checking
   */
  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.strategy.healthCheckIntervalMs);
  }

  /**
   * Perform connection health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const isHealthy = await this.testConnection();

      if (isHealthy) {
        this.handleSuccessfulHealthCheck();
      } else {
        this.handleFailedHealthCheck();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.app('[Reconnection] Health check error', () => ({
        error: errorMessage,
      }));
      this.handleFailedHealthCheck();
    }
  }

  /**
   * Handle successful health check
   */
  private handleSuccessfulHealthCheck(): void {
    this.connectionHealth.consecutiveSuccesses++;
    this.connectionHealth.consecutiveFailures = 0;
    this.connectionHealth.lastSuccessfulConnection = Date.now();

    if (!this.connectionHealth.isConnected) {
      // Connection restored
      this.connectionHealth.isConnected = true;
      this.state = ReconnectionState.CONNECTED;

      autopilotMonitoringService.logConnectionEvent('connected', {
        reconnectionTime: this.getLastReconnectionTime(),
        totalAttempts: this.connectionHealth.totalReconnectionAttempts,
      });

      this.notifyConnectionRestored();
    }

    // Check if connection is stable
    if (this.connectionHealth.consecutiveSuccesses >= this.strategy.successThreshold) {
      this.onConnectionStabilized();
    }
  }

  /**
   * Handle failed health check
   */
  private handleFailedHealthCheck(): void {
    this.connectionHealth.consecutiveFailures++;
    this.connectionHealth.consecutiveSuccesses = 0;

    if (this.connectionHealth.isConnected) {
      // Connection lost
      this.connectionHealth.isConnected = false;
      this.state = ReconnectionState.DISCONNECTED;

      autopilotMonitoringService.logConnectionEvent('disconnected', {
        consecutiveFailures: this.connectionHealth.consecutiveFailures,
      });

      this.startReconnectionProcess();
    }
  }

  /**
   * Start the reconnection process
   */
  private startReconnectionProcess(): void {
    if (this.state === ReconnectionState.RECONNECTING) {
      return; // Already reconnecting
    }

    this.state = ReconnectionState.RECONNECTING;
    this.connectionHealth.totalReconnectionAttempts = 0;

    autopilotMonitoringService.logConnectionEvent('reconnecting');

    this.attemptReconnection();
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private async attemptReconnection(): Promise<void> {
    if (this.connectionHealth.totalReconnectionAttempts >= this.strategy.maxAttempts) {
      this.handleReconnectionFailure();
      return;
    }

    this.connectionHealth.totalReconnectionAttempts++;
    this.connectionHealth.lastReconnectionAttempt = Date.now();

    const attemptStartTime = Date.now();

    try {
      log.app('[Reconnection] Attempt', () => ({
        attempt: this.connectionHealth.totalReconnectionAttempts,
        maxAttempts: this.strategy.maxAttempts,
      }));

      const result = await autopilotRetryManager.executeWithTimeout(
        () => this.performReconnection(),
        this.strategy.connectionTimeoutMs,
        'connection',
      );

      if (result.success) {
        const reconnectionTime = Date.now() - attemptStartTime;
        this.recordReconnectionTime(reconnectionTime);
        this.onReconnectionSuccess();
        return;
      } else {
        throw new Error(result.error || 'Reconnection failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.app('[Reconnection] Attempt failed', () => ({
        attempt: this.connectionHealth.totalReconnectionAttempts,
        error: errorMessage,
      }));

      // Schedule next attempt with backoff
      const delay = this.calculateReconnectionDelay();

      this.reconnectionTimeout = setTimeout(() => {
        this.attemptReconnection();
      }, delay);
    }
  }

  /**
   * Perform the actual reconnection
   */
  private async performReconnection(): Promise<boolean> {
    // This would be implemented by specific connection services
    // For now, we'll use the connection test
    if (!this.connectionTestFunc) {
      throw new Error('No connection test function available');
    }

    const isConnected = await this.connectionTestFunc();

    if (isConnected) {
      // Update NMEA store connection status
      useNmeaStore.getState().setConnectionStatus('connected');
      return true;
    } else {
      throw new Error('Connection test failed');
    }
  }

  /**
   * Handle successful reconnection
   */
  private onReconnectionSuccess(): void {
    this.connectionHealth.isConnected = true;
    this.connectionHealth.consecutiveFailures = 0;
    this.connectionHealth.consecutiveSuccesses = 1;
    this.state = ReconnectionState.CONNECTED;

    log.app('[Reconnection] Successfully reconnected', () => ({
      attempts: this.connectionHealth.totalReconnectionAttempts,
    }));

    autopilotMonitoringService.logConnectionEvent('connected', {
      attemptsRequired: this.connectionHealth.totalReconnectionAttempts,
      totalTime: this.getLastReconnectionTime(),
    });

    this.notifyConnectionRestored();
    this.restoreSystemState();
  }

  /**
   * Handle reconnection failure after max attempts
   */
  private handleReconnectionFailure(): void {
    this.state = ReconnectionState.FAILED;

    log.app('[Reconnection] Failed to reconnect', () => ({
      maxAttempts: this.strategy.maxAttempts,
    }));

    const error = AutopilotErrorManager.createError('CONN_002', {
      maxAttempts: this.strategy.maxAttempts,
      totalTime: this.getTotalReconnectionTime(),
      lastAttempt: this.connectionHealth.lastReconnectionAttempt,
    });

    AutopilotErrorManager.formatErrorForUser(error);

    // Continue health checking for manual recovery
    this.scheduleRetryAfterDelay();
  }

  /**
   * Schedule retry after extended delay
   */
  private scheduleRetryAfterDelay(): void {
    const extendedDelay = this.strategy.maxDelayMs * 2; // Double max delay

    this.reconnectionTimeout = setTimeout(() => {
      log.app('[Reconnection] Retrying after extended delay');
      this.connectionHealth.totalReconnectionAttempts = 0; // Reset attempt counter
      this.state = ReconnectionState.DISCONNECTED;
      this.startReconnectionProcess();
    }, extendedDelay);
  }

  /**
   * Handle connection stabilization
   */
  private onConnectionStabilized(): void {
    log.app('[Reconnection] Connection stabilized');

    // Clear any retry timeouts
    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
      this.reconnectionTimeout = undefined;
    }
  }

  /**
   * Calculate reconnection delay with exponential backoff
   */
  private calculateReconnectionDelay(): number {
    const attempt = this.connectionHealth.totalReconnectionAttempts;
    const exponentialDelay =
      this.strategy.baseDelayMs * Math.pow(this.strategy.backoffMultiplier, attempt - 1);

    // Cap at maximum delay
    const cappedDelay = Math.min(exponentialDelay, this.strategy.maxDelayMs);

    // Add jitter (±10%)
    const jitter = cappedDelay * 0.1 * (Math.random() * 2 - 1);

    return Math.max(1000, cappedDelay + jitter); // Minimum 1 second
  }

  /**
   * Record reconnection time for metrics
   */
  private recordReconnectionTime(timeMs: number): void {
    this.reconnectionTimes.push(timeMs);

    // Keep only last 10 reconnection times
    if (this.reconnectionTimes.length > 10) {
      this.reconnectionTimes.shift();
    }

    // Update average
    this.connectionHealth.averageReconnectionTime =
      this.reconnectionTimes.reduce((sum, time) => sum + time, 0) / this.reconnectionTimes.length;
  }

  /**
   * Get time for last reconnection attempt
   */
  private getLastReconnectionTime(): number {
    return this.reconnectionTimes.length > 0
      ? this.reconnectionTimes[this.reconnectionTimes.length - 1]
      : 0;
  }

  /**
   * Get total time spent on current reconnection process
   */
  private getTotalReconnectionTime(): number {
    if (this.connectionHealth.lastReconnectionAttempt === 0) {
      return 0;
    }
    return Date.now() - this.connectionHealth.lastReconnectionAttempt;
  }

  /**
   * Notify user of connection restoration
   */
  private notifyConnectionRestored(): void {
    const store = useNmeaStore.getState();

    store.updateAlarms([
      {
        id: `connection_restored_${Date.now()}`,
        message: `Connection restored after ${this.connectionHealth.totalReconnectionAttempts} attempts`,
        level: 'info',
        timestamp: Date.now(),
      },
    ]);
  }

  /**
   * Restore system state after reconnection
   */
  private restoreSystemState(): void {
    // Clear connection-related errors
    useNmeaStore.getState().setLastError(undefined);

    // Allow safety manager to reassess system health
    const healthMetrics = autopilotSafetyManager.getHealthMetrics();
    healthMetrics.connectionStatus = 'healthy';
    healthMetrics.lastDataReceived = Date.now();
  }

  /**
   * Default connection test implementation
   */
  private async defaultConnectionTest(): Promise<boolean> {
    try {
      // Check NMEA store connection status
      const store = useNmeaStore.getState();

      // Simple test: has recent data or connection status is good
      const hasRecentData = store.nmeaData && Object.keys(store.nmeaData).length > 0;
      const connectionGood = store.connectionStatus === 'connected';

      return hasRecentData || connectionGood;
    } catch {
      return false;
    }
  }

  /**
   * Test connection using provided or default test
   */
  private async testConnection(): Promise<boolean> {
    if (!this.connectionTestFunc) {
      return false;
    }

    try {
      return await this.connectionTestFunc();
    } catch {
      return false;
    }
  }

  /**
   * Public API: Force reconnection attempt
   */
  forceReconnection(): void {
    this.connectionHealth.isConnected = false;
    this.state = ReconnectionState.DISCONNECTED;
    this.startReconnectionProcess();
  }

  /**
   * Public API: Set custom connection test function
   */
  setConnectionTest(testFunc: () => Promise<boolean>): void {
    this.connectionTestFunc = testFunc;
  }

  /**
   * Public API: Get current connection health
   */
  getConnectionHealth(): ConnectionHealth & { state: ReconnectionState } {
    return {
      ...this.connectionHealth,
      state: this.state,
    };
  }

  /**
   * Public API: Update reconnection strategy
   */
  updateStrategy(strategy: Partial<ReconnectionStrategy>): void {
    this.strategy = { ...this.strategy, ...strategy };

    // Restart health checking with new interval if changed
    if (strategy.healthCheckIntervalMs && this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.startHealthChecking();
    }
  }

  /**
   * Public API: Pause reconnection attempts
   */
  pauseReconnection(): void {
    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
      this.reconnectionTimeout = undefined;
    }

    if (this.state === ReconnectionState.RECONNECTING) {
      this.state = ReconnectionState.DISCONNECTED;
    }
  }

  /**
   * Public API: Resume reconnection attempts
   */
  resumeReconnection(): void {
    if (this.state === ReconnectionState.DISCONNECTED) {
      this.startReconnectionProcess();
    }
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
      this.reconnectionTimeout = undefined;
    }
  }
}

// Singleton instance for global use
export const autopilotReconnectionService = new AutopilotReconnectionService();
