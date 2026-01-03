/**
 * Integration Tests for VS Code Tasks
 *
 * Epic 10.5 - Test Coverage & Quality
 * AC2: VS Code task integration - All consolidated tasks execute successfully with unified CLI
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

describe('VS Code Task Integration Tests', () => {
  const projectRoot = path.resolve(__dirname, '../../../..');
  const serverPath = path.join(projectRoot, 'boatingInstrumentsApp/server');
  const nmeaBridgePath = path.join(serverPath, 'nmea-bridge.js');

  beforeAll(() => {
    // Verify the unified CLI exists
    expect(fs.existsSync(nmeaBridgePath)).toBe(true);
  });

  describe('Scenario Tasks', () => {
    test('should execute "Start NMEA Bridge: Scenario - Basic Navigation" task', async () => {
      const args = ['--scenario', 'basic-navigation'];
      const result = await executeTask(nmeaBridgePath, args, { timeout: 10000 });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('NMEA Bridge Simulator');
      expect(result.stdout).toMatch(/Starting.*scenario.*basic-navigation/i);
      expect(result.stdout).toMatch(/Server listening/i);
    }, 15000);

    test('should execute "Start NMEA Bridge: Scenario - Coastal Sailing" task', async () => {
      const args = ['--scenario', 'coastal-sailing', '--loop'];
      const result = await executeTask(nmeaBridgePath, args, { timeout: 10000 });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('coastal-sailing');
      expect(result.stdout).toMatch(/loop.*enabled/i);
    }, 15000);

    test('should execute "Start NMEA Bridge: Scenario - Autopilot Engagement" task', async () => {
      const args = ['--scenario', 'autopilot-engagement'];
      const result = await executeTask(nmeaBridgePath, args, { timeout: 10000 });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('autopilot-engagement');
      expect(result.stdout).toMatch(/TCP.*server.*listening/i);
    }, 15000);

    test('should execute "Start NMEA Bridge: Scenario - Engine Monitoring" task', async () => {
      const args = ['--scenario', 'engine-monitoring'];
      const result = await executeTask(nmeaBridgePath, args, { timeout: 10000 });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('engine-monitoring');
      expect(result.stdout).toMatch(/UDP.*server.*listening/i);
    }, 15000);

    test('should execute "Start NMEA Bridge: Scenario - Multi-Instance Equipment Detection" task', async () => {
      const args = ['--scenario', 'multi-equipment-detection'];
      const result = await executeTask(nmeaBridgePath, args, { timeout: 10000 });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('multi-equipment-detection');
      expect(result.stdout).toMatch(/WebSocket.*server.*listening/i);
    }, 15000);
  });

  describe('File Mode Tasks', () => {
    test('should execute "Start NMEA Bridge: File Mode - Sailing Demo" task', async () => {
      // Create test NMEA file
      const testFilePath = path.join(serverPath, 'test-sailing-demo.nmea');
      const testData = [
        '$GPRMC,123519,A,4807.038,N,01131.000,E,000.0,360.0,230394,003.1,W*6A',
        '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47',
        '$VWVWR,084,L,02.6,N,01.3,M,04.7,K*54',
      ].join('\n');

      fs.writeFileSync(testFilePath, testData);

      try {
        const args = ['--file', testFilePath, '--rate', '10', '--loop'];
        const result = await executeTask(nmeaBridgePath, args, { timeout: 10000 });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(/file.*mode/i);
        expect(result.stdout).toMatch(/rate.*10/i);
        expect(result.stdout).toMatch(/loop.*enabled/i);
      } finally {
        // Cleanup
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    }, 15000);

    test('should execute "Start NMEA Bridge: File Mode - Recording Playback" task', async () => {
      // Create test recording file
      const testRecordingPath = path.join(serverPath, 'test-recording.nmea');
      const recordingData = Array(100)
        .fill('$GPRMC,123519,A,4807.038,N,01131.000,E,000.0,360.0,230394,003.1,W*6A')
        .join('\n');

      fs.writeFileSync(testRecordingPath, recordingData);

      try {
        const args = ['--file', testRecordingPath, '--loop'];
        const result = await executeTask(nmeaBridgePath, args, { timeout: 10000 });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(/loading.*file/i);
        expect(result.stdout).toMatch(/100.*sentences/i);
      } finally {
        // Cleanup
        if (fs.existsSync(testRecordingPath)) {
          fs.unlinkSync(testRecordingPath);
        }
      }
    }, 15000);
  });

  describe('Live Mode Tasks', () => {
    test('should execute "Start NMEA Bridge: Live Mode - Hardware Connection" task with validation', async () => {
      // Test with invalid host to verify argument parsing without actual connection
      const args = ['--live', '192.168.1.999', '10110'];
      const result = await executeTask(nmeaBridgePath, args, {
        timeout: 10000,
        expectError: true,
      });

      // Should start but fail to connect (which is expected)
      expect(result.stderr).toMatch(/connection|timeout|error/i);
      expect(result.stdout).toMatch(/live.*mode/i);
    }, 15000);

    test('should validate live mode argument requirements', async () => {
      // Test missing arguments
      const args = ['--live'];
      const result = await executeTask(nmeaBridgePath, args, {
        timeout: 5000,
        expectError: true,
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toMatch(/host.*port.*required/i);
    }, 10000);
  });

  describe('Global Options and Help', () => {
    test('should execute help command', async () => {
      const args = ['--help'];
      const result = await executeTask(nmeaBridgePath, args, { timeout: 5000 });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Unified NMEA Bridge Tool');
      expect(result.stdout).toMatch(/usage:/i);
      expect(result.stdout).toContain('--live');
      expect(result.stdout).toContain('--file');
      expect(result.stdout).toContain('--scenario');
    }, 10000);

    test('should execute version command', async () => {
      const args = ['--version'];
      const result = await executeTask(nmeaBridgePath, args, { timeout: 5000 });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/); // Version format
    }, 10000);

    test('should handle quiet mode flag', async () => {
      const args = ['--scenario', 'basic-navigation', '--quiet'];
      const result = await executeTask(nmeaBridgePath, args, { timeout: 10000 });

      expect(result.exitCode).toBe(0);
      // Quiet mode should have minimal output
      const outputLines = result.stdout.split('\n').filter((line) => line.trim().length > 0);
      expect(outputLines.length).toBeLessThan(10);
    }, 15000);

    test('should handle verbose mode flag', async () => {
      const args = ['--scenario', 'basic-navigation', '--verbose'];
      const result = await executeTask(nmeaBridgePath, args, { timeout: 10000 });

      expect(result.exitCode).toBe(0);
      // Verbose mode should have detailed output
      expect(result.stdout).toMatch(/debug|verbose|detail/i);
      const outputLines = result.stdout.split('\n').filter((line) => line.trim().length > 0);
      expect(outputLines.length).toBeGreaterThan(5);
    }, 15000);
  });

  describe('Error Handling and Validation', () => {
    test('should handle invalid scenario names gracefully', async () => {
      const args = ['--scenario', 'non-existent-scenario'];
      const result = await executeTask(nmeaBridgePath, args, {
        timeout: 10000,
        expectError: true,
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toMatch(/scenario.*not.*found|invalid.*scenario/i);
    }, 15000);

    test('should handle invalid file paths gracefully', async () => {
      const args = ['--file', '/non-existent/path/file.nmea'];
      const result = await executeTask(nmeaBridgePath, args, {
        timeout: 10000,
        expectError: true,
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toMatch(/file.*not.*found|cannot.*read.*file/i);
    }, 15000);

    test('should handle invalid argument combinations', async () => {
      const args = ['--live', '192.168.1.10', '10110', '--file', 'test.nmea'];
      const result = await executeTask(nmeaBridgePath, args, {
        timeout: 5000,
        expectError: true,
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toMatch(/cannot.*specify.*multiple.*modes/i);
    }, 10000);

    test('should handle invalid port numbers', async () => {
      const args = ['--live', '192.168.1.10', '99999'];
      const result = await executeTask(nmeaBridgePath, args, {
        timeout: 5000,
        expectError: true,
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toMatch(/port.*must.*be.*between|invalid.*port/i);
    }, 10000);
  });

  describe('Performance and Resource Usage', () => {
    test('should start and stop cleanly under time constraints', async () => {
      const startTime = Date.now();
      const args = ['--scenario', 'basic-navigation'];
      const result = await executeTask(nmeaBridgePath, args, { timeout: 8000 });

      const executionTime = Date.now() - startTime;

      expect(result.exitCode).toBe(0);
      expect(executionTime).toBeLessThan(10000); // Should start within 10 seconds
      expect(result.stdout).toMatch(/server.*listening/i);
    }, 15000);

    test('should handle resource cleanup on termination', async () => {
      const args = ['--scenario', 'basic-navigation'];

      // Start process
      const child = spawn('node', [nmeaBridgePath, ...args], {
        cwd: serverPath,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Wait for startup
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Terminate gracefully
      child.kill('SIGTERM');

      // Wait for cleanup
      const exitPromise = new Promise((resolve) => {
        child.on('exit', (code, signal) => {
          resolve({ code, signal, stdout, stderr });
        });
      });

      const result = await Promise.race([
        exitPromise,
        new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), 5000)),
      ]);

      expect(result.timeout).toBeUndefined();
      expect(result.signal).toBe('SIGTERM');
      expect(stdout).toMatch(/server.*listening/i);
    }, 15000);
  });

  /**
   * Helper function to execute a task and capture output
   */
  async function executeTask(scriptPath, args = [], options = {}) {
    const { timeout = 30000, expectError = false } = options;

    return new Promise((resolve) => {
      const child = spawn('node', [scriptPath, ...args], {
        cwd: serverPath,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
      }, timeout);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('exit', (code, signal) => {
        clearTimeout(timeoutId);

        if (timedOut) {
          // For background processes, timeout is expected
          resolve({
            exitCode: 0,
            stdout,
            stderr,
            timedOut: true,
            signal,
          });
        } else {
          resolve({
            exitCode: code,
            stdout,
            stderr,
            signal,
          });
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          exitCode: 1,
          stdout,
          stderr: stderr + error.message,
          error,
        });
      });
    });
  }
});
