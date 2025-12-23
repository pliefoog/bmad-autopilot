/**
 * DiagnosticCollector - Collects system diagnostics for troubleshooting
 *
 * Features:
 * - System information collection
 * - Connection log aggregation
 * - Support report generation
 * - Privacy-compliant data handling
 */

import { Platform, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SystemDiagnostics, ConnectionLog, SupportReport } from './types';

const LOG_STORAGE_KEY = '@bmad:connection_logs';
const MAX_LOGS = 1000; // Maximum number of logs to keep
const LOG_RETENTION_DAYS = 7; // Keep logs for 7 days

class DiagnosticCollectorClass {
  private logs: ConnectionLog[] = [];
  private initialized: boolean = false;

  /**
   * Initialize diagnostic collector
   */
  public async initialize(): Promise<void> {
    await this.loadLogs();
    this.initialized = true;
  }

  /**
   * Collect system information
   */
  public collectSystemInfo(): SystemDiagnostics {
    const { width, height } = Dimensions.get('window');

    // Get app version from package.json (would need to be imported)
    const appVersion = '1.0.0'; // TODO: Import from package.json

    const diagnostics: SystemDiagnostics = {
      timestamp: new Date(),
      appVersion,
      platform: Platform.OS as 'ios' | 'android' | 'web',
      platformVersion: Platform.Version.toString(),
      screenSize: { width, height },
      isConnected: false, // TODO: Get from connection manager
    };

    // Platform-specific info
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      // Device model would come from react-native-device-info if installed
      diagnostics.deviceModel = `${Platform.OS} device`;
    }

    return diagnostics;
  }

  /**
   * Log a connection event
   */
  public logConnection(
    type: 'info' | 'warning' | 'error',
    source: string,
    message: string,
    details?: any,
  ): void {
    const log: ConnectionLog = {
      timestamp: new Date(),
      type,
      source,
      message,
      details,
    };

    this.logs.push(log);

    // Trim logs if exceeding maximum
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(-MAX_LOGS);
    }

    // Save logs periodically (debounced)
    this.debouncedSave();

    // Also log to console for debugging
    const logFn =
      type === 'error' ? console.error : type === 'warning' ? console.warn : console.log;
    logFn(`[${source}] ${message}`, details || '');
  }

  /**
   * Get connection logs
   */
  public collectConnectionLogs(limit?: number, sinceHours?: number): ConnectionLog[] {
    let logs = [...this.logs];

    // Filter by time if specified
    if (sinceHours) {
      const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
      logs = logs.filter((log) => log.timestamp >= since);
    }

    // Sort by newest first
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Limit if specified
    if (limit) {
      logs = logs.slice(0, limit);
    }

    return logs;
  }

  /**
   * Generate support report
   */
  public generateSupportReport(
    userDescription?: string,
    category?: 'connection' | 'performance' | 'feature' | 'crash' | 'other',
  ): SupportReport {
    const reportId = `BMAD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const report: SupportReport = {
      reportId,
      generatedAt: new Date(),
      systemInfo: this.collectSystemInfo(),
      connectionLogs: this.collectConnectionLogs(100, 24), // Last 24 hours, max 100
      userDescription,
      category,
    };

    return report;
  }

  /**
   * Export diagnostics as formatted string
   */
  public async exportDiagnostics(): Promise<string> {
    const report = this.generateSupportReport();

    const sections: string[] = [
      '# BMad Autopilot - Diagnostic Report',
      `Report ID: ${report.reportId}`,
      `Generated: ${report.generatedAt.toISOString()}`,
      '',
      '## System Information',
      `App Version: ${report.systemInfo.appVersion}`,
      `Platform: ${report.systemInfo.platform} ${report.systemInfo.platformVersion}`,
      `Device: ${report.systemInfo.deviceModel || 'N/A'}`,
      `Screen: ${report.systemInfo.screenSize.width}x${report.systemInfo.screenSize.height}`,
      `Connected: ${report.systemInfo.isConnected}`,
      `Network: ${report.systemInfo.networkType || 'N/A'}`,
      `Battery: ${report.systemInfo.batteryLevel ? `${report.systemInfo.batteryLevel}%` : 'N/A'}`,
      '',
      '## Connection Logs (Last 24 Hours)',
    ];

    // Add logs
    report.connectionLogs.forEach((log) => {
      const timestamp = log.timestamp.toISOString();
      const details = log.details ? ` | ${JSON.stringify(log.details)}` : '';
      sections.push(
        `[${timestamp}] [${log.type.toUpperCase()}] [${log.source}] ${log.message}${details}`,
      );
    });

    if (report.userDescription) {
      sections.push('', '## User Description', report.userDescription);
    }

    return sections.join('\n');
  }

  /**
   * Clear diagnostic data
   */
  public async clearDiagnosticData(): Promise<void> {
    this.logs = [];
    await AsyncStorage.removeItem(LOG_STORAGE_KEY);
  }

  /**
   * Get statistics about logs
   */
  public getLogStatistics(): {
    total: number;
    errors: number;
    warnings: number;
    infos: number;
    oldestLog?: Date;
    newestLog?: Date;
  } {
    const stats = {
      total: this.logs.length,
      errors: this.logs.filter((l) => l.type === 'error').length,
      warnings: this.logs.filter((l) => l.type === 'warning').length,
      infos: this.logs.filter((l) => l.type === 'info').length,
      oldestLog: this.logs.length > 0 ? this.logs[0].timestamp : undefined,
      newestLog: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : undefined,
    };

    return stats;
  }

  /**
   * Clean up old logs
   */
  private async cleanupOldLogs(): Promise<void> {
    const cutoffDate = new Date(Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const before = this.logs.length;
    this.logs = this.logs.filter((log) => log.timestamp >= cutoffDate);
    const after = this.logs.length;

    if (before !== after) {
      await this.saveLogs();
    }
  }

  /**
   * Load logs from storage
   */
  private async loadLogs(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(LOG_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as ConnectionLog[];
        this.logs = data.map((log) => ({
          ...log,
          timestamp: new Date(log.timestamp),
        }));

        // Clean up old logs on load
        await this.cleanupOldLogs();
      }
    } catch (error) {
      console.error('[DiagnosticCollector] Failed to load logs:', error);
    }
  }

  /**
   * Save logs to storage
   */
  private async saveLogs(): Promise<void> {
    try {
      await AsyncStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error('[DiagnosticCollector] Failed to save logs:', error);
    }
  }

  /**
   * Debounced save (don't save on every log)
   */
  private saveTimer: NodeJS.Timeout | null = null;
  private debouncedSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      this.saveLogs();
      this.saveTimer = null;
    }, 5000); // Save 5 seconds after last log
  }

  /**
   * Check if initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const DiagnosticCollector = new DiagnosticCollectorClass();
export default DiagnosticCollector;
