/**
 * Unit Tests for Platform Detection Utilities
 * Story 13.2.1 - Phase 5: Testing & Documentation
 */

import { Platform } from 'react-native';
import {
  detectPlatform,
  hasKeyboard,
  hasTouchscreen,
  isGloveMode,
  isTablet,
  supportsKeyboardNavigation,
  getDefaultTouchTargetSize,
  getPlatformCapabilities,
  PlatformType,
} from '../../../src/utils/platformDetection';
import { useSettingsStore } from '../../../src/store/settingsStore';

// Mock dependencies
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
    select: jest.fn((obj) => obj.web || obj.default),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 768, height: 1024 })),
  },
}));

jest.mock('../../../src/store/settingsStore', () => ({
  useSettingsStore: {
    getState: jest.fn(() => ({
      themeSettings: {
        gloveMode: false,
      },
    })),
  },
}));

describe('platformDetection', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default window and navigator mocks
    global.window = {
      screen: { width: 1024, height: 768 },
    } as any;
    
    global.navigator = {
      maxTouchPoints: 0,
    } as any;
  });

  afterEach(() => {
    // Clean up
    delete (global as any).window;
    delete (global as any).navigator;
  });

  describe('detectPlatform', () => {
    it('should return "ios" for iOS platform', () => {
      (Platform as any).OS = 'ios';
      expect(detectPlatform()).toBe('ios');
    });

    it('should return "android" for Android platform', () => {
      (Platform as any).OS = 'android';
      expect(detectPlatform()).toBe('android');
    });

    it('should return "desktop" for web with keyboard and no touch', () => {
      (Platform as any).OS = 'web';
      
      // Mock desktop browser
      global.window = {
        screen: { width: 1920, height: 1080 },
      } as any;
      global.navigator = {
        maxTouchPoints: 0,
      } as any;

      expect(detectPlatform()).toBe('desktop');
    });

    it('should return "web" for mobile web browser', () => {
      (Platform as any).OS = 'web';
      
      // Mock mobile browser
      global.window = {
        screen: { width: 375, height: 667 },
        ontouchstart: {},
      } as any;
      global.navigator = {
        maxTouchPoints: 5,
      } as any;

      expect(detectPlatform()).toBe('web');
    });
  });

  describe('hasKeyboard', () => {
    it('should return false for iOS platform', () => {
      (Platform as any).OS = 'ios';
      expect(hasKeyboard()).toBe(false);
    });

    it('should return false for Android platform', () => {
      (Platform as any).OS = 'android';
      expect(hasKeyboard()).toBe(false);
    });

    it('should return true for desktop with large screen', () => {
      (Platform as any).OS = 'web';
      global.window = {
        screen: { width: 1920, height: 1080 },
      } as any;
      global.navigator = {
        maxTouchPoints: 0,
      } as any;

      expect(hasKeyboard()).toBe(true);
    });

    it('should return true for web without touch support', () => {
      (Platform as any).OS = 'web';
      global.window = {
        screen: { width: 800, height: 600 },
      } as any;
      global.navigator = {
        maxTouchPoints: 0,
      } as any;

      expect(hasKeyboard()).toBe(true);
    });

    it('should return false for mobile web with touch', () => {
      (Platform as any).OS = 'web';
      global.window = {
        screen: { width: 375, height: 667 },
        ontouchstart: {},
      } as any;
      global.navigator = {
        maxTouchPoints: 5,
      } as any;

      expect(hasKeyboard()).toBe(false);
    });
  });

  describe('hasTouchscreen', () => {
    it('should return true for iOS', () => {
      (Platform as any).OS = 'ios';
      expect(hasTouchscreen()).toBe(true);
    });

    it('should return true for Android', () => {
      (Platform as any).OS = 'android';
      expect(hasTouchscreen()).toBe(true);
    });

    it('should return true for web with ontouchstart', () => {
      (Platform as any).OS = 'web';
      global.window = {
        ontouchstart: {},
      } as any;
      global.navigator = {
        maxTouchPoints: 5,
      } as any;

      expect(hasTouchscreen()).toBe(true);
    });

    it('should return true for web with maxTouchPoints > 0', () => {
      (Platform as any).OS = 'web';
      global.window = {} as any;
      global.navigator = {
        maxTouchPoints: 1,
      } as any;

      expect(hasTouchscreen()).toBe(true);
    });

    it('should return false for desktop without touch', () => {
      (Platform as any).OS = 'web';
      global.window = {} as any;
      global.navigator = {
        maxTouchPoints: 0,
      } as any;

      expect(hasTouchscreen()).toBe(false);
    });
  });

  describe('isGloveMode', () => {
    it('should return true when gloveMode is enabled', () => {
      (useSettingsStore.getState as jest.Mock).mockReturnValue({
        themeSettings: {
          gloveMode: true,
        },
      });

      expect(isGloveMode()).toBe(true);
    });

    it('should return false when gloveMode is disabled', () => {
      (useSettingsStore.getState as jest.Mock).mockReturnValue({
        themeSettings: {
          gloveMode: false,
        },
      });

      expect(isGloveMode()).toBe(false);
    });

    it('should return false when themeSettings is undefined', () => {
      (useSettingsStore.getState as jest.Mock).mockReturnValue({});

      expect(isGloveMode()).toBe(false);
    });

    it('should return false and log warning when store access fails', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      (useSettingsStore.getState as jest.Mock).mockImplementation(() => {
        throw new Error('Store not available');
      });

      expect(isGloveMode()).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'platformDetection: Unable to access settings store',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('isTablet', () => {
    it('should return true for web with tablet dimensions', () => {
      (Platform as any).OS = 'web';
      global.window = {
        screen: { width: 768, height: 1024 },
      } as any;

      expect(isTablet()).toBe(true);
    });

    it('should return false for web with desktop dimensions', () => {
      (Platform as any).OS = 'web';
      global.window = {
        screen: { width: 1920, height: 1080 },
      } as any;

      expect(isTablet()).toBe(false);
    });

    it('should return false for web with phone dimensions', () => {
      (Platform as any).OS = 'web';
      global.window = {
        screen: { width: 375, height: 667 },
      } as any;

      expect(isTablet()).toBe(false);
    });
  });

  describe('supportsKeyboardNavigation', () => {
    it('should be an alias for hasKeyboard', () => {
      expect(supportsKeyboardNavigation).toBe(hasKeyboard);
    });
  });

  describe('getDefaultTouchTargetSize', () => {
    it('should return 64 for glove mode', () => {
      (useSettingsStore.getState as jest.Mock).mockReturnValue({
        themeSettings: { gloveMode: true },
      });

      expect(getDefaultTouchTargetSize()).toBe(64);
    });

    it('should return 56 for tablet without glove mode', () => {
      (useSettingsStore.getState as jest.Mock).mockReturnValue({
        themeSettings: { gloveMode: false },
      });
      (Platform as any).OS = 'web';
      global.window = {
        screen: { width: 768, height: 1024 },
      } as any;

      expect(getDefaultTouchTargetSize()).toBe(56);
    });

    it('should return 56 for web platform', () => {
      (useSettingsStore.getState as jest.Mock).mockReturnValue({
        themeSettings: { gloveMode: false },
      });
      (Platform as any).OS = 'web';

      expect(getDefaultTouchTargetSize()).toBe(56);
    });

    it('should return 44 for phone', () => {
      (useSettingsStore.getState as jest.Mock).mockReturnValue({
        themeSettings: { gloveMode: false },
      });
      (Platform as any).OS = 'ios';
      (Platform.select as jest.Mock).mockImplementation((obj) => obj.ios);
      
      // Mock phone dimensions (iPhone)
      jest.requireMock('react-native').Dimensions.get.mockReturnValue({
        width: 375,
        height: 667,
      });

      expect(getDefaultTouchTargetSize()).toBe(44);
    });
  });

  describe('getPlatformCapabilities', () => {
    it('should return comprehensive platform info', () => {
      (Platform as any).OS = 'web';
      global.window = {
        screen: { width: 1920, height: 1080 },
      } as any;
      global.navigator = {
        maxTouchPoints: 0,
      } as any;
      (useSettingsStore.getState as jest.Mock).mockReturnValue({
        themeSettings: { gloveMode: false },
      });

      const capabilities = getPlatformCapabilities();

      expect(capabilities).toEqual({
        platform: 'desktop',
        hasKeyboard: true,
        hasTouchscreen: false,
        isGloveMode: false,
        isTablet: false,
        supportsKeyboardNav: true,
        defaultTouchTarget: 56,
      });
    });

    it('should return mobile capabilities for iOS', () => {
      (Platform as any).OS = 'ios';
      (useSettingsStore.getState as jest.Mock).mockReturnValue({
        themeSettings: { gloveMode: false },
      });

      const capabilities = getPlatformCapabilities();

      expect(capabilities.platform).toBe('ios');
      expect(capabilities.hasKeyboard).toBe(false);
      expect(capabilities.hasTouchscreen).toBe(true);
      expect(capabilities.supportsKeyboardNav).toBe(false);
    });
  });
});
