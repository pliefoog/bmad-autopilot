#!/usr/bin/env node

/**
 * Story 11.8: CI/CD Pipeline Integration - CI Resource Optimizer
 * PURPOSE: Resource utilization optimization for CI/CD environments configured
 * REQUIREMENT: AC#3 - Pipeline Optimization - Resource utilization optimization for CI environments
 * METHOD: CPU/memory monitoring, resource allocation management, and CI environment optimization
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

class CIResourceOptimizer {
  constructor() {
    this.config = {
      limits: {
        maxMemoryMB: parseInt(process.env.CI_MAX_MEMORY_MB || '2048'), // 2GB default
        maxCPUCores: parseInt(process.env.CI_MAX_CPU_CORES || '2'),
        maxProcesses: parseInt(process.env.CI_MAX_PROCESSES || '4'),
        diskSpaceWarnMB: parseInt(process.env.CI_DISK_WARN_MB || '1024') // 1GB warning
      },
      monitoring: {
        intervalMs: parseInt(process.env.CI_MONITOR_INTERVAL || '5000'), // 5 seconds
        historySize: parseInt(process.env.CI_MONITOR_HISTORY || '60'), // Keep 60 measurements
        alertThreshold: parseFloat(process.env.CI_ALERT_THRESHOLD || '0.8') // 80% utilization
      },
      optimization: {
        enableMemoryLimits: process.env.CI_ENABLE_MEMORY_LIMITS !== 'false',
        enableCPULimits: process.env.CI_ENABLE_CPU_LIMITS !== 'false',
        enableProcessLimits: process.env.CI_ENABLE_PROCESS_LIMITS !== 'false',
        autoKillOnLimit: process.env.CI_AUTO_KILL_ON_LIMIT === 'true',
        gcInterval: parseInt(process.env.CI_GC_INTERVAL || '30000') // 30 seconds
      },
      jest: {
        optimizeForCI: true,
        maxWorkers: this.calculateOptimalWorkers(),
        workerIdleMemoryLimit: '512MB',
        detectOpenHandles: false, // Disable in CI for performance
        forceExit: true // Force exit to prevent hangs
      }
    };

    this.metrics = {
      memory: [],
      cpu: [],
      disk: [],
      processes: [],
      violations: []
    };

    this.monitoring = {
      active: false,
      intervalId: null,
      startTime: null
    };
  }

  /**
   * Calculate optimal worker count for Jest based on CI environment
   */
  calculateOptimalWorkers() {
    const availableCPUs = os.cpus().length;
    const memoryGB = os.totalmem() / (1024 * 1024 * 1024);
    
    // Conservative calculation for CI environments
    let optimalWorkers = Math.min(
      availableCPUs,
      Math.floor(memoryGB / 0.5), // 512MB per worker
      this.config.limits.maxCPUCores || availableCPUs
    );

    // Minimum 1, maximum based on configuration
    optimalWorkers = Math.max(1, Math.min(optimalWorkers, this.config.limits.maxProcesses));
    
    console.log(`🧮 Calculated optimal Jest workers: ${optimalWorkers} (CPUs: ${availableCPUs}, Memory: ${memoryGB.toFixed(1)}GB)`);
    return optimalWorkers;
  }

  /**
   * Start resource optimization
   */
  async startOptimization() {
    console.log('⚡ Starting CI Resource Optimization...');
    
    try {
      // Set up resource limits
      await this.setupResourceLimits();
      
      // Configure Node.js for CI
      await this.configureNodeJS();
      
      // Configure Jest for optimal CI performance
      await this.configureJest();
      
      // Start resource monitoring
      await this.startResourceMonitoring();
      
      // Set up cleanup handlers
      this.setupCleanupHandlers();
      
      console.log('✅ Resource optimization started successfully');
      
      return {
        success: true,
        configuration: this.config,
        systemInfo: this.getSystemInfo()
      };

    } catch (error) {
      console.error(`❌ Failed to start resource optimization: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set up resource limits using available methods
   */
  async setupResourceLimits() {
    console.log('🛡️ Setting up resource limits...');

    try {
      // Memory limits
      if (this.config.optimization.enableMemoryLimits) {
        const memoryLimitMB = this.config.limits.maxMemoryMB;
        
        // Set Node.js memory limit
        if (!process.env.NODE_OPTIONS || !process.env.NODE_OPTIONS.includes('--max-old-space-size')) {
          process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ` --max-old-space-size=${memoryLimitMB}`;
          console.log(`  💾 Set Node.js memory limit: ${memoryLimitMB}MB`);
        }
        
        // Set V8 heap size for current process (if not already set)
        if (process.version && !process.execArgv.some(arg => arg.includes('--max-old-space-size'))) {
          console.log(`  💾 Memory limit will apply to child processes: ${memoryLimitMB}MB`);
        }
      }

      // CPU limits (using ulimit where available)
      if (this.config.optimization.enableCPULimits) {
        try {
          const cpuLimit = this.config.limits.maxCPUCores * 100; // CPU percentage
          // Note: This is a best-effort approach; actual CPU limiting requires OS-level controls
          console.log(`  🔧 CPU guidance set: ${this.config.limits.maxCPUCores} cores`);
        } catch (error) {
          console.warn(`  ⚠️ Could not set CPU limits: ${error.message}`);
        }
      }

      // Process limits
      if (this.config.optimization.enableProcessLimits) {
        process.env.UV_THREADPOOL_SIZE = Math.min(4, this.config.limits.maxProcesses).toString();
        console.log(`  👥 Set UV thread pool size: ${process.env.UV_THREADPOOL_SIZE}`);
      }

    } catch (error) {
      console.warn(`⚠️ Could not set all resource limits: ${error.message}`);
    }
  }

  /**
   * Configure Node.js for optimal CI performance
   */
  async configureNodeJS() {
    console.log('⚙️ Configuring Node.js for CI...');

    // Enable garbage collection optimization
    if (this.config.optimization.gcInterval) {
      const gcInterval = setInterval(() => {
        if (global.gc) {
          global.gc();
        }
      }, this.config.optimization.gcInterval);

      // Store interval for cleanup
      this.monitoring.gcInterval = gcInterval;
    }

    // Disable unnecessary features for CI
    process.env.NODE_ENV = 'test';
    process.env.CI = 'true';
    
    // Optimize for CI environment
    process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --expose-gc';
    
    console.log('  ♻️ Enabled periodic garbage collection');
    console.log('  🔧 Set CI environment variables');
  }

  /**
   * Configure Jest for optimal CI performance
   */
  async configureJest() {
    console.log('🧪 Configuring Jest for CI optimization...');

    const jestConfigPath = path.join(__dirname, '../../jest.config.js');
    const ciJestConfigPath = path.join(__dirname, 'jest.ci.config.js');

    try {
      // Create CI-optimized Jest configuration
      const ciConfig = {
        // Extend base configuration
        preset: 'react-native',
        setupFilesAfterEnv: ['<rootDir>/src/test-utils/setupTests.js'],
        
        // CI optimizations
        maxWorkers: this.config.jest.maxWorkers,
        workerIdleMemoryLimit: this.config.jest.workerIdleMemoryLimit,
        detectOpenHandles: this.config.jest.detectOpenHandles,
        forceExit: this.config.jest.forceExit,
        
        // Performance optimizations
        cache: true,
        cacheDirectory: '<rootDir>/.jest-cache',
        clearMocks: true,
        restoreMocks: true,
        
        // Timeout optimizations
        testTimeout: 30000, // 30 seconds max per test
        setupFilesAfterEnv: [
          '<rootDir>/src/test-utils/setupTests.js',
          '<rootDir>/scripts/ci/jest-ci-setup.js'
        ],
        
        // Memory optimizations
        logHeapUsage: true,
        maxConcurrency: Math.min(this.config.jest.maxWorkers, 5),
        
        // Coverage optimizations
        coverageReporters: ['json-summary', 'text-summary'], // Minimal reporters for CI
        collectCoverageOnlyFrom: {
          'src/**/*.{ts,tsx,js,jsx}': true
        }
      };

      // Write CI Jest configuration
      const configContent = `module.exports = ${JSON.stringify(ciConfig, null, 2)};`;
      fs.writeFileSync(ciJestConfigPath, configContent);
      
      console.log(`  📄 Created CI Jest config: ${ciJestConfigPath}`);
      console.log(`  👷 Max workers: ${this.config.jest.maxWorkers}`);
      console.log(`  💾 Worker memory limit: ${this.config.jest.workerIdleMemoryLimit}`);

      return ciJestConfigPath;

    } catch (error) {
      console.warn(`⚠️ Could not create CI Jest config: ${error.message}`);
      return jestConfigPath;
    }
  }

  /**
   * Start resource monitoring
   */
  async startResourceMonitoring() {
    if (this.monitoring.active) {
      console.log('📊 Resource monitoring already active');
      return;
    }

    console.log('📊 Starting resource monitoring...');
    
    this.monitoring.active = true;
    this.monitoring.startTime = Date.now();
    
    this.monitoring.intervalId = setInterval(() => {
      this.collectResourceMetrics();
    }, this.config.monitoring.intervalMs);

    console.log(`  ⏱️ Monitoring interval: ${this.config.monitoring.intervalMs}ms`);
    console.log(`  🚨 Alert threshold: ${(this.config.monitoring.alertThreshold * 100)}%`);
  }

  /**
   * Collect current resource metrics
   */
  collectResourceMetrics() {
    const timestamp = Date.now();
    
    try {
      // Memory metrics
      const memUsage = process.memoryUsage();
      const totalMemMB = os.totalmem() / (1024 * 1024);
      const freeMemMB = os.freemem() / (1024 * 1024);
      const usedMemMB = totalMemMB - freeMemMB;
      
      const memoryMetrics = {
        timestamp,
        totalMB: Math.round(totalMemMB),
        usedMB: Math.round(usedMemMB),
        freeMB: Math.round(freeMemMB),
        utilization: usedMemMB / totalMemMB,
        process: {
          rss: Math.round(memUsage.rss / (1024 * 1024)),
          heapUsed: Math.round(memUsage.heapUsed / (1024 * 1024)),
          heapTotal: Math.round(memUsage.heapTotal / (1024 * 1024)),
          external: Math.round(memUsage.external / (1024 * 1024))
        }
      };
      
      // CPU metrics (simplified)
      const cpuMetrics = {
        timestamp,
        loadAverage: os.loadavg(),
        cpuCount: os.cpus().length
      };
      
      // Disk metrics (basic)
      const diskMetrics = this.getDiskMetrics();
      
      // Process metrics
      const processMetrics = {
        timestamp,
        pid: process.pid,
        uptime: Math.round(process.uptime()),
        activeHandles: process._getActiveHandles ? process._getActiveHandles().length : 0,
        activeRequests: process._getActiveRequests ? process._getActiveRequests().length : 0
      };
      
      // Store metrics
      this.addMetric('memory', memoryMetrics);
      this.addMetric('cpu', cpuMetrics);
      this.addMetric('disk', diskMetrics);
      this.addMetric('processes', processMetrics);
      
      // Check for violations
      this.checkResourceViolations(memoryMetrics, cpuMetrics, diskMetrics);
      
    } catch (error) {
      console.warn(`⚠️ Failed to collect metrics: ${error.message}`);
    }
  }

  /**
   * Add metric to history with size limit
   */
  addMetric(type, metric) {
    this.metrics[type].push(metric);
    
    // Keep only recent history
    if (this.metrics[type].length > this.config.monitoring.historySize) {
      this.metrics[type].shift();
    }
  }

  /**
   * Get basic disk metrics
   */
  getDiskMetrics() {
    try {
      const stats = fs.statSync(__dirname);
      return {
        timestamp: Date.now(),
        available: true
        // Note: Actual disk space requires platform-specific commands
      };
    } catch (error) {
      return {
        timestamp: Date.now(),
        available: false,
        error: error.message
      };
    }
  }

  /**
   * Check for resource violations
   */
  checkResourceViolations(memoryMetrics, cpuMetrics, diskMetrics) {
    const violations = [];
    
    // Memory violations
    if (memoryMetrics.utilization > this.config.monitoring.alertThreshold) {
      violations.push({
        type: 'memory',
        severity: memoryMetrics.utilization > 0.95 ? 'critical' : 'warning',
        message: `Memory utilization ${(memoryMetrics.utilization * 100).toFixed(1)}% exceeds threshold`,
        value: memoryMetrics.utilization,
        threshold: this.config.monitoring.alertThreshold
      });
    }
    
    // Process memory violations
    if (memoryMetrics.process.rss > this.config.limits.maxMemoryMB * 0.8) {
      violations.push({
        type: 'process-memory',
        severity: 'warning',
        message: `Process memory ${memoryMetrics.process.rss}MB approaching limit`,
        value: memoryMetrics.process.rss,
        threshold: this.config.limits.maxMemoryMB
      });
    }
    
    // CPU violations (basic load average check)
    const avgLoad = cpuMetrics.loadAverage[0];
    if (avgLoad > cpuMetrics.cpuCount * 2) {
      violations.push({
        type: 'cpu',
        severity: 'warning',
        message: `High CPU load average ${avgLoad.toFixed(2)} on ${cpuMetrics.cpuCount} cores`,
        value: avgLoad,
        threshold: cpuMetrics.cpuCount * 2
      });
    }
    
    // Log violations
    if (violations.length > 0) {
      console.warn(`⚠️ Resource violations detected:`);
      violations.forEach(v => {
        console.warn(`  - ${v.severity.toUpperCase()}: ${v.message}`);
      });
      
      this.metrics.violations.push(...violations.map(v => ({
        ...v,
        timestamp: Date.now()
      })));
      
      // Auto-kill if configured and critical
      if (this.config.optimization.autoKillOnLimit) {
        const criticalViolations = violations.filter(v => v.severity === 'critical');
        if (criticalViolations.length > 0) {
          console.error('💀 Critical resource violation - terminating process');
          process.exit(1);
        }
      }
    }
  }

  /**
   * Get current system information
   */
  getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      totalMemoryMB: Math.round(os.totalmem() / (1024 * 1024)),
      cpuCount: os.cpus().length,
      uptime: os.uptime(),
      processUptime: process.uptime(),
      pid: process.pid
    };
  }

  /**
   * Generate resource optimization report
   */
  generateOptimizationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      configuration: this.config,
      systemInfo: this.getSystemInfo(),
      metrics: {
        memory: this.metrics.memory.length > 0 ? this.metrics.memory.slice(-5) : [],
        cpu: this.metrics.cpu.length > 0 ? this.metrics.cpu.slice(-5) : [],
        processes: this.metrics.processes.length > 0 ? this.metrics.processes.slice(-5) : [],
        violations: this.metrics.violations
      },
      analysis: this.analyzeResourceUsage(),
      recommendations: this.generateOptimizationRecommendations()
    };
    
    const reportPath = path.join(__dirname, 'resource-optimization-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Resource optimization report saved: ${reportPath}`);
    return report;
  }

  /**
   * Analyze resource usage patterns
   */
  analyzeResourceUsage() {
    const analysis = {
      memoryTrend: 'stable',
      averageUtilization: 0,
      peakUtilization: 0,
      violationCount: this.metrics.violations.length,
      monitoringDuration: this.monitoring.startTime ? Date.now() - this.monitoring.startTime : 0
    };
    
    if (this.metrics.memory.length > 1) {
      const utilizations = this.metrics.memory.map(m => m.utilization);
      analysis.averageUtilization = utilizations.reduce((sum, u) => sum + u, 0) / utilizations.length;
      analysis.peakUtilization = Math.max(...utilizations);
      
      // Simple trend analysis
      const recent = utilizations.slice(-5);
      const older = utilizations.slice(-10, -5);
      if (recent.length > 0 && older.length > 0) {
        const recentAvg = recent.reduce((sum, u) => sum + u, 0) / recent.length;
        const olderAvg = older.reduce((sum, u) => sum + u, 0) / older.length;
        
        if (recentAvg > olderAvg * 1.1) {
          analysis.memoryTrend = 'increasing';
        } else if (recentAvg < olderAvg * 0.9) {
          analysis.memoryTrend = 'decreasing';
        }
      }
    }
    
    return analysis;
  }

  /**
   * Generate optimization recommendations
   */
  generateOptimizationRecommendations() {
    const recommendations = [];
    const analysis = this.analyzeResourceUsage();
    
    if (analysis.peakUtilization > 0.9) {
      recommendations.push({
        type: 'memory',
        priority: 'high',
        message: 'Peak memory utilization is very high',
        action: 'Consider increasing memory limits or optimizing memory usage'
      });
    }
    
    if (analysis.memoryTrend === 'increasing') {
      recommendations.push({
        type: 'memory-leak',
        priority: 'medium',
        message: 'Memory usage is trending upward',
        action: 'Check for memory leaks in test code or enable more frequent garbage collection'
      });
    }
    
    if (this.metrics.violations.length > 5) {
      recommendations.push({
        type: 'frequent-violations',
        priority: 'medium',
        message: 'Frequent resource violations detected',
        action: 'Review resource limits and test configuration'
      });
    }
    
    if (this.config.jest.maxWorkers > 2 && analysis.averageUtilization > 0.8) {
      recommendations.push({
        type: 'worker-optimization',
        priority: 'low',
        message: 'Consider reducing Jest worker count to improve memory efficiency',
        action: `Try reducing maxWorkers to ${Math.max(1, this.config.jest.maxWorkers - 1)}`
      });
    }
    
    return recommendations;
  }

  /**
   * Setup cleanup handlers
   */
  setupCleanupHandlers() {
    const cleanup = () => {
      this.stopOptimization();
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);
  }

  /**
   * Stop resource optimization
   */
  stopOptimization() {
    console.log('🛑 Stopping resource optimization...');
    
    if (this.monitoring.intervalId) {
      clearInterval(this.monitoring.intervalId);
      this.monitoring.intervalId = null;
    }
    
    if (this.monitoring.gcInterval) {
      clearInterval(this.monitoring.gcInterval);
      this.monitoring.gcInterval = null;
    }
    
    this.monitoring.active = false;
    
    // Generate final report
    this.generateOptimizationReport();
    
    console.log('✅ Resource optimization stopped');
  }
}

