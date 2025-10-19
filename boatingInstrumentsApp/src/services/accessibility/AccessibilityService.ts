/**
 * Accessibility Service
 * 
 * Integrates with React Native's AccessibilityInfo API to detect and respond to
 * system accessibility settings (VoiceOver, TalkBack, font scaling, etc.)
 * 
 * Features:
 * - Screen reader detection (VoiceOver on iOS, TalkBack on Android)
 * - System font scale detection
 * - Reduced motion preference detection
 * - Accessibility announcement utilities
 * - High contrast mode detection (where available)
 * 
 * @see Story 4.4: Accessibility Implementation (AC6, AC7, AC8)
 * @see docs/stories/story-context-4.4.xml - React Native AccessibilityInfo API integration
 */

import { AccessibilityInfo, Platform, findNodeHandle } from 'react-native';
import { useSettingsStore } from '../../stores/settingsStore';

export interface AccessibilityState {
  screenReaderEnabled: boolean;
  reduceMotionEnabled: boolean;
  reduceTransparencyEnabled: boolean;
  boldTextEnabled: boolean;
  grayscaleEnabled: boolean;
  invertColorsEnabled: boolean;
  fontScale: number;
}

export type AnnouncementPriority = 'polite' | 'assertive';

class AccessibilityServiceClass {
  private listeners: Array<() => void> = [];
  private state: AccessibilityState = {
    screenReaderEnabled: false,
    reduceMotionEnabled: false,
    reduceTransparencyEnabled: false,
    boldTextEnabled: false,
    grayscaleEnabled: false,
    invertColorsEnabled: false,
    fontScale: 1.0,
  };

