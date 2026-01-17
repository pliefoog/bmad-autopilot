# Calculated Thresholds - Testing & Verification Plan

## Status
- ✅ Schema layer: All calculated threshold definitions implemented
- ✅ Resolver utility: Complete with temperature compensation
- ✅ SensorInstance integration: Resolver integrated into alarm pipeline
- ✅ Compilation: All files compile without errors
- ⏳ **Testing: Ready to verify calculated formulas are working correctly**

---

## Test Scenarios

### Scenario 1: Battery Current C-Rate Scaling

**Goal**: Verify current thresholds scale correctly with battery capacity

**Setup**:
```typescript
// Lead-acid battery: critical=0.5C, warning=0.33C
const testCases = [
  { capacity: 40, expectedCritical: 20, expectedWarning: 13.2 },
  { capacity: 100, expectedCritical: 50, expectedWarning: 33 },
  { capacity: 200, expectedCritical: 100, expectedWarning: 66 },
  { capacity: 500, expectedCritical: 250, expectedWarning: 165 },
];
```

**Test Steps**:
1. Create battery sensor with each capacity
2. Call `resolveThreshold()` with lead-acid critical/warning formulas
3. Verify returned values match expected calculations
4. Verify alarm triggers at correct current levels

**Expected Behavior**:
- 40Ah battery: critical alarm at 20A, warning at 13.2A
- 100Ah battery: critical alarm at 50A, warning at 33A
- 200Ah battery: critical alarm at 100A, warning at 66A
- 500Ah battery: critical alarm at 250A, warning at 165A

---

### Scenario 2: Battery Voltage Nominal Scaling

**Goal**: Verify voltage thresholds scale with nominal voltage

**Setup**:
```typescript
// Lead-acid: critical=98.5% of nominalVoltage
const testCases = [
  { nominalVoltage: 12, expectedCritical: 11.82 },    // 12 × 0.985
  { nominalVoltage: 24, expectedCritical: 23.64 },    // 24 × 0.985
  { nominalVoltage: 48, expectedCritical: 47.28 },    // 48 × 0.985
];

// LiFePO4: critical=106.7% of nominalVoltage
const lifepo4Cases = [
  { nominalVoltage: 12, expectedCritical: 12.804 },   // 12 × 1.067
  { nominalVoltage: 24, expectedCritical: 25.608 },   // 24 × 1.067
  { nominalVoltage: 48, expectedCritical: 51.216 },   // 48 × 1.067
];
```

**Test Steps**:
1. Create battery sensor with each nominal voltage
2. Call `resolveThreshold()` with correct chemistry's formula
3. Verify returned values match expected calculations
4. Verify alarm triggers at correct voltage levels

**Expected Behavior**:
- 12V lead-acid: critical at 11.82V
- 24V lead-acid: critical at 23.64V
- 48V lead-acid: critical at 47.28V
- Different multipliers for different chemistries

---

### Scenario 3: Temperature Compensation

**Goal**: Verify voltage thresholds adjust with temperature

**Setup**:
```typescript
// Lead-acid: -50mV/°C compensation
// Nominal: 12V, critical: 11.82V (98.5%)
// At 25°C (298.15K): base compensation = 0 (no deviation from reference)
// At 15°C (288.15K): deviation = -10°C, compensation = -0.05 × -10 = +0.5V
// At 35°C (308.15K): deviation = +10°C, compensation = -0.05 × +10 = -0.5V

const testCases = [
  { tempC: -20, tempK: 253.15, expectedCompensation: +1.75 },    // -0.05 × -35
  { tempC: 0,   tempK: 273.15, expectedCompensation: +1.25 },    // -0.05 × -25
  { tempC: 15,  tempK: 288.15, expectedCompensation: +0.5 },     // -0.05 × -10
  { tempC: 25,  tempK: 298.15, expectedCompensation: 0 },        // reference point
  { tempC: 35,  tempK: 308.15, expectedCompensation: -0.5 },     // -0.05 × +10
  { tempC: 50,  tempK: 323.15, expectedCompensation: -1.25 },    // -0.05 × +25
  { tempC: 60,  tempK: 333.15, expectedCompensation: -1.75 },    // -0.05 × +35
];

// Final threshold = base + compensation
// At -20°C: 11.82 + 1.75 = 13.57V (higher threshold in cold)
// At 60°C: 11.82 - 1.75 = 10.07V (lower threshold in hot)
```

