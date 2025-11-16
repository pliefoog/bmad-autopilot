// Comprehensive wind angle debugging tool
// This logs wind data at multiple points in the processing pipeline

console.log('🔍 Starting Wind Angle Debug Monitor...');
console.log('This will monitor:');
console.log('1. Raw NMEA MWV sentences from simulator');
console.log('2. Parsed wind angle values in NMEA processor');
console.log('3. Final wind angle values in Wind Widget');
console.log('4. True wind calculations');
console.log('');

// Monitor WebSocket for raw NMEA sentences
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8080');

let sentenceCount = 0;
let extremeCount = 0;

ws.on('open', () => {
  console.log('📡 Connected to NMEA simulator on port 8080');
  console.log('Monitoring for extreme wind angles (>360° or <-180°)...');
  console.log('');
});

ws.on('message', (data) => {
  const sentence = data.toString().trim();
  
  if (sentence.includes('MWV')) {
    sentenceCount++;
    
    // Parse MWV sentence: $IIMWV,angle,R,speed,N,A*checksum
    const parts = sentence.split(',');
    if (parts.length >= 4) {
      const windAngle = parseFloat(parts[1]);
      const reference = parts[2];
      const windSpeed = parseFloat(parts[3]);
      
      // Check for extreme angles
      if (Math.abs(windAngle) > 360 || windAngle < 0) {
        extremeCount++;
        console.log(`🚨 EXTREME ANGLE DETECTED:`);
        console.log(`   Raw NMEA: ${sentence}`);
        console.log(`   Parsed angle: ${windAngle}°`);
        console.log(`   Reference: ${reference}`);
        console.log(`   Speed: ${windSpeed} knots`);
        console.log('');
      } else {
        // Log normal values occasionally
        if (sentenceCount % 10 === 0) {
          console.log(`✅ Normal MWV #${sentenceCount}: ${windAngle}° ${reference}, ${windSpeed}kt`);
        }
      }
    }
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket connection failed:', error.message);
  console.log('💡 Make sure NMEA Bridge is running: npm run nmea:basic');
});

// Summary after 30 seconds
setTimeout(() => {
  console.log('');
  console.log('=== DEBUG SUMMARY ===');
  console.log(`📊 Total MWV sentences monitored: ${sentenceCount}`);
  console.log(`🚨 Extreme angles detected: ${extremeCount}`);
  
  if (extremeCount === 0) {
    console.log('✅ No extreme angles detected in NMEA simulator output');
    console.log('💡 Issue likely in:');
    console.log('   - Previous session cache/state');
    console.log('   - True wind calculations'); 
    console.log('   - Widget state management');
    console.log('   - Different scenario that was running earlier');
  } else {
    console.log('⚠️  Extreme angles found in simulator - needs investigation');
  }
  
  ws.close();
  process.exit(0);
}, 30000);

console.log('Running for 30 seconds... Press Ctrl+C to stop early');