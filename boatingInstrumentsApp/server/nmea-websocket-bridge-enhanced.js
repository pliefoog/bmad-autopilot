#!/usr/bin/env node

/**
 * Enhanced NMEA WebSocket Bridge Server
 *
 * Supports two modes:
 * 1. Live WiFi Bridge Mode: Connects to real NMEA WiFi bridge via TCP
 * 2. File Playback Mode: Streams NMEA data from recorded file
 *
 * Usage:
 *   Live Mode:
 *     node nmea-websocket-bridge-enhanced.js --live <host> <port>
 *     node nmea-websocket-bridge-enhanced.js --live 192.168.1.10 10110
 *
 *   File Playback Mode:
 *     node nmea-websocket-bridge-enhanced.js --file <path> [rate] [loop]
 *     node nmea-websocket-bridge-enhanced.js --file ../vendor/sample-data/sailing_session.nmea 10 true
 *
 *   Arguments:
 *     <path>  - Path to NMEA file
 *     [rate]  - Messages per second (default: 10)
 *     [loop]  - Loop playback (true/false, default: true)
 */

const WebSocket = require('ws');
const net = require('net');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const mode = args[0]; // --live or --file

// Configuration
const WS_PORT = 8080;
let WIFI_BRIDGE_HOST = null;
let WIFI_BRIDGE_PORT = null;
let NMEA_FILE_PATH = null;
let PLAYBACK_RATE = 10; // messages per second
let LOOP_PLAYBACK = true;

// Parse arguments based on mode
if (mode === '--live') {
  WIFI_BRIDGE_HOST = args[1] || '192.168.1.10';
  WIFI_BRIDGE_PORT = parseInt(args[2] || '10110');
} else if (mode === '--file') {
  NMEA_FILE_PATH = args[1];
  PLAYBACK_RATE = parseInt(args[2] || '10');
  LOOP_PLAYBACK = args[3] === 'false' ? false : true;

  if (!NMEA_FILE_PATH) {
    console.error('❌ Error: File path required for --file mode');
    console.log('\nUsage:');
    console.log('  node nmea-websocket-bridge-enhanced.js --file <path> [rate] [loop]');
    console.log('\nExample:');
    console.log(
      '  node nmea-websocket-bridge-enhanced.js --file ../vendor/sample-data/test.nmea 10 true',
    );
    process.exit(1);
  }

  // Resolve file path
  NMEA_FILE_PATH = path.resolve(NMEA_FILE_PATH);

  // Check if file exists
  if (!fs.existsSync(NMEA_FILE_PATH)) {
    console.error(`❌ Error: File not found: ${NMEA_FILE_PATH}`);
    process.exit(1);
  }
} else {
  console.error('❌ Error: Invalid mode. Use --live or --file');
  console.log('\nUsage:');
  console.log('  Live Mode:  node nmea-websocket-bridge-enhanced.js --live <host> <port>');
  console.log('  File Mode:  node nmea-websocket-bridge-enhanced.js --file <path> [rate] [loop]');
  process.exit(1);
}

// Display startup info
console.log('🌐 Enhanced NMEA WebSocket Bridge Server');
console.log('=========================================');
console.log(`Mode: ${mode === '--live' ? 'Live WiFi Bridge' : 'File Playback'}`);
console.log(`WebSocket Server: ws://localhost:${WS_PORT}`);

if (mode === '--live') {
  console.log(`WiFi Bridge: ${WIFI_BRIDGE_HOST}:${WIFI_BRIDGE_PORT}`);
} else {
  console.log(`NMEA File: ${NMEA_FILE_PATH}`);
  console.log(`Playback Rate: ${PLAYBACK_RATE} messages/second`);
  console.log(`Loop: ${LOOP_PLAYBACK ? 'Yes' : 'No'}`);
}
console.log('');

// Create WebSocket server
const wss = new WebSocket.Server({ port: WS_PORT });

