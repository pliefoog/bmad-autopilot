/**
 * Solar Calculator Tests and Examples
 * Demonstrates suncalc integration for marine navigation
 */

import { calculateSolarTimes, getSolarBasedThemeMode, formatSolarTimes, getSolarInfo } from './solarCalculator';

// Test with various marine locations
const locations = [
  { name: 'San Francisco Bay', lat: 37.7749, lon: -122.4194 },
  { name: 'Mediterranean (Nice)', lat: 43.7102, lon: 7.2620 },
  { name: 'Caribbean (Miami)', lat: 25.7617, lon: -80.1918 },
  { name: 'North Sea (Aberdeen)', lat: 57.1497, lon: -2.0943 },
  { name: 'Sydney Harbor', lat: -33.8688, lon: 151.2093 },
];

console.log('🌅 Solar Calculator Test Results');
console.log('='.repeat(50));

locations.forEach(location => {
  console.log(`\n📍 ${location.name} (${location.lat}°, ${location.lon}°)`);
  
  try {
    const solar = calculateSolarTimes(location.lat, location.lon);
    const themeMode = getSolarBasedThemeMode(location.lat, location.lon);
    const info = getSolarInfo(solar);
    
    console.log(`   Sunrise: ${solar.sunrise.toLocaleTimeString()}`);
    console.log(`   Sunset:  ${solar.sunset.toLocaleTimeString()}`);
    console.log(`   Civil Dawn:  ${solar.civilTwilightDawn.toLocaleTimeString()}`);
    console.log(`   Civil Dusk:  ${solar.civilTwilightDusk.toLocaleTimeString()}`);
    console.log(`   Current Status: ${info.status}`);
    console.log(`   Theme Mode: ${themeMode.toUpperCase()}`);
    console.log(`   Next Event: ${info.nextEvent} at ${info.nextEventTime}`);
    console.log(`   Display: ${formatSolarTimes(solar)}`);
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

console.log('\n🎨 Theme Mode Logic:');
console.log('   Day Mode: Sun is above horizon');
console.log('   Red-Night Mode: Civil/Nautical twilight periods');
console.log('   Night Mode: Full darkness');

export {};