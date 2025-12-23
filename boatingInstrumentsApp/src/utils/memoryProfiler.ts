/**
 * Memory Profiling Utility
 *
 * Tracks memory usage over time and detects leaks in the browser environment.
 * Uses performance.memory API (Chrome/Edge only) and manual heap snapshots.
 */

export interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number; // Bytes
  totalJSHeapSize: number; // Bytes
  jsHeapSizeLimit: number; // Bytes
  usedMB: number;
  totalMB: number;
  limitMB: number;
  percentUsed: number;
}

export interface MemoryStats {
  startTime: number;
  duration: number; // seconds
  snapshots: MemorySnapshot[];
  averageUsedMB: number;
  peakUsedMB: number;
  minUsedMB: number;
  growthRate: number; // MB per minute
  totalGrowth: number; // MB
  leakDetected: boolean;
  leakSeverity: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

class MemoryProfiler {
  private snapshots: MemorySnapshot[] = [];
  private startTime: number = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  /**
   * Check if memory profiling is available
   */
  isAvailable(): boolean {
    return (
      typeof window !== 'undefined' &&
      'performance' in window &&
      'memory' in (window.performance as any)
    );
  }

  /**
   * Start memory profiling
   */
  start(intervalMs: number = 1000): boolean {
    if (!this.isAvailable()) {
      console.warn('[MemoryProfiler] Performance memory API not available (Chrome/Edge only)');
      return false;
    }

    if (this.isRunning) {
      console.warn('[MemoryProfiler] Already running');
      return false;
    }

    this.snapshots = [];
    this.startTime = Date.now();
    this.isRunning = true;

    // Take initial snapshot
    this.takeSnapshot();

    // Set up interval
    this.intervalId = setInterval(() => {
      this.takeSnapshot();
    }, intervalMs);

    return true;
  }

  /**
   * Stop memory profiling and return stats
   */
  stop(): MemoryStats | null {
    if (!this.isRunning) {
      console.warn('[MemoryProfiler] Not running');
      return null;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;

    // Take final snapshot
    this.takeSnapshot();

    const stats = this.calculateStats();

    return stats;
  }

  /**
   * Get current stats without stopping
   */
  getCurrentStats(): MemoryStats | null {
    if (!this.isRunning) {
      return null;
    }

    return this.calculateStats();
  }

  /**
   * Take a memory snapshot
   */
  private takeSnapshot(): void {
    if (!this.isAvailable()) return;

    const memory = (window.performance as any).memory;
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usedMB: memory.usedJSHeapSize / (1024 * 1024),
      totalMB: memory.totalJSHeapSize / (1024 * 1024),
      limitMB: memory.jsHeapSizeLimit / (1024 * 1024),
      percentUsed: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    };

    this.snapshots.push(snapshot);

    // Log if memory usage is high
    if (snapshot.percentUsed > 80) {
      console.warn(
        `[MemoryProfiler] High memory usage: ${snapshot.usedMB.toFixed(
          2,
        )}MB (${snapshot.percentUsed.toFixed(1)}%)`,
      );
    }
  }

  /**
   * Calculate statistics from snapshots
   */
  private calculateStats(): MemoryStats {
    if (this.snapshots.length === 0) {
      return {
        startTime: this.startTime,
        duration: 0,
        snapshots: [],
        averageUsedMB: 0,
        peakUsedMB: 0,
        minUsedMB: 0,
        growthRate: 0,
        totalGrowth: 0,
        leakDetected: false,
        leakSeverity: 'none',
      };
    }

    const usedMBValues = this.snapshots.map((s) => s.usedMB);
    const averageUsedMB = usedMBValues.reduce((a, b) => a + b, 0) / usedMBValues.length;
    const peakUsedMB = Math.max(...usedMBValues);
    const minUsedMB = Math.min(...usedMBValues);

    const firstSnapshot = this.snapshots[0];
    const lastSnapshot = this.snapshots[this.snapshots.length - 1];
    const durationSeconds = (lastSnapshot.timestamp - firstSnapshot.timestamp) / 1000;
    const durationMinutes = durationSeconds / 60;
    const totalGrowth = lastSnapshot.usedMB - firstSnapshot.usedMB;
    const growthRate = durationMinutes > 0 ? totalGrowth / durationMinutes : 0;

    // Leak detection heuristics
    const leakDetected = this.detectLeak(growthRate, totalGrowth, durationMinutes);
    const leakSeverity = this.assessLeakSeverity(growthRate, totalGrowth);

    return {
      startTime: this.startTime,
      duration: durationSeconds,
      snapshots: this.snapshots,
      averageUsedMB,
      peakUsedMB,
      minUsedMB,
      growthRate,
      totalGrowth,
      leakDetected,
      leakSeverity,
    };
  }

  /**
   * Detect if there's a memory leak based on growth patterns
   */
  private detectLeak(growthRate: number, totalGrowth: number, durationMinutes: number): boolean {
    // Consider it a leak if:
    // 1. Growing more than 2MB/min sustained
    // 2. Total growth > 50MB over 10+ minutes
    // 3. Growth rate > 5MB/min (severe)

    if (durationMinutes < 2) {
      return false; // Too early to tell
    }

    if (growthRate > 5) {
      return true; // Severe growth rate
    }

    if (growthRate > 2 && durationMinutes > 5) {
      return true; // Sustained moderate growth
    }

    if (totalGrowth > 50 && durationMinutes > 10) {
      return true; // Large total growth
    }

    return false;
  }

