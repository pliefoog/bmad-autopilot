/**
 * State Management Optimization Utilities
 *
 * Performance-optimized patterns for Zustand store subscriptions and selectors.
 * Reduces unnecessary re-renders through selective subscriptions and memoization.
 *
 * Key Principles:
 * - Subscribe to minimum necessary state slice (not entire store)
 * - Use shallow equality comparison for object/array state
 * - Memoize derived state calculations
 * - Batch related state updates
 * - Avoid nested subscriptions (subscribe at top level)
 *
 * Marine-Specific Optimizations:
 * - High-frequency NMEA data updates require selective subscriptions
 * - Widget components should only re-render when THEIR data changes
 * - Alarm evaluations batched to prevent render storms
 * - Historical data queries memoized to avoid recalculation
 */

import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { shallow } from 'zustand/shallow';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Selector function that extracts specific state slice
 */
export type Selector<TStore, TResult> = (state: TStore) => TResult;

/**
 * Equality function for comparing previous and current state
 */
export type EqualityFn<T> = (a: T, b: T) => boolean;

/**
 * Zustand store hook type
 */
export type ZustandHook<T> = {
  (): T;
  <U>(selector: (state: T) => U, equals?: (a: U, b: U) => boolean): U;
  getState: () => T;
  setState: (partial: T | Partial<T> | ((state: T) => T | Partial<T>), replace?: boolean) => void;
  subscribe: (listener: (state: T, prevState: T) => void) => () => void;
};

/**
 * Subscription options for performance tuning
 */
export interface SubscriptionOptions {
  /**
   * Custom equality function (default: shallow comparison)
   */
  equalityFn?: EqualityFn<any>;

  /**
   * Debounce rapid updates (ms)
   */
  debounce?: number;

  /**
   * Throttle high-frequency updates (ms)
   */
  throttle?: number;

  /**
   * Fire effect on initial mount (default: false)
   */
  fireImmediately?: boolean;
}

/**
 * Batch update configuration
 */
export interface BatchUpdateConfig {
  /**
   * Maximum batch window in ms (default: 50ms)
   */
  maxWait?: number;

  /**
   * Maximum batch size (default: 10 updates)
   */
  maxBatch?: number;
}

// ============================================================================
// Selective Subscription Hooks
// ============================================================================

/**
 * Hook for subscribing to specific state slice with custom equality
 *
 * Prevents re-renders when unrelated store state changes
 * Uses shallow comparison by default (checks object properties)
 *
 * @param useStore - Zustand store hook
 * @param selector - Function to extract state slice
 * @param equalityFn - Custom equality function (default: shallow)
 * @returns Selected state slice
 *
 * @example
 * ```tsx
 * // Only re-render when speed or depth changes (not other NMEA data)
 * const { speed, depth } = useSelectiveSubscription(
 *   useNmeaStore,
 *   (state) => ({ speed: state.speed, depth: state.depth }),
 *   shallow
 * );
 * ```
 */
export function useSelectiveSubscription<TStore, TResult>(
  useStore: ZustandHook<TStore>,
  selector: Selector<TStore, TResult>,
  equalityFn: EqualityFn<TResult> = shallow,
): TResult {
  return useStore(selector, equalityFn);
}

/**
 * Hook for subscribing to single primitive value
 *
 * Optimized for subscribing to individual values (numbers, strings, booleans)
 * Uses Object.is equality (strict equality with NaN handling)
 *
 * @param useStore - Zustand store hook
 * @param selector - Function to extract single value
 * @returns Selected value
 *
 * @example
 * ```tsx
 * // Only re-render when heading changes (not other navigation data)
 * const heading = useSingleValueSubscription(
 *   useNmeaStore,
 *   (state) => state.navigation.heading
 * );
 * ```
 */
export function useSingleValueSubscription<TStore, TResult>(
  useStore: ZustandHook<TStore>,
  selector: Selector<TStore, TResult>,
): TResult {
  return useStore(selector, Object.is);
}

/**
 * Hook for subscribing to array state with shallow comparison
 *
 * Prevents re-renders when array contents haven't changed
 * Compares array length and elements (one level deep)
 *
 * @param useStore - Zustand store hook
 * @param selector - Function to extract array state
 * @returns Selected array
 *
 * @example
 * ```tsx
 * // Only re-render when alarm array actually changes
 * const alarms = useArraySubscription(
 *   useNmeaStore,
 *   (state) => state.alarms.activeAlarms
 * );
 * ```
 */
