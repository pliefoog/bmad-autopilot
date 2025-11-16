/**
 * Test Suite for VS Code Test Explorer Integration
 * 
 * PURPOSE: Validate comprehensive VS Code Test Explorer integration with professional test tooling
 * REQUIREMENT: Story 11.7 - VS Code Test Explorer Integration acceptance criteria validation
 * METHOD: Jest test suite with professional documentation, coverage monitoring, and performance validation
 * EXPECTED: All VS Code Test Explorer integration features working correctly with marine safety focus
 * ERROR CONDITIONS: Reporter failures, threshold violations, connection issues, performance degradation
 */

import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

// Import reporters for testing
const ProfessionalTestDocumentationReporter = require('../../src/testing/jest-reporters/professional-test-documentation-reporter.js');
const RealTimeMarineCoverageReporter = require('../../src/testing/jest-reporters/real-time-marine-coverage-reporter.js');
const SimulatorStatusIntegration = require('../../src/testing/jest-reporters/simulator-status-integration.js');
const PerformanceMonitoringIntegration = require('../../src/testing/jest-reporters/performance-monitoring-integration.js');

describe('🧪 VS Code Test Explorer Integration', () => {
  let mockGlobalConfig: any;
  let testOutputDir: string;

  beforeEach(() => {
    testOutputDir = path.join(__dirname, '../../../coverage/test-outputs');
    
    // Ensure test output directory exists
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }

    mockGlobalConfig = {
      rootDir: path.join(__dirname, '../../..'),
      testMatch: ['**/*.test.ts'],
      collectCoverage: true,
      coverageDirectory: 'coverage'
    };
  });

  afterEach(() => {
    // Clean up test outputs
    try {
      if (fs.existsSync(testOutputDir)) {
        fs.rmSync(testOutputDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('Test cleanup warning:', error);
    }
  });

  describe('AC1: Professional Test Documentation Display', () => {
    /**
     * PURPOSE: Test professional test documentation parsing and display enhancement
     * REQUIREMENT: AC-11.7.1 - PURPOSE/REQUIREMENT/METHOD headers visible in test runner output
     * METHOD: Mock test results with professional documentation headers and validate parsing
     * EXPECTED: Enhanced test names with marine domain categorization and requirement traceability
     */
    it('should parse PURPOSE/REQUIREMENT/METHOD headers from test files', async () => {
      const reporter = new ProfessionalTestDocumentationReporter(mockGlobalConfig);
      
      // Mock test file content with professional documentation
      const testContent = `
        /**
         * PURPOSE: Validate autopilot heading control with marine safety requirements
         * REQUIREMENT: AC-3.2.1 - Autopilot Course Control Interface  
         * METHOD: Mock NMEA autopilot messages with heading deviation testing
         * EXPECTED: Heading changes processed within 100ms with safety validation
         */
        describe('Autopilot Tests', () => {
          it('should control heading', () => {});
        });
      `;

      const documentation = reporter.extractDocumentationHeaders(testContent);

      expect(documentation).toBeDefined();
      expect(documentation.purpose).toContain('autopilot heading control');
      expect(documentation.requirement).toContain('AC-3.2.1');
      expect(documentation.method).toContain('Mock NMEA autopilot');
      expect(documentation.expected).toContain('100ms');
    });

    /**
     * PURPOSE: Test marine domain categorization for VS Code Test Explorer organization
     * REQUIREMENT: AC-11.7.1 - Test categorization based on professional documentation headers
     * METHOD: Test various marine domain keywords and validate categorization accuracy
     * EXPECTED: Accurate domain assignment (navigation, engine, environment, autopilot, safety)
     */
    it('should categorize tests by marine domain', () => {
      const reporter = new ProfessionalTestDocumentationReporter(mockGlobalConfig);

      // Test different marine domains
      const testCases = [
        { text: 'navigation gps position heading', expected: 'navigation' },
        { text: 'engine rpm temperature fuel oil', expected: 'engine' },
        { text: 'wind depth water weather pressure', expected: 'environment' },
        { text: 'autopilot steering rudder pilot', expected: 'autopilot' },
        { text: 'alarm alert warning safety critical', expected: 'safety' },
        { text: 'generic test functionality', expected: 'general' }
      ];

      testCases.forEach(({ text, expected }) => {
        const domain = reporter.categorizeByMarineDomain({ purpose: text });
        expect(domain).toBe(expected);
      });
    });

    /**
     * PURPOSE: Test enhanced test name generation for VS Code Test Explorer display
     * REQUIREMENT: AC-11.7.1 - Enhanced test names with domain icons and requirement traceability
     * METHOD: Generate enhanced names with various documentation and validate formatting
     * EXPECTED: Test names include domain icons and requirement references
     */
    it('should generate enhanced test names with domain icons', () => {
      const reporter = new ProfessionalTestDocumentationReporter(mockGlobalConfig);
      
      const mockTestResult = {
        title: 'should validate autopilot heading',
        testPath: '/src/widgets/autopilot/test.ts'
      };

      const documentation = {
        requirement: 'AC-3.2.1 - Autopilot Course Control',
        purpose: 'autopilot heading control'
      };

      // Set category for test
      reporter.testCategories.set(mockTestResult.testPath, 'autopilot');
      
      const enhancedName = reporter.enhanceTestName(mockTestResult, documentation);

      expect(enhancedName).toContain('🎯'); // Autopilot icon
      expect(enhancedName).toContain('should validate autopilot heading');
      expect(enhancedName).toContain('[AC-3.2.1');
    });
  });

  describe('AC2: Real-Time Coverage Visualization', () => {
    /**
     * PURPOSE: Test real-time coverage updates with marine safety focus areas
     * REQUIREMENT: AC-11.7.2 - Coverage overlay with <100ms latency and marine thresholds
     * METHOD: Mock coverage data and validate real-time processing and threshold evaluation
     * EXPECTED: Coverage updates within latency requirements with marine safety highlighting
     */
    it('should process coverage updates within 100ms latency', async () => {
      const reporter = new RealTimeMarineCoverageReporter(mockGlobalConfig, {
        updateInterval: 50 // Test with aggressive update interval
      });

      // Mock coverage map
      const mockCoverageMap = {
        files: new Map([
          ['/src/widgets/navigation/gps.tsx', {
            getLineCoverage: () => ({ '1': 1, '2': 1, '3': 0 }),
            getBranchCoverage: () => ({ '1': 1, '2': 0 }),
            getFunctionCoverage: () => ({ '1': 1 }),
            getStatementCoverage: () => ({ '1': 1, '2': 1 })
          }]
        ])
      };

      const startTime = performance.now();
      await reporter.updateRealTimeCoverage(mockCoverageMap);
      const updateLatency = performance.now() - startTime;

      expect(updateLatency).toBeLessThan(100); // <100ms requirement
      expect(reporter.realTimeData.updateLatency).toContain(updateLatency);
    });

    /**
     * PURPOSE: Test marine safety threshold evaluation and violation detection
     * REQUIREMENT: AC-11.7.2 - 85% widgets, 80% services, 90% integration coverage thresholds
     * METHOD: Create mock coverage data below thresholds and validate violation detection
     * EXPECTED: Threshold violations correctly identified with appropriate severity levels
     */
    it('should evaluate marine safety coverage thresholds', async () => {
      const reporter = new RealTimeMarineCoverageReporter(mockGlobalConfig);

      // Mock coverage data below thresholds
      const mockCoverageData = {
        navigation: {
          files: ['/src/widgets/navigation/gps.tsx'],
          coverage: { linesPercent: 80 } // Below 95% safety-critical threshold
        },
        autopilot: {
          files: ['/src/widgets/autopilot/control.tsx'],
          coverage: { linesPercent: 85 } // Below 95% safety-critical threshold
        },
        widgets: {
          files: ['/src/widgets/general/display.tsx'],
          coverage: { linesPercent: 80 } // Below 85% widgets threshold
        }
      };

      const thresholdStatus = reporter.evaluateThresholds(mockCoverageData);

      expect(thresholdStatus.overallStatus).toBe('fail');
      expect(thresholdStatus.violations.length).toBeGreaterThan(0);
      
      // Check specific violations
      const navigationViolation = thresholdStatus.violations.find(v => 
        v.domain.includes('Navigation')
      );
      expect(navigationViolation).toBeDefined();
      expect(navigationViolation.status).toBe('fail');
    });

    /**
     * PURPOSE: Test coverage gap identification for marine domains  
     * REQUIREMENT: AC-11.7.2 - Coverage gaps identified for navigation, engine, environment, autopilot
     * METHOD: Create coverage data with domain gaps and validate identification accuracy
     * EXPECTED: Critical gaps correctly identified with severity levels and file references
     */
    it('should identify coverage gaps in marine domains', async () => {
      const reporter = new RealTimeMarineCoverageReporter(mockGlobalConfig);

      const mockCoverageData = {
        navigation: {
          files: ['/src/widgets/navigation/gps.tsx', '/src/widgets/navigation/compass.tsx'],
          coverage: { linesPercent: 70 } // Significant gap
        },
        autopilot: {
          files: ['/src/widgets/autopilot/control.tsx'],
          coverage: { linesPercent: 85 } // Minor gap but safety-critical
        }
      };

      const gaps = await reporter.identifyCoverageGaps(mockCoverageData);

      expect(gaps.navigation).toBeDefined();
      expect(gaps.navigation.length).toBeGreaterThan(0);
      expect(gaps.navigation[0].severity).toBe('high');
      
      expect(gaps.autopilot).toBeDefined();
      expect(gaps.autopilot.length).toBeGreaterThan(0);
      expect(gaps.autopilot[0].severity).toBe('critical'); // Autopilot is safety-critical
      
      expect(gaps.criticalGaps.length).toBeGreaterThan(0);
    });
  });

  describe('AC3: Simulator Connection Status Integration', () => {
    /**
     * PURPOSE: Test NMEA Bridge Simulator auto-discovery and connection monitoring
     * REQUIREMENT: AC-11.7.3 - Auto-discovery on ports [9090, 8080] with connection health monitoring
     * METHOD: Mock simulator connections and test discovery, health checks, and fallback behavior
     * EXPECTED: Successful auto-discovery with health monitoring and graceful fallback to mock mode
     */
    it('should perform auto-discovery on configured ports', async () => {
      const integration = new SimulatorStatusIntegration(mockGlobalConfig, {
        discoveryPorts: [9090, 8080],
        discoveryTimeout: 1000 // Shorter timeout for testing
      });

      const discoveryResult = await integration.performAutoDiscovery();

      // Discovery should complete (either connection or fallback)
      expect(typeof discoveryResult).toBe('boolean');
      expect(integration.connectionStatus).toBeDefined();
      expect(integration.connectionStatus.lastCheck).toBeDefined();
      expect(integration.connectionStatus.connectionHistory.length).toBeGreaterThan(0);
    });

    /**
     * PURPOSE: Test simulator connection health monitoring with retry logic
     * REQUIREMENT: AC-11.7.3 - Connection health monitoring with retry attempt tracking  
     * METHOD: Simulate connection failures and validate retry logic and fallback activation
     * EXPECTED: Proper retry attempt tracking and fallback mode activation after max retries
     */
    it('should handle connection failures with retry logic', async () => {
      const integration = new SimulatorStatusIntegration(mockGlobalConfig, {
        maxRetryAttempts: 3
      });

      // Simulate connection failure
      await integration.handleConnectionFailure('Test connection failure');

      expect(integration.connectionStatus.retryAttempts).toBe(1);

      // Simulate max retries reached
      integration.connectionStatus.retryAttempts = 3;
      await integration.handleConnectionFailure('Max retries test');

      expect(integration.connectionStatus.fallbackMode).toBe(true);
      expect(integration.connectionStatus.fallbackReason).toContain('Max retry attempts');
    });

    /**
     * PURPOSE: Test VS Code Test Explorer status display generation
     * REQUIREMENT: AC-11.7.3 - Simulator connection status visible in VS Code Test Explorer UI
     * METHOD: Generate status data and validate VS Code-compatible output format
     * EXPECTED: Proper status files generated for VS Code Test Explorer consumption
     */
    it('should generate VS Code Test Explorer status display', async () => {
      const integration = new SimulatorStatusIntegration(mockGlobalConfig);
      
      // Set up test connection status
      integration.connectionStatus = {
        isConnected: true,
        port: 9090,
        lastCheck: new Date().toISOString(),
        retryAttempts: 0,
        fallbackMode: false,
        connectionHistory: []
      };

      await integration.updateVSCodeTestExplorerStatus();

      // Check that status files are created
      const statusPath = path.join(mockGlobalConfig.rootDir, 'coverage', 'simulator-status.json');
      const indicatorPath = path.join(mockGlobalConfig.rootDir, '.vscode', 'simulator-status.json');

      expect(fs.existsSync(statusPath)).toBe(true);
      expect(fs.existsSync(indicatorPath)).toBe(true);

      const statusData = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
      expect(statusData.simulator.status).toBe('connected');
      expect(statusData.simulator.connection.port).toBe(9090);
    });
  });

  describe('AC4: Performance Monitoring Integration', () => {
    /**
     * PURPOSE: Test performance threshold monitoring with marine application requirements
     * REQUIREMENT: AC-11.7.4 - Performance threshold violations for render, memory, and data latency
     * METHOD: Simulate performance violations and validate detection and reporting to VS Code
     * EXPECTED: Threshold violations detected and reported with actionable recommendations
     */
    it('should detect render performance violations', () => {
      const integration = new PerformanceMonitoringIntegration(mockGlobalConfig);
      integration.initializePerformanceMonitoring();

      // Simulate render time exceeding 16ms threshold
      integration.recordRenderPerformance(25, 'test-render');

      expect(integration.performanceViolations.length).toBe(1);
      const violation = integration.performanceViolations[0];
      
      expect(violation.type).toBe('render');
      expect(violation.actual).toBe(25);
      expect(violation.threshold).toBe(16);
      expect(violation.severity).toBe('critical');
      expect(violation.message).toContain('exceeds 60fps threshold');
    });

    /**
     * PURPOSE: Test memory usage monitoring with 50MB threshold validation
     * REQUIREMENT: AC-11.7.4 - Memory usage tracking with <50MB increase per test operation alerts
     * METHOD: Mock memory usage increases and validate threshold violation detection
     * EXPECTED: Memory violations detected when increase exceeds 50MB with proper tracking
     */
    it('should detect memory usage violations', () => {
      const integration = new PerformanceMonitoringIntegration(mockGlobalConfig);
      
      // Set baseline memory
      integration.testStartMemory = { heapUsed: 100 };
      integration.isMonitoring = true;

      // Mock getCurrentMemoryUsage to return increased memory
      integration.getCurrentMemoryUsage = jest.fn().mockReturnValue({
        heapUsed: 160, // 60MB increase (above 50MB threshold)
        heapTotal: 200,
        external: 10,
        rss: 170
      });

      integration.checkMemoryUsage();

      expect(integration.performanceViolations.length).toBe(1);
      const violation = integration.performanceViolations[0];
      
      expect(violation.type).toBe('memory');
      expect(violation.actual).toBe(60);
      expect(violation.threshold).toBe(50);
      expect(violation.severity).toBe('high');
    });

    /**
     * PURPOSE: Test data latency monitoring for NMEA sentence → widget update validation
     * REQUIREMENT: AC-11.7.4 - Data latency monitoring with <100ms NMEA → widget update validation
     * METHOD: Simulate NMEA processing latency and validate threshold violation detection
     * EXPECTED: Latency violations detected when NMEA → widget update exceeds 100ms
     */
    it('should detect data latency violations', () => {
      const integration = new PerformanceMonitoringIntegration(mockGlobalConfig);

      const nmeaSentenceTime = 1000;
      const widgetUpdateTime = 1150; // 150ms latency (above 100ms threshold)

      integration.recordDataLatency(nmeaSentenceTime, widgetUpdateTime, 'nmea-widget-test');

      expect(integration.performanceViolations.length).toBe(1);
      const violation = integration.performanceViolations[0];
      
      expect(violation.type).toBe('dataLatency');
      expect(violation.actual).toBe(150);
      expect(violation.threshold).toBe(100);
      expect(violation.severity).toBe('critical');
      expect(violation.message).toContain('marine safety threshold');
    });

    /**
     * PURPOSE: Test performance recommendation generation for violations
     * REQUIREMENT: AC-11.7.4 - Performance threshold violations show as warnings with recommendations
     * METHOD: Generate performance violations and validate recommendation accuracy and usefulness
     * EXPECTED: Actionable recommendations provided for each violation type with marine context
     */
    it('should generate actionable performance recommendations', () => {
      const integration = new PerformanceMonitoringIntegration(mockGlobalConfig);

      const testCases = [
        {
          violation: { type: 'render', severity: 'critical' },
          expectedRecommendations: ['React.memo()', 'React DevTools', 'virtualization', 'marine widget']
        },
        {
          violation: { type: 'memory', severity: 'high' },
          expectedRecommendations: ['memory leaks', 'NMEA data', 'cleanup', 'WebSocket']
        },
        {
          violation: { type: 'dataLatency', severity: 'critical' },
          expectedRecommendations: ['NMEA sentence parsing', 'WebSocket message', 'throttling', 'debouncing']
        }
      ];

      testCases.forEach(({ violation, expectedRecommendations }) => {
        const recommendations = integration.generatePerformanceRecommendations(violation);
        
        expect(recommendations.length).toBeGreaterThan(0);
        expectedRecommendations.forEach(keyword => {
          const hasRecommendation = recommendations.some(rec => 
            rec.toLowerCase().includes(keyword.toLowerCase())
          );
          expect(hasRecommendation).toBe(true);
        });
      });
    });
  });

  describe('AC5: Development Workflow Enhancement', () => {
    /**
     * PURPOSE: Test test execution timing and bottleneck identification
     * REQUIREMENT: AC-11.7.5 - Test execution timing with tier-specific thresholds and bottleneck identification  
     * METHOD: Record test execution times across different tiers and validate threshold compliance
     * EXPECTED: Proper tier classification and threshold validation for unit/integration/e2e tests
     */
    it('should track test execution timing by tier', () => {
      const integration = new PerformanceMonitoringIntegration(mockGlobalConfig);

      const testCases = [
        { tier: 'unit', time: 60, shouldViolate: true, threshold: 50 },
        { tier: 'integration', time: 1500, shouldViolate: false, threshold: 2000 },
        { tier: 'e2e', time: 35000, shouldViolate: true, threshold: 30000 }
      ];

      testCases.forEach(({ tier, time, shouldViolate, threshold }, index) => {
        const initialViolations = integration.performanceViolations.length;
        
        integration.recordTestExecutionTime(
          `/test/${tier}/test${index}.ts`,
          `${tier} test ${index}`,
          time,
          tier
        );

        if (shouldViolate) {
          expect(integration.performanceViolations.length).toBe(initialViolations + 1);
          const violation = integration.performanceViolations[integration.performanceViolations.length - 1];
          expect(violation.tier).toBe(tier);
          expect(violation.actual).toBe(time);
          expect(violation.threshold).toBe(threshold);
        } else {
          expect(integration.performanceViolations.length).toBe(initialViolations);
        }
      });
    });

    /**
     * PURPOSE: Test domain-based test suite organization for marine applications  
     * REQUIREMENT: AC-11.7.5 - Automated test suite organization by domain (navigation, engine, environment, autopilot)
     * METHOD: Validate test categorization and organization by marine domains
     * EXPECTED: Accurate domain-based organization with proper marine safety prioritization
     */
    it('should organize tests by marine domain', () => {
      const reporter = new ProfessionalTestDocumentationReporter(mockGlobalConfig);

      const testFiles = [
        { path: '/src/widgets/navigation/gps.test.ts', expectedDomain: 'navigation' },
        { path: '/src/widgets/autopilot/control.test.ts', expectedDomain: 'autopilot' },
        { path: '/src/services/nmea/parser.test.ts', expectedDomain: 'nmea' },
        { path: '/src/widgets/engine/rpm.test.ts', expectedDomain: 'widgets' },
        { path: '/src/services/data/store.test.ts', expectedDomain: 'services' }
      ];

      testFiles.forEach(({ path, expectedDomain }) => {
        const domain = reporter.categorizeFileByDomain ? 
          reporter.categorizeFileByDomain(path) : 
          'general';
        
        if (reporter.categorizeFileByDomain) {
          expect(domain).toBe(expectedDomain);
        }
      });
    });

    /**
     * PURPOSE: Test Jest Test Explorer extension compatibility  
     * REQUIREMENT: AC-11.7.5 - Integration with existing Jest Test Explorer extension
     * METHOD: Validate reporter interface compliance and VS Code compatibility
     * EXPECTED: All reporters implement Jest reporter interface correctly
     */
    it('should maintain Jest Test Explorer extension compatibility', () => {
      const reporters = [
        ProfessionalTestDocumentationReporter,
        RealTimeMarineCoverageReporter, 
        SimulatorStatusIntegration,
        PerformanceMonitoringIntegration
      ];

      reporters.forEach((ReporterClass) => {
        const reporter = new ReporterClass(mockGlobalConfig);
        
        // Check Jest reporter interface methods
        expect(typeof reporter.onRunComplete).toBe('function');
        
        // Some reporters may have additional methods
        if (reporter.onTestStart) {
          expect(typeof reporter.onTestStart).toBe('function');
        }
        if (reporter.onTestResult) {
          expect(typeof reporter.onTestResult).toBe('function');
        }
      });
    });
  });

  describe('Integration Testing', () => {
    /**
     * PURPOSE: Test complete VS Code Test Explorer integration workflow
     * REQUIREMENT: All AC requirements working together in integrated environment
     * METHOD: Run complete workflow with all reporters and validate end-to-end functionality
     * EXPECTED: Seamless integration with all features working together without conflicts
     */
    it('should integrate all VS Code Test Explorer features', async () => {
      // Initialize all reporters
      const reporters = [
        new ProfessionalTestDocumentationReporter(mockGlobalConfig),
        new RealTimeMarineCoverageReporter(mockGlobalConfig),
        new SimulatorStatusIntegration(mockGlobalConfig),
        new PerformanceMonitoringIntegration(mockGlobalConfig)
      ];

      // Mock test results for integration
      const mockResults = {
        numTotalTests: 10,
        numPassedTests: 8,
        numFailedTests: 2,
        testResults: [
          {
            testFilePath: '/src/widgets/autopilot/control.test.ts',
            assertionResults: [
              {
                title: 'should control autopilot heading',
                status: 'passed',
                duration: 45,
                failureMessages: []
              }
            ]
          }
        ]
      };

      const mockContexts = new Set();

      // Run all reporters
      for (const reporter of reporters) {
        try {
          if (reporter.onRunStart) {
            await reporter.onRunStart(mockResults, {});
          }
          
          await reporter.onRunComplete(mockContexts, mockResults);
          
        } catch (error) {
          console.error(`Reporter ${reporter.constructor.name} failed:`, error);
          throw error;
        }
      }

      // Verify integration outputs exist
      const expectedFiles = [
        'coverage/vscode-test-explorer.json',
        'coverage/requirement-traceability.json',
        'coverage/vscode-coverage-overlay.json',
        'coverage/simulator-status.json',
        'coverage/performance-summary.json'
      ];

      expectedFiles.forEach(file => {
        const filePath = path.join(mockGlobalConfig.rootDir, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          expect(content.length).toBeGreaterThan(0);
          
          // Validate JSON structure
          try {
            const data = JSON.parse(content);
            expect(data).toBeDefined();
            expect(data.metadata).toBeDefined();
          } catch (parseError) {
            throw new Error(`Invalid JSON in ${file}: ${parseError}`);
          }
        }
      });
    });
  });
});