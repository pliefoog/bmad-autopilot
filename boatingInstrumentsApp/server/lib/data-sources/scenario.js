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
    // Start built-in generators
    const builtInGenerators = ['depth', 'speed', 'wind', 'gps'];
    
    builtInGenerators.forEach(generatorName => {
      const generator = this.dataGenerators.get(generatorName);
      if (generator) {
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

        default:
          console.warn(`⚠️ Unknown YAML sentence type: ${sentenceDef.type}`);
      }
    });
  }

  /**
   * Generate comprehensive battery XDR sentences from YAML configuration
   */
  generateYAMLBatterySentence(sentenceDef) {
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
      
      // 1. Voltage XDR sentence
      const voltageSentence = `$IIXDR,U,${voltage.toFixed(1)},V,${batteryId}`;
      messages.push(voltageSentence + '*' + this.calculateChecksum(voltageSentence.substring(1)));
      
      // 2. Current (AMP) XDR sentence - calculate realistic current based on voltage
      const current = this.calculateBatteryCurrent(voltage, instance, batteryConfig);
      const currentSentence = `$IIXDR,I,${current.toFixed(1)},A,${batteryId}`;
      messages.push(currentSentence + '*' + this.calculateChecksum(currentSentence.substring(1)));
      
      // 3. Temperature (TMP) XDR sentence - battery temperature
      const temperature = this.calculateBatteryTemperature(voltage, instance);
      const tempSentence = `$IIXDR,C,${temperature.toFixed(1)},C,${batteryId}_TMP`;
      messages.push(tempSentence + '*' + this.calculateChecksum(tempSentence.substring(1)));
      
      // 4. State of Charge (SOC) XDR sentence - percentage
      const soc = this.calculateBatterySOC(voltage, instance);
      const socSentence = `$IIXDR,P,${soc.toFixed(0)},P,${batteryId}_SOC`;
      messages.push(socSentence + '*' + this.calculateChecksum(socSentence.substring(1)));
      
      // 5. Nominal Voltage (NOM) XDR sentence - rated voltage
      const nominalVoltage = this.getBatteryNominalVoltage(instance);
      const nomSentence = `$IIXDR,U,${nominalVoltage.toFixed(1)},V,${batteryId}_NOM`;
      messages.push(nomSentence + '*' + this.calculateChecksum(nomSentence.substring(1)));
      
      // 6. Battery Chemistry (CHEM) XDR sentence - battery type
      const chemistry = this.getBatteryChemistry(instance);
      const chemSentence = `$IIXDR,G,${chemistry},,${batteryId}_CHEM`;
      messages.push(chemSentence + '*' + this.calculateChecksum(chemSentence.substring(1)));
      
      console.log(`🔋 Generated comprehensive battery data for ${batteryId}: V=${voltage.toFixed(1)}V, I=${current.toFixed(1)}A, SOC=${soc.toFixed(0)}%, T=${temperature.toFixed(1)}°C`);
      
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
    const instance = sentenceDef.instance || 0;
    
    if (!this.scenario?.data?.tank_levels) {
      return null;
    }

    const tankEntries = Object.entries(this.scenario.data.tank_levels);
    if (instance >= tankEntries.length) {
      return null;
    }

    const [tankKey, tankConfig] = tankEntries[instance];
    const level = this.getYAMLDataValue(tankKey, tankConfig);
    
    if (level !== null) {
      const sentence = `$IIXDR,P,${level.toFixed(1)},P,${tankKey}`;
      const checksum = this.calculateChecksum(sentence.substring(1));
      return `${sentence}*${checksum}`;
    }

    return null;
  }

  /**
   * Generate temperature XDR sentence from YAML configuration
   */
  generateYAMLTemperatureSentence(sentenceDef) {
    const instance = sentenceDef.instance || 1;
    
    if (!this.scenario?.data?.temperature) {
      return null;
    }

    const tempEntries = Object.entries(this.scenario.data.temperature);
    const tempIndex = instance - 1; // Convert to 0-based index
    
    if (tempIndex < 0 || tempIndex >= tempEntries.length) {
      return null;
    }

    const [tempKey, tempConfig] = tempEntries[tempIndex];
    const temperature = this.getYAMLDataValue(tempKey, tempConfig);
    
    if (temperature !== null) {
      const label = sentenceDef.label || tempKey;
      const sentence = `$IIXDR,C,${temperature.toFixed(1)},C,${label}`;
      const checksum = this.calculateChecksum(sentence.substring(1));
      return `${sentence}*${checksum}`;
    }

    return null;
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
        case 'linear':
          return this.generateLinear(dataConfig, currentTime);
        case 'gaussian':
          return this.generateGaussian(dataConfig, currentTime);
        case 'linear_decline':
          return this.generateLinearDecline(dataConfig, currentTime);
        case 'linear_increase':
          return this.generateLinearIncrease(dataConfig, currentTime);
        case 'random':
          return this.generateRandom(dataConfig);
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
   */
  generateSineWave(config, currentTime) {
    const time = currentTime / 1000; // Convert to seconds
    const radians = 2 * Math.PI * config.frequency * time;
    const baseValue = config.base || config.start || 0;
    return baseValue + config.amplitude * Math.sin(radians);
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
    const checksum = this.calculateChecksum(`DBT,${depth.toFixed(1)},f,${(depth * 0.3048).toFixed(1)},M,${(depth * 0.5468).toFixed(1)},F`);
    return `$GPDBT,,f,${depth.toFixed(1)},M,${(depth * 0.5468).toFixed(1)},F*${checksum}`;
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