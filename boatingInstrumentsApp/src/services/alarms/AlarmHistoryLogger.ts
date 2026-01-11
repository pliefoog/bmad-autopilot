/**
 * AlarmHistoryLogger - Critical alarm event logging for marine incident documentation
 * Maintains detailed records for marine safety compliance and incident analysis
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../../utils/logging/logger';
import {
  CriticalAlarmEvent,
  AlarmHistoryEntry,
  AlarmEscalationLevel,
  AlarmPerformanceMetrics,
} from './types';

export interface AlarmHistoryConfig {
  maxHistoryEntries: number;
  storageKey: string;
  includeVesselState: boolean;
  includePerformanceMetrics: boolean;
  autoExportInterval?: number; // milliseconds
  exportFormat: 'json' | 'csv' | 'maritime-xml';
}

export class AlarmHistoryLogger {
  private config: AlarmHistoryConfig;
  private historyCache: AlarmHistoryEntry[] = [];
  private performanceMetrics: AlarmPerformanceMetrics;

  constructor(config?: Partial<AlarmHistoryConfig>) {
    this.config = {
      maxHistoryEntries: 10000,
      storageKey: 'marine-alarm-history',
      includeVesselState: true,
      includePerformanceMetrics: true,
      exportFormat: 'json',
      ...config,
    };

    this.performanceMetrics = this.initializePerformanceMetrics();
    this.loadHistoryFromStorage();
  }

  /**
   * Log critical alarm event with marine safety context
   */
  public async logCriticalAlarm(alarmEvent: CriticalAlarmEvent): Promise<void> {
    try {
      const historyEntry: AlarmHistoryEntry = {
        id: `history-${alarmEvent.id}`,
        alarmEvent,
        startTime: alarmEvent.detectedAt,
        responseTime: 0, // Will be updated when acknowledged
        escalationCount: 0,
        acknowledgedBy: '',
        acknowledgmentMethod: '',
        falsePositive: false,
        falseNegative: false,
        complianceIssues: [],
        vesselState: await this.getCurrentVesselState(),
        relatedAlarms: this.findRelatedAlarms(alarmEvent),
        cascadeEffects: [],
      };

      // Add to cache and persistent storage
      this.historyCache.push(historyEntry);
      await this.saveHistoryToStorage();

      // Update performance metrics
      this.updatePerformanceMetrics(historyEntry);
    } catch (error) {
      log.app('AlarmHistoryLogger: Failed to log critical alarm', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  /**
   * Log alarm acknowledgment with response time and method
   */
  public async logAlarmAcknowledgment(
    alarmEvent: CriticalAlarmEvent,
    acknowledgedBy: string,
    method: string = 'manual',
  ): Promise<void> {
    try {
      const historyEntry = this.historyCache.find((entry) => entry.alarmEvent.id === alarmEvent.id);
      if (!historyEntry) {
        log.app('AlarmHistoryLogger: No history entry found for alarm acknowledgment', () => ({
          alarmId: alarmEvent.id,
        }));
        return;
      }

      // Update acknowledgment information
      historyEntry.endTime = Date.now();
      historyEntry.duration = historyEntry.endTime - historyEntry.startTime;
      historyEntry.responseTime = (alarmEvent.acknowledgedAt || Date.now()) - alarmEvent.detectedAt;
      historyEntry.acknowledgedBy = acknowledgedBy;
      historyEntry.acknowledgmentMethod = method;

      // Check marine safety compliance
      historyEntry.complianceIssues = this.checkComplianceIssues(historyEntry);

      await this.saveHistoryToStorage();

      // Update performance metrics
      this.updateResponseTimeMetrics(historyEntry.responseTime);
    } catch (error) {
      log.app('AlarmHistoryLogger: Failed to log alarm acknowledgment', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  /**
   * Log alarm escalation event
   */
  public async logAlarmEscalation(
    alarmEvent: CriticalAlarmEvent,
    previousLevel: AlarmEscalationLevel,
    newLevel: AlarmEscalationLevel,
  ): Promise<void> {
    try {
      const historyEntry = this.historyCache.find((entry) => entry.alarmEvent.id === alarmEvent.id);
      if (historyEntry) {
        historyEntry.escalationCount++;

        // Log escalation details in metadata
        if (!historyEntry.alarmEvent.metadata.escalations) {
          historyEntry.alarmEvent.metadata.escalations = [];
        }

        historyEntry.alarmEvent.metadata.escalations.push({
          timestamp: Date.now(),
          from: previousLevel,
          to: newLevel,
          escalationCount: historyEntry.escalationCount,
        });

        await this.saveHistoryToStorage();
      }
    } catch (error) {
      log.app('AlarmHistoryLogger: Failed to log alarm escalation', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  /**
   * Log system test results
   */
  public async logSystemTest(testResults: any): Promise<void> {
    try {
      const testEntry: AlarmHistoryEntry = {
        id: `test-${Date.now()}`,
        alarmEvent: {
          id: `system-test-${Date.now()}`,
          type: 'SYSTEM_TEST' as any,
          escalationLevel: AlarmEscalationLevel.INFO,
          detectedAt: Date.now(),
          acknowledgedAt: Date.now(),
          value: 0,
          threshold: 0,
          message: 'System test executed',
          source: 'AlarmHistoryLogger',
          metadata: { testResults },
          priority: 0,
          marineSafetyClassification: 'SYSTEM_TEST',
        },
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 0,
        responseTime: 0,
        escalationCount: 0,
        acknowledgedBy: 'system',
        acknowledgmentMethod: 'automatic',
        falsePositive: false,
        falseNegative: false,
        complianceIssues: [],
        vesselState: await this.getCurrentVesselState(),
        relatedAlarms: [],
        cascadeEffects: [],
      };

      this.historyCache.push(testEntry);
      await this.saveHistoryToStorage();
    } catch (error) {
      log.app('AlarmHistoryLogger: Failed to log system test', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  /**
   * Mark alarm as false positive for performance tracking
   */
  public async markFalsePositive(alarmId: string, reason: string): Promise<void> {
    try {
      const historyEntry = this.historyCache.find((entry) => entry.alarmEvent.id === alarmId);
      if (historyEntry) {
        historyEntry.falsePositive = true;
        historyEntry.alarmEvent.metadata.falsePositiveReason = reason;

        await this.saveHistoryToStorage();

        // Update performance metrics
        this.performanceMetrics.falsePositiveCount++;
        this.updateFalsePositiveRate();
      }
    } catch (error) {
      log.app('AlarmHistoryLogger: Failed to mark false positive', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  /**
   * Mark alarm as false negative for performance tracking
   */
  public async markFalseNegative(alarmId: string, reason: string): Promise<void> {
    try {
      const historyEntry = this.historyCache.find((entry) => entry.alarmEvent.id === alarmId);
      if (historyEntry) {
        historyEntry.falseNegative = true;
        historyEntry.alarmEvent.metadata.falseNegativeReason = reason;

        await this.saveHistoryToStorage();

        // Update performance metrics
        this.performanceMetrics.falseNegativeCount++;
        this.updateFalseNegativeRate();
      }
    } catch (error) {
      log.app('AlarmHistoryLogger: Failed to mark false negative', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  /**
   * Get alarm history for analysis and reporting
   */
  public getAlarmHistory(filters?: {
    startDate?: number;
    endDate?: number;
    alarmTypes?: string[];
    escalationLevels?: AlarmEscalationLevel[];
    acknowledgedBy?: string;
    includeTests?: boolean;
  }): AlarmHistoryEntry[] {
    let filteredHistory = [...this.historyCache];

    if (filters) {
      if (filters.startDate) {
        filteredHistory = filteredHistory.filter((entry) => entry.startTime >= filters.startDate!);
      }

      if (filters.endDate) {
        filteredHistory = filteredHistory.filter((entry) => entry.startTime <= filters.endDate!);
      }

      if (filters.alarmTypes) {
        filteredHistory = filteredHistory.filter((entry) =>
          filters.alarmTypes!.includes(entry.alarmEvent.type),
        );
      }

      if (filters.escalationLevels) {
        filteredHistory = filteredHistory.filter((entry) =>
          filters.escalationLevels!.includes(entry.alarmEvent.escalationLevel),
        );
      }

      if (filters.acknowledgedBy) {
        filteredHistory = filteredHistory.filter(
          (entry) => entry.acknowledgedBy === filters.acknowledgedBy,
        );
      }

      if (!filters.includeTests) {
        filteredHistory = filteredHistory.filter(
          (entry) =>
            entry.alarmEvent.source !== 'AlarmHistoryLogger' ||
            !entry.alarmEvent.message.includes('System test'),
        );
      }
    }

    return filteredHistory.sort((a, b) => b.startTime - a.startTime); // Most recent first
  }

  /**
   * Get performance metrics for marine safety compliance
   */
  public getPerformanceMetrics(): AlarmPerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Export alarm history in specified format for marine incident reporting
   */
  public async exportAlarmHistory(
    format: 'json' | 'csv' | 'maritime-xml' = 'json',
    filters?: any,
  ): Promise<string> {
    const history = this.getAlarmHistory(filters);

    switch (format) {
      case 'json':
        return JSON.stringify(
          {
            exportDate: new Date().toISOString(),
            totalEntries: history.length,
            performanceMetrics: this.performanceMetrics,
            alarmHistory: history,
          },
          null,
          2,
        );

      case 'csv':
        return this.exportToCsv(history);

      case 'maritime-xml':
        return this.exportToMaritimeXml(history);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Clear old history entries to maintain storage limits
   */
  public async clearOldHistory(olderThanDays: number = 90): Promise<void> {
    try {
      const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
      const initialCount = this.historyCache.length;

      this.historyCache = this.historyCache.filter((entry) => entry.startTime >= cutoffTime);

      await this.saveHistoryToStorage();

      const removedCount = initialCount - this.historyCache.length;
    } catch (error) {
      log.app('AlarmHistoryLogger: Failed to clear old history', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  // Private helper methods

  private initializePerformanceMetrics(): AlarmPerformanceMetrics {
    return {
      averageResponseTimeMs: 0,
      maxResponseTimeMs: 0,
      responseTimePercentiles: { p50: 0, p95: 0, p99: 0 },
      totalAlarmsTriggered: 0,
      falsePositiveCount: 0,
      falseNegativeCount: 0,
      falsePositiveRate: 0,
      falseNegativeRate: 0,
      audioSystemReliability: 0,
      averageAudioLevelDb: 0,
      audioFailureCount: 0,
      visualSystemReliability: 0,
      displayLatencyMs: 0,
      visualFailureCount: 0,
      operatingTemperatureRange: { min: 0, max: 0 },
      operatingConditions: [],
      continuousOperationHours: 0,
      marineSafetyCompliant: false,
      complianceIssues: [],
      lastComplianceCheck: Date.now(),
    };
  }

  private async loadHistoryFromStorage(): Promise<void> {
    try {
      const storedHistory = await AsyncStorage.getItem(this.config.storageKey);
      if (storedHistory) {
        this.historyCache = JSON.parse(storedHistory);
      }
    } catch (error) {
      log.app('AlarmHistoryLogger: Failed to load history from storage', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  private async saveHistoryToStorage(): Promise<void> {
    try {
      // Maintain storage limits
      if (this.historyCache.length > this.config.maxHistoryEntries) {
        this.historyCache = this.historyCache.slice(-this.config.maxHistoryEntries);
      }

      await AsyncStorage.setItem(this.config.storageKey, JSON.stringify(this.historyCache));
    } catch (error) {
      log.app('AlarmHistoryLogger: Failed to save history to storage', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  private async getCurrentVesselState(): Promise<AlarmHistoryEntry['vesselState']> {
    // This would integrate with NMEA store to get current vessel state
    return {
      position: { lat: 0, lon: 0 }, // Would get from GPS data
      course: 0, // Would get from COG
      speed: 0, // Would get from SOG
      conditions: 'Unknown', // Would get from weather data or manual input
    };
  }

  private findRelatedAlarms(alarmEvent: CriticalAlarmEvent): string[] {
    // Find alarms that occurred within a short time window (cascade detection)
    const timeWindow = 30000; // 30 seconds
    const startTime = alarmEvent.detectedAt - timeWindow;
    const endTime = alarmEvent.detectedAt + timeWindow;

    return this.historyCache
      .filter(
        (entry) =>
          entry.alarmEvent.id !== alarmEvent.id &&
          entry.startTime >= startTime &&
          entry.startTime <= endTime,
      )
      .map((entry) => entry.alarmEvent.id);
  }

  private checkComplianceIssues(historyEntry: AlarmHistoryEntry): string[] {
    const issues: string[] = [];

    // Check response time compliance (<500ms)
    if (historyEntry.responseTime > 500) {
      issues.push(
        `Response time ${historyEntry.responseTime}ms exceeds marine safety requirement of 500ms`,
      );
    }

    // Check escalation compliance
    if (historyEntry.escalationCount > 5) {
      issues.push(
        `Excessive escalation count: ${historyEntry.escalationCount} escalations before acknowledgment`,
      );
    }

    // Check acknowledgment compliance
    if (historyEntry.acknowledgmentMethod === 'timeout') {
      issues.push('Alarm was not manually acknowledged - timed out automatically');
    }

    return issues;
  }

  private updatePerformanceMetrics(historyEntry: AlarmHistoryEntry): void {
    this.performanceMetrics.totalAlarmsTriggered++;
    // Other metrics would be updated based on the history entry
  }

  private updateResponseTimeMetrics(responseTime: number): void {
    // Update response time statistics
    const current = this.performanceMetrics.averageResponseTimeMs;
    const count = this.performanceMetrics.totalAlarmsTriggered;

    this.performanceMetrics.averageResponseTimeMs = (current * (count - 1) + responseTime) / count;

    if (responseTime > this.performanceMetrics.maxResponseTimeMs) {
      this.performanceMetrics.maxResponseTimeMs = responseTime;
    }

    // Update percentiles (simplified calculation)
    // In production, would use proper percentile calculation algorithm
  }

  private updateFalsePositiveRate(): void {
    if (this.performanceMetrics.totalAlarmsTriggered > 0) {
      this.performanceMetrics.falsePositiveRate =
        (this.performanceMetrics.falsePositiveCount /
          this.performanceMetrics.totalAlarmsTriggered) *
        100;
    }
  }

  private updateFalseNegativeRate(): void {
    if (this.performanceMetrics.totalAlarmsTriggered > 0) {
      this.performanceMetrics.falseNegativeRate =
        (this.performanceMetrics.falseNegativeCount /
          this.performanceMetrics.totalAlarmsTriggered) *
        100;
    }
  }

  private exportToCsv(history: AlarmHistoryEntry[]): string {
    const headers = [
      'ID',
      'Type',
      'Escalation Level',
      'Start Time',
      'End Time',
      'Duration (ms)',
      'Response Time (ms)',
      'Escalation Count',
      'Acknowledged By',
      'Acknowledgment Method',
      'False Positive',
      'False Negative',
      'Compliance Issues',
      'Position',
      'Course',
      'Speed',
    ];

    const rows = history.map((entry) => [
      entry.id,
      entry.alarmEvent.type,
      entry.alarmEvent.escalationLevel,
      new Date(entry.startTime).toISOString(),
      entry.endTime ? new Date(entry.endTime).toISOString() : '',
      entry.duration || '',
      entry.responseTime,
      entry.escalationCount,
      entry.acknowledgedBy,
      entry.acknowledgmentMethod,
      entry.falsePositive,
      entry.falseNegative,
      entry.complianceIssues.join('; '),
      entry.vesselState.position
        ? `${entry.vesselState.position.lat},${entry.vesselState.position.lon}`
        : '',
      entry.vesselState.course || '',
      entry.vesselState.speed || '',
    ]);

    return [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  }

  private exportToMaritimeXml(history: AlarmHistoryEntry[]): string {
    // Maritime XML format for official incident reporting
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n<MarineAlarmReport>\n';
    const xmlFooter = '</MarineAlarmReport>';

    const xmlBody = history
      .map(
        (entry) => `
  <AlarmEvent>
    <ID>${entry.id}</ID>
    <Type>${entry.alarmEvent.type}</Type>
    <EscalationLevel>${entry.alarmEvent.escalationLevel}</EscalationLevel>
    <StartTime>${new Date(entry.startTime).toISOString()}</StartTime>
    <EndTime>${entry.endTime ? new Date(entry.endTime).toISOString() : ''}</EndTime>
    <ResponseTimeMs>${entry.responseTime}</ResponseTimeMs>
    <VesselPosition lat="${entry.vesselState.position?.lat || 0}" lon="${
          entry.vesselState.position?.lon || 0
        }" />
    <Compliance>
      <Issues>${entry.complianceIssues.join(', ')}</Issues>
      <FalsePositive>${entry.falsePositive}</FalsePositive>
      <FalseNegative>${entry.falseNegative}</FalseNegative>
    </Compliance>
  </AlarmEvent>`,
      )
      .join('\n');

    return xmlHeader + xmlBody + '\n' + xmlFooter;
  }
}
