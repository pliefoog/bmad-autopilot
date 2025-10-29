/**
 * Advanced Scenario Parameter Validation
 * Validates complex multi-parameter physics scenarios with cross-parameter relationships
 */

const VesselProfileManager = require('./vessel-profile');
const ScenarioSchemaValidator = require('./schema-validator');

class ScenarioParameterValidator {
    constructor() {
        this.profileManager = new VesselProfileManager();
        this.schemaValidator = new ScenarioSchemaValidator();
        this.validationRules = this._buildValidationRules();
    }

    /**
     * Comprehensive validation of a physics-enhanced scenario
     * @param {Object} scenarioConfig - Complete scenario configuration
     * @param {string} scenarioName - Scenario identifier
     * @returns {Object} Comprehensive validation result
     */
    async validateScenario(scenarioConfig, scenarioName = 'unknown') {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            profile: null,
            computedParameters: {}
        };

        // Step 1: Schema validation
        const schemaResult = this.schemaValidator.validateScenario(scenarioConfig, scenarioName);
        result.errors.push(...schemaResult.errors);
        result.warnings.push(...schemaResult.warnings);
        result.isValid = result.isValid && schemaResult.isValid;

        // Step 2: Physics configuration validation
        if (scenarioConfig.parameters?.physics?.enabled) {
            const physicsResult = await this._validatePhysicsConfiguration(
                scenarioConfig, 
                scenarioName
            );
            result.errors.push(...physicsResult.errors);
            result.warnings.push(...physicsResult.warnings);
            result.isValid = result.isValid && physicsResult.isValid;
            result.profile = physicsResult.profile;
            result.computedParameters = physicsResult.computedParameters;
        }

        // Step 3: Cross-parameter relationship validation
        const relationshipResult = this._validateParameterRelationships(scenarioConfig, result.profile);
        result.errors.push(...relationshipResult.errors);
        result.warnings.push(...relationshipResult.warnings);
        result.isValid = result.isValid && relationshipResult.isValid;

        // Step 4: Performance feasibility validation
        const performanceResult = this._validatePerformanceFeasibility(scenarioConfig, result.profile);
        result.errors.push(...performanceResult.errors);
        result.warnings.push(...performanceResult.warnings);
        result.isValid = result.isValid && performanceResult.isValid;

