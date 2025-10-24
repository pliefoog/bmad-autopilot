#!/usr/bin/env node

/**
 * Quick NMEA Output Checker
 * Connects to WebSocket and logs NMEA sentences for debugging
 */

const WebSocket = require('ws');

const ws = new WebSocket('ws://127.0.0.1:8080');

let messageCount = 0;
const sentenceTypes = {};

ws.on('open', function open() {
  console.log('🔗 Connected to NMEA WebSocket');
  console.log('📝 Capturing NMEA sentences...\n');
});

ws.on('message', function message(data) {
  const sentence = data.toString().trim();
  messageCount++;
  
  // Extract sentence type
  const match = sentence.match(/^\$[A-Z]{2}([A-Z]{3})/);
  if (match) {
    const type = match[1];
    sentenceTypes[type] = (sentenceTypes[type] || 0) + 1;
    
    // Log first few of each type
    if (sentenceTypes[type] <= 2) {
      console.log(`${type}: ${sentence}`);
    }
  }
  
  // Stop after collecting some data
  if (messageCount >= 50) {
    console.log('\n📊 Summary:');
    Object.entries(sentenceTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} messages`);
    });
    
    // Check for speed sentences
    if (sentenceTypes.VTG) {
      console.log('\n✅ VTG (speed) sentences are being generated');
    } else {
      console.log('\n❌ NO VTG (speed) sentences found!');
    }
    
    if (sentenceTypes.RMC) {
      console.log('✅ RMC (GPS with speed) sentences are being generated');
    } else {
      console.log('❌ NO RMC (GPS with speed) sentences found!');
    }
    
    ws.close();
    process.exit(0);
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
  process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('\n⏰ Timeout reached');
  ws.close();
  process.exit(0);
}, 10000);