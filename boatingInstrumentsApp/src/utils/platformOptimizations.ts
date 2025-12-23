/**
 * Platform-Specific Optimizations
 *
 * iOS, Android, and Desktop performance optimizations
 * Handles platform-specific battery, background modes, and thermal management
 *
 * Key Principles:
 * - Respect platform power management policies
 * - Use platform-specific background modes appropriately
 * - Monitor and adapt to thermal conditions
 * - Optimize for platform-specific constraints
 *
 * Marine-Specific Optimizations:
 * - iOS: Background audio/location modes for continuous monitoring
 * - Android: Foreground service for alarm monitoring during doze
 * - Desktop: Prevent sleep during active navigation
 * - Thermal: Scale down processing when device gets hot
 */

import { Platform, AppState, AppStateStatus } from 'react-native';
import { useEffect, useState, useCallback } from 'react';

// ============================================================================
// Platform Detection
// ============================================================================

export const IS_IOS = Platform.OS === 'ios';
export const IS_ANDROID = Platform.OS === 'android';
export const IS_WEB = Platform.OS === 'web';
export const IS_DESKTOP = IS_WEB; // Simplified - could check window.navigator for more accuracy

// ============================================================================
// iOS Background Modes & Energy Efficiency
// ============================================================================

/**
 * iOS background mode types
 */
export enum IOSBackgroundMode {
  /** Audio playback (silent audio to keep app alive) */
  AUDIO = 'audio',

  /** Location updates */
  LOCATION = 'location',

  /** Background fetch */
  FETCH = 'fetch',

  /** Remote notifications */
  REMOTE_NOTIFICATION = 'remote-notification',
}

/**
 * iOS energy efficiency settings
 */
export interface IOSEnergySettings {
  /** Enable location updates in background */
  backgroundLocation: boolean;

  /** Location accuracy mode */
  locationAccuracy: 'best' | 'reduced' | 'passive';

  /** Enable silent audio to maintain background operation */
  backgroundAudio: boolean;

  /** Background fetch interval (minutes) */
  backgroundFetchInterval: number;
}

/**
 * iOS optimization manager
 *
 * Configures iOS-specific background modes and energy settings
 * Handles location modes, background audio, and app refresh
 */
export class IOSOptimizationManager {
  private energySettings: IOSEnergySettings = {
    backgroundLocation: true,
    locationAccuracy: 'reduced',
    backgroundAudio: false,
    backgroundFetchInterval: 15,
  };

  /**
   * Configure background location mode
   */
  async configureBackgroundLocation(
    enabled: boolean,
    accuracy: 'best' | 'reduced' | 'passive' = 'reduced',
  ): Promise<void> {
    if (!IS_IOS) return;

    this.energySettings.backgroundLocation = enabled;
    this.energySettings.locationAccuracy = accuracy;

    // TODO: Integrate with react-native-geolocation or similar
    // - Set allowsBackgroundLocationUpdates
    // - Set desiredAccuracy based on accuracy parameter
    // - Set pausesLocationUpdatesAutomatically for energy efficiency

    if (__DEV__) {
    }
  }

  /**
   * Enable background audio (silent audio to maintain operation)
   *
   * NOTE: Only use when user actually needs continuous monitoring
   * Apple may reject apps that abuse background audio
   */
  async enableBackgroundAudio(enabled: boolean): Promise<void> {
    if (!IS_IOS) return;

    this.energySettings.backgroundAudio = enabled;

    // TODO: Integrate with react-native-sound or similar
    // - Configure audio session for background playback
    // - Play silent audio file on loop
    // - Set audio session category to 'playback'

    if (__DEV__) {
    }
  }

  /**
   * Configure background fetch interval
   */
  async setBackgroundFetchInterval(minutes: number): Promise<void> {
    if (!IS_IOS) return;

    this.energySettings.backgroundFetchInterval = minutes;

    // TODO: Integrate with react-native-background-fetch
    // - Set minimum fetch interval
    // - Register background fetch task handler

    if (__DEV__) {
    }
  }

  /**
   * Get current energy settings
   */
  getEnergySettings(): IOSEnergySettings {
    return { ...this.energySettings };
  }

  /**
   * Apply power-aware iOS settings
   */
  async applyPowerMode(mode: 'performance' | 'balanced' | 'power_saver'): Promise<void> {
    if (!IS_IOS) return;

    switch (mode) {
      case 'performance':
        await this.configureBackgroundLocation(true, 'best');
        await this.enableBackgroundAudio(true);
        await this.setBackgroundFetchInterval(5);
        break;

      case 'balanced':
        await this.configureBackgroundLocation(true, 'reduced');
        await this.enableBackgroundAudio(false);
        await this.setBackgroundFetchInterval(15);
        break;

      case 'power_saver':
        await this.configureBackgroundLocation(true, 'passive');
        await this.enableBackgroundAudio(false);
        await this.setBackgroundFetchInterval(30);
        break;
    }
  }
}

