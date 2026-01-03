/**
 * v2.3 Baseline Performance Test
 * Captures performance metrics using the built-in PerformanceMonitor
 */

import { PerformanceMonitor } from '../src/services/performance/PerformanceMonitor';
import { PerformanceRegressionDetector } from '../src/services/performance/PerformanceRegressionDetector';

async function captureV23Baseline() {
  console.log('📊 Starting v2.3 Performance Baseline Capture...');

  // Get monitor instance
  const monitor = PerformanceMonitor.getInstance();

  // Start monitoring
  console.log('🔄 Starting performance monitoring...');
  monitor.startMonitoring();

  // Wait for initial metrics to stabilize
  console.log('⏳ Waiting for metrics to stabilize (10 seconds)...');
  await new Promise((resolve) => setTimeout(resolve, 10000));

  // Get current performance metrics
  const metrics = monitor.getMetrics();
  console.log('📈 Current Performance Metrics:');
  console.log(`  FPS: ${metrics.fps.toFixed(1)}`);
  console.log(`  Memory: ${metrics.memoryUsageMB.toFixed(1)} MB`);
  console.log(`  Render Time: ${metrics.renderTime.toFixed(2)} ms`);
  console.log(`  Average FPS: ${metrics.averageFPS.toFixed(1)}`);
  console.log(`  Peak Memory: ${metrics.peakMemoryMB.toFixed(1)} MB`);

  // Generate performance report
  const report = monitor.getReport();
  console.log('\n📋 Performance Report:');
  console.log(`  Performance Score: ${report.score.toFixed(1)}/100`);
  console.log(`  Violations: ${report.violations.length}`);

  if (report.violations.length > 0) {
    console.log('\n⚠️  Performance Violations:');
    report.violations.forEach((violation) => {
      console.log(
        `    ${violation.metric}: ${violation.actual} (expected: ${violation.expected}) - ${violation.severity}`,
      );
    });
  }

  // Capture baseline for regression detection
  try {
    console.log('\n💾 Capturing baseline for regression detection...');
    const baseline = await PerformanceRegressionDetector.captureBaseline('v2.3.0');
    console.log(`✅ Baseline captured successfully at ${baseline.timestamp}`);

    // Display baseline summary
    console.log('\n📊 Baseline Summary:');
    console.log(`  Platform: ${baseline.platform}`);
    console.log(`  Device Class: ${baseline.deviceClass}`);
    console.log(`  Average FPS: ${baseline.metrics.averageFPS.toFixed(1)}`);
    console.log(`  Peak Memory: ${baseline.metrics.peakMemoryMB.toFixed(1)} MB`);
    console.log(`  Average Render Time: ${baseline.metrics.averageRenderTimeMs.toFixed(2)} ms`);
  } catch (error) {
    console.error('❌ Failed to capture baseline:', error.message);
  }

  // Stop monitoring
  monitor.stopMonitoring();

  console.log('\n✅ v2.3 Baseline Performance Capture Complete!');
  console.log('📂 Results saved for regression detection in future versions.');

  return {
    metrics,
    report,
    timestamp: new Date().toISOString(),
  };
}

// Export for use in tests or as standalone script
if (require.main === module) {
  captureV23Baseline()
    .then(() => {
      console.log('🎉 Baseline capture finished successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Baseline capture failed:', error);
      process.exit(1);
    });
}

module.exports = { captureV23Baseline };
