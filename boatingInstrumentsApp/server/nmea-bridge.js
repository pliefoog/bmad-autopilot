#!/usr/bin/env node

/**
 * Unified NMEA Bridge Tool
 *
 * Single entry point consolidating three operational modes:
 * - Live Mode: Connect to hardware NMEA WiFi bridge
 * - File Mode: Playback NMEA data from recorded files
 * - Scenario Mode: Generate synthetic NMEA data from scenarios
 *
 * Features:
 * - Multi-protocol server support (TCP:2000, UDP:10110, WebSocket:8080)
 * - Simulator Control API (port 9090) for external tools
 * - Mode-based data source abstraction
 * - Performance optimized for 500+ msg/sec, <100MB RAM
 *
 * Usage:
 *   Live Mode:    node nmea-bridge.js --live <host> <port>
 *   File Mode:    node nmea-bridge.js --file <path> [--rate <n>] [--loop]
 *   Scenario Mode: node nmea-bridge.js --scenario <name> [--loop] [--speed <n>]
 *
 * Epic 10.3 - Tool Consolidation & Unified CLI
 */

const path = require('path');
const fs = require('fs');

// Import consolidated components
const ProtocolServers = require('./lib/protocol-servers');
const { SimulatorControlAPI } = require('./simulator-control-api');

// Import data source providers
const LiveDataSource = require('./lib/data-sources/live');
const FileDataSource = require('./lib/data-sources/file');
const ScenarioDataSource = require('./lib/data-sources/scenario');

class UnifiedNMEABridge {
  constructor() {
    this.mode = null;
    this.config = null;
    this.dataSource = null;
    this.protocolServers = new ProtocolServers();
    this.controlAPI = new SimulatorControlAPI(this);
    this.isRunning = false;
    this.startTime = null;

    // Properties expected by SimulatorControlAPI (will be set after protocol servers start)
    this.clients = new Map();
    this.stats = {
      totalMessages: 0,
      messagesPerSecond: 0,
    };
  }

  /**
   * Validate that a scenario exists (either as file or built-in)
   */
  validateScenarioExists(scenarioName) {
    // If it's already a path (contains slashes), check if it exists directly
    if (scenarioName.includes('/') || scenarioName.includes('\\')) {
      const marineAssetsPath = path.join(
        __dirname,
        '../../marine-assets/test-scenarios',
        scenarioName,
      );
      if (fs.existsSync(`${marineAssetsPath}.yml`) || fs.existsSync(`${marineAssetsPath}.yaml`)) {
        return true;
      }
      return fs.existsSync(path.resolve(scenarioName));
    }

    // Check for YAML files in common scenario locations
    const possiblePaths = [
      // Local scenarios directory
      path.join(__dirname, 'scenarios', `${scenarioName}.yml`),
      path.join(__dirname, 'scenarios', scenarioName, 'scenario.yml'),
      path.join(__dirname, 'scenarios', `${scenarioName}.yaml`),
      // Marine assets test scenarios (root level)
      path.join(__dirname, '../../marine-assets/test-scenarios', `${scenarioName}.yml`),
      path.join(__dirname, '../../marine-assets/test-scenarios', `${scenarioName}.yaml`),
    ];

    for (const scenarioPath of possiblePaths) {
      if (fs.existsSync(scenarioPath)) {
        return true;
      }
    }

    // Recursively search subdirectories in marine-assets/test-scenarios
    const marineAssetsDir = path.join(__dirname, '../../marine-assets/test-scenarios');
    if (fs.existsSync(marineAssetsDir)) {
      try {
        const foundInSubdir = this.findScenarioInSubdirectories(marineAssetsDir, scenarioName);
        if (foundInSubdir) return true;
      } catch (error) {
        // Ignore errors
      }
    }

    // Check built-in scenarios (legacy JS-based scenarios)
    const builtInScenarios = [
      'basic-navigation',
      'coastal-sailing',
      'autopilot-engagement',
      'multi-equipment-detection',
      'electrical-widget-validation',
    ];
    return builtInScenarios.includes(scenarioName);
  }