**Test Steps**:
1. Create battery sensor with set temperature
2. Call `calculateTemperatureCompensation()` to verify math
3. Verify compensation is applied in `resolveThreshold()`
4. Verify final threshold values are correct
5. Test at multiple temperatures (-20°C to +60°C)

**Expected Behavior**:
- Colder temperatures: Higher thresholds (less alarm sensitivity in cold)
- Hotter temperatures: Lower thresholds (more alarm sensitivity in heat)
- Reference (25°C): No compensation applied
- Magnitude correct: 0.05V per °C deviation for lead-acid

---

### Scenario 4: Engine RPM Percentage Scaling

**Goal**: Verify RPM thresholds scale with max engine RPM

**Setup**:
```typescript
// Diesel: critical=93%, warning=87%
const testCases = [
  { maxRpm: 2000, expectedCritical: 1860, expectedWarning: 1740 },
  { maxRpm: 3000, expectedCritical: 2790, expectedWarning: 2610 },
  { maxRpm: 4000, expectedCritical: 3720, expectedWarning: 3480 },
  { maxRpm: 5000, expectedCritical: 4650, expectedWarning: 4350 },
  { maxRpm: 5800, expectedCritical: 5394, expectedWarning: 5046 },
];

// Bounds enforcement for diesel: 2400-5800 RPM
// If user sets maxRpm=2000, should it be clamped to 2400? Or alert user?
// Current implementation: No bounds in resolveThreshold, bounds in schema minValue/maxValue
```

**Test Steps**:
1. Create engine sensor with each max RPM value
2. Call `resolveThreshold()` with diesel critical/warning formulas
3. Verify returned values match expected calculations
4. Verify bounds are enforced if present

**Expected Behavior**:
- 2000 RPM engine: critical at 1860, warning at 1740
- 3000 RPM engine: critical at 2790, warning at 2610
- 5000 RPM engine: critical at 4650, warning at 4350
- Different percentages for different engine types

---

### Scenario 5: Missing Fields Handling

**Goal**: Verify graceful fallback when fields are missing

**Setup**:
```typescript
// Test when capacity is missing from SensorConfiguration
const incompleteSensorConfig = {
  // Missing: capacity field
  nominalVoltage: 12,
};

// Test when temperature is missing from SensorConfiguration
const noTempConfig = {
  capacity: 100,
  nominalVoltage: 12,
  // Missing: temperature field (should skip compensation)
};
```

**Test Steps**:
1. Call `resolveThreshold()` with missing baseField
2. Verify function returns `undefined` (graceful fallback)
3. Call `calculateTemperatureCompensation()` with missing temperature
4. Verify function returns `undefined` (skips compensation)
5. Verify alarm evaluation handles `undefined` thresholds correctly

**Expected Behavior**:
- Missing capacity: Alarm evaluation skips that threshold
- Missing temperature: Compensation is skipped, base value used
- No exceptions thrown
- System continues to function

---

### Scenario 6: Multi-Metric Sensor Context

**Goal**: Verify calculated thresholds work with multi-metric sensors

**Setup**:
```typescript
// Battery sensor has multiple alarmed metrics: voltage, current, capacity
// Each metric has its own thresholds (some calculated, some static)

const batteryInstance = new SensorInstance('battery', 0);
batteryInstance.updateThresholdsFromConfig({
  sensorType: 'battery',
  instance: 0,
  context: { chemistry: 'lead-acid' },
  capacity: 100,
  nominalVoltage: 12,
  temperature: 288.15,
  metrics: {
    voltage: {
      critical: { calculated: true, baseField: 'nominalVoltage', multiplier: 0.985, tempCompensation: -0.05 },
      warning: { calculated: true, baseField: 'nominalVoltage', multiplier: 1.0, tempCompensation: -0.05 }
    },
    current: {
      critical: { calculated: true, baseField: 'capacity', multiplier: 0.5 },
      warning: { calculated: true, baseField: 'capacity', multiplier: 0.33 }
    },
    capacity: {
      critical: { min: 10 }, // Static threshold
      warning: { min: 20 }   // Static threshold
    }
  }
});
```

**Test Steps**:
1. Create sensor with multiple metrics
2. Verify each metric's thresholds are resolved correctly
3. Verify calculated metrics use formulas
4. Verify static metrics use direct values
5. Verify alarm evaluation for all metrics

**Expected Behavior**:
- Voltage thresholds resolved with temperature compensation
- Current thresholds resolved with capacity multiplier
- Capacity thresholds use static values
- All alarms evaluate independently

---

### Scenario 7: Registry Defaults vs User Config Priority

