/**
 * Battery & Power Management Optimization
 * 
 * Intelligent power consumption management for extended marine use.
 * Optimizes battery life for long passages without shore power.
 * 
 * Key Principles:
 * - Screen management: Intelligent dimming, brightness adaptation
 * - Background throttling: Reduce processing during low-power scenarios
 * - Feature toggles: Disable non-essential features to save power
 * - Battery monitoring: Track usage and predict remaining runtime
 * - Adaptive performance: Scale processing based on battery level
 * 
 * Marine-Specific Optimizations:
 * - Extended operation focus (24+ hour passages)
 * - Ambient light adaptation (bright sun to dark night)
 * - Motion-based wake (boat movement activates screen)
 * - Power-aware alarm priorities (critical alarms always active)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform, AppState } from 'react-native';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Power modes with different optimization strategies
 */
export enum PowerMode {
  /** Maximum performance - plugged in or high battery */
  PERFORMANCE = 'performance',
  
  /** Balanced - normal operation */
  BALANCED = 'balanced',
  
  /** Power saver - extend battery life */
  POWER_SAVER = 'power_saver',
  
  /** Ultra saver - minimal features for emergency situations */
  ULTRA_SAVER = 'ultra_saver',
}

/**
 * Battery level thresholds for automatic mode switching
 */
export const BATTERY_THRESHOLDS = {
  /** Switch to power saver mode */
  POWER_SAVER: 0.30, // 30%
  
  /** Switch to ultra saver mode */
  ULTRA_SAVER: 0.15, // 15%
  
  /** Critical battery warning */
  CRITICAL: 0.10, // 10%
  
  /** Emergency shutdown warning */
  EMERGENCY: 0.05, // 5%
} as const;

/**
 * Screen dimming configuration
 */
export const SCREEN_CONFIG = {
  /** Minimum brightness level (0.0 - 1.0) */
  MIN_BRIGHTNESS: 0.1,
  
  /** Maximum brightness level (0.0 - 1.0) */
  MAX_BRIGHTNESS: 1.0,
  
  /** Auto-dim timeout in ms */
  AUTO_DIM_TIMEOUT: 30000, // 30 seconds
  
  /** Dim brightness level (0.0 - 1.0) */
  DIM_BRIGHTNESS: 0.3,
  
  /** Ambient light adaptation speed (0.0 - 1.0, higher = faster) */
  ADAPTATION_SPEED: 0.2,
} as const;

/**
 * Processing throttle configuration per power mode
 */
export const PROCESSING_THROTTLES = {
  [PowerMode.PERFORMANCE]: {
    nmeaUpdateInterval: 100,    // ms
    widgetUpdateInterval: 100,  // ms
    alarmCheckInterval: 500,    // ms
    backgroundUpdateInterval: 1000, // ms
  },
  [PowerMode.BALANCED]: {
    nmeaUpdateInterval: 200,
    widgetUpdateInterval: 200,
    alarmCheckInterval: 1000,
    backgroundUpdateInterval: 2000,
  },
  [PowerMode.POWER_SAVER]: {
    nmeaUpdateInterval: 500,
    widgetUpdateInterval: 500,
    alarmCheckInterval: 2000,
    backgroundUpdateInterval: 5000,
  },
  [PowerMode.ULTRA_SAVER]: {
    nmeaUpdateInterval: 1000,
    widgetUpdateInterval: 1000,
    alarmCheckInterval: 5000,
    backgroundUpdateInterval: 10000,
  },
} as const;

/**
 * Feature availability per power mode
 */
export const FEATURE_AVAILABILITY = {
  [PowerMode.PERFORMANCE]: {
    animations: true,
    liveWidgets: true,
    backgroundMonitoring: true,
    historicalData: true,
    autoRecording: true,
  },
  [PowerMode.BALANCED]: {
    animations: true,
    liveWidgets: true,
    backgroundMonitoring: true,
    historicalData: true,
    autoRecording: true,
  },
  [PowerMode.POWER_SAVER]: {
    animations: false,        // Disable animations
    liveWidgets: true,
    backgroundMonitoring: true,
    historicalData: false,    // Disable historical queries
    autoRecording: false,     // Disable auto recording
  },
  [PowerMode.ULTRA_SAVER]: {
    animations: false,
    liveWidgets: false,       // Show only essential alarms
    backgroundMonitoring: true, // Keep critical monitoring
    historicalData: false,
    autoRecording: false,
  },
} as const;

