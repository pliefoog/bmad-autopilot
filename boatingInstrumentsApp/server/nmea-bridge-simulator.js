#!/usr/bin/env node

/**
 * Enhanced NMEA Bridge Simulator
 * 
 * Multi-protocol server supporting TCP, UDP, and WebSocket connections
 * for marine instrument development and testing WITHOUT physical hardware.
 * 
 * Features:
 * - TCP Server on port 2000 (WiFi bridge simulation)
 * - UDP Server on port 2000 (high-frequency data)
 * - WebSocket Server on port 8080 (web browser compatibility)
 * - Bidirectional autopilot command processing
 * - Algorithmic NMEA data generation
 * - Scenario-based data streaming
 * - Backward compatibility with existing bridge
 * 
 * Usage:
 *   node nmea-bridge-simulator.js [--scenario basic-navigation] [--bridge-mode nmea0183|nmea2000]
 */

const net = require('net');
const dgram = require('dgram');
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Configuration
const TCP_PORT = 2000;
const UDP_PORT = 2000;
const WS_PORT = 8080; // WebSocket on separate port (can't share with TCP)
const BIND_HOST = '0.0.0.0'; // Bind to all network interfaces

class NMEABridgeSimulator {
  constructor() {
    this.tcpServer = null;
    this.httpServer = null; // HTTP server for WebSocket upgrades on port 2000
    this.udpServer = null;
    this.wsServer = null;
    this.wsTcpServer = null; // WebSocket server on TCP port 2000
    this.clients = new Map();
    this.bridgeMode = 'nmea0183'; // Default to NMEA 0183 bridge mode
    this.scenario = null;
  this.strictScenario = false; // Enforce YAML-only values when true
  this.scenarioTimers = [];
  this.scenarioFunctions = new Map();
    this.dataGenerators = new Map();
    this.isRunning = false;
    this.messageInterval = null;
    this.scenarioSpeed = 1.0; // Speed multiplier for scenario time progression
    
    // Recording playback
    this.recordingData = null;
    this.playbackStartTime = null;
    this.playbackSpeed = 1.0;
    this.playbackLoop = false;
    this.playbackMode = 'global'; // 'global' or 'per-client'
    this.currentMessageIndex = 0;
    
    // Per-client playback tracking
    this.clientPlaybacks = new Map(); // clientId -> playback state
    
    // Autopilot state
    this.autopilotState = {
      mode: 'STANDBY',
      engaged: false,
      active: false,
      targetHeading: 180,
      currentHeading: 175,
      rudderPosition: 0
    };
    
    // Performance monitoring
    this.stats = {
      messagesPerSecond: 0,
      totalMessages: 0,
      connectedClients: 0,
      memoryUsage: 0
    };
    
    console.log('🌐 Enhanced NMEA Bridge Simulator');
    console.log('=================================');
    console.log(`TCP Server: ${BIND_HOST}:${TCP_PORT} (accessible from all network interfaces)`);
    console.log(`UDP Server: ${BIND_HOST}:${UDP_PORT} (accessible from all network interfaces)`);
    console.log(`WebSocket Server: ws://${BIND_HOST}:${WS_PORT} (accessible from all network interfaces)`);
    console.log(`Bridge Mode: ${this.bridgeMode.toUpperCase()}`);
    console.log('');
  }
  
  /**
   * Display network connection information for all network interfaces
   */
  displayNetworkInfo() {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    
    console.log('🔗 Network Connection Information:');
    console.log('=================================');
    console.log('Localhost connections:');
    console.log(`  TCP: localhost:${TCP_PORT}`);
    console.log(`  UDP: localhost:${UDP_PORT}`);
    console.log(`  WebSocket: ws://localhost:${WS_PORT}`);
    console.log('');
    
    console.log('Network interface connections:');
    Object.keys(networkInterfaces).forEach(interfaceName => {
      const interfaces = networkInterfaces[interfaceName];
      interfaces.forEach(iface => {
        if (iface.family === 'IPv4' && !iface.internal) {
          console.log(`  ${interfaceName} (${iface.address}):`);
          console.log(`    TCP: ${iface.address}:${TCP_PORT}`);
          console.log(`    UDP: ${iface.address}:${UDP_PORT}`);
          console.log(`    WebSocket: ws://${iface.address}:${WS_PORT}`);
        }
      });
    });
    console.log('');
  }
  
  /**
   * Start all protocol servers
   */
  async start(config = {}) {
    try {
      this.bridgeMode = config.bridgeMode || 'nmea0183';
      this.scenarioSpeed = config.speed || 1.0; // Apply speed to scenario progression
      
      // Start TCP server
      await this.startTCPServer();
      
      // Start UDP server
      await this.startUDPServer();
      
      // Start WebSocket server on port 2000 (unified port)
      await this.startWebSocketServer();
      
      // Display network connection information
      this.displayNetworkInfo();
      
      // Load scenario if specified
      if (config.scenario) {
        await this.loadScenario(config.scenario);
        // Enforce strict scenario behavior when a scenario is loaded
        this.strictScenario = true;
      }
      
      // Load recording if specified
      if (config.recording) {
        await this.loadRecording(config.recording, config.speed, config.loop, config.playbackMode);
      }
      
      // Start data generation
  this.startDataGeneration();
      
      this.isRunning = true;
      console.log('🚀 All servers started successfully');
      console.log('📝 Press Ctrl+C to stop');
      console.log('');
      
      // Start performance monitoring
      this.startPerformanceMonitoring();
      
    } catch (error) {
      console.error('❌ Failed to start simulator:', error.message);
      process.exit(1);
    }
  }
  
  /**
   * Start TCP server on port 2000
   */
  async startTCPServer() {
    return new Promise((resolve, reject) => {
      this.tcpServer = net.createServer((socket) => {
        const clientId = `tcp-${socket.remoteAddress}:${socket.remotePort}`;
        console.log(`📱 TCP client connected: ${clientId}`);
        
        this.clients.set(clientId, {
          type: 'tcp',
          socket: socket,
          connected: true
        });
        
        // Start per-client playback if in per-client mode
        if (this.playbackMode === 'per-client' && this.recordingData) {
          this.startClientPlayback(clientId);
        }
        
        socket.on('data', (data) => {
          this.handleClientMessage(clientId, data.toString());
        });
        
        socket.on('close', () => {
          console.log(`📱 TCP client disconnected: ${clientId}`);
          this.stopClientPlayback(clientId);
          this.clients.delete(clientId);
        });
        
        socket.on('error', (err) => {
          console.error(`❌ TCP client error ${clientId}:`, err.message);
          this.stopClientPlayback(clientId);
          this.clients.delete(clientId);
        });
      });
      
      this.tcpServer.listen(TCP_PORT, BIND_HOST, () => {
        console.log(`✅ TCP server listening on ${BIND_HOST}:${TCP_PORT} (all network interfaces)`);
        resolve();
      });
      
      this.tcpServer.on('error', (err) => {
        console.error(`❌ TCP server error:`, err.message);
        reject(err);
      });
    });
  }
  
