/**
 * Marine Data Staleness Detection System
 * 
 * PURPOSE: Implement 5-second marine safety threshold staleness detection for critical marine instrumentation
 * REQUIREMENT: AC-11.5.5 - Staleness Detection and Marine Safety Thresholds 
 * METHOD: Timestamp-based staleness detection with marine safety warning systems
 * EXPECTED: Data age monitoring, timeout detection, marine safety compliance for 99.5% crash-free session rate
 * ERROR CONDITIONS: Stale data detection, timeout violations, marine safety threshold breaches
 */

const MARINE_STALENESS_THRESHOLDS = {
  CRITICAL_THRESHOLD_MS: 5000,      // 5-second marine safety threshold
  WARNING_THRESHOLD_MS: 3000,       // 3-second warning threshold
  MAX_DATA_GAP_MS: 10000,          // 10-second maximum data gap
  SYSTEM_TIMEOUT_MS: 2000,         // 2-second system timeout
};

const CRITICAL_MARINE_SYSTEMS = {
  navigation: ['gpsPosition', 'heading', 'course', 'speed'],
  safety: ['depth', 'collision', 'alarm'],
  autopilot: ['autopilotState', 'commandResponse'],
  engine: ['engineRpm', 'engineTemperature', 'oilPressure'],
  environmental: ['windSpeed', 'windDirection', 'barometricPressure']
};

/**
 * Marine Data Staleness Detector
 */
class StalenessDetector {
  constructor(options = {}) {
    this.thresholds = { ...MARINE_STALENESS_THRESHOLDS, ...options.thresholds };
    this.criticalSystems = { ...CRITICAL_MARINE_SYSTEMS, ...options.criticalSystems };
    this.dataRegistry = new Map();
    this.warningCallbacks = new Set();
    this.alertCallbacks = new Set();
    this.monitoringActive = false;
    this.monitorInterval = null;
  }

  /**
   * Register data timestamp for staleness monitoring
   * @param {string} dataType - Type of marine data (e.g., 'gpsPosition', 'heading')
   * @param {number} timestamp - Data timestamp in milliseconds
   * @param {Object} metadata - Additional metadata for the data
   */
  registerDataTimestamp(dataType, timestamp = Date.now(), metadata = {}) {
    this.dataRegistry.set(dataType, {
      timestamp,
      metadata,
      lastCheck: Date.now(),
      staleness: this.calculateStaleness(timestamp),
      status: this.determineDataStatus(timestamp)
    });
  }

  /**
   * Check data freshness against marine safety thresholds
   * @param {string} dataType - Type of marine data to check
   * @param {number} currentTime - Current timestamp for staleness calculation
   * @returns {Object} Staleness check result
   */
  checkDataFreshness(dataType, currentTime = Date.now()) {
    const dataEntry = this.dataRegistry.get(dataType);
    
    if (!dataEntry) {
      return {
        dataType,
        status: 'no-data',
        staleness: null,
        isCritical: this.isCriticalSystem(dataType),
        marineCompliant: false,
        timestamp: currentTime
      };
    }

    const staleness = currentTime - dataEntry.timestamp;
    const status = this.determineDataStatus(dataEntry.timestamp, currentTime);
    const isCritical = this.isCriticalSystem(dataType);
    const marineCompliant = staleness <= this.thresholds.CRITICAL_THRESHOLD_MS;

    // Update registry with latest check
    dataEntry.staleness = staleness;
    dataEntry.status = status;
    dataEntry.lastCheck = currentTime;

    return {
      dataType,
      status,
      staleness,
      isCritical,
      marineCompliant,
      timestamp: currentTime,
      thresholdBreached: staleness > this.thresholds.CRITICAL_THRESHOLD_MS,
      warningLevel: this.getWarningLevel(staleness, isCritical)
    };
  }

  /**
   * Perform comprehensive staleness check for all registered data
   * @returns {Object} Complete staleness report
   */
  performComprehensiveStalenessCheck() {
    const currentTime = Date.now();
    const results = [];
    const criticalIssues = [];
    const warnings = [];

    // Check all registered data types
    for (const [dataType, dataEntry] of this.dataRegistry.entries()) {
      const result = this.checkDataFreshness(dataType, currentTime);
      results.push(result);

      if (result.isCritical && result.thresholdBreached) {
        criticalIssues.push(result);
      } else if (result.warningLevel === 'warning') {
        warnings.push(result);
      }
    }

    // Check for critical marine systems that have no data
    this.getAllCriticalSystems().forEach(systemType => {
      if (!this.dataRegistry.has(systemType)) {
        const missingSystemResult = {
          dataType: systemType,
          status: 'no-data',
          staleness: null,
          isCritical: true,
          marineCompliant: false,
          timestamp: currentTime,
          thresholdBreached: true,
          warningLevel: 'critical'
        };
        results.push(missingSystemResult);
        criticalIssues.push(missingSystemResult);
      }
    });

    const overallCompliance = criticalIssues.length === 0;
    
    return {
      timestamp: currentTime,
      totalDataTypes: results.length,
      marineCompliant: overallCompliance,
      criticalIssues: criticalIssues.length,
      warnings: warnings.length,
      results,
      criticalIssuesList: criticalIssues,
      warningsList: warnings,
      complianceRate: ((results.length - criticalIssues.length) / results.length * 100).toFixed(1)
    };
  }

