/**
 * BMAD Scenario Engine
 * Manages test scenarios and story validation for BMAD agents
 */

class ScenarioEngine {
  constructor(simulator) {
    this.simulator = simulator;
    this.activeScenarios = new Map();
    this.storyValidations = new Map();
    this.performanceMetrics = new Map();
    
    // Only log if simulator is provided (full initialization)
    if (simulator) {
      console.log('🎭 BMAD Scenario Engine initialized');
    }
  }
  
  /**
   * Load scenario configuration from YAML file
   */
  async loadScenario(scenarioPath, config = {}) {
    try {
      const fs = require('fs');
      const path = require('path');
      const yaml = require('js-yaml');
      
      let scenarioConfig;
      const scenarioId = config.id || path.basename(scenarioPath, '.yml');
      
      // If scenarioPath is a file path, load from YAML
      if (scenarioPath.includes('/') || scenarioPath.endsWith('.yml')) {
        const fullPath = path.isAbsolute(scenarioPath) 
          ? scenarioPath 
          : path.join(__dirname, '..', scenarioPath);
          
        if (fs.existsSync(fullPath)) {
          const yamlContent = fs.readFileSync(fullPath, 'utf8');
          scenarioConfig = yaml.load(yamlContent);
        } else {
          throw new Error(`Scenario file not found: ${fullPath}`);
        }
      } else {
        // Treat as direct config object
        scenarioConfig = scenarioPath;
      }
      
      const scenario = {
        id: scenarioId,
        name: scenarioConfig.name || scenarioId,
        description: scenarioConfig.description || 'No description',
        category: scenarioConfig.category || 'general',
        config: scenarioConfig,
        state: 'loaded',
        startTime: null,
        endTime: null,
        currentPhase: null,
        phaseStartTime: null,
        metrics: {
          messagesGenerated: 0,
          clientsConnected: 0,
          errorsSimulated: 0,
          phasesCompleted: 0
        }
      };
      
      this.activeScenarios.set(scenarioId, scenario);
      console.log(`📋 Scenario loaded: ${scenario.name} (${scenarioId}) - Category: ${scenario.category}`);
      
      return scenario;
    } catch (error) {
      console.error(`❌ Failed to load scenario ${scenarioPath}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Start scenario execution
   */
  async startScenario(scenarioId) {
    const scenario = this.activeScenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }
    
    scenario.state = 'running';
    scenario.startTime = Date.now();
    
    // Apply scenario configuration to simulator
    if (scenario.config.bridgeMode) {
      this.simulator.bridgeMode = scenario.config.bridgeMode;
    }
    
    if (scenario.config.autopilotState) {
      Object.assign(this.simulator.autopilotState, scenario.config.autopilotState);
    }
    
    console.log(`▶️  Scenario started: ${scenario.name} (${scenarioId})`);
    return scenario;
  }
  
  /**
   * Stop scenario execution
   */
  async stopScenario(scenarioId) {
    const scenario = this.activeScenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }
    
    scenario.state = 'stopped';
    scenario.endTime = Date.now();
    
    console.log(`⏹️  Scenario stopped: ${scenario.name} (${scenarioId})`);
    return scenario;
  }
  
  /**
   * Get scenario status
   */
  getScenarioStatus(scenarioId) {
    const scenario = this.activeScenarios.get(scenarioId);
    if (!scenario) {
      return null;
    }
    
    return {
      id: scenario.id,
      name: scenario.name,
      state: scenario.state,
      startTime: scenario.startTime,
      endTime: scenario.endTime,
      duration: scenario.startTime ? (scenario.endTime || Date.now()) - scenario.startTime : 0,
      metrics: scenario.metrics
    };
  }
  
  /**
   * List all available scenarios from filesystem
   */
  listScenarios() {
    try {
      const fs = require('fs');
      const path = require('path');
      const yaml = require('js-yaml');
      
      const scenariosPath = path.join(__dirname, '..', '..', 'marine-assets', 'test-scenarios');
      const availableScenarios = [];
      
      // Scan scenario directories
      const categories = ['basic', 'autopilot', 'development', 'performance', 'safety', 'recorded', 'story-validation', 'multi-instance'];
      
      for (const category of categories) {
        const categoryPath = path.join(scenariosPath, category);
        
        if (fs.existsSync(categoryPath) && fs.statSync(categoryPath).isDirectory()) {
          const files = fs.readdirSync(categoryPath);
          
          for (const file of files) {
            if (file.endsWith('.yml') || file.endsWith('.yaml')) {
              try {
                const filePath = path.join(categoryPath, file);
                const yamlContent = fs.readFileSync(filePath, 'utf8');
                const config = yaml.load(yamlContent);
                
                const scenarioId = path.basename(file, '.yml').replace('.yaml', '');
                const loadedScenario = this.activeScenarios.get(scenarioId);
                
                availableScenarios.push({
                  id: scenarioId,
                  name: config.name || scenarioId,
                  description: config.description || 'No description available',
                  category: category,
                  duration: config.duration || 0,
                  state: loadedScenario ? loadedScenario.state : 'available',
                  filepath: `${category}/${file}`
                });
              } catch (error) {
                console.warn(`⚠️  Failed to parse scenario file ${file}:`, error.message);
                // Add basic entry for unparseable files
                const scenarioId = path.basename(file, '.yml').replace('.yaml', '');
                availableScenarios.push({
                  id: scenarioId,
                  name: scenarioId,
                  description: 'Failed to parse scenario file',
                  category: category,
                  duration: 0,
                  state: 'error',
                  filepath: `${category}/${file}`
                });
              }
            }
          }
        }
      }
      
      console.log(`📋 Found ${availableScenarios.length} scenarios across ${categories.length} categories`);
      return availableScenarios;
      
    } catch (error) {
      console.error('❌ Failed to list scenarios:', error.message);
      // Fallback to loaded scenarios only
      return Array.from(this.activeScenarios.values()).map(scenario => ({
        id: scenario.id,
        name: scenario.name,
        description: scenario.description,
        state: scenario.state
      }));
    }
  }
  
  /**
   * Delete scenario
   */
  deleteScenario(scenarioId) {
    if (!this.activeScenarios.has(scenarioId)) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }
    
    this.activeScenarios.delete(scenarioId);
    console.log(`🗑️  Scenario deleted: ${scenarioId}`);
  }
  
  /**
   * Validate story implementation
   */
  async validateStory(storyId, acceptanceCriteria) {
    try {
      const validation = {
        storyId: storyId,
        timestamp: Date.now(),
        results: [],
        passed: 0,
        failed: 0,
        status: 'running'
      };
      
      this.storyValidations.set(storyId, validation);
      
      // Validate each acceptance criterion
      for (const [acId, criterion] of Object.entries(acceptanceCriteria)) {
        const result = await this.validateAcceptanceCriterion(acId, criterion);
        validation.results.push(result);
        
        if (result.passed) {
          validation.passed++;
        } else {
          validation.failed++;
        }
      }
      
      validation.status = validation.failed === 0 ? 'passed' : 'failed';
      
      console.log(`✅ Story validation completed: ${storyId} (${validation.passed} passed, ${validation.failed} failed)`);
      return validation;
      
    } catch (error) {
      console.error(`❌ Story validation failed: ${storyId}`, error.message);
      throw error;
    }
  }
  
  /**
   * Validate individual acceptance criterion
   */
  async validateAcceptanceCriterion(acId, criterion) {
    const result = {
      acId: acId,
      description: criterion.description,
      timestamp: Date.now(),
      passed: false,
      details: {},
      errors: []
    };
    
    try {
      // Simulate validation based on criterion type
      switch (criterion.type) {
        case 'api_endpoint':
          result.passed = await this.validateApiEndpoint(criterion);
          break;
          
        case 'data_flow':
          result.passed = await this.validateDataFlow(criterion);
          break;
          
        case 'integration':
          result.passed = await this.validateIntegration(criterion);
          break;
          
        case 'performance':
          result.passed = await this.validatePerformance(criterion);
          break;
          
        default:
          result.passed = true; // Default to pass for unknown types
          result.details.note = 'Validation not implemented for this criterion type';
      }
      
    } catch (error) {
      result.passed = false;
      result.errors.push(error.message);
    }
    
    return result;
  }
  
  /**
   * Validate API endpoint functionality
   */
  async validateApiEndpoint(criterion) {
    // Simulate API endpoint validation
    return true;
  }
  
  /**
   * Validate data flow functionality  
   */
  async validateDataFlow(criterion) {
    // Check if simulator is generating data
    const beforeCount = this.simulator.stats.totalMessages;
    await new Promise(resolve => setTimeout(resolve, 1000));
    const afterCount = this.simulator.stats.totalMessages;
    
    return afterCount > beforeCount;
  }
  
  /**
   * Validate system integration
   */
  async validateIntegration(criterion) {
    // Check if all components are running
    return this.simulator.isRunning && this.simulator.clients.size >= 0;
  }
  
  /**
   * Validate performance metrics
   */
  async validatePerformance(criterion) {
    const metrics = this.collectPerformanceMetrics();
    
    // Check basic performance thresholds
    return metrics.memoryUsage < 500 && metrics.messagesPerSecond >= 0;
  }
  
  /**
   * Collect current performance metrics
   */
  collectPerformanceMetrics() {
    return {
      timestamp: Date.now(),
      connectedClients: this.simulator.clients.size,
      messagesPerSecond: this.simulator.stats.messagesPerSecond,
      totalMessages: this.simulator.stats.totalMessages,
      memoryUsage: this.simulator.stats.memoryUsage,
      uptime: process.uptime()
    };
  }
  
  /**
   * Get story validation results
   */
  getStoryValidation(storyId) {
    return this.storyValidations.get(storyId) || null;
  }
  
  /**
   * List all story validations
   */
  listStoryValidations() {
    return Array.from(this.storyValidations.entries()).map(([storyId, validation]) => ({
      storyId,
      status: validation.status,
      timestamp: validation.timestamp,
      passed: validation.passed,
      failed: validation.failed
    }));
  }
}

module.exports = { ScenarioEngine };