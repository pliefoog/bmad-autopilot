/**
 * Enhanced PGN Parser for Instance-Aware NMEA 2000 Messages
 *
 * Handles parsing of PGNs that contain instance information for
 * multi-engine, multi-battery, and multi-tank configurations.
 */

import { log } from '../../utils/logging/logger';

export interface PgnData {
  pgn: number;
  sourceAddress: number;
  instance?: number;
  data: Record<string, any>;
  timestamp: number;
}

export interface EnginePgnData extends PgnData {
  // PGN 127488: Engine Parameters, Rapid Update
  engineSpeed?: number; // RPM
  engineBoostPressure?: number; // kPa
  engineTiltTrim?: number; // %
}

export interface BatteryPgnData extends PgnData {
  // PGN 127508: Battery Status
  batteryVoltage?: number; // V
  batteryCurrent?: number; // A
  batteryTemperature?: number; // K
  instance: number; // Required for batteries
}

export interface TankPgnData extends PgnData {
  // PGN 127505: Fluid Level
  fluidType: number; // 0=Fuel, 1=Water, 2=Gray water, 3=Live well, 4=Oil, 5=Black water
  level?: number; // % (0-100)
  capacity?: number; // L
  instance: number; // Required for tanks
}

export class PgnParser {
  constructor() {
    // Self-contained PGN parser - no external dependencies
  }

  /**
   * Parse a PGN message and extract instance information
   */
  public parsePgn(pgnNumber: number, data: string, sourceAddress?: number): PgnData | null {
    try {
      const timestamp = Date.now();

      // Manual PGN parsing - self-contained implementation
      const parsedData = this.manualParsePgn(pgnNumber, data);

      const basePgnData: PgnData = {
        pgn: pgnNumber,
        sourceAddress: sourceAddress || 0,
        data: parsedData,
        timestamp,
      };

      // Add instance information if present
      if (parsedData.instance !== undefined) {
        basePgnData.instance = parsedData.instance;
      }

      return basePgnData;
    } catch (error) {
      log.app('[PgnParser] Error parsing PGN', () => ({
        pgnNumber,
        error: error instanceof Error ? error.message : String(error),
      }));
      return null;
    }
  }

  /**
   * Parse engine-specific PGN data
   */
  public parseEnginePgn(
    pgnNumber: number,
    data: string,
    sourceAddress: number,
  ): EnginePgnData | null {
    const basePgn = this.parsePgn(pgnNumber, data, sourceAddress);
    if (!basePgn) return null;

    const engineData: EnginePgnData = {
      ...basePgn,
      sourceAddress, // Engine instance is determined by source address
    };

    // Parse specific engine parameters based on PGN
    switch (pgnNumber) {
      case 127488: // Engine Parameters, Rapid Update
        if (basePgn.data.engineSpeed !== undefined) {
          engineData.engineSpeed = basePgn.data.engineSpeed;
        }
        if (basePgn.data.engineBoostPressure !== undefined) {
          engineData.engineBoostPressure = basePgn.data.engineBoostPressure;
        }
        if (basePgn.data.engineTiltTrim !== undefined) {
          engineData.engineTiltTrim = basePgn.data.engineTiltTrim;
        }
        break;
    }

    return engineData;
  }

  /**
   * Parse battery-specific PGN data
   */
  public parseBatteryPgn(
    pgnNumber: number,
    data: string,
    sourceAddress?: number,
  ): BatteryPgnData | null {
    const basePgn = this.parsePgn(pgnNumber, data, sourceAddress);
    if (!basePgn || basePgn.instance === undefined) return null;

    const batteryData: BatteryPgnData = {
      ...basePgn,
      instance: basePgn.instance,
    };

    // Parse specific battery parameters based on PGN
    switch (pgnNumber) {
      case 127508: // Battery Status
        if (basePgn.data.batteryVoltage !== undefined) {
          batteryData.batteryVoltage = basePgn.data.batteryVoltage;
        }
        if (basePgn.data.batteryCurrent !== undefined) {
          batteryData.batteryCurrent = basePgn.data.batteryCurrent;
        }
        if (basePgn.data.batteryTemperature !== undefined) {
          batteryData.batteryTemperature = basePgn.data.batteryTemperature;
        }
        break;
      case 127513: // Battery Configuration Status
        // Additional battery configuration data can be parsed here
        break;
    }

    return batteryData;
  }

