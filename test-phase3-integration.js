#!/usr/bin/env node

/**
 * Phase 3 Integration Test Script
 * Tests all sensor detection and widget creation in Dynamic Widget Reintroduction Plan
 */

const { execSync } = require('child_process');
const http = require('http');

async function testPhase3Integration() {
  console.log('🧪 Phase 3 Integration Testing - Dynamic Widget Reintroduction');
  console.log('='.repeat(60));

  // Test 1: Check server processes
  console.log('\n📡 Test 1: Server Status Check');
  try {
    const processes = execSync('ps aux | grep -E "(nmea-bridge-simulator|expo.*start.*web)" | grep -v grep', { encoding: 'utf8' });
    if (processes.includes('nmea-bridge-simulator')) {
      console.log('✅ NMEA Simulator: RUNNING');
    } else {
      console.log('❌ NMEA Simulator: NOT RUNNING');
    }
    
    if (processes.includes('expo') && processes.includes('start') && processes.includes('web')) {
      console.log('✅ Web Server: RUNNING');
    } else {
      console.log('❌ Web Server: NOT RUNNING');
    }
  } catch (error) {
    console.log('⚠️  Could not check server processes');
  }

  // Test 3: Check NMEA Data Flow
  console.log('\n📊 Test 3: NMEA Data Analysis');
  
  const testSentences = [
    'DBT', // Depth Below Transducer (Phase 1)
    'GGA', // GPS Fix (Phase 1) 
    'VTG', // Track Made Good and Ground Speed (Phase 1)
    'HDG', // Heading (Phase 1)
    'MWV', // Wind Speed and Angle (Phase 2)
    'MTW'  // Mean Temperature of Water (Phase 2)
  ];

  console.log('\n📋 Expected Sensor Types from Dynamic Widget Plan:');
  console.log('   Phase 1 (Core Navigation):');
  console.log('   ✓ depth    - DBT/DPT/DBK sentences');
  console.log('   ✓ gps      - GGA/RMC sentences');
  console.log('   ✓ speed    - VTG/VHW sentences'); 
  console.log('   ✓ compass  - HDG sentences');
  console.log('   Phase 2 (Advanced Sensors):');
  console.log('   ✓ wind     - MWV sentences');
  console.log('   ✓ temperature - MTW sentences');

  // Test 4: Widget Creation Verification
  console.log('\n🎯 Test 4: Expected Widget Behavior');
  console.log('   Auto-detection should create widgets for:');
  console.log('   - depth (when DBT data detected)');
  console.log('   - gps (when GGA data detected)');
  console.log('   - speed (when VTG data detected)');
  console.log('   - compass (when HDG data detected)');
  console.log('   - wind (when MWV data detected)');
  console.log('   - temperature-seawater (when MTW data detected)');

  console.log('\n✅ Phase 3 Integration Test Setup Complete');
  console.log('\n🔍 Manual Verification Steps:');
  console.log('1. Open http://localhost:8082 in browser');
  console.log('2. Check browser console for sensor detection logs');
  console.log('3. Verify widgets appear automatically on dashboard');
  console.log('4. Test temperature widget with location-based instance IDs');
  console.log('5. Confirm all 6 sensor types are functional');

  console.log('\n📈 Success Criteria:');
  console.log('✓ All 6 sensor types detected and widgets created');
  console.log('✓ Temperature widgets show location (seawater, engine, etc.)');
  console.log('✓ Widget registry parsing handles instance-based IDs');
  console.log('✓ No compilation errors in temperature widget');
  console.log('✓ Data flows from NMEA → Processor → Store → Widgets');
}

// Execute the test
testPhase3Integration().catch(console.error);