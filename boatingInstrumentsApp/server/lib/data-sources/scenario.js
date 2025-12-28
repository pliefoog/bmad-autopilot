/**
 * Scenario Data Source
 * 
 * Generates synthetic NMEA data based on YAML scenario configurations.
 * Supports loop mode, speed control, and dynamic scenario management.
 * 
 * Extracted from nmea-bridge-simulator.js for Epic 10.3
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const EventEmitter = require('events');
const Ajv = require('ajv');
const NMEA2000BinaryGenerator = require('../nmea2000-binary');

/**
 * Sensor Type Registry - Protocol-agnostic sensor definitions
 * Maps sensor types to NMEA 0183 sentences and NMEA 2000 PGNs with field mappings
 */
const SENSOR_TYPE_REGISTRY = {
  depth_sensor: {
    nmea0183: ['DPT', 'DBT', 'DBK'],  // DPT first - matches real NMEA 2000→0183 bridges (CANboat)
    nmea2000: [128267],
    physical_properties: {
      transducer_depth: { unit: 'm', description: 'Depth of transducer below waterline', nmea0183_field: 'DPT.offset', nmea2000_field: 'byte[8]' },
      keel_offset: { unit: 'm', description: 'Distance from transducer to keel', derived: true },
      max_range: { unit: 'm', description: 'Maximum sensor range' },
      mounting_location: { type: 'string', description: 'Physical mounting position (bow/stern/center)' }
    }
  },
  speed_sensor: {
    nmea0183: ['VHW', 'VTG', 'VLW'],  // VLW = Distance log (cumulative distance through water)
    nmea2000: [128259, 128275],  // 128275 = Distance Log
    physical_properties: {
      sensor_type: { type: 'enum', values: ['paddle_wheel', 'electromagnetic', 'pitot_tube'], description: 'Speed sensor technology' },
      mounting_location: { type: 'string', description: 'Hull mounting position' },
      calibration_factor: { unit: 'ratio', description: 'Speed calibration multiplier', nmea0183_field: 'applied_to_knots', nmea2000_field: 'byte[2-3]' }
    }
  },
  wind_sensor: {
    nmea0183: ['MWV', 'MWD'],
    nmea2000: [130306],
    physical_properties: {
      sensor_height: { unit: 'm', description: 'Height above deck', nmea2000_field: 'byte[6]' },
      mounting_location: { type: 'string', description: 'Masthead/deck position' },
      reference_type: { type: 'enum', values: ['apparent', 'true', 'ground'], description: 'Wind reference frame', nmea0183_field: 'MWV.reference', nmea2000_field: 'byte[5].bits[0-2]' }
    }
  },
  gps_sensor: {
    nmea0183: ['VTG', 'GGA', 'RMC', 'GLL', 'GSA', 'GSV'],  // VTG first = primary (provides SOG)
    nmea2000: [129026, 129025, 129029, 129539],  // 129026 = COG & SOG (primary)
    physical_properties: {
      antenna_height: { unit: 'm', description: 'GPS antenna height above water' },
      horizontal_accuracy: { unit: 'm', description: 'Expected GPS accuracy', nmea0183_field: 'GGA.hdop', nmea2000_field: 'byte[14-15]' },
      mounting_location: { type: 'string', description: 'Antenna position' }
    }
  },
  heading_sensor: {
    nmea0183: ['HDG', 'HDM', 'HDT'],
    nmea2000: [127250, 127251],
    physical_properties: {
      sensor_type: { type: 'enum', values: ['magnetic_compass', 'fluxgate', 'gyro', 'gps_derived'], description: 'Heading sensor technology' },
      deviation: { unit: 'degrees', description: 'Magnetic deviation', nmea0183_field: 'HDG.deviation', nmea2000_field: 'byte[4-5]' },
      variation: { unit: 'degrees', description: 'Magnetic variation', nmea0183_field: 'HDG.variation', nmea2000_field: 'byte[6-7]' },
      mounting_location: { type: 'string', description: 'Sensor mounting position' }
    }
  },
  temperature_sensor: {
    nmea0183: ['MTW', 'MTA', 'XDR'],  // MTW=water, MTA=air, XDR=generic
    nmea2000: [130310, 130311, 130312, 130316],
    physical_properties: {
      sensor_location: { type: 'enum', values: ['sea_water', 'engine_room', 'cabin', 'refrigeration', 'exhaust', 'oil'], description: 'Temperature sensor location', nmea0183_field: 'XDR.transducer_name', nmea2000_field: 'byte[4]' },
      sensor_depth: { unit: 'm', description: 'Depth of water temperature sensor' },
      calibration_offset: { unit: '°C', description: 'Temperature calibration offset', nmea0183_field: 'applied_to_celsius', nmea2000_field: 'applied_to_kelvin' }
    }
  },
  atmospheric_pressure_sensor: {
    nmea0183: ['MDA', 'MMB', 'XDR'],  // MDA=full meteorological, MMB=pressure only
    nmea2000: [130311],  // PGN 130311 = Environmental Parameters (Atmospheric)
    physical_properties: {
      sensor_type: { type: 'enum', values: ['barometric', 'absolute'], description: 'Pressure sensor type' },
      location: { type: 'string', description: 'Sensor location', nmea0183_field: 'XDR.transducer_name' },
      unit: { type: 'enum', values: ['millibars', 'bars', 'pascals'], description: 'Pressure unit' },
      precision: { unit: 'mb', description: 'Sensor precision' }
    }
  },
  engine_sensor: {
    nmea0183: ['RPM', 'XDR'],
    nmea2000: [127488, 127489, 127493, 127505],
    physical_properties: {
      engine_instance: { type: 'integer', description: 'Engine number (0=port, 1=starboard)', nmea0183_field: 'RPM.source', nmea2000_field: 'byte[0]' },
      rpm_calibration: { unit: 'ratio', description: 'RPM calibration factor' },
      sensor_types: { type: 'array', description: 'Available sensors: rpm, coolant_temp, oil_pressure, alternator_voltage, fuel_rate, engine_hours' }
    }
  },
  battery_sensor: {
    nmea0183: ['XDR'],
    nmea2000: [127508, 127513],
    physical_properties: {
      battery_instance: { type: 'integer', description: 'Battery bank number', nmea0183_field: 'XDR.transducer_name', nmea2000_field: 'byte[0]' },
      nominal_voltage: { unit: 'V', description: 'Battery bank voltage (12V/24V/48V)' },
      capacity: { unit: 'Ah', description: 'Battery capacity in amp-hours' }
    }
  },
  tank_sensor: {
    nmea0183: ['RSA'],
    nmea2000: [127505],
    physical_properties: {
      tank_instance: { type: 'integer', description: 'Tank number', nmea0183_field: 'derived', nmea2000_field: 'byte[0]' },
      fluid_type: { type: 'enum', values: ['fuel', 'fresh_water', 'gray_water', 'black_water', 'oil'], description: 'Tank contents', nmea0183_field: 'none', nmea2000_field: 'byte[1]' },
      capacity: { unit: 'L', description: 'Total tank capacity', nmea2000_field: 'byte[2-5]' },
      sensor_type: { type: 'enum', values: ['resistive', 'capacitive', 'ultrasonic'], description: 'Level sensor technology' }
    }
  },
  rudder_sensor: {
    nmea0183: ['RSA'],
    nmea2000: [127245],
    physical_properties: {
      rudder_instance: { type: 'integer', description: 'Rudder number (0=main)', nmea0183_field: 'RSA.position', nmea2000_field: 'byte[0]' },
      max_angle: { unit: 'degrees', description: 'Maximum rudder deflection' },
      calibration_offset: { unit: 'degrees', description: 'Zero position offset' }
    }
  },
  autopilot: {
    nmea0183: ['APB', 'APA'],
    nmea2000: [65288, 126208],
    physical_properties: {
      control_type: { type: 'enum', values: ['compass', 'gps', 'wind'], description: 'Autopilot control mode' },
      max_rudder_angle: { unit: 'degrees', description: 'Maximum autopilot rudder command' }
    }
  }
};

