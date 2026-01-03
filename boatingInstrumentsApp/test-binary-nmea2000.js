#!/usr/bin/env node

/**
 * Test Binary NMEA 2000 WebSocket Connection
 *
 * Connects to WebSocket server and captures binary frames from NMEA 2000 mode.
 * Verifies that proper binary PGN frames are being transmitted (not PCDIN text).
 */

const WebSocket = require('ws');

const WS_URL = 'ws://localhost:8080';
let frameCount = 0;
let textFrameCount = 0;
let binaryFrameCount = 0;

console.log('🔌 Connecting to NMEA Bridge WebSocket...');
console.log(`   URL: ${WS_URL}`);
console.log('');

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server');
  console.log('📡 Listening for binary NMEA 2000 frames...');
  console.log('');

  // Close after 5 seconds
  setTimeout(() => {
    ws.close();
  }, 5000);
});

ws.on('message', (data) => {
  frameCount++;

  if (Buffer.isBuffer(data)) {
    // Binary frame received!
    binaryFrameCount++;

    // Parse CAN frame
    if (data.length >= 5) {
      const canId = data.readUInt32BE(0);
      const dataLength = data.readUInt8(4);
      const payload = data.slice(5, 5 + dataLength);

      // Extract PGN from CAN ID
      const priority = (canId >> 26) & 0x07;
      const dataPage = (canId >> 24) & 0x01;
      const pduFormat = (canId >> 16) & 0xff;
      const pduSpecific = (canId >> 8) & 0xff;
      const source = canId & 0xff;
      const pgn = (dataPage << 16) | (pduFormat << 8) | pduSpecific;

      // Decode PGN name
      const pgnNames = {
        128267: 'Water Depth',
        128259: 'Speed',
        130306: 'Wind Data',
        129029: 'GNSS Position',
        127250: 'Vessel Heading',
        130310: 'Environmental Parameters',
        127245: 'Rudder',
        127488: 'Engine Rapid Update',
        127489: 'Engine Dynamic',
        127508: 'Battery Status',
        127505: 'Fluid Level',
      };

      const pgnName = pgnNames[pgn] || 'Unknown';

      console.log(`📦 Binary Frame #${binaryFrameCount}:`);
      console.log(
        `   PGN: ${pgn} (0x${pgn.toString(16).toUpperCase().padStart(5, '0')}) - ${pgnName}`,
      );
      console.log(`   Source: ${source} (0x${source.toString(16).toUpperCase().padStart(2, '0')})`);
      console.log(`   Priority: ${priority}`);
      console.log(`   Data Length: ${dataLength} bytes`);
      console.log(`   Payload: ${payload.toString('hex').toUpperCase()}`);
      console.log('');
    }
  } else if (typeof data === 'string' || data.toString) {
    // Text frame (should NOT happen in nmea2000 mode!)
    textFrameCount++;
    const text = data.toString().trim();
    console.log(`⚠️  Text Frame #${textFrameCount}: ${text.substring(0, 80)}`);
    console.log('');
  }
});

ws.on('close', () => {
  console.log('🔌 Disconnected from WebSocket server');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Total Frames: ${frameCount}`);
  console.log(`   Binary Frames: ${binaryFrameCount} ✅`);
  console.log(`   Text Frames: ${textFrameCount} ${textFrameCount > 0 ? '⚠️' : '✅'}`);
  console.log('');

  if (binaryFrameCount > 0 && textFrameCount === 0) {
    console.log('✅ SUCCESS: Pure binary NMEA 2000 mode confirmed!');
    console.log('   NO PCDIN encapsulation detected.');
  } else if (binaryFrameCount > 0 && textFrameCount > 0) {
    console.log('⚠️  MIXED MODE: Both binary and text frames detected');
  } else if (textFrameCount > 0) {
    console.log('❌ FAILURE: Only text frames detected (PCDIN mode?)');
  } else {
    console.log('⚠️  NO FRAMES: No data received in 5 seconds');
  }
});

ws.on('error', (err) => {
  console.error('❌ WebSocket Error:', err.message);
  process.exit(1);
});
