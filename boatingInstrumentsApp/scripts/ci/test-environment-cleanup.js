#!/usr/bin/env node

/**
 * Story 11.8: CI/CD Pipeline Integration - Test Environment Cleanup
 * PURPOSE: Test environment cleanup and state reset between runs automated
 * REQUIREMENT: AC#1 - CI/CD Pipeline Configuration - Test environment cleanup and state reset
 * METHOD: Comprehensive cleanup of processes, files, ports, and state for CI reliability
 */

const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class TestEnvironmentCleanup {
  constructor() {
    this.config = {
      timeouts: {
        gracefulShutdown: 10000,
        forceKill: 5000
      },
      processes: {
        patterns: [
          'nmea-bridge-simulator',
          'jest',
          'expo',
          '@expo/cli',
          'metro'
        ]
      },
      ports: {
        ranges: [
          { start: 8080, end: 8090 },  // WebSocket ports
          { start: 9090, end: 9100 },  // API ports
          { start: 2000, end: 2010 },  // TCP ports
        ]
      },
      directories: {
        temp: [
          'coverage/',
          'tmp/',
          '.tmp/',
          'node_modules/.cache/',
          '.expo/',
          '.metro-cache/'
        ],
        preserve: [
          'node_modules/',
          '.git/',
          'src/',
          'app/',
          '__tests__/'
        ]
      },
      files: {
        cleanup: [
          'simulator-ports.json',
          'test-history.json',
          'simulator-status.json',
          '*.log',
          '*.pid',
          '.coverage-tmp*',
          'jest-results*.json'
        ]
      }
    };
    
    this.stats = {
      processesKilled: 0,
      portsFreed: 0,
      filesDeleted: 0,
      directoriesCleared: 0,
      errors: []
    };
  }

  /**
   * Perform complete test environment cleanup
   */
  async performCleanup(options = {}) {
    const startTime = Date.now();
    console.log('🧹 Starting comprehensive test environment cleanup...');

    try {
      // Step 1: Stop all test-related processes
      await this.stopAllProcesses();

      // Step 2: Free up occupied ports
      await this.freeUpPorts();

      // Step 3: Clean up temporary files and directories
      await this.cleanupFiles();

      // Step 4: Reset application state
      await this.resetApplicationState();

      // Step 5: Verify cleanup
      await this.verifyCleanup();

      const duration = Date.now() - startTime;
      
      console.log(`✅ Cleanup completed successfully in ${duration}ms`);
      this.printCleanupSummary();
      
      return { 
        success: true, 
        duration,
        stats: this.stats 
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Cleanup failed after ${duration}ms: ${error.message}`);
      this.stats.errors.push(error.message);
      
      return { 
        success: false, 
        duration,
        error: error.message,
        stats: this.stats 
      };
    }
  }

  /**
   * Stop all test-related processes
   */
  async stopAllProcesses() {
    console.log('🔄 Stopping test-related processes...');

    for (const pattern of this.config.processes.patterns) {
      try {
        // Find processes matching pattern
        const { stdout } = await execAsync(`pgrep -f "${pattern}"`);
        const pids = stdout.trim().split('\n').filter(pid => pid);

        for (const pid of pids) {
          await this.stopProcess(pid, pattern);
        }
      } catch (error) {
        // pgrep returns non-zero exit code when no processes found
        if (!error.message.includes('Command failed')) {
          this.stats.errors.push(`Error finding processes for ${pattern}: ${error.message}`);
        }
      }
    }

    // Additional cleanup for node processes on specific ports
    await this.stopProcessesOnPorts();
  }

  /**
   * Stop a specific process gracefully
   */
  async stopProcess(pid, processName) {
    try {
      console.log(`  🛑 Stopping ${processName} (PID: ${pid})`);

      // Send SIGTERM for graceful shutdown
      await execAsync(`kill -TERM ${pid}`);

      // Wait for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if process still exists
      try {
        await execAsync(`kill -0 ${pid}`);
        // Process still exists, force kill
        console.log(`  💀 Force killing ${processName} (PID: ${pid})`);
        await execAsync(`kill -KILL ${pid}`);
      } catch (error) {
        // Process already terminated
      }

      this.stats.processesKilled++;

    } catch (error) {
      this.stats.errors.push(`Error stopping process ${pid}: ${error.message}`);
    }
  }

  /**
   * Stop processes running on specific ports
   */
  async stopProcessesOnPorts() {
    for (const portRange of this.config.ports.ranges) {
      for (let port = portRange.start; port <= portRange.end; port++) {
        try {
          // Find process using port (macOS/Linux compatible)
          const { stdout } = await execAsync(`lsof -ti:${port} 2>/dev/null || true`);
          const pids = stdout.trim().split('\n').filter(pid => pid);

          for (const pid of pids) {
            await this.stopProcess(pid, `port-${port}`);
            this.stats.portsFreed++;
          }
        } catch (error) {
          // Ignore errors - port might not be in use
        }
      }
    }
  }

  /**
   * Free up occupied ports
   */
  async freeUpPorts() {
    console.log('🔓 Freeing up test ports...');

    // Check for simulator configuration files that might indicate port usage
    const configFiles = [
      path.join(__dirname, 'simulator-ports.json'),
      path.join(__dirname, '../..', '.vscode/simulator-status.json')
    ];

    for (const configFile of configFiles) {
      if (fs.existsSync(configFile)) {
        try {
          const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
          if (config.ports) {
            for (const [service, port] of Object.entries(config.ports)) {
              await this.freePort(port, service);
            }
          }
        } catch (error) {
          this.stats.errors.push(`Error reading port config ${configFile}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Free a specific port
   */
  async freePort(port, service) {
    try {
      const { stdout } = await execAsync(`lsof -ti:${port} 2>/dev/null || true`);
      const pids = stdout.trim().split('\n').filter(pid => pid);

      for (const pid of pids) {
        console.log(`  🔓 Freeing port ${port} (${service}) from PID ${pid}`);
        await this.stopProcess(pid, `${service}-port-${port}`);
      }
    } catch (error) {
      // Ignore errors - port might not be in use
    }
  }

  /**
   * Clean up temporary files and directories
   */
  async cleanupFiles() {
    console.log('📁 Cleaning up temporary files and directories...');

    // Clean up directories
    for (const dir of this.config.directories.temp) {
      await this.cleanupDirectory(dir);
    }

    // Clean up specific files
    for (const filePattern of this.config.files.cleanup) {
      await this.cleanupFilePattern(filePattern);
    }
  }

  /**
   * Clean up a directory
   */
  async cleanupDirectory(dirPath) {
    const fullPath = path.resolve(dirPath);
    
    try {
      if (fs.existsSync(fullPath)) {
        console.log(`  📁 Cleaning directory: ${dirPath}`);
        
        if (dirPath.endsWith('coverage/') || dirPath.endsWith('.cache/')) {
          // For cache directories, remove contents but keep directory
          const { stdout } = await execAsync(`find "${fullPath}" -type f -delete 2>/dev/null || true`);
        } else {
          // For temp directories, remove entire directory
          await execAsync(`rm -rf "${fullPath}"`);
        }
        
        this.stats.directoriesCleared++;
      }
    } catch (error) {
      this.stats.errors.push(`Error cleaning directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Clean up files matching a pattern
   */
  async cleanupFilePattern(pattern) {
    try {
      const searchDirs = [__dirname, path.join(__dirname, '../..')];
      
      for (const searchDir of searchDirs) {
        console.log(`  🗑️ Cleaning files matching: ${pattern} in ${path.relative(process.cwd(), searchDir)}`);
        
        if (pattern.includes('*')) {
          // Handle glob patterns
          const { stdout } = await execAsync(`find "${searchDir}" -maxdepth 2 -name "${pattern}" -type f -delete 2>/dev/null || true`);
        } else {
          // Handle specific files
          const filePath = path.join(searchDir, pattern);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            this.stats.filesDeleted++;
          }
        }
      }
    } catch (error) {
      this.stats.errors.push(`Error cleaning file pattern ${pattern}: ${error.message}`);
    }
  }

  /**
   * Reset application state
   */
  async resetApplicationState() {
    console.log('🔄 Resetting application state...');

    try {
      // Reset Jest cache
      const jestCachePath = path.join(__dirname, '../..', 'node_modules/.cache/jest');
      if (fs.existsSync(jestCachePath)) {
        await execAsync(`rm -rf "${jestCachePath}"`);
        console.log('  ♻️ Jest cache cleared');
      }

      // Reset Metro cache
      const metroCachePath = path.join(__dirname, '../..', '.metro-cache');
      if (fs.existsSync(metroCachePath)) {
        await execAsync(`rm -rf "${metroCachePath}"`);
        console.log('  ♻️ Metro cache cleared');
      }

      // Reset any test-specific environment variables
      delete process.env.TEST_SESSION_ID;
      delete process.env.NMEA_WEBSOCKET_PORT;
      delete process.env.NMEA_API_PORT;
      delete process.env.NMEA_TCP_PORT;
      delete process.env.JEST_WORKER_ID;

      console.log('  ♻️ Environment variables reset');

    } catch (error) {
      this.stats.errors.push(`Error resetting application state: ${error.message}`);
    }
  }

  /**
   * Verify cleanup was successful
   */
  async verifyCleanup() {
    console.log('🔍 Verifying cleanup...');

    const verificationErrors = [];

    // Check for remaining test processes
    for (const pattern of this.config.processes.patterns) {
      try {
        const { stdout } = await execAsync(`pgrep -f "${pattern}"`);
        if (stdout.trim()) {
          verificationErrors.push(`Processes still running: ${pattern}`);
        }
      } catch (error) {
        // No processes found - this is good
      }
    }

    // Check for ports still in use
    for (const portRange of this.config.ports.ranges) {
      for (let port = portRange.start; port <= portRange.end; port++) {
        try {
          const { stdout } = await execAsync(`lsof -ti:${port} 2>/dev/null || true`);
          if (stdout.trim()) {
            verificationErrors.push(`Port ${port} still in use`);
          }
        } catch (error) {
          // Port not in use - this is good
        }
      }
    }

    if (verificationErrors.length > 0) {
      console.warn('⚠️ Verification warnings:');
      verificationErrors.forEach(error => console.warn(`  - ${error}`));
      this.stats.errors.push(...verificationErrors);
    } else {
      console.log('✅ Cleanup verification passed');
    }
  }

  /**
   * Print cleanup summary
   */
  printCleanupSummary() {
    console.log('\n📊 Cleanup Summary:');
    console.log(`  Processes killed: ${this.stats.processesKilled}`);
    console.log(`  Ports freed: ${this.stats.portsFreed}`);
    console.log(`  Files deleted: ${this.stats.filesDeleted}`);
    console.log(`  Directories cleared: ${this.stats.directoriesCleared}`);
    
    if (this.stats.errors.length > 0) {
      console.log(`  Errors: ${this.stats.errors.length}`);
      console.log('  Error details:');
      this.stats.errors.forEach(error => console.log(`    - ${error}`));
    } else {
      console.log('  Errors: 0');
    }
  }

  /**
   * Quick cleanup for CI environments
   */
  async quickCleanup() {
    console.log('⚡ Performing quick cleanup for CI...');
    
    try {
      // Kill simulator processes quickly
      await execAsync('pkill -f nmea-bridge-simulator || true');
      
      // Free up standard ports
      for (const port of [8080, 9090, 2000]) {
        await execAsync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`);
      }
      
      // Remove key files
      const filesToRemove = [
        path.join(__dirname, 'simulator-ports.json'),
        path.join(__dirname, '../..', '.vscode/simulator-status.json')
      ];
      
      for (const file of filesToRemove) {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      }
      
      console.log('✅ Quick cleanup completed');
      return { success: true };
      
    } catch (error) {
      console.error(`❌ Quick cleanup failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

// CLI Interface
if (require.main === module) {
  const cleanup = new TestEnvironmentCleanup();
  const command = process.argv[2] || 'full';

  async function handleCommand() {
    try {
      let result;
      
      switch (command) {
        case 'full':
          result = await cleanup.performCleanup();
          break;
          
        case 'quick':
          result = await cleanup.quickCleanup();
          break;
          
        case 'processes':
          await cleanup.stopAllProcesses();
          cleanup.printCleanupSummary();
          result = { success: true };
          break;
          
        case 'ports':
          await cleanup.freeUpPorts();
          cleanup.printCleanupSummary();
          result = { success: true };
          break;
          
        case 'files':
          await cleanup.cleanupFiles();
          cleanup.printCleanupSummary();
          result = { success: true };
          break;

        default:
          console.log(`Usage: ${process.argv[1]} <full|quick|processes|ports|files>`);
          console.log('  full       - Complete cleanup (default)');
          console.log('  quick      - Fast cleanup for CI environments');
          console.log('  processes  - Stop processes only');
          console.log('  ports      - Free ports only');
          console.log('  files      - Clean files/directories only');
          process.exit(1);
      }

      if (!result.success) {
        process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  }

  handleCommand();
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, performing cleanup...');
  const cleanup = new TestEnvironmentCleanup();
  await cleanup.quickCleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, performing cleanup...');
  const cleanup = new TestEnvironmentCleanup();
  await cleanup.quickCleanup();
  process.exit(0);
});

module.exports = { TestEnvironmentCleanup };