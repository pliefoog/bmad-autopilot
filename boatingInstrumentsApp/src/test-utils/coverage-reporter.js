/**
 * Story 11.6: Custom Coverage Reporter for Marine Safety Focus Areas
 * PURPOSE: Generate specialized coverage reports emphasizing marine safety critical functions
 * REQUIREMENT: AC#1 - Coverage Threshold Framework Implementation
 * METHOD: Jest custom reporter with marine domain-specific analysis
 */

const fs = require('fs');
const path = require('path');

class CustomCoverageReporter {
  constructor(globalConfig, options) {
    this.marineSafetyConfig = null;
    this.thresholdConfig = null;
    this.loadMarineSafetyConfig();
    this.loadThresholdConfig();
  }

  loadMarineSafetyConfig() {
    try {
      const configPath = path.join(process.cwd(), 'coverage/marine-safety-coverage.json');
      this.marineSafetyConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (error) {
      console.warn('⚠️ Marine safety coverage config not found, using defaults');
      this.marineSafetyConfig = { safety_critical_functions: {} };
    }
  }

  loadThresholdConfig() {
    try {
      const configPath = path.join(process.cwd(), 'coverage/coverage-thresholds.json');
      this.thresholdConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (error) {
      console.warn('⚠️ Coverage threshold config not found, using defaults');
      this.thresholdConfig = { thresholds: {} };
    }
  }

  onRunComplete(contexts, results) {
    if (!results.coverageMap) {
      console.log('📊 No coverage data available for marine safety analysis');
      return;
    }

    const coverageData = results.coverageMap.toJSON();
    const marineCoverageReport = this.analyzeMarineSafetyCoverage(coverageData);
    
    this.generateMarineSafetyReport(marineCoverageReport);
    this.generateThresholdComplianceReport(coverageData);
    this.logCoverageToConsole(marineCoverageReport);
  }

  analyzeMarineSafetyCoverage(coverageData) {
    const safetyFunctions = this.marineSafetyConfig.safety_critical_functions || {};
    const marineCoverage = [];

    for (const [domain, config] of Object.entries(safetyFunctions)) {
      const domainFiles = this.matchFiles(coverageData, config.paths || []);
      
      if (domainFiles.length > 0) {
        const domainCoverage = this.calculateDomainCoverage(coverageData, domainFiles);
        const requiredCoverage = config.coverage_required || 80;
        const violations = this.checkDomainViolations(domainCoverage, requiredCoverage, domain);

        marineCoverage.push({
          domain,
          priority: config.priority || 'medium',
          coverage: domainCoverage,
          files: domainFiles,
          violations
        });
      }
    }

    return marineCoverage;
  }

  matchFiles(coverageData, patterns) {
    const allFiles = Object.keys(coverageData);
    const matchedFiles = [];

    patterns.forEach(pattern => {
      // Convert glob pattern to regex (simplified)
      const regexPattern = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\./g, '\\.')
        .replace(/\{([^}]+)\}/g, '($1)')
        .replace(/,/g, '|');

      const regex = new RegExp(regexPattern);
      
      allFiles.forEach(file => {
        if (regex.test(file) && !matchedFiles.includes(file)) {
          matchedFiles.push(file);
        }
      });
    });

    return matchedFiles;
  }