  /**
   * Recursively search for scenario file in subdirectories
   */
  findScenarioInSubdirectories(baseDir, scenarioName) {
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subDirPath = path.join(baseDir, entry.name);
        // Check for scenario file in this subdirectory
        const ymlPath = path.join(subDirPath, `${scenarioName}.yml`);
        const yamlPath = path.join(subDirPath, `${scenarioName}.yaml`);

        if (fs.existsSync(ymlPath) || fs.existsSync(yamlPath)) {
          return true;
        }

        // Recurse into subdirectory
        if (this.findScenarioInSubdirectories(subDirPath, scenarioName)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * List available scenarios for help output
   */
  listAvailableScenarios() {
    console.error('Built-in scenarios:');
    console.error('  • basic-navigation         - Standard depth, speed, wind, and GPS data');
    console.error('  • coastal-sailing          - Realistic coastal sailing conditions');
    console.error('  • autopilot-engagement     - Complete autopilot workflow');
    console.error('  • multi-equipment-detection - Multi-instance equipment testing');
    console.error('  • electrical-widget-validation - Multi-battery electrical system testing');

    // Recursively discover all scenario files
    const scenariosDir = path.join(__dirname, '..', '..', 'marine-assets', 'test-scenarios');
    if (fs.existsSync(scenariosDir)) {
      try {
        const scenarios = this.discoverAllScenarios(scenariosDir, scenariosDir);

        if (scenarios.length > 0) {
          console.error('');
          console.error('File-based scenarios (use path format: folder/name):');
          scenarios.sort().forEach((scenario) => {
            console.error(`  • ${scenario}`);
          });
        }
      } catch (error) {
        // Ignore errors reading scenarios directory
      }
    }
  }

  /**
   * Recursively discover all scenario files in directory tree
   */
  discoverAllScenarios(currentDir, baseDir) {
    const scenarios = [];

    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Recurse into subdirectories
          const subScenarios = this.discoverAllScenarios(fullPath, baseDir);
          scenarios.push(...subScenarios);
        } else if (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml')) {
          // Calculate relative path from base directory
          const relativePath = path.relative(baseDir, fullPath);
          const scenarioName = relativePath.replace(/\.(yml|yaml)$/, '');
          scenarios.push(scenarioName);
        }
      }
    } catch (error) {
      // Ignore errors reading directory
    }

