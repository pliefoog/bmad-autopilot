/**
 * Depth Conversion Utilities
 *
 * Converts between NMEA 2000 PGN 128267 (Water Depth) and NMEA 0183 depth sentences.
 * Supports DBT (Depth Below Transducer) and DPT (Depth) sentence formats.
 *
 * Reference: NMEA 2000 PGN 128267 - Water Depth
 * Data Length: 5 bytes
 * Byte 0-3: SID, Depth Instance, Reserved
 * Byte 4-7: Depth (0.01m resolution)
 * Byte 8: Offset (0.01m resolution)
 */

import { PGNData } from '../NMEAProtocolConverter';

export interface DepthData {
  depth: number; // Depth in meters
  offset?: number; // Offset in meters (optional)
  instanceId?: number; // Depth sensor instance
  sid?: number; // Sequence identifier
}

export class DepthConverter {
  /**
   * Convert PGN 128267 (Water Depth) to DBT sentence
   * DBT Format: $--DBT,x.x,f,x.x,M,x.x,F*hh
   * Fields: depth_feet, f, depth_meters, M, depth_fathoms, F
   */
  public static PGN128267ToDBT(pgnData: PGNData): string[] {
    const depth = DepthConverter.parseDepthFromPGN(pgnData);

    if (depth.depth <= 0) {
      return []; // Invalid depth data
    }

    const depthMeters = depth.depth;
    const depthFeet = depthMeters * 3.28084; // Convert meters to feet
    const depthFathoms = depthMeters * 0.546807; // Convert meters to fathoms

    // Format with appropriate precision
    const metersStr = depthMeters.toFixed(1);
    const feetStr = depthFeet.toFixed(1);
    const fathomsStr = depthFathoms.toFixed(1);

    // Build DBT sentence
    const sentence = `$IIDBT,${feetStr},f,${metersStr},M,${fathomsStr},F`;
    const checksum = DepthConverter.calculateChecksum(sentence.substring(1));

    return [`${sentence}*${checksum}`];
  }

  /**
   * Convert PGN 128267 (Water Depth) to DPT sentence
   * DPT Format: $--DPT,x.x,x.x,x.x*hh
   * Fields: depth_meters, offset_meters, max_range_scale
   */
  public static PGN128267ToDPT(pgnData: PGNData): string[] {
    const depth = DepthConverter.parseDepthFromPGN(pgnData);

    if (depth.depth <= 0) {
      return [];
    }

    const depthStr = depth.depth.toFixed(1);
    const offsetStr = (depth.offset || 0.0).toFixed(1);
    const maxRangeStr = ''; // Optional field, leave empty

    const sentence = `$IIDPT,${depthStr},${offsetStr},${maxRangeStr}`;
    const checksum = DepthConverter.calculateChecksum(sentence.substring(1));

    return [`${sentence}*${checksum}`];
  }

  /**
   * Convert DBT sentence to PGN 128267
   * Bidirectional conversion support
   */
  public static DBTToPGN128267(sentence: string): PGNData | null {
    // Parse DBT sentence: $--DBT,feet,f,meters,M,fathoms,F*hh
    const match = sentence.match(
      /^\$[A-Z]{2}DBT,([0-9.]+),f,([0-9.]+),M,([0-9.]+),F\*[0-9A-F]{2}$/,
    );

    if (!match) {
      return null;
    }

    const depthMeters = parseFloat(match[2]);

    if (isNaN(depthMeters) || depthMeters <= 0) {
      return null;
    }

    // Create PGN 128267 data
    const data = new Uint8Array(8);

    // SID (Sequence ID) - byte 0
    data[0] = 0xff; // Not available

    // Depth Instance - byte 1 (bits 0-3)
    data[1] = 0x00; // Instance 0

    // Reserved - byte 1 (bits 4-7)
    // Already 0 from initialization

    // Depth in 0.01m resolution - bytes 2-5 (little endian)
    const depthCentimeters = Math.round(depthMeters * 100);
    data[2] = depthCentimeters & 0xff;
    data[3] = (depthCentimeters >> 8) & 0xff;
    data[4] = (depthCentimeters >> 16) & 0xff;
    data[5] = (depthCentimeters >> 24) & 0xff;

    // Offset - bytes 6-7 (0.01m resolution, little endian)
    data[6] = 0xff; // Not available
    data[7] = 0xff;

    return {
      pgn: 128267,
      source: 0, // Default source
      destination: 255, // Broadcast
      priority: 5, // Default priority for depth
      data,
      timestamp: Date.now(),
      instanceId: 0,
    };
  }

