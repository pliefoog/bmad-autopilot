/**
 * Staleness Detection Utilities for Marine Safety
 *
 * PURPOSE: Provide 5-second marine safety threshold staleness detection for critical marine instrumentation
 * REQUIREMENT: AC-11.5.5 - Staleness Detection and Marine Safety Thresholds
 * METHOD: Data age monitoring with 5-second marine safety threshold and timeout detection
 * EXPECTED: Staleness detection tested at 5-second marine safety threshold, data age monitoring covers all critical marine instrumentation
 * ERROR CONDITIONS: Data staleness exceeding 5-second threshold, timeout detection failures, marine safety warning system failures
 */

const MARINE_STALENESS_THRESHOLDS = {
  criticalSystems: {
    stalenessThresholdMs: 5000, // 5-second marine safety threshold
    dataAgeWarningMs: 3000, // 3-second warning threshold
    maxDataGapMs: 10000, // Maximum acceptable data gap
    criticalSystemTimeoutMs: 2000, // Critical system timeout
  },
  navigationSystems: {
    gpsMaxAge: 1000, // GPS data maximum age (1 second)
    compassMaxAge: 500, // Compass data maximum age (500ms)
    speedMaxAge: 1000, // Speed data maximum age (1 second)
  },
  autopilotSystems: {
    commandResponseTimeout: 1000, // 1-second autopilot response timeout
    statusUpdateMaxAge: 500, // Autopilot status update maximum age
    emergencyStopTimeout: 500, // Emergency stop response timeout
  },
};

/**
 * Staleness Detection Engine
 */
class StalenessDetector {
  /**
   * Check data freshness against marine safety thresholds
   * @param {number} timestamp - Data timestamp
   * @param {number} thresholdMs - Staleness threshold in milliseconds (default: 5000ms)
   * @returns {boolean} True if data is fresh, false if stale
   */
  checkDataFreshness(
    timestamp,
    thresholdMs = MARINE_STALENESS_THRESHOLDS.criticalSystems.stalenessThresholdMs,
  ) {
    const now = Date.now();
    const dataAge = now - timestamp;
    return dataAge <= thresholdMs;
  }

  /**
   * Calculate data age in milliseconds
   * @param {number} timestamp - Data timestamp
   * @returns {number} Data age in milliseconds
   */
  calculateDataAge(timestamp) {
    return Date.now() - timestamp;
  }

  /**
   * Check if data age exceeds warning threshold
   * @param {number} timestamp - Data timestamp
   * @returns {boolean} True if warning threshold exceeded
   */
  isDataAgeWarning(timestamp) {
    const dataAge = this.calculateDataAge(timestamp);
    return dataAge > MARINE_STALENESS_THRESHOLDS.criticalSystems.dataAgeWarningMs;
  }

  /**
   * Validate marine safety compliance for data freshness
   * @param {Object} dataTimestamps - Object with system data timestamps
   * @returns {Object} Marine safety compliance result
   */
  validateMarineSafetyCompliance(dataTimestamps) {
    const results = [];
    const now = Date.now();

    // Check critical navigation systems
    Object.entries(dataTimestamps).forEach(([system, timestamp]) => {
      const dataAge = now - timestamp;
      const isStale = dataAge > MARINE_STALENESS_THRESHOLDS.criticalSystems.stalenessThresholdMs;
      const isWarning = dataAge > MARINE_STALENESS_THRESHOLDS.criticalSystems.dataAgeWarningMs;

      results.push({
        system,
        dataAge,
        isStale,
        isWarning,
        marineCompliant: !isStale,
        threshold: MARINE_STALENESS_THRESHOLDS.criticalSystems.stalenessThresholdMs,
      });
    });

    const staleSystemCount = results.filter((r) => r.isStale).length;
    const warningSystemCount = results.filter((r) => r.isWarning).length;

    return {
      marineCompliant: staleSystemCount === 0,
      totalSystems: results.length,
      staleSystems: staleSystemCount,
      warningSystems: warningSystemCount,
      results,
      crashFreeSupport: staleSystemCount === 0, // Supports 99.5% crash-free session rate
    };
  }

  /**
   * Get staleness thresholds for specific marine domain
   * @param {string} domain - Marine domain (critical, navigation, autopilot)
   * @returns {Object} Domain-specific staleness thresholds
   */
  getThresholds(domain) {
    return MARINE_STALENESS_THRESHOLDS[domain] || MARINE_STALENESS_THRESHOLDS.criticalSystems;
  }
}

module.exports = {
  StalenessDetector,
  MARINE_STALENESS_THRESHOLDS,
};
