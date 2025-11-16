#!/usr/bin/env node

const WebSocket = require('ws');

console.log('🔍 Connecting to NMEA WebSocket on port 8080...');

const ws = new WebSocket('ws://localhost:8080');

let messageCount = 0;
const sentenceTypes = new Set();

ws.on('open', () => {
    console.log('✅ Connected to NMEA bridge');
    
    // Auto-close after 10 seconds
    setTimeout(() => {
        console.log(`\n📊 Summary:`);
        console.log(`Messages received: ${messageCount}`);
        console.log(`Sentence types: ${Array.from(sentenceTypes).join(', ')}`);
        ws.close();
    }, 10000);
});

ws.on('message', (data) => {
    const sentence = data.toString().trim();
    messageCount++;
    
    // Extract sentence type (e.g., $GPGGA -> GPGGA)
    const match = sentence.match(/^\$([A-Z]{2}[A-Z]{3})/);
    if (match) {
        sentenceTypes.add(match[1]);
    }
    
    // Show first few messages
    if (messageCount <= 10) {
        console.log(`📨 ${messageCount}: ${sentence}`);
    } else if (messageCount === 11) {
        console.log('... (showing sentence types only)');
    }
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
    process.exit(1);
});

ws.on('close', () => {
    console.log('🔌 Connection closed');
    process.exit(0);
});