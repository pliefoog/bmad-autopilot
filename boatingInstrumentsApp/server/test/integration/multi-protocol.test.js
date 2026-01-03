/**
 * Integration Tests for Multi-Protocol Validation
 *
 * Epic 10.5 - Test Coverage & Quality
 * AC2: Multi-protocol validation - Concurrent TCP/UDP/WebSocket connections across all operational modes
 */

const net = require('net');
const dgram = require('dgram');
const WebSocket = require('ws');
const { UnifiedNMEABridge } = require('../../nmea-bridge');

describe('Multi-Protocol Integration Tests', () => {
  let bridge;
  let tcpClient;
  let udpClient;
  let wsClient;
  let messageCollections;

  beforeEach(async () => {
    bridge = new UnifiedNMEABridge();
    messageCollections = {
      tcp: [],
      udp: [],
      websocket: [],
    };

    // Start bridge in scenario mode for consistent data
    const config = {
      mode: 'scenario',
      scenarioName: 'basic-navigation',
      speed: 1.0,
    };

    await bridge.start(config);

    // Wait for servers to be fully ready
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterEach(async () => {
    // Clean up clients
    if (tcpClient && !tcpClient.destroyed) {
      tcpClient.destroy();
    }
    if (udpClient) {
      udpClient.close();
    }
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
      wsClient.close();
    }

    // Clean up bridge
    if (bridge && bridge.isRunning) {
      await bridge.shutdown();
    }

    // Clear collections
    messageCollections = { tcp: [], udp: [], websocket: [] };
  });

  describe('Concurrent Protocol Connections', () => {
    test('should support simultaneous TCP, UDP, and WebSocket connections', async () => {
      // Establish TCP connection
      tcpClient = new net.Socket();
      const tcpConnected = new Promise((resolve, reject) => {
        tcpClient.connect(2000, 'localhost', resolve);
        tcpClient.on('error', reject);
      });

      // Establish UDP client
      udpClient = dgram.createSocket('udp4');
      const udpReady = new Promise((resolve) => {
        udpClient.bind(() => resolve());
      });

      // Establish WebSocket connection
      const wsConnected = new Promise((resolve, reject) => {
        wsClient = new WebSocket('ws://localhost:8080');
        wsClient.on('open', resolve);
        wsClient.on('error', reject);
      });

      // Wait for all connections to establish
      await Promise.all([tcpConnected, udpReady, wsConnected]);

      // Verify all connections are active
      expect(tcpClient.readyState).toBe('open');
      expect(udpClient._handle).toBeTruthy(); // UDP socket is bound
      expect(wsClient.readyState).toBe(WebSocket.OPEN);

      // Verify bridge reports correct connection count
      const status = bridge.getStatus();
      expect(status.protocolServers.stats.activeConnections).toBeGreaterThanOrEqual(2); // TCP + WS (UDP is connectionless)
    }, 15000);

    test('should broadcast messages to all protocol clients simultaneously', async () => {
      // Set up message collectors for each protocol
      const setupClients = async () => {
        // TCP client
        tcpClient = new net.Socket();
        await new Promise((resolve, reject) => {
          tcpClient.connect(2000, 'localhost', resolve);
          tcpClient.on('error', reject);
        });
        tcpClient.on('data', (data) => {
          const messages = data
            .toString()
            .trim()
            .split('\n')
            .filter((msg) => msg.length > 0);
          messageCollections.tcp.push(...messages);
        });

        // UDP client
        udpClient = dgram.createSocket('udp4');
        await new Promise((resolve) => udpClient.bind(resolve));
        udpClient.on('message', (message) => {
          const msg = message.toString().trim();
          if (msg.length > 0) {
            messageCollections.udp.push(msg);
          }
        });

        // WebSocket client
        wsClient = new WebSocket('ws://localhost:8080');
        await new Promise((resolve, reject) => {
          wsClient.on('open', resolve);
          wsClient.on('error', reject);
        });
        wsClient.on('message', (data) => {
          const msg = data.toString().trim();
          if (msg.length > 0) {
            messageCollections.websocket.push(msg);
          }
        });
      };

      await setupClients();

      // Allow time for message collection
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Verify all protocols received messages
      expect(messageCollections.tcp.length).toBeGreaterThan(0);
      expect(messageCollections.udp.length).toBeGreaterThan(0);
      expect(messageCollections.websocket.length).toBeGreaterThan(0);

      // Verify message consistency across protocols
      const sampleTcpMessage = messageCollections.tcp[0];
      const sampleUdpMessage = messageCollections.udp[0];
      const sampleWsMessage = messageCollections.websocket[0];

      // All protocols should receive valid NMEA messages
      expect(sampleTcpMessage).toMatch(/^\$[A-Z]{2}[A-Z]{3},.*\*[0-9A-F]{2}$/);
      expect(sampleUdpMessage).toMatch(/^\$[A-Z]{2}[A-Z]{3},.*\*[0-9A-F]{2}$/);
      expect(sampleWsMessage).toMatch(/^\$[A-Z]{2}[A-Z]{3},.*\*[0-9A-F]{2}$/);

      // Message rates should be similar across protocols (within 10%)
      const tcpRate = messageCollections.tcp.length / 5; // messages per second
      const udpRate = messageCollections.udp.length / 5;
      const wsRate = messageCollections.websocket.length / 5;

      const avgRate = (tcpRate + udpRate + wsRate) / 3;
      expect(Math.abs(tcpRate - avgRate) / avgRate).toBeLessThan(0.1);
      expect(Math.abs(udpRate - avgRate) / avgRate).toBeLessThan(0.1);
      expect(Math.abs(wsRate - avgRate) / avgRate).toBeLessThan(0.1);
    }, 20000);
  });

  describe('Protocol-Specific Behavior', () => {
    test('should handle TCP client disconnections gracefully', async () => {
      // Connect multiple TCP clients
      const clients = [];
      const clientCount = 3;

      for (let i = 0; i < clientCount; i++) {
        const client = new net.Socket();
        await new Promise((resolve, reject) => {
          client.connect(2000, 'localhost', resolve);
          client.on('error', reject);
        });
        clients.push(client);
      }

      // Verify all clients are connected
      const initialStatus = bridge.getStatus();
      expect(initialStatus.protocolServers.stats.activeConnections).toBeGreaterThanOrEqual(
        clientCount,
      );

      // Disconnect one client
      clients[0].destroy();
      await new Promise((resolve) => setTimeout(resolve, 100)); // Allow time for cleanup

      // Verify remaining clients still receive data
      const messageReceived = new Promise((resolve) => {
        clients[1].on('data', (data) => {
          if (data.toString().includes('$')) {
            resolve(true);
          }
        });
      });

      const receivedData = await Promise.race([
        messageReceived,
        new Promise((resolve) => setTimeout(() => resolve(false), 3000)),
      ]);

      expect(receivedData).toBe(true);

      // Verify connection count decreased
      const finalStatus = bridge.getStatus();
      expect(finalStatus.protocolServers.stats.activeConnections).toBe(
        initialStatus.protocolServers.stats.activeConnections - 1,
      );

      // Cleanup remaining clients
      clients.slice(1).forEach((client) => client.destroy());
    }, 15000);

    test('should handle WebSocket connection lifecycle correctly', async () => {
      // Test WebSocket connection, disconnection, and reconnection
      wsClient = new WebSocket('ws://localhost:8080');

      let messagesReceived = 0;
      const messagePromise = new Promise((resolve) => {
        wsClient.on('message', () => {
          messagesReceived++;
          if (messagesReceived >= 3) resolve();
        });
      });

      await new Promise((resolve, reject) => {
        wsClient.on('open', resolve);
        wsClient.on('error', reject);
      });

      // Wait for some messages
      await messagePromise;
      expect(messagesReceived).toBeGreaterThanOrEqual(3);

      // Close connection
      wsClient.close();
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Reconnect
      const wsClient2 = new WebSocket('ws://localhost:8080');
      let reconnectedMessages = 0;

      const reconnectPromise = new Promise((resolve) => {
        wsClient2.on('message', () => {
          reconnectedMessages++;
          if (reconnectedMessages >= 2) resolve();
        });
      });

      await new Promise((resolve, reject) => {
        wsClient2.on('open', resolve);
        wsClient2.on('error', reject);
      });

      await reconnectPromise;
      expect(reconnectedMessages).toBeGreaterThanOrEqual(2);

      wsClient2.close();
    }, 15000);

    test('should handle UDP broadcast reception correctly', async () => {
      // UDP is connectionless, so test broadcast reception
      udpClient = dgram.createSocket('udp4');

      const messagesReceived = [];
      udpClient.on('message', (message, remote) => {
        messagesReceived.push({
          message: message.toString(),
          from: remote,
          timestamp: Date.now(),
        });
      });

      await new Promise((resolve) => udpClient.bind(resolve));

      // Allow time for UDP messages
      await new Promise((resolve) => setTimeout(resolve, 3000));

      expect(messagesReceived.length).toBeGreaterThan(0);

      // Verify messages are properly formatted NMEA
      const validMessages = messagesReceived.filter((msg) =>
        msg.message.match(/^\$[A-Z]{2}[A-Z]{3},.*\*[0-9A-F]{2}/),
      );
      expect(validMessages.length).toBe(messagesReceived.length);

      // Verify consistent timing
      if (messagesReceived.length > 1) {
        const intervals = [];
        for (let i = 1; i < messagesReceived.length; i++) {
          intervals.push(messagesReceived[i].timestamp - messagesReceived[i - 1].timestamp);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        expect(avgInterval).toBeGreaterThan(100); // At least 100ms between messages
        expect(avgInterval).toBeLessThan(5000); // No more than 5s between messages
      }
    }, 10000);
  });

  describe('Load Testing Across Protocols', () => {
    test('should maintain performance with multiple concurrent connections', async () => {
      const clientCounts = { tcp: 5, websocket: 5 };
      const clients = { tcp: [], websocket: [] };
      const messageCounters = { tcp: 0, websocket: 0, udp: 0 };

      // Create multiple TCP clients
      for (let i = 0; i < clientCounts.tcp; i++) {
        const client = new net.Socket();
        await new Promise((resolve, reject) => {
          client.connect(2000, 'localhost', resolve);
          client.on('error', reject);
        });

        client.on('data', () => {
          messageCounters.tcp++;
        });

        clients.tcp.push(client);
      }

      // Create multiple WebSocket clients
      for (let i = 0; i < clientCounts.websocket; i++) {
        const client = new WebSocket('ws://localhost:8080');
        await new Promise((resolve, reject) => {
          client.on('open', resolve);
          client.on('error', reject);
        });

        client.on('message', () => {
          messageCounters.websocket++;
        });

        clients.websocket.push(client);
      }

      // Create UDP client
      udpClient = dgram.createSocket('udp4');
      await new Promise((resolve) => udpClient.bind(resolve));
      udpClient.on('message', () => {
        messageCounters.udp++;
      });

      // Run load test for 10 seconds
      const testDuration = 10000;
      const startTime = Date.now();

      await new Promise((resolve) => setTimeout(resolve, testDuration));

      const endTime = Date.now();
      const actualDuration = (endTime - startTime) / 1000;

      // Calculate message rates
      const tcpRate = messageCounters.tcp / actualDuration;
      const wsRate = messageCounters.websocket / actualDuration;
      const udpRate = messageCounters.udp / actualDuration;

      // Verify performance targets
      expect(tcpRate).toBeGreaterThan(10); // >10 msg/sec per TCP connection total
      expect(wsRate).toBeGreaterThan(10); // >10 msg/sec per WebSocket connection total
      expect(udpRate).toBeGreaterThan(5); // >5 msg/sec for UDP

      // Verify bridge maintains performance
      const bridgeStatus = bridge.getStatus();
      expect(bridgeStatus.protocolServers.stats.messagesPerSecond).toBeGreaterThan(20);

      // Memory usage should be reasonable
      const memoryUsage = process.memoryUsage();
      expect(memoryUsage.heapUsed).toBeLessThan(200 * 1024 * 1024); // <200MB

      // Cleanup clients
      clients.tcp.forEach((client) => client.destroy());
      clients.websocket.forEach((client) => client.close());
    }, 25000);
  });

  describe('Mode Switching with Active Connections', () => {
    test('should maintain all protocol connections during mode switches', async () => {
      // Establish connections on all protocols
      tcpClient = new net.Socket();
      await new Promise((resolve, reject) => {
        tcpClient.connect(2000, 'localhost', resolve);
        tcpClient.on('error', reject);
      });

      wsClient = new WebSocket('ws://localhost:8080');
      await new Promise((resolve, reject) => {
        wsClient.on('open', resolve);
        wsClient.on('error', reject);
      });

      udpClient = dgram.createSocket('udp4');
      await new Promise((resolve) => udpClient.bind(resolve));

      // Collect messages from initial mode (scenario)
      const preTransitionMessages = { tcp: 0, ws: 0, udp: 0 };

      tcpClient.on('data', () => preTransitionMessages.tcp++);
      wsClient.on('message', () => preTransitionMessages.ws++);
      udpClient.on('message', () => preTransitionMessages.udp++);

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify initial message flow
      expect(preTransitionMessages.tcp).toBeGreaterThan(0);
      expect(preTransitionMessages.ws).toBeGreaterThan(0);
      expect(preTransitionMessages.udp).toBeGreaterThan(0);

      // Switch to file mode
      const testFilePath = require('path').join(__dirname, '../fixtures/mode-switch-test.nmea');
      require('fs').writeFileSync(
        testFilePath,
        '$GPRMC,123519,A,4807.038,N,01131.000,E,000.0,360.0,230394,003.1,W*6A\n' +
          '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47\n',
      );

      const fileConfig = {
        mode: 'file',
        filePath: testFilePath,
        rate: 50,
        loop: true,
      };

      await bridge.switchMode(fileConfig);

      // Collect messages from new mode (file)
      const postTransitionMessages = { tcp: 0, ws: 0, udp: 0 };
      const resetCounters = () => {
        postTransitionMessages.tcp = 0;
        postTransitionMessages.ws = 0;
        postTransitionMessages.udp = 0;
      };

      tcpClient.removeAllListeners('data');
      wsClient.removeAllListeners('message');
      udpClient.removeAllListeners('message');

      tcpClient.on('data', () => postTransitionMessages.tcp++);
      wsClient.on('message', () => postTransitionMessages.ws++);
      udpClient.on('message', () => postTransitionMessages.udp++);

      resetCounters();
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify message flow continues after mode switch
      expect(postTransitionMessages.tcp).toBeGreaterThan(0);
      expect(postTransitionMessages.ws).toBeGreaterThan(0);
      expect(postTransitionMessages.udp).toBeGreaterThan(0);

      // Verify connections remain stable
      expect(tcpClient.readyState).toBe('open');
      expect(wsClient.readyState).toBe(WebSocket.OPEN);

      // Cleanup
      require('fs').unlinkSync(testFilePath);
    }, 30000);
  });
});
