/**
 * Simulator Status Integration for VS Code Test Explorer
 *
 * PURPOSE: Integrate NMEA Bridge Simulator connection status with VS Code Test Explorer UI
 * REQUIREMENT: AC-11.7.3 - Simulator Connection Status display with auto-discovery and fallback modes
 * METHOD: SimulatorTestClient integration with VS Code Test Explorer status reporting
 * EXPECTED: Real-time simulator status in VS Code Test Explorer with connection health monitoring
 *
 * Integration with Epic 11 Professional-Grade Testing Architecture:
 * - Story 11.3: Automatic Simulator Discovery
 * - Story 11.7: VS Code Test Explorer Integration
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Import existing SimulatorTestClient from Story 11.3
let SimulatorTestClient;
try {
  // Dynamic import to handle both Node.js and TypeScript environments
  const clientModule = require('../helpers/SimulatorTestClient');
  SimulatorTestClient = clientModule.SimulatorTestClient || clientModule.default;
} catch (error) {
  console.warn('SimulatorTestClient not available, using mock implementation');
}

class SimulatorStatusIntegration {
  constructor(globalConfig, options = {}) {
    this.globalConfig = globalConfig;
    this.options = options;
    this.simulatorClient = null;
    this.connectionStatus = {
      isConnected: false,
      port: null,
      lastCheck: null,
      retryAttempts: 0,
      fallbackMode: false,
      connectionHistory: [],
    };

    // AC3.1: Auto-discovery configuration for ports [9090, 8080]
    this.discoveryPorts = options.discoveryPorts || [9090, 8080];
    this.discoveryTimeout = options.discoveryTimeout || 5000;
    this.healthCheckInterval = options.healthCheckInterval || 10000; // 10 seconds
    this.maxRetryAttempts = options.maxRetryAttempts || 5;

    this.statusMonitor = null;
  }

  /**
   * AC3.2: Initialize simulator connection monitoring for VS Code Test Explorer
   */
  async initializeSimulatorMonitoring() {
    try {
      console.log('🔍 Initializing NMEA Bridge Simulator monitoring for VS Code Test Explorer...');

      // AC3.3: Attempt auto-discovery on configured ports
      await this.performAutoDiscovery();

      // AC3.4: Start continuous health monitoring
      this.startHealthMonitoring();

      // AC3.5: Generate initial VS Code Test Explorer status
      await this.updateVSCodeTestExplorerStatus();
    } catch (error) {
      console.error('Simulator monitoring initialization failed:', error);
      await this.activateFallbackMode('Initialization failed');
    }
  }

  /**
   * AC3.6: Perform auto-discovery on ports [9090, 8080] with timeout indicators
   */
  async performAutoDiscovery() {
    const discoveryStart = performance.now();
    let discoverySuccess = false;

    console.log(
      `🔄 Auto-discovering NMEA Bridge Simulator on ports: ${this.discoveryPorts.join(', ')}`,
    );

    for (const port of this.discoveryPorts) {
      const attemptStart = performance.now();

      try {
        console.log(`   Checking port ${port}...`);

        const connectionAttempt = {
          port,
          timestamp: new Date().toISOString(),
          duration: null,
          success: false,
          error: null,
        };

        // AC3.7: Use existing SimulatorTestClient for connection
        if (SimulatorTestClient) {
          this.simulatorClient = await SimulatorTestClient.autoConnect({
            ports: [port],
            timeout: this.discoveryTimeout,
            retries: 1,
          });

          if (this.simulatorClient && (await this.simulatorClient.isConnected())) {
            connectionAttempt.success = true;
            connectionAttempt.duration = performance.now() - attemptStart;

            this.connectionStatus = {
              isConnected: true,
              port,
              lastCheck: new Date().toISOString(),
              retryAttempts: 0,
              fallbackMode: false,
              connectionHistory: [...this.connectionStatus.connectionHistory, connectionAttempt],
            };

            discoverySuccess = true;
            console.log(`   ✅ Connected to NMEA Bridge Simulator on port ${port}`);
            break;
          }
        } else {
          // Mock connection for testing environments without SimulatorTestClient
          await this.simulateMockConnection(port);
          discoverySuccess = true;
          break;
        }
      } catch (error) {
        console.log(`   ❌ Port ${port} unavailable: ${error.message}`);
        this.connectionStatus.connectionHistory.push({
          port,
          timestamp: new Date().toISOString(),
          duration: performance.now() - attemptStart,
          success: false,
          error: error.message,
        });
      }
    }

    const discoveryDuration = performance.now() - discoveryStart;
    console.log(`🔍 Auto-discovery completed in ${discoveryDuration.toFixed(2)}ms`);

    if (!discoverySuccess) {
      await this.activateFallbackMode('No simulator found on configured ports');
    }

    return discoverySuccess;
  }

  /**
   * AC3.8: Simulate mock connection for environments without simulator
   */
  async simulateMockConnection(port) {
    console.log(`   🎭 Using mock simulator connection on port ${port}`);

    this.connectionStatus = {
      isConnected: true,
      port,
      lastCheck: new Date().toISOString(),
      retryAttempts: 0,
      fallbackMode: true,
      mockMode: true,
      connectionHistory: [
        ...this.connectionStatus.connectionHistory,
        {
          port,
          timestamp: new Date().toISOString(),
          duration: 50, // Simulated fast connection
          success: true,
          mockMode: true,
        },
      ],
    };
  }

  /**
   * AC3.9: Start continuous health monitoring with retry attempt tracking
   */
  startHealthMonitoring() {
    if (this.statusMonitor) {
      clearInterval(this.statusMonitor);
    }

    this.statusMonitor = setInterval(async () => {
      await this.performHealthCheck();
      await this.updateVSCodeTestExplorerStatus();
    }, this.healthCheckInterval);

    console.log(
      `❤️ Simulator health monitoring started (${this.healthCheckInterval / 1000}s interval)`,
    );
  }

  /**
   * AC3.10: Perform connection health check with retry logic
   */
  async performHealthCheck() {
    const checkStart = performance.now();

    try {
      if (this.simulatorClient && !this.connectionStatus.fallbackMode) {
        const isHealthy = await this.simulatorClient.healthCheck();

        if (isHealthy) {
          this.connectionStatus.lastCheck = new Date().toISOString();
          this.connectionStatus.retryAttempts = 0;
        } else {
          await this.handleConnectionFailure('Health check failed');
        }
      } else if (this.connectionStatus.mockMode) {
        // Mock health check always passes
        this.connectionStatus.lastCheck = new Date().toISOString();
      }
    } catch (error) {
      await this.handleConnectionFailure(error.message);
    }

    const checkDuration = performance.now() - checkStart;
    console.log(`🔍 Health check completed in ${checkDuration.toFixed(2)}ms`);
  }

  /**
   * AC3.11: Handle connection failures with retry attempt tracking
   */
  async handleConnectionFailure(reason) {
    this.connectionStatus.retryAttempts++;

    console.log(
      `⚠️ Simulator connection issue (attempt ${this.connectionStatus.retryAttempts}/${this.maxRetryAttempts}): ${reason}`,
    );

    if (this.connectionStatus.retryAttempts >= this.maxRetryAttempts) {
      await this.activateFallbackMode(`Max retry attempts reached: ${reason}`);
    } else {
      // Attempt reconnection
      setTimeout(async () => {
        await this.performAutoDiscovery();
      }, 2000 * this.connectionStatus.retryAttempts); // Exponential backoff
    }
  }

  /**
   * AC3.12: Activate fallback mode when simulator unavailable
   */
  async activateFallbackMode(reason) {
    console.log(`🔄 Activating fallback mode: ${reason}`);

    this.connectionStatus = {
      ...this.connectionStatus,
      isConnected: false,
      fallbackMode: true,
      fallbackReason: reason,
      fallbackActivatedAt: new Date().toISOString(),
    };

    await this.updateVSCodeTestExplorerStatus();
  }

  /**
   * AC3.13: Update VS Code Test Explorer status display
   */
  async updateVSCodeTestExplorerStatus() {
    const statusData = {
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'SimulatorStatusIntegration',
      },
      simulator: {
        status: this.getSimulatorStatus(),
        connection: this.connectionStatus,
        capabilities: await this.getSimulatorCapabilities(),
        recommendations: this.generateRecommendations(),
      },
      testEnvironment: {
        mode: this.connectionStatus.fallbackMode ? 'mock' : 'live',
        readiness: this.assessTestReadiness(),
        warnings: this.generateWarnings(),
      },
    };

    // AC3.14: Save status for VS Code Test Explorer consumption
    const outputPath = path.join(this.globalConfig.rootDir, 'coverage', 'simulator-status.json');
    await this.ensureDirectoryExists(path.dirname(outputPath));
    fs.writeFileSync(outputPath, JSON.stringify(statusData, null, 2));

    // AC3.15: Create status indicator file for VS Code extensions
    const indicatorPath = path.join(this.globalConfig.rootDir, '.vscode', 'simulator-status.json');
    await this.ensureDirectoryExists(path.dirname(indicatorPath));
    fs.writeFileSync(
      indicatorPath,
      JSON.stringify(
        {
          connected: this.connectionStatus.isConnected,
          port: this.connectionStatus.port,
          mode: this.connectionStatus.fallbackMode ? 'mock' : 'live',
          lastUpdate: new Date().toISOString(),
        },
        null,
        2,
      ),
    );

    console.log(`📊 Simulator status updated for VS Code Test Explorer`);
  }

  /**
   * AC3.16: Get current simulator status for display
   */
  getSimulatorStatus() {
    if (this.connectionStatus.fallbackMode) {
      return this.connectionStatus.mockMode ? 'mock' : 'fallback';
    }

    return this.connectionStatus.isConnected ? 'connected' : 'disconnected';
  }

  /**
   * AC3.17: Get simulator capabilities for test planning
   */
  async getSimulatorCapabilities() {
    if (!this.simulatorClient || this.connectionStatus.fallbackMode) {
      return {
        scenarios: ['mock-basic-navigation'],
        protocols: ['NMEA0183-mock'],
        features: ['mock-data-injection'],
        mode: 'mock',
      };
    }

    try {
      return await this.simulatorClient.getCapabilities();
    } catch (error) {
      console.warn('Failed to get simulator capabilities:', error);
      return {
        scenarios: ['unknown'],
        protocols: ['unknown'],
        features: ['unknown'],
        error: error.message,
      };
    }
  }

  /**
   * AC3.18: Generate recommendations for test execution
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.connectionStatus.fallbackMode) {
      recommendations.push({
        type: 'warning',
        message:
          'Running in fallback mode. Start NMEA Bridge Simulator for full testing capabilities.',
        action: 'Run VS Code task: "Start NMEA Bridge: Scenario - Basic Navigation"',
      });
    }

    if (this.connectionStatus.retryAttempts > 0) {
      recommendations.push({
        type: 'info',
        message: `Connection instability detected (${this.connectionStatus.retryAttempts} retry attempts).`,
        action: 'Check simulator logs and network connectivity',
      });
    }

    if (!this.connectionStatus.isConnected && !this.connectionStatus.fallbackMode) {
      recommendations.push({
        type: 'error',
        message: 'No simulator connection available.',
        action: 'Start NMEA Bridge Simulator or check port availability',
      });
    }

    return recommendations;
  }

  /**
   * AC3.19: Assess test environment readiness
   */
  assessTestReadiness() {
    const readiness = {
      level: 'unknown',
      score: 0,
      factors: [],
    };

    // Connection factor
    if (this.connectionStatus.isConnected) {
      readiness.score += this.connectionStatus.fallbackMode ? 60 : 90;
      readiness.factors.push({
        factor: 'connection',
        status: this.connectionStatus.fallbackMode ? 'mock' : 'live',
        score: this.connectionStatus.fallbackMode ? 60 : 90,
      });
    } else {
      readiness.factors.push({
        factor: 'connection',
        status: 'disconnected',
        score: 0,
      });
    }

    // Stability factor
    const stabilityScore = Math.max(0, 100 - this.connectionStatus.retryAttempts * 20);
    readiness.score = (readiness.score + stabilityScore) / 2;
    readiness.factors.push({
      factor: 'stability',
      status: this.connectionStatus.retryAttempts === 0 ? 'stable' : 'unstable',
      score: stabilityScore,
    });

    // Determine readiness level
    if (readiness.score >= 80) readiness.level = 'ready';
    else if (readiness.score >= 60) readiness.level = 'limited';
    else if (readiness.score >= 40) readiness.level = 'degraded';
    else readiness.level = 'not-ready';

    return readiness;
  }

  /**
   * AC3.20: Generate warnings for VS Code Test Explorer
   */
  generateWarnings() {
    const warnings = [];

    if (this.connectionStatus.retryAttempts >= 3) {
      warnings.push({
        type: 'connection',
        severity: 'high',
        message: `Multiple connection failures (${this.connectionStatus.retryAttempts} attempts)`,
      });
    }

    if (this.connectionStatus.fallbackMode && !this.connectionStatus.mockMode) {
      warnings.push({
        type: 'capability',
        severity: 'medium',
        message: 'Limited testing capabilities in fallback mode',
      });
    }

    const lastCheck = this.connectionStatus.lastCheck;
    if (lastCheck) {
      const timeSinceCheck = Date.now() - new Date(lastCheck).getTime();
      if (timeSinceCheck > 30000) {
        // 30 seconds
        warnings.push({
          type: 'staleness',
          severity: 'medium',
          message: `Status data is stale (${Math.round(timeSinceCheck / 1000)}s old)`,
        });
      }
    }

    return warnings;
  }

  /**
   * Jest Reporter Interface: Called when test suite starts
   */
  async onRunStart(results, options) {
    await this.initializeSimulatorMonitoring();
  }

  /**
   * Jest Reporter Interface: Called when all tests are completed
   */
  async onRunComplete(contexts, results) {
    console.log('📡 Simulator Status Integration Summary:');
    console.log(`   Status: ${this.getSimulatorStatus()}`);
    console.log(`   Port: ${this.connectionStatus.port || 'N/A'}`);
    console.log(`   Retry Attempts: ${this.connectionStatus.retryAttempts}`);
    console.log(
      `   Mode: ${this.connectionStatus.fallbackMode ? 'Fallback/Mock' : 'Live Simulator'}`,
    );

    // Stop health monitoring
    if (this.statusMonitor) {
      clearInterval(this.statusMonitor);
    }

    // Final status update
    await this.updateVSCodeTestExplorerStatus();
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

  /**
   * Cleanup method for graceful shutdown
   */
  cleanup() {
    if (this.statusMonitor) {
      clearInterval(this.statusMonitor);
    }

    if (this.simulatorClient && typeof this.simulatorClient.disconnect === 'function') {
      this.simulatorClient.disconnect();
    }
  }
}

module.exports = SimulatorStatusIntegration;
