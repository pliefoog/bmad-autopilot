/**
 * NMEA 2000 Binary PGN Frame Generator
 * 
 * Generates true binary NMEA 2000 PGN frames (not PCDIN encapsulation).
 * Implements CAN bus frame structure for WebSocket/TCP binary transport.
 * 
 * Frame Format (29-bit CAN identifier + data):
 * - Priority (3 bits): 0-7, lower is higher priority
 * - Reserved (1 bit): Always 0
 * - Data Page (1 bit): 0 or 1
 * - PDU Format (8 bits): Part of PGN
 * - PDU Specific (8 bits): Part of PGN or destination address
 * - Source Address (8 bits): 0-252
 * - Data (0-8 bytes): PGN-specific payload
 * 
 * This module provides binary frame generation for sensor-based YAML scenarios.
 * Each generator function returns a Buffer containing the complete binary frame.
 */

class NMEA2000BinaryGenerator {
  constructor() {
    this.sourceAddress = 42; // Default source address for simulator
    this.sequenceCounters = new Map(); // For multi-frame messages
    this.startTime = Date.now(); // Track time for data generation
  }

  /**
   * Build a CAN frame identifier (29-bit)
   * @param {number} priority - 0-7 (lower = higher priority)
   * @param {number} pgn - Parameter Group Number
   * @param {number} sourceAddr - Source address (0-252)
   * @returns {number} 29-bit CAN identifier
   */
  buildCanId(priority, pgn, sourceAddr) {
    const prio = (priority & 0x07) << 26;
    const reserved = 0; // Bit 25
    const dataPage = ((pgn >> 16) & 0x01) << 24;
    const pduFormat = ((pgn >> 8) & 0xFF) << 16;
    const pduSpecific = (pgn & 0xFF) << 8;
    const source = sourceAddr & 0xFF;
    
    return prio | reserved | dataPage | pduFormat | pduSpecific | source;
  }

  /**
   * Create a binary NMEA 2000 frame
   * @param {number} pgn - Parameter Group Number
   * @param {Buffer|Array} data - Data bytes (0-8 bytes)
   * @param {number} priority - Priority (default: 6)
   * @returns {Buffer} Complete binary frame
   */
  createFrame(pgn, data, priority = 6) {
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    
    // Validate data length (NMEA 2000 supports up to 1785 bytes via fast packet, but single frame is 8 bytes)
    if (dataBuffer.length > 8 && dataBuffer.length <= 223) {
      // Fast packet protocol needed for >8 bytes
      return this.createFastPacketFrames(pgn, dataBuffer, priority);
    } else if (dataBuffer.length > 223) {
      throw new Error(`Data too large: ${dataBuffer.length} bytes (max 223 for fast packet)`);
    }
    
    // Single frame message
    const canId = this.buildCanId(priority, pgn, this.sourceAddress);
    
    // Frame format: [CAN_ID(4 bytes), LENGTH(1 byte), DATA(0-8 bytes)]
    const frame = Buffer.alloc(5 + dataBuffer.length);
    frame.writeUInt32BE(canId, 0);
    frame.writeUInt8(dataBuffer.length, 4);
    dataBuffer.copy(frame, 5);
    
    return frame;
  }

  /**
   * Create fast packet frames for multi-frame messages (>8 bytes)
   * @param {number} pgn - Parameter Group Number
   * @param {Buffer} data - Data bytes (9-223 bytes)
   * @param {number} priority - Priority
   * @returns {Array<Buffer>} Array of frames
   */
  createFastPacketFrames(pgn, data, priority = 6) {
    const frames = [];
    const sequenceId = this.sequenceCounters.get(pgn) || 0;
    this.sequenceCounters.set(pgn, (sequenceId + 1) % 256);
    
    // First frame: [sequence_id(5bits)|frame_counter(3bits), total_length, data[0-6]]
    const firstFrameHeader = ((sequenceId & 0x1F) << 3) | 0; // frame 0
    const firstFrameData = Buffer.alloc(8);
    firstFrameData.writeUInt8(firstFrameHeader, 0);
    firstFrameData.writeUInt8(data.length, 1);
    data.copy(firstFrameData, 2, 0, 6); // First 6 bytes of data
    frames.push(this.createFrame(pgn, firstFrameData, priority));
    
    // Subsequent frames: [sequence_id(5bits)|frame_counter(3bits), data[0-7]]
    let offset = 6;
    let frameCounter = 1;
    
    while (offset < data.length) {
      const frameHeader = ((sequenceId & 0x1F) << 3) | (frameCounter & 0x07);
      const frameData = Buffer.alloc(8);
      frameData.writeUInt8(frameHeader, 0);
      
      const chunkSize = Math.min(7, data.length - offset);
      data.copy(frameData, 1, offset, offset + chunkSize);
      
      // Pad with 0xFF if less than 7 bytes
      for (let i = chunkSize + 1; i < 8; i++) {
        frameData.writeUInt8(0xFF, i);
      }
      
      frames.push(this.createFrame(pgn, frameData, priority));
      offset += chunkSize;
      frameCounter++;
    }
    
    return frames;
  }

