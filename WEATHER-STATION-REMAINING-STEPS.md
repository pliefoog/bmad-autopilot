# Weather Station Implementation - Remaining Steps

**Status:** Steps 0-12 of 15 COMPLETE (80% done)

## ✅ Completed Implementation

### Core Data Architecture (Steps 0-3)
- ✅ Logging categories: `nmea.weather`, `widget.weather`
- ✅ Percentage data category with identity conversion
- ✅ WeatherSensorData interface (pressure, airTemperature, humidity, dewPoint)
- ✅ Extended SensorType union with 'weather'
- ✅ Sensor configuration in SensorConfigRegistry with multi-metric alarms

### NMEA Parsing (Steps 4-7)
- ✅ MDA parser: Extracts pressure (bars → Pa), air temp, humidity, dew point
- ✅ MMB parser: Barometric pressure only
- ✅ PGN 130310 extended: Now parses humidity (bytes 4-5) + pressure (bytes 6-7)
- ✅ PGN 130311 parser: Dedicated atmospheric data (1 hPa scaling)
- ✅ **CRITICAL FIX**: PGN 130310 source-based routing:
  * Source 0: Sea temperature → temperature sensor (EXISTING)
  * Source 1-2: Outside/Inside air → **weather sensor** (NEW)
  * Source 3-15: Specific locations → temperature sensor with location mapping
- ✅ MDA/MMB processors with range validation and partial updates
- ✅ PGN 130310/130311 routing in PureStoreUpdater

### Calculations (Step 8)
- ✅ Dew point calculation (Magnus formula) in SensorInstance
- ✅ Auto-calculates after updateMetrics() processes temp + humidity
- ✅ Constants: a = 17.27, b = 237.7

### Widget Implementation (Steps 9-12)
- ✅ WeatherWidget component (corrected API - no TypeScript errors)
- ✅ Layout: 3 primary rows (pressure, airTemp, humidity) + 1 secondary (dewPoint)
- ✅ Widget registration in registerWidgets.ts
- ✅ Widget metadata in WidgetMetadataRegistry
- ✅ Auto-detection registration in builtInWidgetRegistrations.ts
  * Priority: 54, maxInstances: 5, expirationTimeout: 300000ms
  * Required: weather.pressure, Optional: airTemperature, humidity

---

## 🔲 Remaining Implementation (Steps 13-15)

### Step 13: NMEA Bridge MDA Generator

**File:** `server/nmea-bridge-simulator.js`

**Location:** After `generateDBKSentence()` (around line 900)

**Implementation:**
```javascript
/**
 * Generate MDA (Meteorological Composite) sentence
 * Full format with all 20 fields, but only populate atmospheric data
 */
generateMDASentence(atmosphericData) {
  const { pressure, temperature, humidity, dewPoint } = atmosphericData;
  
  // Convert Pascals to bars (1 bar = 100000 Pa)
  const pressureBars = pressure ? (pressure / 100000).toFixed(5) : '';
  const pressureInHg = pressure ? (pressure / 3386.39).toFixed(3) : '';
  
  // Temperature in Celsius
  const airTempC = temperature !== undefined ? temperature.toFixed(2) : '';
  
  // Humidity percentage
  const relHumid = humidity !== undefined ? Math.round(humidity) : '';
  
  // Dew point in Celsius
  const dewPointC = dewPoint !== undefined ? dewPoint.toFixed(2) : '';
  
  // MDA format: $IIMDA,<p_inHg>,I,<p_bars>,B,<air_temp>,C,<water_temp>,C,<rel_humid>,<abs_humid>,<dew_point>,C,<wind_dir_true>,T,<wind_dir_mag>,M,<wind_speed_kts>,N,<wind_speed_ms>,M
  // Leave water temp (field 7) and wind fields (13-20) empty - handled by other sentences
  const sentence = `$IIMDA,${pressureInHg},I,${pressureBars},B,${airTempC},C,,C,${relHumid},,${dewPointC},C,,T,,M,,N,,M`;
  
  return this.addChecksum(sentence);
}

/**
 * Generate MMB (Barometer) sentence
 * Simple pressure-only format
 */
generateMMBSentence(pressurePa) {
  // Convert Pascals to bars
  const pressureBars = (pressurePa / 100000).toFixed(5);
  const pressureInHg = (pressurePa / 3386.39).toFixed(3);
  
  // MMB format: $IIMMB,<p_bars>,B,<p_inHg>,I
  const sentence = `$IIMMB,${pressureBars},B,${pressureInHg},I`;
  
  return this.addChecksum(sentence);
}
```

