#!/usr/bin/env node

/**
 * Story 11.8: CI/CD Pipeline Integration - Selective Test Runner
 * PURPOSE: Test execution time optimization with selective test running implemented
 * REQUIREMENT: AC#3 - Pipeline Optimization - Selective test running based on changed files
 * METHOD: Git diff analysis, dependency mapping, and intelligent test selection for faster CI builds
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SelectiveTestRunner {
  constructor() {
    this.config = {
      git: {
        baseBranch: process.env.CI_BASE_BRANCH || 'main',
        diffTarget: process.env.CI_DIFF_TARGET || null, // Auto-detect from CI
        maxDiffSize: parseInt(process.env.CI_MAX_DIFF_SIZE || '1000'), // Max files to analyze
      },
      tests: {
        testDirs: ['__tests__', 'src/**/__tests__', 'app/**/__tests__'],
        testExtensions: ['.test.ts', '.test.tsx', '.test.js', '.test.jsx'],
        alwaysRunTests: ['__tests__/marine-safety/**/*', '__tests__/tier3-e2e/**/*'],
        forceFullTestPatterns: ['package.json', 'jest.config.js', '.github/workflows/**/*'],
      },
      dependencies: {
        mappingFile: path.join(__dirname, 'test-dependency-mapping.json'),
        autoGenerateMapping: process.env.CI_AUTO_GENERATE_MAPPING !== 'false',
      },
      optimization: {
        minTestSavings: 0.3, // Minimum 30% test reduction to enable selective mode
        maxAnalysisTime: 10000, // Max 10s for analysis
        cacheResults: process.env.CI_CACHE_RESULTS !== 'false',
      },
    };

    this.dependencyMapping = this.loadDependencyMapping();
    this.changedFiles = [];
    this.selectedTests = [];
    this.metrics = {
      totalFiles: 0,
      changedFiles: 0,
      totalTests: 0,
      selectedTests: 0,
      analysisTime: 0,
      estimatedSavings: 0,
    };
  }

  /**
   * Load or generate test dependency mapping
   */
  loadDependencyMapping() {
    try {
      if (fs.existsSync(this.config.dependencies.mappingFile)) {
        const mapping = JSON.parse(fs.readFileSync(this.config.dependencies.mappingFile, 'utf-8'));
        console.log(
          `📋 Loaded dependency mapping with ${
            Object.keys(mapping.testToSource || {}).length
          } test mappings`,
        );
        return mapping;
      }
    } catch (error) {
      console.warn(`⚠️ Failed to load dependency mapping: ${error.message}`);
    }

    if (this.config.dependencies.autoGenerateMapping) {
      console.log('🔄 Auto-generating test dependency mapping...');
      return this.generateDependencyMapping();
    }

    return { testToSource: {}, sourceToTests: {} };
  }

  /**
   * Generate test dependency mapping by analyzing import statements
   */
  generateDependencyMapping() {
    const startTime = Date.now();
    const mapping = { testToSource: {}, sourceToTests: {}, generatedAt: new Date().toISOString() };

    try {
      // Find all test files
      const testFiles = this.findTestFiles();
      console.log(`  📁 Found ${testFiles.length} test files`);

      // Analyze each test file for dependencies
      for (const testFile of testFiles) {
        try {
          const dependencies = this.analyzeTestDependencies(testFile);
          mapping.testToSource[testFile] = dependencies;

          // Build reverse mapping
          for (const dep of dependencies) {
            if (!mapping.sourceToTests[dep]) {
              mapping.sourceToTests[dep] = [];
            }
            if (!mapping.sourceToTests[dep].includes(testFile)) {
              mapping.sourceToTests[dep].push(testFile);
            }
          }
        } catch (error) {
          console.warn(`    ⚠️ Failed to analyze ${testFile}: ${error.message}`);
        }
      }

      // Save mapping for future use
      fs.writeFileSync(this.config.dependencies.mappingFile, JSON.stringify(mapping, null, 2));

      const duration = Date.now() - startTime;
      console.log(`  ✅ Generated dependency mapping in ${duration}ms`);

      return mapping;
    } catch (error) {
      console.error(`❌ Failed to generate dependency mapping: ${error.message}`);
      return { testToSource: {}, sourceToTests: {} };
    }
  }

  /**
   * Find all test files in the project
   */
  findTestFiles() {
    const testFiles = [];

    for (const testDir of this.config.tests.testDirs) {
      try {
        const globPattern = testDir.includes('**') ? testDir : `${testDir}/**/*`;
        const command = `find ${globPattern} -type f \\( ${this.config.tests.testExtensions
          .map((ext) => `-name "*${ext}"`)
          .join(' -o ')} \\) 2>/dev/null || true`;

        const result = execSync(command, {
          cwd: path.join(__dirname, '../..'),
          encoding: 'utf-8',
        });

        const files = result
          .trim()
          .split('\n')
          .filter((f) => f.length > 0);
        testFiles.push(...files);
      } catch (error) {
        // Ignore errors - directory might not exist
      }
    }

    return [...new Set(testFiles)]; // Remove duplicates
  }

  /**
   * Analyze test file dependencies by parsing import statements
   */
  analyzeTestDependencies(testFile) {
    const dependencies = [];

    try {
      const content = fs.readFileSync(testFile, 'utf-8');

      // Extract import statements (simplified regex - production would use AST)
      const importPatterns = [
        /import.*from\s+['"]([^'"]+)['"]/g,
        /require\(['"]([^'"]+)['"]\)/g,
        /import\(['"]([^'"]+)['"]\)/g,
      ];

      for (const pattern of importPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const importPath = match[1];

          // Skip external modules
          if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
            continue;
          }

          // Resolve relative path
          const resolvedPath = this.resolveImportPath(testFile, importPath);
          if (resolvedPath && fs.existsSync(resolvedPath)) {
            dependencies.push(resolvedPath);
          }
        }
      }

      // Add the test file's direct directory dependencies
      const testDir = path.dirname(testFile);
      const relatedFiles = this.findRelatedFiles(
        testDir,
        path.basename(testFile, path.extname(testFile)),
      );
      dependencies.push(...relatedFiles);
    } catch (error) {
      console.warn(`    ⚠️ Failed to parse ${testFile}: ${error.message}`);
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Resolve import path relative to test file
   */
  resolveImportPath(testFile, importPath) {
    const testDir = path.dirname(testFile);

    if (importPath.startsWith('.')) {
      // Relative import
      let resolvedPath = path.resolve(testDir, importPath);

      // Try different extensions
      const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js'];

      for (const ext of extensions) {
        const pathWithExt = resolvedPath + ext;
        if (fs.existsSync(pathWithExt)) {
          return pathWithExt;
        }
      }

      // Try as directory with index file
      if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
        for (const ext of ['/index.ts', '/index.js', '/index.tsx', '/index.jsx']) {
          const indexPath = resolvedPath + ext;
          if (fs.existsSync(indexPath)) {
            return indexPath;
          }
        }
      }
    }

    return null;
  }

  /**
   * Find files related to a test file (e.g., component being tested)
   */
  findRelatedFiles(testDir, testBaseName) {
    const related = [];

    // Remove test suffix to find source file
    const sourceName = testBaseName.replace(/\.test$/, '');

    // Look for source files in common locations
    const searchDirs = [
      testDir,
      path.join(testDir, '..'),
      path.join(testDir, '../src'),
      path.join(testDir, '../app'),
      path.join(testDir, '../components'),
    ];

    const extensions = ['.ts', '.tsx', '.js', '.jsx'];

    for (const searchDir of searchDirs) {
      if (!fs.existsSync(searchDir)) continue;

      for (const ext of extensions) {
        const sourcePath = path.join(searchDir, sourceName + ext);
        if (fs.existsSync(sourcePath)) {
          related.push(sourcePath);
        }
      }
    }

    return related;
  }

  /**
   * Get changed files using Git
   */
  getChangedFiles() {
    console.log('🔍 Analyzing changed files...');

    try {
      let diffTarget = this.config.git.diffTarget;

      // Auto-detect diff target based on CI environment
      if (!diffTarget) {
        if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
          diffTarget = process.env.GITHUB_BASE_REF || this.config.git.baseBranch;
        } else if (process.env.GITHUB_EVENT_NAME === 'push') {
          // Compare with previous commit
          diffTarget = 'HEAD~1';
        } else {
          diffTarget = this.config.git.baseBranch;
        }
      }

      console.log(`  📊 Comparing against: ${diffTarget}`);

      // Get list of changed files
      const gitCommand = `git diff --name-only ${diffTarget}...HEAD`;
      const result = execSync(gitCommand, {
        cwd: path.join(__dirname, '../..'),
        encoding: 'utf-8',
      });

      this.changedFiles = result
        .trim()
        .split('\n')
        .filter((f) => f.length > 0);
      this.metrics.changedFiles = this.changedFiles.length;

      console.log(`  📁 Found ${this.changedFiles.length} changed files`);

      // Log some examples
      if (this.changedFiles.length > 0) {
        console.log('  Examples:');
        this.changedFiles.slice(0, 5).forEach((file) => {
          console.log(`    - ${file}`);
        });
        if (this.changedFiles.length > 5) {
          console.log(`    ... and ${this.changedFiles.length - 5} more`);
        }
      }

      return this.changedFiles;
    } catch (error) {
      console.warn(`⚠️ Failed to get changed files: ${error.message}`);
      console.log('  🔄 Falling back to full test run');
      return null;
    }
  }

  /**
   * Select tests based on changed files
   */
  selectTestsForChangedFiles(changedFiles) {
    console.log('🎯 Selecting tests for changed files...');
    const startTime = Date.now();

    const selectedTests = new Set();

    // Check for patterns that force full test run
    const forceFullRun = changedFiles.some((file) =>
      this.config.tests.forceFullTestPatterns.some(
        (pattern) =>
          file.includes(pattern.replace('**/*', '')) ||
          (pattern.includes('*') &&
            new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')).test(file)),
      ),
    );

    if (forceFullRun) {
      console.log('  🚨 Detected critical file changes, forcing full test run');
      return null; // Return null to indicate full test run
    }

    // Add always-run tests
    for (const pattern of this.config.tests.alwaysRunTests) {
      const tests = this.findTestsByPattern(pattern);
      tests.forEach((test) => selectedTests.add(test));
    }

    // Map changed files to tests
    for (const changedFile of changedFiles) {
      // Direct test file
      if (this.isTestFile(changedFile)) {
        selectedTests.add(changedFile);
        continue;
      }

      // Tests that depend on this source file
      const dependentTests = this.dependencyMapping.sourceToTests[changedFile] || [];
      dependentTests.forEach((test) => selectedTests.add(test));

      // Heuristic: find tests in same directory or similar paths
      const heuristicTests = this.findTestsByHeuristic(changedFile);
      heuristicTests.forEach((test) => selectedTests.add(test));
    }

    this.selectedTests = Array.from(selectedTests);
    this.metrics.selectedTests = this.selectedTests.length;
    this.metrics.analysisTime = Date.now() - startTime;

    console.log(
      `  ✅ Selected ${this.selectedTests.length} tests in ${this.metrics.analysisTime}ms`,
    );

    return this.selectedTests;
  }

  /**
   * Check if file is a test file
   */
  isTestFile(filePath) {
    return this.config.tests.testExtensions.some((ext) => filePath.endsWith(ext));
  }

  /**
   * Find tests matching a pattern
   */
  findTestsByPattern(pattern) {
    try {
      // Convert pattern to find command
      const findPattern = pattern.replace(/\*\*/g, '').replace(/\*/g, '*');
      const command = `find ${findPattern} -type f 2>/dev/null || true`;

      const result = execSync(command, {
        cwd: path.join(__dirname, '../..'),
        encoding: 'utf-8',
      });

      return result
        .trim()
        .split('\n')
        .filter((f) => f.length > 0 && this.isTestFile(f));
    } catch (error) {
      return [];
    }
  }

  /**
   * Find tests using heuristics (same directory, similar names, etc.)
   */
  findTestsByHeuristic(sourceFile) {
    const tests = [];

    try {
      const sourceDir = path.dirname(sourceFile);
      const sourceName = path.basename(sourceFile, path.extname(sourceFile));

      // Look for test files in same directory
      const testDirs = [
        sourceDir,
        path.join(sourceDir, '__tests__'),
        path.join(sourceDir, '..', '__tests__'),
        path.join(sourceDir, '..', '..', '__tests__'),
      ];

      for (const testDir of testDirs) {
        if (!fs.existsSync(testDir)) continue;

        // Look for test files with similar names
        const testPatterns = [
          `${sourceName}.test.*`,
          `${sourceName.toLowerCase()}.test.*`,
          `*${sourceName}*.test.*`,
        ];

        for (const pattern of testPatterns) {
          try {
            const command = `find "${testDir}" -name "${pattern}" -type f 2>/dev/null || true`;
            const result = execSync(command, { encoding: 'utf-8' });
            const foundTests = result
              .trim()
              .split('\n')
              .filter((f) => f.length > 0);
            tests.push(...foundTests);
          } catch (error) {
            // Ignore errors
          }
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return [...new Set(tests)]; // Remove duplicates
  }

  /**
   * Run selected tests
   */
  async runSelectedTests(selectedTests, options = {}) {
    if (!selectedTests || selectedTests.length === 0) {
      console.log('🧪 Running full test suite (no selective tests)');
      return await this.runFullTests(options);
    }

    // Calculate potential savings
    const allTests = this.findTestFiles();
    this.metrics.totalTests = allTests.length;
    this.metrics.estimatedSavings = 1 - selectedTests.length / allTests.length;

    console.log(`🎯 Running selective tests (${selectedTests.length}/${allTests.length} tests)`);
    console.log(`⚡ Estimated time savings: ${(this.metrics.estimatedSavings * 100).toFixed(1)}%`);

    // Check if savings are significant enough
    if (this.metrics.estimatedSavings < this.config.optimization.minTestSavings) {
      console.log(
        `⚠️ Savings below threshold (${
          this.config.optimization.minTestSavings * 100
        }%), running full test suite`,
      );
      return await this.runFullTests(options);
    }

    try {
      const testPattern = selectedTests.join('|');
      const command = [
        'npx',
        'jest',
        '--testPathPattern',
        `"(${testPattern})"`,
        '--passWithNoTests',
        '--ci',
        '--watchAll=false',
      ];

      if (options.coverage) {
        command.push('--coverage');
      }

      if (options.verbose) {
        command.push('--verbose');
      }

      console.log(`  🔧 Command: ${command.join(' ')}`);

      const startTime = Date.now();
      const result = execSync(command.join(' '), {
        cwd: path.join(__dirname, '../..'),
        stdio: 'inherit',
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Selective tests completed in ${duration}ms`);

      // Save results for caching
      if (this.config.optimization.cacheResults) {
        await this.saveTestResults({
          type: 'selective',
          changedFiles: this.changedFiles,
          selectedTests,
          duration,
          success: true,
        });
      }

      return {
        success: true,
        duration,
        testsRun: selectedTests.length,
        totalTests: allTests.length,
        savings: this.metrics.estimatedSavings,
      };
    } catch (error) {
      console.error('❌ Selective tests failed');

      if (options.fallbackToFull) {
        console.log('🔄 Falling back to full test run');
        return await this.runFullTests(options);
      }

      throw error;
    }
  }

  /**
   * Run full test suite
   */
  async runFullTests(options = {}) {
    console.log('🧪 Running full test suite');

    try {
      const command = ['npm', 'run', 'test'];

      if (options.coverage) {
        command[command.length - 1] = 'test:coverage';
      }

      const startTime = Date.now();
      const result = execSync(command.join(' '), {
        cwd: path.join(__dirname, '../..'),
        stdio: 'inherit',
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Full test suite completed in ${duration}ms`);

      return {
        success: true,
        duration,
        testsRun: 'all',
        fullRun: true,
      };
    } catch (error) {
      console.error('❌ Full test suite failed');
      throw error;
    }
  }

  /**
   * Save test results for caching
   */
  async saveTestResults(results) {
    try {
      const cacheDir = path.join(__dirname, 'cache');
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      const cacheFile = path.join(cacheDir, 'test-results-cache.json');
      let cache = { runs: [] };

      if (fs.existsSync(cacheFile)) {
        cache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      }

      cache.runs.push({
        ...results,
        timestamp: new Date().toISOString(),
        commit: process.env.GITHUB_SHA || 'unknown',
      });

      // Keep only last 50 runs
      if (cache.runs.length > 50) {
        cache.runs = cache.runs.slice(-50);
      }

      fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
    } catch (error) {
      console.warn(`⚠️ Failed to save test results cache: ${error.message}`);
    }
  }

  /**
   * Generate analysis report
   */
  generateAnalysisReport() {
    const report = {
      timestamp: new Date().toISOString(),
      analysis: this.metrics,
      configuration: this.config,
      changedFiles: this.changedFiles.slice(0, 10), // First 10 for brevity
      selectedTests: this.selectedTests.slice(0, 10),
      recommendations: this.generateRecommendations(),
    };

    const reportPath = path.join(__dirname, 'selective-test-analysis.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`📊 Analysis report saved: ${reportPath}`);
    return report;
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.metrics.estimatedSavings < 0.2) {
      recommendations.push({
        type: 'low-savings',
        message: 'Consider improving test dependency mapping for better selective testing',
        action: 'Update test-dependency-mapping.json or improve heuristics',
      });
    }

    if (this.metrics.analysisTime > 5000) {
      recommendations.push({
        type: 'slow-analysis',
        message: 'Test selection analysis is slow, consider optimizing dependency mapping',
        action: 'Cache dependency analysis or use faster file scanning',
      });
    }

    if (this.metrics.selectedTests / this.metrics.totalTests > 0.8) {
      recommendations.push({
        type: 'high-selection',
        message: 'Most tests are being selected, selective mode may not be beneficial',
        action: 'Review changed files or dependency mapping accuracy',
      });
    }

    return recommendations;
  }
}

// CLI Interface
if (require.main === module) {
  const runner = new SelectiveTestRunner();
  const command = process.argv[2] || 'run';

  async function handleCommand() {
    try {
      switch (command) {
        case 'run':
          const coverage = process.argv.includes('--coverage');
          const verbose = process.argv.includes('--verbose');
          const fallback = process.argv.includes('--fallback');

          // Get changed files
          const changedFiles = runner.getChangedFiles();

          if (changedFiles) {
            // Select tests based on changes
            const selectedTests = runner.selectTestsForChangedFiles(changedFiles);

            // Run selected tests
            const result = await runner.runSelectedTests(selectedTests, {
              coverage,
              verbose,
              fallbackToFull: fallback,
            });

            console.log('\n📊 Test Run Result:', JSON.stringify(result, null, 2));
          } else {
            // Run full test suite
            const result = await runner.runFullTests({ coverage, verbose });
            console.log('\n📊 Test Run Result:', JSON.stringify(result, null, 2));
          }

          // Generate analysis report
          runner.generateAnalysisReport();
          break;

        case 'analyze':
          const changed = runner.getChangedFiles();
          if (changed) {
            runner.selectTestsForChangedFiles(changed);
          }
          const report = runner.generateAnalysisReport();
          console.log('\n📊 Analysis Report:', JSON.stringify(report, null, 2));
          break;

        case 'mapping':
          runner.generateDependencyMapping();
          break;

        case 'config':
          console.log('Configuration:', JSON.stringify(runner.config, null, 2));
          break;

        default:
          console.log(`Usage: ${process.argv[1]} <run|analyze|mapping|config> [options]`);
          console.log('  run      - Run selective tests based on changed files (default)');
          console.log('  analyze  - Analyze changes and generate report without running tests');
          console.log('  mapping  - Generate test dependency mapping');
          console.log('  config   - Show configuration');
          console.log('');
          console.log('Options for run:');
          console.log('  --coverage   - Include coverage analysis');
          console.log('  --verbose    - Verbose test output');
          console.log('  --fallback   - Fall back to full tests on selective test failure');
          console.log('');
          console.log('Environment Variables:');
          console.log('  CI_BASE_BRANCH              - Base branch for diff (default: main)');
          console.log('  CI_DIFF_TARGET              - Specific diff target (auto-detected in CI)');
          console.log(
            '  CI_AUTO_GENERATE_MAPPING    - Auto-generate dependency mapping (default: true)',
          );
          console.log('  CI_CACHE_RESULTS            - Cache test results (default: true)');
          process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  }

  handleCommand();
}

module.exports = { SelectiveTestRunner };
