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

import type { ParsedNmeaMessage } from '../parsing/PureNmeaParser';
import { normalizeApparentWindAngle, normalizeTrueWindAngle } from '../../../utils/marineAngles';
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
  TankSensorData
} from '../../../types/SensorData';
import { useWidgetStore } from '../../../store/widgetStore';

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
  private widgetStore: ReturnType<typeof useWidgetStore.getState> | null = null;
  
  static getInstance(): NmeaSensorProcessor {
    if (!NmeaSensorProcessor.instance) {
      NmeaSensorProcessor.instance = new NmeaSensorProcessor();
    }
    return NmeaSensorProcessor.instance;
  }
  
  /**
   * Initialize widget store connection for dynamic widget lifecycle management
   */
  initializeWidgetStore(): void {
    try {
      this.widgetStore = useWidgetStore.getState();
      console.log('[NmeaSensorProcessor] ✅ Widget store initialized for dynamic widget lifecycle');
    } catch (error) {
      console.warn('[NmeaSensorProcessor] ⚠️ Could not initialize widget store:', error);
    }
  }
  
  // Throttle timestamp updates to prevent React infinite loops
  private lastTimestampUpdate: Map<string, number> = new Map();
  private readonly TIMESTAMP_UPDATE_THROTTLE_MS = 5000; // 5 seconds

  /**
   * Update widget timestamp for data freshness tracking
   */
  private updateWidgetTimestamp(sensorType: SensorType, instance: number): void {
    try {
      // Map sensor type to widget ID for timestamp tracking
      let widgetId: string;
      if (sensorType === 'tank' || sensorType === 'engine' || sensorType === 'battery') {
        // Multi-instance widgets need instance-specific IDs
        if (sensorType === 'tank') {
          widgetId = `tank-${instance}`;
        } else if (sensorType === 'engine') {
          widgetId = `engine-${instance}`;
        } else {
          widgetId = `battery-${instance}`;
        }
      } else {
        // Single-instance widgets (depth, gps, speed, wind, compass)
        widgetId = sensorType;
      }
      
      // Check if widget store is initialized
      if (!this.widgetStore) {
        console.warn(`[NmeaSensorProcessor] Widget store not initialized, skipping timestamp update for ${widgetId}`);
        return;
      }
      
      // Throttle timestamp updates to prevent React infinite loops
      const now = Date.now();
      const lastUpdate = this.lastTimestampUpdate.get(widgetId) || 0;
      
      if (now - lastUpdate >= this.TIMESTAMP_UPDATE_THROTTLE_MS) {
        this.widgetStore.updateWidgetDataTimestamp(widgetId);
        this.lastTimestampUpdate.set(widgetId, now);
        console.log(`[NmeaSensorProcessor] 📅 Updated timestamp for widget: ${widgetId}`);
      }
      
    } catch (error) {
      console.warn('[NmeaSensorProcessor] Failed to update widget timestamp:', error);
    }
  }

  /**
   * Process parsed NMEA message directly to sensor updates
   */
  processMessage(parsedMessage: ParsedNmeaMessage): ProcessingResult {
    try {
      const timestamp = Date.now();
      console.log('[NmeaSensorProcessor] Processing message:', parsedMessage.messageType);
      
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
        case 'XDR':
          result = this.processXDR(parsedMessage, timestamp);
          break;
        default:
          result = {
            success: false,
            errors: [`Unsupported message type: ${parsedMessage.messageType}`],
            messageType: parsedMessage.messageType
          };
      }
      
      // Update widget timestamps for successful processing
      if (result.success && result.updates) {
        result.updates.forEach(update => {
          this.updateWidgetTimestamp(update.sensorType, update.instance);
        });
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
   * Process RPM (Engine RPM and Pitch) message
   * Format: $--RPM,S,n,x.x,A*hh
   * Where: S = Source (E=Engine), n = Instance, x.x = RPM value, A = Valid
   */
  private processRPM(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
    console.log('[NmeaSensorProcessor] 🔍 Processing RPM - Raw fields:', message.fields);
    const fields = message.fields;
    
    // Check if this is engine RPM (source = 'E')
    if (fields.source !== 'E') {
      console.log('[NmeaSensorProcessor] ❌ RPM not for engine, source:', fields.source);
      return {
        success: false,
        errors: ['RPM message is not for engine (source not E)'],
        messageType: 'RPM'
      };
    }

    // Extract and validate engine instance and RPM value
    const engineInstance = parseInt(fields.instance) || 0;
    const rpmValue = parseFloat(fields.rpm);
    const status = fields.status;

    console.log('[NmeaSensorProcessor] 🔧 RPM parsing:', {
      engineInstance,
      rpmValue,
      status,
      rpmIsNaN: isNaN(rpmValue),
      statusValid: status === 'A'
    });

    // Validate data
    if (isNaN(rpmValue) || status !== 'A') {
      console.log('[NmeaSensorProcessor] ❌ RPM validation failed:', {
        rpmValue,
        rpmIsNaN: isNaN(rpmValue),
        status,
        statusValid: status === 'A'
      });
      return {
        success: false,
        errors: ['Invalid RPM data or status not valid'],
        messageType: 'RPM'
      };
    }

    // Create engine sensor update
    const engineData: Partial<EngineSensorData> = {
      name: `Engine ${engineInstance + 1}`,
      rpm: rpmValue, // Raw RPM value (no unit conversion needed)
      timestamp: timestamp
    };

    console.log(`[NmeaSensorProcessor] ✅ RPM SUCCESS: Engine ${engineInstance} = ${rpmValue} RPM`);

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

    // Create depth sensor update
    const depthData: Partial<DepthSensorData> = {
      name: 'Depth Sounder',
      depth: depthMeters, // Always in meters (base unit)
      referencePoint: 'transducer', // DBT is depth below transducer
      timestamp: timestamp
    };

    return {
      success: true,
      updates: [{
        sensorType: 'depth',
        instance: 0, // Depth is typically single instance
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

    // Create depth sensor update
    const depthData: Partial<DepthSensorData> = {
      name: 'Depth Sounder',
      depth: fields.depth_meters, // Always in meters (base unit)
      referencePoint: 'waterline', // DPT typically represents depth from waterline
      timestamp: timestamp
    };

    return {
      success: true,
      updates: [{
        sensorType: 'depth',
        instance: 0,
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

    // Create depth sensor update
    const depthData: Partial<DepthSensorData> = {
      name: 'Depth Sounder',
      depth: depthMeters, // Always in meters (base unit)
      referencePoint: 'keel', // DBK is depth below keel
      timestamp: timestamp
    };

    return {
      success: true,
      updates: [{
        sensorType: 'depth',
        instance: 0,
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
      timestamp: timestamp
    };

    return {
      success: true,
      updates: [{
        sensorType: 'gps',
        instance: 0, // GPS is typically single instance
        data: gpsData
      }],
      messageType: 'GGA'
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
          timestamp: timestamp
        };

        // Add UTC time and date if available
        if (fields.time && fields.date) {
          const utcDateTime = this.parseRMCDateTime(fields.time, fields.date);
          if (utcDateTime) {
            gpsData.utcTime = utcDateTime.getTime(); // Convert Date to timestamp (number)
          }
        }

        updates.push({
          sensorType: 'gps',
          instance: 0,
          data: gpsData
        });
      }
    }

    // Speed over ground
    if (fields.speed_knots !== null && !isNaN(fields.speed_knots)) {
      const speedData: Partial<SpeedSensorData> = {
        name: 'GPS Speed',
        overGround: fields.speed_knots, // Speed over ground in knots (base unit)
        timestamp: timestamp
      };

      updates.push({
        sensorType: 'speed',
        instance: 0,
        data: speedData
      });
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
      const speedData: Partial<SpeedSensorData> = {
        name: 'GPS Speed',
        overGround: fields.speed_knots, // Speed over ground in knots (base unit)
        timestamp: timestamp
      };

      return {
        success: true,
        updates: [{
          sensorType: 'speed',
          instance: 0,
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

    // Speed through water - VHW provides STW specifically
    if (fields.speed_knots !== null && !isNaN(fields.speed_knots)) {
      const speedData: Partial<SpeedSensorData> = {
        name: 'Log Speed',
        throughWater: fields.speed_knots, // Speed through water in knots (base unit)
        timestamp: timestamp
      };

      updates.push({
        sensorType: 'speed',
        instance: 0,
        data: speedData
      });
    }

    // Heading (true or magnetic)
    if (fields.heading_true !== null && !isNaN(fields.heading_true)) {
      const compassData: Partial<CompassSensorData> = {
        name: 'Compass',
        heading: fields.heading_true, // True heading in degrees (base unit)
        timestamp: timestamp
      };

      updates.push({
        sensorType: 'compass',
        instance: 0,
        data: compassData
      });
    } else if (fields.heading_magnetic !== null && !isNaN(fields.heading_magnetic)) {
      const compassData: Partial<CompassSensorData> = {
        name: 'Compass',
        heading: fields.heading_magnetic, // Magnetic heading in degrees (base unit)
        timestamp: timestamp
      };

      updates.push({
        sensorType: 'compass',
        instance: 0,
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
    const windData: Partial<WindSensorData> = {
      name: 'Wind Sensor',
      angle: normalizedAngle, // Normalized wind angle in degrees
      speed: windSpeedKnots, // Wind speed in knots (base unit)
      timestamp: timestamp
    };

    // Set true or apparent wind based on reference
    if (fields.reference === 'T') {
      windData.trueAngle = fields.wind_angle;
      windData.trueSpeed = windSpeedKnots;
    }

    return {
      success: true,
      updates: [{
        sensorType: 'wind',
        instance: 0, // Wind is typically single instance
        data: windData
      }],
      messageType: 'MWV'
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
    const compassData: Partial<CompassSensorData> = {
      name: 'Compass',
      heading: fields.magnetic_heading, // Magnetic heading in degrees (base unit)
      timestamp: timestamp
    };

    return {
      success: true,
      updates: [{
        sensorType: 'compass',
        instance: 0,
        data: compassData
      }],
      messageType: 'HDG'
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

    return {
      success: true,
      updates: [{
        sensorType: 'temperature',
        instance: 0, // Sea water temperature is instance 0
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
    console.log('[NmeaSensorProcessor] XDR fields:', fields);
    
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
      // Battery voltage measurement (U=voltage, V=volts, BAT_X)
      const batteryVoltageMatch = identifier.match(/^BAT_(\d+)$/);
      if (batteryVoltageMatch && measurementType === 'U' && units === 'V') {
        const instance = parseInt(batteryVoltageMatch[1], 10);
        const voltage = parseFloat(measurementValue);
        
        if (!isNaN(voltage) && !isNaN(instance)) {
          const batteryData: Partial<BatterySensorData> = {
            name: `Battery ${instance + 1}`,
            voltage: voltage,
            timestamp: timestamp
          };
          
          console.log(`[NmeaSensorProcessor] ✅ XDR Battery Voltage: Instance ${instance} = ${voltage}V`);
          
          updates.push({
            sensorType: 'battery',
            instance: instance,
            data: batteryData
          });
          continue; // Process next measurement
        }
      }
      
      // Battery current measurement (I=current, A=amperes, BAT_X)
      const batteryCurrentMatch = identifier.match(/^BAT_(\d+)$/);
      if (batteryCurrentMatch && measurementType === 'I' && units === 'A') {
        const instance = parseInt(batteryCurrentMatch[1], 10);
        const current = parseFloat(measurementValue);
        
        if (!isNaN(current) && !isNaN(instance)) {
          const batteryData: Partial<BatterySensorData> = {
            current: current,
            timestamp: timestamp
          };
          
          console.log(`[NmeaSensorProcessor] ✅ XDR Battery Current: Instance ${instance} = ${current}A`);
          
          updates.push({
            sensorType: 'battery',
            instance: instance,
            data: batteryData
          });
          continue; // Process next measurement
        }
      }
      
      // Battery temperature measurement (C=temperature, C=celsius, BAT_X_TMP)
      const batteryTempMatch = identifier.match(/^BAT_(\d+)_TMP$/);
      if (batteryTempMatch && measurementType === 'C' && units === 'C') {
        const instance = parseInt(batteryTempMatch[1], 10);
        const temperature = parseFloat(measurementValue);
        
        if (!isNaN(temperature) && !isNaN(instance)) {
          const batteryData: Partial<BatterySensorData> = {
            temperature: temperature,
            timestamp: timestamp
          };
          
          console.log(`[NmeaSensorProcessor] ✅ XDR Battery Temperature: Instance ${instance} = ${temperature}°C`);
          
          updates.push({
            sensorType: 'battery',
            instance: instance,
            data: batteryData
          });
          continue; // Process next measurement
        }
      }
      
      // Battery State of Charge measurement (P=percentage, P=percent, BAT_X_SOC)
      const batterySocMatch = identifier.match(/^BAT_(\d+)_SOC$/);
      if (batterySocMatch && measurementType === 'P' && units === 'P') {
        const instance = parseInt(batterySocMatch[1], 10);
        const soc = parseFloat(measurementValue);
        
        if (!isNaN(soc) && !isNaN(instance)) {
          const batteryData: Partial<BatterySensorData> = {
            stateOfCharge: soc,
            timestamp: timestamp
          };
          
          console.log(`[NmeaSensorProcessor] ✅ XDR Battery SOC: Instance ${instance} = ${soc}%`);
          
          updates.push({
            sensorType: 'battery',
            instance: instance,
            data: batteryData
          });
          continue; // Process next measurement
        }
      }
      
      // Battery nominal voltage measurement (U=voltage, V=volts, BAT_X_NOM)
      const batteryNomMatch = identifier.match(/^BAT_(\d+)_NOM$/);
      if (batteryNomMatch && measurementType === 'U' && units === 'V') {
        const instance = parseInt(batteryNomMatch[1], 10);
        const nominalVoltage = parseFloat(measurementValue);
        
        if (!isNaN(nominalVoltage) && !isNaN(instance)) {
          const batteryData: Partial<BatterySensorData> = {
            nominalVoltage: nominalVoltage,
            timestamp: timestamp
          };
          
          console.log(`[NmeaSensorProcessor] ✅ XDR Battery Nominal: Instance ${instance} = ${nominalVoltage}V`);
          
          updates.push({
            sensorType: 'battery',
            instance: instance,
            data: batteryData
          });
          continue; // Process next measurement
        }
      }
      
      // Battery chemistry measurement (G=general string, no units, BAT_X_CHEM)
      const batteryChemMatch = identifier.match(/^BAT_(\d+)_CHEM$/);
      if (batteryChemMatch && measurementType === 'G') {
        const instance = parseInt(batteryChemMatch[1], 10);
        const chemistry = measurementValue;
        
        if (chemistry && !isNaN(instance)) {
          const batteryData: Partial<BatterySensorData> = {
            chemistry: chemistry,
            timestamp: timestamp
          };
          
          console.log(`[NmeaSensorProcessor] ✅ XDR Battery Chemistry: Instance ${instance} = ${chemistry}`);
          
          updates.push({
            sensorType: 'battery',
            instance: instance,
            data: batteryData
          });
          continue; // Process next measurement
        }
      }
      
      // Battery capacity measurement (V=volume/capacity, H=amp-hours, BAT_X_CAP)
      const batteryCapMatch = identifier.match(/^BAT_(\d+)_CAP$/);
      if (batteryCapMatch && measurementType === 'V' && units === 'H') {
        const instance = parseInt(batteryCapMatch[1], 10);
        const capacity = parseFloat(measurementValue);
        
        if (!isNaN(capacity) && !isNaN(instance)) {
          const batteryData: Partial<BatterySensorData> = {
            capacity: capacity,
            timestamp: timestamp
          };
          
          console.log(`[NmeaSensorProcessor] ✅ XDR Battery Capacity: Instance ${instance} = ${capacity}Ah`);
          
          updates.push({
            sensorType: 'battery',
            instance: instance,
            data: batteryData
          });
          continue; // Process next measurement
        }
      }
    }
    
    // Check if this is engine measurement (ENGINE#X identifiers)
    if (identifier) {
      // Engine coolant temperature (C=temperature, F=fahrenheit, ENGINE#X)
      const engineTempMatch = identifier.match(/^ENGINE#(\d+)$/);
      console.log(`[NmeaSensorProcessor] XDR Engine check: identifier="${identifier}", tempMatch=${!!engineTempMatch}, type="${measurementType}", units="${units}"`);
      
      if (engineTempMatch && measurementType === 'C' && units === 'F') {
        const instance = parseInt(engineTempMatch[1], 10) - 1; // ENGINE#1 -> instance 0
        let temperature = parseFloat(measurementValue);
        
        if (!isNaN(temperature) && !isNaN(instance)) {
          // Convert Fahrenheit to Celsius
          temperature = (temperature - 32) * (5 / 9);
          
          const engineData: Partial<EngineSensorData> = {
            coolantTemp: temperature,
            timestamp: timestamp
          };
          
          console.log(`[NmeaSensorProcessor] ✅ XDR Engine Coolant Temp: Instance ${instance} = ${temperature.toFixed(1)}°C (from ${measurementValue}°F)`);
          
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
        const instance = parseInt(enginePressureMatch[1], 10) - 1;
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
        const instance = alternatorMatch[1] ? parseInt(alternatorMatch[1], 10) - 1 : 0; // ALTERNATOR#1 -> instance 0
        
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
        const instance = parseInt(engineFuelMatch[1], 10) - 1;
        const fuelFlow = parseFloat(measurementValue); // L/h from NMEA
        
        if (!isNaN(fuelFlow) && !isNaN(instance)) {
          const engineData: Partial<EngineSensorData> = {
            fuelFlow: fuelFlow, // Stored in L/h (base unit)
            timestamp: timestamp
          };
          
          console.log(`[NmeaSensorProcessor] ✅ XDR Engine Fuel Flow: Instance ${instance} = ${fuelFlow.toFixed(1)} L/h`);
          
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
        const instance = parseInt(engineHoursMatch[1], 10) - 1;
        const engineHours = parseFloat(measurementValue);
        
        if (!isNaN(engineHours) && !isNaN(instance)) {
          const engineData: Partial<EngineSensorData> = {
            engineHours: engineHours, // Stored in hours
            timestamp: timestamp
          };
          
          console.log(`[NmeaSensorProcessor] ✅ XDR Engine Hours: Instance ${instance} = ${engineHours.toFixed(1)}h`);
          
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
}

// Export singleton instance
export const nmeaSensorProcessor = NmeaSensorProcessor.getInstance();