  /**
   * Parse tank-specific PGN data
   */
  public parseTankPgn(pgnNumber: number, data: string, sourceAddress?: number): TankPgnData | null {
    const basePgn = this.parsePgn(pgnNumber, data, sourceAddress);
    if (!basePgn || basePgn.instance === undefined) return null;

    const tankData: TankPgnData = {
      ...basePgn,
      instance: basePgn.instance,
      fluidType: basePgn.data.fluidType || 0, // Default to fuel
    };

    // Parse specific tank parameters based on PGN
    switch (pgnNumber) {
      case 127505: // Fluid Level
        if (basePgn.data.level !== undefined) {
          tankData.level = basePgn.data.level;
        }
        if (basePgn.data.capacity !== undefined) {
          tankData.capacity = basePgn.data.capacity;
        }
        break;
    }

    return tankData;
  }

  /**
   * Parse depth PGN (128267)
   * Byte 0: SID (Sequence ID / Instance)
   * Bytes 1-4: Depth in 0.01m resolution
   */
  public parseDepthPgn(data: string): { depth: number; instance: number } | null {
    const bytes = this.hexStringToBytes(data);
    if (bytes.length < 5) return null;

    // Instance from SID byte (byte 0)
    const instance = bytes[0] || 0;

    // Depth in 0.01m resolution (bytes 1-4, little-endian 32-bit)
    const depthRaw = bytes[1] | (bytes[2] << 8) | (bytes[3] << 16) | (bytes[4] << 24);
    if (depthRaw === 0xffffffff) return null; // Invalid

    return { depth: depthRaw * 0.01, instance };
  }

  /**
   * Parse speed PGN (128259)
   * Byte 0: SID (Sequence ID / Instance)
   * Bytes 1-2: Speed in 0.01 m/s resolution
   */
  public parseSpeedPgn(data: string): { speed: number; instance: number } | null {
    const bytes = this.hexStringToBytes(data);
    if (bytes.length < 5) return null;

    // Instance from SID byte (byte 0)
    const instance = bytes[0] || 0;

    // Speed in 0.01 m/s resolution (bytes 1-2, little-endian 16-bit)
    const speedRaw = bytes[1] | (bytes[2] << 8);
    if (speedRaw === 0xffff) return null; // Invalid

    return { speed: speedRaw * 0.01 * 1.94384, instance }; // Convert m/s to knots
  }

  /**
   * Parse wind PGN (130306)
   * Byte 0: SID (Sequence ID / Instance)
   * Bytes 1-2: Wind speed in 0.01 m/s resolution
   * Bytes 3-4: Wind angle in 0.0001 radians resolution
   */
  public parseWindPgn(
    data: string,
  ): { windSpeed: number; windAngle: number; instance: number } | null {
    const bytes = this.hexStringToBytes(data);
    if (bytes.length < 6) return null;

    // Instance from SID byte (byte 0)
    const instance = bytes[0] || 0;

    // Wind speed in 0.01 m/s resolution (bytes 1-2, little-endian 16-bit)
    const speedRaw = bytes[1] | (bytes[2] << 8);
    // Wind angle in 0.0001 radians resolution (bytes 3-4, little-endian 16-bit)
    const angleRaw = bytes[3] | (bytes[4] << 8);

    if (speedRaw === 0xffff || angleRaw === 0xffff) return null;

    return {
      windSpeed: speedRaw * 0.01 * 1.94384, // Convert m/s to knots
      windAngle: angleRaw * 0.0001 * (180 / Math.PI), // Convert radians to degrees
      instance,
    };
  }

