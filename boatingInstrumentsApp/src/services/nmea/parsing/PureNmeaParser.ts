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

/**
 * Parse a single NMEA sentence
 * @param sentence Raw NMEA sentence
 * @returns Parsing result with data or errors
 */
export function parseSentence(sentence: string): ParsingResult {
    const timestamp = Date.now();

    try {
      // Basic validation
      const validationResult = validateSentence(sentence);
      if (!validationResult.valid) {
        return {
          success: false,
          errors: validationResult.errors,
        };
      }

      // Extract header information
      const headerInfo = extractHeader(sentence);
      if (!headerInfo) {
        return {
          success: false,
          errors: ['Invalid NMEA header format'],
        };
      }

      // Parse fields based on message type
      const fields = parseMessageFields(headerInfo.messageType, sentence);

      const parsedMessage: ParsedNmeaMessage = {
        messageType: headerInfo.messageType,
        talker: headerInfo.talker,
        fields,
        raw: sentence,
        timestamp,
        valid: true,
      };

      return {
        success: true,
        data: parsedMessage,
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

/**
 * Validate NMEA sentence format
 */
function validateSentence(sentence: string): { valid: boolean; errors?: string[] } {
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
      errors: errors.length > 0 ? errors : undefined,
    };
  }

/**
 * Extract header information (talker + message type)
 */
function extractHeader(sentence: string): { talker: string; messageType: string } | null {
    try {
      const firstComma = sentence.indexOf(',');
      if (firstComma === -1) return null;

      const header = sentence.substring(1, firstComma); // Remove $ or !

      if (header.length < 5) return null;

      // Handle BINARY format (NMEA 2000 binary PGN pseudo-sentence)
      if (header === 'BINARY') {
        return {
          talker: '',
          messageType: 'BINARY',
        };
      }

      // Handle PCDIN (Proprietary) format: PCDIN
      if (header.startsWith('PC')) {
        return {
          talker: header.substring(0, 2), // PC
          messageType: header.substring(2), // DIN
        };
      }

      // Standard format: 2-char talker + 3-char message type
      return {
        talker: header.substring(0, 2),
        messageType: header.substring(2),
      };
    } catch (error) {
      return null;
    }
  }

/**
 * Parse message fields based on message type
 */
function parseMessageFields(messageType: string, sentence: string): Record<string, any> {
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
      case 'RSA':
        return parseRSAFields(parts);
      case 'APB':
        return parseAPBFields(parts);
      case 'APA':
        return parseAPAFields(parts);
      case 'GGA':
        return parseGGAFields(parts);
      case 'VTG':
        return parseVTGFields(parts);
      case 'DBT':
        return parseDBTFields(parts);
      case 'MWV':
        return parseMWVFields(parts);
      case 'PCDIN':
        return parseDINFields(parts);
      case 'RMC':
        return parseRMCFields(parts);
      case 'ZDA':
        return parseZDAFields(parts);
      case 'HDG':
        return parseHDGFields(parts);
      case 'RPM':
        return parseRPMFields(parts);
      case 'DPT':
        return parseDPTFields(parts);
      case 'DBK':
        return parseDBKFields(parts);
      case 'MTW':
        return parseMTWFields(parts);
      case 'MDA':
        return parseMDAFields(parts);
      case 'MMB':
        return parseMMBFields(parts);
      case 'VHW':
        return parseVHWFields(parts);
      case 'VWR':
        return parseVWRFields(parts);
      case 'VWT':
        return parseVWTFields(parts);
      case 'VLW':
        return parseVLWFields(parts);
      case 'GLL':
        return parseGLLFields(parts);
      case 'HDM':
        return parseHDMFields(parts);
      case 'HDT':
        return parseHDTFields(parts);
      case 'BWC':
        return parseBWCFields(parts);
      case 'RMB':
        return parseRMBFields(parts);
      case 'XTE':
        return parseXTEFields(parts);
      case 'BOD':
        return parseBODFields(parts);
      case 'WPL':
        return parseWPLFields(parts);
      default:
        // Return generic field mapping for unknown types
        return fields;
    }
  }

  /**
   * Parse GGA (GPS Fix Data) fields
   */
function parseGGAFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1], // Time
      field_2: parts[2], // Latitude
      field_3: parts[3], // Latitude direction
      field_4: parts[4], // Longitude
      field_5: parts[5], // Longitude direction
      field_6: parts[6], // Fix quality
      field_7: parts[7], // Number of satellites
      field_8: parts[8], // HDOP
      field_9: parts[9], // Altitude
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
      fix_quality: parts[6] ? (isNaN(parseInt(parts[6], 10)) ? null : parseInt(parts[6], 10)) : null,
      satellites: parts[7] ? (isNaN(parseInt(parts[7], 10)) ? null : parseInt(parts[7], 10)) : null,
      hdop: parts[8] ? (isNaN(parseFloat(parts[8])) ? null : parseFloat(parts[8])) : null,
      altitude: parts[9] ? (isNaN(parseFloat(parts[9])) ? null : parseFloat(parts[9])) : null,
    };
  }

  /**
   * Parse VTG (Track Made Good and Ground Speed) fields
   */
function parseVTGFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1], // Track degrees true
      field_2: parts[2], // True indicator
      field_3: parts[3], // Track degrees magnetic
      field_4: parts[4], // Magnetic indicator
      field_5: parts[5], // Speed knots
      field_6: parts[6], // Knots indicator
      field_7: parts[7], // Speed km/h
      field_8: parts[8], // Km/h indicator
      field_9: parts[9], // Mode
      // Parsed values
      track_true: parts[1] ? (isNaN(parseFloat(parts[1])) ? null : parseFloat(parts[1])) : null,
      track_magnetic: parts[3] ? (isNaN(parseFloat(parts[3])) ? null : parseFloat(parts[3])) : null,
      speed_knots: parts[5] ? (isNaN(parseFloat(parts[5])) ? null : parseFloat(parts[5])) : null,
      speed_kmh: parts[7] ? (isNaN(parseFloat(parts[7])) ? null : parseFloat(parts[7])) : null,
      mode: parts[9],
    };
  }

  /**
   * Parse DBT (Depth Below Transducer) fields
   */
function parseDBTFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1], // Depth feet
      field_2: parts[2], // Feet unit
      field_3: parts[3], // Depth meters
      field_4: parts[4], // Meters unit
      field_5: parts[5], // Depth fathoms
      field_6: parts[6], // Fathoms unit
      // Parsed values
      depth_feet: parts[1] ? parseFloat(parts[1]) : null,
      depth_meters: parts[3] ? parseFloat(parts[3]) : null,
      depth_fathoms: parts[5] ? parseFloat(parts[5]) : null,
    };
  }

  /**
   * Parse MWV (Wind Speed and Angle) fields
   */
function parseMWVFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1], // Wind angle
      field_2: parts[2], // Reference (R=relative, T=true)
      field_3: parts[3], // Wind speed
      field_4: parts[4], // Speed unit
      field_5: parts[5], // Status
      // Parsed values
      wind_angle: parts[1] ? (isNaN(parseFloat(parts[1])) ? null : parseFloat(parts[1])) : null,
      reference: parts[2],
      wind_speed: parts[3] ? (isNaN(parseFloat(parts[3])) ? null : parseFloat(parts[3])) : null,
      speed_unit: parts[4],
      status: parts[5],
    };
  }

  /**
   * Parse DIN (NMEA 2000 PGN wrapper) fields
   */
function parseDINFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1], // PGN in hex
      field_2: parts[2], // Data field 1
      field_3: parts[3], // Data field 2
      field_4: parts[4], // Data field 3
      field_5: parts[5], // Data field 4
      field_6: parts[6], // Data field 5
      field_7: parts[7], // Data field 6
      field_8: parts[8], // Data field 7
      // Parsed values
      pgn_hex: parts[1],
      pgn_number: parts[1] ? parseInt(parts[1], 16) : null,
      data_fields: parts.slice(2, 9),
    };
  }

  /**
   * Parse RMC (Recommended Minimum) fields
   */
function parseRMCFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1], // Time
      field_2: parts[2], // Status
      field_3: parts[3], // Latitude
      field_4: parts[4], // Latitude direction
      field_5: parts[5], // Longitude
      field_6: parts[6], // Longitude direction
      field_7: parts[7], // Speed knots
      field_8: parts[8], // Track true
      field_9: parts[9], // Date
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
      date: parts[9],
    };
  }

  /**
   * Parse ZDA (Time & Date) fields
   * Format: $--ZDA,hhmmss.ss,dd,mm,yyyy,xx,yy*hh
   */
function parseZDAFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1], // Time hhmmss.ss
      field_2: parts[2], // Day dd
      field_3: parts[3], // Month mm
      field_4: parts[4], // Year yyyy
      field_5: parts[5], // Local zone hours
      field_6: parts[6], // Local zone minutes
      // Parsed values
      time: parts[1] || null,
      day: parts[2] ? (isNaN(parseInt(parts[2], 10)) ? null : parseInt(parts[2], 10)) : null,
      month: parts[3] ? (isNaN(parseInt(parts[3], 10)) ? null : parseInt(parts[3], 10)) : null,
      year: parts[4] ? (isNaN(parseInt(parts[4], 10)) ? null : parseInt(parts[4], 10)) : null,
      lz_hours: parts[5] ? (isNaN(parseInt(parts[5], 10)) ? null : parseInt(parts[5], 10)) : null,
      lz_minutes: parts[6] ? (isNaN(parseInt(parts[6], 10)) ? null : parseInt(parts[6], 10)) : null,
    };
  }

  /**
   * Parse HDG (Heading) fields
   */
function parseHDGFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1], // Magnetic heading
      field_2: parts[2], // Magnetic deviation
      field_3: parts[3], // Deviation direction
      field_4: parts[4], // Magnetic variation
      field_5: parts[5], // Variation direction
      // Parsed values
      magnetic_heading: parts[1] ? (isNaN(parseFloat(parts[1])) ? null : parseFloat(parts[1])) : null,
      magnetic_deviation: parts[2] ? (isNaN(parseFloat(parts[2])) ? null : parseFloat(parts[2])) : null,
      deviation_dir: parts[3],
      magnetic_variation: parts[4] ? (isNaN(parseFloat(parts[4])) ? null : parseFloat(parts[4])) : null,
      variation_dir: parts[5],
    };
  }

  /**
   * Parse DPT (Depth) fields
   */
function parseDPTFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1], // Depth meters
      field_2: parts[2], // Offset
      field_3: parts[3], // Maximum range
      // Parsed values
      depth_meters: parts[1] ? (isNaN(parseFloat(parts[1])) ? null : parseFloat(parts[1])) : null,
      offset: parts[2] ? (isNaN(parseFloat(parts[2])) ? null : parseFloat(parts[2])) : null,
      max_range: parts[3] ? (isNaN(parseFloat(parts[3])) ? null : parseFloat(parts[3])) : null,
    };
  }

  /**
   * Parse VHW (Water Speed and Heading) fields
   * Format: $xxVHW,x.x,T,x.x,M,x.x,N,x.x,K*hh
   * Fields: 1=Heading True, 2=T, 3=Heading Magnetic, 4=M, 5=Speed Knots, 6=N, 7=Speed Km/h, 8=K
   */
function parseVHWFields(parts: string[]): Record<string, any> {
    // Debug: Log VHW parsing
    if (Math.random() < 0.02) {
    }

    return {
      field_1: parts[1], // Heading degrees true
      field_2: parts[2], // True indicator
      field_3: parts[3], // Heading degrees magnetic
      field_4: parts[4], // Magnetic indicator
      field_5: parts[5], // Speed knots
      field_6: parts[6], // Knots indicator
      field_7: parts[7], // Speed km/h
      field_8: parts[8], // Km/h indicator
      // Parsed values
      heading_true: parts[1] ? (isNaN(parseFloat(parts[1])) ? null : parseFloat(parts[1])) : null,
      heading_magnetic: parts[3] ? (isNaN(parseFloat(parts[3])) ? null : parseFloat(parts[3])) : null,
      speed_knots: parts[5] ? (isNaN(parseFloat(parts[5])) ? null : parseFloat(parts[5])) : null,
      speed_kmh: parts[7] ? (isNaN(parseFloat(parts[7])) ? null : parseFloat(parts[7])) : null,
    };
  }

  /**
   * Parse VWR (Relative Wind Speed and Angle) fields
   * Format: $--VWR,x.x,a,x.x,N,x.x,M,x.x,K*hh
   * Example: $IIVWR,148.0,R,10.4,N,5.4,M,19.3,K*4A
   */
function parseVWRFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1], // Wind angle (0-180)
      field_2: parts[2], // Direction (L/R)
      field_3: parts[3], // Wind speed knots
      field_4: parts[4], // Knots indicator
      field_5: parts[5], // Wind speed m/s
      field_6: parts[6], // m/s indicator
      field_7: parts[7], // Wind speed km/h
      field_8: parts[8], // km/h indicator
      // Parsed values
      wind_angle: parts[1] ? parseFloat(parts[1]) : null,
      direction: parts[2],
      wind_speed_knots: parts[3] ? parseFloat(parts[3]) : null,
      wind_speed_ms: parts[5] ? parseFloat(parts[5]) : null,
      wind_speed_kmh: parts[7] ? parseFloat(parts[7]) : null,
    };
  }

  /**
   * Parse VWT (True Wind Speed and Angle) fields
   * Format: $--VWT,x.x,a,x.x,N,x.x,M,x.x,K*hh
   * Example: $IIVWT,120.0,L,15.2,N,7.8,M,28.1,K*5C
   */
function parseVWTFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1], // Wind angle (0-180)
      field_2: parts[2], // Direction (L/R)
      field_3: parts[3], // Wind speed knots
      field_4: parts[4], // Knots indicator
      field_5: parts[5], // Wind speed m/s
      field_6: parts[6], // m/s indicator
      field_7: parts[7], // Wind speed km/h
      field_8: parts[8], // km/h indicator
      // Parsed values
      wind_angle: parts[1] ? (isNaN(parseFloat(parts[1])) ? null : parseFloat(parts[1])) : null,
      direction: parts[2],
      wind_speed_knots: parts[3] ? (isNaN(parseFloat(parts[3])) ? null : parseFloat(parts[3])) : null,
      wind_speed_ms: parts[5] ? (isNaN(parseFloat(parts[5])) ? null : parseFloat(parts[5])) : null,
      wind_speed_kmh: parts[7] ? (isNaN(parseFloat(parts[7])) ? null : parseFloat(parts[7])) : null,
    };
  }

  /**
   * Parse VLW (Distance Log) fields
   * Format: $--VLW,x.x,N,x.x,N*hh
   * Fields: 1=Total distance, 2=N (nautical miles), 3=Trip distance, 4=N
   * Example: $IIVLW,1234.5,N,567.8,N*3E
   */
function parseVLWFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1], // Total distance
      field_2: parts[2], // Units (N = nautical miles)
      field_3: parts[3], // Trip distance
      field_4: parts[4], // Units (N = nautical miles)
      // Parsed values (convert to meters for SI units)
      total_distance: parts[1] && parts[2] === 'N' 
        ? (isNaN(parseFloat(parts[1])) ? null : parseFloat(parts[1]) * 1852) // NM to meters
        : null,
      trip_distance: parts[3] && parts[4] === 'N'
        ? (isNaN(parseFloat(parts[3])) ? null : parseFloat(parts[3]) * 1852) // NM to meters
        : null,
    };
  }

  /**
   * Parse GLL (Geographic Position - Latitude/Longitude) fields
   * Format: $--GLL,llll.ll,a,yyyyy.yy,a,hhmmss.ss,A,a*hh
   * Example: $GPGLL,4916.45,N,12311.12,W,225444,A,A*5C
   */
function parseGLLFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1], // Latitude
      field_2: parts[2], // Latitude direction (N/S)
      field_3: parts[3], // Longitude
      field_4: parts[4], // Longitude direction (E/W)
      field_5: parts[5], // UTC time
      field_6: parts[6], // Status (A=valid, V=invalid)
      field_7: parts[7], // Mode indicator (optional)
      // Parsed values
      latitude_raw: parts[1],
      latitude_dir: parts[2],
      longitude_raw: parts[3],
      longitude_dir: parts[4],
      time: parts[5],
      status: parts[6],
    };
  }

  /**
   * Parse HDM (Heading - Magnetic) fields
   * Format: $--HDM,x.x,M*hh
   * Example: $IIHDM,235.5,M*2E
   */
function parseHDMFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1], // Magnetic heading
      field_2: parts[2], // M indicator
      // Parsed values
      magnetic_heading: parts[1] ? parseFloat(parts[1]) : null,
    };
  }

  /**
   * Parse HDT (Heading - True) fields
   * Format: $--HDT,x.x,T*hh
   * Example: $IIHDT,274.5,T*1C
   */
function parseHDTFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1], // True heading
      field_2: parts[2], // T indicator
      // Parsed values
      true_heading: parts[1] ? parseFloat(parts[1]) : null,
    };
  }

  /**
   * Parse BWC (Bearing and Distance to Waypoint) fields
   * Format: $--BWC,hhmmss.ss,llll.ll,a,yyyyy.yy,a,x.x,T,x.x,M,x.x,N,c--c*hh
   * Example: $GPBWC,220516,5130.02,N,00046.34,W,213.8,T,218.0,M,0004.6,N,EGLM*11
   */
function parseBWCFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1], // UTC time
      field_2: parts[2], // Waypoint latitude
      field_3: parts[3], // Latitude direction
      field_4: parts[4], // Waypoint longitude
      field_5: parts[5], // Longitude direction
      field_6: parts[6], // Bearing true
      field_7: parts[7], // T indicator
      field_8: parts[8], // Bearing magnetic
      field_9: parts[9], // M indicator
      field_10: parts[10], // Distance nautical miles
      field_11: parts[11], // N indicator
      field_12: parts[12], // Waypoint ID
      // Parsed values
      time: parts[1],
      waypoint_lat: parts[2],
      waypoint_lat_dir: parts[3],
      waypoint_lon: parts[4],
      waypoint_lon_dir: parts[5],
      bearing_true: parts[6] ? parseFloat(parts[6]) : null,
      bearing_magnetic: parts[8] ? parseFloat(parts[8]) : null,
      distance_nm: parts[10] ? parseFloat(parts[10]) : null,
      waypoint_id: parts[12],
    };
  }

  /**
   * Parse RMB (Recommended Minimum Navigation Information) fields
   * Format: $--RMB,A,x.x,a,c--c,c--c,llll.ll,a,yyyyy.yy,a,x.x,x.x,x.x,A*hh
   * Example: $GPRMB,A,0.66,L,003,004,4917.24,N,12309.57,W,001.3,052.5,000.5,V*20
   */
function parseRMBFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1], // Status (A=valid, V=warning)
      field_2: parts[2], // Cross track error
      field_3: parts[3], // Steer direction (L/R)
      field_4: parts[4], // Origin waypoint ID
      field_5: parts[5], // Destination waypoint ID
      field_6: parts[6], // Destination latitude
      field_7: parts[7], // Latitude direction
      field_8: parts[8], // Destination longitude
      field_9: parts[9], // Longitude direction
      field_10: parts[10], // Range to destination
      field_11: parts[11], // Bearing to destination
      field_12: parts[12], // Velocity toward destination
      field_13: parts[13], // Arrival status (A=arrived, V=not arrived)
      // Parsed values
      status: parts[1],
      cross_track_error: parts[2] ? parseFloat(parts[2]) : null,
      steer_direction: parts[3],
      origin_waypoint: parts[4],
      dest_waypoint: parts[5],
      dest_lat: parts[6],
      dest_lat_dir: parts[7],
      dest_lon: parts[8],
      dest_lon_dir: parts[9],
      range_nm: parts[10] ? parseFloat(parts[10]) : null,
      bearing: parts[11] ? parseFloat(parts[11]) : null,
      vmg: parts[12] ? parseFloat(parts[12]) : null,
      arrival_status: parts[13],
    };
  }

  /**
   * Parse XTE (Cross-Track Error) fields
   * Format: $--XTE,A,A,x.x,a,N*hh
   * Example: $GPXTE,A,A,0.67,L,N*6F
   */
function parseXTEFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1], // Status 1 (A=valid, V=warning)
      field_2: parts[2], // Status 2 (A=valid, V=warning)
      field_3: parts[3], // Cross track error magnitude
      field_4: parts[4], // Direction to steer (L/R)
      field_5: parts[5], // Units (N=nautical miles)
      // Parsed values
      status: parts[1],
      cross_track_error: parts[3] ? parseFloat(parts[3]) : null,
      steer_direction: parts[4],
      units: parts[5],
    };
  }

  /**
   * Parse BOD (Bearing Origin to Destination) fields
   * Format: $--BOD,x.x,T,x.x,M,c--c,c--c*hh
   * Example: $GPBOD,099.3,T,105.6,M,POINTB,POINTA*48
   */
function parseBODFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1], // Bearing true
      field_2: parts[2], // T indicator
      field_3: parts[3], // Bearing magnetic
      field_4: parts[4], // M indicator
      field_5: parts[5], // Destination waypoint ID
      field_6: parts[6], // Origin waypoint ID
      // Parsed values
      bearing_true: parts[1] ? parseFloat(parts[1]) : null,
      bearing_magnetic: parts[3] ? parseFloat(parts[3]) : null,
      dest_waypoint: parts[5],
      origin_waypoint: parts[6],
    };
  }

  /**
   * Parse WPL (Waypoint Location) fields
   * Format: $--WPL,llll.ll,a,yyyyy.yy,a,c--c*hh
   * Example: $GPWPL,4917.16,N,12310.64,W,003*65
   */
function parseWPLFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1], // Latitude
      field_2: parts[2], // Latitude direction
      field_3: parts[3], // Longitude
      field_4: parts[4], // Longitude direction
      field_5: parts[5], // Waypoint ID
      // Parsed values
      latitude: parts[1],
      latitude_dir: parts[2],
      longitude: parts[3],
      longitude_dir: parts[4],
      waypoint_id: parts[5],
    };
  }

  /**
   * Parse DBK (Depth Below Keel) fields
   * Format: $xxDBK,<depth_feet>,f,<depth_meters>,M,<depth_fathoms>,F*hh
   * Fields: Same format as DBT but represents depth below keel
   */
function parseDBKFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1], // Depth feet
      field_2: parts[2], // Feet unit
      field_3: parts[3], // Depth meters
      field_4: parts[4], // Meters unit
      field_5: parts[5], // Depth fathoms
      field_6: parts[6], // Fathoms unit
      // Parsed values
      depth_feet: parts[1] ? parseFloat(parts[1]) : null,
      depth_meters: parts[3] ? parseFloat(parts[3]) : null,
      depth_fathoms: parts[5] ? parseFloat(parts[5]) : null,
    };
  }

  /**
   * Parse MTW (Mean Temperature of Water) fields
   * Format: $xxMTW,<temperature>,C*hh
   * Fields: 1=Temperature in Celsius, 2=Unit (C)
   */
function parseMTWFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1], // Temperature
      field_2: parts[2], // Unit (C)
      // Parsed values
      temperature_celsius: parts[1] ? parseFloat(parts[1]) : null,
      unit: parts[2] || 'C',
    };
  }

  /**
   * Parse RPM (Engine RPM and Pitch) fields
   * Format: $xxRPM,<source>,<instance>,<rpm>,<pitch>,<status>*hh
   * Fields: 1=Source (E=Engine, P=Propeller), 2=Instance, 3=RPM Value, 4=Pitch (%), 5=Status (A=Active, V=Void)
   */
function parseRPMFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1], // Source
      field_2: parts[2], // Instance
      field_3: parts[3], // RPM Value
      field_4: parts[4], // Pitch %
      field_5: parts[5], // Status
      // Parsed values - these are the field names our NmeaSensorProcessor expects
      source: parts[1] || '',
      instance: parts[2] || '',
      rpm: parts[3] || '',
      pitch: parts[4] || '',
      status: parts[5] || '',
    };
  }

  /**
   * Parse RSA (Rudder Sensor Angle) fields
   * Format: $xxRSA,<starboard>,<status>,<port>,<status>*hh
   * Fields: 1=Starboard rudder angle, 2=Status (A=valid), 3=Port rudder angle, 4=Status
   */
function parseRSAFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1],
      field_2: parts[2],
      field_3: parts[3],
      field_4: parts[4],
      starboard_angle: parts[1] ? parseFloat(parts[1]) : null,
      starboard_status: parts[2],
      port_angle: parts[3] ? parseFloat(parts[3]) : null,
      port_status: parts[4],
    };
  }

  /**
   * Parse APB (Autopilot Sentence B) fields
   * Format: $xxAPB,<status1>,<status2>,<xte_mag>,<dir>,<xte_units>,<status3>,<status4>,<bearing_origin>,<dir>,<dest_id>,<bearing_dest>,<dir>,<heading>,<dir>,<status5>*hh
   */
function parseAPBFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1],
      field_2: parts[2],
      field_3: parts[3],
      field_4: parts[4],
      field_5: parts[5],
      field_6: parts[6],
      field_7: parts[7],
      field_8: parts[8],
      field_9: parts[9],
      field_10: parts[10],
      field_11: parts[11],
      field_12: parts[12],
      field_13: parts[13],
      field_14: parts[14],
      field_15: parts[15],
      status_general: parts[1],
      status_cycle_lock: parts[2],
      cross_track_error: parts[3] ? parseFloat(parts[3]) : null,
      direction_to_steer: parts[4],
      cross_track_units: parts[5],
      status_arrival: parts[6],
      status_perpendicular: parts[7],
      bearing_origin_to_dest: parts[8] ? parseFloat(parts[8]) : null,
      bearing_type: parts[9],
      destination_id: parts[10],
      bearing_present_to_dest: parts[11] ? parseFloat(parts[11]) : null,
      bearing_present_type: parts[12],
      heading_to_steer: parts[13] ? parseFloat(parts[13]) : null,
      heading_type: parts[14],
      status_faa_mode: parts[15],
    };
  }

  /**
   * Parse APA (Autopilot Sentence A) fields
   * Format: $xxAPA,<status1>,<status2>,<xte_mag>,<dir>,<xte_units>,<status3>,<status4>,<bearing>,<dir>,<dest_id>*hh
   */
function parseAPAFields(parts: string[]): Record<string, any> {
    return {
      field_1: parts[1],
      field_2: parts[2],
      field_3: parts[3],
      field_4: parts[4],
      field_5: parts[5],
      field_6: parts[6],
      field_7: parts[7],
      field_8: parts[8],
      field_9: parts[9],
      field_10: parts[10],
      status_general: parts[1],
      status_cycle_lock: parts[2],
      cross_track_error: parts[3] ? parseFloat(parts[3]) : null,
      direction_to_steer: parts[4],
      cross_track_units: parts[5],
      status_arrival: parts[6],
      status_perpendicular: parts[7],
      bearing_to_dest: parts[8] ? parseFloat(parts[8]) : null,
      bearing_type: parts[9],
      destination_id: parts[10],
    };
  }

  /**
   * Parse MDA (Meteorological Composite) fields
   * Format: $IIMDA,<p_inches>,I,<p_bars>,B,<air_temp>,C,<water_temp>,C,<rel_humid>,<abs_humid>,<dew_point>,C,<wind_dir_true>,T,<wind_dir_mag>,M,<wind_speed_kts>,N,<wind_speed_ms>,M*hh
   * Fields: 1=Pressure(inHg), 2=I, 3=Pressure(bars), 4=B, 5=AirTemp(C), 6=C, 7=WaterTemp(C), 8=C, 9=RelHumid(%), 10=AbsHumid, 11=DewPoint(C), 12=C, 13-20=Wind data
   * Extract: Field 3 (pressure_bars × 100000 → Pa), 5 (air_temp), 9 (humidity), 11 (dew_point)
   * Ignore: Field 7 (water_temp - handled by MTW), 13-20 (wind - handled by MWV/VWR/VWT)
   */
function parseMDAFields(parts: string[]): Record<string, any> {
    const field3 = parts[3] ? parseFloat(parts[3]) : null; // Pressure in bars
    const field5 = parts[5] ? parseFloat(parts[5]) : null; // Air temperature C
    const field9 = parts[9] ? parseFloat(parts[9]) : null; // Humidity %
    const field11 = parts[11] ? parseFloat(parts[11]) : null; // Dew point C

    return {
      field_3: parts[3], // Pressure in bars
      field_5: parts[5], // Air temperature
      field_9: parts[9], // Humidity
      field_11: parts[11], // Dew point
      // Parsed values for processor
      pressure_bars: field3,
      pressure_pa: field3 !== null ? field3 * 100000 : null, // Convert bars to Pascals
      air_temperature_celsius: field5,
      humidity_percent: field9,
      dew_point_celsius: field11,
    };
  }

  /**
   * Parse MMB (Barometer) fields
   * Format: $IIMMB,<p_bars>,B,<p_inches>,I*hh
   * Fields: 1=Pressure(bars), 2=B, 3=Pressure(inHg), 4=I
   * Extract: Field 1 (pressure_bars × 100000 → Pa)
   */
function parseMMBFields(parts: string[]): Record<string, any> {
    const field1 = parts[1] ? parseFloat(parts[1]) : null; // Pressure in bars

    return {
      field_1: parts[1], // Pressure in bars
      // Parsed values for processor
      pressure_bars: field1,
      pressure_pa: field1 !== null ? field1 * 100000 : null, // Convert bars to Pascals
    };
  }
