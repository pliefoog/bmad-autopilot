const WebSocket = require('ws');

console.log('Creating WebSocket server to inject tank data...');

const wss = new WebSocket.Server({ port: 3001 });

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  let counter = 0;
  
  const sendTankData = () => {
    counter++;
    
    // Create XDR sentences for tank data
    const fuelLevel = 85 + Math.sin(counter * 0.1) * 5; // Fuel level oscillating around 85%
    const waterLevel = 60 + Math.sin(counter * 0.2) * 10; // Water level oscillating around 60%
    const batteryVoltage = 12.5 + Math.sin(counter * 0.05) * 0.5; // Battery voltage around 12.5V
    
    const messages = [
      {
        sentence: `$GPXDR,P,${(fuelLevel/100).toFixed(3)},P,FUEL_0*`,
        timestamp: Date.now(),
        sensors: {
          tank: {
            0: {
              level: fuelLevel / 100,
              type: 'fuel',
              capacity: 200,
              instance: 0
            }
          }
        }
      },
      {
        sentence: `$GPXDR,P,${(waterLevel/100).toFixed(3)},P,WATR_0*`,
        timestamp: Date.now(),
        sensors: {
          tank: {
            1: {
              level: waterLevel / 100,
              type: 'freshWater',
              capacity: 100,
              instance: 1
            }
          }
        }
      },
      {
        sentence: `$GPXDR,V,${batteryVoltage.toFixed(1)},V,BAT_0*`,
        timestamp: Date.now(),
        sensors: {
          battery: {
            0: {
              voltage: batteryVoltage,
              current: 5.2,
              instance: 0
            }
          }
        }
      }
    ];
    
    messages.forEach(msg => {
      ws.send(JSON.stringify(msg));
      console.log(`📤 Sent: ${msg.sentence}`);
    });
  };
  
  // Send tank data every 2 seconds
  const interval = setInterval(sendTankData, 2000);
  
  // Send initial data immediately
  sendTankData();
  
  ws.on('close', () => {
    console.log('Client disconnected');
    clearInterval(interval);
  });
});

console.log('Tank data WebSocket server running on port 3001');
console.log('Connect your app to ws://localhost:3001 to receive tank data');