  /**
   * PGN 128267: Water Depth
   * @param {Object} sensor - Sensor configuration from YAML
   * @returns {Buffer} Binary frame
   */
  generatePGN_128267(sensor) {
    let depth = 10.0; // meters
    let offset = 0.0; // transducer offset from waterline
    
    if (sensor.data_generation?.depth) {
      depth = this.getYAMLDataValue('depth', sensor.data_generation.depth);
    }
    
    if (sensor.physical_properties?.transducer_depth) {
      offset = sensor.physical_properties.transducer_depth;
    }
    
    const data = Buffer.alloc(8);
    data.writeUInt8(0xFF, 0); // SID (sequence identifier)
    
    // Depth in 0.01m resolution (32-bit)
    const depthRaw = Math.round(depth * 100);
    data.writeUInt32LE(depthRaw, 1);
    
    // Offset in 0.01m resolution (16-bit signed)
    const offsetRaw = Math.round(offset * 100);
    data.writeInt16LE(offsetRaw, 5);
    
    data.writeUInt8(0xFF, 7); // Range (reserved)
    
    return this.createFrame(128267, data, 3);
  }

  /**
   * PGN 128259: Speed (Water Referenced)
   * @param {Object} sensor - Sensor configuration from YAML
   * @returns {Buffer} Binary frame
   */
  generatePGN_128259(sensor) {
    let speedKnots = 5.0;
    
    if (sensor.data_generation?.speed) {
      speedKnots = this.getYAMLDataValue('speed', sensor.data_generation.speed);
    }
    
    const calibrationFactor = sensor.physical_properties?.calibration_factor || 1.0;
    speedKnots *= calibrationFactor;
    
    // Convert to m/s
    const speedMs = speedKnots * 0.5144;
    
    const data = Buffer.alloc(8);
    data.writeUInt8(0xFF, 0); // SID
    
    // Speed in 0.01 m/s resolution (16-bit)
    const speedRaw = Math.round(speedMs * 100);
    data.writeUInt16LE(speedRaw, 1);
    
    // Ground speed (0xFFFF = not available)
    data.writeUInt16LE(0xFFFF, 3);
    
    // Speed type (0 = paddle wheel, 1 = pitot tube, 2 = doppler, 3 = correlation, 4 = electromagnetic)
    const speedType = sensor.physical_properties?.sensor_type === 'paddle_wheel' ? 0 : 0xFF;
    data.writeUInt8(speedType, 5);
    
    data.writeUInt8(0xFF, 6); // Reserved
    data.writeUInt8(0xFF, 7); // Reserved
    
    return this.createFrame(128259, data, 2);
  }

  /**
   * PGN 128275: Distance Log
   * @param {Object} sensor - Sensor configuration from YAML
   * @param {Object} distanceLog - Distance log state (total and trip distances in nm)
   * @returns {Buffer} Binary frame
   */
  generatePGN_128275(sensor, distanceLog) {
    // Get current distance log values (in nautical miles)
    const totalDistanceNM = distanceLog?.totalDistance || 0;
    const tripDistanceNM = distanceLog?.tripDistance || 0;

    // Convert nautical miles to meters (1 nm = 1852 meters)
    const totalDistanceM = totalDistanceNM * 1852;
    const tripDistanceM = tripDistanceNM * 1852;

    const data = Buffer.alloc(8);

    // Date (16-bit): Days since January 1, 1970
    const daysSince1970 = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    data.writeUInt16LE(daysSince1970, 0);

    // Time (32-bit): Seconds since midnight * 10000
    const now = new Date();
    const secondsSinceMidnight = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
    const timeRaw = Math.round(secondsSinceMidnight * 10000);
    data.writeUInt32LE(timeRaw, 2);

    // Log (32-bit): Cumulative distance in meters (0.01m resolution)
    // For trip distance - we only have 16 bits, use lower bytes
    const tripDistanceRaw = Math.round(tripDistanceM * 100) & 0xFFFFFFFF;
    data.writeUInt16LE(tripDistanceRaw & 0xFFFF, 6);

    return this.createFrame(128275, data, 6);
  }

