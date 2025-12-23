/**
 * Performance Monitoring Integration for VS Code Test Explorer
 *
 * PURPOSE: Integrate performance threshold monitoring with VS Code Test Explorer warnings
 * REQUIREMENT: AC-11.7.4 - Performance threshold violations with render, memory, and data latency monitoring
 * METHOD: PerformanceProfiler integration with real-time threshold validation and VS Code warnings
 * EXPECTED: Performance alerts in VS Code Test Explorer for >16ms renders, >50MB memory, >100ms latency
 *
 * Integration with Epic 11 Professional-Grade Testing Architecture:
 * - Story 11.1: Triple Testing Strategy Implementation (PerformanceProfiler)
 * - Story 11.7: VS Code Test Explorer Integration
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Import existing PerformanceProfiler from Story 11.1
let PerformanceProfiler;
try {
  const profilerModule = require('../helpers/testHelpers');
  PerformanceProfiler = profilerModule.PerformanceProfiler;
} catch (error) {
  console.warn('PerformanceProfiler not available, using fallback implementation');
}

class PerformanceMonitoringIntegration {
  constructor(globalConfig, options = {}) {
    this.globalConfig = globalConfig;
    this.options = options;
    this.profiler = PerformanceProfiler ? new PerformanceProfiler() : null;

    // AC4.1: Performance threshold definitions for marine applications
    this.thresholds = {
      render: {
        max: 16, // <16ms for 60fps requirement
        unit: 'ms',
        category: 'UI Responsiveness',
        severity: 'critical',
      },
      memory: {
        max: 50, // <50MB increase per test operation
        unit: 'MB',
        category: 'Memory Management',
        severity: 'high',
      },
      dataLatency: {
        max: 100, // <100ms NMEA sentence → widget update
        unit: 'ms',
        category: 'Data Processing',
        severity: 'critical',
      },
      testExecution: {
        unit: 50, // <50ms per unit test
        integration: 2000, // <2000ms per integration test
        e2e: 30000, // <30s per E2E test
      },
    };

    this.performanceViolations = [];
    this.performanceMetrics = {
      renderTimes: [],
      memoryUsage: [],
      dataLatency: [],
      testExecutionTimes: new Map(),
    };

    this.isMonitoring = false;
    this.memoryBaseline = null;
    this.testStartMemory = null;
  }

  /**
   * AC4.2: Initialize performance monitoring for VS Code Test Explorer
   */
  initializePerformanceMonitoring() {
    console.log('⚡ Initializing performance monitoring for VS Code Test Explorer...');

    this.isMonitoring = true;
    this.memoryBaseline = this.getCurrentMemoryUsage();

    // Start monitoring intervals
    this.startRenderPerformanceMonitoring();
    this.startMemoryMonitoring();

    console.log('⚡ Performance monitoring active with marine application thresholds');
  }

  /**
   * AC4.3: Monitor render performance with <16ms threshold for 60fps
   */
  startRenderPerformanceMonitoring() {
    // Hook into React Native's render cycle if available
    if (typeof global !== 'undefined' && global.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const originalOnCommitFiberRoot = global.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot;

      global.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = (...args) => {
        const renderStart = performance.now();

        if (originalOnCommitFiberRoot) {
          originalOnCommitFiberRoot.apply(this, args);
        }

        const renderTime = performance.now() - renderStart;
        this.recordRenderPerformance(renderTime);

        return args;
      };
    }

    // Alternative: Monitor test-specific render operations
    this.monitorTestRenderOperations();
  }

  /**
   * AC4.4: Monitor test-specific render operations
   */
  monitorTestRenderOperations() {
    // Patch common testing library render functions
    if (typeof require !== 'undefined') {
      try {
        const TestingLibrary = require('@testing-library/react-native');
        if (TestingLibrary.render) {
          const originalRender = TestingLibrary.render;

          TestingLibrary.render = (...args) => {
            const renderStart = performance.now();
            const result = originalRender.apply(this, args);
            const renderTime = performance.now() - renderStart;

            this.recordRenderPerformance(renderTime, 'test-render');
            return result;
          };
        }
      } catch (error) {
        // Testing library not available in this context
      }
    }
  }

  /**
   * AC4.5: Record render performance and check thresholds
   */
  recordRenderPerformance(renderTime, context = 'render') {
    this.performanceMetrics.renderTimes.push({
      time: renderTime,
      timestamp: Date.now(),
      context,
    });

    // AC4.6: Check render performance threshold (>16ms violation)
    if (renderTime > this.thresholds.render.max) {
      const violation = {
        type: 'render',
        category: this.thresholds.render.category,
        severity: this.thresholds.render.severity,
        actual: renderTime,
        threshold: this.thresholds.render.max,
        unit: this.thresholds.render.unit,
        timestamp: new Date().toISOString(),
        context,
        message: `Render time ${renderTime.toFixed(2)}ms exceeds 60fps threshold (${
          this.thresholds.render.max
        }ms)`,
      };

      this.performanceViolations.push(violation);
      this.reportViolationToVSCode(violation);
    }
  }

  /**
   * AC4.7: Start memory usage monitoring with <50MB threshold
   */
  startMemoryMonitoring() {
    // Monitor memory at regular intervals during test execution
    this.memoryMonitoringInterval = setInterval(() => {
      if (this.isMonitoring) {
        this.checkMemoryUsage();
      }
    }, 1000); // Check every second
  }

  /**
   * AC4.8: Check memory usage and detect violations
   */
  checkMemoryUsage() {
    const currentMemory = this.getCurrentMemoryUsage();

    if (this.testStartMemory) {
      const memoryIncrease = currentMemory.heapUsed - this.testStartMemory.heapUsed;

      this.performanceMetrics.memoryUsage.push({
        current: currentMemory,
        increase: memoryIncrease,
        timestamp: Date.now(),
      });

      // AC4.9: Check memory threshold violation (>50MB increase)
      if (memoryIncrease > this.thresholds.memory.max) {
        const violation = {
          type: 'memory',
          category: this.thresholds.memory.category,
          severity: this.thresholds.memory.severity,
          actual: memoryIncrease,
          threshold: this.thresholds.memory.max,
          unit: this.thresholds.memory.unit,
          timestamp: new Date().toISOString(),
          details: {
            baseline: this.testStartMemory.heapUsed,
            current: currentMemory.heapUsed,
            total: currentMemory.heapTotal,
          },
          message: `Memory increase ${memoryIncrease.toFixed(2)}MB exceeds threshold (${
            this.thresholds.memory.max
          }MB)`,
        };

        this.performanceViolations.push(violation);
        this.reportViolationToVSCode(violation);
      }
    }
  }

  /**
   * AC4.10: Monitor data latency for NMEA sentence → widget update validation
   */
  recordDataLatency(nmeaSentenceTime, widgetUpdateTime, context = 'nmea-widget-update') {
    const latency = widgetUpdateTime - nmeaSentenceTime;

    this.performanceMetrics.dataLatency.push({
      latency,
      nmeaSentenceTime,
      widgetUpdateTime,
      timestamp: Date.now(),
      context,
    });

    // AC4.11: Check data latency threshold violation (>100ms)
    if (latency > this.thresholds.dataLatency.max) {
      const violation = {
        type: 'dataLatency',
        category: this.thresholds.dataLatency.category,
        severity: this.thresholds.dataLatency.severity,
        actual: latency,
        threshold: this.thresholds.dataLatency.max,
        unit: this.thresholds.dataLatency.unit,
        timestamp: new Date().toISOString(),
        context,
        details: {
          nmeaSentenceTime,
          widgetUpdateTime,
        },
        message: `Data latency ${latency.toFixed(2)}ms exceeds marine safety threshold (${
          this.thresholds.dataLatency.max
        }ms)`,
      };

      this.performanceViolations.push(violation);
      this.reportViolationToVSCode(violation);
    }
  }

  /**
   * AC4.12: Monitor test execution timing with tier-specific thresholds
   */
  recordTestExecutionTime(testPath, testName, executionTime, tier = 'unit') {
    const testKey = `${testPath}:${testName}`;

    if (!this.performanceMetrics.testExecutionTimes.has(testKey)) {
      this.performanceMetrics.testExecutionTimes.set(testKey, []);
    }

    this.performanceMetrics.testExecutionTimes.get(testKey).push({
      executionTime,
      tier,
      timestamp: Date.now(),
    });

    // AC4.13: Check test execution threshold based on tier
    let threshold;
    switch (tier) {
      case 'unit':
        threshold = this.thresholds.testExecution.unit;
        break;
      case 'integration':
        threshold = this.thresholds.testExecution.integration;
        break;
      case 'e2e':
        threshold = this.thresholds.testExecution.e2e;
        break;
      default:
        threshold = this.thresholds.testExecution.unit;
    }

    if (executionTime > threshold) {
      const violation = {
        type: 'testExecution',
        category: 'Test Performance',
        severity: tier === 'e2e' ? 'medium' : 'high',
        actual: executionTime,
        threshold,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        testPath,
        testName,
        tier,
        message: `${tier} test execution ${executionTime.toFixed(
          2,
        )}ms exceeds threshold (${threshold}ms)`,
      };

      this.performanceViolations.push(violation);
      this.reportViolationToVSCode(violation);
    }
  }

  /**
   * AC4.14: Report performance violation to VS Code Test Explorer
   */
  async reportViolationToVSCode(violation) {
    try {
      // Generate warning for VS Code Test Explorer
      const warning = {
        source: 'PerformanceMonitor',
        severity: violation.severity,
        type: violation.type,
        message: violation.message,
        details: violation,
        timestamp: violation.timestamp,
        recommendations: this.generatePerformanceRecommendations(violation),
      };

      // Save to VS Code-accessible location
      await this.savePerformanceWarning(warning);

      // Log to console for immediate visibility
      const severityIcon = this.getSeverityIcon(violation.severity);
      console.warn(`${severityIcon} Performance Alert: ${violation.message}`);
    } catch (error) {
      console.error('Failed to report performance violation to VS Code:', error);
    }
  }

  /**
   * AC4.15: Generate performance recommendations based on violation type
   */
  generatePerformanceRecommendations(violation) {
    const recommendations = [];

    switch (violation.type) {
      case 'render':
        recommendations.push(
          'Consider using React.memo() for component optimization',
          'Check for unnecessary re-renders with React DevTools',
          'Implement virtualization for large lists',
          'Optimize marine widget rendering with useMemo/useCallback',
        );
        break;

      case 'memory':
        recommendations.push(
          'Check for memory leaks in NMEA data subscriptions',
          'Implement proper cleanup in useEffect hooks',
          'Consider object pooling for frequent allocations',
          'Monitor WebSocket connection cleanup',
        );
        break;

      case 'dataLatency':
        recommendations.push(
          'Optimize NMEA sentence parsing performance',
          'Check WebSocket message batching configuration',
          'Implement data throttling for high-frequency updates',
          'Review widget update debouncing strategy',
        );
        break;

      case 'testExecution':
        recommendations.push(
          'Check for synchronous operations in tests',
          'Optimize test setup and teardown procedures',
          'Consider test parallelization',
          'Review mock implementation performance',
        );
        break;
    }

    return recommendations;
  }

  /**
   * AC4.16: Save performance warning for VS Code Test Explorer
   */
  async savePerformanceWarning(warning) {
    const warningsFile = path.join(
      this.globalConfig.rootDir,
      'coverage',
      'performance-warnings.json',
    );

    let existingWarnings = [];
    try {
      const content = fs.readFileSync(warningsFile, 'utf8');
      existingWarnings = JSON.parse(content);
    } catch (error) {
      // File doesn't exist or is invalid, start fresh
    }

    existingWarnings.push(warning);

    // Keep only recent warnings (last 100)
    if (existingWarnings.length > 100) {
      existingWarnings = existingWarnings.slice(-100);
    }

    await this.ensureDirectoryExists(path.dirname(warningsFile));
    fs.writeFileSync(warningsFile, JSON.stringify(existingWarnings, null, 2));
  }

  /**
   * AC4.17: Get current memory usage
   */
  getCurrentMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        heapUsed: usage.heapUsed / 1024 / 1024, // Convert to MB
        heapTotal: usage.heapTotal / 1024 / 1024,
        external: usage.external / 1024 / 1024,
        rss: usage.rss / 1024 / 1024,
      };
    }

    // Fallback for environments without process.memoryUsage
    return {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0,
    };
  }

  /**
   * AC4.18: Get severity icon for console output
   */
  getSeverityIcon(severity) {
    const icons = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: '💡',
    };
    return icons[severity] || '📊';
  }

  /**
   * AC4.19: Generate performance summary for VS Code Test Explorer
   */
  async generatePerformanceSummary() {
    const summary = {
      metadata: {
        timestamp: new Date().toISOString(),
        monitoringDuration: this.isMonitoring ? Date.now() - this.monitoringStartTime : 0,
      },
      violations: {
        total: this.performanceViolations.length,
        byType: this.groupViolationsByType(),
        bySeverity: this.groupViolationsBySeverity(),
      },
      metrics: {
        render: this.summarizeRenderMetrics(),
        memory: this.summarizeMemoryMetrics(),
        dataLatency: this.summarizeDataLatencyMetrics(),
        testExecution: this.summarizeTestExecutionMetrics(),
      },
      thresholds: this.thresholds,
      recommendations: this.generateOverallRecommendations(),
    };

    const summaryPath = path.join(
      this.globalConfig.rootDir,
      'coverage',
      'performance-summary.json',
    );
    await this.ensureDirectoryExists(path.dirname(summaryPath));
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    return summary;
  }

  /**
   * Jest Reporter Interface: Called when test starts
   */
  onTestStart(test) {
    this.testStartMemory = this.getCurrentMemoryUsage();
    this.monitoringStartTime = Date.now();

    if (this.profiler) {
      this.profiler.start();
    }
  }

  /**
   * Jest Reporter Interface: Called when test completes
   */
  onTestResult(test, testResult, aggregatedResult) {
    const testDuration = testResult.perfStats
      ? testResult.perfStats.end - testResult.perfStats.start
      : 0;

    // Determine test tier from file path
    let tier = 'unit';
    if (test.path.includes('/tier2-integration/')) tier = 'integration';
    else if (test.path.includes('/tier3-e2e/')) tier = 'e2e';

    // Record test execution times
    testResult.assertionResults.forEach((assertion) => {
      if (assertion.duration) {
        this.recordTestExecutionTime(test.path, assertion.title, assertion.duration, tier);
      }
    });
  }

  /**
   * Jest Reporter Interface: Called when all tests complete
   */
  async onRunComplete(contexts, results) {
    this.isMonitoring = false;

    // Clear monitoring intervals
    if (this.memoryMonitoringInterval) {
      clearInterval(this.memoryMonitoringInterval);
    }

    // Generate final performance summary
    const summary = await this.generatePerformanceSummary();

    console.log('⚡ Performance Monitoring Summary:');
    console.log(`   Total Violations: ${summary.violations.total}`);
    console.log(`   Render Violations: ${summary.violations.byType.render || 0}`);
    console.log(`   Memory Violations: ${summary.violations.byType.memory || 0}`);
    console.log(`   Data Latency Violations: ${summary.violations.byType.dataLatency || 0}`);

    if (summary.violations.total > 0) {
      console.log('⚠️ Performance thresholds exceeded - check coverage/performance-warnings.json');
    } else {
      console.log('✅ All performance thresholds met');
    }
  }

  /**
   * Utility methods for summarizing metrics
   */
  groupViolationsByType() {
    return this.performanceViolations.reduce((acc, violation) => {
      acc[violation.type] = (acc[violation.type] || 0) + 1;
      return acc;
    }, {});
  }

  groupViolationsBySeverity() {
    return this.performanceViolations.reduce((acc, violation) => {
      acc[violation.severity] = (acc[violation.severity] || 0) + 1;
      return acc;
    }, {});
  }

  summarizeRenderMetrics() {
    if (this.performanceMetrics.renderTimes.length === 0) return null;

    const times = this.performanceMetrics.renderTimes.map((r) => r.time);
    return {
      count: times.length,
      avg: times.reduce((a, b) => a + b) / times.length,
      max: Math.max(...times),
      min: Math.min(...times),
      violations: times.filter((t) => t > this.thresholds.render.max).length,
    };
  }

  summarizeMemoryMetrics() {
    if (this.performanceMetrics.memoryUsage.length === 0) return null;

    const increases = this.performanceMetrics.memoryUsage.map((m) => m.increase);
    return {
      count: increases.length,
      avgIncrease: increases.reduce((a, b) => a + b) / increases.length,
      maxIncrease: Math.max(...increases),
      violations: increases.filter((i) => i > this.thresholds.memory.max).length,
    };
  }

  summarizeDataLatencyMetrics() {
    if (this.performanceMetrics.dataLatency.length === 0) return null;

    const latencies = this.performanceMetrics.dataLatency.map((d) => d.latency);
    return {
      count: latencies.length,
      avg: latencies.reduce((a, b) => a + b) / latencies.length,
      max: Math.max(...latencies),
      min: Math.min(...latencies),
      violations: latencies.filter((l) => l > this.thresholds.dataLatency.max).length,
    };
  }

  summarizeTestExecutionMetrics() {
    const allExecutions = [];
    this.performanceMetrics.testExecutionTimes.forEach((executions) => {
      allExecutions.push(...executions);
    });

    if (allExecutions.length === 0) return null;

    const times = allExecutions.map((e) => e.executionTime);
    return {
      count: times.length,
      avg: times.reduce((a, b) => a + b) / times.length,
      max: Math.max(...times),
      byTier: {
        unit: allExecutions.filter((e) => e.tier === 'unit').length,
        integration: allExecutions.filter((e) => e.tier === 'integration').length,
        e2e: allExecutions.filter((e) => e.tier === 'e2e').length,
      },
    };
  }

  generateOverallRecommendations() {
    const recommendations = [];

    if (this.performanceViolations.length > 0) {
      recommendations.push('Review performance violations in coverage/performance-warnings.json');
    }

    const renderViolations = this.performanceViolations.filter((v) => v.type === 'render').length;
    if (renderViolations > 0) {
      recommendations.push('Focus on marine widget rendering optimization for 60fps target');
    }

    const memoryViolations = this.performanceViolations.filter((v) => v.type === 'memory').length;
    if (memoryViolations > 0) {
      recommendations.push('Investigate NMEA data processing memory usage');
    }

    return recommendations;
  }

  /**
   * Utility: Ensure directory exists
   */
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.promises.access(dirPath);
    } catch {
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
  }
}

module.exports = PerformanceMonitoringIntegration;
