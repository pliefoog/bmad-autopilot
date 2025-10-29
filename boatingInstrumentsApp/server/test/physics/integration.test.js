/**
 * Integration Tests for Vessel Profile System
 * Tests end-to-end functionality of vessel profiles with scenario validation
 */

const VesselProfileManager = require('../../lib/physics/vessel-profile');
const ScenarioSchemaValidator = require('../../lib/physics/schema-validator');

describe('Physics System Integration', () => {
    let profileManager;
    let validator;

    beforeEach(() => {
        profileManager = new VesselProfileManager();
        validator = new ScenarioSchemaValidator();
    });

    describe('End-to-End Profile Usage', () => {
        test('should create valid physics scenario with vessel profile', async () => {
            // Load a vessel profile
            const profile = await profileManager.loadProfile('j35');
            expect(profile).toBeDefined();
            expect(profile.name).toBe('J/35');

            // Create a physics-enabled scenario
            const scenario = {
                name: 'J/35 Physics Test',
                description: 'Testing J/35 physics simulation',
                duration: 300,
                version: '1.0',
                category: 'basic',
                parameters: {
                    physics: {
                        enabled: true,
                        vessel_profile: 'j35',
                        overrides: {
                            physics: {
                                max_heel: 20
                            },
                            defaults: {
                                crew_weight: 700
                            }
                        }
                    }
                }
            };

            // Validate the scenario
            const result = validator.validateScenario(scenario, 'j35-physics-test');
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);

            // Apply profile overrides
            const modifiedProfile = profileManager.applyOverrides(profile, scenario.parameters.physics.overrides);
            expect(modifiedProfile.physics.max_heel).toBe(20);
            expect(modifiedProfile.defaults.crew_weight).toBe(700);
        });

        test('should work with motor yacht profile', async () => {
            const profile = await profileManager.loadProfile('motor-yacht-45');
            expect(profile.type).toBe('powerboat');
            expect(profile.performance.cruise_speed).toBe(20);

            const scenario = {
                name: 'Motor Yacht Physics Test',
                description: 'Testing motor yacht physics',
                duration: 300,
                version: '1.0',
                category: 'basic',
                parameters: {
                    physics: {
                        enabled: true,
                        vessel_profile: 'motor-yacht-45'
                    }
                }
            };

            const result = validator.validateScenario(scenario, 'motor-yacht-test');
            expect(result.isValid).toBe(true);
        });

        test('should validate all available vessel profiles', async () => {
            const profiles = profileManager.getAvailableProfiles();
            expect(profiles.length).toBeGreaterThan(0);

            // Test each profile can be loaded and used in a scenario
            for (const profileName of profiles) {
                const profile = await profileManager.loadProfile(profileName);
                expect(profile).toBeDefined();
                expect(profile.name).toBeDefined();
                expect(profile.type).toBeDefined();

                const scenario = {
                    name: `${profile.name} Test`,
                    description: `Testing ${profile.name} physics`,
                    duration: 300,
                    version: '1.0',
                    category: 'basic',
                    parameters: {
                        physics: {
                            enabled: true,
                            vessel_profile: profileName
                        }
                    }
                };

                const result = validator.validateScenario(scenario, `${profileName}-test`);
                expect(result.isValid).toBe(true);
            }
        });
    });

    describe('Profile System Robustness', () => {
        test('should handle concurrent profile loading', async () => {
            const promises = [
                profileManager.loadProfile('j35'),
                profileManager.loadProfile('catalina34'),
                profileManager.loadProfile('motor-yacht-45')
            ];

            const profiles = await Promise.all(promises);
            
            expect(profiles[0].name).toBe('J/35');
            expect(profiles[1].name).toBe('Catalina 34');
            expect(profiles[2].name).toBe('Motor Yacht 45');
        });

        test('should maintain profile cache integrity', async () => {
            // Load profile multiple times
            const profile1 = await profileManager.loadProfile('j35');
            const profile2 = await profileManager.loadProfile('j35');
            
            // Should be same object reference (cached)
            expect(profile1).toBe(profile2);
            
            // Modify one profile
            const modified = profileManager.applyOverrides(profile1, {
                physics: { max_heel: 30 }
            });
            
            // Original cached profile should be unchanged
            const profile3 = await profileManager.loadProfile('j35');
            expect(profile3.physics.max_heel).toBe(25); // Original value
            expect(modified.physics.max_heel).toBe(30); // Modified value
        });
    });

    describe('Schema Evolution Compatibility', () => {
        test('should accept scenarios without physics (backward compatibility)', () => {
            const scenario = {
                name: 'Legacy Scenario',
                description: 'Scenario without physics config',
                duration: 300,
                version: '1.0',
                category: 'basic'
            };

            const result = validator.validateScenario(scenario, 'legacy-test');
            expect(result.isValid).toBe(true);
        });

        test('should accept scenarios with physics disabled', () => {
            const scenario = {
                name: 'Physics Disabled Scenario',
                description: 'Scenario with physics explicitly disabled',
                duration: 300,
                version: '1.0',
                category: 'basic',
                parameters: {
                    physics: {
                        enabled: false
                    }
                }
            };

            const result = validator.validateScenario(scenario, 'physics-disabled-test');
            expect(result.isValid).toBe(true);
        });
    });
});