# Metric Key Validation Report
**Date:** January 14, 2026  
**Branch:** refactor/unified-sensor-schema  
**Status:** ✅ ALL RESOLVED

## Summary

Validated all `metricKey` references in static widget definitions against the unified sensor schema in `sensorSchemas.ts`. All errors have been fixed.

## Final Validation Results

### ✅ All Errors Fixed

**3 errors found and resolved:**

1. **✅ FIXED: AutopilotWidget.tsx**
   - **Issue:** Referenced `autopilot.headingSource` which didn't exist
   - **Resolution:** Removed the invalid SecondaryMetricCell, changed template from `2Rx2C-SEP-2Rx2C-WIDE` to `2Rx2C-SEP-1Rx2C`
   - **Commit:** Updated AutopilotWidget to only show `mode` in secondary section

2. **✅ FIXED: GPSWidget.tsx - utcDate**
   - **Issue:** Referenced `gps.utcDate` which didn't exist
   - **Resolution:** Added `utcDate` field to GPS schema (type: number, unitType: date)
   - **Commit:** Added utcDate field to GPS sensor schema

3. **✅ FIXED: GPSWidget.tsx - utcTime**
   - **Issue:** Referenced `gps.utcTime` which didn't exist  
   - **Resolution:** Added `utcTime` field to GPS schema (type: number, unitType: time)
   - **Commit:** Added utcTime field to GPS sensor schema

### ⚠️ Warnings: 1

- **CustomWidget.tsx** uses dynamic metricKey values - cannot validate statically
  - Dynamic widgets pull metricKey from configuration at runtime
  - Validation must happen at runtime when configurations are loaded

## Complete Sensor Schema Fields (After Fixes)

```
autopilot: name, engaged, active, mode, targetHeading, actualHeading, rudderAngle
battery: name, chemistry, instance, capacity, voltage, nominalVoltage, current, temperature, stateOfCharge
depth: name, depth, depthSource, depthReferencePoint
engine: name, engineType, maxRpm, rpm, coolantTemp, oilPressure, fuelRate, engineHours, alternatorVoltage, boostPressure, coolantPressure, throttlePosition, trim
gps: name, latitude, longitude, speedOverGround, courseOverGround, fixType, satellites, hdop, utcTime, utcDate ✨ NEW
heading: name, magnetic, true, variation, deviation, rateOfTurn
log: name, tripDistance, totalDistance
position: name, latitude, longitude, bearingToWaypoint, distanceToWaypoint, crossTrackError, velocityMadeGood
speed: name, throughWater, overGround, tripDistance, totalDistance
tank: name, type, level, capacity
temperature: name, location, temperature
weather: name, pressure, airTemperature, humidity, dewPoint
wind: name, speed, direction, trueSpeed, trueDirection
```

## Widgets Validated (All Passing)

- ✅ AutopilotWidget.tsx - FIXED (removed invalid headingSource)
- ✅ BatteryWidget.tsx
- ✅ CompassWidget.tsx (heading sensor)
- ✅ DepthWidget.tsx
- ✅ EngineWidget.tsx
- ✅ GPSWidget.tsx - FIXED (added utcTime/utcDate to schema)
- ✅ NavigationWidget.tsx (position sensor)
- ✅ RudderWidget.tsx (autopilot sensor)
- ✅ SpeedWidget.tsx
- ✅ TanksWidget.tsx
- ✅ TemperatureWidget.tsx
- ✅ WeatherWidget.tsx
- ✅ WindWidget.tsx
- ⚠️ CustomWidget.tsx - Dynamic references (runtime validation needed)

## Changes Made

### 1. GPS Schema Enhancement
**File:** `src/registry/sensorSchemas.ts`

Added two missing fields to GPS sensor schema:
```typescript
utcTime: { 
  type: 'number' as const, 
  label: 'UTC Time', 
  mnemonic: 'TIME', 
  unitType: 'time' as const, 
  iostate: 'readOnly' as const, 
  helpText: 'UTC time as Unix timestamp (formatted as HH:MM:SS in widget)' 
},
utcDate: { 
  type: 'number' as const, 
  label: 'UTC Date', 
  mnemonic: 'DATE', 
  unitType: 'date' as const, 
  iostate: 'readOnly' as const, 
  helpText: 'UTC date as Unix timestamp (formatted as YYYY-MM-DD in widget)' 
},
```

**Rationale:** These fields are populated by NMEA parser (GGA/RMC sentences) and displayed in GPSWidget. They store Unix timestamps that are formatted as time/date strings by MetricValue enrichment.

### 2. AutopilotWidget Cleanup
**File:** `src/widgets/AutopilotWidget.tsx`

- Removed invalid `headingSource` metric reference (doesn't exist in NMEA data)
- Changed template from `2Rx2C-SEP-2Rx2C-WIDE` to `2Rx2C-SEP-1Rx2C` (single secondary row)
- Kept only `mode` in secondary section

**Rationale:** `headingSource` field doesn't exist in autopilot schema and isn't provided by NMEA autopilot data. The field was likely a placeholder that was never implemented.

## Next Steps (Recommendations)

## Next Steps (Recommendations)

### High Priority - Runtime Validation

3. **Add Runtime Validation**: Implement validation for CustomWidget configurations
   - Validate metricKey exists in sensor schema when loading widget config
   - Log warning if invalid metricKey detected
   - Gracefully handle missing metrics without crashing
   - Example:
   ```typescript
   const validateMetricKey = (sensorType: string, metricKey: string): boolean => {
     const schema = getSensorSchema(sensorType);
     if (!schema) {
       console.warn(`Unknown sensor type: ${sensorType}`);
       return false;
     }
     const baseMetric = metricKey.replace(/\.(min|max|avg)$/, '');
     if (!schema.fields[baseMetric]) {
       console.warn(`Invalid metricKey: ${sensorType}.${metricKey}`);
       return false;
     }
     return true;
   };
   ```

### Medium Priority - CI/CD Integration

4. **Add to Pre-Commit Hook**: Run validation before allowing commits
   ```bash
   #!/bin/sh
   cd boatingInstrumentsApp && python3 validate_metric_keys.py
   if [ $? -ne 0 ]; then
     echo "❌ Metric key validation failed!"
     exit 1
   fi
   ```

5. **Add to GitHub Actions**: Run validation in CI pipeline
   ```yaml
   - name: Validate Metric Keys
     run: |
       cd boatingInstrumentsApp
       python3 validate_metric_keys.py
   ```

## Validation Script

The validation script `validate_metric_keys.py` can be run anytime to verify schema alignment:

```bash
cd boatingInstrumentsApp
python3 validate_metric_keys.py
```

This script should be added to CI/CD pipeline to catch schema mismatches early.