  /**
   * Initialize accessibility service and sync with system settings
   */
  async initialize(): Promise<void> {
    try {
      // Detect screen reader (VoiceOver on iOS, TalkBack on Android)
      const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      this.state.screenReaderEnabled = screenReaderEnabled;

      // Detect reduced motion preference
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const reduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled?.() ?? false;
        this.state.reduceMotionEnabled = reduceMotionEnabled;
        
        // Update settings store
        useSettingsStore.getState().updateThemeSettings({
          reducedMotion: reduceMotionEnabled
        });
      }

      // Detect reduced transparency (iOS only)
      if (Platform.OS === 'ios') {
        const reduceTransparencyEnabled = await AccessibilityInfo.isReduceTransparencyEnabled?.() ?? false;
        this.state.reduceTransparencyEnabled = reduceTransparencyEnabled;
      }

      // Detect bold text (iOS only)
      if (Platform.OS === 'ios') {
        const boldTextEnabled = await AccessibilityInfo.isBoldTextEnabled?.() ?? false;
        this.state.boldTextEnabled = boldTextEnabled;
      }

      // Detect grayscale (iOS only)
      if (Platform.OS === 'ios') {
        const grayscaleEnabled = await AccessibilityInfo.isGrayscaleEnabled?.() ?? false;
        this.state.grayscaleEnabled = grayscaleEnabled;
      }

      // Detect invert colors (iOS only)
      if (Platform.OS === 'ios') {
        const invertColorsEnabled = await AccessibilityInfo.isInvertColorsEnabled?.() ?? false;
        this.state.invertColorsEnabled = invertColorsEnabled;
        
        // High contrast mode approximation
        if (invertColorsEnabled || this.state.grayscaleEnabled) {
          useSettingsStore.getState().updateThemeSettings({
            highContrast: true
          });
        }
      }

      // Setup change listeners
      this.setupListeners();

      console.log('[AccessibilityService] Initialized with state:', this.state);
    } catch (error) {
      console.error('[AccessibilityService] Initialization error:', error);
    }
  }

  /**
   * Setup listeners for accessibility setting changes
   */
  private setupListeners(): void {
    // Screen reader state changes
    const screenReaderListener = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (enabled: boolean) => {
        this.state.screenReaderEnabled = enabled;
        console.log('[AccessibilityService] Screen reader changed:', enabled);
      }
    );
    this.listeners.push(() => screenReaderListener.remove());

    // Reduced motion changes
    if (AccessibilityInfo.addEventListener) {
      const reduceMotionListener = AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        (enabled: boolean) => {
          this.state.reduceMotionEnabled = enabled;
          useSettingsStore.getState().updateThemeSettings({
            reducedMotion: enabled
          });
          console.log('[AccessibilityService] Reduced motion changed:', enabled);
        }
      );
      this.listeners.push(() => reduceMotionListener.remove());
    }

    // iOS-specific listeners
    if (Platform.OS === 'ios') {
      if (AccessibilityInfo.addEventListener) {
        const boldTextListener = AccessibilityInfo.addEventListener(
          'boldTextChanged',
          (enabled: boolean) => {
            this.state.boldTextEnabled = enabled;
            console.log('[AccessibilityService] Bold text changed:', enabled);
          }
        );
        this.listeners.push(() => boldTextListener.remove());

        const grayscaleListener = AccessibilityInfo.addEventListener(
          'grayscaleChanged',
          (enabled: boolean) => {
            this.state.grayscaleEnabled = enabled;
            // Update high contrast if needed
            if (enabled) {
              useSettingsStore.getState().updateThemeSettings({
                highContrast: true
              });
            }
            console.log('[AccessibilityService] Grayscale changed:', enabled);
          }
        );
        this.listeners.push(() => grayscaleListener.remove());

        const invertColorsListener = AccessibilityInfo.addEventListener(
          'invertColorsChanged',
          (enabled: boolean) => {
            this.state.invertColorsEnabled = enabled;
            // Update high contrast if needed
            if (enabled) {
              useSettingsStore.getState().updateThemeSettings({
                highContrast: true
              });
            }
            console.log('[AccessibilityService] Invert colors changed:', enabled);
          }
        );
        this.listeners.push(() => invertColorsListener.remove());
      }
    }
  }

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    this.listeners.forEach(remove => remove());
    this.listeners = [];
  }

  /**
   * Get current accessibility state
   */
  getState(): AccessibilityState {
    return { ...this.state };
  }

  /**
   * Check if screen reader is enabled
   */
  isScreenReaderEnabled(): boolean {
    return this.state.screenReaderEnabled;
  }

  /**
   * Check if reduced motion is enabled
   */
  isReduceMotionEnabled(): boolean {
    return this.state.reduceMotionEnabled;
  }

  /**
   * Announce message to screen reader
   * 
   * @param message - Message to announce
   * @param priority - 'polite' (default) or 'assertive' for interrupting announcements
   */
  announce(message: string, priority: AnnouncementPriority = 'polite'): void {
    if (!this.state.screenReaderEnabled) {
      return; // No screen reader active, skip announcement
    }

    try {
      // For assertive announcements on iOS, use announceForAccessibility
      // For polite announcements, the component's accessibilityLiveRegion handles it
      if (priority === 'assertive' || Platform.OS === 'android') {
        AccessibilityInfo.announceForAccessibility(message);
      }
    } catch (error) {
      console.error('[AccessibilityService] Announcement error:', error);
    }
  }

  /**
   * Announce alarm to screen reader with marine-specific context
   * 
   * @param alarmType - Type of alarm (e.g., 'depth', 'anchor')
   * @param severity - 'warning' or 'critical'
   * @param message - Alarm message
   */
  announceAlarm(alarmType: string, severity: 'warning' | 'critical', message: string): void {
    const prefix = severity === 'critical' ? 'CRITICAL ALARM' : 'WARNING';
    const fullMessage = `${prefix}: ${alarmType}. ${message}`;
    
    // Use assertive for critical alarms to interrupt current announcements
    this.announce(fullMessage, severity === 'critical' ? 'assertive' : 'polite');
  }

  /**
   * Set accessibility focus to a specific component
   * 
   * @param reactTag - React tag from findNodeHandle
   */
  setAccessibilityFocus(reactTag: number | null): void {
    if (reactTag && Platform.OS === 'ios') {
      AccessibilityInfo.setAccessibilityFocus(reactTag);
    }
  }

  /**
   * Check if high contrast should be enabled based on system settings
   */
  shouldUseHighContrast(): boolean {
    return this.state.invertColorsEnabled || this.state.grayscaleEnabled;
  }

  /**
   * Get recommended font scale multiplier
   * Combines system font scale with user preferences
   */
  getFontScaleMultiplier(): number {
    const userLargeText = useSettingsStore.getState().themeSettings.largeText;
    const systemScale = this.state.fontScale;
    
    // User preference adds +20% to system scale
    return userLargeText ? systemScale * 1.2 : systemScale;
  }

  /**
   * Announce connection status change to screen reader
   */
  announceConnectionStatus(status: 'connected' | 'connecting' | 'disconnected', bridge?: string): void {
    let message = '';
    switch (status) {
      case 'connected':
        message = bridge ? `Connected to ${bridge} NMEA bridge` : 'NMEA bridge connected';
        break;
      case 'connecting':
        message = 'Connecting to NMEA bridge';
        break;
      case 'disconnected':
        message = 'NMEA bridge disconnected';
        break;
    }
    
    this.announce(message, 'polite');
  }

  /**
   * Announce data update to screen reader (for important values)
   */
  announceDataUpdate(dataType: string, value: string, unit: string): void {
    const message = `${dataType}: ${value} ${unit}`;
    // Use polite to avoid overwhelming user with constant updates
    this.announce(message, 'polite');
  }
}

// Singleton instance
export const AccessibilityService = new AccessibilityServiceClass();

/**
 * React hook for accessing accessibility state
 */
export function useAccessibility(): AccessibilityState & {
  announce: (message: string, priority?: AnnouncementPriority) => void;
  announceAlarm: (alarmType: string, severity: 'warning' | 'critical', message: string) => void;
  isScreenReaderEnabled: () => boolean;
  isReduceMotionEnabled: () => boolean;
  getFontScaleMultiplier: () => number;
} {
  const state = AccessibilityService.getState();
  
  return {
    ...state,
    announce: AccessibilityService.announce.bind(AccessibilityService),
    announceAlarm: AccessibilityService.announceAlarm.bind(AccessibilityService),
    isScreenReaderEnabled: AccessibilityService.isScreenReaderEnabled.bind(AccessibilityService),
    isReduceMotionEnabled: AccessibilityService.isReduceMotionEnabled.bind(AccessibilityService),
    getFontScaleMultiplier: AccessibilityService.getFontScaleMultiplier.bind(AccessibilityService),
  };
}
