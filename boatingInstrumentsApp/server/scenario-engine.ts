/**
 * NMEA Bridge Simulator Scenario Engine
 * 
 * Implements progressive state management, YAML configuration parsing,
 * and mathematical data generation functions for test scenarios.
 * 
 * Supports AC5, AC7: YAML Configuration Schema and Validation,
 * Scenario Engine with Progressive State Management
 */

import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';

// Core scenario interfaces
export interface ScenarioConfig {
  name: string;
  description: string;
  duration: number;
  version: string;
  category: 'basic' | 'autopilot' | 'safety' | 'performance' | 'recorded';
  parameters?: any;
  phases: Phase[];
  data: DataConfig;
  timing: TimingConfig;
  functions?: { [key: string]: string };
  use_cases?: string[];
  acceptance_criteria?: string[];
}

export interface Phase {
  phase: string;
  duration: number;
  description: string;
  autopilot_mode?: 'standby' | 'auto' | 'manual' | 'emergency_standby' | 'reset';
  alarm_status?: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EMERGENCY' | 'RECOVERING';
  events?: Event[];
  [key: string]: any; // Allow additional phase-specific properties
}

export interface Event {
  time: number; // Seconds into phase
  command: string;
  value?: string;
  description: string;
}

export interface DataConfig {
  depth?: DataSource;
  speed?: DataSource;
  wind?: {
    angle?: DataSource;
    speed?: DataSource;
  };
  gps?: DataSource;
  [key: string]: any; // Allow additional data sources
}

export interface DataSource {
  type: string;
  unit: string;
  base?: number;
  amplitude?: number;
  frequency?: number;
  mean?: number;
  std_dev?: number;
  min?: number;
  max?: number;
  start?: number;
  step_size?: number;
  bounds?: [number, number];
  [key: string]: any; // Allow additional properties
}

export interface TimingConfig {
  depth?: number;
  speed?: number;
  wind?: number;
  gps?: number;
  compass?: number;
  autopilot?: number;
  [key: string]: number | undefined;
}

export interface NMEAMessage {
  sentence: string;
  timestamp: number;
  source: string;
  checksum?: string;
}

export interface ScenarioState {
  currentPhase: Phase;
  phaseIndex: number;
  phaseStartTime: number;
  scenarioStartTime: number;
  elapsedTime: number;
  phaseProgress: number; // 0-1
  scenarioProgress: number; // 0-1
  isComplete: boolean;
  parameters: any;
}

// Validation result interface
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Core Scenario Engine Class
 */
export class ScenarioEngine {
  private currentScenario?: Scenario;
  private stateManager: StateManager;
  private messageScheduler: MessageScheduler;
  private validator: ScenarioValidator;

  constructor() {
    this.stateManager = new StateManager();
    this.messageScheduler = new MessageScheduler();
    this.validator = new ScenarioValidator();
  }

