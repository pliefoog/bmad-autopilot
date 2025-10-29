/**
 * Tests for Physics-Enhanced Example Scenarios
 * Validates the example physics scenarios work correctly with the validation system
 */

const ScenarioParameterValidator = require('../../lib/physics/scenario-parameter-validator');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

describe('Physics Example Scenarios', () => {
    let validator;
    const scenariosPath = path.join(__dirname, '../../../vendor/test-scenarios/physics');

    beforeEach(() => {
        validator = new ScenarioParameterValidator();
    });

    describe('J/35 Upwind Sailing Scenario', () => {
        test('should validate J/35 upwind sailing scenario file', async () => {
            const scenarioPath = path.join(scenariosPath, 'j35-upwind-sailing.yml');
            
            if (!fs.existsSync(scenarioPath)) {
                throw new Error(`Scenario file not found: ${scenarioPath}`);
            }

            const scenarioContent = fs.readFileSync(scenarioPath, 'utf8');
            const scenario = yaml.load(scenarioContent);

            const result = await validator.validateScenario(scenario, 'j35-upwind-sailing');
            
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.profile).toBeDefined();
            expect(result.profile.name).toBe('J/35');
            expect(result.profile.type).toBe('sailboat');
        });

        test('should have realistic performance parameters for J/35', async () => {
            const scenarioPath = path.join(scenariosPath, 'j35-upwind-sailing.yml');
            const scenarioContent = fs.readFileSync(scenarioPath, 'utf8');
            const scenario = yaml.load(scenarioContent);

            const result = await validator.validateScenario(scenario, 'j35-upwind-sailing');
            
            // Check validation ranges are realistic for J/35
            expect(scenario.validation.target_speed_range[0]).toBeGreaterThan(4);
            expect(scenario.validation.target_speed_range[1]).toBeLessThan(9);
            expect(scenario.validation.target_heel_range[0]).toBeGreaterThan(8);
            expect(scenario.validation.target_heel_range[1]).toBeLessThan(30);
            
            // Check physics parameters are applied correctly
            expect(result.profile.physics.max_heel).toBe(28); // Override value from scenario
            expect(result.profile.defaults.crew_weight).toBe(650); // Override value
        });

        test('should have valid physics data sources', async () => {
            const scenarioPath = path.join(scenariosPath, 'j35-upwind-sailing.yml');
            const scenarioContent = fs.readFileSync(scenarioPath, 'utf8');
            const scenario = yaml.load(scenarioContent);

            // Check physics-calculated data sources
            expect(scenario.data.speed.type).toBe('physics_calculated');
            expect(scenario.data.speed.source).toBe('polar_interpolation');
            expect(scenario.data.apparent_wind_angle.type).toBe('physics_calculated');
            expect(scenario.data.heel.type).toBe('physics_calculated');
            
            // All physics data should have units specified
            expect(scenario.data.speed.unit).toBeDefined();
            expect(scenario.data.apparent_wind_angle.unit).toBeDefined();
            expect(scenario.data.heel.unit).toBeDefined();
        });
    });

    describe('Motor Yacht Cruise Scenario', () => {
        test('should validate motor yacht cruise scenario file', async () => {
            const scenarioPath = path.join(scenariosPath, 'motor-yacht-cruise.yml');
            
            if (!fs.existsSync(scenarioPath)) {
                throw new Error(`Scenario file not found: ${scenarioPath}`);
            }

            const scenarioContent = fs.readFileSync(scenarioPath, 'utf8');
            const scenario = yaml.load(scenarioContent);

            const result = await validator.validateScenario(scenario, 'motor-yacht-cruise');
            
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.profile).toBeDefined();
            expect(result.profile.name).toBe('Motor Yacht 45');
            expect(result.profile.type).toBe('powerboat');
        });

        test('should have realistic power boat parameters', async () => {
            const scenarioPath = path.join(scenariosPath, 'motor-yacht-cruise.yml');
            const scenarioContent = fs.readFileSync(scenarioPath, 'utf8');
            const scenario = yaml.load(scenarioContent);

            const result = await validator.validateScenario(scenario, 'motor-yacht-cruise');
            
            // Check validation ranges are realistic for motor yacht
            expect(scenario.validation.target_speed_range[0]).toBeGreaterThan(5);
            expect(scenario.validation.target_speed_range[1]).toBeLessThan(25);
            expect(scenario.validation.target_fuel_flow_range[0]).toBeGreaterThan(1);
            expect(scenario.validation.target_fuel_flow_range[1]).toBeLessThan(15);
            
            // Check computed parameters
            expect(result.computedParameters.power_to_weight).toBeGreaterThan(0);
            expect(result.computedParameters.theoretical_hull_speed).toBeCloseTo(9.0, 1);
        });

        test('should have valid powerboat data sources', async () => {
            const scenarioPath = path.join(scenariosPath, 'motor-yacht-cruise.yml');
            const scenarioContent = fs.readFileSync(scenarioPath, 'utf8');
            const scenario = yaml.load(scenarioContent);

            // Check powerboat-specific data sources
            expect(scenario.data.speed.type).toBe('physics_calculated');
            expect(scenario.data.engine_rpm.type).toBe('physics_calculated');
            expect(scenario.data.fuel_flow.type).toBe('physics_calculated');
            
            // Should not have sailboat-specific data
            expect(scenario.data.heel).toBeUndefined();
            expect(scenario.data.apparent_wind).toBeUndefined();
        });
    });

    describe('Multi-Vessel Comparison Scenario', () => {
        test('should validate multi-vessel comparison scenario', async () => {
            const scenarioPath = path.join(scenariosPath, 'multi-vessel-comparison.yml');
            
            if (!fs.existsSync(scenarioPath)) {
                throw new Error(`Scenario file not found: ${scenarioPath}`);
            }

            const scenarioContent = fs.readFileSync(scenarioPath, 'utf8');
            const scenario = yaml.load(scenarioContent);

            const result = await validator.validateScenario(scenario, 'multi-vessel-comparison');
            
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.profile).toBeDefined();
            expect(result.profile.name).toBe('J/35'); // Starting profile
        });

        test('should validate vessel profile switching in phases', async () => {
            const scenarioPath = path.join(scenariosPath, 'multi-vessel-comparison.yml');
            const scenarioContent = fs.readFileSync(scenarioPath, 'utf8');
            const scenario = yaml.load(scenarioContent);

            // Check that phases specify different vessel profiles
            const vesselProfiles = scenario.phases
                .filter(phase => phase.vessel_profile)
                .map(phase => phase.vessel_profile);
            
            expect(vesselProfiles).toContain('j35');
            expect(vesselProfiles).toContain('catalina34');
            expect(vesselProfiles).toContain('motor-yacht-45');
            expect(vesselProfiles).toContain('trawler-42');
            
            // Each profile should be valid
            for (const profileName of vesselProfiles) {
                const profilePath = path.join(
                    __dirname, 
                    '../../../vendor/vessel-profiles', 
                    `${profileName}.yaml`
                );
                expect(fs.existsSync(profilePath)).toBe(true);
            }
        });

        test('should have comparative validation metrics', async () => {
            const scenarioPath = path.join(scenariosPath, 'multi-vessel-comparison.yml');
            const scenarioContent = fs.readFileSync(scenarioPath, 'utf8');
            const scenario = yaml.load(scenarioContent);

            // Check comparative validation structure
            expect(scenario.validation.j35_vs_catalina34).toBeDefined();
            expect(scenario.validation.sailboat_vs_powerboat).toBeDefined();
            expect(scenario.validation.displacement_vs_planing).toBeDefined();
            
            // Check specific comparison metrics
            expect(scenario.validation.j35_vs_catalina34.speed_difference_max).toBeDefined();
            expect(scenario.validation.sailboat_vs_powerboat.wind_independence).toBe(true);
            expect(scenario.validation.displacement_vs_planing.hull_speed_limitation).toBe(true);
        });
    });

    describe('Schema Compliance', () => {
        test('all physics scenarios should comply with extended schema', async () => {
            const scenarioFiles = [
                'j35-upwind-sailing.yml',
                'motor-yacht-cruise.yml',
                'multi-vessel-comparison.yml'
            ];

            for (const filename of scenarioFiles) {
                const scenarioPath = path.join(scenariosPath, filename);
                
                if (fs.existsSync(scenarioPath)) {
                    const scenarioContent = fs.readFileSync(scenarioPath, 'utf8');
                    const scenario = yaml.load(scenarioContent);

                    const result = await validator.validateScenario(scenario, filename);
                    
                    expect(result.isValid).toBe(true);
                    if (result.errors.length > 0) {
                        console.error(`Validation errors in ${filename}:`, result.errors);
                    }
                    expect(result.errors).toHaveLength(0);
                }
            }
        });

        test('physics scenarios should have required structure', async () => {
            const scenarioFiles = ['j35-upwind-sailing.yml', 'motor-yacht-cruise.yml'];

            for (const filename of scenarioFiles) {
                const scenarioPath = path.join(scenariosPath, filename);
                
                if (fs.existsSync(scenarioPath)) {
                    const scenarioContent = fs.readFileSync(scenarioPath, 'utf8');
                    const scenario = yaml.load(scenarioContent);

                    // Required physics structure
                    expect(scenario.parameters.physics.enabled).toBe(true);
                    expect(scenario.parameters.physics.vessel_profile).toBeDefined();
                    expect(scenario.parameters.physics.evolution_parameters).toBeDefined();
                    
                    // Required evolution parameters
                    const evolution = scenario.parameters.physics.evolution_parameters;
                    expect(evolution.physics_update_rate).toBeGreaterThan(0);
                    expect(evolution.convergence_threshold).toBeGreaterThan(0);
                    
                    // Data sources should use physics calculations
                    const physicsDataTypes = ['physics_calculated'];
                    let hasPhysicsData = false;
                    
                    Object.values(scenario.data).forEach(dataSource => {
                        if (dataSource.type && physicsDataTypes.includes(dataSource.type)) {
                            hasPhysicsData = true;
                        }
                        // Handle nested wind structure
                        if (typeof dataSource === 'object' && dataSource.angle && dataSource.speed) {
                            if (physicsDataTypes.includes(dataSource.angle.type) || 
                                physicsDataTypes.includes(dataSource.speed.type)) {
                                hasPhysicsData = true;
                            }
                        }
                    });
                    
                    expect(hasPhysicsData).toBe(true);
                }
            }
        });
    });
});