/**
 * Vessel Profile Management System
 * Loads, validates, and manages vessel profiles with parameter inheritance
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class VesselProfileManager {
  constructor() {
    this.profilesDir = path.join(__dirname, '../../../vendor/vessel-profiles');
    this.loadedProfiles = new Map();
    this.schema = this._createValidationSchema();
  }

  /**
   * Load a vessel profile by name
   * @param {string} profileName - Name of the profile file (without .yaml extension)
   * @returns {Object} Loaded and validated vessel profile
   */
  async loadProfile(profileName) {
    // Check cache first
    if (this.loadedProfiles.has(profileName)) {
      return this.loadedProfiles.get(profileName);
    }

    const profilePath = path.join(this.profilesDir, `${profileName}.yaml`);

    if (!fs.existsSync(profilePath)) {
      throw new Error(
        `Vessel profile not found: ${profileName}. Available profiles: ${this.getAvailableProfiles().join(
          ', ',
        )}`,
      );
    }

    try {
      const profileData = yaml.load(fs.readFileSync(profilePath, 'utf8'));
      const validatedProfile = this._validateProfile(profileData, profileName);

      // Cache the validated profile
      this.loadedProfiles.set(profileName, validatedProfile);

      return validatedProfile;
    } catch (error) {
      throw new Error(`Failed to load vessel profile '${profileName}': ${error.message}`);
    }
  }

  /**
   * Get list of available vessel profiles
   * @returns {Array<string>} Array of profile names
   */
  getAvailableProfiles() {
    if (!fs.existsSync(this.profilesDir)) {
      return [];
    }

    return fs
      .readdirSync(this.profilesDir)
      .filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'))
      .map((file) => file.replace(/\.(yaml|yml)$/, ''));
  }

  /**
   * Apply scenario-specific parameter overrides to a vessel profile
   * @param {Object} baseProfile - Base vessel profile
   * @param {Object} overrides - Scenario-specific parameter overrides
   * @returns {Object} Profile with applied overrides
   */
  applyOverrides(baseProfile, overrides = {}) {
    if (!overrides || Object.keys(overrides).length === 0) {
      return baseProfile;
    }

    // Deep clone the base profile to avoid mutations
    const mergedProfile = JSON.parse(JSON.stringify(baseProfile));

    // Apply overrides recursively
    this._deepMerge(mergedProfile, overrides);

    return mergedProfile;
  }

  /**
   * Validate a vessel profile against the schema
   * @private
   */
  _validateProfile(profile, profileName) {
    const errors = [];

    // Required top-level fields
    const requiredFields = ['name', 'type', 'category', 'dimensions', 'performance', 'physics'];
    for (const field of requiredFields) {
      if (!profile[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate vessel type
    const validTypes = ['sailboat', 'powerboat', 'catamaran', 'trimaran'];
    if (profile.type && !validTypes.includes(profile.type)) {
      errors.push(`Invalid vessel type: ${profile.type}. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate dimensions
    if (profile.dimensions) {
      const dimErrors = this._validateDimensions(profile.dimensions);
      errors.push(...dimErrors);
    }

    // Validate physics parameters
    if (profile.physics) {
      const physicsErrors = this._validatePhysicsParameters(profile.physics);
      errors.push(...physicsErrors);
    }

    // Validate performance parameters based on vessel type
    if (profile.performance) {
      const perfErrors = this._validatePerformanceParameters(profile.performance, profile.type);
      errors.push(...perfErrors);
    }

    if (errors.length > 0) {
      throw new Error(
        `Vessel profile validation failed for '${profileName}':\n${errors.join('\n')}`,
      );
    }

    // Add computed properties
    profile._computed = this._addComputedProperties(profile);

    return profile;
  }

  /**
   * Validate vessel dimensions
   * @private
   */
  _validateDimensions(dimensions) {
    const errors = [];

    if (
      !dimensions.length_overall ||
      dimensions.length_overall < 10 ||
      dimensions.length_overall > 200
    ) {
      errors.push('length_overall must be between 10 and 200 feet');
    }

    if (!dimensions.beam || dimensions.beam < 3 || dimensions.beam > 50) {
      errors.push('beam must be between 3 and 50 feet');
    }

    if (!dimensions.draft || dimensions.draft < 1 || dimensions.draft > 20) {
      errors.push('draft must be between 1 and 20 feet');
    }

    // Validate proportions
    if (dimensions.beam && dimensions.length_overall) {
      const beamToLength = dimensions.beam / dimensions.length_overall;
      if (beamToLength < 0.2 || beamToLength > 0.5) {
        errors.push('Beam to length ratio should be between 0.2 and 0.5');
      }
    }

    return errors;
  }

  /**
   * Validate physics parameters
   * @private
   */
  _validatePhysicsParameters(physics) {
    const errors = [];

    // Common physics parameters
    const ranges = {
      keel_offset: [0, 1],
      leeway_factor: [1, 15],
      heel_sensitivity: [0.5, 5],
      vmg_efficiency: [0.5, 1],
      max_heel: [10, 45],
      stall_angle: [30, 60],
    };

    for (const [param, [min, max]] of Object.entries(ranges)) {
      if (physics[param] !== undefined) {
        if (physics[param] < min || physics[param] > max) {
          errors.push(`${param} must be between ${min} and ${max}`);
        }
      }
    }

    return errors;
  }

  /**
   * Validate performance parameters based on vessel type
   * @private
   */
  _validatePerformanceParameters(performance, vesselType) {
    const errors = [];

    if (vesselType === 'sailboat') {
      if (!performance.polar_diagram) {
        errors.push('Sailboats must specify a polar_diagram');
      }

      if (performance.hull_speed && (performance.hull_speed < 4 || performance.hull_speed > 15)) {
        errors.push('Sailboat hull_speed should be between 4 and 15 knots');
      }
    }

    if (vesselType === 'powerboat') {
      if (!performance.cruise_speed) {
        errors.push('Powerboats must specify cruise_speed');
      }

      if (
        performance.cruise_speed &&
        (performance.cruise_speed < 5 || performance.cruise_speed > 50)
      ) {
        errors.push('Powerboat cruise_speed should be between 5 and 50 knots');
      }
    }

    return errors;
  }

  /**
   * Add computed properties to the profile
   * @private
   */
  _addComputedProperties(profile) {
    const computed = {};

    // Calculate theoretical hull speed for displacement hulls
    // Formula: 1.34 * sqrt(LWL_feet) = 2.43 * sqrt(LWL_meters) for Nautical (EU) units
    if (profile.dimensions.length_overall) {
      computed.theoretical_hull_speed = 2.43 * Math.sqrt(profile.dimensions.length_overall);
    }

    // Calculate displacement/length ratio if displacement is available
    if (profile.dimensions.displacement && profile.dimensions.length_overall) {
      const lwl = profile.dimensions.length_overall * 0.9; // Approximate waterline length
      computed.displacement_length_ratio = profile.dimensions.displacement / Math.pow(lwl / 100, 3);
    }

    // Calculate ballast ratio for sailboats
    if (
      profile.type === 'sailboat' &&
      profile.dimensions.ballast &&
      profile.dimensions.displacement
    ) {
      computed.ballast_ratio = profile.dimensions.ballast / profile.dimensions.displacement;
    }

    return computed;
  }

  /**
   * Deep merge objects for parameter inheritance
   * @private
   */
  _deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        this._deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  /**
   * Create validation schema (placeholder for future JSON Schema integration)
   * @private
   */
  _createValidationSchema() {
    // This could be expanded to use a proper JSON Schema validator
    return {
      version: '1.0',
      description: 'Basic validation rules for vessel profiles',
    };
  }
}

module.exports = VesselProfileManager;
