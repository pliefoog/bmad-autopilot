/**
 * Pure NMEA Parser Component
 * 
 * Dedicated NMEA sentence parsing with no side effects.
 * Supports NMEA 0183 and NMEA 2000 (via DIN wrapper) messages.
 * 
 * Key Principles:
 * - Pure functions - no side effects
 * - Single responsibility - only parsing
 * - Comprehensive error handling
 * - Performance optimized
 */

export interface ParsedNmeaMessage {
  messageType: string;
  talker: string;
  fields: Record<string, any>;
  raw: string;
  timestamp: number;
  valid: boolean;
  errors?: string[];
}

export interface ParsingResult {
  success: boolean;
  data?: ParsedNmeaMessage;
  errors?: string[];
}

export class PureNmeaParser {
  private static instance: PureNmeaParser;
  
  // Performance tracking
  private parseCount = 0;
  private errorCount = 0;
  
  static getInstance(): PureNmeaParser {
    if (!PureNmeaParser.instance) {
      PureNmeaParser.instance = new PureNmeaParser();
    }
    return PureNmeaParser.instance;
  }

  /**
   * Parse a single NMEA sentence
   * @param sentence Raw NMEA sentence
   * @returns Parsing result with data or errors
   */
  parseSentence(sentence: string): ParsingResult {
    this.parseCount++;
    const timestamp = Date.now();
    
    try {
      // Basic validation
      const validationResult = this.validateSentence(sentence);
      if (!validationResult.valid) {
        this.errorCount++;
        return {
          success: false,
          errors: validationResult.errors
        };
      }

      // Extract header information
      const headerInfo = this.extractHeader(sentence);
      if (!headerInfo) {
        this.errorCount++;
        return {
          success: false,
          errors: ['Invalid NMEA header format']
        };
      }

      // Parse fields based on message type
      const fields = this.parseMessageFields(headerInfo.messageType, sentence);
      
      const parsedMessage: ParsedNmeaMessage = {
        messageType: headerInfo.messageType,
        talker: headerInfo.talker,
        fields,
        raw: sentence,
        timestamp,
        valid: true
      };

      return {
        success: true,
        data: parsedMessage
      };

    } catch (error) {
      this.errorCount++;
      return {
        success: false,
        errors: [`Parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Validate NMEA sentence format
   */
  private validateSentence(sentence: string): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Check basic format
    if (!sentence || typeof sentence !== 'string') {
      errors.push('Empty or invalid sentence');
    }

    // Check start character
    if (!sentence.startsWith('$') && !sentence.startsWith('!')) {
      errors.push('Invalid start character - must be $ or !');
    }

    // Check minimum length
    if (sentence.length < 6) {
      errors.push('Sentence too short');
    }

    // Check for required comma structure
    if (!sentence.includes(',')) {
      errors.push('Missing field separators');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Extract header information (talker + message type)
   */
  private extractHeader(sentence: string): { talker: string; messageType: string } | null {
    try {
      const firstComma = sentence.indexOf(',');
      if (firstComma === -1) return null;

      const header = sentence.substring(1, firstComma); // Remove $ or !
      
      if (header.length < 5) return null;

      // Handle PCDIN (Proprietary) format: PCDIN
      if (header.startsWith('PC')) {
        return {
          talker: header.substring(0, 2), // PC
          messageType: header.substring(2)  // DIN
        };
      }

      // Standard format: 2-char talker + 3-char message type
      return {
        talker: header.substring(0, 2),
        messageType: header.substring(2)
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse message fields based on message type
   */
  private parseMessageFields(messageType: string, sentence: string): Record<string, any> {
    const parts = sentence.split(',');
    
    // Remove checksum from last field if present
    if (parts.length > 0) {
      const lastField = parts[parts.length - 1];
      const asteriskIndex = lastField.indexOf('*');
      if (asteriskIndex !== -1) {
        parts[parts.length - 1] = lastField.substring(0, asteriskIndex);
      }
    }

    // Create generic field mapping
    const fields: Record<string, any> = {};
    for (let i = 1; i < parts.length; i++) {
      fields[`field_${i}`] = parts[i];
    }

    // Add message-specific parsing
    switch (messageType) {
      case 'GGA':
        return this.parseGGAFields(parts);
      case 'VTG':
        return this.parseVTGFields(parts);
      case 'DBT':
        return this.parseDBTFields(parts);
      case 'MWV':
        return this.parseMWVFields(parts);
      case 'DIN':
        return this.parseDINFields(parts);
      case 'RMC':
        return this.parseRMCFields(parts);
      case 'ZDA':
        return this.parseZDAFields(parts);
      case 'HDG':
        return this.parseHDGFields(parts);
      case 'RPM':
        return this.parseRPMFields(parts);
      case 'DPT':
        return this.parseDPTFields(parts);
      case 'DBK':
        return this.parseDBKFields(parts);
      case 'MTW':
        return this.parseMTWFields(parts);
      case 'VHW':
        return this.parseVHWFields(parts);
      default:
        // Return generic field mapping for unknown types
        return fields;
    }
  }

  /**
   * Parse GGA (GPS Fix Data) fields
   */
  private parseGGAFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1],  // Time
      field_2: parts[2],  // Latitude
      field_3: parts[3],  // Latitude direction
      field_4: parts[4],  // Longitude  
      field_5: parts[5],  // Longitude direction
      field_6: parts[6],  // Fix quality
      field_7: parts[7],  // Number of satellites
      field_8: parts[8],  // HDOP
      field_9: parts[9],  // Altitude
      field_10: parts[10], // Altitude unit
      field_11: parts[11], // Geoid height
      field_12: parts[12], // Geoid unit
      field_13: parts[13], // DGPS time
      field_14: parts[14], // DGPS station ID
      // Parsed values
      time: parts[1],
      latitude_raw: parts[2],
      latitude_dir: parts[3],
      longitude_raw: parts[4],
      longitude_dir: parts[5],
      fix_quality: parts[6] ? parseInt(parts[6]) : null,
      satellites: parts[7] ? parseInt(parts[7]) : null,
      hdop: parts[8] ? parseFloat(parts[8]) : null,
      altitude: parts[9] ? parseFloat(parts[9]) : null
    };
  }

  /**
   * Parse VTG (Track Made Good and Ground Speed) fields
   */
  private parseVTGFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1],  // Track degrees true
      field_2: parts[2],  // True indicator
      field_3: parts[3],  // Track degrees magnetic
      field_4: parts[4],  // Magnetic indicator
      field_5: parts[5],  // Speed knots
      field_6: parts[6],  // Knots indicator
      field_7: parts[7],  // Speed km/h
      field_8: parts[8],  // Km/h indicator
      field_9: parts[9],  // Mode
      // Parsed values
      track_true: parts[1] ? parseFloat(parts[1]) : null,
      track_magnetic: parts[3] ? parseFloat(parts[3]) : null,
      speed_knots: parts[5] ? parseFloat(parts[5]) : null,
      speed_kmh: parts[7] ? parseFloat(parts[7]) : null,
      mode: parts[9]
    };
  }

  /**
   * Parse DBT (Depth Below Transducer) fields
   */
  private parseDBTFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1],  // Depth feet
      field_2: parts[2],  // Feet unit
      field_3: parts[3],  // Depth meters
      field_4: parts[4],  // Meters unit
      field_5: parts[5],  // Depth fathoms
      field_6: parts[6],  // Fathoms unit
      // Parsed values
      depth_feet: parts[1] ? parseFloat(parts[1]) : null,
      depth_meters: parts[3] ? parseFloat(parts[3]) : null,
      depth_fathoms: parts[5] ? parseFloat(parts[5]) : null
    };
  }

  /**
   * Parse MWV (Wind Speed and Angle) fields
   */
  private parseMWVFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1],  // Wind angle
      field_2: parts[2],  // Reference (R=relative, T=true)
      field_3: parts[3],  // Wind speed
      field_4: parts[4],  // Speed unit
      field_5: parts[5],  // Status
      // Parsed values
      wind_angle: parts[1] ? parseFloat(parts[1]) : null,
      reference: parts[2],
      wind_speed: parts[3] ? parseFloat(parts[3]) : null,
      speed_unit: parts[4],
      status: parts[5]
    };
  }

  /**
   * Parse DIN (NMEA 2000 PGN wrapper) fields
   */
  private parseDINFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1],  // PGN in hex
      field_2: parts[2],  // Data field 1
      field_3: parts[3],  // Data field 2
      field_4: parts[4],  // Data field 3
      field_5: parts[5],  // Data field 4
      field_6: parts[6],  // Data field 5
      field_7: parts[7],  // Data field 6
      field_8: parts[8],  // Data field 7
      // Parsed values
      pgn_hex: parts[1],
      pgn_number: parts[1] ? parseInt(parts[1], 16) : null,
      data_fields: parts.slice(2, 9)
    };
  }

  /**
   * Parse RMC (Recommended Minimum) fields
   */
  private parseRMCFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1],  // Time
      field_2: parts[2],  // Status
      field_3: parts[3],  // Latitude
      field_4: parts[4],  // Latitude direction
      field_5: parts[5],  // Longitude
      field_6: parts[6],  // Longitude direction
      field_7: parts[7],  // Speed knots
      field_8: parts[8],  // Track true
      field_9: parts[9],  // Date
      field_10: parts[10], // Magnetic variation
      field_11: parts[11], // Variation direction
      field_12: parts[12], // Mode
      // Parsed values
      time: parts[1],
      status: parts[2],
      latitude_raw: parts[3],
      latitude_dir: parts[4],
      longitude_raw: parts[5],
      longitude_dir: parts[6],
      speed_knots: parts[7] ? parseFloat(parts[7]) : null,
      track_true: parts[8] ? parseFloat(parts[8]) : null,
      date: parts[9]
    };
  }

  /**
   * Parse ZDA (Time & Date) fields
   * Format: $--ZDA,hhmmss.ss,dd,mm,yyyy,xx,yy*hh
   */
  private parseZDAFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1],  // Time hhmmss.ss
      field_2: parts[2],  // Day dd
      field_3: parts[3],  // Month mm
      field_4: parts[4],  // Year yyyy
      field_5: parts[5],  // Local zone hours
      field_6: parts[6],  // Local zone minutes
      // Parsed values
      time: parts[1] || null,
      day: parts[2] ? parseInt(parts[2]) : null,
      month: parts[3] ? parseInt(parts[3]) : null,
      year: parts[4] ? parseInt(parts[4]) : null,
      lz_hours: parts[5] ? parseInt(parts[5]) : null,
      lz_minutes: parts[6] ? parseInt(parts[6]) : null
    };
  }

  /**
   * Parse HDG (Heading) fields
   */
  private parseHDGFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1],  // Magnetic heading
      field_2: parts[2],  // Magnetic deviation
      field_3: parts[3],  // Deviation direction
      field_4: parts[4],  // Magnetic variation
      field_5: parts[5],  // Variation direction
      // Parsed values
      magnetic_heading: parts[1] ? parseFloat(parts[1]) : null,
      magnetic_deviation: parts[2] ? parseFloat(parts[2]) : null,
      deviation_dir: parts[3],
      magnetic_variation: parts[4] ? parseFloat(parts[4]) : null,
      variation_dir: parts[5]
    };
  }

  /**
   * Parse DPT (Depth) fields
   */
  private parseDPTFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1],  // Depth meters
      field_2: parts[2],  // Offset
      field_3: parts[3],  // Maximum range
      // Parsed values
      depth_meters: parts[1] ? parseFloat(parts[1]) : null,
      offset: parts[2] ? parseFloat(parts[2]) : null,
      max_range: parts[3] ? parseFloat(parts[3]) : null
    };
  }

  /**
   * Parse VHW (Water Speed and Heading) fields
   * Format: $xxVHW,x.x,T,x.x,M,x.x,N,x.x,K*hh
   * Fields: 1=Heading True, 2=T, 3=Heading Magnetic, 4=M, 5=Speed Knots, 6=N, 7=Speed Km/h, 8=K
   */
  private parseVHWFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1],  // Heading degrees true
      field_2: parts[2],  // True indicator
      field_3: parts[3],  // Heading degrees magnetic
      field_4: parts[4],  // Magnetic indicator
      field_5: parts[5],  // Speed knots
      field_6: parts[6],  // Knots indicator
      field_7: parts[7],  // Speed km/h
      field_8: parts[8],  // Km/h indicator
      // Parsed values
      heading_true: parts[1] ? parseFloat(parts[1]) : null,
      heading_magnetic: parts[3] ? parseFloat(parts[3]) : null,
      speed_knots: parts[5] ? parseFloat(parts[5]) : null,
      speed_kmh: parts[7] ? parseFloat(parts[7]) : null
    };
  }

  /**
   * Get parsing statistics
   */
  getStats(): { parseCount: number; errorCount: number; successRate: number } {
    const successRate = this.parseCount > 0 ? ((this.parseCount - this.errorCount) / this.parseCount) * 100 : 0;
    return {
      parseCount: this.parseCount,
      errorCount: this.errorCount,
      successRate: Math.round(successRate * 100) / 100
    };
  }

  /**
   * Parse DBK (Depth Below Keel) fields  
   * Format: $xxDBK,<depth_feet>,f,<depth_meters>,M,<depth_fathoms>,F*hh
   * Fields: Same format as DBT but represents depth below keel
   */
  private parseDBKFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1],  // Depth feet
      field_2: parts[2],  // Feet unit
      field_3: parts[3],  // Depth meters
      field_4: parts[4],  // Meters unit
      field_5: parts[5],  // Depth fathoms
      field_6: parts[6],  // Fathoms unit
      // Parsed values
      depth_feet: parts[1] ? parseFloat(parts[1]) : null,
      depth_meters: parts[3] ? parseFloat(parts[3]) : null,
      depth_fathoms: parts[5] ? parseFloat(parts[5]) : null
    };
  }

  /**
   * Parse MTW (Mean Temperature of Water) fields
   * Format: $xxMTW,<temperature>,C*hh
   * Fields: 1=Temperature in Celsius, 2=Unit (C)
   */
  private parseMTWFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1],  // Temperature
      field_2: parts[2],  // Unit (C)
      // Parsed values
      temperature_celsius: parts[1] ? parseFloat(parts[1]) : null,
      unit: parts[2] || 'C'
    };
  }

  /**
   * Parse RPM (Engine RPM and Pitch) fields
   * Format: $xxRPM,<source>,<instance>,<rpm>,<status>*hh
   * Fields: 1=Source (E=Engine, P=Propeller), 2=Instance, 3=RPM Value, 4=Status (A=Active, V=Void)
   */
  private parseRPMFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1],  // Source
      field_2: parts[2],  // Instance
      field_3: parts[3],  // RPM Value
      field_4: parts[4],  // Status
      // Parsed values - these are the field names our NmeaSensorProcessor expects
      source: parts[1] || '',
      instance: parts[2] || '',
      rpm: parts[3] || '',
      status: parts[4] || ''
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.parseCount = 0;
    this.errorCount = 0;
  }
}

// Export singleton instance
export const pureNmeaParser = PureNmeaParser.getInstance();