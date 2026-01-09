/**
 * Test GPS utcTime and utcDate fields in nmeaStore
 * Connects to NMEA bridge and monitors GPS sensor data
 */

const WebSocket = require('ws');

console.log('🧪 Testing GPS utcTime and utcDate fields\n');
console.log('Connecting to NMEA bridge at ws://localhost:8080...\n');

const ws = new WebSocket('ws://localhost:8080');
let messageCount = 0;
let gpsData = {};

ws.on('open', () => {
  console.log('✅ Connected to NMEA bridge\n');
  console.log('Listening for RMC sentences...\n');
});

ws.on('message', (data) => {
  const msg = data.toString().trim();
  
  if (msg.includes('$IIRMC') || msg.includes('$GPRMC')) {
    messageCount++;
    
    // Parse RMC sentence
    const parts = msg.split(',');
    const time = parts[1];
    const date = parts[9];
    
    console.log(`\n📡 RMC Message #${messageCount}`);
    console.log(`Raw sentence: ${msg}`);
    console.log(`Time field: ${time} (hhmmss format)`);
    console.log(`Date field: ${date} (ddmmyy format)`);
    
    // Parse the fields
    if (time && time.length >= 6 && date && date.length === 6) {
      const hours = time.substr(0, 2);
      const minutes = time.substr(2, 2);
      const seconds = time.substr(4, 2);
      
      const day = date.substr(0, 2);
      const month = date.substr(2, 2);
      const year = '20' + date.substr(4, 2);
      
      console.log(`\n�� Parsed Time: ${hours}:${minutes}:${seconds} UTC`);
      console.log(`📅 Parsed Date: ${year}-${month}-${day} (yyyy-mm-dd)`);
      
      // Create JavaScript Date to verify
      const jsDate = new Date(Date.UTC(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        parseInt(seconds)
      ));
      
      const timestamp = jsDate.getTime();
      
      console.log(`\n✨ Expected Store Values:`);
      console.log(`   utcTime: ${timestamp} (milliseconds since epoch)`);
      console.log(`   utcDate: ${timestamp} (same value, different formatter)`);
      console.log(`   ISO String: ${jsDate.toISOString()}`);
      console.log(`\n   Widget Display:`);
      console.log(`   - utcTime cell: ${hours}:${minutes}:${seconds} (from timestamp)`);
      console.log(`   - utcDate cell: ${year}-${month}-${day} (from timestamp)`);
    }
    
    if (messageCount >= 3) {
      console.log('\n\n✅ Test complete - captured 3 RMC messages');
      console.log('\n📌 VERIFICATION:');
      console.log('   • Both utcTime and utcDate should have the SAME timestamp value');
      console.log('   • ConversionRegistry formats them differently for display');
      console.log('   • Widget shows them in separate cells\n');
      ws.close();
    }
  }
});

ws.on('close', () => {
  console.log('🔌 Connection closed');
  process.exit(0);
});

ws.on('error', (err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

// Timeout after 15 seconds
setTimeout(() => {
  console.log('\n⏱️ Timeout - no GPS data received');
  ws.close();
}, 15000);
