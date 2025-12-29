/**
 * Wind calculation utilities
 * Pure functions for calculating derived wind metrics
 */

/**
 * Calculate true wind speed and direction from apparent wind and vessel motion
 * 
 * @param aws Apparent Wind Speed in knots (from wind sensor)
 * @param awa Apparent Wind Angle in degrees relative to bow (from wind sensor)
 * @param sog Speed Over Ground in knots (from GPS)
 * @param cog Course Over Ground in degrees (from GPS)
 * @param heading Vessel heading in degrees (from compass)
 * @returns True wind speed (knots) and direction (degrees, 0-360° absolute bearing)
 */
export function calculateTrueWind(
  aws: number,
  awa: number,
  sog: number,
  cog: number,
  heading: number,
): { speed: number; direction: number } {
  // Convert to radians
  const awaRadians = (awa * Math.PI) / 180;
  const headingRadians = (heading * Math.PI) / 180;
  const cogRadians = (cog * Math.PI) / 180;

  // Convert AWA (relative to bow/heading) to absolute apparent wind direction
  // Absolute Apparent Wind Direction = Heading + AWA
  const absoluteApparentWindAngle = headingRadians + awaRadians;

  // Apparent wind vector components (absolute, using heading + AWA)
  const apparentWindX = aws * Math.sin(absoluteApparentWindAngle);
  const apparentWindY = aws * Math.cos(absoluteApparentWindAngle);

  // Vessel velocity vector components (absolute, using COG for actual movement)
  const vesselSpeedX = sog * Math.sin(cogRadians);
  const vesselSpeedY = sog * Math.cos(cogRadians);

  // True wind = Apparent wind - Vessel velocity
  const trueWindX = apparentWindX - vesselSpeedX;
  const trueWindY = apparentWindY - vesselSpeedY;

  // Convert back to polar coordinates (magnitude and direction)
  const trueWindSpeed = Math.sqrt(trueWindX * trueWindX + trueWindY * trueWindY);
  let trueWindDirection = (Math.atan2(trueWindX, trueWindY) * 180) / Math.PI;

  // Normalize angle to 0-360
  if (trueWindDirection < 0) trueWindDirection += 360;

  return {
    speed: trueWindSpeed,
    direction: trueWindDirection,
  };
}
