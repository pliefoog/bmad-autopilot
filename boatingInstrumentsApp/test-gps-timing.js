#!/usr/bin/env node

/**
 * GPS Timing Test Script
 * 
 * Connects to NMEA bridge simulator and precisely timestamps each GPS message
 * to analyze actual frequency and timing patterns.
 */

const net = require('net');

const HOST = 'localhost';
const PORT = 2000;
const MAX_MESSAGES = 50;

let messageCount = 0;
let startTime = null;

// High precision timestamp function
function getTimestamp() {
  const now = new Date();
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${ms}`;
}

// Connect to NMEA simulator
const client = new net.Socket();

client.connect(PORT, HOST, () => {
  console.log(`Connected to NMEA Bridge Simulator at ${HOST}:${PORT}`);
  console.log('Monitoring GPS messages with precise timing...\n');
  console.log('WallClock Time    | GPS Time | Latitude    | Longitude   | Message#');
  console.log('------------------|----------|-------------|-------------|----------');
  startTime = Date.now();
});

let buffer = '';

client.on('data', (data) => {
  buffer += data.toString();
  
  // Process complete lines
  const lines = buffer.split('\n');
  buffer = lines.pop(); // Keep incomplete line in buffer
  
  lines.forEach(line => {
    if (line.trim() && line.includes('IIGGA')) {
      messageCount++;
      const timestamp = getTimestamp();
      
      // Parse NMEA GGA sentence: $IIGGA,time,lat,latHem,lon,lonHem,quality,sats,hdop,alt,altUnit,geoid,geoidUnit,dgpsAge,dgpsId*checksum
      const fields = line.split(',');
      
      if (fields.length >= 6) {
        const gpsTime = fields[1] || 'N/A';
        const latitude = fields[2] || 'N/A';
        const latHem = fields[3] || '';
        const longitude = fields[4] || 'N/A';
        const lonHem = fields[5] || '';
        
        const latDisplay = latitude !== 'N/A' ? `${latitude}${latHem}` : 'N/A';
        const lonDisplay = longitude !== 'N/A' ? `${longitude}${lonHem}` : 'N/A';
        
        console.log(`${timestamp}     | ${gpsTime.padEnd(8)} | ${latDisplay.padEnd(11)} | ${lonDisplay.padEnd(11)} | ${messageCount.toString().padStart(8)}`);
      }
      
      // Stop after collecting enough data
      if (messageCount >= MAX_MESSAGES) {
        const elapsed = (Date.now() - startTime) / 1000;
        const avgFreq = messageCount / elapsed;
        
        console.log('\n=== TIMING ANALYSIS ===');
        console.log(`Total Messages: ${messageCount}`);
        console.log(`Elapsed Time: ${elapsed.toFixed(3)} seconds`);
        console.log(`Average Frequency: ${avgFreq.toFixed(2)} Hz`);
        console.log(`Expected Frequency: 5.00 Hz (from YAML timing.gps)`);
        console.log(`Frequency Difference: ${(avgFreq - 5.0).toFixed(2)} Hz`);
        
        client.destroy();
        process.exit(0);
      }
    }
  });
});

client.on('error', (err) => {
  console.error('Connection error:', err.message);
  process.exit(1);
});

client.on('close', () => {
  console.log('Connection closed');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  client.destroy();
  process.exit(0);
});