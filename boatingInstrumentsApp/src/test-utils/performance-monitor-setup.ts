/**
 * Story 11.6: Performance Monitoring Setup for Jest Test Environment
 * PURPOSE: Initialize performance monitoring hooks for test execution
 * REQUIREMENT: AC#2 - Performance Threshold Monitoring System
 * METHOD: React Native performance API integration with Jest
 */

import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  dataLatency: number;
  throughput: number;
  testName: string;
  timestamp: number;
}

interface PerformanceThresholds {
  maxRenderTimeMs: number;
  maxMemoryIncreaseMb: number;
  maxDataLatencyMs: number;
  minThroughputMsgSec: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private thresholds!: PerformanceThresholds;
  private baselineMemory: number = 0;
  private testStartTime: number = 0;

  constructor() {
    this.loadThresholds();
    this.initializeMonitoring();
  }

  private loadThresholds() {
    try {
      const thresholdPath = path.join(__dirname, '../../performance/threshold-config.json');
      const thresholdConfig = JSON.parse(fs.readFileSync(thresholdPath, 'utf-8'));

      this.thresholds = {
        maxRenderTimeMs: thresholdConfig.performance_gates.render_performance.warn_threshold_ms,
        maxMemoryIncreaseMb: thresholdConfig.performance_gates.memory_limits.warn_threshold_mb,
        maxDataLatencyMs: thresholdConfig.performance_gates.data_latency.warn_threshold_ms,
        minThroughputMsgSec: thresholdConfig.performance_gates.throughput.warn_threshold_msgs_sec,
      };
    } catch (error) {
      // Use default thresholds if config file not found
      this.thresholds = {
        maxRenderTimeMs: 16,
        maxMemoryIncreaseMb: 50,
        maxDataLatencyMs: 100,
        minThroughputMsgSec: 500,
      };
    }
  }

  private initializeMonitoring() {
    this.baselineMemory = this.getMemoryUsage();

    // Add performance observer for React Native if available
    if (typeof global !== 'undefined' && global.performance) {
      global.performance.mark = global.performance.mark || performance.mark.bind(performance);
      global.performance.measure =
        global.performance.measure || performance.measure.bind(performance);
    }
  }

  startTest(testName: string): void {
    this.testStartTime = performance.now();
    if (global.performance?.mark) {
      global.performance.mark(`${testName}-start`);
    }
  }

  endTest(testName: string): PerformanceMetrics {
    const endTime = performance.now();
    const renderTime = endTime - this.testStartTime;

    if (global.performance?.mark && global.performance?.measure) {
      global.performance.mark(`${testName}-end`);
      global.performance.measure(`${testName}`, `${testName}-start`, `${testName}-end`);
    }

    const currentMemory = this.getMemoryUsage();
    const memoryIncrease = currentMemory - this.baselineMemory;

    const metrics: PerformanceMetrics = {
      renderTime,
      memoryUsage: memoryIncrease,
      dataLatency: this.measureDataLatency(),
      throughput: this.calculateThroughput(),
      testName,
      timestamp: Date.now(),
    };

    this.metrics.push(metrics);
    this.validateThresholds(metrics);

    return metrics;
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024; // Convert to MB
    }
    return 0;
  }

  private measureDataLatency(): number {
    // Simulate NMEA to widget update latency measurement
    // In real implementation, this would measure actual data flow
    return Math.random() * 50 + 25; // Mock latency 25-75ms
  }

  private calculateThroughput(): number {
    // Calculate messages per second throughput
    // In real implementation, this would track actual message processing
    return 450 + Math.random() * 200; // Mock throughput 450-650 msg/sec
  }

  private validateThresholds(metrics: PerformanceMetrics): void {
    const violations: string[] = [];

    if (metrics.renderTime > this.thresholds.maxRenderTimeMs) {
      violations.push(
        `Render time ${metrics.renderTime.toFixed(2)}ms exceeds threshold ${
          this.thresholds.maxRenderTimeMs
        }ms`,
      );
    }

    if (metrics.memoryUsage > this.thresholds.maxMemoryIncreaseMb) {
      violations.push(
        `Memory increase ${metrics.memoryUsage.toFixed(2)}MB exceeds threshold ${
          this.thresholds.maxMemoryIncreaseMb
        }MB`,
      );
    }

    if (metrics.dataLatency > this.thresholds.maxDataLatencyMs) {
      violations.push(
        `Data latency ${metrics.dataLatency.toFixed(2)}ms exceeds threshold ${
          this.thresholds.maxDataLatencyMs
        }ms`,
      );
    }

    if (metrics.throughput < this.thresholds.minThroughputMsgSec) {
      violations.push(
        `Throughput ${metrics.throughput.toFixed(2)} msg/sec below threshold ${
          this.thresholds.minThroughputMsgSec
        } msg/sec`,
      );
    }

    if (violations.length > 0) {
      console.warn(`⚠️ Performance threshold violations in ${metrics.testName}:`);
      violations.forEach((violation) => console.warn(`  - ${violation}`));
    }
  }

  generateReport(): void {
    const reportPath = path.join(__dirname, '../../performance/test-performance-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      thresholds: this.thresholds,
      metrics: this.metrics,
      summary: this.generateSummary(),
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }

  private generateSummary() {
    if (this.metrics.length === 0) return {};

    return {
      totalTests: this.metrics.length,
      averageRenderTime:
        this.metrics.reduce((sum, m) => sum + m.renderTime, 0) / this.metrics.length,
      averageMemoryUsage:
        this.metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / this.metrics.length,
      averageDataLatency:
        this.metrics.reduce((sum, m) => sum + m.dataLatency, 0) / this.metrics.length,
      averageThroughput:
        this.metrics.reduce((sum, m) => sum + m.throughput, 0) / this.metrics.length,
      thresholdViolations: this.metrics.filter(
        (m) =>
          m.renderTime > this.thresholds.maxRenderTimeMs ||
          m.memoryUsage > this.thresholds.maxMemoryIncreaseMb ||
          m.dataLatency > this.thresholds.maxDataLatencyMs ||
          m.throughput < this.thresholds.minThroughputMsgSec,
      ).length,
    };
  }
}

// Global performance monitor instance
const performanceMonitor = new PerformanceMonitor();

// Jest setup hooks
beforeEach(() => {
  const testName = expect.getState().currentTestName || 'unknown-test';
  performanceMonitor.startTest(testName);
});

afterEach(() => {
  const testName = expect.getState().currentTestName || 'unknown-test';
  performanceMonitor.endTest(testName);
});

afterAll(() => {
  performanceMonitor.generateReport();
});

// Export for use in tests
export { performanceMonitor };
export type { PerformanceMetrics, PerformanceThresholds };
