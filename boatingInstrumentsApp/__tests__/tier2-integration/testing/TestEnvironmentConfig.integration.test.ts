/**
 * PURPOSE: Integration Tests for Story 11.3 Test Environment Auto-Configuration
 * REQUIREMENT: AC3 - Test Environment Auto-Configuration (Infrastructure)
 * METHOD: Real environment discovery and dynamic test suite configuration
 * EXPECTED: <2000ms per test, infrastructure detection validation
 */

import { TestEnvironmentConfig, getTestEnvironmentCapabilities, createTestExecutionPlan, shouldRunTestSuite } from '../../../src/testing/helpers/TestEnvironmentConfig';
import { Epic710SimulatorIntegration, getEpic710ScenarioLibrary } from '../../../src/testing/helpers/Epic710SimulatorIntegration';
import { getTestEnvironment, skipIfNoSimulator, testIf } from '../../setup-test-environment';

describe('Test Environment Auto-Configuration (AC3)', () => {
  let envConfig: TestEnvironmentConfig;

  beforeEach(() => {
    envConfig = TestEnvironmentConfig.getInstance();
  });

  describe('AC3.1: Automatic detection of available testing infrastructure', () => {
    it('should discover simulator services within performance threshold', async () => {
      const startTime = Date.now();
      
      const capabilities = await envConfig.discoverCapabilities();
      
      const discoveryTime = Date.now() - startTime;
      expect(discoveryTime).toMeetPerformanceThreshold('discovery');
      
      expect(capabilities).toBeDefined();
      expect(capabilities).toHaveProperty('simulatorAvailable');
      expect(capabilities).toHaveProperty('webSocketSupported');
      expect(capabilities).toHaveProperty('apiControlSupported');
      expect(capabilities).toHaveProperty('testTier');
      expect(capabilities).toHaveProperty('discoveredPorts');
      
      expect(['mock', 'api-injection', 'full-scenario']).toContain(capabilities.testTier);
    });

    it('should detect ports [9090, 8080] when simulator is available', async () => {
      const capabilities = await envConfig.discoverCapabilities();
      
      if (capabilities.simulatorAvailable) {
        expect(capabilities.discoveredPorts).toEqual(expect.arrayContaining([expect.any(Number)]));
        
        // At least one port should be discovered if simulator is available
        expect(capabilities.discoveredPorts.length).toBeGreaterThan(0);
        
        // Check for expected ports
        const expectedPorts = [9090, 8080, 2000];
        const hasExpectedPort = expectedPorts.some(port => 
          capabilities.discoveredPorts.includes(port)
        );
        expect(hasExpectedPort).toBe(true);
      } else {
        expect(capabilities.discoveredPorts).toHaveLength(0);
      }
    });

    it('should cache capabilities for performance', async () => {
      // First call
      const start1 = Date.now();
      const capabilities1 = await envConfig.discoverCapabilities();
      const time1 = Date.now() - start1;
      
      // Second call (should use cache)
      const start2 = Date.now();
      const capabilities2 = await envConfig.discoverCapabilities();
      const time2 = Date.now() - start2;
      
      expect(capabilities1).toEqual(capabilities2);
      expect(time2).toBeLessThan(time1); // Cached call should be faster
      expect(time2).toBeLessThan(100); // Should be very fast from cache
    });

    it('should force refresh capabilities when requested', async () => {
      const capabilities1 = await envConfig.discoverCapabilities();
      const refreshed = await envConfig.refresh();
      
      // Should have same structure but could have different values if environment changed
      expect(refreshed).toHaveProperty('simulatorAvailable');
      expect(refreshed).toHaveProperty('testTier');
    });
  });

  describe('AC3.2: Dynamic test suite configuration based on available services', () => {
    it('should create appropriate execution plan for each test tier', async () => {
      const capabilities = await envConfig.discoverCapabilities();
      const executionPlan = await envConfig.createExecutionPlan();
      
      expect(executionPlan).toBeDefined();
      expect(executionPlan).toHaveProperty('environment');
      expect(executionPlan).toHaveProperty('enabledFeatures');
      expect(executionPlan).toHaveProperty('performanceThresholds');
      expect(executionPlan).toHaveProperty('testCategories');
      
      // Validate performance thresholds match Story 11.3 requirements
      expect(executionPlan.performanceThresholds.discovery).toBe(5000);
      expect(executionPlan.performanceThresholds.injection).toBe(2000);
      expect(executionPlan.performanceThresholds.scenarioLoad).toBe(2000);
      
      // Environment should match capabilities
      if (capabilities.testTier === 'full-scenario') {
        expect(executionPlan.environment).toBe('simulator');
        expect(executionPlan.testCategories.e2e).toBe(true);
      } else if (capabilities.testTier === 'api-injection') {
        expect(executionPlan.environment).toBe('hybrid');
        expect(executionPlan.testCategories.integration).toBe(true);
      } else {
        expect(executionPlan.environment).toBe('mock');
        expect(executionPlan.testCategories.unit).toBe(true);
      }
    });

    it('should recommend appropriate test suites based on capabilities', async () => {
      const capabilities = await envConfig.discoverCapabilities();
      
      // Test different suite types
      const unitShouldRun = await envConfig.shouldRunTestSuite('unit');
      expect(unitShouldRun).toBe(true); // Unit tests always run
      
      const mockShouldRun = await envConfig.shouldRunTestSuite('mock');
      expect(mockShouldRun).toBe(true); // Mock tests always run
      
      const integrationApiShouldRun = await envConfig.shouldRunTestSuite('integration-api');
      expect(integrationApiShouldRun).toBe(capabilities.apiControlSupported);
      
      const e2eShouldRun = await envConfig.shouldRunTestSuite('e2e-full-scenario');
      expect(e2eShouldRun).toBe(capabilities.testTier === 'full-scenario');
      
      const performanceShouldRun = await envConfig.shouldRunTestSuite('performance');
      expect(performanceShouldRun).toBe(capabilities.performanceMonitoringEnabled);
    });
  });

  describe('AC3.3: Environment-specific test execution planning', () => {
    it('should configure features based on available infrastructure', async () => {
      const executionPlan = await createTestExecutionPlan();
      
      expect(executionPlan.enabledFeatures).toBeInstanceOf(Array);
      expect(executionPlan.enabledFeatures.length).toBeGreaterThan(0);
      
      // All environments should support offline-testing or mock-data-generation
      const hasBasicFeatures = executionPlan.enabledFeatures.some(feature =>
        ['offline-testing', 'mock-data-generation', 'api-injection', 'real-time-data'].includes(feature)
      );
      expect(hasBasicFeatures).toBe(true);
    });

    it('should provide convenience functions for test usage', async () => {
      const capabilities = await getTestEnvironmentCapabilities();
      expect(capabilities).toBeDefined();
      
      const executionPlan = await createTestExecutionPlan();
      expect(executionPlan).toBeDefined();
      
      const shouldRunUnit = await shouldRunTestSuite('unit');
      expect(shouldRunUnit).toBe(true);
      
      const shouldRunMock = await shouldRunTestSuite('mock');
      expect(shouldRunMock).toBe(true);
    });
  });

  describe('AC3.4: Robust error handling and recovery mechanisms', () => {
    it('should handle network errors gracefully during discovery', async () => {
      // Force a refresh to test error handling
      const originalFetch = global.fetch;
      
      // Mock network failure
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      try {
        const capabilities = await envConfig.refresh();
        
        // Should fallback gracefully to mock mode
        expect(capabilities.simulatorAvailable).toBe(false);
        expect(capabilities.testTier).toBe('mock');
        expect(capabilities.recommendedTestSuites).toContain('mock-tests');
        
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should provide meaningful error messages for debugging', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Force an error condition
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));
      
      await envConfig.refresh();
      
      // Should have logged helpful warnings
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      global.fetch = originalFetch;
    });

    it('should maintain stable operation when partial services are available', async () => {
      // This test validates resilience when some but not all services are available
      const capabilities = await envConfig.discoverCapabilities();
      
      // Environment should be stable regardless of partial availability
      expect(capabilities.testTier).toBeDefined();
      expect(['mock', 'api-injection', 'full-scenario']).toContain(capabilities.testTier);
      
      // Should always have some recommended test suites
      expect(capabilities.recommendedTestSuites.length).toBeGreaterThan(0);
    });
  });

  describe('AC3.5: Integration with existing Epic 7/10 NMEA Bridge Simulator API', () => {
    let epic710Integration: Epic710SimulatorIntegration;

    beforeEach(() => {
      epic710Integration = new Epic710SimulatorIntegration();
    });

    it('should load Epic 7/10 scenario library', async () => {
      const library = await getEpic710ScenarioLibrary();
      
      expect(library).toBeDefined();
      expect(library).toHaveProperty('basePath');
      expect(library).toHaveProperty('categories');
      expect(library).toHaveProperty('totalScenarios');
      expect(library).toHaveProperty('availableScenarios');
      expect(library).toHaveProperty('epic11Scenarios');
      
      expect(library.categories.length).toBeGreaterThan(0);
      expect(library.availableScenarios.length).toBeGreaterThan(0);
    });

    it('should provide scenarios categorized by marine domain', async () => {
      const library = await epic710Integration.loadScenarioLibrary();
      
      const expectedCategories = [
        'navigation', 'autopilot', 'engine', 'environmental', 
        'epic-11-widget-testing', 'story-validation'
      ];
      
      const hasExpectedCategories = expectedCategories.some(category =>
        library.categories.includes(category)
      );
      expect(hasExpectedCategories).toBe(true);
    });

    it('should get scenarios by category for targeted testing', async () => {
      const navigationScenarios = await epic710Integration.getScenariosByCategory('navigation');
      const autopilotScenarios = await epic710Integration.getScenariosByCategory('autopilot');
      
      // Each category should return an array (could be empty if no scenarios exist)
      expect(Array.isArray(navigationScenarios)).toBe(true);
      expect(Array.isArray(autopilotScenarios)).toBe(true);
      
      // If scenarios exist, they should have proper structure
      if (navigationScenarios.length > 0) {
        const scenario = navigationScenarios[0];
        expect(scenario).toHaveProperty('name');
        expect(scenario).toHaveProperty('category');
        expect(scenario).toHaveProperty('path');
      }
    });

    it('should provide recommended scenarios based on test capabilities', async () => {
      const capabilities = await envConfig.discoverCapabilities();
      const recommendations = await epic710Integration.getRecommendedScenarios(capabilities);
      
      expect(Array.isArray(recommendations)).toBe(true);
      
      // Should recommend appropriate scenarios based on test tier
      if (capabilities.testTier === 'full-scenario') {
        expect(recommendations.length).toBeGreaterThan(0);
      }
    });

    it('should maintain compatibility with existing simulator configuration', () => {
      const config = epic710Integration.getSimulatorConfig();
      
      expect(config).toBeDefined();
      expect(config.apiPort).toBe(9090);
      expect(config.wsPort).toBe(8080);
      expect(config.tcpPort).toBe(2000);
      expect(config.bindHost).toBe('0.0.0.0');
      expect(config.defaultScenarios).toContain('basic-navigation');
    });

    testIf((env) => env.simulatorAvailable)('should validate scenario compatibility with live simulator', async () => {
      const basicScenarios = await epic710Integration.getBasicTestScenarios();
      
      if (basicScenarios.length > 0) {
        const isCompatible = await epic710Integration.validateScenarioCompatibility(basicScenarios[0].name);
        expect(typeof isCompatible).toBe('boolean');
      }
    });
  });
});