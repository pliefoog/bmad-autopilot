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

      this.emit('status', `Loaded scenario: ${this.scenario.name || this.config.scenarioName}`);
      this.emit('status', `Description: ${this.scenario.description || 'No description'}`);
      
    } catch (error) {
      throw new Error(`Failed to load scenario: ${error.message}`);
    }
  }

  /**
   * Resolve scenario file path
   */
  resolveScenarioPath(scenarioName) {
    // Try different path patterns
    const possiblePaths = [
      path.join(__dirname, '../../scenarios', `${scenarioName}.yml`),
      path.join(__dirname, '../../scenarios', scenarioName, 'scenario.yml'),
      path.join(__dirname, '../../scenarios', `${scenarioName}.yaml`),
      scenarioName // If it's already a full path
    ];

    for (const scenarioPath of possiblePaths) {
      if (fs.existsSync(scenarioPath)) {
        return scenarioPath;
      }
    }

    return possiblePaths[0]; // Return first attempt for error reporting
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
      
      this.emit('status', `Starting phase: ${phase.name} (${phase.duration}ms duration)`);
      
      // Start generators for this phase
      this.startPhaseGenerators(phase);
      
      // Schedule next phase
      const phaseDuration = Math.round(phase.duration / this.config.speed);
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
    if (!phase.generators) return;

    phase.generators.forEach(generatorName => {
      const generator = this.dataGenerators.get(generatorName);
      if (generator) {
        this.startGenerator(generatorName, generator, phase);
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
      const message = generator.generate();
      if (message) {
        this.stats.messagesGenerated++;
        this.emit('data', message);
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
    const generators = ['depth', 'speed', 'wind', 'gps'];
    
    generators.forEach(generatorName => {
      const generator = this.dataGenerators.get(generatorName);
      if (generator) {
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
   * Generate NMEA sentences
   */
  generateDBT(depth) {
    const checksum = this.calculateChecksum(`DBT,${depth.toFixed(1)},f,${(depth * 0.3048).toFixed(1)},M,${(depth * 0.5468).toFixed(1)},F`);
    return `$IIDBT,${depth.toFixed(1)},f,${(depth * 0.3048).toFixed(1)},M,${(depth * 0.5468).toFixed(1)},F*${checksum}`;
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