// CLI Interface
if (require.main === module) {
  const optimizer = new CIResourceOptimizer();
  const command = process.argv[2] || 'start';

  async function handleCommand() {
    try {
      switch (command) {
        case 'start':
          const result = await optimizer.startOptimization();
          console.log('\n🎯 Optimization started:', JSON.stringify(result, null, 2));
          
          // Keep running until interrupted
          process.on('SIGINT', () => {
            console.log('\n🛑 Received interrupt, stopping...');
            process.exit(0);
          });
          
          // Prevent exit
          setInterval(() => {}, 1000);
          break;

        case 'report':
          const report = optimizer.generateOptimizationReport();
          console.log('\n📊 Report:', JSON.stringify(report, null, 2));
          break;

        case 'config':
          console.log('Configuration:', JSON.stringify(optimizer.config, null, 2));
          break;

        case 'system':
          console.log('System Info:', JSON.stringify(optimizer.getSystemInfo(), null, 2));
          break;

        default:
          console.log(`Usage: ${process.argv[1]} <start|report|config|system>`);
          console.log('  start   - Start resource optimization and monitoring (default)');
          console.log('  report  - Generate optimization report');
          console.log('  config  - Show configuration');
          console.log('  system  - Show system information');
          console.log('');
          console.log('Environment Variables:');
          console.log('  CI_MAX_MEMORY_MB      - Maximum memory limit in MB (default: 2048)');
          console.log('  CI_MAX_CPU_CORES      - Maximum CPU cores to use (default: 2)');
          console.log('  CI_MAX_PROCESSES      - Maximum parallel processes (default: 4)');
          console.log('  CI_MONITOR_INTERVAL   - Monitoring interval in ms (default: 5000)');
          console.log('  CI_ALERT_THRESHOLD    - Resource alert threshold 0-1 (default: 0.8)');
          console.log('  CI_AUTO_KILL_ON_LIMIT - Auto-kill on critical violations (default: false)');
          process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  }

  handleCommand();
}

module.exports = { CIResourceOptimizer };