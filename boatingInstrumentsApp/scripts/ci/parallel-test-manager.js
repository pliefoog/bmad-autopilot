#!/usr/bin/env node

/**
 * Story 11.8: CI/CD Pipeline Integration - Parallel Test Execution Manager
 * PURPOSE: Parallel test execution support without resource conflicts
 * REQUIREMENT: AC#1 - CI/CD Pipeline Configuration - Parallel test execution without conflicts
 * METHOD: Port allocation, test isolation, and resource conflict detection for CI environments
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { SimulatorLifecycleManager } = require('./simulator-lifecycle');

class ParallelTestManager {
  constructor() {
    this.testSessions = new Map();
    this.portAllocations = new Map();
    this.baseConfig = {
      ports: {
        websocket: 8080,
        api: 9090,
        tcp: 2000
      },
      maxParallelSessions: parseInt(process.env.CI_PARALLEL_JOBS || '4'),
      sessionTimeout: parseInt(process.env.CI_TEST_TIMEOUT || '300000'), // 5 minutes
    };
  }

  /**
   * Allocate unique ports for a test session
   */
  async allocatePortsForSession(sessionId) {
    const sessionNumber = this.testSessions.size;
    const ports = {
      websocket: this.baseConfig.ports.websocket + (sessionNumber * 10),
      api: this.baseConfig.ports.api + (sessionNumber * 10),
      tcp: this.baseConfig.ports.tcp + (sessionNumber * 10)
    };

    // Verify ports are available
    const net = require('net');
    for (const [service, port] of Object.entries(ports)) {
      if (!await this.isPortAvailable(port)) {
        throw new Error(`Port ${port} for ${service} is not available for session ${sessionId}`);
      }
    }

    this.portAllocations.set(sessionId, ports);
    return ports;
  }

  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      
      server.on('error', () => resolve(false));
    });
  }

  /**
   * Start a parallel test session
   */
  async startTestSession(sessionId, testSpec) {
    if (this.testSessions.size >= this.baseConfig.maxParallelSessions) {
      throw new Error(`Maximum parallel sessions (${this.baseConfig.maxParallelSessions}) exceeded`);
    }

    console.log(`🔄 Starting parallel test session: ${sessionId}`);

    try {
      // Allocate ports
      const ports = await this.allocatePortsForSession(sessionId);
      console.log(`📡 Session ${sessionId} allocated ports:`, ports);

      // Start simulator for this session
      const simulatorManager = new SimulatorLifecycleManager();
      const simulatorResult = await simulatorManager.startSimulator(
        testSpec.scenario || 'basic-navigation', 
        { 
          ports,
          duration: testSpec.duration,
          loop: testSpec.loop 
        }
      );

      // Prepare test environment
      const testEnv = {
        ...process.env,
        NODE_ENV: 'test',
        CI: 'true',
        NMEA_WEBSOCKET_PORT: ports.websocket.toString(),
        NMEA_API_PORT: ports.api.toString(),
        NMEA_TCP_PORT: ports.tcp.toString(),
        TEST_SESSION_ID: sessionId,
        JEST_WORKER_ID: sessionId
      };

      // Run tests
      const testProcess = spawn('npm', ['run', testSpec.testCommand || 'test'], {
        cwd: path.join(__dirname, '../..'),
        env: testEnv,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      const session = {
        id: sessionId,
        ports,
        simulatorManager,
        testProcess,
        startTime: Date.now(),
        spec: testSpec
      };

      this.testSessions.set(sessionId, session);

      // Set up session timeout
      const timeoutId = setTimeout(async () => {
        console.log(`⏰ Test session ${sessionId} timed out, cleaning up...`);
        await this.stopTestSession(sessionId);
      }, this.sessionTimeout);

      session.timeoutId = timeoutId;

      // Handle test completion
      testProcess.on('exit', async (code) => {
        clearTimeout(timeoutId);
        session.exitCode = code;
        console.log(`✅ Test session ${sessionId} completed with exit code: ${code}`);
        
        // Keep session record for reporting but stop simulator
        await simulatorManager.stopSimulator();
      });

      return {
        success: true,
        sessionId,
        ports,
        simulatorPid: simulatorResult.pid,
        testPid: testProcess.pid
      };

    } catch (error) {
      console.error(`❌ Failed to start test session ${sessionId}: ${error.message}`);
      await this.cleanupSession(sessionId);
      throw error;
    }
  }

  /**
   * Stop a specific test session
   */
  async stopTestSession(sessionId) {
    const session = this.testSessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    console.log(`🛑 Stopping test session: ${sessionId}`);

    try {
      // Clear timeout
      if (session.timeoutId) {
        clearTimeout(session.timeoutId);
      }

      // Stop test process
      if (session.testProcess && !session.testProcess.killed) {
        session.testProcess.kill('SIGTERM');
        
        // Force kill after 5 seconds
        setTimeout(() => {
          if (!session.testProcess.killed) {
            session.testProcess.kill('SIGKILL');
          }
        }, 5000);
      }

      // Stop simulator
      if (session.simulatorManager) {
        await session.simulatorManager.stopSimulator();
      }

      // Clean up resources
      this.portAllocations.delete(sessionId);

      // Mark session as completed
      session.endTime = Date.now();
      session.duration = session.endTime - session.startTime;

      return { 
        success: true, 
        sessionId,
        duration: session.duration,
        exitCode: session.exitCode
      };

    } catch (error) {
      console.error(`❌ Error stopping test session ${sessionId}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop all active test sessions
   */
  async stopAllSessions() {
    console.log(`🛑 Stopping all ${this.testSessions.size} active test sessions...`);
    
    const results = [];
    for (const sessionId of this.testSessions.keys()) {
      try {
        const result = await this.stopTestSession(sessionId);
        results.push({ sessionId, ...result });
      } catch (error) {
        results.push({ sessionId, success: false, error: error.message });
      }
    }

    this.testSessions.clear();
    this.portAllocations.clear();

    return results;
  }

  /**
   * Get status of all test sessions
   */
  getSessionsStatus() {
    const sessions = [];
    
    for (const [sessionId, session] of this.testSessions.entries()) {
      sessions.push({
        id: sessionId,
        ports: session.ports,
        startTime: session.startTime,
        duration: session.endTime ? (session.endTime - session.startTime) : (Date.now() - session.startTime),
        exitCode: session.exitCode,
        spec: session.spec,
        running: !session.endTime
      });
    }

    return {
      activeSessions: sessions.filter(s => s.running).length,
      completedSessions: sessions.filter(s => !s.running).length,
      totalSessions: sessions.length,
      sessions
    };
  }

  /**
   * Clean up session resources
   */
  async cleanupSession(sessionId) {
    if (this.testSessions.has(sessionId)) {
      await this.stopTestSession(sessionId);
    }
    this.portAllocations.delete(sessionId);
  }
}

// CLI Interface
if (require.main === module) {
  const manager = new ParallelTestManager();
  const command = process.argv[2];

  async function handleCommand() {
    try {
      switch (command) {
        case 'start':
          const sessionId = process.argv[3] || `session-${Date.now()}`;
          const testSpec = {
            scenario: process.argv[4] || 'basic-navigation',
            testCommand: process.argv[5] || 'test',
            duration: process.argv.includes('--duration') ? parseInt(process.argv[process.argv.indexOf('--duration') + 1]) : null,
            loop: process.argv.includes('--loop')
          };
          
          const result = await manager.startTestSession(sessionId, testSpec);
          console.log(JSON.stringify(result, null, 2));
          break;

        case 'stop':
          const stopSessionId = process.argv[3];
          if (stopSessionId && stopSessionId !== 'all') {
            const stopResult = await manager.stopTestSession(stopSessionId);
            console.log(JSON.stringify(stopResult, null, 2));
          } else {
            const stopResults = await manager.stopAllSessions();
            console.log(JSON.stringify(stopResults, null, 2));
          }
          break;

        case 'status':
          const status = manager.getSessionsStatus();
          console.log(JSON.stringify(status, null, 2));
          break;

        default:
          console.log(`Usage: ${process.argv[1]} <start|stop|status> [options]`);
          console.log('  start <sessionId> <scenario> <testCommand>  - Start parallel test session');
          console.log('  stop <sessionId|all>                        - Stop specific or all sessions');
          console.log('  status                                       - Get status of all sessions');
          console.log('');
          console.log('Options:');
          console.log('  --duration <ms>   - Run for specified duration');
          console.log('  --loop            - Loop scenario continuously');
          console.log('');
          console.log('Environment Variables:');
          console.log('  CI_PARALLEL_JOBS   - Maximum parallel sessions (default: 4)');
          console.log('  CI_TEST_TIMEOUT    - Session timeout in ms (default: 300000)');
          process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  }

  handleCommand();

  // Handle cleanup on process termination
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, cleaning up test sessions...');
    await manager.stopAllSessions();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, cleaning up test sessions...');
    await manager.stopAllSessions();
    process.exit(0);
  });
}

module.exports = { ParallelTestManager };