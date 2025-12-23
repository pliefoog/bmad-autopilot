/**
 * Marine Touch Service
 * Story 4.4 AC15: Touch gesture optimization for marine environments
 *
 * Provides gesture threshold adjustments for challenging conditions:
 * - Wet hands and gloves
 * - Boat motion and instability
 * - Emergency situations requiring quick access
 *
 * Features:
 * - Increased tap delay tolerance
 * - Enhanced long-press detection
 * - Swipe gesture tuning for gloves
 * - Glove mode with extended touch targets
 * - Marine-appropriate gesture timeouts
 */

import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { useSettingsStore } from '../../store/settingsStore';

/**
 * Marine Touch Configuration
 * Optimized for wet hands, gloves, and marine conditions
 */
export interface MarineTouchConfig {
  /** Minimum time for tap detection (ms) - prevents accidental taps from motion */
  tapMinDuration: number;

  /** Maximum time for tap detection (ms) - allows slower taps with wet/gloved hands */
  tapMaxDuration: number;

  /** Long press duration (ms) - extended for marine conditions */
  longPressDuration: number;

  /** Tap slop radius (px) - allows finger movement during tap */
  tapSlopRadius: number;

  /** Swipe minimum distance (px) - requires deliberate swipes */
  swipeMinDistance: number;

  /** Swipe velocity threshold (px/ms) - slower swipes for gloves */
  swipeMinVelocity: number;

  /** Double tap max delay (ms) - extended for wet hands */
  doubleTapMaxDelay: number;

  /** Touch target size addition for glove mode (px) */
  gloveModeTargetBoost: number;

  /** Gesture timeout for safety (ms) - quick access in emergencies */
  gestureTimeout: number;
}

/**
 * Default Marine Touch Configuration
 * Standard settings for typical marine use
 */
const DEFAULT_MARINE_CONFIG: MarineTouchConfig = {
  tapMinDuration: 50, // Ignore very quick taps (motion rejection)
  tapMaxDuration: 800, // Allow slower taps (wet/gloved hands)
  longPressDuration: 800, // Longer than typical 500ms for gloves
  tapSlopRadius: 20, // Allow 20px movement during tap (boat motion)
  swipeMinDistance: 60, // Require deliberate swipes (vs accidental)
  swipeMinVelocity: 0.3, // Slower swipes acceptable (gloves reduce speed)
  doubleTapMaxDelay: 500, // Extended from typical 300ms
  gloveModeTargetBoost: 8, // Add 8px to all touch targets in glove mode
  gestureTimeout: 10000, // 10s gesture timeout for safety
};

/**
 * Glove Mode Configuration
 * Enhanced settings for wearing gloves
 */
const GLOVE_MODE_CONFIG: MarineTouchConfig = {
  tapMinDuration: 100, // Longer min to prevent glove drag taps
  tapMaxDuration: 1200, // Even more time for gloved taps
  longPressDuration: 1000, // Extra long for thick gloves
  tapSlopRadius: 30, // More movement tolerance
  swipeMinDistance: 80, // Longer swipes required
  swipeMinVelocity: 0.2, // Much slower swipes OK
  doubleTapMaxDelay: 700, // More time between taps
  gloveModeTargetBoost: 12, // Even larger touch targets
  gestureTimeout: 15000, // 15s timeout for gloves
};

/**
 * Emergency Mode Configuration
 * Fastest response for critical situations
 */
const EMERGENCY_MODE_CONFIG: MarineTouchConfig = {
  tapMinDuration: 0, // Any duration counts
  tapMaxDuration: 2000, // Very long taps OK in emergency
  longPressDuration: 600, // Slightly faster long press
  tapSlopRadius: 40, // Maximum movement tolerance
  swipeMinDistance: 50, // Shorter swipes OK
  swipeMinVelocity: 0.2, // Any swipe speed acceptable
  doubleTapMaxDelay: 800, // Generous double tap timing
  gloveModeTargetBoost: 8, // Standard boost
  gestureTimeout: 20000, // 20s timeout for emergency
};

/**
 * Standard Mobile Configuration
 * Baseline for comparison (typical mobile app settings)
 */
const STANDARD_MOBILE_CONFIG: MarineTouchConfig = {
  tapMinDuration: 0,
  tapMaxDuration: 500,
  longPressDuration: 500,
  tapSlopRadius: 10,
  swipeMinDistance: 40,
  swipeMinVelocity: 0.5,
  doubleTapMaxDelay: 300,
  gloveModeTargetBoost: 0,
  gestureTimeout: 5000,
};

class MarineTouchService {
  private static instance: MarineTouchService;
  private currentConfig: MarineTouchConfig = DEFAULT_MARINE_CONFIG;
  private isGloveModeEnabled: boolean = false;
  private isEmergencyModeEnabled: boolean = false;

  private constructor() {
    this.loadSettings();
  }

  public static getInstance(): MarineTouchService {
    if (!MarineTouchService.instance) {
      MarineTouchService.instance = new MarineTouchService();
    }
    return MarineTouchService.instance;
  }

  /**
   * Load settings from settings store
   */
  private loadSettings(): void {
    const settings = useSettingsStore.getState();
    this.isGloveModeEnabled = settings.themeSettings.gloveMode || false;
    this.updateConfiguration();
  }

  /**
   * Update configuration based on current mode
   */
  private updateConfiguration(): void {
    if (this.isEmergencyModeEnabled) {
      this.currentConfig = EMERGENCY_MODE_CONFIG;
    } else if (this.isGloveModeEnabled) {
      this.currentConfig = GLOVE_MODE_CONFIG;
    } else {
      this.currentConfig = DEFAULT_MARINE_CONFIG;
    }
  }

