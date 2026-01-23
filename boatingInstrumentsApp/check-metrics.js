// Quick test to see battery field keys
const SENSOR_SCHEMAS = require('./src/registry/sensorSchemas.ts');
const battery = SENSOR_SCHEMAS.SENSOR_SCHEMAS.battery;
console.log('Battery alarm fields:', Object.keys(battery.fields).filter(k => battery.fields[k].alarm));
console.log('\nCurrent has indirectThreshold?', !!battery.fields.current.alarm?.contexts?.agm?.critical?.indirectThreshold);
console.log('Temperature has indirectThreshold?', !!battery.fields.temperature.alarm?.contexts?.agm?.critical?.indirectThreshold);
