/**
 * PURPOSE: Test Environment Setup for Story 11.3 AC2/AC3
 * REQUIREMENT: VS Code Test Explorer integration with automatic test categorization
 * METHOD: Global test environment detection and dynamic test configuration
 */

import { TestEnvironmentConfig, TestEnvironmentCapabilities, TestExecutionPlan } from '../src/testing/helpers/TestEnvironmentConfig';

// Global test environment state
let testEnvironment: TestEnvironmentCapabilities | null = null;
let executionPlan: TestExecutionPlan | null = null;

/**
 * AC2.1: Simulator connection status display in test explorer UI
 * AC3.1: Automatic detection of available testing infrastructure
 */
beforeAll(async () => {
  console.log('🔧 Setting up test environment for Story 11.3...');
  
  try {
    const config = TestEnvironmentConfig.getInstance();
    
    // Discover capabilities with shorter timeout for Jest
    testEnvironment = await config.discoverCapabilities();
    executionPlan = await config.createExecutionPlan();
    
    // AC2.2: Real-time availability indicators with color coding
    const statusIcon = testEnvironment.simulatorAvailable ? '🟢' : '🔴';
    const modeText = testEnvironment.testTier.toUpperCase();
    
    console.log(`${statusIcon} Test Environment Status: ${modeText}`);
    console.log(`📡 Simulator Available: ${testEnvironment.simulatorAvailable}`);
    console.log(`🔌 WebSocket Supported: ${testEnvironment.webSocketSupported}`);
    console.log(`🎛️ API Control: ${testEnvironment.apiControlSupported}`);
    console.log(`📊 Performance Monitoring: ${testEnvironment.performanceMonitoringEnabled}`);
    console.log(`🔍 Discovered Ports: [${testEnvironment.discoveredPorts.join(', ')}]`);
    
    // AC2.3: Automatic test categorization based on simulator availability
    console.log(`🏷️ Test Categories Enabled:`, {
      unit: executionPlan.testCategories.unit,
      integration: executionPlan.testCategories.integration,
      e2e: executionPlan.testCategories.e2e
    });
    
    // Store in global for test access
    (global as any).testEnvironment = testEnvironment;
    (global as any).executionPlan = executionPlan;
    
  } catch (error) {
    console.warn('⚠️ Test environment detection failed, using mock mode:', error);
    
    // Fallback to mock configuration
    testEnvironment = {
      simulatorAvailable: false,
      webSocketSupported: false,
      apiControlSupported: false,
      performanceMonitoringEnabled: false,
      testTier: 'mock',
      discoveredPorts: [],
      recommendedTestSuites: ['unit-tests', 'mock-tests']
    };
    
    executionPlan = {
      environment: 'mock',
      enabledFeatures: ['offline-testing', 'mock-data-generation'],
      performanceThresholds: {
        discovery: 5000,
        injection: 2000,
        scenarioLoad: 2000
      },
      testCategories: {
        unit: true,
        integration: false,
        e2e: false
      }
    };
    
    (global as any).testEnvironment = testEnvironment;
    (global as any).executionPlan = executionPlan;
    
    console.log('🔴 Mock mode activated for testing');
  }
}, 30000); // Extended timeout for environment discovery

/**
 * AC3.4: Robust error handling and recovery mechanisms
 */
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  
  // Clean up global state
  (global as any).testEnvironment = null;
  (global as any).executionPlan = null;
});

/**
 * Custom Jest matchers for Story 11.3 testing capabilities
 */
expect.extend({
  /**
   * AC2.4: Performance monitoring integration with threshold warnings
   */
  toMeetPerformanceThreshold(received: number, thresholdType: 'discovery' | 'injection' | 'scenarioLoad') {
    const plan = (global as any).executionPlan as TestExecutionPlan;
    const threshold = plan?.performanceThresholds[thresholdType] || 5000;
    
    const pass = received <= threshold;
    
    return {
      message: () => 
        `Expected ${thresholdType} time ${received}ms ${pass ? 'not ' : ''}to be within threshold ${threshold}ms`,
      pass,
    };
  },
  
  /**
   * AC2.3: Test categorization validation
   */
  toBeAvailableInEnvironment(received: string) {
    const env = (global as any).testEnvironment as TestEnvironmentCapabilities;
    
    let available = false;
    switch (received) {
      case 'simulator':
        available = env?.simulatorAvailable || false;
        break;
      case 'websocket':
        available = env?.webSocketSupported || false;
        break;
      case 'api-control':
        available = env?.apiControlSupported || false;
        break;
      case 'performance-monitoring':
        available = env?.performanceMonitoringEnabled || false;
        break;
      default:
        available = false;
    }
    
    return {
      message: () => 
        `Expected ${received} ${available ? 'not ' : ''}to be available in test environment`,
      pass: available,
    };
  }
});

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toMeetPerformanceThreshold(thresholdType: 'discovery' | 'injection' | 'scenarioLoad'): R;
      toBeAvailableInEnvironment(): R;
    }
  }
}

/**
 * Helper functions available to all tests
 */

/**
 * Skip test if simulator not available
 */
export function skipIfNoSimulator() {
  const env = (global as any).testEnvironment as TestEnvironmentCapabilities;
  if (!env?.simulatorAvailable) {
    return test.skip;
  }
  return test;
}

/**
 * Skip test if in mock mode
 */
export function skipIfMockMode() {
  const env = (global as any).testEnvironment as TestEnvironmentCapabilities;
  if (env?.testTier === 'mock') {
    return test.skip;
  }
  return test;
}

/**
 * Skip test if WebSocket not supported
 */
export function skipIfNoWebSocket() {
  const env = (global as any).testEnvironment as TestEnvironmentCapabilities;
  if (!env?.webSocketSupported) {
    return test.skip;
  }
  return test;
}

/**
 * Conditional test execution based on capabilities
 */
export function testIf(condition: (env: TestEnvironmentCapabilities) => boolean) {
  const env = (global as any).testEnvironment as TestEnvironmentCapabilities;
  if (env && condition(env)) {
    return test;
  }
  return test.skip;
}

/**
 * Get current test environment capabilities
 */
export function getTestEnvironment(): TestEnvironmentCapabilities | null {
  return (global as any).testEnvironment;
}

/**
 * Get current execution plan
 */
export function getExecutionPlan(): TestExecutionPlan | null {
  return (global as any).executionPlan;
}