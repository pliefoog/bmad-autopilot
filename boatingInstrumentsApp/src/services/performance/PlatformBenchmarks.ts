/**
 * Platform-Specific Performance Benchmarks
 * 
 * Defines performance targets and benchmarks for different platforms:
 * - iOS: Native performance characteristics
 * - Android: Device variety considerations
 * - Web: Browser-specific optimizations
 * 
 * Story 4.5 AC1-5: Establish performance benchmarks for each platform
 */

import { Platform } from 'react-native';
import { PerformanceBenchmark } from './PerformanceMonitor';

export interface PlatformBenchmarkConfig {
  platform: 'ios' | 'android' | 'web';
  deviceClass: 'low-end' | 'mid-range' | 'high-end';
  benchmarks: PerformanceBenchmark[];
}

/**
 * iOS Performance Benchmarks
 * Based on iPhone 8+ through iPhone 15 Pro range
 */
const IOS_BENCHMARKS: PlatformBenchmarkConfig[] = [
  {
    platform: 'ios',
    deviceClass: 'high-end',
    benchmarks: [
      {
        name: 'UI Performance (iOS High-End)',
        targetFPS: 60,
        maxMemoryMB: 100,
        maxRenderTimeMs: 16.67,
        platform: 'ios',
      },
      {
        name: 'Full Dashboard (iOS High-End)',
        targetFPS: 60,
        maxMemoryMB: 180,
        maxRenderTimeMs: 16.67,
        platform: 'ios',
      },
      {
        name: 'Background NMEA Processing (iOS)',
        targetFPS: 30,
        maxMemoryMB: 80,
        maxRenderTimeMs: 33.33,
        platform: 'ios',
      },
    ],
  },
  {
    platform: 'ios',
    deviceClass: 'mid-range',
    benchmarks: [
      {
        name: 'UI Performance (iOS Mid-Range)',
        targetFPS: 60,
        maxMemoryMB: 120,
        maxRenderTimeMs: 16.67,
        platform: 'ios',
      },
      {
        name: 'Full Dashboard (iOS Mid-Range)',
        targetFPS: 50,
        maxMemoryMB: 200,
        maxRenderTimeMs: 20,
        platform: 'ios',
      },
      {
        name: 'Background NMEA Processing (iOS)',
        targetFPS: 30,
        maxMemoryMB: 100,
        maxRenderTimeMs: 33.33,
        platform: 'ios',
      },
    ],
  },
];

/**
 * Android Performance Benchmarks
 * Wide device variety from budget to flagship
 */
const ANDROID_BENCHMARKS: PlatformBenchmarkConfig[] = [
  {
    platform: 'android',
    deviceClass: 'high-end',
    benchmarks: [
      {
        name: 'UI Performance (Android High-End)',
        targetFPS: 60,
        maxMemoryMB: 120,
        maxRenderTimeMs: 16.67,
        platform: 'android',
      },
      {
        name: 'Full Dashboard (Android High-End)',
        targetFPS: 60,
        maxMemoryMB: 200,
        maxRenderTimeMs: 16.67,
        platform: 'android',
      },
      {
        name: 'Background NMEA Processing (Android)',
        targetFPS: 30,
        maxMemoryMB: 100,
        maxRenderTimeMs: 33.33,
        platform: 'android',
      },
    ],
  },
  {
    platform: 'android',
    deviceClass: 'mid-range',
    benchmarks: [
      {
        name: 'UI Performance (Android Mid-Range)',
        targetFPS: 50,
        maxMemoryMB: 150,
        maxRenderTimeMs: 20,
        platform: 'android',
      },
      {
        name: 'Full Dashboard (Android Mid-Range)',
        targetFPS: 45,
        maxMemoryMB: 220,
        maxRenderTimeMs: 22.22,
        platform: 'android',
      },
      {
        name: 'Background NMEA Processing (Android)',
        targetFPS: 30,
        maxMemoryMB: 120,
        maxRenderTimeMs: 33.33,
        platform: 'android',
      },
    ],
  },
  {
    platform: 'android',
    deviceClass: 'low-end',
    benchmarks: [
      {
        name: 'UI Performance (Android Low-End)',
        targetFPS: 40,
        maxMemoryMB: 180,
        maxRenderTimeMs: 25,
        platform: 'android',
      },
      {
        name: 'Full Dashboard (Android Low-End)',
        targetFPS: 35,
        maxMemoryMB: 250,
        maxRenderTimeMs: 28.57,
        platform: 'android',
      },
      {
        name: 'Background NMEA Processing (Android)',
        targetFPS: 20,
        maxMemoryMB: 150,
        maxRenderTimeMs: 50,
        platform: 'android',
      },
    ],
  },
];

/**
 * Web Performance Benchmarks
 * Desktop and laptop browsers
 */