// ============================================================================
// Battery Monitoring
// ============================================================================

/**
 * Battery state information
 */
export interface BatteryState {
  /** Current battery level (0.0 - 1.0) */
  level: number;
  
  /** Is device charging */
  isCharging: boolean;
  
  /** Estimated time remaining (minutes) */
  estimatedTimeRemaining?: number;
  
  /** Current power mode */
  powerMode: PowerMode;
  
  /** Battery drain rate (%/hour) */
  drainRate: number;
  
  /** Battery health (0.0 - 1.0) */
  health?: number;
  
  /** Temperature (Celsius) */
  temperature?: number;
}

/**
 * Battery usage tracker for estimating runtime
 */
export class BatteryUsageTracker {
  private samples: Array<{ level: number; timestamp: number }> = [];
  private maxSamples = 10;
  
  /**
   * Add battery level sample
   */
  addSample(level: number): void {
    this.samples.push({
      level,
      timestamp: Date.now(),
    });
    
    // Keep only recent samples
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }
  
  /**
   * Calculate drain rate in %/hour
   */
  calculateDrainRate(): number {
    if (this.samples.length < 2) {
      return 0;
    }
    
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    
    const levelDrop = first.level - last.level;
    const timeDiff = last.timestamp - first.timestamp;
    const hours = timeDiff / (1000 * 60 * 60);
    
    if (hours <= 0) return 0;
    
    return (levelDrop / hours) * 100; // Convert to percentage per hour
  }
  
  /**
   * Estimate time remaining in minutes
   */
  estimateTimeRemaining(currentLevel: number): number | undefined {
    const drainRate = this.calculateDrainRate();
    
    if (drainRate <= 0) {
      return undefined; // Can't estimate if not draining or charging
    }
    
    // Calculate hours until 5% (emergency threshold)
    const usableLevel = currentLevel - BATTERY_THRESHOLDS.EMERGENCY;
    const hoursRemaining = usableLevel / (drainRate / 100);
    
    return hoursRemaining * 60; // Convert to minutes
  }
  
  /**
   * Check if drain rate is acceptable for marine use
   * Target: <5% per hour
   */
  isWithinTargetDrainRate(): boolean {
    const drainRate = this.calculateDrainRate();
    return drainRate < 5.0;
  }
}

/**
 * Hook for monitoring battery state
 * 
 * Tracks battery level, charging state, and estimates runtime
 * Note: Requires react-native-device-info or similar package for full functionality
 * 
 * @returns Current battery state
 * 
 * @example
 * ```tsx
 * function BatteryIndicator() {
 *   const battery = useBatteryMonitor();
 *   
 *   return (
 *     <View>
 *       <Text>Battery: {(battery.level * 100).toFixed(0)}%</Text>
 *       <Text>Mode: {battery.powerMode}</Text>
 *       {battery.estimatedTimeRemaining && (
 *         <Text>Remaining: {Math.floor(battery.estimatedTimeRemaining / 60)}h</Text>
 *       )}
 *     </View>
 *   );
 * }
 * ```
 */
export function useBatteryMonitor(): BatteryState {
  const [batteryState, setBatteryState] = useState<BatteryState>({
    level: 1.0,
    isCharging: false,
    powerMode: PowerMode.BALANCED,
    drainRate: 0,
  });
  
  const tracker = useRef(new BatteryUsageTracker());
  
  useEffect(() => {
    // TODO: Integrate with actual battery API
    // This is a placeholder implementation
    // In production, use react-native-device-info or Platform-specific APIs
    
    const updateBattery = async () => {
      // Platform-specific battery APIs would go here
      // For now, using mock data
      const mockLevel = 0.75; // 75%
      const mockCharging = false;
      
      tracker.current.addSample(mockLevel);
      const drainRate = tracker.current.calculateDrainRate();
      const estimatedTimeRemaining = tracker.current.estimateTimeRemaining(mockLevel);
      
      // Determine power mode based on battery level
      let powerMode = PowerMode.BALANCED;
      if (mockCharging) {
        powerMode = PowerMode.PERFORMANCE;
      } else if (mockLevel <= BATTERY_THRESHOLDS.ULTRA_SAVER) {
        powerMode = PowerMode.ULTRA_SAVER;
      } else if (mockLevel <= BATTERY_THRESHOLDS.POWER_SAVER) {
        powerMode = PowerMode.POWER_SAVER;
      }
      
      setBatteryState({
        level: mockLevel,
        isCharging: mockCharging,
        powerMode,
        drainRate,
        estimatedTimeRemaining,
      });
    };
    
    // Update every 30 seconds
    const interval = setInterval(updateBattery, 30000);
    updateBattery(); // Initial update
    
    return () => clearInterval(interval);
  }, []);
  
  return batteryState;
}