  /**
   * Start UDP server on port 2000
   */
  async startUDPServer() {
    return new Promise((resolve, reject) => {
      this.udpServer = dgram.createSocket('udp4');
      
      this.udpServer.on('message', (message, remote) => {
        const clientId = `udp-${remote.address}:${remote.port}`;
        
        if (!this.clients.has(clientId)) {
          console.log(`📱 UDP client connected: ${clientId}`);
          this.clients.set(clientId, {
            type: 'udp',
            remote: remote,
            connected: true
          });
          
          // Start per-client playback if in per-client mode
          if (this.playbackMode === 'per-client' && this.recordingData) {
            this.startClientPlayback(clientId);
          }
        }
        
        this.handleClientMessage(clientId, message.toString());
      });
      
      this.udpServer.on('listening', () => {
        console.log(`✅ UDP server listening on ${BIND_HOST}:${UDP_PORT} (all network interfaces)`);
        resolve();
      });
      
      this.udpServer.on('error', (err) => {
        console.error(`❌ UDP server error:`, err.message);
        reject(err);
      });
      
      this.udpServer.bind(UDP_PORT, BIND_HOST);
    });
  }
  
  /**
   * Start WebSocket server on port 8080
   */
  async startWebSocketServer() {
    return new Promise((resolve, reject) => {
      this.wsServer = new WebSocket.Server({ port: WS_PORT, host: BIND_HOST });
      
      this.wsServer.on('listening', () => {
        console.log(`✅ WebSocket server listening on ${BIND_HOST}:${WS_PORT} (all network interfaces)`);
        resolve();
      });
      
      this.wsServer.on('connection', (ws, req) => {
        const clientId = `ws-${req.socket.remoteAddress}:${req.socket.remotePort}`;
        console.log(`📱 WebSocket client connected: ${clientId}`);
        
        this.clients.set(clientId, {
          type: 'websocket',
          socket: ws,
          connected: true
        });
        
        // Start per-client playback if in per-client mode
        if (this.playbackMode === 'per-client' && this.recordingData) {
          this.startClientPlayback(clientId);
        }
        
        // Physical WiFi bridges don't send connection status - they just start sending NMEA data
        
        // Physical WiFi bridges typically don't accept WebSocket commands
        // They just stream NMEA data continuously
        ws.on('message', (message) => {
          console.log(`📡 WebSocket message from ${clientId} (ignored - bridges are read-only):`, message.toString());
        });
        
        ws.on('close', () => {
          console.log(`📱 WebSocket client disconnected: ${clientId}`);
          this.stopClientPlayback(clientId);
          this.clients.delete(clientId);
        });
        
        ws.on('error', (err) => {
          console.error(`❌ WebSocket client error ${clientId}:`, err.message);
          this.stopClientPlayback(clientId);
          this.clients.delete(clientId);
        });
      });
      
      this.wsServer.on('error', (err) => {
        console.error(`❌ WebSocket server error:`, err.message);
        reject(err);
      });
    });
  }
  
  /**
   * Handle incoming client messages
   */
  handleClientMessage(clientId, message) {
    console.log(`📡 Message from ${clientId}: ${message.trim().substring(0, 50)}...`);
    
    // Check if it's an autopilot command
    if (this.isAutopilotCommand(message)) {
      this.processAutopilotCommand(message, clientId);
    }
  }
  
  /**
   * Handle WebSocket specific messages
   */
  handleWebSocketMessage(clientId, data) {
    switch (data.type) {
      case 'connect':
        // Already connected, send status
        const client = this.clients.get(clientId);
        if (client && client.socket) {
          client.socket.send(JSON.stringify({
            type: 'connection',
            status: 'connected',
            bridgeMode: this.bridgeMode,
            simulator: true
          }));
        }
        break;
        
      case 'disconnect':
        console.log(`🔌 WebSocket client ${clientId} requested disconnect`);
        const wsClient = this.clients.get(clientId);
        if (wsClient && wsClient.socket) {
          wsClient.socket.close();
        }
        break;
        
      case 'autopilot-command':
        console.log(`🎮 Autopilot command from ${clientId}: ${data.command}`);
        this.processAutopilotCommand(data.command, clientId);
        break;
        
      default:
        console.log(`⚠️  Unknown WebSocket message type from ${clientId}: ${data.type}`);
    }
  }
  