**Integration Point:**
Look for sensor type switch statement in message generation loop. Add:
```javascript
case 'atmospheric_pressure_sensor':
  // Generate MDA if temperature/humidity available, otherwise MMB
  if (sensor.data_generation.temperature || sensor.data_generation.humidity) {
    const atmosphericData = {
      pressure: sensor.data_generation.pressure.value,
      temperature: sensor.data_generation.temperature?.value,
      humidity: sensor.data_generation.humidity?.value,
      dewPoint: sensor.data_generation.dew_point?.value,
    };
    sentences.push(this.generateMDASentence(atmosphericData));
  } else {
    sentences.push(this.generateMMBSentence(sensor.data_generation.pressure.value));
  }
  break;
```

---

### Step 14: NMEA 2000 Binary PGN 130311 Generator

**File:** `server/lib/nmea2000-binary.js`

**Location:** After `generatePGN_130310()` (find existing temperature PGN)

**Implementation:**
```javascript
/**
 * PGN 130311 - Environmental Parameters (Atmospheric)
 * 8 bytes: SID, Source, Temperature (0.01K), Humidity (0.004%), Pressure (1 hPa)
 */
function generatePGN_130311(data) {
  const buffer = Buffer.alloc(8);
  
  // Byte 0: SID (Sequence ID) - increment counter
  buffer.writeUInt8(data.sid || 0, 0);
  
  // Byte 1: Source (1 = outside air, 2 = inside air)
  buffer.writeUInt8(data.source || 1, 1);
  
  // Bytes 2-3: Temperature in 0.01 Kelvin (little-endian, unsigned 16-bit)
  if (data.temperature !== undefined) {
    const tempKelvin = (data.temperature + 273.15) * 100; // Celsius → 0.01K
    buffer.writeUInt16LE(Math.round(tempKelvin), 2);
  } else {
    buffer.writeUInt16LE(0xFFFF, 2); // Invalid marker
  }
  
  // Bytes 4-5: Humidity in 0.004% (little-endian, unsigned 16-bit)
  if (data.humidity !== undefined) {
    const humidityScaled = data.humidity / 0.004; // Percentage → 0.004% units
    buffer.writeUInt16LE(Math.round(humidityScaled), 4);
  } else {
    buffer.writeUInt16LE(0xFFFF, 4);
  }
  
  // Bytes 6-7: Pressure in 1 hPa (little-endian, unsigned 16-bit)
  // NOTE: 1 hPa = 100 Pa
  if (data.pressure !== undefined) {
    const pressureHPa = data.pressure / 100; // Pascals → hPa
    buffer.writeUInt16LE(Math.round(pressureHPa), 6);
  } else {
    buffer.writeUInt16LE(0xFFFF, 6);
  }
  
  return buffer;
}

module.exports = {
  // ... existing exports
  generatePGN_130311,
};
```

**Integration:** Update PGN generator switch case for atmospheric sensors in NMEA 2000 mode.

---

### Step 15: Update Coastal Sailing YAML Scenario

**File:** `marine-assets/test-scenarios/navigation/coastal-sailing.yml`

**Current State (lines 244-260):**
```yaml
- type: atmospheric_pressure_sensor
  instance: 0
  name: "Main Barometer"
  description: "Atmospheric pressure sensor"
  data_generation:
    pressure:
      base_value: 101300  # Pa (1013 hPa - standard atmosphere)
      variation_type: "slow_sine"
      variation_params:
        amplitude: 1000     # ±10 hPa variation
        period: 43200       # 12-hour cycle
      noise:
        type: "gaussian"
        stddev: 50         # 0.5 hPa noise
```

