/**
 * NMEA Scenario Schema Validator
 * 
 * Defines and validates the structure of scenario YAML files
 * to ensure consistency across all test scenarios.
 */

class ScenarioSchemaValidator {
  /**
   * Validate a scenario object against the schema
   * @param {Object} scenario - Parsed YAML scenario object
   * @returns {{valid: boolean, errors: string[]}}
   */
  static validate(scenario) {
    const errors = [];
    
    // Required top-level fields
    if (!scenario.name || typeof scenario.name !== 'string') {
      errors.push('Missing or invalid required field: name (string)');
    }
    
    if (!scenario.description || typeof scenario.description !== 'string') {
      errors.push('Missing or invalid required field: description (string)');
    }
    
    if (!scenario.bridge_mode || !['nmea0183', 'nmea2000', 'hybrid'].includes(scenario.bridge_mode)) {
      errors.push('Missing or invalid required field: bridge_mode (must be: nmea0183, nmea2000, or hybrid)');
    }
    
    // Optional but recommended fields
    if (scenario.version && typeof scenario.version !== 'string') {
      errors.push('Invalid field: version (must be string, e.g., "1.0")');
    }
    
    if (scenario.category && typeof scenario.category !== 'string') {
      errors.push('Invalid field: category (must be string)');
    }
    
    if (scenario.duration && typeof scenario.duration !== 'number') {
      errors.push('Invalid field: duration (must be number in milliseconds)');
    }
    
    if (scenario.message_rate && typeof scenario.message_rate !== 'number') {
      errors.push('Invalid field: message_rate (must be number in Hz)');
    }
    
    // Validate nmea_sentences array
    if (scenario.nmea_sentences) {
      if (!Array.isArray(scenario.nmea_sentences)) {
        errors.push('Invalid field: nmea_sentences (must be array)');
      } else {
        scenario.nmea_sentences.forEach((sentence, index) => {
          this.validateSentence(sentence, index, errors);
        });
      }
    }
    
    // Check for deprecated field names
    if (scenario.sentences) {
      errors.push('Deprecated field: "sentences" should be renamed to "nmea_sentences"');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate an individual NMEA sentence definition
   * @param {Object} sentence - Sentence definition object
   * @param {number} index - Array index for error reporting
   * @param {string[]} errors - Error array to append to
   */
  static validateSentence(sentence, index, errors) {
    const prefix = `nmea_sentences[${index}]`;
    
    // Required fields
    if (!sentence.type || typeof sentence.type !== 'string') {
      errors.push(`${prefix}: Missing or invalid required field: type (string)`);
    }
    
    // Optional fields with type checking
    if (sentence.frequency !== undefined && typeof sentence.frequency !== 'number') {
      errors.push(`${prefix}: Invalid field: frequency (must be number in Hz)`);
    }
    
    if (sentence.interval_ms !== undefined && typeof sentence.interval_ms !== 'number') {
      errors.push(`${prefix}: Invalid field: interval_ms (must be number in milliseconds)`);
    }
    
    if (sentence.enabled !== undefined && typeof sentence.enabled !== 'boolean') {
      errors.push(`${prefix}: Invalid field: enabled (must be boolean)`);
    }
    
    // Check for conflicting fields
    if (sentence.frequency && sentence.interval_ms) {
      errors.push(`${prefix}: Cannot specify both frequency and interval_ms (use only one)`);
    }
    
    // Validate fields object if present
    if (sentence.fields && typeof sentence.fields !== 'object') {
      errors.push(`${prefix}: Invalid field: fields (must be object)`);
    }
    
    // Validate subtypes array if present
    if (sentence.subtypes) {
      if (!Array.isArray(sentence.subtypes)) {
        errors.push(`${prefix}: Invalid field: subtypes (must be array)`);
      } else {
        sentence.subtypes.forEach((subtype, subIndex) => {
          if (typeof subtype !== 'string') {
            errors.push(`${prefix}.subtypes[${subIndex}]: Must be string`);
          }
        });
      }
    }
  }
  
  /**
   * Get the schema documentation as a string
   * @returns {string} Schema documentation
   */
  static getSchemaDocumentation() {
    return `
NMEA Scenario File Schema (v1.0)
=================================

Required Fields:
----------------
name: string                  # Scenario name
description: string           # Detailed description
bridge_mode: string           # Must be: nmea0183, nmea2000, or hybrid

Optional Fields:
----------------
version: string               # Version number (e.g., "1.0")
category: string              # Category (e.g., "development", "testing")
duration: number              # Duration in milliseconds
message_rate: number          # Default message rate in Hz

nmea_sentences: array         # Array of NMEA sentence definitions
  - type: string              # NMEA sentence type (e.g., "DBT", "RPM", "XDR")
    frequency: number         # Frequency in Hz (alternative to interval_ms)
    interval_ms: number       # Interval in milliseconds (alternative to frequency)
    enabled: boolean          # Whether sentence is enabled (default: true)
    fields: object            # Sentence-specific field definitions
    subtypes: array           # Array of subtype strings (for XDR, etc.)

Example:
--------
name: "Basic Navigation"
description: "Standard navigation data for testing"
bridge_mode: "nmea0183"
version: "1.0"
category: "development"
duration: 300000
message_rate: 5

nmea_sentences:
  - type: "DBT"
    frequency: 1
    enabled: true
    
  - type: "XDR"
    interval_ms: 2000
    enabled: true
    subtypes:
      - coolant_temperature
      - oil_pressure
`;
  }
}

module.exports = ScenarioSchemaValidator;
