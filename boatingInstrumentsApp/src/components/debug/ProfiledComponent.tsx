/**
 * ProfiledComponent - React Profiler Wrapper for Performance Monitoring
 *
 * Automatically detects and warns about slow renders in development.
 * Wraps components to measure render performance and identify bottlenecks.
 *
 * Usage:
 *   // Wrap slow-rendering components
 *   <ProfiledComponent id="DepthWidget">
 *     <DepthWidget />
 *   </ProfiledComponent>
 *
 *   // Custom warning threshold
 *   <ProfiledComponent id="ComplexChart" warnThreshold={32}>
 *     <ComplexChartWidget />
 *   </ProfiledComponent>
 *
 * Performance Thresholds:
 *   - 16ms (60fps) - Default warning threshold
 *   - 32ms (30fps) - Acceptable for complex widgets
 *   - 100ms+ - Critical performance issue
 *
 * Architecture Note:
 *   This is the TERTIARY debugging tool. Use Zustand DevTools (PRIMARY)
 *   for state debugging and conditional console logs (SECONDARY) for execution flow.
 */

import React, { Profiler, ReactNode, ProfilerOnRenderCallback } from 'react';
import { log } from '../../utils/logging/logger';

interface ProfiledComponentProps {
  /** Unique identifier for this profiled component (shows in warnings) */
  id: string;

  /** Warning threshold in milliseconds (default: 16ms for 60fps) */
  warnThreshold?: number;

  /** Child components to profile */
  children: ReactNode;

  /** Enable detailed timing logs (default: false) */
  verbose?: boolean;
}

/**
 * React Profiler wrapper that automatically warns about slow renders.
 *
 * Only active in development mode (__DEV__). Zero overhead in production.
 */
export const ProfiledComponent: React.FC<ProfiledComponentProps> = ({
  id,
  warnThreshold = 16, // 60fps target
  verbose = false,
  children,
}) => {
  // Skip profiling entirely in production
  if (!__DEV__) {
    return <>{children}</>;
  }

  const onRender: ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
  ) => {
    // Warn about slow renders
    if (actualDuration > warnThreshold) {
      const severity =
        actualDuration > 100 ? '🔴 CRITICAL' : actualDuration > 32 ? '🟠 WARNING' : '🟡 SLOW';
      log.performance(`${severity} [PERFORMANCE] ${id} render: ${actualDuration.toFixed(2)}ms (${phase})`, () => ({
        actualDuration: `${actualDuration.toFixed(2)}ms`,
        baseDuration: `${baseDuration.toFixed(2)}ms`,
        threshold: `${warnThreshold}ms`,
        phase,
        startTime: `${startTime.toFixed(2)}ms`,
        commitTime: `${commitTime.toFixed(2)}ms`,
      }));
    }

    // Verbose logging for all renders (when enabled)
    if (verbose) {
    }
  };

  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
};

/**
 * Higher-order component version for easier wrapping.
 *
 * Usage:
 *   export default withProfiler('MyWidget')(MyWidget);
 */
export function withProfiler(id: string, warnThreshold?: number) {
  return <P extends object>(Component: React.ComponentType<P>) => {
    const ProfiledWrapper: React.FC<P> = (props) => (
      <ProfiledComponent id={id} warnThreshold={warnThreshold}>
        <Component {...props} />
      </ProfiledComponent>
    );

    // Preserve component name for debugging
    ProfiledWrapper.displayName = `Profiled(${
      Component.displayName || Component.name || 'Component'
    })`;

    return ProfiledWrapper;
  };
}

/**
 * Performance measurement utility for imperative code.
 *
 * Usage:
 *   measurePerformance('data-processing', () => {
 *     // Expensive operation
 *     processNmeaData(largeDataset);
 *   });
 */
export function measurePerformance<T>(label: string, fn: () => T, warnThreshold: number = 16): T {
  if (!__DEV__) {
    return fn();
  }

  const startTime = performance.now();
  const result = fn();
  const duration = performance.now() - startTime;

  if (duration > warnThreshold) {
    const severity = duration > 100 ? '🔴 CRITICAL' : duration > 32 ? '🟠 WARNING' : '🟡 SLOW';
    log.performance(`${severity} [PERFORMANCE] ${label}: ${duration.toFixed(2)}ms`);
  }

  return result;
}

/**
 * Async performance measurement utility.
 *
 * Usage:
 *   await measurePerformanceAsync('async-operation', async () => {
 *     await fetchNmeaData();
 *   });
 */
export async function measurePerformanceAsync<T>(
  label: string,
  fn: () => Promise<T>,
  warnThreshold: number = 16,
): Promise<T> {
  if (!__DEV__) {
    return fn();
  }

  const startTime = performance.now();
  const result = await fn();
  const duration = performance.now() - startTime;

  if (duration > warnThreshold) {
    const severity = duration > 100 ? '🔴 CRITICAL' : duration > 32 ? '🟠 WARNING' : '🟡 SLOW';
    log.performance(`${severity} [PERFORMANCE] ${label}: ${duration.toFixed(2)}ms (async)`);
  }

  return result;
}