  /**
   * Load and validate scenario from YAML file
   */
  async loadScenario(scenarioPath: string): Promise<Scenario> {
    try {
      console.log(`📋 Loading scenario: ${scenarioPath}`);
      
      // Read YAML file
      const yamlContent = fs.readFileSync(scenarioPath, 'utf8');
      const config = yaml.load(yamlContent) as ScenarioConfig;
      
      // Validate against JSON schema
      const validation = this.validator.validateScenario(config);
      if (!validation.valid) {
        throw new Error(`Scenario validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Create scenario instance
      const scenario = new Scenario(config, this.stateManager);
      
      console.log(`✅ Scenario loaded: ${config.name} (${config.duration}s)`);
      this.currentScenario = scenario;
      
      return scenario;
      
    } catch (error) {
      console.error(`❌ Failed to load scenario ${scenarioPath}:`, error);
      throw error;
    }
  }

  /**
   * Validate scenario configuration
   */
  validateScenario(config: ScenarioConfig): ValidationResult {
    return this.validator.validateScenario(config);
  }

  /**
   * Execute current scenario
   */
  async executeScenario(): Promise<void> {
    if (!this.currentScenario) {
      throw new Error('No scenario loaded');
    }

    await this.currentScenario.start();
  }

  /**
   * Get current scenario state
   */
  getCurrentState(): ScenarioState | null {
    return this.currentScenario?.getState() || null;
  }

  /**
   * Generate NMEA data for current time
   */
  generateNMEAData(parameters: any): NMEAMessage[] {
    if (!this.currentScenario) {
      return [];
    }

    return this.currentScenario.generateMessages(parameters);
  }
}

/**
 * Individual Scenario Instance
 */
export class Scenario {
  private config: ScenarioConfig;
  private stateManager: StateManager;
  private startTime?: number;
  private currentPhaseIndex = 0;
  private phaseStartTime = 0;

  constructor(config: ScenarioConfig, stateManager: StateManager) {
    this.config = config;
    this.stateManager = stateManager;
  }

  /**
   * Start scenario execution
   */
  async start(): Promise<void> {
    this.startTime = Date.now();
    this.currentPhaseIndex = 0;
    this.phaseStartTime = 0;
    
    console.log(`🚀 Starting scenario: ${this.config.name}`);
    
    // Initialize first phase
    await this.transitionToPhase(0);
  }

  /**
   * Get current phase
   */
  getCurrentPhase(): Phase {
    return this.config.phases[this.currentPhaseIndex];
  }

  /**
   * Get scenario progress (0-1)
   */
  getProgress(): number {
    if (!this.startTime) return 0;
    
    const elapsed = (Date.now() - this.startTime) / 1000;
    return Math.min(elapsed / this.config.duration, 1.0);
  }

  /**
   * Get current scenario state
   */
  getState(): ScenarioState {
    const currentPhase = this.getCurrentPhase();
    const elapsed = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
    const phaseElapsed = elapsed - this.phaseStartTime;
    
    return {
      currentPhase,
      phaseIndex: this.currentPhaseIndex,
      phaseStartTime: this.phaseStartTime,
      scenarioStartTime: this.startTime || 0,
      elapsedTime: elapsed,
      phaseProgress: Math.min(phaseElapsed / currentPhase.duration, 1.0),
      scenarioProgress: this.getProgress(),
      isComplete: this.getProgress() >= 1.0,
      parameters: this.config.parameters || {}
    };
  }

  /**
   * Transition to specific phase
   */
  async transitionToPhase(phaseIndex: number): Promise<void> {
    if (phaseIndex >= this.config.phases.length) {
      console.log('📋 Scenario complete');
      return;
    }

    this.currentPhaseIndex = phaseIndex;
    const phase = this.config.phases[phaseIndex];
    
    const elapsed = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
    this.phaseStartTime = elapsed;
    
    console.log(`🔄 Phase transition: ${phase.phase} (${phase.duration}s)`);
    
    // Update state manager
    this.stateManager.setCurrentPhase(phase);
    
    // Schedule phase events
    if (phase.events) {
      for (const event of phase.events) {
        setTimeout(() => {
          this.handleEvent(event);
        }, event.time * 1000);
      }
    }
    
    // Schedule next phase transition
    setTimeout(() => {
      this.transitionToPhase(phaseIndex + 1);
    }, phase.duration * 1000);
  }

  /**
   * Handle phase events
   */
  private handleEvent(event: Event): void {
    console.log(`⚡ Event: ${event.command} - ${event.description}`);
    // Implement event handling logic
  }

  /**
   * Generate NMEA messages for current state
   */
  generateMessages(parameters: any): NMEAMessage[] {
    const state = this.getState();
    const messages: NMEAMessage[] = [];
    
    // Generate messages based on current phase and data configuration
    if (this.config.data.depth) {
      const depthValue = this.generateDataValue('depth', this.config.data.depth, state);
      messages.push(this.createDepthMessage(depthValue));
    }
    
    if (this.config.data.speed) {
      const speedValue = this.generateDataValue('speed', this.config.data.speed, state);
      messages.push(this.createSpeedMessage(speedValue));
    }
    
    return messages;
  }

  /**
   * Generate data value using mathematical functions
   */
  private generateDataValue(dataType: string, config: DataSource, state: ScenarioState): number {
    const currentTime = state.elapsedTime;
    
    switch (config.type) {
      case 'sine_wave':
        return (config.base || 0) + 
               (config.amplitude || 1) * 
               Math.sin(2 * Math.PI * (config.frequency || 0.1) * currentTime);
        
      case 'gaussian':
        return this.generateGaussian(config.mean || 0, config.std_dev || 1, config.min, config.max);
        
      case 'random_walk':
        // Implement random walk
        return (config.start || 0) + (Math.random() - 0.5) * 2 * (config.step_size || 1);
        
      case 'constant':
        return config.base || 0;
        
      default:
        console.warn(`Unknown data type: ${config.type}`);
        return 0;
    }
  }

  /**
   * Generate Gaussian random number
   */
  private generateGaussian(mean: number, stdDev: number, min?: number, max?: number): number {
    // Box-Muller transform
    const u = 0.5 - Math.random();
    const v = 0.5 - Math.random();
    const normal = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    
    let value = mean + stdDev * normal;
    
    if (min !== undefined) value = Math.max(min, value);
    if (max !== undefined) value = Math.min(max, value);
    
    return value;
  }

  /**
   * Create NMEA depth message
   */
  private createDepthMessage(depth: number): NMEAMessage {
    const depthMeters = depth * 0.3048; // Convert feet to meters
    const sentence = `$SDDBT,${depth.toFixed(1)},f,${depthMeters.toFixed(1)},M,${(depth/6).toFixed(1)},F`;
    
    return {
      sentence: sentence + '*' + this.calculateChecksum(sentence),
      timestamp: Date.now(),
      source: 'scenario-engine'
    };
  }

  /**
   * Create NMEA speed message
   */
  private createSpeedMessage(speed: number): NMEAMessage {
    const sentence = `$SDVHW,,,,,${speed.toFixed(1)},N,${(speed * 1.852).toFixed(1)},K`;
    
    return {
      sentence: sentence + '*' + this.calculateChecksum(sentence),
      timestamp: Date.now(),
      source: 'scenario-engine'
    };
  }

  /**
   * Calculate NMEA checksum
   */
  private calculateChecksum(sentence: string): string {
    let checksum = 0;
    
    // Start after $ and end before *
    const start = sentence.indexOf('$') + 1;
    const end = sentence.indexOf('*') > -1 ? sentence.indexOf('*') : sentence.length;
    
    for (let i = start; i < end; i++) {
      checksum ^= sentence.charCodeAt(i);
    }
    
    return checksum.toString(16).toUpperCase().padStart(2, '0');
  }
}

/**
 * State Manager - handles scenario state persistence and transitions
 */
export class StateManager {
  private currentPhase?: Phase;
  private stateHistory: Phase[] = [];

  setCurrentPhase(phase: Phase): void {
    this.currentPhase = phase;
    this.stateHistory.push(phase);
  }

  getCurrentPhase(): Phase | undefined {
    return this.currentPhase;
  }

  getStateHistory(): Phase[] {
    return [...this.stateHistory];
  }
}

/**
 * Message Scheduler - handles precise timing control for NMEA messages
 */
export class MessageScheduler {
  private timers: NodeJS.Timeout[] = [];

  scheduleMessage(delay: number, callback: () => void): void {
    const timer = setTimeout(callback, delay);
    this.timers.push(timer);
  }

  clearAll(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers = [];
  }
}

/**
 * Scenario Validator - JSON Schema validation for YAML configurations
 */
export class ScenarioValidator {
  private ajv: Ajv;
  private schema: any;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    
    // Load JSON schema
    try {
      const schemaPath = path.join(__dirname, '..', 'vendor', 'test-scenarios', 'scenario.schema.json');
      this.schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    } catch (error) {
      console.warn('⚠️  Could not load scenario schema, validation disabled');
    }
  }

  validateScenario(config: ScenarioConfig): ValidationResult {
    if (!this.schema) {
      return {
        valid: true,
        errors: [],
        warnings: ['Schema validation disabled - schema not found']
      };
    }

    const validate = this.ajv.compile(this.schema);
    const valid = validate(config);
    
    const errors = validate.errors ? 
      validate.errors.map(err => `${err.instancePath}: ${err.message}`) : 
      [];
    
    const warnings: string[] = [];
    
    // Additional validation logic
    if (config.phases) {
      const totalPhaseDuration = config.phases.reduce((sum, phase) => sum + phase.duration, 0);
      if (totalPhaseDuration > config.duration) {
        warnings.push('Total phase duration exceeds scenario duration');
      }
    }

    return {
      valid: valid && errors.length === 0,
      errors,
      warnings
    };
  }
}

export default ScenarioEngine;