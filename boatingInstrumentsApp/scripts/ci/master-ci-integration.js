#!/usr/bin/env node

/**
 * Story 11.8: CI/CD Pipeline Integration - Master CI Integration Script
 * PURPOSE: Master CI integration script that orchestrates all CI/CD components
 * REQUIREMENT: AC#1, #2, #3 - Complete CI/CD Pipeline Integration
 * METHOD: Unified entry point for all CI/CD operations with comprehensive orchestration
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// Import CI components
const { SimulatorLifecycleManager } = require('./simulator-lifecycle');
const { ParallelTestManager } = require('./parallel-test-manager');
const { FlakyTestDetector } = require('./flaky-test-detector');
const { TestEnvironmentCleanup } = require('./test-environment-cleanup');
const { CIPipelineQualityGates } = require('./ci-quality-gates');
const { QualityReportGenerator } = require('./quality-report-generator');
const { SelectiveTestRunner } = require('./selective-test-runner');
const { CIResourceOptimizer } = require('./ci-resource-optimizer');
const { FailureAnalysisCollector } = require('./failure-analysis-collector');

class MasterCIIntegration {
  constructor() {
    this.config = {
      // Pipeline configuration
      pipeline: {
        enableSimulatorManagement: process.env.CI_ENABLE_SIMULATOR !== 'false',
        enableParallelTesting: process.env.CI_ENABLE_PARALLEL !== 'false',
        enableFlakyDetection: process.env.CI_ENABLE_FLAKY_DETECTION !== 'false',
        enableSelectiveTesting: process.env.CI_ENABLE_SELECTIVE !== 'false',
        enableResourceOptimization: process.env.CI_ENABLE_OPTIMIZATION === 'true',
        enableQualityGates: process.env.CI_ENABLE_QUALITY_GATES !== 'false',
        enableFailureAnalysis: process.env.CI_ENABLE_FAILURE_ANALYSIS !== 'false',
        enableReporting: process.env.CI_ENABLE_REPORTING !== 'false',
      },

      // Execution configuration
      execution: {
        maxRetries: parseInt(process.env.CI_MAX_RETRIES || '3'),
        timeoutMinutes: parseInt(process.env.CI_TIMEOUT_MINUTES || '30'),
        parallelJobs: parseInt(process.env.CI_PARALLEL_JOBS || '4'),
        cleanupOnFailure: process.env.CI_CLEANUP_ON_FAILURE !== 'false',
        continueOnNonCriticalFailure: process.env.CI_CONTINUE_ON_WARNING === 'true',
      },

      // Component configurations
      components: {
        simulator: { ports: [8080, 9090, 2000], healthCheckTimeout: 30 },
        testing: { maxWorkers: '50%', coverage: true, verbose: true },
        quality: { enforceThresholds: true, generateReports: true },
        optimization: {
          limits: {
            memoryMB: 2048,
            cpuPercent: 80,
            maxProcesses: 50,
          },
          monitorResources: true,
          optimizeJest: true,
        },
      },
    };

    // Component instances
    this.components = {
      simulator: null,
      testManager: null,
      flakyDetector: null,
      cleanup: null,
      qualityGates: null,
      reportGenerator: null,
      selectiveRunner: null,
      resourceOptimizer: null,
      failureAnalyzer: null,
    };

    // Pipeline state
    this.state = {
      startTime: null,
      currentPhase: 'initialization',
      phases: [],
      results: {},
      errors: [],
      warnings: [],
    };
  }

  /**
   * Execute complete CI/CD pipeline
   */
  async executePipeline(operation = 'full', options = {}) {
    console.log(`🚀 Starting CI/CD Pipeline Integration - Operation: ${operation}`);

    this.state.startTime = Date.now();

    try {
      // Initialize components
      await this.initializeComponents();

      // Execute pipeline phases based on operation
      switch (operation) {
        case 'full':
          await this.executeFullPipeline(options);
          break;
        case 'test-only':
          await this.executeTestOnlyPipeline(options);
          break;
        case 'quality-check':
          await this.executeQualityCheckPipeline(options);
          break;
        case 'setup':
          await this.executeSetupPipeline(options);
          break;
        case 'cleanup':
          await this.executeCleanupPipeline(options);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      // Generate final results
      await this.generatePipelineResults();

      const duration = Date.now() - this.state.startTime;
      console.log(`✅ CI/CD Pipeline completed successfully in ${duration}ms`);

      return {
        success: true,
        duration,
        results: this.state.results,
        phases: this.state.phases,
      };
    } catch (error) {
      const duration = Date.now() - this.state.startTime;
      console.error(`❌ CI/CD Pipeline failed: ${error.message}`);

      // Execute failure analysis if enabled
      if (this.config.pipeline.enableFailureAnalysis) {
        await this.executeFailureAnalysis(error);
      }

      // Cleanup on failure if enabled
      if (this.config.execution.cleanupOnFailure) {
        await this.executeCleanupPipeline({ force: true });
      }

      return {
        success: false,
        error: error.message,
        duration,
        results: this.state.results,
        phases: this.state.phases,
        errors: this.state.errors,
      };
    }
  }

  /**
   * Initialize all CI components
   */
  async initializeComponents() {
    this.updatePhase('component-initialization');

    console.log('🔧 Initializing CI components...');

    try {
      // Initialize simulator lifecycle manager
      if (this.config.pipeline.enableSimulatorManagement) {
        this.components.simulator = new SimulatorLifecycleManager(this.config.components.simulator);
        console.log('  ✅ Simulator Lifecycle Manager initialized');
      }

      // Initialize parallel test manager
      if (this.config.pipeline.enableParallelTesting) {
        this.components.testManager = new ParallelTestManager(this.config.components.testing);
        console.log('  ✅ Parallel Test Manager initialized');
      }

      // Initialize flaky test detector
      if (this.config.pipeline.enableFlakyDetection) {
        this.components.flakyDetector = new FlakyTestDetector();
        console.log('  ✅ Flaky Test Detector initialized');
      }

      // Initialize cleanup manager
      this.components.cleanup = new TestEnvironmentCleanup();
      console.log('  ✅ Test Environment Cleanup initialized');

      // Initialize quality gates
      if (this.config.pipeline.enableQualityGates) {
        this.components.qualityGates = new CIPipelineQualityGates();
        console.log('  ✅ CI Pipeline Quality Gates initialized');
      }

      // Initialize report generator
      if (this.config.pipeline.enableReporting) {
        this.components.reportGenerator = new QualityReportGenerator();
        console.log('  ✅ Quality Report Generator initialized');
      }

      // Initialize selective test runner
      if (this.config.pipeline.enableSelectiveTesting) {
        this.components.selectiveRunner = new SelectiveTestRunner();
        console.log('  ✅ Selective Test Runner initialized');
      }

      // Initialize resource optimizer
      if (this.config.pipeline.enableResourceOptimization) {
        this.components.resourceOptimizer = new CIResourceOptimizer(
          this.config.components.optimization,
        );
        console.log('  ✅ CI Resource Optimizer initialized');
      }

      // Initialize failure analyzer
      if (this.config.pipeline.enableFailureAnalysis) {
        this.components.failureAnalyzer = new FailureAnalysisCollector();
        console.log('  ✅ Failure Analysis Collector initialized');
      }

      console.log('🔧 All CI components initialized successfully');
    } catch (error) {
      throw new Error(`Component initialization failed: ${error.message}`);
    }
  }

  /**
   * Execute full CI/CD pipeline
   */
  async executeFullPipeline(options = {}) {
    console.log('🔄 Executing Full CI/CD Pipeline...');

    // Phase 1: Environment Setup
    await this.executeEnvironmentSetup();

    // Phase 2: Resource Optimization
    if (this.config.pipeline.enableResourceOptimization) {
      await this.executeResourceOptimization();
    }

    // Phase 3: Simulator Setup
    if (this.config.pipeline.enableSimulatorManagement) {
      await this.executeSimulatorSetup();
    }

    // Phase 4: Test Execution
    await this.executeTestExecution(options);

    // Phase 5: Quality Gates
    if (this.config.pipeline.enableQualityGates) {
      await this.executeQualityGates();
    }

    // Phase 6: Report Generation
    if (this.config.pipeline.enableReporting) {
      await this.executeReportGeneration();
    }

    // Phase 7: Environment Cleanup
    await this.executeEnvironmentCleanup();
  }

  /**
   * Execute test-only pipeline
   */
  async executeTestOnlyPipeline(options = {}) {
    console.log('🧪 Executing Test-Only Pipeline...');

    await this.executeEnvironmentSetup();

    if (this.config.pipeline.enableResourceOptimization) {
      await this.executeResourceOptimization();
    }

    await this.executeTestExecution(options);

    if (this.config.pipeline.enableReporting) {
      await this.executeReportGeneration();
    }

    await this.executeEnvironmentCleanup();
  }

  /**
   * Execute quality check pipeline
   */
  async executeQualityCheckPipeline(options = {}) {
    console.log('🔍 Executing Quality Check Pipeline...');

    if (this.config.pipeline.enableQualityGates) {
      await this.executeQualityGates();
    }

    if (this.config.pipeline.enableReporting) {
      await this.executeReportGeneration();
    }
  }

  /**
   * Execute setup pipeline
   */
  async executeSetupPipeline(options = {}) {
    console.log('⚙️ Executing Setup Pipeline...');

    await this.executeEnvironmentSetup();

    if (this.config.pipeline.enableResourceOptimization) {
      await this.executeResourceOptimization();
    }

    if (this.config.pipeline.enableSimulatorManagement) {
      await this.executeSimulatorSetup();
    }
  }

  /**
   * Execute cleanup pipeline
   */
  async executeCleanupPipeline(options = {}) {
    console.log('🧹 Executing Cleanup Pipeline...');

    await this.executeEnvironmentCleanup(options);
  }

  /**
   * Execute environment setup phase
   */
  async executeEnvironmentSetup() {
    this.updatePhase('environment-setup');

    console.log('  🏗️ Setting up CI environment...');

    try {
      // Clean up any existing processes/resources
      if (this.components.cleanup) {
        await this.components.cleanup.performCleanup();
      }

      // Verify Node.js and npm versions
      const nodeVersion = process.version;
      const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();

      console.log(`  📦 Node.js: ${nodeVersion}, npm: ${npmVersion}`);

      // Install/verify dependencies if needed
      if (!fs.existsSync(path.join(__dirname, '../../node_modules'))) {
        console.log('  📥 Installing dependencies...');
        execSync('npm ci', {
          cwd: path.join(__dirname, '../..'),
          stdio: 'inherit',
          timeout: 5 * 60 * 1000, // 5 minutes
        });
      }

      this.state.results.environmentSetup = {
        success: true,
        nodeVersion,
        npmVersion,
        timestamp: new Date().toISOString(),
      };

      console.log('  ✅ Environment setup completed');
    } catch (error) {
      throw new Error(`Environment setup failed: ${error.message}`);
    }
  }

  /**
   * Execute resource optimization phase
   */
  async executeResourceOptimization() {
    this.updatePhase('resource-optimization');

    console.log('  ⚡ Optimizing CI resources...');

    try {
      if (this.components.resourceOptimizer) {
        const result = await this.components.resourceOptimizer.startOptimization();

        this.state.results.resourceOptimization = result;
        console.log('  ✅ Resource optimization completed');
      }
    } catch (error) {
      this.addWarning(`Resource optimization warning: ${error.message}`);

      if (!this.config.execution.continueOnNonCriticalFailure) {
        throw error;
      }
    }
  }

  /**
   * Execute simulator setup phase
   */
  async executeSimulatorSetup() {
    this.updatePhase('simulator-setup');

    console.log('  🚢 Setting up NMEA Bridge Simulator...');

    try {
      if (this.components.simulator) {
        const result = await this.components.simulator.startSimulator('basic-navigation', {
          enableHealthCheck: true,
        });

        this.state.results.simulatorSetup = result;
        console.log('  ✅ NMEA Bridge Simulator setup completed');
      }
    } catch (error) {
      throw new Error(`Simulator setup failed: ${error.message}`);
    }
  }

  /**
   * Execute test execution phase
   */
  async executeTestExecution(options = {}) {
    this.updatePhase('test-execution');

    console.log('  🧪 Executing tests...');

    try {
      let testResult;

      // Choose test execution strategy
      if (this.config.pipeline.enableSelectiveTesting && !options.forceFullTests) {
        // Selective testing based on changes
        if (this.components.selectiveRunner) {
          console.log('  🎯 Running selective tests based on changes...');
          try {
            const changedFiles = this.components.selectiveRunner.getChangedFiles();
            const selectedTests =
              this.components.selectiveRunner.selectTestsForChangedFiles(changedFiles);

            if (selectedTests.length > 0) {
              testResult = await this.components.selectiveRunner.runSelectedTests(selectedTests);
            } else {
              console.log('  ℹ️ No tests selected based on changes, running full suite...');
            }
          } catch (error) {
            console.warn(
              `  ⚠️ Selective testing failed: ${error.message}, falling back to full tests`,
            );
          }
        }
      }

      // Fall back to full test suite if selective testing didn't run or failed
      if (!testResult || !testResult.success) {
        console.log('  🔄 Running full test suite...');

        if (this.config.pipeline.enableParallelTesting && this.components.testManager) {
          // Parallel test execution
          testResult = await this.components.testManager.runParallelTests({
            maxWorkers: this.config.execution.parallelJobs,
            timeout: this.config.execution.timeoutMinutes * 60 * 1000,
          });
        } else {
          // Standard test execution
          testResult = await this.executeStandardTests();
        }
      }

      // Handle flaky test detection
      if (this.config.pipeline.enableFlakyDetection && this.components.flakyDetector) {
        if (!testResult.success && testResult.failedTests) {
          console.log('  🔄 Analyzing failed tests for flaky behavior...');
          const flakyResult = await this.components.flakyDetector.analyzeAndRetry(
            testResult.failedTests,
          );

          // Merge results
          if (flakyResult.retriedTests > 0) {
            testResult.flakyAnalysis = flakyResult;

            // Update success status if retries fixed the issues
            if (flakyResult.finalSuccess) {
              testResult.success = true;
              console.log('  ✅ Flaky tests resolved through retry analysis');
            }
          }
        }
      }

      this.state.results.testExecution = testResult;

      if (testResult.success) {
        console.log('  ✅ Test execution completed successfully');
      } else {
        throw new Error(`Test execution failed: ${testResult.error || 'Unknown test failure'}`);
      }
    } catch (error) {
      throw new Error(`Test execution failed: ${error.message}`);
    }
  }

  /**
   * Execute standard tests (fallback method)
   */
  async executeStandardTests() {
    return new Promise((resolve, reject) => {
      const testProcess = spawn('npm', ['test'], {
        cwd: path.join(__dirname, '../..'),
        stdio: 'pipe',
        env: {
          ...process.env,
          CI: 'true',
          NODE_ENV: 'test',
        },
      });

      let stdout = '';
      let stderr = '';

      testProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data);
      });

      testProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });

      testProcess.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            stdout,
            stderr,
            exitCode: code,
          });
        } else {
          resolve({
            success: false,
            stdout,
            stderr,
            exitCode: code,
            error: `Tests failed with exit code ${code}`,
          });
        }
      });

      testProcess.on('error', (error) => {
        reject(new Error(`Failed to start test process: ${error.message}`));
      });

      // Set timeout
      setTimeout(() => {
        testProcess.kill('SIGKILL');
        reject(new Error('Test execution timed out'));
      }, this.config.execution.timeoutMinutes * 60 * 1000);
    });
  }

  /**
   * Execute quality gates phase
   */
  async executeQualityGates() {
    this.updatePhase('quality-gates');

    console.log('  🛡️ Executing quality gates...');

    try {
      if (this.components.qualityGates) {
        const result = await this.components.qualityGates.executeQualityGates();

        this.state.results.qualityGates = result;

        if (result.success) {
          console.log('  ✅ Quality gates passed');
        } else {
          throw new Error(`Quality gates failed: ${result.failures.join(', ')}`);
        }
      }
    } catch (error) {
      throw new Error(`Quality gates execution failed: ${error.message}`);
    }
  }

  /**
   * Execute report generation phase
   */
  async executeReportGeneration() {
    this.updatePhase('report-generation');

    console.log('  📊 Generating quality reports...');

    try {
      if (this.components.reportGenerator) {
        const result = await this.components.reportGenerator.generateAllReports({
          includeArtifacts: true,
          uploadToCI: true,
        });

        this.state.results.reportGeneration = result;
        console.log('  ✅ Quality reports generated');
      }
    } catch (error) {
      this.addWarning(`Report generation warning: ${error.message}`);

      if (!this.config.execution.continueOnNonCriticalFailure) {
        throw error;
      }
    }
  }

  /**
   * Execute environment cleanup phase
   */
  async executeEnvironmentCleanup(options = {}) {
    this.updatePhase('environment-cleanup');

    console.log('  🧹 Cleaning up CI environment...');

    try {
      // Stop simulator
      if (this.components.simulator) {
        await this.components.simulator.stopSimulator();
      }

      // Stop resource optimization
      if (this.components.resourceOptimizer) {
        await this.components.resourceOptimizer.stopOptimization();
      }

      // General cleanup
      if (this.components.cleanup) {
        await this.components.cleanup.performCleanup(options);
      }

      this.state.results.environmentCleanup = {
        success: true,
        timestamp: new Date().toISOString(),
      };

      console.log('  ✅ Environment cleanup completed');
    } catch (error) {
      this.addWarning(`Cleanup warning: ${error.message}`);

      // Don't fail the pipeline on cleanup errors unless forced
      if (options.failOnCleanupError) {
        throw error;
      }
    }
  }

  /**
   * Execute failure analysis
   */
  async executeFailureAnalysis(error) {
    console.log('🔍 Executing failure analysis...');

    try {
      if (this.components.failureAnalyzer) {
        const analysisResult = await this.components.failureAnalyzer.analyzeFailure({
          error: error.message,
          stack: error.stack,
          context: this.state.currentPhase,
          results: this.state.results,
        });

        this.state.results.failureAnalysis = analysisResult;
        console.log('  ✅ Failure analysis completed');
      }
    } catch (analysisError) {
      console.warn(`  ⚠️ Failure analysis failed: ${analysisError.message}`);
    }
  }

  /**
   * Generate final pipeline results
   */
  async generatePipelineResults() {
    const duration = Date.now() - this.state.startTime;

    this.state.results.pipeline = {
      operation: this.state.operation,
      duration,
      phases: this.state.phases,
      errors: this.state.errors,
      warnings: this.state.warnings,
      success: this.state.errors.length === 0,
      timestamp: new Date().toISOString(),
    };

    // Save results to file for CI artifacts
    const resultsPath = path.join(__dirname, 'ci-pipeline-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(this.state.results, null, 2));

    console.log(`📄 Pipeline results saved to: ${resultsPath}`);
  }

  /**
   * Update current phase
   */
  updatePhase(phaseName) {
    this.state.currentPhase = phaseName;
    this.state.phases.push({
      name: phaseName,
      startTime: Date.now(),
      timestamp: new Date().toISOString(),
    });

    console.log(`📋 Phase: ${phaseName}`);
  }

  /**
   * Add warning to state
   */
  addWarning(message) {
    this.state.warnings.push({
      message,
      phase: this.state.currentPhase,
      timestamp: new Date().toISOString(),
    });

    console.warn(`⚠️ ${message}`);
  }

  /**
   * Add error to state
   */
  addError(message) {
    this.state.errors.push({
      message,
      phase: this.state.currentPhase,
      timestamp: new Date().toISOString(),
    });

    console.error(`❌ ${message}`);
  }

  /**
   * Get pipeline status
   */
  getStatus() {
    return {
      currentPhase: this.state.currentPhase,
      duration: this.state.startTime ? Date.now() - this.state.startTime : 0,
      phases: this.state.phases,
      errors: this.state.errors,
      warnings: this.state.warnings,
      results: this.state.results,
    };
  }
}