  calculateDomainCoverage(coverageData, files) {
    let totalFunctions = 0, coveredFunctions = 0;
    let totalStatements = 0, coveredStatements = 0;
    let totalBranches = 0, coveredBranches = 0;
    let totalLines = 0, coveredLines = 0;

    files.forEach(file => {
      const fileCoverage = coverageData[file];
      if (fileCoverage) {
        totalFunctions += fileCoverage.functions.total;
        coveredFunctions += fileCoverage.functions.covered;
        totalStatements += fileCoverage.statements.total;
        coveredStatements += fileCoverage.statements.covered;
        totalBranches += fileCoverage.branches.total;
        coveredBranches += fileCoverage.branches.covered;
        totalLines += fileCoverage.lines.total;
        coveredLines += fileCoverage.lines.covered;
      }
    });

    return {
      functions: totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 100,
      statements: totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 100,
      branches: totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 100) : 100,
      lines: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 100
    };
  }

  checkDomainViolations(coverage, requiredCoverage, domain) {
    const violations = [];

    if (coverage.functions < requiredCoverage) {
      violations.push(`Functions coverage ${coverage.functions}% below required ${requiredCoverage}%`);
    }
    if (coverage.statements < requiredCoverage) {
      violations.push(`Statements coverage ${coverage.statements}% below required ${requiredCoverage}%`);
    }
    if (coverage.branches < requiredCoverage) {
      violations.push(`Branches coverage ${coverage.branches}% below required ${requiredCoverage}%`);
    }
    if (coverage.lines < requiredCoverage) {
      violations.push(`Lines coverage ${coverage.lines}% below required ${requiredCoverage}%`);
    }

    return violations;
  }

  generateMarineSafetyReport(marineCoverage) {
    const reportPath = path.join(process.cwd(), 'coverage/marine-safety-report.json');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(marineCoverage),
      domains: marineCoverage,
      compliance: this.checkCompliance(marineCoverage)
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }

  generateThresholdComplianceReport(coverageData) {
    const reportPath = path.join(process.cwd(), 'coverage/threshold-compliance.json');
    const thresholds = this.thresholdConfig.thresholds || {};
    
    const compliance = Object.entries(thresholds).map(([domain, config]) => {
      const patterns = this.thresholdConfig.domains && this.thresholdConfig.domains[domain] ? this.thresholdConfig.domains[domain] : [];
      const files = this.matchFiles(coverageData, patterns);
      const coverage = this.calculateDomainCoverage(coverageData, files);
      
      return {
        domain,
        required: {
          functions: config.functions,
          statements: config.statements,
          branches: config.branches,
          lines: config.lines
        },
        actual: coverage,
        compliant: this.isDomainCompliant(coverage, config),
        files: files.length
      };
    });

    const report = {
      timestamp: new Date().toISOString(),
      overall_compliance: compliance.every(c => c.compliant),
      domains: compliance
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }

  isDomainCompliant(coverage, required) {
    return coverage.functions >= (required.functions || 0) &&
           coverage.statements >= (required.statements || 0) &&
           coverage.branches >= (required.branches || 0) &&
           coverage.lines >= (required.lines || 0);
  }

  generateSummary(marineCoverage) {
    const critical = marineCoverage.filter(c => c.priority === 'critical');
    const totalViolations = marineCoverage.reduce((sum, c) => sum + c.violations.length, 0);

    return {
      total_domains: marineCoverage.length,
      critical_domains: critical.length,
      domains_with_violations: marineCoverage.filter(c => c.violations.length > 0).length,
      total_violations: totalViolations,
      overall_marine_safety_compliance: totalViolations === 0
    };
  }

  checkCompliance(marineCoverage) {
    return {
      all_critical_compliant: marineCoverage
        .filter(c => c.priority === 'critical')
        .every(c => c.violations.length === 0),
      total_violations: marineCoverage.reduce((sum, c) => sum + c.violations.length, 0),
      compliance_rate: marineCoverage.length > 0 ? 
        ((marineCoverage.filter(c => c.violations.length === 0).length / marineCoverage.length) * 100).toFixed(1) + '%' : 
        '100%'
    };
  }

  logCoverageToConsole(marineCoverage) {
    console.log('\n🚢 Marine Safety Coverage Report');
    console.log('================================');

    marineCoverage.forEach(domain => {
      const status = domain.violations.length === 0 ? '✅' : '❌';
      const priority = domain.priority === 'critical' ? '🔴' : domain.priority === 'high' ? '🟡' : '🟢';
      
      console.log(`\n${status} ${priority} ${domain.domain.toUpperCase()}`);
      console.log(`   Functions: ${domain.coverage.functions}% | Statements: ${domain.coverage.statements}% | Branches: ${domain.coverage.branches}% | Lines: ${domain.coverage.lines}%`);
      
      if (domain.violations.length > 0) {
        domain.violations.forEach(violation => {
          console.log(`   ⚠️  ${violation}`);
        });
      }
    });

    const summary = this.generateSummary(marineCoverage);
    console.log(`\n📊 Marine Safety Compliance: ${summary.overall_marine_safety_compliance ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`);
    console.log(`   Total Violations: ${summary.total_violations}`);
    console.log('================================\n');
  }
}

module.exports = CustomCoverageReporter;