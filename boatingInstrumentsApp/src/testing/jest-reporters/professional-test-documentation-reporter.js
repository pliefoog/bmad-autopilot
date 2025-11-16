/**
 * Professional Test Documentation Reporter for VS Code Test Explorer Integration
 * 
 * PURPOSE: Parse and display professional test documentation headers in VS Code Test Explorer
 * REQUIREMENT: AC-11.7.1 - Professional Test Documentation Display in VS Code
 * METHOD: Jest custom reporter with PURPOSE/REQUIREMENT/METHOD header parsing and test categorization
 * EXPECTED: Enhanced test names in VS Code Test Explorer with professional documentation display
 * 
 * Integration with Epic 11 Professional-Grade Testing Architecture:
 * - Story 11.4: Professional Test Documentation Standards
 * - Story 11.7: VS Code Test Explorer Integration
 */

const fs = require('fs');
const path = require('path');

class ProfessionalTestDocumentationReporter {
  constructor(globalConfig, options = {}) {
    this.globalConfig = globalConfig;
    this.options = options;
    this.testDocumentation = new Map();
    this.testCategories = new Map();
    this.marineDomainsMap = {
      navigation: /navigation|gps|position|heading|course/i,
      environment: /wind|depth|water|weather/i,
      engine: /engine|rpm|fuel|oil/i,
      autopilot: /autopilot|steering|rudder|pilot/i,
      safety: /alarm|alert|warning|safety|critical|emergency/i
    };
  }

  /**
   * AC1.1: Parse PURPOSE/REQUIREMENT/METHOD headers from test files
   */
  async parseTestDocumentation(testPath) {
    try {
      const content = fs.readFileSync(testPath, 'utf8');
      const documentation = this.extractDocumentationHeaders(content);
      
      if (documentation) {
        this.testDocumentation.set(testPath, documentation);
        const category = this.categorizeByMarineDomain(documentation);
        this.testCategories.set(testPath, category);
      }
    } catch (error) {
      console.warn(`Failed to parse test documentation for ${testPath}:`, error.message);
    }
  }

  /**
   * AC1.2: Extract professional test documentation headers
   */
  extractDocumentationHeaders(content) {
    // Match professional test documentation patterns from Story 11.4
    const headerPatterns = {
      purpose: /\*\s*PURPOSE:\s*(.+?)(?:\n|\*\/)/gi,
      requirement: /\*\s*REQUIREMENT:\s*(.+?)(?:\n|\*\/)/gi,
      method: /\*\s*METHOD:\s*(.+?)(?:\n|\*\/)/gi,
      expected: /\*\s*EXPECTED:\s*(.+?)(?:\n|\*\/)/gi,
      errorConditions: /\*\s*ERROR CONDITIONS:\s*(.+?)(?:\n|\*\/)/gi
    };

    const documentation = {};
    let hasDocumentation = false;

    for (const [key, pattern] of Object.entries(headerPatterns)) {
      const matches = [...content.matchAll(pattern)];
      if (matches.length > 0) {
        documentation[key] = matches.map(match => match[1].trim()).join('; ');
        hasDocumentation = true;
      }
    }

    return hasDocumentation ? documentation : null;
  }

  /**
   * AC1.3: Categorize tests by marine domain for VS Code Test Explorer organization
   */
  categorizeByMarineDomain(documentation) {
    const allText = Object.values(documentation).join(' ').toLowerCase();
    
    for (const [domain, pattern] of Object.entries(this.marineDomainsMap)) {
      if (pattern.test(allText)) {
        return domain;
      }
    }
    
    return 'general';
  }

  /**
   * AC1.4: Generate enhanced test names for VS Code Test Explorer
   */
  enhanceTestName(testResult, documentation) {
    if (!documentation) return testResult.title;

    const domain = this.testCategories.get(testResult.testPath) || 'general';
    const domainIcon = this.getDomainIcon(domain);
    
    let enhancedName = `${domainIcon} ${testResult.title}`;
    
    if (documentation.requirement) {
      enhancedName += ` [${documentation.requirement}]`;
    }
    
    return enhancedName;
  }

  /**
   * AC1.5: Domain-specific icons for marine safety focus areas
   */
  getDomainIcon(domain) {
    const icons = {
      navigation: '🧭',
      engine: '⚙️',
      environment: '🌊',
      autopilot: '🎯',
      safety: '⚠️',
      general: '📋'
    };
    return icons[domain] || icons.general;
  }

