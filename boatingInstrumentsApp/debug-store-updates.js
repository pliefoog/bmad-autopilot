/**
 * Store Update Debug Script
 *
 * Monitors the NMEA store state to verify sensor data updates are being applied.
 * Connects to web app's WebSocket and logs store state changes.
 *
 * Usage:
 *   1. Start web app (npm run web)
 *   2. Open browser console
 *   3. Paste this script and run it
 *
 * This runs IN THE BROWSER CONSOLE, not Node.js!
 *
 * IMPORTANT: Redux DevTools cannot serialize ES6 Maps!
 * _history appears empty in Redux but may contain data.
 * This script directly inspects the Map to verify.
 */

(function () {
  const CHECK_INTERVAL = 500; // ms
  const DURATION = 10000; // 10 seconds

  console.log('🔍 Starting store update monitor...\n');
  console.log('⚠️  Redux DevTools shows Maps as empty - this script checks actual Map contents\n');
  console.log('Checking every 500ms for 10 seconds\n');
  console.log('─'.repeat(80));

  let lastState = null;
  let updateCount = 0;
  let checkCount = 0;

  const interval = setInterval(() => {
    checkCount++;

    // Access Zustand store from window
    const state = window.useNmeaStore?.getState();
    if (!state) {
      console.warn('⚠️  useNmeaStore not found - is the app loaded?');
      return;
    }

    const batteryInstance = state.nmeaData.sensors.battery?.[0];
    if (!batteryInstance) {
      console.log(`[${checkCount}] ⏳ Waiting for battery sensor...`);
      return;
    }

    // CRITICAL: Check if _history Map actually has data (Redux can't show Maps)
    const historyMap = batteryInstance._history;
    if (checkCount === 1 && historyMap) {
      console.log('\n🔍 Inspecting _history Map (Redux DevTools cannot serialize Maps):');
      console.log(`  Map type: ${historyMap instanceof Map ? 'ES6 Map ✅' : 'NOT A MAP ❌'}`);
      console.log(`  Map size: ${historyMap.size}`);
      console.log(`  Map keys: ${Array.from(historyMap.keys()).join(', ')}`);

      // Check if metrics are stored
      if (historyMap.size > 0) {
        console.log("  ✅ _history Map contains data (Redux just can't show it)");
      } else {
        console.error('  ❌ _history Map is genuinely EMPTY - data not being stored!');
      }
      console.log('');
    }

    // Extract current values via getMetric (bypasses Map serialization issue)
    const voltage = batteryInstance.getMetric('voltage');
    const current = batteryInstance.getMetric('current');
    const temp = batteryInstance.getMetric('temperature');
    const soc = batteryInstance.getMetric('stateOfCharge');

    const currentState = {
      voltage: voltage?.si_value,
      current: current?.si_value,
      temperature: temp?.si_value,
      soc: soc?.si_value,
      version: batteryInstance.version,
      voltageVersion: batteryInstance.getMetricVersion('voltage'),
      currentVersion: batteryInstance.getMetricVersion('current'),
      tempVersion: batteryInstance.getMetricVersion('temperature'),
      socVersion: batteryInstance.getMetricVersion('stateOfCharge'),
      timestamp: batteryInstance.timestamp,
    };

    // Check if anything changed
    if (lastState) {
      const changes = [];
      if (currentState.voltage !== lastState.voltage) changes.push('voltage');
      if (currentState.current !== lastState.current) changes.push('current');
      if (currentState.temperature !== lastState.temperature) changes.push('temp');
      if (currentState.soc !== lastState.soc) changes.push('soc');

      if (changes.length > 0) {
        updateCount++;
        console.log(`[${checkCount}] ✅ UPDATE #${updateCount}: ${changes.join(', ')} changed`);
        console.log(`  V: ${currentState.voltage?.toFixed(2)}V (v${currentState.voltageVersion})`);
        console.log(`  I: ${currentState.current?.toFixed(2)}A (v${currentState.currentVersion})`);
        console.log(
          `  T: ${currentState.temperature?.toFixed(1)}°C (v${currentState.tempVersion})`,
        );
        console.log(`  SOC: ${currentState.soc?.toFixed(1)}% (v${currentState.socVersion})`);
        console.log(`  Sensor version: ${currentState.version}`);
      } else {
        console.log(`[${checkCount}] ⚪ No changes (v${currentState.version})`);
      }
    } else {
      console.log(`[${checkCount}] 📍 Initial state:`);
      console.log(`  V: ${currentState.voltage?.toFixed(2)}V (v${currentState.voltageVersion})`);
      console.log(`  I: ${currentState.current?.toFixed(2)}A (v${currentState.currentVersion})`);
      console.log(`  T: ${currentState.temperature?.toFixed(1)}°C (v${currentState.tempVersion})`);
      console.log(`  SOC: ${currentState.soc?.toFixed(1)}% (v${currentState.socVersion})`);
    }

    lastState = currentState;
  }, CHECK_INTERVAL);

  setTimeout(() => {
    clearInterval(interval);
    console.log('\n' + '─'.repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`  Total checks: ${checkCount}`);
    console.log(`  Updates detected: ${updateCount}`);
    console.log(`  Expected updates (at 2Hz): ~${(DURATION / 1000) * 2}`);

    if (updateCount === 0) {
      console.error('❌ NO UPDATES DETECTED - Store is not receiving data!');
    } else if (updateCount < (DURATION / 1000) * 2 * 0.5) {
      console.warn(`⚠️  LOW UPDATE RATE - Expected ~${(DURATION / 1000) * 2}, got ${updateCount}`);
    } else {
      console.log('✅ Update rate looks good!');
    }
  }, DURATION);

  console.log('\n💡 Monitor running... check console for updates\n');
})();
