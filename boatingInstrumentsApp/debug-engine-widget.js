const WebSocket = require('ws');

const client = new WebSocket('ws://localhost:8080');
let messageCount = 0;
const engineData = {
  rpm: [],
  coolantTemp: [],
  oilPressure: [],
  alternatorVoltage: []
};

client.on('open', () => {
  console.log('✅ Connected to NMEA Bridge\n');
  console.log('Monitoring engine data for 15 seconds...\n');
});

client.on('message', (data) => {
  const line = data.toString().trim();
  
  if (line.startsWith('$IIRPM')) {
    const parts = line.split(',');
    const rpm = parseInt(parts[3]);
    engineData.rpm.push(rpm);
    console.log(`RPM: ${rpm}`);
  }
  
  if (line.startsWith('$IIXDR') && line.includes('ENGINE#1')) {
    // Parse: $IIXDR,C,{temp},F,ENGINE#1,P,{pressure},P,ENGINE#1,U,{voltage},V,ALTERNATOR*XX
    const tempMatch = line.match(/C,([\d.]+),F,ENGINE#1/);
    const pressureMatch = line.match(/P,([\d.]+),P,ENGINE#1/);
    const voltageMatch = line.match(/U,([\d.]+),V,ALTERNATOR/);
    
    if (tempMatch) {
      const temp = parseFloat(tempMatch[1]);
      engineData.coolantTemp.push(temp);
      console.log(`  Coolant Temp: ${temp}°F`);
    }
    if (pressureMatch) {
      const pressure = parseFloat(pressureMatch[1]);
      engineData.oilPressure.push(pressure);
      console.log(`  Oil Pressure: ${pressure} PSI`);
    }
    if (voltageMatch) {
      const voltage = parseFloat(voltageMatch[1]);
      engineData.alternatorVoltage.push(voltage);
      console.log(`  Alternator Voltage: ${voltage}V`);
    }
    console.log('');
  }
  
  if (++messageCount >= 40) {
    console.log('\n📊 Data Summary:');
    console.log(`RPM samples: ${engineData.rpm.length}, range: ${Math.min(...engineData.rpm)}-${Math.max(...engineData.rpm)}`);
    console.log(`Coolant Temp samples: ${engineData.coolantTemp.length}, range: ${Math.min(...engineData.coolantTemp).toFixed(1)}-${Math.max(...engineData.coolantTemp).toFixed(1)}°F`);
    console.log(`Oil Pressure samples: ${engineData.oilPressure.length}, range: ${Math.min(...engineData.oilPressure).toFixed(1)}-${Math.max(...engineData.oilPressure).toFixed(1)} PSI`);
    console.log(`Alternator Voltage samples: ${engineData.alternatorVoltage.length}, range: ${Math.min(...engineData.alternatorVoltage).toFixed(2)}-${Math.max(...engineData.alternatorVoltage).toFixed(2)}V`);
    client.close();
  }
});

client.on('close', () => {
  console.log('\n✅ Monitoring complete');
  process.exit(0);
});

setTimeout(() => {
  client.close();
  process.exit(0);
}, 15000);
