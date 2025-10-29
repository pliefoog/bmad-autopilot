import { AutopilotMonitoringService } from "../../../src/services/autopilotMonitoringService";
import { AutopilotErrorManager } from "../../../src/services/autopilotErrorManager";
import { autopilotCommandQueue } from "../../../src/services/autopilotCommandQueue";
import { AutopilotCommandManager, AutopilotMode } from "../../../src/services/autopilotService";
import { AutopilotSafetyManager } from "../../../src/services/autopilotSafetyManager";

describe('AutopilotMonitoringService', () => {
  let monitoringService: AutopilotMonitoringService;

  beforeEach(() => {
    monitoringService = new AutopilotMonitoringService();
    jest.clearAllMocks();
  });

  describe('Command Logging', () => {
    it('should log command execution with results', () => {
      const mockCommand: QueuedCommand = {
        id: 'cmd-001',
        command: AutopilotCommand.ENGAGE,
        params: { mode: 'compass' },
        priority: CommandPriority.HIGH,
        status: CommandStatus.COMPLETED,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30000,
        maxRetries: 3,
        retryCount: 0
      };

      const result = {
        success: true,
        responseTime: 150
      };

      monitoringService.logCommand(mockCommand, result);

      const logs = monitoringService.getLogs(LogLevel.INFO, EventType.COMMAND);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].message).toContain('Command engage completed');
    });

    it('should log failed commands with error details', () => {
      const mockCommand: QueuedCommand = {
        id: 'cmd-002',
        command: AutopilotCommand.ADJUST_HEADING,
        params: { adjustment: -10 },
        priority: CommandPriority.HIGH,
        status: CommandStatus.FAILED,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30000,
        maxRetries: 3,
        retryCount: 2
      };

      const result = {
        success: false,
        error: 'Autopilot not responding',
        responseTime: 5000
      };

      monitoringService.logCommand(mockCommand, result);

      const logs = monitoringService.getLogs(LogLevel.ERROR, EventType.COMMAND);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].message).toContain('Command adjust_heading failed');
    });
  });

  describe('Performance Metrics', () => {
    it('should track command response times', () => {
      monitoringService.recordCommandResponseTime(100);
      monitoringService.recordCommandResponseTime(200);
      monitoringService.recordCommandResponseTime(300);
      
      const metrics = monitoringService.getPerformanceMetrics();
      expect(metrics.commandResponseTimes.average).toBe(200);
      expect(metrics.commandResponseTimes.min).toBe(100);
      expect(metrics.commandResponseTimes.max).toBe(300);
    });

    it('should provide performance history', () => {
      monitoringService.recordCommandResponseTime(100);
      
      const history = monitoringService.getPerformanceHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Error Logging', () => {
    it('should log error messages', () => {
      const mockError: ErrorMessage = {
        title: 'Connection Lost',
        message: 'Lost connection to boat systems',
        category: ErrorCategory.CONNECTION,
        severity: ErrorSeverity.CRITICAL,
        code: 'CONN_001', 
        solution: 'Check WiFi connection and restart NMEA bridge',
        timestamp: Date.now()
      };

      monitoringService.logError(mockError);

      const logs = monitoringService.getLogs(LogLevel.CRITICAL, EventType.SAFETY);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].message).toContain('Connection Lost');
    });
  });

  describe('Connection Event Logging', () => {
    it('should log connection events', () => {
      monitoringService.logConnectionEvent('connected', { ip: '192.168.1.100' });
      monitoringService.logConnectionEvent('disconnected', { reason: 'timeout' });

      const connectedLogs = monitoringService.getLogs(LogLevel.INFO, EventType.CONNECTION);
      const disconnectedLogs = monitoringService.getLogs(LogLevel.ERROR, EventType.CONNECTION);
      
      expect(connectedLogs.length).toBeGreaterThan(0);
      expect(disconnectedLogs.length).toBeGreaterThan(0);
    });
  });

  describe('User Action Logging', () => {
    it('should log user actions', () => {
      monitoringService.logUserAction('engage_autopilot', { mode: 'compass' });

      const logs = monitoringService.getLogs(LogLevel.INFO, EventType.USER);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].message).toContain('User action: engage_autopilot');
    });
  });

  describe('Log Export', () => {
    it('should export logs in JSON format', () => {
      monitoringService.logUserAction('test_action');
      
      const exportedLogs = monitoringService.exportLogs('json');
      expect(exportedLogs).toBeDefined();
      expect(exportedLogs).toContain('sessionId');
      expect(exportedLogs).toContain('totalEntries');
    });

    it('should export logs in CSV format', () => {
      monitoringService.logUserAction('test_action');
      
      const exportedLogs = monitoringService.exportLogs('csv');
      expect(exportedLogs).toBeDefined();
      expect(exportedLogs).toContain('"timestamp","level","eventType"');
    });
  });

  describe('Log Filtering', () => {
    beforeEach(() => {
      // Add some test logs
      monitoringService.logUserAction('action1');
      monitoringService.logConnectionEvent('connected');
      
      const mockError: ErrorMessage = {
        title: 'Test Error',
        message: 'Test error message',
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.ERROR,
        code: 'TEST_001',
        solution: 'Restart the system',
        timestamp: Date.now()
      };
      monitoringService.logError(mockError);
    });

    it('should filter logs by level', () => {
      const errorLogs = monitoringService.getLogs(LogLevel.ERROR);
      const infoLogs = monitoringService.getLogs(LogLevel.INFO);
      
      expect(errorLogs.length).toBeGreaterThan(0);
      expect(infoLogs.length).toBeGreaterThan(0);
      expect(errorLogs.every(log => log.level === LogLevel.ERROR)).toBe(true);
      expect(infoLogs.every(log => log.level === LogLevel.INFO)).toBe(true);
    });

    it('should filter logs by event type', () => {
      const userLogs = monitoringService.getLogs(undefined, EventType.USER);
      const connectionLogs = monitoringService.getLogs(undefined, EventType.CONNECTION);
      
      expect(userLogs.length).toBeGreaterThan(0);
      expect(connectionLogs.length).toBeGreaterThan(0);
      expect(userLogs.every(log => log.eventType === EventType.USER)).toBe(true);
      expect(connectionLogs.every(log => log.eventType === EventType.CONNECTION)).toBe(true);
    });

    it('should filter logs by time range', () => {
      const now = Date.now();
      const pastHour = now - (60 * 60 * 1000);
      
      const recentLogs = monitoringService.getLogs(undefined, undefined, pastHour, now);
      expect(recentLogs.every(log => log.timestamp >= pastHour && log.timestamp <= now)).toBe(true);
    });

    it('should limit log results', () => {
      const limitedLogs = monitoringService.getLogs(undefined, undefined, undefined, undefined, 2);
      expect(limitedLogs.length).toBeLessThanOrEqual(2);
    });
  });
});