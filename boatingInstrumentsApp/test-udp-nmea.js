#!/usr/bin/env node
/**
 * UDP NMEA Multicast Connection Test
 * 
 * Tests UDP multicast connection to NMEA Bridge simulator.
 * 
 * Industry Standard (NMEA 0183 Amendment 3.01):
 * - Multicast Address: 239.2.1.1
 * - Multicast Port: 10110
 * - No client registration required - just join the multicast group
 * 
 * How UDP Multicast Works:
 * 1. Server broadcasts to multicast address 239.2.1.1:10110
 * 2. Clients bind to port 10110 and join multicast group
 * 3. Network delivers packets to all group members
 * 4. No client tracking or registration needed
 * 
 * This matches real marine electronics:
 * - OpenCPN, SignalK, Yacht Devices, WiFi NMEA bridges
 * - Standard across industry for UDP NMEA data
 * 
 * Usage:
 *   node test-udp-nmea.js
 */

const dgram = require('dgram');

// NMEA 0183 UDP Multicast Standard
const NMEA_MULTICAST_ADDR = '239.2.1.1';
const NMEA_MULTICAST_PORT = 10110;

console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 UDP NMEA Multicast Test (Industry Standard)');
console.log('═══════════════════════════════════════════════════════════');
console.log(`📍 Multicast Group: ${NMEA_MULTICAST_ADDR}:${NMEA_MULTICAST_PORT}`);
console.log(`📡 Protocol: NMEA 0183 Amendment 3.01 UDP Multicast`);
console.log(`⏰ Started: ${new Date().toISOString()}`);
console.log('');

// Create UDP socket with multicast support
const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

// Statistics
let messageCount = 0;
let startTime = null;
let lastMessageTime = null;
const messageTypes = new Map();

// Timeout to check if we're receiving data
let timeoutId = setTimeout(() => {
  console.log('');
  console.log('⚠️  WARNING: No multicast messages received after 5 seconds');
  console.log('');
  console.log('Possible issues:');
  console.log('  1. NMEA Bridge not running');
  console.log('  2. Firewall blocking multicast traffic (239.2.1.1)');
  console.log('  3. Network interface does not support multicast');
  console.log('  4. Router/switch blocking multicast packets');
  console.log('');
  console.log('To start NMEA Bridge:');
  console.log('  cd boatingInstrumentsApp');
  console.log('  node server/nmea-bridge.js --scenario ../marine-assets/test-scenarios/navigation/coastal-sailing.yml --loop');
  console.log('');
  console.log('Debug multicast on your network:');
  console.log('  # Check if multicast packets are being sent:');
  console.log('  tcpdump -i any host 239.2.1.1');
  console.log('');
  socket.close();
  process.exit(1);
}, 5000);

// Socket events
socket.on('error', (err) => {
  console.error('❌ Socket error:', err.message);
  socket.close();
  process.exit(1);
});

socket.on('listening', () => {
  const address = socket.address();
  console.log(`✅ UDP socket bound to port ${address.port}`);
  
  // Join the NMEA multicast group
  // This tells the network to send us packets addressed to 239.2.1.1
  try {
    socket.addMembership(NMEA_MULTICAST_ADDR);
    console.log(`✅ Joined multicast group ${NMEA_MULTICAST_ADDR}`);
    console.log('📡 Waiting for NMEA multicast messages...');
    console.log('   (No registration needed - multicast delivers to all group members)');
    console.log('');
  } catch (err) {
    console.error('❌ Failed to join multicast group:', err.message);
    console.log('');
    console.log('This may happen if:');
    console.log('  - Network interface does not support multicast');
    console.log('  - Firewall blocks multicast traffic');
    console.log('  - Running in Docker/VM without multicast routing');
    console.log('');
    socket.close();
    process.exit(1);
  }
});

socket.on('message', (msg, rinfo) => {
  // Clear the timeout on first message
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  if (!startTime) {
    startTime = Date.now();
    console.log('✅ First message received!');
    console.log('───────────────────────────────────────────────────────────');
  }

  messageCount++;
  lastMessageTime = Date.now();

  const message = msg.toString().trim();
  
  // Extract sentence type (e.g., $GPRMC, $IIDPT)
  const match = message.match(/^\$?([A-Z]{2}[A-Z0-9]{3})/);
  if (match) {
    const sentenceType = match[1];
    messageTypes.set(sentenceType, (messageTypes.get(sentenceType) || 0) + 1);
  }

  // Print first 10 messages, then every 100th
  if (messageCount <= 10 || messageCount % 100 === 0) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const rate = (messageCount / (Date.now() - startTime) * 1000).toFixed(1);
    console.log(`[${messageCount}] ${elapsed}s (${rate} msg/s) - ${message.substring(0, 60)}${message.length > 60 ? '...' : ''}`);
  }
});

// Bind to the multicast port to receive multicast messages
socket.bind(NMEA_MULTICAST_PORT, () => {
  // Socket is ready - listening event will fire next
});

// Graceful shutdown on Ctrl+C
process.on('SIGINT', () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 Test Summary');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Total messages received: ${messageCount}`);
  
  if (startTime && lastMessageTime) {
    const duration = (lastMessageTime - startTime) / 1000;
    const rate = (messageCount / duration).toFixed(1);
    console.log(`⏱️  Duration: ${duration.toFixed(1)}s`);
    console.log(`📈 Average rate: ${rate} messages/second`);
  }
  
  if (messageTypes.size > 0) {
    console.log('');
    console.log('📝 Message types received:');
    const sorted = Array.from(messageTypes.entries())
      .sort((a, b) => b[1] - a[1]);
    sorted.forEach(([type, count]) => {
      const percentage = ((count / messageCount) * 100).toFixed(1);
      console.log(`   ${type}: ${count} (${percentage}%)`);
    });
  }
  
  console.log('');
  console.log('🏁 Test completed');
  console.log('═══════════════════════════════════════════════════════════');
  
  socket.close();
  process.exit(0);
});

// Keep script running
console.log('Press Ctrl+C to stop...');
console.log('');
