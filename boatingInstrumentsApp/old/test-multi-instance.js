#!/usr/bin/env node

/**
 * Multi-Instance Detection Test
 * 
 * Connects to the NMEA simulator and tests if multi-instance detection
 * is working by monitoring detected engine/battery/tank instances.
 */

const WebSocket = require('ws');

console.log('🔍 Multi-Instance Detection Test');
console.log('================================');

let messageCount = 0;
let engineInstances = new Set();
let batteryInstances = new Set();
let tankInstances = new Set();

// Connect to NMEA simulator
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
    console.log('✅ Connected to NMEA simulator');
});

ws.on('message', (data) => {
    messageCount++;
    const sentence = data.toString().trim();
    
    // Print first few messages to verify data flow
    if (messageCount <= 5) {
        console.log(`📊 [${messageCount}] ${sentence}`);
    }
    
    // Look for engine RPM data (indicates engine instances)
    if (sentence.includes('$--RPM') || sentence.includes(',RPM,')) {
        const match = sentence.match(/RPM.*?(\d+)/);
        if (match) {
            engineInstances.add(match[1]);
        }
    }
    
    // Look for battery/electrical data
    if (sentence.includes('$--XDR') && (sentence.includes('V,') || sentence.includes('A,'))) {
        // Battery voltage/current data
        batteryInstances.add('detected');
    }
    
    // Look for tank data
    if (sentence.includes('$--XDR') && (sentence.includes('L,') || sentence.includes('%,'))) {
        // Tank level data
        tankInstances.add('detected');
    }
    
    // Print periodic status
    if (messageCount % 50 === 0) {
        console.log(`📈 Progress: ${messageCount} messages processed`);
        console.log(`   🔧 Engine instances: ${engineInstances.size}`);
        console.log(`   🔋 Battery instances: ${batteryInstances.size}`);
        console.log(`   🛢️ Tank instances: ${tankInstances.size}`);
    }
    
    // Stop after reasonable sample
    if (messageCount >= 200) {
        console.log('\n🎯 Final Results:');
        console.log('================');
        console.log(`Total messages: ${messageCount}`);
        console.log(`Engine instances detected: ${Array.from(engineInstances).join(', ') || 'None'}`);
        console.log(`Battery instances: ${batteryInstances.size > 0 ? 'Yes' : 'None'}`);
        console.log(`Tank instances: ${tankInstances.size > 0 ? 'Yes' : 'None'}`);
        
        if (engineInstances.size > 1 || batteryInstances.size > 0 || tankInstances.size > 0) {
            console.log('✅ Multi-instance data detected in recording!');
        } else {
            console.log('⚠️  No multi-instance data found - may be single-instance recording');
        }
        
        ws.close();
        process.exit(0);
    }
});

ws.on('error', (err) => {
    console.error('❌ Connection failed:', err.message);
    console.log('💡 Make sure NMEA simulator is running on ws://localhost:8080');
    process.exit(1);
});

ws.on('close', () => {
    console.log('🔌 Connection closed');
});

// Timeout safety
setTimeout(() => {
    console.log('⏰ Test timeout - connection or data issues');
    process.exit(1);
}, 30000);