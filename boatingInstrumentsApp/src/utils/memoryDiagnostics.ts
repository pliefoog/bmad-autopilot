/**
 * Memory Leak Diagnostics
 * 
 * Tools to identify specific memory leak sources in the app.
 */

import { useNmeaStore } from '../store/nmeaStore';

export interface DiagnosticReport {
  timestamp: number;
  storeStats: {
    historyArrays: {
      depth: number;
      wind: number;
      speed: number;
      engine: Record<string, number>;
      battery: Record<string, number>;
      temperature: Record<string, number>;
    };
    subscriptions: number;
    totalHistoryEntries: number;
  };
  domStats: {
    nodeCount: number;
    listenerCount: number | 'unavailable';
  };
  timers: {
    intervals: number | 'unavailable';
    timeouts: number | 'unavailable';
  };
}

class MemoryDiagnostics {
  private previousReport: DiagnosticReport | null = null;

  /**
   * Generate comprehensive diagnostic report
   */
  generateReport(): DiagnosticReport {
    const state = useNmeaStore.getState();
    
    // Count history entries from sensor.history TimeSeriesBuffers
    const historyArrays = {
      depth: this.countSensorHistory(state.nmeaData.sensors.depth),
      wind: this.countSensorHistory(state.nmeaData.sensors.wind),
      speed: this.countSensorHistory(state.nmeaData.sensors.speed),
      engine: this.countMultiInstanceHistory(state.nmeaData.sensors.engine),
      battery: this.countMultiInstanceHistory(state.nmeaData.sensors.battery),
      temperature: this.countMultiInstanceHistory(state.nmeaData.sensors.temperature),
    };

    const totalHistoryEntries = 
      historyArrays.depth +
      historyArrays.wind +
      historyArrays.speed +
      Object.values(historyArrays.engine).reduce((a, b) => a + b, 0) +
      Object.values(historyArrays.battery).reduce((a, b) => a + b, 0) +
      Object.values(historyArrays.temperature).reduce((a, b) => a + b, 0);

    // DOM stats
    const nodeCount = typeof document !== 'undefined' 
      ? document.getElementsByTagName('*').length 
      : 0;

    const report: DiagnosticReport = {
      timestamp: Date.now(),
      storeStats: {
        historyArrays,
        subscriptions: 0, // Subscriptions removed - history is auto-managed
        totalHistoryEntries,
      },
      domStats: {
        nodeCount,
        listenerCount: 'unavailable', // Would need Chrome DevTools API
      },
      timers: {
        intervals: 'unavailable',
        timeouts: 'unavailable',
      },
    };

    this.previousReport = report;
    return report;
  }

  /**
   * Count entries in a sensor type's history (single-instance sensors)
   */
  private countSensorHistory(sensorGroup: Record<number, any>): number {
    if (!sensorGroup) return 0;
    
    let total = 0;
    Object.values(sensorGroup).forEach((sensor: any) => {
      if (sensor?.history) {
        const stats = sensor.history.getStats();
        total += stats?.totalCount || 0;
      }
    });
    
    return total;
  }

  /**
   * Count entries in multi-instance history
   */
  private countMultiInstanceHistory(sensorGroup: Record<number, any>): Record<string, number> {
    const counts: Record<string, number> = {};
    
    if (!sensorGroup) return counts;
    
    Object.entries(sensorGroup).forEach(([instance, sensor]: [string, any]) => {
      if (sensor?.history) {
        const stats = sensor.history.getStats();
        counts[instance] = stats?.totalCount || 0;
      }
    });
    
    return counts;
  }

  /**
   * Compare current report with previous to detect growth
   */
  detectGrowth(): {
    historyGrowth: number;
    domGrowth: number;
    subscriptionGrowth: number;
  } | null {
    const current = this.generateReport();
    
    if (!this.previousReport) {
      return null;
    }

    return {
      historyGrowth: current.storeStats.totalHistoryEntries - this.previousReport.storeStats.totalHistoryEntries,
      domGrowth: current.domStats.nodeCount - this.previousReport.domStats.nodeCount,
      subscriptionGrowth: current.storeStats.subscriptions - this.previousReport.storeStats.subscriptions,
    };
  }