  /**
   * Parse GPS PGN (129029) - Fast Packet
   * Byte 0: SID (Sequence ID / Instance)
   * Bytes 5-8: Latitude in 1e-7 degree resolution
   * Bytes 9-12: Longitude in 1e-7 degree resolution
   */
  public parseGPSPgn(
    data: string,
  ): { latitude: number; longitude: number; instance: number } | null {
    const bytes = this.hexStringToBytes(data);
    if (bytes.length < 13) return null;

    // Instance from SID byte (byte 0)
    const instance = bytes[0] || 0;

    // Latitude in 1e-7 degree resolution (bytes 5-8, little-endian 32-bit signed)
    const latRaw = bytes[5] | (bytes[6] << 8) | (bytes[7] << 16) | (bytes[8] << 24);
    // Longitude in 1e-7 degree resolution (bytes 9-12, little-endian 32-bit signed)
    const lonRaw = bytes[9] | (bytes[10] << 8) | (bytes[11] << 16) | (bytes[12] << 24);

    if (latRaw === 0x7fffffff || lonRaw === 0x7fffffff) return null;

    // Convert to signed 32-bit
    const latitude = (latRaw > 0x7fffffff ? latRaw - 0x100000000 : latRaw) * 1e-7;
    const longitude = (lonRaw > 0x7fffffff ? lonRaw - 0x100000000 : lonRaw) * 1e-7;

    return { latitude, longitude, instance };
  }

  /**
   * Parse heading PGN (127250)
   * Byte 0: SID (Sequence ID / Instance)
   * Bytes 1-2: Heading in 0.0001 radians resolution
   */
  public parseHeadingPgn(data: string): { heading: number; instance: number } | null {
    const bytes = this.hexStringToBytes(data);
    if (bytes.length < 3) return null;

    // Instance from SID byte (byte 0)
    const instance = bytes[0] || 0;

    // Heading in 0.0001 radians resolution (bytes 1-2, little-endian 16-bit)
    const headingRaw = bytes[1] | (bytes[2] << 8);
    if (headingRaw === 0xffff) return null;

    return { heading: headingRaw * 0.0001 * (180 / Math.PI), instance }; // Convert radians to degrees
  }

  /**
   * Parse temperature PGN (130310)
   * Byte 0: SID (Sequence ID / Instance)
   * Byte 1: Temperature Instance/Source (0=Sea, 1=Outside, 2=Inside, 3=Engine Room, 4=Main Cabin, etc.)
   * Bytes 3-4: Temperature in 0.01K resolution
   */
  /**
   * Parse environmental data from PGN 130310 (Extended Temperature)
   * Byte 0: SID (instance)
   * Byte 1: Source (0=sea, 1=outside air, 2=inside air, 3+=specific locations)
   * Bytes 2-3: Temperature (0.01K, little-endian, unsigned)
   * Bytes 4-5: Humidity (0.004%, little-endian, unsigned) - OPTIONAL
   * Bytes 6-7: Pressure (100 Pa, little-endian, unsigned) - OPTIONAL
   */
  public parseTemperaturePgn(data: string): {
    temperature?: number;
    humidity?: number;
    pressure?: number;
    instance: number;
    source: number;
  } | null {
    const bytes = this.hexStringToBytes(data);
    if (bytes.length < 4) return null;

    // Instance from SID byte (byte 0) - can be used to differentiate multiple temp sensors
    const instance = bytes[0] || 0;
    // Temperature source (byte 1) - identifies location/type of temperature sensor
    const source = bytes[1] || 0;

    const result: {
      temperature?: number;
      humidity?: number;
      pressure?: number;
      instance: number;
      source: number;
    } = {
      instance: source, // Use source as instance for temperature differentiation
      source,
    };

    // Temperature in 0.01K resolution (bytes 2-3, little-endian 16-bit)
    if (bytes.length >= 4) {
      const tempRaw = bytes[2] | (bytes[3] << 8);
      if (tempRaw !== 0xffff) {
        result.temperature = tempRaw * 0.01 - 273.15; // Convert Kelvin to Celsius
      }
    }

    // Humidity in 0.004% resolution (bytes 4-5, little-endian 16-bit) - Optional
    if (bytes.length >= 6) {
      const humidRaw = bytes[4] | (bytes[5] << 8);
      if (humidRaw !== 0xffff) {
        result.humidity = humidRaw * 0.004; // Convert to percentage
      }
    }

    // Pressure in 100 Pa resolution (bytes 6-7, little-endian 16-bit) - Optional
    if (bytes.length >= 8) {
      const pressureRaw = bytes[6] | (bytes[7] << 8);
      if (pressureRaw !== 0xffff) {
        result.pressure = pressureRaw * 100; // Convert to Pascals
      }
    }

    // Return null if no valid fields parsed
    if (
      result.temperature === undefined &&
      result.humidity === undefined &&
      result.pressure === undefined
    ) {
      return null;
    }

    return result;
  }