  /**
   * PGN 130306: Wind Data
   * @param {Object} sensor - Sensor configuration from YAML
   * @returns {Buffer} Binary frame
   */
  generatePGN_130306(sensor) {
    let windSpeedKnots = 10.0;
    let windAngleDeg = 45.0;
    
    if (sensor.data_generation?.wind_speed) {
      windSpeedKnots = this.getYAMLDataValue('wind_speed', sensor.data_generation.wind_speed);
    }
    
    if (sensor.data_generation?.wind_angle) {
      windAngleDeg = this.getYAMLDataValue('wind_angle', sensor.data_generation.wind_angle);
    }
    
    const calibrationFactor = sensor.physical_properties?.calibration_factor || 1.0;
    windSpeedKnots *= calibrationFactor;
    
    // Convert to m/s
    const windSpeedMs = windSpeedKnots * 0.5144;
    
    // Convert angle to radians
    const windAngleRad = windAngleDeg * Math.PI / 180;
    
    const data = Buffer.alloc(8);
    data.writeUInt8(0xFF, 0); // SID
    
    // Wind speed in 0.01 m/s resolution (16-bit)
    const speedRaw = Math.round(windSpeedMs * 100);
    data.writeUInt16LE(speedRaw, 1);
    
    // Wind angle in 0.0001 radian resolution (16-bit)
    const angleRaw = Math.round(windAngleRad * 10000);
    data.writeUInt16LE(angleRaw, 3);
    
    // Reference (0 = true, 1 = magnetic, 2 = apparent, 3 = theoretical)
    const reference = sensor.physical_properties?.wind_reference === 'true' ? 0 : 2;
    data.writeUInt8(reference, 5);
    
    data.writeUInt8(0xFF, 6); // Reserved
    data.writeUInt8(0xFF, 7); // Reserved
    
    return this.createFrame(130306, data, 2);
  }

  /**
   * PGN 129029: GNSS Position Data
   * @param {Object} sensor - Sensor configuration from YAML
   * @returns {Buffer} Binary frame
   */
  generatePGN_129029(sensor) {
    let latitude = 37.7749; // degrees
    let longitude = -122.4194; // degrees
    let altitude = 0.0; // meters
    
    if (sensor.data_generation?.latitude) {
      latitude = this.getYAMLDataValue('latitude', sensor.data_generation.latitude);
    }
    
    if (sensor.data_generation?.longitude) {
      longitude = this.getYAMLDataValue('longitude', sensor.data_generation.longitude);
    }
    
    if (sensor.data_generation?.altitude) {
      altitude = this.getYAMLDataValue('altitude', sensor.data_generation.altitude);
    }
    
    // This is a larger message, needs more than 8 bytes
    const data = Buffer.alloc(51);
    data.writeUInt8(0xFF, 0); // SID
    
    // Date (days since 1970-01-01)
    const now = new Date();
    const daysSince1970 = Math.floor(now.getTime() / 86400000);
    data.writeUInt16LE(daysSince1970, 1);
    
    // Time (seconds since midnight, 0.0001s resolution)
    const secondsSinceMidnight = (now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds()) * 10000;
    data.writeUInt32LE(secondsSinceMidnight, 3);
    
    // Latitude in 1e-16 degree resolution (64-bit signed)
    const latRaw = Math.round(latitude * 1e16);
    data.writeBigInt64LE(BigInt(latRaw), 7);
    
    // Longitude in 1e-16 degree resolution (64-bit signed)
    const lonRaw = Math.round(longitude * 1e16);
    data.writeBigInt64LE(BigInt(lonRaw), 15);
    
    // Altitude in 1e-6 meter resolution (64-bit signed)
    const altRaw = Math.round(altitude * 1e6);
    data.writeBigInt64LE(BigInt(altRaw), 23);
    
    // GNSS type (0 = GPS, 1 = GLONASS, 2 = GPS+GLONASS, 3 = GPS+SBAS/WAAS, 4 = GPS+SBAS/WAAS+GLONASS, 5 = Chayka, 6 = integrated, 7 = surveyed, 8 = Galileo)
    data.writeUInt8(0, 31); // GPS
    
    // Method (0 = no GNSS, 1 = GNSS fix, 2 = DGNSS fix, 3 = Precise GNSS, 4 = RTK Fixed Integer, 5 = RTK Float, 6 = Estimated/DR, 7 = Manual Input, 8 = Simulate Mode)
    data.writeUInt8(1, 32); // GNSS fix
    
    // Integrity (0 = No integrity checking, 1 = Safe, 2 = Caution, 3 = Unsafe)
    data.writeUInt8(1, 33); // Safe
    
    // Number of SVs (satellites)
    data.writeUInt8(8, 34);
    
    // HDOP in 0.01 resolution (16-bit)
    data.writeUInt16LE(120, 35); // 1.20
    
    // PDOP in 0.01 resolution (16-bit)
    data.writeUInt16LE(200, 37); // 2.00
    
    // Geoidal separation in 0.01m resolution (32-bit signed)
    data.writeInt32LE(0, 39);
    
    // Number of reference stations
    data.writeUInt8(0, 43);
    
    // Reference station type (0 = GPS, 1 = GLONASS, 2 = GPS+GLONASS, 3 = GPS+SBAS/WAAS, 4 = GPS+SBAS/WAAS+GLONASS, 5 = Chayka)
    data.writeUInt8(0xFF, 44); // Not available
    
    // Reference station ID
    data.writeUInt16LE(0xFFFF, 45);
    
    // Age of DGNSS corrections in 0.01s resolution (16-bit)
    data.writeUInt16LE(0xFFFF, 47);
    
    // Reserved
    data.writeUInt16LE(0xFFFF, 49);
    
    return this.createFastPacketFrames(129029, data, 3);
  }

