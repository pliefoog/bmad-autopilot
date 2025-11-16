// Test script for wind angle normalization
// Run this to verify AWA is properly constrained to ±180°

const { normalizeApparentWindAngle, formatApparentWindAngle, isValidWindAngle } = require('./src/utils/marineAngles');

console.log('=== Wind Angle Normalization Test ===');

// Test cases for problematic AWA values
const testCases = [
  -1629,  // Your problematic value
  1629,   // Positive version
  270,    // Should become -90° (port)
  -270,   // Should become 90° (starboard)
  360,    // Should become 0°
  450,    // Should become 90° (starboard)
  -450,   // Should become -90° (port)
  180,    // Should stay 180°
  -180,   // Should stay -180°
  0,      // Should stay 0°
  45,     // Should stay 45° (starboard)
  -45,    // Should stay -45° (port)
];

console.log('Raw Angle → Normalized → Formatted');
console.log('---------------------------------------');

testCases.forEach(angle => {
  const normalized = normalizeApparentWindAngle(angle);
  const formatted = formatApparentWindAngle(normalized);
  const isValid = isValidWindAngle(normalized, 'AWA');
  
  console.log(`${angle.toString().padStart(6)}° → ${normalized?.toString().padStart(6)}° → ${formatted.padEnd(10)} ${isValid ? '✓' : '✗'}`);
});

console.log('\n=== Expected Results ===');
console.log('• All normalized angles should be between -180° and +180°');
console.log('• Positive angles = Starboard (STB)');
console.log('• Negative angles = Port (PRT)');
console.log('• -1629° should become ~131° STB (depending on exact calculation)');
console.log('\n=== AWA Reference ===');
console.log('•   0° = Dead ahead (bow)');
console.log('•  90° STB = Beam starboard');
console.log('• -90° PRT = Beam port');
console.log('• ±180° = Dead astern (stern)');