// File playback state
let filePlaybackTimer = null;
let nmeaLines = [];
let currentLineIndex = 0;

// Load NMEA file if in file mode
if (mode === '--file') {
  try {
    const fileContent = fs.readFileSync(NMEA_FILE_PATH, 'utf8');
    nmeaLines = fileContent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line.startsWith('$'));

    console.log(`✅ Loaded ${nmeaLines.length} NMEA sentences from file`);
    console.log(`📊 Sample: ${nmeaLines[0]}`);
    console.log('');
  } catch (err) {
    console.error(`❌ Error reading file: ${err.message}`);
    process.exit(1);
  }
}

wss.on('listening', () => {
  console.log(`✅ WebSocket server listening on port ${WS_PORT}`);
  console.log('💡 Connect your web browser to: ws://localhost:8080');
  console.log('');
});

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`📱 Web client connected: ${clientIp}`);

  let tcpSocket = null;
  let isConnecting = false;

  // Function to broadcast NMEA data to client
  const sendNmeaData = (nmeaData) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'nmea',
          data: nmeaData,
          timestamp: Date.now(),
        }),
      );
    }
  };

  // File playback function
  const startFilePlayback = () => {
    if (mode !== '--file') return;

    console.log('▶️  Starting file playback...');

    // Notify client
    ws.send(
      JSON.stringify({
        type: 'connection',
        status: 'connected',
        mode: 'file-playback',
        file: path.basename(NMEA_FILE_PATH),
        totalLines: nmeaLines.length,
        rate: PLAYBACK_RATE,
      }),
    );

    // Stream NMEA data at specified rate
    const intervalMs = 1000 / PLAYBACK_RATE;
    let messageCount = 0;

    filePlaybackTimer = setInterval(() => {
      if (currentLineIndex >= nmeaLines.length) {
        if (LOOP_PLAYBACK) {
          console.log('🔄 Looping playback...');
          currentLineIndex = 0;
        } else {
          console.log('⏹️  Playback complete');
          clearInterval(filePlaybackTimer);
          ws.send(
            JSON.stringify({
              type: 'playback',
              status: 'complete',
            }),
          );
          return;
        }
      }

      const line = nmeaLines[currentLineIndex];
      messageCount++;

      // Log every 10th message to avoid spam
      if (messageCount % 10 === 0) {
        console.log(
          `📡 File → Browser [${currentLineIndex + 1}/${nmeaLines.length}]: ${line.substring(
            0,
            40,
          )}...`,
        );
      }

      sendNmeaData(line + '\r\n');
      currentLineIndex++;
    }, intervalMs);
  };

  // Function to connect to WiFi bridge (live mode)
  const connectToWifiBridge = () => {
    if (mode !== '--live') return;
    if (isConnecting || (tcpSocket && !tcpSocket.destroyed)) return;

    isConnecting = true;
    console.log(`🔌 Connecting to WiFi bridge: ${WIFI_BRIDGE_HOST}:${WIFI_BRIDGE_PORT}`);

    tcpSocket = net.createConnection({
      host: WIFI_BRIDGE_HOST,
      port: WIFI_BRIDGE_PORT,
    });

    tcpSocket.on('connect', () => {
      isConnecting = false;
      console.log('✅ Connected to WiFi bridge');

      ws.send(
        JSON.stringify({
          type: 'connection',
          status: 'connected',
          mode: 'live',
          host: WIFI_BRIDGE_HOST,
          port: WIFI_BRIDGE_PORT,
        }),
      );
    });

    tcpSocket.on('data', (data) => {
      const nmeaData = data.toString();
      console.log(`📡 WiFi Bridge → Browser: ${nmeaData.trim().substring(0, 50)}...`);
      sendNmeaData(nmeaData);
    });

    tcpSocket.on('error', (err) => {
      isConnecting = false;
      console.error(`❌ WiFi bridge error: ${err.message}`);

      ws.send(
        JSON.stringify({
          type: 'error',
          message: err.message,
        }),
      );
    });

    tcpSocket.on('close', () => {
      isConnecting = false;
      console.log('🔌 WiFi bridge connection closed');

      ws.send(
        JSON.stringify({
          type: 'connection',
          status: 'disconnected',
        }),
      );

      // Auto-reconnect after 5 seconds
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          console.log('🔄 Attempting to reconnect...');
          connectToWifiBridge();
        }
      }, 5000);
    });
  };

  // Handle messages from browser
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'connect':
          if (mode === '--live') {
            connectToWifiBridge();
          } else {
            startFilePlayback();
          }
          break;

        case 'disconnect':
          if (mode === '--live' && tcpSocket && !tcpSocket.destroyed) {
            console.log('🔌 Disconnecting from WiFi bridge');
            tcpSocket.destroy();
          } else if (mode === '--file' && filePlaybackTimer) {
            console.log('⏸️  Pausing file playback');
            clearInterval(filePlaybackTimer);
            filePlaybackTimer = null;
          }
          break;

        case 'playback-control':
          if (mode === '--file') {
            switch (data.action) {
              case 'pause':
                if (filePlaybackTimer) {
                  clearInterval(filePlaybackTimer);
                  filePlaybackTimer = null;
                  console.log('⏸️  Playback paused');
                }
                break;

              case 'resume':
                if (!filePlaybackTimer) {
                  startFilePlayback();
                  console.log('▶️  Playback resumed');
                }
                break;

              case 'restart':
                currentLineIndex = 0;
                if (filePlaybackTimer) {
                  clearInterval(filePlaybackTimer);
                }
                startFilePlayback();
                console.log('🔄 Playback restarted');
                break;

              case 'seek':
                const position = parseInt(data.position || 0);
                currentLineIndex = Math.min(position, nmeaLines.length - 1);
                console.log(`⏩ Seeked to position ${currentLineIndex}`);
                break;
            }
          }
          break;

        case 'autopilot-command':
          if (mode === '--live') {
            if (tcpSocket && !tcpSocket.destroyed) {
              console.log(`🎮 Autopilot command → WiFi bridge: ${data.command}`);
              tcpSocket.write(data.command);
            } else {
              ws.send(
                JSON.stringify({
                  type: 'error',
                  message: 'Not connected to WiFi bridge',
                }),
              );
            }
          } else {
            console.log(`🎮 Autopilot command (file mode): ${data.command} [simulated]`);
            ws.send(
              JSON.stringify({
                type: 'autopilot-response',
                command: data.command,
                success: true,
                simulated: true,
              }),
            );
          }
          break;

        default:
          console.log(`⚠️  Unknown message type: ${data.type}`);
      }
    } catch (err) {
      console.error(`❌ Error parsing message: ${err.message}`);
    }
  });

  ws.on('close', () => {
    console.log(`📱 Web client disconnected: ${clientIp}`);

    // Clean up
    if (tcpSocket && !tcpSocket.destroyed) {
      tcpSocket.destroy();
    }
    if (filePlaybackTimer) {
      clearInterval(filePlaybackTimer);
      filePlaybackTimer = null;
    }
  });

  ws.on('error', (err) => {
    console.error(`❌ WebSocket error: ${err.message}`);
  });

  // Auto-start based on mode
  if (mode === '--live') {
    connectToWifiBridge();
  } else {
    startFilePlayback();
  }
});

// Handle server errors
wss.on('error', (err) => {
  console.error(`❌ WebSocket server error: ${err.message}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');

  if (filePlaybackTimer) {
    clearInterval(filePlaybackTimer);
  }

  wss.clients.forEach((ws) => {
    ws.close();
  });

  wss.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});

console.log('🚀 Server started successfully');
console.log('📝 Press Ctrl+C to stop');
console.log('');
