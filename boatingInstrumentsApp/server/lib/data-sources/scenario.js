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
const ScenarioSchemaValidator = require('../scenario-schema');

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

    // NMEA data generators for common scenarios
    this.dataGenerators = new Map();
    this.initializeDataGenerators();
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

      // Validate scenario schema
      const validation = ScenarioSchemaValidator.validate(this.scenario);
      if (!validation.valid) {
        console.warn(`⚠️ Scenario validation warnings for ${this.config.scenarioName}:`);
        validation.errors.forEach(error => console.warn(`   • ${error}`));
      }

      this.emit('status', `Loaded scenario: ${this.scenario.name || this.config.scenarioName}`);
      this.emit('status', `Description: ${this.scenario.description || 'No description'}`);
      
      // Initialize YAML-defined sentence generators now that scenario is loaded
      this.initializeYAMLGenerators();
      
    } catch (error) {
      throw new Error(`Failed to load scenario: ${error.message}`);
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
    
    const timer = setInterval(() => {
      const messages = generator.generate();
      if (messages) {
        // Handle both single messages and arrays of messages
        const messageArray = Array.isArray(messages) ? messages : [messages];
        messageArray.forEach(message => {
          if (message && message.trim()) {
            this.stats.messagesGenerated++;
            this.emit('data', message);
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
    
    console.log(`🔄 YAML generator types found:`, Array.from(yamlGeneratorTypes));
    
    // Start built-in generators only if no YAML generator exists for that type
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
      
      // Skip built-in generator if YAML version exists
      if (generatorName === 'depth' && (yamlGeneratorTypes.has('dpt') || yamlGeneratorTypes.has('dbt') || yamlGeneratorTypes.has('dbk'))) {
        console.log(`⏭️ Skipping built-in depth generator (YAML depth generator exists)`);
        return;
      }
      if (generatorName === 'speed' && (yamlGeneratorTypes.has('vhw') || yamlGeneratorTypes.has('vtg'))) {
        console.log(`⏭️ Skipping built-in speed generator (YAML speed generator exists)`);
        return;
      }
      if (generatorName === 'wind' && yamlGeneratorTypes.has('mwv')) {
        console.log(`⏭️ Skipping built-in wind generator (YAML wind generator exists)`);
        return;
      }
      if (generatorName === 'gps' && (yamlGeneratorTypes.has('gga') || yamlGeneratorTypes.has('rmc'))) {
        console.log(`⏭️ Skipping built-in GPS generator (YAML GPS generator exists)`);
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
    
    // Standard field name is 'nmea_sentences'
    const sentences = this.scenario?.nmea_sentences;
    
    console.log(`   nmea_sentences exists: ${!!sentences}`);
    console.log(`   nmea_sentences is array: ${Array.isArray(sentences)}`);
    console.log(`   nmea_sentences count: ${sentences?.length || 0}`);
    
    if (!sentences || !Array.isArray(sentences)) {
      console.log(`⚠️ No YAML sentences found in scenario (expected 'nmea_sentences' array)`);
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
          console.log(`⛵ Added YAML VHW water speed generator: ${generatorName} at ${frequencyHz}Hz`);
          break;

        case 'VTG':
          this.dataGenerators.set(generatorName, {
            interval: intervalMs,
            sentenceDef: sentenceDef,
            generate: () => this.generateVTGSentence()
          });
          console.log(`🧭 Added YAML VTG track generator: ${generatorName} at ${frequencyHz}Hz`);
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

        default:
          console.warn(`⚠️ Unknown YAML sentence type: ${sentenceDef.type}`);
      }
    });
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
            transducers.push(`C,${temp.toFixed(1)},F,ENGINE#1`);
          }
          break;
        case 'oil_pressure':
          if (scenario?.engine?.main_engine) {
            const pressure = scenario.engine.main_engine.oil_normal || 45;
            transducers.push(`P,${pressure.toFixed(1)},P,ENGINE#1`);
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
    // Simple rudder angle for engine load correlation
    // In real scenario, this would be dynamic based on maneuvers
    const rudderAngle = 0; // Straight ahead for engine monitoring
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
    
    const baseValue = config.base || config.start || 0;
    const value = baseValue + config.amplitude * Math.sin(phase);
    
    // Apply min/max constraints if specified
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
   * Generate NMEA sentences
   */
  generateDBT(depth) {
    const depthFeet = (depth * 3.28084).toFixed(2);
    const depthMeters = depth.toFixed(2);
    const depthFathoms = (depth * 0.546807).toFixed(2);
    const checksum = this.calculateChecksum(`DBT,${depthFeet},f,${depthMeters},M,${depthFathoms},F`);
    return `$GPDBT,${depthFeet},f,${depthMeters},M,${depthFathoms},F*${checksum}`;
  }

  generateVHW(speed) {
    const speedKnots = speed.toFixed(1);
    const speedKmh = (speed * 1.852).toFixed(1);
    const checksum = this.calculateChecksum(`VHW,,,${speedKnots},N,${speedKmh},K`);
    return `$IIVHW,,,${speedKnots},N,${speedKmh},K*${checksum}`;
  }

  generateMWV(angle, speed) {
    const checksum = this.calculateChecksum(`MWV,${angle.toFixed(0)},R,${speed.toFixed(1)},N,A`);
    return `$IIMWV,${angle.toFixed(0)},R,${speed.toFixed(1)},N,A*${checksum}`;
  }

  generateRMC(lat, lon) {
    const time = new Date();
    const timeStr = time.toISOString().substr(11, 8).replace(/:/g, '');
    const dateStr = time.toISOString().substr(8, 2) + time.toISOString().substr(5, 2) + time.toISOString().substr(2, 2);
    
    const latDeg = Math.abs(lat);
    const latMin = ((latDeg % 1) * 60).toFixed(4);
    const latDir = lat >= 0 ? 'N' : 'S';
    
    const lonDeg = Math.abs(lon);
    const lonMin = ((lonDeg % 1) * 60).toFixed(4);
    const lonDir = lon >= 0 ? 'E' : 'W';
    
    const sentence = `RMC,${timeStr},A,${Math.floor(latDeg)}${latMin},${latDir},${Math.floor(lonDeg)}${lonMin},${lonDir},5.2,180.0,${dateStr},,`;
    const checksum = this.calculateChecksum(sentence);
    return `$GP${sentence}*${checksum}`;
  }

  generateHDG(heading) {
    const checksum = this.calculateChecksum(`HDG,${heading.toFixed(1)},,,,`);
    return `$IIHDG,${heading.toFixed(1)},,,,*${checksum}`;
  }

  generateAPB() {
    const checksum = this.calculateChecksum('APB,A,A,0.00,L,N,V,V,180.0,M,DEST,180.0,M,180.0,M');
    return `$GPAPB,A,A,0.00,L,N,V,V,180.0,M,DEST,180.0,M,180.0,M*${checksum}`;
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
   * Generate DPT sentence (Depth)
   */
  generateDPT(depth) {
    const offset = this.scenario?.parameters?.vessel?.keel_offset || 0;
    const maxRange = this.scenario?.parameters?.sonar?.max_range || 100.0;
    const checksum = this.calculateChecksum(`DPT,${depth.toFixed(2)},${offset.toFixed(1)},${maxRange.toFixed(1)}`);
    return `$SDDPT,${depth.toFixed(2)},${offset.toFixed(1)},${maxRange.toFixed(1)}*${checksum}`;
  }

  /**
   * Generate DBK sentence (Depth Below Keel)
   */
  generateDBK(depth) {
    const keelOffset = this.scenario?.parameters?.vessel?.keel_offset || 0;
    const depthBelowKeel = Math.max(0, depth - keelOffset);
    const depthFeet = (depthBelowKeel * 3.28084).toFixed(2);
    const depthMeters = depthBelowKeel.toFixed(2);
    const depthFathoms = (depthBelowKeel * 0.546807).toFixed(2);
    const checksum = this.calculateChecksum(`DBK,${depthFeet},f,${depthMeters},M,${depthFathoms},F`);
    return `$SDDBK,${depthFeet},f,${depthMeters},M,${depthFathoms},F*${checksum}`;
  }

  /**
   * Generate MTW sentence (Water Temperature)
   */
  generateMTWSentence() {
    const tempConfig = this.scenario?.data?.water_temp;
    if (!tempConfig) return [];

    const tempC = this.getYAMLDataValue('water_temp', tempConfig);
    const checksum = this.calculateChecksum(`MTW,${tempC.toFixed(1)},C`);
    return [`$SDMTW,${tempC.toFixed(1)},C*${checksum}`];
  }

  /**
   * Generate VHW sentence (Water Speed and Heading)
   */
  generateVHWSentence() {
    const speedConfig = this.scenario?.data?.speed;
    if (!speedConfig) return [];

    const speed = this.getYAMLDataValue('speed', speedConfig);
    return [this.generateVHW(speed)];
  }

  /**
   * Generate VTG sentence (Track Made Good and Ground Speed)
   */
  generateVTGSentence() {
    const speedConfig = this.scenario?.data?.speed;
    const gpsConfig = this.scenario?.data?.gps;
    if (!speedConfig) return [];

    const speed = this.getYAMLDataValue('speed', speedConfig);
    const heading = gpsConfig ? this.getCurrentHeading() : 0;
    
    const speedKmh = (speed * 1.852).toFixed(1);
    const checksum = this.calculateChecksum(`VTG,${heading.toFixed(1)},T,,M,${speed.toFixed(1)},N,${speedKmh},K,A`);
    return [`$GPVTG,${heading.toFixed(1)},T,,M,${speed.toFixed(1)},N,${speedKmh},K,A*${checksum}`];
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
  generateGGASentence() {
    const gpsConfig = this.scenario?.data?.gps;
    if (!gpsConfig) return [];

    const position = this.getCurrentPosition();
    if (!position) return [];

    const time = new Date();
    const timeStr = time.toISOString().substr(11, 8).replace(/:/g, '') + '.00';
    
    const latDeg = Math.abs(position.lat);
    const latMin = ((latDeg % 1) * 60).toFixed(4);
    const latDir = position.lat >= 0 ? 'N' : 'S';
    
    const lonDeg = Math.abs(position.lon);
    const lonMin = ((lonDeg % 1) * 60).toFixed(4);
    const lonDir = position.lon >= 0 ? 'E' : 'W';
    
    const sentence = `GGA,${timeStr},${Math.floor(latDeg)}${latMin},${latDir},${String(Math.floor(lonDeg)).padStart(3, '0')}${lonMin},${lonDir},1,08,1.0,0.0,M,0.0,M,,`;
    const checksum = this.calculateChecksum(sentence);
    return [`$GP${sentence}*${checksum}`];
  }

  /**
   * Generate RMC sentence (Recommended Minimum)
   */
  generateRMCSentence() {
    const gpsConfig = this.scenario?.data?.gps;
    if (!gpsConfig) return [];

    const position = this.getCurrentPosition();
    if (!position) return [];

    return [this.generateRMC(position.lat, position.lon)];
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
      const elapsed = (Date.now() - this.startTime) / 1000;
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
   * Get current heading from GPS track
   */
  getCurrentHeading() {
    const gpsConfig = this.scenario?.data?.gps;
    if (!gpsConfig || !gpsConfig.waypoints || gpsConfig.waypoints.length < 2) {
      return 0;
    }

    const elapsed = (Date.now() - this.startTime) / 1000;
    const duration = this.scenario.duration || 300;
    const progress = (elapsed % duration) / duration;
    const totalTime = gpsConfig.waypoints[gpsConfig.waypoints.length - 1].time;
    const currentTime = progress * totalTime;

    // Find surrounding waypoints
    for (let i = 0; i < gpsConfig.waypoints.length - 1; i++) {
      const wp1 = gpsConfig.waypoints[i];
      const wp2 = gpsConfig.waypoints[i + 1];
      
      if (currentTime >= wp1.time && currentTime <= wp2.time) {
        // Calculate heading between waypoints
        const dLon = wp2.lon - wp1.lon;
        const dLat = wp2.lat - wp1.lat;
        let heading = Math.atan2(dLon, dLat) * 180 / Math.PI;
        if (heading < 0) heading += 360;
        return heading;
      }
    }

    return 0;
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