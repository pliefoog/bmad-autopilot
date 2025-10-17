/**
 * Solar Position Calculator for Marine Navigation
 * Uses SunCalc library for highly accurate astronomical calculations
 * Perfect for marine navigation where precision matters
 */

import * as SunCalc from 'suncalc';

export interface SolarTimes {
  sunrise: Date;
  sunset: Date;
  isDay: boolean;
  isDusk: boolean; // Civil twilight period
  isDawn: boolean; // Civil twilight period
  solarNoon: Date;
  civilTwilightDawn: Date;
  civilTwilightDusk: Date;
  nauticalTwilightDawn: Date;
  nauticalTwilightDusk: Date;
}

/**
 * Calculate precise sunrise and sunset times for given coordinates and date
 * Uses SunCalc library for astronomical accuracy
 * @param latitude Latitude in decimal degrees (-90 to 90)
 * @param longitude Longitude in decimal degrees (-180 to 180)
 * @param date Date object (defaults to today)
 * @returns Comprehensive solar times and current state
 */
export function calculateSolarTimes(
  latitude: number,
  longitude: number,
  date: Date = new Date()
): SolarTimes {
  // Input validation
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new Error('Invalid coordinates');
  }

  // Get comprehensive sun times using SunCalc
  const times = SunCalc.getTimes(date, latitude, longitude);
  
  // Handle polar day/night cases where times might be invalid
  const sunrise = times.sunrise && !isNaN(times.sunrise.getTime()) 
    ? times.sunrise 
    : new Date(date.getTime() - 24 * 60 * 60 * 1000); // Yesterday if polar night
    
  const sunset = times.sunset && !isNaN(times.sunset.getTime()) 
    ? times.sunset 
    : new Date(date.getTime() + 24 * 60 * 60 * 1000);  // Tomorrow if polar day
  
  const solarNoon = times.solarNoon || new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  
  // Twilight times for marine navigation
  const civilTwilightDawn = times.dawn || new Date(sunrise.getTime() - 30 * 60 * 1000);
  const civilTwilightDusk = times.dusk || new Date(sunset.getTime() + 30 * 60 * 1000);
  const nauticalTwilightDawn = times.nauticalDawn || new Date(sunrise.getTime() - 60 * 60 * 1000);
  const nauticalTwilightDusk = times.nauticalDusk || new Date(sunset.getTime() + 60 * 60 * 1000);
  
  // Calculate current state
  const now = new Date();
  const isDay = now >= sunrise && now <= sunset;
  const isDawn = now >= civilTwilightDawn && now < sunrise;
  const isDusk = now > sunset && now <= civilTwilightDusk;
  
  return {
    sunrise,
    sunset,
    isDay,
    isDusk,
    isDawn,
    solarNoon,
    civilTwilightDawn,
    civilTwilightDusk,
    nauticalTwilightDawn,
    nauticalTwilightDusk
  };
}

/**
 * Get appropriate theme mode based on precise solar position
 * Optimized for marine navigation with proper twilight handling
 * @param latitude GPS latitude
 * @param longitude GPS longitude
 * @param date Current date (optional)
 * @returns Recommended theme mode for marine conditions
 */
export function getSolarBasedThemeMode(
  latitude: number,
  longitude: number,
  date?: Date
): 'day' | 'night' | 'red-night' {
  try {
    const solar = calculateSolarTimes(latitude, longitude, date);
    const now = new Date();
    
    if (solar.isDay) {
      return 'day';
    } else if (solar.isDawn || solar.isDusk) {
      // Civil twilight periods - use red-night to preserve night vision
      // Critical for marine navigation during dawn/dusk
      return 'red-night';
    } else if (now >= solar.nauticalTwilightDawn && now < solar.civilTwilightDawn) {
      // Early nautical twilight - red mode for chart reading
      return 'red-night';
    } else if (now > solar.civilTwilightDusk && now <= solar.nauticalTwilightDusk) {
      // Late nautical twilight - red mode for navigation
      return 'red-night';
    } else {
      // Full darkness - regular night mode
      return 'night';
    }
  } catch (error) {
    console.warn('Solar calculation failed, falling back to time-based mode:', error);
    // Fallback to current time-based logic
    const hour = new Date().getHours();
    return (hour >= 6 && hour < 20) ? 'day' : 'night';
  }
}

/**
 * Format solar times for marine display
 * Shows sunrise/sunset with current solar state
 */
export function formatSolarTimes(solar: SolarTimes): string {
  const sunriseTime = solar.sunrise.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  const sunsetTime = solar.sunset.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return `↑${sunriseTime} ↓${sunsetTime}`;
}

/**
 * Get detailed solar information for marine navigation
 * Useful for displaying comprehensive twilight information
 */
export function getSolarInfo(solar: SolarTimes): {
  status: string;
  nextEvent: string;
  nextEventTime: string;
} {
  const now = new Date();
  
  if (solar.isDay) {
    return {
      status: 'Daylight',
      nextEvent: 'Sunset',
      nextEventTime: solar.sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  } else if (solar.isDawn) {
    return {
      status: 'Dawn Twilight',
      nextEvent: 'Sunrise',
      nextEventTime: solar.sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  } else if (solar.isDusk) {
    return {
      status: 'Dusk Twilight',
      nextEvent: 'Night',
      nextEventTime: solar.civilTwilightDusk.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  } else if (now < solar.civilTwilightDawn) {
    return {
      status: 'Night',
      nextEvent: 'Dawn',
      nextEventTime: solar.civilTwilightDawn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  } else {
    return {
      status: 'Night',
      nextEvent: 'Dawn',
      nextEventTime: 'Tomorrow'
    };
  }
}

/**
 * Get sun elevation angle for advanced marine calculations
 * Useful for determining optimal visibility conditions
 */
export function getSunPosition(
  latitude: number,
  longitude: number,
  date: Date = new Date()
): { altitude: number; azimuth: number } {
  try {
    const position = SunCalc.getPosition(date, latitude, longitude);
    return {
      altitude: position.altitude * 180 / Math.PI, // Convert to degrees
      azimuth: position.azimuth * 180 / Math.PI    // Convert to degrees
    };
  } catch (error) {
    console.warn('Sun position calculation failed:', error);
    return { altitude: 0, azimuth: 0 };
  }
}