    return scenarios;
  }

  /**
   * Parse command line arguments and initialize configuration
   */
  parseArguments() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
      this.showHelp();
      process.exit(0);
    }

    const mode = args[0];

    switch (mode) {
      case '--live':
        return this.parseLiveMode(args.slice(1));
      case '--file':
        return this.parseFileMode(args.slice(1));
      case '--scenario':
        return this.parseScenarioMode(args.slice(1));
      case '--validate':
        return this.parseValidateMode(args.slice(1));
      default:
        console.error(`❌ Unknown mode: ${mode}`);
        this.showHelp();
        process.exit(1);
    }
  }

  /**
   * Parse live mode arguments
   */
  parseLiveMode(args) {
    if (args.length < 2) {
      console.error('❌ Live mode requires host and port');
      console.error('Usage: node nmea-bridge.js --live <host> <port>');
      process.exit(1);
    }

    return {
      mode: 'live',
      host: args[0],
      port: parseInt(args[1]),
      options: this.parseCommonOptions(args.slice(2)),
    };
  }

  /**
   * Parse file mode arguments
   */
  parseFileMode(args) {
    if (args.length < 1) {
      console.error('❌ File mode requires a file path');
      console.error('Usage: node nmea-bridge.js --file <path> [--rate <n>] [--loop]');
      process.exit(1);
    }

    const filePath = args[0];
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    const options = this.parseCommonOptions(args.slice(1));

    return {
      mode: 'file',
      filePath: path.resolve(filePath),
      rate: options.rate || 10,
      loop: options.loop || false,
      options,
    };
  }

  /**
   * Parse scenario mode arguments
   */
  parseScenarioMode(args) {
    if (args.length < 1) {
      console.error('❌ Scenario mode requires a scenario name');
      console.error('Usage: node nmea-bridge.js --scenario <name> [--loop] [--speed <n>]');
      process.exit(1);
    }

    const scenarioName = args[0];

    // Validate scenario exists before starting servers
    if (!this.validateScenarioExists(scenarioName)) {
      console.error(`❌ Scenario not found: ${scenarioName}`);
      console.error('');
      console.error('Available scenarios:');
      this.listAvailableScenarios();
      process.exit(1);
    }

    const options = this.parseCommonOptions(args.slice(1));

    return {
      mode: 'scenario',
      scenarioName: scenarioName,
      loop: options.loop || false,
      speed: options.speed || 1.0,
      bridgeMode: options.bridgeMode || 'nmea0183',
      options,
    };
  }

  /**
   * Parse validate mode arguments
   */
  parseValidateMode(args) {
    if (args.length < 1) {
      console.error('❌ Validate mode requires a scenario file path');
      console.error('Usage: node nmea-bridge.js --validate <path-to-scenario.yml>');
      process.exit(1);
    }

    const scenarioPath = args[0];

    // Check if file exists
    if (!fs.existsSync(scenarioPath)) {
      console.error(`❌ Scenario file not found: ${scenarioPath}`);
      process.exit(1);
    }

    return {
      mode: 'validate',
      scenarioPath: path.resolve(scenarioPath),
    };
  }

  /**
   * Parse common options across all modes
   */
  parseCommonOptions(args) {
    const options = {};

    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case '--bridge-mode':
          options.bridgeMode = args[++i];
          break;
        case '--rate':
          options.rate = parseInt(args[++i]);
          break;
        case '--speed':
          options.speed = parseFloat(args[++i]);
          break;
        case '--loop':
          options.loop = true;
          break;
        case '--verbose':
        case '-v':
          options.verbose = true;
          break;
        case '--quiet':
        case '-q':
          options.quiet = true;
          break;
        default:
          console.warn(`⚠️  Unknown option: ${args[i]}`);
      }
    }

    return options;
  }

  /**
   * Initialize data source based on mode
   */
  async initializeDataSource(config) {
    switch (config.mode) {
      case 'live':
        this.dataSource = new LiveDataSource(config);
        break;
      case 'file':
        this.dataSource = new FileDataSource(config);
        break;
      case 'scenario':
        this.dataSource = new ScenarioDataSource(config);
        break;
      default:
        throw new Error(`Unsupported mode: ${config.mode}`);
    }

    // Connect data source to protocol servers
    this.dataSource.on('data', (message) => {
      this.protocolServers.broadcast(message);
      this.stats.totalMessages++;
    });

    this.dataSource.on('error', (error) => {
      console.error('❌ Data source error:', error);
    });

    this.dataSource.on('status', (status) => {
      if (!config.options.quiet) {
        console.log(`📡 Status: ${status}`);
      }
    });
  }

  /**
   * Validate scenario file against JSON schema
   */
  async validateScenario(scenarioPath) {
    const Ajv = require('ajv');
    const yaml = require('js-yaml');

    try {
      console.log(`\n📋 Validating scenario: ${path.basename(scenarioPath)}`);
      console.log(`📂 Path: ${scenarioPath}\n`);

      // Load schema
      const schemaPath = path.join(
        __dirname,
        '../../marine-assets/test-scenarios/scenario.schema.json',
      );
      if (!fs.existsSync(schemaPath)) {
        console.error(`❌ Schema file not found: ${schemaPath}`);
        process.exit(1);
      }

      const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

      // Load scenario YAML
      const scenarioContent = fs.readFileSync(scenarioPath, 'utf8');
      const scenario = yaml.load(scenarioContent);

      // Validate with Ajv
      const ajv = new Ajv({ allErrors: true, verbose: true });
      const validate = ajv.compile(schema);
      const valid = validate(scenario);

      if (valid) {
        console.log('✅ Scenario is VALID');
        console.log(`\n📊 Summary:`);
        console.log(`   • Name: ${scenario.name}`);
        console.log(`   • Category: ${scenario.category}`);
        console.log(`   • Duration: ${scenario.duration}s`);
        console.log(`   • Version: ${scenario.version}`);

        if (scenario.bridge_mode) {
          console.log(`   • Bridge Mode: ${scenario.bridge_mode}`);
        }

        if (scenario.sensors) {
          console.log(`   • Sensors: ${scenario.sensors.length}`);
          const sensorTypes = {};
          scenario.sensors.forEach((s) => {
            sensorTypes[s.type] = (sensorTypes[s.type] || 0) + 1;
          });
          Object.entries(sensorTypes).forEach(([type, count]) => {
            console.log(`      - ${type}: ${count}`);
          });
        }

        if (scenario.data) {
          console.log(`   • Uses legacy 'data' format (consider migrating to 'sensors')`);
        }

        console.log('\n✅ Validation passed!\n');
        process.exit(0);
      } else {
        console.error('❌ Scenario is INVALID\n');
        console.error('Validation errors:\n');

        validate.errors.forEach((err, idx) => {
          console.error(`${idx + 1}. ${err.instancePath || '/'}`);
          console.error(`   ${err.message}`);
          if (err.params) {
            console.error(`   Params: ${JSON.stringify(err.params, null, 2)}`);
          }
          console.error('');
        });

        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Validation failed with error:\n');
      console.error(error.message);
      if (error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  /**
   * Start the unified bridge
   */
  async start() {
    try {
      this.config = this.parseArguments();

      // Handle validate mode separately (doesn't need servers)
      if (this.config.mode === 'validate') {
        return await this.validateScenario(this.config.scenarioPath);
      }

      console.log(`🚀 Starting NMEA Bridge in ${this.config.mode} mode...`);

      // Initialize data source
      await this.initializeDataSource(this.config);

      // Start protocol servers
      const serverConfig = {
        server: {
          ports: {
            tcp: 2000,
            udp: 10110,  // NMEA 0183 standard multicast port
            websocket: 8080,
            api: 9090,
          },
          maxClients: 50,
          timeoutMs: 30000,
          bindHost: '0.0.0.0',
        },
      };

      await this.protocolServers.start(serverConfig);

      // Reference the protocol servers' clients map for control API compatibility
      this.clients = this.protocolServers.clients;

      // Start control API
      await this.controlAPI.start();

      // Start data source
      await this.dataSource.start();

      this.isRunning = true;
      this.startTime = Date.now();

      console.log('✅ NMEA Bridge ready!');
      console.log(`📡 Mode: ${this.config.mode.toUpperCase()}`);
      console.log('🌐 Protocol Servers:');
      console.log('   • TCP: localhost:2000');
      console.log('   • UDP: localhost:10110 (NMEA 0183 standard)');
      console.log('   • WebSocket: localhost:8080');
      console.log('🔧 Control API: localhost:9090');

      // Setup graceful shutdown
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());
    } catch (error) {
      console.error('❌ Failed to start NMEA Bridge:', error.message);
      if (this.config?.options?.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  /**
   * Shutdown the bridge gracefully
   */
  async shutdown() {
    if (!this.isRunning) return;

    console.log('\n🛑 Shutting down NMEA Bridge...');

    try {
      if (this.dataSource) {
        await this.dataSource.stop();
      }

      if (this.controlAPI) {
        await this.controlAPI.stop();
      }

      if (this.protocolServers) {
        await this.protocolServers.stop();
      }

      this.isRunning = false;
      console.log('✅ NMEA Bridge stopped gracefully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error.message);
      process.exit(1);
    }
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log(`
🌊 Unified NMEA Bridge Tool v3.0

DESCRIPTION:
  Single CLI tool for all NMEA testing needs - replaces three separate tools
  with unified mode-based operation supporting live hardware, file playback, 
  and scenario generation.

USAGE:
  node nmea-bridge.js <mode> [options]

MODES:
  --live <host> <port>           Connect to hardware NMEA WiFi bridge
  --file <path> [options]        Playback NMEA data from recorded file
  --scenario <name> [options]    Generate synthetic NMEA data
  --validate <path>              Validate scenario YAML against JSON schema

LIVE MODE OPTIONS:
  <host>                         NMEA WiFi bridge hostname or IP
  <port>                         NMEA WiFi bridge port (typically 10110)

FILE MODE OPTIONS:
  <path>                         Path to NMEA recording file
  --rate <n>                     Playback rate in messages/second (default: 10)
  --loop                         Loop playback continuously

SCENARIO MODE OPTIONS:
  <name>                         Scenario name (e.g., 'basic-navigation')
  --loop                         Loop scenario continuously  
  --speed <n>                    Simulation speed multiplier (default: 1.0)
  --bridge-mode <mode>           Output mode: nmea0183|nmea2000|hybrid (default: nmea0183)

VALIDATE MODE OPTIONS:
  <path>                         Path to scenario YAML file to validate

COMMON OPTIONS:
  --verbose, -v                  Enable verbose logging
  --quiet, -q                    Suppress status messages
  --help, -h                     Show this help message

EXAMPLES:
  node nmea-bridge.js --live 192.168.1.10 10110
  node nmea-bridge.js --file recordings/sailing.nmea --rate 20 --loop
  node nmea-bridge.js --scenario navigation/coastal-sailing --loop --bridge-mode nmea2000
  node nmea-bridge.js --validate marine-assets/test-scenarios/navigation/basic-navigation.yml

PROTOCOL SERVERS:
  TCP: localhost:2000            Standard NMEA TCP connection
  UDP: localhost:10110           High-frequency data streaming (NMEA 0183 standard)
  WebSocket: localhost:8080      Browser-compatible connection
  Control API: localhost:9090    External tool control

More info: https://github.com/pliefoog/bmad-autopilot/tree/master/docs
`);
  }

  /**
   * Get current status for external tools
   */
  getStatus() {
    return {
      mode: this.config?.mode || 'stopped',
      isRunning: this.isRunning,
      uptime: this.isRunning ? Date.now() - this.startTime : 0,
      dataSource: this.dataSource?.getStatus() || null,
      protocolServers: this.protocolServers?.getStatus() || null,
    };
  }
}

// Start the bridge if called directly
if (require.main === module) {
  const bridge = new UnifiedNMEABridge();
  bridge.start();
}

module.exports = { UnifiedNMEABridge };
