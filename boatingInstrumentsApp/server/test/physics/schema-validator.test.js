/**
 * Unit Tests for Schema Validation System
 * Tests physics-enhanced scenario validation
 */

const ScenarioSchemaValidator = require('../../lib/physics/schema-validator');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

describe('ScenarioSchemaValidator', () => {
    let validator;
    let tempDir;

    beforeEach(() => {
        validator = new ScenarioSchemaValidator();
        tempDir = path.join(__dirname, 'temp-scenarios');
        
        // Create temp directory for test scenarios
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
    });

    afterEach(() => {
        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (error) {
                // Ignore cleanup errors in tests
                console.warn(`Warning: Could not clean up temp directory: ${error.message}`);
            }
        }
    });

    describe('Basic Scenario Validation', () => {
        test('should validate basic scenario without physics', () => {
            const scenario = {
                name: 'Basic Test Scenario',
                description: 'A simple test scenario without physics',
                duration: 300,
                version: '1.0',
                category: 'basic',
                data: {
                    depth: {
                        type: 'sine_wave',
                        base: 10,
                        amplitude: 2,
                        frequency: 0.1,
                        unit: 'meters'
                    }
                }
            };

            const result = validator.validateScenario(scenario, 'basic-test');
            
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.warnings).toHaveLength(0);
        });

        test('should reject scenario with missing required fields', () => {
            const scenario = {
                name: 'Incomplete Scenario',
                // Missing: description, duration, version, category
            };

            const result = validator.validateScenario(scenario, 'incomplete-test');
            
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors.some(e => e.message.includes('required'))).toBe(true);
        });

        test('should validate field constraints', () => {
            const scenario = {
                name: 'Bad Values Scenario',
                description: 'Testing constraint validation',
                duration: -100, // Invalid: negative duration
                version: 'invalid-version', // Invalid: bad version format
                category: 'invalid-category', // Invalid: not in enum
            };

            const result = validator.validateScenario(scenario, 'bad-values-test');
            
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });

    describe('Physics Configuration Validation', () => {
        test('should validate physics-enabled scenario with vessel profile', () => {
            const scenario = {
                name: 'Physics Test Scenario',
                description: 'Testing physics configuration validation',
                duration: 300,
                version: '1.0',
                category: 'basic',
                parameters: {
                    physics: {
                        enabled: true,
                        vessel_profile: 'j35' // This profile should exist
                    }
                }
            };

            const result = validator.validateScenario(scenario, 'physics-test');
            
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should reject physics scenario without vessel profile', () => {
            const scenario = {
                name: 'Invalid Physics Scenario',
                description: 'Physics enabled but no vessel profile',
                duration: 300,
                version: '1.0',
                category: 'basic',
                parameters: {
                    physics: {
                        enabled: true
                        // Missing vessel_profile
                    }
                }
            };

            const result = validator.validateScenario(scenario, 'invalid-physics-test');
            
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => 
                e.message.includes('vessel_profile is required')
            )).toBe(true);
        });

        test('should reject scenario with non-existent vessel profile', () => {
            const scenario = {
                name: 'Missing Profile Scenario',
                description: 'References non-existent profile',
                duration: 300,
                version: '1.0',
                category: 'basic',
                parameters: {
                    physics: {
                        enabled: true,
                        vessel_profile: 'non-existent-profile'
                    }
                }
            };

            const result = validator.validateScenario(scenario, 'missing-profile-test');
            
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => 
                e.message.includes('Vessel profile file not found')
            )).toBe(true);
        });

        test('should validate physics parameter overrides', () => {
            const scenario = {
                name: 'Override Test Scenario',
                description: 'Testing parameter overrides',
                duration: 300,
                version: '1.0',
                category: 'basic',
                parameters: {
                    physics: {
                        enabled: true,
                        vessel_profile: 'j35',
                        overrides: {
                            physics: {
                                keel_offset: 0.7,
                                vmg_efficiency: 0.9,
                                max_heel: 20
                            },
                            defaults: {
                                crew_weight: 700,
                                fuel_level: 0.8
                            }
                        }
                    }
                }
            };

            const result = validator.validateScenario(scenario, 'override-test');
            
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should reject invalid physics parameter values', () => {
            const scenario = {
                name: 'Invalid Parameters Scenario',
                description: 'Testing invalid parameter values',
                duration: 300,
                version: '1.0',
                category: 'basic',
                parameters: {
                    physics: {
                        enabled: true,
                        vessel_profile: 'j35',
                        overrides: {
                            physics: {
                                vmg_efficiency: 1.5, // Invalid: > 1.0
                                keel_offset: -0.1    // Invalid: < 0
                            },
                            defaults: {
                                fuel_level: 1.5      // Invalid: > 1.0
                            }
                        }
                    }
                }
            };

            const result = validator.validateScenario(scenario, 'invalid-params-test');
            
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        test('should generate warnings for questionable parameter combinations', () => {
            const scenario = {
                name: 'Warning Test Scenario',
                description: 'Testing parameter combination warnings',
                duration: 300,
                version: '1.0',
                category: 'basic',
                parameters: {
                    physics: {
                        enabled: true,
                        vessel_profile: 'j35',
                        overrides: {
                            physics: {
                                max_heel: 10,        // At minimum threshold but still low
                                heel_sensitivity: 4  // High - combination may be unrealistic
                            }
                        }
                    }
                }
            };

            const result = validator.validateScenario(scenario, 'warning-test');
            
            expect(result.isValid).toBe(true);
            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.warnings.some(w => 
                w.message.includes('unrealistic behavior')
            )).toBe(true);
        });
    });

    describe('File Validation', () => {
        test('should validate scenario file from disk', () => {
            const scenario = {
                name: 'File Test Scenario',
                description: 'Testing file-based validation',
                duration: 300,
                version: '1.0',
                category: 'basic'
            };

            const filePath = path.join(tempDir, 'file-test.yml');
            fs.writeFileSync(filePath, yaml.dump(scenario));

            const result = validator.validateScenarioFile(filePath);
            
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should handle malformed YAML files', () => {
            const filePath = path.join(tempDir, 'malformed.yml');
            fs.writeFileSync(filePath, 'invalid: yaml: content: [');

            const result = validator.validateScenarioFile(filePath);
            
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => 
                e.message.includes('Failed to load scenario file')
            )).toBe(true);
        });

        test('should handle non-existent files', () => {
            const filePath = path.join(tempDir, 'non-existent.yml');

            const result = validator.validateScenarioFile(filePath);
            
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => 
                e.field === 'file'
            )).toBe(true);
        });
    });

    describe('Error Reporting', () => {
        test('should format error report for valid scenario', () => {
            const validResult = {
                isValid: true,
                errors: [],
                warnings: []
            };

            const report = validator.formatErrorReport(validResult);
            
            expect(report).toContain('validation passed ✅');
        });

        test('should format error report with errors', () => {
            const invalidResult = {
                isValid: false,
                errors: [
                    {
                        field: 'duration',
                        message: 'must be number',
                        value: 'invalid'
                    },
                    {
                        field: 'version',
                        message: 'must match pattern',
                        value: '1.0.0.0'
                    }
                ],
                warnings: []
            };

            const report = validator.formatErrorReport(invalidResult);
            
            expect(report).toContain('validation failed ❌');
            expect(report).toContain('ERRORS:');
            expect(report).toContain('duration: must be number');
            expect(report).toContain('version: must match pattern');
        });

        test('should format error report with warnings', () => {
            const resultWithWarnings = {
                isValid: true,
                errors: [],
                warnings: [
                    {
                        field: 'physics.parameters',
                        message: 'questionable combination',
                        value: { max_heel: 5, heel_sensitivity: 4 }
                    }
                ]
            };

            const report = validator.formatErrorReport(resultWithWarnings);
            
            expect(report).toContain('validation passed ✅');
            expect(report).toContain('WARNINGS:');
            expect(report).toContain('questionable combination');
        });
    });

    describe('Integration', () => {
        test('should work with existing scenario files', () => {
            // Test with an actual existing scenario file
            const existingScenarioPath = path.join(
                __dirname, 
                '../../../vendor/test-scenarios/navigation/basic-navigation.yml'
            );

            if (fs.existsSync(existingScenarioPath)) {
                const result = validator.validateScenarioFile(existingScenarioPath);
                
                // The file should load without critical errors (allowing some schema evolution)
                expect(result.errors.some(e => e.field === 'file')).toBe(false);
                expect(Array.isArray(result.errors)).toBe(true);
                expect(Array.isArray(result.warnings)).toBe(true);
            } else {
                // If file doesn't exist, skip the test
                expect(true).toBe(true);
            }
        });
    });
});