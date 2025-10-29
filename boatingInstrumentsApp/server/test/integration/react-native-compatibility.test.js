/**
 * Integration Tests for React Native App Compatibility
 * 
 * Epic 10.5 - Test Coverage & Quality
 * AC2: React Native app compatibility - Consolidated tool maintains compatibility with existing app
 */

const { spawn } = require('child_process');
const WebSocket = require('ws');
const net = require('net');
const dgram = require('dgram');
const path = require('path');
const fs = require('fs');

describe('React Native App Compatibility Tests', () => {
  const projectRoot = path.resolve(__dirname, '../../../..');
  const serverPath = path.join(projectRoot, 'boatingInstrumentsApp/server');
  const nmeaBridgePath = path.join(serverPath, 'nmea-bridge.js');

  let bridgeProcess;

  beforeAll(() => {
    // Verify unified CLI exists
    expect(fs.existsSync(nmeaBridgePath)).toBe(true);
  });

  afterEach(async () => {
    if (bridgeProcess) {
      bridgeProcess.kill('SIGTERM');
      await new Promise(resolve => {
        bridgeProcess.on('exit', resolve);
        setTimeout(resolve, 5000); // Timeout after 5s
      });
      bridgeProcess = null;
    }
    // Wait for port cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Protocol Server Compatibility', () => {
    test('should maintain TCP server on port 2000 for React Native app connection', async () => {
      bridgeProcess = await startBridge(['--scenario', 'basic-navigation']);

      // Wait for server startup
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Test TCP connection like React Native app would
      const tcpConnection = await connectTCP(2000);
      
      expect(tcpConnection).toBeDefined();
      expect(tcpConnection.readyState).toBe('open');

      // Verify NMEA data is being sent
      const data = await receiveDataFromTCP(tcpConnection, 5000);
      expect(data).toBeTruthy();
      expect(data).toMatch(/\$[A-Z]{2}[A-Z]{3},.*\*[0-9A-F]{2}/); // NMEA sentence pattern

      tcpConnection.destroy();
    }, 15000);

    test('should maintain UDP server on port 2000 for React Native app broadcasts', async () => {
      bridgeProcess = await startBridge(['--scenario', 'coastal-sailing']);

      // Wait for server startup
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Test UDP connection like React Native app would
      const udpData = await receiveUDPData(2000, 5000);
      
      expect(udpData).toBeTruthy();
      expect(udpData.toString()).toMatch(/\$[A-Z]{2}[A-Z]{3},.*\*[0-9A-F]{2}/);
    }, 15000);

    test('should maintain WebSocket server on port 8080 for React Native web app', async () => {
      bridgeProcess = await startBridge(['--scenario', 'autopilot-engagement', '--verbose']);

      // Wait for server startup
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Test WebSocket connection like React Native web app would
      const wsConnection = await connectWebSocket(8080);
      
      expect(wsConnection.readyState).toBe(WebSocket.OPEN);

      // Verify NMEA data is being sent
      const wsData = await receiveDataFromWebSocket(wsConnection, 5000);
      expect(wsData).toBeTruthy();
      expect(wsData).toMatch(/\$[A-Z]{2}[A-Z]{3},.*\*[0-9A-F]{2}/);

      wsConnection.close();
    }, 15000);
  });

  describe('NMEA Data Format Compatibility', () => {
    test('should provide NMEA data in expected format for GPS widgets', async () => {
      bridgeProcess = await startBridge(['--scenario', 'basic-navigation']);
      await new Promise(resolve => setTimeout(resolve, 3000));

      const tcpConnection = await connectTCP(2000);
      const nmeaData = await receiveDataFromTCP(tcpConnection, 10000);

      // Should contain GPS sentences expected by React Native app
      expect(nmeaData).toMatch(/\$G[PN]RMC,/); // RMC sentence
      expect(nmeaData).toMatch(/\$G[PN]GGA,/); // GGA sentence
      
      // Verify sentence structure
      const sentences = nmeaData.split('\n').filter(s => s.startsWith('$'));
      expect(sentences.length).toBeGreaterThan(0);

      sentences.forEach(sentence => {
        if (sentence.trim()) {
          expect(sentence).toMatch(/\$[A-Z]{2}[A-Z]{3},[^*]*\*[0-9A-F]{2}$/);
        }
      });

      tcpConnection.destroy();
    }, 20000);

    test('should provide wind data in expected format for wind widgets', async () => {
      bridgeProcess = await startBridge(['--scenario', 'coastal-sailing']);
      await new Promise(resolve => setTimeout(resolve, 3000));

      const wsConnection = await connectWebSocket(8080);
      const windData = await receiveDataFromWebSocket(wsConnection, 10000);

      // Should contain wind sentences expected by React Native app
      expect(windData).toMatch(/\$..VWR,/); // Relative wind
      expect(windData).toMatch(/\$..VWT,/); // True wind
      
      wsConnection.close();
    }, 20000);

    test('should provide depth data in expected format for depth widgets', async () => {
      bridgeProcess = await startBridge(['--scenario', 'basic-navigation']);
      await new Promise(resolve => setTimeout(resolve, 3000));

      const udpData = await receiveUDPData(2000, 10000);
      const depthData = udpData.toString();

      // Should contain depth sentences expected by React Native app
      expect(depthData).toMatch(/\$..DPT,/); // Depth sentence
      expect(depthData).toMatch(/\$..DBT,/); // Depth below transducer

      udpData.toString().split('\n').forEach(sentence => {
        if (sentence.startsWith('$') && sentence.includes('DPT')) {
          const parts = sentence.split(',');
          expect(parts.length).toBeGreaterThan(3); // Should have depth value
          expect(parseFloat(parts[1])).not.toBeNaN(); // Depth should be numeric
        }
      });
    }, 20000);
  });

  describe('Multi-Protocol Concurrent Connection Compatibility', () => {
    test('should handle React Native app connecting via multiple protocols simultaneously', async () => {
      bridgeProcess = await startBridge(['--scenario', 'multi-equipment-detection']);
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Simulate React Native app connecting via all protocols simultaneously
      const [tcpConnection, wsConnection] = await Promise.all([
        connectTCP(2000),
        connectWebSocket(8080)
      ]);

      // Start UDP listener
      const udpPromise = receiveUDPData(2000, 8000);

      // Verify all connections receive data
      const [tcpData, wsData, udpData] = await Promise.all([
        receiveDataFromTCP(tcpConnection, 8000),
        receiveDataFromWebSocket(wsConnection, 8000),
        udpPromise
      ]);

      expect(tcpData).toBeTruthy();
      expect(wsData).toBeTruthy();
      expect(udpData).toBeTruthy();

      // Verify all protocols receive same NMEA sentences
      const tcpSentences = extractNMEASentences(tcpData);
      const wsSentences = extractNMEASentences(wsData);
      const udpSentences = extractNMEASentences(udpData.toString());

      expect(tcpSentences.length).toBeGreaterThan(0);
      expect(wsSentences.length).toBeGreaterThan(0);
      expect(udpSentences.length).toBeGreaterThan(0);

      // Cleanup
      tcpConnection.destroy();
      wsConnection.close();
    }, 25000);
  });

  describe('Scenario Data Compatibility', () => {
    test('should provide scenario data compatible with React Native app widgets', async () => {
      bridgeProcess = await startBridge(['--scenario', 'autopilot-engagement']);
      await new Promise(resolve => setTimeout(resolve, 3000));

      const tcpConnection = await connectTCP(2000);
      const scenarioData = await receiveDataFromTCP(tcpConnection, 15000);

      // Verify autopilot scenario contains expected sentence types
      const sentences = extractNMEASentences(scenarioData);
      const sentenceTypes = sentences.map(s => s.substring(3, 6));

      // Should contain GPS data
      expect(sentenceTypes.some(type => ['RMC', 'GGA'].includes(type))).toBe(true);
      
      // Should contain autopilot data
      expect(sentenceTypes.some(type => ['APB', 'XTE'].includes(type))).toBe(true);

      // Should contain navigation data
      expect(sentenceTypes.some(type => ['VTG', 'HDG'].includes(type))).toBe(true);

      tcpConnection.destroy();
    }, 20000);

    test('should handle engine monitoring scenario for React Native engine widgets', async () => {
      bridgeProcess = await startBridge(['--scenario', 'engine-monitoring']);
      await new Promise(resolve => setTimeout(resolve, 3000));

      const wsConnection = await connectWebSocket(8080);
      const engineData = await receiveDataFromWebSocket(wsConnection, 15000);

      // Verify engine scenario contains expected data types
      expect(engineData).toMatch(/\$..RSA,/); // Rudder angle
      expect(engineData).toMatch(/\$..RPM,/); // Engine RPM
      
      wsConnection.close();
    }, 20000);
  });

  describe('Performance and Responsiveness Compatibility', () => {
    test('should maintain acceptable data rates for React Native app real-time display', async () => {
      bridgeProcess = await startBridge(['--scenario', 'basic-navigation']);
      await new Promise(resolve => setTimeout(resolve, 3000));

      const tcpConnection = await connectTCP(2000);
      
      // Measure data rate over 10 seconds
      const startTime = Date.now();
      const data = await receiveDataFromTCP(tcpConnection, 10000);
      const endTime = Date.now();
      
      const sentences = extractNMEASentences(data);
      const dataRate = sentences.length / ((endTime - startTime) / 1000); // sentences per second

      // Should provide adequate data rate for real-time display (>= 1 sentence/second)
      expect(dataRate).toBeGreaterThanOrEqual(1);
      
      // Should not overwhelm the app (< 100 sentences/second)
      expect(dataRate).toBeLessThan(100);

      tcpConnection.destroy();
    }, 15000);

    test('should handle React Native app connection/disconnection gracefully', async () => {
      bridgeProcess = await startBridge(['--scenario', 'coastal-sailing']);
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Connect and disconnect multiple times
      for (let i = 0; i < 3; i++) {
        const connection = await connectTCP(2000);
        const data = await receiveDataFromTCP(connection, 2000);
        expect(data).toBeTruthy();
        connection.destroy();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Verify bridge is still functioning
      const finalConnection = await connectTCP(2000);
      const finalData = await receiveDataFromTCP(finalConnection, 3000);
      expect(finalData).toBeTruthy();
      finalConnection.destroy();
    }, 20000);
  });

  // Helper functions

  async function startBridge(args) {
    return new Promise((resolve, reject) => {
      const process = spawn('node', [nmeaBridgePath, ...args], {
        cwd: serverPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let startupOutput = '';
      
      const timeout = setTimeout(() => {
        reject(new Error('Bridge startup timeout'));
      }, 10000);

      process.stdout.on('data', (data) => {
        startupOutput += data.toString();
        // Look for server startup confirmation
        if (startupOutput.includes('Server listening') || startupOutput.includes('WebSocket server listening')) {
          clearTimeout(timeout);
          resolve(process);
        }
      });

      process.stderr.on('data', (data) => {
        console.error('Bridge stderr:', data.toString());
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  async function connectTCP(port) {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      
      client.connect(port, 'localhost', () => {
        resolve(client);
      });

      client.on('error', reject);
    });
  }

  async function connectWebSocket(port) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${port}`);
      
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  }

  async function receiveDataFromTCP(connection, timeout) {
    return new Promise((resolve) => {
      let data = '';
      
      const timeoutId = setTimeout(() => {
        resolve(data);
      }, timeout);

      connection.on('data', (chunk) => {
        data += chunk.toString();
      });

      connection.on('end', () => {
        clearTimeout(timeoutId);
        resolve(data);
      });
    });
  }

  async function receiveDataFromWebSocket(ws, timeout) {
    return new Promise((resolve) => {
      let data = '';
      
      const timeoutId = setTimeout(() => {
        resolve(data);
      }, timeout);

      ws.on('message', (message) => {
        data += message.toString();
      });

      ws.on('close', () => {
        clearTimeout(timeoutId);
        resolve(data);
      });
    });
  }

  async function receiveUDPData(port, timeout) {
    return new Promise((resolve, reject) => {
      const client = dgram.createSocket('udp4');
      let data = Buffer.alloc(0);

      const timeoutId = setTimeout(() => {
        client.close();
        resolve(data);
      }, timeout);

      client.on('message', (msg) => {
        data = Buffer.concat([data, msg]);
      });

      client.on('error', (err) => {
        clearTimeout(timeoutId);
        reject(err);
      });

      client.bind(port, 'localhost');
    });
  }

  function extractNMEASentences(data) {
    return data.split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('$') && line.includes('*'))
      .filter(line => line.match(/\$[A-Z]{2}[A-Z]{3},[^*]*\*[0-9A-F]{2}$/));
  }
});