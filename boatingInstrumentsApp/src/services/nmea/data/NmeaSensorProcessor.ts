/**
 * NMEA Sensor Processor v2.0
 * 
 * Direct NMEA → Sensor mapping for clean architecture.
 * Eliminates intermediate TransformedNmeaData layer.
 * Preserves presentation system and unit conversion.
 * 
 * Key Principles:
 * - Direct mapping from parsed NMEA to typed sensor data
 * - Store data in consistent base units (meters, knots, Celsius, etc.)
 * - No intermediate transformation formats
 * - Perfect type safety with SensorData interfaces
 * - Instance support built-in for multi-device scenarios
 */

// Master toggle for NmeaSensorProcessor logging (produces hundreds of logs per minute)
const ENABLE_NMEA_PROCESSOR_LOGGING = false;
const log = (...args: any[]) => ENABLE_NMEA_PROCESSOR_LOGGING && console.log(...args);
const warn = (...args: any[]) => ENABLE_NMEA_PROCESSOR_LOGGING && console.warn(...args);

// Debug toggle for verbose VTG/VHW processor logs
const DEBUG_NMEA_PROCESSING = false;

import type { ParsedNmeaMessage } from '../parsing/PureNmeaParser';
import { normalizeApparentWindAngle, normalizeTrueWindAngle } from '../../../utils/marineAngles';
import { pgnParser } from '../pgnParser';
import type { 
  SensorType,
  EngineSensorData,
  DepthSensorData,
  GpsSensorData,
  WindSensorData,
  SpeedSensorData,
  CompassSensorData,
  TemperatureSensorData,
  BatterySensorData,
  TankSensorData,
  AutopilotSensorData,
  NavigationSensorData
} from '../../../types/SensorData';
import { useWidgetStore } from '../../../store/widgetStore';
import { useNmeaStore } from '../../../store/nmeaStore';

export interface SensorUpdate<T = any> {
  sensorType: SensorType;
  instance: number;
  data: Partial<T>;
}

export interface ProcessingResult {
  success: boolean;
  updates?: SensorUpdate[];
  errors?: string[];
  messageType?: string;
}

export class NmeaSensorProcessor {
  private static instance: NmeaSensorProcessor;
  
  static getInstance(): NmeaSensorProcessor {
    if (!NmeaSensorProcessor.instance) {
      NmeaSensorProcessor.instance = new NmeaSensorProcessor();
    }
    return NmeaSensorProcessor.instance;
  }

  /**
   * Extract instance ID from NMEA message
   * Uses talker ID, explicit instance field, or defaults to 0
   * 
   * Examples:
   * - GP (GPS) → 0
   * - GL (GLONASS) → 1  
   * - EC (ECDIS) → 2
   * - HC (Heading - magnetic compass) → 0
   * - HE (Heading - gyro) → 1
   */
  private extractInstanceId(message: ParsedNmeaMessage): number {
    // Priority 1: Explicit instance field (RPM, XDR)
    if (message.fields.instance !== undefined && message.fields.instance !== null) {
      return parseInt(String(message.fields.instance), 10) || 0;
    }
    
    // Priority 2: Talker ID mapping for common multi-device scenarios
    const talker = message.talker?.toUpperCase();
    const talkerInstanceMap: Record<string, number> = {
      // GPS receivers
      'GP': 0,  // GPS
      'GL': 1,  // GLONASS
      'GA': 2,  // Galileo
      'GB': 3,  // BeiDou
      'GN': 4,  // Combined GNSS
      
      // Heading sensors
      'HC': 0,  // Magnetic compass
      'HE': 1,  // Gyro compass
      'HN': 2,  // North seeking gyro
      
      // Depth sounders
      'SD': 0,  // Depth sounder (primary)
      'YX': 1,  // Transducer (secondary)
      
      // Wind instruments  
      'WI': 0,  // Wind instrument (primary)
      'VW': 1,  // Wind sensor (secondary)
      
      // Speed sensors
      'VD': 0,  // Speed sensor (primary)
      'VM': 1,  // Speed sensor (secondary)
    };
    
    if (talker && talkerInstanceMap[talker] !== undefined) {
      return talkerInstanceMap[talker];
    }
    
    // Priority 3: Default to instance 0
    return 0;
  }

