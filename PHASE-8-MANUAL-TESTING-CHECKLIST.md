# Phase 8: Manual Testing Checklist - Unified Sensor Schema Refactor

**Status:** Ready for execution  
**Duration:** 30-45 minutes  
**User Mandate:** NO automated tests (per explicit requirement)  
**Environment:** Web development server + NMEA simulator

## Setup

### 1. Start Development Environment

```bash
# Terminal 1: Start web dev server
cd boatingInstrumentsApp
npm run web

# Opens at http://localhost:8081 in browser
```

```bash
# Terminal 2: Start NMEA simulator with coastal sailing scenario
cd boatingInstrumentsApp
npm run nmea:coastal-sailing
# OR use VS Code task: "Start NMEA Bridge: Coastal Sailing"
```

### 2. Verify Connection

Check browser console (F12 → Console):
- Should see: "WebSocket connected to ws://localhost:8080"
- Should see NMEA data flowing (depth, speed, heading updates)

---

## Test Cases

### Test 1: Basic Sensor Data Display (5 minutes)

**Objective:** Verify unified schema works with existing widgets  
**Sensors Used:** Depth, Speed, Wind

#### Steps:

1. **Navigate to dashboard**
   - [ ] Dashboard loads without errors
   - [ ] No console errors

2. **Check Depth Widget**
   - [ ] Widget displays (e.g., "8.2 ft")
   - [ ] Value updates every 1-2 seconds
   - [ ] Matches simulator output (check NMEA Bridge logs)
   - [ ] Unit is correct (feet if imperial, meters if metric)

3. **Check Speed Widget**
   - [ ] Displays speed (e.g., "5.3 knots")
   - [ ] Updates in real-time
   - [ ] Value reasonable (coastal sailing: 4-8 knots typical)

4. **Check Wind Widget**
   - [ ] Shows wind speed and angle
   - [ ] Updates with simulator variations
   - [ ] Colors match alarm state (white/yellow/red)

**Pass Criteria:**
- ✅ All widgets display and update
- ✅ No console errors
- ✅ Values match simulator scenario
- ✅ All units correct

---

### Test 2: Multi-Sensor Detection (5 minutes)

**Objective:** Verify schema supports multiple sensor instances  
**Sensors Used:** Engine (if dual-engine simulator available), Battery

#### Steps:

1. **Open NMEA simulator logs**
   - Look for: "detectSensorInstance" or "multi-instance" logs
   - Verify instances are numbered (0, 1, 2, etc.)

