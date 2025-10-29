#!/usr/bin/env node

/**
 * NMEA Bridge Simulator - Main Orchestrator
 * 
 * Multi-protocol server orchestrator supporting TCP, UDP, and WebSocket connections
 * for marine instrument development and testing WITHOUT physical hardware.
 * 
 * Features:
 * - Modular component architecture with dependency injection
 * - TCP/UDP/WebSocket server management via ProtocolServers component
 * - NMEA sentence generation via NmeaGenerator component  
 * - High-precision message scheduling via MessageScheduler component
 * - Recording playback management via SessionRecorder component
 * - Scenario-based data streaming with parameter injection
 * - Bidirectional autopilot command processing
 * - Performance monitoring and metrics collection
 * 
 * Usage:
 *   node simulator-main.js [--scenario basic-navigation] [--bridge-mode nmea0183|nmea2000]
 *   node simulator-main.js --recording path/to/recording.json [--speed 2.0] [--loop]
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Import modular components
const ProtocolServers = require('./lib/protocol-servers');
const { NmeaGenerator } = require('./nmea-generator');
const { MessageScheduler } = require('./message-scheduler');
const { SessionRecorder } = require('./session-recorder');
const { SimulatorControlAPI } = require('./simulator-control-api');

// Configuration constants
const DEFAULT_CONFIG = {
  server: {
    ports: {
      tcp: 2000,
      udp: 2000,
      websocket: 8080,
      api: 9090
    },
    maxClients: 50,
    timeoutMs: 30000,
    bindHost: '0.0.0.0'
  },
  nmea: {
    messageInterval: 1000,
    bridgeMode: 'nmea0183'
  },
  scenarios: {
    speed: 1.0
  },
  recording: {
    speed: 1.0,
    loop: false,
    mode: 'global'
  }
};

class NMEABridgeSimulator {
  constructor() {
    // Initialize component instances
    this.protocolServers = new ProtocolServers();
    this.nmeaGenerator = new NmeaGenerator();
    this.messageScheduler = new MessageScheduler();
    this.sessionRecorder = new SessionRecorder();
    this.controlAPI = new SimulatorControlAPI(this);
    
    // Configuration and state
    this.config = { ...DEFAULT_CONFIG };
    this.isRunning = false;
    this.scenario = null;
    this.scenarioFunctions = new Map();
    this.strictScenario = false;
    
    // Autopilot state (shared across components)
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
      memoryUsage: 0,
      uptime: 0,
      startTime: null
    };

    // Bind message handlers
    this.handleClientMessage = this.handleClientMessage.bind(this);
    this.handleConnectionEvent = this.handleConnectionEvent.bind(this);
    this.broadcastMessage = this.broadcastMessage.bind(this);
    this.generateMessages = this.generateMessages.bind(this);
    this.sendClientMessage = this.sendClientMessage.bind(this);
  }

  /**
   * Start the simulator with configuration
   */
  async start(config = {}) {
    if (this.isRunning) {
      throw new Error('Simulator is already running');
    }

    // Merge provided config with defaults
    this.config = this.mergeConfig(DEFAULT_CONFIG, config);
    this.stats.startTime = Date.now();

    console.log('🌐 Enhanced NMEA Bridge Simulator (Modular Architecture)');
    console.log('=====================================================');
    this.displayNetworkInfo();
    console.log('');

    try {
      // Start all components in dependency order
      await this.startComponents();
      
      // Configure component interactions
      this.setupComponentInteractions();
      
      // Handle scenario or recording setup
      if (config.recording) {
        await this.setupRecordingPlayback(config);
      } else if (config.scenario) {
        await this.setupScenarioGeneration(config);
      } else {
        await this.setupBasicGeneration();
      }

      this.isRunning = true;
      console.log('✅ NMEA Bridge Simulator started successfully');
      console.log('📊 Use Ctrl+C to stop the simulator');
      
    } catch (error) {
      console.error('❌ Failed to start simulator:', error.message);
      await this.shutdown();
      throw error;
    }
  }

  /**
   * Shutdown the simulator gracefully
   */
  async shutdown() {
    if (!this.isRunning) {
      return;
    }

    console.log('🔌 Shutting down NMEA Bridge Simulator...');
    this.isRunning = false;

    // Stop components in reverse dependency order
    await this.stopComponents();
    
    // Clear state
    this.scenario = null;
    this.scenarioFunctions.clear();
    this.stats.startTime = null;
    
    console.log('✅ NMEA Bridge Simulator shut down complete');
  }

  /**
   * Start all components
   * @private
   */
  async startComponents() {
    console.log('🚀 Starting simulator components...');
    
    // Start components in dependency order
    await this.sessionRecorder.start(this.config);
    await this.nmeaGenerator.start(this.config);
    await this.messageScheduler.start(this.config);
    await this.protocolServers.start(this.config);
    await this.controlAPI.start(this.config.server.ports.api);
    
    console.log('✅ All components started');
  }

  /**
   * Stop all components
   * @private
   */
  async stopComponents() {
    const stopPromises = [];
    
    // Stop in reverse order
    stopPromises.push(this.controlAPI.stop());
    stopPromises.push(this.protocolServers.stop());
    stopPromises.push(this.messageScheduler.stop());
    stopPromises.push(this.nmeaGenerator.stop());
    stopPromises.push(this.sessionRecorder.stop());
    
    await Promise.all(stopPromises);
    console.log('✅ All components stopped');
  }

  /**
   * Setup component interactions and callbacks
   * @private
   */
  setupComponentInteractions() {
    // Protocol servers -> message handling
    this.protocolServers.registerMessageHandler('message', this.handleClientMessage);
    this.protocolServers.registerMessageHandler('connection', this.handleConnectionEvent);
    
    // Message scheduler -> generation and broadcasting
    this.messageScheduler.setMessageGenerator(this.generateMessages);
    this.messageScheduler.setMessageBroadcaster(this.broadcastMessage);
    
    // Session recorder -> message broadcasting
    this.sessionRecorder.setMessageBroadcaster(this.broadcastMessage);
    this.sessionRecorder.setClientMessageCallback(this.sendClientMessage);
    
    // NMEA generator -> autopilot state
    this.nmeaGenerator.setAutopilotState(this.autopilotState);
  }

  /**
   * Setup recording playback
   * @private
   */
  async setupRecordingPlayback(config) {
    console.log('📼 Setting up recording playback...');
    
    try {
      await this.sessionRecorder.loadRecording(
        config.recording,
        config.speed || 1.0,
        config.loop || false,
        config.playbackMode || 'global'
      );
      
      if (config.playbackMode === 'global') {
        const playbackConfig = this.sessionRecorder.startGlobalPlayback();
        if (playbackConfig) {
          this.messageScheduler.scheduleRecordingPlayback(
            playbackConfig.messages,
            playbackConfig.speed,
            playbackConfig.loop
          );
        }
      } else {
        console.log('📱 Per-client playback mode: waiting for client connections');
      }
      
    } catch (error) {
      console.error('❌ Failed to setup recording playback:', error.message);
      throw error;
    }
  }

  /**
   * Setup scenario-based generation
   * @private
   */
  async setupScenarioGeneration(config) {
    console.log('🎭 Setting up scenario generation...');
    
    try {
      await this.loadScenario(config.scenario);
      this.initializeScenarioRuntime();
      
      // Pass scenario data to generator
      this.nmeaGenerator.setScenario(this.scenario, this.scenarioFunctions, this.strictScenario);
      
      // Start scheduled generation with scenario timing
      const timing = this.scenario?.timing;
      this.messageScheduler.startScheduledGeneration(timing);
      
      if (config.scenarioSpeed) {
        this.messageScheduler.setScenarioSpeed(config.scenarioSpeed);
      }
      
    } catch (error) {
      console.error('❌ Failed to setup scenario generation:', error.message);
      throw error;
    }
  }

  /**
   * Setup basic algorithmic generation
   * @private
   */
  async setupBasicGeneration() {
    console.log('🔧 Setting up basic NMEA generation...');
    
    // Start basic scheduled generation
    this.messageScheduler.startScheduledGeneration();
  }

  /**
   * Handle incoming client messages
   * @private
   */
  handleClientMessage(clientId, message) {
    console.log(`📡 Message from ${clientId}: ${message.trim().substring(0, 50)}...`);
    
    // Check if it's an autopilot command
    if (this.isAutopilotCommand(message)) {
      this.processAutopilotCommand(message, clientId);
    }
  }

  /**
   * Handle connection events
   * @private
   */
  handleConnectionEvent(event, clientId, error = null) {
    switch (event) {
      case 'connect':
        this.stats.connectedClients++;
        // Start per-client playback if in per-client recording mode
        if (this.sessionRecorder.isRecordingLoaded()) {
          const playbackConfig = this.sessionRecorder.startClientPlayback(clientId);
          if (playbackConfig) {
            this.messageScheduler.scheduleClientPlayback(
              clientId,
              playbackConfig.messages,
              playbackConfig.speed,
              playbackConfig.loop,
              playbackConfig.clientCallback
            );
          }
        }
        break;
        
      case 'disconnect':
        this.stats.connectedClients = Math.max(0, this.stats.connectedClients - 1);
        this.sessionRecorder.stopClientPlayback(clientId);
        this.messageScheduler.stopClientPlayback(clientId);
        break;
        
      case 'error':
        console.warn(`⚠️ Client error for ${clientId}:`, error?.message || 'Unknown error');
        this.stats.connectedClients = Math.max(0, this.stats.connectedClients - 1);
        this.sessionRecorder.stopClientPlayback(clientId);
        this.messageScheduler.stopClientPlayback(clientId);
        break;
    }
  }

  /**
   * Generate NMEA messages (callback for scheduler)
   * @private
   */
  generateMessages(messageTypes = null, timing = null) {
    if (messageTypes && timing) {
      // Selective generation based on message types
      return this.nmeaGenerator.generateSelectiveMessages(timing);
    } else {
      // Generate all messages
      return this.nmeaGenerator.generateAllMessages();
    }
  }

  /**
   * Broadcast message to all clients (callback for components)
   * @private
   */
  broadcastMessage(message) {
    const result = this.protocolServers.broadcast(message);
    this.stats.totalMessages += result.successCount;
    return result;
  }

  /**
   * Send message to specific client (callback for session recorder)
   * @private
   */
  sendClientMessage(clientId, message) {
    // This would need to be implemented in protocol servers
    // For now, just broadcast (could be enhanced to target specific clients)
    this.broadcastMessage(message);
  }

  /**
   * Check if message is an autopilot command
   * @private
   */
  isAutopilotCommand(message) {
    // NMEA 0183 bridge mode: $PCDIN-encapsulated commands
    if (message.startsWith('$PCDIN,')) {
      return true;
    }
    
    // NMEA 2000 bridge mode: Native PGN messages (simplified check)
    if (this.config.nmea.bridgeMode === 'nmea2000' && message.includes('PGN')) {
      return true;
    }
    
    return false;
  }

  /**
   * Process autopilot commands
   * @private
   */
  processAutopilotCommand(command, clientId) {
    try {
      if (command.startsWith('$PCDIN,')) {
        // Parse NMEA 0183 encapsulated command
        this.parsePCDINCommand(command);
      } else if (this.config.nmea.bridgeMode === 'nmea2000') {
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
   * @private
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
   * @private
   */
  parseNMEA2000PGN(pgn) {
    // Simplified NMEA 2000 PGN parser
    console.log(`🎮 Processing NMEA 2000 PGN: ${pgn}`);
    // Implementation would depend on specific PGN format
  }

  /**
   * Broadcast autopilot status update
   * @private
   */
  broadcastAutopilotStatus() {
    const statusMessage = JSON.stringify({
      type: 'autopilot-status',
      data: this.autopilotState,
      timestamp: Date.now()
    });
    
    // Broadcast to WebSocket clients only (for status updates)
    // This would need protocol server enhancement to target specific protocols
    this.broadcastMessage(statusMessage);
  }

  /**
   * Load scenario configuration
   * @private
   */
  async loadScenario(scenarioName) {
    const scenarioPath = this.findScenarioFile(scenarioName);
    
    if (!fs.existsSync(scenarioPath)) {
      throw new Error(`Scenario file not found: ${scenarioPath}`);
    }

    console.log(`🎭 Loading scenario: ${scenarioName}`);
    
    const yamlContent = fs.readFileSync(scenarioPath, 'utf8');
    this.scenario = yaml.load(yamlContent);
    
    // Validate scenario structure
    this.validateScenario(this.scenario);
    
    console.log(`✅ Scenario loaded: ${this.scenario.name || scenarioName}`);
  }

  /**
   * Find scenario file path
   * @private
   */
  findScenarioFile(scenarioName) {
    const scenarioPaths = [
      path.join(__dirname, 'vendor', 'test-scenarios', `${scenarioName}.yml`),
      path.join(__dirname, 'vendor', 'test-scenarios', scenarioName),
      path.join(process.cwd(), `${scenarioName}.yml`),
      path.join(process.cwd(), scenarioName)
    ];

    for (const scenarioPath of scenarioPaths) {
      if (fs.existsSync(scenarioPath)) {
        return scenarioPath;
      }
    }

    throw new Error(`Scenario not found: ${scenarioName}`);
  }

  /**
   * Validate scenario structure
   * @private
   */
  validateScenario(scenario) {
    if (!scenario) {
      throw new Error('Empty scenario configuration');
    }

    // Add basic validation logic
    const requiredSections = ['data'];
    for (const section of requiredSections) {
      if (!scenario[section]) {
        console.warn(`⚠️ Scenario missing recommended section: ${section}`);
      }
    }
  }

  /**
   * Initialize scenario runtime (compile functions)
   * @private
   */
  initializeScenarioRuntime() {
    if (!this.scenario || !this.scenario.functions) {
      return;
    }

    console.log('🔧 Initializing scenario runtime...');
    
    // Compile scenario functions
    for (const [name, functionCode] of Object.entries(this.scenario.functions)) {
      try {
        // Create function with context parameter
        const func = new Function('ctx', functionCode);
        this.scenarioFunctions.set(name, func);
        console.log(`✅ Compiled function: ${name}`);
      } catch (error) {
        throw new Error(`Failed to compile function '${name}': ${error.message}`);
      }
    }
    
    console.log(`✅ Scenario runtime initialized (${this.scenarioFunctions.size} functions)`);
  }

  /**
   * Display network connection information
   * @private
   */
  displayNetworkInfo() {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    
    console.log('🔗 Network Servers:');
    Object.keys(interfaces).forEach(name => {
      interfaces[name].forEach(iface => {
        if (iface.family === 'IPv4' && !iface.internal) {
          console.log(`📡 ${name}: TCP:${iface.address}:${this.config.server.ports.tcp}, UDP:${this.config.server.ports.udp}, WS:${this.config.server.ports.websocket}`);
        }
      });
    });
  }

  /**
   * Merge configuration objects
   * @private
   */
  mergeConfig(defaultConfig, userConfig) {
    const merged = { ...defaultConfig };
    for (const [key, value] of Object.entries(userConfig)) {
      merged[key] = typeof value === 'object' && value !== null && !Array.isArray(value) 
        ? { ...defaultConfig[key], ...value } 
        : value;
    }
    return merged;
  }

  /**
   * Get simulator status and metrics
   */
  getStatus() {
    const componentStatuses = {
      protocolServers: this.protocolServers.getStatus(),
      nmeaGenerator: this.nmeaGenerator.getStatus(),
      messageScheduler: this.messageScheduler.getStatus(),
      sessionRecorder: this.sessionRecorder.getStatus()
    };

    const componentMetrics = {
      protocolServers: this.protocolServers.getMetrics(),
      nmeaGenerator: this.nmeaGenerator.getMetrics(),
      messageScheduler: this.messageScheduler.getMetrics(),
      sessionRecorder: this.sessionRecorder.getMetrics()
    };

    // Update main stats
    this.stats.uptime = this.stats.startTime ? Date.now() - this.stats.startTime : 0;
    this.stats.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    this.stats.messagesPerSecond = componentMetrics.messageScheduler.messagesPerSecond;

    return {
      running: this.isRunning,
      uptime: this.stats.uptime,
      stats: this.stats,
      components: componentStatuses,
      metrics: componentMetrics,
      autopilot: this.autopilotState,
      scenario: this.scenario ? { name: this.scenario.name, loaded: true } : { loaded: false }
    };
  }
}

/**
 * Parse command line arguments
 */
function parseArguments() {
  const args = process.argv.slice(2);
  const config = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--scenario':
        config.scenario = args[++i];
        break;
      case '--bridge-mode':
        config.nmea = { ...config.nmea, bridgeMode: args[++i] };
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
        console.log('NMEA Bridge Simulator\nUsage: node simulator-main.js [options]\nOptions: --scenario <name>, --recording <file>, --speed <num>, --loop, --help');
        process.exit(0);
    }
  }
  
  return config;
}

/**
 * Main execution
 */
async function main() {
  const config = parseArguments();
  const simulator = new NMEABridgeSimulator();

  // Setup graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
    try {
      await simulator.shutdown();
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error.message);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Start simulator
  try {
    await simulator.start(config);
  } catch (error) {
    console.error('❌ Failed to start simulator:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error.message);
    process.exit(1);
  });
}

module.exports = NMEABridgeSimulator;