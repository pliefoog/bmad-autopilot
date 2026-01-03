#!/usr/bin/env node

/**
 * Story 11.6: Quality Threshold Enforcement Automation
 * PURPOSE: Automated threshold validation integrated in test pipeline
 * REQUIREMENT: AC#3 - Quality Threshold Enforcement Automation
 * METHOD: Build gates that fail on coverage/performance violations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class QualityGateEnforcer {
  constructor() {
    this.thresholds = this.loadThresholds();
    this.performanceConfig = this.loadPerformanceConfig();
    this.violations = [];
  }

  loadThresholds() {
    try {
      return JSON.parse(
        fs.readFileSync(path.join(__dirname, '../coverage/coverage-thresholds.json'), 'utf-8'),
      );
    } catch (error) {
      console.error('❌ Failed to load coverage thresholds configuration');
      process.exit(1);
    }
  }

  loadPerformanceConfig() {
    try {
      return JSON.parse(
        fs.readFileSync(path.join(__dirname, '../performance/threshold-config.json'), 'utf-8'),
      );
    } catch (error) {
      console.error('❌ Failed to load performance threshold configuration');
      process.exit(1);
    }
  }

  async runQualityGates() {
    console.log('🔍 Running Quality Gate Enforcement for Story 11.6...\n');

    try {
      // Step 1: Run tests with coverage
      console.log('📊 Step 1: Running coverage analysis...');
      this.runCoverageAnalysis();

      // Step 2: Validate coverage thresholds
      console.log('🎯 Step 2: Validating coverage thresholds...');
      this.validateCoverageThresholds();

      // Step 3: Run performance tests
      console.log('⚡ Step 3: Running performance validation...');
      this.runPerformanceValidation();

      // Step 4: Check marine safety compliance
      console.log('🚢 Step 4: Validating marine safety compliance...');
      this.validateMarineSafetyCompliance();

      // Step 5: Generate compliance report
      console.log('📋 Step 5: Generating compliance report...');
      this.generateComplianceReport();

      // Step 6: Enforce build gates
      this.enforceBuildGates();
    } catch (error) {
      console.error('❌ Quality gate enforcement failed:', error.message);
      process.exit(1);
    }
  }

  runCoverageAnalysis() {
    try {
      execSync('npm run test:coverage:thresholds', { stdio: 'inherit', cwd: process.cwd() });
      console.log('✅ Coverage analysis completed successfully');
    } catch (error) {
      this.violations.push({
        type: 'coverage',
        severity: 'critical',
        message: 'Coverage analysis failed or thresholds not met',
        details: error.message,
      });
      console.log('⚠️ Coverage analysis completed with violations');
    }
  }

  validateCoverageThresholds() {
    try {
      const coveragePath = path.join(__dirname, '../coverage/coverage-final.json');
      if (!fs.existsSync(coveragePath)) {
        throw new Error('Coverage report not found - run tests with coverage first');
      }

      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
      const thresholds = this.thresholds.thresholds;

      // Validate global thresholds
      const globalCoverage = this.calculateGlobalCoverage(coverage);
      this.checkThresholds('Global', globalCoverage, thresholds.global);

      console.log('✅ Coverage threshold validation completed');
    } catch (error) {
      this.violations.push({
        type: 'coverage_thresholds',
        severity: 'critical',
        message: 'Coverage threshold validation failed',
        details: error.message,
      });
      console.log('⚠️ Coverage threshold validation failed');
    }
  }

  calculateGlobalCoverage(coverage) {
    const files = Object.values(coverage);
    let totalLines = 0,
      coveredLines = 0;
    let totalFunctions = 0,
      coveredFunctions = 0;
    let totalBranches = 0,
      coveredBranches = 0;
    let totalStatements = 0,
      coveredStatements = 0;

    files.forEach((file) => {
      if (file.lines) {
        totalLines += Object.keys(file.lines).length;
        coveredLines += Object.values(file.lines).filter((hits) => hits > 0).length;
      }
      if (file.functions) {
        totalFunctions += Object.keys(file.functions).length;
        coveredFunctions += Object.values(file.functions).filter((hits) => hits > 0).length;
      }
      if (file.branches) {
        totalBranches += Object.keys(file.branches).length;
        coveredBranches += Object.values(file.branches).filter((hits) => hits > 0).length;
      }
      if (file.statements) {
        totalStatements += Object.keys(file.statements).length;
        coveredStatements += Object.values(file.statements).filter((hits) => hits > 0).length;
      }
    });

    return {
      lines: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 100,
      functions: totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 100,
      branches: totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 100) : 100,
      statements:
        totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 100,
    };
  }

  checkThresholds(domain, actual, required) {
    const metrics = ['lines', 'functions', 'branches', 'statements'];

    metrics.forEach((metric) => {
      if (actual[metric] < required[metric]) {
        this.violations.push({
          type: 'coverage_threshold',
          severity: 'critical',
          message: `${domain} ${metric} coverage ${actual[metric]}% below required ${required[metric]}%`,
          domain,
          metric,
          actual: actual[metric],
          required: required[metric],
        });
      }
    });
  }

  runPerformanceValidation() {
    try {
      execSync('npm run test:performance', { stdio: 'inherit', cwd: process.cwd() });

      // Check performance report
      const performancePath = path.join(__dirname, '../performance/test-performance-report.json');
      if (fs.existsSync(performancePath)) {
        const report = JSON.parse(fs.readFileSync(performancePath, 'utf-8'));
        this.validatePerformanceMetrics(report);
      }

      console.log('✅ Performance validation completed');
    } catch (error) {
      this.violations.push({
        type: 'performance',
        severity: 'critical',
        message: 'Performance validation failed',
        details: error.message,
      });
      console.log('⚠️ Performance validation completed with violations');
    }
  }

  validatePerformanceMetrics(report) {
    const thresholds = this.performanceConfig.performance_gates;
    const summary = report.summary;

    if (summary.averageRenderTime > thresholds.render_performance.fail_threshold_ms) {
      this.violations.push({
        type: 'performance',
        severity: 'critical',
        message: `Average render time ${summary.averageRenderTime.toFixed(
          2,
        )}ms exceeds fail threshold ${thresholds.render_performance.fail_threshold_ms}ms`,
      });
    }

    if (summary.averageMemoryUsage > thresholds.memory_limits.fail_threshold_mb) {
      this.violations.push({
        type: 'performance',
        severity: 'critical',
        message: `Average memory usage ${summary.averageMemoryUsage.toFixed(
          2,
        )}MB exceeds fail threshold ${thresholds.memory_limits.fail_threshold_mb}MB`,
      });
    }

    if (summary.averageDataLatency > thresholds.data_latency.fail_threshold_ms) {
      this.violations.push({
        type: 'performance',
        severity: 'critical',
        message: `Average data latency ${summary.averageDataLatency.toFixed(
          2,
        )}ms exceeds fail threshold ${thresholds.data_latency.fail_threshold_ms}ms`,
      });
    }

    if (summary.averageThroughput < thresholds.throughput.fail_threshold_msgs_sec) {
      this.violations.push({
        type: 'performance',
        severity: 'critical',
        message: `Average throughput ${summary.averageThroughput.toFixed(
          2,
        )} msg/sec below fail threshold ${thresholds.throughput.fail_threshold_msgs_sec} msg/sec`,
      });
    }
  }

  validateMarineSafetyCompliance() {
    try {
      const marinePath = path.join(__dirname, '../coverage/marine-safety-report.json');
      if (fs.existsSync(marinePath)) {
        const report = JSON.parse(fs.readFileSync(marinePath, 'utf-8'));

        if (!report.compliance.all_critical_compliant) {
          this.violations.push({
            type: 'marine_safety',
            severity: 'critical',
            message: 'Critical marine safety functions do not meet coverage requirements',
            details: `${report.compliance.total_violations} violations found in safety-critical areas`,
          });
        }
      }

      console.log('✅ Marine safety compliance validation completed');
    } catch (error) {
      this.violations.push({
        type: 'marine_safety',
        severity: 'warning',
        message: 'Marine safety compliance check failed',
        details: error.message,
      });
      console.log('⚠️ Marine safety compliance check completed with issues');
    }
  }

  generateComplianceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      story: '11.6 - Coverage and Performance Thresholds',
      overall_compliance: this.violations.filter((v) => v.severity === 'critical').length === 0,
      violations: this.violations,
      summary: {
        total_violations: this.violations.length,
        critical_violations: this.violations.filter((v) => v.severity === 'critical').length,
        warning_violations: this.violations.filter((v) => v.severity === 'warning').length,
        compliance_rate:
          this.violations.length === 0
            ? '100%'
            : `${Math.max(
                0,
                100 - this.violations.filter((v) => v.severity === 'critical').length * 25,
              ).toFixed(1)}%`,
      },
    };

    const reportPath = path.join(__dirname, '../coverage/quality-gate-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`📊 Quality gate report generated: ${reportPath}`);
    return report;
  }

  enforceBuildGates() {
    const criticalViolations = this.violations.filter((v) => v.severity === 'critical');

    console.log('\n🚧 Quality Gate Enforcement Results');
    console.log('===================================');

    if (criticalViolations.length === 0) {
      console.log('✅ All quality gates PASSED');
      console.log('🎯 Story 11.6: Coverage and Performance Thresholds - COMPLIANT');

      if (this.violations.length > 0) {
        console.log(`⚠️  ${this.violations.length} warnings detected (non-blocking)`);
        this.violations.forEach((violation) => {
          console.log(`   • ${violation.message}`);
        });
      }

      console.log('\n🚀 Build can proceed to next stage');
      process.exit(0);
    } else {
      console.log('❌ Quality gates FAILED');
      console.log(`🚫 ${criticalViolations.length} critical violations detected (build-blocking)`);

      criticalViolations.forEach((violation) => {
        console.log(`   🔴 ${violation.type.toUpperCase()}: ${violation.message}`);
      });

      console.log('\n🛑 Build must be fixed before proceeding');
      console.log('💡 Review coverage reports and performance metrics');
      console.log('🔧 Run individual test commands to debug specific issues');

      process.exit(1);
    }
  }
}

// Run quality gates if called directly
if (require.main === module) {
  const enforcer = new QualityGateEnforcer();
  enforcer.runQualityGates().catch((error) => {
    console.error('❌ Quality gate enforcement failed:', error);
    process.exit(1);
  });
}

module.exports = QualityGateEnforcer;
