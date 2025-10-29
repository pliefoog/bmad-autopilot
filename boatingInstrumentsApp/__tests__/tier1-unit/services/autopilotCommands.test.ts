/**
 * Autopilot Commands Service Tests
 */

import { autopilotCommandService } from "../../../src/services/nmea/AutopilotCommands";
import { AutopilotCommand } from "../../../src/services/nmea/types";

describe('AutopilotCommandService', () => {
  beforeEach(() => {
    // Reset service state
    jest.clearAllMocks();
  });

  describe('sendHeadingCommand', () => {
    it('should send valid heading command', async () => {
      const heading = 270;
      
      await autopilotCommandService.sendHeadingCommand(heading);
      
      const state = autopilotCommandService.getState();
      expect(state.targetHeading).toBe(heading);
    });

    it('should reject invalid heading values', async () => {
      await expect(autopilotCommandService.sendHeadingCommand(-10))
        .rejects.toThrow('Invalid heading: -10. Must be between 0 and 360 degrees.');
      
      await expect(autopilotCommandService.sendHeadingCommand(370))
        .rejects.toThrow('Invalid heading: 370. Must be between 0 and 360 degrees.');
    });
  });

  describe('sendSpeedCommand', () => {
    it('should send valid speed command', async () => {
      const speed = 15;
      
      await autopilotCommandService.sendSpeedCommand(speed);
      
      const state = autopilotCommandService.getState();
      expect(state.targetSpeed).toBe(speed);
    });

    it('should reject invalid speed values', async () => {
      await expect(autopilotCommandService.sendSpeedCommand(-5))
        .rejects.toThrow('Invalid speed: -5. Must be between 0 and 50 knots.');
      
      await expect(autopilotCommandService.sendSpeedCommand(60))
        .rejects.toThrow('Invalid speed: 60. Must be between 0 and 50 knots.');
    });
  });

  describe('setMode', () => {
    it('should set valid autopilot mode', async () => {
      await autopilotCommandService.setMode('auto');
      
      const state = autopilotCommandService.getState();
      expect(state.mode).toBe('auto');
    });

    it('should reject invalid modes', async () => {
      await expect(autopilotCommandService.setMode('invalid'))
        .rejects.toThrow('Invalid mode: invalid. Valid modes: standby, auto, wind, nav, track');
    });
  });

  describe('engageAutopilot', () => {
    it('should engage autopilot', async () => {
      await autopilotCommandService.engageAutopilot();
      
      const state = autopilotCommandService.getState();
      expect(state.engaged).toBe(true);
      expect(state.mode).toBe('auto');
    });
  });

  describe('disengageAutopilot', () => {
    it('should disengage autopilot', async () => {
      // First engage
      await autopilotCommandService.engageAutopilot();
      
      // Then disengage
      await autopilotCommandService.disengageAutopilot();
      
      const state = autopilotCommandService.getState();
      expect(state.engaged).toBe(false);
      expect(state.mode).toBe('standby');
      expect(state.targetHeading).toBeUndefined();
      expect(state.targetSpeed).toBeUndefined();
    });
  });

  describe('validateCommand', () => {
    it('should validate heading commands', () => {
      const validCommand: AutopilotCommand = {
        type: 'heading',
        value: 180,
        timestamp: Date.now(),
        priority: 'normal',
      };
      
      expect(autopilotCommandService.validateCommand(validCommand)).toBe(true);
      
      const invalidCommand: AutopilotCommand = {
        type: 'heading',
        value: 400,
        timestamp: Date.now(),
        priority: 'normal',
      };
      
      expect(autopilotCommandService.validateCommand(invalidCommand)).toBe(false);
    });

    it('should validate speed commands', () => {
      const validCommand: AutopilotCommand = {
        type: 'speed',
        value: 10,
        timestamp: Date.now(),
        priority: 'normal',
      };
      
      expect(autopilotCommandService.validateCommand(validCommand)).toBe(true);
      
      const invalidCommand: AutopilotCommand = {
        type: 'speed',
        value: -5,
        timestamp: Date.now(),
        priority: 'normal',
      };
      
      expect(autopilotCommandService.validateCommand(invalidCommand)).toBe(false);
    });

    it('should validate mode commands', () => {
      const validCommand: AutopilotCommand = {
        type: 'mode',
        value: 'auto',
        timestamp: Date.now(),
        priority: 'normal',
      };
      
      expect(autopilotCommandService.validateCommand(validCommand)).toBe(true);
      
      const invalidCommand: AutopilotCommand = {
        type: 'mode',
        value: 'invalid',
        timestamp: Date.now(),
        priority: 'normal',
      };
      
      expect(autopilotCommandService.validateCommand(invalidCommand)).toBe(false);
    });
  });

  describe('event handling', () => {
    it('should emit command events', async () => {
      let commandEvent: any = null;
      
      autopilotCommandService.addEventListener('command', (event: any) => {
        commandEvent = event;
      });
      
      await autopilotCommandService.sendHeadingCommand(90);
      
      expect(commandEvent).toBeTruthy();
      expect(commandEvent.command.type).toBe('heading');
      expect(commandEvent.command.value).toBe(90);
      expect(commandEvent.nmea).toContain('APAPB');
    });
  });

  describe('getState', () => {
    it('should return current autopilot state', () => {
      const state = autopilotCommandService.getState();
      
      expect(state).toHaveProperty('engaged');
      expect(state).toHaveProperty('mode');
      expect(state).toHaveProperty('lastUpdate');
      expect(typeof state.lastUpdate).toBe('number');
    });
  });
});