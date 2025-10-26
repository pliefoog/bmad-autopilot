/**
 * Pure Data Transformer Component
 * 
 * Transforms parsed NMEA data into store-compatible format.
 * Handles validation, unit conversion, and coordinate parsing.
 * 
 * Key Principles:
 * - Pure transformation functions
 * - Data validation and quality checks
 * - Unit conversion and standardization
 * - Type-safe output format
 */

import type { ParsedNmeaMessage } from '../parsing/PureNmeaParser';

export interface TransformedNmeaData {
  // GPS data
  gpsPosition?: { latitude: number; longitude: number };
  gpsQuality?: {
    fixType?: number;
    satellites?: number;
    hdop?: number;
    altitude?: number;
  };
  gpsTimestamp?: number;
  utcTime?: number;

  // Speed and heading data
  stw?: number;      // Speed Through Water (from VHW/log)
  sog?: number;      // Speed Over Ground (from VTG/RMC/GPS)
  speedTimestamp?: number;
  heading?: number;
  headingTimestamp?: number;
  track?: number;
  trackTimestamp?: number;

  // Depth data
  depth?: number;
  depthSource?: 'DBT' | 'DPT' | 'DBK';
  depthReferencePoint?: 'transducer' | 'waterline' | 'keel';
  depthTimestamp?: number;
  // Multiple depth sources for priority selection (Raymarine-style)
  depthSources?: {
    DBT?: { value: number; timestamp: number; referencePoint: 'transducer' };
    DPT?: { value: number; timestamp: number; referencePoint: 'waterline' };
    DBK?: { value: number; timestamp: number; referencePoint: 'keel' };
  };

  // Wind data
  windSpeed?: number;
  windAngle?: number;
  windDirection?: number;
  windTimestamp?: number;

  // Engine data (from NMEA 2000 and NMEA 0183)
  engineRpm?: number;
  engineTemp?: number;
  enginePressure?: number;
  engineInstance?: number;  // Engine instance number (from RPM sentences)
  engineTimestamp?: number;

  // Tank data (from NMEA 2000)
  fuelLevel?: number;
  tankTimestamp?: number;

  // Autopilot data (from NMEA 2000)
  rudderAngle?: number;
  rudderTimestamp?: number;

  // Additional data
  waterTemperature?: number;
  waterTemperatureTimestamp?: number;
  relativeWindSpeed?: number;
  relativeWindAngle?: number;
}

export interface TransformationResult {
  success: boolean;
  data?: TransformedNmeaData;
  errors?: string[];
  messageType?: string;
}

export class PureDataTransformer {
  private static instance: PureDataTransformer;
  
  static getInstance(): PureDataTransformer {
    if (!PureDataTransformer.instance) {
      PureDataTransformer.instance = new PureDataTransformer();
    }
    return PureDataTransformer.instance;
  }

  /**
   * Transform parsed NMEA message to store format
   */
  transformMessage(parsedMessage: ParsedNmeaMessage): TransformationResult {
    try {
      const timestamp = Date.now();
      
      switch (parsedMessage.messageType) {
        case 'GGA':
          return this.transformGGA(parsedMessage, timestamp);
        case 'VTG':
          return this.transformVTG(parsedMessage, timestamp);
        case 'DBT':
          return this.transformDBT(parsedMessage, timestamp);
        case 'MWV':
          return this.transformMWV(parsedMessage, timestamp);
        case 'DIN':
          return this.transformDIN(parsedMessage, timestamp);
        case 'RMC':
          return this.transformRMC(parsedMessage, timestamp);
        case 'ZDA':
          return this.transformZDA(parsedMessage, timestamp);
        case 'HDG':
          return this.transformHDG(parsedMessage, timestamp);
        case 'DPT':
          return this.transformDPT(parsedMessage, timestamp);
        case 'DBK':
          return this.transformDBK(parsedMessage, timestamp);
        case 'MTW':
          return this.transformMTW(parsedMessage, timestamp);
        case 'VHW':
          return this.transformVHW(parsedMessage, timestamp);
        case 'RPM':
          return this.transformRPM(parsedMessage, timestamp);
        default:
          return {
            success: false,
            errors: [`Unsupported message type: ${parsedMessage.messageType}`],
            messageType: parsedMessage.messageType
          };
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Transformation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        messageType: parsedMessage.messageType
      };
    }
  }

