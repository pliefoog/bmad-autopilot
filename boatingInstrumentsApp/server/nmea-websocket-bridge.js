#!/usr/bin/env node

/**
 * NMEA WebSocket Bridge Server
 *
 * This server bridges the gap between web browsers and NMEA WiFi bridges.
 * It accepts WebSocket connections from browsers and forwards data to/from
 * the WiFi bridge via TCP sockets.
 *
 * Usage:
 *   node nmea-websocket-bridge.js [wifi-bridge-host] [wifi-bridge-port]
 *
 * Example:
 *   node nmea-websocket-bridge.js 192.168.1.10 10110
 */

const WebSocket = require('ws');
const net = require('net');

// Configuration
const WS_PORT = 8080;
const WIFI_BRIDGE_HOST = process.argv[2] || '192.168.1.10';
const WIFI_BRIDGE_PORT = parseInt(process.argv[3] || '10110');

console.log('🌐 NMEA WebSocket Bridge Server');
console.log('================================');
console.log(`WebSocket Server: ws://localhost:${WS_PORT}`);
console.log(`WiFi Bridge: ${WIFI_BRIDGE_HOST}:${WIFI_BRIDGE_PORT}`);
console.log('');

// Create WebSocket server
const wss = new WebSocket.Server({ port: WS_PORT });

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

  // Function to connect to WiFi bridge
  const connectToWifiBridge = () => {
    if (isConnecting || (tcpSocket && !tcpSocket.destroyed)) {
      return;
    }

    isConnecting = true;
    console.log(`🔌 Connecting to WiFi bridge: ${WIFI_BRIDGE_HOST}:${WIFI_BRIDGE_PORT}`);

    tcpSocket = net.createConnection({
      host: WIFI_BRIDGE_HOST,
      port: WIFI_BRIDGE_PORT,
    });

    tcpSocket.on('connect', () => {
      isConnecting = false;
      console.log('✅ Connected to WiFi bridge');

      // Notify browser
      ws.send(JSON.stringify({
        type: 'connection',
        status: 'connected',
        host: WIFI_BRIDGE_HOST,
        port: WIFI_BRIDGE_PORT,
      }));
    });

    tcpSocket.on('data', (data) => {
      // Forward NMEA data from WiFi bridge to browser
      const nmeaData = data.toString();
      console.log(`📡 NMEA → Browser: ${nmeaData.trim().substring(0, 50)}...`);

      ws.send(JSON.stringify({
        type: 'nmea',
        data: nmeaData,
        timestamp: Date.now(),
      }));
    });

    tcpSocket.on('error', (err) => {
      isConnecting = false;
      console.error(`❌ WiFi bridge error: ${err.message}`);

      ws.send(JSON.stringify({
        type: 'error',
        message: err.message,
      }));
    });

    tcpSocket.on('close', () => {
      isConnecting = false;
      console.log('🔌 WiFi bridge connection closed');

      ws.send(JSON.stringify({
        type: 'connection',
        status: 'disconnected',
      }));

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
          connectToWifiBridge();
          break;

        case 'disconnect':
          if (tcpSocket && !tcpSocket.destroyed) {
            console.log('🔌 Disconnecting from WiFi bridge');
            tcpSocket.destroy();
          }
          break;

        case 'autopilot-command':
          // Forward autopilot command to WiFi bridge
          if (tcpSocket && !tcpSocket.destroyed) {
            console.log(`🎮 Autopilot command → WiFi bridge: ${data.command}`);
            tcpSocket.write(data.command);
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Not connected to WiFi bridge',
            }));
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

    // Clean up TCP connection
    if (tcpSocket && !tcpSocket.destroyed) {
      tcpSocket.destroy();
    }
  });

  ws.on('error', (err) => {
    console.error(`❌ WebSocket error: ${err.message}`);
  });

  // Auto-connect to WiFi bridge when browser connects
  connectToWifiBridge();
});

// Handle server errors
wss.on('error', (err) => {
  console.error(`❌ WebSocket server error: ${err.message}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
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