class ScenarioDataSource extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.scenario = null;
    this.scenarioTimers = [];
    this.isRunning = false;
    this.currentPhase = null;
    this.phaseStartTime = null;
    this.loopCount = 0;
    this.stats = {
      messagesGenerated: 0,
      startTime: null,
      phasesCompleted: 0,
      currentIteration: 1
    };
    
    // State for smooth heading transitions
    this.currentSmoothedHeading = null;
    this.lastHeadingUpdateTime = null;

    // State for cross-track error calculation
    this.currentLegStartWaypoint = null;
    this.currentLegEndWaypoint = null;

    // State for VLW distance log tracking (cumulative distance through water)
    this.distanceLog = {
      totalDistance: 0,      // Total cumulative distance in nautical miles
      tripDistance: 0,       // Trip distance (resettable) in nautical miles
      lastUpdateTime: null   // Last time distance was updated
    };

    // NMEA data generators for common scenarios
    this.dataGenerators = new Map();
    this.initializeDataGenerators();

    // Binary NMEA 2000 PGN generator
    this.binaryGenerator = new NMEA2000BinaryGenerator();
  }

  /**
   * Start scenario execution
   */
  async start() {
    try {
      await this.loadScenario();
      this.startScenarioExecution();
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Load scenario configuration
   */
  async loadScenario() {
    const scenarioPath = this.resolveScenarioPath(this.config.scenarioName);
    
    this.emit('status', `Loading scenario: ${this.config.scenarioName}`);
    
    try {
      if (fs.existsSync(scenarioPath)) {
        const yamlContent = fs.readFileSync(scenarioPath, 'utf8');
        this.scenario = yaml.load(yamlContent);
      } else {
        // Use built-in scenario if file not found
        this.scenario = this.getBuiltInScenario(this.config.scenarioName);
      }

      if (!this.scenario) {
        throw new Error(`Scenario not found: ${this.config.scenarioName}`);
      }

      // Validate scenario schema using JSON Schema (Ajv)
      this.validateScenarioSchema();

      this.emit('status', `Loaded scenario: ${this.scenario.name || this.config.scenarioName}`);
      this.emit('status', `Description: ${this.scenario.description || 'No description'}`);
      
      // Initialize YAML-defined sentence generators now that scenario is loaded
      this.initializeYAMLGenerators();
      
    } catch (error) {
      throw new Error(`Failed to load scenario: ${error.message}`);
    }
  }

  /**
   * Validate scenario against JSON Schema
   */
  validateScenarioSchema() {
    try {
      // Load JSON schema
      const schemaPath = path.join(__dirname, '../../../../marine-assets/test-scenarios/scenario.schema.json');
      
      if (!fs.existsSync(schemaPath)) {
        console.warn(`⚠️ Schema file not found: ${schemaPath}`);
        console.warn('   Skipping schema validation');
        return;
      }
      
      const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
      
      // Validate with Ajv
      const ajv = new Ajv({ allErrors: true, verbose: true, strict: false });
      const validate = ajv.compile(schema);
      const valid = validate(this.scenario);
      
      if (!valid) {
        console.warn(`\n⚠️ Scenario validation errors for: ${this.scenario.name || this.config.scenarioName}`);
        console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Group errors by type
        const criticalErrors = [];
        const warnings = [];
        
        validate.errors.forEach(error => {
          const path = error.instancePath || error.dataPath || 'root';
          const message = error.message;
          const fullMessage = `${path}: ${message}`;
          
          // Categorize errors
          if (error.keyword === 'required' || error.keyword === 'type') {
            criticalErrors.push(fullMessage);
          } else {
            warnings.push(fullMessage);
          }
        });
        
        // Display critical errors
        if (criticalErrors.length > 0) {
          console.error('\n❌ Critical Errors (may cause runtime issues):');
          criticalErrors.forEach(err => console.error(`   • ${err}`));
        }
        
        // Display warnings
        if (warnings.length > 0) {
          console.warn('\n⚠️  Warnings (may indicate configuration issues):');
          warnings.forEach(warn => console.warn(`   • ${warn}`));
        }
        
        console.warn('\n💡 Run with --validate flag for detailed schema validation');
        console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        // Fail only on critical errors that would prevent execution
        if (criticalErrors.some(err => err.includes('name') || err.includes('bridge_mode'))) {
          throw new Error('Critical schema validation errors - cannot continue');
        }
      } else {
        console.log(`✅ Scenario schema validation passed: ${this.scenario.name}`);
      }
      
    } catch (error) {
      if (error.message.includes('Critical schema validation')) {
        throw error;
      }
      console.warn(`⚠️ Schema validation error: ${error.message}`);
      console.warn('   Continuing with scenario execution...');
    }
  }

  /**
   * Resolve scenario file path
   */
  resolveScenarioPath(scenarioName) {
    // If it's already a path (contains slashes), try marine-assets with that path structure
    if (scenarioName.includes('/') || scenarioName.includes('\\')) {
      const marineAssetsPath = path.join(__dirname, '../../../../marine-assets/test-scenarios', scenarioName);
      for (const ext of ['.yml', '.yaml']) {
        const fullPath = marineAssetsPath + ext;
        if (fs.existsSync(fullPath)) {
          return fullPath;
        }
      }
      
      // Try as absolute path
      const resolvedPath = path.resolve(scenarioName);
      if (fs.existsSync(resolvedPath)) {
        return resolvedPath;
      }
      
      // If path-based lookup failed, extract just the filename and search recursively
      const filename = scenarioName.split('/').pop().split('\\').pop();
      const foundPath = this.searchForScenarioFile(filename);
      if (foundPath) return foundPath;
    }
    
    // Try simple name lookups
    const foundPath = this.searchForScenarioFile(scenarioName);
    if (foundPath) return foundPath;

    // Return a reasonable default for error reporting
    return path.join(__dirname, '../../../../marine-assets/test-scenarios', `${scenarioName}.yml`);
  }

  /**
   * Search for scenario file by name in all possible locations
   */
  searchForScenarioFile(scenarioName) {
    // Try flat structure first (faster)
    const possiblePaths = [
      // Local scenarios directory
      path.join(__dirname, '../../scenarios', `${scenarioName}.yml`),
      path.join(__dirname, '../../scenarios', scenarioName, 'scenario.yml'),
      path.join(__dirname, '../../scenarios', `${scenarioName}.yaml`),
      // Marine assets root level
      path.join(__dirname, '../../../../marine-assets/test-scenarios', `${scenarioName}.yml`),
      path.join(__dirname, '../../../../marine-assets/test-scenarios', `${scenarioName}.yaml`),
    ];

    for (const scenarioPath of possiblePaths) {
      if (fs.existsSync(scenarioPath)) {
        return scenarioPath;
      }
    }
    
    // Recursively search subdirectories in marine-assets/test-scenarios
    const marineAssetsDir = path.join(__dirname, '../../../../marine-assets/test-scenarios');
    if (fs.existsSync(marineAssetsDir)) {
      const foundPath = this.findScenarioInSubdirectories(marineAssetsDir, scenarioName);
      if (foundPath) return foundPath;
    }
    
    return null;
  }

  /**
   * Recursively search for scenario file in subdirectories
   */
  findScenarioInSubdirectories(baseDir, scenarioName) {
    try {
      const entries = fs.readdirSync(baseDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDirPath = path.join(baseDir, entry.name);
          // Check for scenario file in this subdirectory
          for (const ext of ['.yml', '.yaml']) {
            const scenarioPath = path.join(subDirPath, `${scenarioName}${ext}`);
            if (fs.existsSync(scenarioPath)) {
              return scenarioPath;
            }
          }
          
          // Recurse into subdirectory
          const foundPath = this.findScenarioInSubdirectories(subDirPath, scenarioName);
          if (foundPath) return foundPath;
        }
      }
    } catch (error) {
      // Ignore errors reading directory
    }
    
    return null;
  }

  /**
   * Get built-in scenario if file not found
   */
  getBuiltInScenario(scenarioName) {
    const builtInScenarios = {
      'basic-navigation': {
        name: 'Basic Navigation',
        description: 'Standard depth, speed, wind, and GPS data for testing',
        bridgeMode: 'nmea0183',
        phases: [
          {
            name: 'initialization',
            duration: 5000,
            generators: ['depth', 'speed', 'wind', 'gps']
          },
          {
            name: 'steady-state',
            duration: 30000,
            generators: ['depth', 'speed', 'wind', 'gps', 'heading']
          }
        ]
      },
      'coastal-sailing': {
        name: 'Coastal Sailing',
        description: 'Realistic coastal sailing conditions with varying wind and depth',
        bridgeMode: 'nmea0183',
        phases: [
          {
            name: 'departure',
            duration: 10000,
            generators: ['depth', 'speed', 'wind', 'gps']
          },
          {
            name: 'open-water',
            duration: 60000,
            generators: ['depth', 'speed', 'wind', 'gps', 'heading', 'autopilot']
          }
        ]
      },
      'autopilot-engagement': {
        name: 'Autopilot Engagement',
        description: 'Complete autopilot workflow with engagement and steering',
        bridgeMode: 'nmea0183',
        phases: [
          {
            name: 'manual-steering',
            duration: 10000,
            generators: ['depth', 'speed', 'wind', 'gps', 'heading']
          },
          {
            name: 'autopilot-engaged',
            duration: 30000,
            generators: ['depth', 'speed', 'wind', 'gps', 'heading', 'autopilot']
          }
        ]
      },
      'multi-equipment-detection': {
        name: 'Multi-Equipment Detection',
        description: 'Multi-instance equipment testing with various sensors',
        bridgeMode: 'nmea0183',
        phases: [
          {
            name: 'equipment-discovery',
            duration: 10000,
            generators: ['depth', 'speed', 'wind', 'gps', 'heading']
          },
          {
            name: 'steady-monitoring',
            duration: 60000,
            generators: ['depth', 'speed', 'wind', 'gps', 'heading', 'autopilot']
          }
        ]
      }
    };

    return builtInScenarios[scenarioName] || null;
  }

  /**
   * Start scenario execution with phases
   */
  startScenarioExecution() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.stats.startTime = Date.now();
    
    this.emit('status', `Starting scenario execution (speed: ${this.config.speed}x)`);
    
    if (this.scenario.phases && this.scenario.phases.length > 0) {
      this.executePhases();
    } else {
      // Fallback to continuous generation
      this.startContinuousGeneration();
    }
  }

  /**
   * Execute scenario phases sequentially
   */
  executePhases() {
    let phaseIndex = 0;
    
    const executeNextPhase = () => {
      if (phaseIndex >= this.scenario.phases.length) {
        if (this.config.loop) {
          this.loopCount++;
          this.stats.currentIteration = this.loopCount + 1;
          phaseIndex = 0;
          this.emit('status', `Looping scenario (iteration ${this.stats.currentIteration})`);
        } else {
          this.emit('status', 'Scenario execution complete');
          this.stopScenarioExecution();
          return;
        }
      }

      const phase = this.scenario.phases[phaseIndex];
      this.currentPhase = phase;
      this.phaseStartTime = Date.now();
      
      // Convert duration from seconds to milliseconds
      const phaseDurationMs = phase.duration * 1000;
      this.emit('status', `Starting phase: ${phase.name} (${phase.duration}s duration)`);
      
      // Start generators for this phase
      this.startPhaseGenerators(phase);
      
      // Schedule next phase
      const phaseDuration = Math.round(phaseDurationMs / this.config.speed);
      const phaseTimer = setTimeout(() => {
        this.stopPhaseGenerators(phase);
        this.stats.phasesCompleted++;
        phaseIndex++;
        executeNextPhase();
      }, phaseDuration);
      
      this.scenarioTimers.push(phaseTimer);
    };

    executeNextPhase();
  }

  /**
   * Start generators for current phase
   */
  startPhaseGenerators(phase) {
    // Start explicitly listed generators
    if (phase.generators) {
      phase.generators.forEach(generatorName => {
        const generator = this.dataGenerators.get(generatorName);
        if (generator) {
          this.startGenerator(generatorName, generator, phase);
        }
      });
    }

    // Also start all YAML-defined generators (they have their own frequency control)
    this.dataGenerators.forEach((generator, generatorName) => {
      if (generatorName.startsWith('yaml_')) {
        this.startGenerator(generatorName, generator, phase);
        console.log(`🎛️ Started YAML generator: ${generatorName}`);
      }
    });
  }

  /**
   * Start individual data generator
   */
  startGenerator(name, generator, phase) {
    const baseInterval = generator.interval || 1000;
    const interval = Math.round(baseInterval / this.config.speed);
    
    // Debug: Log timer setup for VHW/VTG
    if (name.includes('vhw') || name.includes('vtg')) {
      console.log(`⏱️ Starting timer for ${name}: baseInterval=${baseInterval}ms, speed=${this.config.speed}, actualInterval=${interval}ms`);
    }
    
    const timer = setInterval(() => {
      const messages = generator.generate();
      if (messages) {
        // Handle both single messages and arrays of messages
        const messageArray = Array.isArray(messages) ? messages : [messages];
        messageArray.forEach(message => {
          if (message) {
            // Check if it's a Buffer (binary NMEA 2000) or string (NMEA 0183)
            if (Buffer.isBuffer(message) || (typeof message === 'string' && message.trim())) {
              this.stats.messagesGenerated++;
              this.emit('data', message);
            }
          }
        });
      }
    }, interval);

    this.scenarioTimers.push(timer);
  }

  /**
   * Stop generators for current phase
   */
  stopPhaseGenerators(phase) {
    // Timers are managed in scenarioTimers array for cleanup
    // Individual generator state is maintained in the generator functions
  }

  /**
   * Start continuous generation (fallback mode)
   */
  startContinuousGeneration() {
    // Collect YAML generator types to avoid starting duplicate built-in generators
    const yamlGeneratorTypes = new Set();
    this.dataGenerators.forEach((generator, generatorName) => {
      if (generatorName.startsWith('yaml_')) {
        // Extract base type (e.g., 'dpt' from 'yaml_dpt_0')
        const match = generatorName.match(/^yaml_([^_]+)/);
        if (match) {
          yamlGeneratorTypes.add(match[1]);
        }
      }
    });
    
    // Collect sensor generator types
    const sensorGeneratorTypes = new Set();
    this.dataGenerators.forEach((generator, generatorName) => {
      if (generatorName.startsWith('sensor_')) {
        // Extract sensor type from generator name: sensor_depth_sensor_0 -> depth_sensor
        const parts = generatorName.split('_');
        if (parts.length >= 3) {
          const sensorType = parts[1] + '_' + parts[2]; // depth_sensor, speed_sensor, etc.
          sensorGeneratorTypes.add(sensorType);
        }
      }
    });
    
    console.log(`🔄 YAML generator types found:`, Array.from(yamlGeneratorTypes));
    console.log(`📡 Sensor generator types found:`, Array.from(sensorGeneratorTypes));
    
    // Start built-in generators only if no YAML or sensor generator exists for that type
    const builtInGenerators = ['depth', 'speed', 'wind', 'gps'];
    
    builtInGenerators.forEach(generatorName => {
      // Check if YAML generator exists for this type
      const hasYAML = yamlGeneratorTypes.has('dpt') || 
                      yamlGeneratorTypes.has('dbt') || 
                      yamlGeneratorTypes.has('dbk') ||
                      yamlGeneratorTypes.has('vhw') ||
                      yamlGeneratorTypes.has('vtg') ||
                      yamlGeneratorTypes.has('mwv') ||
                      yamlGeneratorTypes.has('gga') ||
                      yamlGeneratorTypes.has('rmc');
      
      // Skip built-in generator if YAML or sensor version exists
      if (generatorName === 'depth' && (yamlGeneratorTypes.has('dpt') || yamlGeneratorTypes.has('dbt') || yamlGeneratorTypes.has('dbk') || sensorGeneratorTypes.has('depth_sensor'))) {
        console.log(`⏭️ Skipping built-in depth generator (YAML/sensor depth generator exists)`);
        return;
      }
      if (generatorName === 'speed' && (yamlGeneratorTypes.has('vhw') || yamlGeneratorTypes.has('vtg') || sensorGeneratorTypes.has('speed_sensor'))) {
        console.log(`⏭️ Skipping built-in speed generator (YAML/sensor speed generator exists)`);
        return;
      }
      if (generatorName === 'wind' && (yamlGeneratorTypes.has('mwv') || sensorGeneratorTypes.has('wind_sensor'))) {
        console.log(`⏭️ Skipping built-in wind generator (YAML/sensor wind generator exists)`);
        return;
      }
      if (generatorName === 'gps' && (yamlGeneratorTypes.has('gga') || yamlGeneratorTypes.has('rmc') || sensorGeneratorTypes.has('gps_sensor'))) {
        console.log(`⏭️ Skipping built-in GPS generator (YAML/sensor GPS generator exists)`);
        return;
      }
      
      const generator = this.dataGenerators.get(generatorName);
      if (generator) {
        console.log(`▶️ Starting built-in generator: ${generatorName}`);
        this.startGenerator(generatorName, generator, { name: 'continuous' });
      }
    });
    
    // Start all YAML-defined generators
    this.dataGenerators.forEach((generator, generatorName) => {
      if (generatorName.startsWith('yaml_')) {
        console.log(`🔄 Starting YAML generator: ${generatorName}`);
        this.startGenerator(generatorName, generator, { name: 'continuous' });
      }
    });
    
    // Start all sensor-based generators
    this.dataGenerators.forEach((generator, generatorName) => {
      if (generatorName.startsWith('sensor_')) {
        console.log(`📡 Starting sensor generator: ${generatorName}`);
        this.startGenerator(generatorName, generator, { name: 'continuous' });
      }
    });
  }

  /**
   * Stop scenario execution
   */
  stopScenarioExecution() {
    this.scenarioTimers.forEach(timer => clearTimeout(timer));
    this.scenarioTimers = [];
    this.isRunning = false;
    this.currentPhase = null;
  }

  /**
   * Stop the scenario data source
   */
  async stop() {
    this.stopScenarioExecution();
    this.emit('status', 'Scenario execution stopped');
  }

  /**
   * Initialize NMEA data generators
   */
  initializeDataGenerators() {
    // Depth generator (DBT - Depth Below Transducer)
    this.dataGenerators.set('depth', {
      interval: 2000,
      currentDepth: 12.5,
      generate: () => {
        this.dataGenerators.get('depth').currentDepth += (Math.random() - 0.5) * 0.5;
        const depth = Math.max(1.0, this.dataGenerators.get('depth').currentDepth);
        return this.generateDBT(depth);
      }
    });

    // Speed generator (VHW - Water Speed and Heading)
    this.dataGenerators.set('speed', {
      interval: 1000,
      currentSpeed: 6.2,
      generate: () => {
        this.dataGenerators.get('speed').currentSpeed += (Math.random() - 0.5) * 0.3;
        const speed = Math.max(0.0, this.dataGenerators.get('speed').currentSpeed);
        return this.generateVHW(speed);
      }
    });

    // Wind generator (MWV - Wind Speed and Angle)
    this.dataGenerators.set('wind', {
      interval: 1500,
      currentAngle: 45,
      currentSpeed: 12.3,
      generate: () => {
        const gen = this.dataGenerators.get('wind');
        gen.currentAngle += (Math.random() - 0.5) * 10;
        gen.currentSpeed += (Math.random() - 0.5) * 2;
        return this.generateMWV(gen.currentAngle, Math.max(0, gen.currentSpeed));
      }
    });

    // GPS generator (RMC - Recommended Minimum)
    this.dataGenerators.set('gps', {
      interval: 3000,
      currentLat: 37.7749,
      currentLon: -122.4194,
      generate: () => {
        const gen = this.dataGenerators.get('gps');
        gen.currentLat += (Math.random() - 0.5) * 0.0001;
        gen.currentLon += (Math.random() - 0.5) * 0.0001;
        return this.generateRMC(gen.currentLat, gen.currentLon);
      }
    });

    // Heading generator (HDG - Heading)
    this.dataGenerators.set('heading', {
      interval: 1000,
      currentHeading: 180,
      generate: () => {
        const gen = this.dataGenerators.get('heading');
        gen.currentHeading += (Math.random() - 0.5) * 5;
        gen.currentHeading = (gen.currentHeading + 360) % 360;
        return this.generateHDG(gen.currentHeading);
      }
    });

    // Autopilot generator (APB - Autopilot Sentence B)
    this.dataGenerators.set('autopilot', {
      interval: 2000,
      generate: () => {
        return this.generateAPB();
      }
    });

  }

  /**
   * Initialize generators for YAML-defined sentences
   */
  initializeYAMLGenerators() {
    console.log(`🔍 Checking for YAML sentences in scenario...`);
    console.log(`   Scenario exists: ${!!this.scenario}`);
    
    // NEW: Check for sensor-based schema first (protocol-agnostic)
    const sensors = this.scenario?.sensors;
    if (sensors && Array.isArray(sensors)) {
      console.log(`✨ Found sensor-based schema with ${sensors.length} sensors`);
      this.initializeSensorGenerators(sensors);
      return;
    }
    
    // LEGACY: Fall back to nmea_sentences schema (protocol-specific)
    const sentences = this.scenario?.nmea_sentences;
    
    console.log(`   nmea_sentences exists: ${!!sentences}`);
    console.log(`   nmea_sentences is array: ${Array.isArray(sentences)}`);
    console.log(`   nmea_sentences count: ${sentences?.length || 0}`);
    
    if (!sentences || !Array.isArray(sentences)) {
      console.log(`⚠️ No YAML sentences found in scenario (expected 'sensors' or 'nmea_sentences' array)`);
      return;
    }

    // Process each sentence definition from YAML
    sentences.forEach((sentenceDef, index) => {
      const generatorName = `yaml_${sentenceDef.type.toLowerCase()}_${index}`;
      const frequencyHz = sentenceDef.frequency || 1;
      const intervalMs = Math.round(1000 / frequencyHz);

      // Create generator based on sentence type
      switch (sentenceDef.type) {
        case 'XDR_BATTERY':
          this.dataGenerators.set(generatorName, {
            interval: intervalMs,
            sentenceDef: sentenceDef,
            generate: () => this.generateYAMLBatterySentence(sentenceDef)
          });
          console.log(`🔋 Added YAML battery generator: ${generatorName} at ${frequencyHz}Hz`);
          break;

        case 'XDR_TANK':
          this.dataGenerators.set(generatorName, {
            interval: intervalMs,
            sentenceDef: sentenceDef,
            generate: () => this.generateYAMLTankSentence(sentenceDef)
          });
          break;

        case 'XDR_TEMPERATURE':
          this.dataGenerators.set(generatorName, {
            interval: intervalMs,
            sentenceDef: sentenceDef,
            generate: () => this.generateYAMLTemperatureSentence(sentenceDef)
          });
          break;

        case 'RPM':
          this.dataGenerators.set(generatorName, {
            interval: intervalMs,
            sentenceDef: sentenceDef,
            generate: () => this.generateYAMLRPMSentence(sentenceDef)
          });
          console.log(`⚙️ Added YAML RPM generator: ${generatorName} at ${frequencyHz}Hz`);
          break;

        case 'XDR':
          this.dataGenerators.set(generatorName, {
            interval: intervalMs,
            sentenceDef: sentenceDef,
            generate: () => this.generateYAMLXDRSentence(sentenceDef)
          });
          console.log(`📊 Added YAML XDR generator: ${generatorName} at ${frequencyHz}Hz`);
          break;

        case 'RSA':
          this.dataGenerators.set(generatorName, {
            interval: intervalMs,
            sentenceDef: sentenceDef,
            generate: () => this.generateYAMLRSASentence(sentenceDef)
          });
          console.log(`🎛️ Added YAML RSA generator: ${generatorName} at ${frequencyHz}Hz`);
          break;

        case 'DBT':
        case 'DPT':
        case 'DBK':
          this.dataGenerators.set(generatorName, {
            interval: intervalMs,
            sentenceDef: sentenceDef,
            generate: () => this.generateDepthSentence(sentenceDef.type)
          });
          console.log(`📏 Added YAML ${sentenceDef.type} depth generator: ${generatorName} at ${frequencyHz}Hz`);
          break;

        case 'MTW':
          this.dataGenerators.set(generatorName, {
            interval: intervalMs,
            sentenceDef: sentenceDef,
            generate: () => this.generateMTWSentence()
          });
          console.log(`🌡️ Added YAML MTW water temp generator: ${generatorName} at ${frequencyHz}Hz`);
          break;

        case 'VHW':
          this.dataGenerators.set(generatorName, {
            interval: intervalMs,
            sentenceDef: sentenceDef,
            generate: () => this.generateVHWSentence()
          });
          console.log(`⛵ Added YAML VHW water speed generator: ${generatorName} at ${frequencyHz}Hz (interval: ${intervalMs}ms)`);
          break;

        case 'VTG':
          this.dataGenerators.set(generatorName, {
            interval: intervalMs,
            sentenceDef: sentenceDef,
            generate: () => this.generateVTGSentence()
          });
          console.log(`🧭 Added YAML VTG track generator: ${generatorName} at ${frequencyHz}Hz (interval: ${intervalMs}ms)`);
          break;

        case 'MWV':
          this.dataGenerators.set(generatorName, {
            interval: intervalMs,
            sentenceDef: sentenceDef,
            generate: () => this.generateMWVSentence()
          });
          console.log(`💨 Added YAML MWV wind generator: ${generatorName} at ${frequencyHz}Hz`);
          break;

        case 'GGA':
          this.dataGenerators.set(generatorName, {
            interval: intervalMs,
            sentenceDef: sentenceDef,
            generate: () => this.generateGGASentence()
          });
          console.log(`📍 Added YAML GGA GPS generator: ${generatorName} at ${frequencyHz}Hz`);
          break;

        case 'RMC':
          this.dataGenerators.set(generatorName, {
            interval: intervalMs,
            sentenceDef: sentenceDef,
            generate: () => this.generateRMCSentence()
          });
          console.log(`📡 Added YAML RMC GPS generator: ${generatorName} at ${frequencyHz}Hz`);
          break;

        case 'HDT':
        case 'HDG':
        case 'HDM':
          this.dataGenerators.set(generatorName, {
            interval: intervalMs,
            sentenceDef: sentenceDef,
            generate: () => this.generateHeadingSentence(sentenceDef.type)
          });
          console.log(`🧭 Added YAML ${sentenceDef.type} heading generator: ${generatorName} at ${frequencyHz}Hz`);
          break;

        case 'PCDIN':
          this.dataGenerators.set(generatorName, {
            interval: intervalMs,
            sentenceDef: sentenceDef,
            generate: () => this.generatePCDINSentence(sentenceDef)
          });
          console.log(`🔧 Added YAML PCDIN (NMEA 2000) generator: ${generatorName} at ${frequencyHz}Hz (PGN ${sentenceDef.pgn})`);
          break;

        default:
          console.warn(`⚠️ Unknown YAML sentence type: ${sentenceDef.type}`);
      }
    });
  }

  /**
   * Initialize generators from sensor-based schema (protocol-agnostic)
   */
  initializeSensorGenerators(sensors) {
    const bridgeMode = this.config.bridgeMode || this.scenario.bridge_mode || 'nmea0183';
    console.log(`🎯 Initializing sensor generators in ${bridgeMode} mode`);

    sensors.forEach((sensor, index) => {
      // Debug speed sensors specifically
      if (sensor.type === 'speed_sensor') {
        console.log(`🔍 Speed sensor found: instance=${sensor.instance}, speed_type=${sensor.physical_properties?.speed_type}, name="${sensor.name}"`);
      }
      
      const generatorName = `sensor_${sensor.type}_${sensor.instance || index}`;
      const updateRateHz = sensor.update_rate || 1;
      const intervalMs = Math.round(1000 / updateRateHz);

      // Validate sensor type
      if (!SENSOR_TYPE_REGISTRY[sensor.type]) {
        console.warn(`⚠️ Unknown sensor type: ${sensor.type}`);
        return;
      }

      // Create generator that routes to appropriate protocol handler
      this.dataGenerators.set(generatorName, {
        interval: intervalMs,
        sensor: sensor,
        bridgeMode: bridgeMode,
        generate: () => this.processSensorDefinition(sensor, bridgeMode)
      });

      console.log(`📡 Added sensor generator: ${generatorName} (${sensor.type}) at ${updateRateHz}Hz in ${bridgeMode} mode`);
    });
  }

  /**
   * Process sensor definition and route to appropriate protocol generator
   * This is the core adapter that maps sensor-level data to protocol-specific messages
   */
  processSensorDefinition(sensor, bridgeMode) {
    const sensorType = SENSOR_TYPE_REGISTRY[sensor.type];
    if (!sensorType) {
      console.warn(`⚠️ Unknown sensor type: ${sensor.type}`);
      return null;
    }

    // Route to protocol-specific generator based on bridge mode
    switch (bridgeMode) {
      case 'nmea2000':
        return this.generateNMEA2000FromSensor(sensor, sensorType);
      
      case 'nmea0183':
        return this.generateNMEA0183FromSensor(sensor, sensorType);
      
      case 'hybrid':
        // Generate both protocols
        const nmea0183 = this.generateNMEA0183FromSensor(sensor, sensorType);
        const nmea2000 = this.generateNMEA2000FromSensor(sensor, sensorType);
        return [nmea0183, nmea2000].filter(m => m !== null);
      
      default:
        console.warn(`⚠️ Unknown bridge mode: ${bridgeMode}`);
        return null;
    }
  }

  /**
   * Generate NMEA 0183 sentences from sensor definition
   */
  generateNMEA0183FromSensor(sensor, sensorType) {
    const sentenceTypes = sensorType.nmea0183;
    if (!sentenceTypes || sentenceTypes.length === 0) {
      return null;
    }

    // Use the first (primary) sentence type for this sensor
    let primarySentence = sentenceTypes[0];
    
    // Special case: temperature sensors support MTW (water), MTA (air), and XDR (generic)
    // MTW is only for seawater temperature, MTA is for air temperature, XDR for everything else
    if (sensor.type === 'temperature_sensor') {
      const locationCode = sensor.physical_properties?.location || sensor.physical_properties?.sensor_type || '';
      const isWaterTemp = locationCode.toUpperCase() === 'SEAW' ||
                          locationCode === 'sea_water' ||
                          locationCode === 'water' ||
                          sensor.physical_properties?.sensor_type === 'water';
      const isAirTemp = locationCode.toUpperCase() === 'AIRX' ||
                        locationCode === 'air' ||
                        sensor.physical_properties?.sensor_type === 'air';

      // Select appropriate sentence type: MTW for water, MTA for air, XDR for others
      if (isWaterTemp && sentenceTypes.includes('MTW')) {
        primarySentence = 'MTW';
      } else if (isAirTemp && sentenceTypes.includes('MTA')) {
        primarySentence = 'MTA';
      } else {
        primarySentence = 'XDR';
      }
    }
    
    // Special case: speed sensors support VHW, VTG, and VLW
    // VHW is for STW (Speed Through Water), VTG is for SOG (Speed Over Ground)
    // VLW is for distance log (cumulative distance through water)
    if (sensor.type === 'speed_sensor') {
      const speedType = sensor.physical_properties?.speed_type || 'STW';

      // VLW has special handling - generate it alongside VHW/VTG
      // Primary sentence is still VHW or VTG for speed
      primarySentence = speedType === 'SOG' && sentenceTypes.includes('VTG') ? 'VTG' : 'VHW';
    }
    
    // Special case: atmospheric pressure sensors support MDA (full), MMB (pressure-only)
    // Use MDA if temperature or humidity data is available, otherwise MMB
    if (sensor.type === 'atmospheric_pressure_sensor') {
      const hasTemperature = sensor.data_generation?.temperature !== undefined;
      const hasHumidity = sensor.data_generation?.humidity !== undefined;
      
      if ((hasTemperature || hasHumidity) && sentenceTypes.includes('MDA')) {
        primarySentence = 'MDA';  // Full meteorological composite
      } else if (sentenceTypes.includes('MMB')) {
        primarySentence = 'MMB';  // Simple barometer
      } else {
        primarySentence = 'XDR';  // Generic transducer fallback
      }
    }
    
    // Route to specific generator based on sensor type
    switch (sensor.type) {
      case 'depth_sensor':
        return this.generateDepthFromSensor(sensor, primarySentence);
      
      case 'speed_sensor':
        return this.generateSpeedFromSensor(sensor, primarySentence);
      
      case 'wind_sensor':
        return this.generateWindFromSensor(sensor, primarySentence);
      
      case 'gps_sensor':
        // Real GPS emits multiple sentences per cycle (RMC, GGA, VTG at minimum)
        return this.generateGPSFromSensor(sensor, sentenceTypes);
      
      case 'heading_sensor':
        return this.generateHeadingFromSensor(sensor, primarySentence);
      
      case 'temperature_sensor':
        return this.generateTemperatureFromSensor(sensor, primarySentence);

      case 'atmospheric_pressure_sensor':
        return this.generatePressureFromSensor(sensor, primarySentence);

      case 'engine_sensor':
        return this.generateEngineFromSensor(sensor, primarySentence);
      
      case 'battery_sensor':
        return this.generateBatteryFromSensor(sensor, primarySentence);
      
      case 'tank_sensor':
        return this.generateTankFromSensor(sensor, primarySentence);
      
      case 'rudder_sensor':
        return this.generateRudderFromSensor(sensor, primarySentence);
      
      default:
        console.warn(`⚠️ No NMEA 0183 generator for sensor type: ${sensor.type}`);
        return null;
    }
  }

  /**
   * Generate NMEA 2000 PGN messages from sensor definition
   * Returns binary Buffer frames (not PCDIN text encapsulation)
   */
  generateNMEA2000FromSensor(sensor, sensorType) {
    const pgnNumbers = sensorType.nmea2000;
    if (!pgnNumbers || pgnNumbers.length === 0) {
      return null;
    }

    // Use the first (primary) PGN for this sensor
    const primaryPGN = pgnNumbers[0];
    
    // Route to specific binary PGN generator based on sensor type
    // These return Buffer objects containing binary NMEA 2000 frames
    switch (sensor.type) {
      case 'depth_sensor':
        return this.binaryGenerator.generatePGN_128267(sensor); // Water Depth

      case 'speed_sensor':
        // Generate both Speed and Distance Log PGNs (like NMEA 0183 generates both VHW and VLW)
        const speedPGN = this.binaryGenerator.generatePGN_128259(sensor); // Speed
        const distanceLogPGN = this.binaryGenerator.generatePGN_128275(sensor, this.distanceLog); // Distance Log
        return [speedPGN, distanceLogPGN];

      case 'wind_sensor':
        return this.binaryGenerator.generatePGN_130306(sensor); // Wind Data
      
      case 'gps_sensor':
        return this.binaryGenerator.generatePGN_129029(sensor); // GNSS Position Data
      
      case 'heading_sensor':
        return this.binaryGenerator.generatePGN_127250(sensor); // Vessel Heading
      
      case 'temperature_sensor':
        return this.binaryGenerator.generatePGN_130310(sensor); // Environmental Parameters

      case 'atmospheric_pressure_sensor':
        return this.binaryGenerator.generatePGN_130311(sensor); // Environmental Parameters (Atmospheric)

      case 'engine_sensor':
        // Try rapid update first (127488), fall back to dynamic (127489)
        const rapidUpdate = this.binaryGenerator.generatePGN_127488(sensor);
        if (rapidUpdate) return rapidUpdate;
        return this.binaryGenerator.generatePGN_127489(sensor);
      
      case 'battery_sensor':
        return this.binaryGenerator.generatePGN_127508(sensor); // Battery Status
      
      case 'tank_sensor':
        return this.binaryGenerator.generatePGN_127505(sensor); // Fluid Level
      
      case 'rudder_sensor':
        return this.binaryGenerator.generatePGN_127245(sensor); // Rudder
      
      default:
        console.warn(`⚠️ No NMEA 2000 generator for sensor type: ${sensor.type}`);
        return null;
    }
  }

  /**
   * Generate comprehensive battery XDR sentences from YAML configuration
   */
  generateYAMLBatterySentence(sentenceDef) {
    // New YAML structure: data is inside sentenceDef.instances array
    if (!sentenceDef.instances || sentenceDef.instances.length === 0) {
      // Fallback to old structure for backward compatibility
      return this.generateYAMLBatterySentenceOldFormat(sentenceDef);
    }

    const messages = [];
    
    // Process each battery instance defined in the sentence
    sentenceDef.instances.forEach(instanceDef => {
      const instance = instanceDef.instance;
      const batteryData = instanceDef.data;
      
      if (!batteryData) return;
      
      // Get voltage from nested data structure
      const voltage = batteryData.voltage ? this.getYAMLDataValue('voltage', batteryData.voltage) : null;
    
      if (voltage !== null) {
        const batteryId = `BAT_${String(instance).padStart(2, '0')}`;
        const batteryName = instanceDef.name || `Battery ${instance}`;
        
        // Get other values from data structure
        const current = batteryData.current ? this.getYAMLDataValue('current', batteryData.current) : null;
        const temperature = batteryData.temperature ? this.getYAMLDataValue('temperature', batteryData.temperature) : null;
        const soc = batteryData.state_of_charge ? this.getYAMLDataValue('state_of_charge', batteryData.state_of_charge) : null;
        
        // 1. Voltage XDR sentence
        const voltageSentence = `$IIXDR,U,${voltage.toFixed(2)},V,${batteryId}`;
        messages.push(voltageSentence + '*' + this.calculateChecksum(voltageSentence.substring(1)));
        
        // 2. Current (AMP) XDR sentence
        if (current !== null) {
          const currentSentence = `$IIXDR,I,${current.toFixed(2)},A,${batteryId}`;
          messages.push(currentSentence + '*' + this.calculateChecksum(currentSentence.substring(1)));
        }
        
        // 3. Temperature (TMP) XDR sentence
        if (temperature !== null) {
          const tempSentence = `$IIXDR,C,${temperature.toFixed(1)},C,${batteryId}_TMP`;
          messages.push(tempSentence + '*' + this.calculateChecksum(tempSentence.substring(1)));
        }
        
        // 4. State of Charge (SOC) XDR sentence
        if (soc !== null) {
          const socSentence = `$IIXDR,P,${soc.toFixed(0)},P,${batteryId}_SOC`;
          messages.push(socSentence + '*' + this.calculateChecksum(socSentence.substring(1)));
        }
        
        // 5. Nominal Voltage (NOM) XDR sentence
        const nominalVoltage = instanceDef.nominal_voltage || 12;
        const nomSentence = `$IIXDR,U,${nominalVoltage.toFixed(0)},V,${batteryId}_NOM`;
        messages.push(nomSentence + '*' + this.calculateChecksum(nomSentence.substring(1)));
        
        // 6. Battery Capacity (CAP) XDR sentence
        if (instanceDef.capacity) {
          const capSentence = `$IIXDR,V,${instanceDef.capacity.toFixed(0)},H,${batteryId}_CAP`;
          messages.push(capSentence + '*' + this.calculateChecksum(capSentence.substring(1)));
        }
        
        // 7. Battery Chemistry (CHEM) XDR sentence
        const chemistry = instanceDef.chemistry || 'Unknown';
        const chemSentence = `$IIXDR,G,${chemistry},,${batteryId}_CHEM`;
        messages.push(chemSentence + '*' + this.calculateChecksum(chemSentence.substring(1)));
        
        console.log(`🔋 Generated battery ${instance} (${batteryName}): V=${voltage.toFixed(2)}V, I=${current?.toFixed(2)}A, SOC=${soc?.toFixed(0)}%, T=${temperature?.toFixed(1)}°C`);
      }
    });

    return messages;
  }

  /**
   * OLD FORMAT: Generate battery XDR from top-level scenario.data.battery_voltage
   */
  generateYAMLBatterySentenceOldFormat(sentenceDef) {
    const instance = sentenceDef.instance || 0;
    
    if (!this.scenario?.data?.battery_voltage) {
      return [];
    }

    // Get battery configuration for this instance
    const batteryEntries = Object.entries(this.scenario.data.battery_voltage);
    if (instance >= batteryEntries.length) {
      return [];
    }

    const [batteryKey, batteryConfig] = batteryEntries[instance];
    const voltage = this.getYAMLDataValue(batteryKey, batteryConfig);
    
    if (voltage !== null) {
      const messages = [];
      const batteryId = `BAT_${instance}`;
      
      // Generate comprehensive battery data using calculated values
      const voltageSentence = `$IIXDR,U,${voltage.toFixed(1)},V,${batteryId}`;
      messages.push(voltageSentence + '*' + this.calculateChecksum(voltageSentence.substring(1)));
      
      const current = this.calculateBatteryCurrent(voltage, instance, batteryConfig);
      const currentSentence = `$IIXDR,I,${current.toFixed(1)},A,${batteryId}`;
      messages.push(currentSentence + '*' + this.calculateChecksum(currentSentence.substring(1)));
      
      const temperature = this.calculateBatteryTemperature(voltage, instance);
      const tempSentence = `$IIXDR,C,${temperature.toFixed(1)},C,${batteryId}_TMP`;
      messages.push(tempSentence + '*' + this.calculateChecksum(tempSentence.substring(1)));
      
      const soc = this.calculateBatterySOC(voltage, instance);
      const socSentence = `$IIXDR,P,${soc.toFixed(0)},P,${batteryId}_SOC`;
      messages.push(socSentence + '*' + this.calculateChecksum(socSentence.substring(1)));
      
      return messages;
    }

    return [];
  }

  /**
   * Calculate realistic battery current based on voltage and battery state
   */
  calculateBatteryCurrent(voltage, instance, batteryConfig) {
    const currentTime = Date.now();
    const timeSeconds = (currentTime / 1000) % 3600; // Hour cycle
    
    // Different current profiles for different battery types
    const batteryProfiles = [
      { // House battery - moderate cycling
        baseLoad: -8.5,
        chargingCurrent: 15,
        chargingVoltage: 13.8
      },
      { // Engine battery - minimal load, alternator charging
        baseLoad: -1.2,
        chargingCurrent: 25,
        chargingVoltage: 14.2
      },
      { // Thruster battery - high current capability
        baseLoad: -2.0,
        chargingCurrent: 40,
        chargingVoltage: 13.6
      },
      { // Backup/Windlass battery
        baseLoad: -0.8,
        chargingCurrent: 12,
        chargingVoltage: 13.4
      }
    ];
    
    const profile = batteryProfiles[instance % batteryProfiles.length];
    
    // Determine if charging (voltage above charging threshold)
    if (voltage > profile.chargingVoltage - 0.5) {
      // Charging - positive current with some variation
      const chargingPhase = Math.sin(timeSeconds * 0.001) * 0.3 + 0.7; // 0.4 to 1.0
      return profile.chargingCurrent * chargingPhase + (Math.random() - 0.5) * 2;
    } else {
      // Discharging - negative current
      const loadVariation = 1 + Math.sin(timeSeconds * 0.002) * 0.5; // 0.5 to 1.5 load factor
      return profile.baseLoad * loadVariation + (Math.random() - 0.5) * 1.5;
    }
  }

  /**
   * Calculate battery temperature based on current and ambient conditions
   */
  calculateBatteryTemperature(voltage, instance) {
    const currentTime = Date.now();
    const ambientTemp = 22 + Math.sin(currentTime * 0.0001) * 5; // 17-27°C ambient
    
    // Battery generates heat when charging/discharging heavily
    const thermalOffset = Math.abs(voltage - 12.6) * 2; // Heat from charging/deep discharge
    const instanceOffset = instance * 0.5; // Slight variation between batteries
    
    return ambientTemp + thermalOffset + instanceOffset + (Math.random() - 0.5) * 1;
  }

  /**
   * Calculate State of Charge percentage based on voltage
   */
  calculateBatterySOC(voltage, instance) {
    // Standard 12V lead-acid voltage to SOC mapping
    const voltageSOCMap = [
      { voltage: 12.6, soc: 100 },
      { voltage: 12.5, soc: 90 },
      { voltage: 12.42, soc: 80 },
      { voltage: 12.32, soc: 70 },
      { voltage: 12.20, soc: 60 },
      { voltage: 12.06, soc: 50 },
      { voltage: 11.9, soc: 40 },
      { voltage: 11.75, soc: 30 },
      { voltage: 11.58, soc: 20 },
      { voltage: 11.31, soc: 10 },
      { voltage: 10.5, soc: 0 }
    ];
    
    // Handle voltages above 12.6V (charging) - cap at 100%
    if (voltage >= 12.6) {
      return 100;
    }
    
    // Linear interpolation between voltage points
    for (let i = 0; i < voltageSOCMap.length - 1; i++) {
      const current = voltageSOCMap[i];
      const next = voltageSOCMap[i + 1];
      
      if (voltage >= next.voltage) {
        const ratio = (voltage - next.voltage) / (current.voltage - next.voltage);
        const soc = next.soc + ratio * (current.soc - next.soc);
        return Math.max(0, Math.min(100, soc)); // Ensure 0-100% range
      }
    }
    
    return 0; // Below minimum voltage
  }

  /**
   * Get nominal voltage for battery instance
   */
  getBatteryNominalVoltage(instance) {
    const nominalVoltages = [
      12.0, // House battery - standard 12V
      12.0, // Engine battery - standard 12V  
      12.0, // Thruster battery - standard 12V
      12.0  // Backup battery - standard 12V
    ];
    
    return nominalVoltages[instance % nominalVoltages.length];
  }

  /**
   * Get battery chemistry for instance
   */
  getBatteryChemistry(instance) {
    const chemistries = [
      'AGM',     // House battery - AGM deep cycle
      'WET',     // Engine battery - wet cell starter
      'LiFePO4', // Thruster battery - lithium for high current
      'GEL'      // Backup battery - gel maintenance-free
    ];
    
    return chemistries[instance % chemistries.length];
  }

  /**
   * Generate tank XDR sentence from YAML configuration
   */
  generateYAMLTankSentence(sentenceDef) {
    // New YAML structure: data is inside sentenceDef.instances array
    if (!sentenceDef.instances || sentenceDef.instances.length === 0) {
      return null;
    }

    const messages = [];
    
    // Process each tank instance defined in the sentence
    sentenceDef.instances.forEach(instanceDef => {
      const instance = instanceDef.instance;
      const tankType = instanceDef.tank_type || 'FUEL';
      const tankData = instanceDef.data;
      
      if (!tankData || !tankData.level) return;
      
      // Get level from nested data structure (0.0-1.0 ratio)
      const level = this.getYAMLDataValue('level', tankData.level);
      
      if (level !== null) {
        // Generate tank identifier: FUEL_00, WATR_00, etc.
        const tankId = `${tankType}_${String(instance).padStart(2, '0')}`;
        
        // XDR format for tank level: measurement type V (volume ratio), value, units P (percentage/ratio), identifier
        // Parser expects 'P' for percentage/ratio format (0.0-1.0 gets converted to 0-100%)
        const sentence = `$IIXDR,V,${level.toFixed(3)},P,${tankId}`;
        const checksum = this.calculateChecksum(sentence.substring(1));
        messages.push(`${sentence}*${checksum}`);
        
        console.log(`🪣 Generated tank ${tankId}: ${(level * 100).toFixed(1)}% (${level.toFixed(3)} ratio)`);
      }
    });

    return messages.length > 0 ? messages : null;
  }

  /**
   * Generate temperature XDR sentence from YAML configuration
   */
  generateYAMLTemperatureSentence(sentenceDef) {
    // New YAML structure: data is inside sentenceDef.instances array
    if (!sentenceDef.instances || sentenceDef.instances.length === 0) {
      return null;
    }

    const messages = [];
    
    // Process each temperature instance defined in the sentence
    sentenceDef.instances.forEach(instanceDef => {
      const instance = instanceDef.instance;
      const location = instanceDef.location || 'TEMP';
      const locationName = instanceDef.location_name || `Temp ${instance}`;
      const tempData = instanceDef.data;
      
      if (!tempData || !tempData.temperature) return;
      
      // Get temperature from nested data structure
      const temperature = this.getYAMLDataValue('temperature', tempData.temperature);
      
      if (temperature !== null) {
        // Generate temperature identifier: TEMP_00, SEAW_00, AIRX_01, ENGR_02, etc.
        const tempId = `${location}_${String(instance).padStart(2, '0')}`;
        
        // XDR format for temperature: measurement type C (celsius), value, units C, identifier
        const sentence = `$IIXDR,C,${temperature.toFixed(1)},C,${tempId}`;
        const checksum = this.calculateChecksum(sentence.substring(1));
        messages.push(`${sentence}*${checksum}`);
        
        console.log(`🌡️ Generated temperature ${tempId} (${locationName}): ${temperature.toFixed(1)}°C`);
      }
    });

    return messages.length > 0 ? messages : null;
  }

  /**
   * Generate RPM sentence from YAML configuration
   * Supports template-based parameter interpolation per Story 7.2
   */
  generateYAMLRPMSentence(sentenceDef) {
    // Use template-based parameter replacement if sentence template and parameters are defined
    if (sentenceDef.sentence && sentenceDef.parameters) {
      const sentenceWithParams = this.replaceSentenceParameters(sentenceDef.sentence, sentenceDef.parameters);
      
      // Remove the *XX placeholder and calculate real checksum
      const sentenceWithoutChecksum = sentenceWithParams.replace(/\*XX$/, '');
      const checksum = this.calculateChecksum(sentenceWithoutChecksum.substring(1));
      return `${sentenceWithoutChecksum}*${checksum}`;
    }
    
    // New YAML structure: instances array with data_path references
    if (sentenceDef.instances && sentenceDef.instances.length > 0) {
      const messages = [];
      
      sentenceDef.instances.forEach(instanceDef => {
        const instance = instanceDef.instance || 0;
        const source = instanceDef.source || 'E';
        const dataPath = instanceDef.data_path;
        
        if (!dataPath) return;
        
        // Parse data path (e.g., "engine.rpm")
        const pathParts = dataPath.split('.');
        let dataConfig = this.scenario?.data;
        
        for (const part of pathParts) {
          if (!dataConfig) break;
          dataConfig = dataConfig[part];
        }
        
        if (dataConfig) {
          const rpm = this.getYAMLDataValue('rpm', dataConfig);
          
          if (rpm !== null) {
            const sentence = `$IIRPM,${source},${instance},${rpm.toFixed(0)},A,`;
            const checksum = this.calculateChecksum(sentence.substring(1));
            messages.push(`${sentence}*${checksum}`);
            
            console.log(`⚙️ Generated RPM for engine ${instance}: ${rpm.toFixed(0)} RPM`);
          }
        }
      });
      
      return messages.length > 0 ? messages[0] : null;  // Return first message for single-instance
    }
    
    // Legacy format support for backward compatibility
    const instance = sentenceDef.instance || 0;
    
    // Try modern engine configuration structure
    if (this.scenario?.engine?.main_engine?.rpm_normal) {
      const baseRPM = this.scenario.engine.main_engine.rpm_normal;
      
      // Add realistic RPM variation from engine load and vibration
      const timeSeconds = (Date.now() - (this.stats.startTime || Date.now())) / 1000;
      const loadVariation = Math.sin(timeSeconds * 0.03) * 15; // ±15 RPM from load changes
      const vibration = (Math.random() - 0.5) * 10; // ±5 RPM from engine vibration
      const rpm = Math.round(baseRPM + loadVariation + vibration);
      
      // Use 'E' for engine source (not 'S' for shaft) - required by NmeaSensorProcessor
      const sentence = `$IIRPM,E,${instance},${rpm.toFixed(0)},A,`;
      const checksum = this.calculateChecksum(sentence.substring(1));
      return `${sentence}*${checksum}`;
    }
    
    // Fall back to legacy data.engine_rpm structure
    if (this.scenario?.data?.engine_rpm) {
      const engineEntries = Object.entries(this.scenario.data.engine_rpm);
      if (instance >= engineEntries.length) {
        return null;
      }

      const [engineKey, engineConfig] = engineEntries[instance];
      const rpm = this.getYAMLDataValue(engineKey, engineConfig);
      
      if (rpm !== null) {
        const sentence = `$IIRPM,E,${instance},${rpm.toFixed(0)},A,`;
        const checksum = this.calculateChecksum(sentence.substring(1));
        return `${sentence}*${checksum}`;
      }
    }

    return null;
  }

  /**
   * Generate XDR transducer sentence from YAML configuration
   * Supports template-based parameter interpolation per Story 7.2
   * Supports multiple sensor types based on subtypes configuration (legacy)
   */
  generateYAMLXDRSentence(sentenceDef) {
    // Use template-based parameter replacement if sentence template and parameters are defined
    if (sentenceDef.sentence && sentenceDef.parameters) {
      const sentenceWithParams = this.replaceSentenceParameters(sentenceDef.sentence, sentenceDef.parameters);
      
      // Remove the *XX placeholder and calculate real checksum
      const sentenceWithoutChecksum = sentenceWithParams.replace(/\*XX$/, '');
      const checksum = this.calculateChecksum(sentenceWithoutChecksum.substring(1));
      return `${sentenceWithoutChecksum}*${checksum}`;
    }
    
    // New YAML structure: measurements array with data_path references
    if (sentenceDef.measurements && sentenceDef.measurements.length > 0) {
      const messages = [];
      
      sentenceDef.measurements.forEach(measurement => {
        const measurementType = measurement.measurement_type;
        const identifier = measurement.identifier;
        const units = measurement.units || '';
        const dataPath = measurement.data_path;
        
        if (!dataPath) return;
        
        // Parse data path (e.g., "engine.coolant_temp")
        const pathParts = dataPath.split('.');
        let dataConfig = this.scenario?.data;
        
        for (const part of pathParts) {
          if (!dataConfig) break;
          dataConfig = dataConfig[part];
        }
        
        if (dataConfig) {
          const value = this.getYAMLDataValue(identifier, dataConfig);
          
          if (value !== null) {
            const sentence = `$IIXDR,${measurementType},${value.toFixed(1)},${units},${identifier}`;
            const checksum = this.calculateChecksum(sentence.substring(1));
            messages.push(`${sentence}*${checksum}`);
            
            console.log(`📊 Generated XDR ${identifier}: ${value.toFixed(1)} ${units}`);
          }
        }
      });
      
      return messages.length > 0 ? messages[0] : null;  // Return first message for single measurement
    }
    
    // Legacy format support for backward compatibility
    if (!sentenceDef.subtypes || !Array.isArray(sentenceDef.subtypes)) {
      return null;
    }

    const transducers = [];
    const scenario = this.scenario;
    
    sentenceDef.subtypes.forEach(subtype => {
      switch (subtype) {
        case 'coolant_temperature':
          if (scenario?.engine?.main_engine) {
            const temp = scenario.engine.main_engine.coolant_normal || 180;
            transducers.push(`C,${temp.toFixed(1)},F,ENGINE_1`);
          }
          break;
        case 'oil_pressure':
          if (scenario?.engine?.main_engine) {
            const pressure = scenario.engine.main_engine.oil_normal || 45;
            transducers.push(`P,${pressure.toFixed(1)},P,ENGINE_1`);
          }
          break;
        case 'alternator_voltage':
          if (scenario?.engine?.alternator) {
            const voltage = scenario.engine.alternator.voltage_normal || 13.8;
            transducers.push(`U,${voltage.toFixed(2)},V,ALTERNATOR`);
          }
          break;
      }
    });

    if (transducers.length === 0) {
      return null;
    }

    const sentence = `$IIXDR,${transducers.join(',')}`;
    const checksum = this.calculateChecksum(sentence.substring(1));
    return `${sentence}*${checksum}`;
  }

  /**
   * Generate RSA rudder sensor angle sentence from YAML configuration
   */
  generateYAMLRSASentence(sentenceDef) {
    // Get rudder angle from YAML data section
    const rudderConfig = this.scenario?.data?.rudder?.angle;
    if (!rudderConfig) {
      console.warn('⚠️ RSA: No rudder.angle data configured in YAML');
      return null;
    }

    const rudderAngle = this.getYAMLDataValue('rudder_angle', rudderConfig);
    if (rudderAngle === null) {
      return null;
    }

    const sentence = `$IIRSA,${rudderAngle.toFixed(1)},A,,`;
    const checksum = this.calculateChecksum(sentence.substring(1));
    return `${sentence}*${checksum}`;
  }

  /**
   * Get data value from YAML configuration using functions
   * Supports Story 7.2 variation types: sine, sine_wave, linear, gaussian, random, constant
   */
  getYAMLDataValue(dataKey, dataConfig) {
    if (!dataConfig || typeof dataConfig !== 'object') {
      return null;
    }

    const currentTime = Date.now() - (this.stats.startTime || Date.now());
    
    try {
      switch (dataConfig.type) {
        case 'sine':
        case 'sine_wave':
          return this.generateSineWave(dataConfig, currentTime);
        case 'tidal_cycle':
          return this.generateTidalCycle(dataConfig, currentTime);
        case 'coastal_variation':
          return this.generateCoastalVariation(dataConfig, currentTime);
        case 'coastal_wind':
          return this.generateCoastalWind(dataConfig, currentTime);
        case 'coastal_track':
        case 'boat_movement':
          // Position data - not a simple value
          return null;
        case 'gps_track':
          // For speed data, calculate from waypoint distances; for heading, calculate bearing
          if (dataKey === 'speed') {
            return this.getSpeedFromTrack();
          } else if (dataKey === 'heading') {
            return this.getCurrentHeading();
          }
          return null;
        case 'polar_sailing':
          return this.generatePolarSailing(dataConfig, currentTime);
        case 'linear':
          return this.generateLinear(dataConfig, currentTime);
        case 'gaussian':
          return this.generateGaussian(dataConfig, currentTime);
        case 'random_walk':
          return this.generateRandomWalk(dataConfig, currentTime);
        case 'linear_decline':
          return this.generateLinearDecline(dataConfig, currentTime);
        case 'linear_increase':
          return this.generateLinearIncrease(dataConfig, currentTime);
        case 'random':
          return this.generateRandom(dataConfig);
        case 'sawtooth':
          return this.generateSawtooth(dataConfig, currentTime);
        case 'triangle':
          return this.generateTriangle(dataConfig, currentTime);
        case 'square':
          return this.generateSquare(dataConfig, currentTime);
        case 'constant':
          return dataConfig.value;
        default:
          console.warn(`⚠️ Unknown data type: ${dataConfig.type}`);
          return null;
      }
    } catch (error) {
      console.error(`❌ Error generating data for ${dataKey}:`, error.message);
      return null;
    }
  }

  /**
   * Generate Gaussian random values
   */
  generateGaussian(config, currentTime) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const value = config.mean + z0 * config.std_dev;
    return Math.max(config.min || -Infinity, Math.min(config.max || Infinity, value));
  }

  /**
   * Generate sine wave values
   * Supports both "base" and "start" parameter naming for compatibility
   * Supports both "frequency" (Hz) and "period" (seconds) for wave definition
   * Supports min/max range (auto-calculates amplitude and base)
   */
  generateSineWave(config, currentTime) {
    const time = currentTime / 1000; // Convert to seconds
    
    // Calculate phase: support both frequency (Hz) and period (seconds)
    let phase;
    if (config.period) {
      // Period in seconds - one complete cycle
      phase = (2 * Math.PI * time) / config.period;
    } else if (config.frequency) {
      // Frequency in Hz - cycles per second
      phase = 2 * Math.PI * config.frequency * time;
    } else {
      // Default to 60-second period if neither specified
      phase = (2 * Math.PI * time) / 60;
    }
    
    // Apply phase offset if specified (in degrees)
    if (config.phase !== undefined) {
      phase += (config.phase * Math.PI) / 180;
    }
    
    // Calculate amplitude and base from min/max if provided
    let amplitude, baseValue;
    if (config.min !== undefined && config.max !== undefined) {
      // Calculate amplitude and base from min/max range
      amplitude = (config.max - config.min) / 2;
      baseValue = config.min + amplitude;
    } else if (config.amplitude !== undefined) {
      // Use explicit amplitude if provided
      amplitude = config.amplitude;
      baseValue = config.base || config.start || 0;
    } else {
      // No amplitude or range specified - return 0
      return 0;
    }
    
    const value = baseValue + amplitude * Math.sin(phase);
    
    // Apply min/max constraints if specified (for safety)
    if (config.min !== undefined || config.max !== undefined) {
      return Math.max(config.min || -Infinity, Math.min(config.max || Infinity, value));
    }
    
    return value;
  }

  /**
   * Generate linear decline values
   */
  generateLinearDecline(config, currentTime) {
    const time = currentTime / 1000; // Convert to seconds
    return Math.max(0, config.start + config.rate * time);
  }

  /**
   * Generate linear increase values
   */
  generateLinearIncrease(config, currentTime) {
    const time = currentTime / 1000; // Convert to seconds
    const value = config.start + config.rate * time;
    return (typeof config.max !== 'undefined') ? Math.min(config.max, value) : value;
  }

  /**
   * Generate linear values (used by comprehensive-engine-monitoring.yml)
   * Supports both "start" and "rate" format
   */
  generateLinear(config, currentTime) {
    if (config.rate !== undefined) {
      return this.generateLinearIncrease(config, currentTime);
    } else if (config.start !== undefined) {
      // Constant value if no rate specified
      return config.start;
    }
    return 0;
  }

  /**
   * Generate random values within min/max range
   * Used by comprehensive-engine-monitoring.yml for pressure variations
   */
  generateRandom(config) {
    const min = config.min || 0;
    const max = config.max || 1;
    return min + Math.random() * (max - min);
  }

  /**
   * Generate sawtooth wave values
   * Linear ramp from min to max, then sharp drop back to min
   * Perfect for testing monotonic increases with resets
   */
  generateSawtooth(config, currentTime) {
    const time = currentTime / 1000; // Convert to seconds
    const period = config.period || 60; // Default 60-second period
    const min = config.min || 0;
    const max = config.max || 1;
    
    // Calculate position within current period (0 to 1)
    const phase = (time % period) / period;
    
    // Linear ramp from min to max
    const value = min + (max - min) * phase;
    
    return value;
  }

  /**
   * Generate triangle wave values
   * Linear ramp up from min to max, then linear ramp down to min
   * Symmetric pattern good for testing bidirectional changes
   */
  generateTriangle(config, currentTime) {
    const time = currentTime / 1000; // Convert to seconds
    const period = config.period || 60; // Default 60-second period
    const min = config.min || 0;
    const max = config.max || 1;
    
    // Calculate position within current period (0 to 1)
    const phase = (time % period) / period;
    
    // Triangle wave: ramp up for first half, ramp down for second half
    let value;
    if (phase < 0.5) {
      // Rising edge: 0 to 0.5 maps to min to max
      value = min + (max - min) * (phase * 2);
    } else {
      // Falling edge: 0.5 to 1 maps to max to min
      value = max - (max - min) * ((phase - 0.5) * 2);
    }
    
    return value;
  }

  /**
   * Generate square wave values
   * Step function alternating between min and max
   * Perfect for testing binary state changes and thresholds
   */
  generateSquare(config, currentTime) {
    const time = currentTime / 1000; // Convert to seconds
    const period = config.period || 60; // Default 60-second period
    const min = config.min || 0;
    const max = config.max || 1;
    const dutyCycle = config.duty_cycle || 0.5; // Default 50% duty cycle
    
    // Calculate position within current period (0 to 1)
    const phase = (time % period) / period;
    
    // Square wave: high for duty_cycle portion, low for remainder
    return phase < dutyCycle ? max : min;
  }

  /**
   * Generate tidal cycle depth variation
   * Sinusoidal pattern with min/max limits
   */
  generateTidalCycle(config, currentTime) {
    const time = currentTime / 1000; // Convert to seconds
    const tidalPeriod = config.tidal_period || 600;
    const phase = (time / tidalPeriod) * 2 * Math.PI;
    const tidalHeight = Math.sin(phase) * (config.tidal_range / 2);
    const depth = config.base_depth + tidalHeight;
    
    return Math.max(
      config.min_depth || 0, 
      Math.min(config.max_depth || 100, depth)
    );
  }

  /**
   * Generate coastal wind angle variation
   * Base angle with thermal effects
   */
  generateCoastalVariation(config, currentTime) {
    const time = currentTime / 1000;
    const thermalPeriod = config.variation_period || 300;
    const phase = (time / thermalPeriod) * 2 * Math.PI;
    const thermalShift = Math.sin(phase) * (config.thermal_shift || 0);
    
    let angle = (config.base || 0) + thermalShift;
    
    // Normalize to 0-360
    while (angle < 0) angle += 360;
    while (angle >= 360) angle -= 360;
    
    return angle;
  }

  /**
   * Generate coastal wind speed with thermal effects and gusts
   */
  generateCoastalWind(config, currentTime) {
    const time = currentTime / 1000;
    
    // Base wind with thermal variation
    const thermalPeriod = 300; // 5 minutes
    const phase = (time / thermalPeriod) * 2 * Math.PI;
    const thermalEffect = Math.sin(phase) * (config.thermal_effect || 0);
    
    // Add gust variation (random)
    const gustFactor = 1 + (Math.random() - 0.5) * 2 * (config.gusts || 0);
    
    const speed = (config.base || 10) + thermalEffect;
    const gustSpeed = speed * gustFactor;
    
    return Math.max(
      config.min || 0,
      Math.min(config.max || 50, gustSpeed)
    );
  }

  /**
   * Generate polar-based sailing speed
   * Simplified version - actual polar lookup would need wind data
   */
  generatePolarSailing(config, currentTime) {
    // For now, use base speed with variations
    const baseSpeed = config.base_speed || 5.5;
    const tidalCurrent = config.tidal_current || 0;
    const leewayFactor = config.leeway_factor || 1.0;
    
    const speed = (baseSpeed + tidalCurrent) * leewayFactor;
    
    return Math.max(
      config.min || 0,
      Math.min(config.max || 15, speed)
    );
  }

  /**
   * Generate random walk values (for heading, angle variations)
   */
  generateRandomWalk(config, currentTime) {
    if (!this.randomWalkState) {
      this.randomWalkState = {};
    }
    
    const key = JSON.stringify(config);
    if (!this.randomWalkState[key]) {
      this.randomWalkState[key] = config.start || 0;
    }
    
    const stepSize = config.step_size || 1;
    const step = (Math.random() - 0.5) * 2 * stepSize;
    this.randomWalkState[key] += step;
    
    // Apply bounds if specified
    if (config.bounds) {
      const [min, max] = config.bounds;
      this.randomWalkState[key] = Math.max(min, Math.min(max, this.randomWalkState[key]));
    }
    
    return this.randomWalkState[key];
  }

  /**
   * Replace parameter placeholders in sentence templates with computed values
   * @param {string} sentenceTemplate - Sentence with {parameter_name} placeholders
   * @param {object} parameters - Parameter definitions with type, base, amplitude, etc.
   * @returns {string} Sentence with parameters replaced with computed values
   */
  replaceSentenceParameters(sentenceTemplate, parameters) {
    if (!parameters || Object.keys(parameters).length === 0) {
      return sentenceTemplate;
    }

    let result = sentenceTemplate;
    const currentTime = Date.now() - (this.stats.startTime || Date.now());

    // Find all {parameter} placeholders and replace with computed values
    Object.entries(parameters).forEach(([paramName, paramConfig]) => {
      const placeholder = `{${paramName}}`;
      
      if (result.includes(placeholder)) {
        // Generate value using the parameter configuration
        let value = this.getYAMLDataValue(paramName, paramConfig);
        
        if (value !== null && value !== undefined) {
          // Apply formatting if specified
          if (paramConfig.format) {
            value = this.formatValue(value, paramConfig.format);
          } else {
            // Default formatting based on type
            value = typeof value === 'number' ? value.toFixed(1) : String(value);
          }
          
          result = result.replace(placeholder, value);
        }
      }
    });

    return result;
  }

  /**
   * Format a value according to a format string
   * @param {number} value - Value to format
   * @param {string} format - Format string (e.g., "0000", "00.0", "00.00")
   * @returns {string} Formatted value
   */
  formatValue(value, format) {
    if (format.includes('.')) {
      // Decimal format
      const parts = format.split('.');
      const decimals = parts[1].length;
      const integerPadding = parts[0].length;
      
      const formatted = Math.abs(value).toFixed(decimals);
      const [intPart, decPart] = formatted.split('.');
      const paddedInt = intPart.padStart(integerPadding, '0');
      
      return value < 0 ? `-${paddedInt}.${decPart}` : `${paddedInt}.${decPart}`;
    } else {
      // Integer format
      const rounded = Math.round(value);
      return Math.abs(rounded).toString().padStart(format.length, '0');
    }
  }

  /**
   * Sensor-based NMEA 0183 generators (protocol-agnostic)
   */
  
  generateDepthFromSensor(sensor, sentenceType) {
    let depth = 10.0; // meters below transducer
    
    // Get depth from sensor data_generation
    if (sensor.data_generation?.depth) {
      depth = this.getYAMLDataValue('depth', sensor.data_generation.depth);
    }
    
    // Debug: Log depth value occasionally
    if (Math.random() < 0.1) { // 10% sampling rate for logging
      console.log(`📏 Depth (${sentenceType}): ${depth?.toFixed(2)}m`);
    }
    
    // Get physical properties
    const transducerDepth = sensor.physical_properties?.transducer_depth || 0;
    const keelOffset = sensor.physical_properties?.keel_offset || 0;
    const maxRange = sensor.physical_properties?.max_range || null;
    
    // Generate appropriate sentence type
    if (sentenceType === 'DPT') {
      return this.generateDPT(depth, transducerDepth, maxRange);
    } else if (sentenceType === 'DBK') {
      // DBK = depth below keel = measured depth - transducer depth - keel offset
      const depthBelowKeel = Math.max(0, depth - transducerDepth - keelOffset);
      return this.generateDBK(depthBelowKeel);
    } else {
      // Default to DBT
      return this.generateDBT(depth);
    }
  }
  
  generateSpeedFromSensor(sensor, sentenceType) {
    let speedKnots = 5.0;

    // Get speed from sensor data_generation
    if (sensor.data_generation?.speed) {
      const speedConfig = sensor.data_generation.speed;

      // Handle gps_track type - calculate from waypoints
      if (speedConfig.type === 'gps_track' || speedConfig.source === 'gps_track') {
        const calculatedSpeed = this.getSpeedFromTrack();
        if (calculatedSpeed !== null) {
          speedKnots = calculatedSpeed;
        }
      } else {
        // Use standard data generation
        const extractedSpeed = this.getYAMLDataValue('speed', speedConfig);
        // Only use extracted speed if it's valid (not null)
        if (extractedSpeed !== null && extractedSpeed !== undefined) {
          speedKnots = extractedSpeed;
        }
      }
    }

    // Apply calibration factor
    const calibrationFactor = sensor.physical_properties?.calibration_factor || 1.0;
    speedKnots *= calibrationFactor;

    // Determine sentence type based on speed_type property
    const speedType = sensor.physical_properties?.speed_type || 'STW';
    const instance = sensor.instance || 0;

    // Generate multiple sentences for speed sensor (like GPS does)
    const sentences = [];

    // Handle VLW (Distance Log) separately - it needs cumulative distance tracking
    if (sentenceType === 'VLW') {
      return this.generateVLW(speedKnots, instance);
    }

    // Use VTG for SOG (Speed Over Ground), VHW for STW (Speed Through Water)
    if (speedType === 'SOG' || sentenceType === 'VTG') {
      // Generate VTG sentence for SOG
      const heading = this.getCurrentHeading();
      const speedKmh = (speedKnots * 1.852).toFixed(1);
      const sentence = `VTG,${heading.toFixed(1)},T,,M,${speedKnots.toFixed(1)},N,${speedKmh},K,A`;
      const checksum = this.calculateChecksum(sentence);
      console.log(`🚤 VTG (instance ${instance}): SOG=${speedKnots.toFixed(2)} knots, heading=${heading.toFixed(1)}°`);
      // Changed from GP to II for NKE Display Pro compatibility
      sentences.push(`$II${sentence}*${checksum}`);
    } else {
      // Generate VHW sentence for STW
      console.log(`🚤 VHW (instance ${instance}): STW=${speedKnots.toFixed(2)} knots`);
      sentences.push(this.generateVHW(speedKnots));
    }

    // Also generate VLW for STW-based distance log
    // VLW is important for navigation and should be sent alongside speed
    if (speedType === 'STW') {
      sentences.push(this.generateVLW(speedKnots, instance));
    }

    // Return array if multiple sentences, single sentence otherwise
    return sentences.length > 1 ? sentences : sentences[0];
  }
  
  generateWindFromSensor(sensor, sentenceType) {
    let windSpeed = 10.0;
    let windAngle = 45.0;
    
    // Get wind data from sensor data_generation
    if (sensor.data_generation?.wind_speed) {
      windSpeed = this.getYAMLDataValue('wind_speed', sensor.data_generation.wind_speed);
    }
    if (sensor.data_generation?.wind_angle) {
      windAngle = this.getYAMLDataValue('wind_angle', sensor.data_generation.wind_angle);
    }
    
    return this.generateMWV(windAngle, windSpeed);
  }
  
  generateGPSFromSensor(sensor, sentenceTypes) {
    let latitude = 37.7749;
    let longitude = -122.4194;
    
    // Get position from sensor data_generation
    if (sensor.data_generation?.position?.type === 'gps_track') {
      // Use sensor-based waypoint navigation
      const position = this.getCurrentPositionFromSensor(sensor);
      if (position) {
        latitude = position.lat;
        longitude = position.lon;
      }
    } else if (sensor.data_generation?.latitude) {
      latitude = this.getYAMLDataValue('latitude', sensor.data_generation.latitude);
    }
    if (sensor.data_generation?.longitude && sensor.data_generation?.position?.type !== 'gps_track') {
      longitude = this.getYAMLDataValue('longitude', sensor.data_generation.longitude);
    }
    
    // Get calculated values for all sentences
    const heading = this.getCurrentHeading();
    const speedKnots = this.getSpeedFromTrack(); // SOG from GPS track
    
    // Real GPS emits multiple sentences per cycle
    // Typical consumer GPS: RMC, GGA, VTG (minimum realistic output)
    const sentences = [];
    
    // 1. RMC - Recommended Minimum (most important - position, speed, course, date)
    if (sentenceTypes.includes('RMC')) {
      const rmc = this.generateRMC(latitude, longitude, speedKnots, heading);
      if (rmc) sentences.push(rmc);
    }
    
    // 2. GGA - Position and fix quality
    if (sentenceTypes.includes('GGA')) {
      const gga = this.generateGGASentence(latitude, longitude, sensor);
      if (gga) sentences.push(gga);
    }
    
    // 3. VTG - Track and ground speed (provides SOG for speed widget)
    if (sentenceTypes.includes('VTG') && speedKnots !== null) {
      const speedKmh = (speedKnots * 1.852).toFixed(1);

      // Calculate magnetic track from true heading using configured variation
      // Fix: Populate magnetic fields properly instead of using malformed ",,M," pattern
      const variation = this.scenario?.parameters?.compass?.magnetic_variation || 0;
      const magneticTrack = ((heading + variation + 360) % 360).toFixed(1);

      const sentence = `VTG,${heading.toFixed(1)},T,${magneticTrack},M,${speedKnots.toFixed(1)},N,${speedKmh},K,A`;
      const checksum = this.calculateChecksum(sentence);
      // Changed from GP to II for NKE Display Pro compatibility (like DPT fix)
      sentences.push(`$IIVTG,${heading.toFixed(1)},T,${magneticTrack},M,${speedKnots.toFixed(1)},N,${speedKmh},K,A*${checksum}`);
    }
    
    // 4. GLL - Geographic Position (optional, some GPS units emit this)
    if (sentenceTypes.includes('GLL')) {
      const gll = this.generateGLL(latitude, longitude);
      if (gll) sentences.push(gll);
    }
    
    // Log once per cycle (not per sentence)
    if (sentences.length > 0 && speedKnots !== null) {
      console.log(`🛰️ GPS: ${sentences.length} sentences, SOG=${speedKnots.toFixed(2)} knots, heading=${heading.toFixed(1)}°`);
    }
    
    // Return array of sentences or single sentence if only one
    return sentences.length > 1 ? sentences : (sentences[0] || null);
  }
  
  generateHeadingFromSensor(sensor, sentenceType) {
    let heading = null;
    
    // Get heading from sensor data_generation
    if (sensor.data_generation?.heading) {
      const extractedHeading = this.getYAMLDataValue('heading', sensor.data_generation.heading);
      // For gps_track, getYAMLDataValue returns heading from getCurrentHeading()
      if (extractedHeading !== null && extractedHeading !== undefined) {
        heading = extractedHeading;
      }
    }
    
    // If no heading from data_generation, calculate from GPS waypoints
    if (heading === null || heading === undefined) {
      const calculatedHeading = this.getCurrentHeading();
      if (calculatedHeading !== null && calculatedHeading !== undefined) {
        heading = calculatedHeading;
      } else {
        // Final fallback if no heading available
        heading = 0.0;
      }
    }
    
    // Get deviation and variation from physical properties
    const deviation = sensor.physical_properties?.deviation || 0;
    const variation = sensor.physical_properties?.variation || 0;
    
    // Generate HDG sentence with deviation and variation
    return this.generateHDG(heading, deviation, variation);
  }
  
  generateTemperatureFromSensor(sensor, sentenceType) {
    let temperature = 20.0;
    
    // Get temperature from sensor data_generation
    if (sensor.data_generation?.temperature) {
      temperature = this.getYAMLDataValue('temperature', sensor.data_generation.temperature);
    }
    
    // Apply calibration offset
    const calibrationOffset = sensor.physical_properties?.calibration_offset || 0;
    temperature += calibrationOffset;
    
    // Get sensor location code for XDR transducer identifier
    // Priority: location (NMEA mnemonic code) > sensor_type (descriptive)
    const locationCode = sensor.physical_properties?.location || sensor.physical_properties?.sensor_type || 'TEMP';
    const instance = sensor.instance || 0;
    
    // Check if this is water temperature for MTW sentence
    // MTW (Mean Temperature of Water) is only for seawater temperature
    const isWaterTemp = locationCode.toUpperCase() === 'SEAW' ||
                        locationCode === 'sea_water' ||
                        locationCode === 'water' ||
                        sensor.physical_properties?.sensor_type === 'water';

    // Check if this is air temperature for MTA sentence
    // MTA (Meteorological Air Temperature) is for outside air temperature
    const isAirTemp = locationCode.toUpperCase() === 'AIRX' ||
                      locationCode === 'air' ||
                      sensor.physical_properties?.sensor_type === 'air';

    // Use MTW for seawater temperature
    if (sentenceType === 'MTW' && isWaterTemp) {
      const checksum = this.calculateChecksum(`MTW,${temperature.toFixed(1)},C`);
      return `$IIMTW,${temperature.toFixed(1)},C*${checksum}`;
    }
    // Use MTA for air temperature (NKE Display Pro expects this)
    else if (sentenceType === 'MTA' && isAirTemp) {
      const checksum = this.calculateChecksum(`MTA,${temperature.toFixed(1)},C`);
      return `$IIMTA,${temperature.toFixed(1)},C*${checksum}`;
    }
    else {
      // XDR format for all temperature sensors (including seawater/air if not using MTW/MTA)
      // Format: SEAW_00, AIRX_01, ENGR_02, TEMP_03
      const transducerName = `${locationCode.toUpperCase()}_${String(instance).padStart(2, '0')}`;
      const sentence = `IIXDR,C,${temperature.toFixed(1)},C,${transducerName}`;
      const checksum = this.calculateChecksum(sentence);
      return `$${sentence}*${checksum}`;
    }
  }

  generatePressureFromSensor(sensor, sentenceType) {
    // Get pressure from sensor data_generation (in millibars from YAML)
    let pressureMb = 1013.25;  // Default standard atmospheric pressure in millibars
    if (sensor.data_generation?.pressure) {
      pressureMb = this.getYAMLDataValue('pressure', sensor.data_generation.pressure);
    }
    
    // Get temperature and humidity if available (for MDA sentence)
    let temperatureC = null;
    let humidity = null;
    let dewPoint = null;
    
    if (sensor.data_generation?.temperature) {
      temperatureC = this.getYAMLDataValue('temperature', sensor.data_generation.temperature);
    }
    
    if (sensor.data_generation?.humidity) {
      humidity = this.getYAMLDataValue('humidity', sensor.data_generation.humidity);
    }
    
    // Calculate dew point if temp and humidity available (Magnus formula)
    if (temperatureC !== null && humidity !== null) {
      const a = 17.27;
      const b = 237.7;
      const alpha = ((a * temperatureC) / (b + temperatureC)) + Math.log(humidity / 100);
      dewPoint = (b * alpha) / (a - alpha);
    }

    // MDA = Meteorological Composite (full atmospheric data)
    if (sentenceType === 'MDA') {
      // Convert millibars to bars and inches of mercury
      const pressureBars = (pressureMb / 1000).toFixed(5);  // mb to bars
      const pressureInches = (pressureMb * 0.02953).toFixed(3);  // mb to inHg
      
      // Format temperature (Celsius)
      const airTempC = temperatureC !== null ? temperatureC.toFixed(2) : '';
      
      // Format humidity (percentage)
      const relHumid = humidity !== null ? Math.round(humidity) : '';
      
      // Format dew point (Celsius)
      const dewPointC = dewPoint !== null ? dewPoint.toFixed(2) : '';
      
      // MDA format: $IIMDA,<p_inHg>,I,<p_bars>,B,<air_temp>,C,<water_temp>,C,<rel_humid>,<abs_humid>,<dew_point>,C,<wind_dir_true>,T,<wind_dir_mag>,M,<wind_speed_kts>,N,<wind_speed_ms>,M
      // Leave water temp (field 7) and wind fields (13-20) empty - handled by other sentences
      const sentence = `IIMDA,${pressureInches},I,${pressureBars},B,${airTempC},C,,C,${relHumid},,${dewPointC},C,,T,,M,,N,,M`;
      const checksum = this.calculateChecksum(sentence);
      return `$${sentence}*${checksum}`;
    }
    
    // MMB = Barometric pressure only (simple format)
    if (sentenceType === 'MMB') {
      const pressureBars = (pressureMb / 1000).toFixed(4);  // Convert millibars to bars
      const pressureInches = (pressureMb * 0.02953).toFixed(3);  // Convert mb to inches of mercury

      const checksum = this.calculateChecksum(`MMB,${pressureInches},I,${pressureBars},B`);
      return `$IIMMB,${pressureInches},I,${pressureBars},B*${checksum}`;
    }
    
    // XDR format for pressure (generic transducer)
    // Transducer type 'P' for pressure, unit 'B' for bars
    const instance = sensor.instance || 0;
    const transducerName = `BARO_${String(instance).padStart(2, '0')}`;
    const pressureBars = (pressureMb / 1000).toFixed(4);
    const sentence = `IIXDR,P,${pressureBars},B,${transducerName}`;
    const checksum = this.calculateChecksum(sentence);
    return `$${sentence}*${checksum}`;
  }

  generateEngineFromSensor(sensor, sentenceType) {
    const messages = [];
    const engineInstance = sensor.physical_properties?.engine_instance || sensor.instance || 0;
    // Fix: Changed from ENGINE#X to ENGINE_X for NMEA parser compatibility
    const engineId = `ENGINE_${engineInstance}`;
    const source = engineInstance === 0 ? 'E' : 'E1';
    
    // Check which sensor types are configured
    const sensorTypes = sensor.physical_properties?.sensor_types || ['rpm'];
    
    // Generate Engine RPM sentence if configured (source='E')
    if (sensorTypes.includes('rpm') && sensor.data_generation?.rpm) {
      let rpm = this.getYAMLDataValue('rpm', sensor.data_generation.rpm);
      const rpmCalibration = sensor.physical_properties?.rpm_calibration || 1.0;
      rpm *= rpmCalibration;
      
      const rpmSentence = `IIRPM,E,${engineInstance},${rpm.toFixed(0)},100,A`;
      messages.push(`$${rpmSentence}*${this.calculateChecksum(rpmSentence)}`);
    }
    
    // Generate Shaft RPM sentence if configured (source='S')
    if (sensorTypes.includes('shaft_rpm') && sensor.data_generation?.shaft_rpm) {
      let shaftRpm;
      const shaftConfig = sensor.data_generation.shaft_rpm;
      
      // Check if shaft RPM is calculated from engine RPM
      if (shaftConfig.type === 'calculated' && shaftConfig.source === 'rpm') {
        const engineRpm = this.getYAMLDataValue('rpm', sensor.data_generation.rpm);
        const divisor = shaftConfig.divisor || sensor.physical_properties?.reduction_ratio || 1.0;
        shaftRpm = engineRpm / divisor;
      } else {
        // Otherwise use direct value generation
        shaftRpm = this.getYAMLDataValue('shaft_rpm', shaftConfig);
      }
      
      const shaftSentence = `IIRPM,S,${engineInstance},${shaftRpm.toFixed(0)},100,A`;
      messages.push(`$${shaftSentence}*${this.calculateChecksum(shaftSentence)}`);
    }
    
    // Build XDR sentence components for other engine parameters
    const xdrComponents = [];
    
    // Coolant Temperature (Celsius converted from data_generation which is in Fahrenheit)
    if (sensorTypes.includes('coolant_temp') && sensor.data_generation?.coolant_temp) {
      const tempF = this.getYAMLDataValue('coolant_temp', sensor.data_generation.coolant_temp);
      const tempC = (tempF - 32) * 5 / 9; // Convert F to C
      xdrComponents.push(`C,${tempC.toFixed(1)},C,${engineId}`);
    }
    
    // Oil Pressure (PSI)
    if (sensorTypes.includes('oil_pressure') && sensor.data_generation?.oil_pressure) {
      const pressure = this.getYAMLDataValue('oil_pressure', sensor.data_generation.oil_pressure);
      xdrComponents.push(`P,${pressure.toFixed(1)},P,${engineId}`);
    }
    
    // Alternator Voltage
    if (sensorTypes.includes('alternator_voltage') && sensor.data_generation?.alternator_voltage) {
      const voltage = this.getYAMLDataValue('alternator_voltage', sensor.data_generation.alternator_voltage);
      // Fix: Changed from ALTERNATOR#X to ALTERNATOR_X for NMEA parser compatibility
      xdrComponents.push(`U,${voltage.toFixed(2)},V,ALTERNATOR_${engineInstance}`);
    }
    
    // Generate compound XDR sentence if we have any components
    if (xdrComponents.length > 0) {
      const xdrSentence = `IIXDR,${xdrComponents.join(',')}`;
      messages.push(`$${xdrSentence}*${this.calculateChecksum(xdrSentence)}`);
    }
    
    // Fuel Rate (separate XDR sentence)
    if (sensorTypes.includes('fuel_rate') && sensor.data_generation?.fuel_rate) {
      const fuelRate = this.getYAMLDataValue('fuel_rate', sensor.data_generation.fuel_rate);
      const fuelSentence = `IIXDR,V,${fuelRate.toFixed(1)},L,${engineId}_FUEL`;
      messages.push(`$${fuelSentence}*${this.calculateChecksum(fuelSentence)}`);
    }
    
    // Engine Hours (separate XDR sentence)
    if (sensorTypes.includes('engine_hours') && sensor.data_generation?.engine_hours) {
      const hours = this.getYAMLDataValue('engine_hours', sensor.data_generation.engine_hours);
      // Fix: Changed transducer type from 'G' (non-standard) to 'N' (Generic) for NMEA compliance
      // Unit 'H' (hours) is acceptable with 'N' type
      const hoursSentence = `IIXDR,N,${hours.toFixed(1)},H,${engineId}_HOURS`;
      messages.push(`$${hoursSentence}*${this.calculateChecksum(hoursSentence)}`);
    }
    
    return messages;
  }
  
  generateBatteryFromSensor(sensor, sentenceType) {
    let voltage = 12.6;
    let current = 5.0;
    let temperature = 298.15; // Default 25°C in Kelvin
    
    // Get battery parameters from sensor data_generation
    if (sensor.data_generation?.voltage) {
      voltage = this.getYAMLDataValue('voltage', sensor.data_generation.voltage);
    }
    if (sensor.data_generation?.current) {
      current = this.getYAMLDataValue('current', sensor.data_generation.current);
    }
    if (sensor.data_generation?.temperature) {
      temperature = this.getYAMLDataValue('temperature', sensor.data_generation.temperature);
    }
    
    // Get battery properties
    const batteryInstance = sensor.physical_properties?.battery_instance || sensor.instance || 0;
    const batteryId = `BAT_${String(batteryInstance).padStart(2, '0')}`;
    const nominalVoltage = sensor.physical_properties?.nominal_voltage || 12;
    const capacity = sensor.physical_properties?.capacity || 100;
    const chemistry = sensor.physical_properties?.chemistry || 'FLA'; // Default to Flooded Lead-Acid
    
    // Calculate State of Charge (SOC) based on voltage (rough approximation for 12V lead-acid)
    // 12.6V+ = 100%, 12.4V = 75%, 12.2V = 50%, 12.0V = 25%, 11.8V = 0%
    let soc = 0;
    if (nominalVoltage === 12) {
      if (voltage >= 12.6) soc = 100;
      else if (voltage >= 12.4) soc = 75 + ((voltage - 12.4) / 0.2) * 25;
      else if (voltage >= 12.2) soc = 50 + ((voltage - 12.2) / 0.2) * 25;
      else if (voltage >= 12.0) soc = 25 + ((voltage - 12.0) / 0.2) * 25;
      else if (voltage >= 11.8) soc = ((voltage - 11.8) / 0.2) * 25;
      else soc = 0;
    } else {
      // Simple linear approximation for other voltages
      soc = Math.max(0, Math.min(100, ((voltage - (nominalVoltage * 0.9)) / (nominalVoltage * 0.2)) * 100));
    }
    
    // Temperature in Celsius
    const tempCelsius = temperature - 273.15;

    // Check XDR format preference from sensor configuration
    // Fix: Changed default from 'compound' to 'individual' for NKE Display Pro compatibility
    // Compound sentences exceed 82 char NMEA limit and use non-standard transducer types
    const xdrFormat = sensor.physical_properties?.xdr_format || 'individual';

    if (xdrFormat === 'compound') {
      // Legacy compound format - NOT RECOMMENDED for NKE Display Pro
      // Exceeds 82 character NMEA 0183 limit and contains non-standard transducer types
      const sentence = `IIXDR,U,${voltage.toFixed(2)},V,${batteryId},I,${current.toFixed(2)},A,${batteryId},C,${tempCelsius.toFixed(1)},C,${batteryId},P,${soc.toFixed(1)},%,${batteryId},U,${nominalVoltage.toFixed(1)},V,${batteryId}_NOM,V,${capacity.toFixed(0)},H,${batteryId},G,${chemistry},N,${batteryId}`;
      return [`$${sentence}*${this.calculateChecksum(sentence)}`];
    } else {
      // Generate individual XDR sentences (one per parameter)
      // Fix: Use only standard transducer types for NKE Display Pro compatibility
      // Each sentence under 82 characters
      const messages = [];

      // Voltage - Standard U (Voltage) transducer type
      const voltageSentence = `IIXDR,U,${voltage.toFixed(2)},V,${batteryId}`;
      messages.push(`$${voltageSentence}*${this.calculateChecksum(voltageSentence)}`);

      // Current - Standard I (Current) transducer type
      const currentSentence = `IIXDR,I,${current.toFixed(2)},A,${batteryId}`;
      messages.push(`$${currentSentence}*${this.calculateChecksum(currentSentence)}`);

      // Temperature - Standard C (Temperature) transducer type
      const tempSentence = `IIXDR,C,${tempCelsius.toFixed(1)},C,${batteryId}`;
      messages.push(`$${tempSentence}*${this.calculateChecksum(tempSentence)}`);

      // State of Charge - Standard P (Percentage) transducer type
      // Fix: Use 'P' unit instead of '%' for NMEA compliance
      const socSentence = `IIXDR,P,${soc.toFixed(1)},P,${batteryId}`;
      messages.push(`$${socSentence}*${this.calculateChecksum(socSentence)}`);

      // Note: Omitting non-standard fields (chemistry, nominal voltage, capacity)
      // These are not part of standard NMEA 0183 and cause parsing issues
      // If needed, they can be transmitted via proprietary sentences

      return messages;
    }
  }
  
  generateTankFromSensor(sensor, sentenceType) {
    let level = 50.0; // percentage
    
    // Get level from sensor data_generation
    if (sensor.data_generation?.level) {
      level = this.getYAMLDataValue('level', sensor.data_generation.level);
    }
    
    // Get tank properties
    const tankInstance = sensor.physical_properties?.tank_instance || sensor.instance || 0;
    const fluidType = sensor.physical_properties?.tank_type || sensor.physical_properties?.fluid_type || 'fuel';
    const capacity = sensor.physical_properties?.tank_capacity || sensor.physical_properties?.capacity || 200;
    
    // Map common tank type names to XDR standard mnemonics
    const tankTypeMap = {
      'fuel': 'FUEL',
      'water': 'WATR',
      'fresh_water': 'WATR',
      'waste': 'WAST',
      'gray_water': 'WAST',
      'ballast': 'BALL',
      'blackwater': 'BWAT',
      'black_water': 'BWAT'
    };
    
    const tankMnemonic = tankTypeMap[fluidType.toLowerCase()] || 'FUEL';
    
    // NMEA 0183 doesn't have standard tank sentences, use XDR
    // Format: FUEL_0, WATR_1, WAST_0 (no TANK_ prefix - matches parser expectations)
    // Use 'P' for percentage transducer type per NMEA 0183 spec
    // Fix: Changed from 'V' (Voltage) to 'P' (Percentage/Angular Displacement)
    const tankId = `${tankMnemonic}_${tankInstance}`;
    const sentence = `IIXDR,P,${level.toFixed(1)},P,${tankId}`;
    const checksum = this.calculateChecksum(sentence);
    return `$${sentence}*${checksum}`;
  }
  
  generateRudderFromSensor(sensor, sentenceType) {
    let angle = 0.0;
    
    // Get rudder angle from sensor data_generation
    if (sensor.data_generation?.angle) {
      angle = this.getYAMLDataValue('angle', sensor.data_generation.angle);
    }
    
    // Apply calibration offset
    const calibrationOffset = sensor.physical_properties?.calibration_offset || 0;
    angle += calibrationOffset;
    
    // Generate RSA sentence
    const sentence = `IIRSA,${angle.toFixed(1)},A,,`;
    const checksum = this.calculateChecksum(sentence);
    return `$${sentence}*${checksum}`;
  }

  /**
   * Generate NMEA sentences (legacy simple generators)
   */
  generateDBT(depth) {
    const depthFeet = (depth * 3.28084).toFixed(1);
    const depthMeters = depth.toFixed(1);
    const depthFathoms = (depth * 0.546807).toFixed(1);
    const checksum = this.calculateChecksum(`DBT,${depthFeet},f,${depthMeters},M,${depthFathoms},F`);
    // Changed from GP to II for NKE Display Pro compatibility
    return `$IIDBT,${depthFeet},f,${depthMeters},M,${depthFathoms},F*${checksum}`;
  }

  generateVHW(speed) {
    const speedKnots = speed.toFixed(1);
    const speedKmh = (speed * 1.852).toFixed(1);
    // FIX: VHW format is: heading_true,T,heading_mag,M,speed_knots,N,speed_kmh,K
    // With empty headings, keep T/M indicators so speed_knots lands at parts[5]
    const checksum = this.calculateChecksum(`VHW,,T,,M,${speedKnots},N,${speedKmh},K`);
    const sentence = `$IIVHW,,T,,M,${speedKnots},N,${speedKmh},K*${checksum}`;
    return sentence;
  }

  /**
   * Generate VLW sentence (Distance Log)
   * VLW reports cumulative distance through water based on STW integration
   * Format: $--VLW,total_distance,N,trip_distance,N*checksum
   * Distances are in nautical miles
   */
  generateVLW(speedKnots, instance = 0) {
    const now = Date.now();

    // Initialize on first call
    if (this.distanceLog.lastUpdateTime === null) {
      this.distanceLog.lastUpdateTime = now;
      console.log(`📊 VLW (instance ${instance}): Initialized distance log`);
    }

    // Calculate time delta in hours
    const timeDeltaMs = now - this.distanceLog.lastUpdateTime;
    const timeDeltaHours = timeDeltaMs / (1000 * 60 * 60);

    // Calculate distance traveled: distance = speed × time
    // speedKnots is in nautical miles per hour, so distance is in nautical miles
    const distanceTraveled = speedKnots * timeDeltaHours;

    // Update cumulative distances
    this.distanceLog.totalDistance += distanceTraveled;
    this.distanceLog.tripDistance += distanceTraveled;
    this.distanceLog.lastUpdateTime = now;

    // Format distances with one decimal place
    const totalNM = this.distanceLog.totalDistance.toFixed(1);
    const tripNM = this.distanceLog.tripDistance.toFixed(1);

    // Generate VLW sentence
    const sentence = `VLW,${totalNM},N,${tripNM},N`;
    const checksum = this.calculateChecksum(sentence);

    // Log occasionally (every ~20 calls = ~20 seconds at 1Hz)
    if (Math.random() < 0.05) {
      console.log(`📊 VLW (instance ${instance}): Total=${totalNM}nm, Trip=${tripNM}nm, STW=${speedKnots.toFixed(2)}kts`);
    }

    return `$II${sentence}*${checksum}`;
  }

  generateMWV(angle, speed) {
    const checksum = this.calculateChecksum(`MWV,${angle.toFixed(0)},R,${speed.toFixed(1)},N,A`);
    return `$IIMWV,${angle.toFixed(0)},R,${speed.toFixed(1)},N,A*${checksum}`;
  }

  generateRMC(lat, lon, speed = null, track = null) {
    const time = new Date();
    const timeStr = time.toISOString().substr(11, 8).replace(/:/g, '');
    const dateStr = time.toISOString().substr(8, 2) + time.toISOString().substr(5, 2) + time.toISOString().substr(2, 2);
    
    const latDeg = Math.abs(lat);
    const latMin = ((latDeg % 1) * 60).toFixed(4);
    const latDir = lat >= 0 ? 'N' : 'S';
    
    const lonDeg = Math.abs(lon);
    const lonMin = ((lonDeg % 1) * 60).toFixed(4);
    const lonDir = lon >= 0 ? 'E' : 'W';
    
    // Use provided speed/track, or fallback to defaults
    const speedKnots = speed !== null ? speed.toFixed(1) : '0.0';
    const trackDegrees = track !== null ? track.toFixed(1) : '0.0';

    // Get magnetic variation from scenario configuration
    // Fix: Include magnetic variation instead of leaving empty
    const variation = this.scenario?.parameters?.compass?.magnetic_variation || 0;
    const variationAbs = Math.abs(variation).toFixed(1);
    const variationDir = variation >= 0 ? 'E' : 'W';

    const sentence = `RMC,${timeStr},A,${Math.floor(latDeg)}${latMin},${latDir},${Math.floor(lonDeg)}${lonMin},${lonDir},${speedKnots},${trackDegrees},${dateStr},${variationAbs},${variationDir}`;
    const checksum = this.calculateChecksum(sentence);
    // Changed from GP to II for NKE Display Pro compatibility (like DPT fix)
    return `$II${sentence}*${checksum}`;
  }

  generateGLL(lat, lon) {
    const time = new Date();
    const timeStr = time.toISOString().substr(11, 8).replace(/:/g, '');
    
    const latDeg = Math.abs(lat);
    const latMin = ((latDeg % 1) * 60).toFixed(4);
    const latDir = lat >= 0 ? 'N' : 'S';
    
    const lonDeg = Math.abs(lon);
    const lonMin = ((lonDeg % 1) * 60).toFixed(4);
    const lonDir = lon >= 0 ? 'E' : 'W';
    
    // GLL: Geographic Position - Latitude/Longitude
    const sentence = `GLL,${Math.floor(latDeg)}${latMin},${latDir},${Math.floor(lonDeg)}${lonMin},${lonDir},${timeStr},A,A`;
    const checksum = this.calculateChecksum(sentence);
    // Changed from GP to II for NKE Display Pro compatibility (consistent with all other sentences)
    return `$II${sentence}*${checksum}`;
  }

  generateHDG(heading, deviation = null, variation = null) {
    // Return null if heading is not available
    if (heading === null || heading === undefined) {
      return null;
    }
    
    // REQUIRED: Magnetic deviation and variation must be defined in YAML parameters.compass section
    const compassParams = this.scenario?.parameters?.compass;
    const dev = deviation !== null ? deviation : (compassParams?.magnetic_deviation || 0);
    const vari = variation !== null ? variation : (compassParams?.magnetic_variation || 0);
    
    const devStr = dev !== 0 ? `${Math.abs(dev).toFixed(1)},${dev >= 0 ? 'E' : 'W'}` : ',';
    const varStr = vari !== 0 ? `${Math.abs(vari).toFixed(1)},${vari >= 0 ? 'E' : 'W'}` : ',';
    const checksum = this.calculateChecksum(`HDG,${heading.toFixed(1)},${devStr},${varStr}`);
    return `$IIHDG,${heading.toFixed(1)},${devStr},${varStr}*${checksum}`;
  }

  generateAPB() {
    // Get GPS configuration with waypoints
    const gpsConfig = this.scenario?.data?.gps;
    if (!gpsConfig || !gpsConfig.waypoints || gpsConfig.waypoints.length < 2) {
      console.warn('⚠️ APB: Requires GPS waypoints configuration');
      return null;
    }

    // Get current position and find next waypoint
    const currentPos = this.getCurrentPosition();
    if (!currentPos) return null;

    const elapsed = (Date.now() - (this.stats.startTime || Date.now())) / 1000;
    const duration = this.scenario.duration || 300;
    const progress = (elapsed % duration) / duration;
    const totalTime = gpsConfig.waypoints[gpsConfig.waypoints.length - 1].time;
    const currentTime = progress * totalTime;

    // Find next waypoint for bearing calculation
    let nextWaypoint = null;
    let waypointId = 'DEST';
    for (let i = 0; i < gpsConfig.waypoints.length; i++) {
      if (gpsConfig.waypoints[i].time > currentTime) {
        nextWaypoint = gpsConfig.waypoints[i];
        waypointId = `WP${String(i).padStart(2, '0')}`;
        break;
      }
    }

    if (!nextWaypoint) {
      // Use last waypoint if we're past all of them
      nextWaypoint = gpsConfig.waypoints[gpsConfig.waypoints.length - 1];
      waypointId = `WP${String(gpsConfig.waypoints.length - 1).padStart(2, '0')}`;
    }

    // Calculate bearing to next waypoint (true bearing)
    const dLon = (nextWaypoint.lon - currentPos.lon) * Math.PI / 180;
    const lat1 = currentPos.lat * Math.PI / 180;
    const lat2 = nextWaypoint.lat * Math.PI / 180;
    const dLat = lat2 - lat1;
    
    let bearingToWaypoint = Math.atan2(
      Math.sin(dLon) * Math.cos(lat2),
      Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
    ) * 180 / Math.PI;
    
    if (bearingToWaypoint < 0) bearingToWaypoint += 360;

    // Calculate cross-track error using proper great circle distance
    const xte = this.calculateCrossTrackError();
    const crossTrackError = xte.distance;
    const xteDirection = xte.direction;

    // Current heading
    const currentHeading = this.getCurrentHeading();

    // Status flags
    const status = 'A'; // A = valid, V = invalid
    const lockStatus = 'A'; // A = locked, V = not locked
    const arrivalStatus = 'N'; // A = arrival, N = not arrived
    const waypointPassed = 'V'; // V = not passed

    // Build APB sentence
    const sentence = `APB,${status},${lockStatus},${crossTrackError.toFixed(2)},${xteDirection},${arrivalStatus},${waypointPassed},${waypointPassed},${bearingToWaypoint.toFixed(1)},M,${waypointId},${bearingToWaypoint.toFixed(1)},M,${currentHeading.toFixed(1)},M`;
    const checksum = this.calculateChecksum(sentence);
    // Changed from GP to II for NKE Display Pro compatibility
    return `$II${sentence}*${checksum}`;
  }

  /**
   * Generate depth sentence based on type (DBT, DPT, or DBK)
   */
  generateDepthSentence(type) {
    const depthConfig = this.scenario?.data?.depth;
    if (!depthConfig) return [];

    const depth = this.getYAMLDataValue('depth', depthConfig);
    
    switch (type) {
      case 'DBT':
        return [this.generateDBT(depth)];
      case 'DPT':
        return [this.generateDPT(depth)];
      case 'DBK':
        return [this.generateDBK(depth)];
      default:
        return [this.generateDBT(depth)];
    }
  }

  /**
   * Generate DPT sentence (Depth with offset and range scale)
   * Matches NMEA 2000→0183 bridge behavior: PGN 128267 → DPT
   * NMEA 0183 4.10 Format: $--DPT,depth,offset,range_scale*checksum
   * Field 3 = Maximum range scale IN USE (not sonar max capability)
   *          = User-selected display range (e.g., 0-20m, 0-50m, 0-100m)
   *          = Should be empty if not reported by equipment
   */
  generateDPT(depth, transducerDepth = null, rangeScale = null) {
    // Offset: transducer depth below waterline (positive) or keel depth (negative)
    const offset = transducerDepth !== null ? transducerDepth : this.scenario.parameters?.vessel?.keel_offset || 0;
    // Range scale: User-selected display range (usually not reported, leave empty)
    const scale = rangeScale !== null ? rangeScale : (this.scenario.parameters?.sonar?.range_scale || '');
    const scaleField = scale !== '' ? `,${scale.toFixed(1)}` : ',';
    const checksum = this.calculateChecksum(`DPT,${depth.toFixed(1)},${offset.toFixed(1)}${scaleField}`);
    // Changed from SD to II for NKE Display Pro compatibility (integrated instrumentation talker ID)
    return `$IIDPT,${depth.toFixed(1)},${offset.toFixed(1)}${scaleField}*${checksum}`;
  }

  /**
   * Generate DBK sentence (Depth Below Keel)
   */
  generateDBK(depth) {
    // REQUIRED: keel_offset must be defined in YAML parameters.vessel section
    const keelOffset = this.scenario.parameters.vessel.keel_offset;
    const depthBelowKeel = Math.max(0, depth - keelOffset);
    const depthFeet = (depthBelowKeel * 3.28084).toFixed(1);
    const depthMeters = depthBelowKeel.toFixed(1);
    const depthFathoms = (depthBelowKeel * 0.546807).toFixed(1);
    const checksum = this.calculateChecksum(`DBK,${depthFeet},f,${depthMeters},M,${depthFathoms},F`);
    // Changed from SD to II for NKE Display Pro compatibility (integrated instrumentation talker ID)
    return `$IIDBK,${depthFeet},f,${depthMeters},M,${depthFathoms},F*${checksum}`;
  }

  /**
   * Generate MTW sentence (Water Temperature)
   */
  generateMTWSentence() {
    const tempConfig = this.scenario?.data?.water_temp;
    if (!tempConfig) return [];

    const tempC = this.getYAMLDataValue('water_temp', tempConfig);
    const checksum = this.calculateChecksum(`MTW,${tempC.toFixed(1)},C`);
    // Changed from SD to II for NKE Display Pro compatibility
    return [`$IIMTW,${tempC.toFixed(1)},C*${checksum}`];
  }

  /**
   * Generate MMB sentence (Barometric Pressure)
   * MMB reports atmospheric pressure in bars or millibars
   * Format: $--MMB,pressure_inches,I,pressure_bars,B*checksum
   */
  generateMMBSentence() {
    const pressureConfig = this.scenario?.data?.atmospheric_pressure || this.scenario?.data?.pressure;
    if (!pressureConfig) return [];

    const pressureMb = this.getYAMLDataValue('atmospheric_pressure', pressureConfig);
    const pressureBars = (pressureMb / 1000).toFixed(4);  // Convert millibars to bars
    const pressureInches = (pressureMb * 0.02953).toFixed(3);  // Convert mb to inches of mercury

    const checksum = this.calculateChecksum(`MMB,${pressureInches},I,${pressureBars},B`);
    return [`$IIMMB,${pressureInches},I,${pressureBars},B*${checksum}`];
  }

  /**
   * Generate VHW sentence (Water Speed and Heading)
   * VHW reports Speed Through Water (STW) - speed relative to water mass
   */
  generateVHWSentence() {
    // Try speed_through_water first, fallback to generic speed
    const stwConfig = this.scenario?.data?.speed_through_water || this.scenario?.data?.speed;
    
    // Debug: Always log to diagnose missing STW
    console.log(`🌊 VHW called - stwConfig: ${!!stwConfig}`);
    
    if (!stwConfig) {
      console.log(`⚠️ VHW: No speed_through_water or speed config, returning empty`);
      return [];
    }

    const speed = this.getYAMLDataValue('speed_through_water', stwConfig);
    
    // Always log the actual speed value
    console.log(`🌊 VHW STW (through water): ${speed.toFixed(2)} knots`);
    
    return [this.generateVHW(speed)];
  }

  /**
   * Generate VTG sentence (Track Made Good and Ground Speed)
   * VTG reports Speed Over Ground (SOG) - speed relative to Earth/seabed
   */
  generateVTGSentence() {
    const sogConfig = this.scenario?.data?.speed_over_ground;
    const stwConfig = this.scenario?.data?.speed_through_water;
    const speedConfig = this.scenario?.data?.speed; // Fallback for backward compatibility
    const gpsConfig = this.scenario?.data?.gps;
    
    // Debug: Always log to see if this is being called
    console.log(`🚤 VTG called - sogConfig: ${!!sogConfig}, stwConfig: ${!!stwConfig}, gpsConfig: ${!!gpsConfig}`);
    
    // Determine SOG source (priority order):
    let speed = null;
    
    // 1. Explicit speed_over_ground configuration
    if (sogConfig) {
      if (sogConfig.type === 'gps_track' || sogConfig.source === 'gps_track') {
        speed = this.getSpeedFromTrack();
        console.log(`🚤 VTG: Using GPS track-calculated SOG: ${speed?.toFixed(2)} knots`);
      } else if (sogConfig.type === 'stw_plus_current') {
        // SOG = STW + current
        const stw = stwConfig ? this.getYAMLDataValue('speed_through_water', stwConfig) : 0;
        const current = sogConfig.current || 0;
        speed = stw + current;
        console.log(`🚤 VTG: SOG from STW + current: ${stw.toFixed(2)} + ${current.toFixed(2)} = ${speed.toFixed(2)} knots`);
      } else {
        // Use defined pattern
        speed = this.getYAMLDataValue('speed_over_ground', sogConfig);
        console.log(`🚤 VTG: Using defined SOG pattern: ${speed?.toFixed(2)} knots`);
      }
    }
    // 2. GPS-level configuration
    else if (gpsConfig?.speed_over_ground === 'calculated') {
      speed = this.getSpeedFromTrack();
      console.log(`🚤 VTG: Using calculated SOG from waypoints: ${speed?.toFixed(2)} knots`);
    }
    // 3. Fallback: use generic speed or STW (backward compatibility)
    else if (speedConfig) {
      if (speedConfig.type === 'gps_track' || speedConfig.source === 'gps_track') {
        speed = this.getSpeedFromTrack();
      } else {
        speed = this.getYAMLDataValue('speed', speedConfig);
      }
      console.log(`🚤 VTG: Using fallback speed config: ${speed?.toFixed(2)} knots`);
    }
    
    if (speed === null) {
      console.log(`⚠️ VTG: No SOG data available`);
      return [];
    }

    const heading = gpsConfig ? this.getCurrentHeading() : 0;

    // Always log the actual speed value
    console.log(`🚤 VTG SOG: ${speed.toFixed(2)} knots, heading: ${heading.toFixed(1)}°`);

    const speedKmh = (speed * 1.852).toFixed(1);

    // Calculate magnetic track from true heading using configured variation
    // Fix: Populate magnetic fields properly instead of using malformed ",,M," pattern
    const variation = this.scenario?.parameters?.compass?.magnetic_variation || 0;
    const magneticTrack = ((heading + variation + 360) % 360).toFixed(1);

    const checksum = this.calculateChecksum(`VTG,${heading.toFixed(1)},T,${magneticTrack},M,${speed.toFixed(1)},N,${speedKmh},K,A`);
    // Changed from GP to II for NKE Display Pro compatibility (like DPT fix)
    return [`$IIVTG,${heading.toFixed(1)},T,${magneticTrack},M,${speed.toFixed(1)},N,${speedKmh},K,A*${checksum}`];
  }

  /**
   * Generate MWV sentence (Wind Speed and Angle)
   */
  generateMWVSentence() {
    const windConfig = this.scenario?.data?.wind;
    if (!windConfig || !windConfig.angle || !windConfig.speed) return [];

    const angle = this.getYAMLDataValue('wind_angle', windConfig.angle);
    const speed = this.getYAMLDataValue('wind_speed', windConfig.speed);
    
    return [this.generateMWV(angle, speed)];
  }

  /**
   * Generate GGA sentence (GPS Fix Data)
   */
  generateGGASentence(latitude = null, longitude = null, sensor = null) {
    // Use provided lat/lon or fall back to position data
    let position;
    if (latitude !== null && longitude !== null) {
      position = { lat: latitude, lon: longitude };
    } else {
      const gpsConfig = this.scenario?.data?.gps;
      if (!gpsConfig) return [];
      position = this.getCurrentPosition();
      if (!position) return [];
    }

    // Get GPS quality parameters from sensor physical_properties or scenario parameters
    let gpsParams;
    if (sensor?.physical_properties) {
      gpsParams = {
        quality: sensor.physical_properties.quality || 1,
        satellites: sensor.physical_properties.satellites || 8,
        hdop: sensor.physical_properties.hdop || 1.0,
        altitude: sensor.physical_properties.altitude || 0
      };
    } else if (this.scenario?.parameters?.gps) {
      gpsParams = this.scenario.parameters.gps;
    } else {
      // Default values
      gpsParams = {
        quality: 1,
        satellites: 8,
        hdop: 1.0,
        altitude: 0
      };
    }
    
    const quality = gpsParams.quality;
    const satellites = gpsParams.satellites;
    const hdop = (gpsParams.hdop || 1.0).toFixed(1);
    const altitude = (gpsParams.altitude || 0).toFixed(1);

    const time = new Date();
    const timeStr = time.toISOString().substr(11, 8).replace(/:/g, '') + '.00';
    
    const latDeg = Math.abs(position.lat);
    const latMin = ((latDeg % 1) * 60).toFixed(4);
    const latDir = position.lat >= 0 ? 'N' : 'S';
    
    const lonDeg = Math.abs(position.lon);
    const lonMin = ((lonDeg % 1) * 60).toFixed(4);
    const lonDir = position.lon >= 0 ? 'E' : 'W';
    
    const sentence = `GGA,${timeStr},${Math.floor(latDeg)}${latMin},${latDir},${String(Math.floor(lonDeg)).padStart(3, '0')}${lonMin},${lonDir},${quality},${String(satellites).padStart(2, '0')},${hdop},${altitude},M,0.0,M,,`;
    const checksum = this.calculateChecksum(sentence);
    // Changed from GP to II for NKE Display Pro compatibility
    return [`$II${sentence}*${checksum}`];
  }

  /**
   * Generate RMC sentence (Recommended Minimum)
   * RMC reports Speed Over Ground (SOG) - GPS-derived speed
   */
  generateRMCSentence() {
    const gpsConfig = this.scenario?.data?.gps;
    const sogConfig = this.scenario?.data?.speed_over_ground;
    const stwConfig = this.scenario?.data?.speed_through_water;
    const speedConfig = this.scenario?.data?.speed; // Fallback
    if (!gpsConfig) return [];

    const position = this.getCurrentPosition();
    if (!position) return [];

    // Get SOG: same logic as VTG
    let speed = null;
    if (sogConfig) {
      if (sogConfig.type === 'gps_track' || sogConfig.source === 'gps_track') {
        speed = this.getSpeedFromTrack();
      } else if (sogConfig.type === 'stw_plus_current') {
        const stw = stwConfig ? this.getYAMLDataValue('speed_through_water', stwConfig) : 0;
        const current = sogConfig.current || 0;
        speed = stw + current;
      } else {
        speed = this.getYAMLDataValue('speed_over_ground', sogConfig);
      }
    } else if (gpsConfig?.speed_over_ground === 'calculated') {
      speed = this.getSpeedFromTrack();
    } else if (speedConfig) {
      if (speedConfig.type === 'gps_track' || speedConfig.source === 'gps_track') {
        speed = this.getSpeedFromTrack();
      } else {
        speed = this.getYAMLDataValue('speed', speedConfig);
      }
    }
    
    // Get track from GPS heading calculation
    const track = this.getCurrentHeading();

    return [this.generateRMC(position.lat, position.lon, speed, track)];
  }

  /**
   * Generate heading sentence based on type (HDT, HDG, or HDM)
   */
  generateHeadingSentence(type) {
    const gpsConfig = this.scenario?.data?.gps;
    if (!gpsConfig) return [];

    const heading = this.getCurrentHeading();
    
    switch (type) {
      case 'HDT':
        return [this.generateHDT(heading)];
      case 'HDG':
        return [this.generateHDG(heading)];
      case 'HDM':
        return [this.generateHDM(heading)];
      default:
        return [this.generateHDT(heading)];
    }
  }

  /**
   * Generate HDT sentence (True Heading)
   */
  generateHDT(heading) {
    const checksum = this.calculateChecksum(`HDT,${heading.toFixed(1)},T`);
    return `$HEHDT,${heading.toFixed(1)},T*${checksum}`;
  }

  /**
   * Generate HDM sentence (Magnetic Heading)
   */
  generateHDM(heading) {
    const checksum = this.calculateChecksum(`HDM,${heading.toFixed(1)},M`);
    return `$HEHDM,${heading.toFixed(1)},M*${checksum}`;
  }

  /**
   * Get current position from GPS track
   */
  getCurrentPosition() {
    const gpsConfig = this.scenario?.data?.gps;
    if (!gpsConfig || !gpsConfig.start_position) return null;

    // If waypoints exist, interpolate position
    if (gpsConfig.waypoints && gpsConfig.waypoints.length > 0) {
      const elapsed = (Date.now() - (this.stats.startTime || Date.now())) / 1000;
      const duration = this.scenario.duration || 300;
      const progress = (elapsed % duration) / duration;
      const totalTime = gpsConfig.waypoints[gpsConfig.waypoints.length - 1].time;
      const currentTime = progress * totalTime;

      // Find surrounding waypoints
      for (let i = 0; i < gpsConfig.waypoints.length - 1; i++) {
        const wp1 = gpsConfig.waypoints[i];
        const wp2 = gpsConfig.waypoints[i + 1];
        
        if (currentTime >= wp1.time && currentTime <= wp2.time) {
          const segmentProgress = (currentTime - wp1.time) / (wp2.time - wp1.time);
          return {
            lat: wp1.lat + (wp2.lat - wp1.lat) * segmentProgress,
            lon: wp1.lon + (wp2.lon - wp1.lon) * segmentProgress
          };
        }
      }
    }

    // Return start position if no waypoints
    return {
      lat: gpsConfig.start_position.latitude,
      lon: gpsConfig.start_position.longitude
    };
  }

  /**
   * Get current position from sensor-based GPS configuration
   */
  getCurrentPositionFromSensor(sensor) {
    const positionConfig = sensor.data_generation?.position;
    if (!positionConfig) return null;

    // Get waypoints from sensor definition
    const waypoints = positionConfig.waypoints;
    const startPos = positionConfig.start_position;
    
    if (!waypoints || waypoints.length === 0) {
      return startPos ? { lat: startPos.latitude, lon: startPos.longitude } : null;
    }

    const elapsed = (Date.now() - (this.stats.startTime || Date.now())) / 1000;
    const duration = this.scenario.duration || 300;
    const progress = (elapsed % duration) / duration;
    const totalTime = waypoints[waypoints.length - 1].time;
    const currentTime = progress * totalTime;

    // Find surrounding waypoints and interpolate
    for (let i = 0; i < waypoints.length - 1; i++) {
      const wp1 = waypoints[i];
      const wp2 = waypoints[i + 1];
      
      if (currentTime >= wp1.time && currentTime <= wp2.time) {
        const segmentProgress = (currentTime - wp1.time) / (wp2.time - wp1.time);
        return {
          lat: wp1.latitude + (wp2.latitude - wp1.latitude) * segmentProgress,
          lon: wp1.longitude + (wp2.longitude - wp1.longitude) * segmentProgress
        };
      }
    }

    // Return last waypoint if past end
    const lastWp = waypoints[waypoints.length - 1];
    return { lat: lastWp.latitude, lon: lastWp.longitude };
  }

  /**
   * Calculate speed over ground from GPS track (distance traveled / time)
   * Returns speed in knots
   */
  getSpeedFromTrack() {
    // First try to find GPS sensor with waypoints (sensor-based architecture)
    const gpsSensor = this.scenario.sensors?.find(s => 
      s.type === 'gps_sensor' && s.data_generation?.position?.waypoints
    );
    
    let waypoints = null;
    if (gpsSensor) {
      waypoints = gpsSensor.data_generation.position.waypoints;
    } else {
      // Fall back to old data structure
      const gpsConfig = this.scenario?.data?.gps;
      if (gpsConfig && gpsConfig.waypoints) {
        waypoints = gpsConfig.waypoints;
      }
    }
    
    if (!waypoints || waypoints.length < 2) {
      return null;
    }

    const elapsed = (Date.now() - (this.stats.startTime || Date.now())) / 1000;
    const duration = this.scenario.duration || 300;
    const progress = (elapsed % duration) / duration;
    const totalTime = waypoints[waypoints.length - 1].time;
    const currentTime = progress * totalTime;

    // Find current waypoint segment
    for (let i = 0; i < waypoints.length - 1; i++) {
      const wp1 = waypoints[i];
      const wp2 = waypoints[i + 1];
      
      if (currentTime >= wp1.time && currentTime <= wp2.time) {
        // Support both lat/lon and latitude/longitude property names
        const lat1Val = wp1.latitude !== undefined ? wp1.latitude : wp1.lat;
        const lon1Val = wp1.longitude !== undefined ? wp1.longitude : wp1.lon;
        const lat2Val = wp2.latitude !== undefined ? wp2.latitude : wp2.lat;
        const lon2Val = wp2.longitude !== undefined ? wp2.longitude : wp2.lon;
        
        // Calculate distance between waypoints using Haversine formula
        const R = 3440.065; // Earth radius in nautical miles
        const lat1 = lat1Val * Math.PI / 180;
        const lat2 = lat2Val * Math.PI / 180;
        const dLat = (lat2Val - lat1Val) * Math.PI / 180;
        const dLon = (lon2Val - lon1Val) * Math.PI / 180;
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // nautical miles
        
        // Calculate time for this segment
        const segmentTime = (wp2.time - wp1.time) / 3600; // hours
        
        // Speed = distance / time (knots)
        let speed = distance / segmentTime;
        
        // Add realistic variation to make speed less constant (±5% random noise)
        const variation = 0.05; // 5% variation
        const randomFactor = 1 + (Math.random() * 2 - 1) * variation; // 0.95 to 1.05
        speed *= randomFactor;
        
        return speed;
      }
    }

    return null;
  }

  /**
   * Get current heading from GPS track with optional smoothing
   * @param {boolean} smooth - Apply rate limiting for realistic heading changes
   * @returns {number} Heading in degrees (0-360)
   */
  getCurrentHeading(smooth = true) {
    // Try sensor-based GPS first
    const gpsSensor = this.scenario?.sensors?.find(s => s.type === 'gps_sensor');
    let waypoints = null;
    
    if (gpsSensor?.data_generation?.position?.waypoints) {
      waypoints = gpsSensor.data_generation.position.waypoints;
    } else {
      // Fall back to old data structure
      const gpsConfig = this.scenario?.data?.gps;
      if (!gpsConfig || !gpsConfig.waypoints || gpsConfig.waypoints.length < 2) {
        return 0;
      }
      waypoints = gpsConfig.waypoints;
    }

    if (!waypoints || waypoints.length < 2) {
      return 0;
    }

    const elapsed = (Date.now() - (this.stats.startTime || Date.now())) / 1000;
    const duration = this.scenario.duration || 300;
    const progress = (elapsed % duration) / duration;
    const totalTime = waypoints[waypoints.length - 1].time;
    const currentTime = progress * totalTime;

    // Calculate target heading from waypoints using proper bearing formula
    let targetHeading = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const wp1 = waypoints[i];
      const wp2 = waypoints[i + 1];
      
      if (currentTime >= wp1.time && currentTime <= wp2.time) {
        // Calculate great circle bearing between waypoints
        // Support both lat/lon and latitude/longitude property names
        const lat1Deg = wp1.latitude || wp1.lat;
        const lat2Deg = wp2.latitude || wp2.lat;
        const lon1Deg = wp1.longitude || wp1.lon;
        const lon2Deg = wp2.longitude || wp2.lon;
        
        const lat1 = lat1Deg * Math.PI / 180;
        const lat2 = lat2Deg * Math.PI / 180;
        const dLon = (lon2Deg - lon1Deg) * Math.PI / 180;
        
        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) -
                  Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        targetHeading = Math.atan2(y, x) * 180 / Math.PI;
        if (targetHeading < 0) targetHeading += 360;
        
        // Store current leg for XTE calculation
        if (this.currentLegStartWaypoint?.lat !== wp1.lat) {
          this.currentLegStartWaypoint = wp1;
          this.currentLegEndWaypoint = wp2;
        }
        
        break;
      }
    }

    // Apply smooth heading transitions if requested
    if (!smooth) {
      this.currentSmoothedHeading = targetHeading;
      this.lastHeadingUpdateTime = Date.now();
      return targetHeading;
    }

    // Initialize smoothed heading on first call
    if (this.currentSmoothedHeading === null) {
      this.currentSmoothedHeading = targetHeading;
      this.lastHeadingUpdateTime = Date.now();
      return targetHeading;
    }

    // Calculate time delta
    const now = Date.now();
    const dt = (now - this.lastHeadingUpdateTime) / 1000; // seconds
    this.lastHeadingUpdateTime = now;

    // Maximum heading rate: 10 degrees per second (realistic for autopilot/manual steering)
    const maxHeadingRate = this.scenario?.parameters?.autopilot?.max_heading_rate || 10;
    
    // Calculate shortest angular difference (handle 0/360 wrap)
    let headingDelta = targetHeading - this.currentSmoothedHeading;
    if (headingDelta > 180) headingDelta -= 360;
    if (headingDelta < -180) headingDelta += 360;
    
    // Limit rate of change
    const maxDelta = maxHeadingRate * dt;
    const limitedDelta = Math.max(-maxDelta, Math.min(maxDelta, headingDelta));
    
    // Update smoothed heading
    this.currentSmoothedHeading += limitedDelta;
    if (this.currentSmoothedHeading < 0) this.currentSmoothedHeading += 360;
    if (this.currentSmoothedHeading >= 360) this.currentSmoothedHeading -= 360;

    return this.currentSmoothedHeading;
  }

  /**
   * Calculate cross-track error (XTE) from current position to planned route
   * Returns object with {distance: nm, direction: 'L'|'R'}
   */
  calculateCrossTrackError() {
    if (!this.currentLegStartWaypoint || !this.currentLegEndWaypoint) {
      return {distance: 0.0, direction: 'L'};
    }

    const currentPos = this.getCurrentPosition();
    if (!currentPos) {
      return {distance: 0.0, direction: 'L'};
    }

    const wp1 = this.currentLegStartWaypoint;
    const wp2 = this.currentLegEndWaypoint;
    
    // Convert to radians
    const lat1 = wp1.lat * Math.PI / 180;
    const lon1 = wp1.lon * Math.PI / 180;
    const lat2 = wp2.lat * Math.PI / 180;
    const lon2 = wp2.lon * Math.PI / 180;
    const latC = currentPos.lat * Math.PI / 180;
    const lonC = currentPos.lon * Math.PI / 180;
    
    // Calculate bearing from wp1 to wp2
    const dLon12 = lon2 - lon1;
    const y = Math.sin(dLon12) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon12);
    const bearing12 = Math.atan2(y, x);
    
    // Calculate bearing from wp1 to current position
    const dLon1C = lonC - lon1;
    const y1C = Math.sin(dLon1C) * Math.cos(latC);
    const x1C = Math.cos(lat1) * Math.sin(latC) -
                Math.sin(lat1) * Math.cos(latC) * Math.cos(dLon1C);
    const bearing1C = Math.atan2(y1C, x1C);
    
    // Calculate angular distance from wp1 to current position
    const dLat = latC - lat1;
    const dLon = lonC - lon1;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1) * Math.cos(latC) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const angDist1C = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    // Calculate cross-track distance (in radians)
    const xteRad = Math.asin(Math.sin(angDist1C) * Math.sin(bearing1C - bearing12));
    
    // Convert to nautical miles
    const R = 3440.065; // Earth radius in nautical miles
    const xteNm = Math.abs(xteRad * R);
    
    // Determine direction (left or right of course)
    // Positive XTE means right of course, negative means left
    const direction = xteRad >= 0 ? 'R' : 'L';
    
    return {distance: xteNm, direction: direction};
  }

  /**
   * Calculate cross-track error (XTE) from current position to planned route
   * Returns object with {distance: nm, direction: 'L'|'R'}
   */
  calculateCrossTrackError() {
    if (!this.currentLegStartWaypoint || !this.currentLegEndWaypoint) {
      return {distance: 0.0, direction: 'L'};
    }

    const currentPos = this.getCurrentPosition();
    if (!currentPos) {
      return {distance: 0.0, direction: 'L'};
    }

    const wp1 = this.currentLegStartWaypoint;
    const wp2 = this.currentLegEndWaypoint;
    
    // Convert to radians
    const lat1 = wp1.lat * Math.PI / 180;
    const lon1 = wp1.lon * Math.PI / 180;
    const lat2 = wp2.lat * Math.PI / 180;
    const lon2 = wp2.lon * Math.PI / 180;
    const latC = currentPos.lat * Math.PI / 180;
    const lonC = currentPos.lon * Math.PI / 180;
    
    // Calculate bearing from wp1 to wp2
    const dLon12 = lon2 - lon1;
    const y = Math.sin(dLon12) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon12);
    const bearing12 = Math.atan2(y, x);
    
    // Calculate bearing from wp1 to current position
    const dLon1C = lonC - lon1;
    const y1C = Math.sin(dLon1C) * Math.cos(latC);
    const x1C = Math.cos(lat1) * Math.sin(latC) -
                Math.sin(lat1) * Math.cos(latC) * Math.cos(dLon1C);
    const bearing1C = Math.atan2(y1C, x1C);
    
    // Calculate angular distance from wp1 to current position
    const dLat = latC - lat1;
    const dLon = lonC - lon1;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1) * Math.cos(latC) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const angDist1C = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    // Calculate cross-track distance (in radians)
    const xteRad = Math.asin(Math.sin(angDist1C) * Math.sin(bearing1C - bearing12));
    
    // Convert to nautical miles
    const R = 3440.065; // Earth radius in nautical miles
    const xteNm = Math.abs(xteRad * R);
    
    // Determine direction (left or right of course)
    // Positive XTE means right of course, negative means left
    const direction = xteRad >= 0 ? 'R' : 'L';
    
    return {distance: xteNm, direction: direction};
  }

  /**
   * Calculate NMEA checksum
   */
  calculateChecksum(sentence) {
    let checksum = 0;
    for (let i = 0; i < sentence.length; i++) {
      checksum ^= sentence.charCodeAt(i);
    }
    return checksum.toString(16).toUpperCase().padStart(2, '0');
  }

  /**
   * Generate PCDIN sentence (NMEA 2000 PGN wrapped in NMEA 0183)
   * Supports PGN 127488 (Engine), 127508 (Battery), 127505 (Tank)
   */
  generatePCDINSentence(sentenceDef) {
    const pgn = sentenceDef.pgn;
    
    if (!pgn) {
      console.warn('⚠️ PCDIN sentence missing PGN number');
      return [];
    }

    switch (pgn) {
      case 127488: // Engine Parameters, Rapid Update
        return this.generatePCDIN_127488(sentenceDef);
      case 127489: // Engine Parameters, Dynamic
        return this.generatePCDIN_127489(sentenceDef);
      case 127508: // Battery Status
        return this.generatePCDIN_127508(sentenceDef);
      case 127505: // Fluid Level
        return this.generatePCDIN_127505(sentenceDef);
      default:
        console.warn(`⚠️ Unsupported PCDIN PGN: ${pgn}`);
        return [];
    }
  }

  /**
   * Generate PGN 127488: Engine Parameters, Rapid Update
   * Format: $PCDIN,01F200,{instance},{rpm_low},{rpm_high},FF,FF,FF,FF,FF*{checksum}
   */
  generatePCDIN_127488(sensorOrSentenceDef) {
    // Support both sensor objects (new) and sentenceDef (legacy)
    const isSensor = sensorOrSentenceDef.type && sensorOrSentenceDef.type === 'engine_sensor';
    
    let rpm = 0;
    let instance = 0;
    let rpmCalibration = 1.0;

    if (isSensor) {
      // New sensor-based format
      const sensor = sensorOrSentenceDef;
      instance = sensor.physical_properties?.engine_instance || sensor.instance || 0;
      rpmCalibration = sensor.physical_properties?.rpm_calibration || 1.0;
      
      // Get RPM from sensor data_generation
      if (sensor.data_generation?.rpm) {
        rpm = this.getYAMLDataValue('rpm', sensor.data_generation.rpm) * rpmCalibration;
      }
    } else {
      // Legacy sentenceDef format
      const engineData = this.scenario?.data?.engine;
      if (!engineData) return [];
      
      instance = sensorOrSentenceDef.instance || 0;
      if (engineData.rpm) {
        rpm = this.getYAMLDataValue('rpm', engineData.rpm);
      }
    }

    // Convert RPM to NMEA 2000 format (0.25 RPM resolution)
    const rpmRaw = Math.round(rpm / 0.25);
    const rpmLow = rpmRaw & 0xFF;
    const rpmHigh = (rpmRaw >> 8) & 0xFF;

    // Build PCDIN sentence
    const data = `PCDIN,01F200,${this.toHex(instance)},${this.toHex(rpmLow)},${this.toHex(rpmHigh)},FF,FF,FF,FF,FF`;
    const checksum = this.calculateChecksum(data);
    
    return [`$${data}*${checksum}`];
  }

  /**
   * Generate PGN 127508: Battery Status
   * Format: $PCDIN,01F214,{instance},{volt_low},{volt_high},{curr_low},{curr_high},{temp_low},{temp_high},FF*{checksum}
   */
  generatePCDIN_127508(sensorOrSentenceDef) {
    // Support both sensor objects (new) and sentenceDef (legacy)
    const isSensor = sensorOrSentenceDef.type && sensorOrSentenceDef.type === 'battery_sensor';
    
    let voltage = 0;
    let current = 0;
    let temperature = 298.15; // Default 25°C in Kelvin
    let instance = 0;

    if (isSensor) {
      // New sensor-based format
      const sensor = sensorOrSentenceDef;
      instance = sensor.physical_properties?.battery_instance || sensor.instance || 0;
      
      // Get battery parameters from sensor data_generation
      if (sensor.data_generation?.voltage) {
        voltage = this.getYAMLDataValue('voltage', sensor.data_generation.voltage);
      }
      if (sensor.data_generation?.current) {
        current = this.getYAMLDataValue('current', sensor.data_generation.current);
      }
      if (sensor.data_generation?.temperature) {
        temperature = this.getYAMLDataValue('temperature', sensor.data_generation.temperature);
      }
    } else {
      // Legacy sentenceDef format
      const batteryData = this.scenario?.data?.battery;
      if (!batteryData) return [];
      
      instance = sensorOrSentenceDef.instance || 0;
      if (batteryData.voltage) {
        voltage = this.getYAMLDataValue('voltage', batteryData.voltage);
      }
      if (batteryData.current) {
        current = this.getYAMLDataValue('current', batteryData.current);
      }
      if (batteryData.temperature) {
        temperature = this.getYAMLDataValue('temperature', batteryData.temperature);
      }
    }

    // Convert to NMEA 2000 format
    const voltRaw = Math.round(voltage / 0.01); // 0.01V resolution
    const voltLow = voltRaw & 0xFF;
    const voltHigh = (voltRaw >> 8) & 0xFF;

    const currRaw = Math.round(current / 0.1); // 0.1A resolution (signed)
    const currLow = currRaw & 0xFF;
    const currHigh = (currRaw >> 8) & 0xFF;

    const tempRaw = Math.round(temperature / 0.01); // 0.01K resolution
    const tempLow = tempRaw & 0xFF;
    const tempHigh = (tempRaw >> 8) & 0xFF;

    // Build PCDIN sentence
    const data = `PCDIN,01F214,${this.toHex(instance)},${this.toHex(voltLow)},${this.toHex(voltHigh)},${this.toHex(currLow)},${this.toHex(currHigh)},${this.toHex(tempLow)},${this.toHex(tempHigh)},FF`;
    const checksum = this.calculateChecksum(data);
    
    return [`$${data}*${checksum}`];
  }

  /**
   * Generate PGN 127505: Fluid Level
   * Format: $PCDIN,01F211,{instance},{type},{level_low},{level_high},{cap_b0},{cap_b1},{cap_b2},{cap_b3}*{checksum}
   */
  generatePCDIN_127505(sensorOrSentenceDef) {
    // Support both sensor objects (new) and sentenceDef (legacy)
    const isSensor = sensorOrSentenceDef.type && sensorOrSentenceDef.type === 'tank_sensor';
    
    let level = 50; // Default 50%
    let capacity = 200; // Default 200L
    let fluidType = 0; // Default fuel
    let instance = 0;

    if (isSensor) {
      // New sensor-based format
      const sensor = sensorOrSentenceDef;
      instance = sensor.physical_properties?.tank_instance || sensor.instance || 0;
      capacity = sensor.physical_properties?.capacity || 200;
      
      // Map fluid type string to NMEA 2000 code
      const fluidTypeMap = {
        'fuel': 0,
        'fresh_water': 1,
        'gray_water': 2,
        'black_water': 3,
        'oil': 14
      };
      const fluidTypeStr = sensor.physical_properties?.fluid_type || 'fuel';
      fluidType = fluidTypeMap[fluidTypeStr] !== undefined ? fluidTypeMap[fluidTypeStr] : 0;
      
      // Get level from sensor data_generation
      if (sensor.data_generation?.level) {
        level = this.getYAMLDataValue('level', sensor.data_generation.level);
      }
    } else {
      // Legacy sentenceDef format
      const tankData = this.scenario?.data?.tank;
      if (!tankData) return [];
      
      instance = sensorOrSentenceDef.instance || 0;
      if (tankData.level || tankData.fuel_level) {
        level = this.getYAMLDataValue('level', tankData.level || tankData.fuel_level);
      }
      if (tankData.capacity) {
        capacity = tankData.capacity;
      }
      if (tankData.type !== undefined) {
        fluidType = tankData.type;
      }
    }

    // Convert to NMEA 2000 format
    const levelRaw = Math.round(level / 0.004); // 0.004% resolution
    const levelLow = levelRaw & 0xFF;
    const levelHigh = (levelRaw >> 8) & 0xFF;

    const capRaw = Math.round(capacity / 0.1); // 0.1L resolution
    const capB0 = capRaw & 0xFF;
    const capB1 = (capRaw >> 8) & 0xFF;
    const capB2 = (capRaw >> 16) & 0xFF;
    const capB3 = (capRaw >> 24) & 0xFF;

    // Build PCDIN sentence
    const data = `PCDIN,01F211,${this.toHex(instance)},${this.toHex(fluidType)},${this.toHex(levelLow)},${this.toHex(levelHigh)},${this.toHex(capB0)},${this.toHex(capB1)},${this.toHex(capB2)},${this.toHex(capB3)}`;
    const checksum = this.calculateChecksum(data);
    
    return [`$${data}*${checksum}`];
  }

  /**
   * Generate PGN 127489: Engine Parameters, Dynamic
   * Placeholder for future implementation
   */
  generatePCDIN_127489(sentenceDef) {
    console.warn('⚠️ PGN 127489 (Engine Dynamic) not yet implemented');
    return [];
  }

  /**
   * Generate PGN 128267: Water Depth
   * Format: $PCDIN,01F503,FF,{depth_b0},{depth_b1},{depth_b2},{depth_b3},{offset_b0},{offset_b1},FF*{checksum}
   */
  generatePCDIN_128267(sensor) {
    let depth = 10.0; // meters
    let offset = 0.0; // transducer offset from waterline (positive = below waterline)
    
    // Get depth from sensor data_generation
    if (sensor.data_generation?.depth) {
      depth = this.getYAMLDataValue('depth', sensor.data_generation.depth);
    }
    
    // Get transducer depth from physical properties
    if (sensor.physical_properties?.transducer_depth) {
      offset = sensor.physical_properties.transducer_depth;
    }
    
    // Convert to NMEA 2000 format (0.01m resolution, 32-bit)
    const depthRaw = Math.round(depth * 100); // cm
    const depthB0 = depthRaw & 0xFF;
    const depthB1 = (depthRaw >> 8) & 0xFF;
    const depthB2 = (depthRaw >> 16) & 0xFF;
    const depthB3 = (depthRaw >> 24) & 0xFF;
    
    const offsetRaw = Math.round(offset * 100); // cm (signed 16-bit)
    const offsetB0 = offsetRaw & 0xFF;
    const offsetB1 = (offsetRaw >> 8) & 0xFF;
    
    // Build PCDIN sentence
    const data = `PCDIN,01F503,FF,${this.toHex(depthB0)},${this.toHex(depthB1)},${this.toHex(depthB2)},${this.toHex(depthB3)},${this.toHex(offsetB0)},${this.toHex(offsetB1)},FF`;
    const checksum = this.calculateChecksum(data);
    
    return [`$${data}*${checksum}`];
  }

  /**
   * Generate PGN 128259: Speed (Water Referenced)
   * Format: $PCDIN,01F503,FF,{speed_b0},{speed_b1},FF,FF,FF,FF,FF,FF*{checksum}
   */
  generatePCDIN_128259(sensor) {
    let speedKnots = 5.0;
    
    // Get speed from sensor data_generation
    if (sensor.data_generation?.speed) {
      speedKnots = this.getYAMLDataValue('speed', sensor.data_generation.speed);
    }
    
    // Apply calibration factor
    const calibrationFactor = sensor.physical_properties?.calibration_factor || 1.0;
    speedKnots *= calibrationFactor;
    
    // Convert to NMEA 2000 format (0.01 m/s resolution)
    const speedMs = speedKnots * 0.5144; // knots to m/s
    const speedRaw = Math.round(speedMs * 100);
    const speedB0 = speedRaw & 0xFF;
    const speedB1 = (speedRaw >> 8) & 0xFF;
    
    // Build PCDIN sentence
    const data = `PCDIN,01F503,FF,${this.toHex(speedB0)},${this.toHex(speedB1)},FF,FF,FF,FF,FF,FF`;
    const checksum = this.calculateChecksum(data);
    
    return [`$${data}*${checksum}`];
  }

  /**
   * Generate PGN 130306: Wind Data
   * Format: $PCDIN,01FD02,FF,{speed_b0},{speed_b1},{angle_b0},{angle_b1},{reference}*{checksum}
   */
  generatePCDIN_130306(sensor) {
    let windSpeed = 10.0; // knots
    let windAngle = 45.0; // degrees
    let reference = 2; // 0=True, 1=Magnetic, 2=Apparent, 3=True (ground)
    
    // Get wind data from sensor data_generation
    if (sensor.data_generation?.wind_speed) {
      windSpeed = this.getYAMLDataValue('wind_speed', sensor.data_generation.wind_speed);
    }
    if (sensor.data_generation?.wind_angle) {
      windAngle = this.getYAMLDataValue('wind_angle', sensor.data_generation.wind_angle);
    }
    
    // Get reference type from physical properties
    const referenceMap = { 'true': 0, 'magnetic': 1, 'apparent': 2, 'ground': 3 };
    const referenceType = sensor.physical_properties?.reference_type || 'apparent';
    reference = referenceMap[referenceType] !== undefined ? referenceMap[referenceType] : 2;
    
    // Convert to NMEA 2000 format
    const speedMs = windSpeed * 0.5144; // knots to m/s
    const speedRaw = Math.round(speedMs * 100); // 0.01 m/s resolution
    const speedB0 = speedRaw & 0xFF;
    const speedB1 = (speedRaw >> 8) & 0xFF;
    
    const angleRaw = Math.round(windAngle * 10000 / 360); // radians * 10000
    const angleB0 = angleRaw & 0xFF;
    const angleB1 = (angleRaw >> 8) & 0xFF;
    
    // Build PCDIN sentence
    const data = `PCDIN,01FD02,FF,${this.toHex(speedB0)},${this.toHex(speedB1)},${this.toHex(angleB0)},${this.toHex(angleB1)},${this.toHex(reference)}`;
    const checksum = this.calculateChecksum(data);
    
    return [`$${data}*${checksum}`];
  }

  /**
   * Generate PGN 129029: GNSS Position Data
   * Format: $PCDIN,01F805,{instance},{date_b0-b1},{time_b0-b3},{lat_b0-b7},{lon_b0-b7}*{checksum}
   */
  generatePCDIN_129029(sensor) {
    let latitude = 37.7749; // degrees
    let longitude = -122.4194; // degrees
    
    // Get position from sensor data_generation
    if (sensor.data_generation?.latitude) {
      latitude = this.getYAMLDataValue('latitude', sensor.data_generation.latitude);
    }
    if (sensor.data_generation?.longitude) {
      longitude = this.getYAMLDataValue('longitude', sensor.data_generation.longitude);
    }
    
    // Convert to NMEA 2000 format (1e-16 resolution for lat/lon)
    // Simplified version - just send basic position
    const latRaw = Math.round(latitude * 1e7); // Scale to fit in 32-bit
    const lonRaw = Math.round(longitude * 1e7);
    
    const latB0 = latRaw & 0xFF;
    const latB1 = (latRaw >> 8) & 0xFF;
    const latB2 = (latRaw >> 16) & 0xFF;
    const latB3 = (latRaw >> 24) & 0xFF;
    
    const lonB0 = lonRaw & 0xFF;
    const lonB1 = (lonRaw >> 8) & 0xFF;
    const lonB2 = (lonRaw >> 16) & 0xFF;
    const lonB3 = (lonRaw >> 24) & 0xFF;
    
    // Build PCDIN sentence (simplified)
    const data = `PCDIN,01F805,00,FF,FF,FF,FF,FF,FF,${this.toHex(latB0)},${this.toHex(latB1)},${this.toHex(latB2)},${this.toHex(latB3)},${this.toHex(lonB0)},${this.toHex(lonB1)},${this.toHex(lonB2)},${this.toHex(lonB3)}`;
    const checksum = this.calculateChecksum(data);
    
    return [`$${data}*${checksum}`];
  }

  /**
   * Generate PGN 127250: Vessel Heading
   * Format: $PCDIN,01F112,FF,{heading_b0},{heading_b1},{deviation_b0},{deviation_b1},{variation_b0},{variation_b1}*{checksum}
   */
  generatePCDIN_127250(sensor) {
    let heading = 180.0; // degrees
    let deviation = 0.0; // degrees
    let variation = 0.0; // degrees
    
    // Get heading from sensor data_generation
    if (sensor.data_generation?.heading) {
      heading = this.getYAMLDataValue('heading', sensor.data_generation.heading);
    }
    
    // Get deviation and variation from physical properties
    if (sensor.physical_properties?.deviation) {
      deviation = sensor.physical_properties.deviation;
    }
    if (sensor.physical_properties?.variation) {
      variation = sensor.physical_properties.variation;
    }
    
    // Convert to NMEA 2000 format (0.0001 radians resolution)
    const headingRad = heading * Math.PI / 180;
    const headingRaw = Math.round(headingRad * 10000);
    const headingB0 = headingRaw & 0xFF;
    const headingB1 = (headingRaw >> 8) & 0xFF;
    
    const deviationRad = deviation * Math.PI / 180;
    const deviationRaw = Math.round(deviationRad * 10000);
    const deviationB0 = deviationRaw & 0xFF;
    const deviationB1 = (deviationRaw >> 8) & 0xFF;
    
    const variationRad = variation * Math.PI / 180;
    const variationRaw = Math.round(variationRad * 10000);
    const variationB0 = variationRaw & 0xFF;
    const variationB1 = (variationRaw >> 8) & 0xFF;
    
    // Build PCDIN sentence
    const data = `PCDIN,01F112,FF,${this.toHex(headingB0)},${this.toHex(headingB1)},${this.toHex(deviationB0)},${this.toHex(deviationB1)},${this.toHex(variationB0)},${this.toHex(variationB1)}`;
    const checksum = this.calculateChecksum(data);
    
    return [`$${data}*${checksum}`];
  }

  /**
   * Generate PGN 130310: Environmental Parameters (Temperature)
   * Format: $PCDIN,01FD06,FF,{temp_source},{temp_b0},{temp_b1},{humidity_b0},{humidity_b1}*{checksum}
   */
  generatePCDIN_130310(sensor) {
    let temperature = 20.0; // Celsius
    let tempSource = 0; // 0=Sea, 1=Outside, 2=Inside, 3=Engine Room, 4=Main Cabin
    
    // Get temperature from sensor data_generation
    if (sensor.data_generation?.temperature) {
      temperature = this.getYAMLDataValue('temperature', sensor.data_generation.temperature);
    }
    
    // Apply calibration offset
    const calibrationOffset = sensor.physical_properties?.calibration_offset || 0;
    temperature += calibrationOffset;
    
    // Map sensor location to temperature source
    const locationMap = {
      'sea_water': 0,
      'outside': 1,
      'cabin': 2,
      'engine_room': 3,
      'refrigeration': 2
    };
    const location = sensor.physical_properties?.sensor_location || 'sea_water';
    tempSource = locationMap[location] !== undefined ? locationMap[location] : 0;
    
    // Convert to NMEA 2000 format (0.01K resolution)
    const tempK = temperature + 273.15; // Celsius to Kelvin
    const tempRaw = Math.round(tempK * 100);
    const tempB0 = tempRaw & 0xFF;
    const tempB1 = (tempRaw >> 8) & 0xFF;
    
    // Build PCDIN sentence
    const data = `PCDIN,01FD06,FF,${this.toHex(tempSource)},${this.toHex(tempB0)},${this.toHex(tempB1)},FF,FF`;
    const checksum = this.calculateChecksum(data);
    
    return [`$${data}*${checksum}`];
  }

  /**
   * Generate PGN 127245: Rudder
   * Format: $PCDIN,01F0FD,{instance},{angle_b0},{angle_b1}*{checksum}
   */
  generatePCDIN_127245(sensor) {
    let angle = 0.0; // degrees
    let instance = 0;
    
    // Get rudder angle from sensor data_generation
    if (sensor.data_generation?.angle) {
      angle = this.getYAMLDataValue('angle', sensor.data_generation.angle);
    }
    
    // Get instance and calibration from physical properties
    instance = sensor.physical_properties?.rudder_instance || sensor.instance || 0;
    const calibrationOffset = sensor.physical_properties?.calibration_offset || 0;
    angle += calibrationOffset;
    
    // Convert to NMEA 2000 format (0.0001 radians resolution)
    const angleRad = angle * Math.PI / 180;
    const angleRaw = Math.round(angleRad * 10000);
    const angleB0 = angleRaw & 0xFF;
    const angleB1 = (angleRaw >> 8) & 0xFF;
    
    // Build PCDIN sentence
    const data = `PCDIN,01F0FD,${this.toHex(instance)},${this.toHex(angleB0)},${this.toHex(angleB1)}`;
    const checksum = this.calculateChecksum(data);
    
    return [`$${data}*${checksum}`];
  }

  /**
   * Convert number to 2-digit hex string
   */
  toHex(num) {
    return num.toString(16).toUpperCase().padStart(2, '0');
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      type: 'scenario',
      scenarioName: this.config.scenarioName,
      isRunning: this.isRunning,
      loop: this.config.loop,
      speed: this.config.speed,
      currentPhase: this.currentPhase?.name || null,
      stats: this.stats
    };
  }
}

module.exports = ScenarioDataSource;