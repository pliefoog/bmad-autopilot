/**
 * Battery NMEA Timing Debug Script
 * 
 * Connects to NMEA bridge WebSocket and logs all battery XDR messages
 * with precise timestamps to debug update timing issues.
 * 
 * Usage:
 *   node debug-battery-timing.js [duration_seconds]
 * 
 * Example:
 *   node debug-battery-timing.js 10
 */

const WebSocket = require('ws');

const DURATION_MS = (process.argv[2] ? parseInt(process.argv[2]) : 30) * 1000;
const WS_URL = 'ws://localhost:8080';

// XDR transducer types for battery metrics
const BATTERY_TRANSDUCERS = {
  'U': 'Voltage',
  'I': 'Current',
  'C': 'Temperature',
  'P': 'Percentage (SOC)',
};

// Track message timing per metric type
let messageCount = 0;
const metricStats = {
  voltage: { count: 0, intervals: [], lastTime: null },
  current: { count: 0, intervals: [], lastTime: null },
  temperature: { count: 0, intervals: [], lastTime: null },
  soc: { count: 0, intervals: [], lastTime: null },
};

console.log('🔌 Connecting to NMEA Bridge WebSocket...');
console.log(`📊 Will monitor for ${DURATION_MS / 1000} seconds\n`);

const client = new WebSocket(WS_URL);

client.on('open', () => {
  console.log('✅ Connected to NMEA Bridge');
  console.log('📡 Listening for battery XDR messages...\n');
  console.log('─'.repeat(100));
  console.log('Time (ms)'.padEnd(15) + 'Δt (ms)'.padEnd(12) + 'Type'.padEnd(15) + 'Value'.padEnd(15) + 'Unit'.padEnd(10) + 'NMEA Sentence');
  console.log('─'.repeat(100));
  
  // Auto-disconnect after duration
  setTimeout(() => {
    console.log('\n' + '─'.repeat(100));
    console.log('\n📊 Statistics:');
    console.log(`   Total messages: ${messageCount}`);
    
    Object.entries(metricStats).forEach(([metric, stats]) => {
      if (stats.count > 0) {
        const avgInterval = stats.intervals.reduce((a, b) => a + b, 0) / stats.intervals.length;
        const minInterval = Math.min(...stats.intervals);
        const maxInterval = Math.max(...stats.intervals);
        const hz = 1000 / avgInterval;
        
        console.log(`\n   ${metric.toUpperCase()}:`);
        console.log(`     Count: ${stats.count}`);
        console.log(`     Avg interval: ${avgInterval.toFixed(1)}ms (${hz.toFixed(2)}Hz)`);
        console.log(`     Min interval: ${minInterval.toFixed(1)}ms`);
        console.log(`     Max interval: ${maxInterval.toFixed(1)}ms`);
      }
    });
    
    console.log('\n✅ Monitoring complete');
    client.close();
  }, DURATION_MS);
});

client.on('message', (data) => {
  const now = Date.now();
  const sentence = data.toString().trim();
  
  // Filter for battery XDR messages
  // Format: $IIXDR,<type>,<value>,<unit>,<name>*<checksum>
  // Example: $IIXDR,U,12.6,V,BAT_00#VLT*7E
  if (!sentence.includes('XDR') || !sentence.includes('BAT_00')) {
    return;
  }
  
  messageCount++;
  
  // Parse XDR message
  // Remove checksum and split by comma
  const withoutChecksum = sentence.split('*')[0];
  const parts = withoutChecksum.split(',');
  
  if (parts.length >= 5) {
    const transducerType = parts[1]; // U, I, C, P
    const value = parts[2];
    const unit = parts[3];
    const name = parts[4]; // BAT_00#VLT, BAT_00#AMP, etc.
    
    const metricName = BATTERY_TRANSDUCERS[transducerType] || transducerType;
    
    // Track statistics per metric type
    let metricKey = null;
    if (transducerType === 'U') metricKey = 'voltage';
    else if (transducerType === 'I') metricKey = 'current';
    else if (transducerType === 'C') metricKey = 'temperature';
    else if (transducerType === 'P') metricKey = 'soc';
    
    // Calculate interval from LAST MESSAGE OF SAME TYPE
    let interval = 0;
    if (metricKey) {
      const stats = metricStats[metricKey];
      if (stats.lastTime) {
        interval = now - stats.lastTime;
        stats.intervals.push(interval);
      }
      stats.lastTime = now;
      stats.count++;
    }
    
    // Format output
    const timestamp = now.toString().padEnd(15);
    const intervalStr = interval > 0 ? `+${interval}`.padEnd(12) : ''.padEnd(12);
    const typeStr = metricName.padEnd(15);
    const valueStr = value.padEnd(15);
    const unitStr = unit.padEnd(10);
    
    console.log(`${timestamp}${intervalStr}${typeStr}${valueStr}${unitStr}${sentence}`);
  }
});

client.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});

client.on('close', () => {
  console.log('\n🔌 WebSocket connection closed');
  process.exit(0);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Interrupted by user');
  if (messageCount > 0) {
    console.log(`📊 Received ${messageCount} battery messages before interruption`);
  }
  client.close();
});