  /**
   * Parse environmental data from PGN 130311 (Environmental Parameters - Atmospheric)
   * Byte 0: SID (instance)
   * Byte 1: Source (1=outside air, 2=inside air, etc.)
   * Bytes 2-3: Temperature (0.01K, little-endian, unsigned)
   * Bytes 4-5: Humidity (0.004%, little-endian, unsigned)
   * Bytes 6-7: Pressure (1 hPa = 100 Pa, little-endian, unsigned)
   */
  public parseEnvironmentalPgn(data: string): {
    temperature?: number;
    humidity?: number;
    pressure?: number;
    instance: number;
    source: number;
  } | null {
    const bytes = this.hexStringToBytes(data);
    if (bytes.length < 8) return null;

    const instance = bytes[0] || 0;
    const source = bytes[1] || 1; // Default to outside air

    const result: {
      temperature?: number;
      humidity?: number;
      pressure?: number;
      instance: number;
      source: number;
    } = {
      instance,
      source,
    };

    // Temperature in 0.01K resolution (bytes 2-3)
    const tempRaw = bytes[2] | (bytes[3] << 8);
    if (tempRaw !== 0xffff) {
      result.temperature = tempRaw * 0.01 - 273.15;
    }

    // Humidity in 0.004% resolution (bytes 4-5)
    const humidRaw = bytes[4] | (bytes[5] << 8);
    if (humidRaw !== 0xffff) {
      result.humidity = humidRaw * 0.004;
    }

    // Pressure in 1 hPa resolution (bytes 6-7) - NOTE: 1 hPa = 100 Pa
    const pressureRaw = bytes[6] | (bytes[7] << 8);
    if (pressureRaw !== 0xffff) {
      result.pressure = pressureRaw * 100; // Convert hPa to Pascals
    }

    // Return null if no valid fields
    if (
      result.temperature === undefined &&
      result.humidity === undefined &&
      result.pressure === undefined
    ) {
      return null;
    }

    return result;
  }

  /**
   * Parse rudder PGN (127245)
   */
  public parseRudderPgn(data: string): { rudderAngle: number } | null {
    const bytes = this.hexStringToBytes(data);
    if (bytes.length < 6) return null;

    // Rudder angle in 0.0001 radians resolution (bytes 4-5, little-endian 16-bit signed)
    const angleRaw = bytes[4] | (bytes[5] << 8);
    if (angleRaw === 0xffff) return null;

    // Convert to signed 16-bit
    const angleSigned = angleRaw > 0x7fff ? angleRaw - 0x10000 : angleRaw;
    return { rudderAngle: angleSigned * 0.0001 * (180 / Math.PI) }; // Convert radians to degrees
  }

