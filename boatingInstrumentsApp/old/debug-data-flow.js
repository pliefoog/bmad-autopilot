#!/usr/bin/env node

const WebSocket = require('ws');

console.log('🧪 Testing NMEA data flow simulation...');
console.log('This will connect to the WebSocket and analyze the data flow that the web app should see.\n');

const ws = new WebSocket('ws://127.0.0.1:8080');

let messageCount = 0;
let sentenceTypeCounts = {};
let parsedSentences = [];

ws.on('open', () => {
    console.log('✅ Connected to NMEA WebSocket (same as web app should)');
    console.log('📊 Analyzing data for 10 seconds...\n');
    
    setTimeout(() => {
        console.log('\n📊 Analysis Results:');
        console.log('==================');
        console.log(`Total messages received: ${messageCount}`);
        console.log('\nSentence type frequencies:');
        
        for (const [type, count] of Object.entries(sentenceTypeCounts).sort((a, b) => b[1] - a[1])) {
            console.log(`  ${type}: ${count} messages`);
        }
        
        console.log('\n🔍 Sample sentences for each type:');
        const uniqueTypes = {};
        parsedSentences.forEach(sentence => {
            const match = sentence.match(/^\$([A-Z]{2})([A-Z]{3})/);
            if (match && !uniqueTypes[match[2]]) {
                uniqueTypes[match[2]] = sentence;
            }
        });
        
        for (const [type, example] of Object.entries(uniqueTypes)) {
            console.log(`  ${type}: ${example.substring(0, 60)}...`);
        }
        
        console.log('\n🎯 Widget Expected Data:');
        console.log('  Depth Widget: Expects DBT sentences ✓');
        console.log('  Wind Widget: Expects MWV sentences ✓');
        console.log('  Speed Widget: Expects VHW/VTG/RMC sentences');
        console.log('  GPS Widget: Expects RMC/GGA sentences');
        console.log('  Heading Widget: Expects HDG sentences ✓');
        
        console.log('\n❓ Questions to investigate:');
        console.log('  1. Are MWV sentences reaching the Wind Widget?');
        console.log('  2. Are VHW sentences reaching the Speed Widget?');
        console.log('  3. Is the NMEA parser working correctly in the browser?');
        console.log('  4. Are sensor updates being applied to the store?');
        
        ws.close();
    }, 10000);
});

ws.on('message', (data) => {
    const sentence = data.toString().trim();
    messageCount++;
    
    // Extract sentence type
    const match = sentence.match(/^\$([A-Z]{2})([A-Z]{3})/);
    if (match) {
        const sentenceType = match[2];
        sentenceTypeCounts[sentenceType] = (sentenceTypeCounts[sentenceType] || 0) + 1;
    }
    
    // Store sample sentences
    if (parsedSentences.length < 50) {
        parsedSentences.push(sentence);
    }
    
    // Show first few sentences to verify format
    if (messageCount <= 5) {
        console.log(`📨 ${messageCount}: ${sentence}`);
    }
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    process.exit(1);
});

ws.on('close', () => {
    console.log('🔌 Analysis complete');
    process.exit(0);
});