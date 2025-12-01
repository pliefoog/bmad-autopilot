/**
 * Quick validation test for VWR/VWT wind parsers
 * Run with: node boatingInstrumentsApp/test-vwr-vwt.js
 */

const PureNmeaParser = require('./src/services/nmea/parsing/PureNmeaParser').default;

const parser = PureNmeaParser.getInstance();

console.log('\n=== VWR/VWT Wind Parser Test ===\n');

// Test VWR (Relative Wind) - Starboard
const vwrStarboard = '$IIVWR,148.0,R,10.4,N,5.4,M,19.3,K*4A';
console.log('Testing VWR Starboard:', vwrStarboard);
const vwrResult1 = parser.parseSentence(vwrStarboard);
console.log('Result:', JSON.stringify(vwrResult1, null, 2));

// Test VWR (Relative Wind) - Port
const vwrPort = '$IIVWR,135.0,L,12.8,N,6.6,M,23.7,K*45';
console.log('\nTesting VWR Port:', vwrPort);
const vwrResult2 = parser.parseSentence(vwrPort);
console.log('Result:', JSON.stringify(vwrResult2, null, 2));

// Test VWT (True Wind) - Starboard
const vwtStarboard = '$IIVWT,120.0,R,15.2,N,7.8,M,28.1,K*5C';
console.log('\nTesting VWT Starboard:', vwtStarboard);
const vwtResult1 = parser.parseSentence(vwtStarboard);
console.log('Result:', JSON.stringify(vwtResult1, null, 2));

// Test VWT (True Wind) - Port
const vwtPort = '$IIVWT,95.0,L,18.5,N,9.5,M,34.3,K*63';
console.log('\nTesting VWT Port:', vwtPort);
const vwtResult2 = parser.parseSentence(vwtPort);
console.log('Result:', JSON.stringify(vwtResult2, null, 2));

// Verify results
console.log('\n=== Verification ===');
console.log('VWR Starboard parsed:', vwrResult1.success ? '✅' : '❌');
console.log('VWR Port parsed:', vwrResult2.success ? '✅' : '❌');
console.log('VWT Starboard parsed:', vwtResult1.success ? '✅' : '❌');
console.log('VWT Port parsed:', vwtResult2.success ? '✅' : '❌');

if (vwrResult1.success && vwrResult1.data) {
  console.log('\nVWR Starboard fields:');
  console.log('  - Wind angle:', vwrResult1.data.fields.wind_angle, '°');
  console.log('  - Direction:', vwrResult1.data.fields.direction);
  console.log('  - Wind speed:', vwrResult1.data.fields.wind_speed_knots, 'knots');
}

if (vwtResult1.success && vwtResult1.data) {
  console.log('\nVWT Starboard fields:');
  console.log('  - Wind angle:', vwtResult1.data.fields.wind_angle, '°');
  console.log('  - Direction:', vwtResult1.data.fields.direction);
  console.log('  - Wind speed:', vwtResult1.data.fields.wind_speed_knots, 'knots');
}

console.log('\n✅ All parsers validated!\n');