  /**
   * PGN 127250: Vessel Heading
   * @param {Object} sensor - Sensor configuration from YAML
   * @returns {Buffer} Binary frame
   */
  generatePGN_127250(sensor) {
    let headingDeg = 90.0;
    let deviationDeg = 0.0;
    let variationDeg = 0.0;
    
    if (sensor.data_generation?.heading) {
      headingDeg = this.getYAMLDataValue('heading', sensor.data_generation.heading);
    }
    
    if (sensor.data_generation?.deviation) {
      deviationDeg = this.getYAMLDataValue('deviation', sensor.data_generation.deviation);
    }
    
    if (sensor.data_generation?.variation) {
      variationDeg = this.getYAMLDataValue('variation', sensor.data_generation.variation);
    }
    
    const calibrationOffset = sensor.physical_properties?.calibration_offset || 0.0;
    headingDeg += calibrationOffset;
    
    // Normalize heading to 0-360
    headingDeg = ((headingDeg % 360) + 360) % 360;
    
    // Convert to radians
    const headingRad = headingDeg * Math.PI / 180;
    const deviationRad = deviationDeg * Math.PI / 180;
    const variationRad = variationDeg * Math.PI / 180;
    
    const data = Buffer.alloc(8);
    data.writeUInt8(0xFF, 0); // SID
    
    // Heading in 0.0001 radian resolution (16-bit)
    const headingRaw = Math.round(headingRad * 10000);
    data.writeUInt16LE(headingRaw, 1);
    
    // Deviation in 0.0001 radian resolution (16-bit signed)
    const deviationRaw = Math.round(deviationRad * 10000);
    data.writeInt16LE(deviationRaw, 3);
    
    // Variation in 0.0001 radian resolution (16-bit signed)
    const variationRaw = Math.round(variationRad * 10000);
    data.writeInt16LE(variationRaw, 5);
    
    // Reference (0 = true, 1 = magnetic)
    const reference = sensor.physical_properties?.heading_reference === 'true' ? 0 : 1;
    data.writeUInt8(reference, 7);
    
    return this.createFrame(127250, data, 2);
  }

  /**
   * PGN 130310: Environmental Parameters (Temperature)
   * @param {Object} sensor - Sensor configuration from YAML
   * @returns {Buffer} Binary frame
   */
  generatePGN_130310(sensor) {
    let temperatureC = 15.0;
    let humidity = 50.0;
    let pressure = 101325; // Pa
    
    if (sensor.data_generation?.temperature) {
      temperatureC = this.getYAMLDataValue('temperature', sensor.data_generation.temperature);
    }
    
    if (sensor.data_generation?.humidity) {
      humidity = this.getYAMLDataValue('humidity', sensor.data_generation.humidity);
    }
    
    if (sensor.data_generation?.pressure) {
      pressure = this.getYAMLDataValue('pressure', sensor.data_generation.pressure);
    }
    
    const data = Buffer.alloc(8);
    data.writeUInt8(0xFF, 0); // SID
    
    // Temperature source (0 = sea, 1 = outside, 2 = inside, 3 = engine room, 4 = main cabin, 5 = live well, 6 = bait well, 7 = refrigeration, 8 = heating system, 9 = dew point, 10 = apparent wind chill, 11 = theoretical wind chill, 12 = heat index, 13 = freezer, 14 = exhaust gas)
    const tempSource = sensor.physical_properties?.location === 'engine_room' ? 3 : 1;
    data.writeUInt8(tempSource, 1);
    
    // Temperature in 0.01K resolution (16-bit)
    const tempK = temperatureC + 273.15;
    const tempRaw = Math.round(tempK * 100);
    data.writeUInt16LE(tempRaw, 2);
    
    // Humidity in 0.004% resolution (16-bit)
    const humidityRaw = Math.round(humidity * 250);
    data.writeUInt16LE(humidityRaw, 4);
    
    // Pressure in 100Pa resolution (16-bit)
    const pressureRaw = Math.round(pressure / 100);
    data.writeUInt16LE(pressureRaw, 6);
    
    return this.createFrame(130310, data, 5);
  }