/**
 * Global iOS optimization manager
 */
export const iosManager = new IOSOptimizationManager();

// ============================================================================
// Android Doze Mode & Battery Optimization
// ============================================================================

/**
 * Android optimization settings
 */
export interface AndroidOptimizationSettings {
  /** Request battery optimization whitelist */
  requestWhitelist: boolean;

  /** Use foreground service for critical monitoring */
  useForegroundService: boolean;

  /** Use exact alarms for time-critical notifications */
  useExactAlarms: boolean;

  /** Wake lock for critical operations */
  useWakeLock: boolean;
}

/**
 * Android optimization manager
 *
 * Handles Android doze mode, battery optimization, and foreground services
 * Ensures alarm monitoring works even in doze mode
 */
export class AndroidOptimizationManager {
  private settings: AndroidOptimizationSettings = {
    requestWhitelist: false,
    useForegroundService: true,
    useExactAlarms: true,
    useWakeLock: false,
  };

  /**
   * Request battery optimization whitelist
   *
   * Allows app to run in background without doze restrictions
   * Should only be requested when user needs continuous monitoring
   */
  async requestBatteryOptimizationWhitelist(): Promise<boolean> {
    if (!IS_ANDROID) return false;

    // TODO: Integrate with react-native-device-info or custom native module
    // - Check if already whitelisted
    // - Open battery optimization settings if not whitelisted
    // - Return true if whitelisted

    if (__DEV__) {
    }

    return true; // Mock success
  }

  /**
   * Start foreground service for alarm monitoring
   *
   * Required for reliable background operation in Android 8+
   * Shows persistent notification while service is running
   */
  async startForegroundService(title: string, message: string): Promise<void> {
    if (!IS_ANDROID) return;

    this.settings.useForegroundService = true;

    // TODO: Integrate with react-native-foreground-service or custom native module
    // - Create notification channel
    // - Start foreground service with notification
    // - Handle service lifecycle

    if (__DEV__) {
    }
  }

  /**
   * Stop foreground service
   */
  async stopForegroundService(): Promise<void> {
    if (!IS_ANDROID) return;

    this.settings.useForegroundService = false;

    // TODO: Stop foreground service

    if (__DEV__) {
    }
  }

  /**
   * Schedule exact alarm (bypasses doze mode)
   *
   * For time-critical alarms (depth, speed, etc.)
   * Requires SCHEDULE_EXACT_ALARM permission on Android 12+
   */
  async scheduleExactAlarm(alarmId: string, triggerTimeMs: number): Promise<void> {
    if (!IS_ANDROID) return;

    // TODO: Integrate with AlarmManager through native module
    // - Use setExactAndAllowWhileIdle for doze compatibility
    // - Create PendingIntent for alarm receiver

    if (__DEV__) {
    }
  }

  /**
   * Acquire wake lock for critical operations
   *
   * Prevents device from sleeping during active navigation
   * Should be released as soon as possible
   */
  async acquireWakeLock(): Promise<void> {
    if (!IS_ANDROID) return;

    this.settings.useWakeLock = true;

    // TODO: Integrate with react-native-keep-awake or PowerManager
    // - Acquire PARTIAL_WAKE_LOCK
    // - Remember to release when done

    if (__DEV__) {
    }
  }

  /**
   * Release wake lock
   */
  async releaseWakeLock(): Promise<void> {
    if (!IS_ANDROID) return;

    this.settings.useWakeLock = false;

    // TODO: Release wake lock

    if (__DEV__) {
    }
  }

  /**
   * Get current optimization settings
   */
  getSettings(): AndroidOptimizationSettings {
    return { ...this.settings };
  }

  /**
   * Apply power-aware Android settings
   */
  async applyPowerMode(mode: 'performance' | 'balanced' | 'power_saver'): Promise<void> {
    if (!IS_ANDROID) return;

    switch (mode) {
      case 'performance':
        await this.acquireWakeLock();
        await this.startForegroundService('BMad Autopilot', 'Monitoring navigation');
        break;

      case 'balanced':
        await this.releaseWakeLock();
        await this.startForegroundService('BMad Autopilot', 'Monitoring alarms');
        break;

      case 'power_saver':
        await this.releaseWakeLock();
        await this.stopForegroundService();
        break;
    }
  }
}

/**
 * Global Android optimization manager
 */
export const androidManager = new AndroidOptimizationManager();

// ============================================================================
// Desktop Power Management & Sleep Mode
// ============================================================================

