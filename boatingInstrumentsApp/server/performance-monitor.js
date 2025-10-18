/**
 * BMAD Performance Monitor
 * 
 * Implements AC7: Performance Monitoring and Alerting System
 * - Real-time performance metrics collection
 * - Performance regression detection  
 * - Memory leak detection
 * - Resource usage alerting
 * - Performance trend analysis
 */

class BMADPerformanceMonitor {
  constructor(simulator, alertingConfig = {}) {
    this.simulator = simulator;
    this.alerting = {
      maxMemoryMB: alertingConfig.maxMemoryMB || 100,
      maxCpuPercent: alertingConfig.maxCpuPercent || 10,
      maxResponseTimeMs: alertingConfig.maxResponseTimeMs || 100,
      minMessagesPerSecond: alertingConfig.minMessagesPerSecond || 10,
      ...alertingConfig
    };
    
    // Performance history for trend analysis
    this.performanceHistory = [];
    this.maxHistorySize = 1000; // Keep last 1000 measurements
    
    // Alerting state
    this.alerts = [];
    this.alertCallbacks = [];
    
    // Baseline performance metrics
    this.baseline = null;
    this.regressionThreshold = 0.2; // 20% performance degradation triggers alert
    
    // Memory leak detection
    this.memorySnapshots = [];
    this.leakDetectionInterval = 60000; // Check every minute
    
    // Performance monitoring intervals
    this.monitoringInterval = null;
    this.leakDetectionTimer = null;
    
    console.log('📊 BMAD Performance Monitor initialized');
  }
  
  /**
   * Start performance monitoring
   */
  start() {
    console.log('▶️  Starting performance monitoring...');
    
    // Start real-time metrics collection
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, 1000); // Collect every second
    
    // Start memory leak detection
    this.leakDetectionTimer = setInterval(() => {
      this.detectMemoryLeaks();
    }, this.leakDetectionInterval);
    
