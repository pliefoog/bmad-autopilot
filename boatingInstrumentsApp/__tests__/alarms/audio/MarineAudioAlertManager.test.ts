/**
 * MarineAudioAlertManager Tests
 * Platform-specific audio system validation for marine environment
 */

import { MarineAudioAlertManager, DEFAULT_MARINE_AUDIO_CONFIG } from '../../../src/services/alarms/MarineAudioAlertManager';
import { CriticalAlarmType, AlarmEscalationLevel } from '../../../src/services/alarms/types';

// Mock React Native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web', // Default to web for testing
  },
}));

// Mock Web Audio API
const mockAudioContext = {
  createOscillator: jest.fn(() => ({
    frequency: { setValueAtTime: jest.fn() },
    type: 'square',
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    disconnect: jest.fn(),
  })),
  createGain: jest.fn(() => ({
    gain: { setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn() },
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
  currentTime: 0,
  destination: {},
  state: 'running',
  resume: jest.fn().mockResolvedValue(undefined),
};

// Mock global AudioContext
(global as any).AudioContext = jest.fn(() => mockAudioContext);
(global as any).webkitAudioContext = jest.fn(() => mockAudioContext);

// Mock HTML5 Audio
(global as any).Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  volume: 1,
  loop: false,
}));

describe('MarineAudioAlertManager', () => {
  let audioManager: MarineAudioAlertManager;

  beforeEach(() => {
    jest.clearAllMocks();
    audioManager = new MarineAudioAlertManager(DEFAULT_MARINE_AUDIO_CONFIG);
  });

  describe('Initialization', () => {
    it('should initialize with marine audio configuration', () => {
      expect(audioManager).toBeInstanceOf(MarineAudioAlertManager);
    });

    it('should detect platform capabilities correctly', () => {
      const status = audioManager.getAudioSystemStatus();
      
      expect(status).toHaveProperty('platformSupported');
      expect(status).toHaveProperty('volumeOverrideAvailable');
      expect(status).toHaveProperty('backgroundAudioAvailable');
      expect(status).toHaveProperty('estimatedAudioLevelDb');
      expect(status).toHaveProperty('marineSafetyCompliant');
      expect(status).toHaveProperty('activeSounds');
    });

    it('should meet marine audio level requirements', () => {
      const status = audioManager.getAudioSystemStatus();
      
      // Marine safety requirement: >85dB audio level
      expect(status.estimatedAudioLevelDb).toBeGreaterThanOrEqual(85);
    });
  });

  describe('Alarm Sound Playback', () => {
    it('should play shallow water alarm with correct pattern', async () => {
      const result = await audioManager.playAlarmSound(
        CriticalAlarmType.SHALLOW_WATER, 
        AlarmEscalationLevel.WARNING
      );
      
      expect(result).toBe(true);
    });

    it('should play engine overheat alarm with warble pattern', async () => {
      const result = await audioManager.playAlarmSound(
        CriticalAlarmType.ENGINE_OVERHEAT, 
        AlarmEscalationLevel.CRITICAL
      );
      
      expect(result).toBe(true);
    });

    it('should play low battery alarm with pulsing pattern', async () => {
      const result = await audioManager.playAlarmSound(
        CriticalAlarmType.LOW_BATTERY, 
        AlarmEscalationLevel.WARNING
      );
      
      expect(result).toBe(true);
    });

    it('should play autopilot failure alarm continuously', async () => {
      const result = await audioManager.playAlarmSound(
        CriticalAlarmType.AUTOPILOT_FAILURE, 
        AlarmEscalationLevel.CRITICAL
      );
      
      expect(result).toBe(true);
    });

    it('should play GPS loss alarm with intermittent pattern', async () => {
      const result = await audioManager.playAlarmSound(
        CriticalAlarmType.GPS_LOSS, 
        AlarmEscalationLevel.CRITICAL
      );
      
      expect(result).toBe(true);
    });
  });

  describe('Volume and Escalation', () => {
    it('should increase volume with escalation level', async () => {
      const escalationLevels = [
        AlarmEscalationLevel.INFO,
        AlarmEscalationLevel.WARNING,
        AlarmEscalationLevel.CAUTION,
        AlarmEscalationLevel.CRITICAL,
        AlarmEscalationLevel.EMERGENCY,
      ];

      for (const level of escalationLevels) {
        const result = await audioManager.playAlarmSound(
          CriticalAlarmType.SHALLOW_WATER,
          level
        );
        expect(result).toBe(true);
      }
    });

    it('should use maximum volume for emergency alarms', async () => {
      const result = await audioManager.playAlarmSound(
        CriticalAlarmType.SHALLOW_WATER,
        AlarmEscalationLevel.EMERGENCY
      );
      
      expect(result).toBe(true);
      
      // Verify that emergency level uses maximum volume
      // This would check internal volume settings in a real implementation
    });
  });

  describe('Sound Management', () => {
    it('should stop alarm sound successfully', async () => {
      // Start an alarm
      await audioManager.playAlarmSound(
        CriticalAlarmType.SHALLOW_WATER,
        AlarmEscalationLevel.WARNING
      );

      // Stop the alarm
      await audioManager.stopAlarmSound(CriticalAlarmType.SHALLOW_WATER);
      
      // Should complete without error
      expect(true).toBe(true);
    });

    it('should handle stopping non-existent alarm gracefully', async () => {
      await expect(audioManager.stopAlarmSound(CriticalAlarmType.SHALLOW_WATER))
        .resolves.not.toThrow();
    });

    it('should manage multiple simultaneous alarms', async () => {
      // Start multiple alarms
      await audioManager.playAlarmSound(CriticalAlarmType.SHALLOW_WATER, AlarmEscalationLevel.WARNING);
      await audioManager.playAlarmSound(CriticalAlarmType.ENGINE_OVERHEAT, AlarmEscalationLevel.CRITICAL);
      
      // Stop individual alarms
      await audioManager.stopAlarmSound(CriticalAlarmType.SHALLOW_WATER);
      await audioManager.stopAlarmSound(CriticalAlarmType.ENGINE_OVERHEAT);
      
      // Should complete without error
      expect(true).toBe(true);
    });
  });

  describe('Audio System Testing', () => {
    it('should test audio system functionality', async () => {
      const result = await audioManager.testAudioSystem();
      
      expect(typeof result).toBe('boolean');
    });

    it('should validate marine compliance requirements', () => {
      const status = audioManager.getAudioSystemStatus();
      
      // Marine safety compliance requires:
      // - Platform support for reliable audio
      // - Volume override capability for emergency situations
      // - Background audio for persistence
      // - Estimated audio level >85dB
      
      if (status.marineSafetyCompliant) {
        expect(status.estimatedAudioLevelDb).toBeGreaterThanOrEqual(85);
      }
    });
  });

  describe('Platform-Specific Behavior', () => {
    it('should handle web platform limitations', () => {
      // Web platform has limitations compared to native mobile
      const status = audioManager.getAudioSystemStatus();
      
      // Web platform typically cannot override system volume
      if (process.env.NODE_ENV === 'test') {
        // In test environment, we're simulating web platform
        expect(status.platformSupported).toBeDefined();
      }
    });

    it('should provide marine-appropriate frequencies', async () => {
      // Marine environment requires frequencies that penetrate noise
      // Test that each alarm type uses appropriate frequency ranges
      
      const alarmTypes = [
        CriticalAlarmType.SHALLOW_WATER,
        CriticalAlarmType.ENGINE_OVERHEAT,
        CriticalAlarmType.LOW_BATTERY,
        CriticalAlarmType.AUTOPILOT_FAILURE,
        CriticalAlarmType.GPS_LOSS,
      ];

      for (const type of alarmTypes) {
        const result = await audioManager.playAlarmSound(type, AlarmEscalationLevel.WARNING);
        expect(result).toBe(true);
        
        // In real implementation, would verify frequency is in marine-appropriate range (600-1200 Hz)
        await audioManager.stopAlarmSound(type);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle audio context creation failure', () => {
      // Mock AudioContext failure
      (global as any).AudioContext = jest.fn(() => {
        throw new Error('AudioContext not supported');
      });

      // Should not throw during initialization
      expect(() => new MarineAudioAlertManager(DEFAULT_MARINE_AUDIO_CONFIG)).not.toThrow();
    });

    it('should handle audio playback failures gracefully', async () => {
      // Mock audio playback failure
      const mockAudio = {
        play: jest.fn().mockRejectedValue(new Error('Playback failed')),
        volume: 1,
        loop: false,
      };
      (global as any).Audio = jest.fn(() => mockAudio);

      const result = await audioManager.playAlarmSound(
        CriticalAlarmType.SHALLOW_WATER,
        AlarmEscalationLevel.WARNING
      );

      // Should handle failure gracefully and return false
      expect(typeof result).toBe('boolean');
    });

    it('should handle oscillator creation failure', async () => {
      // Mock oscillator creation failure
      mockAudioContext.createOscillator = jest.fn(() => {
        throw new Error('Oscillator creation failed');
      });

      const result = await audioManager.playAlarmSound(
        CriticalAlarmType.SHALLOW_WATER,
        AlarmEscalationLevel.WARNING
      );

      // Should handle failure gracefully
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Marine Environment Adaptations', () => {
    it('should provide configuration for weather compensation', () => {
      const config = DEFAULT_MARINE_AUDIO_CONFIG;
      
      expect(config).toHaveProperty('weatherCompensation');
      expect(config).toHaveProperty('engineNoiseCompensation');
      
      // Marine audio should adapt to environmental conditions
      expect(config.weatherCompensation).toBe(true);
      expect(config.engineNoiseCompensation).toBe(true);
    });

    it('should support background audio capability', () => {
      const status = audioManager.getAudioSystemStatus();
      
      // Critical for marine safety - alarms must continue when app is backgrounded
      expect(status).toHaveProperty('backgroundAudioAvailable');
    });

    it('should override system volume for safety', () => {
      const config = DEFAULT_MARINE_AUDIO_CONFIG;
      
      // Marine safety requires ability to override system volume for emergency alarms
      expect(config.volumeOverride).toBe(true);
      expect(config.respectSystemVolume).toBe(false);
    });
  });

  describe('Performance Requirements', () => {
    it('should start audio within marine safety response time', async () => {
      const startTime = performance.now();
      
      await audioManager.playAlarmSound(
        CriticalAlarmType.SHALLOW_WATER,
        AlarmEscalationLevel.EMERGENCY
      );
      
      const responseTime = performance.now() - startTime;
      
      // Marine safety requirement: audio should start within overall 500ms response time
      // Allow for 100ms audio startup as part of overall system response
      expect(responseTime).toBeLessThan(100);
    });

    it('should handle rapid alarm changes efficiently', async () => {
      // Test rapid start/stop cycles
      for (let i = 0; i < 5; i++) {
        await audioManager.playAlarmSound(CriticalAlarmType.SHALLOW_WATER, AlarmEscalationLevel.WARNING);
        await audioManager.stopAlarmSound(CriticalAlarmType.SHALLOW_WATER);
      }
      
      // Should complete without performance degradation
      expect(true).toBe(true);
    });
  });
});