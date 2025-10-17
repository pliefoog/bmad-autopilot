// Performance Monitoring Hook
// React DevTools Profiler integration and performance metrics collection

import { useCallback, useEffect, useRef, useState } from 'react';

export interface PerformanceMetrics {
  renderCount: number;
  totalRenderTime: number;
  averageRenderTime: number;
  lastRenderTime: number;
  slowRenders: number;
  memoryUsage?: {
    used: number;
    total: number;
    limit: number;
  };
  componentName: string;
  timestamp: number;
}

export interface UsePerformanceMonitorOptions {
  componentName: string;
  slowRenderThreshold?: number; // milliseconds
  enableMemoryTracking?: boolean;
  sampleRate?: number; // 0-1, percentage of renders to sample
  enableLogging?: boolean;
}

export interface UsePerformanceMonitorReturn {
  metrics: PerformanceMetrics;
  markRender: (renderTime: number) => void;
  reset: () => void;
  getReport: () => string;
}

export function usePerformanceMonitor(
  options: UsePerformanceMonitorOptions
): UsePerformanceMonitorReturn {
  const {
    componentName,
    slowRenderThreshold = 16, // 16ms = 60fps threshold
    enableMemoryTracking = false,
    sampleRate = 1.0,
    enableLogging = __DEV__,
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    totalRenderTime: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
    slowRenders: 0,
    componentName,
    timestamp: Date.now(),
  });

  const renderHistory = useRef<number[]>([]);
  const lastSampleTime = useRef(0);

  // Memory tracking (if available)
  const getMemoryUsage = useCallback(() => {
    if (!enableMemoryTracking) return undefined;
    
    // Use performance.memory if available (Chrome/Edge)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }
    
    return undefined;
  }, [enableMemoryTracking]);

  // Manual render time tracking
  const markRender = useCallback((renderTime: number) => {
    const now = Date.now();
    
    // Sample rate check
    if (Math.random() > sampleRate) return;
    
    // Throttle updates to avoid excessive re-renders
    if (now - lastSampleTime.current < 100) return;
    lastSampleTime.current = now;

    setMetrics(prev => {
      const newRenderCount = prev.renderCount + 1;
      const newTotalTime = prev.totalRenderTime + renderTime;
      const newSlowRenders = renderTime > slowRenderThreshold 
        ? prev.slowRenders + 1 
        : prev.slowRenders;

      // Track render history for trend analysis
      renderHistory.current.push(renderTime);
      if (renderHistory.current.length > 100) {
        renderHistory.current.shift();
      }

      if (enableLogging && renderTime > slowRenderThreshold) {
        console.warn(
          `🐌 Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`
        );
      }

      return {
        ...prev,
        renderCount: newRenderCount,
        totalRenderTime: newTotalTime,
        averageRenderTime: newTotalTime / newRenderCount,
        lastRenderTime: renderTime,
        slowRenders: newSlowRenders,
        memoryUsage: getMemoryUsage(),
        timestamp: now,
      };
    });
  }, [componentName, slowRenderThreshold, sampleRate, enableLogging, getMemoryUsage]);

  // Reset metrics
  const reset = useCallback(() => {
    setMetrics({
      renderCount: 0,
      totalRenderTime: 0,
      averageRenderTime: 0,
      lastRenderTime: 0,
      slowRenders: 0,
      componentName,
      timestamp: Date.now(),
    });
    renderHistory.current = [];
  }, [componentName]);

  // Generate performance report
  const getReport = useCallback(() => {
    const { renderCount, totalRenderTime, averageRenderTime, slowRenders, memoryUsage } = metrics;
    const slowRenderPercentage = renderCount > 0 ? (slowRenders / renderCount) * 100 : 0;
    const recentRenders = renderHistory.current.slice(-10);
    const recentAverage = recentRenders.length > 0 
      ? recentRenders.reduce((sum, time) => sum + time, 0) / recentRenders.length 
      : 0;

    const getPerformanceGrade = (avgTime: number, slowPercent: number): string => {
      if (avgTime < 5 && slowPercent < 5) return 'A+ (Excellent)';
      if (avgTime < 10 && slowPercent < 10) return 'A (Good)';
      if (avgTime < 16 && slowPercent < 20) return 'B (Fair)';
      if (avgTime < 25 && slowPercent < 30) return 'C (Poor)';
      return 'D (Needs Optimization)';
    };

    return [
      `📊 Performance Report for ${componentName}`,
      `🔄 Total Renders: ${renderCount}`,
      `⏱️  Average Render Time: ${averageRenderTime.toFixed(2)}ms`,
      `🐌 Slow Renders: ${slowRenders} (${slowRenderPercentage.toFixed(1)}%)`,
      `📈 Recent Average: ${recentAverage.toFixed(2)}ms`,
      memoryUsage ? `💾 Memory: ${(memoryUsage.used / 1024 / 1024).toFixed(1)}MB` : '',
      `🎯 Performance Grade: ${getPerformanceGrade(averageRenderTime, slowRenderPercentage)}`,
    ].filter(Boolean).join('\n');
  }, [metrics, componentName]);

  // Development logging
  useEffect(() => {
    if (!enableLogging || !__DEV__) return;

    const interval = setInterval(() => {
      if (metrics.renderCount > 0) {
        console.log(`📊 ${componentName} Performance:`, {
          renders: metrics.renderCount,
          avgTime: `${metrics.averageRenderTime.toFixed(2)}ms`,
          slowRenders: metrics.slowRenders,
        });
      }
    }, 30000); // Log every 30 seconds

    return () => clearInterval(interval);
  }, [metrics, componentName, enableLogging]);

  return {
    metrics,
    markRender,
    reset,
    getReport,
  };
}

// Performance utilities
export const PerformanceUtils = {
  // Measure function execution time
  measureExecution: <T extends (...args: any[]) => any>(
    fn: T,
    label?: string
  ): T => {
    return ((...args: Parameters<T>) => {
      const start = performance.now();
      const result = fn(...args);
      const end = performance.now();
      
      if (__DEV__ && label) {
        console.log(`⏱️  ${label}: ${(end - start).toFixed(2)}ms`);
      }
      
      return result;
    }) as T;
  },

  // Debounce for performance optimization
  debounce: <T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): T => {
    let timeoutId: NodeJS.Timeout;
    
    return ((...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    }) as T;
  },

  // Throttle for performance optimization
  throttle: <T extends (...args: any[]) => any>(
    fn: T,
    limit: number
  ): T => {
    let inThrottle: boolean;
    
    return ((...args: Parameters<T>) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }) as T;
  },

  // Memory usage monitoring
  getMemoryUsage: (): { used: number; total: number; limit: number } | null => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }
    return null;
  },
};