2. **Check Engine Widget (if available)**
   - [ ] Displays primary engine (engine #0)
   - [ ] Shows RPM, boost, coolant temp
   - [ ] Updates continuously

3. **Check Battery Widget**
   - [ ] Displays voltage, current, state of charge
   - [ ] Updates with simulator variations
   - [ ] Alarm state tracks thresholds

4. **Monitor store in Redux DevTools**
   - Open browser DevTools → Redux tab
   - Navigate: nmeaData.sensors
   - [ ] See: battery[0], depth[0], engine[0]
   - [ ] Each instance has metrics Map
   - [ ] Each metric has formattedValue cached

**Pass Criteria:**
- ✅ All sensor instances created correctly
- ✅ Each instance has full metrics
- ✅ Redux store shows correct structure
- ✅ No duplicate instances created

---

### Test 3: Context-Dependent Alarms (5 minutes)

**Objective:** Verify battery chemistry context works  
**Sensors Used:** Battery

#### Steps:

1. **Open Battery Configuration Dialog**
   - [ ] Dialog opens without errors
   - [ ] "Battery Chemistry" picker visible
   - [ ] Current selection shown

2. **Test Alarm Thresholds for Different Chemistry**
   
   **Scenario A: Lead-Acid**
   - [ ] Change chemistry to "Lead-Acid"
   - [ ] Voltage threshold: ~11.5V critical
   - [ ] Check: If voltage drops below threshold, turns RED
   
   **Scenario B: LiFePO4**
   - [ ] Change chemistry to "LiFePO4"
   - [ ] Voltage threshold: ~12.8V critical (higher)
   - [ ] Check: Same voltage (12.5V) now shows WARNING (yellow) instead
   
   **Scenario C: AGM/GEL**
   - [ ] Change chemistry to AGM or Gel
   - [ ] Verify thresholds between lead-acid and LiFePO4

3. **Verify Alarm Colors Update**
   - [ ] Red = critical (below minimum)
   - [ ] Yellow = warning (below warning threshold)
   - [ ] White = normal (within safe range)

4. **Check Engine Type Context (if available)**
   - [ ] Open Engine Configuration
   - [ ] Change engine type (diesel vs gas)
   - [ ] RPM limits should adjust
   - [ ] Alarms should reflect new limits

**Pass Criteria:**
- ✅ Context selector works
- ✅ Alarm thresholds change with context
- ✅ Color indicators match alarm state
- ✅ No lag when changing context
- ✅ Alarms recalculate immediately

---

### Test 4: Type System Validation (5 minutes)

**Objective:** Verify TypeScript type safety (compile-time only)  
**Note:** This is static analysis, not runtime testing

#### Steps:

1. **Open IDE and check TypeScript errors**
   ```bash
   cd boatingInstrumentsApp
   npx tsc --noEmit
   ```
   - [ ] Output shows exactly 1 error
   - [ ] Error is in: `gracefulDegradationService.ts` line 394
   - [ ] This is the BASELINE error (known, not our code)

2. **Open a widget file and hover over types**
   - Example: `src/widgets/DepthWidget.tsx`
   - [ ] Hover over `sensorType`: shows `'depth'` type
   - [ ] Hover over `metricKey`: shows valid field names
   - [ ] IDE autocomplete works for field names

3. **Verify Type Safety in Components**
   - Open: `src/components/PrimaryMetricCell.tsx`
   - [ ] Can see `SensorMetricProps` type
   - [ ] Can see `sensorType`, `instance`, `metricKey` properties
   - [ ] IDE shows error if invalid sensor type used

**Pass Criteria:**
- ✅ Exactly 1 TypeScript error (baseline)
- ✅ Type inference works (autocomplete, hover info)
- ✅ All widgets type-check correctly
- ✅ No new errors introduced

---

### Test 5: Data Enrichment & Formatting (5 minutes)

**Objective:** Verify MetricValue caching and display formatting  
**Sensors Used:** Depth (flexible units)

#### Steps:

1. **Check Display Settings**
   - [ ] Open Settings → Units
   - [ ] Current: Depth in Feet or Meters?

2. **Verify SI → Display Conversion**
   - NMEA parser gives: depth = 2.5 (meters, SI)
   - Display should show:
     - If feet: "8.2" or "8.2 ft"
     - If meters: "2.5" or "2.5 m"
   - [ ] Conversion is correct

3. **Test Unit Change**
   - [ ] Change depth unit: Feet ↔ Meters
   - [ ] Widget immediately shows new unit
   - [ ] NO page reload needed
   - [ ] Value recalculated correctly

4. **Check Redux Store**
   - Open DevTools → Redux
   - Navigate to: nmeaData.sensors.depth[0].metrics.get('depth')
   - [ ] See: `formattedValue` field (cached)
   - [ ] See: `unit` field (correct symbol)
   - [ ] See: `si_value` (original 2.5m)

5. **Performance Check**
   - [ ] Unit change happens instantly (<100ms)
   - [ ] No stutter or lag
   - [ ] Dashboard remains responsive

**Pass Criteria:**
- ✅ SI → display conversion correct
- ✅ Unit change smooth and instant
- ✅ Redux shows cached formattedValue
- ✅ No performance degradation

---

### Test 6: Virtual Statistics (Session Min/Max/Avg) (5 minutes)

**Objective:** Verify computed metrics work  
**Sensors Used:** Depth

#### Steps:

1. **Enable Statistics Display (if widget available)**
   - Some widgets show secondary stats
   - [ ] Look for: "MIN DEPTH", "MAX DEPTH", "AVG SPEED"
   - [ ] Or check in Redux: `metrics.get('depth.min')`

2. **Observe Statistics Over Time**
   - Watch Depth widget for 30+ seconds
   - [ ] Min value: should be stable or decrease
   - [ ] Max value: should be stable or increase
   - [ ] Avg: should gradually stabilize
   - [ ] Values are reasonable for coastal sailing (0.5-50 meters typical)

3. **Verify Statistics Calculation**
   - Open Redux DevTools
   - Check: `sensorInstance.getHistory('depth')`
   - [ ] History array shows: [2.1, 2.3, 2.5, 2.4, 2.2, ...]
   - [ ] Min: 2.1, Max: 2.5 (or similar)
   - [ ] Stats computed correctly

4. **Test Statistics Reset**
   - Restart NMEA simulator
   - [ ] Statistics reset to single value
   - [ ] History cleared
   - [ ] No stale data remains

**Pass Criteria:**
- ✅ Statistics display (if available)
- ✅ Min/max/avg calculated correctly
- ✅ History buffer working
- ✅ Statistics update smoothly
- ✅ Stats reset on simulator restart

---

### Test 7: Configuration Persistence (5 minutes)

**Objective:** Verify sensor config saved across reloads  
**Sensors Used:** Any (battery preferred for context test)

#### Steps:

1. **Change Sensor Configuration**
   - [ ] Open Battery config dialog
   - [ ] Change chemistry: "Lead-Acid" → "LiFePO4"
   - [ ] Change alarm threshold: Critical voltage to 12.5V
   - [ ] Save changes (submit button)
   - [ ] Dialog closes

2. **Verify Immediate Effect**
   - [ ] Alarm thresholds update immediately
   - [ ] Widget colors change if needed
   - [ ] No page reload

3. **Reload Page and Verify Persistence**
   - [ ] Press F5 or reload page
   - [ ] App reloads, reconnects to NMEA
   - [ ] Battery config still shows: "LiFePO4"
   - [ ] Custom alarm threshold still in effect
   - [ ] No console errors

4. **Check Redux Store**
   - Open DevTools → Redux
   - Navigate to: nmeaStore → sensorConfig
   - [ ] Shows: `battery[0].context = 'lifepo4'`
   - [ ] Shows: custom thresholds persisted

**Pass Criteria:**
- ✅ Config changes apply immediately
- ✅ Config persists across page reload
- ✅ No console errors on reload
- ✅ Redux store shows correct persisted state

---

### Test 8: Parser & Schema Validation (5 minutes)

**Objective:** Verify NMEA parser validates against unified schema  
**Sensors Used:** All (simulator provides multiple types)

#### Steps:

1. **Monitor NMEA Parser Logs**
   ```javascript
   // In browser console:
   enableLog('nmea.depth');
   enableLog('nmea.speed');
   enableLog('nmea.battery');
   ```
   - [ ] Logs show parsed messages
   - [ ] Format: "NMEA: <type> {field1: val1, field2: val2, ...}"

2. **Verify Parser Uses Schema**
   - [ ] Logs show: "Validating against schema"
   - [ ] Logs show: "Instance detected: 0"
   - [ ] No errors about unknown fields

3. **Test Simulator Error Injection (Optional)**
   - Use HTTP API to inject malformed message
   - [ ] Parser should log error
   - [ ] Widget should continue showing old value (no crash)
   - [ ] App remains responsive

4. **Check Field Names Match Schema**
   - Parse a DBT (depth) message
   - Expected fields: depth, offset (matches SENSOR_SCHEMAS.depth)
   - [ ] No extra fields
   - [ ] No missing fields

**Pass Criteria:**
- ✅ Parser logs show schema validation
- ✅ Field names match schema
- ✅ Invalid messages handled gracefully
- ✅ App remains stable under error conditions

---

## Summary Checklist

| Test | Pass | Notes |
|------|------|-------|
| Test 1: Basic Display | ☐ | Widgets show & update |
| Test 2: Multi-Sensor | ☐ | Multiple instances work |
| Test 3: Context Alarms | ☐ | Chemistry/engine context |
| Test 4: Type System | ☐ | 1 baseline error only |
| Test 5: Formatting | ☐ | SI→display conversion |
| Test 6: Statistics | ☐ | Min/max/avg working |
| Test 7: Persistence | ☐ | Config survives reload |
| Test 8: Parser & Schema | ☐ | Validation working |

## Overall Status

**All Tests Pass?** ☐ YES → Refactor Complete ✅

---

## Debugging Commands

### Check NMEA Data Flow

```javascript
// In browser console

// 1. See all sensors in store
useNmeaStore.getState().nmeaData.sensors

// 2. Check specific sensor
const depth = useNmeaStore.getState().nmeaData.sensors.depth?.[0];
console.log(depth.metrics.get('depth')); // MetricValue

// 3. Get formatted value
const metric = depth.getMetric('depth');
console.log(metric.formattedValue); // "8.2"

// 4. Enable specific logs
enableLog('nmea.depth');
enableLogNamespace('nmea');

// 5. List enabled logs
listEnabledLogs();
```

### Check Type System

```bash
# In terminal
cd boatingInstrumentsApp

# Type check
npx tsc --noEmit

# Should show ONLY:
# src/services/gracefulDegradationService.ts(394,7): error TS1005: ')' expected.
```

### Check Redux Store Structure

```javascript
// In Redux DevTools (open from tab)

// Navigate to:
// State → nmeaStore → nmeaData → sensors → depth → 0

// Should see:
{
  name: "Depth",
  metrics: Map<string, MetricValue> {
    'depth' => {
      si_value: 2.5,
      value: 8.2,
      formattedValue: "8.2",
      unit: "ft",
      ...
    }
  }
}
```

---

## Known Issues & Workarounds

### Issue: Widgets not updating

**Symptom:** Widget shows old value  
**Cause:** Zustand selector not re-subscribing  
**Fix:** Check Redux DevTools that store is actually updating

### Issue: NMEA connection fails

**Symptom:** "WebSocket connection failed"  
**Cause:** Simulator not running  
**Fix:** Start NMEA Bridge: `npm run nmea:coastal-sailing`

### Issue: Type errors in IDE

**Symptom:** "Property does not exist" but code works  
**Cause:** TypeScript cache stale  
**Fix:** Reload IDE window (Cmd+R or Ctrl+R)

---

## Success Criteria

All 8 tests pass with:
- ✅ No new console errors
- ✅ No TypeScript errors (except 1 baseline)
- ✅ All widgets display and update
- ✅ Context-dependent features work
- ✅ Data persists across reloads
- ✅ Performance is smooth (<16ms per frame)

**Next Steps if All Pass:**
1. Create final summary document
2. Tag as `release/unified-schema-complete`
3. Document for team
4. Deploy to production

**Next Steps if Failures:**
1. Document failure
2. Identify root cause using debug commands
3. Check git log for recent changes
4. Rollback if needed: `git reset --hard <tag>`
