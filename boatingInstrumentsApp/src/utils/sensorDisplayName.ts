/**
 * Sensor Display Name Utilities
 *
 * Provides helper functions to get user-friendly display names for sensor instances.
 * Priority: config.name → nmeaData.name → "type:instance" fallback
 */

import { SensorType, SensorAlarmThresholds } from '../types/SensorData';

/**
 * Get display name for a sensor instance
 *
 * @param sensorType - Type of sensor (battery, tank, engine, etc.)
 * @param instance - Instance number
 * @param config - Alarm configuration (may contain user-assigned name)
 * @param nmeaName - Name from NMEA data (if available)
 * @returns User-friendly display name
 */
export function getSensorDisplayName(
  sensorType: SensorType | null,
  instance: number,
  config?: SensorAlarmThresholds,
  nmeaName?: string,
): string {
  // Priority 1: User-assigned name from configuration
  if (config?.name?.trim()) {
    return config.name.trim();
  }

  // Priority 2: Name from NMEA data
  if (nmeaName?.trim()) {
    return nmeaName.trim();
  }

  // Priority 3: Fallback to type:instance format
  return formatSensorTypeInstance(sensorType, instance);
}

/**
 * Format sensor type and instance into readable string
 *
 * @param sensorType - Type of sensor
 * @param instance - Instance number
 * @returns Formatted string like "Battery 1", "Tank 2", etc.
 */
export function formatSensorTypeInstance(sensorType: SensorType | null, instance: number): string {
  // Handle null sensor type
  if (!sensorType) {
    return `Sensor ${instance}`;
  }

  // Capitalize first letter of sensor type
  const typeLabel = sensorType.charAt(0).toUpperCase() + sensorType.slice(1);
  return `${typeLabel} ${instance}`;
}

/**
 * Get short display name (truncated if too long)
 *
 * @param sensorType - Type of sensor
 * @param instance - Instance number
 * @param config - Alarm configuration
 * @param nmeaName - Name from NMEA data
 * @param maxLength - Maximum length before truncation (default: 20)
 * @returns Truncated display name
 */
export function getShortSensorDisplayName(
  sensorType: SensorType,
  instance: number,
  config?: SensorAlarmThresholds,
  nmeaName?: string,
  maxLength: number = 20,
): string {
  const fullName = getSensorDisplayName(sensorType, instance, config, nmeaName);

  if (fullName.length <= maxLength) {
    return fullName;
  }

  return fullName.substring(0, maxLength - 3) + '...';
}
