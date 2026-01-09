/**
 * Debug script to check GPS timestamp update frequency
 * Run with: node debug-gps-updates.js
 */

const WebSocket = require('ws');

let lastGPSTime = null;
let lastLogTime = Date.now();
let updateCount = 0;

const client = new WebSocket('ws://localhost:8080');

client.on('open', () => {
  console.log('✅ Connected to NMEA bridge');
  console.log('Monitoring RMC sentences for GPS time...\n');
});

client.on('message', (data) => {
  const sentence = data.toString().trim();
  
  // Look for RMC sentences (contain GPS time)
  if (sentence.includes('RMC')) {
    const parts = sentence.split(',');
    const gpsTime = parts[1]; // Time field (HHMMSS)
    const now = Date.now();
    
    if (gpsTime !== lastGPSTime) {
      const timeSinceLastLog = now - lastLogTime;
      console.log(`[+${timeSinceLastLog}ms] GPS Time: ${gpsTime} (${sentence})`);
      lastGPSTime = gpsTime;
      lastLogTime = now;
      updateCount++;
    }
  }
});

client.on('close', () => {
  console.log(`\n🔌 Connection closed. Total updates: ${updateCount}`);
});

client.on('error', (err) => {
  console.log('❌ Error:', err.message);
});

// Summary every 10 seconds
setInterval(() => {
  console.log(`\n📊 Updates in last 10 seconds: ${updateCount}`);
  updateCount = 0;
}, 10000);
