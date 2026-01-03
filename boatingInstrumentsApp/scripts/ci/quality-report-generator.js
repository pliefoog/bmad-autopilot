#!/usr/bin/env node

/**
 * Story 11.8: CI/CD Pipeline Integration - Quality Report Generator
 * PURPOSE: Automated quality report generation and distribution functional
 * REQUIREMENT: AC#2 - Quality Gate Integration - Automated quality report generation
 * METHOD: Comprehensive report generation with multiple formats and distribution channels
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class QualityReportGenerator {
  constructor() {
    this.config = {
      reports: {
        outputDir: path.join(__dirname, '../../coverage/reports'),
        formats: ['json', 'html', 'markdown', 'junit'],
        includeArtifacts: process.env.CI_INCLUDE_ARTIFACTS !== 'false',
        includeCharts: process.env.CI_INCLUDE_CHARTS !== 'false',
      },
      distribution: {
        uploadToCI: process.env.CI === 'true',
        generateBadges: process.env.CI_GENERATE_BADGES !== 'false',
        publishToPages: process.env.CI_PUBLISH_PAGES === 'true',
      },
      retention: {
        keepReports: parseInt(process.env.CI_KEEP_REPORTS || '30'), // days
        maxReports: parseInt(process.env.CI_MAX_REPORTS || '50'),
      },
    };

    this.reportData = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'test',
      ci: this.collectCIMetadata(),
      coverage: null,
      performance: null,
      marineSafety: null,
      tests: null,
      quality: null,
    };
  }

  /**
   * Collect CI/CD metadata
   */
  collectCIMetadata() {
    return {
      platform: this.detectCIPlatform(),
      buildNumber: process.env.GITHUB_RUN_NUMBER || process.env.BUILD_NUMBER || 'unknown',
      buildId: process.env.GITHUB_RUN_ID || process.env.BUILD_ID || 'unknown',
      commitHash: process.env.GITHUB_SHA || process.env.GIT_COMMIT || 'unknown',
      branch: process.env.GITHUB_REF_NAME || process.env.GIT_BRANCH || 'unknown',
      pullRequest: process.env.GITHUB_PR_NUMBER || process.env.PULL_REQUEST || null,
      actor: process.env.GITHUB_ACTOR || process.env.BUILD_USER || 'unknown',
      repository: process.env.GITHUB_REPOSITORY || 'unknown',
      workflow: process.env.GITHUB_WORKFLOW || 'quality-gates',
    };
  }

  /**
   * Detect CI platform
   */
  detectCIPlatform() {
    if (process.env.GITHUB_ACTIONS) return 'github-actions';
    if (process.env.JENKINS_URL) return 'jenkins';
    if (process.env.CIRCLECI) return 'circleci';
    if (process.env.TRAVIS) return 'travis';
    if (process.env.GITLAB_CI) return 'gitlab-ci';
    return 'unknown';
  }

  /**
   * Generate comprehensive quality reports
   */
  async generateReports() {
    console.log('📊 Generating comprehensive quality reports...');

    try {
      // Ensure reports directory exists
      if (!fs.existsSync(this.config.reports.outputDir)) {
        fs.mkdirSync(this.config.reports.outputDir, { recursive: true });
      }

      // Step 1: Collect data from various sources
      console.log('  📥 Collecting data from test outputs...');
      await this.collectReportData();

      // Step 2: Generate reports in different formats
      console.log('  📄 Generating reports in multiple formats...');
      const generatedReports = await this.generateMultiFormatReports();

      // Step 3: Generate artifacts (charts, badges, etc.)
      if (this.config.reports.includeArtifacts) {
        console.log('  🎨 Generating visual artifacts...');
        await this.generateArtifacts();
      }

      // Step 4: Create distribution package
      console.log('  📦 Creating distribution package...');
      const distributionPackage = await this.createDistributionPackage(generatedReports);

      // Step 5: Clean up old reports
      await this.cleanupOldReports();

      console.log('✅ Quality reports generated successfully');
      return {
        success: true,
        reports: generatedReports,
        distribution: distributionPackage,
        outputDir: this.config.reports.outputDir,
      };
    } catch (error) {
      console.error(`❌ Failed to generate quality reports: ${error.message}`);
      throw error;
    }
  }

  /**
   * Collect data from various test output files
   */
  async collectReportData() {
    // Collect coverage data
    await this.collectCoverageData();

    // Collect test results
    await this.collectTestResults();

    // Collect performance data
    await this.collectPerformanceData();

    // Collect marine safety data
    await this.collectMarineSafetyData();

    // Collect quality gate results
    await this.collectQualityGateResults();
  }

  /**
   * Collect coverage data from Jest output
   */
  async collectCoverageData() {
    const coverageFiles = [
      path.join(__dirname, '../../coverage/coverage-summary.json'),
      path.join(__dirname, '../../coverage/lcov-report/coverage-summary.json'),
      path.join(__dirname, '../../coverage/jest-coverage.json'),
    ];

    for (const file of coverageFiles) {
      if (fs.existsSync(file)) {
        try {
          const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
          this.reportData.coverage = {
            summary: data.total || data,
            detailed: data,
            source: path.basename(file),
            generatedAt: fs.statSync(file).mtime,
          };
          break;
        } catch (error) {
          console.warn(`    ⚠️ Failed to parse coverage file ${file}: ${error.message}`);
        }
      }
    }

    if (!this.reportData.coverage) {
      console.warn('    ⚠️ No coverage data found');
    }
  }

  /**
   * Collect test results from Jest output
   */
  async collectTestResults() {
    const testResultsFiles = [
      path.join(__dirname, '../../coverage/jest-results.json'),
      path.join(__dirname, '../../test-results.json'),
      path.join(__dirname, '../../junit.xml'),
    ];

    for (const file of testResultsFiles) {
      if (fs.existsSync(file)) {
        try {
          if (file.endsWith('.json')) {
            const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
            this.reportData.tests = {
              summary: this.extractTestSummary(data),
              detailed: data,
              source: path.basename(file),
              generatedAt: fs.statSync(file).mtime,
            };
          } else if (file.endsWith('.xml')) {
            // Parse JUnit XML (simplified)
            const xmlContent = fs.readFileSync(file, 'utf-8');
            this.reportData.tests = {
              summary: this.parseJUnitXML(xmlContent),
              source: path.basename(file),
              generatedAt: fs.statSync(file).mtime,
            };
          }
          break;
        } catch (error) {
          console.warn(`    ⚠️ Failed to parse test results ${file}: ${error.message}`);
        }
      }
    }

    if (!this.reportData.tests) {
      console.warn('    ⚠️ No test results found');
    }
  }

  /**
   * Extract test summary from Jest results
   */
  extractTestSummary(data) {
    if (data.testResults) {
      // Jest format
      const passed = data.testResults.filter((t) => t.status === 'passed').length;
      const failed = data.testResults.filter((t) => t.status === 'failed').length;
      const skipped = data.testResults.filter((t) => t.status === 'pending').length;

      return {
        total: data.testResults.length,
        passed,
        failed,
        skipped,
        duration: data.testResults.reduce(
          (sum, t) => sum + (t.perfStats?.end - t.perfStats?.start || 0),
          0,
        ),
      };
    }

    return data.summary || data;
  }

  /**
   * Parse JUnit XML (simplified)
   */
  parseJUnitXML(xmlContent) {
    // This is a simplified parser - in production, you'd use a proper XML parser
    const testsuiteMatch = xmlContent.match(
      /testsuite[^>]*tests="(\d+)"[^>]*failures="(\d+)"[^>]*skipped="(\d+)"/,
    );

    if (testsuiteMatch) {
      const total = parseInt(testsuiteMatch[1]);
      const failures = parseInt(testsuiteMatch[2]);
      const skipped = parseInt(testsuiteMatch[3]);

      return {
        total,
        passed: total - failures - skipped,
        failed: failures,
        skipped,
        format: 'junit',
      };
    }

    return { error: 'Failed to parse JUnit XML' };
  }

  /**
   * Collect performance data
   */
  async collectPerformanceData() {
    const performanceFiles = [
      path.join(__dirname, '../../coverage/performance-results.json'),
      path.join(__dirname, '../../performance/benchmark-results.json'),
      path.join(__dirname, '../../vendor/bench-results/latest.json'),
    ];

    for (const file of performanceFiles) {
      if (fs.existsSync(file)) {
        try {
          const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
          this.reportData.performance = {
            metrics: data,
            source: path.basename(file),
            generatedAt: fs.statSync(file).mtime,
          };
          break;
        } catch (error) {
          console.warn(`    ⚠️ Failed to parse performance data ${file}: ${error.message}`);
        }
      }
    }

    if (!this.reportData.performance) {
      console.warn('    ⚠️ No performance data found');
    }
  }

  /**
   * Collect marine safety compliance data
   */
  async collectMarineSafetyData() {
    const safetyFiles = [
      path.join(__dirname, '../../coverage/marine-safety-metrics.json'),
      path.join(__dirname, '../../coverage/marine-safety-coverage.json'),
    ];

    for (const file of safetyFiles) {
      if (fs.existsSync(file)) {
        try {
          const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
          this.reportData.marineSafety = {
            metrics: data,
            source: path.basename(file),
            generatedAt: fs.statSync(file).mtime,
          };
          break;
        } catch (error) {
          console.warn(`    ⚠️ Failed to parse marine safety data ${file}: ${error.message}`);
        }
      }
    }

    if (!this.reportData.marineSafety) {
      console.warn('    ⚠️ No marine safety data found');
    }
  }

  /**
   * Collect quality gate results
   */
  async collectQualityGateResults() {
    const qualityFiles = [
      path.join(__dirname, 'quality-gates-report.json'),
      path.join(__dirname, '../../coverage/reports/quality-gates-report.json'),
    ];

    for (const file of qualityFiles) {
      if (fs.existsSync(file)) {
        try {
          const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
          this.reportData.quality = {
            results: data,
            source: path.basename(file),
            generatedAt: fs.statSync(file).mtime,
          };
          break;
        } catch (error) {
          console.warn(`    ⚠️ Failed to parse quality gate results ${file}: ${error.message}`);
        }
      }
    }

    if (!this.reportData.quality) {
      console.warn('    ⚠️ No quality gate results found');
    }
  }

  /**
   * Generate reports in multiple formats
   */
  async generateMultiFormatReports() {
    const reports = {};

    for (const format of this.config.reports.formats) {
      try {
        switch (format) {
          case 'json':
            reports.json = await this.generateJSONReport();
            break;
          case 'html':
            reports.html = await this.generateHTMLReport();
            break;
          case 'markdown':
            reports.markdown = await this.generateMarkdownReport();
            break;
          case 'junit':
            reports.junit = await this.generateJUnitReport();
            break;
        }
      } catch (error) {
        console.error(`    ❌ Failed to generate ${format} report: ${error.message}`);
      }
    }

    return reports;
  }

  /**
   * Generate JSON report
   */
  async generateJSONReport() {
    const reportPath = path.join(this.config.reports.outputDir, 'quality-report.json');

    const report = {
      ...this.reportData,
      generated: {
        timestamp: new Date().toISOString(),
        generator: 'bmad-quality-report-generator',
        version: '1.0.0',
      },
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return {
      format: 'json',
      path: reportPath,
      size: fs.statSync(reportPath).size,
      url: this.generateReportURL(reportPath),
    };
  }

  /**
   * Generate HTML report
   */
  async generateHTMLReport() {
    const reportPath = path.join(this.config.reports.outputDir, 'quality-report.html');

    const html = this.generateHTMLContent();
    fs.writeFileSync(reportPath, html);

    return {
      format: 'html',
      path: reportPath,
      size: fs.statSync(reportPath).size,
      url: this.generateReportURL(reportPath),
    };
  }

  /**
   * Generate HTML content
   */
  generateHTMLContent() {
    const status = this.reportData.quality?.results?.passed ? 'PASSED' : 'FAILED';
    const statusColor = this.reportData.quality?.results?.passed ? '#28a745' : '#dc3545';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BMad Autopilot - Quality Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .status { font-size: 24px; font-weight: bold; color: ${statusColor}; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 30px 0; }
        .card { background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #007bff; }
        .metric { display: flex; justify-content: space-between; margin: 10px 0; }
        .metric-name { font-weight: 500; }
        .metric-value { font-weight: bold; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .warning { color: #ffc107; }
        .metadata { background: #e9ecef; padding: 15px; border-radius: 4px; margin-top: 30px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚢 BMad Autopilot - Quality Report</h1>
            <div class="status">${status}</div>
            <div>Build: ${this.reportData.ci.buildNumber} | ${new Date(
      this.reportData.timestamp,
    ).toLocaleString()}</div>
        </div>

        <div class="grid">
            ${this.generateCoverageCard()}
            ${this.generateTestsCard()}
            ${this.generatePerformanceCard()}
            ${this.generateMarineSafetyCard()}
        </div>

        <div class="metadata">
            <h3>Build Information</h3>
            <div><strong>Repository:</strong> ${this.reportData.ci.repository}</div>
            <div><strong>Branch:</strong> ${this.reportData.ci.branch}</div>
            <div><strong>Commit:</strong> ${this.reportData.ci.commitHash.substring(0, 8)}</div>
            <div><strong>Actor:</strong> ${this.reportData.ci.actor}</div>
            <div><strong>Platform:</strong> ${this.reportData.ci.platform}</div>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate coverage card HTML
   */
  generateCoverageCard() {
    if (!this.reportData.coverage)
      return '<div class="card"><h3>📊 Coverage</h3><p>No coverage data available</p></div>';

    const cov = this.reportData.coverage.summary;
    return `
      <div class="card">
        <h3>📊 Coverage Analysis</h3>
        <div class="metric">
          <span class="metric-name">Statements:</span>
          <span class="metric-value ${cov.statements?.pct >= 70 ? 'passed' : 'failed'}">${
      cov.statements?.pct || 0
    }%</span>
        </div>
        <div class="metric">
          <span class="metric-name">Branches:</span>
          <span class="metric-value ${cov.branches?.pct >= 70 ? 'passed' : 'failed'}">${
      cov.branches?.pct || 0
    }%</span>
        </div>
        <div class="metric">
          <span class="metric-name">Functions:</span>
          <span class="metric-value ${cov.functions?.pct >= 70 ? 'passed' : 'failed'}">${
      cov.functions?.pct || 0
    }%</span>
        </div>
        <div class="metric">
          <span class="metric-name">Lines:</span>
          <span class="metric-value ${cov.lines?.pct >= 70 ? 'passed' : 'failed'}">${
      cov.lines?.pct || 0
    }%</span>
        </div>
      </div>
    `;
  }

  /**
   * Generate tests card HTML
   */
  generateTestsCard() {
    if (!this.reportData.tests)
      return '<div class="card"><h3>🧪 Tests</h3><p>No test data available</p></div>';

    const tests = this.reportData.tests.summary;
    return `
      <div class="card">
        <h3>🧪 Test Results</h3>
        <div class="metric">
          <span class="metric-name">Total Tests:</span>
          <span class="metric-value">${tests.total || 0}</span>
        </div>
        <div class="metric">
          <span class="metric-name">Passed:</span>
          <span class="metric-value passed">${tests.passed || 0}</span>
        </div>
        <div class="metric">
          <span class="metric-name">Failed:</span>
          <span class="metric-value ${tests.failed > 0 ? 'failed' : 'passed'}">${
      tests.failed || 0
    }</span>
        </div>
        <div class="metric">
          <span class="metric-name">Skipped:</span>
          <span class="metric-value warning">${tests.skipped || 0}</span>
        </div>
      </div>
    `;
  }

  /**
   * Generate performance card HTML
   */
  generatePerformanceCard() {
    if (!this.reportData.performance)
      return '<div class="card"><h3>⚡ Performance</h3><p>No performance data available</p></div>';

    const perf = this.reportData.performance.metrics;
    return `
      <div class="card">
        <h3>⚡ Performance Metrics</h3>
        <div class="metric">
          <span class="metric-name">Render Time:</span>
          <span class="metric-value ${(perf.renderTime || 0) <= 16 ? 'passed' : 'failed'}">${
      perf.renderTime || 0
    }ms</span>
        </div>
        <div class="metric">
          <span class="metric-name">NMEA Latency:</span>
          <span class="metric-value ${(perf.nmeaLatency || 0) <= 100 ? 'passed' : 'failed'}">${
      perf.nmeaLatency || 0
    }ms</span>
        </div>
        <div class="metric">
          <span class="metric-name">Memory Usage:</span>
          <span class="metric-value ${(perf.memoryUsage || 0) <= 50 ? 'passed' : 'failed'}">${
      perf.memoryUsage || 0
    }MB</span>
        </div>
      </div>
    `;
  }

  /**
   * Generate marine safety card HTML
   */
  generateMarineSafetyCard() {
    if (!this.reportData.marineSafety)
      return '<div class="card"><h3>🛡️ Marine Safety</h3><p>No marine safety data available</p></div>';

    const safety = this.reportData.marineSafety.metrics;
    return `
      <div class="card">
        <h3>🛡️ Marine Safety Compliance</h3>
        <div class="metric">
          <span class="metric-name">Crash-Free Rate:</span>
          <span class="metric-value ${
            (safety.crashFreeRate || 0) >= 0.995 ? 'passed' : 'failed'
          }">${((safety.crashFreeRate || 0) * 100).toFixed(1)}%</span>
        </div>
        <div class="metric">
          <span class="metric-name">Uptime:</span>
          <span class="metric-value ${(safety.uptime || 0) >= 0.999 ? 'passed' : 'failed'}">${(
      (safety.uptime || 0) * 100
    ).toFixed(2)}%</span>
        </div>
        <div class="metric">
          <span class="metric-name">Data Accuracy:</span>
          <span class="metric-value passed">${((safety.dataAccuracy || 0) * 100).toFixed(1)}%</span>
        </div>
      </div>
    `;
  }

  /**
   * Generate Markdown report
   */
  async generateMarkdownReport() {
    const reportPath = path.join(this.config.reports.outputDir, 'quality-report.md');

    const markdown = this.generateMarkdownContent();
    fs.writeFileSync(reportPath, markdown);

    return {
      format: 'markdown',
      path: reportPath,
      size: fs.statSync(reportPath).size,
      url: this.generateReportURL(reportPath),
    };
  }

  /**
   * Generate Markdown content
   */
  generateMarkdownContent() {
    const status = this.reportData.quality?.results?.passed ? '✅ PASSED' : '❌ FAILED';

    let markdown = `# 🚢 BMad Autopilot - Quality Report\n\n`;
    markdown += `**Status:** ${status}  \n`;
    markdown += `**Build:** ${this.reportData.ci.buildNumber}  \n`;
    markdown += `**Timestamp:** ${new Date(this.reportData.timestamp).toLocaleString()}  \n`;
    markdown += `**Branch:** ${this.reportData.ci.branch}  \n`;
    markdown += `**Commit:** ${this.reportData.ci.commitHash.substring(0, 8)}  \n\n`;

    // Coverage section
    if (this.reportData.coverage) {
      markdown += `## 📊 Coverage Analysis\n\n`;
      const cov = this.reportData.coverage.summary;
      markdown += `| Metric | Coverage | Status |\n`;
      markdown += `|--------|----------|--------|\n`;
      markdown += `| Statements | ${cov.statements?.pct || 0}% | ${
        cov.statements?.pct >= 70 ? '✅' : '❌'
      } |\n`;
      markdown += `| Branches | ${cov.branches?.pct || 0}% | ${
        cov.branches?.pct >= 70 ? '✅' : '❌'
      } |\n`;
      markdown += `| Functions | ${cov.functions?.pct || 0}% | ${
        cov.functions?.pct >= 70 ? '✅' : '❌'
      } |\n`;
      markdown += `| Lines | ${cov.lines?.pct || 0}% | ${cov.lines?.pct >= 70 ? '✅' : '❌'} |\n\n`;
    }

    // Test results section
    if (this.reportData.tests) {
      markdown += `## 🧪 Test Results\n\n`;
      const tests = this.reportData.tests.summary;
      markdown += `- **Total Tests:** ${tests.total || 0}\n`;
      markdown += `- **Passed:** ${tests.passed || 0} ✅\n`;
      markdown += `- **Failed:** ${tests.failed || 0} ${tests.failed > 0 ? '❌' : '✅'}\n`;
      markdown += `- **Skipped:** ${tests.skipped || 0} ⏭️\n\n`;
    }

    // Performance section
    if (this.reportData.performance) {
      markdown += `## ⚡ Performance Metrics\n\n`;
      const perf = this.reportData.performance.metrics;
      markdown += `| Metric | Value | Threshold | Status |\n`;
      markdown += `|--------|-------|-----------|--------|\n`;
      markdown += `| Render Time | ${perf.renderTime || 0}ms | ≤16ms | ${
        (perf.renderTime || 0) <= 16 ? '✅' : '❌'
      } |\n`;
      markdown += `| NMEA Latency | ${perf.nmeaLatency || 0}ms | ≤100ms | ${
        (perf.nmeaLatency || 0) <= 100 ? '✅' : '❌'
      } |\n`;
      markdown += `| Memory Usage | ${perf.memoryUsage || 0}MB | ≤50MB | ${
        (perf.memoryUsage || 0) <= 50 ? '✅' : '❌'
      } |\n\n`;
    }

    // Marine safety section
    if (this.reportData.marineSafety) {
      markdown += `## 🛡️ Marine Safety Compliance\n\n`;
      const safety = this.reportData.marineSafety.metrics;
      markdown += `- **Crash-Free Rate:** ${((safety.crashFreeRate || 0) * 100).toFixed(1)}% ${
        (safety.crashFreeRate || 0) >= 0.995 ? '✅' : '❌'
      }\n`;
      markdown += `- **System Uptime:** ${((safety.uptime || 0) * 100).toFixed(2)}% ${
        (safety.uptime || 0) >= 0.999 ? '✅' : '❌'
      }\n`;
      markdown += `- **Data Accuracy:** ${((safety.dataAccuracy || 0) * 100).toFixed(1)}% ✅\n\n`;
    }

    markdown += `---\n`;
    markdown += `*Generated by BMad Quality Report Generator at ${new Date().toISOString()}*\n`;

    return markdown;
  }

  /**
   * Generate JUnit XML report
   */
  async generateJUnitReport() {
    const reportPath = path.join(this.config.reports.outputDir, 'quality-report-junit.xml');

    const xml = this.generateJUnitXML();
    fs.writeFileSync(reportPath, xml);

    return {
      format: 'junit',
      path: reportPath,
      size: fs.statSync(reportPath).size,
      url: this.generateReportURL(reportPath),
    };
  }

  /**
   * Generate JUnit XML content
   */
  generateJUnitXML() {
    const timestamp = new Date().toISOString();
    let totalTests = 0;
    let failures = 0;
    let testcases = '';

    // Add coverage test case
    if (this.reportData.coverage) {
      totalTests++;
      const cov = this.reportData.coverage.summary;
      const coveragePassed = (cov.statements?.pct || 0) >= 70;

      if (!coveragePassed) failures++;

      testcases += `    <testcase classname="QualityGates" name="CoverageThresholds" time="0.1">\n`;
      if (!coveragePassed) {
        testcases += `      <failure message="Coverage below threshold">${JSON.stringify(
          cov,
        )}</failure>\n`;
      }
      testcases += `    </testcase>\n`;
    }

    // Add performance test case
    if (this.reportData.performance) {
      totalTests++;
      const perf = this.reportData.performance.metrics;
      const perfPassed = (perf.renderTime || 0) <= 16 && (perf.nmeaLatency || 0) <= 100;

      if (!perfPassed) failures++;

      testcases += `    <testcase classname="QualityGates" name="PerformanceThresholds" time="0.1">\n`;
      if (!perfPassed) {
        testcases += `      <failure message="Performance below threshold">${JSON.stringify(
          perf,
        )}</failure>\n`;
      }
      testcases += `    </testcase>\n`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="BMad Quality Gates" tests="${totalTests}" failures="${failures}" time="0.2" timestamp="${timestamp}">
  <testsuite name="QualityGates" tests="${totalTests}" failures="${failures}" time="0.2" timestamp="${timestamp}">
${testcases}  </testsuite>
</testsuites>`;
  }

  /**
   * Generate visual artifacts (charts, badges, etc.)
   */
  async generateArtifacts() {
    if (this.config.distribution.generateBadges) {
      await this.generateBadges();
    }
  }

  /**
   * Generate SVG badges
   */
  async generateBadges() {
    try {
      const badgesDir = path.join(this.config.reports.outputDir, 'badges');
      if (!fs.existsSync(badgesDir)) {
        fs.mkdirSync(badgesDir, { recursive: true });
      }

      // Coverage badge
      if (this.reportData.coverage) {
        const coverage = Math.round(this.reportData.coverage.summary.statements?.pct || 0);
        const color = coverage >= 80 ? 'brightgreen' : coverage >= 70 ? 'yellow' : 'red';
        const badge = this.generateBadgeSVG('coverage', `${coverage}%`, color);
        fs.writeFileSync(path.join(badgesDir, 'coverage.svg'), badge);
      }

      // Quality badge
      if (this.reportData.quality) {
        const passed = this.reportData.quality.results.passed;
        const badge = this.generateBadgeSVG(
          'quality',
          passed ? 'passing' : 'failing',
          passed ? 'brightgreen' : 'red',
        );
        fs.writeFileSync(path.join(badgesDir, 'quality.svg'), badge);
      }

      console.log('    🏆 Generated badges');
    } catch (error) {
      console.warn(`    ⚠️ Failed to generate badges: ${error.message}`);
    }
  }

  /**
   * Generate SVG badge
   */
  generateBadgeSVG(label, value, color) {
    const colorMap = {
      brightgreen: '#4c1',
      green: '#97CA00',
      yellow: '#dfb317',
      orange: '#fe7d37',
      red: '#e05d44',
      blue: '#007ec6',
    };

    const actualColor = colorMap[color] || color;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="104" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="a">
    <rect width="104" height="20" rx="3" fill="#fff"/>
  </mask>
  <g mask="url(#a)">
    <path fill="#555" d="M0 0h63v20H0z"/>
    <path fill="${actualColor}" d="M63 0h41v20H63z"/>
    <path fill="url(#b)" d="M0 0h104v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="110">
    <text x="325" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="530">${label}</text>
    <text x="325" y="140" transform="scale(.1)" textLength="530">${label}</text>
    <text x="825" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="310">${value}</text>
    <text x="825" y="140" transform="scale(.1)" textLength="310">${value}</text>
  </g>
</svg>`;
  }

  /**
   * Create distribution package
   */
  async createDistributionPackage(reports) {
    const packagePath = path.join(this.config.reports.outputDir, 'distribution-package.json');

    const packageInfo = {
      timestamp: new Date().toISOString(),
      build: this.reportData.ci,
      reports,
      artifacts: {
        badges: fs.existsSync(path.join(this.config.reports.outputDir, 'badges')),
        charts: false, // Placeholder for chart generation
      },
      distribution: {
        ciArtifacts: this.config.distribution.uploadToCI,
        githubPages: this.config.distribution.publishToPages,
      },
    };

    fs.writeFileSync(packagePath, JSON.stringify(packageInfo, null, 2));

    return {
      packagePath,
      reports: Object.keys(reports).length,
      size: this.calculateDirectorySize(this.config.reports.outputDir),
    };
  }

  /**
   * Generate report URL
   */
  generateReportURL(reportPath) {
    if (process.env.GITHUB_PAGES_URL) {
      const relativePath = path.relative(this.config.reports.outputDir, reportPath);
      return `${process.env.GITHUB_PAGES_URL}/reports/${relativePath}`;
    }

    return `file://${reportPath}`;
  }

  /**
   * Calculate directory size
   */
  calculateDirectorySize(dirPath) {
    let totalSize = 0;

    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const file of files) {
        const fullPath = path.join(dirPath, file.name);

        if (file.isDirectory()) {
          totalSize += this.calculateDirectorySize(fullPath);
        } else {
          totalSize += fs.statSync(fullPath).size;
        }
      }
    }

    return totalSize;
  }

  /**
   * Clean up old reports
   */
  async cleanupOldReports() {
    try {
      const reports = fs
        .readdirSync(this.config.reports.outputDir)
        .filter((file) => file.startsWith('quality-report'))
        .map((file) => ({
          name: file,
          path: path.join(this.config.reports.outputDir, file),
          mtime: fs.statSync(path.join(this.config.reports.outputDir, file)).mtime,
        }))
        .sort((a, b) => b.mtime - a.mtime);

      // Remove old reports beyond retention limit
      const toDelete = reports.slice(this.config.retention.maxReports);

      for (const report of toDelete) {
        fs.unlinkSync(report.path);
        console.log(`    🗑️ Deleted old report: ${report.name}`);
      }

      if (toDelete.length > 0) {
        console.log(`    ♻️ Cleaned up ${toDelete.length} old reports`);
      }
    } catch (error) {
      console.warn(`    ⚠️ Failed to cleanup old reports: ${error.message}`);
    }
  }
}

// CLI Interface
if (require.main === module) {
  const generator = new QualityReportGenerator();
  const command = process.argv[2] || 'generate';

  async function handleCommand() {
    try {
      switch (command) {
        case 'generate':
          const result = await generator.generateReports();
          console.log('\n📋 Generation Result:', JSON.stringify(result, null, 2));
          break;

        case 'config':
          console.log('Configuration:', JSON.stringify(generator.config, null, 2));
          break;

        default:
          console.log(`Usage: ${process.argv[1]} <generate|config>`);
          console.log('  generate  - Generate quality reports (default)');
          console.log('  config    - Show configuration');
          console.log('');
          console.log('Environment Variables:');
          console.log('  CI_INCLUDE_ARTIFACTS  - Include visual artifacts (default: true)');
          console.log('  CI_GENERATE_BADGES    - Generate SVG badges (default: true)');
          console.log('  CI_PUBLISH_PAGES      - Publish to GitHub Pages (default: false)');
          console.log('  CI_KEEP_REPORTS       - Days to keep reports (default: 30)');
          process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  }

  handleCommand();
}

module.exports = { QualityReportGenerator };
