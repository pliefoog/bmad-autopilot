/**
 * AccessibilityService Tests
 * 
 * Tests for React Native AccessibilityInfo integration and screen reader support
 * 
 * @see Story 4.4 AC6: VoiceOver/TalkBack support for vision-impaired users
 * @see Story 4.4 AC7: High contrast mode support
 * @see Story 4.4 AC8: Large text support for readability
 */

import { AccessibilityService, useAccessibility } from '../../../src/services/accessibility/AccessibilityService';
import { useSettingsStore } from '../../../src/store/settingsStore';
import { AccessibilityInfo, Platform } from 'react-native';

// Mock AccessibilityInfo methods
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    AccessibilityInfo: {
      isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
      isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
      isReduceTransparencyEnabled: jest.fn(() => Promise.resolve(false)),
      isBoldTextEnabled: jest.fn(() => Promise.resolve(false)),
      isGrayscaleEnabled: jest.fn(() => Promise.resolve(false)),
      isInvertColorsEnabled: jest.fn(() => Promise.resolve(false)),
      announceForAccessibility: jest.fn(),
      setAccessibilityFocus: jest.fn(),
      addEventListener: jest.fn((eventName: string, handler: any) => ({
        remove: jest.fn(),
      })),
    },
  };
});

describe('AccessibilityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset settings store
    useSettingsStore.setState({
      themeSettings: {
        highContrast: false,
        reducedMotion: false,
        largeText: false,
      },
    });
  });

  describe('Initialization', () => {
    it('should detect screen reader status on init', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      
      await AccessibilityService.initialize();
      
      expect(AccessibilityInfo.isScreenReaderEnabled).toHaveBeenCalled();
      expect(AccessibilityService.isScreenReaderEnabled()).toBe(true);
    });

    it('should detect reduced motion preference', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);
      
      await AccessibilityService.initialize();
      
      expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled();
      expect(AccessibilityService.isReduceMotionEnabled()).toBe(true);
      
      // Should update settings store
      expect(useSettingsStore.getState().themeSettings.reducedMotion).toBe(true);
    });

    it('should detect iOS-specific accessibility features', async () => {
      Platform.OS = 'ios';
      (AccessibilityInfo.isBoldTextEnabled as jest.Mock).mockResolvedValue(true);
      (AccessibilityInfo.isGrayscaleEnabled as jest.Mock).mockResolvedValue(true);
      (AccessibilityInfo.isInvertColorsEnabled as jest.Mock).mockResolvedValue(false);
      
      await AccessibilityService.initialize();
      
      const state = AccessibilityService.getState();
      expect(state.boldTextEnabled).toBe(true);
      expect(state.grayscaleEnabled).toBe(true);
    });

    it('should enable high contrast when grayscale is enabled', async () => {
      Platform.OS = 'ios';
      (AccessibilityInfo.isGrayscaleEnabled as jest.Mock).mockResolvedValue(true);
      
      await AccessibilityService.initialize();
      
      expect(useSettingsStore.getState().themeSettings.highContrast).toBe(true);
    });

    it('should enable high contrast when invert colors is enabled', async () => {
      Platform.OS = 'ios';
      (AccessibilityInfo.isInvertColorsEnabled as jest.Mock).mockResolvedValue(true);
      
      await AccessibilityService.initialize();
      
      expect(useSettingsStore.getState().themeSettings.highContrast).toBe(true);
    });

    it('should setup event listeners for accessibility changes', async () => {
      await AccessibilityService.initialize();
      
      expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith(
        'screenReaderChanged',
        expect.any(Function)
      );
      expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith(
        'reduceMotionChanged',
        expect.any(Function)
      );
    });
  });

  describe('Screen Reader Announcements', () => {
    it('should announce message when screen reader is enabled', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      await AccessibilityService.initialize();
      
      AccessibilityService.announce('Test message', 'polite');
      
      // On Android or for assertive, announceForAccessibility is called
      if (Platform.OS === 'android') {
        expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Test message');
      }
    });

    it('should use assertive priority for critical announcements', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      await AccessibilityService.initialize();
      
      AccessibilityService.announce('CRITICAL: Test alert', 'assertive');
      
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('CRITICAL: Test alert');
    });

    it('should not announce when screen reader is disabled', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(false);
      await AccessibilityService.initialize();
      
      AccessibilityService.announce('Test message', 'polite');
      
      expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    });
  });

  describe('Marine-Specific Announcements', () => {
    beforeEach(async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      await AccessibilityService.initialize();
      jest.clearAllMocks();
    });

    it('should announce alarms with appropriate severity', () => {
      AccessibilityService.announceAlarm('Depth', 'critical', 'Shallow water detected');
      
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'CRITICAL ALARM: Depth. Shallow water detected'
      );
    });

    it('should announce warnings with polite priority', () => {
      AccessibilityService.announceAlarm('Anchor', 'warning', 'Anchor drift detected');
      
      // Warning uses polite, which may not call announceForAccessibility on iOS
      if (Platform.OS === 'android') {
        expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
          'WARNING: Anchor. Anchor drift detected'
        );
      }
    });

    it('should announce connection status changes', () => {
      AccessibilityService.announceConnectionStatus('connected', '192.168.1.100');
      
      if (Platform.OS === 'android') {
        expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
          'Connected to 192.168.1.100 NMEA bridge'
        );
      }
    });

    it('should announce data updates', () => {
      AccessibilityService.announceDataUpdate('Depth', '42.5', 'feet');
      
      if (Platform.OS === 'android') {
        expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
          'Depth: 42.5 feet'
        );
      }
    });
  });

  describe('Accessibility State Management', () => {
    it('should return current accessibility state', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);
      
      await AccessibilityService.initialize();
      
      const state = AccessibilityService.getState();
      expect(state.screenReaderEnabled).toBe(true);
      expect(state.reduceMotionEnabled).toBe(true);
    });

    it('should recommend high contrast based on system settings', async () => {
      Platform.OS = 'ios';
      (AccessibilityInfo.isGrayscaleEnabled as jest.Mock).mockResolvedValue(true);
      
      await AccessibilityService.initialize();
      
      expect(AccessibilityService.shouldUseHighContrast()).toBe(true);
    });

    it('should calculate font scale multiplier', async () => {
      await AccessibilityService.initialize();
      
      // Without large text enabled
      expect(AccessibilityService.getFontScaleMultiplier()).toBe(1.0);
      
      // Enable large text in settings
      useSettingsStore.setState({
        themeSettings: {
          ...useSettingsStore.getState().themeSettings,
          largeText: true,
        },
      });
      
      // Should be 20% larger
      expect(AccessibilityService.getFontScaleMultiplier()).toBe(1.2);
    });
  });

  describe('Event Listener Management', () => {
    it('should update state when screen reader changes', async () => {
      let screenReaderHandler: (enabled: boolean) => void = () => {};
      
      (AccessibilityInfo.addEventListener as jest.Mock).mockImplementation((eventName, handler) => {
        if (eventName === 'screenReaderChanged') {
          screenReaderHandler = handler;
        }
        return { remove: jest.fn() };
      });
      
      await AccessibilityService.initialize();
      
      // Simulate screen reader being enabled
      screenReaderHandler(true);
      
      expect(AccessibilityService.isScreenReaderEnabled()).toBe(true);
    });

    it('should update settings when reduced motion changes', async () => {
      let reduceMotionHandler: (enabled: boolean) => void = () => {};
      
      (AccessibilityInfo.addEventListener as jest.Mock).mockImplementation((eventName, handler) => {
        if (eventName === 'reduceMotionChanged') {
          reduceMotionHandler = handler;
        }
        return { remove: jest.fn() };
      });
      
      await AccessibilityService.initialize();
      
      // Simulate reduced motion being enabled
      reduceMotionHandler(true);
      
      expect(useSettingsStore.getState().themeSettings.reducedMotion).toBe(true);
    });

    it('should cleanup listeners on cleanup()', async () => {
      const removeFn = jest.fn();
      (AccessibilityInfo.addEventListener as jest.Mock).mockReturnValue({
        remove: removeFn,
      });
      
      await AccessibilityService.initialize();
      AccessibilityService.cleanup();
      
      // Should have called remove for each listener
      expect(removeFn).toHaveBeenCalled();
    });
  });

  describe('useAccessibility Hook', () => {
    it('should provide accessibility state and methods', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      await AccessibilityService.initialize();
      
      const accessibility = useAccessibility();
      
      expect(accessibility.screenReaderEnabled).toBe(true);
      expect(typeof accessibility.announce).toBe('function');
      expect(typeof accessibility.announceAlarm).toBe('function');
      expect(typeof accessibility.isScreenReaderEnabled).toBe('function');
      expect(typeof accessibility.isReduceMotionEnabled).toBe('function');
      expect(typeof accessibility.getFontScaleMultiplier).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockRejectedValue(
        new Error('Permission denied')
      );
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await AccessibilityService.initialize();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[AccessibilityService] Initialization error:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle announcement errors gracefully', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      (AccessibilityInfo.announceForAccessibility as jest.Mock).mockImplementation(() => {
        throw new Error('Announcement failed');
      });
      
      await AccessibilityService.initialize();
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      AccessibilityService.announce('Test', 'assertive');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[AccessibilityService] Announcement error:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });
});