**Goal**: Verify user settings override registry defaults

**Setup**:
```typescript
// Registry defines default thresholds (calculated)
// User saves custom config (may be calculated or static)
// When sensor loads, user config should take priority

const registryDefaults = {
  // From schema: calculated formulas
  voltage: {
    critical: { calculated: true, baseField: 'nominalVoltage', multiplier: 0.985 },
    warning: { calculated: true, baseField: 'nominalVoltage', multiplier: 1.0 }
  }
};

const userConfig = {
  // User customized to static values
  voltage: {
    critical: { min: 11.5 }, // Static override
    warning: { min: 12.0 }   // Static override
  }
};
```

**Test Steps**:
1. Create sensor (loads registry defaults)
2. Verify thresholds are calculated formulas
3. Apply user config
4. Verify thresholds are now static values
5. Verify static values persist on reload

**Expected Behavior**:
- Registry defaults applied on first detection
- User config overrides defaults when loaded
- Static thresholds take priority over calculated
- Properly persisted and restored from AsyncStorage

---

## Verification Checklist

### Code Correctness
- [ ] All formula calculations match expected values (±0.01 tolerance)
- [ ] Temperature compensation math is correct (Kelvin conversion)
- [ ] Type guards properly distinguish static vs calculated thresholds
- [ ] Graceful fallbacks when fields are missing
- [ ] No exceptions thrown for edge cases

### Integration
- [ ] Registry defaults are resolved on sensor creation
- [ ] User config thresholds are resolved on load
- [ ] Resolved thresholds passed to alarm evaluation
- [ ] Alarm states update correctly with resolved thresholds
- [ ] Multiple metrics in same sensor work independently

### Performance
- [ ] Resolver function completes in <1ms
- [ ] No memory leaks or unbounded allocations
- [ ] Caching where appropriate (thresholds cached after resolution)
- [ ] No repeated resolution calls (resolved once per change)

### Backward Compatibility
- [ ] Static thresholds (old format) still work
- [ ] No breaking changes to public APIs
- [ ] Existing sensor configs continue to work
- [ ] Mixed static/calculated thresholds in same sensor work

---

## How to Run Tests

### Manual Testing (Quick Verification)
```bash
# 1. Start dev server
npm run web

# 2. Create battery sensor in app:
# - Settings → Add Sensor → Battery
# - Set capacity: 100Ah
# - Set chemistry: Lead-acid
# - Verify default thresholds show (calculated values)

# 3. Edit thresholds:
# - Settings → Configure Sensor → Battery
# - Verify current alarms show: critical=50A, warning=33A
# - Verify voltage alarms show: critical≈11.82V (with temp compensation)

# 4. Change settings:
# - Change capacity to 200Ah
# - Reload app
# - Verify thresholds updated: critical=100A, warning=66A
```

### Automated Testing (When Implemented)
```typescript
// Tests would verify:
// 1. resolveThreshold() calculations
// 2. calculateTemperatureCompensation() math
// 3. isCalculatedThreshold() type guard
// 4. SensorInstance threshold resolution
// 5. Alarm evaluation with resolved thresholds
```

---

## Known Issues / Open Questions

1. **Bounds Enforcement**: Should resolver clamp to minValue/maxValue, or should schema define bounds?
   - Current: Resolver clamps to minValue/maxValue if present
   - May need UI feedback if user sets out-of-bounds value

2. **Temperature Field Availability**: Is temperature always available at resolution time?
   - Currently: Returns undefined if temperature missing, skips compensation
   - May need to guarantee temperature is populated before resolution

3. **User-Editable Formulas**: Should users be able to customize multipliers in dialogs?
   - Current implementation: Only static values in UI
   - Future enhancement: Advanced mode to edit multipliers

---

## Success Criteria

✅ **All test scenarios pass**
- Formula calculations correct
- Temperature compensation working
- Alarm evaluation using resolved thresholds
- Graceful handling of missing fields

✅ **No regressions**
- Existing functionality still works
- Static thresholds unaffected
- No breaking changes

✅ **Type safety maintained**
- TypeScript compilation succeeds
- Type guards properly narrow types
- No unsafe casts needed

---

## Next Phase

After testing verification:
1. **Documentation**: Update user guides with formula information
2. **UI Enhancements**: Display calculated thresholds in dialogs
3. **Advanced Features**: Allow user customization of multipliers
4. **Monitoring**: Log resolved threshold values for debugging
5. **Performance**: Profile threshold resolution in production
