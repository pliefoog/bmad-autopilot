/**
 * Marine Domain Validation Utilities
 * 
 * PURPOSE: Provide industry-standard marine accuracy threshold validation for navigation, environmental, engine, and autopilot domains
 * REQUIREMENT: AC-11.5 - Marine Domain Validation Standards
 * METHOD: Accuracy threshold validation with marine industry standards compliance
 * EXPECTED: 0.1nm navigation precision, <1° heading accuracy, manufacturer engine tolerances, 1-second autopilot response
 * ERROR CONDITIONS: Accuracy violations, threshold breaches, marine safety compliance failures
 */

const MARINE_ACCURACY_THRESHOLDS = {
  navigation: {
    positionAccuracyNM: 0.1,              // 0.1 nautical mile precision
    headingAccuracyDegrees: 1.0,          // <1° directional precision
    courseAccuracyDegrees: 1.0,           // Course over ground accuracy
    speedAccuracyKnots: 0.1,              // Speed accuracy in knots
    gpsFixToleranceMeters: 185.2          // 0.1nm in meters (1nm = 1852m)
  },
  environmental: {
    depthAccuracyUnits: 0.1,              // 0.1 unit depth accuracy
    windDirectionDegrees: 1.0,            // <1° wind direction precision
    windSpeedAccuracyKnots: 0.1,          // Wind speed accuracy
    temperatureAccuracyC: 0.5,            // Temperature sensor accuracy ±0.5°C
    pressureAccuracyMbar: 1.0             // Barometric pressure accuracy ±1 mbar
  },
  engine: {
    rpmAccuracyPercent: 2.0,              // ±2% RPM accuracy (manufacturer tolerance)
    temperatureAccuracyC: 2.0,            // Engine temperature ±2°C tolerance
    fuelAccuracyPercent: 3.0,             // Fuel consumption ±3% accuracy
    oilPressureAccuracyPSI: 2.0,          // Oil pressure ±2 PSI tolerance
    voltageAccuracyV: 0.1                 // Electrical voltage ±0.1V accuracy
  },
  autopilot: {
    responseTimeMs: 1000,                 // 1-second response time requirement
    headingAccuracyDegrees: 0.5,          // Autopilot heading accuracy ±0.5°
    courseKeepingDegrees: 2.0,            // Course keeping tolerance ±2°
    commandValidationMs: 100,             // Command validation within 100ms
    emergencyStopMs: 500                  // Emergency stop response within 500ms
  },
  safety: {
    stalenessThresholdMs: 5000,           // 5-second marine safety threshold
    dataAgeWarningMs: 3000,               // Data age warning at 3 seconds
    maxDataGapMs: 10000,                  // Maximum acceptable data gap
    criticalSystemTimeoutMs: 2000         // Critical system timeout
  }
};

/**
 * Marine Domain Validator Class
 */
class MarineDomainValidator {
  /**
   * Validate navigation accuracy against marine standards
   * @param {Object} navigationData - Navigation data to validate
   * @param {number} navigationData.latitude - GPS latitude
   * @param {number} navigationData.longitude - GPS longitude  
   * @param {number} navigationData.heading - Vessel heading in degrees
   * @param {number} navigationData.course - Course over ground
   * @param {number} navigationData.speed - Speed over ground in knots
   * @returns {ValidationResult} Validation result with pass/fail status
   */
  validateNavigationAccuracy(navigationData) {
    const results = [];
    
    // Validate GPS position accuracy
    if (navigationData.referenceLatitude !== undefined && navigationData.referenceLongitude !== undefined) {
      const distance = this.calculateDistanceNM(
        navigationData.latitude, navigationData.longitude,
        navigationData.referenceLatitude, navigationData.referenceLongitude
      );
      
      results.push({
        metric: 'GPS Position Accuracy',
        value: distance,
        threshold: MARINE_ACCURACY_THRESHOLDS.navigation.positionAccuracyNM,
        unit: 'nautical miles',
        pass: distance <= MARINE_ACCURACY_THRESHOLDS.navigation.positionAccuracyNM,
        requirement: 'AC-11.5.1 Navigation Domain Validation'
      });
    }
    
    // Validate heading accuracy
    if (navigationData.heading !== undefined && navigationData.referenceHeading !== undefined) {
      const headingError = this.calculateHeadingError(navigationData.heading, navigationData.referenceHeading);
      
      results.push({
        metric: 'Heading Accuracy',
        value: headingError,
        threshold: MARINE_ACCURACY_THRESHOLDS.navigation.headingAccuracyDegrees,
        unit: 'degrees',
        pass: headingError <= MARINE_ACCURACY_THRESHOLDS.navigation.headingAccuracyDegrees,
        requirement: 'AC-11.5.1 Navigation Domain Validation'
      });
    }
    
    // Validate course accuracy
    if (navigationData.course !== undefined && navigationData.referenceCourse !== undefined) {
      const courseError = this.calculateHeadingError(navigationData.course, navigationData.referenceCourse);
      
      results.push({
        metric: 'Course Accuracy',
        value: courseError,
        threshold: MARINE_ACCURACY_THRESHOLDS.navigation.courseAccuracyDegrees,
        unit: 'degrees',
        pass: courseError <= MARINE_ACCURACY_THRESHOLDS.navigation.courseAccuracyDegrees,
        requirement: 'AC-11.5.1 Navigation Domain Validation'
      });
    }
    
    return this.createValidationResult(results, 'Navigation Domain');
  }

