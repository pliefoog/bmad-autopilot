/**
 * Performance Regression Testing
 * 
 * Automated performance regression detection and reporting:
 * - Baseline performance capture
 * - Regression detection with configurable thresholds
 * - Historical performance tracking
 * - CI/CD integration support
 * 
 * Story 4.5 AC1-5: Create automated performance regression testing
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { performanceMonitor, PerformanceReport } from './PerformanceMonitor';
import { getPlatformBenchmarks } from './PlatformBenchmarks';

export interface PerformanceBaseline {
  timestamp: Date;
  version: string;
  platform: string;
  deviceClass: string;
  metrics: {
    averageFPS: number;
    peakMemoryMB: number;
    averageRenderTimeMs: number;
  };
  report: PerformanceReport;
}

export interface RegressionResult {
  hasRegression: boolean;
  regressions: RegressionDetail[];
  improvements: RegressionDetail[];
  baseline: PerformanceBaseline | null;
  current: PerformanceReport;
  comparisonSummary: string;
}

export interface RegressionDetail {
  metric: string;
  baselineValue: number;
  currentValue: number;
  percentChange: number;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  threshold: number;
}

/**
 * Performance Regression Detector
 * Compares current performance against baseline
 */
export class PerformanceRegressionDetector {
  private static readonly STORAGE_KEY = '@performance_baseline';
  private static readonly HISTORY_KEY = '@performance_history';
  private static readonly MAX_HISTORY_ENTRIES = 50;
  
  // Regression thresholds (percentage degradation)
  private static readonly THRESHOLDS = {
    fps: {
      minor: 5,      // 5% FPS drop
      moderate: 10,  // 10% FPS drop
      major: 20,     // 20% FPS drop
      critical: 30,  // 30% FPS drop
    },
    memory: {
      minor: 10,     // 10% memory increase
      moderate: 20,  // 20% memory increase
      major: 40,     // 40% memory increase
      critical: 60,  // 60% memory increase
    },
    renderTime: {
      minor: 15,     // 15% slower render
      moderate: 30,  // 30% slower render
      major: 50,     // 50% slower render
      critical: 100, // 100% slower render (2x)
    },
  };
  
  /**
   * Capture current performance as baseline
   */
  public static async captureBaseline(version: string): Promise<PerformanceBaseline> {
    // Get current performance report
    const report = performanceMonitor.getReport();
    
    const baseline: PerformanceBaseline = {
      timestamp: new Date(),
      version,
      platform: require('react-native').Platform.OS,
      deviceClass: 'mid-range', // Would be detected in production
      metrics: {
        averageFPS: report.metrics.averageFPS,
        peakMemoryMB: report.metrics.peakMemoryMB,
        averageRenderTimeMs: report.metrics.renderTime,
      },
      report,
    };
    
    // Save baseline
    await AsyncStorage.setItem(
      this.STORAGE_KEY,
      JSON.stringify(baseline)
    );
    
    // Add to history
    await this.addToHistory(baseline);
    
    console.log('[RegressionDetector] Baseline captured:', version);
    return baseline;
  }
  
  /**
   * Get stored baseline
   */
  public static async getBaseline(): Promise<PerformanceBaseline | null> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;
      
      const baseline = JSON.parse(stored);
      // Restore Date objects
      baseline.timestamp = new Date(baseline.timestamp);
      baseline.report.timestamp = new Date(baseline.report.timestamp);
      
