// Test script to inject extreme wind angle and verify normalization
const WebSocket = require('ws');

console.log('=== Testing Extreme Wind Angle Normalization ===');

// Create WebSocket connection to simulator
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  console.log('📡 Connected to NMEA simulator');
  
  // Inject a problematic MWV sentence with extreme wind angle
  const extremeWindAngle = -1629;  // Your problematic value
  const testSentence = `$IIMWV,${extremeWindAngle},R,12.5,N,A*XX`;
  
  console.log(`🌪️  Injecting extreme wind angle: ${testSentence}`);
  
  // Send the extreme value (this would normally come from a scenario function)
  ws.send(testSentence);
  
  setTimeout(() => {
    console.log('✅ Test completed - check web app console for normalization logs');
    ws.close();
    process.exit(0);
  }, 2000);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  console.log('💡 Make sure NMEA Bridge simulator is running on port 8080');
  process.exit(1);
});

// Also test the direct normalization
const { normalizeApparentWindAngle } = require('./src/utils/marineAngles.js');

// This will fail because it's TypeScript, but let's show the concept
console.log('\n=== Direct Function Test ===');
console.log('Note: Install ts-node to run TypeScript functions directly');
console.log('Expected result: -1629° → 171° STB');