/**
 * HistoryConfiguration - Centralized History Buffer Sizing
 *
 * **Purpose:**
 * Provides sensor-specific history buffer configurations based on update frequency
 * and data retention requirements.
 *
 * **Architecture:**
 * - High-frequency sensors (wind, GPS): Larger buffers for detailed history
 * - Medium-frequency sensors (depth, speed): Standard buffers
 * - Low-frequency sensors (tank, battery): Smaller buffers to save memory
 *
 * **Benefits:**
 * - Centralized configuration (no magic numbers in SensorInstance)
 * - Memory optimization per sensor type
 * - Easy to tune for different marine environments
 * - Documented rationale for each configuration
 *
 * **Buffer Structure:**
 * - total: Total buffer capacity (recent + downsampled)
 * - recent: Number of most recent points kept at full resolution
 * - Downsampling: (total - recent) points downsampled to reduce memory
 *
 * **For AI Agents:**
 * This service replaces hardcoded buffer sizes in SensorInstance.
 * Called when creating new history buffers for sensor metrics.
 */

import type { SensorType } from '../types/SensorData';

export interface BufferConfig {
  total: number;    // Total buffer capacity
  recent: number;   // Recent points at full resolution
}

/**
 * History Configuration Service
 */
export class HistoryConfiguration {
  /**
   * Get buffer configuration for sensor type and metric
   * 
   * @param sensorType - Sensor type (e.g., 'depth', 'wind')
   * @param metricKey - Metric field name (e.g., 'depth', 'speed')
   * @returns Buffer configuration
   */
  static getBufferConfig(sensorType: SensorType, metricKey: string): BufferConfig {
    // High-frequency sensors (10Hz updates) - Need large buffers
    if (sensorType === 'wind') {
      // Wind updates 10x/sec, keep 30 seconds of data
      // 300 points = 30 seconds at 10Hz
      return { total: 300, recent: 200 };
    }

    if (sensorType === 'gps') {
      // GPS updates 1Hz, keep 5 minutes of data
      // 300 points = 5 minutes at 1Hz
      return { total: 300, recent: 150 };
    }

    // Medium-frequency sensors (1-2Hz) - Standard buffers
    if (sensorType === 'depth' || sensorType === 'speed' || sensorType === 'compass') {
      // Updates 1-2x/sec, keep 2-3 minutes of data
      // 150 points = 75-150 seconds
      return { total: 150, recent: 100 };
    }

    if (sensorType === 'engine') {
      // Engine RPM updates frequently, keep 2 minutes
      return { total: 150, recent: 100 };
    }

    // Low-frequency sensors (<1Hz) - Smaller buffers to save memory
    if (sensorType === 'tank' || sensorType === 'temperature') {
      // Updates every few seconds, keep 3-5 minutes
      // 50 points = 150-250 seconds
      return { total: 50, recent: 30 };
    }

    if (sensorType === 'battery') {
      // Battery updates slowly, keep 5 minutes
      return { total: 50, recent: 30 };
    }

    if (sensorType === 'weather') {
      // Weather changes slowly, keep 10 minutes
      return { total: 100, recent: 60 };
    }

    // Autopilot - Keep longer history for safety
    if (sensorType === 'autopilot') {
      // Keep 5 minutes of autopilot state history
      return { total: 300, recent: 150 };
    }

    // Navigation waypoints - Sparse updates
    if (sensorType === 'navigation') {
      return { total: 100, recent: 50 };
    }

    // Default configuration for unknown sensor types
    // Conservative: Standard buffer size
    return { total: 150, recent: 100 };
  }

  /**
   * Get human-readable explanation of buffer configuration
   * Useful for debugging and documentation
   * 
   * @param sensorType - Sensor type
   * @returns Configuration explanation
   */
  static getConfigRationale(sensorType: SensorType): string {
    switch (sensorType) {
      case 'wind':
        return '10Hz updates, 30 seconds full resolution (300 points)';
      case 'gps':
        return '1Hz updates, 5 minutes full resolution (300 points)';
      case 'depth':
      case 'speed':
      case 'compass':
      case 'engine':
        return '1-2Hz updates, 2-3 minutes full resolution (150 points)';
      case 'tank':
      case 'temperature':
      case 'battery':
        return 'Low frequency updates, 3-5 minutes history (50 points)';
      case 'weather':
        return 'Slow changes, 10 minutes history (100 points)';
      case 'autopilot':
        return 'Safety critical, 5 minutes full history (300 points)';
      case 'navigation':
        return 'Waypoint updates, 100 point history';
      default:
        return 'Standard configuration (150 points)';
    }
  }
}