  /**
   * Assess severity of memory leak
   */
  private assessLeakSeverity(
    growthRate: number,
    totalGrowth: number,
  ): 'none' | 'low' | 'medium' | 'high' | 'critical' {
    if (growthRate > 10 || totalGrowth > 200) {
      return 'critical'; // > 10MB/min or > 200MB total
    }
    if (growthRate > 5 || totalGrowth > 100) {
      return 'high'; // > 5MB/min or > 100MB total
    }
    if (growthRate > 2 || totalGrowth > 50) {
      return 'medium'; // > 2MB/min or > 50MB total
    }
    if (growthRate > 1 || totalGrowth > 20) {
      return 'low'; // > 1MB/min or > 20MB total
    }
    return 'none';
  }

  /**
   * Format stats for console output
   */
  formatStats(stats: MemoryStats): string {
    const lines: string[] = [
      '═══════════════════════════════════════════════════',
      '           MEMORY PROFILING RESULTS',
      '═══════════════════════════════════════════════════',
      `Duration: ${(stats.duration / 60).toFixed(2)} minutes (${stats.snapshots.length} snapshots)`,
      '',
      '📊 Memory Usage:',
      `  Average: ${stats.averageUsedMB.toFixed(2)} MB`,
      `  Peak:    ${stats.peakUsedMB.toFixed(2)} MB`,
      `  Min:     ${stats.minUsedMB.toFixed(2)} MB`,
      '',
      '📈 Growth Analysis:',
      `  Total Growth: ${stats.totalGrowth > 0 ? '+' : ''}${stats.totalGrowth.toFixed(2)} MB`,
      `  Growth Rate:  ${stats.growthRate > 0 ? '+' : ''}${stats.growthRate.toFixed(2)} MB/min`,
      '',
      '🔍 Leak Detection:',
      `  Status:   ${stats.leakDetected ? '⚠️  LEAK DETECTED' : '✅ No leak detected'}`,
      `  Severity: ${stats.leakSeverity.toUpperCase()}`,
    ];

    if (stats.leakDetected) {
      lines.push('');
      lines.push('⚠️  RECOMMENDED ACTIONS:');
      if (stats.leakSeverity === 'critical' || stats.leakSeverity === 'high') {
        lines.push('  1. Check store subscriptions for cleanup');
        lines.push('  2. Verify history pruning is working');
        lines.push('  3. Look for unbounded arrays/maps');
        lines.push('  4. Check for event listener leaks');
      } else {
        lines.push('  1. Monitor for continued growth');
        lines.push('  2. Review recent code changes');
      }
    }

    lines.push('═══════════════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Export snapshots as CSV
   */
  exportCSV(stats: MemoryStats): string {
    const header = 'Timestamp,Elapsed(s),UsedMB,TotalMB,PercentUsed\n';
    const rows = stats.snapshots
      .map((s) => {
        const elapsed = (s.timestamp - stats.startTime) / 1000;
        return `${s.timestamp},${elapsed.toFixed(1)},${s.usedMB.toFixed(2)},${s.totalMB.toFixed(
          2,
        )},${s.percentUsed.toFixed(2)}`;
      })
      .join('\n');

    return header + rows;
  }
}

// Singleton instance
export const memoryProfiler = new MemoryProfiler();

// Also expose on window for easy access
if (typeof window !== 'undefined') {
  (window as any).__memoryProfiler = memoryProfiler;
}

// Console helper functions
if (typeof window !== 'undefined') {
  (window as any).startMemoryProfile = () => {
    memoryProfiler.start(1000);
  };

  (window as any).stopMemoryProfile = () => {
    const stats = memoryProfiler.stop();
    if (stats) {
      return stats;
    }
  };

  (window as any).getMemoryStats = () => {
    const stats = memoryProfiler.getCurrentStats();
    if (stats) {
      return stats;
    } else {
    }
  };

  (window as any).exportMemoryCSV = () => {
    const stats = memoryProfiler.getCurrentStats() || memoryProfiler.stop();
    if (stats) {
      const csv = memoryProfiler.exportCSV(stats);
      return csv;
    }
  };

  // Clean diagnostic functions - suppress logging noise
  (window as any).getCleanMemoryStats = () => {
    // Save original console methods
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalInfo = console.info;
    const originalDebug = console.debug;

    // Suppress all logging temporarily
    console.log = () => {};
    console.warn = () => {};
    console.info = () => {};
    console.debug = () => {};

    try {
      const stats = memoryProfiler.getCurrentStats();

      // Restore console
      console.log = originalLog;
      console.warn = originalWarn;
      console.info = originalInfo;
      console.debug = originalDebug;

      // Clear console
      console.clear();

      if (stats) {
      } else {
      }

      return stats;
    } catch (error) {
      // Restore console on error
      console.log = originalLog;
      console.warn = originalWarn;
      console.info = originalInfo;
      console.debug = originalDebug;

      console.error('Error getting memory stats:', error);
    }
  };
}