  /**
   * Start continuous staleness monitoring
   * @param {number} intervalMs - Monitoring interval in milliseconds (default: 1000ms)
   */
  startMonitoring(intervalMs = 1000) {
    if (this.monitoringActive) {
      return;
    }

    this.monitoringActive = true;
    this.monitorInterval = setInterval(() => {
      const report = this.performComprehensiveStalenessCheck();
      
      // Trigger warnings for stale data
      if (report.warnings > 0) {
        this.triggerWarnings(report.warningsList);
      }
      
      // Trigger critical alerts for marine safety violations
      if (report.criticalIssues > 0) {
        this.triggerCriticalAlerts(report.criticalIssuesList);
      }
      
    }, intervalMs);
  }

  /**
   * Stop continuous staleness monitoring
   */
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.monitoringActive = false;
  }

  /**
   * Determine data status based on staleness thresholds
   * @param {number} dataTimestamp - Data timestamp
   * @param {number} currentTime - Current time for comparison
   * @returns {string} Data status
   */
  determineDataStatus(dataTimestamp, currentTime = Date.now()) {
    const staleness = currentTime - dataTimestamp;
    
    if (staleness <= this.thresholds.WARNING_THRESHOLD_MS) {
      return 'fresh';
    } else if (staleness <= this.thresholds.CRITICAL_THRESHOLD_MS) {
      return 'warning';
    } else if (staleness <= this.thresholds.MAX_DATA_GAP_MS) {
      return 'stale';
    } else {
      return 'timeout';
    }
  }

  /**
   * Calculate staleness in milliseconds
   * @param {number} dataTimestamp - Data timestamp
   * @param {number} currentTime - Current time
   * @returns {number} Staleness in milliseconds
   */
  calculateStaleness(dataTimestamp, currentTime = Date.now()) {
    return currentTime - dataTimestamp;
  }

  /**
   * Check if data type is part of critical marine systems
   * @param {string} dataType - Type of marine data
   * @returns {boolean} True if critical system
   */
  isCriticalSystem(dataType) {
    return this.getAllCriticalSystems().includes(dataType);
  }

  /**
   * Get all critical marine system data types
   * @returns {Array} Array of critical system data types
   */
  getAllCriticalSystems() {
    return Object.values(this.criticalSystems).flat();
  }

  /**
   * Get warning level based on staleness and criticality
   * @param {number} staleness - Data staleness in milliseconds
   * @param {boolean} isCritical - Whether system is critical
   * @returns {string} Warning level
   */
  getWarningLevel(staleness, isCritical) {
    if (staleness > this.thresholds.CRITICAL_THRESHOLD_MS) {
      return isCritical ? 'critical' : 'warning';
    } else if (staleness > this.thresholds.WARNING_THRESHOLD_MS) {
      return 'warning';
    }
    return 'normal';
  }

  /**
   * Register callback for staleness warnings
   * @param {Function} callback - Warning callback function
   */
  onWarning(callback) {
    this.warningCallbacks.add(callback);
  }

  /**
   * Register callback for critical staleness alerts
   * @param {Function} callback - Alert callback function  
   */
  onCriticalAlert(callback) {
    this.alertCallbacks.add(callback);
  }

  /**
   * Trigger warning callbacks
   * @param {Array} warnings - Array of warning results
   */
  triggerWarnings(warnings) {
    this.warningCallbacks.forEach(callback => {
      try {
        callback(warnings);
      } catch (error) {
        console.error('Staleness warning callback error:', error);
      }
    });
  }

  /**
   * Trigger critical alert callbacks
   * @param {Array} criticalIssues - Array of critical issue results
   */
  triggerCriticalAlerts(criticalIssues) {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(criticalIssues);
      } catch (error) {
        console.error('Staleness critical alert callback error:', error);
      }
    });
  }

  /**
   * Generate marine safety compliance report
   * @returns {Object} Compliance report for marine safety standards
   */
  generateMarineSafetyReport() {
    const report = this.performComprehensiveStalenessCheck();
    const totalSystems = this.getAllCriticalSystems().length;
    const activeSystems = Array.from(this.dataRegistry.keys()).filter(dataType => 
      this.isCriticalSystem(dataType)
    ).length;
    
    return {
      ...report,
      marineSafety: {
        totalCriticalSystems: totalSystems,
        activeCriticalSystems: activeSystems,
        systemCoverage: (activeSystems / totalSystems * 100).toFixed(1),
        marineCompliantSystems: activeSystems - report.criticalIssues,
        safetyComplianceRate: ((activeSystems - report.criticalIssues) / activeSystems * 100).toFixed(1),
        meetsMarineStandards: report.criticalIssues === 0 && activeSystems >= totalSystems * 0.8
      }
    };
  }

  /**
   * Reset staleness detector state
   */
  reset() {
    this.stopMonitoring();
    this.dataRegistry.clear();
    this.warningCallbacks.clear();
    this.alertCallbacks.clear();
  }

  /**
   * Get current staleness detector configuration
   * @returns {Object} Current configuration
   */
  getConfiguration() {
    return {
      thresholds: this.thresholds,
      criticalSystems: this.criticalSystems,
      monitoringActive: this.monitoringActive,
      registeredDataTypes: Array.from(this.dataRegistry.keys())
    };
  }
}

module.exports = {
  StalenessDetector,
  MARINE_STALENESS_THRESHOLDS,
  CRITICAL_MARINE_SYSTEMS
};