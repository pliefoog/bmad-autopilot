#!/usr/bin/env node
/**
 * Test NMEA 2000 PCDIN Message Injection
 * Sends PCDIN-wrapped PGN messages directly to WebSocket server
 */

const net = require('net');

const NMEA_SERVER = {
  host: 'localhost',
  port: 2000,
};

// NMEA 2000 Test Messages (PCDIN format)
const testMessages = [
  {
    message: '$PCDIN,01F200,00,C807,FF,FF,FF,FF,FF,FF*4A',
    description: 'PGN 127488: Engine 0, RPM = 2000 (0x07C8 * 0.25)',
    delay: 500,
  },
  {
    message: '$PCDIN,01F200,00,E809,FF,FF,FF,FF,FF,FF*7C',
    description: 'PGN 127488: Engine 0, RPM = 2530 (0x09E8 * 0.25)',
    delay: 500,
  },
  {
    message: '$PCDIN,01F214,00,F004,1E00,2B0B,FF,FF,FF*62',
    description: 'PGN 127508: Battery 0, V=12.8V, I=3.0A, T=287.15K (14°C)',
    delay: 500,
  },
  {
    message: '$PCDIN,01F211,00,00,E803,A00F0000,FF,FF*4D',
    description: 'PGN 127505: Tank 0 (Fuel), Level=90%, Capacity=400L',
    delay: 500,
  },
  {
    message: '$PCDIN,01F200,00,0C03,FF,FF,FF,FF,FF,FF*3B',
    description: 'PGN 127488: Engine 0, RPM = 780 (0x030C * 0.25 = idle)',
    delay: 500,
  },
];

console.log('🔧 NMEA 2000 Test Injection Tool');
console.log('================================\n');

function calculateChecksum(sentence) {
  // Remove $ and *XX from sentence
  const data = sentence.substring(1, sentence.indexOf('*'));
  let checksum = 0;

  for (let i = 0; i < data.length; i++) {
    checksum ^= data.charCodeAt(i);
  }

  return checksum.toString(16).toUpperCase().padStart(2, '0');
}

function sendMessage(client, testMsg, index, total) {
  return new Promise((resolve) => {
    console.log(`\n[${index + 1}/${total}] ${testMsg.description}`);
    console.log(`📤 Sending: ${testMsg.message}`);

    // Verify checksum
    const expectedChecksum = testMsg.message.split('*')[1];
    const calculatedChecksum = calculateChecksum(testMsg.message.split('*')[0] + '*');
    if (calculatedChecksum !== expectedChecksum) {
      console.log(
        `⚠️  Checksum mismatch! Expected: ${expectedChecksum}, Calculated: ${calculatedChecksum}`,
      );
    }

    client.write(testMsg.message + '\r\n');

    setTimeout(resolve, testMsg.delay);
  });
}

async function runTest() {
  const client = new net.Socket();

  return new Promise((resolve, reject) => {
    client.connect(NMEA_SERVER.port, NMEA_SERVER.host, async () => {
      console.log(`✅ Connected to NMEA TCP server at ${NMEA_SERVER.host}:${NMEA_SERVER.port}\n`);
      console.log('🚀 Starting PCDIN message injection...\n');

      try {
        for (let i = 0; i < testMessages.length; i++) {
          await sendMessage(client, testMessages[i], i, testMessages.length);
        }

        console.log('\n✅ All messages sent successfully!');
        console.log('\n💡 Check your app for:');
        console.log('   • Engine widget showing RPM values');
        console.log('   • Battery widget showing voltage/current/temp');
        console.log('   • Tank widget showing fuel level');
        console.log('   • Console logs with 🔍 PGN processing messages\n');

        client.end();
        setTimeout(resolve, 500);
      } catch (error) {
        console.error('❌ Error sending messages:', error);
        client.end();
        reject(error);
      }
    });

    client.on('error', (err) => {
      console.error(`❌ Connection error: ${err.message}`);
      console.log('\n💡 Make sure the NMEA Bridge simulator is running!');
      console.log('   Run: npm run web (or start the NMEA bridge)');
      reject(err);
    });

    client.on('close', () => {
      console.log('🔌 Connection closed');
    });
  });
}

// Run the test
runTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
