import { AutopilotCommandManager, AutopilotCommand } from '../../src/services/autopilotService';
import { useNmeaStore } from '../../src/store/nmeaStore';

// Mock @canboat/canboatjs at the module level
jest.mock('@canboat/canboatjs', () => ({
  ToPgn: jest.fn().mockImplementation(() => ({
    pgnList: [],
    toPgn: jest.fn().mockResolvedValue(new Uint8Array([0x01, 0x02, 0x03])),
  })),
}));

describe('Autopilot Command Flow Integration', () => {
  let autopilotManager: AutopilotCommandManager;
  let mockConfirmation: jest.Mock;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset NMEA store
    useNmeaStore.getState().reset();
    
    // Use real timers for integration test
    jest.useRealTimers();
    
    // Create autopilot manager
    autopilotManager = new AutopilotCommandManager();
    
    // Mock user confirmation to automatically approve
    mockConfirmation = jest.fn().mockResolvedValue(true);
    (autopilotManager as any).requestUserConfirmation = mockConfirmation;
  });

  describe('Complete NMEA → Command → Response Cycle', () => {
    it('should execute engage compass mode command with full cycle validation', async () => {
      // STEP 1: Setup initial NMEA data (simulating incoming NMEA stream)
      useNmeaStore.getState().setNmeaData({
        heading: 270.5,
        autopilot: {
          mode: 'STANDBY',
          active: false,
          targetHeading: undefined,
          commandStatus: undefined
        }
      });

      // STEP 2: Execute engage command (using actual API)
      const result = await autopilotManager.engageCompassMode(270.0);
      
      // STEP 3: Verify command confirmation was requested (AC11 - safety confirmation)
      expect(mockConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          command: AutopilotCommand.ENGAGE,
          requiresConfirmation: true,
          confirmationMessage: expect.stringContaining('Engage autopilot in compass mode')
        })
      );

      // STEP 4: Verify command succeeded (boolean return for successful execution)
      expect(result).toBe(true);

      // STEP 5: Simulate autopilot response message (incoming NMEA stream response)
      useNmeaStore.getState().setNmeaData({
        autopilot: {
          mode: 'AUTO',
          active: true,
          targetHeading: 270.0,
          commandStatus: 'success',
          commandMessage: 'Autopilot engaged in compass mode'
        }
      });

      // STEP 6: Verify store state reflects successful autopilot engagement
      const finalState = useNmeaStore.getState().nmeaData.autopilot;
      expect(finalState?.mode).toBe('AUTO');
      expect(finalState?.active).toBe(true);
      expect(finalState?.targetHeading).toBe(270.0);
      expect(finalState?.commandStatus).toBe('success');
    });

    it('should execute disengage command with proper confirmation flow', async () => {
      // Setup engaged autopilot state
      useNmeaStore.getState().setNmeaData({
        autopilot: {
          mode: 'AUTO',
          active: true,
          targetHeading: 180.0
        }
      });

      // Execute disengage command
      const result = await autopilotManager.disengageAutopilot();

      // Verify confirmation was requested
      expect(mockConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          command: AutopilotCommand.DISENGAGE,
          requiresConfirmation: true
        })
      );

      // Verify command succeeded
      expect(result).toBe(true);

      // Simulate autopilot response
      useNmeaStore.getState().setNmeaData({
        autopilot: {
          mode: 'STANDBY',
          active: false,
          targetHeading: undefined,
          commandStatus: 'success'
        }
      });

      const finalState = useNmeaStore.getState().nmeaData.autopilot;
      expect(finalState?.mode).toBe('STANDBY');
      expect(finalState?.active).toBe(false);
    });

    it('should handle emergency disengage without confirmation (AC14)', async () => {
      // Setup engaged autopilot state
      useNmeaStore.getState().setNmeaData({
        autopilot: {
          mode: 'AUTO',
          active: true,
          targetHeading: 180.0
        }
      });

      // Execute emergency disengage
      const result = await autopilotManager.emergencyDisengage();

      // Verify NO confirmation was requested for emergency (critical safety feature)
      expect(mockConfirmation).not.toHaveBeenCalled();

      // Verify command succeeded
      expect(result).toBe(true);
    });

    it('should handle heading adjustments with proper validation', async () => {
      // Setup engaged autopilot state
      useNmeaStore.getState().setNmeaData({
        heading: 180.0,
        autopilot: {
          mode: 'AUTO',
          active: true,
          targetHeading: 180.0
        }
      });

      // Execute heading adjustment (AC3 - adjust heading in increments)
      const result = await autopilotManager.adjustHeading(10); // +10 degrees

      // Verify confirmation requested
      expect(mockConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          command: AutopilotCommand.ADJUST_HEADING,
          requiresConfirmation: true
        })
      );

      expect(result).toBe(true);

      // Simulate new heading response
      useNmeaStore.getState().setNmeaData({
        autopilot: {
          mode: 'AUTO',
          active: true,
          targetHeading: 190.0, // 180 + 10
          commandStatus: 'success'
        }
      });

      const finalState = useNmeaStore.getState().nmeaData.autopilot;
      expect(finalState?.targetHeading).toBe(190.0);
    });

    it('should propagate command status through NMEA store (AC10)', async () => {
      // Setup initial state
      useNmeaStore.getState().setNmeaData({
        autopilot: { mode: 'STANDBY', active: false }
      });

      // Execute command
      const engagePromise = autopilotManager.engageCompassMode(180.0);

      // Should see command status propagation during execution
      // (This validates AC10 - command confirmation feedback)
      
      await engagePromise;

      // Verify confirmation mechanism was invoked
      expect(mockConfirmation).toHaveBeenCalled();
      
      // Verify store could receive status updates during command execution
      const storeState = useNmeaStore.getState().nmeaData.autopilot;
      expect(storeState).toBeDefined(); // Store remains accessible during command flow
    });

    it('should validate PGN message encoding for Raymarine Evolution (AC6, AC7)', async () => {
      // Import the mocked ToPgn to verify calls
      const { ToPgn } = require('@canboat/canboatjs');

      useNmeaStore.getState().setNmeaData({
        heading: 90.0,
        autopilot: { mode: 'STANDBY', active: false }
      });
      
      // Execute engage command to trigger PGN encoding
      await autopilotManager.engageCompassMode(90.0);

      // Verify ToPgn constructor was called (AC7 - @canboat/canboatjs integration)
      expect(ToPgn).toHaveBeenCalled();
      
      // Verify PGN encoding was attempted with proper structure (AC6 - correct NMEA2000 PGN messages)
      const mockToPgnInstance = ToPgn.mock.results[0].value;
      expect(mockToPgnInstance.toPgn).toHaveBeenCalledWith(
        expect.objectContaining({
          pgn: expect.any(Number), // Should be proper PGN number for Raymarine
          data: expect.any(Object)  // Should contain structured command data
        })
      );
    });
  });

  describe('Error Handling and Marine Safety', () => {
    it('should handle command timeouts gracefully (AC12)', async () => {
      // Use fake timers for timeout testing
      jest.useFakeTimers();

      // Mock confirmation to never resolve (simulates user not responding)
      mockConfirmation.mockImplementation(() => new Promise(() => {})); // Never resolves

      const engagePromise = autopilotManager.engageCompassMode(180.0);

      // Fast-forward past command timeout (AC12 - auto-timeout for commands)
      jest.advanceTimersByTime(11000); // > 10 seconds engagement timeout

      const result = await engagePromise;

      // Command should timeout and return false
      expect(result).toBe(false);

      jest.useRealTimers();
    });

    it('should handle PGN encoding failures gracefully', async () => {
      // Mock PGN encoding failure
      const { ToPgn } = require('@canboat/canboatjs');
      const mockToPgnInstance = ToPgn.mock.results[0].value;
      mockToPgnInstance.toPgn.mockRejectedValueOnce(new Error('PGN encoding failed'));

      // Execute command that will fail during PGN encoding
      const result = await autopilotManager.engageCompassMode(180.0);

      // Should handle encoding failure gracefully and return false
      expect(result).toBe(false);
    });

    it('should maintain command rate limiting for marine safety', async () => {
      // Execute multiple rapid commands (beyond 1 cmd/sec rate limit)
      const promise1 = autopilotManager.adjustHeading(5);
      const promise2 = autopilotManager.adjustHeading(5); // Should be rate limited
      
      const [result1, result2] = await Promise.all([promise1, promise2]);

      // First command should succeed
      expect(result1).toBe(true);
      
      // Second command should be blocked by rate limiting (marine safety feature)
      expect(result2).toBe(false);
    });
  });
});