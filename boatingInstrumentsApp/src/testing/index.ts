// Testing Infrastructure Index
// Centralized export point for all testing utilities and helpers

/**
 * Test Fixtures
 */
export * from './fixtures/nmeaFixtures';

/**
 * Mock Services
 */
export * from './mocks/mockNmeaService';
export * from './mocks/mockWidgetService';

/**
 * Test Helpers and Utilities
 */
export * from './helpers/testHelpers';

/**
 * Common Testing Patterns
 */

// Quick test setup for NMEA data testing
export { 
  renderWithProviders as renderWithNmeaData,
  createMockNmeaService as mockNmea,
  createTestNmeaData as testData,
} from './helpers/testHelpers';

// Performance testing utilities
export {
  PerformanceProfiler,
  measureMemoryUsage,
  mockTimers,
} from './helpers/testHelpers';

// Network simulation
export {
  NetworkSimulator,
  waitForCondition,
} from './helpers/testHelpers';

/**
 * Testing Configuration
 */
export const testConfig = {
  // Default timeouts
  defaultTimeout: 5000,
  renderTimeout: 1000,
  animationTimeout: 300,
  
  // Performance thresholds
  slowRenderThreshold: 16, // 16ms (60fps)
  memoryLeakThreshold: 50, // 50MB
  
  // Network simulation defaults
  defaultLatency: 100,
  defaultErrorRate: 0.1,
  
  // Data quality thresholds
  qualityThresholds: {
    excellent: { accuracy: 95, completeness: 90, freshness: 1000 },
    good: { accuracy: 85, completeness: 75, freshness: 3000 },
    fair: { accuracy: 70, completeness: 50, freshness: 5000 },
    poor: { accuracy: 50, completeness: 25, freshness: 10000 },
  },
  
  // Test data defaults
  defaultNmeaFields: [
    'latitude',
    'longitude', 
    'speed',
    'heading',
    'depth',
    'windSpeed',
    'windDirection'
  ],
  
  // Widget testing defaults
  defaultWidgetConfig: {
    position: { x: 0, y: 0 },
    dimensions: { width: 2, height: 2 },
    visible: true,
    enabled: true,
  },
};

/**
 * Test Utilities for specific domains
 */

// Navigation testing utilities
export const navigationTestUtils = {
  createGpsData: (lat: number, lon: number) => ({
    latitude: lat,
    longitude: lon,
    timestamp: Date.now(),
  }),
  
  createSpeedData: (speed: number, units: 'knots' | 'mph' | 'kph' = 'knots') => ({
    speed,
    timestamp: Date.now(),
  }),
  
  createCompassData: (heading: number) => ({
    heading: heading % 360,
    timestamp: Date.now(),
  }),
};

// Engine testing utilities  
export const engineTestUtils = {
  createEngineData: (rpm: number, temp: number) => ({
    engineRpm: rpm,
    engineTemperature: temp,
    timestamp: Date.now(),
  }),
  
  createFuelData: (level: number) => ({
    fuelLevel: Math.max(0, Math.min(100, level)),
    timestamp: Date.now(),
  }),
  
  createBatteryData: (voltage: number) => ({
    batteryVoltage: voltage,
    timestamp: Date.now(),
  }),
};

// Environmental testing utilities
export const environmentTestUtils = {
  createWindData: (speed: number, direction: number) => ({
    windSpeed: speed,
    windDirection: direction % 360,
    timestamp: Date.now(),
  }),
  
  createDepthData: (depth: number) => ({
    depth: Math.max(0, depth),
    timestamp: Date.now(),
  }),
  
  createTemperatureData: (water: number, air: number) => ({
    waterTemperature: water,
    airTemperature: air,
    timestamp: Date.now(),
  }),
};

// Autopilot testing utilities
export const autopilotTestUtils = {
  createAutopilotData: (
    status: 'standby' | 'active' | 'alarm',
    mode: 'compass' | 'wind' | 'nav',
    heading?: number
  ) => ({
    autopilotStatus: status,
    autopilotMode: mode,
    autopilotHeading: heading,
    timestamp: Date.now(),
  }),
  
  createStandbyState: () => autopilotTestUtils.createAutopilotData('standby', 'compass'),
  createActiveState: (heading: number) => autopilotTestUtils.createAutopilotData('active', 'compass', heading),
  createAlarmState: () => autopilotTestUtils.createAutopilotData('alarm', 'compass'),
};

/**
 * Test Assertions and Matchers
 */
export const testAssertions = {
  // Data quality assertions
  expectGoodDataQuality: (quality: any) => {
    expect(quality.accuracy).toBeGreaterThan(80);
    expect(quality.completeness).toBeGreaterThan(70);
    expect(quality.freshness).toBeLessThan(5000);
  },
  
  expectExcellentDataQuality: (quality: any) => {
    expect(quality.accuracy).toBeGreaterThan(95);
    expect(quality.completeness).toBeGreaterThan(90);
    expect(quality.freshness).toBeLessThan(1000);
  },
  
  // Performance assertions
  expectFastRender: (renderTime: number) => {
    expect(renderTime).toBeLessThan(testConfig.slowRenderThreshold);
  },
  
  expectNoMemoryLeak: (beforeUsage: number, afterUsage: number) => {
    const increase = afterUsage - beforeUsage;
    expect(increase).toBeLessThan(testConfig.memoryLeakThreshold);
  },
  
  // Data validation assertions
  expectValidCoordinates: (lat: number, lon: number) => {
    expect(lat).toBeGreaterThanOrEqual(-90);
    expect(lat).toBeLessThanOrEqual(90);
    expect(lon).toBeGreaterThanOrEqual(-180);
    expect(lon).toBeLessThanOrEqual(180);
  },
  
  expectValidSpeed: (speed: number) => {
    expect(speed).toBeGreaterThanOrEqual(0);
    expect(speed).toBeLessThan(100); // Reasonable max for marine vessels
  },
  
  expectValidHeading: (heading: number) => {
    expect(heading).toBeGreaterThanOrEqual(0);
    expect(heading).toBeLessThan(360);
  },
};

/**
 * Test Setup Helpers
 */
export const testSetup = {
  // Standard test environment setup
  setupTestEnvironment: () => {
    // Configure global test settings
    jest.setTimeout(testConfig.defaultTimeout);
    
    // Mock console methods to reduce noise
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Setup performance monitoring
    if (typeof global.performance === 'undefined') {
      global.performance = {
        now: () => Date.now(),
      } as any;
    }
  },
  
  // Cleanup after tests
  cleanupTestEnvironment: () => {
    jest.restoreAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  },
  
  // Setup for integration tests
  setupIntegrationTest: () => {
    testSetup.setupTestEnvironment();
    
    // Additional setup for integration testing
    // Mock native modules if needed
    jest.mock('react-native', () => ({
      Platform: { OS: 'ios' },
      Dimensions: {
        get: () => ({ width: 375, height: 667 }),
      },
    }));
  },
};