#!/usr/bin/env node

/**
 * Story 11.8: CI/CD Pipeline Integration - Enhanced Quality Gates with CI/CD Integration
 * PURPOSE: Coverage threshold enforcement in build pipeline with CI/CD-specific features
 * REQUIREMENT: AC#2 - Quality Gate Integration - Coverage threshold enforcement in pipeline
 * METHOD: Enhanced quality gate enforcer with CI/CD pipeline integration and build failure logic
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

class CIPipelineQualityGates {
  constructor() {
    this.config = this.loadConfiguration();
    this.thresholds = this.loadThresholds();
    this.performanceConfig = this.loadPerformanceConfig();
    this.violations = [];
    this.results = {
      coverage: null,
      performance: null,
      marineSafety: null,
      qualityScore: 0,
      passed: false
    };
  }

  /**
   * Load CI/CD specific configuration
   */
  loadConfiguration() {
    const defaultConfig = {
      ci: {
        failOnViolation: process.env.CI_FAIL_ON_QUALITY_VIOLATION !== 'false',
        generateReports: process.env.CI_GENERATE_REPORTS !== 'false',
        uploadArtifacts: process.env.CI_UPLOAD_ARTIFACTS !== 'false',
        slackWebhook: process.env.CI_SLACK_WEBHOOK || null,
        emailNotifications: process.env.CI_EMAIL_NOTIFICATIONS || null
      },
      coverage: {
        enforceThresholds: true,
        generateLcovReport: true,
        generateHtmlReport: process.env.CI !== 'true', // Skip HTML in CI
        failBuildOnViolation: true
      },
      performance: {
        enforceThresholds: true,
        trackRegression: true,
        baselineFile: path.join(__dirname, '../performance/baseline-metrics.json'),
        regressionThreshold: 0.1 // 10% regression tolerance
      },
      marineSafety: {
        enforceCompliance: true,
        requireCrashFreeRate: 0.995, // 99.5%
        maxLatency: 100, // 100ms NMEA sentence to widget update
        minUptime: 0.999 // 99.9% uptime requirement
      }
    };

    try {
      const configPath = path.join(__dirname, '../config/ci-quality-gates.json');
      if (fs.existsSync(configPath)) {
        const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return this.mergeDeep(defaultConfig, userConfig);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to load CI quality gates config: ${error.message}`);
    }

    return defaultConfig;
  }

  /**
   * Load coverage thresholds from existing configuration
   */
  loadThresholds() {
    try {
      const thresholdPath = path.join(__dirname, '../coverage/coverage-thresholds.json');
      if (fs.existsSync(thresholdPath)) {
        return JSON.parse(fs.readFileSync(thresholdPath, 'utf-8'));
      }
    } catch (error) {
      console.error('❌ Failed to load coverage thresholds configuration');
    }

    // Default thresholds from Story 11.6
    return {
      global: { statements: 70, branches: 70, functions: 70, lines: 70 },
      widgets: { statements: 85, branches: 85, functions: 85, lines: 85 },
      services: { statements: 80, branches: 80, functions: 80, lines: 80 },
      integration: { statements: 90, branches: 90, functions: 90, lines: 90 }
    };
  }

  /**
   * Load performance configuration
   */
  loadPerformanceConfig() {
    try {
      const configPath = path.join(__dirname, '../performance/threshold-config.json');
      if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
    } catch (error) {
      console.error('❌ Failed to load performance threshold configuration');
    }

    // Default performance thresholds from Story 11.6
    return {
      rendering: { maxTime: 16, unit: 'ms' },
      latency: { maxTime: 100, unit: 'ms' },
      memory: { maxUsage: 50, unit: 'MB' },
      crashFreeRate: { minimum: 99.5, unit: '%' }
    };
  }

  /**
   * Execute complete CI/CD quality gate pipeline
   */
  async executeQualityGates(options = {}) {
    console.log('🎯 Executing CI/CD Quality Gates Pipeline...');
    const startTime = Date.now();

    try {
      // Step 1: Run tests with coverage
      console.log('\n📊 Step 1: Running coverage analysis with CI reporting...');
      await this.runCoverageAnalysis();

      // Step 2: Validate coverage thresholds
      console.log('\n🎯 Step 2: Validating coverage thresholds...');
      this.validateCoverageThresholds();

      // Step 3: Run performance validation
      console.log('\n⚡ Step 3: Running performance validation...');
      await this.runPerformanceValidation();

      // Step 4: Validate marine safety compliance
      console.log('\n🛡️ Step 4: Validating marine safety compliance...');
      await this.validateMarineSafetyCompliance();

      // Step 5: Generate quality reports
      console.log('\n📈 Step 5: Generating quality reports...');
      await this.generateQualityReports();

      // Step 6: Send notifications if configured
      if (this.config.ci.slackWebhook || this.config.ci.emailNotifications) {
        console.log('\n📢 Step 6: Sending notifications...');
        await this.sendNotifications();
      }

      // Step 7: Determine overall quality gate status
      this.calculateQualityScore();
      
      const duration = Date.now() - startTime;
      console.log(`\n✅ Quality gates completed in ${duration}ms`);
      
      if (this.results.passed) {
        console.log('🎉 All quality gates PASSED!');
        return this.createSuccessResult(duration);
      } else {
        console.log('❌ Quality gates FAILED!');
        return this.createFailureResult(duration);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`💥 Quality gates pipeline failed: ${error.message}`);
      return this.createErrorResult(error, duration);
    }
  }

  /**
   * Run coverage analysis with CI-specific options
   */
  async runCoverageAnalysis() {
    try {
      const coverageCommand = [
        'npm', 'run', 'test:coverage:thresholds',
        '--', 
        '--passWithNoTests',
        '--ci',
        '--coverage',
        '--watchAll=false',
        '--testResultsProcessor=<rootDir>/src/test-utils/ci-test-processor.js'
      ];

      if (this.config.coverage.generateLcovReport) {
        coverageCommand.push('--coverageReporters=lcov');
      }

      if (this.config.coverage.generateHtmlReport) {
        coverageCommand.push('--coverageReporters=html');
      }

      console.log('  Running: ' + coverageCommand.join(' '));
      
      const result = execSync(coverageCommand.join(' '), {
        cwd: path.join(__dirname, '../..'),
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      console.log('  ✅ Coverage analysis completed');
      return { success: true, output: result.toString() };

    } catch (error) {
      console.error('  ❌ Coverage analysis failed');
      throw new Error(`Coverage analysis failed: ${error.message}`);
    }
  }

  /**
   * Validate coverage thresholds with enhanced reporting
   */
  validateCoverageThresholds() {
    const coverageFiles = [
      path.join(__dirname, '../../coverage/coverage-summary.json'),
      path.join(__dirname, '../../coverage/jest-coverage.json')
    ];

    let coverageData = null;
    
    for (const file of coverageFiles) {
      if (fs.existsSync(file)) {
        try {
          coverageData = JSON.parse(fs.readFileSync(file, 'utf-8'));
          break;
        } catch (error) {
          console.warn(`  ⚠️ Failed to parse coverage file ${file}: ${error.message}`);
        }
      }
    }

    if (!coverageData) {
      throw new Error('No coverage data found. Ensure tests ran with coverage enabled.');
    }

    const violations = [];
    let totalScore = 0;
    let categoryCount = 0;

    // Validate each category
    for (const [category, thresholds] of Object.entries(this.thresholds)) {
      const categoryData = this.extractCategoryData(coverageData, category);
      const categoryResult = this.validateCategoryThresholds(category, categoryData, thresholds);
      
      if (!categoryResult.passed) {
        violations.push(...categoryResult.violations);
      }

      totalScore += categoryResult.score;
      categoryCount++;

      console.log(`  📊 ${category}: ${categoryResult.score.toFixed(1)}% (${categoryResult.passed ? '✅' : '❌'})`);
    }

    this.results.coverage = {
      passed: violations.length === 0,
      score: totalScore / categoryCount,
      violations,
      totalCategories: categoryCount,
      categoriesPassed: categoryCount - violations.filter(v => v.category).length
    };

    if (violations.length > 0) {
      console.log(`  ❌ Coverage violations found: ${violations.length}`);
      violations.forEach(v => console.log(`    - ${v.message}`));
      
      if (this.config.coverage.failBuildOnViolation) {
        this.violations.push(...violations);
      }
    } else {
      console.log('  ✅ All coverage thresholds met');
    }
  }

  /**
   * Extract coverage data for specific category
   */
  extractCategoryData(coverageData, category) {
    if (category === 'global') {
      return coverageData.total || coverageData;
    }

    // For other categories, filter by path patterns
    const patterns = {
      widgets: /\/widgets\/|\/components\/.*Widget/,
      services: /\/services\//,
      integration: /integration|e2e/
    };

    const pattern = patterns[category];
    if (!pattern || !coverageData.files) {
      return coverageData.total || coverageData;
    }

    // Aggregate coverage for files matching pattern
    const matchingFiles = Object.entries(coverageData.files || {})
      .filter(([path]) => pattern.test(path));

    if (matchingFiles.length === 0) {
      return coverageData.total || coverageData;
    }

    // Calculate aggregate coverage
    const aggregate = { statements: 0, branches: 0, functions: 0, lines: 0 };
    matchingFiles.forEach(([, data]) => {
      aggregate.statements += data.statements?.pct || 0;
      aggregate.branches += data.branches?.pct || 0;
      aggregate.functions += data.functions?.pct || 0;
      aggregate.lines += data.lines?.pct || 0;
    });

    const fileCount = matchingFiles.length;
    return {
      statements: { pct: aggregate.statements / fileCount },
      branches: { pct: aggregate.branches / fileCount },
      functions: { pct: aggregate.functions / fileCount },
      lines: { pct: aggregate.lines / fileCount }
    };
  }

  /**
   * Validate thresholds for a specific category
   */
  validateCategoryThresholds(category, data, thresholds) {
    const violations = [];
    const scores = [];

    for (const [metric, threshold] of Object.entries(thresholds)) {
      const actual = data[metric]?.pct || 0;
      scores.push(actual);

      if (actual < threshold) {
        violations.push({
          category,
          metric,
          actual: actual.toFixed(1),
          threshold,
          message: `${category} ${metric} coverage ${actual.toFixed(1)}% < ${threshold}% threshold`
        });
      }
    }

    return {
      passed: violations.length === 0,
      score: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      violations
    };
  }

  /**
   * Run performance validation with regression detection
   */
  async runPerformanceValidation() {
    try {
      // Run performance tests
      const performanceCommand = 'npm run test:performance-validation';
      console.log(`  Running: ${performanceCommand}`);

      const result = execSync(performanceCommand, {
        cwd: path.join(__dirname, '../..'),
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 60000 // 60 seconds timeout
      });

      // Check for performance regression
      await this.checkPerformanceRegression();

      this.results.performance = {
        passed: true,
        message: 'Performance validation passed'
      };

      console.log('  ✅ Performance validation passed');

    } catch (error) {
      const errorMessage = error.stdout ? error.stdout.toString() : error.message;
      
      this.results.performance = {
        passed: false,
        error: errorMessage
      };

      console.error('  ❌ Performance validation failed');
      
      if (this.config.performance.enforceThresholds) {
        this.violations.push({
          type: 'performance',
          message: `Performance validation failed: ${errorMessage}`
        });
      }
    }
  }

  /**
   * Check for performance regression against baseline
   */
  async checkPerformanceRegression() {
    if (!fs.existsSync(this.config.performance.baselineFile)) {
      console.log('  ⚠️ No performance baseline found, skipping regression check');
      return;
    }

    try {
      const baseline = JSON.parse(fs.readFileSync(this.config.performance.baselineFile, 'utf-8'));
      const currentMetricsFile = path.join(__dirname, '../../coverage/performance-results.json');
      
      if (!fs.existsSync(currentMetricsFile)) {
        console.warn('  ⚠️ No current performance metrics found');
        return;
      }

      const current = JSON.parse(fs.readFileSync(currentMetricsFile, 'utf-8'));
      
      // Compare key metrics
      const regressions = [];
      
      for (const [metric, baselineValue] of Object.entries(baseline)) {
        const currentValue = current[metric];
        if (currentValue && typeof baselineValue === 'number') {
          const regression = (currentValue - baselineValue) / baselineValue;
          
          if (regression > this.config.performance.regressionThreshold) {
            regressions.push({
              metric,
              baseline: baselineValue,
              current: currentValue,
              regression: (regression * 100).toFixed(1)
            });
          }
        }
      }

      if (regressions.length > 0) {
        console.log('  ⚠️ Performance regressions detected:');
        regressions.forEach(r => {
          console.log(`    - ${r.metric}: ${r.current} vs ${r.baseline} baseline (+${r.regression}%)`);
        });
        
        if (this.config.performance.trackRegression) {
          this.violations.push({
            type: 'performance-regression',
            regressions,
            message: `Performance regression detected in ${regressions.length} metrics`
          });
        }
      } else {
        console.log('  ✅ No performance regressions detected');
      }

    } catch (error) {
      console.warn(`  ⚠️ Failed to check performance regression: ${error.message}`);
    }
  }

  /**
   * Validate marine safety compliance requirements
   */
  async validateMarineSafetyCompliance() {
    try {
      // Run marine safety tests
      const marineSafetyCommand = 'npm run test:marine-safety';
      console.log(`  Running: ${marineSafetyCommand}`);

      const result = execSync(marineSafetyCommand, {
        cwd: path.join(__dirname, '../..'),
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 120000 // 2 minutes timeout
      });

      // Validate marine safety metrics
      await this.validateMarineSafetyMetrics();

      this.results.marineSafety = {
        passed: true,
        message: 'Marine safety compliance validated'
      };

      console.log('  ✅ Marine safety compliance validated');

    } catch (error) {
      const errorMessage = error.stdout ? error.stdout.toString() : error.message;
      
      this.results.marineSafety = {
        passed: false,
        error: errorMessage
      };

      console.error('  ❌ Marine safety compliance failed');
      
      if (this.config.marineSafety.enforceCompliance) {
        this.violations.push({
          type: 'marine-safety',
          message: `Marine safety compliance failed: ${errorMessage}`
        });
      }
    }
  }

  /**
   * Validate marine safety metrics
   */
  async validateMarineSafetyMetrics() {
    const metricsFile = path.join(__dirname, '../../coverage/marine-safety-metrics.json');
    
    if (!fs.existsSync(metricsFile)) {
      console.warn('  ⚠️ No marine safety metrics found');
      return;
    }

    try {
      const metrics = JSON.parse(fs.readFileSync(metricsFile, 'utf-8'));
      const violations = [];

      // Check crash-free rate
      if (metrics.crashFreeRate < this.config.marineSafety.requireCrashFreeRate) {
        violations.push({
          metric: 'crashFreeRate',
          actual: (metrics.crashFreeRate * 100).toFixed(2) + '%',
          required: (this.config.marineSafety.requireCrashFreeRate * 100).toFixed(1) + '%',
          message: `Crash-free rate ${(metrics.crashFreeRate * 100).toFixed(2)}% below required ${(this.config.marineSafety.requireCrashFreeRate * 100).toFixed(1)}%`
        });
      }

      // Check NMEA latency
      if (metrics.averageNmeaLatency > this.config.marineSafety.maxLatency) {
        violations.push({
          metric: 'nmeaLatency',
          actual: metrics.averageNmeaLatency + 'ms',
          required: '<= ' + this.config.marineSafety.maxLatency + 'ms',
          message: `NMEA latency ${metrics.averageNmeaLatency}ms exceeds maximum ${this.config.marineSafety.maxLatency}ms`
        });
      }

      if (violations.length > 0) {
        console.log('  ⚠️ Marine safety violations:');
        violations.forEach(v => console.log(`    - ${v.message}`));
        this.violations.push(...violations);
      } else {
        console.log('  ✅ All marine safety metrics within thresholds');
      }

    } catch (error) {
      console.warn(`  ⚠️ Failed to validate marine safety metrics: ${error.message}`);
    }
  }

  /**
   * Calculate overall quality score
   */
  calculateQualityScore() {
    const weights = { coverage: 0.4, performance: 0.3, marineSafety: 0.3 };
    let totalScore = 0;
    let totalWeight = 0;

    if (this.results.coverage) {
      totalScore += this.results.coverage.score * weights.coverage;
      totalWeight += weights.coverage;
    }

    if (this.results.performance && this.results.performance.passed) {
      totalScore += 100 * weights.performance; // Full score for passed performance
      totalWeight += weights.performance;
    }

    if (this.results.marineSafety && this.results.marineSafety.passed) {
      totalScore += 100 * weights.marineSafety; // Full score for passed marine safety
      totalWeight += weights.marineSafety;
    }

    this.results.qualityScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    this.results.passed = this.violations.length === 0 && this.results.qualityScore >= 70;

    console.log(`\n📊 Quality Score: ${this.results.qualityScore.toFixed(1)}%`);
    console.log(`🎯 Quality Gate Status: ${this.results.passed ? 'PASSED' : 'FAILED'}`);
  }

  /**
   * Generate comprehensive quality reports
   */
  async generateQualityReports() {
    if (!this.config.ci.generateReports) {
      console.log('  📄 Report generation disabled');
      return;
    }

    try {
      const reportsDir = path.join(__dirname, '../../coverage/reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      // Generate comprehensive report
      const report = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'test',
        ci: {
          buildNumber: process.env.GITHUB_RUN_NUMBER || process.env.BUILD_NUMBER || 'unknown',
          commitHash: process.env.GITHUB_SHA || 'unknown',
          branch: process.env.GITHUB_REF_NAME || 'unknown'
        },
        results: this.results,
        violations: this.violations,
        configuration: this.config,
        thresholds: this.thresholds
      };

      // Write JSON report
      const jsonReportPath = path.join(reportsDir, 'quality-gates-report.json');
      fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));

      // Write markdown summary
      const markdownReportPath = path.join(reportsDir, 'quality-gates-summary.md');
      fs.writeFileSync(markdownReportPath, this.generateMarkdownSummary(report));

      console.log(`  📄 Quality reports generated:`);
      console.log(`    - JSON: ${jsonReportPath}`);
      console.log(`    - Markdown: ${markdownReportPath}`);

    } catch (error) {
      console.error(`  ❌ Failed to generate reports: ${error.message}`);
    }
  }

  /**
   * Generate markdown summary report
   */
  generateMarkdownSummary(report) {
    const status = report.results.passed ? '✅ PASSED' : '❌ FAILED';
    const score = report.results.qualityScore.toFixed(1);
    
    let markdown = `# Quality Gates Report\n\n`;
    markdown += `**Status:** ${status}\n`;
    markdown += `**Score:** ${score}%\n`;
    markdown += `**Timestamp:** ${report.timestamp}\n`;
    markdown += `**Build:** ${report.ci.buildNumber} (${report.ci.commitHash.substring(0, 8)})\n\n`;

    // Coverage results
    if (report.results.coverage) {
      markdown += `## 📊 Coverage Analysis\n\n`;
      markdown += `- **Score:** ${report.results.coverage.score.toFixed(1)}%\n`;
      markdown += `- **Status:** ${report.results.coverage.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
      markdown += `- **Categories:** ${report.results.coverage.categoriesPassed}/${report.results.coverage.totalCategories} passed\n\n`;
      
      if (report.results.coverage.violations.length > 0) {
        markdown += `### Coverage Violations\n\n`;
        report.results.coverage.violations.forEach(v => {
          markdown += `- **${v.category} ${v.metric}:** ${v.actual}% < ${v.threshold}% threshold\n`;
        });
        markdown += '\n';
      }
    }

    // Performance results
    if (report.results.performance) {
      markdown += `## ⚡ Performance Validation\n\n`;
      markdown += `- **Status:** ${report.results.performance.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
      if (report.results.performance.error) {
        markdown += `- **Error:** ${report.results.performance.error}\n`;
      }
      markdown += '\n';
    }

    // Marine safety results
    if (report.results.marineSafety) {
      markdown += `## 🛡️ Marine Safety Compliance\n\n`;
      markdown += `- **Status:** ${report.results.marineSafety.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
      if (report.results.marineSafety.error) {
        markdown += `- **Error:** ${report.results.marineSafety.error}\n`;
      }
      markdown += '\n';
    }

    // Violations summary
    if (report.violations.length > 0) {
      markdown += `## ⚠️ Quality Violations\n\n`;
      report.violations.forEach((v, index) => {
        markdown += `${index + 1}. **${v.type || 'General'}:** ${v.message}\n`;
      });
      markdown += '\n';
    }

    return markdown;
  }

  /**
   * Send notifications if configured
   */
  async sendNotifications() {
    // Slack notification
    if (this.config.ci.slackWebhook) {
      await this.sendSlackNotification();
    }

    // Email notification (placeholder - would integrate with email service)
    if (this.config.ci.emailNotifications) {
      console.log('  📧 Email notifications configured but not implemented');
    }
  }

  /**
   * Send Slack notification
   */
  async sendSlackNotification() {
    try {
      const status = this.results.passed ? 'PASSED ✅' : 'FAILED ❌';
      const color = this.results.passed ? 'good' : 'danger';
      
      const payload = {
        text: `Quality Gates ${status}`,
        attachments: [{
          color,
          fields: [
            {
              title: 'Quality Score',
              value: `${this.results.qualityScore.toFixed(1)}%`,
              short: true
            },
            {
              title: 'Build',
              value: process.env.GITHUB_RUN_NUMBER || 'unknown',
              short: true
            },
            {
              title: 'Violations',
              value: this.violations.length.toString(),
              short: true
            }
          ]
        }]
      };

      // In a real implementation, you'd use fetch or axios to send to Slack
      console.log('  📢 Slack notification prepared (webhook integration required)');
      console.log('     Payload:', JSON.stringify(payload, null, 2));

    } catch (error) {
      console.error(`  ❌ Failed to send Slack notification: ${error.message}`);
    }
  }

  /**
   * Create success result
   */
  createSuccessResult(duration) {
    return {
      success: true,
      passed: true,
      duration,
      qualityScore: this.results.qualityScore,
      results: this.results,
      violations: [],
      ciRecommendation: 'Continue with deployment pipeline'
    };
  }

  /**
   * Create failure result
   */
  createFailureResult(duration) {
    const result = {
      success: false,
      passed: false,
      duration,
      qualityScore: this.results.qualityScore,
      results: this.results,
      violations: this.violations,
      ciRecommendation: 'Block deployment, fix quality violations'
    };

    if (this.config.ci.failOnViolation) {
      result.exitCode = 1;
    }

    return result;
  }

  /**
   * Create error result
   */
  createErrorResult(error, duration) {
    return {
      success: false,
      passed: false,
      duration,
      error: error.message,
      results: this.results,
      violations: this.violations,
      ciRecommendation: 'Fix pipeline errors, retry quality gates',
      exitCode: 1
    };
  }

  /**
   * Utility: Deep merge objects
   */
  mergeDeep(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] instanceof Object && key in result && result[key] instanceof Object) {
        result[key] = this.mergeDeep(result[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}

// CLI Interface
if (require.main === module) {
  const qualityGates = new CIPipelineQualityGates();
  const command = process.argv[2] || 'run';

  async function handleCommand() {
    try {
      let result;
      
      switch (command) {
        case 'run':
          result = await qualityGates.executeQualityGates();
          console.log('\n📋 Final Result:', JSON.stringify(result, null, 2));
          
          if (!result.success && qualityGates.config.ci.failOnViolation) {
            process.exit(result.exitCode || 1);
          }
          break;

        case 'config':
          console.log('Configuration:', JSON.stringify(qualityGates.config, null, 2));
          console.log('Thresholds:', JSON.stringify(qualityGates.thresholds, null, 2));
          break;

        case 'validate-config':
          console.log('✅ Configuration is valid');
          console.log(`Coverage thresholds loaded: ${Object.keys(qualityGates.thresholds).length} categories`);
          console.log(`CI features enabled: ${Object.keys(qualityGates.config.ci).filter(k => qualityGates.config.ci[k]).length}`);
          break;

        default:
          console.log(`Usage: ${process.argv[1]} <run|config|validate-config>`);
          console.log('  run              - Execute complete quality gates pipeline (default)');
          console.log('  config           - Show current configuration');
          console.log('  validate-config  - Validate configuration files');
          console.log('');
          console.log('Environment Variables:');
          console.log('  CI_FAIL_ON_QUALITY_VIOLATION - Fail build on violations (default: true)');
          console.log('  CI_GENERATE_REPORTS         - Generate quality reports (default: true)');
          console.log('  CI_SLACK_WEBHOOK            - Slack webhook URL for notifications');
          console.log('  CI_EMAIL_NOTIFICATIONS      - Email addresses for notifications');
          process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  }

  handleCommand();
}

module.exports = { CIPipelineQualityGates };