  /**
   * Get current touch configuration
   */
  public getConfig(): MarineTouchConfig {
    return { ...this.currentConfig };
  }

  /**
   * Enable/disable glove mode
   */
  public setGloveMode(enabled: boolean): void {
    this.isGloveModeEnabled = enabled;
    this.updateConfiguration();

    // Update settings store
    useSettingsStore.setState((state) => ({
      themeSettings: {
        ...state.themeSettings,
        gloveMode: enabled,
      },
    }));
  }

  /**
   * Check if glove mode is enabled
   */
  public isGloveMode(): boolean {
    return this.isGloveModeEnabled;
  }

  /**
   * Enable/disable emergency mode
   */
  public setEmergencyMode(enabled: boolean): void {
    this.isEmergencyModeEnabled = enabled;
    this.updateConfiguration();
  }

  /**
   * Check if emergency mode is enabled
   */
  public isEmergencyMode(): boolean {
    return this.isEmergencyModeEnabled;
  }

  /**
   * Calculate adjusted touch target size
   * Adds boost based on mode and marine optimization
   */
  public getAdjustedTouchTarget(baseSize: number): number {
    const boost = this.currentConfig.gloveModeTargetBoost;
    const marineMinimum = 56; // Marine minimum from AC9

    const adjustedSize = baseSize + boost;
    return Math.max(adjustedSize, marineMinimum);
  }

  /**
   * Calculate hitSlop for marine touch targets
   * Returns object compatible with React Native hitSlop prop
   */
  public getMarineHitSlop(additionalSlop: number = 0): {
    top: number;
    bottom: number;
    left: number;
    right: number;
  } {
    const baseSlop = 12; // Base marine slop
    const boost = this.currentConfig.gloveModeTargetBoost / 2;
    const totalSlop = baseSlop + boost + additionalSlop;

    return {
      top: totalSlop,
      bottom: totalSlop,
      left: totalSlop,
      right: totalSlop,
    };
  }

  /**
   * Check if a tap duration is valid for marine conditions
   */
  public isValidTapDuration(duration: number): boolean {
    return (
      duration >= this.currentConfig.tapMinDuration && duration <= this.currentConfig.tapMaxDuration
    );
  }

  /**
   * Check if a gesture distance qualifies as a swipe
   */
  public isValidSwipeDistance(distance: number): boolean {
    return distance >= this.currentConfig.swipeMinDistance;
  }

  /**
   * Check if a gesture velocity qualifies as a swipe
   */
  public isValidSwipeVelocity(velocity: number): boolean {
    return velocity >= this.currentConfig.swipeMinVelocity;
  }

  /**
   * Get long press duration for current mode
   */
  public getLongPressDuration(): number {
    return this.currentConfig.longPressDuration;
  }

  /**
   * Get tap slop radius for motion tolerance
   */
  public getTapSlopRadius(): number {
    return this.currentConfig.tapSlopRadius;
  }

  /**
   * Get double tap max delay
   */
  public getDoubleTapMaxDelay(): number {
    return this.currentConfig.doubleTapMaxDelay;
  }

  /**
   * Get gesture timeout for safety
   */
  public getGestureTimeout(): number {
    return this.currentConfig.gestureTimeout;
  }

  /**
   * Get configuration description for debugging
   */
  public getConfigDescription(): string {
    if (this.isEmergencyModeEnabled) return 'Emergency Mode';
    if (this.isGloveModeEnabled) return 'Glove Mode';
    return 'Standard Marine Mode';
  }

  /**
   * Reset to default marine configuration
   */
  public reset(): void {
    this.isGloveModeEnabled = false;
    this.isEmergencyModeEnabled = false;
    this.updateConfiguration();
  }
}

export default MarineTouchService;

/**
 * React Hook for Marine Touch Service
 */
export const useMarineTouch = () => {
  const service = MarineTouchService.getInstance();
  const gloveMode = useSettingsStore((state) => state.themeSettings.gloveMode);

  // Sync service with settings store
  useEffect(() => {
    service.setGloveMode(gloveMode);
  }, [gloveMode, service]);

  return {
    config: service.getConfig(),
    isGloveMode: service.isGloveMode(),
    isEmergencyMode: service.isEmergencyMode(),
    setGloveMode: (enabled: boolean) => service.setGloveMode(enabled),
    setEmergencyMode: (enabled: boolean) => service.setEmergencyMode(enabled),
    getAdjustedTouchTarget: (baseSize: number) => service.getAdjustedTouchTarget(baseSize),
    getMarineHitSlop: (additionalSlop?: number) => service.getMarineHitSlop(additionalSlop),
    isValidTapDuration: (duration: number) => service.isValidTapDuration(duration),
    isValidSwipeDistance: (distance: number) => service.isValidSwipeDistance(distance),
    isValidSwipeVelocity: (velocity: number) => service.isValidSwipeVelocity(velocity),
    getLongPressDuration: () => service.getLongPressDuration(),
    getTapSlopRadius: () => service.getTapSlopRadius(),
    getDoubleTapMaxDelay: () => service.getDoubleTapMaxDelay(),
    getGestureTimeout: () => service.getGestureTimeout(),
    getConfigDescription: () => service.getConfigDescription(),
  };
};

// Export singleton instance
export const marineTouchService = MarineTouchService.getInstance();
