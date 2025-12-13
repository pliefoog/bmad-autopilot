/**
 * Browser Console Debugging Script
 * Paste this into the browser console to inspect sensor data
 */

// Get nmeaStore state
const { useNmeaStore } = require('./src/store/nmeaStore');
const state = useNmeaStore.getState();
const sensors = state.nmeaData.sensors;

console.log('========== SENSOR DATA INSPECTION ==========');
console.log('All sensor categories:', Object.keys(sensors));

// Check wind data
if (sensors.wind) {
  console.log('\n🌬️ WIND SENSORS:', Object.keys(sensors.wind).length, 'instances');
  Object.entries(sensors.wind).forEach(([instance, data]) => {
    console.log(`  Instance ${instance}:`, {
      direction: data.direction,
      speed: data.speed,
      trueDirection: data.trueDirection,
      trueSpeed: data.trueSpeed,
      timestamp: new Date(data.timestamp).toLocaleTimeString()
    });
  });
} else {
  console.log('\n❌ NO WIND DATA');
}

// Check tank data  
if (sensors.tank) {
  console.log('\n🛢️ TANK SENSORS:', Object.keys(sensors.tank).length, 'instances');
  Object.entries(sensors.tank).forEach(([instance, data]) => {
    console.log(`  Instance ${instance}:`, {
      type: data.type,
      level: data.level,
      capacity: data.capacity,
      timestamp: new Date(data.timestamp).toLocaleTimeString()
    });
  });
} else {
  console.log('\n❌ NO TANK DATA');
}

// Check registered widgets
const { widgetRegistrationService } = require('./src/services/WidgetRegistrationService');
console.log('\n📋 REGISTERED WIDGET TYPES:', Array.from(widgetRegistrationService.registrations.keys()));

// Check detected instances
const detected = widgetRegistrationService.getDetectedInstances();
console.log('\n✅ DETECTED WIDGET INSTANCES:', detected.length);
detected.forEach(instance => {
  console.log(`  ${instance.widgetType}-${instance.instance}: ${instance.title}`);
});

console.log('\n========== END INSPECTION ==========');