  /**
   * PGN 130311: Environmental Parameters (Atmospheric)
   * @param {Object} sensor - Sensor configuration from YAML
   * @returns {Buffer} Binary frame
   */
  generatePGN_130311(sensor) {
    let temperatureC = 22.0;
    let humidity = 65.0;
    let pressureMb = 1013.25; // Default in millibars
    
    if (sensor.data_generation?.temperature) {
      temperatureC = this.getYAMLDataValue('temperature', sensor.data_generation.temperature);
    }
    
    if (sensor.data_generation?.humidity) {
      humidity = this.getYAMLDataValue('humidity', sensor.data_generation.humidity);
    }
    
    if (sensor.data_generation?.pressure) {
      // YAML pressure is in millibars, convert to Pascals for transmission
      pressureMb = this.getYAMLDataValue('pressure', sensor.data_generation.pressure);
    }
    
    // Convert millibars to Pascals (1 mb = 100 Pa)
    const pressure = pressureMb * 100;
    
    const data = Buffer.alloc(8);
    
    // Byte 0: SID (Sequence ID)
    data.writeUInt8(0xFF, 0); // 0xFF = not available
    
    // Byte 1: Source (1 = outside, 2 = inside)
    const source = sensor.physical_properties?.location === 'inside' ? 2 : 1;
    data.writeUInt8(source, 1);
    
    // Bytes 2-3: Temperature in 0.01 Kelvin resolution (16-bit unsigned)
    const tempK = temperatureC + 273.15;
    const tempRaw = Math.round(tempK * 100); // Convert to 0.01K units
    if (tempRaw >= 0 && tempRaw <= 65533) {
      data.writeUInt16LE(tempRaw, 2);
    } else {
      data.writeUInt16LE(0xFFFF, 2); // Invalid marker
    }
    
    // Bytes 4-5: Humidity in 0.004% resolution (16-bit unsigned)
    const humidityRaw = Math.round(humidity / 0.004); // Convert to 0.004% units
    if (humidityRaw >= 0 && humidityRaw <= 25000) { // 0-100% range
      data.writeUInt16LE(humidityRaw, 4);
    } else {
      data.writeUInt16LE(0xFFFF, 4); // Invalid marker
    }
    
    // Bytes 6-7: Pressure in 1 hPa resolution (16-bit unsigned)
    // NOTE: 1 hPa = 100 Pa
    const pressureHPa = pressure / 100; // Convert Pa to hPa
    const pressureRaw = Math.round(pressureHPa);
    if (pressureRaw >= 0 && pressureRaw <= 65533) {
      data.writeUInt16LE(pressureRaw, 6);
    } else {
      data.writeUInt16LE(0xFFFF, 6); // Invalid marker
    }
    
    return this.createFrame(130311, data, 5);
  }

  /**
   * PGN 127245: Rudder
   * @param {Object} sensor - Sensor configuration from YAML
   * @returns {Buffer} Binary frame
   */
  generatePGN_127245(sensor) {
    let rudderAngleDeg = 0.0;
    
    if (sensor.data_generation?.rudder_angle) {
      rudderAngleDeg = this.getYAMLDataValue('rudder_angle', sensor.data_generation.rudder_angle);
    }
    
    const instance = sensor.instance || 0;
    
    // Convert to radians
    const rudderAngleRad = rudderAngleDeg * Math.PI / 180;
    
    const data = Buffer.alloc(8);
    data.writeUInt8(instance, 0); // Instance
    
    // Direction order (0 = no direction order, 1 = move to starboard, 2 = move to port)
    data.writeUInt8(0xFF, 1); // Not available
    
    // Angle order in 0.0001 radian resolution (16-bit signed)
    data.writeInt16LE(0x7FFF, 2); // Not available
    
    // Position in 0.0001 radian resolution (16-bit signed)
    const angleRaw = Math.round(rudderAngleRad * 10000);
    data.writeInt16LE(angleRaw, 4);
    
    data.writeUInt8(0xFF, 6); // Reserved
    data.writeUInt8(0xFF, 7); // Reserved
    
    return this.createFrame(127245, data, 2);
  }

  /**
   * PGN 127488: Engine Parameters, Rapid Update
   * @param {Object} sensor - Sensor configuration from YAML
   * @returns {Buffer} Binary frame
   */
  generatePGN_127488(sensor) {
    let rpmValue = 1500;
    
    if (sensor.data_generation?.rpm) {
      rpmValue = this.getYAMLDataValue('rpm', sensor.data_generation.rpm);
    }
    
    const instance = sensor.instance || 0;
    
    const data = Buffer.alloc(8);
    data.writeUInt8(instance, 0); // Engine instance
    
    // RPM in 0.25 rpm resolution (16-bit)
    const rpmRaw = Math.round(rpmValue * 4);
    data.writeUInt16LE(rpmRaw, 1);
    
    // Boost pressure in 100Pa resolution (16-bit)
    data.writeUInt16LE(0xFFFF, 3); // Not available
    
    // Tilt/trim in 1% resolution (8-bit signed)
    data.writeInt8(0x7F, 5); // Not available
    
    data.writeUInt8(0xFF, 6); // Reserved
    data.writeUInt8(0xFF, 7); // Reserved
    
    return this.createFrame(127488, data, 2);
  }

