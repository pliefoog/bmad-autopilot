/**
 * Debug Script - Check NMEA Store State
 * 
 * This script tests if our NmeaSensorProcessor is successfully 
 * updating the NMEA Store with engine sensor data.
 */

const WebSocket = require('ws');

console.log('🔍 Debugging NMEA Store State...');
console.log('This script will simulate our NmeaSensorProcessor and check if data reaches the store.');

// Simulate the store update process
function simulateNmeaSensorProcessorUpdate() {
  console.log('\n🧪 Simulating NmeaSensorProcessor.processRPM():');
  
  // This is exactly what our NmeaSensorProcessor should be creating
  const sensorUpdate = {
    sensorType: 'engine',
    instance: 0,
    data: {
      name: 'Engine 1',
      rpm: 2080,
      timestamp: Date.now()
    }
  };
  
  console.log('   Created SensorUpdate:', JSON.stringify(sensorUpdate, null, 2));
  
  // This is what applySensorUpdates() should be calling
  console.log('\n🔄 This should call: updateSensorData("engine", 0, sensorData)');
  console.log('   Which should store data at: nmeaData.sensors.engine[0]');
  
  // Simulate what Instance Detection should find
  const mockNmeaData = {
    sensors: {
      engine: {
        0: sensorUpdate.data
      }
    },
    timestamp: Date.now(),
    messageCount: 1
  };
  
  console.log('\n📦 Expected NMEA Store structure:');
  console.log(JSON.stringify(mockNmeaData, null, 2));
  
  // Test the Instance Detection logic
  console.log('\n🔍 Testing Instance Detection logic:');
  const sensors = mockNmeaData.sensors || {};
  const engineSensors = sensors.engine || {};
  
  console.log('   sensors.engine found:', Object.keys(engineSensors).length > 0);
  
  Object.entries(engineSensors).forEach(([instanceStr, engineData]) => {
    const instance = parseInt(instanceStr);
    console.log(`   Engine instance ${instance}:`, engineData);
    
    if (engineData && engineData.timestamp) {
      const dataAge = Date.now() - engineData.timestamp;
      console.log(`   Data age: ${dataAge}ms (should be < 30000ms)`);
      
      if (dataAge < 30000) {
        console.log(`   ✅ Engine ${instance} should be DETECTED!`);
      } else {
        console.log(`   ❌ Engine ${instance} data too old`);
      }
    }
  });
}

// Test the actual WebSocket data flow
function testRealDataFlow() {
  console.log('\n🌐 Testing real WebSocket data flow...');
  console.log('Connecting to NMEA simulator at ws://127.0.0.1:8080...');
  
  const ws = new WebSocket('ws://127.0.0.1:8080');
  let processedCount = 0;
  
  ws.on('open', () => {
    console.log('✅ Connected to NMEA simulator');
    console.log('🎯 Key question: Is our web app also connected to this same WebSocket?');
  });
  
  ws.on('message', (data) => {
    const sentence = data.toString().trim();
    processedCount++;
    
    if (sentence.includes('RPM') && processedCount <= 3) {
      console.log(`\n📡 RPM sentence received: ${sentence}`);
      console.log('   ❓ Question: Is the web app receiving this same sentence?');
      console.log('   ❓ Question: Is NmeaService.processNmeaMessage() being called?');
      console.log('   ❓ Question: Is PureStoreUpdater.processNmeaMessage() being called?');
      console.log('   ❓ Question: Is updateSensorData() being called?');
    }
    
    if (processedCount >= 10) {
      console.log('\n🎭 Summary of questions to investigate:');
      console.log('   1. Is the web app connecting to ws://127.0.0.1:8080?');
      console.log('   2. Is the connection successful in the browser?');
      console.log('   3. Are NMEA sentences reaching NmeaService?');
      console.log('   4. Is our new processNmeaMessage() path being executed?');
      console.log('   5. Is sensor data reaching the NMEA Store?');
      
      ws.close();
      process.exit(0);
    }
  });
  
  ws.on('error', (err) => {
    console.log('❌ WebSocket error:', err.message);
    process.exit(1);
  });
}

// Run the tests
simulateNmeaSensorProcessorUpdate();
testRealDataFlow();