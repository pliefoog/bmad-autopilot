/**
 * Legacy Compatibility Validation Tests
 * 
 * Epic 10.5 - Test Coverage & Quality
 * AC4: Legacy compatibility validation - All Epic 7 scenarios preserved with identical functionality
 */

const { spawn } = require('child_process');
const WebSocket = require('ws');
const net = require('net');
const dgram = require('dgram');
const path = require('path');
const fs = require('fs');

describe('Legacy Compatibility Validation Tests', () => {
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
        setTimeout(resolve, 5000);
      });
      bridgeProcess = null;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Epic 7 Scenario Compatibility', () => {
    test('should preserve "basic-navigation" scenario functionality identical to Epic 7', async () => {
      bridgeProcess = await startBridge(['--scenario', 'basic-navigation']);
      const scenarioData = await captureScenarioData(10000);
      
      const expectedSentenceTypes = ['RMC', 'GGA', 'VTG', 'DPT', 'HDG'];
      const foundSentenceTypes = extractSentenceTypes(scenarioData);
      
      // Verify all expected sentence types are present
      expectedSentenceTypes.forEach(type => {
        expect(foundSentenceTypes).toContain(type);
      });

      // Verify GPS data format (Epic 7 standard)
      const rmcSentences = extractSentencesByType(scenarioData, 'RMC');
      expect(rmcSentences.length).toBeGreaterThan(0);
      rmcSentences.forEach(sentence => {
        expect(sentence).toMatch(/\$G[PN]RMC,\d{6}(\.\d+)?,A,\d{4}\.\d+,[NS],\d{5}\.\d+,[EW]/);
      });

      // Verify depth data format (Epic 7 standard)
      const dptSentences = extractSentencesByType(scenarioData, 'DPT');
      expect(dptSentences.length).toBeGreaterThan(0);
      dptSentences.forEach(sentence => {
        const parts = sentence.split(',');
        expect(parseFloat(parts[1])).not.toBeNaN(); // Depth value should be numeric
      });
    }, 20000);

    test('should preserve "coastal-sailing" scenario functionality identical to Epic 7', async () => {
      bridgeProcess = await startBridge(['--scenario', 'coastal-sailing', '--loop']);
      const scenarioData = await captureScenarioData(15000);
      
      const expectedSentenceTypes = ['RMC', 'GGA', 'VWR', 'VWT', 'DPT', 'HDG', 'VTG'];
      const foundSentenceTypes = extractSentenceTypes(scenarioData);
      
      expectedSentenceTypes.forEach(type => {
        expect(foundSentenceTypes).toContain(type);
      });

      // Verify wind data format (Epic 7 standard)
      const vwrSentences = extractSentencesByType(scenarioData, 'VWR');
      expect(vwrSentences.length).toBeGreaterThan(0);
      vwrSentences.forEach(sentence => {
        expect(sentence).toMatch(/\$..VWR,\d{3}(\.\d+)?,[LR],\d+\.\d+,N,\d+\.\d+,M,\d+\.\d+,K/);
      });

      // Verify loop functionality
      const dataRatesOverTime = await measureDataRateConsistency(5000);
      expect(dataRatesOverTime.standardDeviation).toBeLessThan(10); // Consistent looping
    }, 25000);

    test('should preserve "autopilot-engagement" scenario functionality identical to Epic 7', async () => {
      bridgeProcess = await startBridge(['--scenario', 'autopilot-engagement']);
      const scenarioData = await captureScenarioData(15000);
      
      const expectedSentenceTypes = ['RMC', 'GGA', 'APB', 'XTE', 'HDG', 'VTG', 'RSA'];
      const foundSentenceTypes = extractSentenceTypes(scenarioData);
      
      expectedSentenceTypes.forEach(type => {
        expect(foundSentenceTypes).toContain(type);
      });

      // Verify autopilot data format (Epic 7 standard)
      const apbSentences = extractSentencesByType(scenarioData, 'APB');
      expect(apbSentences.length).toBeGreaterThan(0);
      apbSentences.forEach(sentence => {
        expect(sentence).toMatch(/\$..APB,[AV],[AV],\d+\.\d+,[LR],[MN],/);
      });

      // Verify cross-track error data
      const xteSentences = extractSentencesByType(scenarioData, 'XTE');
      expect(xteSentences.length).toBeGreaterThan(0);
      xteSentences.forEach(sentence => {
        const parts = sentence.split(',');
        expect(parseFloat(parts[3])).not.toBeNaN(); // XTE value should be numeric
      });
    }, 20000);

    test('should preserve "engine-monitoring" scenario functionality identical to Epic 7', async () => {
      bridgeProcess = await startBridge(['--scenario', 'engine-monitoring']);
      const scenarioData = await captureScenarioData(15000);
      
      const expectedSentenceTypes = ['RMC', 'RPM', 'RSA', 'XDR'];
      const foundSentenceTypes = extractSentenceTypes(scenarioData);
      
      expectedSentenceTypes.forEach(type => {
        expect(foundSentenceTypes).toContain(type);
      });

      // Verify engine RPM data format (Epic 7 standard)
      const rpmSentences = extractSentencesByType(scenarioData, 'RPM');
      expect(rpmSentences.length).toBeGreaterThan(0);
      rpmSentences.forEach(sentence => {
        expect(sentence).toMatch(/\$..RPM,[SE],\d+(\.\d+)?,\d+(\.\d+)?,A/);
      });

      // Verify XDR sensor data format
      const xdrSentences = extractSentencesByType(scenarioData, 'XDR');
      expect(xdrSentences.length).toBeGreaterThan(0);
      xdrSentences.forEach(sentence => {
        expect(sentence).toMatch(/\$..XDR,[APICUVT],[^,]*,\d+(\.\d+)?,[^,]*/);
      });
    }, 20000);

    test('should preserve "multi-equipment-detection" scenario functionality identical to Epic 7', async () => {
      bridgeProcess = await startBridge(['--scenario', 'multi-equipment-detection']);
      const scenarioData = await captureScenarioData(20000);
      
      // Verify multiple equipment instances
      const allSentences = extractAllSentences(scenarioData);
      const talkerIds = new Set();
      
      allSentences.forEach(sentence => {
        if (sentence.startsWith('$')) {
          const talkerId = sentence.substring(1, 3);
          talkerIds.add(talkerId);
        }
      });

      // Should have multiple equipment sources
      expect(talkerIds.size).toBeGreaterThan(3);
      
      // Verify expected equipment types present
      const expectedTalkers = ['GP', 'GL', 'II', 'VW'];
      expectedTalkers.forEach(talker => {
        expect(Array.from(talkerIds).some(id => id.startsWith(talker.charAt(0)))).toBe(true);
      });

      // Verify temperature multi-instance data
      const temperatureData = allSentences.filter(s => s.includes('XDR') && s.includes('C'));
      expect(temperatureData.length).toBeGreaterThan(5); // Multiple temperature sensors
    }, 25000);
  });

  describe('Epic 7 File Mode Compatibility', () => {
    test('should preserve file mode functionality with NMEA recordings', async () => {
      // Create test NMEA file matching Epic 7 format
      const testFilePath = path.join(serverPath, 'test-epic7-recording.nmea');
      const epic7TestData = [
        '$GPRMC,123519,A,4807.038,N,01131.000,E,000.0,360.0,230394,003.1,W*6A',
        '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47',
        '$VWVWR,084,L,02.6,N,01.3,M,04.7,K*54',
        '$IIDPT,5.4,0.0,*4A',
        '$HCHDG,98.3,0.0,E,12.6,W*57'
      ].join('\n');

      fs.writeFileSync(testFilePath, epic7TestData);

      try {
        bridgeProcess = await startBridge(['--file', testFilePath, '--rate', '10']);
        const fileData = await captureScenarioData(8000);
        
        // Verify file data exactly matches input
        const inputSentences = epic7TestData.split('\n');
        const outputSentences = extractAllSentences(fileData);
        
        inputSentences.forEach(inputSentence => {
          expect(outputSentences.some(outputSentence => 
            outputSentence.trim() === inputSentence.trim()
          )).toBe(true);
        });

        // Verify rate control functionality
        const dataRates = await measureDataRateConsistency(5000);
        expect(dataRates.averageRate).toBeCloseTo(10, 2); // Should match specified rate
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    }, 15000);

    test('should preserve file loop functionality identical to Epic 7', async () => {
      const testFilePath = path.join(serverPath, 'test-loop-file.nmea');
      const loopTestData = [
        '$GPRMC,123519,A,4807.038,N,01131.000,E,000.0,360.0,230394,003.1,W*6A',
        '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47'
      ].join('\n');

      fs.writeFileSync(testFilePath, loopTestData);

      try {
        bridgeProcess = await startBridge(['--file', testFilePath, '--loop']);
        
        // Capture data for longer than file duration to verify looping
        const extendedData = await captureScenarioData(10000);
        const sentences = extractAllSentences(extendedData);
        
        // Should receive the same sentences multiple times due to looping
        const rmcCount = sentences.filter(s => s.includes('RMC')).length;
        const ggaCount = sentences.filter(s => s.includes('GGA')).length;
        
        expect(rmcCount).toBeGreaterThan(10); // Should loop multiple times
        expect(ggaCount).toBeGreaterThan(10);
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    }, 15000);
  });

  describe('Epic 7 Live Mode Compatibility', () => {
    test('should preserve live mode argument parsing and connection attempts', async () => {
      // Test with invalid host to verify argument parsing without connection
      const args = ['--live', '192.168.1.999', '10110'];
      
      bridgeProcess = spawn('node', [nmeaBridgePath, ...args], {
        cwd: serverPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      bridgeProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      bridgeProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Wait for connection attempt
      await new Promise(resolve => setTimeout(resolve, 8000));

      // Should attempt connection and show appropriate error
      expect(stdout).toMatch(/live.*mode/i);
      expect(stdout).toMatch(/connecting.*192\.168\.1\.999.*10110/i);
      expect(stderr).toMatch(/connection|timeout|error/i);
    }, 15000);

    test('should preserve live mode parameter validation identical to Epic 7', async () => {
      // Test missing host parameter
      const missingHostArgs = ['--live'];
      const result = await executeCommand(nmeaBridgePath, missingHostArgs);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toMatch(/host.*port.*required/i);

      // Test invalid port parameter
      const invalidPortArgs = ['--live', '192.168.1.10', 'invalid-port'];
      const invalidResult = await executeCommand(nmeaBridgePath, invalidPortArgs);
      
      expect(invalidResult.exitCode).toBe(1);
      expect(invalidResult.stderr).toMatch(/invalid.*port/i);
    }, 10000);
  });

  describe('Epic 7 Protocol Server Compatibility', () => {
    test('should preserve TCP server behavior identical to Epic 7', async () => {
      bridgeProcess = await startBridge(['--scenario', 'basic-navigation']);
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Test multiple concurrent TCP connections like Epic 7
      const connections = [];
      const connectionPromises = [];

      for (let i = 0; i < 5; i++) {
        connectionPromises.push(connectTCP(2000));
      }

      const connectedSockets = await Promise.all(connectionPromises);
      connections.push(...connectedSockets);

      // Verify all connections receive data
      const dataPromises = connections.map(conn => receiveDataFromTCP(conn, 5000));
      const dataResults = await Promise.all(dataPromises);

      dataResults.forEach(data => {
        expect(data).toBeTruthy();
        expect(data).toMatch(/\$[A-Z]{2}[A-Z]{3},.*\*[0-9A-F]{2}/);
      });

      // Cleanup
      connections.forEach(conn => conn.destroy());
    }, 20000);

    test('should preserve UDP broadcast behavior identical to Epic 7', async () => {
      bridgeProcess = await startBridge(['--scenario', 'coastal-sailing']);
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Test UDP broadcast reception
      const udpData = await receiveUDPBroadcast(2000, 8000);
      
      expect(udpData).toBeTruthy();
      expect(udpData.toString()).toMatch(/\$[A-Z]{2}[A-Z]{3},.*\*[0-9A-F]{2}/);
      
      // Verify broadcast nature - should be received without explicit connection
      const sentences = extractAllSentences(udpData.toString());
      expect(sentences.length).toBeGreaterThan(5);
    }, 15000);

    test('should preserve WebSocket server behavior identical to Epic 7', async () => {
      bridgeProcess = await startBridge(['--scenario', 'autopilot-engagement']);
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Test WebSocket connection and message handling
      const ws = await connectWebSocket(8080);
      expect(ws.readyState).toBe(WebSocket.OPEN);

      const wsData = await receiveDataFromWebSocket(ws, 8000);
      expect(wsData).toBeTruthy();
      expect(wsData).toMatch(/\$[A-Z]{2}[A-Z]{3},.*\*[0-9A-F]{2}/);

      // Verify WebSocket message framing
      const messages = wsData.split('\n').filter(line => line.trim().length > 0);
      expect(messages.length).toBeGreaterThan(3);

      ws.close();
    }, 15000);
  });

  describe('Epic 7 Data Format Compatibility', () => {
    test('should preserve NMEA sentence checksums identical to Epic 7', async () => {
      bridgeProcess = await startBridge(['--scenario', 'basic-navigation']);
      const data = await captureScenarioData(10000);
      
      const sentences = extractAllSentences(data);
      
      sentences.forEach(sentence => {
        if (sentence.includes('*')) {
          const parts = sentence.split('*');
          const payload = parts[0].substring(1); // Remove $ prefix
          const providedChecksum = parts[1].substring(0, 2);
          
          // Calculate expected checksum
          let checksum = 0;
          for (let i = 0; i < payload.length; i++) {
            checksum ^= payload.charCodeAt(i);
          }
          const expectedChecksum = checksum.toString(16).toUpperCase().padStart(2, '0');
          
          expect(providedChecksum).toBe(expectedChecksum);
        }
      });
    }, 15000);

    test('should preserve timestamp formats identical to Epic 7', async () => {
      bridgeProcess = await startBridge(['--scenario', 'coastal-sailing']);
      const data = await captureScenarioData(10000);
      
      const rmcSentences = extractSentencesByType(data, 'RMC');
      
      rmcSentences.forEach(sentence => {
        const parts = sentence.split(',');
        const timeField = parts[1];
        const dateField = parts[9];
        
        // Verify time format (HHMMSS or HHMMSS.sss)
        expect(timeField).toMatch(/^\d{6}(\.\d+)?$/);
        
        // Verify date format (DDMMYY)
        expect(dateField).toMatch(/^\d{6}$/);
      });
    }, 15000);
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
      }, 15000);

      process.stdout.on('data', (data) => {
        startupOutput += data.toString();
        if (startupOutput.includes('Server listening') || startupOutput.includes('WebSocket server listening')) {
          clearTimeout(timeout);
          resolve(process);
        }
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  async function captureScenarioData(duration) {
    const connection = await connectTCP(2000);
    let data = '';

    return new Promise((resolve) => {
      connection.on('data', (chunk) => {
        data += chunk.toString();
      });

      setTimeout(() => {
        connection.destroy();
        resolve(data);
      }, duration);
    });
  }

  async function connectTCP(port) {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      client.connect(port, 'localhost', () => resolve(client));
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
      const timeoutId = setTimeout(() => resolve(data), timeout);
      connection.on('data', (chunk) => { data += chunk.toString(); });
      connection.on('end', () => { clearTimeout(timeoutId); resolve(data); });
    });
  }

  async function receiveDataFromWebSocket(ws, timeout) {
    return new Promise((resolve) => {
      let data = '';
      const timeoutId = setTimeout(() => resolve(data), timeout);
      ws.on('message', (message) => { data += message.toString(); });
      ws.on('close', () => { clearTimeout(timeoutId); resolve(data); });
    });
  }

  async function receiveUDPBroadcast(port, timeout) {
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

      client.on('error', reject);
      client.bind(port, 'localhost');
    });
  }

  async function executeCommand(scriptPath, args) {
    return new Promise((resolve) => {
      const child = spawn('node', [scriptPath, ...args], {
        cwd: serverPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.stderr.on('data', (data) => { stderr += data.toString(); });

      child.on('exit', (code) => {
        resolve({ exitCode: code, stdout, stderr });
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        child.kill('SIGTERM');
      }, 10000);
    });
  }

  async function measureDataRateConsistency(duration) {
    const connection = await connectTCP(2000);
    const rates = [];
    const sampleInterval = 1000; // 1 second samples

    return new Promise((resolve) => {
      let currentCount = 0;

      connection.on('data', (data) => {
        const sentences = data.toString().split('\n').filter(line => line.startsWith('$'));
        currentCount += sentences.length;
      });

      const rateInterval = setInterval(() => {
        rates.push(currentCount);
        currentCount = 0;
      }, sampleInterval);

      setTimeout(() => {
        clearInterval(rateInterval);
        connection.destroy();

        const averageRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
        const variance = rates.reduce((sum, rate) => sum + Math.pow(rate - averageRate, 2), 0) / rates.length;
        const standardDeviation = Math.sqrt(variance);

        resolve({ averageRate, standardDeviation, rates });
      }, duration);
    });
  }

  function extractSentenceTypes(data) {
    const sentences = data.split('\n').filter(line => line.startsWith('$'));
    const types = new Set();
    sentences.forEach(sentence => {
      const type = sentence.substring(3, 6);
      types.add(type);
    });
    return Array.from(types);
  }

  function extractSentencesByType(data, type) {
    return data.split('\n').filter(line => line.startsWith('$') && line.includes(type));
  }

  function extractAllSentences(data) {
    return data.split('\n').filter(line => line.startsWith('$') && line.includes('*'));
  }
});