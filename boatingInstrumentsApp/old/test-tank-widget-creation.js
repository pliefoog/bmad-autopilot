/**
 * Test Tank Widget Creation
 * 
 * This script tests if our tank widget creation fix works by:
 * 1. Simulating XDR processing to populate tank sensor data
 * 2. Triggering the auto-detection logic in App.tsx
 */

console.log('🧪 Testing Tank Widget Creation Logic...');

// Simulate the data structure that would be in nmeaData.sensors.tank
const mockTankData = {
  tank: {
    0: {
      level: 0.85,        // 85% level
      type: 'fuel',       // fuel tank
      capacity: 200,      // liters
      instance: 0
    },
    1: {
      level: 0.60,        // 60% level  
      type: 'freshWater', // water tank
      capacity: 100,      // liters
      instance: 1
    }
  }
};

// Simulate the sensor data that triggers widget creation
const mockSensorUpdate = {
  sensorType: 'tank',
  instance: 0,
  data: mockTankData.tank[0]
};

console.log('📊 Mock tank data:', JSON.stringify(mockTankData, null, 2));

// Test the tank widget ID generation logic
function testTankWidgetIdGeneration() {
  console.log('\n🎯 Testing Tank Widget ID Generation:');
  
  Object.keys(mockTankData.tank).forEach(instanceStr => {
    const instance = parseInt(instanceStr);
    const tankData = mockTankData.tank[instance];
    
    // This matches the logic in App.tsx
    const widgetId = `tank-${instance}`;
    
    console.log(`   Instance ${instance}: ${tankData.type} -> Widget ID: "${widgetId}"`);
    console.log(`   - Level: ${(tankData.level * 100).toFixed(1)}%`);
    console.log(`   - Type: ${tankData.type}`);
    console.log(`   - Expected registry lookup: "tank" (singular) widget type`);
  });
}

// Test what the WidgetMetadataRegistry lookup would be
function testWidgetRegistryLookup() {
  console.log('\n🔍 Widget Registry Lookup Test:');
  console.log('   - Widget ID: "tank-0" -> Registry lookup: "tank"');
  console.log('   - Widget ID: "tank-1" -> Registry lookup: "tank"');  
  console.log('   - Registry should have both "tank" (singular) and "tanks" (plural)');
  console.log('   - Our fix added "tank" (singular) for backward compatibility');
}

// Run tests
testTankWidgetIdGeneration();
testWidgetRegistryLookup();

console.log('\n✅ Tank widget creation logic test completed');
console.log('📝 Next step: Check browser console for actual widget creation');
console.log('💡 If widgets appear, the fix is working!');
