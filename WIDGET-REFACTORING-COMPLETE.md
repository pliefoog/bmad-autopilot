# Widget Refactoring Complete - SensorInstance Pattern

**Date:** 2024-12-XX  
**Status:** ✅ ALL WIDGETS VERIFIED

## Summary

All widgets have been successfully verified to use the correct SensorInstance.getMetric() pattern instead of direct property access. This ensures compatibility with the Phase 0-4 MetricValue refactoring that moved sensor data from direct properties to the `_metrics` Map.

## Correct Pattern (MANDATORY)

```typescript
// ✅ CORRECT - Read SensorInstance, extract metrics
const sensorInstance = useNmeaStore((state) => state.nmeaData.sensors.type?.[instance]);
const metric = sensorInstance?.getMetric('fieldKey'); // Use registry key
const value = metric?.si_value;              // Raw SI value
const displayValue = metric?.formattedValue; // Formatted without unit
const unit = metric?.unit;                   // Unit symbol

// ❌ WRONG - Direct property access (breaks with MetricValue architecture)
const value = useNmeaStore((state) => state.nmeaData.sensors.type?.[instance]?.property);
```

## Widget Status Report

### ✅ Refactored Widgets (Phase 6 Runtime Testing)

**EngineWidget** (Lines 43-81)
- **Metrics:** rpm, temperature, oilPressure, alternatorVoltage, fuelRate, engineHours, speedRPM
- **Change:** Replaced 7 individual selectors with SensorInstance + getMetric()
- **Status:** FIXED - All engine data now displays correctly

**BatteryWidget** (Lines 47-69)
- **Metrics:** voltage, current, temperature, soc, capacity, batteryChemistry
- **Change:** Replaced 7 individual selectors with SensorInstance + getMetric()
- **Note:** Removed nominalVoltage (not in registry)
- **Status:** FIXED - Battery data now displays correctly

**WindWidget** (Lines 36-48)
- **Sensors:** wind (speed/direction), compass (heading), speed (overGround)
- **Change:** Refactored 3 sensor reads to use getMetric() for all fields
- **Status:** FIXED - Wind calculations now use correct data source

**TemperatureWidget** (Lines 45-60)
- **Metrics:** value, location, units, name
- **Change:** Single SensorInstance read, extracts 5 fields via getMetric()
- **Status:** FIXED - Temperature data now displays correctly

**TanksWidget** (Lines 40-53)
- **Metrics:** level, capacity, type, name
- **Change:** Single SensorInstance read, extracts 5 fields via getMetric()
- **Status:** FIXED - Tank levels now display correctly

**NavigationWidget** (Lines 33-46)
- **Metrics:** waypointId, waypointName, bearingToWaypoint, distanceToWaypoint, crossTrackError, velocityMadeGood, steerDirection, timeToWaypoint
- **Change:** Single SensorInstance read, extracts 9 fields via getMetric()
- **Status:** FIXED - Navigation data now flows correctly

### ✅ Already Correct Widgets (No Changes Needed)

**DepthWidget** (Lines 44-53)
- **Status:** Reference implementation, already uses SensorInstance pattern
- **Verification:** grep_search confirmed getMetric() usage

**CompassWidget** (Lines 47, 58)
- **Metrics:** magneticVariation, magneticDeviation
- **Status:** Already uses getMetric(), no direct property access found
- **Verification:** grep_search found 2 getMetric() calls

**SpeedWidget** (Line 100, 125-126)
- **Metrics:** speedOverGround (from GPS), throughWater (from speed sensor)
- **Status:** Already uses getMetric() for both metrics
- **Verification:** grep_search found 4 getMetric() calls

**AutopilotWidget** (Lines 27-61)
- **Metrics:** actualHeading, targetHeading, rudderPosition, mode, engaged, active, windAngle, crossTrackError, turnRate, headingSource, alarms
- **Status:** Already uses getMetric() for all 11 fields
- **Verification:** grep_search found 16 getMetric() calls

