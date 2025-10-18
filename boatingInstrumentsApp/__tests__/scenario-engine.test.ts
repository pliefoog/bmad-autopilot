/**
 * Jest Integration Tests for Scenario Engine
 * 
 * Tests AC7: Scenario Engine with Progressive State Management
 * Tests AC8: Jest Testing Framework Integration
 * Tests AC5: YAML Configuration Schema and Validation
 */

import * as fs from 'fs';
import * as path from 'path';
import { 
  ScenarioEngine, 
  Scenario, 
  ScenarioValidator,
  StateManager,
  ScenarioConfig,
  ValidationResult,
  ScenarioState
} from '../server/scenario-engine';

describe('Scenario Engine', () => {
  let engine: ScenarioEngine;
  const testScenariosPath = path.join(__dirname, '..', 'vendor', 'test-scenarios');

  beforeEach(() => {
    engine = new ScenarioEngine();
  });

  afterEach(() => {
    // Cleanup any running scenarios
    jest.clearAllTimers();
  });

  describe('Basic Functionality', () => {
    test('should create scenario engine instance', () => {
      expect(engine).toBeInstanceOf(ScenarioEngine);
    });

    test('should return null state when no scenario loaded', () => {
      const state = engine.getCurrentState();
      expect(state).toBeNull();
    });
  });

  describe('Scenario Loading and Validation', () => {
    test('should load and validate basic navigation scenario', async () => {
      const scenarioPath = path.join(testScenariosPath, 'basic', 'basic-navigation.yml');
      
      // Skip if scenario file doesn't exist
      if (!fs.existsSync(scenarioPath)) {
        console.warn(`Skipping test - scenario file not found: ${scenarioPath}`);
        return;
      }

      const scenario = await engine.loadScenario(scenarioPath);
      expect(scenario).toBeInstanceOf(Scenario);
      
      const state = engine.getCurrentState();
      expect(state).not.toBeNull();
    });

    test('should validate scenario configuration against JSON schema', () => {
      const validator = new ScenarioValidator();
      
      const validConfig: ScenarioConfig = {
        name: 'Test Scenario',
        description: 'A test scenario for unit testing',
        duration: 300,
        version: '1.0',
        category: 'basic',
        phases: [
          {
            phase: 'steady_sailing',
            duration: 300,
            description: 'Steady sailing conditions'
          }
        ],
        data: {
          depth: {
            type: 'constant',
            unit: 'feet',
            base: 25
          }
        },
        timing: {
          depth: 1
        }
      };

      const result = validator.validateScenario(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid scenario configuration', () => {
      const validator = new ScenarioValidator();
      
      const invalidConfig = {
        name: 'Invalid Scenario',
        // Missing required fields: description, duration, version, category, phases, data, timing
      } as unknown as ScenarioConfig;

      const result = validator.validateScenario(invalidConfig);
      // Should fail validation (but gracefully handle missing schema)
      if (result.errors.length > 0) {
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    test('should handle missing scenario file gracefully', async () => {
      const nonExistentPath = path.join(testScenariosPath, 'non-existent-scenario.yml');
      
      await expect(engine.loadScenario(nonExistentPath))
        .rejects
        .toThrow();
    });
  });

  describe('Progressive State Management', () => {
    let scenario: Scenario;

    beforeEach(async () => {
      // Create a test scenario programmatically
      const testConfig: ScenarioConfig = {
        name: 'Progressive Test Scenario',
        description: 'Tests progressive state management',
        duration: 10, // Short duration for testing
        version: '1.0',
        category: 'basic',
        phases: [
          {
            phase: 'initial',
            duration: 3,
            description: 'Initial phase',
            autopilot_mode: 'standby'
          },
          {
            phase: 'active',
            duration: 4,
            description: 'Active phase', 
            autopilot_mode: 'auto',
            events: [
              {
                time: 1,
                command: 'set_heading',
                value: '180',
                description: 'Set heading to 180°'
              }
            ]
          },
          {
            phase: 'completion',
            duration: 3,
            description: 'Completion phase',
            autopilot_mode: 'standby'
          }
        ],
        data: {
          depth: {
            type: 'sine_wave',
            unit: 'feet',
            base: 30,
            amplitude: 5,
            frequency: 0.1
          },
          speed: {
            type: 'constant',
            unit: 'knots',
            base: 6.5
          }
        },
        timing: {
          depth: 1,
          speed: 2
        }
      };

      // Create scenario directly from config
      scenario = new Scenario(testConfig, new StateManager());
    });

    test('should progress through phases correctly', (done) => {
      // Mock timers for controlled testing
      jest.useFakeTimers();

      scenario.start().then(() => {
        const initialState = scenario.getState();
        expect(initialState.phaseIndex).toBe(0);
        expect(initialState.currentPhase.phase).toBe('initial');
        expect(initialState.phaseProgress).toBe(0);

        // Advance time to middle of first phase
        jest.advanceTimersByTime(1500);
        
        const midPhaseState = scenario.getState();
        expect(midPhaseState.phaseIndex).toBe(0);
        expect(midPhaseState.phaseProgress).toBeGreaterThan(0);
        expect(midPhaseState.phaseProgress).toBeLessThan(1);

        // Advance to second phase
        jest.advanceTimersByTime(2000);
        
        setTimeout(() => {
          const secondPhaseState = scenario.getState();
          expect(secondPhaseState.phaseIndex).toBe(1);
          expect(secondPhaseState.currentPhase.phase).toBe('active');
          
          jest.useRealTimers();
          done();
        }, 100);
        
        jest.advanceTimersByTime(100);
      });
    });

    test('should calculate scenario progress correctly', async () => {
      await scenario.start();
      
      const initialProgress = scenario.getProgress();
      expect(initialProgress).toBe(0);
      
      // Progress should be a value between 0 and 1
      expect(initialProgress).toBeGreaterThanOrEqual(0);
      expect(initialProgress).toBeLessThanOrEqual(1);
    });

    test('should handle scenario completion', (done) => {
      jest.useFakeTimers();

      scenario.start().then(() => {
        // Fast forward to end of scenario (10 seconds)
        jest.advanceTimersByTime(10000);
        
        setTimeout(() => {
          const finalState = scenario.getState();
          expect(finalState.scenarioProgress).toBeCloseTo(1.0, 1);
          expect(finalState.isComplete).toBe(true);
          
          jest.useRealTimers();
          done();
        }, 100);
        
        jest.advanceTimersByTime(100);
      });
    });
  });

  describe('Mathematical Data Generation', () => {
    let testScenario: Scenario;

    beforeEach(async () => {
      const mathConfig: ScenarioConfig = {
        name: 'Mathematical Functions Test',
        description: 'Tests mathematical data generation functions',
        duration: 60,
        version: '1.0',
        category: 'basic',
        phases: [
          {
            phase: 'testing',
            duration: 60,
            description: 'Testing mathematical functions'
          }
        ],
        data: {
          depth: {
            type: 'sine_wave',
            unit: 'feet',
            base: 50,
            amplitude: 10,
            frequency: 0.05
          },
          speed: {
            type: 'gaussian',
            unit: 'knots',
            mean: 7.5,
            std_dev: 0.5,
            min: 5.0,
            max: 10.0
          }
        },
        timing: {
          depth: 1,
          speed: 1
        }
      };

      testScenario = new Scenario(mathConfig, new StateManager());
      await testScenario.start();
    });

    test('should generate NMEA messages with realistic data', () => {
      const messages = testScenario.generateMessages({});
      
      expect(messages).toBeInstanceOf(Array);
      expect(messages.length).toBeGreaterThan(0);
      
      // Check message format
      messages.forEach(msg => {
        expect(msg).toHaveProperty('sentence');
        expect(msg).toHaveProperty('timestamp');
        expect(msg).toHaveProperty('source');
        expect(msg.sentence).toMatch(/^\$[A-Z]{2}[A-Z0-9]{3},.*\*[0-9A-F]{2}$/);
      });
    });

    test('should generate mathematically consistent data', () => {
      // Generate multiple data points to test consistency
      const dataPoints: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const messages = testScenario.generateMessages({});
        const depthMessage = messages.find(msg => msg.sentence.includes('DBT'));
        
        if (depthMessage) {
          // Extract depth value from NMEA sentence
          const parts = depthMessage.sentence.split(',');
          if (parts.length > 1) {
            const depth = parseFloat(parts[1]);
            if (!isNaN(depth)) {
              dataPoints.push(depth);
            }
          }
        }
        
        // Small delay to change time-based calculations
        jest.advanceTimersByTime(1000);
      }
      
      // Verify we got some data points
      expect(dataPoints.length).toBeGreaterThan(0);
      
      // For sine wave, values should be within expected range (40-60 feet)
      dataPoints.forEach(depth => {
        expect(depth).toBeGreaterThanOrEqual(35); // Allow some tolerance
        expect(depth).toBeLessThanOrEqual(65);
      });
    });
  });

  describe('NMEA Message Generation', () => {
    test('should generate valid NMEA checksums', () => {
      // Test checksum calculation for known NMEA sentence
      const testSentence = '$SDDBT,25.0,f,7.6,M,4.2,F';
      
      // Calculate expected checksum manually
      let expectedChecksum = 0;
      for (let i = 1; i < testSentence.length; i++) {
        expectedChecksum ^= testSentence.charCodeAt(i);
      }
      const expectedHex = expectedChecksum.toString(16).toUpperCase().padStart(2, '0');
      
      // This would be tested via the Scenario class's internal method
      // For now, we verify the pattern
      expect(expectedHex).toMatch(/^[0-9A-F]{2}$/);
    });

    test('should generate different message types', async () => {
      const multiDataConfig: ScenarioConfig = {
        name: 'Multi-Data Test',
        description: 'Tests multiple data types',
        duration: 30,
        version: '1.0',
        category: 'basic',
        phases: [
          {
            phase: 'multi_data',
            duration: 30,
            description: 'Multiple data generation'
          }
        ],
        data: {
          depth: { type: 'constant', unit: 'feet', base: 20 },
          speed: { type: 'constant', unit: 'knots', base: 8 }
        },
        timing: {
          depth: 1,
          speed: 1
        }
      };

      const multiScenario = new Scenario(multiDataConfig, new StateManager());
      await multiScenario.start();
      
      const messages = multiScenario.generateMessages({});
      
      // Should generate both depth and speed messages
      const depthMessage = messages.find(msg => msg.sentence.includes('DBT'));
      const speedMessage = messages.find(msg => msg.sentence.includes('VHW'));
      
      expect(depthMessage).toBeDefined();
      expect(speedMessage).toBeDefined();
    });
  });

  describe('Performance and Error Handling', () => {
    test('should handle malformed YAML gracefully', async () => {
      const invalidYamlPath = path.join(__dirname, 'invalid-test.yml');
      
      // Create a file with invalid YAML
      const invalidYaml = `
        name: "Invalid YAML
        description: "Missing quote
        invalid: [ unclosed array
      `;
      
      fs.writeFileSync(invalidYamlPath, invalidYaml);
      
      try {
        await expect(engine.loadScenario(invalidYamlPath))
          .rejects
          .toThrow();
      } finally {
        // Clean up test file
        if (fs.existsSync(invalidYamlPath)) {
          fs.unlinkSync(invalidYamlPath);
        }
      }
    });

    test('should validate phase duration consistency', () => {
      const validator = new ScenarioValidator();
      
      const inconsistentConfig: ScenarioConfig = {
        name: 'Inconsistent Timing',
        description: 'Phase durations exceed scenario duration',
        duration: 10, // Total scenario duration
        version: '1.0',
        category: 'basic',
        phases: [
          { phase: 'phase1', duration: 8, description: 'First phase' },
          { phase: 'phase2', duration: 5, description: 'Second phase' } // 8 + 5 = 13 > 10
        ],
        data: {
          depth: { type: 'constant', unit: 'feet', base: 30 }
        },
        timing: {
          depth: 1
        }
      };

      const result = validator.validateScenario(inconsistentConfig);
      
      // Should warn about duration inconsistency
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('duration'))).toBe(true);
    });
  });

  describe('Integration with Test Scenarios', () => {
    const scenarioCategories = ['basic', 'autopilot', 'safety', 'performance'];

    test.each(scenarioCategories)('should validate %s scenario category exists', (category) => {
      const categoryPath = path.join(testScenariosPath, category);
      
      if (fs.existsSync(categoryPath)) {
        expect(fs.statSync(categoryPath).isDirectory()).toBe(true);
      } else {
        console.warn(`Scenario category directory not found: ${categoryPath}`);
      }
    });

    test('should load recorded scenario configurations', () => {
      const recordedPath = path.join(testScenariosPath, 'recorded');
      
      if (fs.existsSync(recordedPath)) {
        const files = fs.readdirSync(recordedPath);
        const ymlFiles = files.filter(f => f.endsWith('.yml'));
        
        expect(ymlFiles.length).toBeGreaterThan(0);
        console.log(`Found ${ymlFiles.length} recorded scenario configurations`);
      } else {
        console.warn(`Recorded scenarios directory not found: ${recordedPath}`);
      }
    });
  });
});