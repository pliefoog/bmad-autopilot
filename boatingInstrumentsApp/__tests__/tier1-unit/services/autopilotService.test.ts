import { AutopilotCommandManager, AutopilotMode } from "../../../src/services/autopilotService";
import { useNmeaStore } from "../../../src/store/nmeaStore";

// Mock the store
jest.mock('../../../src/store/nmeaStore');
const mockUseNmeaStore = useNmeaStore as jest.MockedFunction<typeof useNmeaStore>;

// Mock canboat library
jest.mock('@canboat/canboatjs', () => ({
  ToPgn: jest.fn().mockReturnValue(new Uint8Array([0x01, 0x02, 0x03])),
}));

describe('AutopilotCommandManager', () => {
  let commandManager: AutopilotCommandManager;
  let mockNmeaConnection: any;
  let mockStore: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Use real timers for async confirmation logic to prevent hanging
    jest.useRealTimers();

    // Setup mock NMEA connection
    mockNmeaConnection = {
      sendData: jest.fn().mockResolvedValue(true),
    };

    // Setup mock store
    mockStore = {
      nmeaData: {
        autopilot: {
          active: false,
          mode: AutopilotMode.STANDBY,
          targetHeading: 0,
        },
        heading: 270,
      },
      setNmeaData: jest.fn(),
    };

    mockUseNmeaStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockStore);
      }
      return mockStore;
    });

    mockUseNmeaStore.getState = jest.fn().mockReturnValue(mockStore);

    // Create command manager
    commandManager = new AutopilotCommandManager(mockNmeaConnection);
    
    // Reset rate limiting for fresh test
    commandManager['lastCommandTime'] = 0;
  });

  afterEach(() => {
    commandManager.disconnect();
    // Clean up any remaining timers
    jest.clearAllTimers();
  });

  describe('AC1: Engage autopilot in compass mode', () => {
    it('should engage autopilot with current heading', async () => {
      // Mock user confirmation - simulate auto-confirmation for testing
      const result = await commandManager.engageCompassMode(270);
      expect(result).toBe(true);
      expect(mockNmeaConnection.sendData).toHaveBeenCalled();
    });

    it('should use provided heading if specified', async () => {
      const result = await commandManager.engageCompassMode(180);
      expect(result).toBe(true);
      expect(mockNmeaConnection.sendData).toHaveBeenCalled();
    });
  });

  describe('AC2: Disengage autopilot', () => {
    it('should disengage autopilot and return to manual steering', async () => {
      const result = await commandManager.disengageAutopilot();
      expect(result).toBe(true);
      expect(mockNmeaConnection.sendData).toHaveBeenCalled();
    });
  });

  describe('AC3: Adjust target heading', () => {
    beforeEach(() => {
      // Set autopilot as active for heading adjustments
      mockStore.nmeaData.autopilot = {
        active: true,
        targetHeading: 270,
        mode: AutopilotMode.AUTO,
      };
    });

    it('should adjust heading by +1°', async () => {
      const result = await commandManager.adjustHeading(1);
      expect(result).toBe(true);
      expect(mockNmeaConnection.sendData).toHaveBeenCalled();
    });

    it('should adjust heading by -1°', async () => {
      const result = await commandManager.adjustHeading(-1);
      expect(result).toBe(true);
      expect(mockNmeaConnection.sendData).toHaveBeenCalled();
    });

    it('should adjust heading by +10°', async () => {
      const result = await commandManager.adjustHeading(10);
      expect(result).toBe(true);
      expect(mockNmeaConnection.sendData).toHaveBeenCalled();
    });

    it('should adjust heading by -10°', async () => {
      const result = await commandManager.adjustHeading(-10);
      expect(result).toBe(true);
      expect(mockNmeaConnection.sendData).toHaveBeenCalled();
    });

    it('should reject invalid adjustment amounts', async () => {
      await expect(commandManager.adjustHeading(5)).rejects.toThrow(
        'Heading adjustments must be ±1° or ±10°'
      );
    });

    it('should reject adjustments when autopilot inactive', async () => {
      mockStore.nmeaData.autopilot.active = false;
      
      await expect(commandManager.adjustHeading(1)).rejects.toThrow(
        'Autopilot must be active to adjust heading'
      );
    });
  });

  describe('AC5: Standby command', () => {
    it('should set autopilot to standby immediately', async () => {
      const result = await commandManager.setStandby();
      expect(result).toBe(true);
      expect(mockNmeaConnection.sendData).toHaveBeenCalled();
    });
  });

  describe('AC6-8: PGN message generation and transmission', () => {
    it('should generate correct PGN for heading command', async () => {
      mockStore.nmeaData.autopilot.active = true;
      mockStore.nmeaData.autopilot.targetHeading = 270;
      
      await commandManager.adjustHeading(1);
      
      expect(mockNmeaConnection.sendData).toHaveBeenCalledWith(
        expect.any(Object)
      );
    });

    it('should handle PGN transmission errors gracefully', async () => {
      mockNmeaConnection.sendData = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const result = await commandManager.setStandby();
      expect(result).toBe(false);
    });
  });

  describe('AC14: Emergency disengage', () => {
    it('should perform emergency disengage bypassing all limits', async () => {
      const result = await commandManager.emergencyDisengage();
      expect(result).toBe(true);
      expect(mockNmeaConnection.sendData).toHaveBeenCalled();
    });

    it('should update store immediately on emergency', async () => {
      await commandManager.emergencyDisengage();
      
      expect(mockStore.setNmeaData).toHaveBeenCalledWith(
        expect.objectContaining({
          autopilot: expect.objectContaining({
            active: false,
            mode: AutopilotMode.STANDBY,
          })
        })
      );
    });
  });

  describe('AC4: Rate limiting', () => {
    it('should enforce 1 second minimum between commands', async () => {
      // Use fake timers specifically for rate limiting tests
      jest.useFakeTimers();
      
      // First command should succeed
      const result1 = await commandManager.setStandby();
      expect(result1).toBe(true);
      
      // Second command immediately should throw error due to rate limiting
      await expect(commandManager.setStandby()).rejects.toThrow('Command rate limited');
      
      // Advance time by 1 second
      jest.advanceTimersByTime(1000);
      
      // Third command should now succeed
      const result3 = await commandManager.setStandby();
      expect(result3).toBe(true);
      
      jest.useRealTimers();
    });

    it('should allow emergency disengage to bypass rate limiting', async () => {
      jest.useFakeTimers();
      
      // First command
      await commandManager.setStandby();
      
      // Emergency disengage should work immediately despite rate limiting
      const emergencyResult = await commandManager.emergencyDisengage();
      expect(emergencyResult).toBe(true);
      
      jest.useRealTimers();
    });
  });

  describe('Connection management', () => {
    it('should connect to NMEA system', () => {
      const newConnection = { sendData: jest.fn() };
      commandManager.connect(newConnection);
      expect(commandManager['nmeaConnection']).toBe(newConnection);
    });

    it('should disconnect and cleanup', () => {
      commandManager.connect(mockNmeaConnection);
      commandManager.disconnect();
      expect(commandManager['isConnected']).toBe(false);
    });

    it('should check autopilot active status', () => {
      mockStore.nmeaData.autopilot.active = true;
      expect(commandManager.isAutopilotActive()).toBe(true);
      
      mockStore.nmeaData.autopilot.active = false;
      expect(commandManager.isAutopilotActive()).toBe(false);
    });
  });
});