  /**
   * Convert DPT sentence to PGN 128267
   */
  public static DPTToPGN128267(sentence: string): PGNData | null {
    // Parse DPT sentence: $--DPT,depth,offset,max_range*hh
    const match = sentence.match(/^\$[A-Z]{2}DPT,([0-9.]+),([0-9.-]*),([0-9.]*)\*[0-9A-F]{2}$/);

    if (!match) {
      return null;
    }

    const depthMeters = parseFloat(match[1]);
    const offsetMeters = match[2] ? parseFloat(match[2]) : 0;

    if (isNaN(depthMeters) || depthMeters <= 0) {
      return null;
    }

    // Create PGN 128267 data
    const data = new Uint8Array(8);

    data[0] = 0xff; // SID not available
    data[1] = 0x00; // Instance 0

    // Depth in 0.01m resolution
    const depthCentimeters = Math.round(depthMeters * 100);
    data[2] = depthCentimeters & 0xff;
    data[3] = (depthCentimeters >> 8) & 0xff;
    data[4] = (depthCentimeters >> 16) & 0xff;
    data[5] = (depthCentimeters >> 24) & 0xff;

    // Offset in 0.01m resolution
    if (!isNaN(offsetMeters)) {
      const offsetCentimeters = Math.round(offsetMeters * 100);
      data[6] = offsetCentimeters & 0xff;
      data[7] = (offsetCentimeters >> 8) & 0xff;
    } else {
      data[6] = 0xff; // Not available
      data[7] = 0xff;
    }

    return {
      pgn: 128267,
      source: 0,
      destination: 255,
      priority: 5,
      data,
      timestamp: Date.now(),
      instanceId: 0,
    };
  }

  /**
   * Parse depth data from PGN 128267
   */
  private static parseDepthFromPGN(pgnData: PGNData): DepthData {
    if (pgnData.data.length < 8) {
      return { depth: 0 };
    }

    const data = pgnData.data;

    // SID - byte 0
    const sid = data[0] !== 0xff ? data[0] : undefined;

    // Instance - byte 1 (bits 0-3)
    const instanceId = data[1] & 0x0f;

    // Depth - bytes 2-5 (little endian, 0.01m resolution)
    const depthRaw = data[2] | (data[3] << 8) | (data[4] << 16) | (data[5] << 24);
    const depth = depthRaw !== 0xffffffff ? depthRaw * 0.01 : 0;

    // Offset - bytes 6-7 (little endian, 0.01m resolution, signed)
    let offset: number | undefined;
    const offsetRaw = data[6] | (data[7] << 8);
    if (offsetRaw !== 0xffff) {
      // Convert from unsigned to signed 16-bit
      offset = offsetRaw > 32767 ? offsetRaw - 65536 : offsetRaw;
      offset *= 0.01;
    }

    return {
      depth,
      offset,
      instanceId: instanceId !== 0xff ? instanceId : undefined,
      sid,
    };
  }

  /**
   * Calculate NMEA checksum
   */
  private static calculateChecksum(sentence: string): string {
    let checksum = 0;
    for (let i = 0; i < sentence.length; i++) {
      checksum ^= sentence.charCodeAt(i);
    }
    return checksum.toString(16).toUpperCase().padStart(2, '0');
  }

  /**
   * Validate depth value
   */
  public static isValidDepth(depth: number): boolean {
    return depth > 0 && depth < 11000; // Max reasonable ocean depth
  }
}

// Export converter functions for use in bridge profiles
export const PGN128267ToDBT = DepthConverter.PGN128267ToDBT;
export const PGN128267ToDPT = DepthConverter.PGN128267ToDPT;
export const DBTToPGN128267 = DepthConverter.DBTToPGN128267;
export const DPTToPGN128267 = DepthConverter.DPTToPGN128267;