      return baseline;
    } catch (error) {
      console.error('[RegressionDetector] Failed to load baseline:', error);
      return null;
    }
  }
  
  /**
   * Compare current performance against baseline
   */
  public static async detectRegression(): Promise<RegressionResult> {
    const baseline = await this.getBaseline();
    const current = performanceMonitor.getReport();
    
    if (!baseline) {
      return {
        hasRegression: false,
        regressions: [],
        improvements: [],
        baseline: null,
        current,
        comparisonSummary: 'No baseline available for comparison',
      };
    }
    
    const regressions: RegressionDetail[] = [];
    const improvements: RegressionDetail[] = [];
    
    // Compare FPS
    const fpsChange = this.calculatePercentChange(
      baseline.metrics.averageFPS,
      current.metrics.averageFPS
    );
    
    if (fpsChange < 0) {
      // FPS decreased (negative is bad)
      const detail: RegressionDetail = {
        metric: 'Average FPS',
        baselineValue: baseline.metrics.averageFPS,
        currentValue: current.metrics.averageFPS,
        percentChange: fpsChange,
        severity: this.calculateSeverity(Math.abs(fpsChange), this.THRESHOLDS.fps),
        threshold: this.THRESHOLDS.fps.minor,
      };
      regressions.push(detail);
    } else if (fpsChange > 5) {
      // Significant FPS improvement
      improvements.push({
        metric: 'Average FPS',
        baselineValue: baseline.metrics.averageFPS,
        currentValue: current.metrics.averageFPS,
        percentChange: fpsChange,
        severity: 'minor',
        threshold: 5,
      });
    }
    
    // Compare Memory
    const memoryChange = this.calculatePercentChange(
      baseline.metrics.peakMemoryMB,
      current.metrics.peakMemoryMB
    );
    
    if (memoryChange > 0) {
      // Memory increased (positive is bad)
      const detail: RegressionDetail = {
        metric: 'Peak Memory',
        baselineValue: baseline.metrics.peakMemoryMB,
        currentValue: current.metrics.peakMemoryMB,
        percentChange: memoryChange,
        severity: this.calculateSeverity(memoryChange, this.THRESHOLDS.memory),
        threshold: this.THRESHOLDS.memory.minor,
      };
      regressions.push(detail);
    } else if (memoryChange < -10) {
      // Significant memory improvement
      improvements.push({
        metric: 'Peak Memory',
        baselineValue: baseline.metrics.peakMemoryMB,
        currentValue: current.metrics.peakMemoryMB,
        percentChange: memoryChange,
        severity: 'minor',
        threshold: 10,
      });
    }
    
    // Compare Render Time
    const renderChange = this.calculatePercentChange(
      baseline.metrics.averageRenderTimeMs,
      current.metrics.renderTime
    );
    
    if (renderChange > 0) {
      // Render time increased (positive is bad)
      const detail: RegressionDetail = {
        metric: 'Average Render Time',
        baselineValue: baseline.metrics.averageRenderTimeMs,
        currentValue: current.metrics.renderTime,
        percentChange: renderChange,
        severity: this.calculateSeverity(renderChange, this.THRESHOLDS.renderTime),
        threshold: this.THRESHOLDS.renderTime.minor,
      };
      regressions.push(detail);
    } else if (renderChange < -15) {
      // Significant render time improvement
      improvements.push({
        metric: 'Average Render Time',
        baselineValue: baseline.metrics.averageRenderTimeMs,
        currentValue: current.metrics.renderTime,
        percentChange: renderChange,
        severity: 'minor',
        threshold: 15,
      });
    }
    
    // Generate summary
    const summary = this.generateSummary(baseline, current, regressions, improvements);
    
    return {
      hasRegression: regressions.length > 0,
      regressions,
      improvements,
      baseline,
      current,
      comparisonSummary: summary,
    };
  }
  
  /**
   * Calculate percentage change
   */
  private static calculatePercentChange(baseline: number, current: number): number {
    if (baseline === 0) return 0;
    return ((current - baseline) / baseline) * 100;
  }
  
  /**
   * Calculate regression severity
   */
  private static calculateSeverity(
    percentChange: number,
    thresholds: { minor: number; moderate: number; major: number; critical: number }
  ): 'minor' | 'moderate' | 'major' | 'critical' {
    if (percentChange >= thresholds.critical) return 'critical';
    if (percentChange >= thresholds.major) return 'major';
    if (percentChange >= thresholds.moderate) return 'moderate';
    return 'minor';
  }
  
  /**
   * Generate comparison summary
   */
  private static generateSummary(
    baseline: PerformanceBaseline,
    current: PerformanceReport,
    regressions: RegressionDetail[],
    improvements: RegressionDetail[]
  ): string {
    const lines: string[] = [];
    
    lines.push(`Performance Comparison vs Baseline (${baseline.version})`);
    lines.push('');
    
    if (regressions.length > 0) {
      lines.push('⚠️ REGRESSIONS DETECTED:');
      regressions.forEach(r => {
        lines.push(
          `  ${r.metric}: ${r.baselineValue.toFixed(2)} → ${r.currentValue.toFixed(2)} ` +
          `(${r.percentChange > 0 ? '+' : ''}${r.percentChange.toFixed(1)}%) [${r.severity.toUpperCase()}]`
        );
      });
      lines.push('');
    }
    
    if (improvements.length > 0) {
      lines.push('✅ IMPROVEMENTS:');
      improvements.forEach(i => {
        lines.push(
          `  ${i.metric}: ${i.baselineValue.toFixed(2)} → ${i.currentValue.toFixed(2)} ` +
          `(${i.percentChange > 0 ? '+' : ''}${i.percentChange.toFixed(1)}%)`
        );
      });
      lines.push('');
    }
    
    if (regressions.length === 0 && improvements.length === 0) {
      lines.push('✓ Performance stable (no significant changes)');
    }
    
    return lines.join('\n');
  }
  
  /**
   * Add baseline to history
   */
  private static async addToHistory(baseline: PerformanceBaseline): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.HISTORY_KEY);
      let history: PerformanceBaseline[] = stored ? JSON.parse(stored) : [];
      
      history.push(baseline);
      
      // Keep only last N entries
      if (history.length > this.MAX_HISTORY_ENTRIES) {
        history = history.slice(-this.MAX_HISTORY_ENTRIES);
      }
      
      await AsyncStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('[RegressionDetector] Failed to save history:', error);
    }
  }
  
  /**
   * Get performance history
   */
  public static async getHistory(): Promise<PerformanceBaseline[]> {
    try {
      const stored = await AsyncStorage.getItem(this.HISTORY_KEY);
      if (!stored) return [];
      
      const history = JSON.parse(stored);
      // Restore Date objects
      return history.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
        report: {
          ...entry.report,
          timestamp: new Date(entry.report.timestamp),
        },
      }));
    } catch (error) {
      console.error('[RegressionDetector] Failed to load history:', error);
      return [];
    }
  }
  
  /**
   * Clear all performance data
   */
  public static async clearData(): Promise<void> {
    await AsyncStorage.removeItem(this.STORAGE_KEY);
    await AsyncStorage.removeItem(this.HISTORY_KEY);
    console.log('[RegressionDetector] Performance data cleared');
  }
  
  /**
   * Export performance data for CI/CD
   */
  public static async exportForCI(): Promise<string> {
    const baseline = await this.getBaseline();
    const current = performanceMonitor.getReport();
    const regression = await this.detectRegression();
    
    const ciReport = {
      timestamp: new Date().toISOString(),
      baseline: baseline ? {
        version: baseline.version,
        fps: baseline.metrics.averageFPS,
        memory: baseline.metrics.peakMemoryMB,
        renderTime: baseline.metrics.averageRenderTimeMs,
      } : null,
      current: {
        fps: current.metrics.averageFPS,
        memory: current.metrics.peakMemoryMB,
        renderTime: current.metrics.renderTime,
        score: current.score,
      },
      hasRegression: regression.hasRegression,
      regressions: regression.regressions,
      benchmarks: getPlatformBenchmarks(),
    };
    
    return JSON.stringify(ciReport, null, 2);
  }
}