  /**
   * Check if message is an autopilot command
   */
  isAutopilotCommand(message) {
    // NMEA 0183 bridge mode: $PCDIN-encapsulated commands
    if (message.startsWith('$PCDIN,')) {
      return true;
    }
    
    // NMEA 2000 bridge mode: Native PGN messages (simplified check)
    if (this.bridgeMode === 'nmea2000' && message.includes('PGN')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Process autopilot commands
   */
  processAutopilotCommand(command, clientId) {
    try {
      if (command.startsWith('$PCDIN,')) {
        // Parse NMEA 0183 encapsulated command
        this.parsePCDINCommand(command);
      } else if (this.bridgeMode === 'nmea2000') {
        // Parse native NMEA 2000 PGN
        this.parseNMEA2000PGN(command);
      }
      
      // Broadcast autopilot status update to all clients
      this.broadcastAutopilotStatus();
      
    } catch (error) {
      console.error(`❌ Error processing autopilot command: ${error.message}`);
    }
  }
  
  /**
   * Parse $PCDIN encapsulated NMEA 2000 PGN
   */
  parsePCDINCommand(pcdin) {
    // Example: $PCDIN,01F112,00,00,FF,00,00,00,00,FF*59
    // This is a simplified parser for demonstration
    const parts = pcdin.split(',');
    if (parts.length >= 2) {
      const pgn = parts[1];
      
      switch (pgn) {
        case '01F112': // Autopilot Control PGN (example)
          this.autopilotState.engaged = !this.autopilotState.engaged;
          this.autopilotState.active = this.autopilotState.engaged;
          console.log(`🎮 Autopilot ${this.autopilotState.engaged ? 'ENGAGED' : 'DISENGAGED'}`);
          break;
          
        case '01F113': // Heading adjustment (example)
          // Parse heading adjustment from command
          this.autopilotState.targetHeading = (this.autopilotState.targetHeading + 1) % 360;
          console.log(`🎮 Heading adjusted to ${this.autopilotState.targetHeading}°`);
          break;
      }
    }
  }
  
  /**
   * Parse native NMEA 2000 PGN
   */
  parseNMEA2000PGN(pgn) {
    // Simplified NMEA 2000 PGN parser
    console.log(`🎮 Processing NMEA 2000 PGN: ${pgn}`);
    // Implementation would depend on specific PGN format
  }
  
  /**
   * Load JSON recording file with timing data
   */
  async loadRecording(recordingFile, speed = 1.0, loop = false, playbackMode = 'global') {
    try {
      // Handle both absolute and relative paths
      const recordingPath = path.isAbsolute(recordingFile) 
        ? recordingFile 
        : path.resolve(process.cwd(), recordingFile);
      console.log(`📼 Loading recording: ${recordingFile}`);
      
      let fileData;
      if (recordingFile.endsWith('.gz')) {
        const zlib = require('zlib');
        const compressed = fs.readFileSync(recordingPath);
        fileData = zlib.gunzipSync(compressed).toString();
      } else {
        fileData = fs.readFileSync(recordingPath, 'utf8');
      }
      
      this.recordingData = JSON.parse(fileData);
      this.playbackSpeed = speed;
      this.playbackLoop = loop;
      this.playbackMode = playbackMode;
      this.currentMessageIndex = 0;
      
      console.log(`✅ Loaded ${this.recordingData.messages.length} messages from recording`);
      console.log(`📊 Duration: ${this.recordingData.metadata.duration.toFixed(1)}s, Speed: ${speed}x, Loop: ${loop}`);
      console.log(`🎭 Playback Mode: ${playbackMode.toUpperCase()}`);
      
    } catch (error) {
      console.error(`❌ Failed to load recording: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start data generation (recording playback or algorithmic)
   */
  startDataGeneration() {
    if (this.recordingData) {
      if (this.playbackMode === 'global') {
        this.startRecordingPlayback();
      } else {
        console.log('📱 Per-client playback mode: waiting for client connections');
        // In per-client mode, playback starts when clients connect
      }
    } else {
      // Initialize scenario runtime (generators and validation)
      if (this.scenario) {
        try {
          this.initializeScenarioRuntime();
        } catch (err) {
          console.error(`❌ Scenario initialization failed: ${err.message}`);
          process.exit(1);
        }
      }

      // Generate NMEA data at individual message frequencies (not hardcoded 10Hz)
      // GPS at 5Hz = 200ms, Depth at 2Hz = 500ms, etc.
      this.messageInterval = setInterval(() => {
        // Only generate and broadcast messages that are due based on their individual timing
        this.generateAndBroadcastNMEADataSelective();
      }, 50); // Check every 50ms for precise timing
    }
  }

  /**
   * Start recording playback with precise timing
   */
  startRecordingPlayback() {
    if (!this.recordingData || !this.recordingData.messages.length) {
      console.error('❌ No recording data available for playback');
      return;
    }
    
    this.playbackStartTime = Date.now();
    this.currentMessageIndex = 0;
    
    console.log(`🎬 Starting recording playback (${this.recordingData.messages.length} messages)`);
    
    // Schedule the first message
    this.scheduleNextRecordingMessage();
  }

  /**
   * Schedule next message from recording based on relative_time
   */
  scheduleNextRecordingMessage() {
    if (!this.recordingData || this.currentMessageIndex >= this.recordingData.messages.length) {
      if (this.playbackLoop) {
        console.log('🔄 Restarting recording playback (loop mode)');
        this.currentMessageIndex = 0;
        this.playbackStartTime = Date.now();
      } else {
        console.log('✅ Recording playback completed');
        return;
      }
    }
    
    const message = this.recordingData.messages[this.currentMessageIndex];
    
    // Calculate delay until this message should be sent
    let delay;
    if (this.currentMessageIndex === 0) {
      // First message - use its relative_time from start
      delay = (message.relative_time * 1000) / this.playbackSpeed;
    } else {
      // Subsequent messages - calculate interval from previous message
      const prevMessage = this.recordingData.messages[this.currentMessageIndex - 1];
      const interval = (message.relative_time - prevMessage.relative_time) * 1000;
      delay = Math.max(1, interval / this.playbackSpeed); // Minimum 1ms delay
    }
    
    setTimeout(() => {
      // Broadcast the recorded NMEA message
      this.broadcastMessage(message.message);
      this.stats.totalMessages++;
      
      // Schedule next message
      this.currentMessageIndex++;
      this.scheduleNextRecordingMessage();
    }, delay);
  }

  /**
   * Start per-client recording playback for a specific client
   */
  startClientPlayback(clientId) {
    if (!this.recordingData || this.playbackMode !== 'per-client') {
      return;
    }

    const playbackState = {
      startTime: Date.now(),
      currentIndex: 0,
      timeoutId: null
    };

    this.clientPlaybacks.set(clientId, playbackState);
    console.log(`🎬 Starting per-client playback for ${clientId}`);
    
    this.scheduleNextClientMessage(clientId);
  }

  /**
   * Schedule next message for a specific client
   */
  scheduleNextClientMessage(clientId) {
    const playbackState = this.clientPlaybacks.get(clientId);
    if (!playbackState || !this.recordingData) {
      return;
    }

    if (playbackState.currentIndex >= this.recordingData.messages.length) {
      if (this.playbackLoop) {
        console.log(`🔄 Restarting playback for client ${clientId} (loop mode)`);
        playbackState.currentIndex = 0;
        playbackState.startTime = Date.now();
      } else {
        console.log(`✅ Playback completed for client ${clientId}`);
        this.clientPlaybacks.delete(clientId);
        return;
      }
    }

    const message = this.recordingData.messages[playbackState.currentIndex];
    
    // Calculate delay until this message should be sent (same logic as global playback)
    let delay;
    if (playbackState.currentIndex === 0) {
      // First message - use its relative_time from start
      delay = (message.relative_time * 1000) / this.playbackSpeed;
    } else {
      // Subsequent messages - calculate interval from previous message
      const prevMessage = this.recordingData.messages[playbackState.currentIndex - 1];
      const interval = (message.relative_time - prevMessage.relative_time) * 1000;
      delay = Math.max(1, interval / this.playbackSpeed); // Minimum 1ms delay
    }

    playbackState.timeoutId = setTimeout(() => {
      // Send message to specific client
      this.sendMessageToClient(clientId, message.message);
      
      // Schedule next message
      playbackState.currentIndex++;
      this.scheduleNextClientMessage(clientId);
    }, delay);
  }

  /**
   * Send message to a specific client
   */
  sendMessageToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    // Ensure proper NMEA message formatting with line terminators
    const formattedMessage = this.ensureNMEAFormat(message);

    try {
      switch (client.type) {
        case 'tcp':
          if (client.socket && !client.socket.destroyed) {
            client.socket.write(formattedMessage);
          }
          break;
          
        case 'udp':
          if (client.remote && this.udpServer) {
            this.udpServer.send(Buffer.from(formattedMessage), client.remote.port, client.remote.address);
          }
          break;
          
        case 'websocket':
          if (client.socket && client.socket.readyState === WebSocket.OPEN) {
            client.socket.send(JSON.stringify({
              type: 'nmea',
              data: formattedMessage,
              timestamp: Date.now()
            }));
          }
          break;
      }
      this.stats.totalMessages++;
    } catch (error) {
      console.error(`❌ Error sending message to client ${clientId}:`, error.message);
    }
  }

  /**
   * Ensure proper NMEA message formatting with line terminators
   */
  ensureNMEAFormat(message) {
    // Remove any existing line terminators
    let cleanMessage = message.replace(/\r?\n/g, '');
    
    // Add proper NMEA line terminator
    return cleanMessage + '\r\n';
  }

  /**
   * Stop per-client playback for a specific client
   */
  stopClientPlayback(clientId) {
    const playbackState = this.clientPlaybacks.get(clientId);
    if (playbackState && playbackState.timeoutId) {
      clearTimeout(playbackState.timeoutId);
      this.clientPlaybacks.delete(clientId);
      console.log(`🛑 Stopped playback for client ${clientId}`);
    }
  }
  
  /**
   * Generate and broadcast NMEA data
   */
  generateAndBroadcastNMEAData() {
    const messages = [];
    
    // Generate basic NMEA sentences
    messages.push(this.generateDepthSentence());
    messages.push(this.generateSpeedSentence());        // VTG - Speed Over Ground
    messages.push(this.generateWaterSpeedSentence());   // VHW - Speed Through Water
    messages.push(this.generateWindSentence());
    messages.push(this.generateGPSSentence());
    messages.push(this.generateRMCSentence());
    messages.push(this.generateZDASentence());
    
    // Add autopilot status
    messages.push(this.generateAutopilotSentence());
    
    // Broadcast to all clients
    messages.forEach(message => {
      this.broadcastMessage(message);
    });
    
    this.stats.totalMessages += messages.length;
  }

  /**
   * Generate and broadcast NMEA data selectively based on individual timing
   */
  generateAndBroadcastNMEADataSelective() {
    if (!this.scenario || !this.scenario.timing) {
      // Fallback to old method if no timing configured
      return this.generateAndBroadcastNMEAData();
    }

    const now = Date.now();
    const timing = this.scenario.timing;
    const messages = [];

    // Initialize last broadcast times if not set
    if (!this.lastBroadcastTimes) {
      this.lastBroadcastTimes = {};
    }

    // Helper to check if message type should be sent
    const shouldSend = (messageType, frequencyHz) => {
      const intervalMs = 1000 / frequencyHz;
      const lastTime = this.lastBroadcastTimes[messageType] || 0;
      return (now - lastTime) >= intervalMs;
    };

    // Check each message type individually
    if (timing.depth && shouldSend('depth', timing.depth)) {
      messages.push(this.generateDepthSentence());
      this.lastBroadcastTimes.depth = now;
    }

    // Water temperature (separate timing from depth)
    if (timing.water_temp && shouldSend('water_temp', timing.water_temp)) {
      messages.push(this.generateWaterTemperatureSentence());
      this.lastBroadcastTimes.water_temp = now;
    }

    if (timing.speed && shouldSend('speed', timing.speed)) {
      messages.push(this.generateSpeedSentence());        // VTG - Speed Over Ground
      messages.push(this.generateWaterSpeedSentence());   // VHW - Speed Through Water
      this.lastBroadcastTimes.speed = now;
    }

    if (timing.wind && shouldSend('wind', timing.wind)) {
      messages.push(this.generateWindSentence());
      this.lastBroadcastTimes.wind = now;
    }

    if (timing.gps && shouldSend('gps', timing.gps)) {
      messages.push(this.generateGPSSentence());
      messages.push(this.generateRMCSentence());
      messages.push(this.generateZDASentence());
      this.lastBroadcastTimes.gps = now;
    }

    if (timing.compass && shouldSend('compass', timing.compass)) {
      // Add compass sentence when implemented
    }

    // Always include autopilot status for now
    if (shouldSend('autopilot', 1)) { // 1Hz for autopilot
      messages.push(this.generateAutopilotSentence());
      this.lastBroadcastTimes.autopilot = now;
    }

    // Broadcast messages that are due
    messages.forEach(message => {
      this.broadcastMessage(message);
    });
    
    this.stats.totalMessages += messages.length;
  }
  
  /**
   * Generate depth sentence (configurable format)
   */
  generateDepthSentence() {
    const depthData = this.scenario?.data?.depth || {};
    const depthMeters = depthData.currentValue;
    if (this.strictScenario && (depthMeters === undefined || !Number.isFinite(depthMeters))) {
      throw new Error('Scenario missing depth.currentValue. Ensure YAML functions update this value and timing is defined.');
    }

    // Default to DBT, but allow configuration
    const depthFormat = this.scenario?.parameters?.depth_format || 'DBT';
    
    switch (depthFormat.toLowerCase()) {
      case 'dpt':
        return this.generateDPTSentence(depthMeters);
      case 'dbk':
        return this.generateDBKSentence(depthMeters);
      case 'dbt':
      default:
        return this.generateDBTSentence(depthMeters);
    }
  }

  /**
   * Generate DBT (Depth Below Transducer) sentence
   */
  generateDBTSentence(depthMeters) {
    const depthFeet = depthMeters / 0.3048; // Convert meters to feet
    const depthFathoms = depthMeters * 0.546667; // Convert meters to fathoms

    // Correct DBT format: $xxDBT,<depth_feet>,f,<depth_meters>,M,<depth_fathoms>,F
    const sentence = `$IIDBT,${depthFeet.toFixed(1)},f,${depthMeters.toFixed(1)},M,${depthFathoms.toFixed(1)},F`;
    return this.addChecksum(sentence);
  }

  /**
   * Generate DPT (Depth of Water) sentence
   */
  generateDPTSentence(depthMeters) {
    // DPT format: $xxDPT,<depth_meters>,<offset>,<max_range>*hh
    const offset = this.scenario?.parameters?.vessel?.keel_offset || 0.0; // Keel offset in meters
    const maxRange = this.scenario?.parameters?.sonar?.max_range || 100.0; // Sonar max range
    
    const sentence = `$IIDPT,${depthMeters.toFixed(1)},${offset.toFixed(1)},${maxRange.toFixed(1)}`;
    return this.addChecksum(sentence);
  }

  /**
   * Generate DBK (Depth Below Keel) sentence
   */
  generateDBKSentence(depthMeters) {
    // For DBK, subtract keel offset from transducer depth
    const keelOffset = this.scenario?.parameters?.vessel?.keel_offset || 1.8; // Default keel depth
    const depthBelowKeel = Math.max(0, depthMeters - keelOffset);
    
    const depthFeet = depthBelowKeel / 0.3048; // Convert meters to feet
    const depthFathoms = depthBelowKeel * 0.546667; // Convert meters to fathoms

    // DBK format: $xxDBK,<depth_feet>,f,<depth_meters>,M,<depth_fathoms>,F
    const sentence = `$IIDBK,${depthFeet.toFixed(1)},f,${depthBelowKeel.toFixed(1)},M,${depthFathoms.toFixed(1)},F`;
    return this.addChecksum(sentence);
  }

  /**
   * Generate MTW (Mean Temperature of Water) sentence
   */
  generateWaterTemperatureSentence() {
    // Simulate realistic water temperature (seasonal variation)
    const baseTemp = 18.5; // Celsius - typical lake temperature
    const seasonalVariation = Math.sin((Date.now() / (1000 * 60 * 60 * 24 * 365)) * 2 * Math.PI) * 8; // ±8°C seasonal
    const dailyVariation = Math.sin((Date.now() / (1000 * 60 * 60 * 24)) * 2 * Math.PI) * 2; // ±2°C daily
    const randomVariation = (Math.random() - 0.5) * 1.0; // ±0.5°C random
    
    const waterTemp = baseTemp + seasonalVariation + dailyVariation + randomVariation;
    
    // MTW format: $xxMTW,<temperature>,C*hh
    const sentence = `$IIMTW,${waterTemp.toFixed(1)},C`;
    return this.addChecksum(sentence);
  }

  /**
   * Generate speed sentence (VTG - Speed Over Ground)
   */
  generateSpeedSentence() {
    const speedData = this.scenario?.data?.speed || {};
    const speedKnots = speedData.currentValue;
    if (this.strictScenario && (speedKnots === undefined || !Number.isFinite(speedKnots))) {
      throw new Error('Scenario missing speed.currentValue. Ensure YAML functions update this value and timing is defined.');
    }
    const speedKmh = speedKnots * 1.852; // Convert knots to km/h
    const course = this.autopilotState.currentHeading || 0; // Default to 0 degrees if undefined

    const sentence = `$IIVTG,${course.toFixed(1)},T,,M,${speedKnots.toFixed(1)},N,${speedKmh.toFixed(1)},K,A`;
    return this.addChecksum(sentence);
  }

  /**
   * Generate water speed sentence (VHW - Speed Through Water)
   */
  generateWaterSpeedSentence() {
    const speedData = this.scenario?.data?.speed || {};
    let stwKnots = speedData.currentValue || 0;
    
    if (this.strictScenario && (stwKnots === undefined || !Number.isFinite(stwKnots))) {
      throw new Error('Scenario missing speed.currentValue for STW calculation.');
    }
    
    // For sailboats, STW is typically slightly different from SOG due to current/leeway
    // Apply a small random variation to simulate current effects
    const currentEffect = (Math.random() - 0.5) * 0.4; // ±0.2 knots current effect
    stwKnots = Math.max(0, stwKnots + currentEffect);
    
    const stwKmh = stwKnots * 1.852; // Convert knots to km/h
    const heading = this.autopilotState.currentHeading || 0;

    // VHW format: $xxVHW,x.x,T,x.x,M,x.x,N,x.x,K*hh
    // Heading (true), Heading (magnetic), Speed (knots), Speed (km/h)
    const sentence = `$IIVHW,${heading.toFixed(1)},T,,M,${stwKnots.toFixed(1)},N,${stwKmh.toFixed(1)},K`;
    return this.addChecksum(sentence);
  }

  /**
   * Generate wind sentence (MWV)
   */
  generateWindSentence() {
    const windData = this.scenario?.data?.wind || {};
    const windAngleData = windData.angle || {};
    const windSpeedData = windData.speed || {};
    const windAngle = windAngleData.currentValue;
    const windSpeedKnots = windSpeedData.currentValue;
    if (this.strictScenario && (windAngle === undefined || !Number.isFinite(windAngle))) {
      throw new Error('Scenario missing wind.angle.currentValue. Ensure YAML functions update this value and timing is defined.');
    }
    if (this.strictScenario && (windSpeedKnots === undefined || !Number.isFinite(windSpeedKnots))) {
      throw new Error('Scenario missing wind.speed.currentValue. Ensure YAML functions update this value and timing is defined.');
    }

    const sentence = `$IIMWV,${windAngle.toFixed(1)},R,${windSpeedKnots.toFixed(1)},N,A`;
    return this.addChecksum(sentence);
  }
  
  /**
   * Generate GPS sentence (GGA)
   */
  generateGPSSentence() {
    let time, date, lat, latHemisphere, lon, lonHemisphere;

    // Strict mode: require GPS values to be provided/generated by scenario
    if (this.strictScenario) {
      const gpsData = (this.scenario && this.scenario.data && this.scenario.data.gps) ? this.scenario.data.gps : null;
      if (!gpsData) {
        throw new Error('Scenario missing data.gps configuration.');
      }
      time = gpsData.time;
      date = gpsData.date;
      lat = gpsData.latitude;
      latHemisphere = gpsData.latHemisphere;
      lon = gpsData.longitude;
      lonHemisphere = gpsData.lonHemisphere;
      const missing = [];
      if (!time) missing.push('data.gps.time');
      if (!date) missing.push('data.gps.date');
      if (!lat) missing.push('data.gps.latitude');
      if (!latHemisphere) missing.push('data.gps.latHemisphere');
      if (!lon) missing.push('data.gps.longitude');
      if (!lonHemisphere) missing.push('data.gps.lonHemisphere');
      if (missing.length) {
        throw new Error(`Scenario GPS fields missing: ${missing.join(', ')}. Define via YAML functions or explicit values.`);
      }
    } else {
      // Non-strict legacy fallback
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const seconds = String(now.getUTCSeconds()).padStart(2, '0');
      time = `${hours}${minutes}${seconds}`;

      const day = String(now.getUTCDate()).padStart(2, '0');
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');
      const year = String(now.getUTCFullYear()).slice(-2);
      date = `${day}${month}${year}`;

      lat = '4124.8963';
      latHemisphere = 'N';
      lon = '08151.6838';
      lonHemisphere = 'W';
    }

    // NMEA GGA format
    const sentence = `$IIGGA,${time},${lat},${latHemisphere},${lon},${lonHemisphere},1,08,0.9,545.4,M,46.9,M,,`;
    return this.addChecksum(sentence);
  }

  /**
   * Generate GPS sentence (RMC)
   */
  generateRMCSentence() {
    // Strict mode: require GPS values to be provided/generated by scenario
    const gpsData = this.scenario?.data?.gps;
    if (this.strictScenario) {
      if (!gpsData) {
        throw new Error('Scenario missing data.gps configuration for RMC.');
      }
      const missing = [];
      if (!gpsData.time) missing.push('data.gps.time');
      if (!gpsData.date) missing.push('data.gps.date');
      if (!gpsData.latitude) missing.push('data.gps.latitude');
      if (!gpsData.latHemisphere) missing.push('data.gps.latHemisphere');
      if (!gpsData.longitude) missing.push('data.gps.longitude');
      if (!gpsData.lonHemisphere) missing.push('data.gps.lonHemisphere');
      if (missing.length) {
        throw new Error(`Scenario GPS fields missing for RMC: ${missing.join(', ')}`);
      }
    }

    const time = gpsData?.time;
    const date = gpsData?.date; // ddmmyy
    const lat = gpsData?.latitude;
    const latHemisphere = gpsData?.latHemisphere;
    const lon = gpsData?.longitude;
    const lonHemisphere = gpsData?.lonHemisphere;

    // Speed over ground (knots) and course over ground (true)
    const sog = this.scenario?.data?.speed?.currentValue ?? 0;
    const cog = (this.autopilotState.currentHeading || 0);

    // Status A=valid, V=warning
    const status = 'A';

    // Magnetic variation unknown -> leave blank fields
    const sentence = `$IIRMC,${time},${status},${lat},${latHemisphere},${lon},${lonHemisphere},${Number(sog).toFixed(1)},${Number(cog).toFixed(1)},${date},,,A`;
    return this.addChecksum(sentence);
  }

  /**
   * Generate GPS time/date sentence (ZDA)
   */
  generateZDASentence() {
    const gpsData = this.scenario?.data?.gps;
    if (this.strictScenario) {
      if (!gpsData) {
        throw new Error('Scenario missing data.gps configuration for ZDA.');
      }
      const missing = [];
      if (!gpsData.time) missing.push('data.gps.time');
      if (!gpsData.date) missing.push('data.gps.date');
      if (missing.length) {
        throw new Error(`Scenario GPS fields missing for ZDA: ${missing.join(', ')}`);
      }
    }

    const t = gpsData?.time || '';
    const d = gpsData?.date || '';
    // date in ddmmyy; convert to components
    const dd = d.substring(0, 2);
    const mm = d.substring(2, 4);
    const yy = d.substring(4, 6);
    const fullYear = yy ? `20${yy}` : '';

    // Leave local time zone fields blank (,,)
    const sentence = `$IIZDA,${t},${dd},${mm},${fullYear},,,`;
    return this.addChecksum(sentence);
  }
  
  /**
   * Generate autopilot sentence
   */
  generateAutopilotSentence() {
    if (this.bridgeMode === 'nmea0183') {
      // Encapsulate in $PCDIN for NMEA 0183 bridge mode
      const pgn = '01F204'; // Autopilot status PGN (example)
      const data = `00,${this.autopilotState.engaged ? 'FF' : '00'},${Math.floor(this.autopilotState.targetHeading).toString(16).padStart(2, '0')},00,00,00,00`;
      const sentence = `$PCDIN,${pgn},${data}`;
      return this.addChecksum(sentence);
    } else {
      // Native NMEA 2000 format (simplified)
      return `PGN:126208,Data:${this.autopilotState.engaged ? '1' : '0'},${this.autopilotState.targetHeading}`;
    }
  }
  
  /**
   * Add NMEA checksum
   */
  addChecksum(sentence) {
    let checksum = 0;
    for (let i = 1; i < sentence.length; i++) {
      checksum ^= sentence.charCodeAt(i);
    }
    return `${sentence}*${checksum.toString(16).toUpperCase().padStart(2, '0')}\r\n`;
  }
  
  /**
   * Broadcast message to all clients
   */
  broadcastMessage(message) {
    // Format once for efficiency when broadcasting to multiple clients
    const formattedMessage = this.ensureNMEAFormat(message);
    
    this.clients.forEach((client, clientId) => {
      try {
        switch (client.type) {
          case 'tcp':
            if (client.socket && !client.socket.destroyed) {
              client.socket.write(formattedMessage);
            }
            break;
            
          case 'udp':
            if (client.remote && this.udpServer) {
              this.udpServer.send(Buffer.from(formattedMessage), client.remote.port, client.remote.address);
            }
            break;
            
          case 'websocket':
            if (client.socket && client.socket.readyState === WebSocket.OPEN) {
              // Send raw NMEA data like physical WiFi bridges
              client.socket.send(formattedMessage);
            }
            break;
        }
      } catch (error) {
        console.error(`❌ Error broadcasting to ${clientId}:`, error.message);
        this.clients.delete(clientId);
      }
    });
  }
  
  /**
   * Broadcast autopilot status update
   */
  broadcastAutopilotStatus() {
    const statusMessage = {
      type: 'autopilot-status',
      data: this.autopilotState,
      timestamp: Date.now()
    };
    
    this.clients.forEach((client, clientId) => {
      if (client.type === 'websocket' && client.socket && client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(JSON.stringify(statusMessage));
      }
    });
  }
  
  /**
   * Load scenario configuration
   */
  async loadScenario(scenarioName) {
    try {
      let scenarioPath;
      // Allow both short names like "basic/coastal-sailing" and full vendor paths
      if (scenarioName.endsWith('.yml') || scenarioName.endsWith('.yaml')) {
        scenarioPath = path.isAbsolute(scenarioName)
          ? scenarioName
          : path.join(__dirname, '..', scenarioName);
      } else {
        scenarioPath = path.join(__dirname, '..', 'vendor', 'test-scenarios', `${scenarioName}.yml`);
      }

      if (!fs.existsSync(scenarioPath)) {
        throw new Error(`Scenario file not found: ${scenarioPath}`);
      }

      const scenarioData = fs.readFileSync(scenarioPath, 'utf8');
      this.scenario = yaml.load(scenarioData);

      console.log(`📋 Loaded scenario: ${this.scenario.name || scenarioName}`);
      // Validate immediately so we fail-fast before starting
      this.validateScenarioConfig();
      
    } catch (error) {
      console.error(`❌ Error loading scenario ${scenarioName}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    setInterval(() => {
      this.stats.connectedClients = this.clients.size;
      this.stats.memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      
      // Calculate messages per second
      const currentMessages = this.stats.totalMessages;
      this.stats.messagesPerSecond = Math.max(0, currentMessages - (this.lastMessageCount || 0));
      this.lastMessageCount = currentMessages;
      
      console.log(`📊 Stats: ${this.stats.connectedClients} clients, ${this.stats.messagesPerSecond} msg/s, ${this.stats.memoryUsage}MB RAM`);
    }, 1000);
  }

  /**
   * Validate scenario configuration strictly against YAML contents
   * - No implicit defaults
   * - All referenced function types must exist in scenario.functions
   * - All timing entries for referenced data streams must exist
   */
  validateScenarioConfig() {
    if (!this.scenario) return;
    const s = this.scenario;
    const errors = [];
    if (!s.data || typeof s.data !== 'object') {
      errors.push('Missing required section: data');
    }
    if (!s.timing || typeof s.timing !== 'object') {
      errors.push('Missing required section: timing');
    }
    if (!s.functions || typeof s.functions !== 'object') {
      errors.push('Missing required section: functions');
    }
    if (errors.length) {
      throw new Error(`Scenario validation failed: ${errors.join('; ')}`);
    }

    // Helper to check a data node
    const requireFunctionAndTiming = (streamKey, node) => {
      const type = node && node.type;
      if (!type) {
        errors.push(`data.${streamKey}.type is required`);
      } else if (!s.functions[type]) {
        errors.push(`functions.${type} not defined for data.${streamKey}.type=${type}`);
      }
      const timingHz = s.timing && s.timing[streamKey.split('.')[0]]; // top-level timing key
      if (timingHz === undefined) {
        errors.push(`timing.${streamKey.split('.')[0]} is required (Hz)`);
      }
    };

    // Depth
    if (s.data.depth) requireFunctionAndTiming('depth', s.data.depth);
    // Speed
    if (s.data.speed) requireFunctionAndTiming('speed', s.data.speed);
    // Wind
    if (s.data.wind) {
      if (s.data.wind.angle) requireFunctionAndTiming('wind', s.data.wind.angle);
      if (s.data.wind.speed) requireFunctionAndTiming('wind', s.data.wind.speed);
    }
    // GPS - require function if declared
    if (s.data.gps) requireFunctionAndTiming('gps', s.data.gps);

    if (errors.length) {
      throw new Error(`Scenario validation failed: ${errors.join('; ')}`);
    }
  }

  /**
   * Compile scenario functions from YAML into callable JS functions.
   * Each function receives a single 'ctx' object with parameters.
   */
  compileScenarioFunctions() {
    this.scenarioFunctions.clear();
    const funcs = this.scenario.functions || {};
    Object.entries(funcs).forEach(([name, code]) => {
      try {
        // Wrap provided code to allow 'return' at top level
        const wrapped = `return (function(ctx){ with(ctx){ ${code}\n } })(ctx)`;
        const fn = new Function('ctx', wrapped);
        this.scenarioFunctions.set(name, fn);
      } catch (err) {
        throw new Error(`Failed to compile function '${name}': ${err.message}`);
      }
    });
  }

  /**
   * Initialize generators and timers based on scenario timing
   */
  initializeScenarioRuntime() {
    if (!this.scenario) return;
    // Validate strictly
    this.validateScenarioConfig();
    // Compile functions
    this.compileScenarioFunctions();
    // Clear any existing timers
    this.scenarioTimers.forEach(t => clearInterval(t));
    this.scenarioTimers = [];

    const nowMs = () => Date.now();
    const startedAt = nowMs();

    const getElapsed = () => ((nowMs() - startedAt) / 1000) * this.scenarioSpeed; // Apply scenario speed multiplier

    // Helper to map YAML keys to camelCase variables expected by functions
    const toCamel = (k) => k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const buildCtx = (node) => {
      const ctx = { currentTime: getElapsed() };
      Object.entries(node).forEach(([k, v]) => {
        if (k === 'type') return;
        ctx[toCamel(k)] = v;
      });
      // Provide dynamic cross-dependencies
      if (this.scenario?.data?.wind?.speed?.currentValue !== undefined) {
        ctx.windSpeed = this.scenario.data.wind.speed.currentValue;
      }
      if (this.scenario?.data?.speed?.currentValue !== undefined) {
        ctx.speed = this.scenario.data.speed.currentValue;
      }
      return ctx;
    };

    const startTimer = (hz, cb) => {
      const interval = Math.max(1, Math.floor(1000 / hz));
      const id = setInterval(cb, interval);
      this.scenarioTimers.push(id);
    };

    const timing = this.scenario.timing || {};

    // Depth generator
    if (this.scenario.data.depth) {
      const type = this.scenario.data.depth.type;
      const fn = this.scenarioFunctions.get(type);
      if (!fn) throw new Error(`Function not compiled: ${type}`);
      startTimer(timing.depth, () => {
        try {
          const val = fn(buildCtx(this.scenario.data.depth));
          if (!Number.isFinite(val)) throw new Error(`Function '${type}' returned non-numeric value`);
          this.scenario.data.depth.currentValue = val;
        } catch (err) {
          console.error(`❌ depth generator error: ${err.message}`);
          process.exit(1);
        }
      });
      // Seed initial value immediately to satisfy strict mode
      try {
        const seedVal = fn(buildCtx(this.scenario.data.depth));
        if (!Number.isFinite(seedVal)) throw new Error(`Function '${type}' returned non-numeric value`);
        this.scenario.data.depth.currentValue = seedVal;
      } catch (err) {
        console.error(`❌ depth generator seed error: ${err.message}`);
        process.exit(1);
      }
    }

    // Wind speed first (dependency)
    if (this.scenario.data.wind && this.scenario.data.wind.speed) {
      const type = this.scenario.data.wind.speed.type;
      const fn = this.scenarioFunctions.get(type);
      if (!fn) throw new Error(`Function not compiled: ${type}`);
      startTimer(timing.wind, () => {
        try {
          const val = fn(buildCtx(this.scenario.data.wind.speed));
          if (!Number.isFinite(val)) throw new Error(`Function '${type}' returned non-numeric value`);
          this.scenario.data.wind.speed.currentValue = val;
        } catch (err) {
          console.error(`❌ wind.speed generator error: ${err.message}`);
          process.exit(1);
        }
      });
      // Seed initial wind speed
      try {
        const seedVal = fn(buildCtx(this.scenario.data.wind.speed));
        if (!Number.isFinite(seedVal)) throw new Error(`Function '${type}' returned non-numeric value`);
        this.scenario.data.wind.speed.currentValue = seedVal;
      } catch (err) {
        console.error(`❌ wind.speed generator seed error: ${err.message}`);
        process.exit(1);
      }
    }

    // Wind angle
    if (this.scenario.data.wind && this.scenario.data.wind.angle) {
      const type = this.scenario.data.wind.angle.type;
      const fn = this.scenarioFunctions.get(type);
      if (!fn) throw new Error(`Function not compiled: ${type}`);
      startTimer(timing.wind, () => {
        try {
          const val = fn(buildCtx(this.scenario.data.wind.angle));
          if (!Number.isFinite(val)) throw new Error(`Function '${type}' returned non-numeric value`);
          this.scenario.data.wind.angle.currentValue = val;
        } catch (err) {
          console.error(`❌ wind.angle generator error: ${err.message}`);
          process.exit(1);
        }
      });
      // Seed initial wind angle
      try {
        const seedVal = fn(buildCtx(this.scenario.data.wind.angle));
        if (!Number.isFinite(seedVal)) throw new Error(`Function '${type}' returned non-numeric value`);
        this.scenario.data.wind.angle.currentValue = seedVal;
      } catch (err) {
        console.error(`❌ wind.angle generator seed error: ${err.message}`);
        process.exit(1);
      }
    }

    // Speed (depends on wind speed)
    if (this.scenario.data.speed) {
      const type = this.scenario.data.speed.type;
      const fn = this.scenarioFunctions.get(type);
      if (!fn) throw new Error(`Function not compiled: ${type}`);
      startTimer(timing.speed, () => {
        try {
          const ctx = buildCtx(this.scenario.data.speed);
          if (ctx.windSpeed === undefined) {
            throw new Error(`Missing dependency 'windSpeed' for speed generator (ensure wind.speed is defined and generating first)`);
          }
          const val = fn(ctx);
          if (!Number.isFinite(val)) throw new Error(`Function '${type}' returned non-numeric value`);
          this.scenario.data.speed.currentValue = val;
        } catch (err) {
          console.error(`❌ speed generator error: ${err.message}`);
          process.exit(1);
        }
      });
      // Seed initial speed (after wind speed seeding)
      try {
        const ctx = buildCtx(this.scenario.data.speed);
        if (ctx.windSpeed === undefined) {
          throw new Error(`Missing dependency 'windSpeed' for speed generator (ensure wind.speed is defined and generating first)`);
        }
        const seedVal = fn(ctx);
        if (!Number.isFinite(seedVal)) throw new Error(`Function '${type}' returned non-numeric value`);
        this.scenario.data.speed.currentValue = seedVal;
      } catch (err) {
        console.error(`❌ speed generator seed error: ${err.message}`);
        process.exit(1);
      }
    }

    // GPS requires explicit function; no built-ins allowed in strict mode
    if (this.scenario.data.gps) {
      const node = this.scenario.data.gps;
      if (!node.type) throw new Error('data.gps.type is required');
      const fn = this.scenarioFunctions.get(node.type);
      if (!fn) {
        throw new Error(`functions.${node.type} not defined. Strict mode forbids implicit GPS generators.`);
      }
      startTimer(timing.gps, () => {
        try {
          const result = fn(buildCtx(node));
          if (!result || typeof result !== 'object') {
            throw new Error(`GPS function '${node.type}' must return an object with time, date, latitude, latHemisphere, longitude, lonHemisphere`);
          }
          Object.assign(node, result);
        } catch (err) {
          console.error(`❌ gps generator error: ${err.message}`);
          process.exit(1);
        }
      });
      // Seed initial GPS fields
      try {
        const result = fn(buildCtx(node));
        if (!result || typeof result !== 'object') {
          throw new Error(`GPS function '${node.type}' must return an object with time, date, latitude, latHemisphere, longitude, lonHemisphere`);
        }
        Object.assign(node, result);
      } catch (err) {
        console.error(`❌ gps generator seed error: ${err.message}`);
        process.exit(1);
      }
    }
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('\n🛑 Shutting down Enhanced NMEA Bridge Simulator...');
    
    this.isRunning = false;
    
    // Clear intervals
    if (this.messageInterval) {
      clearInterval(this.messageInterval);
    }
    
    // Close all client connections
    this.clients.forEach((client, clientId) => {
      try {
        if (client.type === 'tcp' && client.socket) {
          client.socket.destroy();
        } else if (client.type === 'websocket' && client.socket) {
          client.socket.close();
        }
      } catch (error) {
        console.error(`❌ Error closing client ${clientId}:`, error.message);
      }
    });
    
    // Close servers
    if (this.tcpServer) {
      this.tcpServer.close();
    }
    
    if (this.udpServer) {
      this.udpServer.close();
    }
    
    if (this.wsServer) {
      this.wsServer.close();
    }
    
    console.log('✅ Simulator stopped');
    process.exit(0);
  }
}

// CLI interface
function parseArguments() {
  const args = process.argv.slice(2);
  const config = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--scenario':
        config.scenario = args[++i];
        break;
      case '--bridge-mode':
        config.bridgeMode = args[++i];
        break;
      case '--recording':
        config.recording = args[++i];
        break;
      case '--speed':
        config.speed = parseFloat(args[++i]);
        break;
      case '--loop':
        config.loop = true;
        break;
      case '--playback-mode':
        config.playbackMode = args[++i];
        break;
      case '--help':
        console.log(`
Usage: node nmea-bridge-simulator.js [options]

Options:
  --scenario <name>     Load test scenario (basic-navigation, autopilot-engagement)
  --bridge-mode <mode>  Set bridge mode (nmea0183, nmea2000)
  --recording <file>    Play JSON recording file with precise timing
  --speed <factor>      Playback speed (0.5x to 10x), default: 1.0
  --loop               Loop recording continuously
  --playback-mode <mode> Playback mode: 'global' (default) or 'per-client'
  --help               Show this help message

Examples:
  node nmea-bridge-simulator.js
  node nmea-bridge-simulator.js --scenario basic-navigation
  node nmea-bridge-simulator.js --bridge-mode nmea2000
  node nmea-bridge-simulator.js --recording nmea_recording_20250720_003925.json
  node nmea-bridge-simulator.js --recording large_test_recording.gz --speed 2.0 --loop
  node nmea-bridge-simulator.js --recording file.json --playback-mode per-client --loop
        `);
        process.exit(0);
        break;
    }
  }
  
  return config;
}

// Main execution
if (require.main === module) {
  const config = parseArguments();
  const simulator = new NMEABridgeSimulator();
  
  // Initialize and start BMAD Integration API
  let bmadApi = null;
  try {
    const { BMADIntegrationAPI } = require('./bmad-integration-api');
    bmadApi = new BMADIntegrationAPI(simulator);
    
    // Start BMAD API server
    bmadApi.start().then(() => {
      console.log('🔗 BMAD Agent Integration API ready');
    }).catch((error) => {
      console.error('❌ Failed to start BMAD API:', error.message);
    });
  } catch (error) {
    console.warn('⚠️  BMAD Integration API not available:', error.message);
  }
  
  // Graceful shutdown handling
  process.on('SIGINT', async () => {
    if (bmadApi) {
      await bmadApi.stop();
    }
    simulator.shutdown();
  });
  
  process.on('SIGTERM', async () => {
    if (bmadApi) {
      await bmadApi.stop();
    }
    simulator.shutdown();
  });
  
  // Start the simulator
  simulator.start(config).catch((error) => {
    console.error('❌ Failed to start simulator:', error);
    process.exit(1);
  });
}

module.exports = { NMEABridgeSimulator };