  /**
   * Format report for console output
   */
  formatReport(report: DiagnosticReport): string {
    const lines: string[] = [
      '═══════════════════════════════════════════════════',
      '           MEMORY DIAGNOSTICS REPORT',
      '═══════════════════════════════════════════════════',
      '',
      '📊 Store Statistics:',
      `  History Subscriptions: ${report.storeStats.subscriptions}`,
      `  Total History Entries: ${report.storeStats.totalHistoryEntries}`,
      '',
      '📈 History Arrays (entries):',
      `  Depth:       ${report.storeStats.historyArrays.depth}`,
      `  Wind:        ${report.storeStats.historyArrays.wind}`,
      `  Speed:       ${report.storeStats.historyArrays.speed}`,
    ];

    // Engine instances
    const engineKeys = Object.keys(report.storeStats.historyArrays.engine);
    if (engineKeys.length > 0) {
      lines.push('  Engines:');
      engineKeys.forEach(key => {
        lines.push(`    ${key}: ${report.storeStats.historyArrays.engine[key]}`);
      });
    }

    // Battery instances
    const batteryKeys = Object.keys(report.storeStats.historyArrays.battery);
    if (batteryKeys.length > 0) {
      lines.push('  Batteries:');
      batteryKeys.forEach(key => {
        lines.push(`    ${key}: ${report.storeStats.historyArrays.battery[key]}`);
      });
    }

    // Temperature instances
    const tempKeys = Object.keys(report.storeStats.historyArrays.temperature);
    if (tempKeys.length > 0) {
      lines.push('  Temperatures:');
      tempKeys.forEach(key => {
        lines.push(`    ${key}: ${report.storeStats.historyArrays.temperature[key]}`);
      });
    }

    lines.push('');
    lines.push('🌐 DOM Statistics:');
    lines.push(`  Total DOM Nodes: ${report.domStats.nodeCount}`);
    
    // Growth analysis
    if (this.previousReport) {
      const growth = this.detectGrowth();
      if (growth) {
        lines.push('');
        lines.push('📈 Growth Since Last Check:');
        lines.push(`  History Entries: ${growth.historyGrowth > 0 ? '+' : ''}${growth.historyGrowth}`);
        lines.push(`  DOM Nodes: ${growth.domGrowth > 0 ? '+' : ''}${growth.domGrowth}`);
        lines.push(`  Subscriptions: ${growth.subscriptionGrowth > 0 ? '+' : ''}${growth.subscriptionGrowth}`);

        if (growth.historyGrowth > 100) {
          lines.push('');
          lines.push('⚠️  WARNING: History arrays growing rapidly!');
          lines.push('   → Check if pruning is working correctly');
        }
        if (growth.domGrowth > 100) {
          lines.push('');
          lines.push('⚠️  WARNING: DOM growing rapidly!');
          lines.push('   → Check for component cleanup issues');
        }
      }
    }

    lines.push('═══════════════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Monitor for continuous leak detection
   */
  startMonitoring(intervalMs: number = 10000): NodeJS.Timeout {
    console.log(`[Diagnostics] Starting monitoring (interval: ${intervalMs}ms)`);
    
    // Initial report
    const initial = this.generateReport();
    console.log(this.formatReport(initial));

    return setInterval(() => {
      const report = this.generateReport();
      console.log(this.formatReport(report));
    }, intervalMs);
  }
}

// Singleton instance
export const memoryDiagnostics = new MemoryDiagnostics();

// Also expose on window for easy access
if (typeof window !== 'undefined') {
  (window as any).__memoryDiagnostics = memoryDiagnostics;
}

// Console helper functions
if (typeof window !== 'undefined') {
  (window as any).diagnoseMemory = () => {
    const report = memoryDiagnostics.generateReport();
    console.log(memoryDiagnostics.formatReport(report));
    return report;
  };

  (window as any).monitorMemory = (intervalSeconds: number = 10) => {
    const intervalId = memoryDiagnostics.startMonitoring(intervalSeconds * 1000);
    console.log(`✅ Monitoring started. Run stopMonitoring() to stop.`);
    (window as any).__memoryMonitorInterval = intervalId;
    return intervalId;
  };

  (window as any).stopMonitoring = () => {
    if ((window as any).__memoryMonitorInterval) {
      clearInterval((window as any).__memoryMonitorInterval);
      (window as any).__memoryMonitorInterval = null;
      console.log('✅ Monitoring stopped.');
    } else {
      console.log('No monitoring active.');
    }
  };

  // Clean diagnostic function - suppress logging noise
  (window as any).getCleanDiagnostics = () => {
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
      const report = memoryDiagnostics.generateReport();
      
      // Restore console
      console.log = originalLog;
      console.warn = originalWarn;
      console.info = originalInfo;
      console.debug = originalDebug;
      
      // Clear console
      console.clear();
      
      // Show ONLY the diagnostic report
      console.log(memoryDiagnostics.formatReport(report));
      
      return report;
    } catch (error) {
      // Restore console on error
      console.log = originalLog;
      console.warn = originalWarn;
      console.info = originalInfo;
      console.debug = originalDebug;
      
      console.error('Error running diagnostics:', error);
    }
  };
}