  /**
   * Process parsed NMEA message directly to sensor updates
   */
  processMessage(parsedMessage: ParsedNmeaMessage): ProcessingResult {
    try {
      const timestamp = Date.now();
      log('[NmeaSensorProcessor] Processing message:', parsedMessage.messageType);
      
      // Log RPM messages specifically
      if (parsedMessage.messageType === 'RPM') {
        console.log('🚨 [NmeaSensorProcessor] RPM message received:', parsedMessage);
      }
      
      let result: ProcessingResult;
      
      switch (parsedMessage.messageType) {
        case 'RPM':
          result = this.processRPM(parsedMessage, timestamp);
          break;
        case 'DBT':
          result = this.processDBT(parsedMessage, timestamp);
          break;
        case 'DPT':
          result = this.processDPT(parsedMessage, timestamp);
          break;
        case 'DBK':
          result = this.processDBK(parsedMessage, timestamp);
          break;
        case 'GGA':
          result = this.processGGA(parsedMessage, timestamp);
          break;
        case 'RMC':
          result = this.processRMC(parsedMessage, timestamp);
          break;
        case 'VTG':
          result = this.processVTG(parsedMessage, timestamp);
          break;
        case 'VHW':
          result = this.processVHW(parsedMessage, timestamp);
          break;
        case 'MWV':
          result = this.processMWV(parsedMessage, timestamp);
          break;
        case 'HDG':
          result = this.processHDG(parsedMessage, timestamp);
          break;
        case 'MTW':
          result = this.processMTW(parsedMessage, timestamp);
          break;
        case 'ZDA':
          result = this.processZDA(parsedMessage, timestamp);
          break;
        case 'XDR':
          result = this.processXDR(parsedMessage, timestamp);
          break;
        case 'RSA':
          result = this.processRSA(parsedMessage, timestamp);
          break;
        case 'APB':
          result = this.processAPB(parsedMessage, timestamp);
          break;
        case 'APA':
          result = this.processAPA(parsedMessage, timestamp);
          break;
        case 'VWR':
          result = this.processVWR(parsedMessage, timestamp);
          break;
        case 'VWT':
          result = this.processVWT(parsedMessage, timestamp);
          break;
        case 'GLL':
          result = this.processGLL(parsedMessage, timestamp);
          break;
        case 'HDM':
          result = this.processHDM(parsedMessage, timestamp);
          break;
        case 'HDT':
          result = this.processHDT(parsedMessage, timestamp);
          break;
        case 'BWC':
          result = this.processBWC(parsedMessage, timestamp);
          break;
        case 'RMB':
          result = this.processRMB(parsedMessage, timestamp);
          break;
        case 'XTE':
          result = this.processXTE(parsedMessage, timestamp);
          break;
        case 'BOD':
          result = this.processBOD(parsedMessage, timestamp);
          break;
        case 'WPL':
          result = this.processWPL(parsedMessage, timestamp);
          break;
        case 'DIN':
        case 'PCDIN':
          result = this.processPgnMessage(parsedMessage, timestamp);
          break;
        case 'BINARY':
          result = this.processBinaryPgnMessage(parsedMessage, timestamp);
          break;
        default:
          result = {
            success: false,
            errors: [`Unsupported message type: ${parsedMessage.messageType}`],
            messageType: parsedMessage.messageType
          };
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        errors: [`Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        messageType: parsedMessage.messageType
      };
    }
  }

  /**
   * Process RPM (Engine/Shaft RPM and Pitch) message
   * Format: $--RPM,S,n,x.x,A*hh
   * Where: S = Source (E=Engine, S=Shaft), n = Instance, x.x = RPM value, A = Valid
   */
  private processRPM(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;
    const source = fields.source; // 'E' = Engine, 'S' = Shaft
    
    // Only process engine and shaft RPM
    if (source !== 'E' && source !== 'S') {
      return {
        success: false,
        errors: [`RPM message source '${source}' not supported (only E=Engine, S=Shaft)`],
        messageType: 'RPM'
      };
    }

    // Extract and validate instance and RPM value
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

    // Create engine sensor update - different field based on source
    const engineData: Partial<EngineSensorData> = {
      name: `Engine ${engineInstance + 1}`,
      timestamp: timestamp
    };

    if (source === 'E') {
      engineData.rpm = rpmValue; // Engine RPM
      console.log(`🚨 [NmeaSensorProcessor] Processed Engine RPM - Instance: ${engineInstance}, RPM: ${rpmValue}`);
    } else if (source === 'S') {
      engineData.shaftRpm = rpmValue; // Shaft RPM
      console.log(`🚨 [NmeaSensorProcessor] Processed Shaft RPM - Instance: ${engineInstance}, Shaft RPM: ${rpmValue}`);
    }

    return {
      success: true,
      updates: [{
        sensorType: 'engine',
        instance: engineInstance,
        data: engineData
      }],
      messageType: 'RPM'
    };
  }

  /**
   * Process DBT (Depth Below Transducer) message
   * Format: $--DBT,x.x,f,x.x,M,x.x,F*hh
   * Always store depth in meters (base unit)
   */
  private processDBT(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;
    
    // Prefer meters, fall back to feet
    let depthMeters: number | null = null;
    
    if (fields.depth_meters !== null && !isNaN(fields.depth_meters)) {
      depthMeters = fields.depth_meters;
    } else if (fields.depth_feet !== null && !isNaN(fields.depth_feet)) {
      depthMeters = fields.depth_feet * 0.3048; // Convert feet to meters
    }

    if (depthMeters === null) {
      return {
        success: false,
        errors: ['No valid depth data found'],
        messageType: 'DBT'
      };
    }

    // Extract instance from talker ID - all depth sentence types from same sensor use same instance
    const instance = this.extractInstanceId(message);

    // Round to 1 decimal place (marine instrument standard)
    const depthRounded = Math.round(depthMeters * 10) / 10;

    // DBT measures depth below transducer (MEDIUM PRIORITY)
    // Get existing depth sensor to check if higher priority (DPT) already set the depth
    const existingSensor = useNmeaStore.getState().nmeaData.sensors.depth?.[instance] as DepthSensorData | undefined;
    const shouldUpdatePrimaryDepth = !existingSensor?.depthSource || existingSensor.depthSource === 'DBK';
    
    const depthData: Partial<DepthSensorData> = {
      name: `Depth Sounder${instance > 0 ? ` #${instance}` : ''}`,
      depthBelowTransducer: depthRounded, // DBT-specific measurement (for debugging)
      timestamp: timestamp
    };
    
    // Only update primary depth field if no higher priority source (DPT) has set it
    if (shouldUpdatePrimaryDepth) {
      depthData.depth = depthRounded; // PRIMARY metric: use if DPT not available
      depthData.depthSource = 'DBT'; // Metadata: which NMEA sentence provided this depth
      depthData.depthReferencePoint = 'transducer'; // DBT reference point
    }

    return {
      success: true,
      updates: [{
        sensorType: 'depth',
        instance: instance, // Use talker ID for instance, not hardcoded
        data: depthData
      }],
      messageType: 'DBT'
    };
  }

  /**
   * Process DPT (Depth) message
   * Format: $--DPT,x.x,x.x,x.x*hh
   * Always store depth in meters (base unit)
   */
  private processDPT(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;
    
    if (fields.depth_meters === null || isNaN(fields.depth_meters)) {
      return {
        success: false,
        errors: ['Invalid depth data'],
        messageType: 'DPT'
      };
    }

    // Extract instance from talker ID - all depth sentence types from same sensor use same instance
    const instance = this.extractInstanceId(message);
    
    // Round to 1 decimal place (marine instrument standard)
    const depthRounded = Math.round(fields.depth_meters * 10) / 10;
    
    // DPT measures depth from waterline (HIGHEST PRIORITY)
    // Always use DPT for primary depth field - it has highest priority
    const depthData: Partial<DepthSensorData> = {
      name: `Depth Sounder${instance > 0 ? ` #${instance}` : ''}`,
      depth: depthRounded, // PRIMARY metric: DPT has highest priority (from waterline)
      depthSource: 'DPT', // Metadata: which NMEA sentence provided this depth
      depthReferencePoint: 'waterline', // DPT reference point
      depthBelowWaterline: depthRounded, // DPT-specific measurement (for debugging)
      timestamp: timestamp
    };

    return {
      success: true,
      updates: [{
        sensorType: 'depth',
        instance: instance,
        data: depthData
      }],
      messageType: 'DPT'
    };
  }

  /**
   * Process DBK (Depth Below Keel) message
   * Format: Similar to DBT but represents depth below keel
   */
  private processDBK(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;
    
    // Prefer meters, fall back to feet
    let depthMeters: number | null = null;
    
    if (fields.depth_meters !== null && !isNaN(fields.depth_meters)) {
      depthMeters = fields.depth_meters;
    } else if (fields.depth_feet !== null && !isNaN(fields.depth_feet)) {
      depthMeters = fields.depth_feet * 0.3048; // Convert feet to meters
    }

    if (depthMeters === null) {
      return {
        success: false,
        errors: ['No valid depth data found'],
        messageType: 'DBK'
      };
    }

    // Extract instance from talker ID - all depth sentence types from same sensor use same instance
    const instance = this.extractInstanceId(message);

    // Round to 1 decimal place (marine instrument standard)
    const depthRounded = Math.round(depthMeters * 10) / 10;

    // DBK measures depth below keel (LOWEST PRIORITY)
    // Get existing depth sensor to check if higher priority (DPT/DBT) already set the depth
    const existingSensor = useNmeaStore.getState().nmeaData.sensors.depth?.[instance] as DepthSensorData | undefined;
    const shouldUpdatePrimaryDepth = !existingSensor?.depthSource; // Only set if nothing has set it yet
    
    const depthData: Partial<DepthSensorData> = {
      name: `Depth Sounder${instance > 0 ? ` #${instance}` : ''}`,
      depthBelowKeel: depthRounded, // DBK-specific measurement (for debugging)
      timestamp: timestamp
    };
    
    // Only update primary depth field if no higher priority source (DPT/DBT) has set it
    if (shouldUpdatePrimaryDepth) {
      depthData.depth = depthRounded; // PRIMARY metric: use if DPT/DBT not available
      depthData.depthSource = 'DBK'; // Metadata: which NMEA sentence provided this depth
      depthData.depthReferencePoint = 'keel'; // DBK reference point
    }

    return {
      success: true,
      updates: [{
        sensorType: 'depth',
        instance: instance, // Use talker ID for instance, not hardcoded
        data: depthData
      }],
      messageType: 'DBK'
    };
  }

  /**
   * Process GGA (GPS Fix Data) message
   * Always store coordinates in decimal degrees (base unit)
   */
  private processGGA(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;
    
    // Parse coordinates
    const latitude = this.parseCoordinate(fields.latitude_raw, fields.latitude_dir);
    const longitude = this.parseCoordinate(fields.longitude_raw, fields.longitude_dir);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return {
        success: false,
        errors: ['Invalid GPS coordinates'],
        messageType: 'GGA'
      };
    }

    // Create GPS sensor update
    const gpsData: Partial<GpsSensorData> = {
      name: 'GPS Receiver',
      position: {
        latitude: latitude, // Decimal degrees (base unit)
        longitude: longitude // Decimal degrees (base unit)
      },
      quality: {
        fixType: fields.fix_quality || 0,
        satellites: fields.satellites || 0,
        hdop: fields.hdop || 99.9
      },
      timeSource: 'GGA', // Priority 3 (lowest)
      timestamp: timestamp
    };

    // Extract UTC time from GGA (time only, use today's date)
    if (fields.time) {
      const utcTime = this.parseGGATime(fields.time);
      if (utcTime) {
        gpsData.utcTime = utcTime.getTime();
      }
    }

    const instance = this.extractInstanceId(message);
    gpsData.name = `GPS ${instance > 0 ? `#${instance}` : 'Receiver'}`.trim();

    return {
      success: true,
      updates: [{
        sensorType: 'gps',
        instance: instance,
        data: gpsData
      }],
      messageType: 'GGA'
    };
  }

  /**
   * Process GLL (Geographic Position - Latitude/Longitude) message
   * GLL provides essential GPS position data with timestamp
   */
  private processGLL(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;
    
    // Check status validity
    if (fields.status !== 'A') {
      return {
        success: false,
        errors: ['Invalid GPS status (V=invalid)'],
        messageType: 'GLL'
      };
    }

    // Parse coordinates
    const latitude = this.parseCoordinate(fields.latitude_raw, fields.latitude_dir);
    const longitude = this.parseCoordinate(fields.longitude_raw, fields.longitude_dir);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return {
        success: false,
        errors: ['Invalid GPS coordinates'],
        messageType: 'GLL'
      };
    }

    // Create GPS sensor update
    const gpsData: Partial<GpsSensorData> = {
      name: 'GPS Receiver',
      position: {
        latitude: latitude,
        longitude: longitude
      },
      timeSource: 'GLL', // Priority 2 (medium)
      timestamp: timestamp
    };

    // Extract UTC time from GLL
    if (fields.time) {
      const utcTime = this.parseGGATime(fields.time);
      if (utcTime) {
        gpsData.utcTime = utcTime.getTime();
      }
    }

    const instance = this.extractInstanceId(message);
    
    return {
      success: true,
      updates: [{
        sensorType: 'gps',
        instance,
        data: gpsData
      }],
      messageType: 'GLL'
    };
  }

  /**
   * Process RMC (Recommended Minimum) message
   * Provides GPS position, speed over ground, and UTC date/time
   */
  private processRMC(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;
    const updates: SensorUpdate[] = [];

    // GPS position and UTC date/time
    if (fields.latitude_raw && fields.longitude_raw) {
      const latitude = this.parseCoordinate(fields.latitude_raw, fields.latitude_dir);
      const longitude = this.parseCoordinate(fields.longitude_raw, fields.longitude_dir);
      
      if (!isNaN(latitude) && !isNaN(longitude)) {
        const gpsData: Partial<GpsSensorData> = {
          name: 'GPS Receiver',
          position: {
            latitude: latitude, // Decimal degrees (base unit)
            longitude: longitude // Decimal degrees (base unit)
          },
          timeSource: 'RMC', // Priority 1 (highest - has date+time)
          timestamp: timestamp
        };

        // Add UTC time and date if available
        if (fields.time && fields.date) {
          const utcDateTime = this.parseRMCDateTime(fields.time, fields.date);
          if (utcDateTime) {
            gpsData.utcTime = utcDateTime.getTime(); // Convert Date to timestamp (number)
          }
        }

        const instance = this.extractInstanceId(message);
        
        updates.push({
          sensorType: 'gps',
          instance,
          data: gpsData
        });
      }
    }

    // Speed over ground and course over ground (GPS-calculated)
    if (fields.speed_knots !== null && !isNaN(fields.speed_knots)) {
      const instance = this.extractInstanceId(message);
      
      // Update the same GPS sensor instance with speed/course
      const existingUpdate = updates.find(u => u.sensorType === 'gps' && u.instance === instance);
      if (existingUpdate) {
        // Add SOG/COG to existing GPS update
        existingUpdate.data.speedOverGround = fields.speed_knots;
        if (fields.course !== null && !isNaN(fields.course)) {
          existingUpdate.data.courseOverGround = fields.course;
        }
      } else {
        // Create new GPS update with SOG/COG
        updates.push({
          sensorType: 'gps',
          instance,
          data: {
            name: 'GPS Receiver',
            speedOverGround: fields.speed_knots,
            courseOverGround: fields.course !== null && !isNaN(fields.course) ? fields.course : undefined,
            timestamp: timestamp
          }
        });
      }
    }

    if (updates.length === 0) {
      return {
        success: false,
        errors: ['No valid RMC data found'],
        messageType: 'RMC'
      };
    }

    return {
      success: true,
      updates: updates,
      messageType: 'RMC'
    };
  }

  /**
   * Process VTG (Track Made Good and Ground Speed) message
   */
  private processVTG(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;

    // Speed over ground - VTG provides SOG specifically
    if (fields.speed_knots !== null && !isNaN(fields.speed_knots)) {
      const instance = this.extractInstanceId(message);
      const speedData: Partial<SpeedSensorData> = {
        name: `Speed ${instance > 0 ? `#${instance}` : ''}`.trim(),
        overGround: fields.speed_knots, // Speed over ground in knots (base unit)
        timestamp: timestamp
      };

      if (DEBUG_NMEA_PROCESSING) console.log(`🎯 VTG Processor: Setting overGround=${fields.speed_knots.toFixed(2)} knots (instance ${instance})`);

      return {
        success: true,
        updates: [{
          sensorType: 'speed',
          instance: instance,
          data: speedData
        }],
        messageType: 'VTG'
      };
    }

    return {
      success: false,
      errors: ['No valid VTG data found'],
      messageType: 'VTG'
    };
  }

  /**
   * Process VHW (Water Speed and Heading) message
   */
  private processVHW(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;
    const updates: SensorUpdate[] = [];

    const instance = this.extractInstanceId(message);
    
    // Speed through water - VHW provides STW specifically
    if (fields.speed_knots !== null && !isNaN(fields.speed_knots)) {
      const speedData: Partial<SpeedSensorData> = {
        name: `Speed ${instance > 0 ? `#${instance}` : ''}`.trim(),
        throughWater: fields.speed_knots, // Speed through water in knots (base unit)
        timestamp: timestamp
      };

      if (DEBUG_NMEA_PROCESSING) console.log(`🎯 VHW Processor: Setting throughWater=${fields.speed_knots.toFixed(2)} knots (instance ${instance})`);

      updates.push({
        sensorType: 'speed',
        instance: instance,
        data: speedData
      });
    }

    // Heading (true or magnetic)
    if (fields.heading_true !== null && !isNaN(fields.heading_true)) {
      const compassData: Partial<CompassSensorData> = {
        name: `Compass ${instance > 0 ? `#${instance}` : ''}`.trim(),
        heading: fields.heading_true, // True heading in degrees (base unit)
        timestamp: timestamp
      };

      updates.push({
        sensorType: 'compass',
        instance: instance,
        data: compassData
      });
    } else if (fields.heading_magnetic !== null && !isNaN(fields.heading_magnetic)) {
      const compassData: Partial<CompassSensorData> = {
        name: `Compass ${instance > 0 ? `#${instance}` : ''}`.trim(),
        heading: fields.heading_magnetic, // Magnetic heading in degrees (base unit)
        timestamp: timestamp
      };

      updates.push({
        sensorType: 'compass',
        instance: instance,
        data: compassData
      });
    }

    if (updates.length === 0) {
      return {
        success: false,
        errors: ['No valid VHW data found'],
        messageType: 'VHW'
      };
    }

    return {
      success: true,
      updates: updates,
      messageType: 'VHW'
    };
  }

  /**
   * Process MWV (Wind Speed and Angle) message
   * Always store wind speed in knots (base unit)
   */
  private processMWV(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;
    
    if (fields.wind_angle === null || fields.wind_speed === null) {
      return {
        success: false,
        errors: ['Invalid wind data'],
        messageType: 'MWV'
      };
    }

    // Convert wind speed to consistent units (knots)
    let windSpeedKnots = fields.wind_speed;
    if (fields.speed_unit === 'M') {
      windSpeedKnots = windSpeedKnots * 1.94384; // m/s to knots
    } else if (fields.speed_unit === 'K') {
      windSpeedKnots = windSpeedKnots * 0.539957; // km/h to knots
    }

    // Debug logging for extreme wind angles
    if (Math.abs(fields.wind_angle) > 360) {
      console.warn(`🌪️  EXTREME WIND ANGLE DETECTED: ${fields.wind_angle}° (should be 0-360°)`);
      console.warn(`📡 Raw MWV message fields:`, fields);
    }

    // Normalize wind angle based on reference type
    let normalizedAngle = fields.wind_angle;
    if (fields.reference === 'R' || fields.reference === 'A') {
      // Relative/Apparent wind - normalize to ±180° range
      normalizedAngle = normalizeApparentWindAngle(fields.wind_angle);
    } else if (fields.reference === 'T') {
      // True wind - normalize to 0-360° range
      normalizedAngle = normalizeTrueWindAngle(fields.wind_angle);
    }

    // Log the normalization for debugging
    if (fields.wind_angle !== normalizedAngle) {
      console.log(`🧭 Wind angle normalized: ${fields.wind_angle}° → ${normalizedAngle}°`);
    }

    // Create wind sensor update
    const instance = this.extractInstanceId(message);
    const windData: Partial<WindSensorData> = {
      name: `Wind ${instance > 0 ? `#${instance}` : 'Sensor'}`.trim(),
      direction: normalizedAngle, // Normalized wind direction in degrees
      angle: normalizedAngle, // @deprecated - kept for backward compatibility
      speed: windSpeedKnots, // Wind speed in knots (base unit)
      timestamp: timestamp
    };

    // Set true or apparent wind based on reference
    if (fields.reference === 'T') {
      windData.trueDirection = fields.wind_angle;
      windData.trueAngle = fields.wind_angle; // @deprecated - kept for backward compatibility
      windData.trueSpeed = windSpeedKnots;
    }

    return {
      success: true,
      updates: [{
        sensorType: 'wind',
        instance: instance,
        data: windData
      }],
      messageType: 'MWV'
    };
  }

  /**
   * Process VWR (Relative Wind Speed and Angle) message
   * VWR provides apparent wind data in L/R format (0-180° with direction)
   * Always store wind speed in knots (base unit)
   */
  private processVWR(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;
    
    if (fields.wind_angle === null || fields.wind_speed_knots === null) {
      return {
        success: false,
        errors: ['Invalid VWR wind data'],
        messageType: 'VWR'
      };
    }

    // Convert L/R direction to full 360° angle
    // R = starboard (0-180°), L = port (180-360° or -180° to 0°)
    let relativeAngle = fields.wind_angle;
    if (fields.direction === 'L') {
      relativeAngle = -fields.wind_angle; // Port side is negative
    }

    // Normalize to ±180° range
    const normalizedAngle = normalizeApparentWindAngle(relativeAngle);

    const windData: Partial<WindSensorData> = {
      name: 'Wind Sensor',
      direction: normalizedAngle,
      angle: normalizedAngle, // @deprecated
      speed: fields.wind_speed_knots,
      timestamp: timestamp
    };

    const instance = this.extractInstanceId(message);
    
    return {
      success: true,
      updates: [{
        sensorType: 'wind',
        instance,
        data: windData
      }],
      messageType: 'VWR'
    };
  }

  /**
   * Process VWT (True Wind Speed and Angle) message
   * VWT provides true wind data in L/R format (0-180° with direction)
   * Always store wind speed in knots (base unit)
   */
  private processVWT(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;
    
    if (fields.wind_angle === null || fields.wind_speed_knots === null) {
      return {
        success: false,
        errors: ['Invalid VWT wind data'],
        messageType: 'VWT'
      };
    }

    // Convert L/R direction to full 360° angle
    // R = starboard (0-180°), L = port (180-360° or -180° to 0°)
    let trueAngle = fields.wind_angle;
    if (fields.direction === 'L') {
      trueAngle = 360 - fields.wind_angle; // Convert to 0-360° range
    }

    // Normalize to 0-360° range
    const normalizedAngle = normalizeTrueWindAngle(trueAngle);

    const windData: Partial<WindSensorData> = {
      name: 'Wind Sensor',
      trueDirection: normalizedAngle,
      trueAngle: normalizedAngle, // @deprecated
      trueSpeed: fields.wind_speed_knots,
      timestamp: timestamp
    };

    const instance = this.extractInstanceId(message);
    
    return {
      success: true,
      updates: [{
        sensorType: 'wind',
        instance,
        data: windData
      }],
      messageType: 'VWT'
    };
  }

  /**
   * Process HDG (Heading) message
   */
  private processHDG(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;
    
    if (fields.magnetic_heading === null || isNaN(fields.magnetic_heading)) {
      return {
        success: false,
        errors: ['Invalid heading data'],
        messageType: 'HDG'
      };
    }

    // Create compass sensor update
    const instance = this.extractInstanceId(message);
    const compassData: Partial<CompassSensorData> = {
      name: `Compass ${instance > 0 ? `#${instance}` : ''}`.trim(),
      heading: fields.magnetic_heading, // Magnetic heading in degrees (base unit)
      timestamp: timestamp
    };

    return {
      success: true,
      updates: [{
        sensorType: 'compass',
        instance: instance,
        data: compassData
      }],
      messageType: 'HDG'
    };
  }

  /**
   * Process HDM (Heading - Magnetic) message
   * Simpler than HDG, only provides magnetic heading
   */
  private processHDM(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;
    
    if (fields.magnetic_heading === null || isNaN(fields.magnetic_heading)) {
      return {
        success: false,
        errors: ['Invalid magnetic heading'],
        messageType: 'HDM'
      };
    }

    const instance = this.extractInstanceId(message);
    const compassData: Partial<CompassSensorData> = {
      name: `Compass ${instance > 0 ? `#${instance}` : ''}`.trim(),
      heading: fields.magnetic_heading,
      timestamp: timestamp
    };

    return {
      success: true,
      updates: [{
        sensorType: 'compass',
        instance: instance,
        data: compassData
      }],
      messageType: 'HDM'
    };
  }

  /**
   * Process HDT (Heading - True) message
   * Provides true heading (corrected for magnetic variation)
   */
  private processHDT(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;
    
    if (fields.true_heading === null || isNaN(fields.true_heading)) {
      return {
        success: false,
        errors: ['Invalid true heading'],
        messageType: 'HDT'
      };
    }

    const instance = this.extractInstanceId(message);
    const compassData: Partial<CompassSensorData> = {
      name: `Compass ${instance > 0 ? `#${instance}` : ''}`.trim(),
      heading: fields.true_heading, // True heading
      timestamp: timestamp
    };

    return {
      success: true,
      updates: [{
        sensorType: 'compass',
        instance: instance,
        data: compassData
      }],
      messageType: 'HDT'
    };
  }

  /**
   * Process BWC (Bearing and Distance to Waypoint) message
   */
  private processBWC(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;
    
    if (!fields.waypoint_id || fields.distance_nm === null || fields.bearing_true === null) {
      return {
        success: false,
        errors: ['Invalid BWC navigation data'],
        messageType: 'BWC'
      };
    }

    // Parse waypoint coordinates if present
    let waypointPosition;
    if (fields.waypoint_lat && fields.waypoint_lon) {
      const lat = this.parseCoordinate(fields.waypoint_lat, fields.waypoint_lat_dir);
      const lon = this.parseCoordinate(fields.waypoint_lon, fields.waypoint_lon_dir);
      if (!isNaN(lat) && !isNaN(lon)) {
        waypointPosition = { latitude: lat, longitude: lon };
      }
    }

    const navData: Partial<NavigationSensorData> = {
      name: 'Navigation',
      waypointId: fields.waypoint_id,
      waypointPosition: waypointPosition,
      bearingToWaypoint: fields.bearing_true,
      distanceToWaypoint: fields.distance_nm,
      timestamp: timestamp
    };

    const instance = this.extractInstanceId(message);
    
    return {
      success: true,
      updates: [{
        sensorType: 'navigation',
        instance,
        data: navData
      }],
      messageType: 'BWC'
    };
  }

  /**
   * Process RMB (Recommended Minimum Navigation Information) message
   * Provides comprehensive navigation data including XTE, bearing, VMG
   */
  private processRMB(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;
    
    if (fields.status !== 'A') {
      return {
        success: false,
        errors: ['Invalid RMB status'],
        messageType: 'RMB'
      };
    }

    // Parse destination coordinates
    let destPosition;
    if (fields.dest_lat && fields.dest_lon) {
      const lat = this.parseCoordinate(fields.dest_lat, fields.dest_lat_dir);
      const lon = this.parseCoordinate(fields.dest_lon, fields.dest_lon_dir);
      if (!isNaN(lat) && !isNaN(lon)) {
        destPosition = { latitude: lat, longitude: lon };
      }
    }

    // Convert cross-track error to signed value (negative = steer left, positive = steer right)
    let xte = fields.cross_track_error;
    if (xte !== null && fields.steer_direction === 'L') {
      xte = -xte;
    }

    const navData: Partial<NavigationSensorData> = {
      name: 'Navigation',
      originWaypointId: fields.origin_waypoint,
      destinationWaypointId: fields.dest_waypoint,
      waypointId: fields.dest_waypoint,
      waypointPosition: destPosition,
      bearingToWaypoint: fields.bearing,
      distanceToWaypoint: fields.range_nm,
      crossTrackError: xte,
      steerDirection: fields.steer_direction === 'L' ? 'left' : 'right',
      velocityMadeGood: fields.vmg,
      arrivalStatus: fields.arrival_status === 'A' ? 'arrived' : 'active',
      timestamp: timestamp
    };

    const instance = this.extractInstanceId(message);
    
    return {
      success: true,
      updates: [{
        sensorType: 'navigation',
        instance,
        data: navData
      }],
      messageType: 'RMB'
    };
  }

  /**
   * Process XTE (Cross-Track Error) message
   * Focused on cross-track error only
   */
  private processXTE(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;
    
    if (fields.status !== 'A' || fields.cross_track_error === null) {
      return {
        success: false,
        errors: ['Invalid XTE data'],
        messageType: 'XTE'
      };
    }

    // Convert to signed value (negative = steer left, positive = steer right)
    let xte = fields.cross_track_error;
    if (fields.steer_direction === 'L') {
      xte = -xte;
    }

    const navData: Partial<NavigationSensorData> = {
      name: 'Navigation',
      crossTrackError: xte,
      steerDirection: fields.steer_direction === 'L' ? 'left' : 'right',
      timestamp: timestamp
    };

    const instance = this.extractInstanceId(message);
    
    return {
      success: true,
      updates: [{
        sensorType: 'navigation',
        instance,
        data: navData
      }],
      messageType: 'XTE'
    };
  }

  /**
   * Process BOD (Bearing Origin to Destination) message
   * Provides bearing information for route planning
   */
  private processBOD(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;
    
    if (fields.bearing_true === null) {
      return {
        success: false,
        errors: ['Invalid BOD bearing data'],
        messageType: 'BOD'
      };
    }

    const navData: Partial<NavigationSensorData> = {
      name: 'Navigation',
      originWaypointId: fields.origin_waypoint,
      destinationWaypointId: fields.dest_waypoint,
      bearingOriginToDest: fields.bearing_true,
      timestamp: timestamp
    };

    const instance = this.extractInstanceId(message);
    
    return {
      success: true,
      updates: [{
        sensorType: 'navigation',
        instance,
        data: navData
      }],
      messageType: 'BOD'
    };
  }

  /**
   * Process WPL (Waypoint Location) message
   * Defines waypoint positions
   */
  private processWPL(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;
    
    if (!fields.waypoint_id || !fields.latitude || !fields.longitude) {
      return {
        success: false,
        errors: ['Invalid WPL waypoint data'],
        messageType: 'WPL'
      };
    }

    const lat = this.parseCoordinate(fields.latitude, fields.latitude_dir);
    const lon = this.parseCoordinate(fields.longitude, fields.longitude_dir);
    
    if (isNaN(lat) || isNaN(lon)) {
      return {
        success: false,
        errors: ['Invalid WPL coordinates'],
        messageType: 'WPL'
      };
    }

    const navData: Partial<NavigationSensorData> = {
      name: 'Navigation',
      waypointId: fields.waypoint_id,
      waypointPosition: {
        latitude: lat,
        longitude: lon
      },
      timestamp: timestamp
    };

    const instance = this.extractInstanceId(message);
    
    return {
      success: true,
      updates: [{
        sensorType: 'navigation',
        instance,
        data: navData
      }],
      messageType: 'WPL'
    };
  }

  /**
   * Process MTW (Mean Temperature of Water) message
   * Always store temperature in Celsius (base unit)
   */
  private processMTW(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;
    
    if (fields.temperature_celsius === null || isNaN(fields.temperature_celsius)) {
      return {
        success: false,
        errors: ['Invalid water temperature data'],
        messageType: 'MTW'
      };
    }

    // Create temperature sensor update (sea water temperature = instance 0)
    const temperatureData: Partial<TemperatureSensorData> = {
      name: 'Sea Water Temp',
      value: fields.temperature_celsius, // Temperature in Celsius (base unit)
      location: 'seawater',
      units: 'C',
      timestamp: timestamp
    };

    const instance = this.extractInstanceId(message); // Typically 0 for sea water temperature
    
    return {
      success: true,
      updates: [{
        sensorType: 'temperature',
        instance,
        data: temperatureData
      }],
      messageType: 'MTW'
    };
  }

  /**
   * Process XDR (Extended Data Record) message for temperature sensors
   * Format: $IIXDR,C,19.52,C,TEMP_01*XX
   */
  private processXDR(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;
    log('[NmeaSensorProcessor] XDR fields:', fields);
    
    // XDR format: Each measurement has 4 fields (type, value, units, identifier)
    // Message can contain multiple measurements: field_1...field_4, field_5...field_8, etc.
    
    const updates: Array<{sensorType: string, instance: number, data: any}> = [];
    const errors: string[] = [];
    
    // Calculate number of measurements (4 fields per measurement)
    const fieldCount = Object.keys(fields).filter(key => key.startsWith('field_')).length;
    const measurementCount = Math.floor(fieldCount / 4);
    
    console.log(`[NmeaSensorProcessor] XDR: Processing ${measurementCount} measurements (${fieldCount} fields)`);
    
    // Process each measurement group
    for (let i = 0; i < measurementCount; i++) {
      const baseIndex = i * 4 + 1; // field_1, field_5, field_9, etc.
      const measurementType = fields[`field_${baseIndex}`];
      const measurementValue = fields[`field_${baseIndex + 1}`];
      const units = fields[`field_${baseIndex + 2}`];
      const identifier = fields[`field_${baseIndex + 3}`];
      
      console.log(`[NmeaSensorProcessor] XDR Measurement ${i}: type=${measurementType}, value=${measurementValue}, units=${units}, id=${identifier}`);
      
      if (!identifier) {
        console.log(`[NmeaSensorProcessor] XDR Measurement ${i}: Skipping - no identifier`);
        continue; // Skip measurements without identifiers
      }
    
    // Check if this is a battery measurement - FIXED: use continue instead of return to process all measurements
    if (identifier) {
      // Battery measurements - support both individual and compound XDR formats
      // Pattern: BAT_XX for base measurements, BAT_XX_SUFFIX for specific attributes
      const batteryMatch = identifier.match(/^BAT_(\d+)(?:_(NOM|CAP|CHEM|TMP|SOC))?$/);
      if (batteryMatch) {
        const instance = parseInt(batteryMatch[1], 10);
        const suffix = batteryMatch[2]; // undefined for BAT_XX, or NOM/CAP/CHEM/TMP/SOC
        
        if (!isNaN(instance)) {
          const batteryData: Partial<BatterySensorData> = {
            name: `Battery ${instance + 1}`,
            timestamp: timestamp
          };
          
          // Handle different measurement types
          if (measurementType === 'U' && units === 'V') {
            // Voltage measurement
            const voltage = parseFloat(measurementValue);
            if (!isNaN(voltage)) {
              if (suffix === 'NOM') {
                // Nominal voltage (BAT_XX_NOM)
                batteryData.nominalVoltage = voltage;
                console.log(`[NmeaSensorProcessor] ✅ XDR Battery Nominal Voltage: Instance ${instance} = ${voltage}V`);
              } else {
                // Actual voltage (BAT_XX)
                batteryData.voltage = voltage;
                console.log(`[NmeaSensorProcessor] ✅ XDR Battery Voltage: Instance ${instance} = ${voltage}V`);
              }
              updates.push({ sensorType: 'battery', instance, data: batteryData });
              continue;
            }
          } else if (measurementType === 'I' && units === 'A') {
            // Current measurement (BAT_XX)
            const current = parseFloat(measurementValue);
            if (!isNaN(current)) {
              batteryData.current = current;
              console.log(`[NmeaSensorProcessor] ✅ XDR Battery Current: Instance ${instance} = ${current}A`);
              updates.push({ sensorType: 'battery', instance, data: batteryData });
              continue;
            }
          } else if (measurementType === 'C' && (units === 'C' || units === 'F')) {
            // Temperature measurement (BAT_XX or BAT_XX_TMP)
            let temperature = parseFloat(measurementValue);
            if (!isNaN(temperature)) {
              // Convert Fahrenheit to Celsius if needed
              if (units === 'F') {
                temperature = (temperature - 32) * (5 / 9);
              }
              batteryData.temperature = temperature;
              console.log(`[NmeaSensorProcessor] ✅ XDR Battery Temperature: Instance ${instance} = ${temperature.toFixed(1)}°C`);
              updates.push({ sensorType: 'battery', instance, data: batteryData });
              continue;
            }
          } else if (measurementType === 'P' && (units === '%' || units === 'P')) {
            // State of Charge measurement (BAT_XX or BAT_XX_SOC)
            const soc = parseFloat(measurementValue);
            if (!isNaN(soc)) {
              batteryData.stateOfCharge = soc;
              console.log(`[NmeaSensorProcessor] ✅ XDR Battery SOC: Instance ${instance} = ${soc}%`);
              updates.push({ sensorType: 'battery', instance, data: batteryData });
              continue;
            }
          } else if (measurementType === 'V' && units === 'H') {
            // Capacity measurement (BAT_XX_CAP) - V=volume, H=amp-hours
            const capacity = parseFloat(measurementValue);
            if (!isNaN(capacity)) {
              batteryData.capacity = capacity;
              console.log(`[NmeaSensorProcessor] ✅ XDR Battery Capacity: Instance ${instance} = ${capacity}Ah`);
              updates.push({ sensorType: 'battery', instance, data: batteryData });
              continue;
            }
          } else if (measurementType === 'G' && (units === 'N' || !units)) {
            // Chemistry measurement (BAT_XX_CHEM) - G=generic, N=text/name
            const chemistry = measurementValue;
            if (chemistry) {
              batteryData.chemistry = chemistry;
              console.log(`[NmeaSensorProcessor] ✅ XDR Battery Chemistry: Instance ${instance} = ${chemistry}`);
              updates.push({ sensorType: 'battery', instance, data: batteryData });
              continue;
            }
          }
        }
      }
    }
    
    // Check if this is engine measurement (ENGINE#X identifiers)
    if (identifier) {
      // Engine coolant temperature (C=temperature, C/F=celsius/fahrenheit, ENGINE#X)
      const engineTempMatch = identifier.match(/^ENGINE#(\d+)$/);
      console.log(`[NmeaSensorProcessor] XDR Engine check: identifier="${identifier}", tempMatch=${!!engineTempMatch}, type="${measurementType}", units="${units}"`);
      
      if (engineTempMatch && measurementType === 'C' && (units === 'F' || units === 'C')) {
        const instance = parseInt(engineTempMatch[1], 10); // ENGINE#0 -> instance 0
        let temperature = parseFloat(measurementValue);
        
        if (!isNaN(temperature) && !isNaN(instance)) {
          // Convert to Celsius if needed
          if (units === 'F') {
            temperature = (temperature - 32) * (5 / 9);
          }
          // If units === 'C', already in Celsius
          
          const engineData: Partial<EngineSensorData> = {
            coolantTemp: temperature,
            timestamp: timestamp
          };
          
          console.log(`[NmeaSensorProcessor] ✅ XDR Engine Coolant Temp: Instance ${instance} = ${temperature.toFixed(1)}°C (from ${measurementValue}${units})`);
          
          updates.push({
            sensorType: 'engine',
            instance: instance,
            data: engineData
          });
          continue; // Process next measurement
        }
      }
      
      // Engine oil pressure (P=pressure, P=PSI per NMEA XDR standard, ENGINE#X)
      const enginePressureMatch = identifier.match(/^ENGINE#(\d+)$/);
      if (enginePressureMatch && measurementType === 'P' && units === 'P') {
        const instance = parseInt(enginePressureMatch[1], 10); // ENGINE#0 -> instance 0
        let pressure = parseFloat(measurementValue); // PSI from NMEA
        
        if (!isNaN(pressure) && !isNaN(instance)) {
          // Convert PSI to Pascals (base unit for pressure storage)
          // 1 PSI = 6894.757 Pascals
          pressure = pressure * 6894.757;
          
          const engineData: Partial<EngineSensorData> = {
            oilPressure: pressure, // Stored in Pascals
            timestamp: timestamp
          };
          
          console.log(`[NmeaSensorProcessor] ✅ XDR Engine Oil Pressure: Instance ${instance} = ${pressure.toFixed(0)} Pa (from ${measurementValue} PSI)`);
          
          updates.push({
            sensorType: 'engine',
            instance: instance,
            data: engineData
          });
          continue; // Process next measurement
        }
      }
      
      // Alternator voltage (U=voltage, V=volts, ALTERNATOR or ALTERNATOR#X)
      const alternatorMatch = identifier?.match(/^ALTERNATOR(?:#(\d+))?$/);
      if (alternatorMatch && measurementType === 'U' && units === 'V') {
        const voltage = parseFloat(measurementValue);
        const instance = alternatorMatch[1] ? parseInt(alternatorMatch[1], 10) : 0; // ALTERNATOR#0 -> instance 0, ALTERNATOR -> instance 0
        
        if (!isNaN(voltage) && !isNaN(instance)) {
          const engineData: Partial<EngineSensorData> = {
            alternatorVoltage: voltage, // Stored in Volts (base unit)
            timestamp: timestamp
          };
          
          console.log(`[NmeaSensorProcessor] ✅ XDR Alternator Voltage: Instance ${instance} = ${voltage}V`);
          
          updates.push({
            sensorType: 'engine',
            instance: instance,
            data: engineData
          });
          continue; // Process next measurement
        }
      }
      
      // Engine fuel flow (V=volume, L=liters per hour, ENGINE#X_FUEL)
      const engineFuelMatch = identifier.match(/^ENGINE#(\d+)_FUEL$/);
      if (engineFuelMatch && measurementType === 'V' && units === 'L') {
        const instance = parseInt(engineFuelMatch[1], 10); // ENGINE#0_FUEL -> instance 0
        const fuelRate = parseFloat(measurementValue); // L/h from NMEA
        
        if (!isNaN(fuelRate) && !isNaN(instance)) {
          const engineData: Partial<EngineSensorData> = {
            fuelRate: fuelRate, // Stored in L/h (base unit)
            timestamp: timestamp
          };
          
          console.log(`[NmeaSensorProcessor] ✅ XDR Engine Fuel Rate: Instance ${instance} = ${fuelRate.toFixed(1)} L/h`);
          
          updates.push({
            sensorType: 'engine',
            instance: instance,
            data: engineData
          });
          continue; // Process next measurement
        }
      }
      
      // Engine hours (G=generic, H=hours, ENGINE#X_HOURS)
      const engineHoursMatch = identifier.match(/^ENGINE#(\d+)_HOURS$/);
      if (engineHoursMatch && measurementType === 'G' && units === 'H') {
        const instance = parseInt(engineHoursMatch[1], 10); // ENGINE#0_HOURS -> instance 0
        const hours = parseFloat(measurementValue);
        
        if (!isNaN(hours) && !isNaN(instance)) {
          const engineData: Partial<EngineSensorData> = {
            hours: hours, // Stored in hours
            timestamp: timestamp
          };
          
          console.log(`[NmeaSensorProcessor] ✅ XDR Engine Hours: Instance ${instance} = ${hours.toFixed(1)}h`);
          
          updates.push({
            sensorType: 'engine',
            instance: instance,
            data: engineData
          });
          continue; // Process next measurement
        }
      }
    }
    
    // Check if this is a tank level measurement (V=volume with L=liters or P=percentage)
    if (measurementType === 'V' && (units === 'L' || units === 'P') && identifier) {
      const tankMatch = identifier.match(/^(FUEL|WATR|WAST|BALL|BWAT)_(\d+)$/);
      if (tankMatch) {
        const [, tankTypeStr, instanceStr] = tankMatch;
        const instance = parseInt(instanceStr, 10);
        const rawValue = parseFloat(measurementValue);
        
        // XDR tank data is already in ratio format (0.0-1.0), no conversion needed
        const level = rawValue;
        
        if (isNaN(rawValue) || isNaN(instance)) {
          errors.push('Invalid XDR tank data');
          continue; // Skip this measurement and continue processing others
        }
        
        // Map XDR tank types to our tank types
        const tankTypeMap: Record<string, TankSensorData['type']> = {
          'FUEL': 'fuel',
          'WATR': 'water', 
          'WAST': 'waste',
          'BALL': 'ballast',
          'BWAT': 'blackwater'
        };
        
        const tankType = tankTypeMap[tankTypeStr];
        if (tankType) {
          // Default tank capacities in liters based on marine standards
          // TODO : Allow user-defined capacities via configuration
          const defaultCapacities: Record<string, number> = {
            'fuel': 200,      // Typical fuel tank: 200L (53 gallons)
            'water': 150,     // Typical fresh water tank: 150L (40 gallons)
            'waste': 100,     // Typical gray/waste water tank: 100L (26 gallons)
            'ballast': 300,   // Larger ballast tank: 300L (79 gallons)
            'blackwater': 80  // Smaller black water tank: 80L (21 gallons)
          };
          
          const tankData: Partial<TankSensorData> = {
            name: `${tankType.charAt(0).toUpperCase() + tankType.slice(1)} Tank ${instance + 1}`,
            type: tankType,
            level: level,
            capacity: defaultCapacities[tankType] || 150, // Default to 150L if unknown type
            timestamp: timestamp
          };
          
          console.log(`[NmeaSensorProcessor] ✅ XDR Tank: Instance ${instance} = ${units === 'P' ? (rawValue + '%') : (rawValue + 'L')} (${tankType}), level ratio: ${level.toFixed(3)}, capacity: ${tankData.capacity}L`);
          
          updates.push({
            sensorType: 'tank',
            instance: instance,
            data: tankData
          });
          continue; // Process next measurement
        }
      }
    }
    
    // Check if this is a temperature measurement
    if (measurementType === 'C' && units && identifier) {
      // Accept a wide variety of YachtDevices-style mnemonics (e.g. SEAW_01, ENG_1, EXHT_2)
      // Accept a wide variety of mnemonics, case-insensitive:
      // Examples matched: SEAW_01, ENG_1, EXHT_2, ENG1, engine-1, seaw01
      // Pattern: <code>[optional _ or - and digits]>
      const tempMatch = identifier.match(/^([A-Za-z0-9]{2,8})(?:[_-]?(\d+))?$/i);
      if (tempMatch) {
        const [, rawLocationCode, instanceStr] = tempMatch;
        const locationCode = (rawLocationCode || '').toUpperCase(); // normalize
        const instance = isNaN(parseInt(instanceStr as string, 10)) ? 0 : parseInt(instanceStr as string, 10);
        let temperature = parseFloat(measurementValue);

        if (isNaN(temperature) || isNaN(instance)) {
          errors.push('Invalid XDR temperature data');
          continue; // Skip this measurement and continue processing others
        }

        // Convert Fahrenheit to Celsius if needed (support both C and F units)
        if (units === 'F') {
          temperature = (temperature - 32) * (5 / 9);
        }

        // Expanded mapping of common YachtDevices / vendor mnemonics -> app locations/names
        const locationMap: Record<string, { location: TemperatureSensorData['location']; name: string }> = {
          // Seawater variants
          'SEAW': { location: 'seawater', name: 'Sea Water Temp' },
          'SEA':  { location: 'seawater', name: 'Sea Water Temp' },
          'WTR':  { location: 'seawater', name: 'Sea Water Temp' },

          // Outside / Air
          'AIRX': { location: 'outside', name: 'Outside Air Temp' },
          'AIR':  { location: 'outside', name: 'Outside Air Temp' },
          'OUT':  { location: 'outside', name: 'Outside Air Temp' },

          // Engine / engine room
          'ENGR': { location: 'engineRoom', name: 'Engine Room Temp' },
          'ENG':  { location: 'engine', name: 'Engine Temp' },

          // Exhaust
          'EXH':  { location: 'exhaust', name: 'Exhaust Temp' },
          'EXHT': { location: 'exhaust', name: 'Exhaust Temp' },

          // Refrigeration / freezer
          'REFR': { location: 'refrigeration', name: 'Refrigeration Temp' },
          'FRIDGE':{ location: 'refrigeration', name: 'Refrigeration Temp' },
          'FRZR': { location: 'freezer', name: 'Freezer Temp' },
          'FREE': { location: 'freezer', name: 'Freezer Temp' },

          // Livewell / baitwell
          'LIVE': { location: 'liveWell', name: 'Live Well Temp' },
          'BAIT': { location: 'baitWell', name: 'Bait Well Temp' },

          // Cabin / generic
          'TEMP': { location: 'cabin', name: 'Cabin Temp' }
        };

        const locationInfo = locationMap[locationCode] || { location: 'cabin', name: `Temperature ${instance}` };

        const temperatureData: Partial<TemperatureSensorData> = {
          name: locationInfo.name,
          value: temperature,
          location: locationInfo.location,
          units: 'C',
          timestamp: timestamp
        };

        console.log(`[NmeaSensorProcessor] ✅ XDR Temperature: Instance ${instance} = ${temperature.toFixed(2)}°C (${locationInfo.location})`);

        updates.push({
          sensorType: 'temperature',
          instance: instance,
          data: temperatureData
        });
        continue; // Process next measurement
      }
    }
    
    // Not a supported XDR measurement type
    } // End of measurement loop
    
    // Merge updates for the same sensor instance to prevent overwriting
    const mergedUpdates: Array<{sensorType: string, instance: number, data: any}> = [];
    const updateMap = new Map<string, any>();
    
    updates.forEach(update => {
      const key = `${update.sensorType}_${update.instance}`;
      if (updateMap.has(key)) {
        // Merge data for same sensor instance
        const existing = updateMap.get(key);
        updateMap.set(key, {
          sensorType: update.sensorType,
          instance: update.instance,
          data: {
            ...existing.data,
            ...update.data
          }
        });
      } else {
        updateMap.set(key, {...update});
      }
    });
    
    // Convert map to array
    updateMap.forEach(update => mergedUpdates.push(update));
    
    // Return collected updates or error
    if (mergedUpdates.length > 0) {
      console.log(`[NmeaSensorProcessor] ✅ XDR: Processed ${updates.length} measurements, merged into ${mergedUpdates.length} updates`);
      mergedUpdates.forEach(update => {
        console.log(`[NmeaSensorProcessor] 📦 Merged update for ${update.sensorType}[${update.instance}]:`, Object.keys(update.data));
      });
      return {
        success: true,
        updates: mergedUpdates,
        messageType: 'XDR'
      };
    }
    
    return {
      success: false,
      errors: errors.length > 0 ? errors : ['No supported XDR measurements found'],
      messageType: 'XDR'
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
   * Parse RMC date/time fields to UTC Date object
   * @param time RMC time field (HHMMSS.SSS format)
   * @param date RMC date field (DDMMYY format)  
   * @returns Date object in UTC or null if parsing fails
   */
  private parseRMCDateTime(time: string, date: string): Date | null {
    if (!time || !date || time.length < 6 || date.length !== 6) {
      return null;
    }

    try {
      // Parse time (HHMMSS.SSS format)
      const hours = parseInt(time.substr(0, 2), 10);
      const minutes = parseInt(time.substr(2, 2), 10);
      const seconds = parseFloat(time.substr(4));

      // Parse date (DDMMYY format) 
      const day = parseInt(date.substr(0, 2), 10);
      const month = parseInt(date.substr(2, 2), 10) - 1; // JavaScript months are 0-based
      let year = parseInt(date.substr(4, 2), 10);
      
      // Handle 2-digit year (assume 20XX for years 00-99)
      if (year < 50) {
        year += 2000;
      } else {
        year += 1900;
      }

      // Create UTC date object
      const utcDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
      
      // Validate the parsed date
      if (isNaN(utcDate.getTime()) || 
          utcDate.getUTCFullYear() !== year ||
          utcDate.getUTCMonth() !== month ||
          utcDate.getUTCDate() !== day) {
        console.warn(`[NmeaSensorProcessor] Invalid RMC date/time: ${date}/${time}`);
        return null;
      }

      return utcDate;
    } catch (error) {
      console.warn(`[NmeaSensorProcessor] Failed to parse RMC date/time: ${date}/${time}`, error);
      return null;
    }
  }

  /**
   * Process NMEA 2000 PGN messages (via PCDIN wrapper)
   * PCDIN format: $PCDIN,<pgn_hex>,<data_fields...>*checksum
   */
  private processPgnMessage(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    log('[NmeaSensorProcessor] 🔍 Processing PGN message:', message.fields);
    const fields = message.fields;
    
    // Extract PGN number and data fields from PCDIN sentence
    const pgnNumber = fields.pgn_number as number;
    const dataFields = fields.data_fields as string[];
    
    if (!pgnNumber || !dataFields || dataFields.length === 0) {
      return {
        success: false,
        errors: ['Invalid PCDIN format: missing PGN number or data fields'],
        messageType: message.messageType
      };
    }
    
    // Join data fields into hex string for pgnParser
    const hexData = dataFields.join('');
    
    console.log(`[NmeaSensorProcessor] 📦 Parsing PGN ${pgnNumber} with data: ${hexData}`);
    
    // Route to appropriate PGN handler based on PGN number
    switch (pgnNumber) {
      case 127488: // Engine Parameters, Rapid Update
      case 127489: // Engine Parameters, Dynamic
        return this.mapPgnEngine(pgnNumber, hexData, timestamp);
      
      case 127508: // Battery Status
      case 127513: // Battery Configuration Status
        return this.mapPgnBattery(pgnNumber, hexData, timestamp);
      
      case 127505: // Fluid Level (Tanks)
        return this.mapPgnTank(pgnNumber, hexData, timestamp);
      
      case 129283: // Cross Track Error
      case 129284: // Navigation Data
      case 129285: // Route/WP Information
        return this.mapPgnNavigation(pgnNumber, hexData, timestamp);
      
      default:
        console.log(`[NmeaSensorProcessor] ⚠️ Unsupported PGN: ${pgnNumber}`);
        return {
          success: false,
          errors: [`Unsupported PGN: ${pgnNumber}`],
          messageType: message.messageType
        };
    }
  }

  /**
   * Process RSA (Rudder Sensor Angle) message
   * Format: $xxRSA,<starboard>,<status>,<port>,<status>*hh
   */
  private processRSA(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;
    
    // RSA can have starboard rudder, port rudder, or both
    let rudderAngle: number | null = null;
    
    // Prefer starboard angle if valid
    if (fields.starboard_status === 'A' && fields.starboard_angle !== null && !isNaN(fields.starboard_angle)) {
      rudderAngle = fields.starboard_angle;
    }
    // Fall back to port angle if starboard not available
    else if (fields.port_status === 'A' && fields.port_angle !== null && !isNaN(fields.port_angle)) {
      rudderAngle = fields.port_angle;
    }
    
    if (rudderAngle === null) {
      return {
        success: false,
        errors: ['No valid rudder angle data'],
        messageType: 'RSA'
      };
    }
    
    const autopilotData: Partial<AutopilotSensorData> = {
      name: 'Autopilot',
      rudderAngle: rudderAngle, // Degrees (+ = starboard, - = port)
      engaged: false, // RSA doesn't provide engagement status
      timestamp: timestamp
    };
    
    const instance = this.extractInstanceId(message);
    
    return {
      success: true,
      updates: [{
        sensorType: 'autopilot',
        instance,
        data: autopilotData
      }],
      messageType: 'RSA'
    };
  }

  /**
   * Process APB (Autopilot Sentence B) message
   * Provides autopilot navigation information
   */
  private processAPB(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;
    const updates: SensorUpdate[] = [];
    
    // Extract autopilot data
    const autopilotData: Partial<AutopilotSensorData> = {
      name: 'Autopilot',
      timestamp: timestamp
    };
    
    // Status indicators
    if (fields.status_cycle_lock === 'A') {
      autopilotData.locked = true;
    }
    
    // Heading to steer
    if (fields.heading_to_steer !== null && !isNaN(fields.heading_to_steer)) {
      autopilotData.targetHeading = fields.heading_to_steer;
    }
    
    // Bearing to destination
    if (fields.bearing_present_to_dest !== null && !isNaN(fields.bearing_present_to_dest)) {
      autopilotData.mode = 'nav'; // APB indicates navigation mode
    }
    
    // Arrival status
    if (fields.status_arrival === 'A') {
      autopilotData.alarm = true; // Arrival alarm
    }
    
    const instance = this.extractInstanceId(message);
    
    updates.push({
      sensorType: 'autopilot',
      instance,
      data: autopilotData
    });
    
    return {
      success: true,
      updates: updates,
      messageType: 'APB'
    };
  }

  /**
   * Process APA (Autopilot Sentence A) message  
   * Provides autopilot navigation information (simplified APB)
   */
  private processAPA(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;
    const updates: SensorUpdate[] = [];
    
    // Extract autopilot data
    const autopilotData: Partial<AutopilotSensorData> = {
      name: 'Autopilot',
      timestamp: timestamp
    };
    
    // Status indicators
    if (fields.status_cycle_lock === 'A') {
      autopilotData.locked = true;
    }
    
    // Bearing to destination indicates navigation mode
    if (fields.bearing_to_dest !== null && !isNaN(fields.bearing_to_dest)) {
      autopilotData.mode = 'nav';
      autopilotData.targetHeading = fields.bearing_to_dest;
    }
    
    // Arrival status
    if (fields.status_arrival === 'A') {
      autopilotData.alarm = true;
    }
    
    const instance = this.extractInstanceId(message);
    
    updates.push({
      sensorType: 'autopilot',
      instance,
      data: autopilotData
    });
    
    return {
      success: true,
      updates: updates,
      messageType: 'APA'
    };
  }

  /**
   * Process binary NMEA 2000 PGN messages
   * Format: $BINARY,<PGN_HEX>,<SOURCE_HEX>,<DATA_HEX_BYTES>
   */
  private processBinaryPgnMessage(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    log('[NmeaSensorProcessor] 🔍 Processing binary PGN message:', message.fields);
    const fields = message.fields;
    
    // Extract PGN, source, and data from fields
    // field_1 = PGN in hex, field_2 = source in hex, field_3 = continuous hex data string
    const pgnHex = fields.field_1 as string;
    const sourceHex = fields.field_2 as string;
    const hexData = fields.field_3 as string;
    
    if (!pgnHex) {
      return {
        success: false,
        errors: ['Invalid BINARY format: missing PGN'],
        messageType: message.messageType
      };
    }
    
    if (!hexData) {
      return {
        success: false,
        errors: ['Invalid BINARY format: missing data'],
        messageType: message.messageType
      };
    }
    
    // Parse PGN number from hex
    const pgnNumber = parseInt(pgnHex, 16);
    
    console.log(`[NmeaSensorProcessor] 📦 Parsing binary PGN ${pgnNumber} (0x${pgnHex}) with data: ${hexData}`);
    
    // Route to appropriate PGN handler based on PGN number
    switch (pgnNumber) {
      case 128267: // Water Depth
        return this.mapPgnDepth(pgnNumber, hexData, timestamp);
      
      case 128259: // Speed (Water Referenced)
        return this.mapPgnSpeed(pgnNumber, hexData, timestamp);
      
      case 130306: // Wind Data
        return this.mapPgnWind(pgnNumber, hexData, timestamp);
      
      case 129029: // GNSS Position Data
        return this.mapPgnGPS(pgnNumber, hexData, timestamp);
      
      case 127250: // Vessel Heading
        return this.mapPgnHeading(pgnNumber, hexData, timestamp);
      
      case 130310: // Environmental Parameters (Temperature)
        return this.mapPgnTemperature(pgnNumber, hexData, timestamp);
      
      case 127245: // Rudder
        return this.mapPgnRudder(pgnNumber, hexData, timestamp);
      
      case 127488: // Engine Parameters, Rapid Update
      case 127489: // Engine Parameters, Dynamic
        return this.mapPgnEngine(pgnNumber, hexData, timestamp);
      
      case 127508: // Battery Status
      case 127513: // Battery Configuration Status
        return this.mapPgnBattery(pgnNumber, hexData, timestamp);
      
      case 127505: // Fluid Level (Tanks)
        return this.mapPgnTank(pgnNumber, hexData, timestamp);
      
      case 129283: // Cross Track Error
      case 129284: // Navigation Data
      case 129285: // Route/WP Information
        return this.mapPgnNavigation(pgnNumber, hexData, timestamp);
      
      default:
        console.log(`[NmeaSensorProcessor] ⚠️ Unsupported binary PGN: ${pgnNumber} (0x${pgnHex})`);
        return {
          success: false,
          errors: [`Unsupported binary PGN: ${pgnNumber}`],
          messageType: message.messageType
        };
    }
  }

  /**
   * Map Engine PGN data to SensorUpdate
   * PGN 127488: Engine Parameters, Rapid Update
   * PGN 127489: Engine Parameters, Dynamic
   */
  private mapPgnEngine(pgnNumber: number, hexData: string, timestamp: number): ProcessingResult {
    try {
      const pgnData = pgnParser.parseEnginePgn(pgnNumber, hexData, 0);
      
      if (!pgnData) {
        return {
          success: false,
          errors: [`Failed to parse engine PGN ${pgnNumber}`]
        };
      }
      
      // Extract instance from source address or use default
      const instance = pgnData.instance ?? pgnData.sourceAddress ?? 0;
      
      const engineUpdate: Partial<EngineSensorData> = {
        name: `Engine ${instance}`,
        timestamp
      };
      
      // Map engine speed (RPM)
      if (pgnData.engineSpeed !== undefined && pgnData.engineSpeed !== null) {
        engineUpdate.rpm = pgnData.engineSpeed;
        console.log(`[NmeaSensorProcessor] 🔧 Engine ${instance} RPM: ${pgnData.engineSpeed}`);
      }
      
      // Map boost pressure if available
      if (pgnData.engineBoostPressure !== undefined) {
        // Store as additional data - could extend EngineSensorData interface later
        console.log(`[NmeaSensorProcessor] 🔧 Engine ${instance} Boost: ${pgnData.engineBoostPressure} kPa`);
      }
      
      const updates: SensorUpdate[] = [{
        sensorType: 'engine',
        instance,
        data: engineUpdate
      }];
      
      return {
        success: true,
        updates,
        messageType: `PGN${pgnNumber}`
      };
      
    } catch (error) {
      return {
        success: false,
        errors: [`Error mapping engine PGN ${pgnNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Map Battery PGN data to SensorUpdate
   * PGN 127508: Battery Status
   * PGN 127513: Battery Configuration Status
   */
  private mapPgnBattery(pgnNumber: number, hexData: string, timestamp: number): ProcessingResult {
    try {
      const pgnData = pgnParser.parseBatteryPgn(pgnNumber, hexData);
      
      if (!pgnData || pgnData.instance === undefined) {
        return {
          success: false,
          errors: [`Failed to parse battery PGN ${pgnNumber} or missing instance`]
        };
      }
      
      const instance = pgnData.instance;
      
      const batteryUpdate: Partial<BatterySensorData> = {
        name: `Battery ${instance}`,
        timestamp
      };
      
      // Map voltage
      if (pgnData.batteryVoltage !== undefined && pgnData.batteryVoltage !== null) {
        batteryUpdate.voltage = pgnData.batteryVoltage;
        console.log(`[NmeaSensorProcessor] 🔋 Battery ${instance} Voltage: ${pgnData.batteryVoltage}V`);
      }
      
      // Map current
      if (pgnData.batteryCurrent !== undefined && pgnData.batteryCurrent !== null) {
        batteryUpdate.current = pgnData.batteryCurrent;
        console.log(`[NmeaSensorProcessor] 🔋 Battery ${instance} Current: ${pgnData.batteryCurrent}A`);
      }
      
      // Map temperature (convert from Kelvin to Celsius)
      if (pgnData.batteryTemperature !== undefined && pgnData.batteryTemperature !== null) {
        batteryUpdate.temperature = pgnData.batteryTemperature - 273.15;
        console.log(`[NmeaSensorProcessor] 🔋 Battery ${instance} Temp: ${batteryUpdate.temperature}°C`);
      }
      
      const updates: SensorUpdate[] = [{
        sensorType: 'battery',
        instance,
        data: batteryUpdate
      }];
      
      return {
        success: true,
        updates,
        messageType: `PGN${pgnNumber}`
      };
      
    } catch (error) {
      return {
        success: false,
        errors: [`Error mapping battery PGN ${pgnNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Map Tank PGN data to SensorUpdate
   * PGN 127505: Fluid Level
   */
  private mapPgnTank(pgnNumber: number, hexData: string, timestamp: number): ProcessingResult {
    try {
      const pgnData = pgnParser.parseTankPgn(pgnNumber, hexData);
      
      if (!pgnData || pgnData.instance === undefined) {
        return {
          success: false,
          errors: [`Failed to parse tank PGN ${pgnNumber} or missing instance`]
        };
      }
      
      const instance = pgnData.instance;
      
      // Map fluid type to our TankSensorData type
      const fluidTypeMap: Record<number, 'fuel' | 'water' | 'waste' | 'ballast' | 'blackwater'> = {
        0: 'fuel',
        1: 'water',
        2: 'waste',      // Gray water
        3: 'water',      // Live well (treat as water)
        4: 'fuel',       // Oil (treat as fuel)
        5: 'blackwater'  // Black water
      };
      
      const tankType = fluidTypeMap[pgnData.fluidType] || 'fuel';
      
      const tankUpdate: Partial<TankSensorData> = {
        name: `${tankType.charAt(0).toUpperCase() + tankType.slice(1)} Tank ${instance}`,
        type: tankType,
        timestamp
      };
      
      // Map level (convert from percentage to ratio 0-1)
      if (pgnData.level !== undefined && pgnData.level !== null) {
        tankUpdate.level = pgnData.level / 100.0;
        console.log(`[NmeaSensorProcessor] 🛢️ Tank ${instance} (${tankType}) Level: ${pgnData.level}%`);
      }
      
      // Map capacity
      if (pgnData.capacity !== undefined && pgnData.capacity !== null) {
        tankUpdate.capacity = pgnData.capacity;
        console.log(`[NmeaSensorProcessor] 🛢️ Tank ${instance} Capacity: ${pgnData.capacity}L`);
      }
      
      const updates: SensorUpdate[] = [{
        sensorType: 'tank',
        instance,
        data: tankUpdate
      }];
      
      return {
        success: true,
        updates,
        messageType: `PGN${pgnNumber}`
      };
      
    } catch (error) {
      return {
        success: false,
        errors: [`Error mapping tank PGN ${pgnNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Map Navigation PGN data to SensorUpdate
   * PGN 129283: Cross Track Error
   * PGN 129284: Navigation Data  
   * PGN 129285: Route/Waypoint Information
   */
  private mapPgnNavigation(pgnNumber: number, hexData: string, timestamp: number): ProcessingResult {
    try {
      const instance = 0; // Navigation data typically uses instance 0
      
      // Get current navigation data or initialize
      const currentNav = useNmeaStore.getState().nmeaData.sensors.navigation?.[instance] || {};
      const navigationUpdate: Partial<NavigationSensorData> = {
        ...currentNav,
        timestamp
      };
      
      // Parse based on PGN type
      switch (pgnNumber) {
        case 129283: { // Cross Track Error
          const xteData = pgnParser.parseCrossTrackErrorPgn(hexData);
          if (xteData) {
            navigationUpdate.crossTrackError = xteData.crossTrackError;
            navigationUpdate.steerDirection = xteData.steerDirection;
            console.log(`[NmeaSensorProcessor] 🧭 XTE: ${xteData.crossTrackError.toFixed(3)} nm, Steer: ${xteData.steerDirection || 'N/A'}`);
          }
          break;
        }
        
        case 129284: { // Navigation Data
          const navData = pgnParser.parseNavigationDataPgn(hexData);
          if (navData) {
            if (navData.distanceToWaypoint !== undefined) {
              navigationUpdate.distanceToWaypoint = navData.distanceToWaypoint;
            }
            if (navData.bearingToWaypoint !== undefined) {
              navigationUpdate.bearingToWaypoint = navData.bearingToWaypoint;
            }
            if (navData.waypointClosingVelocity !== undefined) {
              navigationUpdate.velocityMadeGood = navData.waypointClosingVelocity;
            }
            if (navData.originWaypointId !== undefined) {
              navigationUpdate.originWaypointId = navData.originWaypointId.toString();
            }
            if (navData.destinationWaypointId !== undefined) {
              navigationUpdate.waypointId = navData.destinationWaypointId.toString();
            }
            // Determine arrival status
            if (navData.arrivalCircleEntered) {
              navigationUpdate.arrivalStatus = 'arrived';
            } else if (navData.perpendicularPassed) {
              navigationUpdate.arrivalStatus = 'perpendicular';
            }
            console.log(`[NmeaSensorProcessor] 🧭 Nav: BRG=${navData.bearingToWaypoint?.toFixed(0)}°, DIST=${navData.distanceToWaypoint?.toFixed(2)} nm, VMG=${navData.waypointClosingVelocity?.toFixed(1)} kts`);
          }
          break;
        }
        
        case 129285: { // Route/Waypoint Information
          const wpData = pgnParser.parseRouteWaypointPgn(hexData);
          if (wpData) {
            if (wpData.waypointId !== undefined) {
              navigationUpdate.waypointId = wpData.waypointId.toString();
            }
            if (wpData.waypointName) {
              navigationUpdate.waypointName = wpData.waypointName;
            }
            if (wpData.waypointLatitude !== undefined && wpData.waypointLongitude !== undefined) {
              navigationUpdate.waypointPosition = {
                latitude: wpData.waypointLatitude,
                longitude: wpData.waypointLongitude
              };
            }
            console.log(`[NmeaSensorProcessor] 🧭 Waypoint: ${wpData.waypointName || wpData.waypointId || 'Unknown'}`);
          }
          break;
        }
      }
      
      const updates: SensorUpdate[] = [{
        sensorType: 'navigation',
        instance,
        data: navigationUpdate
      }];
      
      return {
        success: true,
        updates,
        messageType: `PGN${pgnNumber}`
      };
      
    } catch (error) {
      return {
        success: false,
        errors: [`Error mapping navigation PGN ${pgnNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Parse GGA time field to UTC Date object (uses today's date)
   * @param time GGA time field (HHMMSS.SSS format)
   * @returns Date object in UTC or null if parsing fails
   */
  private parseGGATime(time: string): Date | null {
    if (!time || time.length < 6) {
      return null;
    }

    try {
      // Parse time (HHMMSS.SSS format)
      const hours = parseInt(time.substr(0, 2), 10);
      const minutes = parseInt(time.substr(2, 2), 10);
      const seconds = parseFloat(time.substr(4));

      // Use today's date in UTC
      const now = new Date();
      const utcDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        hours,
        minutes,
        seconds
      ));
      
      // Validate the parsed time
      if (isNaN(utcDate.getTime())) {
        console.warn(`[NmeaSensorProcessor] Invalid GGA time: ${time}`);
        return null;
      }

      return utcDate;
    } catch (error) {
      console.warn(`[NmeaSensorProcessor] Failed to parse GGA time: ${time}`, error);
      return null;
    }
  }

  /**
   * Process ZDA (Time & Date) message
   * Provides complete UTC date and time
   */
  private processZDA(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    const fields = message.fields;

    // Extract UTC date/time from ZDA fields
    if (fields.time && fields.day != null && fields.month != null && fields.year != null) {
      const utcDateTime = this.parseZDADateTime(fields.time, fields.day, fields.month, fields.year);
      
      if (utcDateTime) {
        const gpsData: Partial<GpsSensorData> = {
          name: 'GPS Receiver',
          utcTime: utcDateTime.getTime(),
          timeSource: 'ZDA', // Priority 2
          timestamp: timestamp
        };

        const instance = this.extractInstanceId(message);
        
        return {
          success: true,
          updates: [{
            sensorType: 'gps',
            instance,
            data: gpsData
          }],
          messageType: 'ZDA'
        };
      }
    }

    return {
      success: false,
      errors: ['Invalid ZDA date/time fields'],
      messageType: 'ZDA'
    };
  }

  /**
   * Parse ZDA date/time fields to UTC Date object
   * @param time ZDA time field (HHMMSS.SSS format)
   * @param day Day (1-31)
   * @param month Month (1-12)
   * @param year Full year (YYYY)
   * @returns Date object in UTC or null if parsing fails
   */
  private parseZDADateTime(time: string, day: number, month: number, year: number): Date | null {
    if (!time || time.length < 6) {
      return null;
    }

    try {
      // Parse time (HHMMSS.SSS format)
      const hours = parseInt(time.substr(0, 2), 10);
      const minutes = parseInt(time.substr(2, 2), 10);
      const seconds = parseFloat(time.substr(4));

      // Create UTC date object (month is 0-based in JavaScript)
      const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
      
      // Validate the parsed date
      if (isNaN(utcDate.getTime()) ||
          utcDate.getUTCFullYear() !== year ||
          utcDate.getUTCMonth() !== month - 1 ||
          utcDate.getUTCDate() !== day) {
        console.warn(`[NmeaSensorProcessor] Invalid ZDA date/time: ${year}-${month}-${day} ${time}`);
        return null;
      }

      return utcDate;
    } catch (error) {
      console.warn(`[NmeaSensorProcessor] Failed to parse ZDA date/time: ${year}-${month}-${day} ${time}`, error);
      return null;
    }
  }

  /**
   * Get processing statistics
   */
  public getStats(): {
    supportedMessageTypes: string[];
    totalMessages: number;
    successfulMessages: number;
    failedMessages: number;
  } {
    return {
      supportedMessageTypes: ['RPM', 'DBT', 'DPT', 'DBK', 'GGA', 'RMC', 'VTG', 'VHW', 'MWV', 'HDG', 'MTW'],
      totalMessages: 0, // TODO: Add statistics tracking
      successfulMessages: 0,
      failedMessages: 0
    };
  }

  /**
   * Map Depth PGN data to SensorUpdate (PGN 128267)
   */
  private mapPgnDepth(pgnNumber: number, hexData: string, timestamp: number): ProcessingResult {
    try {
      const depthData = pgnParser.parseDepthPgn(hexData);
      if (!depthData) {
        return { success: false, errors: ['Failed to parse depth PGN'] };
      }

      const update: SensorUpdate = {
        sensorType: 'depth',
        instance: depthData.instance,
        value: depthData.depth,
        unit: 'meters',
        timestamp
      };

      return {
        success: true,
        updates: [update],
        messageType: 'BINARY'
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Depth PGN parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Map Speed PGN data to SensorUpdate (PGN 128259)
   */
  private mapPgnSpeed(pgnNumber: number, hexData: string, timestamp: number): ProcessingResult {
    try {
      const speedData = pgnParser.parseSpeedPgn(hexData);
      if (!speedData) {
        return { success: false, errors: ['Failed to parse speed PGN'] };
      }

      const update: SensorUpdate = {
        sensorType: 'speed',
        instance: speedData.instance,
        value: speedData.speed,
        unit: 'knots',
        timestamp
      };

      return {
        success: true,
        updates: [update],
        messageType: 'BINARY'
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Speed PGN parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Map Wind PGN data to SensorUpdate (PGN 130306)
   */
  private mapPgnWind(pgnNumber: number, hexData: string, timestamp: number): ProcessingResult {
    try {
      const windData = pgnParser.parseWindPgn(hexData);
      if (!windData) {
        return { success: false, errors: ['Failed to parse wind PGN'] };
      }

      const updates: SensorUpdate[] = [
        {
          sensorType: 'wind_speed',
          instance: windData.instance,
          value: windData.windSpeed,
          unit: 'knots',
          timestamp
        },
        {
          sensorType: 'wind_direction',
          instance: windData.instance,
          value: windData.windAngle,
          unit: 'degrees',
          timestamp
        }
      ];

      return {
        success: true,
        updates,
        messageType: 'BINARY'
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Wind PGN parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Map GPS PGN data to SensorUpdate (PGN 129029)
   */
  private mapPgnGPS(pgnNumber: number, hexData: string, timestamp: number): ProcessingResult {
    try {
      const gpsData = pgnParser.parseGPSPgn(hexData);
      if (!gpsData) {
        return { success: false, errors: ['Failed to parse GPS PGN'] };
      }

      const updates: SensorUpdate[] = [
        {
          sensorType: 'gps_latitude',
          instance: gpsData.instance,
          value: gpsData.latitude,
          unit: 'degrees',
          timestamp
        },
        {
          sensorType: 'gps_longitude',
          instance: gpsData.instance,
          value: gpsData.longitude,
          unit: 'degrees',
          timestamp
        }
      ];

      return {
        success: true,
        updates,
        messageType: 'BINARY'
      };
    } catch (error) {
      return {
        success: false,
        errors: [`GPS PGN parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Map Heading PGN data to SensorUpdate (PGN 127250)
   */
  private mapPgnHeading(pgnNumber: number, hexData: string, timestamp: number): ProcessingResult {
    try {
      const headingData = pgnParser.parseHeadingPgn(hexData);
      if (!headingData) {
        return { success: false, errors: ['Failed to parse heading PGN'] };
      }

      const update: SensorUpdate = {
        sensorType: 'heading',
        instance: headingData.instance,
        value: headingData.heading,
        unit: 'degrees',
        timestamp
      };

      return {
        success: true,
        updates: [update],
        messageType: 'BINARY'
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Heading PGN parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Map Temperature PGN data to SensorUpdate (PGN 130310)
   */
  private mapPgnTemperature(pgnNumber: number, hexData: string, timestamp: number): ProcessingResult {
    try {
      const tempData = pgnParser.parseTemperaturePgn(hexData);
      if (!tempData) {
        return { success: false, errors: ['Failed to parse temperature PGN'] };
      }

      const update: SensorUpdate = {
        sensorType: 'water_temperature',
        instance: tempData.instance,
        value: tempData.temperature,
        unit: 'celsius',
        timestamp
      };

      return {
        success: true,
        updates: [update],
        messageType: 'BINARY'
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Temperature PGN parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Map Rudder PGN data to SensorUpdate (PGN 127245)
   */
  private mapPgnRudder(pgnNumber: number, hexData: string, timestamp: number): ProcessingResult {
    try {
      const rudderData = pgnParser.parseRudderPgn(hexData);
      if (!rudderData) {
        return { success: false, errors: ['Failed to parse rudder PGN'] };
      }

      // Extract instance from PGN data if available, otherwise default to 0
      const instance = rudderData.instance ?? 0;
      
      const update: SensorUpdate = {
        sensorType: 'rudder',
        instance,
        value: rudderData.rudderAngle,
        unit: 'degrees',
        timestamp
      };

      return {
        success: true,
        updates: [update],
        messageType: 'BINARY'
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Rudder PGN parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }
}

// Export singleton instance
export const nmeaSensorProcessor = NmeaSensorProcessor.getInstance();