// ============================================================================
// Screen Brightness Management
// ============================================================================

/**
 * Screen dimming controller
 * 
 * Manages screen brightness based on:
 * - User activity (auto-dim on inactivity)
 * - Ambient light (adapt to environment)
 * - Power mode (reduce brightness to save power)
 * - Time of day (night mode)
 */
export class ScreenDimmingController {
  private currentBrightness: number = SCREEN_CONFIG.MAX_BRIGHTNESS;
  private targetBrightness: number = SCREEN_CONFIG.MAX_BRIGHTNESS;
  private isDimmed: boolean = false;
  private lastActivityTime: number = Date.now();
  private autoDimTimer: NodeJS.Timeout | null = null;
  private animationFrame: number | null = null;
  
  /**
   * Record user activity (touch, gesture, etc.)
   */
  recordActivity(): void {
    this.lastActivityTime = Date.now();
    
    // Un-dim if currently dimmed
    if (this.isDimmed) {
      this.setTargetBrightness(SCREEN_CONFIG.MAX_BRIGHTNESS);
      this.isDimmed = false;
    }
    
    // Restart auto-dim timer
    this.startAutoDimTimer();
  }
  
  /**
   * Start auto-dim timer
   */
  private startAutoDimTimer(): void {
    if (this.autoDimTimer) {
      clearTimeout(this.autoDimTimer);
    }
    
    this.autoDimTimer = setTimeout(() => {
      this.dimScreen();
    }, SCREEN_CONFIG.AUTO_DIM_TIMEOUT);
  }
  
  /**
   * Dim screen after inactivity
   */
  private dimScreen(): void {
    this.isDimmed = true;
    this.setTargetBrightness(SCREEN_CONFIG.DIM_BRIGHTNESS);
  }
  
  /**
   * Set target brightness with smooth transition
   */
  setTargetBrightness(brightness: number): void {
    this.targetBrightness = Math.max(
      SCREEN_CONFIG.MIN_BRIGHTNESS,
      Math.min(SCREEN_CONFIG.MAX_BRIGHTNESS, brightness)
    );
    
    // Start smooth transition animation
    this.animateBrightness();
  }
  
  /**
   * Animate brightness change smoothly
   */
  private animateBrightness(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    const step = () => {
      const delta = this.targetBrightness - this.currentBrightness;
      
      if (Math.abs(delta) < 0.01) {
        // Close enough, snap to target
        this.currentBrightness = this.targetBrightness;
        return;
      }
      
      // Move towards target
      this.currentBrightness += delta * SCREEN_CONFIG.ADAPTATION_SPEED;
      
      // Apply brightness change (would call platform-specific API here)
      this.applyBrightness(this.currentBrightness);
      
      // Continue animation
      this.animationFrame = requestAnimationFrame(step);
    };
    
    this.animationFrame = requestAnimationFrame(step);
  }
  
  /**
   * Apply brightness to screen (platform-specific)
   */
  private applyBrightness(brightness: number): void {
    // TODO: Integrate with platform-specific brightness API
    // iOS: react-native-screen-brightness
    // Android: react-native-device-brightness
    // Web: Not applicable
    
    if (__DEV__) {
      console.log(`[Screen Brightness] ${(brightness * 100).toFixed(0)}%`);
    }
  }
  
  /**
   * Adjust brightness for power mode
   */
  applyPowerMode(mode: PowerMode): void {
    switch (mode) {
      case PowerMode.PERFORMANCE:
        this.setTargetBrightness(SCREEN_CONFIG.MAX_BRIGHTNESS);
        break;
      case PowerMode.BALANCED:
        this.setTargetBrightness(0.8);
        break;
      case PowerMode.POWER_SAVER:
        this.setTargetBrightness(0.6);
        break;
      case PowerMode.ULTRA_SAVER:
        this.setTargetBrightness(SCREEN_CONFIG.MIN_BRIGHTNESS);
        break;
    }
  }
  