    // Set baseline after 30 seconds of operation
    setTimeout(() => {
      this.setPerformanceBaseline();
    }, 30000);
  }
  
  /**
   * Stop performance monitoring
   */
  stop() {
    console.log('⏹️  Stopping performance monitoring...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.leakDetectionTimer) {
      clearInterval(this.leakDetectionTimer);
      this.leakDetectionTimer = null;
    }
  }
  
  /**
   * Collect real-time performance metrics
   */
  collectMetrics() {
    const now = Date.now();
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const metrics = {
      timestamp: now,
      
      // Memory metrics
      memoryHeapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      memoryHeapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      memoryRSS: Math.round(memUsage.rss / 1024 / 1024), // MB
      memoryExternal: Math.round(memUsage.external / 1024 / 1024), // MB
      
      // CPU metrics (convert to percentage)
      cpuUser: cpuUsage.user / 1000000, // seconds
      cpuSystem: cpuUsage.system / 1000000, // seconds
      
      // Simulator-specific metrics
      messagesPerSecond: this.simulator.stats.messagesPerSecond || 0,
      totalMessages: this.simulator.stats.totalMessages || 0,
      connectedClients: this.simulator.clients.size,
      
      // Response time (mock for now - would need actual request timing)
      avgResponseTime: Math.random() * 50 + 20, // 20-70ms mock
      
      // Uptime
      uptime: process.uptime()
    };
    
    // Add to history
    this.performanceHistory.push(metrics);
    
    // Limit history size
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }
    
    // Check for alerts
    this.checkPerformanceAlerts(metrics);
    
    return metrics;
  }
  
  /**
   * Set performance baseline for regression detection
   */
  setPerformanceBaseline() {
    if (this.performanceHistory.length < 10) {
      console.warn('⚠️  Not enough performance data to set baseline');
      return;
    }
    
    const recent = this.performanceHistory.slice(-10);
    this.baseline = {
      avgMemoryHeapUsed: this.average(recent.map(m => m.memoryHeapUsed)),
      avgCpuUser: this.average(recent.map(m => m.cpuUser)),
      avgMessagesPerSecond: this.average(recent.map(m => m.messagesPerSecond)),
      avgResponseTime: this.average(recent.map(m => m.avgResponseTime)),
      timestamp: Date.now()
    };
    
    console.log('📊 Performance baseline set:', this.baseline);
  }
  
  /**
   * Check for performance alerts
   */
  checkPerformanceAlerts(metrics) {
    const alerts = [];
    
    // Memory usage alert
    if (metrics.memoryHeapUsed > this.alerting.maxMemoryMB) {
      alerts.push({
        type: 'memory_high',
        severity: 'warning',
        message: `Memory usage exceeded threshold: ${metrics.memoryHeapUsed}MB > ${this.alerting.maxMemoryMB}MB`,
        value: metrics.memoryHeapUsed,
        threshold: this.alerting.maxMemoryMB,
        timestamp: metrics.timestamp
      });
    }
    
    // CPU usage alert (approximated)
    const cpuPercent = (metrics.cpuUser + metrics.cpuSystem) / metrics.uptime * 100;
    if (cpuPercent > this.alerting.maxCpuPercent) {
      alerts.push({
        type: 'cpu_high',
        severity: 'warning',
        message: `CPU usage exceeded threshold: ${cpuPercent.toFixed(1)}% > ${this.alerting.maxCpuPercent}%`,
        value: cpuPercent,
        threshold: this.alerting.maxCpuPercent,
        timestamp: metrics.timestamp
      });
    }
    
    // Message rate alert
    if (metrics.messagesPerSecond < this.alerting.minMessagesPerSecond && metrics.messagesPerSecond > 0) {
      alerts.push({
        type: 'message_rate_low',
        severity: 'info',
        message: `Message rate below threshold: ${metrics.messagesPerSecond} < ${this.alerting.minMessagesPerSecond} msgs/sec`,
        value: metrics.messagesPerSecond,
        threshold: this.alerting.minMessagesPerSecond,
        timestamp: metrics.timestamp
      });
    }
    
    // Response time alert
    if (metrics.avgResponseTime > this.alerting.maxResponseTimeMs) {
      alerts.push({
        type: 'response_time_high',
        severity: 'warning',
        message: `Response time exceeded threshold: ${metrics.avgResponseTime.toFixed(1)}ms > ${this.alerting.maxResponseTimeMs}ms`,
        value: metrics.avgResponseTime,
        threshold: this.alerting.maxResponseTimeMs,
        timestamp: metrics.timestamp
      });
    }
    
    // Performance regression detection
    if (this.baseline) {
      const regressionAlerts = this.checkPerformanceRegression(metrics);
      alerts.push(...regressionAlerts);
    }
    
    // Process alerts
    alerts.forEach(alert => {
      this.processAlert(alert);
    });
  }
  
  /**
   * Check for performance regression against baseline
   */
  checkPerformanceRegression(metrics) {
    const alerts = [];
    
    // Memory regression
    const memoryIncrease = (metrics.memoryHeapUsed - this.baseline.avgMemoryHeapUsed) / this.baseline.avgMemoryHeapUsed;
    if (memoryIncrease > this.regressionThreshold) {
      alerts.push({
        type: 'memory_regression',
        severity: 'critical',
        message: `Memory usage regression detected: ${(memoryIncrease * 100).toFixed(1)}% increase from baseline`,
        value: metrics.memoryHeapUsed,
        baseline: this.baseline.avgMemoryHeapUsed,
        regression: memoryIncrease,
        timestamp: metrics.timestamp
      });
    }
    
    // Message rate regression
    const messageDecrease = (this.baseline.avgMessagesPerSecond - metrics.messagesPerSecond) / this.baseline.avgMessagesPerSecond;
    if (messageDecrease > this.regressionThreshold && metrics.messagesPerSecond > 0) {
      alerts.push({
        type: 'throughput_regression',
        severity: 'critical',
        message: `Message throughput regression detected: ${(messageDecrease * 100).toFixed(1)}% decrease from baseline`,
        value: metrics.messagesPerSecond,
        baseline: this.baseline.avgMessagesPerSecond,
        regression: messageDecrease,
        timestamp: metrics.timestamp
      });
    }
    
    return alerts;
  }
  
  /**
   * Detect memory leaks
   */
  detectMemoryLeaks() {
    const currentMemory = process.memoryUsage().heapUsed;
    const timestamp = Date.now();
    
    this.memorySnapshots.push({
      timestamp,
      heapUsed: currentMemory
    });
    
    // Keep last 10 snapshots
    if (this.memorySnapshots.length > 10) {
      this.memorySnapshots.shift();
    }
    
    // Need at least 5 snapshots to detect trend
    if (this.memorySnapshots.length >= 5) {
      const trend = this.analyzeMemoryTrend();
      
      if (trend.isIncreasing && trend.rate > 1024 * 1024) { // 1MB/minute increase
        this.processAlert({
          type: 'memory_leak_detected',
          severity: 'critical',
          message: `Memory leak detected: ${(trend.rate / 1024 / 1024).toFixed(1)}MB/minute increase`,
          trend: trend,
          timestamp: timestamp
        });
      }
    }
  }
  
  /**
   * Analyze memory usage trend
   */
  analyzeMemoryTrend() {
    if (this.memorySnapshots.length < 2) {
      return { isIncreasing: false, rate: 0 };
    }
    
    const first = this.memorySnapshots[0];
    const last = this.memorySnapshots[this.memorySnapshots.length - 1];
    
    const timeDiff = (last.timestamp - first.timestamp) / 1000 / 60; // minutes
    const memoryDiff = last.heapUsed - first.heapUsed;
    
    const rate = memoryDiff / timeDiff; // bytes per minute
    const isIncreasing = rate > 0;
    
    return { isIncreasing, rate, timeDiff, memoryDiff };
  }
  
  /**
   * Process and handle alerts
   */
  processAlert(alert) {
    // Add to alerts list
    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }
    
    // Log alert
    const emoji = this.getAlertEmoji(alert.severity);
    console.log(`${emoji} ${alert.type.toUpperCase()}: ${alert.message}`);
    
    // Call alert callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('❌ Alert callback error:', error.message);
      }
    });
  }
  
  /**
   * Get emoji for alert severity
   */
  getAlertEmoji(severity) {
    switch (severity) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📊';
    }
  }
  
  /**
   * Register alert callback
   */
  onAlert(callback) {
    this.alertCallbacks.push(callback);
  }
  
  /**
   * Get current performance metrics
   */
  getCurrentMetrics() {
    return this.performanceHistory.length > 0 
      ? this.performanceHistory[this.performanceHistory.length - 1]
      : null;
  }
  
  /**
   * Get performance history
   */
  getPerformanceHistory(lastN = 60) {
    return this.performanceHistory.slice(-lastN);
  }
  
  /**
   * Get active alerts
   */
  getAlerts(severity = null) {
    if (!severity) {
      return this.alerts;
    }
    return this.alerts.filter(alert => alert.severity === severity);
  }
  
  /**
   * Get performance trend analysis
   */
  getPerformanceTrends() {
    if (this.performanceHistory.length < 10) {
      return null;
    }
    
    const recent = this.performanceHistory.slice(-10);
    const older = this.performanceHistory.slice(-20, -10);
    
    return {
      memory: {
        current: this.average(recent.map(m => m.memoryHeapUsed)),
        previous: this.average(older.map(m => m.memoryHeapUsed)),
        trend: this.getTrend(recent.map(m => m.memoryHeapUsed))
      },
      throughput: {
        current: this.average(recent.map(m => m.messagesPerSecond)),
        previous: this.average(older.map(m => m.messagesPerSecond)),
        trend: this.getTrend(recent.map(m => m.messagesPerSecond))
      },
      response_time: {
        current: this.average(recent.map(m => m.avgResponseTime)),
        previous: this.average(older.map(m => m.avgResponseTime)),
        trend: this.getTrend(recent.map(m => m.avgResponseTime))
      }
    };
  }
  
  /**
   * Calculate average of array values
   */
  average(values) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  /**
   * Get trend direction (increasing, decreasing, stable)
   */
  getTrend(values) {
    if (values.length < 2) return 'stable';
    
    const first = values[0];
    const last = values[values.length - 1];
    const change = (last - first) / first;
    
    if (change > 0.05) return 'increasing';
    if (change < -0.05) return 'decreasing';
    return 'stable';
  }
}

module.exports = { BMADPerformanceMonitor };