// CLI Interface
if (require.main === module) {
  const integration = new MasterCIIntegration();
  const operation = process.argv[2] || 'full';
  const options = {};

  // Parse additional options
  if (process.argv.includes('--force-full-tests')) {
    options.forceFullTests = true;
  }
  if (process.argv.includes('--fail-on-cleanup-error')) {
    options.failOnCleanupError = true;
  }

  async function handleCommand() {
    try {
      const result = await integration.executePipeline(operation, options);

      if (result.success) {
        console.log('\n✅ CI/CD Pipeline Integration completed successfully');
        process.exit(0);
      } else {
        console.log('\n❌ CI/CD Pipeline Integration failed');
        process.exit(1);
      }
    } catch (error) {
      console.error(`Fatal error: ${error.message}`);
      process.exit(1);
    }
  }

  // Handle different operations
  if (['full', 'test-only', 'quality-check', 'setup', 'cleanup', 'status'].includes(operation)) {
    if (operation === 'status') {
      console.log('Pipeline Status:', JSON.stringify(integration.getStatus(), null, 2));
    } else {
      handleCommand();
    }
  } else {
    console.log('Usage: node master-ci-integration.js <operation> [options]');
    console.log('');
    console.log('Operations:');
    console.log('  full         - Execute complete CI/CD pipeline (default)');
    console.log('  test-only    - Execute tests with optimization and reporting');
    console.log('  quality-check - Execute quality gates and reporting only');
    console.log('  setup        - Setup environment, optimization, and simulator');
    console.log('  cleanup      - Cleanup environment and resources');
    console.log('  status       - Show current pipeline status');
    console.log('');
    console.log('Options:');
    console.log('  --force-full-tests      - Force full test suite (skip selective testing)');
    console.log('  --fail-on-cleanup-error - Fail pipeline on cleanup errors');
    console.log('');
    console.log('Environment Variables:');
    console.log(
      '  CI_ENABLE_SIMULATOR        - Enable NMEA Bridge Simulator management (default: true)',
    );
    console.log('  CI_ENABLE_PARALLEL         - Enable parallel testing (default: true)');
    console.log('  CI_ENABLE_FLAKY_DETECTION  - Enable flaky test detection (default: true)');
    console.log('  CI_ENABLE_SELECTIVE        - Enable selective test running (default: true)');
    console.log('  CI_ENABLE_OPTIMIZATION     - Enable resource optimization (default: true)');
    console.log('  CI_ENABLE_QUALITY_GATES    - Enable quality gates (default: true)');
    console.log('  CI_ENABLE_FAILURE_ANALYSIS - Enable failure analysis (default: true)');
    console.log('  CI_ENABLE_REPORTING        - Enable report generation (default: true)');
    console.log('');
    process.exit(1);
  }
}

module.exports = { MasterCIIntegration };