  /**
   * Validate environmental sensor accuracy against marine standards
   * @param {Object} environmentalData - Environmental sensor data
   * @returns {ValidationResult} Validation result
   */
  validateEnvironmentalAccuracy(environmentalData) {
    const results = [];
    
    // Validate depth measurement accuracy
    if (environmentalData.depth !== undefined && environmentalData.referenceDepth !== undefined) {
      const depthError = Math.abs(environmentalData.depth - environmentalData.referenceDepth);
      
      results.push({
        metric: 'Depth Measurement Accuracy',
        value: depthError,
        threshold: MARINE_ACCURACY_THRESHOLDS.environmental.depthAccuracyUnits,
        unit: 'units',
        pass: depthError <= MARINE_ACCURACY_THRESHOLDS.environmental.depthAccuracyUnits,
        requirement: 'AC-11.5.2 Environmental Domain Validation'
      });
    }
    
    // Validate wind direction accuracy
    if (environmentalData.windDirection !== undefined && environmentalData.referenceWindDirection !== undefined) {
      const windDirectionError = this.calculateHeadingError(
        environmentalData.windDirection, 
        environmentalData.referenceWindDirection
      );
      
      results.push({
        metric: 'Wind Direction Accuracy',
        value: windDirectionError,
        threshold: MARINE_ACCURACY_THRESHOLDS.environmental.windDirectionDegrees,
        unit: 'degrees',
        pass: windDirectionError <= MARINE_ACCURACY_THRESHOLDS.environmental.windDirectionDegrees,
        requirement: 'AC-11.5.2 Environmental Domain Validation'
      });
    }
    
    // Validate wind speed accuracy
    if (environmentalData.windSpeed !== undefined && environmentalData.referenceWindSpeed !== undefined) {
      const windSpeedError = Math.abs(environmentalData.windSpeed - environmentalData.referenceWindSpeed);
      
      results.push({
        metric: 'Wind Speed Accuracy',
        value: windSpeedError,
        threshold: MARINE_ACCURACY_THRESHOLDS.environmental.windSpeedAccuracyKnots,
        unit: 'knots',
        pass: windSpeedError <= MARINE_ACCURACY_THRESHOLDS.environmental.windSpeedAccuracyKnots,
        requirement: 'AC-11.5.2 Environmental Domain Validation'
      });
    }
    
    return this.createValidationResult(results, 'Environmental Domain');
  }

  /**
   * Validate engine monitoring accuracy against manufacturer tolerances
   * @param {Object} engineData - Engine monitoring data
   * @returns {ValidationResult} Validation result
   */
  validateEngineAccuracy(engineData) {
    const results = [];
    
    // Validate RPM accuracy (percentage-based)
    if (engineData.rpm !== undefined && engineData.referenceRpm !== undefined) {
      const rpmErrorPercent = Math.abs((engineData.rpm - engineData.referenceRpm) / engineData.referenceRpm) * 100;
      
      results.push({
        metric: 'RPM Accuracy',
        value: rpmErrorPercent,
        threshold: MARINE_ACCURACY_THRESHOLDS.engine.rpmAccuracyPercent,
        unit: 'percent',
        pass: rpmErrorPercent <= MARINE_ACCURACY_THRESHOLDS.engine.rpmAccuracyPercent,
        requirement: 'AC-11.5.3 Engine Domain Validation'
      });
    }
    
    // Validate engine temperature accuracy
    if (engineData.temperature !== undefined && engineData.referenceTemperature !== undefined) {
      const tempError = Math.abs(engineData.temperature - engineData.referenceTemperature);
      
      results.push({
        metric: 'Engine Temperature Accuracy',
        value: tempError,
        threshold: MARINE_ACCURACY_THRESHOLDS.engine.temperatureAccuracyC,
        unit: 'celsius',
        pass: tempError <= MARINE_ACCURACY_THRESHOLDS.engine.temperatureAccuracyC,
        requirement: 'AC-11.5.3 Engine Domain Validation'
      });
    }
    
    return this.createValidationResult(results, 'Engine Domain');
  }

