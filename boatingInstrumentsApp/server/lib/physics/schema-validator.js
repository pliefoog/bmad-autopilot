/**
 * Schema Validation for Physics-Enhanced Scenarios
 * Validates scenario files with physics configuration against extended schema
 */

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const yaml = require('js-yaml');

class ScenarioSchemaValidator {
  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    this.schemaPath = path.join(
      __dirname,
      '../../../marine-assets/test-scenarios/scenario.schema.json',
    );
    this.schema = null;
    this._loadSchema();
  }

  /**
   * Load and compile the JSON Schema
   * @private
   */
  _loadSchema() {
    try {
      const schemaContent = fs.readFileSync(this.schemaPath, 'utf8');
      this.schema = JSON.parse(schemaContent);
      this.validate = this.ajv.compile(this.schema);
    } catch (error) {
      throw new Error(`Failed to load scenario schema: ${error.message}`);
    }
  }

  /**
   * Validate a scenario configuration
   * @param {Object} scenarioConfig - Scenario configuration object
   * @param {string} [scenarioName] - Optional scenario name for error reporting
   * @returns {Object} Validation result with isValid boolean and errors array
   */
  validateScenario(scenarioConfig, scenarioName = 'unknown') {
    if (!this.validate) {
      throw new Error('Schema validator not initialized');
    }

    const isValid = this.validate(scenarioConfig);

    const result = {
      isValid,
      errors: [],
      warnings: [],
    };

    if (!isValid) {
      result.errors = this.validate.errors.map((error) => ({
        field: error.instancePath || error.schemaPath,
        message: error.message,
        value: error.data,
        constraint: error.params,
      }));
    }

    // Additional physics-specific validations
    if (scenarioConfig.parameters && scenarioConfig.parameters.physics) {
      const physicsValidation = this._validatePhysicsConfiguration(
        scenarioConfig.parameters.physics,
        scenarioName,
      );
      result.errors.push(...physicsValidation.errors);
      result.warnings.push(...physicsValidation.warnings);
      result.isValid = result.isValid && physicsValidation.isValid;
    }

    // Validate phases with vessel profile switching
    if (scenarioConfig.phases) {
      const phasesValidation = this._validatePhysicsPhases(scenarioConfig.phases, scenarioName);
      result.errors.push(...phasesValidation.errors);
      result.warnings.push(...phasesValidation.warnings);
      result.isValid = result.isValid && phasesValidation.isValid;
    }

    // Validate physics-calculated data sources
    if (scenarioConfig.data) {
      const dataValidation = this._validatePhysicsDataSources(scenarioConfig.data, scenarioName);
      result.errors.push(...dataValidation.errors);
      result.warnings.push(...dataValidation.warnings);
      result.isValid = result.isValid && dataValidation.isValid;
    }

    return result;
  }

  /**
   * Validate a scenario file from disk
   * @param {string} scenarioPath - Path to scenario YAML file
   * @returns {Object} Validation result
   */
  validateScenarioFile(scenarioPath) {
    try {
      const scenarioContent = fs.readFileSync(scenarioPath, 'utf8');
      const scenarioConfig = yaml.load(scenarioContent);
      const scenarioName = path.basename(scenarioPath, path.extname(scenarioPath));

      return this.validateScenario(scenarioConfig, scenarioName);
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            field: 'file',
            message: `Failed to load scenario file: ${error.message}`,
            value: scenarioPath,
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Validate physics configuration with custom business rules
   * @private
   */
  _validatePhysicsConfiguration(physicsConfig, scenarioName) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!physicsConfig.enabled) {
      // Physics disabled, no further validation needed
      return result;
    }

    // Validate vessel profile reference
    if (physicsConfig.vessel_profile) {
      const profilePath = path.join(
        __dirname,
        '../../../vendor/vessel-profiles',
        `${physicsConfig.vessel_profile}.yaml`,
      );

      if (!fs.existsSync(profilePath)) {
        result.errors.push({
          field: 'parameters.physics.vessel_profile',
          message: `Vessel profile file not found: ${physicsConfig.vessel_profile}.yaml`,
          value: physicsConfig.vessel_profile,
        });
        result.isValid = false;
      }
    } else {
      result.errors.push({
        field: 'parameters.physics.vessel_profile',
        message: 'vessel_profile is required when physics is enabled',
        value: undefined,
      });
      result.isValid = false;
    }

    // Validate parameter override consistency
    if (physicsConfig.overrides) {
      const overrideValidation = this._validateParameterOverrides(physicsConfig.overrides);
      result.errors.push(...overrideValidation.errors);
      result.warnings.push(...overrideValidation.warnings);
      if (!overrideValidation.isValid) {
        result.isValid = false;
      }
    }

    return result;
  }

  /**
   * Validate parameter overrides for consistency
   * @private
   */
  _validateParameterOverrides(overrides) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Check for conflicting physics parameters
    if (overrides.physics) {
      const physics = overrides.physics;

      // Validate parameter relationships
      if (physics.max_heel && physics.heel_sensitivity) {
        if (physics.max_heel <= 12 && physics.heel_sensitivity > 3) {
          result.warnings.push({
            field: 'overrides.physics',
            message: 'Low max_heel with high heel_sensitivity may cause unrealistic behavior',
            value: { max_heel: physics.max_heel, heel_sensitivity: physics.heel_sensitivity },
          });
        }
      }

      if (physics.vmg_efficiency && (physics.vmg_efficiency < 0.5 || physics.vmg_efficiency > 1)) {
        result.errors.push({
          field: 'overrides.physics.vmg_efficiency',
          message: 'vmg_efficiency must be between 0.5 and 1.0',
          value: physics.vmg_efficiency,
        });
        result.isValid = false;
      }
    }

    // Validate defaults consistency
    if (overrides.defaults) {
      const defaults = overrides.defaults;

      if (defaults.fuel_level && (defaults.fuel_level < 0 || defaults.fuel_level > 1)) {
        result.errors.push({
          field: 'overrides.defaults.fuel_level',
          message: 'fuel_level must be between 0 and 1 (percentage)',
          value: defaults.fuel_level,
        });
        result.isValid = false;
      }
    }

    return result;
  }

  /**
   * Validate physics-aware phases with vessel profile switching
   * @private
   */
  _validatePhysicsPhases(phases, scenarioName) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    phases.forEach((phase, index) => {
      // Check for vessel profile switching in phases
      if (phase.vessel_profile) {
        const profilePath = path.join(
          __dirname,
          '../../../vendor/vessel-profiles',
          `${phase.vessel_profile}.yaml`,
        );

        if (!fs.existsSync(profilePath)) {
          result.errors.push({
            field: `phases[${index}].vessel_profile`,
            message: `Vessel profile file not found: ${phase.vessel_profile}.yaml`,
            value: phase.vessel_profile,
          });
          result.isValid = false;
        }
      }

      // Validate physics-specific events
      if (phase.events) {
        phase.events.forEach((event, eventIndex) => {
          const physicsCommands = [
            'set_wind_conditions',
            'adjust_sail_trim',
            'initiate_tack',
            'set_engine_power',
            'optimize_pointing',
            'physics_reset',
          ];

          if (physicsCommands.includes(event.command)) {
            if (!event.value) {
              result.warnings.push({
                field: `phases[${index}].events[${eventIndex}].value`,
                message: `Physics command '${event.command}' should include value parameter`,
                value: event.command,
              });
            }
          }
        });
      }
    });

    return result;
  }

  /**
   * Validate physics-calculated data sources
   * @private
   */
  _validatePhysicsDataSources(data, scenarioName) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    const physicsDataTypes = [
      'physics_calculated',
      'polar_interpolation',
      'apparent_wind_calculation',
      'vessel_state_integration',
      'sailing_dynamics',
      'engine_power_curve',
    ];

    Object.keys(data).forEach((dataKey) => {
      const dataSource = data[dataKey];

      // Handle nested wind data structure
      if (dataKey === 'wind' && typeof dataSource === 'object') {
        ['angle', 'speed'].forEach((windParam) => {
          if (dataSource[windParam] && dataSource[windParam].type) {
            this._validatePhysicsDataType(dataSource[windParam], `${dataKey}.${windParam}`, result);
          }
        });
      } else if (dataSource && dataSource.type) {
        this._validatePhysicsDataType(dataSource, dataKey, result);
      }
    });

    return result;
  }

  /**
   * Validate individual physics data type
   * @private
   */
  _validatePhysicsDataType(dataSource, fieldName, result) {
    const physicsDataTypes = [
      'physics_calculated',
      'polar_interpolation',
      'apparent_wind_calculation',
      'vessel_state_integration',
      'sailing_dynamics',
      'engine_power_curve',
    ];

    if (physicsDataTypes.includes(dataSource.type)) {
      if (!dataSource.source) {
        result.warnings.push({
          field: `data.${fieldName}.source`,
          message: `Physics-calculated data type '${dataSource.type}' should specify source`,
          value: dataSource.type,
        });
      }

      // Validate physics data consistency
      const validSources = {
        physics_calculated: ['polar_interpolation', 'vessel_state_integration', 'sailing_dynamics'],
        polar_interpolation: ['vessel_profile'],
        apparent_wind_calculation: ['true_wind', 'vessel_speed'],
        vessel_state_integration: ['position_tracking'],
        sailing_dynamics: ['heel_calculation', 'leeway_calculation'],
        engine_power_curve: ['throttle_position', 'engine_load'],
      };

      if (validSources[dataSource.type] && dataSource.source) {
        if (!validSources[dataSource.type].includes(dataSource.source)) {
          result.warnings.push({
            field: `data.${fieldName}.source`,
            message: `Unexpected source '${dataSource.source}' for type '${dataSource.type}'`,
            value: { type: dataSource.type, source: dataSource.source },
          });
        }
      }
    }
  }

  /**
   * Get a formatted error report
   * @param {Object} validationResult - Result from validateScenario()
   * @returns {string} Human-readable error report
   */
  formatErrorReport(validationResult) {
    let report = '';

    if (validationResult.isValid) {
      report = 'Scenario validation passed ✅';
      if (validationResult.warnings.length === 0) {
        return report;
      }
      report += '\n\n';
    } else {
      report = 'Scenario validation failed ❌\n\n';
    }

    if (validationResult.errors.length > 0) {
      report += 'ERRORS:\n';
      validationResult.errors.forEach((error, index) => {
        report += `${index + 1}. ${error.field}: ${error.message}\n`;
        if (error.value !== undefined) {
          report += `   Value: ${JSON.stringify(error.value)}\n`;
        }
      });
    }

    if (validationResult.warnings.length > 0) {
      report += '\nWARNINGS:\n';
      validationResult.warnings.forEach((warning, index) => {
        report += `${index + 1}. ${warning.field}: ${warning.message}\n`;
        if (warning.value !== undefined) {
          report += `   Value: ${JSON.stringify(warning.value)}\n`;
        }
      });
    }

    return report;
  }
}

module.exports = ScenarioSchemaValidator;
