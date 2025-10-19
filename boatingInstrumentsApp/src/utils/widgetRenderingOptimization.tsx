/**
 * Widget Rendering Optimization Utilities
 * 
 * Performance-optimized rendering patterns for marine widgets:
 * - Efficient update cycles with throttling
 * - Smart re-render prevention
 * - Memoization strategies
 * - Native driver animations
 * 
 * Story 4.5 AC4: Efficient rendering of widget updates
 */

import React, { useRef, useCallback, useMemo, useState } from 'react';
import { Animated } from 'react-native';

/**
 * Widget update throttle configuration
 * Prevents excessive re-renders from high-frequency NMEA data
 */
export interface WidgetUpdateConfig {
  /** Minimum time between updates in ms */
  throttleMs: number;
  /** Whether to use trailing update (default: true) */
  trailing?: boolean;
  /** Significant change threshold (percentage) */
  significantChangePercent?: number;
}

/**
 * Default widget update configurations by widget type
 */
export const WIDGET_UPDATE_CONFIGS: Record<string, WidgetUpdateConfig> = {
  // High-frequency updates (real-time feel)
  speed: {
    throttleMs: 100,
    trailing: true,
    significantChangePercent: 2, // 2% change triggers update
  },
  depth: {
    throttleMs: 200,
    trailing: true,
    significantChangePercent: 5, // 5% change
  },
  wind: {
    throttleMs: 150,
    trailing: true,
    significantChangePercent: 3,
  },
  
  // Medium-frequency updates
  compass: {
    throttleMs: 100,
    trailing: true,
    significantChangePercent: 1, // 1 degree change
  },
  gps: {
    throttleMs: 500,
    trailing: true,
    significantChangePercent: 0.0001, // Lat/lon precision
  },
  
  // Low-frequency updates (slow-changing data)
  battery: {
    throttleMs: 1000,
    trailing: true,
    significantChangePercent: 1,
  },
  tanks: {
    throttleMs: 2000,
    trailing: true,
    significantChangePercent: 2,
  },
  engine: {
    throttleMs: 200,
    trailing: true,
    significantChangePercent: 5,
  },
  
  // Static/rare updates
  autopilot: {
    throttleMs: 500,
    trailing: true,
    significantChangePercent: 0,
  },
};

/**
 * Hook for optimized widget value updates
 * Prevents re-renders for insignificant changes
 */
export function useOptimizedWidgetValue<T extends number | string | null>(
  value: T,
  config: WidgetUpdateConfig
): T {
  const lastValueRef = useRef<T>(value);
  const lastUpdateTimeRef = useRef<number>(0);
  const pendingUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const [displayValue, setDisplayValue] = useState<T>(value);
  
  const updateValue = useCallback((newValue: T) => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    
    // Check if enough time has passed
    if (timeSinceLastUpdate < config.throttleMs) {
      // Schedule trailing update if configured
      if (config.trailing && !pendingUpdateRef.current) {
        pendingUpdateRef.current = setTimeout(() => {
          setDisplayValue(newValue);
          lastValueRef.current = newValue;
          lastUpdateTimeRef.current = Date.now();
          pendingUpdateRef.current = null;
        }, config.throttleMs - timeSinceLastUpdate);
      }
      return;
    }
    
    // Check for significant change
    if (typeof newValue === 'number' && typeof lastValueRef.current === 'number') {
      const percentChange = Math.abs(
        ((newValue - lastValueRef.current) / (lastValueRef.current || 1)) * 100
      );
      
      if (
        config.significantChangePercent &&
        percentChange < config.significantChangePercent
      ) {
        // Insignificant change, skip update
        return;
      }
    }
    
    // Update immediately
    setDisplayValue(newValue);
    lastValueRef.current = newValue;
    lastUpdateTimeRef.current = now;
    
    // Clear any pending update
    if (pendingUpdateRef.current) {
      clearTimeout(pendingUpdateRef.current);
      pendingUpdateRef.current = null;
    }
  }, [config]);
  
  // Update when value changes
  React.useEffect(() => {
    if (value !== lastValueRef.current) {
      updateValue(value);
    }
  }, [value, updateValue]);
  
  // Cleanup
  React.useEffect(() => {
    return () => {
      if (pendingUpdateRef.current) {
        clearTimeout(pendingUpdateRef.current);
      }
    };
  }, []);
  
  return displayValue;
}

/**
 * Optimized widget component wrapper with performance tracking
 */
export interface OptimizedWidgetProps {
  widgetId: string;
  widgetType: string;
  children: React.ReactNode;
  updateConfig?: WidgetUpdateConfig;
  onRenderComplete?: (duration: number) => void;
}

/**
 * Higher-order component for widget performance optimization
 */