export function useArraySubscription<TStore, TItem>(
  useStore: ZustandHook<TStore>,
  selector: Selector<TStore, TItem[]>,
): TItem[] {
  return useStore(selector, (a: TItem[], b: TItem[]) => {
    if (a.length !== b.length) return false;
    return a.every((item: TItem, index: number) => Object.is(item, b[index]));
  });
}

/**
 * Hook for throttled store subscription
 *
 * Limits update frequency for high-frequency state changes
 * Useful for NMEA data that updates faster than display needs
 *
 * @param useStore - Zustand store hook
 * @param selector - Function to extract state slice
 * @param throttleMs - Throttle interval in ms (default: 100ms)
 * @returns Throttled state value
 *
 * @example
 * ```tsx
 * // Update heading display max every 100ms (even if NMEA updates faster)
 * const heading = useThrottledSubscription(
 *   useNmeaStore,
 *   (state) => state.navigation.heading,
 *   100
 * );
 * ```
 */
export function useThrottledSubscription<TStore, TResult>(
  useStore: ZustandHook<TStore>,
  selector: Selector<TStore, TResult>,
  throttleMs: number = 100,
): TResult {
  const latestValue = useStore(selector);
  const [throttledValue, setThrottledValue] = useState(latestValue);
  const lastUpdateTime = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTime.current;

    if (timeSinceLastUpdate >= throttleMs) {
      // Update immediately if throttle window has passed
      setThrottledValue(latestValue);
      lastUpdateTime.current = now;
    } else {
      // Schedule update for end of throttle window
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setThrottledValue(latestValue);
        lastUpdateTime.current = Date.now();
      }, throttleMs - timeSinceLastUpdate);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [latestValue, throttleMs]);

  return throttledValue;
}

/**
 * Hook for debounced store subscription
 *
 * Waits for state changes to settle before updating
 * Useful for input-driven state (search, filters)
 *
 * @param useStore - Zustand store hook
 * @param selector - Function to extract state slice
 * @param debounceMs - Debounce delay in ms (default: 300ms)
 * @returns Debounced state value
 *
 * @example
 * ```tsx
 * // Only update search results after user stops typing for 300ms
 * const searchQuery = useDebouncedSubscription(
 *   useSearchStore,
 *   (state) => state.query,
 *   300
 * );
 * ```
 */
export function useDebouncedSubscription<TStore, TResult>(
  useStore: ZustandHook<TStore>,
  selector: Selector<TStore, TResult>,
  debounceMs: number = 300,
): TResult {
  const latestValue = useStore(selector);
  const [debouncedValue, setDebouncedValue] = useState(latestValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(latestValue);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [latestValue, debounceMs]);

  return debouncedValue;
}

// ============================================================================
// Memoization Utilities
// ============================================================================

/**
 * Creates memoized selector for derived state
 *
 * Caches expensive calculations until dependencies change
 * Prevents recalculating derived values on every render
 *
 * @param useStore - Zustand store hook
 * @param selector - Function to extract base state
 * @param deriveFn - Function to compute derived value
 * @param equalityFn - Equality function for cache invalidation
 * @returns Memoized derived value
 *
 * @example
 * ```tsx
 * // Calculate distance to waypoint only when position/waypoint changes
 * const distance = useMemoizedSelector(
 *   useNmeaStore,
 *   (state) => ({
 *     position: state.navigation.position,
 *     waypoint: state.navigation.activeWaypoint
 *   }),
 *   ({ position, waypoint }) => calculateDistance(position, waypoint),
 *   shallow
 * );
 * ```
 */
export function useMemoizedSelector<TStore, TBase, TResult>(
  useStore: ZustandHook<TStore>,
  selector: Selector<TStore, TBase>,
  deriveFn: (base: TBase) => TResult,
  equalityFn: EqualityFn<TBase> = shallow,
): TResult {
  const baseState = useStore(selector, equalityFn);
  return useMemo(() => deriveFn(baseState), [baseState, deriveFn]);
}