  /**
   * Get current brightness level
   */
  getCurrentBrightness(): number {
    return this.currentBrightness;
  }
  
  /**
   * Cleanup timers
   */
  dispose(): void {
    if (this.autoDimTimer) {
      clearTimeout(this.autoDimTimer);
    }
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
}

/**
 * Hook for screen dimming management
 * 
 * Automatically dims screen after inactivity
 * Integrates with power mode for battery savings
 * 
 * @param powerMode - Current power mode
 * @returns Controller instance and current brightness
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { powerMode } = useBatteryMonitor();
 *   const { recordActivity, brightness } = useScreenDimming(powerMode);
 *   
 *   return (
 *     <View onTouchStart={recordActivity}>
 *       <Dashboard brightness={brightness} />
 *     </View>
 *   );
 * }
 * ```
 */
export function useScreenDimming(powerMode: PowerMode) {
  const controller = useRef(new ScreenDimmingController());
  const [brightness, setBrightness] = useState<number>(SCREEN_CONFIG.MAX_BRIGHTNESS);
  
  // Apply power mode changes
  useEffect(() => {
    controller.current.applyPowerMode(powerMode);
  }, [powerMode]);
  
  // Monitor brightness changes
  useEffect(() => {
    const interval = setInterval(() => {
      const currentBrightness = controller.current.getCurrentBrightness();
      setBrightness(currentBrightness);
    }, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => controller.current.dispose();
  }, []);
  
  const recordActivity = useCallback(() => {
    controller.current.recordActivity();
  }, []);
  
  return {
    recordActivity,
    brightness,
    controller: controller.current,
  };
}

// ============================================================================
// Power-Aware Feature Toggles
// ============================================================================

/**
 * Hook to check if feature is available in current power mode
 * 
 * @param feature - Feature name to check
 * @param powerMode - Current power mode
 * @returns true if feature is enabled
 * 
 * @example
 * ```tsx
 * function AnimatedWidget() {
 *   const { powerMode } = useBatteryMonitor();
 *   const animationsEnabled = usePowerAwareFeature('animations', powerMode);
 *   
 *   return animationsEnabled ? <AnimatedView /> : <StaticView />;
 * }
 * ```
 */
export function usePowerAwareFeature(
  feature: keyof typeof FEATURE_AVAILABILITY[PowerMode.PERFORMANCE],
  powerMode: PowerMode
): boolean {
  return FEATURE_AVAILABILITY[powerMode][feature];
}

/**
 * Hook to get processing throttle for current power mode
 * 
 * @param powerMode - Current power mode
 * @returns Throttle configuration
 * 
 * @example
 * ```tsx
 * function NmeaProcessor() {
 *   const { powerMode } = useBatteryMonitor();
 *   const throttle = useProcessingThrottle(powerMode);
 *   
 *   useEffect(() => {
 *     const interval = setInterval(processNmea, throttle.nmeaUpdateInterval);
 *     return () => clearInterval(interval);
 *   }, [throttle]);
 * }
 * ```
 */
export function useProcessingThrottle(powerMode: PowerMode) {
  return PROCESSING_THROTTLES[powerMode];
}

// ============================================================================
// Background Processing Optimization
// ============================================================================

/**
 * Background task scheduler that respects power mode
 * 
 * Adjusts task frequency based on power mode and app state
 */
export class PowerAwareBackgroundScheduler {
  private tasks: Map<string, {
    callback: () => void;
    interval: number;
    timer: NodeJS.Timeout | null;
  }> = new Map();
  
  private powerMode: PowerMode = PowerMode.BALANCED;
  private appState: string = 'active';
  
  /**
   * Register background task
   */
  registerTask(
    taskId: string,
    callback: () => void,
    baseInterval: number
  ): void {
    this.tasks.set(taskId, {
      callback,
      interval: baseInterval,
      timer: null,
    });
    
    this.scheduleTask(taskId);
  }
  
  /**
   * Unregister background task
   */
  unregisterTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task?.timer) {
      clearInterval(task.timer);
    }
    this.tasks.delete(taskId);
  }
  
