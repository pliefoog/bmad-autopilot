import { AutopilotSafetyManager, SafetyEventType, SafetyAlertLevel } from '../src/services/autopilotSafetyManager';
import { useNmeaStore } from '../src/store/nmeaStore';

// Mock the store
jest.mock('../src/store/nmeaStore', () => ({
  useNmeaStore: {
    getState: jest.fn(),
    setState: jest.fn(),
    subscribe: jest.fn(),
    destroy: jest.fn()
  }
}));

const mockNmeaStore = useNmeaStore as any;

describe('AutopilotSafetyManager', () => {
  let safetyManager: AutopilotSafetyManager;
  let mockStore: any;

  beforeEach(() => {
    // Setup mock store
    mockStore = {
      getState: jest.fn().mockReturnValue({
        nmeaData: {},
        connectionStatus: 'connected'
      }),
      setNmeaData: jest.fn(),
      setConnectionStatus: jest.fn(),
      updateAlarms: jest.fn()
    };
    
    mockNmeaStore.getState = jest.fn().mockReturnValue({
      nmeaData: {},
      connectionStatus: 'connected',
      setNmeaData: mockStore.setNmeaData,
      setConnectionStatus: mockStore.setConnectionStatus,
      updateAlarms: mockStore.updateAlarms
    });
    
    // Mock timers
    jest.useFakeTimers();
    
    safetyManager = new AutopilotSafetyManager();
  });

  afterEach(() => {
    safetyManager.destroy();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Connection Loss Detection', () => {
    it('should detect connection loss after timeout', () => {
      // Setup initial healthy state
      mockStore.getState.mockReturnValue({
        nmeaData: { autopilot: { active: true } }
      });

      // Advance time beyond connection timeout
      jest.advanceTimersByTime(6000);

      // Should raise connection loss event
      expect(mockStore.updateAlarms).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'NMEA connection lost - Autopilot unavailable',
            level: 'critical'
          })
        ])
      );

      // Should disengage autopilot for safety
      expect(mockStore.setNmeaData).toHaveBeenCalledWith(
        expect.objectContaining({
          autopilot: expect.objectContaining({
            active: false,
            commandStatus: 'error'
          })
        })
      );
    });

    it('should resolve connection issues when restored', () => {
      // Simulate connection loss
      jest.advanceTimersByTime(6000);
      
      // Reset mock calls
      jest.clearAllMocks();
      
      // Simulate connection restored with fresh data
      mockStore.getState.mockReturnValue({
        nmeaData: { depth: 10, speed: 5 }
      });
      
      jest.advanceTimersByTime(1000);
      
      expect(mockStore.setConnectionStatus).toHaveBeenCalledWith('connected');
    });
  });

  describe('Autopilot Fault Detection', () => {
    it('should detect command timeout', () => {
      const autopilotData = {
        active: true,
        commandStatus: 'sending',
        lastCommandTime: Date.now() - 6000 // 6 seconds ago
      };

      mockStore.getState.mockReturnValue({
        nmeaData: { autopilot: autopilotData }
      });

      jest.advanceTimersByTime(1000);

      expect(mockStore.updateAlarms).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Autopilot command timed out',
            level: 'warning'
          })
        ])
      );

      expect(mockStore.setNmeaData).toHaveBeenCalledWith({
        autopilot: expect.objectContaining({
          commandStatus: 'timeout'
        })
      });
    });

    it('should detect autopilot system fault', () => {
      const faultyAutopilotData = {
        active: true,
        targetHeading: undefined, // Missing target heading
        rudderPosition: 25 // Excessive rudder position
      };

      mockStore.getState.mockReturnValue({
        nmeaData: { autopilot: faultyAutopilotData }
      });

      jest.advanceTimersByTime(1000);

      expect(mockStore.updateAlarms).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Autopilot system fault detected',
            level: 'critical'
          })
        ])
      );
    });
  });

  describe('Manual Override Detection', () => {
    it('should detect manual steering override', () => {
      const autopilotData = {
        active: true,
        targetHeading: 100
      };

      // First call - establish baseline
      mockStore.getState.mockReturnValue({
        nmeaData: { 
          autopilot: autopilotData,
          heading: 100
        }
      });
      jest.advanceTimersByTime(2000);

      // Second call - significant heading change without autopilot command
      mockStore.getState.mockReturnValue({
        nmeaData: { 
          autopilot: autopilotData,
          heading: 110 // 10 degree change - exceeds threshold
        }
      });
      jest.advanceTimersByTime(2000);

      expect(mockStore.updateAlarms).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Manual steering override detected',
            level: 'warning'
          })
        ])
      );
    });
  });

  describe('GPS/Compass Failure Detection', () => {
    it('should detect GPS failure', () => {
      // Setup initial state with GPS
      mockStore.getState.mockReturnValue({
        nmeaData: { gpsPosition: { lat: 37.7749, lon: -122.4194 } }
      });
      jest.advanceTimersByTime(2000);

      // GPS data disappears
      mockStore.getState.mockReturnValue({
        nmeaData: {}
      });
      jest.advanceTimersByTime(11000); // Exceed GPS timeout

      expect(mockStore.updateAlarms).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'GPS signal lost - Navigation unreliable',
            level: 'critical'
          })
        ])
      );
    });

    it('should detect compass failure', () => {
      // Setup initial state with compass
      mockStore.getState.mockReturnValue({
        nmeaData: { heading: 285 }
      });
      jest.advanceTimersByTime(2000);

      // Compass data disappears
      mockStore.getState.mockReturnValue({
        nmeaData: {}
      });
      jest.advanceTimersByTime(2000);

      expect(mockStore.updateAlarms).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Compass data unavailable - Autopilot unreliable',
            level: 'critical'
          })
        ])
      );
    });
  });

  describe('Performance Metrics', () => {
    it('should record command execution metrics', () => {
      safetyManager.recordCommandExecution(true, 500);
      safetyManager.recordCommandExecution(false, 1000);
      safetyManager.recordCommandExecution(true, 300);

      const metrics = safetyManager.getHealthMetrics();
      
      expect(metrics.totalCommands).toBe(3);
      expect(metrics.failedCommands).toBe(1);
      expect(metrics.commandSuccessRate).toBe(66.66666666666666);
      expect(metrics.commandResponseTime).toBe(300); // Last response time
    });

    it('should provide current health metrics', () => {
      const metrics = safetyManager.getHealthMetrics();
      
      expect(metrics).toHaveProperty('connectionStatus');
      expect(metrics).toHaveProperty('lastDataReceived');
      expect(metrics).toHaveProperty('commandResponseTime');
      expect(metrics).toHaveProperty('commandSuccessRate');
      expect(metrics).toHaveProperty('autopilotStatus');
      expect(metrics).toHaveProperty('gpsStatus');
      expect(metrics).toHaveProperty('compassStatus');
    });
  });

  describe('Safety Events Management', () => {
    it('should track and resolve safety events', () => {
      // Trigger a safety event
      mockStore.getState.mockReturnValue({
        nmeaData: {}
      });
      jest.advanceTimersByTime(6000); // Trigger connection loss

      // Get unresolved events
      const unresolvedEvents = safetyManager.getSafetyEvents(false);
      expect(unresolvedEvents).toHaveLength(1);
      expect(unresolvedEvents[0].type).toBe(SafetyEventType.CONNECTION_LOSS);

      // Restore connection
      mockStore.getState.mockReturnValue({
        nmeaData: { depth: 10 }
      });
      safetyManager['healthMetrics'].lastDataReceived = Date.now();
      jest.advanceTimersByTime(1000);

      // Events should be resolved
      const resolvedEvents = safetyManager.getSafetyEvents(true);
      expect(resolvedEvents).toHaveLength(1);
      expect(resolvedEvents[0].resolved).toBe(true);
    });

    it('should clear old resolved events', () => {
      // Create old resolved event
      safetyManager['safetyEvents'].push({
        id: 'old_event',
        type: SafetyEventType.CONNECTION_LOSS,
        level: SafetyAlertLevel.CRITICAL,
        message: 'Old event',
        timestamp: Date.now() - 48 * 60 * 60 * 1000, // 48 hours ago
        resolved: true,
        resolvedAt: Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
      });

      safetyManager.clearOldEvents();

      const events = safetyManager.getSafetyEvents();
      expect(events).toHaveLength(0);
    });
  });
});