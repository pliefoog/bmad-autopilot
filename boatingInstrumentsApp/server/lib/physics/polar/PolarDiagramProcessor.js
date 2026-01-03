/**
 * Polar Diagram Processor
 *
 * Processes standard polar performance diagrams for sailboat physics simulation.
 * Supports industry-standard polar data formats and provides interpolation for
 * realistic wind response modeling.
 *
 * Task 2.1: Polar diagram processing (AC2: #1-2)
 * - Create polar data parser and interpolation engine
 * - Build wind response calculation system
 * - Validate against known sailboat performance data
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

class PolarDiagramProcessor {
  constructor() {
    this.polarDataCache = new Map();
    this.interpolationCache = new Map();
  }

  /**
   * Load polar diagram data from CSV file
   * Standard format: TWA (True Wind Angle) columns, TWS (True Wind Speed) rows
   *
   * @param {string} polarFilePath - Path to polar diagram CSV file
   * @returns {Promise<Object>} Parsed polar data structure
   */
  async loadPolarDiagram(polarFilePath) {
    if (this.polarDataCache.has(polarFilePath)) {
      return this.polarDataCache.get(polarFilePath);
    }

    const polarData = {
      windSpeeds: [], // TWS values (rows)
      windAngles: [], // TWA values (columns)
      speedTable: [], // 2D array: [TWS_index][TWA_index] = boat_speed
      metadata: {
        vessel: null,
        units: 'knots', // Nautical (EU) standard
        source: path.basename(polarFilePath),
        loadTime: new Date().toISOString(),
      },
    };

    return new Promise((resolve, reject) => {
      const rows = [];

      // Check if file exists first
      if (!fs.existsSync(polarFilePath)) {
        reject(
          new Error(
            `Failed to read polar file: ENOENT: no such file or directory, open '${polarFilePath}'`,
          ),
        );
        return;
      }

      fs.createReadStream(polarFilePath)
        .pipe(csv())
        .on('data', (row) => {
          rows.push(row);
        })
        .on('end', () => {
          try {
            this._parsePolarData(rows, polarData);
            this._validatePolarData(polarData);
            this.polarDataCache.set(polarFilePath, polarData);
            resolve(polarData);
          } catch (error) {
            reject(new Error(`Failed to parse polar diagram: ${error.message}`));
          }
        })
        .on('error', (error) => {
          reject(new Error(`Failed to read polar file: ${error.message}`));
        });
    });
  }

  /**
   * Parse CSV rows into structured polar data
   *
   * @param {Array} rows - Raw CSV data rows
   * @param {Object} polarData - Target polar data structure
   * @private
   */
  _parsePolarData(rows, polarData) {
    if (rows.length === 0) {
      throw new Error('Empty polar diagram file');
    }

    // Extract wind angles from header (TWA columns)
    const firstRow = rows[0];
    const angleColumns = Object.keys(firstRow).filter(
      (key) => key !== 'TWS' && key !== 'tws' && !isNaN(parseFloat(key)),
    );

    polarData.windAngles = angleColumns.map((angle) => parseFloat(angle)).sort((a, b) => a - b);

    if (polarData.windAngles.length === 0) {
      throw new Error('No valid wind angle columns found in polar data');
    }

    // Process each row (wind speed)
    rows.forEach((row) => {
      const twsKey = row.TWS || row.tws || row['Wind Speed'];
      if (!twsKey) return;

      const windSpeed = parseFloat(twsKey);
      if (isNaN(windSpeed) || windSpeed <= 0) return;

      polarData.windSpeeds.push(windSpeed);

      const speedRow = [];
      polarData.windAngles.forEach((angle) => {
        const speed = parseFloat(row[angle.toString()] || 0);
        speedRow.push(isNaN(speed) ? 0 : speed);
      });

      polarData.speedTable.push(speedRow);
    });

    // Sort by wind speed
    const sortedIndices = polarData.windSpeeds
      .map((speed, index) => ({ speed, index }))
      .sort((a, b) => a.speed - b.speed);

    polarData.windSpeeds = sortedIndices.map((item) => item.speed);
    polarData.speedTable = sortedIndices.map((item) => polarData.speedTable[item.index]);
  }

  /**
   * Validate polar data integrity
   *
   * @param {Object} polarData - Parsed polar data
   * @private
   */
  _validatePolarData(polarData) {
    if (polarData.windSpeeds.length === 0) {
      throw new Error('No valid wind speed data found');
    }

    if (polarData.windAngles.length === 0) {
      throw new Error('No valid wind angle data found');
    }

    if (polarData.speedTable.length !== polarData.windSpeeds.length) {
      throw new Error('Speed table dimensions mismatch');
    }

    // Validate wind angle range (should cover 0-180° for standard polars)
    const minAngle = Math.min(...polarData.windAngles);
    const maxAngle = Math.max(...polarData.windAngles);

    if (minAngle > 30 || maxAngle < 150) {
      console.warn(`Polar diagram has limited angle range: ${minAngle}° - ${maxAngle}°`);
    }

    // Validate wind speed range
    const minSpeed = Math.min(...polarData.windSpeeds);
    const maxSpeed = Math.max(...polarData.windSpeeds);

    if (minSpeed > 10 || maxSpeed < 20) {
      console.warn(`Polar diagram has limited speed range: ${minSpeed} - ${maxSpeed} knots`);
    }
  }

  /**
   * Interpolate boat speed for given wind conditions
   * Uses bilinear interpolation for smooth performance curves
   *
   * @param {Object} polarData - Loaded polar diagram data
   * @param {number} trueWindSpeed - True wind speed in knots
   * @param {number} trueWindAngle - True wind angle in degrees (0-180)
   * @returns {number} Interpolated boat speed in knots
   */
  interpolateSpeed(polarData, trueWindSpeed, trueWindAngle) {
    // Normalize wind angle to 0-180 range
    let normalizedAngle = Math.abs(trueWindAngle % 360);
    if (normalizedAngle > 180) {
      normalizedAngle = 360 - normalizedAngle;
    }

    // Create cache key for performance
    const cacheKey = `${polarData.metadata.source}_${trueWindSpeed}_${normalizedAngle}`;
    if (this.interpolationCache.has(cacheKey)) {
      return this.interpolationCache.get(cacheKey);
    }

    const result = this._bilinearInterpolation(polarData, trueWindSpeed, normalizedAngle);

    // Cache result (limit cache size)
    if (this.interpolationCache.size > 1000) {
      const firstKey = this.interpolationCache.keys().next().value;
      this.interpolationCache.delete(firstKey);
    }
    this.interpolationCache.set(cacheKey, result);

    return result;
  }

  /**
   * Perform bilinear interpolation on polar data
   *
   * @param {Object} polarData - Polar diagram data
   * @param {number} windSpeed - Target wind speed
   * @param {number} windAngle - Target wind angle
   * @returns {number} Interpolated speed
   * @private
   */
  _bilinearInterpolation(polarData, windSpeed, windAngle) {
    const { windSpeeds, windAngles, speedTable } = polarData;

    // Handle edge cases
    if (windSpeed <= windSpeeds[0]) {
      return this._linearInterpolateAngle(polarData, windSpeed, windAngle, 0);
    }
    if (windSpeed >= windSpeeds[windSpeeds.length - 1]) {
      return this._linearInterpolateAngle(polarData, windSpeed, windAngle, windSpeeds.length - 1);
    }

    // Find surrounding wind speeds
    let speedIndex1 = 0;
    for (let i = 0; i < windSpeeds.length - 1; i++) {
      if (windSpeed >= windSpeeds[i] && windSpeed <= windSpeeds[i + 1]) {
        speedIndex1 = i;
        break;
      }
    }
    const speedIndex2 = speedIndex1 + 1;

    // Interpolate at both wind speeds
    const speed1 = this._linearInterpolateAngle(polarData, windSpeed, windAngle, speedIndex1);
    const speed2 = this._linearInterpolateAngle(polarData, windSpeed, windAngle, speedIndex2);

    // Linear interpolation between wind speeds
    const speedRatio =
      (windSpeed - windSpeeds[speedIndex1]) / (windSpeeds[speedIndex2] - windSpeeds[speedIndex1]);

    return speed1 + (speed2 - speed1) * speedRatio;
  }

  /**
   * Linear interpolation for wind angle at specific wind speed index
   *
   * @param {Object} polarData - Polar diagram data
   * @param {number} windSpeed - Target wind speed (for extrapolation)
   * @param {number} windAngle - Target wind angle
   * @param {number} speedIndex - Wind speed table index
   * @returns {number} Interpolated speed
   * @private
   */
  _linearInterpolateAngle(polarData, windSpeed, windAngle, speedIndex) {
    const { windAngles, speedTable } = polarData;
    const row = speedTable[speedIndex];

    // Handle edge cases
    if (windAngle <= windAngles[0]) {
      return row[0];
    }
    if (windAngle >= windAngles[windAngles.length - 1]) {
      return row[row.length - 1];
    }

    // Find surrounding angles
    let angleIndex1 = 0;
    for (let i = 0; i < windAngles.length - 1; i++) {
      if (windAngle >= windAngles[i] && windAngle <= windAngles[i + 1]) {
        angleIndex1 = i;
        break;
      }
    }
    const angleIndex2 = angleIndex1 + 1;

    // Linear interpolation
    const angleRatio =
      (windAngle - windAngles[angleIndex1]) / (windAngles[angleIndex2] - windAngles[angleIndex1]);

    return row[angleIndex1] + (row[angleIndex2] - row[angleIndex1]) * angleRatio;
  }

  /**
   * Get optimal wind angle for maximum VMG (Velocity Made Good)
   *
   * @param {Object} polarData - Polar diagram data
   * @param {number} trueWindSpeed - True wind speed in knots
   * @param {boolean} upwind - True for upwind VMG, false for downwind
   * @returns {Object} {angle, speed, vmg} - Optimal sailing angle and performance
   */
  getOptimalVMG(polarData, trueWindSpeed, upwind = true) {
    const angleRange = upwind ? [30, 60] : [120, 170];
    const step = 2; // degree steps for optimization

    let optimalAngle = angleRange[0];
    let optimalSpeed = 0;
    let optimalVMG = 0;

    for (let angle = angleRange[0]; angle <= angleRange[1]; angle += step) {
      const speed = this.interpolateSpeed(polarData, trueWindSpeed, angle);
      const vmg = speed * Math.cos((angle * Math.PI) / 180);
      const adjustedVMG = upwind ? vmg : -vmg; // Downwind VMG is negative

      if (adjustedVMG > optimalVMG) {
        optimalVMG = adjustedVMG;
        optimalAngle = angle;
        optimalSpeed = speed;
      }
    }

    return {
      angle: optimalAngle,
      speed: optimalSpeed,
      vmg: Math.abs(optimalVMG),
    };
  }

  /**
   * Clear caches to free memory
   */
  clearCaches() {
    this.interpolationCache.clear();
  }

  /**
   * Get performance statistics for loaded polar diagrams
   *
   * @returns {Object} Cache and performance statistics
   */
  getStats() {
    return {
      loadedPolars: this.polarDataCache.size,
      cacheSize: this.interpolationCache.size,
      memoryUsage: process.memoryUsage(),
    };
  }
}

module.exports = PolarDiagramProcessor;
