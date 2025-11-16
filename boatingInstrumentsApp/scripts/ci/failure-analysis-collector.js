#!/usr/bin/env node

/**
 * Story 11.8: CI/CD Pipeline Integration - Failure Analysis and Debugging Support
 * PURPOSE: Failure analysis and debugging support integration available
 * REQUIREMENT: AC#3 - Pipeline Optimization - Failure analysis and debugging artifacts
 * METHOD: Automated failure analysis, artifact collection, and debugging support for CI/CD troubleshooting
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const os = require('os');

class FailureAnalysisCollector {
  constructor() {
    this.config = {
      collection: {
        maxLogSizeMB: parseInt(process.env.CI_MAX_LOG_SIZE_MB || '50'),
        maxArtifactSizeMB: parseInt(process.env.CI_MAX_ARTIFACT_SIZE_MB || '100'),
        retentionDays: parseInt(process.env.CI_ARTIFACT_RETENTION_DAYS || '7'),
        includeSystemInfo: process.env.CI_INCLUDE_SYSTEM_INFO !== 'false',
        includeDependencies: process.env.CI_INCLUDE_DEPENDENCIES !== 'false'
      },
      analysis: {
        enablePatternMatching: process.env.CI_ENABLE_PATTERN_MATCHING !== 'false',
        enableStackTraceAnalysis: process.env.CI_ENABLE_STACK_ANALYSIS !== 'false',
        enableResourceAnalysis: process.env.CI_ENABLE_RESOURCE_ANALYSIS !== 'false',
        generateRecommendations: process.env.CI_GENERATE_RECOMMENDATIONS !== 'false'
      },
      output: {
        baseDir: path.join(__dirname, 'debug-artifacts'),
        includeTimestamp: true,
        compressArtifacts: process.env.CI_COMPRESS_ARTIFACTS !== 'false'
      }
    };
    
    this.analysisResults = {
      timestamp: new Date().toISOString(),
      failureTypes: [],
      patterns: [],
      recommendations: [],
      artifacts: [],
      systemInfo: null,
      summary: null
    };
  }

  /**
   * Analyze failure and collect debugging artifacts
   */
  async analyzeFailure(failureInfo = {}) {
    console.log('🔍 Starting failure analysis and artifact collection...');
    
    const startTime = Date.now();
    
    try {
      // Create output directory
      await this.setupOutputDirectory();
      
      // Step 1: Collect system information
      if (this.config.collection.includeSystemInfo) {
        console.log('  📊 Collecting system information...');
        await this.collectSystemInfo();
      }
      
      // Step 2: Collect test artifacts
      console.log('  📁 Collecting test artifacts...');
      await this.collectTestArtifacts();
      
      // Step 3: Collect process information
      console.log('  🔧 Collecting process information...');
      await this.collectProcessInfo();
      
      // Step 4: Analyze logs for failure patterns
      if (this.config.analysis.enablePatternMatching) {
        console.log('  🕵️ Analyzing failure patterns...');
        await this.analyzeFailurePatterns();
      }
      
      // Step 5: Collect dependency information
      if (this.config.collection.includeDependencies) {
        console.log('  📦 Collecting dependency information...');
        await this.collectDependencyInfo();
      }
      
      // Step 6: Generate analysis report
      console.log('  📝 Generating failure analysis report...');
      await this.generateAnalysisReport();
      
      // Step 7: Generate recommendations
      if (this.config.analysis.generateRecommendations) {
        console.log('  💡 Generating troubleshooting recommendations...');
        await this.generateRecommendations();
      }
      
      // Step 8: Package artifacts
      if (this.config.output.compressArtifacts) {
        console.log('  📦 Packaging debug artifacts...');
        await this.packageArtifacts();
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ Failure analysis completed in ${duration}ms`);
      
      this.analysisResults.summary = {
        duration,
        artifactCount: this.analysisResults.artifacts.length,
        failureTypesFound: this.analysisResults.failureTypes.length,
        recommendationsGenerated: this.analysisResults.recommendations.length
      };
      
      return {
        success: true,
        outputDir: this.config.output.baseDir,
        results: this.analysisResults
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failure analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        duration,
        partialResults: this.analysisResults
      };
    }
  }

  /**
   * Setup output directory for artifacts
   */
  async setupOutputDirectory() {
    const timestamp = this.config.output.includeTimestamp 
      ? `-${new Date().toISOString().replace(/[:.]/g, '-')}`
      : '';
    
    this.config.output.baseDir = path.join(
      __dirname,
      `debug-artifacts${timestamp}`
    );
    
    if (!fs.existsSync(this.config.output.baseDir)) {
      fs.mkdirSync(this.config.output.baseDir, { recursive: true });
    }
    
    console.log(`  📁 Debug artifacts directory: ${this.config.output.baseDir}`);
  }

  /**
   * Collect comprehensive system information
   */
  async collectSystemInfo() {
    const systemInfo = {
      timestamp: new Date().toISOString(),
      platform: {
        type: os.type(),
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        version: os.version && os.version() || 'unknown'
      },
      hardware: {
        cpuCount: os.cpus().length,
        totalMemoryMB: Math.round(os.totalmem() / (1024 * 1024)),
        freeMemoryMB: Math.round(os.freemem() / (1024 * 1024)),
        loadAverage: os.loadavg(),
        uptime: os.uptime()
      },
      process: {
        nodeVersion: process.version,
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        argv: process.argv,
        env: this.sanitizeEnvironment(process.env),
        cwd: process.cwd()
      },
      ci: {
        platform: this.detectCIPlatform(),
        buildNumber: process.env.GITHUB_RUN_NUMBER || process.env.BUILD_NUMBER || 'unknown',
        buildId: process.env.GITHUB_RUN_ID || process.env.BUILD_ID || 'unknown',
        commitHash: process.env.GITHUB_SHA || process.env.GIT_COMMIT || 'unknown',
        branch: process.env.GITHUB_REF_NAME || process.env.GIT_BRANCH || 'unknown',
        pullRequest: process.env.GITHUB_PR_NUMBER || process.env.PULL_REQUEST || null
      }
    };
    
    // Add Git information if available
    try {
      systemInfo.git = {
        branch: execSync('git branch --show-current', { encoding: 'utf-8' }).trim(),
        commit: execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim(),
        shortCommit: execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim(),
        status: execSync('git status --porcelain', { encoding: 'utf-8' }).trim(),
        lastCommitMessage: execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim()
      };
    } catch (error) {
      systemInfo.git = { error: 'Git information not available' };
    }
    
    this.analysisResults.systemInfo = systemInfo;
    
    const outputPath = path.join(this.config.output.baseDir, 'system-info.json');
    fs.writeFileSync(outputPath, JSON.stringify(systemInfo, null, 2));
    
    this.analysisResults.artifacts.push({
      type: 'system-info',
      path: outputPath,
      size: fs.statSync(outputPath).size,
      description: 'Comprehensive system and environment information'
    });
  }

  /**
   * Sanitize environment variables (remove sensitive data)
   */
  sanitizeEnvironment(env) {
    const sanitized = { ...env };
    
    // Remove sensitive keys
    const sensitiveKeys = [
      'PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'CREDENTIAL',
      'PRIVATE', 'GITHUB_TOKEN', 'NPM_TOKEN', 'API_KEY'
    ];
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toUpperCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
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
   * Collect test artifacts and logs
   */
  async collectTestArtifacts() {
    const artifactSources = [
      // Test output files
      { path: path.join(__dirname, '../../coverage'), pattern: '**/*.{json,xml,lcov}', type: 'coverage' },
      { path: path.join(__dirname, '../../test-results'), pattern: '**/*.{json,xml}', type: 'test-results' },
      
      // CI-specific files
      { path: path.join(__dirname, '.'), pattern: '*.json', type: 'ci-config' },
      { path: path.join(__dirname, 'cache'), pattern: '**/*.json', type: 'cache' },
      
      // Application logs
      { path: path.join(__dirname, '../..'), pattern: '*.log', type: 'logs' },
      { path: path.join(__dirname, '../../logs'), pattern: '**/*.log', type: 'logs' },
      
      // Jest and test framework files
      { path: path.join(__dirname, '../..'), pattern: 'jest-results*.json', type: 'jest' },
      { path: path.join(__dirname, '../..'), pattern: 'junit*.xml', type: 'junit' }
    ];
    
    for (const source of artifactSources) {
      try {
        await this.collectArtifactsFromSource(source);
      } catch (error) {
        console.warn(`    ⚠️ Failed to collect ${source.type} artifacts: ${error.message}`);
      }
    }
  }

  /**
   * Collect artifacts from a specific source
   */
  async collectArtifactsFromSource(source) {
    if (!fs.existsSync(source.path)) {
      return;
    }
    
    try {
      // Use find command to get matching files
      const findCommand = `find "${source.path}" -name "${source.pattern}" -type f -not -path "*/node_modules/*" 2>/dev/null || true`;
      const result = execSync(findCommand, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
      
      const files = result.trim().split('\n').filter(f => f.length > 0);
      
      for (const file of files) {
        try {
          const stats = fs.statSync(file);
          const sizeMB = stats.size / (1024 * 1024);
          
          // Skip files that are too large
          if (sizeMB > this.config.collection.maxLogSizeMB) {
            console.warn(`    ⚠️ Skipping large file (${sizeMB.toFixed(1)}MB): ${file}`);
            continue;
          }
          
          // Copy file to artifacts directory
          const relativePath = path.relative(source.path, file);
          const destDir = path.join(this.config.output.baseDir, source.type);
          const destPath = path.join(destDir, relativePath);
          
          // Ensure destination directory exists
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          
          // Copy file
          fs.copyFileSync(file, destPath);
          
          this.analysisResults.artifacts.push({
            type: source.type,
            originalPath: file,
            path: destPath,
            size: stats.size,
            description: `${source.type} artifact: ${relativePath}`
          });
          
        } catch (error) {
          console.warn(`    ⚠️ Failed to collect file ${file}: ${error.message}`);
        }
      }
      
    } catch (error) {
      // Ignore errors - source might not exist or be accessible
    }
  }

  /**
   * Collect process and runtime information
   */
  async collectProcessInfo() {
    const processInfo = {
      timestamp: new Date().toISOString(),
      mainProcess: {
        pid: process.pid,
        ppid: process.ppid,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        versions: process.versions,
        features: process.features || {}
      },
      childProcesses: [],
      openFiles: null,
      networkConnections: null
    };
    
    try {
      // Get child processes (if available)
      const psCommand = process.platform === 'win32' 
        ? `wmic process where "ParentProcessId=${process.pid}" get ProcessId,Name,CommandLine /format:csv`
        : `ps --ppid ${process.pid} -o pid,ppid,comm,args --no-headers`;
      
      const psResult = execSync(psCommand, { encoding: 'utf-8', timeout: 5000 });
      processInfo.childProcesses = this.parseProcessList(psResult, process.platform);
    } catch (error) {
      processInfo.childProcesses = { error: error.message };
    }
    
    try {
      // Get open files (Unix-like systems)
      if (process.platform !== 'win32') {
        const lsofResult = execSync(`lsof -p ${process.pid}`, { encoding: 'utf-8', timeout: 5000 });
        processInfo.openFiles = lsofResult.split('\n').slice(1, 21); // First 20 files
      }
    } catch (error) {
      processInfo.openFiles = { error: error.message };
    }
    
    try {
      // Get network connections
      if (process.platform !== 'win32') {
        const netstatResult = execSync('netstat -tulpn 2>/dev/null | grep node || true', { 
          encoding: 'utf-8', 
          timeout: 5000 
        });
        processInfo.networkConnections = netstatResult.split('\n').filter(line => line.trim());
      }
    } catch (error) {
      processInfo.networkConnections = { error: error.message };
    }
    
    const outputPath = path.join(this.config.output.baseDir, 'process-info.json');
    fs.writeFileSync(outputPath, JSON.stringify(processInfo, null, 2));
    
    this.analysisResults.artifacts.push({
      type: 'process-info',
      path: outputPath,
      size: fs.statSync(outputPath).size,
      description: 'Process and runtime information'
    });
  }

  /**
   * Parse process list output
   */
  parseProcessList(output, platform) {
    if (!output || !output.trim()) return [];
    
    try {
      const lines = output.trim().split('\n');
      
      if (platform === 'win32') {
        // Parse Windows CSV format
        return lines.slice(1).map(line => {
          const parts = line.split(',');
          return {
            pid: parts[1],
            name: parts[2],
            command: parts[3]
          };
        }).filter(p => p.pid && p.pid !== '');
      } else {
        // Parse Unix ps format
        return lines.map(line => {
          const parts = line.trim().split(/\s+/);
          return {
            pid: parts[0],
            ppid: parts[1],
            comm: parts[2],
            args: parts.slice(3).join(' ')
          };
        });
      }
    } catch (error) {
      return { error: error.message, rawOutput: output };
    }
  }

  /**
   * Analyze failure patterns in logs and output
   */
  async analyzeFailurePatterns() {
    const patterns = {
      // Common test failures
      timeout: /timeout|timed out|jest did not exit|async.*timeout/i,
      memory: /out of memory|ENOMEM|heap.*limit|memory.*exceeded/i,
      network: /ECONNREFUSED|ENOTFOUND|network.*error|connection.*refused/i,
      
      // NMEA/Marine specific
      nmea: /nmea.*error|simulator.*failed|bridge.*error/i,
      websocket: /websocket.*error|ws.*connection|socket.*timeout/i,
      
      // CI/Build specific  
      build: /build.*failed|compilation.*error|module.*not.*found/i,
      dependency: /npm.*error|package.*not.*found|version.*conflict/i,
      
      // Jest specific
      jest: /jest.*error|test.*suite.*failed|snapshot.*mismatch/i,
      coverage: /coverage.*threshold|insufficient.*coverage/i
    };
    
    // Collect all log content
    const logContent = await this.collectLogContent();
    
    for (const [patternName, regex] of Object.entries(patterns)) {
      const matches = this.findPatternMatches(logContent, regex, patternName);
      
      if (matches.length > 0) {
        this.analysisResults.patterns.push({
          pattern: patternName,
          regex: regex.source,
          matches: matches.slice(0, 10), // Keep first 10 matches
          count: matches.length
        });
        
        // Classify failure type
        if (!this.analysisResults.failureTypes.includes(patternName)) {
          this.analysisResults.failureTypes.push(patternName);
        }
      }
    }
    
    // Analyze stack traces if enabled
    if (this.config.analysis.enableStackTraceAnalysis) {
      await this.analyzeStackTraces(logContent);
    }
  }

  /**
   * Collect log content from various sources
   */
  async collectLogContent() {
    let logContent = '';
    
    // Check common log locations
    const logSources = [
      // CI logs (from environment)
      process.env.GITHUB_STEP_SUMMARY || '',
      process.env.RUNNER_DEBUG === '1' ? 'DEBUG MODE ENABLED\n' : '',
      
      // Standard output/error if captured
      this.capturedOutput || '',
      
      // Jest output files
      ...this.readLogFiles([
        path.join(__dirname, '../../jest-output.log'),
        path.join(__dirname, '../../test-output.log'),
        path.join(__dirname, '../../npm-debug.log')
      ])
    ];
    
    return logSources.join('\n\n');
  }

  /**
   * Read log files if they exist
   */
  readLogFiles(filePaths) {
    const contents = [];
    
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          const sizeMB = stats.size / (1024 * 1024);
          
          if (sizeMB <= this.config.collection.maxLogSizeMB) {
            const content = fs.readFileSync(filePath, 'utf-8');
            contents.push(`=== ${path.basename(filePath)} ===\n${content}`);
          }
        }
      } catch (error) {
        // Ignore read errors
      }
    }
    
    return contents;
  }

  /**
   * Find pattern matches in log content
   */
  findPatternMatches(content, regex, patternName) {
    const matches = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (regex.test(line)) {
        matches.push({
          line: i + 1,
          content: line.trim(),
          context: {
            before: lines.slice(Math.max(0, i - 2), i).filter(l => l.trim()),
            after: lines.slice(i + 1, Math.min(lines.length, i + 3)).filter(l => l.trim())
          }
        });
      }
    }
    
    return matches;
  }

  /**
   * Analyze stack traces for common issues
   */
  async analyzeStackTraces(content) {
    // Look for stack traces
    const stackTraceRegex = /at\s+[\w.$<>]+\s+\([^)]+\)/g;
    const matches = content.match(stackTraceRegex) || [];
    
    if (matches.length > 0) {
      // Analyze common stack trace patterns
      const stackAnalysis = {
        totalTraces: matches.length,
        commonPaths: this.analyzeCommonPaths(matches),
        suspiciousPatterns: this.findSuspiciousStackPatterns(matches)
      };
      
      this.analysisResults.patterns.push({
        pattern: 'stack-trace',
        analysis: stackAnalysis,
        matches: matches.slice(0, 5) // Keep first 5 stack traces
      });
    }
  }

  /**
   * Analyze common paths in stack traces
   */
  analyzeCommonPaths(stackTraces) {
    const pathCounts = {};
    
    stackTraces.forEach(trace => {
      // Extract file path from stack trace
      const pathMatch = trace.match(/\(([^:]+):/);
      if (pathMatch) {
        const filePath = pathMatch[1];
        pathCounts[filePath] = (pathCounts[filePath] || 0) + 1;
      }
    });
    
    // Return top 5 most common paths
    return Object.entries(pathCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([path, count]) => ({ path, count }));
  }

  /**
   * Find suspicious patterns in stack traces
   */
  findSuspiciousStackPatterns(stackTraces) {
    const suspicious = [];
    
    const suspiciousPatterns = [
      { pattern: /node_modules\/(?!@react-native|react-native)/, description: 'Third-party dependency issue' },
      { pattern: /async|promise|callback/, description: 'Asynchronous operation issue' },
      { pattern: /timeout|timer/, description: 'Timing-related issue' },
      { pattern: /memory|gc|heap/, description: 'Memory management issue' }
    ];
    
    stackTraces.forEach(trace => {
      suspiciousPatterns.forEach(({ pattern, description }) => {
        if (pattern.test(trace)) {
          suspicious.push({ trace, description });
        }
      });
    });
    
    return suspicious.slice(0, 10); // Keep top 10
  }

  /**
   * Collect dependency information
   */
  async collectDependencyInfo() {
    const dependencyInfo = {
      timestamp: new Date().toISOString(),
      packageJson: null,
      lockFile: null,
      installedPackages: null,
      npmConfig: null
    };
    
    try {
      // Read package.json
      const packagePath = path.join(__dirname, '../../package.json');
      if (fs.existsSync(packagePath)) {
        dependencyInfo.packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      }
      
      // Read lock file
      const lockPath = path.join(__dirname, '../../package-lock.json');
      if (fs.existsSync(lockPath)) {
        const lockFile = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
        // Include only metadata, not full dependency tree
        dependencyInfo.lockFile = {
          version: lockFile.version,
          lockfileVersion: lockFile.lockfileVersion,
          packageIntegrity: lockFile.packages ? Object.keys(lockFile.packages).length : 0
        };
      }
      
      // Get npm configuration
      try {
        const npmConfigResult = execSync('npm config list --json', { 
          encoding: 'utf-8', 
          timeout: 10000,
          cwd: path.join(__dirname, '../..')
        });
        dependencyInfo.npmConfig = JSON.parse(npmConfigResult);
      } catch (error) {
        dependencyInfo.npmConfig = { error: error.message };
      }
      
    } catch (error) {
      console.warn(`    ⚠️ Failed to collect dependency info: ${error.message}`);
    }
    
    const outputPath = path.join(this.config.output.baseDir, 'dependency-info.json');
    fs.writeFileSync(outputPath, JSON.stringify(dependencyInfo, null, 2));
    
    this.analysisResults.artifacts.push({
      type: 'dependency-info',
      path: outputPath,
      size: fs.statSync(outputPath).size,
      description: 'Dependency and package management information'
    });
  }

  /**
   * Generate comprehensive analysis report
   */
  async generateAnalysisReport() {
    const report = {
      ...this.analysisResults,
      analysis: {
        failureSeverity: this.assessFailureSeverity(),
        likelyRootCause: this.determineLikelyRootCause(),
        impactAssessment: this.assessImpact(),
        reproducibilityFactor: this.assessReproducibility()
      }
    };
    
    const outputPath = path.join(this.config.output.baseDir, 'failure-analysis-report.json');
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    
    // Also generate a human-readable summary
    const summaryPath = path.join(this.config.output.baseDir, 'failure-summary.md');
    fs.writeFileSync(summaryPath, this.generateMarkdownSummary(report));
    
    this.analysisResults.artifacts.push(
      {
        type: 'analysis-report',
        path: outputPath,
        size: fs.statSync(outputPath).size,
        description: 'Comprehensive failure analysis report'
      },
      {
        type: 'summary',
        path: summaryPath,
        size: fs.statSync(summaryPath).size,
        description: 'Human-readable failure summary'
      }
    );
  }

  /**
   * Assess failure severity based on patterns
   */
  assessFailureSeverity() {
    const severityScores = {
      timeout: 3,
      memory: 4,
      network: 2,
      nmea: 3,
      websocket: 2,
      build: 4,
      dependency: 3,
      jest: 2,
      coverage: 1
    };
    
    let maxSeverity = 0;
    let dominantPattern = 'unknown';
    
    this.analysisResults.failureTypes.forEach(type => {
      const severity = severityScores[type] || 1;
      if (severity > maxSeverity) {
        maxSeverity = severity;
        dominantPattern = type;
      }
    });
    
    const severityLevels = ['low', 'moderate', 'high', 'critical', 'severe'];
    return {
      score: maxSeverity,
      level: severityLevels[maxSeverity] || 'unknown',
      dominantPattern
    };
  }

  /**
   * Determine likely root cause
   */
  determineLikelyRootCause() {
    const causes = [];
    
    if (this.analysisResults.failureTypes.includes('memory')) {
      causes.push('Memory exhaustion or leak in test code');
    }
    
    if (this.analysisResults.failureTypes.includes('timeout')) {
      causes.push('Long-running or hanging asynchronous operations');
    }
    
    if (this.analysisResults.failureTypes.includes('network') || this.analysisResults.failureTypes.includes('websocket')) {
      causes.push('Network connectivity or service unavailability');
    }
    
    if (this.analysisResults.failureTypes.includes('dependency')) {
      causes.push('Package dependency conflicts or missing dependencies');
    }
    
    if (this.analysisResults.failureTypes.includes('nmea')) {
      causes.push('NMEA Bridge Simulator configuration or marine data processing issue');
    }
    
    return causes.length > 0 ? causes : ['Unknown - requires manual investigation'];
  }

  /**
   * Assess impact of the failure
   */
  assessImpact() {
    return {
      testsAffected: this.analysisResults.failureTypes.length,
      ciPipelineBlocked: true,
      deploymentRisk: this.analysisResults.failureTypes.some(type => 
        ['build', 'dependency', 'memory'].includes(type)
      ) ? 'high' : 'medium',
      userFacing: this.analysisResults.failureTypes.some(type => 
        ['nmea', 'websocket', 'network'].includes(type)
      )
    };
  }

  /**
   * Assess reproducibility
   */
  assessReproducibility() {
    const flakyPatterns = ['timeout', 'memory', 'network'];
    const deterministicPatterns = ['build', 'dependency', 'coverage'];
    
    const flakyCount = this.analysisResults.failureTypes.filter(type => 
      flakyPatterns.includes(type)
    ).length;
    
    const deterministicCount = this.analysisResults.failureTypes.filter(type => 
      deterministicPatterns.includes(type)
    ).length;
    
    if (deterministicCount > flakyCount) {
      return { level: 'high', description: 'Likely reproducible on every run' };
    } else if (flakyCount > deterministicCount) {
      return { level: 'low', description: 'Likely intermittent or environment-dependent' };
    } else {
      return { level: 'medium', description: 'May be reproducible under certain conditions' };
    }
  }

  /**
   * Generate markdown summary
   */
  generateMarkdownSummary(report) {
    const severity = report.analysis.failureSeverity;
    const impact = report.analysis.impactAssessment;
    
    let markdown = `# 🚨 Failure Analysis Report\n\n`;
    markdown += `**Timestamp:** ${report.timestamp}\n`;
    markdown += `**Severity:** ${severity.level.toUpperCase()} (${severity.score}/4)\n`;
    markdown += `**Dominant Pattern:** ${severity.dominantPattern}\n`;
    markdown += `**Reproducibility:** ${report.analysis.reproducibilityFactor.level}\n\n`;
    
    markdown += `## 📋 Summary\n\n`;
    markdown += `- **Failure Types Found:** ${report.failureTypes.join(', ')}\n`;
    markdown += `- **Pattern Matches:** ${report.patterns.length}\n`;
    markdown += `- **Artifacts Collected:** ${report.artifacts.length}\n`;
    markdown += `- **Pipeline Blocked:** ${impact.ciPipelineBlocked ? 'Yes' : 'No'}\n`;
    markdown += `- **Deployment Risk:** ${impact.deploymentRisk}\n\n`;
    
    if (report.analysis.likelyRootCause.length > 0) {
      markdown += `## 🔍 Likely Root Causes\n\n`;
      report.analysis.likelyRootCause.forEach(cause => {
        markdown += `- ${cause}\n`;
      });
      markdown += '\n';
    }
    
    if (report.recommendations.length > 0) {
      markdown += `## 💡 Recommendations\n\n`;
      report.recommendations.forEach((rec, index) => {
        markdown += `### ${index + 1}. ${rec.title}\n`;
        markdown += `**Priority:** ${rec.priority}\n`;
        markdown += `${rec.description}\n\n`;
        if (rec.action) {
          markdown += `**Action:** ${rec.action}\n\n`;
        }
      });
    }
    
    markdown += `## 📁 Collected Artifacts\n\n`;
    report.artifacts.forEach(artifact => {
      const sizeMB = (artifact.size / (1024 * 1024)).toFixed(2);
      markdown += `- **${artifact.type}:** ${artifact.description} (${sizeMB} MB)\n`;
    });
    
    if (report.systemInfo) {
      markdown += `\n## 🖥️ System Information\n\n`;
      markdown += `- **Platform:** ${report.systemInfo.platform.type} ${report.systemInfo.platform.platform}\n`;
      markdown += `- **Node.js:** ${report.systemInfo.process.nodeVersion}\n`;
      markdown += `- **Memory:** ${report.systemInfo.hardware.totalMemoryMB} MB total, ${report.systemInfo.hardware.freeMemoryMB} MB free\n`;
      markdown += `- **CPU:** ${report.systemInfo.hardware.cpuCount} cores\n`;
      
      if (report.systemInfo.ci.platform !== 'unknown') {
        markdown += `- **CI Platform:** ${report.systemInfo.ci.platform}\n`;
        markdown += `- **Build:** ${report.systemInfo.ci.buildNumber}\n`;
      }
    }
    
    markdown += `\n---\n`;
    markdown += `*Report generated by BMad CI Failure Analysis Collector*\n`;
    
    return markdown;
  }

  /**
   * Generate troubleshooting recommendations
   */
  async generateRecommendations() {
    const recommendations = [];
    
    // Generate recommendations based on detected patterns
    this.analysisResults.failureTypes.forEach(failureType => {
      const recs = this.getRecommendationsForFailureType(failureType);
      recommendations.push(...recs);
    });
    
    // Add general recommendations
    recommendations.push({
      title: 'Review System Resources',
      priority: 'medium',
      description: 'Check if the failure is related to insufficient system resources (memory, CPU, disk space).',
      action: 'Monitor resource usage during test execution and consider scaling up CI environment if needed.'
    });
    
    recommendations.push({
      title: 'Enable Debug Logging',
      priority: 'low',
      description: 'Enable debug logging to get more detailed information about the failure.',
      action: 'Set DEBUG=* or NODE_DEBUG environment variables and re-run the failing tests.'
    });
    
    this.analysisResults.recommendations = recommendations;
  }

  /**
   * Get specific recommendations for failure type
   */
  getRecommendationsForFailureType(failureType) {
    const recommendations = {
      timeout: [{
        title: 'Increase Test Timeouts',
        priority: 'high',
        description: 'Tests are timing out, likely due to slow operations or hanging promises.',
        action: 'Increase Jest timeout configuration or review async operations for proper cleanup.'
      }],
      
      memory: [{
        title: 'Investigate Memory Leaks',
        priority: 'critical',
        description: 'Memory usage is exceeding limits, indicating possible memory leaks.',
        action: 'Use Node.js memory profiling tools and review test cleanup procedures.'
      }],
      
      network: [{
        title: 'Check Network Dependencies',
        priority: 'high',
        description: 'Network-related failures detected, possibly due to service unavailability.',
        action: 'Verify external services are running and accessible, or mock network dependencies.'
      }],
      
      nmea: [{
        title: 'Review NMEA Bridge Configuration',
        priority: 'high',
        description: 'NMEA Bridge Simulator issues detected.',
        action: 'Check simulator startup scripts and port configurations. Ensure simulator is properly initialized before tests.'
      }],
      
      dependency: [{
        title: 'Update Dependencies',
        priority: 'medium',
        description: 'Package dependency issues detected.',
        action: 'Run npm audit and npm update. Check for version conflicts in package-lock.json.'
      }],
      
      build: [{
        title: 'Fix Build Configuration',
        priority: 'critical',
        description: 'Build system failures detected.',
        action: 'Review build scripts, TypeScript configuration, and module resolution settings.'
      }]
    };
    
    return recommendations[failureType] || [];
  }

  /**
   * Package artifacts into compressed archive
   */
  async packageArtifacts() {
    try {
      const archivePath = `${this.config.output.baseDir}.tar.gz`;
      
      // Create compressed archive
      execSync(`tar -czf "${archivePath}" -C "${path.dirname(this.config.output.baseDir)}" "${path.basename(this.config.output.baseDir)}"`, {
        timeout: 30000
      });
      
      const stats = fs.statSync(archivePath);
      console.log(`  📦 Created debug archive: ${archivePath} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
      
      this.analysisResults.artifacts.push({
        type: 'archive',
        path: archivePath,
        size: stats.size,
        description: 'Compressed archive of all debug artifacts'
      });
      
    } catch (error) {
      console.warn(`  ⚠️ Failed to create archive: ${error.message}`);
    }
  }
}

// CLI Interface
if (require.main === module) {
  const collector = new FailureAnalysisCollector();
  const command = process.argv[2] || 'analyze';

  async function handleCommand() {
    try {
      switch (command) {
        case 'analyze':
          const failureInfo = {
            triggeredBy: process.argv[3] || 'manual',
            context: process.argv[4] || 'unknown'
          };
          
          const result = await collector.analyzeFailure(failureInfo);
          console.log('\n📊 Analysis Result:', JSON.stringify(result, null, 2));
          
          if (!result.success) {
            process.exit(1);
          }
          break;

        case 'config':
          console.log('Configuration:', JSON.stringify(collector.config, null, 2));
          break;

        default:
          console.log(`Usage: ${process.argv[1]} <analyze|config> [context]`);
          console.log('  analyze [trigger] [context]  - Analyze failure and collect debug artifacts (default)');
          console.log('  config                       - Show configuration');
          console.log('');
          console.log('Environment Variables:');
          console.log('  CI_MAX_LOG_SIZE_MB          - Maximum log file size to collect (default: 50)');
          console.log('  CI_MAX_ARTIFACT_SIZE_MB     - Maximum total artifact size (default: 100)');
          console.log('  CI_INCLUDE_SYSTEM_INFO      - Include system information (default: true)');
          console.log('  CI_ENABLE_PATTERN_MATCHING  - Enable failure pattern analysis (default: true)');
          console.log('  CI_GENERATE_RECOMMENDATIONS - Generate troubleshooting recommendations (default: true)');
          console.log('  CI_COMPRESS_ARTIFACTS       - Create compressed artifact archive (default: true)');
          process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  }

  handleCommand();
}

module.exports = { FailureAnalysisCollector };