/**
 * Creates cached selector that updates only when predicate returns true
 *
 * Useful for filtering high-frequency updates by significance
 * Example: Only update speed display when change exceeds 0.1 knots
 *
 * @param useStore - Zustand store hook
 * @param selector - Function to extract state value
 * @param shouldUpdate - Predicate to determine if update is significant
 * @returns Cached value that updates only when significant
 *
 * @example
 * ```tsx
 * // Only update display when speed changes by more than 0.1 knots
 * const speed = useConditionalCache(
 *   useNmeaStore,
 *   (state) => state.speed,
 *   (prev, next) => Math.abs(prev - next) > 0.1
 * );
 * ```
 */
export function useConditionalCache<TStore, TResult>(
  useStore: ZustandHook<TStore>,
  selector: Selector<TStore, TResult>,
  shouldUpdate: (prev: TResult, next: TResult) => boolean,
): TResult {
  const latestValue = useStore(selector);
  const cachedValue = useRef<TResult>(latestValue);

  if (shouldUpdate(cachedValue.current, latestValue)) {
    cachedValue.current = latestValue;
  }

  return cachedValue.current;
}

// ============================================================================
// Batch Update Utilities
// ============================================================================

/**
 * Creates batch update function for store
 *
 * Accumulates multiple state updates and applies them together
 * Reduces number of re-renders when multiple related changes occur
 *
 * @param setState - Zustand setState function
 * @param config - Batch configuration options
 * @returns Batch update function
 *
 * @example
 * ```tsx
 * const batchUpdate = createBatchUpdater(useNmeaStore.setState);
 *
 * // Queue multiple updates
 * batchUpdate((state) => ({ ...state, speed: 5.2 }));
 * batchUpdate((state) => ({ ...state, depth: 12.5 }));
 * batchUpdate((state) => ({ ...state, heading: 180 }));
 *
 * // All applied together in single re-render after 50ms or 10 updates
 * ```
 */
export function createBatchUpdater<TStore>(
  setState: (
    partial: TStore | Partial<TStore> | ((state: TStore) => TStore | Partial<TStore>),
    replace?: boolean,
  ) => void,
  config: BatchUpdateConfig = {},
): (updater: (state: TStore) => Partial<TStore>) => void {
  const { maxWait = 50, maxBatch = 10 } = config;

  let pendingUpdates: Array<(state: TStore) => Partial<TStore>> = [];
  let timeoutId: NodeJS.Timeout | null = null;

  const flush = () => {
    if (pendingUpdates.length === 0) return;

    setState((state: TStore) => {
      let newState = { ...state };

      for (const updater of pendingUpdates) {
        const update = updater(newState);
        newState = { ...newState, ...update };
      }

      return newState;
    });

    pendingUpdates = [];
    timeoutId = null;
  };

  return (updater) => {
    pendingUpdates.push(updater);

    // Flush if max batch size reached
    if (pendingUpdates.length >= maxBatch) {
      if (timeoutId) clearTimeout(timeoutId);
      flush();
      return;
    }

    // Schedule flush if not already scheduled
    if (!timeoutId) {
      timeoutId = setTimeout(flush, maxWait);
    }
  };
}

/**
 * Hook for batched state updates within component
 *
 * Batches multiple setState calls into single update
 * Useful for components that make rapid state changes
 *
 * @param config - Batch configuration options
 * @returns Batch update controller with queue and flush methods
 *
 * @example
 * ```tsx
 * const batch = useBatchedUpdates({ maxWait: 50, maxBatch: 10 });
 *
 * // Queue updates
 * batch.queue(() => setSpeed(5.2));
 * batch.queue(() => setDepth(12.5));
 * batch.queue(() => setHeading(180));
 *
 * // Force flush immediately (optional)
 * batch.flush();
 * ```
 */