  /**
   * PGN 127508: Battery Status
   * @param {Object} sensor - Sensor configuration from YAML
   * @returns {Buffer} Binary frame
   */
  generatePGN_127508(sensor) {
    let voltage = 12.6;
    let current = 10.0;
    let temperature = 25.0;
    
    if (sensor.data_generation?.voltage) {
      voltage = this.getYAMLDataValue('voltage', sensor.data_generation.voltage);
    }
    
    if (sensor.data_generation?.current) {
      current = this.getYAMLDataValue('current', sensor.data_generation.current);
    }
    
    if (sensor.data_generation?.temperature) {
      temperature = this.getYAMLDataValue('temperature', sensor.data_generation.temperature);
    }
    
    const instance = sensor.instance || 0;
    
    const data = Buffer.alloc(8);
    data.writeUInt8(instance, 0); // Battery instance
    
    // Voltage in 0.01V resolution (16-bit)
    const voltageRaw = Math.round(voltage * 100);
    data.writeUInt16LE(voltageRaw, 1);
    
    // Current in 0.1A resolution (16-bit signed)
    const currentRaw = Math.round(current * 10);
    data.writeInt16LE(currentRaw, 3);
    
    // Temperature in 0.01K resolution (16-bit)
    const tempK = temperature + 273.15;
    const tempRaw = Math.round(tempK * 100);
    data.writeUInt16LE(tempRaw, 5);
    
    data.writeUInt8(0xFF, 7); // SID
    
    return this.createFrame(127508, data, 6);
  }

  /**
   * PGN 127505: Fluid Level
   * @param {Object} sensor - Sensor configuration from YAML
   * @returns {Buffer} Binary frame
   */
  generatePGN_127505(sensor) {
    let level = 50.0; // percentage
    let capacity = 200.0; // liters
    
    if (sensor.data_generation?.level) {
      level = this.getYAMLDataValue('level', sensor.data_generation.level);
    }
    
    if (sensor.physical_properties?.capacity) {
      capacity = sensor.physical_properties.capacity;
    }
    
    const instance = sensor.instance || 0;
    
    // Fluid type (0 = fuel, 1 = water, 2 = gray water, 3 = live well, 4 = oil, 5 = black water, 6 = gasoline, 7 = error, 14 = propane)
    let fluidType = 0;
    const fluidTypeMap = {
      'fuel': 0,
      'fresh_water': 1,
      'gray_water': 2,
      'black_water': 5,
      'oil': 4,
      'gasoline': 6
    };
    if (sensor.physical_properties?.fluid_type) {
      fluidType = fluidTypeMap[sensor.physical_properties.fluid_type] || 0;
    }
    
    const data = Buffer.alloc(8);
    data.writeUInt8(instance, 0); // Tank instance
    data.writeUInt8(fluidType, 1); // Fluid type
    
    // Level in 0.4% resolution (16-bit)
    const levelRaw = Math.round(level * 2.5);
    data.writeUInt16LE(levelRaw, 2);
    
    // Capacity in 0.1L resolution (32-bit)
    const capacityRaw = Math.round(capacity * 10);
    data.writeUInt32LE(capacityRaw, 4);
    
    return this.createFrame(127505, data, 6);
  }

  /**
   * PGN 127489: Engine Parameters, Dynamic
   * @param {Object} sensor - Sensor configuration from YAML
   * @returns {Buffer} Binary frame
   */
  generatePGN_127489(sensor) {
    let oilPressure = 350; // kPa
    let oilTemp = 90; // Celsius
    let coolantTemp = 85; // Celsius
    let alternatorVoltage = 14.2; // Volts
    let fuelRate = 15.0; // L/h
    let engineHours = 1234.5; // hours
    
    if (sensor.data_generation?.oil_pressure) {
      oilPressure = this.getYAMLDataValue('oil_pressure', sensor.data_generation.oil_pressure);
    }
    
    if (sensor.data_generation?.oil_temperature) {
      oilTemp = this.getYAMLDataValue('oil_temperature', sensor.data_generation.oil_temperature);
    }
    
    if (sensor.data_generation?.coolant_temperature) {
      coolantTemp = this.getYAMLDataValue('coolant_temperature', sensor.data_generation.coolant_temperature);
    }
    
    if (sensor.data_generation?.alternator_voltage) {
      alternatorVoltage = this.getYAMLDataValue('alternator_voltage', sensor.data_generation.alternator_voltage);
    }
    
    if (sensor.data_generation?.fuel_rate) {
      fuelRate = this.getYAMLDataValue('fuel_rate', sensor.data_generation.fuel_rate);
    }
    
    if (sensor.data_generation?.engine_hours) {
      engineHours = this.getYAMLDataValue('engine_hours', sensor.data_generation.engine_hours);
    }
    
    const instance = sensor.instance || 0;
    
    // This message is 26 bytes, needs fast packet protocol
    const data = Buffer.alloc(26);
    data.writeUInt8(instance, 0); // Engine instance
    
    // Oil pressure in 100Pa resolution (16-bit)
    const oilPressureRaw = Math.round(oilPressure * 10);
    data.writeUInt16LE(oilPressureRaw, 1);
    
    // Oil temperature in 0.01K resolution (16-bit)
    const oilTempK = oilTemp + 273.15;
    const oilTempRaw = Math.round(oilTempK * 100);
    data.writeUInt16LE(oilTempRaw, 3);
    
    // Coolant temperature in 0.01K resolution (16-bit)
    const coolantTempK = coolantTemp + 273.15;
    const coolantTempRaw = Math.round(coolantTempK * 100);
    data.writeUInt16LE(coolantTempRaw, 5);
    
    // Alternator potential (voltage) in 0.01V resolution (16-bit signed)
    const altVoltageRaw = Math.round(alternatorVoltage * 100);
    data.writeInt16LE(altVoltageRaw, 7);
    
    // Fuel rate in 0.1L/h resolution (16-bit signed)
    const fuelRateRaw = Math.round(fuelRate * 10);
    data.writeInt16LE(fuelRateRaw, 9);
    
    // Engine hours in 1 second resolution (32-bit)
    const engineHoursRaw = Math.round(engineHours * 3600);
    data.writeUInt32LE(engineHoursRaw, 11);
    
    // Coolant pressure in 100Pa resolution (16-bit)
    data.writeUInt16LE(0xFFFF, 15); // Not available
    
    // Fuel pressure in 1000Pa resolution (16-bit)
    data.writeUInt16LE(0xFFFF, 17); // Not available
    
    // Reserved
    data.writeUInt8(0xFF, 19);
    
    // Discrete status 1 (2 bytes)
    data.writeUInt16LE(0xFFFF, 20);
    
    // Discrete status 2 (2 bytes)
    data.writeUInt16LE(0xFFFF, 22);
    
    // Percent engine load (8-bit signed)
    data.writeInt8(0x7F, 24); // Not available
    
    // Percent engine torque (8-bit signed)
    data.writeInt8(0x7F, 25); // Not available
    
    return this.createFastPacketFrames(127489, data, 6);
  }