  /**
   * Parse Cross Track Error PGN (129283)
   * Navigation - Cross Track Error
   */
  public parseCrossTrackErrorPgn(
    data: string,
  ): { crossTrackError: number; steerDirection?: 'left' | 'right' } | null {
    const bytes = this.hexStringToBytes(data);
    if (bytes.length < 6) return null;

    // XTE Mode (byte 0): 0=Autonomous, 1=Differential, 2=Estimated, 3=Simulator, 4=Manual
    // Navigation Terminated (byte 1): 0=No, 1=Yes

    // Cross Track Error in meters (bytes 2-5, little-endian 32-bit signed)
    const xteRaw = bytes[2] | (bytes[3] << 8) | (bytes[4] << 16) | (bytes[5] << 24);
    if (xteRaw === 0x7fffffff) return null;

    // Convert to signed 32-bit and convert meters to nautical miles
    const xteSigned = xteRaw > 0x7fffffff ? xteRaw - 0x100000000 : xteRaw;
    const xteNauticalMiles = xteSigned / 1852.0; // 1 nautical mile = 1852 meters

    return {
      crossTrackError: xteNauticalMiles,
      steerDirection: xteSigned < 0 ? 'left' : 'right',
    };
  }

  /**
   * Parse Navigation Data PGN (129284)
   * Navigation - Navigation Data
   */
  public parseNavigationDataPgn(data: string): {
    distanceToWaypoint?: number;
    bearingToWaypoint?: number;
    originWaypointId?: number;
    destinationWaypointId?: number;
    waypointClosingVelocity?: number;
    perpendicularPassed?: boolean;
    arrivalCircleEntered?: boolean;
  } | null {
    const bytes = this.hexStringToBytes(data);
    if (bytes.length < 21) return null;

    const result: any = {};

    // Distance to waypoint (bytes 0-3, little-endian 32-bit unsigned) in meters
    const distRaw = bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24);
    if (distRaw !== 0xffffffff) {
      result.distanceToWaypoint = distRaw / 1852.0; // Convert meters to nautical miles
    }

    // Bearing reference (byte 4): 0=True, 1=Magnetic
    // Perpendicular Crossed (byte 5): 0=No, 1=Yes
    result.perpendicularPassed = bytes[5] === 1;

    // Arrival Circle Entered (byte 6): 0=No, 1=Yes
    result.arrivalCircleEntered = bytes[6] === 1;

    // Bearing to waypoint (bytes 8-9, little-endian 16-bit unsigned) in 0.0001 radians
    const bearingRaw = bytes[8] | (bytes[9] << 8);
    if (bearingRaw !== 0xffff) {
      result.bearingToWaypoint = bearingRaw * 0.0001 * (180 / Math.PI); // Convert to degrees
    }

    // Origin waypoint ID (bytes 10-13, little-endian 32-bit)
    const originId = bytes[10] | (bytes[11] << 8) | (bytes[12] << 16) | (bytes[13] << 24);
    if (originId !== 0xffffffff) {
      result.originWaypointId = originId;
    }

    // Destination waypoint ID (bytes 14-17, little-endian 32-bit)
    const destId = bytes[14] | (bytes[15] << 8) | (bytes[16] << 16) | (bytes[17] << 24);
    if (destId !== 0xffffffff) {
      result.destinationWaypointId = destId;
    }

    // Waypoint closing velocity (bytes 18-19, little-endian 16-bit signed) in 0.01 m/s
    const velocityRaw = bytes[18] | (bytes[19] << 8);
    if (velocityRaw !== 0xffff) {
      const velocitySigned = velocityRaw > 0x7fff ? velocityRaw - 0x10000 : velocityRaw;
      result.waypointClosingVelocity = velocitySigned * 0.01 * 1.94384; // Convert m/s to knots
    }

