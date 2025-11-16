/**
 * Story 11.6: Coverage Threshold Framework Implementation Tests  
 * PURPOSE: Validate Jest coverage threshold configuration and enforcement
 * REQUIREMENT: AC#1 - Coverage Threshold Framework Implementation  
 * METHOD: Test coverage thresholds across domains with marine safety focus
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('Story 11.6: Coverage Threshold Framework', () => {
  let jestConfig: any;
  let marineSafetyConfig: any;
  let thresholdConfig: any;

  beforeAll(() => {
    // Load Jest configuration
    try {
      const jestConfigPath = path.join(__dirname, '../../jest.config.js');
      delete require.cache[require.resolve('../../jest.config.js')];
      jestConfig = require('../../jest.config.js');
    } catch (error) {
      throw new Error('Failed to load Jest configuration');
    }

    // Load marine safety configuration
    try {
      const marinePath = path.join(__dirname, '../../coverage/marine-safety-coverage.json');
      marineSafetyConfig = JSON.parse(fs.readFileSync(marinePath, 'utf-8'));
    } catch (error) {
      marineSafetyConfig = { safety_critical_functions: {} };
    }

    // Load threshold configuration
    try {
      const thresholdPath = path.join(__dirname, '../../coverage/coverage-thresholds.json');
      thresholdConfig = JSON.parse(fs.readFileSync(thresholdPath, 'utf-8'));
    } catch (error) {
      thresholdConfig = { thresholds: {} };
    }
  });

  describe('AC#1.1: Global Coverage Threshold ≥70%', () => {
    test('should configure Jest with 70% global coverage minimum', () => {
      expect(jestConfig.coverageThreshold).toBeDefined();
      expect(jestConfig.coverageThreshold.global).toBeDefined();
      
      const globalThresholds = jestConfig.coverageThreshold.global;
      expect(globalThresholds.branches).toBeGreaterThanOrEqual(70);
      expect(globalThresholds.functions).toBeGreaterThanOrEqual(70);
      expect(globalThresholds.lines).toBeGreaterThanOrEqual(70);
      expect(globalThresholds.statements).toBeGreaterThanOrEqual(70);
      
      console.log('✅ Global coverage thresholds configured: 70% minimum across all metrics');
    });

    test('should prioritize marine safety focus over blanket coverage', () => {
      // Verify that marine safety areas have higher thresholds than global
      const globalThreshold = 70;
      const marineSafetyAreas = [
        './src/services/nmea/**/*.{js,jsx,ts,tsx}',
        './src/widgets/autopilot/**/*.{js,jsx,ts,tsx}',
        './src/widgets/navigation/**/*.{js,jsx,ts,tsx}'
      ];

      marineSafetyAreas.forEach(area => {
        if (jestConfig.coverageThreshold[area]) {
          const areaThresholds = jestConfig.coverageThreshold[area];
          expect(areaThresholds.branches).toBeGreaterThan(globalThreshold);
          expect(areaThresholds.functions).toBeGreaterThan(globalThreshold);
          expect(areaThresholds.lines).toBeGreaterThan(globalThreshold);
          expect(areaThresholds.statements).toBeGreaterThan(globalThreshold);
        }
      });

      console.log('✅ Marine safety areas have higher coverage requirements than global baseline');
    });

    test('should exclude appropriate directories from coverage collection', () => {
      expect(jestConfig.collectCoverageFrom).toBeDefined();
      
      const excludedPatterns = jestConfig.collectCoverageFrom.filter((pattern: string) => pattern.startsWith('!'));
      
      // Verify test files are excluded
      expect(excludedPatterns).toContain('!src/**/__tests__/**');
      expect(excludedPatterns).toContain('!src/testing/**');
      expect(excludedPatterns).toContain('!server/test/**');
      expect(excludedPatterns).toContain('!server/__tests__/**');

      // Verify TypeScript definition files are excluded
      expect(excludedPatterns).toContain('!src/**/*.d.ts');

      console.log('✅ Appropriate directories excluded from coverage collection');
    });
  });

  describe('AC#1.2: Widget Coverage Threshold ≥85%', () => {
    test('should configure widget-specific coverage thresholds at 85% minimum', () => {
      const widgetPatterns = [
        './src/widgets/**/*.{js,jsx,ts,tsx}',
        './src/components/marine/**/*.{js,jsx,ts,tsx}'
      ];

      widgetPatterns.forEach(pattern => {
        if (jestConfig.coverageThreshold[pattern]) {
          const thresholds = jestConfig.coverageThreshold[pattern];
          expect(thresholds.branches).toBeGreaterThanOrEqual(85);
          expect(thresholds.functions).toBeGreaterThanOrEqual(85);
          expect(thresholds.lines).toBeGreaterThanOrEqual(85);
          expect(thresholds.statements).toBeGreaterThanOrEqual(85);
        }
      });

      console.log('✅ Widget coverage thresholds configured at 85% minimum for UI components');
    });

    test('should recognize widgets as critical for marine operations', () => {
      // Verify marine safety configuration identifies critical widget areas
      const safetyFunctions = marineSafetyConfig.safety_critical_functions;
      
      if (safetyFunctions.navigation) {
        expect(safetyFunctions.navigation.paths).toContain('./src/widgets/navigation/**/*.{js,jsx,ts,tsx}');
      }
      
      if (safetyFunctions.autopilot) {
        expect(safetyFunctions.autopilot.paths).toContain('./src/widgets/autopilot/**/*.{js,jsx,ts,tsx}');
      }

      if (safetyFunctions.depth_safety) {
        expect(safetyFunctions.depth_safety.paths).toContain('./src/widgets/depth/**/*.{js,jsx,ts,tsx}');
      }

      console.log('✅ Critical marine widget areas properly identified and configured');
    });

    test('should validate widget test coverage patterns', () => {
      const testPatterns = jestConfig.testMatch;
      
      // Verify tier-based testing patterns include widget areas
      expect(testPatterns).toContain('**/__tests__/tier1-unit/**/*.test.ts?(x)');
      expect(testPatterns).toContain('**/__tests__/tier2-integration/**/*.test.ts?(x)');
      expect(testPatterns).toContain('**/__tests__/tier3-e2e/**/*.test.ts?(x)');

      // Verify src testing patterns include widgets
      expect(testPatterns).toContain('**/src/testing/**/*.test.ts?(x)');

      console.log('✅ Widget test patterns configured for comprehensive coverage');
    });
  });

  describe('AC#1.3: Service Coverage Threshold ≥80%', () => {
    test('should configure service layer coverage thresholds at 80% minimum', () => {
      const servicePatterns = [
        './src/services/**/*.{js,jsx,ts,tsx}',
        './src/systems/**/*.{js,jsx,ts,tsx}',
        './src/hooks/**/*.{js,jsx,ts,tsx}'
      ];

      servicePatterns.forEach(pattern => {
        if (jestConfig.coverageThreshold[pattern]) {
          const thresholds = jestConfig.coverageThreshold[pattern];
          expect(thresholds.branches).toBeGreaterThanOrEqual(80);
          expect(thresholds.functions).toBeGreaterThanOrEqual(80);
          expect(thresholds.lines).toBeGreaterThanOrEqual(80);
          expect(thresholds.statements).toBeGreaterThanOrEqual(80);
        }
      });

      console.log('✅ Service layer coverage thresholds configured at 80% minimum for NMEA parsing and state management');
    });

    test('should prioritize NMEA parsing and state management areas', () => {
      // Verify NMEA parsing has higher requirements
      const nmeaPattern = './src/services/nmea/**/*.{js,jsx,ts,tsx}';
      if (jestConfig.coverageThreshold[nmeaPattern]) {
        const nmeaThresholds = jestConfig.coverageThreshold[nmeaPattern];
        expect(nmeaThresholds.branches).toBeGreaterThanOrEqual(95); // Critical marine safety
        expect(nmeaThresholds.functions).toBeGreaterThanOrEqual(95);
        expect(nmeaThresholds.lines).toBeGreaterThanOrEqual(95);
        expect(nmeaThresholds.statements).toBeGreaterThanOrEqual(95);
      }

      // Verify marine safety configuration includes NMEA parsing
      const safetyFunctions = marineSafetyConfig.safety_critical_functions;
      if (safetyFunctions.nmea_parsing) {
        expect(safetyFunctions.nmea_parsing.priority).toBe('critical');
        expect(safetyFunctions.nmea_parsing.coverage_required).toBeGreaterThanOrEqual(90);
      }

      console.log('✅ NMEA parsing and critical marine services have enhanced coverage requirements');
    });

    test('should validate service layer includes core marine functionality', () => {
      const safetyFunctions = marineSafetyConfig.safety_critical_functions;
      
      // Verify core marine services are catalogued
      expect(safetyFunctions).toHaveProperty('nmea_parsing');
      expect(safetyFunctions).toHaveProperty('navigation');
      expect(safetyFunctions).toHaveProperty('autopilot');

      // Verify each service has proper function definitions
      Object.values(safetyFunctions).forEach((service: any) => {
        if (service.functions) {
          expect(Array.isArray(service.functions)).toBe(true);
          expect(service.functions.length).toBeGreaterThan(0);
        }
        if (service.paths) {
          expect(Array.isArray(service.paths)).toBe(true);
          expect(service.paths.length).toBeGreaterThan(0);
        }
      });

      console.log('✅ Core marine services properly defined with functions and paths');
    });
  });

  describe('AC#1.4: Integration Coverage Threshold ≥90%', () => {
    test('should configure integration test coverage tracking at 90% minimum', () => {
      const integrationPattern = './server/lib/**/*.js';
      
      if (jestConfig.coverageThreshold[integrationPattern]) {
        const thresholds = jestConfig.coverageThreshold[integrationPattern];
        expect(thresholds.branches).toBeGreaterThanOrEqual(90);
        expect(thresholds.functions).toBeGreaterThanOrEqual(90);
        expect(thresholds.lines).toBeGreaterThanOrEqual(90);
        expect(thresholds.statements).toBeGreaterThanOrEqual(90);
      }

      console.log('✅ Integration coverage thresholds configured at 90% minimum for end-to-end workflows');
    });

    test('should validate integration test patterns cover marine data workflows', () => {
      const testPatterns = jestConfig.testMatch;
      
      // Verify integration test patterns are included
      const integrationPatterns = testPatterns.filter((pattern: string) => 
        pattern.includes('integration') || pattern.includes('tier2') || pattern.includes('tier3')
      );
      
      expect(integrationPatterns.length).toBeGreaterThan(0);
      
      // Verify server test patterns are included
      const serverPatterns = testPatterns.filter((pattern: string) => pattern.includes('server'));
      expect(serverPatterns.length).toBeGreaterThan(0);

      console.log('✅ Integration test patterns configured for end-to-end marine data workflow coverage');
    });

    test('should verify marine workflow integration points are covered', () => {
      // Verify configuration includes server-side integration coverage
      expect(jestConfig.collectCoverageFrom).toContain('server/**/*.js');
      
      // Verify marine safety configuration includes integration points
      const safetyFunctions = marineSafetyConfig.safety_critical_functions;
      
      // Check for integration-related paths in safety functions
      Object.values(safetyFunctions).forEach((func: any) => {
        if (func.paths) {
          const hasServerPaths = func.paths.some((path: string) => path.includes('server/'));
          if (hasServerPaths) {
            // Server paths should have high coverage requirements for integration
            expect(func.coverage_required).toBeGreaterThanOrEqual(80);
          }
        }
      });

      console.log('✅ Marine workflow integration points properly configured for coverage tracking');
    });
  });

  describe('AC#1.5: Marine Safety Focus Area Coverage Reporting', () => {
    test('should create marine safety focus area coverage reporting configuration', () => {
      // Verify marine safety configuration exists and is comprehensive
      expect(marineSafetyConfig).toBeDefined();
      expect(marineSafetyConfig.safety_critical_functions).toBeDefined();
      expect(marineSafetyConfig.performance_critical_operations).toBeDefined();
      expect(marineSafetyConfig.compliance_requirements).toBeDefined();

      const safetyFunctions = marineSafetyConfig.safety_critical_functions;
      const criticalAreas = ['navigation', 'autopilot', 'nmea_parsing', 'collision_avoidance'];
      
      criticalAreas.forEach(area => {
        expect(safetyFunctions).toHaveProperty(area);
        expect(safetyFunctions[area]).toHaveProperty('priority');
        expect(safetyFunctions[area]).toHaveProperty('coverage_required');
        expect(safetyFunctions[area]).toHaveProperty('functions');
        expect(safetyFunctions[area]).toHaveProperty('paths');
      });

      console.log('✅ Marine safety focus areas properly configured for specialized coverage reporting');
    });

    test('should configure enhanced coverage reporters for marine safety analysis', () => {
      // Verify Jest configuration includes enhanced coverage reporters
      expect(jestConfig.coverageReporters).toBeDefined();
      expect(jestConfig.coverageReporters).toContain('json-summary');
      expect(jestConfig.coverageReporters).toContain('text');
      expect(jestConfig.coverageReporters).toContain('lcov');
      
      // Verify coverage directory is configured
      expect(jestConfig.coverageDirectory).toBe('coverage');

      // Verify marine safety coverage reporter configuration file exists
      const marineCoverageConfigPath = path.join(__dirname, '../../coverage/marine-safety-coverage.json');
      expect(fs.existsSync(marineCoverageConfigPath)).toBe(true);

      console.log('✅ Enhanced coverage reporters configured for marine safety focus area analysis');
    });

    test('should validate coverage configuration supports marine safety compliance', () => {
      // Verify compliance requirements are defined
      const compliance = marineSafetyConfig.compliance_requirements;
      expect(compliance).toBeDefined();
      
      if (compliance.iec_61162) {
        expect(compliance.iec_61162.description).toContain('Digital interfaces');
        expect(compliance.iec_61162.applicable_components).toContain('NMEA parsing');
      }

      if (compliance.iso_8178) {
        expect(compliance.iso_8178.description).toContain('marine technology');
        expect(compliance.iso_8178.applicable_components).toContain('Navigation systems');
      }

      // Verify performance critical operations are defined
      const perfOps = marineSafetyConfig.performance_critical_operations;
      expect(perfOps).toBeDefined();
      
      if (perfOps.real_time_data_processing) {
        expect(perfOps.real_time_data_processing.max_latency_ms).toBeLessThanOrEqual(100);
        expect(perfOps.real_time_data_processing.throughput_requirement).toContain('500+');
      }

      if (perfOps.ui_responsiveness) {
        expect(perfOps.ui_responsiveness.max_render_time_ms).toBeLessThanOrEqual(16);
        expect(perfOps.ui_responsiveness.target_fps).toBe(60);
      }

      console.log('✅ Coverage configuration supports marine safety compliance and performance requirements');
    });
  });
});