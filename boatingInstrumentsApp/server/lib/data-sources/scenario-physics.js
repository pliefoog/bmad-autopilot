/**
 * Physics-Enhanced Scenario Data Source
 * 
 * Task 4.2: System integration and compatibility (AC4: #3-4)
 * Extends existing scenario system with advanced physics simulation
 * Full backward compatibility with existing scenarios
 */

const ScenarioDataSource = require('./scenario');
const { CoordinatedVesselState, SynchronizedNMEAGenerator } = require('../physics/dynamics/VesselDynamics');
const VesselProfileManager = require('../physics/vessel-profile');

class PhysicsEnhancedScenarioDataSource extends ScenarioDataSource {
    constructor(config) {
        super(config);
        
        // Physics engine components
        this.vesselProfileManager = new VesselProfileManager();
        this.coordinatedVesselState = null;
        this.synchronizedNMEAGenerator = null;
        this.physicsEnabled = false;
        
        // Performance tracking
        this.physicsStats = {
            stateUpdates: 0,
            nmeaGenerated: 0,
            lastUpdateTime: Date.now(),
            averageUpdateRate: 0
        };
        
        this.emit('status', 'Physics-enhanced scenario data source initialized');
    }

    /**
     * Override scenario path resolution to include physics scenarios
     * @override
     */
    resolveScenarioPath(scenarioName) {
        const path = require('path');
        const fs = require('fs');
        
        // Try physics-specific paths first, then fall back to standard paths
        const possiblePaths = [
            path.join(__dirname, '../../../marine-assets/test-scenarios/physics', `${scenarioName}.yml`),
            path.join(__dirname, '../../../marine-assets/test-scenarios/physics', `${scenarioName}.yaml`),
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
     * Load scenario with physics enhancement detection
     * @override
     */
    async loadScenario() {
        const scenarioPath = this.resolveScenarioPath(this.config.scenarioName);
        
        this.emit('status', `Loading scenario: ${this.config.scenarioName}`);
        
        try {
            const fs = require('fs');
            const yaml = require('js-yaml');
            
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
            
            // Check if scenario has physics configuration
            if (this.scenario.physics && this.scenario.physics.enabled) {
                await this.initializePhysicsEngine();
            } else {
                this.emit('status', 'Physics engine disabled - using standard scenario mode');
            }
            
        } catch (error) {
            throw new Error(`Failed to load scenario: ${error.message}`);
        }
    }

    /**
     * Initialize physics engine for enhanced scenarios
     */
    async initializePhysicsEngine() {
        try {
            this.emit('status', 'Initializing physics engine...');
            
            // Load vessel profile
            const vesselProfileName = this.scenario.physics.vessel_profile || 'j35';
            const vesselProfile = await this.vesselProfileManager.loadProfile(vesselProfileName);
            
            this.emit('status', `Loaded vessel profile: ${vesselProfile.name}`);
            
            // Initialize coordinated state management
            this.coordinatedVesselState = new CoordinatedVesselState(vesselProfile);
            this.synchronizedNMEAGenerator = new SynchronizedNMEAGenerator(this.coordinatedVesselState);
            
            // Configure NMEA sentence timing from scenario
            if (this.scenario.physics.nmea_timing) {
                this.synchronizedNMEAGenerator.updateSentenceTimings(this.scenario.physics.nmea_timing);
            }
            
            // Set initial vessel state from scenario
            if (this.scenario.physics.initial_state) {
                this.coordinatedVesselState.reset();
                const initialState = this.scenario.physics.initial_state;
                
                // Set position
                if (initialState.position) {
                    this.coordinatedVesselState.vesselState.position = {
                        latitude: initialState.position.latitude || 37.7749,
                        longitude: initialState.position.longitude || -122.4194,
                        timestamp: Date.now()
                    };
                }
                
                // Set initial motion state
                if (initialState.motion) {
                    Object.assign(this.coordinatedVesselState.vesselState.motion, initialState.motion);
                    this.coordinatedVesselState.vesselState.motion.timestamp = Date.now();
                }
            }
            
            this.physicsEnabled = true;
            this.emit('status', 'Physics engine initialized successfully');
            
        } catch (error) {
            this.emit('error', `Failed to initialize physics engine: ${error.message}`);
            this.emit('status', 'Falling back to standard scenario mode');
            this.physicsEnabled = false;
        }
    }

    /**
     * Start scenario execution with physics integration
     * @override
     */
    async start() {
        try {
            await this.loadScenario();
            
            if (this.physicsEnabled) {
                await this.startPhysicsEnhancedExecution();
            } else {
                await super.start();
            }
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Start physics-enhanced scenario execution
     */
    async startPhysicsEnhancedExecution() {
        this.isRunning = true;
        this.stats.startTime = Date.now();
        this.stats.messagesGenerated = 0;
        
        this.emit('status', 'Starting physics-enhanced scenario execution');
        this.emit('scenarioStarted', { 
            scenario: this.scenario.name,
            physicsEnabled: true,
            vesselProfile: this.coordinatedVesselState?.dynamics?.vesselProfile?.name || 'Unknown'
        });
        
        // Start physics simulation loop
        this.startPhysicsSimulationLoop();
        
        // Execute scenario phases if defined
        if (this.scenario.phases && this.scenario.phases.length > 0) {
            // Don't await - let phases run in background
            this.executePhysicsEnhancedPhases();
        }
    }

    /**
     * Start physics simulation loop
     */
    startPhysicsSimulationLoop() {
        const updateInterval = this.scenario.physics.update_interval_ms || 100; // 10 Hz default
        let lastUpdateTime = Date.now();
        
        const physicsLoop = () => {
            if (!this.isRunning) return;
            
            const currentTime = Date.now();
            const deltaTime = (currentTime - lastUpdateTime) / 1000; // Convert to seconds
            
            // Update vessel state based on current scenario phase
            const environmentalConditions = this.getCurrentEnvironmentalConditions();
            const targetState = this.getCurrentTargetState();
            
            this.coordinatedVesselState.updateState(deltaTime, targetState, environmentalConditions);
            
            // Generate NMEA sentences
            const nmeaResult = this.synchronizedNMEAGenerator.generateSynchronizedSentences();
            
            // Emit NMEA sentences
            nmeaResult.sentences.forEach(sentenceData => {
                this.emit('data', sentenceData.sentence);
                this.stats.messagesGenerated++;
                this.physicsStats.nmeaGenerated++;
            });
            
            // Update physics stats
            this.physicsStats.stateUpdates++;
            this.physicsStats.lastUpdateTime = currentTime;
            
            // Calculate average update rate
            const elapsed = (currentTime - this.stats.startTime) / 1000;
            this.physicsStats.averageUpdateRate = this.physicsStats.stateUpdates / elapsed;
            
            lastUpdateTime = currentTime;
            
            // Schedule next update
            setTimeout(physicsLoop, updateInterval);
        };
        
        // Start the physics loop
        physicsLoop();
    }

    /**
     * Execute physics-enhanced scenario phases
     */
    async executePhysicsEnhancedPhases() {
        // Use setTimeout to ensure phases start after simulation loop
        setTimeout(async () => {
            for (let i = 0; i < this.scenario.phases.length; i++) {
                if (!this.isRunning) break;
                
                const phase = this.scenario.phases[i];
                this.currentPhase = phase;
                this.phaseStartTime = Date.now();
                
                this.emit('phaseStarted', { 
                    phase: phase.phase || `Phase ${i + 1}`,
                    description: phase.description || 'No description',
                    duration: phase.duration || 60,
                    physicsEnhanced: true
                });
                
                // Apply phase-specific physics configuration
                if (phase.physics) {
                    this.applyPhysicsConfiguration(phase.physics);
                }
                
                // Wait for phase duration
                await this.waitForPhaseDuration(phase.duration || 60);
                
                this.emit('phaseCompleted', { 
                    phase: phase.phase || `Phase ${i + 1}`,
                    messagesGenerated: this.physicsStats.nmeaGenerated,
                    stateUpdates: this.physicsStats.stateUpdates
                });
                
                this.stats.phasesCompleted++;
            }
            
            // Handle loop mode
            if (this.config.loop && this.isRunning) {
                this.loopCount++;
                this.stats.currentIteration++;
                this.emit('loopCompleted', { 
                    iteration: this.loopCount,
                    totalMessages: this.stats.messagesGenerated
                });
                
                // Restart phases
                setTimeout(() => this.executePhysicsEnhancedPhases(), 1000);
            } else {
                this.emit('scenarioCompleted', {
                    totalMessages: this.stats.messagesGenerated,
                    stateUpdates: this.physicsStats.stateUpdates,
                    averageUpdateRate: this.physicsStats.averageUpdateRate
                });
            }
        }, 100); // 100ms delay to ensure simulation loop starts first
    }

    /**
     * Get current environmental conditions from scenario phase
     */
    getCurrentEnvironmentalConditions() {
        const phase = this.currentPhase;
        if (!phase || !phase.environment) {
            return {
                trueWindSpeed: 10,
                trueWindAngle: 45,
                currentSpeed: 0,
                currentDirection: 0,
                waveHeight: 1.0
            };
        }
        
        return {
            trueWindSpeed: phase.environment.wind_speed || 10,
            trueWindAngle: phase.environment.wind_angle || 45,
            currentSpeed: phase.environment.current_speed || 0,
            currentDirection: phase.environment.current_direction || 0,
            waveHeight: phase.environment.wave_height || 1.0
        };
    }

    /**
     * Get current target state from scenario phase
     */
    getCurrentTargetState() {
        const phase = this.currentPhase;
        if (!phase || !phase.vessel_control) {
            return {
                targetSpeed: 5,
                targetHeading: 0
            };
        }
        
        return {
            targetSpeed: phase.vessel_control.target_speed || 5,
            targetHeading: phase.vessel_control.target_heading || 0,
            rudderAngle: phase.vessel_control.rudder_angle || 0,
            throttlePosition: phase.vessel_control.throttle || 0
        };
    }

    /**
     * Apply phase-specific physics configuration
     */
    applyPhysicsConfiguration(physicsConfig) {
        if (!this.physicsEnabled) return;
        
        // Update NMEA timing if specified
        if (physicsConfig.nmea_timing) {
            this.synchronizedNMEAGenerator.updateSentenceTimings(physicsConfig.nmea_timing);
        }
        
        // Apply state controller configurations
        if (physicsConfig.state_controllers) {
            const controllers = this.coordinatedVesselState.stateControllers;
            
            if (physicsConfig.state_controllers.motion) {
                Object.assign(controllers.motion, physicsConfig.state_controllers.motion);
            }
            
            if (physicsConfig.state_controllers.wind) {
                Object.assign(controllers.wind, physicsConfig.state_controllers.wind);
            }
        }
    }

    /**
     * Wait for phase duration with status updates
     */
    async waitForPhaseDuration(durationSeconds) {
        const startTime = Date.now();
        const duration = durationSeconds * 1000;
        
        while (this.isRunning && (Date.now() - startTime) < duration) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Emit progress update every 10 seconds
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed % 10 === 0) {
                this.emit('phaseProgress', {
                    phase: this.currentPhase.phase || 'Current Phase',
                    elapsed: elapsed,
                    remaining: durationSeconds - elapsed,
                    messagesGenerated: this.physicsStats.nmeaGenerated,
                    updateRate: this.physicsStats.averageUpdateRate
                });
            }
        }
    }

    /**
     * Stop physics-enhanced scenario execution
     * @override
     */
    stop() {
        super.stop();
        
        if (this.physicsEnabled) {
            this.emit('status', 'Stopping physics-enhanced scenario execution');
            this.emit('physicsStats', {
                stateUpdates: this.physicsStats.stateUpdates,
                nmeaGenerated: this.physicsStats.nmeaGenerated,
                averageUpdateRate: this.physicsStats.averageUpdateRate,
                finalVesselState: this.coordinatedVesselState?.getState()
            });
        }
    }

    /**
     * Get comprehensive status including physics metrics
     * @override
     */
    getStatus() {
        const baseStatus = super.getStatus();
        
        if (this.physicsEnabled) {
            return {
                ...baseStatus,
                physicsEnabled: true,
                physicsStats: { ...this.physicsStats },
                vesselState: this.coordinatedVesselState?.getState(),
                nmeaTiming: this.synchronizedNMEAGenerator?.getSentenceTimings()
            };
        }
        
        return {
            ...baseStatus,
            physicsEnabled: false
        };
    }

    /**
     * Check if scenario supports physics enhancement
     */
    static supportsPhysics(scenarioConfig) {
        return scenarioConfig.physics && scenarioConfig.physics.enabled === true;
    }

    /**
     * Create appropriate data source based on scenario configuration
     */
    static async createDataSource(config, scenarioConfig) {
        if (PhysicsEnhancedScenarioDataSource.supportsPhysics(scenarioConfig)) {
            return new PhysicsEnhancedScenarioDataSource(config);
        } else {
            return new ScenarioDataSource(config);
        }
    }
}

module.exports = PhysicsEnhancedScenarioDataSource;
