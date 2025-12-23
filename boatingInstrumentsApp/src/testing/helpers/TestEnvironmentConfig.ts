/**
 * PURPOSE: Test Environment Auto-Configuration for Story 11.3 AC3
 * REQUIREMENT: Automatic detection of available testing infrastructure
 * METHOD: Dynamic service discovery and test suite configuration
 */

import { isSimulatorAvailable } from './SimulatorTestClient';
import {
  Epic710SimulatorIntegration,
  getRecommendedTestScenarios,
} from './Epic710SimulatorIntegration';

export interface TestEnvironmentCapabilities {
  simulatorAvailable: boolean;
  webSocketSupported: boolean;
  apiControlSupported: boolean;
  performanceMonitoringEnabled: boolean;
  testTier: 'mock' | 'api-injection' | 'full-scenario';
  discoveredPorts: number[];
  recommendedTestSuites: string[];
}

export interface TestExecutionPlan {
  environment: 'mock' | 'simulator' | 'hybrid';
  enabledFeatures: string[];
  performanceThresholds: {
    discovery: number;
    injection: number;
    scenarioLoad: number;
  };
  testCategories: {
    unit: boolean;
    integration: boolean;
    e2e: boolean;
  };
}

export class TestEnvironmentConfig {
  private static instance: TestEnvironmentConfig;
  private capabilities: TestEnvironmentCapabilities | null = null;
  private lastDiscoveryTime: number = 0;
  private discoveryTtl: number = 30000; // Cache for 30 seconds

  /**
   * AC3.1: Automatic detection of available testing infrastructure
   */
  static getInstance(): TestEnvironmentConfig {
    if (!TestEnvironmentConfig.instance) {
      TestEnvironmentConfig.instance = new TestEnvironmentConfig();
    }
    return TestEnvironmentConfig.instance;
  }

  /**
   * AC3.1: Discover available testing services and capabilities
   */
  async discoverCapabilities(): Promise<TestEnvironmentCapabilities> {
    const now = Date.now();

    // Use cached result if still valid
    if (this.capabilities && now - this.lastDiscoveryTime < this.discoveryTtl) {
      return this.capabilities;
    }

    const discoveredPorts: number[] = [];
    let simulatorAvailable = false;
    let apiControlSupported = false;
    let webSocketSupported = false;

    // AC3.5: Integration with existing Epic 7/10 NMEA Bridge Simulator API
    const testPorts = [9090, 8080, 2000];

    for (const port of testPorts) {
      try {
        const available = await isSimulatorAvailable([port], 2000);
        if (available) {
          discoveredPorts.push(port);
          simulatorAvailable = true;

          // Check specific capabilities by port
          if (port === 9090) {
            apiControlSupported = await this.checkApiControlCapability(port);
          }
          if (port === 8080) {
            webSocketSupported = await this.checkWebSocketCapability(port);
          }
        }
      } catch (error) {}
    }

    // AC3.2: Dynamic test suite configuration based on available services
    let testTier: 'mock' | 'api-injection' | 'full-scenario' = 'mock';
    if (simulatorAvailable && apiControlSupported) {
      testTier = webSocketSupported ? 'full-scenario' : 'api-injection';
    }

    const recommendedTestSuites = this.getRecommendedTestSuites(testTier, discoveredPorts);

    // AC3.5: Integration with Epic 7/10 scenario recommendations
    try {
      const epic710Integration = new Epic710SimulatorIntegration();
      const scenarios = await getRecommendedTestScenarios({
        simulatorAvailable,
        webSocketSupported,
        apiControlSupported,
        testTier,
      });
    } catch (error) {
      console.warn('Epic 7/10 scenario integration warning:', error);
    }

    this.capabilities = {
      simulatorAvailable,
      webSocketSupported,
      apiControlSupported,
      performanceMonitoringEnabled: simulatorAvailable && apiControlSupported,
      testTier,
      discoveredPorts,
      recommendedTestSuites,
    };

    this.lastDiscoveryTime = now;

    return this.capabilities;
  }

