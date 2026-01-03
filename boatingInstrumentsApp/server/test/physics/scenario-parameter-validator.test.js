/**
 * Unit Tests for Advanced Scenario Parameter Validation
 * Tests multi-parameter physics scenarios with cross-parameter relationships
 */

const ScenarioParameterValidator = require('../../lib/physics/scenario-parameter-validator');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

describe('ScenarioParameterValidator', () => {
  let validator;
  let tempDir;

  beforeEach(() => {
    validator = new ScenarioParameterValidator();
    tempDir = path.join(__dirname, 'temp-scenarios');

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors in tests
        console.warn(`Warning: Could not clean up temp directory: ${error.message}`);
      }
    }
  });

  describe('Comprehensive Physics Scenario Validation', () => {
    test('should validate complete J/35 physics scenario', async () => {
      const scenario = {
        name: 'J/35 Complete Physics Test',
        description: 'Full physics validation test',
        duration: 600,
        version: '1.0',
        category: 'physics',
        parameters: {
          physics: {
            enabled: true,
            vessel_profile: 'j35',
            overrides: {
              physics: {
                heel_sensitivity: 1.8,
                vmg_efficiency: 0.85,
                max_heel: 25,
              },
              defaults: {
                crew_weight: 600,
                fuel_level: 0.75,
              },
              environmental: {
                water_temperature: 18,
                sea_state: 3,
                barometric_pressure: 1015,
              },
              behavioral: {
                crew_skill_level: 'advanced',
                sailing_mode: 'racing',
                risk_tolerance: 0.7,
              },
            },
            evolution_parameters: {
              physics_update_rate: 10,
              convergence_threshold: 0.01,
            },
          },
        },
        data: {
          speed: {
            type: 'physics_calculated',
            source: 'polar_interpolation',
            unit: 'knots',
          },
          heel: {
            type: 'physics_calculated',
            source: 'sailing_dynamics',
            unit: 'degrees',
          },
        },
        validation: {
          target_speed_range: [5.0, 8.5],
          target_heel_range: [10, 25],
        },
      };

      const result = await validator.validateScenario(scenario, 'j35-complete-test');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.profile).toBeDefined();
      expect(result.profile.name).toBe('J/35');
      expect(result.computedParameters).toBeDefined();
      expect(result.computedParameters.theoretical_hull_speed).toBeCloseTo(7.94, 1);
    });

    test('should validate motor yacht physics scenario', async () => {
      const scenario = {
        name: 'Motor Yacht Physics Test',
        description: 'Motor yacht validation test',
        duration: 300,
        version: '1.0',
        category: 'physics',
        parameters: {
          physics: {
            enabled: true,
            vessel_profile: 'motor-yacht-45',
            overrides: {
              physics: {
                wind_drift_factor: 0.8,
                turning_radius: 120,
              },
              environmental: {
                sea_state: 2,
                water_temperature: 22,
              },
              behavioral: {
                crew_skill_level: 'intermediate',
                sailing_mode: 'cruising',
                risk_tolerance: 0.3,
              },
            },
          },
        },
        data: {
          speed: {
            type: 'physics_calculated',
            source: 'engine_power_curve',
            unit: 'knots',
          },
          engine_rpm: {
            type: 'physics_calculated',
            source: 'throttle_position',
            unit: 'rpm',
          },
        },
        validation: {
          target_speed_range: [18, 22],
          fuel_consumption_range: [10, 14],
        },
      };

      const result = await validator.validateScenario(scenario, 'motor-yacht-test');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.profile.type).toBe('powerboat');
      expect(result.computedParameters.power_to_weight).toBeGreaterThan(0);
    });
  });

  describe('Cross-Parameter Relationship Validation', () => {
    test('should warn about skill level vs risk tolerance mismatch', async () => {
      const scenario = {
        name: 'Skill Risk Mismatch Test',
        description: 'Testing skill/risk validation',
        duration: 300,
        version: '1.0',
        category: 'physics',
        parameters: {
          physics: {
            enabled: true,
            vessel_profile: 'j35',
            overrides: {
              behavioral: {
                crew_skill_level: 'novice',
                risk_tolerance: 0.9, // Very high risk for novice crew
              },
            },
          },
        },
      };

      const result = await validator.validateScenario(scenario, 'skill-risk-test');

      expect(result.isValid).toBe(true); // Should be valid but with warnings
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.message.includes('unusual for novice crew'))).toBe(true);
    });

    test('should warn about heel vs sailing mode mismatch', async () => {
      const scenario = {
        name: 'Heel Mode Mismatch Test',
        description: 'Testing heel/mode validation',
        duration: 300,
        version: '1.0',
        category: 'physics',
        parameters: {
          physics: {
            enabled: true,
            vessel_profile: 'j35',
            overrides: {
              physics: {
                max_heel: 35, // Very high heel
              },
              behavioral: {
                sailing_mode: 'cruising', // Conservative mode
              },
            },
          },
        },
      };

      const result = await validator.validateScenario(scenario, 'heel-mode-test');

      expect(result.warnings.some((w) => w.message.includes('unusual for cruising mode'))).toBe(
        true,
      );
    });

    test('should warn about sea state vs vessel limits', async () => {
      const scenario = {
        name: 'Sea State Limits Test',
        description: 'Testing environmental limits validation',
        duration: 300,
        version: '1.0',
        category: 'physics',
        parameters: {
          physics: {
            enabled: true,
            vessel_profile: 'hunter30', // Smaller boat with lower limits
            overrides: {
              environmental: {
                sea_state: 8, // Very rough seas
              },
            },
          },
        },
      };

      const result = await validator.validateScenario(scenario, 'sea-state-test');

      expect(result.warnings.some((w) => w.message.includes('exceed vessel comfort limits'))).toBe(
        true,
      );
    });
  });

  describe('Vessel Type Consistency Validation', () => {
    test('should warn about sailboat data on powerboat', async () => {
      const scenario = {
        name: 'Vessel Type Mismatch Test',
        description: 'Testing vessel type consistency',
        duration: 300,
        version: '1.0',
        category: 'physics',
        parameters: {
          physics: {
            enabled: true,
            vessel_profile: 'motor-yacht-45', // Powerboat
          },
        },
        data: {
          heel: {
            // Sailboat data on powerboat
            type: 'physics_calculated',
            source: 'sailing_dynamics',
            unit: 'degrees',
          },
        },
      };

      const result = await validator.validateScenario(scenario, 'type-mismatch-test');

      expect(
        result.warnings.some((w) => w.message.includes('typically only relevant for sailboats')),
      ).toBe(true);
    });

    test('should warn about powerboat data on sailboat', async () => {
      const scenario = {
        name: 'Powerboat Data on Sailboat Test',
        description: 'Testing reverse vessel type consistency',
        duration: 300,
        version: '1.0',
        category: 'physics',
        parameters: {
          physics: {
            enabled: true,
            vessel_profile: 'j35', // Sailboat
          },
        },
        data: {
          engine_rpm: {
            // Powerboat data on sailboat
            type: 'physics_calculated',
            source: 'engine_power_curve',
            unit: 'rpm',
          },
        },
      };

      const result = await validator.validateScenario(scenario, 'powerboat-data-test');

      expect(
        result.warnings.some((w) => w.message.includes('typically only relevant for powerboats')),
      ).toBe(true);
    });
  });

  describe('Performance Feasibility Validation', () => {
    test('should warn about unrealistic speed targets', async () => {
      const scenario = {
        name: 'Unrealistic Speed Test',
        description: 'Testing speed feasibility validation',
        duration: 300,
        version: '1.0',
        category: 'physics',
        parameters: {
          physics: {
            enabled: true,
            vessel_profile: 'j35',
          },
        },
        validation: {
          target_speed_range: [5, 15], // 15 knots is unrealistic for J/35
        },
      };

      const result = await validator.validateScenario(scenario, 'unrealistic-speed-test');

      expect(
        result.warnings.some((w) => w.message.includes('exceeds realistic hull speed limit')),
      ).toBe(true);
    });

    test('should error on impossible speed targets for powerboat', async () => {
      const scenario = {
        name: 'Impossible Speed Test',
        description: 'Testing impossible speed validation',
        duration: 300,
        version: '1.0',
        category: 'physics',
        parameters: {
          physics: {
            enabled: true,
            vessel_profile: 'trawler-42',
          },
        },
        validation: {
          target_speed_range: [5, 35], // 35 knots impossible for trawler
        },
      };

      const result = await validator.validateScenario(scenario, 'impossible-speed-test');

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('exceeds vessel maximum speed'))).toBe(
        true,
      );
    });
  });

  describe('Computed Parameters', () => {
    test('should compute sailboat specific parameters', async () => {
      const scenario = {
        name: 'Sailboat Parameters Test',
        description: 'Testing sailboat parameter computation',
        duration: 300,
        version: '1.0',
        category: 'physics',
        parameters: {
          physics: {
            enabled: true,
            vessel_profile: 'j35',
          },
        },
      };

      const result = await validator.validateScenario(scenario, 'sailboat-params-test');

      expect(result.computedParameters.theoretical_hull_speed).toBeDefined();
      expect(result.computedParameters.sail_area_displacement_ratio).toBeDefined();
      expect(result.computedParameters.stability_index).toBeDefined();
    });

    test('should compute powerboat specific parameters', async () => {
      const scenario = {
        name: 'Powerboat Parameters Test',
        description: 'Testing powerboat parameter computation',
        duration: 300,
        version: '1.0',
        category: 'physics',
        parameters: {
          physics: {
            enabled: true,
            vessel_profile: 'motor-yacht-45',
          },
        },
      };

      const result = await validator.validateScenario(scenario, 'powerboat-params-test');

      expect(result.computedParameters.power_to_weight).toBeDefined();
      expect(result.computedParameters.power_to_weight).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent vessel profile gracefully', async () => {
      const scenario = {
        name: 'Non-existent Profile Test',
        description: 'Testing error handling',
        duration: 300,
        version: '1.0',
        category: 'physics',
        parameters: {
          physics: {
            enabled: true,
            vessel_profile: 'non-existent-boat',
          },
        },
      };

      const result = await validator.validateScenario(scenario, 'non-existent-test');

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Failed to load vessel profile'))).toBe(
        true,
      );
    });
  });
});
