// Test NMEA parsing with actual sentences from the simulator
const sentences = [
  '$GPRMC,173029,A,3746.7555,N,12225.3658,W,5.2,180.0,021125,,*17',
  '$IIMWV,67,R,103.9,N,A*19', 
  '$IIVHW,,,17.9,N,33.1,K*42',
  '$IIHDG,309.1,,,,*42',
  '$IIDBT,15.2,f,4.6,M,2.5,F*21'
];

// Test with the PureNmeaParser
const { PureNmeaParser } = require('./src/services/nmea/parsing/PureNmeaParser');

console.log('🧪 Testing NMEA parsing with actual sentences from simulator...\n');

const parser = PureNmeaParser.getInstance();

sentences.forEach((sentence, index) => {
  console.log(`\n📡 Testing sentence ${index + 1}: ${sentence}`);
  
  try {
    const result = parser.parseSentence(sentence);
    
    if (result.success) {
      console.log('✅ Parse successful!');
      console.log('   Message Type:', result.data?.messageType);
      console.log('   Talker:', result.data?.talker);
      console.log('   Fields:', Object.keys(result.data?.fields || {}).join(', '));
      console.log('   Sample Data:', JSON.stringify(result.data?.fields, null, 2).substring(0, 200));
    } else {
      console.log('❌ Parse failed!');
      console.log('   Errors:', result.errors);
    }
  } catch (error) {
    console.log('💥 Parse exception:', error.message);
  }
});

console.log('\n🔍 Summary:');
console.log('If all sentences parsed successfully, the issue is likely in:');
console.log('1. Data transformation (PureDataTransformer)');
console.log('2. Store updates (PureStoreUpdater)');
console.log('3. Widget data binding');
console.log('4. Connection between NmeaService and the web app');