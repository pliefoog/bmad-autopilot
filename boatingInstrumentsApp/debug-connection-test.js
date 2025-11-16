#!/usr/bin/env node

const WebSocket = require('ws');

console.log('🔍 Testing web app connection behavior...');

// Check what the web app is trying to connect to
const possibleHosts = [
    'ws://localhost:8080',
    'ws://127.0.0.1:8080',
    'ws://192.168.1.52:8080'
];

async function testConnection(url) {
    return new Promise((resolve) => {
        console.log(`\n🔗 Testing connection to: ${url}`);
        
        const ws = new WebSocket(url);
        let connected = false;
        
        const timeout = setTimeout(() => {
            if (!connected) {
                console.log(`❌ Connection timeout for ${url}`);
                ws.close();
                resolve({ url, status: 'timeout' });
            }
        }, 3000);
        
        ws.on('open', () => {
            connected = true;
            console.log(`✅ Successfully connected to ${url}`);
            clearTimeout(timeout);
            ws.close();
            resolve({ url, status: 'success' });
        });
        
        ws.on('error', (error) => {
            console.log(`❌ Failed to connect to ${url}: ${error.message}`);
            clearTimeout(timeout);
            resolve({ url, status: 'error', error: error.message });
        });
        
        ws.on('close', () => {
            if (connected) {
                console.log(`🔌 Connection to ${url} closed`);
            }
        });
    });
}

async function testAllConnections() {
    console.log('Testing all possible connection endpoints...\n');
    
    for (const url of possibleHosts) {
        await testConnection(url);
    }
    
    console.log('\n🎯 Summary:');
    console.log('If any connection succeeded above, that means the NMEA bridge simulator is reachable.');
    console.log('The web app should be using the same URL that succeeded.');
    console.log('\n🔍 Next steps:');
    console.log('1. Check browser console for actual connection attempts by the web app');
    console.log('2. Look for WebSocket connection errors in developer tools');
    console.log('3. Verify the connection defaults in the app are pointing to the working URL');
}

testAllConnections();