// Simple test for wind angle normalization logic
// Demonstrates the math to fix AWA values like -1629°

console.log('=== Wind Angle Normalization Test ===');

function normalizeApparentWindAngle(angle) {
  if (angle === undefined || angle === null || !isFinite(angle)) {
    return null;
  }
  
  // Normalize to 0-360 range first
  let normalized = angle % 360;
  if (normalized < 0) {
    normalized += 360;
  }
  
  // Convert to ±180° range for apparent wind
  // 0-180° stays positive (starboard side)
  // 181-359° becomes negative (port side)
  if (normalized > 180) {
    return normalized - 360;
  }
  
  return normalized;
}

function formatApparentWindAngle(angle) {
  if (angle === null || !isFinite(angle)) {
    return '--';
  }
  
  const absAngle = Math.abs(angle);
  const side = angle >= 0 ? 'STB' : 'PRT';
  
  return `${absAngle.toFixed(0)}° ${side}`;
}

// Test cases for NMEA AWA values (0-359° format)
const testCases = [
  // NMEA MWV format tests
  0,      // Dead ahead → 0° STB
  45,     // Starboard bow → 45° STB  
  90,     // Starboard beam → 90° STB
  180,    // Dead astern → 180° STB
  270,    // Port beam → -90° PRT (270° - 360° = -90°)
  315,    // Port bow → -45° PRT (315° - 360° = -45°)
  359,    // Almost dead ahead port → -1° PRT
  
  // Edge cases and problematic values
  -1629,  // Your problematic value
  1629,   // Positive version
  360,    // Full circle → 0°
  450,    // 360° + 90° → 90° STB
  -90,    // Negative input → 270° → -90° PRT
];

console.log('Raw Angle → Normalized → Formatted');
console.log('---------------------------------------');

testCases.forEach(angle => {
  const normalized = normalizeApparentWindAngle(angle);
  const formatted = formatApparentWindAngle(normalized);
  const isValid = normalized >= -180 && normalized <= 180;
  
  console.log(`${angle.toString().padStart(6)}° → ${normalized?.toString().padStart(6)}° → ${formatted.padEnd(10)} ${isValid ? '✓' : '✗'}`);
});

console.log('\n=== Key Fix ===');
console.log(`-1629° becomes: ${formatApparentWindAngle(normalizeApparentWindAngle(-1629))}`);
console.log('\n=== NMEA MWV → Maritime AWA Mapping ===');
console.log('NMEA 0-359° format → Maritime ±180° display:');
console.log('•   0° → 0° STB (dead ahead)');
console.log('•  90° → 90° STB (starboard beam)');
console.log('• 180° → 180° STB (dead astern)');  
console.log('• 270° → -90° PRT (port beam)');
console.log('• 315° → -45° PRT (port bow)');
console.log('• 359° → -1° PRT (almost ahead port)');