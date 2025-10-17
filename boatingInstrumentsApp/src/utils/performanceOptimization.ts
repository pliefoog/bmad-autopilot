// Performance Optimization Utilities
// Reusable performance optimization patterns for widgets and components

import React, { memo, useMemo, useCallback, useRef } from 'react';

// Custom comparison function for React.memo with deep object comparison
export const createMemoComparison = <T extends Record<string, any>>(
  shallowKeys: (keyof T)[] = [],
  deepKeys: (keyof T)[] = []
) => {
  return (prevProps: T, nextProps: T): boolean => {
    // Check shallow keys first (fastest)
    for (const key of shallowKeys) {
      if (prevProps[key] !== nextProps[key]) {
        return false;
      }
    }

    // Check deep keys if needed
    for (const key of deepKeys) {
      if (JSON.stringify(prevProps[key]) !== JSON.stringify(nextProps[key])) {
        return false;
      }
    }

    return true;
  };
};

// Marine widget specific memoization for NMEA data
export const marineMemoComparison = (
  prevProps: { data?: any; theme?: any; config?: any },
  nextProps: { data?: any; theme?: any; config?: any }
): boolean => {
  // Fast path: check if data references are the same
  if (prevProps.data === nextProps.data && 
      prevProps.theme === nextProps.theme && 
      prevProps.config === nextProps.config) {
    return true;
  }

  // Check data values that actually matter for marine widgets
  const marineFields = ['heading', 'speed', 'depth', 'latitude', 'longitude', 'windSpeed', 'windDirection'];
  
  for (const field of marineFields) {
    if (prevProps.data?.[field] !== nextProps.data?.[field]) {
      return false;
    }
  }

  // Theme colors that affect widget rendering
  const themeColors = ['primary', 'background', 'text', 'error', 'warning', 'success'];
  for (const color of themeColors) {
    if (prevProps.theme?.[color] !== nextProps.theme?.[color]) {
      return false;
    }
  }

  return true;
};

// HOC for marine widget optimization
export function withMarineOptimization<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  componentName?: string
): React.ComponentType<T> {
  const OptimizedComponent = memo(WrappedComponent, marineMemoComparison);
  OptimizedComponent.displayName = `MarineOptimized(${componentName || WrappedComponent.displayName || 'Component'})`;
  return OptimizedComponent;
}

// Performance-optimized selector hook for NMEA data
export function useOptimizedNMEASelector<T>(
  selector: (state: any) => T,
  equalityFn?: (left: T, right: T) => boolean
) {
  const lastResultRef = useRef<T | undefined>(undefined);
  const lastSelectorRef = useRef(selector);

  return useMemo(() => {
    // Simple equality check by default
    const defaultEqualityFn = (left: T, right: T) => left === right;
    const isEqual = equalityFn || defaultEqualityFn;

    // Return memoized selector
    return (state: any): T => {
      const result = selector(state);
      
      if (lastResultRef.current === undefined || !isEqual(lastResultRef.current, result)) {
        lastResultRef.current = result;
      }
      
      return lastResultRef.current;
    };
  }, [selector, equalityFn]);
}

// Throttled callback hook for high-frequency updates
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallTime = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCallTime.current >= delay) {
      lastCallTime.current = now;
      callback(...args);
    } else {
      // Clear existing timeout and set new one
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        lastCallTime.current = Date.now();
        callback(...args);
      }, delay - (now - lastCallTime.current));
    }
  }, [callback, delay]) as T;
}

// Debounced callback hook
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;
}

// Memoized value with custom equality
export function useMemoWithEquality<T>(
  factory: () => T,
  deps: React.DependencyList,
  equalityFn: (prev: T, next: T) => boolean
): T {
  const valueRef = useRef<T | undefined>(undefined);
  const depsRef = useRef<React.DependencyList | undefined>(undefined);

  return useMemo(() => {
    const newValue = factory();
    
    // First render
    if (valueRef.current === undefined) {
      valueRef.current = newValue;
      depsRef.current = deps;
      return newValue;
    }

    // Check if we should recalculate
    const shouldRecalculate = !depsRef.current || 
      deps.length !== depsRef.current.length ||
      deps.some((dep, index) => dep !== depsRef.current![index]);

    if (shouldRecalculate) {
      const nextValue = factory();
      if (!equalityFn(valueRef.current, nextValue)) {
        valueRef.current = nextValue;
      }
      depsRef.current = deps;
    }

    return valueRef.current;
  }, deps);
}

// Performance measurement decorator
export function measurePerformance<T extends (...args: any[]) => any>(
  fn: T,
  label?: string
): T {
  return ((...args: Parameters<T>) => {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();
    
    if (__DEV__ && end - start > 1) { // Only log if > 1ms
      console.log(`⏱️  ${label || fn.name}: ${(end - start).toFixed(2)}ms`);
    }
    
    return result;
  }) as T;
}

// Marine-specific data transformation cache
class MarineDataCache {
  private cache = new Map<string, { value: any; timestamp: number }>();
  private readonly TTL = 500; // 500ms cache TTL

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  set(key: string, value: any): void {
    this.cache.set(key, { value, timestamp: Date.now() });
    
    // Cleanup old entries periodically
    if (this.cache.size > 100) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp > this.TTL) {
          this.cache.delete(k);
        }
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const marineDataCache = new MarineDataCache();

// Cached marine calculation hook
export function useCachedMarineCalculation<T>(
  key: string,
  calculator: () => T,
  deps: React.DependencyList
): T {
  return useMemo(() => {
    const cached = marineDataCache.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const result = calculator();
    marineDataCache.set(key, result);
    return result;
  }, deps);
}

// Widget-specific optimization constants
export const WidgetPerformanceConfig = {
  // Render time thresholds (ms)
  FAST_RENDER: 8,
  NORMAL_RENDER: 16,
  SLOW_RENDER: 32,
  
  // Update frequencies for different data types
  HIGH_FREQUENCY: 100,  // GPS, heading, speed
  MEDIUM_FREQUENCY: 500, // Depth, temperature
  LOW_FREQUENCY: 1000,   // Engine data, tanks
  
  // Cache TTL values
  SHORT_CACHE: 250,
  MEDIUM_CACHE: 500,
  LONG_CACHE: 1000,
} as const;