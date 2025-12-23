/**
 * Real-Time Marine Coverage Reporter for VS Code Test Explorer Integration
 *
 * PURPOSE: Provide real-time coverage visualization with marine safety focus areas
 * REQUIREMENT: AC-11.7.2 - Real-Time Coverage Visualization with marine safety thresholds
 * METHOD: Custom Jest coverage reporter with <100ms latency and marine domain highlighting
 * EXPECTED: Real-time coverage updates in VS Code with 85% widgets, 80% services, 90% integration thresholds
 *
 * Integration with Epic 11 Professional-Grade Testing Architecture:
 * - Story 11.6: Coverage and Performance Thresholds
 * - Story 11.7: VS Code Test Explorer Integration
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

class RealTimeMarineCoverageReporter {
  constructor(globalConfig, options = {}) {
    this.globalConfig = globalConfig;
    this.options = options;
    this.startTime = performance.now();
    this.updateInterval = options.updateInterval || 50; // <100ms requirement with buffer
    this.lastUpdate = 0;

    // AC2.1: Marine safety focus areas with specific thresholds
    this.marineThresholds = {
      widgets: {
        pattern: './src/widgets/**/*.{js,jsx,ts,tsx}',
        threshold: 85,
        domain: 'Marine UI Components',
      },
      services: {
        pattern: './src/services/**/*.{js,jsx,ts,tsx}',
        threshold: 80,
        domain: 'NMEA Services & State Management',
      },
      integration: {
        pattern: './server/lib/**/*.js',
        threshold: 90,
        domain: 'End-to-End Marine Workflows',
      },
      safetyCritical: {
        navigation: {
          pattern: './src/widgets/navigation/**/*.{js,jsx,ts,tsx}',
          threshold: 95,
          domain: 'Navigation Safety',
        },
        autopilot: {
          pattern: './src/widgets/autopilot/**/*.{js,jsx,ts,tsx}',
          threshold: 95,
          domain: 'Autopilot Safety',
        },
        nmea: {
          pattern: './src/services/nmea/**/*.{js,jsx,ts,tsx}',
          threshold: 95,
          domain: 'NMEA Safety Critical',
        },
      },
    };

    this.coverageGaps = new Map();
    this.realTimeData = {
      lastUpdate: null,
      updateLatency: [],
      coverageByDomain: {},
      thresholdViolations: [],
    };
  }

  /**
   * AC2.2: Real-time coverage updates with <100ms latency requirement
   */
  async updateRealTimeCoverage(coverageMap) {
    const updateStart = performance.now();

    try {
      // Check if enough time has passed for update (throttling for performance)
      const now = performance.now();
      if (now - this.lastUpdate < this.updateInterval) {
        return;
      }

      const coverageData = await this.processCoverageMap(coverageMap);
      const gapAnalysis = await this.identifyCoverageGaps(coverageData);

      // AC2.3: Generate VS Code compatible coverage overlay data
      const vscodeOverlay = {
        metadata: {
          timestamp: new Date().toISOString(),
          updateLatency: performance.now() - updateStart,
          marineThresholds: this.marineThresholds,
        },
        coverage: coverageData,
        gaps: gapAnalysis,
        thresholdStatus: this.evaluateThresholds(coverageData),
      };

      await this.saveRealTimeData(vscodeOverlay);

      // Track update latency for AC2.4 validation
      const latency = performance.now() - updateStart;
      if (!this.realTimeData.updateLatency) {
        this.realTimeData.updateLatency = [];
      }
      this.realTimeData.updateLatency.push(latency);
      this.lastUpdate = now;

      // AC2.4: Validate <100ms latency requirement
      if (latency > 100) {
        console.warn(`⚠️ Coverage update latency exceeded 100ms: ${latency.toFixed(2)}ms`);
      }
    } catch (error) {
      console.error('Real-time coverage update failed:', error);
    }
  }

  /**
   * AC2.5: Process coverage map and categorize by marine domains
   */
  async processCoverageMap(coverageMap) {
    const domainCoverage = {
      widgets: { files: [], coverage: { lines: 0, branches: 0, functions: 0, statements: 0 } },
      services: { files: [], coverage: { lines: 0, branches: 0, functions: 0, statements: 0 } },
      integration: { files: [], coverage: { lines: 0, branches: 0, functions: 0, statements: 0 } },
      navigation: { files: [], coverage: { lines: 0, branches: 0, functions: 0, statements: 0 } },
      autopilot: { files: [], coverage: { lines: 0, branches: 0, functions: 0, statements: 0 } },
      nmea: { files: [], coverage: { lines: 0, branches: 0, functions: 0, statements: 0 } },
    };

    for (const [filePath, fileCoverage] of coverageMap.files) {
      const domain = this.categorizeFileByDomain(filePath);
      if (domain && domainCoverage[domain]) {
        domainCoverage[domain].files.push(filePath);
        this.aggregateCoverage(domainCoverage[domain].coverage, fileCoverage);
      }
    }

    // Calculate percentages for each domain
    Object.keys(domainCoverage).forEach((domain) => {
      const coverage = domainCoverage[domain].coverage;
      const fileCount = domainCoverage[domain].files.length;

      if (fileCount > 0) {
        coverage.linesPercent = this.calculatePercentage(coverage.lines);
        coverage.branchesPercent = this.calculatePercentage(coverage.branches);
        coverage.functionsPercent = this.calculatePercentage(coverage.functions);
        coverage.statementsPercent = this.calculatePercentage(coverage.statements);
      }
    });

    return domainCoverage;
  }

  /**
   * AC2.6: Categorize files by marine domain for focused coverage analysis
   */
  categorizeFileByDomain(filePath) {
    if (filePath.includes('/widgets/navigation/')) return 'navigation';
    if (filePath.includes('/widgets/autopilot/')) return 'autopilot';
    if (filePath.includes('/services/nmea/')) return 'nmea';
    if (filePath.includes('/widgets/')) return 'widgets';
    if (filePath.includes('/services/')) return 'services';
    if (filePath.includes('/server/lib/')) return 'integration';
    return null;
  }

  /**
   * AC2.7: Aggregate coverage metrics across files
   */
  aggregateCoverage(domainCoverage, fileCoverage) {
    if (!fileCoverage) return;

    // Aggregate line coverage
    if (fileCoverage.getLineCoverage) {
      const lineCoverage = fileCoverage.getLineCoverage();
      Object.values(lineCoverage).forEach((linesCovered) => {
        domainCoverage.lines += linesCovered > 0 ? 1 : 0;
      });
    }

    // Aggregate branch coverage
    if (fileCoverage.getBranchCoverage) {
      const branchCoverage = fileCoverage.getBranchCoverage();
      Object.values(branchCoverage).forEach((branchesCovered) => {
        domainCoverage.branches += branchesCovered > 0 ? 1 : 0;
      });
    }

    // Aggregate function coverage
    if (fileCoverage.getFunctionCoverage) {
      const functionCoverage = fileCoverage.getFunctionCoverage();
      Object.values(functionCoverage).forEach((functionsCovered) => {
        domainCoverage.functions += functionsCovered > 0 ? 1 : 0;
      });
    }

    // Aggregate statement coverage
    if (fileCoverage.getStatementCoverage) {
      const statementCoverage = fileCoverage.getStatementCoverage();
      Object.values(statementCoverage).forEach((statementsCovered) => {
        domainCoverage.statements += statementsCovered > 0 ? 1 : 0;
      });
    }
  }

  /**
   * AC2.8: Identify coverage gaps for navigation, engine, environment, autopilot domains
   */
  async identifyCoverageGaps(coverageData) {
    const gaps = {
      navigation: [],
      engine: [],
      environment: [],
      autopilot: [],
      criticalGaps: [],
    };

    // Check navigation domain gaps
    if (
      coverageData.navigation.coverage.linesPercent <
      this.marineThresholds.safetyCritical.navigation.threshold
    ) {
      gaps.navigation.push({
        domain: 'Navigation',
        currentCoverage: coverageData.navigation.coverage.linesPercent,
        threshold: this.marineThresholds.safetyCritical.navigation.threshold,
        gap:
          this.marineThresholds.safetyCritical.navigation.threshold -
          coverageData.navigation.coverage.linesPercent,
        files: coverageData.navigation.files,
        severity: 'high', // Navigation is safety-critical
      });
    }

    // Check autopilot domain gaps
    if (
      coverageData.autopilot.coverage.linesPercent <
      this.marineThresholds.safetyCritical.autopilot.threshold
    ) {
      gaps.autopilot.push({
        domain: 'Autopilot',
        currentCoverage: coverageData.autopilot.coverage.linesPercent,
        threshold: this.marineThresholds.safetyCritical.autopilot.threshold,
        gap:
          this.marineThresholds.safetyCritical.autopilot.threshold -
          coverageData.autopilot.coverage.linesPercent,
        files: coverageData.autopilot.files,
        severity: 'critical', // Autopilot is safety-critical
      });
    }

    // Identify critical gaps (safety-critical domains below 90%)
    Object.keys(gaps).forEach((domain) => {
      if (gaps[domain].length > 0) {
        gaps[domain].forEach((gap) => {
          if (gap.severity === 'critical' || gap.currentCoverage < 90) {
            gaps.criticalGaps.push(gap);
          }
        });
      }
    });

    return gaps;
  }

  /**
   * AC2.9: Evaluate coverage thresholds and generate warnings
   */
  evaluateThresholds(coverageData) {
    const thresholdStatus = {
      widgets: this.checkThreshold(coverageData.widgets, this.marineThresholds.widgets),
      services: this.checkThreshold(coverageData.services, this.marineThresholds.services),
      integration: this.checkThreshold(coverageData.integration, this.marineThresholds.integration),
      safetyCritical: {
        navigation: this.checkThreshold(
          coverageData.navigation,
          this.marineThresholds.safetyCritical.navigation,
        ),
        autopilot: this.checkThreshold(
          coverageData.autopilot,
          this.marineThresholds.safetyCritical.autopilot,
        ),
        nmea: this.checkThreshold(coverageData.nmea, this.marineThresholds.safetyCritical.nmea),
      },
      overallStatus: 'pass',
      violations: [],
    };

    // Collect all violations
    const allChecks = [
      thresholdStatus.widgets,
      thresholdStatus.services,
      thresholdStatus.integration,
      thresholdStatus.safetyCritical.navigation,
      thresholdStatus.safetyCritical.autopilot,
      thresholdStatus.safetyCritical.nmea,
    ];

    allChecks.forEach((check) => {
      if (check.status === 'fail') {
        thresholdStatus.violations.push(check);
        thresholdStatus.overallStatus = 'fail';
      } else if (check.status === 'warning' && thresholdStatus.overallStatus === 'pass') {
        thresholdStatus.overallStatus = 'warning';
      }
    });

    return thresholdStatus;
  }

  /**
   * AC2.10: Check individual threshold compliance
   */
  checkThreshold(domainData, threshold) {
    if (!domainData || !domainData.coverage) {
      return {
        domain: threshold.domain,
        status: 'unknown',
        message: 'No coverage data available',
      };
    }

    const coverage = domainData.coverage.linesPercent || 0;
    const required = threshold.threshold;

    if (coverage >= required) {
      return {
        domain: threshold.domain,
        status: 'pass',
        coverage,
        required,
        message: `✅ Coverage meets threshold (${coverage.toFixed(1)}% >= ${required}%)`,
      };
    } else if (coverage >= required - 5) {
      return {
        domain: threshold.domain,
        status: 'warning',
        coverage,
        required,
        gap: required - coverage,
        message: `⚠️ Coverage below threshold (${coverage.toFixed(1)}% < ${required}%)`,
      };
    } else {
      return {
        domain: threshold.domain,
        status: 'fail',
        coverage,
        required,
        gap: required - coverage,
        message: `❌ Coverage significantly below threshold (${coverage.toFixed(
          1,
        )}% < ${required}%)`,
      };
    }
  }

  /**
   * AC2.11: Calculate coverage percentage
   */
  calculatePercentage(coverage) {
    if (!coverage || typeof coverage !== 'object') return 0;

    const total = Object.keys(coverage).length;
    if (total === 0) return 0;

    const covered = Object.values(coverage).filter((v) => v > 0).length;
    return (covered / total) * 100;
  }

  /**
   * AC2.12: Save real-time data for VS Code Test Explorer consumption
   */
  async saveRealTimeData(vscodeOverlay) {
    const outputPath = path.join(
      this.globalConfig.rootDir,
      'coverage',
      'vscode-coverage-overlay.json',
    );

    try {
      await this.ensureDirectoryExists(path.dirname(outputPath));
      fs.writeFileSync(outputPath, JSON.stringify(vscodeOverlay, null, 2));

      // Also create a timestamp file for VS Code to detect updates
      const timestampPath = path.join(this.globalConfig.rootDir, 'coverage', '.coverage-timestamp');
      fs.writeFileSync(timestampPath, Date.now().toString());
    } catch (error) {
      console.error('Failed to save real-time coverage data:', error);
    }
  }

  /**
   * Jest Reporter Interface: Called when coverage data is available
   */
  onCoverageResult(test, coverageData, aggregatedResult) {
    this.updateRealTimeCoverage(coverageData);
  }

  /**
   * Jest Reporter Interface: Called when all tests are completed
   */
  async onRunComplete(contexts, results) {
    try {
      console.log('📊 Real-Time Marine Coverage Report Summary:');
      console.log(`   Update Count: ${this.realTimeData.updateLatency.length}`);

      if (this.realTimeData.updateLatency.length > 0) {
        const avgLatency =
          this.realTimeData.updateLatency.reduce((a, b) => a + b) /
          this.realTimeData.updateLatency.length;
        const maxLatency = Math.max(...this.realTimeData.updateLatency);

        console.log(`   Average Update Latency: ${avgLatency.toFixed(2)}ms`);
        console.log(`   Maximum Update Latency: ${maxLatency.toFixed(2)}ms`);

        if (maxLatency > 100) {
          console.warn(`   ⚠️ Maximum latency exceeded 100ms requirement`);
        } else {
          console.log(`   ✅ All updates met <100ms latency requirement`);
        }
      }
    } catch (error) {
      console.error('Real-Time Marine Coverage Reporter error:', error);
    }
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
}

module.exports = RealTimeMarineCoverageReporter;
