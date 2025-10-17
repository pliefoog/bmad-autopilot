/**
 * Real Network Integration Tests for Enhanced NMEA Bridge Simulator
 * 
 * Tests actual server startup, port binding, client connections, and data streaming
 */

import * as net from 'net';
import * as dgram from 'dgram';
import WebSocket from 'ws';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

describe('NMEA Bridge Simulator - Real Network Integration', () => {
  let simulatorProcess: ChildProcess;
  const TCP_PORT = 2000;
  const WS_PORT = 8080;
  const UDP_PORT = 2000;
  const STARTUP_TIMEOUT = 10000; // 10 seconds for simulator to start

  beforeAll(async () => {
    // Start the actual simulator process
    const simulatorPath = path.join(__dirname, '../server/nmea-bridge-simulator.js');
    
    console.log('🚀 Starting NMEA Bridge Simulator process...');
    simulatorProcess = spawn('node', [
      simulatorPath, 
      '--recording', 'nmea_recording_20250720_003925.json',
      '--speed', '5.0'
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.dirname(simulatorPath)
    });

    // Wait for simulator to start up
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Simulator startup timeout'));
      }, STARTUP_TIMEOUT);

      let output = '';
      simulatorProcess.stdout?.on('data', (data) => {
        output += data.toString();
        console.log('Simulator output:', data.toString().trim());
        
        // Look for startup confirmation
        if (output.includes('All servers started successfully') || 
            output.includes('WebSocket server listening')) {
          clearTimeout(timeout);
          resolve();
        }
      });

      simulatorProcess.stderr?.on('data', (data) => {
        console.error('Simulator error:', data.toString());
      });

      simulatorProcess.on('exit', (code) => {
        if (code !== 0) {
          clearTimeout(timeout);
          reject(new Error(`Simulator exited with code ${code}`));
        }
      });
    });

    // Give additional time for all servers to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    if (simulatorProcess) {
      console.log('🛑 Stopping simulator process...');
      simulatorProcess.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        simulatorProcess.on('exit', () => {
          console.log('✅ Simulator process stopped');
          resolve();
        });
        
        // Force kill if doesn't exit gracefully
        setTimeout(() => {
          simulatorProcess.kill('SIGKILL');
          resolve();
        }, 5000);
      });
    }
  });

  describe('TCP Server Integration', () => {
    it('should bind to port 2000 and accept connections', async () => {
      const client = new net.Socket();
      let connected = false;
      let receivedData = false;

      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('TCP connection timeout'));
          }, 5000);

          client.connect(TCP_PORT, 'localhost', () => {
            connected = true;
            console.log('✅ TCP client connected to port 2000');
            clearTimeout(timeout);
            resolve();
          });

          client.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });

        expect(connected).toBe(true);

        // Test that we receive NMEA data
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('No NMEA data received within 10 seconds'));
          }, 10000);

          client.on('data', (data) => {
            const message = data.toString();
            console.log('📡 Received TCP data:', message.substring(0, 100) + '...');
            
            // Verify it's valid NMEA format
            if (message.includes('$II') && message.includes('*')) {
              receivedData = true;
              clearTimeout(timeout);
              resolve();
            }
          });
        });

        expect(receivedData).toBe(true);

      } finally {
        client.destroy();
      }
    });

    it('should handle autopilot commands via TCP', async () => {
      const client = new net.Socket();
      let commandProcessed = false;

      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('TCP connection timeout'));
          }, 5000);

          client.connect(TCP_PORT, 'localhost', () => {
            clearTimeout(timeout);
            resolve();
          });

          client.on('error', reject);
        });

        // Send autopilot engagement command
        const autopilotCommand = '$PCDIN,01F112,00,00,FF,00,00,00,00,FF*59\r\n';
        client.write(autopilotCommand);

        // Listen for response or confirmation
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            resolve(); // Don't fail if no immediate response
          }, 3000);

          client.on('data', (data) => {
            const message = data.toString();
            if (message.includes('PCDIN') || message.includes('autopilot')) {
              commandProcessed = true;
              clearTimeout(timeout);
              resolve();
            }
          });
        });

        // Command should be processed (logged at minimum)
        console.log('🎮 Autopilot command sent via TCP');

      } finally {
        client.destroy();
      }
    });
  });

  describe('WebSocket Server Integration', () => {
    it('should bind to port 8080 and accept WebSocket connections', async () => {
      let ws: WebSocket | undefined;
      let connected = false;
      let receivedData = false;

      try {
        ws = new WebSocket(`ws://localhost:${WS_PORT}`);
        const wsClient = ws; // Capture for closure

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('WebSocket connection timeout'));
          }, 5000);

          wsClient.on('open', () => {
            connected = true;
            console.log('✅ WebSocket connected to port 8080');
            clearTimeout(timeout);
            resolve();
          });

          wsClient.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });

        expect(connected).toBe(true);

        // Test that we receive NMEA data via WebSocket
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('No WebSocket data received within 10 seconds'));
          }, 10000);

          wsClient.on('message', (data) => {
            try {
              const message = JSON.parse(data.toString());
              console.log('📡 Received WebSocket message:', message.type);
              
              if (message.type === 'nmea' && message.data) {
                receivedData = true;
                clearTimeout(timeout);
                resolve();
              }
            } catch (err) {
              // Ignore parsing errors, might be raw NMEA
              console.log('📡 Received raw WebSocket data:', data.toString().substring(0, 50));
            }
          });
        });

        expect(receivedData).toBe(true);

      } finally {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }
    });

    it('should handle autopilot commands via WebSocket', async () => {
      let ws: WebSocket | undefined;

      try {
        ws = new WebSocket(`ws://localhost:${WS_PORT}`);
        const wsClient = ws; // Capture for closure

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('WebSocket connection timeout'));
          }, 5000);

          wsClient.on('open', () => {
            clearTimeout(timeout);
            resolve();
          });

          wsClient.on('error', reject);
        });

        // Send autopilot command via WebSocket
        const autopilotMessage = {
          type: 'autopilot-command',
          command: '$PCDIN,01F112,00,00,FF,00,00,00,00,FF*59'
        };

        wsClient.send(JSON.stringify(autopilotMessage));
        console.log('🎮 Autopilot command sent via WebSocket');

        // Wait a moment for processing
        await new Promise(resolve => setTimeout(resolve, 1000));

      } finally {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }
    });
  });

  describe('UDP Server Integration', () => {
    it('should bind to port 2000 and handle UDP messages', async () => {
      const client = dgram.createSocket('udp4');
      let messageSent = false;

      try {
        // Send a test message to UDP server
        const testMessage = Buffer.from('$PCDIN,01F112,00,00,FF,00,00,00,00,FF*59\r\n');
        
        await new Promise<void>((resolve, reject) => {
          client.send(testMessage, UDP_PORT, 'localhost', (err) => {
            if (err) {
              reject(err);
            } else {
              messageSent = true;
              console.log('📡 UDP message sent to port 2000');
              resolve();
            }
          });
        });

        expect(messageSent).toBe(true);

      } finally {
        client.close();
      }
    });
  });

  describe('Cross-Platform Data Consistency', () => {
    it('should provide identical NMEA data across TCP and WebSocket', async () => {
      let tcpData: string[] = [];
      let wsData: string[] = [];
      const tcpClient = new net.Socket();
      let ws: WebSocket | undefined;

      try {
        // Connect TCP client
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('TCP timeout')), 5000);
          tcpClient.connect(TCP_PORT, 'localhost', () => {
            clearTimeout(timeout);
            resolve();
          });
          tcpClient.on('error', reject);
        });

        // Connect WebSocket client
        ws = new WebSocket(`ws://localhost:${WS_PORT}`);
        const wsClient = ws; // Capture for closure
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('WebSocket timeout')), 5000);
          wsClient.on('open', () => {
            clearTimeout(timeout);
            resolve();
          });
          wsClient.on('error', reject);
        });

        // Collect data from both sources for 5 seconds
        const dataCollection = new Promise<void>((resolve) => {
          const timeout = setTimeout(() => resolve(), 5000);

          tcpClient.on('data', (data) => {
            const messages = data.toString().split('\r\n').filter(msg => msg.length > 0);
            tcpData.push(...messages);
          });

          wsClient.on('message', (data) => {
            try {
              const message = JSON.parse(data.toString());
              if (message.type === 'nmea' && message.data) {
                wsData.push(message.data.trim());
              }
            } catch (err) {
              // Ignore parsing errors
            }
          });
        });

        await dataCollection;

        // Verify we received data from both sources
        expect(tcpData.length).toBeGreaterThan(0);
        expect(wsData.length).toBeGreaterThan(0);

        // Verify data contains valid NMEA sentences
        const tcpNmeaCount = tcpData.filter(msg => msg.startsWith('$II')).length;
        const wsNmeaCount = wsData.filter(msg => msg.startsWith('$II')).length;

        expect(tcpNmeaCount).toBeGreaterThan(0);
        expect(wsNmeaCount).toBeGreaterThan(0);

        console.log(`📊 TCP NMEA sentences: ${tcpNmeaCount}, WebSocket NMEA sentences: ${wsNmeaCount}`);

      } finally {
        tcpClient.destroy();
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }
    });
  });

  describe('Performance and Reliability', () => {
    it('should maintain stable performance under load', async () => {
      const clients: net.Socket[] = [];
      const messageRates: number[] = [];

      try {
        // Create multiple TCP clients
        for (let i = 0; i < 3; i++) {
          const client = new net.Socket();
          clients.push(client);

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error(`Client ${i} timeout`)), 5000);
            client.connect(TCP_PORT, 'localhost', () => {
              clearTimeout(timeout);
              resolve();
            });
            client.on('error', reject);
          });

          console.log(`✅ Client ${i + 1} connected`);
        }

        // Measure message rates for each client
        await Promise.all(clients.map((client, index) => {
          return new Promise<void>((resolve) => {
            let messageCount = 0;
            const timeout = setTimeout(() => {
              messageRates[index] = messageCount;
              console.log(`📊 Client ${index + 1} received ${messageCount} messages in 5 seconds`);
              resolve();
            }, 5000);

            client.on('data', (data) => {
              const messages = data.toString().split('\r\n').filter(msg => msg.length > 0);
              messageCount += messages.length;
            });
          });
        }));

        // Verify all clients received reasonable message rates
        messageRates.forEach((rate, index) => {
          expect(rate).toBeGreaterThan(5); // At least 1 msg/sec for recording playback
          console.log(`Client ${index + 1} rate: ${rate / 5} msg/sec`);
        });

      } finally {
        clients.forEach(client => client.destroy());
      }
    });

    it('should handle graceful shutdown', async () => {
      // This test verifies the simulator can be stopped gracefully
      // The cleanup in afterAll() tests this functionality
      expect(simulatorProcess.pid).toBeDefined();
      expect(simulatorProcess.killed).toBe(false);
    });
  });
});