/**
 * Desktop power state
 */
export type DesktopPowerState = 'active' | 'idle' | 'sleep';

/**
 * Desktop optimization manager
 *
 * Handles desktop power management and sleep prevention
 * Monitors power state and adapts performance
 */
export class DesktopOptimizationManager {
  private powerState: DesktopPowerState = 'active';
  private preventSleep: boolean = false;
  private listeners: Array<(state: DesktopPowerState) => void> = [];

  /**
   * Prevent system sleep (for active navigation)
   */
  async preventSystemSleep(prevent: boolean): Promise<void> {
    if (!IS_DESKTOP) return;

    this.preventSleep = prevent;

    // TODO: Integrate with Electron or browser APIs
    // Electron: powerSaveBlocker.start('prevent-display-sleep')
    // Browser: Use Screen Wake Lock API (navigator.wakeLock.request('screen'))

    if (__DEV__) {
    }
  }

  /**
   * Monitor system power state
   */
  startPowerMonitoring(): void {
    if (!IS_DESKTOP) return;

    // TODO: Listen to system power events
    // Electron: powerMonitor.on('suspend'), powerMonitor.on('resume')
    // Browser: document.addEventListener('visibilitychange')

    if (__DEV__) {
    }
  }

  /**
   * Update power state
   */
  private updatePowerState(state: DesktopPowerState): void {
    if (this.powerState === state) return;

    this.powerState = state;

    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (error) {
        console.error('[Desktop] Error in power state listener:', error);
      }
    }
  }

  /**
   * Subscribe to power state changes
   */
  subscribe(listener: (state: DesktopPowerState) => void): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current power state
   */
  getPowerState(): DesktopPowerState {
    return this.powerState;
  }

  /**
   * Apply power-aware desktop settings
   */
  async applyPowerMode(mode: 'performance' | 'balanced' | 'power_saver'): Promise<void> {
    if (!IS_DESKTOP) return;

    switch (mode) {
      case 'performance':
        await this.preventSystemSleep(true);
        break;

      case 'balanced':
        await this.preventSystemSleep(false);
        break;

      case 'power_saver':
        await this.preventSystemSleep(false);
        break;
    }
  }
}

/**
 * Global desktop optimization manager
 */
export const desktopManager = new DesktopOptimizationManager();

// ============================================================================
// Thermal Throttling Detection & Adaptation
// ============================================================================

/**
 * Thermal state levels
 */
export enum ThermalState {
  /** Normal temperature */
  NOMINAL = 'nominal',

  /** Device warming up */
  FAIR = 'fair',

  /** Device getting warm, reduce performance */
  SERIOUS = 'serious',

  /** Device hot, significant throttling needed */
  CRITICAL = 'critical',
}

/**
 * Thermal throttling configuration
 */
export interface ThermalConfig {
  /** Current thermal state */
  state: ThermalState;

  /** CPU throttle multiplier (1.0 = normal, 2.0 = half speed) */
  cpuThrottle: number;

  /** Animation throttle multiplier */
  animationThrottle: number;

  /** Disable non-essential features */
  disableNonEssential: boolean;
}

/**
 * Thermal management system
 *
 * Monitors device temperature and adapts performance
 * Prevents device overheating during extended use
 */
export class ThermalManager {
  private thermalState: ThermalState = ThermalState.NOMINAL;
  private listeners: Array<(config: ThermalConfig) => void> = [];

  /**
   * Start thermal monitoring
   */
  startMonitoring(): void {
    // TODO: Integrate with platform-specific thermal APIs
    // iOS: ProcessInfo.processInfo.thermalState
    // Android: PowerManager.getCurrentThermalStatus()
    // Desktop: May not have thermal APIs available

    if (__DEV__) {
    }
  }

