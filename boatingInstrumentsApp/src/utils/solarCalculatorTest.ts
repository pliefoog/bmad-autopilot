/**
 * Solar Calculator Tests and Examples
 * Demonstrates suncalc integration for marine navigation
 */

import {
  calculateSolarTimes,
  getSolarBasedThemeMode,
  formatSolarTimes,
  getSolarInfo,
} from './solarCalculator';

// Test with various marine locations
const locations = [
  { name: 'San Francisco Bay', lat: 37.7749, lon: -122.4194 },
  { name: 'Mediterranean (Nice)', lat: 43.7102, lon: 7.262 },
  { name: 'Caribbean (Miami)', lat: 25.7617, lon: -80.1918 },
  { name: 'North Sea (Aberdeen)', lat: 57.1497, lon: -2.0943 },
  { name: 'Sydney Harbor', lat: -33.8688, lon: 151.2093 },
];

locations.forEach((location) => {
  try {
    const solar = calculateSolarTimes(location.lat, location.lon);
    const themeMode = getSolarBasedThemeMode(location.lat, location.lon);
    const info = getSolarInfo(solar);
  } catch (error) {}
});

export {};
