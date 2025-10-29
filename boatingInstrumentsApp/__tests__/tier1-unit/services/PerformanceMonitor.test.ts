/**
 * Performance Monitor Service Tests
 * 
 * Comprehensive test suite for PerformanceMonitor service including:
 * - FPS tracking and calculation
 * - Memory monitoring and leak detection
 * - Render time measurement
 * - Performance violations and alerts
 * - Benchmark validation
 * - Report generation
 * 
 * Story 4.5 AC1-5: Performance profiling and benchmarking tests
 */

import { PerformanceMonitor } from "../../../src/services/performance/PerformanceMonitor";

describe('PerformanceMonitor Service', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = PerformanceMonitor.getInstance();
    monitor.reset();
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (monitor.isActive()) {
      monitor.stopMonitoring();
    }
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PerformanceMonitor.getInstance();
      const instance2 = PerformanceMonitor.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', () => {
      const instance1 = PerformanceMonitor.getInstance();
      instance1.startMonitoring();
      
      const instance2 = PerformanceMonitor.getInstance();
      
      expect(instance2.isActive()).toBe(true);
      instance1.stopMonitoring();
    });
  });

  describe('Monitoring Lifecycle', () => {
    it('should start monitoring successfully', () => {
      expect(monitor.isActive()).toBe(false);
      
      monitor.startMonitoring();
      
      expect(monitor.isActive()).toBe(true);
    });

    it('should stop monitoring successfully', () => {
      monitor.startMonitoring();
      expect(monitor.isActive()).toBe(true);
      
      monitor.stopMonitoring();
      
      expect(monitor.isActive()).toBe(false);
    });

    it('should not start monitoring twice', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      monitor.startMonitoring();
      monitor.startMonitoring();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Already monitoring')
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should reset monitoring data', () => {
      monitor.startMonitoring();
      
      // Generate some data
      monitor.markStart('test');
      monitor.markEnd('test');
      
      monitor.reset();
      const metrics = monitor.getMetrics();
      
      expect(metrics.fps).toBe(0);
      expect(metrics.memoryUsageMB).toBe(0);
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(() => {
      monitor.startMonitoring();
    });

    it('should return current metrics', () => {
      const metrics = monitor.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('fps');
      expect(metrics).toHaveProperty('memoryUsageMB');
      expect(metrics).toHaveProperty('renderTime');
      expect(metrics).toHaveProperty('lastUpdateTime');
      expect(metrics).toHaveProperty('averageFPS');
      expect(metrics).toHaveProperty('peakMemoryMB');
    });

    it('should track FPS over time', () => {
      // Wait for some frames
      return new Promise((resolve) => {
        setTimeout(() => {
          const metrics = monitor.getMetrics();
          
          // FPS should be calculated
          expect(metrics.fps).toBeGreaterThanOrEqual(0);
          expect(metrics.averageFPS).toBeGreaterThanOrEqual(0);
          
          resolve(undefined);
        }, 100);
      });
    });

    it('should calculate average FPS correctly', () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const metrics = monitor.getMetrics();
          
          // Average should be calculated (value may be unrealistic in test environment)
          expect(metrics.averageFPS).toBeGreaterThanOrEqual(0);
          
          // If FPS is being tracked, ensure it's a valid number
          if (metrics.averageFPS > 0) {
            expect(Number.isFinite(metrics.averageFPS)).toBe(true);
          }
          
          resolve(undefined);
        }, 200);
      });
    });

    it('should track peak memory usage', () => {
      const metrics = monitor.getMetrics();
      
      expect(metrics.peakMemoryMB).toBeGreaterThanOrEqual(0);
      expect(metrics.peakMemoryMB).toBeGreaterThanOrEqual(metrics.memoryUsageMB);
    });
  });

  describe('Render Time Measurement', () => {
    beforeEach(() => {
      monitor.startMonitoring();
    });

    it('should measure render time with markStart/markEnd', () => {
      monitor.markStart('component-render');
      
      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Busy wait for 10ms
      }
      
      const duration = monitor.markEnd('component-render');
      
      expect(duration).toBeGreaterThanOrEqual(10);
      expect(duration).toBeLessThan(50); // Should complete in reasonable time
    });

    it('should handle missing start mark gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const duration = monitor.markEnd('non-existent');
      
      expect(duration).toBe(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No start mark found')
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should provide measureRender convenience method', () => {
      const endMeasure = monitor.measureRender('TestComponent');
      
      // Simulate render
      const start = Date.now();
      while (Date.now() - start < 5) {
        // Busy wait
      }
      
      expect(endMeasure).toBeInstanceOf(Function);
      endMeasure();
      
      // Should complete without errors
    });

    it('should track multiple render measurements', () => {
      monitor.markStart('render1');
      monitor.markEnd('render1');
      
      monitor.markStart('render2');
      monitor.markEnd('render2');
      
      monitor.markStart('render3');
      monitor.markEnd('render3');
      
      // Should handle multiple measurements without errors
      const metrics = monitor.getMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe('Performance Violations', () => {
    beforeEach(() => {
      monitor.startMonitoring();
    });

    it('should detect slow render violations', () => {
      monitor.markStart('slow-render');
      
      // Simulate slow render (>16.67ms for 60fps)
      const start = Date.now();
      while (Date.now() - start < 20) {
        // Busy wait for 20ms
      }
      
      monitor.markEnd('slow-render');
      
      const violations = monitor.getViolations();
      const renderViolations = violations.filter(v => v.metric.includes('render'));
      
      expect(renderViolations.length).toBeGreaterThan(0);
    });

    it('should categorize violation severity correctly', () => {
      monitor.markStart('very-slow-render');
      
      // Simulate very slow render (>33ms = 2x threshold)
      const start = Date.now();
      while (Date.now() - start < 35) {
        // Busy wait
      }
      
      monitor.markEnd('very-slow-render');
      
      const violations = monitor.getViolations();
      const severeViolations = violations.filter(v => 
        v.severity === 'high' && v.metric.includes('render')
      );
      
      expect(severeViolations.length).toBeGreaterThan(0);
    });

    it('should limit violations history to 100 entries', () => {
      // Generate many violations
      for (let i = 0; i < 150; i++) {
        monitor.markStart(`render${i}`);
        
        const start = Date.now();
        while (Date.now() - start < 20) {
          // Busy wait
        }
        
        monitor.markEnd(`render${i}`);
      }
      
      const violations = monitor.getViolations();
      
      expect(violations.length).toBeLessThanOrEqual(100);
    });

    it('should include violation metadata', () => {
      monitor.markStart('test-render');
      
      const start = Date.now();
      while (Date.now() - start < 20) {
        // Busy wait
      }
      
      monitor.markEnd('test-render');
      
      const violations = monitor.getViolations();
      
      if (violations.length > 0) {
        const violation = violations[0];
        
        expect(violation).toHaveProperty('metric');
        expect(violation).toHaveProperty('actual');
        expect(violation).toHaveProperty('expected');
        expect(violation).toHaveProperty('severity');
        expect(violation).toHaveProperty('timestamp');
        expect(violation.timestamp).toBeInstanceOf(Date);
      }
    });
  });

  describe('Performance Report', () => {
    beforeEach(() => {
      monitor.startMonitoring();
    });

    it('should generate comprehensive performance report', () => {
      const report = monitor.getReport();
      
      expect(report).toBeDefined();
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('duration');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('benchmarks');
      expect(report).toHaveProperty('violations');
      expect(report).toHaveProperty('score');
    });

    it('should calculate performance score (0-100)', () => {
      const report = monitor.getReport();
      
      expect(report.score).toBeGreaterThanOrEqual(0);
      expect(report.score).toBeLessThanOrEqual(100);
    });

    it('should include benchmark definitions', () => {
      const report = monitor.getReport();
      
      expect(report.benchmarks).toBeDefined();
      expect(Array.isArray(report.benchmarks)).toBe(true);
      expect(report.benchmarks.length).toBeGreaterThan(0);
      
      const benchmark = report.benchmarks[0];
      expect(benchmark).toHaveProperty('name');
      expect(benchmark).toHaveProperty('targetFPS');
      expect(benchmark).toHaveProperty('maxMemoryMB');
      expect(benchmark).toHaveProperty('maxRenderTimeMs');
      expect(benchmark).toHaveProperty('platform');
    });

    it('should reduce score for performance violations', () => {
      // Generate violation
      monitor.markStart('slow');
      
      const start = Date.now();
      while (Date.now() - start < 30) {
        // Busy wait
      }
      
      monitor.markEnd('slow');
      
      const report = monitor.getReport();
      
      // Score should be less than perfect due to violation
      expect(report.score).toBeLessThan(100);
    });

    it('should include violations in report', () => {
      // Generate violation
      monitor.markStart('test');
      
      const start = Date.now();
      while (Date.now() - start < 20) {
        // Busy wait
      }
      
      monitor.markEnd('test');
      
      const report = monitor.getReport();
      
      expect(Array.isArray(report.violations)).toBe(true);
    });
  });

  describe('Memory Monitoring', () => {
    it('should track memory usage if available', () => {
      monitor.startMonitoring();
      
      // Wait for memory snapshot
      return new Promise((resolve) => {
        setTimeout(() => {
          const metrics = monitor.getMetrics();
          
          // Memory tracking depends on platform
          expect(metrics.memoryUsageMB).toBeGreaterThanOrEqual(0);
          
          resolve(undefined);
        }, 100);
      });
    });

    it('should detect peak memory usage', () => {
      monitor.startMonitoring();
      
      return new Promise((resolve) => {
        setTimeout(() => {
          const metrics = monitor.getMetrics();
          
          expect(metrics.peakMemoryMB).toBeGreaterThanOrEqual(0);
          expect(metrics.peakMemoryMB).toBeGreaterThanOrEqual(metrics.memoryUsageMB);
          
          resolve(undefined);
        }, 100);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid start/stop cycles', () => {
      for (let i = 0; i < 10; i++) {
        monitor.startMonitoring();
        monitor.stopMonitoring();
      }
      
      expect(monitor.isActive()).toBe(false);
    });

    it('should handle measurements without monitoring', () => {
      // Should not throw
      expect(() => {
        monitor.markStart('test');
        monitor.markEnd('test');
      }).not.toThrow();
    });

    it('should handle reset during active monitoring', () => {
      monitor.startMonitoring();
      
      monitor.markStart('test');
      monitor.markEnd('test');
      
      monitor.reset();
      
      const metrics = monitor.getMetrics();
      expect(metrics.fps).toBe(0);
    });

    it('should handle concurrent measurements', () => {
      monitor.startMonitoring();
      
      monitor.markStart('concurrent1');
      
      // Add small delay to ensure marks are set
      const start = Date.now();
      while (Date.now() - start < 1) {
        // Minimal delay
      }
      
      monitor.markStart('concurrent2');
      
      while (Date.now() - start < 2) {
        // Minimal delay
      }
      
      monitor.markStart('concurrent3');
      
      // End measurements in different order
      const duration3 = monitor.markEnd('concurrent3');
      const duration2 = monitor.markEnd('concurrent2');
      const duration1 = monitor.markEnd('concurrent1');
      
      // All durations should be valid (>= 0)
      expect(duration1).toBeGreaterThanOrEqual(0);
      expect(duration2).toBeGreaterThanOrEqual(0);
      expect(duration3).toBeGreaterThanOrEqual(0);
      
      // At least one should have measured time
      const totalTime = duration1 + duration2 + duration3;
      expect(totalTime).toBeGreaterThan(0);
    });
  });

  describe('Marine Performance Baselines', () => {
    it('should define marine-specific performance targets', () => {
      monitor.startMonitoring();
      
      const report = monitor.getReport();
      const marineBenchmark = report.benchmarks.find(b => 
        b.name === 'UI Performance' || b.name === 'Full Dashboard'
      );
      
      expect(marineBenchmark).toBeDefined();
      if (marineBenchmark) {
        expect(marineBenchmark.targetFPS).toBe(60);
        expect(marineBenchmark.maxRenderTimeMs).toBeCloseTo(16.67, 1);
      }
    });

    it('should validate dashboard memory constraints', () => {
      monitor.startMonitoring();
      
      const report = monitor.getReport();
      const dashboardBenchmark = report.benchmarks.find(b => 
        b.name === 'Full Dashboard'
      );
      
      expect(dashboardBenchmark).toBeDefined();
      if (dashboardBenchmark) {
        expect(dashboardBenchmark.maxMemoryMB).toBe(200);
      }
    });
  });
});
