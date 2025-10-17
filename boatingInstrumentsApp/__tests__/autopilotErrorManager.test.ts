import { AutopilotErrorManager, ErrorSeverity, ErrorCategory, ErrorMessage, RecoveryGuidance } from '../src/services/autopilotErrorManager'; 
import { SafetyEventType, SafetyAlertLevel } from '../src/services/autopilotSafetyManager';

describe('AutopilotErrorManager', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Message Generation', () => {
    it('should create error message for connection loss', () => {
      const error = AutopilotErrorManager.createError('CONN_001', { 
        lastActivity: Date.now() - 5000 
      });
      
      expect(error.title).toBe('Connection Lost');
      expect(error.message).toContain('Lost connection to boat systems');
      expect(error.category).toBe(ErrorCategory.CONNECTION);
      expect(error.severity).toBe(ErrorSeverity.CRITICAL);
      expect(error.code).toBe('CONN_001');
    });

    it('should create error message for autopilot fault', () => {
      const error = AutopilotErrorManager.createError('AUTO_004', { 
        faultCode: 'HYD_001' 
      });
      
      expect(error.title).toBe('Autopilot Fault');
      expect(error.message).toContain('Autopilot system reported internal fault');
      expect(error.category).toBe(ErrorCategory.AUTOPILOT);
      expect(error.severity).toBe(ErrorSeverity.CRITICAL);
      expect(error.solution).toContain('Switch to manual steering');
    });

    it('should create error from safety events', () => {
      const error = AutopilotErrorManager.createErrorFromSafetyEvent(
        SafetyEventType.CONNECTION_LOSS, 
        { timeSinceLastData: 30000 }
      );
      
      expect(error.category).toBe(ErrorCategory.CONNECTION);
      expect(error.severity).toBe(ErrorSeverity.CRITICAL);
      expect(error.timestamp).toBeDefined();
    });
  });

  describe('Recovery Guidance', () => {
    it('should provide recovery guidance for connection errors', () => {
      const guidance = AutopilotErrorManager.getRecoveryGuidance('CONN_001');
      
      expect(guidance).toBeDefined();
      expect(guidance?.steps.length).toBeGreaterThan(0);
      expect(guidance?.estimatedTime).toBeDefined();
    });

    it('should provide recovery guidance for autopilot errors', () => {
      const guidance = AutopilotErrorManager.getRecoveryGuidance('AUTO_001');
      
      expect(guidance).toBeDefined();
      expect(guidance?.steps).toContain('Check autopilot display for error codes');
    });

    it('should return null for unknown error codes', () => {
      const guidance = AutopilotErrorManager.getRecoveryGuidance('UNKNOWN_001');
      
      expect(guidance).toBeNull();
    });
  });

  describe('User Message Formatting', () => {
    it('should format error messages for users', () => {
      const error = AutopilotErrorManager.createError('NAV_001');
      const userMessage = AutopilotErrorManager.formatErrorForUser(error);
      
      expect(userMessage).toContain('GPS Signal Lost');
      expect(userMessage).toContain('GPS position data is unavailable');
      expect(userMessage.length).toBeGreaterThan(50);
    });

    it('should format recovery guidance for users', () => {
      const guidance = AutopilotErrorManager.getRecoveryGuidance('CONN_001');
      if (guidance) {
        const formattedGuidance = AutopilotErrorManager.formatRecoveryGuidance(guidance);
        
        expect(formattedGuidance).toContain('Recovery Steps');
        expect(formattedGuidance).toContain('Estimated time');
      }
    });
  });

  describe('Error Filtering and Statistics', () => {
    const mockErrors: ErrorMessage[] = [
      AutopilotErrorManager.createError('CONN_001'),
      AutopilotErrorManager.createError('AUTO_001'),
      AutopilotErrorManager.createError('NAV_001'),
      AutopilotErrorManager.createError('CONN_002'),
    ];

    it('should filter errors by category', () => {
      const connectionErrors = AutopilotErrorManager.filterErrorsByCategory(
        mockErrors, 
        ErrorCategory.CONNECTION
      );
      
      expect(connectionErrors.length).toBe(2);
      expect(connectionErrors.every(e => e.category === ErrorCategory.CONNECTION)).toBe(true);
    });

    it('should filter errors by severity', () => {
      const criticalErrors = AutopilotErrorManager.filterErrorsBySeverity(
        mockErrors, 
        ErrorSeverity.CRITICAL
      );
      
      expect(criticalErrors.length).toBeGreaterThan(0);
      expect(criticalErrors.every(e => e.severity === ErrorSeverity.CRITICAL)).toBe(true);
    });

    it('should provide error statistics', () => {
      const stats = AutopilotErrorManager.getErrorStatistics(mockErrors);
      
      expect(stats.totalErrors).toBe(4);
      expect(stats.byCategory.connection).toBe(2);
      expect(stats.byCategory.autopilot).toBe(1);
      expect(stats.byCategory.navigation).toBe(1);
    });

    it('should provide all available error codes', () => {
      const errorCodes = AutopilotErrorManager.getAllErrorCodes();
      
      expect(errorCodes.length).toBeGreaterThan(10);
      expect(errorCodes).toContain('CONN_001');
      expect(errorCodes).toContain('AUTO_001');
      expect(errorCodes).toContain('NAV_001');
    });
  });

  describe('Safety Level Mapping', () => {
    it('should map safety alert levels to error severity', () => {
      const criticalSeverity = AutopilotErrorManager.mapSafetyLevelToSeverity(SafetyAlertLevel.CRITICAL);
      const warningSeverity = AutopilotErrorManager.mapSafetyLevelToSeverity(SafetyAlertLevel.WARNING);
      
      expect(criticalSeverity).toBe(ErrorSeverity.CRITICAL);
      expect(warningSeverity).toBe(ErrorSeverity.WARNING);
    });
  });
});