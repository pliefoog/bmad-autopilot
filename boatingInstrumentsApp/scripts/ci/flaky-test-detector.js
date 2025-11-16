#!/usr/bin/env node

/**
 * Story 11.8: CI/CD Pipeline Integration - Flaky Test Detection and Retry
 * PURPOSE: Flaky test detection and automatic retry mechanisms for CI/CD reliability
 * REQUIREMENT: AC#1 - CI/CD Pipeline Configuration - Flaky test detection and retry mechanisms
 * METHOD: Test execution monitoring, failure pattern analysis, and intelligent retry logic
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class FlakyTestDetector {
  constructor() {
    this.config = {
      maxRetries: parseInt(process.env.CI_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.CI_RETRY_DELAY || '5000'),
      flakyThreshold: parseFloat(process.env.CI_FLAKY_THRESHOLD || '0.8'), // 80% success rate
      historyFile: path.join(__dirname, 'test-history.json'),
      reportFile: path.join(__dirname, 'flaky-tests-report.json'),
      patterns: {
        // Common flaky test patterns
        timeout: /timeout|timed out|jest did not exit|async/i,
        network: /ECONNREFUSED|ENOTFOUND|network|connection/i,
        timing: /timing|race condition|setTimeout|setInterval/i,
        resource: /EMFILE|ENOMEM|resource|memory/i,
        simulator: /simulator|nmea.*bridge|websocket.*connect/i
      }
    };
    
    this.testHistory = this.loadTestHistory();
  }

  /**
   * Load test execution history
   */
  loadTestHistory() {
    try {
      if (fs.existsSync(this.config.historyFile)) {
        return JSON.parse(fs.readFileSync(this.config.historyFile, 'utf-8'));
      }
    } catch (error) {
      console.warn(`⚠️ Failed to load test history: ${error.message}`);
    }
    return {
      runs: [],
      testStats: {},
      lastCleanup: Date.now()
    };
  }

  /**
   * Save test execution history
   */
  saveTestHistory() {
    try {
      // Cleanup old entries (keep last 100 runs)
      if (this.testHistory.runs.length > 100) {
        this.testHistory.runs = this.testHistory.runs.slice(-100);
      }
      
      // Cleanup old test stats (keep tests with recent activity)
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
      for (const [testName, stats] of Object.entries(this.testHistory.testStats)) {
        if (stats.lastSeen < cutoffTime) {
          delete this.testHistory.testStats[testName];
        }
      }
      
      this.testHistory.lastCleanup = Date.now();
      fs.writeFileSync(this.config.historyFile, JSON.stringify(this.testHistory, null, 2));
    } catch (error) {
      console.warn(`⚠️ Failed to save test history: ${error.message}`);
    }
  }

  /**
   * Analyze test failure for flakiness patterns
   */
  analyzeFailure(testName, error, output) {
    const analysis = {
      testName,
      timestamp: Date.now(),
      isFlaky: false,
      pattern: 'unknown',
      confidence: 0,
      error: error ? error.toString() : '',
      output: output ? output.toString() : ''
    };

    const fullText = `${analysis.error} ${analysis.output}`.toLowerCase();

    // Check for known flaky patterns
    for (const [patternName, regex] of Object.entries(this.config.patterns)) {
      if (regex.test(fullText)) {
        analysis.isFlaky = true;
        analysis.pattern = patternName;
        analysis.confidence = this.calculateConfidence(patternName, testName);
        break;
      }
    }

    // Check historical success rate
    const testStats = this.testHistory.testStats[testName];
    if (testStats) {
      const successRate = testStats.successes / (testStats.successes + testStats.failures);
      if (successRate >= this.config.flakyThreshold) {
        analysis.isFlaky = true;
        analysis.pattern = 'historical';
        analysis.confidence = Math.max(analysis.confidence, successRate);
      }
    }

    return analysis;
  }

  /**
   * Calculate confidence score for flakiness detection
   */
  calculateConfidence(pattern, testName) {
    const patternScores = {
      timeout: 0.9,
      network: 0.8,
      timing: 0.95,
      resource: 0.7,
      simulator: 0.85,
      historical: 0.9
    };

    let baseScore = patternScores[pattern] || 0.5;

    // Adjust based on test name patterns
    if (testName.includes('integration')) baseScore += 0.05;
    if (testName.includes('e2e')) baseScore += 0.05;
    if (testName.includes('simulator')) baseScore += 0.1;

    return Math.min(baseScore, 1.0);
  }

  /**
   * Update test statistics
   */
  updateTestStats(testName, success, executionTime = null) {
    if (!this.testHistory.testStats[testName]) {
      this.testHistory.testStats[testName] = {
        successes: 0,
        failures: 0,
        totalExecutions: 0,
        averageExecutionTime: 0,
        lastSeen: Date.now(),
        firstSeen: Date.now()
      };
    }

    const stats = this.testHistory.testStats[testName];
    stats.totalExecutions++;
    stats.lastSeen = Date.now();

    if (success) {
      stats.successes++;
    } else {
      stats.failures++;
    }

    if (executionTime !== null) {
      stats.averageExecutionTime = (
        (stats.averageExecutionTime * (stats.totalExecutions - 1) + executionTime) / 
        stats.totalExecutions
      );
    }
  }

  /**
   * Execute tests with retry logic
   */
  async executeWithRetry(testCommand, testArgs = [], options = {}) {
    const executionId = `exec-${Date.now()}`;
    let attempt = 1;
    let lastError = null;
    let lastOutput = '';

    console.log(`🧪 Executing tests with flaky detection: ${testCommand} ${testArgs.join(' ')}`);

    while (attempt <= this.config.maxRetries) {
      console.log(`🔄 Attempt ${attempt}/${this.config.maxRetries}`);

      const startTime = Date.now();
      const result = await this.runSingleTest(testCommand, testArgs, options);
      const executionTime = Date.now() - startTime;

      // Record execution
      const execution = {
        id: executionId,
        attempt,
        command: testCommand,
        args: testArgs,
        startTime,
        executionTime,
        success: result.success,
        exitCode: result.exitCode,
        timestamp: Date.now()
      };

      this.testHistory.runs.push(execution);

      if (result.success) {
        console.log(`✅ Tests passed on attempt ${attempt}`);
        
        // Update stats for successful tests
        if (result.testResults) {
          for (const testResult of result.testResults) {
            this.updateTestStats(testResult.name, true, testResult.duration);
          }
        }

        this.saveTestHistory();
        return {
          success: true,
          attempts: attempt,
          totalTime: Date.now() - startTime,
          executionId
        };
      }

      // Test failed - analyze for flakiness
      lastError = result.error;
      lastOutput = result.output;

      const analysis = this.analyzeFailure(`${testCommand} ${testArgs.join(' ')}`, lastError, lastOutput);
      
      console.log(`❌ Tests failed on attempt ${attempt}:`);
      console.log(`   Pattern: ${analysis.pattern} (confidence: ${(analysis.confidence * 100).toFixed(1)}%)`);
      console.log(`   Flaky: ${analysis.isFlaky ? 'Yes' : 'No'}`);

      // Update stats for failed tests
      if (result.testResults) {
        for (const testResult of result.testResults) {
          this.updateTestStats(testResult.name, false, testResult.duration);
        }
      }

      // Decide whether to retry
      if (attempt < this.config.maxRetries) {
        if (analysis.isFlaky && analysis.confidence > 0.7) {
          console.log(`🔄 Retrying due to detected flaky failure (confidence: ${(analysis.confidence * 100).toFixed(1)}%)`);
          
          // Wait before retry
          if (this.config.retryDelay > 0) {
            console.log(`⏸️ Waiting ${this.config.retryDelay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
          }
          
          attempt++;
          continue;
        } else {
          console.log(`🚫 Not retrying - failure doesn't appear flaky (confidence: ${(analysis.confidence * 100).toFixed(1)}%)`);
          break;
        }
      }

      break;
    }

    this.saveTestHistory();

    // Generate flaky test report
    await this.generateFlakyTestReport();

    return {
      success: false,
      attempts: attempt,
      error: lastError,
      output: lastOutput,
      executionId
    };
  }

  /**
   * Run a single test execution
   */
  async runSingleTest(command, args, options) {
    return new Promise((resolve) => {
      const testProcess = spawn(command, args, {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      testProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      testProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      testProcess.on('exit', (code) => {
        // Try to parse Jest results if available
        let testResults = null;
        try {
          // Look for Jest test results in output
          const jestResultMatch = stdout.match(/Test Suites:.*$/m);
          if (jestResultMatch) {
            // Basic parsing - in real implementation, you'd use Jest's JSON reporter
            testResults = this.parseJestOutput(stdout);
          }
        } catch (error) {
          // Ignore parsing errors
        }

        resolve({
          success: code === 0,
          exitCode: code,
          output: stdout,
          error: stderr,
          testResults
        });
      });

      testProcess.on('error', (error) => {
        resolve({
          success: false,
          exitCode: -1,
          output: stdout,
          error: error.message,
          testResults: null
        });
      });

      // Handle timeout
      if (options.timeout) {
        setTimeout(() => {
          testProcess.kill('SIGTERM');
        }, options.timeout);
      }
    });
  }

  /**
   * Basic Jest output parsing (simplified)
   */
  parseJestOutput(output) {
    const testResults = [];
    
    // This is a simplified parser - real implementation would use Jest's JSON reporter
    const testLines = output.split('\n').filter(line => 
      line.includes('✓') || line.includes('✗') || line.includes('PASS') || line.includes('FAIL')
    );

    for (const line of testLines) {
      if (line.includes('✓') || line.includes('✗')) {
        const testName = line.replace(/[✓✗]/g, '').trim();
        const passed = line.includes('✓');
        
        testResults.push({
          name: testName,
          passed,
          duration: null // Would be extracted from detailed Jest output
        });
      }
    }

    return testResults;
  }

  /**
   * Generate flaky test report
   */
  async generateFlakyTestReport() {
    const flakyTests = [];
    
    for (const [testName, stats] of Object.entries(this.testHistory.testStats)) {
      if (stats.totalExecutions >= 3) { // Minimum executions for flaky analysis
        const successRate = stats.successes / stats.totalExecutions;
        
        if (successRate < 1.0 && successRate >= this.config.flakyThreshold) {
          flakyTests.push({
            testName,
            successRate: (successRate * 100).toFixed(1),
            totalExecutions: stats.totalExecutions,
            failures: stats.failures,
            averageExecutionTime: Math.round(stats.averageExecutionTime),
            lastSeen: new Date(stats.lastSeen).toISOString(),
            recommendation: this.getRecommendation(successRate, stats)
          });
        }
      }
    }

    const report = {
      generatedAt: new Date().toISOString(),
      totalFlakyTests: flakyTests.length,
      flakyThreshold: this.config.flakyThreshold * 100,
      tests: flakyTests.sort((a, b) => parseFloat(a.successRate) - parseFloat(b.successRate))
    };

    try {
      fs.writeFileSync(this.config.reportFile, JSON.stringify(report, null, 2));
      console.log(`📊 Generated flaky test report: ${this.config.reportFile}`);
      
      if (flakyTests.length > 0) {
        console.log(`⚠️ Found ${flakyTests.length} potentially flaky tests`);
        console.log('Top 3 flakiest tests:');
        flakyTests.slice(0, 3).forEach((test, index) => {
          console.log(`  ${index + 1}. ${test.testName} (${test.successRate}% success rate)`);
        });
      }
    } catch (error) {
      console.warn(`⚠️ Failed to write flaky test report: ${error.message}`);
    }
  }

  /**
   * Get recommendation for flaky test
   */
  getRecommendation(successRate, stats) {
    if (successRate < 0.5) {
      return 'CRITICAL: Consider disabling or rewriting this test';
    } else if (successRate < 0.7) {
      return 'HIGH: Investigate and fix reliability issues';
    } else if (successRate < 0.9) {
      return 'MEDIUM: Monitor and consider adding retry logic';
    } else {
      return 'LOW: Minor reliability issue, monitor trends';
    }
  }
}

// CLI Interface
if (require.main === module) {
  const detector = new FlakyTestDetector();
  const command = process.argv[2];

  async function handleCommand() {
    try {
      switch (command) {
        case 'run':
          const testCommand = process.argv[3] || 'npm';
          const testArgs = process.argv.slice(4);
          
          if (!testCommand) {
            throw new Error('Test command is required');
          }

          const result = await detector.executeWithRetry(testCommand, testArgs, {
            timeout: parseInt(process.env.CI_TEST_TIMEOUT || '300000'),
            cwd: path.join(__dirname, '../..')
          });

          console.log('\n📊 Final Result:');
          console.log(JSON.stringify(result, null, 2));
          
          if (!result.success) {
            process.exit(1);
          }
          break;

        case 'report':
          await detector.generateFlakyTestReport();
          break;

        case 'history':
          console.log(JSON.stringify(detector.testHistory, null, 2));
          break;

        case 'cleanup':
          detector.testHistory = { runs: [], testStats: {}, lastCleanup: Date.now() };
          detector.saveTestHistory();
          console.log('✅ Test history cleaned up');
          break;

        default:
          console.log(`Usage: ${process.argv[1]} <run|report|history|cleanup> [options]`);
          console.log('  run <command> [args...]  - Execute tests with flaky detection and retry');
          console.log('  report                   - Generate flaky test report');
          console.log('  history                  - Show test execution history');
          console.log('  cleanup                  - Clear test history');
          console.log('');
          console.log('Environment Variables:');
          console.log('  CI_MAX_RETRIES      - Maximum retry attempts (default: 3)');
          console.log('  CI_RETRY_DELAY      - Delay between retries in ms (default: 5000)');
          console.log('  CI_FLAKY_THRESHOLD  - Success rate threshold for flaky tests (default: 0.8)');
          console.log('  CI_TEST_TIMEOUT     - Test execution timeout in ms (default: 300000)');
          process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  }

  handleCommand();
}

module.exports = { FlakyTestDetector };