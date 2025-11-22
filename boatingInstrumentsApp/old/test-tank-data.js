const WebSocket = require('ws');

console.log('Connecting to NMEA Bridge Simulator to check for tank data...');

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  console.log('Connected to NMEA simulator');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    
    // Look for XDR sentences that contain tank data
    if (message.sentence && message.sentence.includes('XDR')) {
      if (message.sentence.includes('FUEL') || message.sentence.includes('WATR') || message.sentence.includes('BAT')) {
        console.log('🔍 Found relevant XDR:', message.sentence);
      }
    }
    
    // Look for parsed tank data
    if (message.sensors && message.sensors.tank) {
      console.log('🛢️ Tank data found:', JSON.stringify(message.sensors.tank, null, 2));
    }
    
  } catch (e) {
    // Ignore parsing errors
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

setTimeout(() => {
  console.log('Closing connection after 10 seconds...');
  ws.close();
  process.exit(0);
}, 10000);