  /**
   * Helper: Get YAML data value with random variation support
   * @param {string} fieldName - Field name for error messages
   * @param {Object} config - YAML data configuration (value or random range)
   * @returns {number} Generated value
   */
  getYAMLDataValue(fieldName, config) {
    if (typeof config === 'number') {
      return config;
    }
    
    if (!config || typeof config !== 'object') {
      console.warn(`⚠️ Invalid data generation config for ${fieldName}:`, config);
      return 0;
    }

    const currentTime = Date.now() - this.startTime;
    
    try {
      switch (config.type) {
        case 'sine':
        case 'sine_wave':
          return this.generateSineWave(config, currentTime);
        case 'tidal_cycle':
          return this.generateTidalCycle(config, currentTime);
        case 'coastal_variation':
          return this.generateCoastalVariation(config, currentTime);
        case 'coastal_wind':
          return this.generateCoastalWind(config, currentTime);
        case 'coastal_track':
        case 'boat_movement':
          // Position data - not a simple value
          return 0;
        case 'polar_sailing':
          return this.generatePolarSailing(config, currentTime);
        case 'linear':
          return this.generateLinear(config, currentTime);
        case 'gaussian':
          return this.generateGaussian(config, currentTime);
        case 'random_walk':
          return this.generateRandomWalk(config, currentTime);
        case 'linear_decline':
          return this.generateLinearDecline(config, currentTime);
        case 'linear_increase':
          return this.generateLinearIncrease(config, currentTime);
        case 'random':
          return this.generateRandom(config);
        case 'sawtooth':
          return this.generateSawtooth(config, currentTime);
        case 'triangle':
          return this.generateTriangle(config, currentTime);
        case 'square':
          return this.generateSquare(config, currentTime);
        case 'constant':
          return config.value;
        default:
          // Fallback: check for simple random config
          if (config.random) {
            const min = config.random.min || 0;
            const max = config.random.max || 100;
            return min + Math.random() * (max - min);
          }
          
          if (config.value !== undefined) {
            return config.value;
          }
          
          console.warn(`⚠️ Unknown data generation type for ${fieldName}:`, config.type);
          return 0;
      }
    } catch (error) {
      console.error(`❌ Error generating data for ${fieldName}:`, error.message);
      return 0;
    }
  }

