// Test RMC parsing
const { PureNmeaParser } = require('./src/services/nmea/parsing/PureNmeaParser');

// Simulate a typical RMC message
const rmcMessage = '$GPRMC,123519.487,A,3746.710,N,12225.354,W,5.2,54.7,021125,001.3,W*6A';

const parser = PureNmeaParser.getInstance();
const result = parser.parse(rmcMessage);

console.log('RMC Parsing Result:');
console.log('Fields:', JSON.stringify(result.fields, null, 2));
console.log('Time field:', result.fields?.time);
console.log('Date field:', result.fields?.date);