**Required Changes:**
```yaml
- type: atmospheric_pressure_sensor
  instance: 0
  name: "Main Weather Station"
  description: "Atmospheric pressure, temperature, and humidity sensor"
  data_generation:
    pressure:
      base_value: 101300  # Pa (1013 hPa - standard atmosphere)
      variation_type: "slow_sine"
      variation_params:
        amplitude: 1000     # ±10 hPa variation
        period: 43200       # 12-hour cycle (pressure systems)
      noise:
        type: "gaussian"
        stddev: 50         # 0.5 hPa noise
    
    # NEW: Air temperature
    temperature:
      base_value: 22.0    # °C (comfortable sailing weather)
      variation_type: "slow_sine"
      variation_params:
        amplitude: 5.0     # ±5°C daily variation
        period: 86400      # 24-hour cycle (day/night)
      noise:
        type: "gaussian"
        stddev: 0.5        # 0.5°C noise
    
    # NEW: Relative humidity
    humidity:
      base_value: 65.0    # % (moderate humidity)
      variation_type: "slow_sine"
      variation_params:
        amplitude: 15.0    # ±15% variation
        period: 86400      # 24-hour cycle (day/night inverse to temp)
        phase_shift: 180   # Peaks when temp is lowest (dawn)
      noise:
        type: "gaussian"
        stddev: 2.0        # 2% noise
    
    # OPTIONAL: Dew point (can be calculated from temp + humidity)
    # dew_point:
    #   base_value: 15.0  # °C
    #   variation_type: "slow_sine"
    #   variation_params:
    #     amplitude: 3.0
    #     period: 86400
```

**Testing Notes:**
- Pressure range validation: 90000-110000 Pa (900-1100 hPa) ✓
- Temperature range validation: -40 to 50°C ✓
- Humidity range validation: 0-100% ✓
- Phase shift on humidity creates realistic inverse correlation with temperature
- Dew point will auto-calculate if not provided (Magnus formula)

---

## Manual Testing Checklist

After completing Steps 13-15:

### NMEA 0183 Testing
- [ ] **MDA with all fields**: Pressure + temp + humidity → full widget display
- [ ] **MDA with partial fields**: Pressure only → temp/humidity show "---"
- [ ] **MMB sentence**: Pressure only → minimal display
- [ ] **Empty field handling**: Missing MDA field 9 (humidity) → graceful null

### NMEA 2000 Testing
- [ ] **PGN 130310 source=0**: Sea temp → temperature sensor (existing behavior)
- [ ] **PGN 130310 source=1**: Air temp → weather sensor (NEW routing)
- [ ] **PGN 130310 with humidity/pressure**: All fields extracted
- [ ] **PGN 130311**: Dedicated atmospheric → weather sensor
- [ ] **0xFFFF invalid markers**: Field-by-field validation (allow partial updates)

### Widget Testing
- [ ] **Auto-creation**: Pressure data appears → weather widget auto-created
- [ ] **Multi-instance**: Multiple weather stations (instances 0-4)
- [ ] **Staleness**: >5 minutes without update → warning state
- [ ] **Alarm thresholds**: Pressure <97000 Pa → warning, <95000 Pa → critical
- [ ] **Dew point calculation**: Temp + humidity present → dew point computed

### Range Validation
- [ ] **Pressure out of range**: 80000 Pa rejected (below 90000 Pa min)
- [ ] **Temperature out of range**: 60°C rejected (above 50°C max)
- [ ] **Humidity out of range**: 120% rejected (above 100% max)

### Logging Verification
```javascript
// In browser console:
enableLog('nmea.weather')     // MDA/MMB/PGN processing
enableLog('widget.weather')   // Widget rendering
listEnabledLogs()             // Verify categories active
```

---

## Architecture Summary

### Data Flow
```
NMEA Network (MDA/MMB/PGN) 
  → Parser (fields extraction, bars → Pa conversion)
  → Processor (range validation, partial updates allowed)
  → Store Update (weather sensor instance 0)
  → SensorInstance (dew point calculation, history tracking)
  → MetricValue enrichment (SI → display units, formatting)
  → WeatherWidget (pre-enriched formattedValue display)
```

### Key Design Decisions
1. **Weather = Separate Sensor Type**: Not temperature, not wind - dedicated weather station device
2. **PGN 130310 Source Routing**: Source field determines destination (temperature vs weather sensor)
3. **Partial Updates**: Pressure OR temp OR humidity can be null (graceful handling)
4. **5-Minute Staleness**: Atmospheric data changes slowly (vs 5s for navigation sensors)
5. **Dew Point Auto-Calculation**: Magnus formula if hardware doesn't provide it
6. **Multi-Instance Support**: Up to 5 weather stations (consistent with other sensors)

