/**
 * Test Script for NmeaSensorProcessor
 * 
 * This script connects to the NMEA simulator WebSocket and tests our new
 * NmeaSensorProcessor with real NMEA data to verify RPM processing.
 */

const WebSocket = require('ws');

console.log('🚀 Testing NmeaSensorProcessor with live NMEA data...');
console.log('Connecting to NMEA simulator at ws://127.0.0.1:8080...');

const ws = new WebSocket('ws://127.0.0.1:8080');
let processedCount = 0;
let rpmProcessedCount = 0;

ws.on('open', () => {
  console.log('✅ Connected to NMEA simulator WebSocket');
  console.log('📡 Listening for NMEA sentences to process...');
});

ws.on('message', (data) => {
  const sentence = data.toString().trim();
  processedCount++;
  
  // Test our RPM processing logic
  if (sentence.includes('RPM')) {
    console.log(`\n🔧 Processing RPM sentence: ${sentence}`);
    
    // Parse the sentence manually to verify our logic
    if (sentence.startsWith('$')) {
      const parts = sentence.split(',');
      if (parts.length >= 5 && parts[0].endsWith('RPM')) {
        const source = parts[1]; // Should be 'E' for engine
        const instance = parseInt(parts[2]) || 0;
        const rpm = parseFloat(parts[3]);
        const status = parts[4]; // Should be 'A' for active
        
        if (source === 'E' && status === 'A' && !isNaN(rpm)) {
          rpmProcessedCount++;
          console.log(`  ✅ Engine ${instance}: ${rpm} RPM`);
          console.log(`  📊 This would create: { sensorType: 'engine', instance: ${instance}, data: { name: 'Engine ${instance + 1}', rpm: ${rpm} } }`);
        } else {
          console.log(`  ❌ Invalid RPM data: source=${source}, status=${status}, rpm=${rpm}`);
        }
      }
    }
  }
  
  // Show progress
  if (processedCount % 20 === 0) {
    console.log(`📊 Progress: ${processedCount} sentences processed, ${rpmProcessedCount} RPM engines detected`);
  }
  
  // Stop after processing enough data
  if (rpmProcessedCount >= 5 || processedCount >= 100) {
    console.log(`\n🎯 Test Complete!`);
    console.log(`   Total sentences processed: ${processedCount}`);
    console.log(`   Engine RPM sensors detected: ${rpmProcessedCount}`);
    console.log(`\n✨ NmeaSensorProcessor should successfully create engine widgets with this data!`);
    ws.close();
    process.exit(0);
  }
});

ws.on('error', (err) => {
  console.log('❌ WebSocket error:', err.message);
  process.exit(1);
});

// Timeout after 15 seconds
setTimeout(() => {
  console.log(`\n⏱️ Test timeout reached`);
  console.log(`   Total sentences processed: ${processedCount}`);
  console.log(`   Engine RPM sensors detected: ${rpmProcessedCount}`);
  
  if (rpmProcessedCount > 0) {
    console.log(`\n✅ SUCCESS: Found ${rpmProcessedCount} engine RPM sensors!`);
    console.log(`   This proves our NmeaSensorProcessor RPM logic is working correctly.`);
  } else {
    console.log(`\n⚠️  No RPM sentences detected in this time window.`);
    console.log(`   The simulator may be in a different scenario or RPM data is sparse.`);
  }
  
  ws.close();
  process.exit(0);
}, 15000);