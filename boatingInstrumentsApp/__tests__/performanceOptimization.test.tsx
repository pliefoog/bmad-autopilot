// Performance Optimization Tests
// Test suite for performance monitoring and optimization utilities

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import {
  usePerformanceMonitor,
  PerformanceUtils,
} from '../src/hooks/usePerformanceMonitor';
import {
  withMarineOptimization,
  useThrottledCallback,
  useDebouncedCallback,
  useCachedMarineCalculation,
  marineMemoComparison,
  WidgetPerformanceConfig,
} from '../src/utils/performanceOptimization';

// Mock component for testing
const TestWidget: React.FC<{ value: number; theme: any }> = ({ value, theme }) => (
  <View>
    <Text>{value}</Text>
  </View>
);

// Optimized test widget
const OptimizedTestWidget = withMarineOptimization(TestWidget, 'TestWidget');

describe('Performance Optimization', () => {
  describe('usePerformanceMonitor', () => {
    it('should create performance monitor instance', () => {
      let monitorInstance: any;
      
      const TestComponent = () => {
        monitorInstance = usePerformanceMonitor({
          componentName: 'TestComponent',
        });
        return <Text>Test</Text>;
      };

      render(<TestComponent />);
      
      expect(monitorInstance).toBeDefined();
      expect(monitorInstance.metrics).toBeDefined();
      expect(monitorInstance.markRender).toBeDefined();
      expect(monitorInstance.reset).toBeDefined();
      expect(monitorInstance.getReport).toBeDefined();
    });

    it('should track render metrics', () => {
      let monitorInstance: any;
      
      const TestComponent = () => {
        monitorInstance = usePerformanceMonitor({
          componentName: 'TestComponent',
        });
        
        // Simulate render measurement
        monitorInstance.markRender(10);
        
        return <Text>Test</Text>;
      };

      render(<TestComponent />);
      
      expect(monitorInstance.metrics.componentName).toBe('TestComponent');
      expect(monitorInstance.metrics.renderCount).toBeGreaterThan(0);
    });
  });

  describe('Performance Utils', () => {
    it('should measure execution time', () => {
      const mockFn = jest.fn(() => 'result');
      const measuredFn = PerformanceUtils.measureExecution(mockFn, 'test');
      
      const result = measuredFn();
      
      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalled();
    });

    it('should throttle function calls', () => {
      const mockFn = jest.fn();
      const throttledFn = PerformanceUtils.throttle(mockFn, 100);
      
      throttledFn();
      throttledFn();
      throttledFn();
      
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should debounce function calls', () => {
      jest.useFakeTimers();
      const mockFn = jest.fn();
      const debouncedFn = PerformanceUtils.debounce(mockFn, 100);
      
      debouncedFn();
      debouncedFn();
      debouncedFn();
      
      expect(mockFn).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(100);
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });
  });

  describe('Marine Optimization', () => {
    it('should create optimized component', () => {
      const OptimizedComponent = withMarineOptimization(TestWidget);
      
      const { getByText } = render(
        <OptimizedComponent value={42} theme={{ primary: '#blue' }} />
      );
      
      expect(getByText('42')).toBeTruthy();
    });

    it('should perform marine-specific comparison', () => {
      const props1 = {
        data: { heading: 180, speed: 5.5 },
        theme: { primary: '#blue' },
        config: { unit: 'knots' },
      };
      
      const props2 = {
        data: { heading: 180, speed: 5.5 },
        theme: { primary: '#blue' },
        config: { unit: 'knots' },
      };
      
      expect(marineMemoComparison(props1, props2)).toBe(true);
      
      const props3 = {
        ...props2,
        data: { heading: 185, speed: 5.5 },
      };
      
      expect(marineMemoComparison(props1, props3)).toBe(false);
    });

    it('should cache marine calculations', () => {
      let calculations = 0;
      
      const TestComponent = () => {
        const result = useCachedMarineCalculation(
          'test-calc',
          () => {
            calculations++;
            return 42;
          },
          []
        );
        
        return <Text>{result}</Text>;
      };

      const { rerender } = render(<TestComponent />);
      rerender(<TestComponent />);
      
      expect(calculations).toBe(1); // Should only calculate once due to caching
    });
  });

  describe('Throttled and Debounced Callbacks', () => {
    it('should throttle callback execution', () => {
      jest.useFakeTimers();
      let callCount = 0;
      
      const TestComponent = () => {
        const throttledCallback = useThrottledCallback(() => {
          callCount++;
        }, 100);

        React.useEffect(() => {
          throttledCallback();
          throttledCallback();
          throttledCallback();
        }, [throttledCallback]);

        return <Text>Test</Text>;
      };

      render(<TestComponent />);
      
      expect(callCount).toBe(1);
      jest.useRealTimers();
    });

    it('should debounce callback execution', () => {
      jest.useFakeTimers();
      let callCount = 0;
      
      const TestComponent = () => {
        const debouncedCallback = useDebouncedCallback(() => {
          callCount++;
        }, 100);

        React.useEffect(() => {
          debouncedCallback();
          debouncedCallback();
          debouncedCallback();
        }, [debouncedCallback]);

        return <Text>Test</Text>;
      };

      render(<TestComponent />);
      
      expect(callCount).toBe(0);
      
      jest.advanceTimersByTime(100);
      
      expect(callCount).toBe(1);
      jest.useRealTimers();
    });
  });

  describe('Performance Configuration', () => {
    it('should provide performance constants', () => {
      expect(WidgetPerformanceConfig.FAST_RENDER).toBe(8);
      expect(WidgetPerformanceConfig.NORMAL_RENDER).toBe(16);
      expect(WidgetPerformanceConfig.SLOW_RENDER).toBe(32);
      expect(WidgetPerformanceConfig.HIGH_FREQUENCY).toBe(100);
      expect(WidgetPerformanceConfig.MEDIUM_FREQUENCY).toBe(500);
      expect(WidgetPerformanceConfig.LOW_FREQUENCY).toBe(1000);
    });
  });
});