export function withWidgetOptimization<P extends object>(
  WidgetComponent: React.ComponentType<P>,
  widgetType: string
): React.ComponentType<P> {
  const OptimizedWidget = React.memo(
    (props: P) => {
      const renderStartRef = useRef<number>(0);
      
      // Track render start
      renderStartRef.current = Date.now();
      
      // Track render complete
      React.useEffect(() => {
        const duration = Date.now() - renderStartRef.current;
        if (__DEV__ && duration > 16.67) {
          console.warn(
            `[WidgetOptimization] ${widgetType} render took ${duration.toFixed(2)}ms (>16.67ms threshold)`
          );
        }
      });
      
      return <WidgetComponent {...props} />;
    },
    (prevProps, nextProps) => {
      // Custom comparison for widget props
      // Skip re-render if data hasn't changed significantly
      
      const prevData = (prevProps as any).data;
      const nextData = (nextProps as any).data;
      
      // Quick reference check
      if (prevData === nextData) {
        return true;
      }
      
      // Deep comparison for specific widget data
      if (typeof prevData === 'object' && typeof nextData === 'object') {
        // Check if all values are close enough
        const keys = Object.keys(nextData || {});
        for (const key of keys) {
          const prevValue = prevData?.[key];
          const nextValue = nextData?.[key];
          
          if (typeof prevValue === 'number' && typeof nextValue === 'number') {
            // Check for significant change
            const config = WIDGET_UPDATE_CONFIGS[widgetType];
            if (config?.significantChangePercent) {
              const percentChange = Math.abs(
                ((nextValue - prevValue) / (prevValue || 1)) * 100
              );
              
              if (percentChange >= config.significantChangePercent) {
                return false; // Significant change, re-render
              }
            }
          } else if (prevValue !== nextValue) {
            return false; // Different value, re-render
          }
        }
        
        return true; // No significant changes, skip re-render
      }
      
      return false; // Re-render by default
    }
  );
  
  OptimizedWidget.displayName = `OptimizedWidget(${widgetType})`;
  
  return OptimizedWidget as React.ComponentType<P>;
}

/**
 * Hook for native-driven animations
 * Uses native driver for 60fps performance
 */
export function useNativeAnimation(config: {
  duration?: number;
  useNativeDriver?: boolean;
  loop?: boolean;
}) {
  const {
    duration = 300,
    useNativeDriver = true,
    loop = false,
  } = config;
  
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  const startAnimation = useCallback(() => {
    const animation = Animated.timing(animatedValue, {
      toValue: 1,
      duration,
      useNativeDriver,
    });
    
    if (loop) {
      Animated.loop(animation).start();
    } else {
      animation.start();
    }
  }, [animatedValue, duration, useNativeDriver, loop]);
  
  const stopAnimation = useCallback(() => {
    animatedValue.stopAnimation();
  }, [animatedValue]);
  
  const resetAnimation = useCallback(() => {
    animatedValue.setValue(0);
  }, [animatedValue]);
  
  return {
    animatedValue,
    startAnimation,
    stopAnimation,
    resetAnimation,
  };
}

/**
 * Optimized value interpolation for smooth animations
 */
export function useValueInterpolation(
  inputValue: number,
  outputRange: [number, number],
  config?: {
    inputRange?: [number, number];
    clamp?: boolean;
  }
) {
  const { inputRange = [0, 100], clamp = true } = config || {};
  
  const animatedValue = useRef(new Animated.Value(inputValue)).current;
  
  React.useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: inputValue,
      useNativeDriver: false, // Can't use native driver for interpolation
      friction: 8,
      tension: 40,
    }).start();
  }, [inputValue, animatedValue]);
  
  const interpolatedValue = useMemo(
    () =>
      animatedValue.interpolate({
        inputRange,
        outputRange,
        extrapolate: clamp ? 'clamp' : 'extend',
      }),
    [animatedValue, inputRange, outputRange, clamp]
  );
  
  return interpolatedValue;
}

/**
 * Batch widget updates to reduce re-renders
 * Useful for updating multiple related values
 */
export function useBatchedWidgetUpdates<T>(
  updateCallback: (updates: T[]) => void,
  batchWindowMs: number = 50
) {
  const pendingUpdatesRef = useRef<T[]>([]);
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const addUpdate = useCallback(
    (update: T) => {
      pendingUpdatesRef.current.push(update);
      
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
      
      batchTimerRef.current = setTimeout(() => {
        if (pendingUpdatesRef.current.length > 0) {
          updateCallback(pendingUpdatesRef.current);
          pendingUpdatesRef.current = [];
        }
        batchTimerRef.current = null;
      }, batchWindowMs);
    },
    [updateCallback, batchWindowMs]
  );
  
  React.useEffect(() => {
    return () => {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
    };
  }, []);
  
  return addUpdate;
}

/**
 * Prevent unnecessary re-renders for static widget chrome
 * (titles, labels, borders, etc.)
 */
export const WidgetChrome = React.memo(
  ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
  },
  () => true // Never re-render
);
WidgetChrome.displayName = 'WidgetChrome';

/**
 * Get recommended update config for widget type
 */
export function getWidgetUpdateConfig(widgetType: string): WidgetUpdateConfig {
  return (
    WIDGET_UPDATE_CONFIGS[widgetType] || {
      throttleMs: 200,
      trailing: true,
      significantChangePercent: 5,
    }
  );
}