  /**
   * Jest Reporter Interface: Called when all tests are completed
   */
  async onRunComplete(contexts, results) {
    try {
      // Parse documentation for all test files
      for (const testResult of results.testResults) {
        await this.parseTestDocumentation(testResult.testFilePath);
      }

      // Generate VS Code Test Explorer compatible output
      await this.generateVSCodeTestOutput(results);
      
      // Generate requirement traceability data
      await this.generateTraceabilityOutput(results);
      
    } catch (error) {
      console.error('Professional Test Documentation Reporter error:', error);
    }
  }

  /**
   * AC1.6: Generate VS Code Test Explorer compatible output with enhanced test names
   */
  async generateVSCodeTestOutput(results) {
    const output = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalTests: results.numTotalTests,
        passedTests: results.numPassedTests,
        failedTests: results.numFailedTests,
        testCategories: this.getTestCategorySummary()
      },
      testResults: []
    };

    for (const testResult of (results.testResults || [])) {
      const documentation = this.testDocumentation.get(testResult.testFilePath);
      const category = this.testCategories.get(testResult.testFilePath) || 'general';
      
      const enhancedResult = {
        testFilePath: testResult.testFilePath,
        category,
        documentation,
        tests: (testResult.assertionResults || []).map(assertion => ({
          title: this.enhanceTestName(assertion, documentation),
          originalTitle: assertion.title,
          status: assertion.status,
          duration: assertion.duration,
          failureMessages: assertion.failureMessages,
          location: assertion.location,
          documentation: documentation ? {
            purpose: documentation.purpose,
            requirement: documentation.requirement,
            method: documentation.method
          } : null
        }))
      };

      output.testResults.push(enhancedResult);
    }

    // Save VS Code Test Explorer output
    const outputPath = path.join(this.globalConfig.rootDir, 'coverage', 'vscode-test-explorer.json');
    await this.ensureDirectoryExists(path.dirname(outputPath));
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    console.log(`📊 VS Code Test Explorer output generated: ${outputPath}`);
  }

  /**
   * AC1.7: Generate requirement traceability output for VS Code Test Explorer
   */
  async generateTraceabilityOutput(results) {
    const traceability = {
      requirements: new Map(),
      coverage: {
        navigation: { tests: 0, passed: 0 },
        engine: { tests: 0, passed: 0 },
        environment: { tests: 0, passed: 0 },
        autopilot: { tests: 0, passed: 0 },
        safety: { tests: 0, passed: 0 },
        general: { tests: 0, passed: 0 }
      }
    };

    for (const testResult of (results.testResults || [])) {
      const documentation = this.testDocumentation.get(testResult.testFilePath);
      const category = this.testCategories.get(testResult.testFilePath) || 'general';
      
      // Count tests by category
      const assertionResults = testResult.assertionResults || [];
      traceability.coverage[category].tests += assertionResults.length;
      traceability.coverage[category].passed += assertionResults.filter(a => a.status === 'passed').length;
      
      // Map requirements to tests
      if (documentation && documentation.requirement) {
        if (!traceability.requirements.has(documentation.requirement)) {
          traceability.requirements.set(documentation.requirement, []);
        }
        traceability.requirements.get(documentation.requirement).push({
          testFile: testResult.testFilePath,
          category,
          testCount: assertionResults.length,
          passed: assertionResults.filter(a => a.status === 'passed').length
        });
      }
    }

    const traceabilityOutput = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalRequirements: traceability.requirements.size
      },
      requirements: Object.fromEntries(traceability.requirements),
      domainCoverage: traceability.coverage
    };

    const outputPath = path.join(this.globalConfig.rootDir, 'coverage', 'requirement-traceability.json');
    fs.writeFileSync(outputPath, JSON.stringify(traceabilityOutput, null, 2));
    
    console.log(`🔗 Requirement traceability output generated: ${outputPath}`);
  }

  /**
   * Get test category summary for VS Code Test Explorer
   */
  getTestCategorySummary() {
    const summary = {};
    for (const category of this.testCategories.values()) {
      summary[category] = (summary[category] || 0) + 1;
    }
    return summary;
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

  /**
   * Jest Reporter Interface: Called when a test starts
   */
  onTestStart(test) {
    // Can be used for real-time updates in future enhancements
  }

  /**
   * Jest Reporter Interface: Called when test results are available
   */
  onTestResult(test, testResult, aggregatedResult) {
    // Can be used for real-time updates in future enhancements
  }
}

module.exports = ProfessionalTestDocumentationReporter;