  /**
   * AC3.3: Environment-specific test execution planning
   */
  async createExecutionPlan(): Promise<TestExecutionPlan> {
    const capabilities = await this.discoverCapabilities();

    let environment: 'mock' | 'simulator' | 'hybrid' = 'mock';
    const enabledFeatures: string[] = [];

    if (capabilities.simulatorAvailable) {
      if (capabilities.webSocketSupported && capabilities.apiControlSupported) {
        environment = 'simulator';
        enabledFeatures.push('real-time-data', 'scenario-execution', 'performance-monitoring');
      } else if (capabilities.apiControlSupported) {
        environment = 'hybrid';
        enabledFeatures.push('api-injection', 'scenario-execution');
      } else {
        environment = 'mock';
        enabledFeatures.push('mock-data-generation');
      }
    } else {
      enabledFeatures.push('offline-testing', 'mock-data-generation');
    }

    // Performance thresholds based on Story 11.3 requirements
    const performanceThresholds = {
      discovery: 5000, // 5-second timeout for discovery
      injection: 2000, // <2000ms per integration test scenario
      scenarioLoad: 2000, // <2000ms per integration test scenario
    };

    const testCategories = {
      unit: true, // Always available
      integration: capabilities.apiControlSupported,
      e2e: capabilities.testTier === 'full-scenario',
    };

    return {
      environment,
      enabledFeatures,
      performanceThresholds,
      testCategories,
    };
  }

  /**
   * AC2.3: Automatic test categorization based on simulator availability
   */
  async shouldRunTestSuite(suiteName: string): Promise<boolean> {
    const capabilities = await this.discoverCapabilities();

    const suiteRequirements: Record<string, (caps: TestEnvironmentCapabilities) => boolean> = {
      unit: () => true, // Always run unit tests
      mock: () => true, // Always run mock tests
      'integration-api': (caps) => caps.apiControlSupported,
      'integration-websocket': (caps) => caps.webSocketSupported,
      'e2e-full-scenario': (caps) => caps.testTier === 'full-scenario',
      performance: (caps) => caps.performanceMonitoringEnabled,
      'simulator-dependent': (caps) => caps.simulatorAvailable,
    };

    const requirement = suiteRequirements[suiteName];
    return requirement ? requirement(capabilities) : false;
  }

  /**
   * Get current capabilities (cached)
   */
  getCurrentCapabilities(): TestEnvironmentCapabilities | null {
    return this.capabilities;
  }

  /**
   * Force refresh of capabilities discovery
   */
  async refresh(): Promise<TestEnvironmentCapabilities> {
    this.capabilities = null;
    this.lastDiscoveryTime = 0;
    return this.discoverCapabilities();
  }

  // Private helper methods

  private async checkApiControlCapability(port: number): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${port}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async checkWebSocketCapability(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(`ws://localhost:${port}`);

        ws.onopen = () => {
          ws.close();
          resolve(true);
        };

        ws.onerror = () => resolve(false);

        // Timeout after 2 seconds
        setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            ws.close();
            resolve(false);
          }
        }, 2000);
      } catch {
        resolve(false);
      }
    });
  }

  private getRecommendedTestSuites(testTier: string, availablePorts: number[]): string[] {
    const suites: string[] = ['unit-tests', 'mock-tests']; // Always recommend basic tests

    switch (testTier) {
      case 'full-scenario':
        suites.push('e2e-tests', 'performance-tests', 'integration-websocket');
      // fallthrough
      case 'api-injection':
        suites.push('integration-api', 'scenario-tests');
        break;
      case 'mock':
        suites.push('offline-tests');
        break;
    }

    // Add port-specific test recommendations
    if (availablePorts.includes(9090)) {
      suites.push('simulator-control-api');
    }
    if (availablePorts.includes(8080)) {
      suites.push('websocket-integration');
    }

    return suites;
  }
}

/**
 * Convenience function for test files to check environment capabilities
 */
export async function getTestEnvironmentCapabilities(): Promise<TestEnvironmentCapabilities> {
  return TestEnvironmentConfig.getInstance().discoverCapabilities();
}

/**
 * Convenience function to create execution plan
 */
export async function createTestExecutionPlan(): Promise<TestExecutionPlan> {
  return TestEnvironmentConfig.getInstance().createExecutionPlan();
}

/**
 * Convenience function to check if a test suite should run
 */
export async function shouldRunTestSuite(suiteName: string): Promise<boolean> {
  return TestEnvironmentConfig.getInstance().shouldRunTestSuite(suiteName);
}
