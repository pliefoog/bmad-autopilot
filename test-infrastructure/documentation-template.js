/**
 * Professional Test Documentation Template System
 * 
 * PURPOSE: Provide standardized TypeScript comment headers for professional marine software testing
 * REQUIREMENT: AC-11.4.1 - Test Documentation Template Implementation
 * METHOD: Template generation with PURPOSE/REQUIREMENT/METHOD/EXPECTED/ERROR CONDITIONS structure
 * EXPECTED: Consistent documentation across all test types (unit, integration, e2e)
 * ERROR CONDITIONS: Template validation failures, missing required fields, format violations
 */

/**
 * Template structure for professional test documentation headers
 */
const TEST_DOCUMENTATION_TEMPLATE = {
  /**
   * Generate standardized test documentation header
   * @param {Object} config - Test documentation configuration
   * @param {string} config.purpose - Explicit requirement linkage and test objective
   * @param {string} config.requirement - Link to specific FR/NFR (e.g., AC-11.4.1, FR-NAV-001)
   * @param {string} config.method - Test approach: 'static-mock' | 'api-injection' | 'scenario-execution' | 'mock-strategy'
   * @param {string} config.expected - Measurable outcomes and performance thresholds
   * @param {string} config.errorConditions - Specific failure modes and recovery validation
   * @returns {string} Formatted TypeScript comment header
   */
  generateHeader: (config) => {
    validateTemplateConfig(config);
    
    return `/**
 * ${config.testName || 'Test Case'}
 * 
 * PURPOSE: ${config.purpose}
 * REQUIREMENT: ${config.requirement}
 * METHOD: ${config.method}
 * EXPECTED: ${config.expected}
 * ERROR CONDITIONS: ${config.errorConditions}
 */`;
  },

  /**
   * Generate unit test template with marine domain focus
   */
  generateUnitTestTemplate: (config) => {
    const header = TEST_DOCUMENTATION_TEMPLATE.generateHeader({
      ...config,
      method: config.method || 'static-mock'
    });
    
    return `${header}
describe('${config.componentName}', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('${config.testSuite}', () => {
    it('${config.testDescription}', async () => {
      // ARRANGE: ${config.arrangeDescription || 'Setup test conditions'}
      
      // ACT: ${config.actDescription || 'Execute test action'}
      
      // ASSERT: ${config.assertDescription || 'Verify expected outcomes'}
    });
  });
});`;
  },

  /**
   * Generate integration test template with NMEA Bridge Simulator integration
   */
  generateIntegrationTestTemplate: (config) => {
    const header = TEST_DOCUMENTATION_TEMPLATE.generateHeader({
      ...config,
      method: config.method || 'api-injection'
    });
    
    return `${header}
describe('${config.componentName} Integration', () => {
  let simulatorClient;

  beforeAll(async () => {
    // Story 11.3: Automatic Simulator Discovery integration
    simulatorClient = new SimulatorTestClient();
    await simulatorClient.connect();
  });

  afterAll(async () => {
    await simulatorClient?.disconnect();
  });

  describe('${config.testSuite}', () => {
    it('${config.testDescription}', async () => {
      // ARRANGE: ${config.arrangeDescription || 'Setup NMEA simulation scenario'}
      
      // ACT: ${config.actDescription || 'Execute integration test with real NMEA data'}
      
      // ASSERT: ${config.assertDescription || 'Verify marine domain accuracy and performance thresholds'}
      
      // PERFORMANCE: Verify <16ms widget updates, <100ms data latency, <50MB memory
    });
  });
});`;
  },

  /**
   * Generate e2e test template with full scenario integration
   */
  generateE2ETestTemplate: (config) => {
    const header = TEST_DOCUMENTATION_TEMPLATE.generateHeader({
      ...config,
      method: config.method || 'scenario-execution'
    });
    
    return `${header}
describe('${config.componentName} E2E', () => {
  describe('${config.testSuite}', () => {
    it('${config.testDescription}', async () => {
      // SCENARIO: ${config.scenarioDescription || 'End-to-end user workflow'}
      
      // NAVIGATION: ${config.navigationSteps || 'User interaction flow'}
      
      // VALIDATION: ${config.validationSteps || 'Complete workflow verification'}
      
      // MARINE SAFETY: Verify 99.5% crash-free session rate compliance
    });
  });
});`;
  }
};

/**
 * Template validation utilities for consistent format enforcement
 */
