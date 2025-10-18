/**
 * Enhanced PGN Parser for Instance-Aware NMEA 2000 Messages
 * 
 * Handles parsing of PGNs that contain instance information for
 * multi-engine, multi-battery, and multi-tank configurations.
 */

import { FromPgn } from '@canboat/canboatjs';

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
  private fromPgn: FromPgn;

  constructor() {
    this.fromPgn = new FromPgn();
  }

  /**
   * Parse a PGN message and extract instance information
   */
  public parsePgn(pgnNumber: number, data: string, sourceAddress?: number): PgnData | null {
    try {
      const timestamp = Date.now();
      
      // Use canboat library to parse the PGN if possible
      let parsedData: Record<string, any> = {};
      
      try {
        // Attempt to parse with canboat
        const parsed = this.fromPgn.parseString(`${timestamp},0,${pgnNumber},${sourceAddress || 0},255,${data.length},${data}`);
        if (parsed && parsed.fields) {
          parsedData = this.extractFieldsFromCanboat(parsed.fields);
        }
      } catch (canboatError) {
        // Fall back to manual parsing
        parsedData = this.manualParsePgn(pgnNumber, data);
      }

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
      console.error(`[PgnParser] Error parsing PGN ${pgnNumber}:`, error);
      return null;
    }
  }

  /**
   * Parse engine-specific PGN data
   */
  public parseEnginePgn(pgnNumber: number, data: string, sourceAddress: number): EnginePgnData | null {
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
  public parseBatteryPgn(pgnNumber: number, data: string, sourceAddress?: number): BatteryPgnData | null {
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
   * Extract fields from canboat parsed data
   */
  private extractFieldsFromCanboat(fields: any): Record<string, any> {
    const extracted: Record<string, any> = {};
    
    if (Array.isArray(fields)) {
      for (const field of fields) {
        if (field.name && field.value !== undefined) {
          // Convert canboat field names to our naming convention
          const fieldName = this.mapCanboatFieldName(field.name);
          extracted[fieldName] = field.value;
        }
      }
    }
    
    return extracted;
  }

  /**
   * Map canboat field names to our naming convention
   */
  private mapCanboatFieldName(canboatName: string): string {
    const fieldMap: Record<string, string> = {
      'Instance': 'instance',
      'Engine Speed': 'engineSpeed',
      'Engine Boost Pressure': 'engineBoostPressure',
      'Engine Tilt/Trim': 'engineTiltTrim',
      'Battery Voltage': 'batteryVoltage',
      'Battery Current': 'batteryCurrent',
      'Battery Temperature': 'batteryTemperature',
      'Fluid Type': 'fluidType',
      'Level': 'level',
      'Capacity': 'capacity',
    };
    
    return fieldMap[canboatName] || canboatName.toLowerCase().replace(/\s+/g, '');
  }

  /**
   * Manual PGN parsing as fallback when canboat fails
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
            parsed.instance = bytes[0] & 0x0F;
            // Fluid type from byte 0 (upper 4 bits)
            parsed.fluidType = (bytes[0] & 0xF0) >> 4;
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
            // Current from bytes 3-4 (0.1A resolution)
            parsed.batteryCurrent = ((bytes[4] << 8) | bytes[3]) * 0.1;
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
      console.warn(`[PgnParser] Manual parsing failed for PGN ${pgnNumber}:`, error);
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