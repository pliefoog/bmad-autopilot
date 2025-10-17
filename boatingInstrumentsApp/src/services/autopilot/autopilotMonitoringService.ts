import { SafetyEvent, SystemHealthMetrics } from './autopilotSafetyManager';
import { ErrorMessage } from './autopilotErrorManager';
import { QueuedCommand } from './autopilotCommandQueue';

/**
 * Log levels for different types of events
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Event types for monitoring
 */
export enum EventType {
  COMMAND = 'command',
  SAFETY = 'safety',
  CONNECTION = 'connection',
  SYSTEM = 'system',
  USER = 'user',
  PERFORMANCE = 'performance'
}

/**
 * Log entry interface
 */
export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  eventType: EventType;
  message: string;
  data?: any;
  context?: {
    userId?: string;
    sessionId?: string;
    version?: string;
    platform?: string;
  };
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  timestamp: number;
  commandResponseTimes: {
    average: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  };
  systemHealth: {
    cpuUsage?: number;
    memoryUsage?: number;
    networkLatency: number;
    dataProcessingRate: number; // NMEA messages per second
  };
  errorRates: {
    total: number;
    byCategory: { [key: string]: number };
    successRate: number;
  };
  connectionStats: {
    uptime: number;
    reconnections: number;
    dataGaps: number;
    averageSignalStrength?: number;
  };
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  maxLogEntries: number;
  logRetentionMs: number;
  metricsIntervalMs: number;
  performanceWindowMs: number;
  enableDebugLogs: boolean;
  enablePerformanceMonitoring: boolean;
}

/**
 * AutopilotMonitoringService - Comprehensive monitoring and logging
 * Story 3.3 AC11-14: Real-time monitoring, logging, and performance metrics
 */
export class AutopilotMonitoringService {
  private static readonly DEFAULT_CONFIG: MonitoringConfig = {
    maxLogEntries: 10000,
    logRetentionMs: 24 * 60 * 60 * 1000, // 24 hours
    metricsIntervalMs: 30000, // 30 seconds
    performanceWindowMs: 5 * 60 * 1000, // 5 minutes
    enableDebugLogs: false,
    enablePerformanceMonitoring: true
  };

  private logEntries: LogEntry[] = [];
  private performanceHistory: PerformanceMetrics[] = [];
  private config: MonitoringConfig;
  private sessionId: string;
  private startTime: number;
  private metricsInterval?: ReturnType<typeof setInterval>;
  
  // Performance tracking
  private commandTimes: number[] = [];
  private errorCounts: { [key: string]: number } = {};
  private totalCommands = 0;
  private successfulCommands = 0;
  private reconnectionCount = 0;
  private dataGapCount = 0;
  private lastDataReceived = 0;

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = { ...AutopilotMonitoringService.DEFAULT_CONFIG, ...config };
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.startTime = Date.now();
    
    if (this.config.enablePerformanceMonitoring) {
      this.startPerformanceMonitoring();
    }