const WEB_BENCHMARKS: PlatformBenchmarkConfig[] = [
  {
    platform: 'web',
    deviceClass: 'high-end',
    benchmarks: [
      {
        name: 'UI Performance (Web Desktop)',
        targetFPS: 60,
        maxMemoryMB: 150,
        maxRenderTimeMs: 16.67,
        platform: 'web',
      },
      {
        name: 'Full Dashboard (Web Desktop)',
        targetFPS: 60,
        maxMemoryMB: 250,
        maxRenderTimeMs: 16.67,
        platform: 'web',
      },
      {
        name: 'Background NMEA Processing (Web)',
        targetFPS: 60,
        maxMemoryMB: 100,
        maxRenderTimeMs: 16.67,
        platform: 'web',
      },
    ],
  },
  {
    platform: 'web',
    deviceClass: 'mid-range',
    benchmarks: [
      {
        name: 'UI Performance (Web Laptop)',
        targetFPS: 50,
        maxMemoryMB: 200,
        maxRenderTimeMs: 20,
        platform: 'web',
      },
      {
        name: 'Full Dashboard (Web Laptop)',
        targetFPS: 50,
        maxMemoryMB: 300,
        maxRenderTimeMs: 20,
        platform: 'web',
      },
      {
        name: 'Background NMEA Processing (Web)',
        targetFPS: 30,
        maxMemoryMB: 120,
        maxRenderTimeMs: 33.33,
        platform: 'web',
      },
    ],
  },
];

/**
 * Detect device class based on available metrics
 */
export function detectDeviceClass(): 'low-end' | 'mid-range' | 'high-end' {
  if (Platform.OS === 'web') {
    // Web: Detect based on hardware concurrency and memory
    const cores = navigator.hardwareConcurrency || 4;
    const memory = (performance as any).memory?.jsHeapSizeLimit || 0;
    
    if (cores >= 8 && memory > 4 * 1024 * 1024 * 1024) {
      return 'high-end';
    } else if (cores >= 4) {
      return 'mid-range';
    }
    return 'low-end';
  }
  
  // For React Native, we'll default to mid-range
  // In production, this would use native modules to detect device specs
  return 'mid-range';
}

/**
 * Get platform-specific benchmarks
 */
export function getPlatformBenchmarks(
  deviceClass?: 'low-end' | 'mid-range' | 'high-end'
): PerformanceBenchmark[] {
  const detectedClass = deviceClass || detectDeviceClass();
  
  let platformConfigs: PlatformBenchmarkConfig[] = [];
  
  if (Platform.OS === 'ios') {
    platformConfigs = IOS_BENCHMARKS;
  } else if (Platform.OS === 'android') {
    platformConfigs = ANDROID_BENCHMARKS;
  } else if (Platform.OS === 'web') {
    platformConfigs = WEB_BENCHMARKS;
  }
  
  const config = platformConfigs.find(c => c.deviceClass === detectedClass);
  return config?.benchmarks || [];
}

/**
 * Get all benchmarks for platform (all device classes)
 */
export function getAllPlatformBenchmarks(): PlatformBenchmarkConfig[] {
  if (Platform.OS === 'ios') {
    return IOS_BENCHMARKS;
  } else if (Platform.OS === 'android') {
    return ANDROID_BENCHMARKS;
  } else if (Platform.OS === 'web') {
    return WEB_BENCHMARKS;
  }
  
  return [];
}

/**
 * Battery life targets (AC6)
 * Based on marine usage patterns
 */
export interface BatteryBenchmark {
  scenario: string;
  targetDrainPerHour: number; // Percentage
  maxBackgroundCPU: number; // Percentage
  platform: 'ios' | 'android' | 'web' | 'all';
}

export const BATTERY_BENCHMARKS: BatteryBenchmark[] = [
  {
    scenario: 'Background Monitoring',
    targetDrainPerHour: 5,
    maxBackgroundCPU: 10,
    platform: 'all',
  },
  {
    scenario: 'Active Dashboard Use',
    targetDrainPerHour: 15,
    maxBackgroundCPU: 25,
    platform: 'all',
  },
  {
    scenario: 'Navigation Recording',
    targetDrainPerHour: 10,
    maxBackgroundCPU: 15,
    platform: 'all',
  },
  {
    scenario: 'Autopilot Control',
    targetDrainPerHour: 12,
    maxBackgroundCPU: 20,
    platform: 'all',
  },
];

/**
 * Startup time benchmarks (AC5)
 */
export interface StartupBenchmark {
  scenario: string;
  targetTimeMs: number;
  platform: 'ios' | 'android' | 'web' | 'all';
}

export const STARTUP_BENCHMARKS: StartupBenchmark[] = [
  {
    scenario: 'Cold Start',
    targetTimeMs: 3000,
    platform: 'all',
  },
  {
    scenario: 'Resume from Background',
    targetTimeMs: 1000,
    platform: 'all',
  },
  {
    scenario: 'Widget Load Time',
    targetTimeMs: 500,
    platform: 'all',
  },
];

/**
 * Export all benchmark configurations
 */
export const PlatformBenchmarks = {
  ios: IOS_BENCHMARKS,
  android: ANDROID_BENCHMARKS,
  web: WEB_BENCHMARKS,
  battery: BATTERY_BENCHMARKS,
  startup: STARTUP_BENCHMARKS,
  detectDeviceClass,
  getPlatformBenchmarks,
  getAllPlatformBenchmarks,
};