  /**
   * Update thermal state (called by platform thermal event)
   */
  updateThermalState(state: ThermalState): void {
    if (this.thermalState === state) return;

    this.thermalState = state;
    const config = this.getThermalConfig();

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(config);
      } catch (error) {
        console.error('[Thermal] Error in listener:', error);
      }
    }

    if (state === ThermalState.CRITICAL) {
      console.error('[Thermal] CRITICAL: Device overheating, performance severely throttled');
    } else if (state === ThermalState.SERIOUS) {
      console.warn('[Thermal] SERIOUS: Device hot, reducing performance');
    }
  }

  /**
   * Get thermal configuration based on current state
   */
  getThermalConfig(): ThermalConfig {
    switch (this.thermalState) {
      case ThermalState.NOMINAL:
        return {
          state: ThermalState.NOMINAL,
          cpuThrottle: 1.0,
          animationThrottle: 1.0,
          disableNonEssential: false,
        };

      case ThermalState.FAIR:
        return {
          state: ThermalState.FAIR,
          cpuThrottle: 1.2,
          animationThrottle: 1.5,
          disableNonEssential: false,
        };

      case ThermalState.SERIOUS:
        return {
          state: ThermalState.SERIOUS,
          cpuThrottle: 2.0,
          animationThrottle: 3.0,
          disableNonEssential: true,
        };

      case ThermalState.CRITICAL:
        return {
          state: ThermalState.CRITICAL,
          cpuThrottle: 4.0,
          animationThrottle: 10.0,
          disableNonEssential: true,
        };
    }
  }

  /**
   * Subscribe to thermal state changes
   */
  subscribe(listener: (config: ThermalConfig) => void): () => void {
    this.listeners.push(listener);

    // Send initial state
    listener(this.getThermalConfig());

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current thermal state
   */
  getCurrentState(): ThermalState {
    return this.thermalState;
  }
}

/**
 * Global thermal manager instance
 */
export const thermalManager = new ThermalManager();

/**
 * Hook for thermal state monitoring
 *
 * @returns Current thermal configuration
 *
 * @example
 * ```tsx
 * function Component() {
 *   const thermal = useThermalMonitoring();
 *
 *   if (thermal.state === ThermalState.CRITICAL) {
 *     return <Text>Device overheating - reducing performance</Text>;
 *   }
 *
 *   const updateInterval = baseInterval * thermal.cpuThrottle;
 *   // Use throttled update interval
 * }
 * ```
 */
export function useThermalMonitoring(): ThermalConfig {
  const [config, setConfig] = useState<ThermalConfig>(thermalManager.getThermalConfig());

  useEffect(() => {
    const unsubscribe = thermalManager.subscribe(setConfig);
    return unsubscribe;
  }, []);

  return config;
}

// ============================================================================
// Unified Platform Optimization API
// ============================================================================

/**
 * Unified power mode for all platforms
 */
export type UnifiedPowerMode = 'performance' | 'balanced' | 'power_saver';

/**
 * Platform optimization coordinator
 *
 * Coordinates all platform-specific optimizations
 * Provides unified API for cross-platform power management
 */
export class PlatformOptimizationCoordinator {
  private currentMode: UnifiedPowerMode = 'balanced';

  /**
   * Apply power mode across all platforms
   */
  async applyPowerMode(mode: UnifiedPowerMode): Promise<void> {
    this.currentMode = mode;

    // Apply to each platform manager
    await Promise.all([
      iosManager.applyPowerMode(mode),
      androidManager.applyPowerMode(mode),
      desktopManager.applyPowerMode(mode),
    ]);

    if (__DEV__) {
    }
  }

  /**
   * Start all platform monitoring
   */
  startMonitoring(): void {
    thermalManager.startMonitoring();

    if (IS_DESKTOP) {
      desktopManager.startPowerMonitoring();
    }
  }

  /**
   * Get current power mode
   */
  getCurrentMode(): UnifiedPowerMode {
    return this.currentMode;
  }

  /**
   * Get platform-specific status
   */
  getPlatformStatus() {
    return {
      platform: Platform.OS,
      ios: IS_IOS ? iosManager.getEnergySettings() : null,
      android: IS_ANDROID ? androidManager.getSettings() : null,
      desktop: IS_DESKTOP ? { powerState: desktopManager.getPowerState() } : null,
      thermal: thermalManager.getCurrentState(),
    };
  }
}

/**
 * Global platform optimization coordinator
 */
export const platformCoordinator = new PlatformOptimizationCoordinator();

/**
 * Hook for unified platform optimization
 *
 * Initializes platform monitoring and provides power mode control
 *
 * @returns Power mode setter and current mode
 *
 * @example
 * ```tsx
 * function App() {
 *   const { setPowerMode, currentMode } = usePlatformOptimization();
 *
 *   // Set mode based on battery level
 *   useEffect(() => {
 *     if (batteryLevel < 0.2) {
 *       setPowerMode('power_saver');
 *     }
 *   }, [batteryLevel]);
 * }
 * ```
 */
export function usePlatformOptimization() {
  const [currentMode, setCurrentModeState] = useState<UnifiedPowerMode>(
    platformCoordinator.getCurrentMode(),
  );

  useEffect(() => {
    platformCoordinator.startMonitoring();
  }, []);

  const setPowerMode = useCallback(async (mode: UnifiedPowerMode) => {
    await platformCoordinator.applyPowerMode(mode);
    setCurrentModeState(mode);
  }, []);

  return {
    setPowerMode,
    currentMode,
    platformStatus: platformCoordinator.getPlatformStatus(),
  };
}
