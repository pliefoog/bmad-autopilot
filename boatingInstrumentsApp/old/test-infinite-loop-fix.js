#!/usr/bin/env node

/**
 * Test script to verify the infinite loop fix in XDR tank processing
 * 
 * This tests that our deduplication logic prevents the React "Maximum update depth exceeded" error
 * that was caused by XDR processing continuously creating new PGN data.
 */

// Mock the NMEA store to track update calls
const mockNmeaStore = {
  addPgnDataCallCount: 0,
  addPgnData: function(data) {
    this.addPgnDataCallCount++;
    console.log(`Mock store update #${this.addPgnDataCallCount}: PGN ${data.pgn}, Instance ${data.instance}, Level: ${data.fields?.Level || 'undefined'}`);
    return data;
  }
};

// Mock WidgetFactory for metadata
const mockWidgetFactory = {
  getWidgetByPgn: () => ({ id: 'tank-fuel', type: 'multi-instance' })
};

// Simplified version of our XDR processing logic with deduplication
class TestInstanceDetectionService {
  constructor() {
    this.processedXdrData = new Map(); // Our deduplication map
    this.nmeaStore = mockNmeaStore;
    this.WidgetFactory = mockWidgetFactory;
  }

  updateTankDataInStore(tankType, instance, level, timestamp) {
    const key = `${tankType}-${instance}`;
    const stored = this.processedXdrData.get(key);
    
    // Deduplication logic: only update if level changed or >5 seconds elapsed
    const shouldUpdate = !stored || 
                        stored.level !== level || 
                        (timestamp - stored.timestamp) > 5000;
    
    if (!shouldUpdate) {
      console.log(`DEDUP: Skipping duplicate XDR data for ${key} (level: ${level})`);
      return;
    }
    
    // Store the processed data to prevent duplicates
    this.processedXdrData.set(key, { level, timestamp });
    
    // Create synthetic PGN 127505 data
    const syntheticPgn = {
      pgn: 127505,
      instance,
      fields: {
        Level: level * 100, // Convert ratio to percentage
        FluidType: tankType === 'FUEL' ? 0 : tankType === 'WATR' ? 1 : 2
      },
      timestamp,
      synthetic: true
    };
    
    console.log(`PROCESSING: ${key} with level ${level} -> Creating PGN 127505`);
    this.nmeaStore.addPgnData(syntheticPgn);
  }

  // Simulate XDR processing
  processXdrSentence(xdrData) {
    const timestamp = Date.now();
    
    // Extract tank type and instance from identifier (e.g., "FUEL_01")
    const identifierMatch = xdrData.identifier.match(/^(FUEL|WATR|WAST|BWAT)_(\d+)$/);
    if (!identifierMatch) return;
    
    const [, tankType, instanceStr] = identifierMatch;
    const instance = parseInt(instanceStr, 10);
    const level = parseFloat(xdrData.value);
    
    this.updateTankDataInStore(tankType, instance, level, timestamp);
  }
}

// Test the deduplication logic
console.log('🧪 Testing XDR Deduplication Logic');
console.log('==================================\n');

const service = new TestInstanceDetectionService();

// Test 1: First XDR message should process
console.log('Test 1: First XDR message');
service.processXdrSentence({
  identifier: 'FUEL_01',
  value: '0.75',
  type: 'V',
  units: 'L'
});

// Test 2: Duplicate XDR message should be deduplicated
console.log('\nTest 2: Duplicate XDR message (should be deduplicated)');
service.processXdrSentence({
  identifier: 'FUEL_01',
  value: '0.75',
  type: 'V',
  units: 'L'
});

// Test 3: Changed level should process
console.log('\nTest 3: Changed level (should process)');
service.processXdrSentence({
  identifier: 'FUEL_01',
  value: '0.80',
  type: 'V',
  units: 'L'
});

// Test 4: Another duplicate should be deduplicated
console.log('\nTest 4: Another duplicate (should be deduplicated)');
service.processXdrSentence({
  identifier: 'FUEL_01',
  value: '0.80',
  type: 'V',
  units: 'L'
});

// Test 5: Different tank should process
console.log('\nTest 5: Different tank instance (should process)');
service.processXdrSentence({
  identifier: 'WATR_01',
  value: '0.60',
  type: 'V',
  units: 'L'
});

console.log('\n📊 Test Results:');
console.log(`Total store updates: ${mockNmeaStore.addPgnDataCallCount}`);
console.log(`Processed XDR entries: ${service.processedXdrData.size}`);

console.log('\n🔍 Deduplication map contents:');
for (const [key, data] of service.processedXdrData.entries()) {
  console.log(`  ${key}: level=${data.level}, timestamp=${data.timestamp}`);
}

// Verify expected results
const expectedUpdates = 3; // First FUEL_01, changed FUEL_01, and WATR_01
const actualUpdates = mockNmeaStore.addPgnDataCallCount;

if (actualUpdates === expectedUpdates) {
  console.log('\n✅ SUCCESS: Deduplication working correctly!');
  console.log(`   Expected ${expectedUpdates} updates, got ${actualUpdates}`);
  process.exit(0);
} else {
  console.log('\n❌ FAILURE: Deduplication not working correctly!');
  console.log(`   Expected ${expectedUpdates} updates, got ${actualUpdates}`);
  process.exit(1);
}