#!/usr/bin/env node

/**
 * NMEA Generator Component
 * 
 * Handles all NMEA sentence generation logic including:
 * - Standard NMEA 0183 sentences (GGA, VTG, MWV, DBT, etc.)
 * - Scenario-based data generation with parameter injection
 * - Checksum calculation and message formatting
 * - Multi-instance support for sensors
 * 
 * Implements SimulatorComponent interface for lifecycle management.
 */

const { SimulatorComponent } = require('./types');

class NmeaGenerator {
  constructor() {
    this.config = null;
    this.scenario = null;
    this.scenarioFunctions = new Map();
    this.strictScenario = false;
    this.isRunning = false;
    this.startTime = null;
    this.stats = {
      messagesGenerated: 0,
      messagesPerSecond: 0,
      lastSecondMessages: 0,
      lastSecondTime: Date.now()
    };

    // Default autopilot state (will be injected from main orchestrator)
    this.autopilotState = {
      mode: 'STANDBY',
      engaged: false, 
      active: false,
      targetHeading: 180,
      currentHeading: 175,
      rudderPosition: 0
    };
  }

  /**
   * Start the NMEA generator
   * @param {SimulatorConfig} config - Generator configuration
   */
  async start(config) {
    if (this.isRunning) {
      throw new Error('NMEA generator is already running');
    }

    this.config = config;
    this.startTime = Date.now();
    this.isRunning = true;
    
    console.log('✅ NMEA Generator started');
  }

  /**
   * Stop the NMEA generator
   */
  async stop() {
    console.log('🔌 Shutting down NMEA generator...');
    
    this.isRunning = false;
    this.startTime = null;
    this.scenario = null;
    this.scenarioFunctions.clear();
    
    console.log('✅ NMEA Generator stopped');
  }

  /**
   * Get generator status
   * @returns {ComponentStatus}
   */
  getStatus() {
    return {
      running: this.isRunning,
      state: this.isRunning ? 'running' : 'stopped',
      error: null,
      uptime: this.startTime ? Date.now() - this.startTime : 0
    };
  }

  /**
   * Get generator metrics
   * @returns {ComponentMetrics}
   */
  getMetrics() {
    this.updateThroughputMetrics();
    
    return {
      messagesProcessed: this.stats.messagesGenerated,
      messagesPerSecond: this.stats.messagesPerSecond,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      activeConnections: 0, // N/A for generator
      customMetrics: {
        scenarioLoaded: !!this.scenario,
        scenarioFunctions: this.scenarioFunctions.size,
        strictMode: this.strictScenario
      }
    };
  }

  /**
   * Set scenario data for generation
   * @param {Object} scenario - Scenario configuration
   * @param {Map} scenarioFunctions - Compiled scenario functions
   * @param {boolean} strictScenario - Whether to enforce strict scenario mode
   */
  setScenario(scenario, scenarioFunctions, strictScenario = false) {
    this.scenario = scenario;
    this.scenarioFunctions = scenarioFunctions;
    this.strictScenario = strictScenario;
  }

  /**
   * Update autopilot state reference
   * @param {Object} autopilotState - Current autopilot state
   */
  setAutopilotState(autopilotState) {
    this.autopilotState = autopilotState;
  }

  /**
   * Generate complete set of NMEA messages
   * @returns {Array<string>} Array of formatted NMEA messages
   */
  generateAllMessages() {
    const messages = [];

    try {
      // Generate basic NMEA sentences
      messages.push(this.generateDepthSentence());    // DBT/DPT/DBK - Depth
      messages.push(this.generateSpeedSentence());    // VTG - Speed Over Ground
      messages.push(this.generateWaterSpeedSentence()); // VHW - Speed Through Water
      messages.push(this.generateWindSentence());     // MWV - Wind
      messages.push(this.generateGPSSentence());      // GGA - GPS Fix
      messages.push(this.generateRMCSentence());      // RMC - Recommended Minimum
      messages.push(this.generateWaterTemperatureSentence()); // MTW - Water Temperature
      
      // Generate additional sensor messages
      const additionalMessages = this.generateTankSensors();
      messages.push(...additionalMessages);
      
      const electricalMessages = this.generateElectricalSensors();
      messages.push(...electricalMessages);
      
      const engineMessages = this.generateEngineSensors();
      messages.push(...engineMessages);

      this.stats.messagesGenerated += messages.length;
      
      return messages.filter(msg => msg && msg.length > 0);
    } catch (error) {
      console.error('❌ Error generating NMEA messages:', error.message);
      return [];
    }
  }

