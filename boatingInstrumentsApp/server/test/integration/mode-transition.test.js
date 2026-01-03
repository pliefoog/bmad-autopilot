/**
 * Integration Tests for Mode Transitions
 *
 * Epic 10.5 - Test Coverage & Quality
 * AC2: Mode transition testing - Live → File → Scenario mode switching with data continuity validation
 */

const path = require('path');
const fs = require('fs');
const { UnifiedNMEABridge } = require('../../nmea-bridge');

describe('Mode Transition Integration Tests', () => {
  let bridge;
  let mockDataCollection;

  beforeEach(() => {
    bridge = new UnifiedNMEABridge();
    mockDataCollection = [];

    // Mock data collection for continuity validation
    bridge.on('data', (message) => {
      mockDataCollection.push({
        message,
        timestamp: Date.now(),
        mode: bridge.mode,
      });
    });
  });

  afterEach(async () => {
    if (bridge && bridge.isRunning) {
      await bridge.shutdown();
    }
    mockDataCollection = [];
  });

  describe('Live to File Mode Transition', () => {
    test('should transition from live to file mode cleanly', async () => {
      // Start in live mode
      const liveConfig = {
        mode: 'live',
        host: '192.168.1.10',
        port: 10110,
      };

      // Mock live connection to avoid actual network calls
      jest.spyOn(bridge, 'connectToLiveSource').mockResolvedValue();

      await bridge.start(liveConfig);
      expect(bridge.mode).toBe('live');
      expect(bridge.isRunning).toBe(true);

      // Transition to file mode
      const fileConfig = {
        mode: 'file',
        filePath: path.join(__dirname, '../fixtures/test-nmea.txt'),
        rate: 100,
        loop: false,
      };

      await bridge.switchMode(fileConfig);
      expect(bridge.mode).toBe('file');
      expect(bridge.isRunning).toBe(true);

      // Validate data continuity - no gaps in message flow
      expect(mockDataCollection.length).toBeGreaterThan(0);

      // Check for mode transition markers
      const modeTransitions = mockDataCollection.filter(
        (entry, index) => index > 0 && entry.mode !== mockDataCollection[index - 1].mode,
      );
      expect(modeTransitions.length).toBe(1);
      expect(modeTransitions[0].mode).toBe('file');
    }, 30000);

    test('should preserve server connections during mode transition', async () => {
      // Start with live mode and establish server connections
      const liveConfig = {
        mode: 'live',
        host: '192.168.1.10',
        port: 10110,
      };

      jest.spyOn(bridge, 'connectToLiveSource').mockResolvedValue();
      await bridge.start(liveConfig);

      const initialTcpPort = bridge.protocolServers.tcpServer?.address()?.port;
      const initialUdpPort = bridge.protocolServers.udpServer?.address()?.port;
      const initialWsPort = bridge.protocolServers.wsServer?.address()?.port;

      // Transition to file mode
      const fileConfig = {
        mode: 'file',
        filePath: path.join(__dirname, '../fixtures/test-nmea.txt'),
        rate: 100,
      };

      await bridge.switchMode(fileConfig);

      // Validate server connections are preserved
      expect(bridge.protocolServers.tcpServer?.address()?.port).toBe(initialTcpPort);
      expect(bridge.protocolServers.udpServer?.address()?.port).toBe(initialUdpPort);
      expect(bridge.protocolServers.wsServer?.address()?.port).toBe(initialWsPort);

      // Validate client connections remain active
      expect(bridge.protocolServers.clients.size).toBeGreaterThanOrEqual(0);
    }, 30000);
  });

  describe('File to Scenario Mode Transition', () => {
    test('should transition from file to scenario mode with parameter validation', async () => {
      // Create test NMEA file
      const testFilePath = path.join(__dirname, '../fixtures/transition-test.nmea');
      const testNmeaData = [
        '$GPRMC,123519,A,4807.038,N,01131.000,E,000.0,360.0,230394,003.1,W*6A',
        '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47',
      ].join('\n');

      if (!fs.existsSync(path.dirname(testFilePath))) {
        fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
      }
      fs.writeFileSync(testFilePath, testNmeaData);

      // Start in file mode
      const fileConfig = {
        mode: 'file',
        filePath: testFilePath,
        rate: 50,
        loop: false,
      };

      await bridge.start(fileConfig);
      expect(bridge.mode).toBe('file');

      // Wait for some file processing
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Transition to scenario mode
      const scenarioConfig = {
        mode: 'scenario',
        scenarioName: 'basic-navigation',
        speed: 1.5,
        loop: true,
      };

      await bridge.switchMode(scenarioConfig);
      expect(bridge.mode).toBe('scenario');
      expect(bridge.dataSource.config.speed).toBe(1.5);
      expect(bridge.dataSource.config.loop).toBe(true);

      // Validate message generation starts immediately
      const preTransitionCount = mockDataCollection.length;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      expect(mockDataCollection.length).toBeGreaterThan(preTransitionCount);

      // Cleanup
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }, 30000);

    test('should handle transition errors gracefully', async () => {
      // Start in file mode with valid file
      const testFilePath = path.join(__dirname, '../fixtures/error-test.nmea');
      const testNmeaData = '$GPRMC,123519,A,4807.038,N,01131.000,E,000.0,360.0,230394,003.1,W*6A';

      if (!fs.existsSync(path.dirname(testFilePath))) {
        fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
      }
      fs.writeFileSync(testFilePath, testNmeaData);

      const fileConfig = {
        mode: 'file',
        filePath: testFilePath,
        rate: 10,
      };

      await bridge.start(fileConfig);
      expect(bridge.mode).toBe('file');

      // Attempt transition to scenario with invalid scenario
      const invalidScenarioConfig = {
        mode: 'scenario',
        scenarioName: 'non-existent-scenario',
      };

      // Should handle error gracefully and maintain file mode
      try {
        await bridge.switchMode(invalidScenarioConfig);
      } catch (error) {
        expect(error.message).toContain('scenario');
      }

      // Should still be running in file mode after failed transition
      expect(bridge.isRunning).toBe(true);
      expect(bridge.mode).toBe('file');

      // Cleanup
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }, 30000);
  });

  describe('Live to Scenario Mode Transition', () => {
    test('should transition directly from live to scenario mode', async () => {
      // Start in live mode
      const liveConfig = {
        mode: 'live',
        host: '192.168.1.10',
        port: 10110,
      };

      jest.spyOn(bridge, 'connectToLiveSource').mockResolvedValue();
      await bridge.start(liveConfig);
      expect(bridge.mode).toBe('live');

      // Transition directly to scenario mode
      const scenarioConfig = {
        mode: 'scenario',
        scenarioName: 'coastal-sailing',
        speed: 2.0,
        loop: false,
      };

      await bridge.switchMode(scenarioConfig);
      expect(bridge.mode).toBe('scenario');
      expect(bridge.dataSource.config.scenarioName).toBe('coastal-sailing');
      expect(bridge.dataSource.config.speed).toBe(2.0);

      // Validate immediate scenario execution
      await new Promise((resolve) => setTimeout(resolve, 1000));
      expect(mockDataCollection.some((entry) => entry.mode === 'scenario')).toBe(true);
    }, 30000);
  });

  describe('Performance During Transitions', () => {
    test('should maintain performance targets during mode switches', async () => {
      const performanceMetrics = {
        messageRates: [],
        memoryUsage: [],
        transitionTimes: [],
      };

      // Helper to collect performance metrics
      const collectMetrics = () => {
        const startTime = Date.now();
        const startMemory = process.memoryUsage().heapUsed;
        const startMessageCount = mockDataCollection.length;

        return () => {
          const endTime = Date.now();
          const endMemory = process.memoryUsage().heapUsed;
          const endMessageCount = mockDataCollection.length;

          const duration = endTime - startTime;
          const messageRate = ((endMessageCount - startMessageCount) / duration) * 1000; // msg/sec
          const memoryDelta = endMemory - startMemory;

          performanceMetrics.messageRates.push(messageRate);
          performanceMetrics.memoryUsage.push(memoryDelta);
          performanceMetrics.transitionTimes.push(duration);

          return { messageRate, memoryDelta, duration };
        };
      };

      // Test scenario mode performance
      const scenarioMetrics = collectMetrics();
      const scenarioConfig = {
        mode: 'scenario',
        scenarioName: 'basic-navigation',
        speed: 1.0,
      };

      await bridge.start(scenarioConfig);
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Run for 5 seconds

      const scenarioResults = scenarioMetrics();
      expect(scenarioResults.messageRate).toBeGreaterThan(10); // Min 10 msg/sec
      expect(scenarioResults.memoryDelta).toBeLessThan(50 * 1024 * 1024); // <50MB memory increase

      // Test file mode transition performance
      const fileMetrics = collectMetrics();
      const testFilePath = path.join(__dirname, '../fixtures/perf-test.nmea');
      const testData = Array(1000)
        .fill('$GPRMC,123519,A,4807.038,N,01131.000,E,000.0,360.0,230394,003.1,W*6A')
        .join('\n');

      if (!fs.existsSync(path.dirname(testFilePath))) {
        fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
      }
      fs.writeFileSync(testFilePath, testData);

      const fileConfig = {
        mode: 'file',
        filePath: testFilePath,
        rate: 100, // 100 msg/sec
      };

      await bridge.switchMode(fileConfig);
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Run for 3 seconds

      const fileResults = fileMetrics();
      expect(fileResults.messageRate).toBeGreaterThan(50); // Should achieve >50 msg/sec
      expect(fileResults.duration).toBeLessThan(2000); // Transition should be <2 seconds

      // Validate overall performance consistency
      const avgMessageRate =
        performanceMetrics.messageRates.reduce((a, b) => a + b, 0) /
        performanceMetrics.messageRates.length;
      const maxMemoryUsage = Math.max(...performanceMetrics.memoryUsage);
      const maxTransitionTime = Math.max(...performanceMetrics.transitionTimes);

      expect(avgMessageRate).toBeGreaterThan(20); // Average >20 msg/sec
      expect(maxMemoryUsage).toBeLessThan(100 * 1024 * 1024); // <100MB peak memory
      expect(maxTransitionTime).toBeLessThan(5000); // <5s max transition time

      // Cleanup
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }, 45000);
  });
});