    return Object.keys(result).length > 0 ? result : null;
  }

  /**
   * Parse Route/WP Information PGN (129285)
   * Navigation - Route/Waypoint Information
   */
  public parseRouteWaypointPgn(data: string): {
    waypointId?: number;
    waypointName?: string;
    waypointLatitude?: number;
    waypointLongitude?: number;
  } | null {
    const bytes = this.hexStringToBytes(data);
    if (bytes.length < 21) return null;

    const result: any = {};

    // Start RPS# (bytes 0-1, little-endian 16-bit)
    // nItems (byte 2)
    // Database ID (bytes 3-4, little-endian 16-bit)
    // Route ID (bytes 5-6, little-endian 16-bit)
    // Navigation direction (byte 7): 0=Forward, 1=Reverse
    // Supplementary Route/WP data available (byte 8)

    // Waypoint ID (bytes 10-13, little-endian 32-bit)
    const waypointId = bytes[10] | (bytes[11] << 8) | (bytes[12] << 16) | (bytes[13] << 24);
    if (waypointId !== 0xffffffff) {
      result.waypointId = waypointId;
    }

    // Waypoint Name (bytes 14+, variable length string)
    // Try to extract ASCII name from remaining bytes
    let nameEndIndex = 14;
    while (
      nameEndIndex < bytes.length &&
      bytes[nameEndIndex] !== 0 &&
      bytes[nameEndIndex] !== 0xff
    ) {
      nameEndIndex++;
    }
    if (nameEndIndex > 14) {
      result.waypointName = String.fromCharCode(...bytes.slice(14, nameEndIndex));
    }

    // Note: Latitude/Longitude would follow name in variable-length message
    // For now, we'll handle just ID and name as these are most critical

    return Object.keys(result).length > 0 ? result : null;
  }

  /**
   * Manual PGN parsing for all supported PGN types
   * Self-contained implementation - no external dependencies
   */
  private manualParsePgn(pgnNumber: number, data: string): Record<string, any> {
    const parsed: Record<string, any> = {};

    try {
      // Convert hex string to bytes for parsing
      const bytes = this.hexStringToBytes(data);

      switch (pgnNumber) {
        case 127488: // Engine Parameters, Rapid Update
          if (bytes.length >= 8) {
            // Engine instance from byte 0
            parsed.instance = bytes[0];
            // Engine speed from bytes 1-2 (0.25 rpm resolution)
            parsed.engineSpeed = ((bytes[2] << 8) | bytes[1]) * 0.25;
          }
          break;

        case 127505: // Fluid Level
          if (bytes.length >= 8) {
            // Instance from byte 0
            parsed.instance = bytes[0] & 0x0f;
            // Fluid type from byte 0 (upper 4 bits)
            parsed.fluidType = (bytes[0] & 0xf0) >> 4;
            // Level from bytes 1-2 (0.004% resolution)
            parsed.level = ((bytes[2] << 8) | bytes[1]) * 0.004;
          }
          break;

        case 127508: // Battery Status
          if (bytes.length >= 8) {
            // Instance from byte 0
            parsed.instance = bytes[0];
            // Voltage from bytes 1-2 (0.01V resolution)
            parsed.batteryVoltage = ((bytes[2] << 8) | bytes[1]) * 0.01;
            // Current from bytes 3-4 (0.1A resolution, signed)
            const currentRaw = (bytes[4] << 8) | bytes[3];
            parsed.batteryCurrent = (currentRaw > 32767 ? currentRaw - 65536 : currentRaw) * 0.1;
            // Temperature from bytes 5-6 (0.01K resolution)
            const tempKRaw = ((bytes[6] << 8) | bytes[5]) * 0.01;
            parsed.batteryTemperature = tempKRaw; // Will be converted from K to C in processor
          }
          break;

        case 127513: // Battery Configuration Status
          if (bytes.length >= 8) {
            // Instance from byte 0
            parsed.instance = bytes[0];
            // Additional configuration parsing can be added here
          }
          break;
      }
    } catch (error) {
      log.app(`Manual parsing failed for PGN`, () => ({
        pgn: pgnNumber,
        error: error instanceof Error ? error.message : String(error),
      }));
    }

    return parsed;
  }

  /**
   * Convert hex string to byte array
   */
  private hexStringToBytes(hexString: string): number[] {
    const bytes: number[] = [];
    // Remove any spaces or non-hex characters
    const cleanHex = hexString.replace(/[^0-9A-Fa-f]/g, '');

    for (let i = 0; i < cleanHex.length; i += 2) {
      const byte = parseInt(cleanHex.substr(i, 2), 16);
      if (!isNaN(byte)) {
        bytes.push(byte);
      }
    }

    return bytes;
  }
}

// Export singleton
export const pgnParser = new PgnParser();