  /**
   * Generate selective NMEA messages based on timing
   * @param {Object} timing - Timing configuration for message types
   * @returns {Array<string>} Array of formatted NMEA messages for this interval
   */
  generateSelectiveMessages(timing) {
    if (!timing || !this.scenario) {
      return this.generateAllMessages();
    }

    const messages = [];
    const now = Date.now();

    // Check each message type timing
    if (this.shouldGenerateMessage('depth', timing, now)) {
      messages.push(this.generateDepthSentence());
    }
    
    if (this.shouldGenerateMessage('speed', timing, now)) {
      messages.push(this.generateSpeedSentence());
      messages.push(this.generateWaterSpeedSentence());
    }
    
    if (this.shouldGenerateMessage('wind', timing, now)) {
      messages.push(this.generateWindSentence());
    }
    
    if (this.shouldGenerateMessage('gps', timing, now)) {
      messages.push(this.generateGPSSentence());
      messages.push(this.generateRMCSentence());
    }
    
    if (this.shouldGenerateMessage('temperature', timing, now)) {
      messages.push(this.generateWaterTemperatureSentence());
    }

    // Generate sensor messages based on their individual timing
    const sensorMessages = this.generateTimedSensorMessages(timing, now);
    messages.push(...sensorMessages);

    this.stats.messagesGenerated += messages.length;
    return messages.filter(msg => msg && msg.length > 0);
  }

  /**
   * Check if a message type should be generated based on timing
   * @private
   */
  shouldGenerateMessage(messageType, timing, now) {
    const messageConfig = timing[messageType];
    if (!messageConfig || !messageConfig.interval) {
      return true; // Default to generate if no timing specified
    }

    if (!messageConfig.lastGenerated) {
      messageConfig.lastGenerated = now;
      return true;
    }

    return (now - messageConfig.lastGenerated) >= messageConfig.interval;
  }