  /**
   * Transform GGA (GPS Fix Data) message
   */
  private transformGGA(message: ParsedNmeaMessage, timestamp: number): TransformationResult {
    const fields = message.fields;
    
    // Parse coordinates
    const latitude = this.parseCoordinate(fields.latitude_raw, fields.latitude_dir);
    const longitude = this.parseCoordinate(fields.longitude_raw, fields.longitude_dir);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return {
        success: false,
        errors: ['Invalid GPS coordinates'],
        messageType: message.messageType
      };
    }

    const transformedData: TransformedNmeaData = {
      gpsPosition: { latitude, longitude },
      gpsQuality: {
        fixType: fields.fix_quality || 0,
        satellites: fields.satellites,
        hdop: fields.hdop,
        altitude: fields.altitude
      },
      gpsTimestamp: timestamp
    };

    return {
      success: true,
      data: transformedData,
      messageType: message.messageType
    };
  }

  /**
   * Transform VTG (Track Made Good and Ground Speed) message
   */
  private transformVTG(message: ParsedNmeaMessage, timestamp: number): TransformationResult {
    const fields = message.fields;
    
    const transformedData: TransformedNmeaData = {};

    // Speed over ground - VTG provides SOG specifically
    if (fields.speed_knots !== null && !isNaN(fields.speed_knots)) {
      transformedData.sog = fields.speed_knots;  // Speed Over Ground from GPS
      transformedData.speedTimestamp = timestamp;
    }

    // Track made good (true)
    if (fields.track_true !== null && !isNaN(fields.track_true)) {
      transformedData.track = fields.track_true;
      transformedData.trackTimestamp = timestamp;
    }

    if (Object.keys(transformedData).length === 0) {
      return {
        success: false,
        errors: ['No valid VTG data found'],
        messageType: message.messageType
      };
    }

    return {
      success: true,
      data: transformedData,
      messageType: message.messageType
    };
  }

  /**
   * Transform DBT (Depth Below Transducer) message
   */
  private transformDBT(message: ParsedNmeaMessage, timestamp: number): TransformationResult {
    const fields = message.fields;
    
    // Prefer meters, fall back to feet
    let depth: number | null = null;
    
    if (fields.depth_meters !== null && !isNaN(fields.depth_meters)) {
      depth = fields.depth_meters;
    } else if (fields.depth_feet !== null && !isNaN(fields.depth_feet)) {
      depth = fields.depth_feet * 0.3048; // Convert feet to meters
    }

    if (depth === null) {
      return {
        success: false,
        errors: ['No valid depth data found'],
        messageType: message.messageType
      };
    }

    const transformedData: TransformedNmeaData = {
      // Keep legacy fields for backward compatibility
      depth,
      depthSource: 'DBT',
      depthReferencePoint: 'transducer',
      depthTimestamp: timestamp,
      // Add to depthSources for priority selection
      depthSources: {
        DBT: { value: depth, timestamp, referencePoint: 'transducer' }
      }
    };

    return {
      success: true,
      data: transformedData,
      messageType: message.messageType
    };
  }

  /**
   * Transform MWV (Wind Speed and Angle) message
   */
  private transformMWV(message: ParsedNmeaMessage, timestamp: number): TransformationResult {
    const fields = message.fields;
    
    if (fields.wind_angle === null || fields.wind_speed === null) {
      return {
        success: false,
        errors: ['Invalid wind data'],
        messageType: message.messageType
      };
    }

    // Convert wind speed to consistent units (knots)
    let windSpeed = fields.wind_speed;
    if (fields.speed_unit === 'M') {
      windSpeed = windSpeed * 1.94384; // m/s to knots
    } else if (fields.speed_unit === 'K') {
      windSpeed = windSpeed * 0.539957; // km/h to knots
    }

    const transformedData: TransformedNmeaData = {
      windAngle: fields.wind_angle,
      windSpeed,
      windTimestamp: timestamp
    };

    // Set relative or true wind based on reference
    if (fields.reference === 'R') {
      transformedData.relativeWindAngle = fields.wind_angle;
      transformedData.relativeWindSpeed = windSpeed;
    }

    return {
      success: true,
      data: transformedData,
      messageType: message.messageType
    };
  }

  /**
   * Transform DIN (NMEA 2000 PGN wrapper) message
   */
  private transformDIN(message: ParsedNmeaMessage, timestamp: number): TransformationResult {
    const fields = message.fields;
    
    if (!fields.pgn_number) {
      return {
        success: false,
        errors: ['Invalid PGN data'],
        messageType: message.messageType
      };
    }

    // Transform based on PGN type
    switch (fields.pgn_number) {
      case 127245: // Rudder
        return this.transformRudderPGN(fields, timestamp);
      case 127250: // Vessel Heading
        return this.transformHeadingPGN(fields, timestamp);
      case 127488: // Engine Parameters, Rapid Update
        return this.transformEngineRapidPGN(fields, timestamp);
      case 127489: // Engine Parameters, Dynamic
        return this.transformEngineDynamicPGN(fields, timestamp);
      case 127505: // Fluid Level
        return this.transformFluidLevelPGN(fields, timestamp);
      case 128259: // Speed, Water referenced
        return this.transformWaterSpeedPGN(fields, timestamp);
      case 128267: // Water Depth
        return this.transformWaterDepthPGN(fields, timestamp);
      default:
        return {
          success: false,
          errors: [`Unsupported PGN: ${fields.pgn_number}`],
          messageType: message.messageType
        };
    }
  }

  /**
   * Transform RMC (Recommended Minimum) message
   */
  private transformRMC(message: ParsedNmeaMessage, timestamp: number): TransformationResult {
    const fields = message.fields;
    
    const transformedData: TransformedNmeaData = {};

    // GPS position
    if (fields.latitude_raw && fields.longitude_raw) {
      const latitude = this.parseCoordinate(fields.latitude_raw, fields.latitude_dir);
      const longitude = this.parseCoordinate(fields.longitude_raw, fields.longitude_dir);
      
      if (!isNaN(latitude) && !isNaN(longitude)) {
        transformedData.gpsPosition = { latitude, longitude };
        transformedData.gpsTimestamp = timestamp;
      }
    }

    // Speed over ground
    if (fields.speed_knots !== null && !isNaN(fields.speed_knots)) {
      transformedData.sog = fields.speed_knots;   // Speed Over Ground from GPS
      transformedData.speedTimestamp = timestamp;
    }

    // Track made good
    if (fields.track_true !== null && !isNaN(fields.track_true)) {
      transformedData.track = fields.track_true;
      transformedData.trackTimestamp = timestamp;
    }

    // UTC Date/Time from RMC (time: hhmmss[.ss], date: ddmmyy)
    if (fields.time && fields.date) {
      const utcMillis = this.parseRmcDateTimeToUtc(fields.time as string, fields.date as string);
      if (!isNaN(utcMillis)) {
        (transformedData as any).utcTime = utcMillis;
      }
    }

    return {
      success: true,
      data: transformedData,
      messageType: message.messageType
    };
  }

  /**
   * Transform ZDA (Time & Date) message
   */
  private transformZDA(message: ParsedNmeaMessage, timestamp: number): TransformationResult {
    const f = message.fields as any;
    const transformedData: TransformedNmeaData = {};
    if (f.time && f.day != null && f.month != null && f.year != null) {
      const utcMillis = this.parseZdaDateTimeToUtc(f.time as string, f.day as number, f.month as number, f.year as number);
      if (!isNaN(utcMillis)) {
        (transformedData as any).utcTime = utcMillis;
      }
    }
    return {
      success: true,
      data: transformedData,
      messageType: message.messageType
    };
  }

  /**
   * Convert RMC time+date into UTC milliseconds
   */
  private parseRmcDateTimeToUtc(time: string, date: string): number {
    // time: hhmmss[.ss], date: ddmmyy
    if (!time || !date || date.length < 6) return NaN;
    const hh = parseInt(time.substring(0, 2) || '0', 10);
    const mm = parseInt(time.substring(2, 4) || '0', 10);
    const ss = parseInt(time.substring(4, 6) || '0', 10);
    const ms = (() => {
      const dot = time.indexOf('.');
      if (dot !== -1) {
        const frac = time.substring(dot + 1);
        const f = parseInt((frac + '00').substring(0, 3), 10);
        return isNaN(f) ? 0 : f;
      }
      return 0;
    })();
    const dd = parseInt(date.substring(0, 2), 10);
    const mo = parseInt(date.substring(2, 4), 10);
    const yy = parseInt(date.substring(4, 6), 10);
    const fullYear = 2000 + (isNaN(yy) ? 0 : yy);
    // Construct UTC date
    const d = new Date(Date.UTC(fullYear, (mo - 1), dd, hh, mm, ss, ms));
    return d.getTime();
  }

  /**
   * Convert ZDA time+date into UTC milliseconds
   */
  private parseZdaDateTimeToUtc(time: string, day: number, month: number, year: number): number {
    if (!time || !day || !month || !year) return NaN;
    const hh = parseInt(time.substring(0, 2) || '0', 10);
    const mm = parseInt(time.substring(2, 4) || '0', 10);
    const ss = parseInt(time.substring(4, 6) || '0', 10);
    const ms = (() => {
      const dot = time.indexOf('.');
      if (dot !== -1) {
        const frac = time.substring(dot + 1);
        const f = parseInt((frac + '00').substring(0, 3), 10);
        return isNaN(f) ? 0 : f;
      }
      return 0;
    })();
    const d = new Date(Date.UTC(year, (month - 1), day, hh, mm, ss, ms));
    return d.getTime();
  }

  /**
   * Transform HDG (Heading) message
   */
  private transformHDG(message: ParsedNmeaMessage, timestamp: number): TransformationResult {
    const fields = message.fields;
    
    if (fields.magnetic_heading === null || isNaN(fields.magnetic_heading)) {
      return {
        success: false,
        errors: ['Invalid heading data'],
        messageType: message.messageType
      };
    }

    const transformedData: TransformedNmeaData = {
      heading: fields.magnetic_heading,
      headingTimestamp: timestamp
    };

    return {
      success: true,
      data: transformedData,
      messageType: message.messageType
    };
  }

  /**
   * Transform DPT (Depth) message
   */
  private transformDPT(message: ParsedNmeaMessage, timestamp: number): TransformationResult {
    const fields = message.fields;
    
    if (fields.depth_meters === null || isNaN(fields.depth_meters)) {
      return {
        success: false,
        errors: ['Invalid depth data'],
        messageType: message.messageType
      };
    }

    const transformedData: TransformedNmeaData = {
      // Keep legacy fields for backward compatibility
      depth: fields.depth_meters,
      depthSource: 'DPT',
      depthReferencePoint: 'waterline',  // DPT typically represents waterline depth
      depthTimestamp: timestamp,
      // Add to depthSources for priority selection
      depthSources: {
        DPT: { value: fields.depth_meters, timestamp, referencePoint: 'waterline' }
      }
    };

    return {
      success: true,
      data: transformedData,
      messageType: message.messageType
    };
  }

  /**
   * Transform VHW (Water Speed and Heading) message
   */
  private transformVHW(message: ParsedNmeaMessage, timestamp: number): TransformationResult {
    const fields = message.fields;
    
    const transformedData: TransformedNmeaData = {};

        // Speed through water - VHW provides STW specifically
    if (fields.speed_knots !== null && !isNaN(fields.speed_knots)) {
      transformedData.stw = fields.speed_knots;  // Speed Through Water
      transformedData.speedTimestamp = timestamp;
    }

    // Heading (true or magnetic)
    if (fields.heading_true !== null && !isNaN(fields.heading_true)) {
      transformedData.heading = fields.heading_true;
      transformedData.headingTimestamp = timestamp;
    } else if (fields.heading_magnetic !== null && !isNaN(fields.heading_magnetic)) {
      transformedData.heading = fields.heading_magnetic;
      transformedData.headingTimestamp = timestamp;
    }

    if (Object.keys(transformedData).length === 0) {
      return {
        success: false,
        errors: ['No valid VHW data found'],
        messageType: message.messageType
      };
    }

    return {
      success: true,
      data: transformedData,
      messageType: message.messageType
    };
  }

  /**
   * Transform DBK (Depth Below Keel) message
   * DBK format is identical to DBT but represents depth below keel rather than transducer
   */
  private transformDBK(message: ParsedNmeaMessage, timestamp: number): TransformationResult {
    const fields = message.fields;
    
    // Prefer meters, fall back to feet
    let depth: number | null = null;
    
    if (fields.depth_meters !== null && !isNaN(fields.depth_meters)) {
      depth = fields.depth_meters;
    } else if (fields.depth_feet !== null && !isNaN(fields.depth_feet)) {
      depth = fields.depth_feet * 0.3048; // Convert feet to meters
    }

    if (depth === null) {
      return {
        success: false,
        errors: ['No valid depth data found'],
        messageType: message.messageType
      };
    }

    const transformedData: TransformedNmeaData = {
      // Keep legacy fields for backward compatibility
      depth: depth,  // DBK represents depth below keel
      depthSource: 'DBK',
      depthReferencePoint: 'keel',
      depthTimestamp: timestamp,
      // Add to depthSources for priority selection
      depthSources: {
        DBK: { value: depth, timestamp, referencePoint: 'keel' }
      }
    };

    return {
      success: true,
      data: transformedData,
      messageType: message.messageType
    };
  }

  /**
   * Transform MTW (Mean Temperature of Water) message
   */
  private transformMTW(message: ParsedNmeaMessage, timestamp: number): TransformationResult {
    const fields = message.fields;
    
    if (fields.temperature_celsius === null || isNaN(fields.temperature_celsius)) {
      return {
        success: false,
        errors: ['Invalid water temperature data'],
        messageType: message.messageType
      };
    }

    const transformedData: TransformedNmeaData = {
      waterTemperature: fields.temperature_celsius,
      waterTemperatureTimestamp: timestamp
    };

    return {
      success: true,
      data: transformedData,
      messageType: message.messageType
    };
  }

  /**
   * Parse NMEA coordinate format (DDMM.MMMM) to decimal degrees
   */
  private parseCoordinate(value: string, direction: string): number {
    if (!value || !direction) return NaN;
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return NaN;
    
    // Convert DDMM.MMMM format to decimal degrees
    const degrees = Math.floor(numValue / 100);
    const minutes = numValue - (degrees * 100);
    let decimal = degrees + (minutes / 60);
    
    // Apply direction
    if (direction === 'S' || direction === 'W') {
      decimal = -decimal;
    }
    
    return decimal;
  }

  /**
   * Transform PGN-specific data (simplified implementations)
   * Note: Full PGN parsing would require proper bit manipulation
   */
  private transformRudderPGN(fields: any, timestamp: number): TransformationResult {
    return {
      success: true,
      data: {
        rudderAngle: 0, // Would need proper PGN parsing
        rudderTimestamp: timestamp
      },
      messageType: 'DIN'
    };
  }

  private transformHeadingPGN(fields: any, timestamp: number): TransformationResult {
    return {
      success: true,
      data: {
        heading: 0, // Would need proper PGN parsing
        headingTimestamp: timestamp
      },
      messageType: 'DIN'
    };
  }

  private transformEngineRapidPGN(fields: any, timestamp: number): TransformationResult {
    return {
      success: true,
      data: {
        engineRpm: 0, // Would need proper PGN parsing
        engineTimestamp: timestamp
      },
      messageType: 'DIN'
    };
  }

  private transformEngineDynamicPGN(fields: any, timestamp: number): TransformationResult {
    return {
      success: true,
      data: {
        engineTemp: 0, // Would need proper PGN parsing
        enginePressure: 0,
        engineTimestamp: timestamp
      },
      messageType: 'DIN'
    };
  }

  private transformFluidLevelPGN(fields: any, timestamp: number): TransformationResult {
    return {
      success: true,
      data: {
        fuelLevel: 0, // Would need proper PGN parsing
        tankTimestamp: timestamp
      },
      messageType: 'DIN'
    };
  }

  private transformWaterSpeedPGN(fields: any, timestamp: number): TransformationResult {
    return {
      success: true,
      data: {
        stw: 0, // Would need proper PGN parsing for Speed Through Water
        speedTimestamp: timestamp
      },
      messageType: 'DIN'
    };
  }

  private transformWaterDepthPGN(fields: any, timestamp: number): TransformationResult {
    return {
      success: true,
      data: {
        depth: 0, // Would need proper PGN parsing
        depthTimestamp: timestamp
      },
      messageType: 'DIN'
    };
  }

  /**
   * Transform RPM (Engine RPM and Pitch) message
   * Format: $--RPM,S,n,x.x,A*hh
   * Where: S = Source (E=Engine), n = Instance, x.x = RPM value, A = Valid
   */
  private transformRPM(message: ParsedNmeaMessage, timestamp: number): TransformationResult {
    const fields = message.fields;
    
    // Check if this is engine RPM (source = 'E')
    if (fields.source !== 'E') {
      return {
        success: false,
        errors: ['RPM message is not for engine (source not E)'],
        messageType: 'RPM'
      };
    }

    // Extract engine instance and RPM value
    const engineInstance = parseInt(fields.instance) || 0;
    const rpmValue = parseFloat(fields.rpm);
    const status = fields.status;

    // Validate data
    if (isNaN(rpmValue) || status !== 'A') {
      return {
        success: false,
        errors: ['Invalid RPM data or status not valid'],
        messageType: 'RPM'
      };
    }

    return {
      success: true,
      data: {
        engineRpm: rpmValue,
        engineInstance: engineInstance, // Include instance info
        engineTimestamp: timestamp
      },
      messageType: 'RPM'
    };
  }
}

// Export singleton instance
export const pureDataTransformer = PureDataTransformer.getInstance();