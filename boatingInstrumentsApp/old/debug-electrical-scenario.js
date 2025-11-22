// Debug Electrical Scenario Loading
// Check if the electrical-widget-validation scenario is properly loaded

const ScenarioDataSource = require('./server/lib/data-sources/scenario');

console.log('🔍 Debug: Electrical Scenario Loading');
console.log('=====================================');

// Test scenario loading
try {
  const scenarioDataSource = new ScenarioDataSource({
    scenarioName: 'electrical-widget-validation',
    loop: true,
    speed: 1
  });
  
  console.log('✅ Scenario loading succeeded');
  console.log('Scenario name:', scenarioDataSource.scenario?.name);
  console.log('Scenario timing:', scenarioDataSource.scenario?.timing);
  console.log('Scenario phases:', scenarioDataSource.scenario?.phases?.map(p => p.name));
  
  // Check if battery_voltage timing is present
  if (scenarioDataSource.scenario?.timing?.battery_voltage) {
    console.log(`🔋 Battery voltage timing found: ${scenarioDataSource.scenario.timing.battery_voltage} Hz`);
    console.log('   This should trigger XDR battery generation every', 1 / scenarioDataSource.scenario.timing.battery_voltage, 'seconds');
  } else {
    console.log('❌ No battery_voltage timing found');
  }
  
  // Test built-in scenario loading
  const builtInScenario = scenarioDataSource.getBuiltInScenario('electrical-widget-validation');
  if (builtInScenario) {
    console.log('');
    console.log('✅ Built-in scenario found:');
    console.log('Name:', builtInScenario.name);
    console.log('Description:', builtInScenario.description);
    console.log('Timing config:', builtInScenario.timing);
    console.log('Phases:', builtInScenario.phases?.map(p => `${p.name} (${p.duration}ms)`));
  } else {
    console.log('❌ Built-in scenario not found');
  }
  
} catch (error) {
  console.error('❌ Scenario loading failed:', error.message);
  console.error(error.stack);
}

console.log('');
console.log('💡 Next steps:');
console.log('1. Verify scenario is properly registered in lib/data-sources/scenario.js');
console.log('2. Check NMEA Bridge Simulator timing logic');
console.log('3. Ensure battery_voltage timing triggers XDR generation');