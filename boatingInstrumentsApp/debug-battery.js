/**
 * Debug Battery Widget Data
 * 
 * Open browser console and run:
 * node debug-battery.js
 * 
 * Or paste this directly in browser console while app is running:
 * window.__nmeaStore.getState().nmeaData.sensors.battery
 */

// For browser console debugging (paste this):
console.log('=== Battery Sensor Debug ===');
const store = window.__nmeaStore?.getState();
if (!store) {
  console.error('Store not found! Make sure app is running.');
} else {
  const batteries = store.nmeaData.sensors.battery;
  console.log('Battery instances:', Object.keys(batteries || {}));
  
  Object.entries(batteries || {}).forEach(([instance, sensorInstance]) => {
    console.log(`\n--- Battery Instance ${instance} ---`);
    console.log('Name:', sensorInstance.name);
    console.log('Timestamp:', sensorInstance.timestamp);
    console.log('SensorInstance object:', sensorInstance);
    
    // Try to get metrics
    const fields = ['voltage', 'current', 'temperature', 'stateOfCharge', 'nominalVoltage', 'capacity', 'chemistry'];
    fields.forEach(field => {
      const metric = sensorInstance.getMetric(field);
      console.log(`${field}:`, {
        si_value: metric?.si_value,
        formattedValue: metric?.formattedValue ?? metric?.getFormattedValue?.(),
        unitType: metric?.getUnitType?.()
      });
    });
  });
}
