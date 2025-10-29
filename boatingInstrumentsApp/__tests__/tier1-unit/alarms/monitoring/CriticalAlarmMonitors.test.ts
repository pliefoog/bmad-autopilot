/**
 * Critical Alarm Monitors Tests - GPS and Autopilot failure detection
 */

import { CriticalAlarmMonitors } from '../../../src/services/alarms/CriticalAlarmMonitors';
import { CriticalAlarmType } from '../../../src/services/alarms/types';

describe('CriticalAlarmMonitors', () => {
  let monitors: CriticalAlarmMonitors;
  let mockOnAlarmCallback: jest.Mock;

  beforeEach(() => {
    mockOnAlarmCallback = jest.fn().mockResolvedValue(undefined);
    monitors = new CriticalAlarmMonitors(
      {
        gpsTimeoutMs: 60000, // 1 minute
        autopilotHeartbeatTimeoutMs: 10000, // 10 seconds
        monitoringIntervalMs: 1000, // 1 second for faster testing
      },
      mockOnAlarmCallback
    );

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    monitors.stopMonitoring();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('GPS Monitoring', () => {
    it('should trigger GPS loss alarm when no GPS data received', async () => {
      monitors.startMonitoring();
      
      // Force immediate check without GPS data
      monitors.forceCheck();
      
      expect(mockOnAlarmCallback).toHaveBeenCalledWith(
        CriticalAlarmType.GPS_LOSS,
        expect.objectContaining({
          message: 'No GPS data received',
          value: 0,
          threshold: 1,
        })
      );
    });

    it('should trigger GPS loss alarm when GPS data is stale', async () => {
      // Provide old GPS data
      monitors.updateGPSStatus({
        fixType: 1,
        satellites: 6,
        lastUpdate: Date.now() - 120000, // 2 minutes ago
      });

      monitors.startMonitoring();
      monitors.forceCheck();

      expect(mockOnAlarmCallback).toHaveBeenCalledWith(
        CriticalAlarmType.GPS_LOSS,
        expect.objectContaining({
          message: expect.stringContaining('GPS signal lost - no update for'),
          value: expect.any(Number),
          threshold: 60, // 60 seconds timeout
        })
      );
    });

    it('should trigger GPS loss alarm when fix is lost', async () => {
      monitors.updateGPSStatus({
        fixType: 0, // No fix
        satellites: 0,
        lastUpdate: Date.now(),
      });

      monitors.startMonitoring();
      monitors.forceCheck();

      expect(mockOnAlarmCallback).toHaveBeenCalledWith(
        CriticalAlarmType.GPS_LOSS,
        expect.objectContaining({
          message: 'GPS fix lost - no position available',
          value: 0,
          threshold: 1,
        })
      );
    });

    it('should clear GPS loss alarm when GPS is restored', async () => {
      // First trigger alarm with no GPS
      monitors.forceCheck();
      expect(mockOnAlarmCallback).toHaveBeenCalledTimes(1);

      // Reset mock and provide good GPS data
      mockOnAlarmCallback.mockClear();
      monitors.updateGPSStatus({
        fixType: 1,
        satellites: 8,
        lastUpdate: Date.now(),
      });

      monitors.forceCheck();

      // Should not trigger alarm again
      expect(mockOnAlarmCallback).not.toHaveBeenCalled();
    });

    it('should include GPS metadata in alarm', async () => {
      monitors.updateGPSStatus({
        fixType: 0,
        satellites: 3,
        lastUpdate: Date.now(),
      });

      monitors.forceCheck();

      expect(mockOnAlarmCallback).toHaveBeenCalledWith(
        CriticalAlarmType.GPS_LOSS,
        expect.objectContaining({
          metadata: expect.objectContaining({
            fixType: 0,
            satellites: 3,
            quality: 'none',
          }),
        })
      );
    });
  });

  describe('Autopilot Monitoring', () => {
    it('should not trigger alarm when autopilot is disengaged', async () => {
      // Provide good GPS data to prevent GPS alarms
      monitors.updateGPSStatus({
        fixType: 1,
        satellites: 8,
        lastUpdate: Date.now(),
      });
      
      monitors.updateAutopilotStatus({
        engaged: false,
        status: 'standby',
        lastHeartbeat: Date.now() - 20000, // 20 seconds ago
      });

      monitors.startMonitoring();
      monitors.forceCheck();

      expect(mockOnAlarmCallback).not.toHaveBeenCalled();
    });

    it('should trigger autopilot failure alarm when communication is lost', async () => {
      monitors.updateAutopilotStatus({
        engaged: true,
        status: 'active',
        lastHeartbeat: Date.now() - 15000, // 15 seconds ago (exceeds 10s timeout)
      });

      monitors.startMonitoring();
      monitors.forceCheck();

      expect(mockOnAlarmCallback).toHaveBeenCalledWith(
        CriticalAlarmType.AUTOPILOT_FAILURE,
        expect.objectContaining({
          message: expect.stringContaining('Autopilot communication lost'),
          value: expect.any(Number),
          threshold: 10, // 10 seconds timeout
        })
      );
    });

    it('should trigger autopilot failure alarm when system fails', async () => {
      monitors.updateAutopilotStatus({
        engaged: true,
        status: 'failed',
        lastHeartbeat: Date.now(),
      });

      monitors.startMonitoring();
      monitors.forceCheck();

      expect(mockOnAlarmCallback).toHaveBeenCalledWith(
        CriticalAlarmType.AUTOPILOT_FAILURE,
        expect.objectContaining({
          message: 'Autopilot system failure detected - manual steering required',
          value: 1,
          threshold: 1,
        })
      );
    });

    it('should clear autopilot failure alarm when autopilot is disengaged', async () => {
      // Provide good GPS data to prevent GPS alarms
      monitors.updateGPSStatus({
        fixType: 1,
        satellites: 8,
        lastUpdate: Date.now(),
      });
      
      // First trigger alarm with failed autopilot
      monitors.updateAutopilotStatus({
        engaged: true,
        status: 'failed',
        lastHeartbeat: Date.now(),
      });

      monitors.forceCheck();
      expect(mockOnAlarmCallback).toHaveBeenCalledTimes(1);

      // Reset mock and disengage autopilot
      mockOnAlarmCallback.mockClear();
      monitors.updateAutopilotStatus({
        engaged: false,
        status: 'standby',
        lastHeartbeat: Date.now(),
      });

      monitors.forceCheck();

      // Should not trigger alarm again
      expect(mockOnAlarmCallback).not.toHaveBeenCalled();
    });

    it('should include autopilot metadata in alarm', async () => {
      monitors.updateAutopilotStatus({
        engaged: true,
        status: 'failed',
        lastHeartbeat: Date.now(),
        mode: 'wind',
      });

      monitors.forceCheck();

      expect(mockOnAlarmCallback).toHaveBeenCalledWith(
        CriticalAlarmType.AUTOPILOT_FAILURE,
        expect.objectContaining({
          metadata: expect.objectContaining({
            engaged: true,
            status: 'failed',
            mode: 'wind',
          }),
        })
      );
    });
  });

  describe('GPS Quality Calculation', () => {
    it('should calculate GPS quality correctly', () => {
      const testCases = [
        { fixType: 0, satellites: 0, expected: 'none' },
        { fixType: 0, satellites: 8, expected: 'none' },
        { fixType: 1, satellites: 2, expected: 'poor' },
        { fixType: 1, satellites: 6, expected: 'good' },
        { fixType: 2, satellites: 4, expected: 'excellent' },
        { fixType: 3, satellites: 8, expected: 'excellent' },
      ];

      testCases.forEach(({ fixType, satellites, expected }) => {
        monitors.updateGPSStatus({ fixType, satellites, lastUpdate: Date.now() });
        const status = monitors.getMonitoringStatus();
        expect(status.gpsStatus?.quality).toBe(expected);
      });
    });
  });

  describe('Monitoring Control', () => {
    it('should start and stop monitoring correctly', () => {
      expect(monitors.getMonitoringStatus().isMonitoring).toBe(false);

      monitors.startMonitoring();
      expect(monitors.getMonitoringStatus().isMonitoring).toBe(true);

      monitors.stopMonitoring();
      expect(monitors.getMonitoringStatus().isMonitoring).toBe(false);
    });

    it('should update configuration correctly', () => {
      const newConfig = {
        gpsTimeoutMs: 120000, // 2 minutes
        autopilotHeartbeatTimeoutMs: 5000, // 5 seconds
      };

      monitors.updateConfig(newConfig);

      // Verify config update by testing new timeout
      monitors.updateGPSStatus({
        fixType: 1,
        satellites: 6,
        lastUpdate: Date.now() - 90000, // 1.5 minutes ago
      });

      monitors.forceCheck();

      // Should not trigger alarm with 2-minute timeout
      expect(mockOnAlarmCallback).not.toHaveBeenCalled();
    });

    it('should reset alarm states correctly', () => {
      // Trigger alarms
      monitors.forceCheck(); // GPS alarm
      monitors.updateAutopilotStatus({
        engaged: true,
        status: 'failed',
        lastHeartbeat: Date.now(),
      });
      monitors.forceCheck(); // Autopilot alarm

      expect(mockOnAlarmCallback).toHaveBeenCalledTimes(2);

      // Reset states
      monitors.resetAlarmStates();
      const status = monitors.getMonitoringStatus();
      expect(status.activeAlarms.gpsLoss).toBe(false);
      expect(status.activeAlarms.autopilotFailure).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle callback errors gracefully', async () => {
      const errorCallback = jest.fn().mockRejectedValue(new Error('Callback failed'));
      const monitorsWithError = new CriticalAlarmMonitors({}, errorCallback);

      monitorsWithError.forceCheck();

      // Should not throw error
      expect(() => monitorsWithError.forceCheck()).not.toThrow();
    });

    it('should handle missing GPS data gracefully', () => {
      // Don't provide any GPS data
      expect(() => monitors.forceCheck()).not.toThrow();
    });

    it('should handle missing autopilot data gracefully', () => {
      // Don't provide any autopilot data
      expect(() => monitors.forceCheck()).not.toThrow();
    });
  });

  describe('Monitoring Status', () => {
    it('should return correct monitoring status', () => {
      const gpsData = {
        fixType: 1,
        satellites: 8,
        lastUpdate: Date.now(),
      };

      const autopilotData = {
        engaged: true,
        status: 'active' as const,
        lastHeartbeat: Date.now(),
      };

      monitors.updateGPSStatus(gpsData);
      monitors.updateAutopilotStatus(autopilotData);
      monitors.startMonitoring();

      const status = monitors.getMonitoringStatus();

      expect(status.isMonitoring).toBe(true);
      expect(status.gpsStatus).toEqual(expect.objectContaining({
        fixType: 1,
        satellites: 8,
        quality: 'good',
      }));
      expect(status.autopilotStatus).toEqual(expect.objectContaining({
        engaged: true,
        status: 'active',
      }));
      expect(status.activeAlarms).toEqual({
        gpsLoss: false,
        autopilotFailure: false,
      });
    });
  });
});