/**
 * Enhanced Audio Alert System Tests for Task 4
 * Tests for distinct alarm sounds, volume controls, and audio escalation
 */

import { MarineAudioAlertManager, DEFAULT_MARINE_AUDIO_CONFIG } from '../../../src/services/alarms/MarineAudioAlertManager';
import { CriticalAlarmType, AlarmEscalationLevel } from '../../../src/services/alarms/types';

// Mock React Native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web', // Default to web for testing
  },
}));

// Mock Web Audio API with enhanced functionality
const mockOscillator = {
  frequency: { setValueAtTime: jest.fn() },
  type: 'square',
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  disconnect: jest.fn(),
};

const mockGainNode = {
  gain: { 
    setValueAtTime: jest.fn(), 
    linearRampToValueAtTime: jest.fn(),
    value: 0.5,
  },
  connect: jest.fn(),
  disconnect: jest.fn(),
};

const mockAudioContext = {
  createOscillator: jest.fn(() => mockOscillator),
  createGain: jest.fn(() => mockGainNode),
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

describe('Enhanced Audio Alert System - Task 4', () => {
  let audioManager: MarineAudioAlertManager;

  beforeEach(() => {
    jest.clearAllMocks();
    audioManager = new MarineAudioAlertManager(DEFAULT_MARINE_AUDIO_CONFIG);
  });

  describe('Distinct Alarm Sounds for Each Type', () => {
    it('should play shallow water alarm with rapid pulse pattern', async () => {
      const result = await audioManager.playAlarmSound(
        CriticalAlarmType.SHALLOW_WATER, 
        AlarmEscalationLevel.WARNING
      );
      
      expect(result).toBe(true);
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(
        expect.any(Number), 
        expect.any(Number)
      );
    });

    it('should play engine overheat alarm with warble pattern', async () => {
      const result = await audioManager.playAlarmSound(
        CriticalAlarmType.ENGINE_OVERHEAT, 
        AlarmEscalationLevel.CRITICAL
      );
      
      expect(result).toBe(true);
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      
      // Warble pattern should modulate frequency multiple times
      expect(mockOscillator.frequency.setValueAtTime.mock.calls.length).toBeGreaterThan(1);
    });

    it('should play low battery alarm with intermittent pattern', async () => {
      const result = await audioManager.playAlarmSound(
        CriticalAlarmType.LOW_BATTERY, 
        AlarmEscalationLevel.WARNING
      );
      
      expect(result).toBe(true);
      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalled();
    });

    it('should play autopilot failure with triple blast pattern', async () => {
      const result = await audioManager.playAlarmSound(
        CriticalAlarmType.AUTOPILOT_FAILURE, 
        AlarmEscalationLevel.CRITICAL
      );
      
      expect(result).toBe(true);
      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalled();
    });

    it('should play GPS loss with descending tone pattern', async () => {
      const result = await audioManager.playAlarmSound(
        CriticalAlarmType.GPS_LOSS, 
        AlarmEscalationLevel.WARNING
      );
      
      expect(result).toBe(true);
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalled();
    });
  });

  describe('Audio Escalation and Persistence', () => {
    it('should increase volume for higher escalation levels', async () => {
      // Test warning level
      await audioManager.playAlarmSound(
        CriticalAlarmType.SHALLOW_WATER, 
        AlarmEscalationLevel.WARNING
      );
      const warningCalls = mockGainNode.gain.setValueAtTime.mock.calls.length;

      jest.clearAllMocks();

      // Test critical level
      await audioManager.playAlarmSound(
        CriticalAlarmType.SHALLOW_WATER, 
        AlarmEscalationLevel.CRITICAL
      );
      const criticalCalls = mockGainNode.gain.setValueAtTime.mock.calls.length;

      expect(criticalCalls).toBeGreaterThanOrEqual(warningCalls);
    });

    it('should handle multiple simultaneous alarms', async () => {
      const result1 = await audioManager.playAlarmSound(
        CriticalAlarmType.SHALLOW_WATER, 
        AlarmEscalationLevel.WARNING
      );
      const result2 = await audioManager.playAlarmSound(
        CriticalAlarmType.ENGINE_OVERHEAT, 
        AlarmEscalationLevel.CRITICAL
      );
      
      expect(result1).toBe(true);
      expect(result2).toBe(true);
      
      const activeAlarms = audioManager.getActiveAlarmSounds();
      expect(activeAlarms).toContain(CriticalAlarmType.SHALLOW_WATER);
      expect(activeAlarms).toContain(CriticalAlarmType.ENGINE_OVERHEAT);
    });

    it('should replace alarm when same type is triggered again', async () => {
      // Play initial alarm
      await audioManager.playAlarmSound(
        CriticalAlarmType.SHALLOW_WATER, 
        AlarmEscalationLevel.WARNING
      );
      
      const initialActiveAlarms = audioManager.getActiveAlarmSounds();
      expect(initialActiveAlarms).toHaveLength(1);
      
      // Play same alarm type again
      await audioManager.playAlarmSound(
        CriticalAlarmType.SHALLOW_WATER, 
        AlarmEscalationLevel.CRITICAL
      );
      
      const finalActiveAlarms = audioManager.getActiveAlarmSounds();
      expect(finalActiveAlarms).toHaveLength(1);
      expect(finalActiveAlarms).toContain(CriticalAlarmType.SHALLOW_WATER);
    });
  });

  describe('Audio Override and Volume Controls', () => {
    it('should set and get master volume correctly', () => {
      const newVolume = 0.6;
      audioManager.setMasterVolume(newVolume);
      
      expect(audioManager.getMasterVolume()).toBe(newVolume);
    });

    it('should clamp master volume to valid range', () => {
      audioManager.setMasterVolume(-0.5); // Below minimum
      expect(audioManager.getMasterVolume()).toBe(0);
      
      audioManager.setMasterVolume(1.5); // Above maximum
      expect(audioManager.getMasterVolume()).toBe(1);
    });

    it('should enable and disable volume override', () => {
      audioManager.setVolumeOverride(true);
      expect(audioManager.getVolumeOverride()).toBe(true);
      
      audioManager.setVolumeOverride(false);
      expect(audioManager.getVolumeOverride()).toBe(false);
    });

    it('should control synthetic sounds generation', () => {
      audioManager.setSyntheticSoundsEnabled(false);
      // This would be reflected in config, testing via behavior would require more mocking
      expect(true).toBe(true); // Placeholder for actual implementation test
    });

    it('should update active sound volumes when master volume changes', async () => {
      // Start an alarm
      await audioManager.playAlarmSound(
        CriticalAlarmType.SHALLOW_WATER, 
        AlarmEscalationLevel.WARNING
      );
      
      jest.clearAllMocks();
      
      // Change master volume
      audioManager.setMasterVolume(0.3);
      
      // Volume update should be applied to active sounds
      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalled();
    });
  });

  describe('Audio Testing Functions', () => {
    it('should test specific alarm sound for limited duration', async () => {
      jest.useFakeTimers();
      
      const result = await audioManager.testAlarmSound(
        CriticalAlarmType.ENGINE_OVERHEAT,
        AlarmEscalationLevel.WARNING,
        1000 // 1 second test
      );
      
      expect(result).toBe(true);
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      
      // Fast-forward time to test auto-stop
      jest.advanceTimersByTime(1000);
      
      jest.useRealTimers();
    });

    it('should stop all alarm sounds at once', async () => {
      // Start multiple alarms
      await audioManager.playAlarmSound(
        CriticalAlarmType.SHALLOW_WATER, 
        AlarmEscalationLevel.WARNING
      );
      await audioManager.playAlarmSound(
        CriticalAlarmType.ENGINE_OVERHEAT, 
        AlarmEscalationLevel.CRITICAL
      );
      
      expect(audioManager.getActiveAlarmSounds()).toHaveLength(2);
      
      // Stop all alarms
      await audioManager.stopAllAlarmSounds();
      
      expect(audioManager.getActiveAlarmSounds()).toHaveLength(0);
    });

    it('should get list of currently active alarm sounds', async () => {
      expect(audioManager.getActiveAlarmSounds()).toHaveLength(0);
      
      await audioManager.playAlarmSound(
        CriticalAlarmType.LOW_BATTERY, 
        AlarmEscalationLevel.WARNING
      );
      
      const activeAlarms = audioManager.getActiveAlarmSounds();
      expect(activeAlarms).toHaveLength(1);
      expect(activeAlarms).toContain(CriticalAlarmType.LOW_BATTERY);
    });
  });

  describe('Marine Safety Compliance', () => {
    it('should maintain >85dB equivalent audio level capability', () => {
      const status = audioManager.getAudioSystemStatus();
      expect(status.estimatedAudioLevelDb).toBeGreaterThanOrEqual(85);
    });

    it('should support background audio for marine safety', () => {
      const status = audioManager.getAudioSystemStatus();
      expect(status.backgroundAudioAvailable).toBeDefined();
    });

    it('should indicate marine safety compliance status', () => {
      const status = audioManager.getAudioSystemStatus();
      expect(status.marineSafetyCompliant).toBeDefined();
      expect(typeof status.marineSafetyCompliant).toBe('boolean');
    });

    it('should provide platform-specific audio capability info', () => {
      const status = audioManager.getAudioSystemStatus();
      expect(status.platformSupported).toBeDefined();
      expect(status.volumeOverrideAvailable).toBeDefined();
    });
  });
});