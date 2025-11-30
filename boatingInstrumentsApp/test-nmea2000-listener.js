#!/usr/bin/env node
/**
 * NMEA 2000 WebSocket Listener
 * Listens to WebSocket stream and displays PCDIN messages
 */

const WebSocket = require('ws');

const WS_URL = 'ws://localhost:8080';

console.log('🔧 NMEA 2000 WebSocket Listener');
console.log('================================\n');
console.log(`Connecting to ${WS_URL}...\n`);

const ws = new WebSocket(WS_URL);

let messageCount = 0;
let pcdinCount = 0;
let lastPcdinMessages = [];

ws.on('open', () => {
  console.log('✅ Connected to NMEA WebSocket server\n');
  console.log('Listening for NMEA messages (filtering for PCDIN)...\n');
  console.log('---------------------------------------------------\n');
});

ws.on('message', (data) => {
  messageCount++;
  const message = data.toString().trim();
  
  // Filter for PCDIN messages
  if (message.startsWith('$PCDIN')) {
    pcdinCount++;
    
    // Parse PCDIN message
    const parts = message.split(',');
    const pgnHex = parts[1];
    const pgnDec = parseInt(pgnHex, 16);
    
    let pgnType = 'Unknown';
    switch (pgnDec) {
      case 127488:
        pgnType = 'Engine Rapid Update';
        break;
      case 127489:
        pgnType = 'Engine Dynamic';
        break;
      case 127508:
        pgnType = 'Battery Status';
        break;
      case 127505:
        pgnType = 'Fluid Level';
        break;
    }
    
    console.log(`[${new Date().toLocaleTimeString()}] PCDIN #${pcdinCount}`);
    console.log(`  PGN: ${pgnDec} (0x${pgnHex}) - ${pgnType}`);
    console.log(`  Data: ${message}`);
    console.log('');
    
    lastPcdinMessages.push({ time: new Date(), message, pgn: pgnDec });
    if (lastPcdinMessages.length > 10) {
      lastPcdinMessages.shift();
    }
  }
});

ws.on('error', (err) => {
  console.error(`❌ WebSocket error: ${err.message}`);
  console.log('\n💡 Make sure the NMEA Bridge simulator is running!');
  console.log('   Run: node server/nmea-bridge.js --scenario <scenario.yml>\n');
});

ws.on('close', () => {
  console.log('\n🔌 Connection closed\n');
  console.log(`Statistics:`);
  console.log(`  Total messages: ${messageCount}`);
  console.log(`  PCDIN messages: ${pcdinCount}`);
  
  if (pcdinCount === 0) {
    console.log('\n⚠️  No PCDIN messages received!');
    console.log('   Make sure your scenario file includes PCDIN sentences.');
  }
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n📊 Final Statistics:');
  console.log(`  Total messages: ${messageCount}`);
  console.log(`  PCDIN messages: ${pcdinCount}`);
  
  if (lastPcdinMessages.length > 0) {
    console.log('\n📝 Last PCDIN messages:');
    lastPcdinMessages.forEach((msg, idx) => {
      console.log(`  ${idx + 1}. PGN ${msg.pgn}: ${msg.message.substring(0, 60)}...`);
    });
  }
  
  console.log('\n👋 Goodbye!\n');
  ws.close();
  process.exit(0);
});