        return result;
    }

    /**
     * Validate physics configuration with vessel profile integration
     * @private
     */
    async _validatePhysicsConfiguration(scenarioConfig, scenarioName) {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            profile: null,
            computedParameters: {}
        };

        const physicsConfig = scenarioConfig.parameters.physics;

        try {
            // Load vessel profile
            result.profile = await this.profileManager.loadProfile(physicsConfig.vessel_profile);
            
            // Apply scenario overrides
            if (physicsConfig.overrides) {
                result.profile = this.profileManager.applyOverrides(result.profile, physicsConfig.overrides);
            }

            // Compute derived parameters
            result.computedParameters = this._computeDerivedParameters(result.profile, scenarioConfig);

            // Validate parameter consistency with vessel type
            const consistencyResult = this._validateVesselTypeConsistency(result.profile, scenarioConfig);
            result.errors.push(...consistencyResult.errors);
            result.warnings.push(...consistencyResult.warnings);
            result.isValid = result.isValid && consistencyResult.isValid;

        } catch (error) {
            result.errors.push({
                field: 'parameters.physics.vessel_profile',
                message: `Failed to load vessel profile: ${error.message}`,
                value: physicsConfig.vessel_profile
            });
            result.isValid = false;
        }

        return result;
    }

    /**
     * Validate cross-parameter relationships
     * @private
     */
    _validateParameterRelationships(scenarioConfig, profile) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        if (!profile || !scenarioConfig.parameters?.physics?.enabled) {
            return result;
        }

        const physics = scenarioConfig.parameters.physics;

        // Environmental vs Vessel Capability Validation
        if (physics.overrides?.environmental) {
            const env = physics.overrides.environmental;
            
            // Sea state vs vessel limits
            if (env.sea_state && profile.limits?.max_wave_height) {
                const estimatedWaveHeight = env.sea_state * 1.5; // Rough conversion
                if (estimatedWaveHeight > profile.limits.max_wave_height) {
                    result.warnings.push({
                        field: 'environmental.sea_state',
                        message: `Sea state ${env.sea_state} may exceed vessel comfort limits`,
                        value: { sea_state: env.sea_state, max_wave_height: profile.limits.max_wave_height }
                    });
                }
            }

            // Water temperature vs operating region
            if (env.water_temperature !== undefined) {
                if (env.water_temperature < 0 && !profile.specifications?.ice_rating) {
                    result.warnings.push({
                        field: 'environmental.water_temperature',
                        message: 'Sub-freezing water temperature without ice rating specification',
                        value: env.water_temperature
                    });
                }
            }
        }

        // Behavioral Parameter Validation
        if (physics.overrides?.behavioral) {
            const behavioral = physics.overrides.behavioral;

            // Crew skill vs risk tolerance validation
            if (behavioral.crew_skill_level && behavioral.risk_tolerance !== undefined) {
                const skillRiskMatrix = {
                    'novice': [0, 0.3],
                    'intermediate': [0.2, 0.6],
                    'advanced': [0.4, 0.8],
                    'expert': [0.6, 1.0]
                };

                const expectedRange = skillRiskMatrix[behavioral.crew_skill_level];
                if (expectedRange && (behavioral.risk_tolerance < expectedRange[0] || behavioral.risk_tolerance > expectedRange[1])) {
                    result.warnings.push({
                        field: 'behavioral.risk_tolerance',
                        message: `Risk tolerance ${behavioral.risk_tolerance} unusual for ${behavioral.crew_skill_level} crew`,
                        value: { skill: behavioral.crew_skill_level, risk: behavioral.risk_tolerance }
                    });
                }
            }

        }

        // Cross-Parameter Validation (requires both behavioral and physics overrides)
        if (physics.overrides?.behavioral && physics.overrides?.physics) {
            const behavioral = physics.overrides.behavioral;
            const physicsParams = physics.overrides.physics;

            // Max heel vs sailing mode validation
            if (physicsParams.max_heel && behavioral.sailing_mode) {
                const modeHeelLimits = {
                    'racing': [20, 35],
                    'cruising': [10, 25],
                    'motorsailing': [5, 15],
                    'anchored': [0, 10]
                };

                const expectedRange = modeHeelLimits[behavioral.sailing_mode];
                if (expectedRange && (physicsParams.max_heel < expectedRange[0] || physicsParams.max_heel > expectedRange[1])) {
                    result.warnings.push({
                        field: 'physics.max_heel',
                        message: `Max heel ${physicsParams.max_heel}° unusual for ${behavioral.sailing_mode} mode`,
                        value: { max_heel: physicsParams.max_heel, mode: behavioral.sailing_mode }
                    });
                }
            }
        }

        return result;
    }

    /**
     * Validate performance feasibility
     * @private
     */
    _validatePerformanceFeasibility(scenarioConfig, profile) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        if (!profile || !scenarioConfig.validation) {
            return result;
        }

        const validation = scenarioConfig.validation;

        // Speed range validation against vessel capabilities
        if (validation.target_speed_range && profile.performance) {
            const [minSpeed, maxSpeed] = validation.target_speed_range;
            
            if (profile.type === 'sailboat' && profile.performance.hull_speed) {
                if (maxSpeed > profile.performance.hull_speed * 1.1) {
                    result.warnings.push({
                        field: 'validation.target_speed_range',
                        message: `Maximum target speed ${maxSpeed} kt exceeds realistic hull speed limit`,
                        value: { target_max: maxSpeed, hull_speed: profile.performance.hull_speed }
                    });
                }
            }

            if (profile.type === 'powerboat' && profile.performance.max_speed) {
                if (maxSpeed > profile.performance.max_speed) {
                    result.errors.push({
                        field: 'validation.target_speed_range',
                        message: `Maximum target speed ${maxSpeed} kt exceeds vessel maximum speed`,
                        value: { target_max: maxSpeed, vessel_max: profile.performance.max_speed }
                    });
                    result.isValid = false;
                }
            }
        }

        // Fuel consumption validation
        if (validation.fuel_consumption_range && profile.engine) {
            const [minConsumption, maxConsumption] = validation.fuel_consumption_range;
            
            if (profile.engine.fuel_flow_cruise && maxConsumption > profile.engine.fuel_flow_cruise * 2) {
                result.warnings.push({
                    field: 'validation.fuel_consumption_range',
                    message: `Maximum fuel consumption ${maxConsumption} GPH exceeds reasonable operating range`,
                    value: { target_max: maxConsumption, cruise_consumption: profile.engine.fuel_flow_cruise }
                });
            }
        }

        return result;
    }

    /**
     * Validate vessel type consistency
     * @private
     */
    _validateVesselTypeConsistency(profile, scenarioConfig) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        const physicsConfig = scenarioConfig.parameters.physics;

        // Check data source consistency with vessel type
        if (scenarioConfig.data) {
            const sailboatOnlyData = ['heel', 'apparent_wind', 'sail_trim'];
            const powerboatOnlyData = ['engine_rpm', 'fuel_flow', 'throttle_position'];

            sailboatOnlyData.forEach(dataType => {
                if (scenarioConfig.data[dataType] && profile.type !== 'sailboat') {
                    result.warnings.push({
                        field: `data.${dataType}`,
                        message: `Data type '${dataType}' typically only relevant for sailboats`,
                        value: { vessel_type: profile.type, data_type: dataType }
                    });
                }
            });

            powerboatOnlyData.forEach(dataType => {
                if (scenarioConfig.data[dataType] && profile.type !== 'powerboat') {
                    result.warnings.push({
                        field: `data.${dataType}`,
                        message: `Data type '${dataType}' typically only relevant for powerboats`,
                        value: { vessel_type: profile.type, data_type: dataType }
                    });
                }
            });
        }

        return result;
    }

    /**
     * Compute derived physics parameters
     * @private
     */
    _computeDerivedParameters(profile, scenarioConfig) {
        const computed = {};

        // Compute theoretical performance limits  
        // Formula: 1.34 * sqrt(LWL_feet) = 2.43 * sqrt(LWL_meters) for Nautical (EU) units
        if (profile.dimensions?.length_overall) {
            computed.theoretical_hull_speed = 2.43 * Math.sqrt(profile.dimensions.length_overall);
        }

        // Compute stability metrics
        if (profile.dimensions?.beam && profile.dimensions?.displacement) {
            computed.stability_index = profile.dimensions.beam / Math.sqrt(profile.dimensions.displacement / 64);
        }

        // Compute power-to-weight ratio for powerboats
        if (profile.type === 'powerboat' && profile.engine?.total_horsepower && profile.dimensions?.displacement) {
            computed.power_to_weight = profile.engine.total_horsepower / (profile.dimensions.displacement / 2240);
        }

        // Compute sail area to displacement ratio for sailboats
        if (profile.type === 'sailboat' && profile.dimensions?.sail_area && profile.dimensions?.displacement) {
            computed.sail_area_displacement_ratio = profile.dimensions.sail_area / Math.pow(profile.dimensions.displacement / 64, 2/3);
        }

        return computed;
    }

    /**
     * Build validation rules matrix
     * @private
     */
    _buildValidationRules() {
        return {
            vesselTypeRules: {
                sailboat: {
                    requiredData: ['wind', 'heel'],
                    optionalData: ['apparent_wind', 'sail_trim', 'leeway'],
                    incompatibleData: ['engine_rpm', 'throttle_position']
                },
                powerboat: {
                    requiredData: ['engine_rpm', 'speed'],
                    optionalData: ['fuel_flow', 'throttle_position', 'rudder_angle'],
                    incompatibleData: ['heel', 'apparent_wind', 'sail_trim']
                }
            },
            environmentalLimits: {
                sea_state: { min: 0, max: 9, comfortable_max: 6 },
                wind_speed: { min: 0, max: 100, comfortable_max: 40 },
                water_temperature: { min: -2, max: 35, comfortable_range: [10, 25] }
            }
        };
    }
}

module.exports = ScenarioParameterValidator;