  /**
   * Generate Gaussian random values
   */
  generateGaussian(config, currentTime) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const value = config.mean + z0 * config.std_dev;
    return Math.max(config.min || -Infinity, Math.min(config.max || Infinity, value));
  }

  /**
   * Generate sine wave values
   */
  generateSineWave(config, currentTime) {
    const time = currentTime / 1000; // Convert to seconds
    
    // Calculate phase: support both frequency (Hz) and period (seconds)
    let phase;
    if (config.period) {
      phase = (2 * Math.PI * time) / config.period;
    } else if (config.frequency) {
      phase = 2 * Math.PI * config.frequency * time;
    } else {
      phase = (2 * Math.PI * time) / 60; // Default 60-second period
    }
    
    const baseValue = config.base || config.start || 0;
    const value = baseValue + config.amplitude * Math.sin(phase);
    
    // Apply min/max constraints if specified
    if (config.min !== undefined || config.max !== undefined) {
      return Math.max(config.min || -Infinity, Math.min(config.max || Infinity, value));
    }
    
    return value;
  }

  /**
   * Generate linear decline values
   */
  generateLinearDecline(config, currentTime) {
    const time = currentTime / 1000;
    return Math.max(0, config.start + config.rate * time);
  }

  /**
   * Generate linear increase values
   */
  generateLinearIncrease(config, currentTime) {
    const time = currentTime / 1000;
    const value = config.start + config.rate * time;
    return (typeof config.max !== 'undefined') ? Math.min(config.max, value) : value;
  }

  /**
   * Generate linear values
   */
  generateLinear(config, currentTime) {
    if (config.rate !== undefined) {
      return this.generateLinearIncrease(config, currentTime);
    } else if (config.start !== undefined) {
      return config.start;
    }
    return 0;
  }

  /**
   * Generate random values
   */
  generateRandom(config) {
    const min = config.min || 0;
    const max = config.max || 100;
    return min + Math.random() * (max - min);
  }

  /**
   * Generate sawtooth wave values
   */
  generateSawtooth(config, currentTime) {
    const time = currentTime / 1000;
    const period = config.period || 60;
    const min = config.min || 0;
    const max = config.max || 1;
    const phase = (time % period) / period;
    return min + (max - min) * phase;
  }

  /**
   * Generate triangle wave values
   */
  generateTriangle(config, currentTime) {
    const time = currentTime / 1000;
    const period = config.period || 60;
    const min = config.min || 0;
    const max = config.max || 1;
    const phase = (time % period) / period;
    
    if (phase < 0.5) {
      return min + (max - min) * (phase * 2);
    } else {
      return max - (max - min) * ((phase - 0.5) * 2);
    }
  }

  /**
   * Generate square wave values
   */
  generateSquare(config, currentTime) {
    const time = currentTime / 1000;
    const period = config.period || 60;
    const min = config.min || 0;
    const max = config.max || 1;
    const dutyCycle = config.duty_cycle || 0.5;
    const phase = (time % period) / period;
    return phase < dutyCycle ? max : min;
  }

  /**
   * Generate tidal cycle depth variation
   */
  generateTidalCycle(config, currentTime) {
    const time = currentTime / 1000;
    const tidalPeriod = config.tidal_period || 600;
    const phase = (time / tidalPeriod) * 2 * Math.PI;
    const tidalHeight = Math.sin(phase) * (config.tidal_range / 2);
    const depth = config.base_depth + tidalHeight;
    
    return Math.max(
      config.min_depth || 0,
      Math.min(config.max_depth || 100, depth)
    );
  }

  /**
   * Generate coastal wind angle variation
   */
  generateCoastalVariation(config, currentTime) {
    const time = currentTime / 1000;
    const thermalPeriod = config.variation_period || 300;
    const phase = (time / thermalPeriod) * 2 * Math.PI;
    const thermalShift = Math.sin(phase) * (config.thermal_shift || 0);
    
    let angle = (config.base || 0) + thermalShift;
    
    // Normalize to 0-360
    while (angle < 0) angle += 360;
    while (angle >= 360) angle -= 360;
    
    return angle;
  }

  /**
   * Generate coastal wind speed with thermal effects
   */
  generateCoastalWind(config, currentTime) {
    const time = currentTime / 1000;
    const thermalPeriod = 300;
    const phase = (time / thermalPeriod) * 2 * Math.PI;
    const thermalEffect = Math.sin(phase) * (config.thermal_effect || 0);
    const gustFactor = 1 + (Math.random() - 0.5) * 2 * (config.gusts || 0);
    const speed = (config.base || 10) + thermalEffect;
    const gustSpeed = speed * gustFactor;
    
    return Math.max(
      config.min || 0,
      Math.min(config.max || 50, gustSpeed)
    );
  }

  /**
   * Generate polar-based sailing speed
   */
  generatePolarSailing(config, currentTime) {
    const baseSpeed = config.base_speed || 5.5;
    const tidalCurrent = config.tidal_current || 0;
    const leewayFactor = config.leeway_factor || 1.0;
    const speed = (baseSpeed + tidalCurrent) * leewayFactor;
    
    return Math.max(
      config.min || 0,
      Math.min(config.max || 15, speed)
    );
  }

  /**
   * Generate random walk values
   */
  generateRandomWalk(config, currentTime) {
    if (!this.randomWalkState) {
      this.randomWalkState = {};
    }
    
    const key = JSON.stringify(config);
    if (!this.randomWalkState[key]) {
      this.randomWalkState[key] = config.start || 0;
    }
    
    const stepSize = config.step_size || 1;
    const step = (Math.random() - 0.5) * 2 * stepSize;
    this.randomWalkState[key] += step;
    
    if (config.bounds) {
      const [min, max] = config.bounds;
      this.randomWalkState[key] = Math.max(min, Math.min(max, this.randomWalkState[key]));
    }
    
    return this.randomWalkState[key];
  }
}

module.exports = NMEA2000BinaryGenerator;