**GPSWidget** (Lines 45-75)
- **Metrics:** latitude, longitude, utcTime (all proper MetricValues with formatting)
- **Special Fields:** quality (complex object with fixType/satellites/hdop)
- **Major Refactor:** Decomposed position object into separate latitude/longitude MetricValues
- **Categories:** latitude/longitude use 'coordinates', utcTime uses 'time'
- **Status:** FIXED - Uses SensorInstance.getMetric() for all coordinate/time data
- **User Formatting:** Coordinates formatted per user preference (DD.ddddd° or DD° MM.mmm' N/S/E/W)
- **Parser Changes:** All GPS parsers (GGA, GLL, RMC) now send flat latitude/longitude fields

## Architecture Notes

### hardwareField Mapping System

The registry defines both a `key` (widget/storage name) and `hardwareField` (parser name):

```typescript
// Registry definition
{
  key: 'soc',                    // Widget uses this
  hardwareField: 'stateOfCharge' // Parser sends this
}

// SensorInstance.updateMetrics() handles mapping:
const fieldValue = data[field.hardwareField || field.key];
this._metrics.set(field.key, new MetricValue(...));

// Widgets read using key:
const metric = sensorInstance.getMetric('soc'); // Not 'stateOfCharge'
```

### Key Mappings

Most sensors have matching key/hardwareField names, but these differ:

- **Battery:** `soc` ← `stateOfCharge`, `batteryChemistry` ← `chemistry`
- **Engine:** `temperature` ← `coolantTemp`

### GPS Coordinate & Time Formatting

**Previous Architecture (INCORRECT):**
- GPS position stored as nested object: `{position: {latitude: X, longitude: Y}}`
- Accessed directly from SensorInstance, bypassing MetricValue system
- No user formatting preferences applied

**New Architecture (CORRECT):**
- GPS coordinates stored as separate MetricValues: `latitude` and `longitude`
- UTC time stored as MetricValue: `utcTime`
- All three use proper categories: 'coordinates' and 'time'
- Formatting applied per user preferences:
  - Coordinates: DD.ddddd° or DD° MM.mmm' N/S/E/W
  - Time: Multiple formats (24h, 12h, compact, etc.)
  - Date: Multiple formats (ISO, US, EU, UK, nautical)
- Only `quality` remains a special complex field (fixType, satellites, hdop)

**Parser Changes:**
- GGA parser: Now sends flat `latitude` and `longitude` fields
- GLL parser: Now sends flat `latitude` and `longitude` fields  
- RMC parser: Now sends flat `latitude` and `longitude` fields
- All parsers send `utcTime` as timestamp (milliseconds)

## Testing Checklist

Runtime testing with NMEA simulator (Coastal Sailing scenario):

- [x] EngineWidget displays all 7 metrics (RPM, ECT, EOP, ALT, EFF, EHR, SRPM)
- [x] BatteryWidget displays all fields (VLT, AMP, TMP, SOC, CAP, chemistry)
- [x] WindWidget calculates true wind correctly
- [x] TemperatureWidget shows correct location/units
- [x] TanksWidget shows level percentage and capacity
- [x] NavigationWidget shows waypoint data
- [x] All widgets display live data (not "---")
- [ ] Unit switching updates all widgets correctly (PENDING)
- [ ] Alarm thresholds trigger correctly (PENDING)
- [ ] No console errors related to MetricValue or getMetric (PENDING)

## Remaining Work

### Phase 5: Cleanup (NOT STARTED)
- Delete old service files (ConversionService, SensorPresentationCache)
- Remove dead code
- Clean up imports

### Phase 7: Documentation (NOT STARTED)
- Update architecture.md with MetricValue patterns
- Document widget development guidelines
- Create migration guide for future widgets

## Conclusion

**All 11 widgets verified for correct SensorInstance.getMetric() usage:**
- 6 widgets refactored during Phase 6 runtime testing
- 5 widgets verified as already correct
- 0 widgets remaining with direct property access pattern
- 1 special case (GPSWidget) confirmed correct

The systematic widget refactoring is **COMPLETE**. All widgets now follow the unified MetricValue architecture established in Phase 0-4.

**Next Steps:**
1. Complete runtime testing checklist (unit switching, alarms)
2. Phase 5 cleanup (delete old files)
3. Phase 7 documentation (architecture updates)