  /**
   * Generate depth sentence (DBT/DPT/DBK)
   */
  generateDepthSentence() {
    const depthData = this.scenario?.data?.depth || {};
    let depthMeters = depthData.currentValue;

    // Apply scenario functions for depth calculation
    if (this.scenario && depthData.function) {
      depthMeters = this.evaluateScenarioFunction(depthData.function, 'data.depth');
    }

    // Provide default depth if no scenario data (for basic operation)
    if (depthMeters === undefined || !Number.isFinite(depthMeters)) {
      if (this.strictScenario) {
        throw new Error('Scenario missing depth.currentValue. Ensure YAML functions update this value and timing is defined.');
      }
      // Generate realistic varying depth for demonstration
      depthMeters = 15.0 + Math.sin(Date.now() * 0.0001) * 5.0; // 10-20 meters
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
    const depthFathoms = depthMeters / 1.8288; // Convert meters to fathoms (1 fathom = 1.8288 meters)

    // Correct DBT format: $xxDBT,<depth_feet>,f,<depth_meters>,M,<depth_fathoms>,F
    const sentence = `$IIDBT,${depthFeet.toFixed(2)},f,${depthMeters.toFixed(2)},M,${depthFathoms.toFixed(2)},F`;
    return this.addChecksum(sentence);
  }

  /**
   * Generate DPT (Depth of Water) sentence
   * NMEA 0183 4.10 Format: $--DPT,x.x,x.x,x.x*hh
   * Field 1: Water depth relative to transducer (meters)
   * Field 2: Offset from transducer (meters, + = transducer to waterline, - = transducer to keel)
   * Field 3: Maximum range scale in use (meters) - NOT sonar max capability
   *          Should be empty if not available or not applicable
   */
  generateDPTSentence(depthMeters) {
    const offset = this.scenario?.parameters?.vessel?.keel_offset || 0.0; // Keel offset in meters
    // Field 3: Range scale currently displayed (user-selected, e.g. 0-20m, 0-50m)
    // Leave empty if not explicitly configured - most sounders don't report this
    const rangeScale = this.scenario?.parameters?.sonar?.range_scale || ''; // Usually empty
    
    const sentence = `$IIDPT,${depthMeters.toFixed(2)},${offset.toFixed(1)},${rangeScale}`;
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
    const sentence = `$IIDBK,${depthFeet.toFixed(2)},f,${depthBelowKeel.toFixed(2)},M,${depthFathoms.toFixed(2)},F`;
    return this.addChecksum(sentence);
  }

  /**
   * Generate speed sentence (VTG - Speed Over Ground)
   */
  generateSpeedSentence() {
    const speedData = this.scenario?.data?.speed || {};
    let speedKnots = speedData.currentValue;
    
    // Apply scenario functions for speed calculation
    if (this.scenario && speedData.function) {
      speedKnots = this.evaluateScenarioFunction(speedData.function, 'data.speed');
    }
    
    if (this.strictScenario && (speedKnots === undefined || !Number.isFinite(speedKnots))) {
      throw new Error('Scenario missing speed.currentValue. Ensure YAML functions update this value and timing is defined.');
    }
    
    // Provide default speed if no scenario data (for basic operation)
    if (speedKnots === undefined || !Number.isFinite(speedKnots)) {
      // Generate realistic varying speed for demonstration
      speedKnots = 6.5 + Math.sin(Date.now() * 0.0001) * 2.0; // 4.5-8.5 knots
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
    let windAngle = windAngleData.currentValue;
    let windSpeedKnots = windSpeedData.currentValue;
    
    // Apply scenario functions for wind calculation
    if (this.scenario && windAngleData.function) {
      windAngle = this.evaluateScenarioFunction(windAngleData.function, 'data.wind.angle');
    }
    if (this.scenario && windSpeedData.function) {
      windSpeedKnots = this.evaluateScenarioFunction(windSpeedData.function, 'data.wind.speed');
    }
    
    if (this.strictScenario && (windAngle === undefined || !Number.isFinite(windAngle))) {
      throw new Error('Scenario missing wind.angle.currentValue. Ensure YAML functions update this value and timing is defined.');
    }
    if (this.strictScenario && (windSpeedKnots === undefined || !Number.isFinite(windSpeedKnots))) {
      throw new Error('Scenario missing wind.speed.currentValue. Ensure YAML functions update this value and timing is defined.');
    }

    // Provide default wind if no scenario data (for basic operation)
    if (windAngle === undefined || !Number.isFinite(windAngle)) {
      // Generate realistic varying wind angle
      windAngle = 45 + Math.sin(Date.now() * 0.00005) * 30; // 15-75 degrees
    }
    if (windSpeedKnots === undefined || !Number.isFinite(windSpeedKnots)) {
      // Generate realistic varying wind speed
      windSpeedKnots = 12 + Math.sin(Date.now() * 0.0001) * 5; // 7-17 knots
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
    // CRITICAL: COG comes from GPS track (scenario calculates from waypoints), NOT from heading
    // Heading is compass direction (bow), COG is actual track over ground
    const cog = this.scenario?.data?.gps?.cog ?? 0;

    // Status A=valid, V=warning
    const status = 'A';

    // Magnetic variation unknown -> leave blank fields
    const sentence = `$IIRMC,${time},${status},${lat},${latHemisphere},${lon},${lonHemisphere},${Number(sog).toFixed(1)},${Number(cog).toFixed(1)},${date},,,A`;
    return this.addChecksum(sentence);
  }

  /**
   * Generate water temperature sentence (MTW)
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
   * Generate tank sensor messages
   */
  generateTankSensors() {
    const messages = [];
    
    // Generate tank level messages using XDR format
    const tankTypes = ['fuel', 'water', 'waste'];
    
    tankTypes.forEach(tankType => {
      // Generate realistic tank levels
      const baseLevel = tankType === 'fuel' ? 75 : tankType === 'water' ? 85 : 25;
      const variation = (Math.random() - 0.5) * 10; // ±5% variation
      const level = Math.max(0, Math.min(100, baseLevel + variation));
      
      const fuelSentence = `$IIXDR,L,${level.toFixed(1)},L,${tankType.toUpperCase()}_TANK_01`;
      messages.push(this.addChecksum(fuelSentence));
    });
    
    return messages;
  }

  /**
   * Generate electrical sensor messages
   */
  generateElectricalSensors() {
    const messages = [];
    
    // Battery voltage (typically 12.0-14.4V for 12V system)
    const batteryVoltage = 12.6 + (Math.random() - 0.5) * 1.0; // 12.1-13.1V
    const voltageSentence = `$IIXDR,U,${batteryVoltage.toFixed(1)},V,BATTERY_01`;
    messages.push(this.addChecksum(voltageSentence));
    
    // Battery current (amperage)
    const batteryCurrent = 5.0 + (Math.random() - 0.5) * 4.0; // 3-7A typical load
    const currentSentence = `$IIXDR,I,${batteryCurrent.toFixed(1)},A,BATTERY_01`;
    messages.push(this.addChecksum(currentSentence));
    
    return messages;
  }

  /**
   * Generate engine sensor messages
   */
  generateEngineSensors() {
    const messages = [];
    
    if (this.scenario?.parameters?.engines?.count > 0) {
      const engineCount = this.scenario.parameters.engines.count;
      
      for (let i = 0; i < engineCount; i++) {
        const engineId = i + 1;
        
        // Engine RPM
        const baseRpm = 2800;
        const rpmVariation = (Math.random() - 0.5) * 200; // ±100 RPM variation
        const rpm = Math.max(800, baseRpm + rpmVariation);
        const engineIdPadded = String(engineId).padStart(2, '0');
        const rpmSentence = `$IIXDR,A,${rpm.toFixed(0)},R,ENGINE_${engineIdPadded}_RPM`;
        messages.push(this.addChecksum(rpmSentence));
        
        // Engine temperature
        const baseTemp = 88; // °C
        const tempVariation = (Math.random() - 0.5) * 8; // ±4°C variation
        const temp = baseTemp + tempVariation;
        const tempSentence = `$IIXDR,C,${temp.toFixed(1)},C,ENGINE_${engineIdPadded}_TEMP`;
        messages.push(this.addChecksum(tempSentence));
      }
    }
    
    return messages;
  }

  /**
   * Generate timed sensor messages based on timing configuration
   * @private
   */
  generateTimedSensorMessages(timing, now) {
    const messages = [];
    
    if (this.shouldGenerateMessage('tanks', timing, now)) messages.push(...this.generateTankSensors());
    if (this.shouldGenerateMessage('electrical', timing, now)) messages.push(...this.generateElectricalSensors());
    if (this.shouldGenerateMessage('engines', timing, now)) messages.push(...this.generateEngineSensors());
    
    return messages;
  }

  /**
   * Evaluate scenario function for parameter generation
   * @private
   */
  evaluateScenarioFunction(functionName, dataPath) {
    const scenarioFunction = this.scenarioFunctions.get(functionName);
    if (!scenarioFunction) {
      console.warn(`Warning: Scenario function '${functionName}' not found for ${dataPath}`);
      return undefined;
    }

    try {
      // Calculate simulation elapsed time in milliseconds
      const elapsedMs = this.startTime ? (Date.now() - this.startTime) : 0;
      // Convert to seconds for scenario functions (tidal_cycle, polar_sailing, etc. expect seconds)
      const currentTime = elapsedMs / 1000;
      
      const ctx = {
        currentTime,              // Simulation elapsed time in seconds (for scenario functions)
        time: Date.now(),         // Wall-clock time (for backward compatibility)
        scenario: this.scenario,
        autopilot: this.autopilotState
      };
      
      const result = scenarioFunction(ctx);
      
      if (!Number.isFinite(result)) {
        throw new Error(`Function '${functionName}' returned non-numeric value`);
      }
      
      return result;
    } catch (error) {
      console.error(`Error executing scenario function ${functionName} for ${dataPath}:`, error.message);
      return undefined;
    }
  }

  /**
   * Add NMEA checksum to sentence
   * @private
   */
  addChecksum(sentence) {
    let checksum = 0;
    for (let i = 1; i < sentence.length; i++) {
      checksum ^= sentence.charCodeAt(i);
    }
    return `${sentence}*${checksum.toString(16).toUpperCase().padStart(2, '0')}\r\n`;
  }

  /**
   * Update throughput metrics
   * @private
   */
  updateThroughputMetrics() {
    const now = Date.now();
    const timeDiff = now - this.stats.lastSecondTime;
    
    if (timeDiff >= 1000) {
      this.stats.messagesPerSecond = Math.round(
        (this.stats.messagesGenerated - this.stats.lastSecondMessages) / (timeDiff / 1000)
      );
      this.stats.lastSecondMessages = this.stats.messagesGenerated;
      this.stats.lastSecondTime = now;
    }
  }
}

module.exports = NmeaGenerator;