export function useBatchedUpdates(config: BatchUpdateConfig = {}) {
  const { maxWait = 50, maxBatch = 10 } = config;

  const pendingUpdates = useRef<Array<() => void>>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const flush = useCallback(() => {
    if (pendingUpdates.current.length === 0) return;

    // Execute all pending updates
    for (const update of pendingUpdates.current) {
      update();
    }

    pendingUpdates.current = [];

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const queue = useCallback(
    (update: () => void) => {
      pendingUpdates.current.push(update);

      // Flush if max batch size reached
      if (pendingUpdates.current.length >= maxBatch) {
        flush();
        return;
      }

      // Schedule flush if not already scheduled
      if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(flush, maxWait);
      }
    },
    [flush, maxBatch, maxWait],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { queue, flush };
}

// ============================================================================
// Performance Monitoring
// ============================================================================

/**
 * Hook for monitoring subscription performance
 *
 * Tracks re-render frequency to identify performance issues
 * Only active in development mode
 *
 * @param componentName - Component name for logging
 * @param selector - Selector function being monitored
 * @param warnThreshold - Re-renders per second threshold for warning (default: 10)
 *
 * @example
 * ```tsx
 * function SpeedWidget() {
 *   const speed = useNmeaStore((state) => state.speed);
 *
 *   useSubscriptionMonitor(
 *     'SpeedWidget',
 *     (state) => state.speed,
 *     10 // Warn if more than 10 re-renders per second
 *   );
 *
 *   return <Text>{speed}</Text>;
 * }
 * ```
 */
export function useSubscriptionMonitor<TStore, TResult>(
  componentName: string,
  selector: Selector<TStore, TResult>,
  warnThreshold: number = 10,
): void {
  // Hooks must be called unconditionally
  const renderCount = useRef(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    // Only monitor in development
    if (!__DEV__) return;
    
    renderCount.current++;

    const elapsed = Date.now() - startTime.current;
    const rendersPerSecond = (renderCount.current / elapsed) * 1000;

    if (rendersPerSecond > warnThreshold) {
      console.warn(
        `[State Performance] ${componentName} is re-rendering frequently: ` +
          `${rendersPerSecond.toFixed(2)} renders/sec ` +
          `(${renderCount.current} renders in ${elapsed}ms). ` +
            `Consider optimizing selector or using throttled subscription.`,
        );
      }
  });
}

/**
 * Logs selector equality checks for debugging
 *
 * Helps identify why components are re-rendering
 * Only active in development mode with verbose logging enabled
 *
 * @param componentName - Component name for logging
 * @param value - Current selector value
 * @param previousValue - Previous selector value
 * @param equalityFn - Equality function being used
 */
export function logEqualityCheck<T>(
  componentName: string,
  value: T,
  previousValue: T,
  equalityFn: EqualityFn<T>,
): void {
  if (__DEV__ && process.env.VERBOSE_STATE_LOGGING === 'true') {
    const isEqual = equalityFn(value, previousValue);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates optimized selector for marine widget data
 *
 * Pre-configured selector patterns for common marine data types
 * Includes appropriate equality checks and performance tuning
 *
 * @param widgetType - Type of marine widget
 * @returns Optimized selector configuration
 *
 * @example
 * ```tsx
 * const config = createMarineWidgetSelector('speed');
 * const speed = useSelectiveSubscription(
 *   useNmeaStore,
 *   config.selector,
 *   config.equalityFn
 * );
 * ```
 */
export function createMarineWidgetSelector(widgetType: string) {
  type ConfigMap = {
    [key: string]: {
      selector: (state: any) => any;
      equalityFn: (a: any, b: any) => boolean;
    };
  };

  const configs: ConfigMap = {
    speed: {
      selector: (state: any) => state.speed,
      equalityFn: (a: number, b: number) => Math.abs(a - b) < 0.1, // 0.1 knot threshold
    },
    depth: {
      selector: (state: any) => state.depth,
      equalityFn: (a: number, b: number) => Math.abs(a - b) < 0.1, // 0.1 meter threshold
    },
    heading: {
      selector: (state: any) => state.navigation.heading,
      equalityFn: (a: number, b: number) => Math.abs(a - b) < 1, // 1 degree threshold
    },
    wind: {
      selector: (state: any) => ({
        speed: state.wind.speed,
        direction: state.wind.direction,
      }),
      equalityFn: shallow,
    },
    battery: {
      selector: (state: any) => state.battery,
      equalityFn: (a: any, b: any) =>
        Math.abs(a.voltage - b.voltage) < 0.1 && Math.abs(a.current - b.current) < 0.1,
    },
    alarms: {
      selector: (state: any) => state.alarms.activeAlarms,
      equalityFn: (a: any[], b: any[]) =>
        a.length === b.length && a.every((item, i) => item.id === b[i].id),
    },
  };

  return (
    configs[widgetType] || {
      selector: (state: any) => state,
      equalityFn: shallow,
    }
  );
}

// Remove duplicate React import at bottom
