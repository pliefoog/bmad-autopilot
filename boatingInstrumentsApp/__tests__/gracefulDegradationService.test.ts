import { 
  AutopilotGracefulDegradationService, 
  DegradationLevel, 
  ServiceState,
  ComponentHealth 
} from '../src/services/gracefulDegradationService';
import { autopilotSafetyManager } from '../src/services/autopilotSafetyManager';
import { autopilotCommandQueue } from '../src/services/autopilotCommandQueue';
import { useNmeaStore } from '../src/store/nmeaStore';

// Mock dependencies
jest.mock('../src/services/autopilotSafetyManager');
jest.mock('../src/services/autopilotCommandQueue');
jest.mock('../src/store/nmeaStore');

const mockSafetyManager = autopilotSafetyManager as jest.Mocked<typeof autopilotSafetyManager>;
const mockCommandQueue = autopilotCommandQueue as jest.Mocked<typeof autopilotCommandQueue>;
const mockNmeaStore = useNmeaStore as jest.MockedFunction<typeof useNmeaStore>;

describe('AutopilotGracefulDegradationService', () => {
  let degradationService: AutopilotGracefulDegradationService;
  let mockStore: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock store state
    mockStore = {
      nmeaData: {
        autopilot: {
          active: false,
          mode: 'STANDBY',
          commandStatus: 'idle',
          commandMessage: ''
        }
      },
      setNmeaData: jest.fn(),
      updateAlarms: jest.fn()
    };

    mockNmeaStore.mockReturnValue(mockStore);
    mockNmeaStore.getState = jest.fn().mockReturnValue(mockStore);

    // Mock safety manager health metrics
    mockSafetyManager.getHealthMetrics.mockReturnValue({
      connectionStatus: 'healthy',
      autopilotStatus: 'operational',
      gpsStatus: 'operational',
      compassStatus: 'operational',
      commandSuccessRate: 95,
      lastDataReceived: Date.now(),
      commandResponseTime: 150,
      totalCommands: 20,
      failedCommands: 1
    });

    mockSafetyManager.getSafetyEvents.mockReturnValue([]);

    // Create new service instance for each test
    degradationService = new AutopilotGracefulDegradationService();
  });

  afterEach(() => {
    degradationService.destroy();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should start in NORMAL degradation level', () => {
      const status = degradationService.getSystemStatus();
      expect(status.degradationLevel).toBe(DegradationLevel.NORMAL);
      expect(status.userMessage).toBe('All systems operational');
    });

    it('should initialize all components as AVAILABLE', () => {
      const status = degradationService.getSystemStatus();
      expect(status.componentHealth.autopilot).toBe(ServiceState.AVAILABLE);
      expect(status.componentHealth.connection).toBe(ServiceState.AVAILABLE);
      expect(status.componentHealth.gps).toBe(ServiceState.AVAILABLE);
      expect(status.componentHealth.compass).toBe(ServiceState.AVAILABLE);
      expect(status.componentHealth.sensors).toBe(ServiceState.AVAILABLE);
    });
  });

  describe('Degradation Level Calculation', () => {
    it('should remain NORMAL with healthy systems', () => {
      // Advance timers to trigger health assessment
      jest.advanceTimersByTime(3000);

      const status = degradationService.getSystemStatus();
      expect(status.degradationLevel).toBe(DegradationLevel.NORMAL);
      expect(status.allowedOperations).toContain('all');
    });

    it('should degrade to DEGRADED with one major failure', () => {
      // Mock GPS failure
      mockSafetyManager.getHealthMetrics.mockReturnValue({
        connectionStatus: 'healthy',
        autopilotStatus: 'operational',
        gpsStatus: 'failed',
        compassStatus: 'operational',
        commandSuccessRate: 90,
        lastDataReceived: Date.now(),
        commandResponseTime: 200,
        totalCommands: 20,
        failedCommands: 2
      });

      jest.advanceTimersByTime(3000);

      const status = degradationService.getSystemStatus();
      expect(status.degradationLevel).toBe(DegradationLevel.DEGRADED);
      expect(status.allowedOperations).toContain('engage');
      expect(status.disabledFeatures).toContain('auto_nav');
    });

    it('should degrade to CRITICAL with autopilot failure', () => {
      // Mock autopilot failure
      mockSafetyManager.getHealthMetrics.mockReturnValue({
        connectionStatus: 'healthy',
        autopilotStatus: 'fault',
        gpsStatus: 'operational',
        compassStatus: 'operational',
        commandSuccessRate: 50,
        lastDataReceived: Date.now(),
        commandResponseTime: 3000,
        totalCommands: 20,
        failedCommands: 10
      });

      jest.advanceTimersByTime(3000);

      const status = degradationService.getSystemStatus();
      expect(status.degradationLevel).toBe(DegradationLevel.CRITICAL);
      expect(status.allowedOperations).toContain('disengage');
      expect(status.disabledFeatures).toContain('engage');
    });

    it('should degrade to EMERGENCY with multiple critical failures', () => {
      // Mock multiple critical failures
      mockSafetyManager.getHealthMetrics.mockReturnValue({
        connectionStatus: 'failed',
        autopilotStatus: 'fault',
        gpsStatus: 'failed',
        compassStatus: 'failed',
        commandSuccessRate: 20,
        lastDataReceived: Date.now() - 15000, // 15 seconds ago
        commandResponseTime: 8000,
        totalCommands: 20,
        failedCommands: 16
      });

      mockSafetyManager.getSafetyEvents.mockReturnValue([
        { 
          id: 'test-1', 
          type: 'connection_loss' as any, 
          level: 'critical' as any, 
          message: 'Connection lost',
          timestamp: Date.now()
        },
        { 
          id: 'test-2', 
          type: 'autopilot_fault' as any, 
          level: 'critical' as any, 
          message: 'Autopilot fault',
          timestamp: Date.now()
        }
      ]);

      jest.advanceTimersByTime(3000);

      const status = degradationService.getSystemStatus();
      expect(status.degradationLevel).toBe(DegradationLevel.EMERGENCY);
      expect(status.allowedOperations).toEqual(['emergency_stop']);
      expect(status.disabledFeatures).toContain('all_except_emergency');
    });
  });

  describe('Sensor Health Assessment', () => {
    it('should mark sensors as UNAVAILABLE when data is too old', () => {
      // Mock old data
      mockSafetyManager.getHealthMetrics.mockReturnValue({
        connectionStatus: 'healthy',
        autopilotStatus: 'operational',
        gpsStatus: 'operational',
        compassStatus: 'operational',
        commandSuccessRate: 95,
        lastDataReceived: Date.now() - 12000, // 12 seconds ago
        commandResponseTime: 150,
        totalCommands: 20,
        failedCommands: 1
      });

      jest.advanceTimersByTime(3000);

      const status = degradationService.getSystemStatus();
      expect(status.componentHealth.sensors).toBe(ServiceState.UNAVAILABLE);
    });

    it('should mark sensors as DEGRADED when data is moderately old', () => {
      // Mock moderately old data
      mockSafetyManager.getHealthMetrics.mockReturnValue({
        connectionStatus: 'healthy',
        autopilotStatus: 'operational',
        gpsStatus: 'operational',
        compassStatus: 'operational',
        commandSuccessRate: 95,
        lastDataReceived: Date.now() - 7000, // 7 seconds ago
        commandResponseTime: 150,
        totalCommands: 20,
        failedCommands: 1
      });

      jest.advanceTimersByTime(3000);

      const status = degradationService.getSystemStatus();
      expect(status.componentHealth.sensors).toBe(ServiceState.DEGRADED);
    });
  });

  describe('Automatic Actions', () => {
    it('should clear non-emergency commands on CRITICAL degradation', () => {
      // Mock critical failure
      mockSafetyManager.getHealthMetrics.mockReturnValue({
        connectionStatus: 'failed',
        autopilotStatus: 'operational',
        gpsStatus: 'healthy',
        compassStatus: 'healthy',
        commandSuccessRate: 95,
        lastDataReceived: Date.now(),
        systemUptime: 300000,
        errorCount: 1,
        warningCount: 0
      });

      jest.advanceTimersByTime(3000);

      expect(mockCommandQueue.clearNonEmergencyCommands).toHaveBeenCalled();
    });

    it('should auto-disengage autopilot on CRITICAL degradation', () => {
      // Set autopilot as active
      mockStore.nmeaData.autopilot.active = true;
      mockStore.nmeaData.autopilot.mode = 'COMPASS';

      // Mock critical failure
      mockSafetyManager.getHealthMetrics.mockReturnValue({
        connectionStatus: 'failed',
        autopilotStatus: 'operational',
        gpsStatus: 'operational',
        compassStatus: 'operational',
        commandSuccessRate: 95,
        lastDataReceived: Date.now(),
        commandResponseTime: 150,
        totalCommands: 20,
        failedCommands: 1
      });

      jest.advanceTimersByTime(3000);

      expect(mockStore.setNmeaData).toHaveBeenCalledWith(
        expect.objectContaining({
          autopilot: expect.objectContaining({
            active: false,
            commandStatus: 'error'
          })
        })
      );
    });

    it('should force disengage on EMERGENCY degradation', () => {
      // Mock emergency conditions
      mockSafetyManager.getHealthMetrics.mockReturnValue({
        connectionStatus: 'failed',
        autopilotStatus: 'fault',
        gpsStatus: 'operational',
        compassStatus: 'operational',
        commandSuccessRate: 95,
        lastDataReceived: Date.now(),
        commandResponseTime: 150,
        totalCommands: 20,
        failedCommands: 1
      });

      jest.advanceTimersByTime(3000);

      expect(mockStore.setNmeaData).toHaveBeenCalledWith(
        expect.objectContaining({
          autopilot: expect.objectContaining({
            active: false,
            mode: 'STANDBY',
            commandStatus: 'error'
          })
        })
      );
    });

    it('should activate emergency alarms on CRITICAL degradation', () => {
      // Mock critical failure
      mockSafetyManager.getHealthMetrics.mockReturnValue({
        connectionStatus: 'failed',
        autopilotStatus: 'operational',
        gpsStatus: 'operational',
        compassStatus: 'operational',
        commandSuccessRate: 95,
        lastDataReceived: Date.now(),
        commandResponseTime: 150,
        totalCommands: 20,
        failedCommands: 1
      });

      jest.advanceTimersByTime(3000);

      expect(mockStore.updateAlarms).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('CRITICAL SYSTEM DEGRADATION'),
            level: 'critical'
          })
        ])
      );
    });
  });

  describe('Operation Permissions', () => {
    it('should allow all operations in NORMAL state', () => {
      expect(degradationService.isOperationAllowed('engage')).toBe(true);
      expect(degradationService.isOperationAllowed('disengage')).toBe(true);
      expect(degradationService.isOperationAllowed('heading_adjustment')).toBe(true);
      expect(degradationService.isOperationAllowed('mode_change')).toBe(true);
    });

    it('should restrict operations in DEGRADED state', () => {
      degradationService.forceDegradationLevel(DegradationLevel.DEGRADED);

      expect(degradationService.isOperationAllowed('engage')).toBe(true);
      expect(degradationService.isOperationAllowed('disengage')).toBe(true);
      expect(degradationService.isOperationAllowed('heading_small_adjustments')).toBe(true);
      expect(degradationService.isOperationAllowed('auto_nav')).toBe(false);
      expect(degradationService.isOperationAllowed('wind_mode')).toBe(false);
    });

    it('should severely restrict operations in CRITICAL state', () => {
      degradationService.forceDegradationLevel(DegradationLevel.CRITICAL);

      expect(degradationService.isOperationAllowed('disengage')).toBe(true);
      expect(degradationService.isOperationAllowed('emergency_stop')).toBe(true);
      expect(degradationService.isOperationAllowed('engage')).toBe(false);
      expect(degradationService.isOperationAllowed('heading_adjustments')).toBe(false);
    });

    it('should only allow emergency operations in EMERGENCY state', () => {
      degradationService.forceDegradationLevel(DegradationLevel.EMERGENCY);

      expect(degradationService.isOperationAllowed('emergency_stop')).toBe(true);
      expect(degradationService.isOperationAllowed('engage')).toBe(false);
      expect(degradationService.isOperationAllowed('disengage')).toBe(false);
      expect(degradationService.isOperationAllowed('heading_adjustment')).toBe(false);
    });
  });

  describe('System Recovery', () => {
    it('should attempt recovery by resetting component health', () => {
      // Force degraded state
      degradationService.forceDegradationLevel(DegradationLevel.CRITICAL);

      // Mock healthy systems for recovery
      mockSafetyManager.getHealthMetrics.mockReturnValue({
        connectionStatus: 'healthy',
        autopilotStatus: 'operational',
        gpsStatus: 'operational',
        compassStatus: 'operational',
        commandSuccessRate: 95,
        lastDataReceived: Date.now(),
        commandResponseTime: 150,
        totalCommands: 20,
        failedCommands: 1
      });

      const recovered = degradationService.attemptRecovery();

      expect(recovered).toBe(true);
      const status = degradationService.getSystemStatus();
      expect(status.degradationLevel).toBe(DegradationLevel.NORMAL);
    });

    it('should return false if recovery fails', () => {
      // Force emergency state
      degradationService.forceDegradationLevel(DegradationLevel.EMERGENCY);

      // Keep systems unhealthy
      mockSafetyManager.getHealthMetrics.mockReturnValue({
        connectionStatus: 'failed',
        autopilotStatus: 'fault',
        gpsStatus: 'failed',
        compassStatus: 'operational',
        commandSuccessRate: 20,
        lastDataReceived: Date.now() - 15000,
        commandResponseTime: 8000,
        totalCommands: 20,
        failedCommands: 16
      });

      const recovered = degradationService.attemptRecovery();

      expect(recovered).toBe(false);
    });
  });

  describe('Health Monitoring', () => {
    it('should run health assessments on timer intervals', () => {
      jest.advanceTimersByTime(2000); // First interval
      expect(mockSafetyManager.getHealthMetrics).toHaveBeenCalled();

      jest.advanceTimersByTime(2000); // Second interval
      expect(mockSafetyManager.getHealthMetrics).toHaveBeenCalledTimes(2);
    });

    it('should increase monitoring frequency during degraded conditions', () => {
      // Force degraded state
      degradationService.forceDegradationLevel(DegradationLevel.DEGRADED);

      // Advance by 1 second (should trigger in degraded mode)
      jest.advanceTimersByTime(1000);
      expect(mockSafetyManager.getHealthMetrics).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should clear monitoring interval on destroy', () => {
      const service = new AutopilotGracefulDegradationService();
      
      // Verify service can be destroyed without errors
      expect(() => service.destroy()).not.toThrow();
      
      // Call destroy again to verify idempotency
      expect(() => service.destroy()).not.toThrow();
    });
  });
});