  /**
   * Validate autopilot command and response accuracy
   * @param {Object} autopilotData - Autopilot command and response data
   * @returns {ValidationResult} Validation result
   */
  validateAutopilotAccuracy(autopilotData) {
    const results = [];
    
    // Validate response time
    if (autopilotData.commandTimestamp && autopilotData.responseTimestamp) {
      const responseTime = autopilotData.responseTimestamp - autopilotData.commandTimestamp;
      
      results.push({
        metric: 'Autopilot Response Time',
        value: responseTime,
        threshold: MARINE_ACCURACY_THRESHOLDS.autopilot.responseTimeMs,
        unit: 'milliseconds',
        pass: responseTime <= MARINE_ACCURACY_THRESHOLDS.autopilot.responseTimeMs,
        requirement: 'AC-11.5.4 Autopilot Domain Validation'
      });
    }
    
    // Validate heading command accuracy (support both naming conventions)
    const commandedHeading = autopilotData.commandedHeading ?? autopilotData.targetHeading;
    const actualHeading = autopilotData.actualHeading ?? autopilotData.currentHeading;
    
    if (commandedHeading !== undefined && actualHeading !== undefined) {
      const headingError = this.calculateHeadingError(actualHeading, commandedHeading);
      
      results.push({
        metric: 'Autopilot Heading Accuracy',
        value: headingError,
        threshold: MARINE_ACCURACY_THRESHOLDS.autopilot.headingAccuracyDegrees,
        unit: 'degrees',
        pass: headingError <= MARINE_ACCURACY_THRESHOLDS.autopilot.headingAccuracyDegrees,
        requirement: 'AC-11.5.4 Autopilot Domain Validation'
      });
    }
    
    return this.createValidationResult(results, 'Autopilot Domain');
  }

  /**
   * Calculate distance between two GPS coordinates in nautical miles
   * @param {number} lat1 - Latitude 1
   * @param {number} lon1 - Longitude 1
   * @param {number} lat2 - Latitude 2
   * @param {number} lon2 - Longitude 2
   * @returns {number} Distance in nautical miles
   */
  calculateDistanceNM(lat1, lon1, lat2, lon2) {
    const R = 3440.065; // Earth radius in nautical miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * Calculate heading error accounting for circular nature of compass headings
   * @param {number} actual - Actual heading
   * @param {number} reference - Reference heading
   * @returns {number} Absolute heading error in degrees
   */
  calculateHeadingError(actual, reference) {
    let error = Math.abs(actual - reference);
    if (error > 180) {
      error = 360 - error;
    }
    return error;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Degrees
   * @returns {number} Radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Create standardized validation result
   * @param {Array} results - Individual validation results
   * @param {string} domain - Marine domain name
   * @returns {ValidationResult} Consolidated validation result
   */
  createValidationResult(results, domain) {
    const passed = results.filter(r => r.pass).length;
    const failed = results.length - passed;
    
    return {
      domain,
      totalTests: results.length,
      passed,
      failed,
      success: failed === 0,
      results,
      timestamp: Date.now(),
      marineCompliant: failed === 0
    };
  }

  /**
   * Get marine accuracy thresholds for specific domain
   * @param {string} domain - Marine domain (navigation, environmental, engine, autopilot, safety)
   * @returns {Object} Domain-specific thresholds
   */
  getThresholds(domain) {
    return MARINE_ACCURACY_THRESHOLDS[domain] || {};
  }
}

module.exports = {
  MarineDomainValidator,
  MARINE_ACCURACY_THRESHOLDS
};