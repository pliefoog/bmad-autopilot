/**
 * Marine angle utilities for wind and navigation calculations
 */

/**
 * Normalizes an apparent wind angle from NMEA 0-359° format to standard ±180° range
 * 
 * NMEA MWV Convention:
 * - 0° = dead ahead (bow)
 * - 90° = starboard beam  
 * - 180° = dead astern (stern)
 * - 270° = port beam
 * 
 * Maritime Display Convention:
 * - 0° = dead ahead
 * - +90° STB = starboard beam
 * - ±180° = dead astern  
 * - -90° PRT = port beam
 * 
 * @param angle - NMEA wind angle 0-359° (or any range, will be normalized)
 * @returns Normalized angle: +0° to +180° STB, -1° to -180° PRT
 */
export function normalizeApparentWindAngle(angle: number | undefined | null): number | null {
  if (angle === undefined || angle === null || !isFinite(angle)) {
    return null;
  }
  
  // Normalize to 0-360 range first (handle any input range)
  let normalized = angle % 360;
  if (normalized < 0) {
    normalized += 360;
  }
  
  // Convert NMEA 0-359° to maritime ±180° convention:
  // 0-180° stays positive (starboard side) 
  // 181-359° becomes negative (port side)
  if (normalized > 180) {
    return normalized - 360;  // 181°→-179°, 270°→-90°, 359°→-1°
  }
  
  return normalized;  // 0°→0°, 90°→90°, 180°→180°
}

/**
 * Normalizes a true wind angle to 0-360° range
 * TWA (True Wind Angle) is typically expressed as 0-360° relative to north
 * 
 * @param angle - Raw angle in degrees
 * @returns Normalized angle in range 0° to 360°
 */
export function normalizeTrueWindAngle(angle: number | undefined | null): number | null {
  if (angle === undefined || angle === null || !isFinite(angle)) {
    return null;
  }
  
  // Normalize to 0-360 range
  let normalized = angle % 360;
  if (normalized < 0) {
    normalized += 360;
  }
  
  return normalized;
}

/**
 * Normalizes a compass heading to 0-360° range
 * 
 * @param heading - Raw heading in degrees
 * @returns Normalized heading in range 0° to 360°
 */
export function normalizeHeading(heading: number | undefined | null): number | null {
  if (heading === undefined || heading === null || !isFinite(heading)) {
    return null;
  }
  
  // Normalize to 0-360 range
  let normalized = heading % 360;
  if (normalized < 0) {
    normalized += 360;
  }
  
  return normalized;
}

/**
 * Formats an apparent wind angle for display with port/starboard indication
 * 
 * @param angle - Normalized AWA in ±180° range
 * @returns Formatted string like "45° STB" or "30° PORT"
 */
export function formatApparentWindAngle(angle: number | null): string {
  if (angle === null || !isFinite(angle)) {
    return '--';
  }
  
  const absAngle = Math.abs(angle);
  const side = angle >= 0 ? 'STB' : 'PORT';
  
  return `${absAngle.toFixed(0)}° ${side}`;
}

/**
 * Validates that a wind angle is within reasonable bounds
 * 
 * @param angle - Wind angle to validate
 * @param type - Type of wind angle ('AWA' | 'TWA')
 * @returns true if angle is valid, false otherwise
 */
export function isValidWindAngle(angle: number, type: 'AWA' | 'TWA' = 'AWA'): boolean {
  if (!isFinite(angle)) {
    return false;
  }
  
  if (type === 'AWA') {
    // AWA should be in ±180° range
    return angle >= -180 && angle <= 180;
  } else {
    // TWA should be in 0-360° range
    return angle >= 0 && angle <= 360;
  }
}