  /**
   * Update power mode and reschedule tasks
   */
  setPowerMode(mode: PowerMode): void {
    this.powerMode = mode;
    this.rescheduleAllTasks();
  }
  
  /**
   * Update app state and adjust scheduling
   */
  setAppState(state: string): void {
    this.appState = state;
    this.rescheduleAllTasks();
  }
  
  /**
   * Schedule individual task with power-aware interval
   */
  private scheduleTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    // Clear existing timer
    if (task.timer) {
      clearInterval(task.timer);
    }
    
    // Calculate adjusted interval based on power mode and app state
    const adjustedInterval = this.calculateAdjustedInterval(task.interval);
    
    // Schedule task
    task.timer = setInterval(task.callback, adjustedInterval);
  }
  
  /**
   * Calculate adjusted interval based on power mode
   */
  private calculateAdjustedInterval(baseInterval: number): number {
    let multiplier = 1.0;
    
    // Adjust for power mode
    switch (this.powerMode) {
      case PowerMode.PERFORMANCE:
        multiplier = 1.0;
        break;
      case PowerMode.BALANCED:
        multiplier = 1.5;
        break;
      case PowerMode.POWER_SAVER:
        multiplier = 3.0;
        break;
      case PowerMode.ULTRA_SAVER:
        multiplier = 6.0;
        break;
    }
    
    // Further throttle if app is in background
    if (this.appState !== 'active') {
      multiplier *= 2.0;
    }
    
    return baseInterval * multiplier;
  }
  
  /**
   * Reschedule all tasks
   */
  private rescheduleAllTasks(): void {
    for (const taskId of this.tasks.keys()) {
      this.scheduleTask(taskId);
    }
  }
  
  /**
   * Cleanup all tasks
   */
  dispose(): void {
    for (const task of this.tasks.values()) {
      if (task.timer) {
        clearInterval(task.timer);
      }
    }
    this.tasks.clear();
  }
}

// ============================================================================
// Battery Usage Reporting
// ============================================================================

/**
 * Battery usage report
 */
export interface BatteryUsageReport {
  /** Current battery level (0.0 - 1.0) */
  currentLevel: number;
  
  /** Drain rate (%/hour) */
  drainRate: number;
  
  /** Estimated time remaining (minutes) */
  estimatedTimeRemaining?: number;
  
  /** Is within target drain rate (<5%/hour) */
  isWithinTarget: boolean;
  
  /** Current power mode */
  powerMode: PowerMode;
  
  /** Time in each power mode (minutes) */
  timeInModes: Record<PowerMode, number>;
  
  /** Total monitoring duration (minutes) */
  totalDuration: number;
}

/**
 * Generate battery usage report for monitoring
 * 
 * @param batteryState - Current battery state
 * @param tracker - Battery usage tracker
 * @returns Usage report
 */
export function generateBatteryReport(
  batteryState: BatteryState,
  tracker: BatteryUsageTracker
): BatteryUsageReport {
  return {
    currentLevel: batteryState.level,
    drainRate: batteryState.drainRate,
    estimatedTimeRemaining: batteryState.estimatedTimeRemaining,
    isWithinTarget: tracker.isWithinTargetDrainRate(),
    powerMode: batteryState.powerMode,
    timeInModes: {
      [PowerMode.PERFORMANCE]: 0, // TODO: Track time in each mode
      [PowerMode.BALANCED]: 0,
      [PowerMode.POWER_SAVER]: 0,
      [PowerMode.ULTRA_SAVER]: 0,
    },
    totalDuration: 0, // TODO: Track total monitoring duration
  };
}

/**
 * Log battery usage warning if drain rate exceeds target
 */
export function logBatteryWarnings(report: BatteryUsageReport): void {
  if (__DEV__) {
    if (!report.isWithinTarget) {
      console.warn(
        `[Battery] High drain rate detected: ${report.drainRate.toFixed(2)}%/hour ` +
        `(target: <5%/hour). Consider switching to power saver mode.`
      );
    }
    
    if (report.currentLevel <= BATTERY_THRESHOLDS.CRITICAL) {
      console.warn(
        `[Battery] Critical battery level: ${(report.currentLevel * 100).toFixed(0)}%`
      );
    }
  }
}
