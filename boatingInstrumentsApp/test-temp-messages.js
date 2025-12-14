#!/usr/bin/env node
/**
 * Test temperature message generation
 */

const WebSocket = require('ws');

console.log('🔌 Connecting to NMEA bridge on port 8080...');
const ws = new WebSocket('ws://localhost:8080');

let messageCount = 0;
const tempMessages = [];

ws.on('open', () => {
  console.log('✅ Connected! Listening for temperature messages...\n');
});

ws.on('message', (data) => {
  const message = data.toString().trim();
  messageCount++;
  
  // Look for temperature-related messages (MTW or XDR with C type)
  if (message.includes('MTW') || (message.includes('XDR') && message.includes(',C,'))) {
    tempMessages.push(message);
    console.log(`📨 ${message}`);
    
    // Stop after collecting 10 unique temperature messages
    if (tempMessages.length >= 10) {
      console.log(`\n✅ Collected ${tempMessages.length} temperature messages`);
      ws.close();
      process.exit(0);
    }
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log(`\n🔌 Connection closed after ${messageCount} total messages`);
  console.log(`📊 Found ${tempMessages.length} temperature messages`);
  process.exit(0);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('\n⏱️ Timeout reached');
  console.log(`📊 Collected ${tempMessages.length} temperature messages out of ${messageCount} total`);
  ws.close();
  process.exit(0);
}, 10000);