function validateTemplateConfig(config) {
  const requiredFields = ['purpose', 'requirement', 'method', 'expected', 'errorConditions'];
  const missingFields = requiredFields.filter(field => !config[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required template fields: ${missingFields.join(', ')}`);
  }

  // Validate requirement format (AC-X.Y.Z or FR/NFR-XXX-YYY)
  const requirementPattern = /^(AC-\d+\.\d+(\.\d+)?|(FR|NFR)-[A-Z][A-Z0-9]*-\d+)$/;
  if (!requirementPattern.test(config.requirement)) {
    throw new Error(`Invalid requirement format: ${config.requirement}. Expected AC-X.Y.Z or FR/NFR-XXX-YYY`);
  }

  // Validate method type
  const validMethods = ['static-mock', 'api-injection', 'scenario-execution', 'mock-strategy'];
  if (!validMethods.includes(config.method)) {
    throw new Error(`Invalid method: ${config.method}. Must be one of: ${validMethods.join(', ')}`);
  }
}

/**
 * Performance threshold constants for marine domain testing
 */
const MARINE_PERFORMANCE_THRESHOLDS = {
  WIDGET_UPDATE_MAX_MS: 16,      // <16ms widget updates
  DATA_LATENCY_MAX_MS: 100,      // <100ms data latency  
  MEMORY_USAGE_MAX_MB: 50,       // <50MB memory usage
  CRASH_FREE_RATE_MIN: 0.995,    // 99.5% crash-free session rate
  FALSE_POSITIVE_RATE_MAX: 0.01, // <1% false positive rate
  FALSE_NEGATIVE_RATE_MAX: 0.001 // <0.1% false negative rate
};

/**
 * Marine safety error condition templates
 */
const MARINE_SAFETY_CONDITIONS = {
  DEPTH_ALARM_FAILURE: 'Depth alarm system failure - validate shallow water detection and audio alert functionality',
  AUTOPILOT_DISENGAGEMENT: 'Autopilot unexpected disengagement - verify manual override and safety notifications',
  GPS_SIGNAL_LOSS: 'GPS signal loss in navigation critical scenarios - validate dead reckoning fallback',
  ENGINE_OVERHEAT: 'Engine temperature exceeding safe operating limits - verify alarm escalation and shutdown procedures',
  BATTERY_CRITICAL: 'Battery voltage drop below operational threshold - validate power management and backup systems',
  WIND_SENSOR_FAILURE: 'Wind direction/speed sensor malfunction - verify sailing performance impact and warnings'
};

/**
 * Export template system for Jest and React Native Testing Library integration
 */
module.exports = {
  TEST_DOCUMENTATION_TEMPLATE,
  validateTemplateConfig,
  MARINE_PERFORMANCE_THRESHOLDS,
  MARINE_SAFETY_CONDITIONS,
  
  // Convenience functions for different test types
  generateUnitTest: TEST_DOCUMENTATION_TEMPLATE.generateUnitTestTemplate,
  generateIntegrationTest: TEST_DOCUMENTATION_TEMPLATE.generateIntegrationTestTemplate,
  generateE2ETest: TEST_DOCUMENTATION_TEMPLATE.generateE2ETestTemplate,
  
  /**
   * Template usage guide generator
   */
  generateUsageGuide: () => {
    return `
# Professional Test Documentation Template Usage Guide

## Overview
This template system ensures all test cases meet professional marine software development standards with comprehensive requirement traceability.

## Template Structure
Each test must include a standardized TypeScript comment header with:
- **PURPOSE**: Explicit requirement linkage and test objective
- **REQUIREMENT**: Link to specific FR/NFR (e.g., AC-11.4.1, FR-NAV-001)
- **METHOD**: Test approach (static-mock, api-injection, scenario-execution, mock-strategy)
- **EXPECTED**: Measurable outcomes and performance thresholds
- **ERROR CONDITIONS**: Specific failure modes and recovery validation

## Usage Examples

### Unit Test Example
\`\`\`javascript
const { generateUnitTest } = require('../../../test-infrastructure/documentation-template');

const unitTestTemplate = generateUnitTest({
  testName: 'Depth Widget Unit Test',
  purpose: 'Verify depth display accuracy and unit conversion functionality for marine navigation safety',
  requirement: 'FR-NAV-001',
  method: 'static-mock',
  expected: 'Accurate depth readings in meters/feet/fathoms with <16ms render time',
  errorConditions: 'Invalid depth values, sensor disconnection, unit conversion failures',
  componentName: 'DepthWidget',
  testSuite: 'Unit Conversions',
  testDescription: 'should convert meters to feet correctly'
});
\`\`\`

### Integration Test Example
\`\`\`javascript
const { generateIntegrationTest } = require('../../../test-infrastructure/documentation-template');

const integrationTestTemplate = generateIntegrationTest({
  testName: 'NMEA Bridge Integration Test',
  purpose: 'Validate real-time NMEA data processing and widget state synchronization',
  requirement: 'AC-11.4.2',
  method: 'api-injection',
  expected: 'Real-time data updates with <100ms latency and accurate marine instrument displays',
  errorConditions: 'NMEA parsing errors, WebSocket disconnection, data corruption scenarios',
  componentName: 'NmeaDataProcessor',
  testSuite: 'Real-time Data Processing',
  testDescription: 'should process depth sentences and update widget state'
});
\`\`\`

## Performance Thresholds
All tests must validate against marine domain performance requirements:
- Widget updates: <16ms
- Data latency: <100ms  
- Memory usage: <50MB
- Crash-free rate: 99.5%

## Marine Safety Focus
Error condition documentation must cover marine safety scenarios and link to the 99.5% crash-free session rate target.
`;
  }
};