### Breaking Change Impact
**PGN 130310 Source-Based Routing** is a breaking fix:
- **Before**: All PGN 130310 → temperature sensor with hardcoded location: 'seawater'
- **After**: Source field routing (0=sea temp, 1-2=weather, 3+=specific locations)
- **Impact**: Boats with outside air temperature sensors will NOW correctly route to weather sensor
- **Backward Compatibility**: Sea water temperature (source=0) maintains existing behavior

---

## Commit Strategy

Remaining commits:
```bash
# Step 13: Bridge MDA/MMB generators
git commit -m "feat(weather): Add NMEA 0183 MDA/MMB sentence generators to bridge

- generateMDASentence(): Full 20-field format (pressure, temp, humidity, dew point)
- generateMMBSentence(): Simple barometric pressure only
- Integration: atmospheric_pressure_sensor type handling
- Conversion: Pascals → bars (× 100000), Pascals → inHg (× 3386.39)
- Field handling: Empty fields for water temp (MTW), wind data (MWV)"

# Step 14: Bridge PGN 130311 generator
git commit -m "feat(weather): Add NMEA 2000 PGN 130311 binary generator

- generatePGN_130311(): 8-byte atmospheric data frame
- Scaling: Temperature 0.01K, Humidity 0.004%, Pressure 1 hPa (100 Pa)
- Invalid markers: 0xFFFF for optional fields
- Integration: atmospheric sensor PGN generation in NMEA 2000 mode"

# Step 15: YAML scenario update
git commit -m "feat(weather): Add atmospheric data to coastal-sailing test scenario

- Added temperature generation (22°C base, ±5°C daily cycle)
- Added humidity generation (65% base, ±15% with phase shift)
- Realistic correlations: Humidity peaks at dawn (inverse to temp)
- Pressure unchanged (existing 1013 hPa with slow sine variation)
- Dew point auto-calculates from temp + humidity (Magnus formula)
- Validates all range checks: pressure 900-1100 hPa, temp -40 to 50°C, humidity 0-100%"
```

---

## Success Criteria

**Feature is complete when:**
1. ✅ All TypeScript compilation errors resolved
2. ✅ Widget auto-creates when MDA/MMB/PGN data appears
3. ✅ All 14 manual test cases pass
4. ✅ Logging shows correct sensor routing (check `nmea.weather` logs)
5. ✅ Multi-instance weather stations work (0-4)
6. ✅ Dew point auto-calculates correctly
7. ✅ Staleness warning after 5 minutes
8. ✅ Alarm thresholds trigger at configured levels

**Estimated Remaining Time:** 1-2 hours for Steps 13-15 + testing

---

## Files Modified Summary

**Total: 16 files** (11 TypeScript, 3 JavaScript, 2 YAML)

### TypeScript (Application)
1. `src/utils/logging/logger.ts` - Added nmea.weather, widget.weather
2. `src/presentation/categories.ts` - Added percentage category
3. `src/presentation/presentations.ts` - Added PERCENTAGE_PRESENTATIONS
4. `src/types/SensorData.ts` - Added WeatherSensorData, extended SensorType
5. `src/registry/SensorConfigRegistry.ts` - Added weather sensor config
6. `src/services/nmea/parsing/PureNmeaParser.ts` - Added parseMDAFields, parseMMBFields
7. `src/services/nmea/pgnParser.ts` - Extended parseTemperaturePgn, added parseEnvironmentalPgn
8. `src/services/nmea/data/NmeaSensorProcessor.ts` - Added processMDA, processMMB
9. `src/services/nmea/data/PureStoreUpdater.ts` - Modified PGN 130310 routing, added 130311
10. `src/types/SensorInstance.ts` - Added _calculateDewPoint method
11. `src/widgets/WeatherWidget.tsx` - NEW FILE (weather widget component)
12. `src/widgets/registerWidgets.ts` - Added WeatherWidget registration
13. `src/registry/WidgetMetadataRegistry.ts` - Added weather metadata
14. `src/config/builtInWidgetRegistrations.ts` - Added WEATHER_WIDGET_REGISTRATION

### JavaScript (Simulator) - REMAINING
15. `server/nmea-bridge-simulator.js` - Need: generateMDASentence, generateMMBSentence
16. `server/lib/nmea2000-binary.js` - Need: generatePGN_130311

### YAML (Test Data) - REMAINING
17. `marine-assets/test-scenarios/navigation/coastal-sailing.yml` - Need: temp + humidity data

---

**End of Implementation Guide**