    this.log(LogLevel.INFO, EventType.SYSTEM, 'Monitoring service started', {
      sessionId: this.sessionId,
      config: this.config
    });
  }

  /**
   * AC11: Real-time autopilot system health monitoring
   */
  monitorSystemHealth(healthMetrics: SystemHealthMetrics): void {
    // Log health status changes
    if (healthMetrics.connectionStatus === 'failed') {
      this.log(LogLevel.CRITICAL, EventType.CONNECTION, 'System connection failed', healthMetrics);
    } else if (healthMetrics.connectionStatus === 'degraded') {
      this.log(LogLevel.WARN, EventType.CONNECTION, 'System connection degraded', healthMetrics);
    }

    if (healthMetrics.autopilotStatus === 'fault') {
      this.log(LogLevel.CRITICAL, EventType.SAFETY, 'Autopilot system fault detected', healthMetrics);
    }

    if (healthMetrics.gpsStatus === 'failed') {
      this.log(LogLevel.ERROR, EventType.SYSTEM, 'GPS system failure', healthMetrics);
    }

    if (healthMetrics.compassStatus === 'failed') {
      this.log(LogLevel.ERROR, EventType.SYSTEM, 'Compass system failure', healthMetrics);
    }

    // Track performance metrics
    if (healthMetrics.commandResponseTime > 0) {
      this.recordCommandResponseTime(healthMetrics.commandResponseTime);
    }

    this.recordSystemMetrics(healthMetrics);
  }

  /**
   * AC12: Command/response logging for troubleshooting
   */
  logCommand(command: QueuedCommand, result?: { success: boolean; error?: string; responseTime: number }): void {
    const logData = {
      commandId: command.id,
      command: command.command,
      params: command.params,
      priority: command.priority,
      status: command.status,
      createdAt: command.createdAt,
      retryCount: command.retryCount
    };

    if (result) {
      const level = result.success ? LogLevel.INFO : LogLevel.ERROR;
      this.log(level, EventType.COMMAND, 
        `Command ${command.command} ${result.success ? 'completed' : 'failed'}`,
        { ...logData, result }
      );

      // Track command statistics
      this.totalCommands++;
      if (result.success) {
        this.successfulCommands++;
      }
      
      this.recordCommandResponseTime(result.responseTime);
    } else {
      this.log(LogLevel.DEBUG, EventType.COMMAND, `Command ${command.command} queued`, logData);
    }
  }

  /**
   * AC13: Error event logging with timestamps
   */
  logError(error: ErrorMessage): void {
    this.log(
      this.mapErrorSeverityToLogLevel(error.severity),
      EventType.SAFETY,
      `${error.title}: ${error.message}`,
      {
        errorCode: error.code,
        category: error.category,
        cause: error.cause,
        solution: error.solution,
        errorData: error.data
      }
    );

    // Track error statistics
    this.errorCounts[error.code] = (this.errorCounts[error.code] || 0) + 1;
    this.errorCounts['total'] = (this.errorCounts['total'] || 0) + 1;
  }

  /**
   * Log safety events
   */
  logSafetyEvent(event: SafetyEvent): void {
    const level = event.level === 'critical' ? LogLevel.CRITICAL : 
                  event.level === 'warning' ? LogLevel.WARN : LogLevel.INFO;
    
    this.log(level, EventType.SAFETY, `Safety event: ${event.message}`, {
      eventId: event.id,
      eventType: event.type,
      eventData: event.data,
      resolved: event.resolved,
      resolvedAt: event.resolvedAt
    });
  }

  /**
   * Log user actions
   */
  logUserAction(action: string, data?: any): void {
    this.log(LogLevel.INFO, EventType.USER, `User action: ${action}`, data);
  }

  /**
   * Log connection events
   */
  logConnectionEvent(event: 'connected' | 'disconnected' | 'reconnecting' | 'data_gap', data?: any): void {
    const level = event === 'disconnected' ? LogLevel.ERROR : 
                  event === 'data_gap' ? LogLevel.WARN : LogLevel.INFO;
    
    this.log(level, EventType.CONNECTION, `Connection event: ${event}`, data);

    if (event === 'reconnecting') {
      this.reconnectionCount++;
    } else if (event === 'data_gap') {
      this.dataGapCount++;
    } else if (event === 'connected') {
      this.lastDataReceived = Date.now();
    }
  }

  /**
   * AC14: Performance metrics tracking
   */
  recordCommandResponseTime(responseTime: number): void {
    this.commandTimes.push(responseTime);
    
    // Keep only recent command times (last 5 minutes)
    const cutoffTime = Date.now() - this.config.performanceWindowMs;
    this.commandTimes = this.commandTimes.slice(-1000); // Keep max 1000 entries
  }

  /**
   * Record system performance metrics
   */
  recordSystemMetrics(healthMetrics: SystemHealthMetrics): void {
    // This would typically integrate with system monitoring APIs
    // For now, we'll track what we have from the health metrics
    
    const networkLatency = healthMetrics.commandResponseTime;
    const dataProcessingRate = this.calculateDataProcessingRate();
    
    this.log(LogLevel.DEBUG, EventType.PERFORMANCE, 'System metrics recorded', {
      networkLatency,
      dataProcessingRate,
      commandSuccessRate: healthMetrics.commandSuccessRate,
      totalCommands: healthMetrics.totalCommands,
      failedCommands: healthMetrics.failedCommands
    });
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const now = Date.now();
    const recentTimes = this.commandTimes.filter(time => time > 0);
    
    const commandResponseTimes = {
      average: recentTimes.length > 0 ? recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length : 0,
      min: recentTimes.length > 0 ? Math.min(...recentTimes) : 0,
      max: recentTimes.length > 0 ? Math.max(...recentTimes) : 0,
      p95: this.calculatePercentile(recentTimes, 95),
      p99: this.calculatePercentile(recentTimes, 99)
    };

    const successRate = this.totalCommands > 0 ? 
      (this.successfulCommands / this.totalCommands) * 100 : 100;

    return {
      timestamp: now,
      commandResponseTimes,
      systemHealth: {
        networkLatency: commandResponseTimes.average,
        dataProcessingRate: this.calculateDataProcessingRate()
      },
      errorRates: {
        total: this.errorCounts['total'] || 0,
        byCategory: { ...this.errorCounts },
        successRate
      },
      connectionStats: {
        uptime: now - this.startTime,
        reconnections: this.reconnectionCount,
        dataGaps: this.dataGapCount
      }
    };
  }

  /**
   * Get filtered log entries
   */
  getLogs(
    level?: LogLevel,
    eventType?: EventType,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): LogEntry[] {
    let filtered = this.logEntries;

    if (level) {
      filtered = filtered.filter(entry => entry.level === level);
    }

    if (eventType) {
      filtered = filtered.filter(entry => entry.eventType === eventType);
    }

    if (startTime) {
      filtered = filtered.filter(entry => entry.timestamp >= startTime);
    }

    if (endTime) {
      filtered = filtered.filter(entry => entry.timestamp <= endTime);
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(minutes?: number): PerformanceMetrics[] {
    if (minutes) {
      const cutoff = Date.now() - (minutes * 60 * 1000);
      return this.performanceHistory.filter(metric => metric.timestamp >= cutoff);
    }
    return [...this.performanceHistory];
  }

  /**
   * Export logs for analysis
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.exportLogsAsCsv();
    }
    
    return JSON.stringify({
      sessionId: this.sessionId,
      exportedAt: Date.now(),
      totalEntries: this.logEntries.length,
      config: this.config,
      logs: this.logEntries
    }, null, 2);
  }

  /**
   * Clear old log entries
   */
  cleanup(): void {
    const cutoff = Date.now() - this.config.logRetentionMs;
    
    const originalCount = this.logEntries.length;
    this.logEntries = this.logEntries.filter(entry => entry.timestamp >= cutoff);
    
    const removedCount = originalCount - this.logEntries.length;
    if (removedCount > 0) {
      this.log(LogLevel.INFO, EventType.SYSTEM, `Cleaned up ${removedCount} old log entries`);
    }

    // Also cleanup performance history
    this.performanceHistory = this.performanceHistory.filter(metric => metric.timestamp >= cutoff);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, eventType: EventType, message: string, data?: any): void {
    if (!this.config.enableDebugLogs && level === LogLevel.DEBUG) {
      return;
    }

    const logEntry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      eventType,
      message,
      data,
      context: {
        sessionId: this.sessionId,
        version: '1.0.0', // Would come from app config
        platform: 'mobile' // Would be detected
      }
    };

    this.logEntries.push(logEntry);

    // Prevent memory overflow
    if (this.logEntries.length > this.config.maxLogEntries) {
      this.logEntries.shift();
    }

    // Console output for development
    const consoleMethods = {
      [LogLevel.DEBUG]: console.debug,
      [LogLevel.INFO]: console.info,
      [LogLevel.WARN]: console.warn,
      [LogLevel.ERROR]: console.error,
      [LogLevel.CRITICAL]: console.error
    };

    consoleMethods[level](`[${eventType}] ${message}`, data);
  }

  /**
   * Start performance monitoring interval
   */
  private startPerformanceMonitoring(): void {
    this.metricsInterval = setInterval(() => {
      const metrics = this.getPerformanceMetrics();
      this.performanceHistory.push(metrics);
      
      // Keep only recent history
      const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
      this.performanceHistory = this.performanceHistory.filter(m => m.timestamp >= cutoff);
      
    }, this.config.metricsIntervalMs);
  }

  /**
   * Calculate data processing rate (messages per second)
   */
  private calculateDataProcessingRate(): number {
    // This would integrate with NMEA connection to get actual message rate
    // For now, return a placeholder
    return 0;
  }

  /**
   * Calculate percentile from array of numbers
   */
  private calculatePercentile(numbers: number[], percentile: number): number {
    if (numbers.length === 0) return 0;
    
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Map error severity to log level
   */
  private mapErrorSeverityToLogLevel(severity: string): LogLevel {
    switch (severity) {
      case 'critical': return LogLevel.CRITICAL;
      case 'error': return LogLevel.ERROR;
      case 'warning': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      default: return LogLevel.INFO;
    }
  }

  /**
   * Export logs as CSV format
   */
  private exportLogsAsCsv(): string {
    const headers = ['timestamp', 'level', 'eventType', 'message', 'data'];
    const rows = this.logEntries.map(entry => [
      new Date(entry.timestamp).toISOString(),
      entry.level,
      entry.eventType,
      entry.message.replace(/"/g, '""'), // Escape quotes
      JSON.stringify(entry.data || {}).replace(/"/g, '""')
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }
    
    this.log(LogLevel.INFO, EventType.SYSTEM, 'Monitoring service stopped');
  }
}

// Singleton instance for global use
export const autopilotMonitoringService = new AutopilotMonitoringService();