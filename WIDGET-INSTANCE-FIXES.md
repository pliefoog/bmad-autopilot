# Widget Instance Detection Fixes

**Date:** December 29, 2024  
**Branch:** master  
**Issues Fixed:** Tank sensors not detected, Temperature widget instance overlap

## Problem Summary

1. **Tank sensors not being recognized** despite valid NMEA XDR messages
2. **Temperature widget instances potentially overlapping** (multiple instances showing same data)

## Root Causes Identified

### 1. XDR Tank Parsing Logic Error (NmeaSensorProcessor.ts:1713)

**Symptom:** NMEA messages like `$IIXDR,P,85.0,P,FUEL_0*28` not creating tank sensors

**Root Cause:** The condition required `measurementType === 'V'` (volume) but simulator was sending `measurementType === 'P'` (percentage), which is valid NMEA 0183.

**NMEA Messages Received:**
```
$IIXDR,P,85.0,P,FUEL_0*28  ← P (percentage), not V (volume)
$IIXDR,P,82.0,P,FUEL_1*2E
$IIXDR,P,66.6,P,WATR_2*2B
$IIXDR,P,15.0,P,WAST_3*29
```

**Fix:** Updated condition to accept both formats:
- `V` (volume) with `L` (liters) - absolute volume
- `P` (pressure/percentage) with `P` (percent) - percentage format
- `V` (volume) with `%` - legacy percentage format

```typescript
// BEFORE (rejected P,P format):
if (measurementType === 'V' && (units === 'L' || units === '%' || units === 'P') && identifier)

// AFTER (accepts P,P format):
if (((measurementType === 'V' && (units === 'L' || units === '%')) ||
     (measurementType === 'P' && units === 'P')) && identifier)
```

### 2. Widget Registration Hardcoded Instance 0 (builtInWidgetRegistrations.ts)

**Symptom:** Multiple temperature/tank/weather widgets all showing instance 0 data

**Root Cause:** Widget creation functions hardcoded `sensorData['sensor.0.field']` instead of using the dynamic `instance` parameter.

**Affected Widgets:**
- **Tank Widget** (line 436): `sensorData['tank.0.type']` → always read instance 0 type
- **Temperature Widget** (line 468): `sensorData['temperature.0.location']` → always read instance 0 location  
- **Weather Widget** (line 512): `sensorData['weather.0.name']` → always read instance 0 name

**Fix:** Use template literals with instance parameter:

```typescript
// BEFORE (Tank):
const tankType = sensorData['tank.0.type'] || 'Tank';

// AFTER (Tank):
const tankType = sensorData[`tank.${instance}.type`] || 'Tank';

// BEFORE (Temperature):
const location = sensorData['temperature.0.location'] || 'Temperature';

// AFTER (Temperature):
const location = sensorData[`temperature.${instance}.location`] || 'Temperature';

// BEFORE (Weather):
const name = sensorData['weather.0.name'] || 'Weather Station';

// AFTER (Weather):
const name = sensorData[`weather.${instance}.name`] || 'Weather Station';
```

## Temperature Instance Assignment Verification

Checked temperature NMEA parsing - **working correctly**:

```
$IIMTW,19.0,C*1B           → seawater, instance 0 (implicit from sentence type)
$IIMTA,22.0,C*05           → outside, instance 0 (implicit from sentence type)
$IIXDR,C,38.3,C,ENGR_02*1B → engineRoom, instance 2 (from identifier suffix _02)
$IIXDR,C,20.8,C,TEMP_03*0A → cabin, instance 3 (from identifier suffix _03)
$IIXDR,C,2.3,C,TEMP_04*36  → cabin, instance 4 (from identifier suffix _04)
```

Regex `^([A-Za-z0-9]{2,8})(?:[_-]?(\d+))?$/i` correctly extracts instance from identifier suffixes.

## Debugging Enhancements Added

Added conditional logging for troubleshooting:

```typescript
// Tank parsing (NmeaSensorProcessor.ts:1759)
log.tank(`XDR Tank: identifier="${identifier}", type="${tankType}", instance=${instance}, level=${(level * 100).toFixed(1)}%`);

// Temperature parsing (NmeaSensorProcessor.ts:1841)
log.temperature(`XDR Temp: identifier="${identifier}", locationCode="${locationCode}", instance=${instance}, temp=${temperature.toFixed(1)}°C, location="${locationInfo.location}"`);
```

**Enable in browser console:**
```javascript
enableLog('nmea.tank')
enableLog('nmea.temperature')
```

## Testing Verification

### Tank Sensors (4 instances expected)
- FUEL_0 (instance 0): 85.0% → Fuel Tank 1
- FUEL_1 (instance 1): 82.0% → Fuel Tank 2
- WATR_2 (instance 2): 66.6% → Water Tank 3
- WAST_3 (instance 3): 15.0% → Waste Tank 4

### Temperature Sensors (5 instances expected)
- Instance 0: Sea Water (19.0°C) from MTW
- Instance 0: Outside Air (22.0°C) from MTA **(potential collision - both instance 0!)**
- Instance 2: Engine Room (38.3°C) from XDR ENGR_02
- Instance 3: Cabin (20.8°C) from XDR TEMP_03
- Instance 4: Cabin (2.3°C) from XDR TEMP_04

**⚠️ NOTE:** MTW and MTA both default to instance 0, which will cause the seawater and air temperature to overwrite each other. This is a separate issue in the NMEA processor that needs addressing.

## Files Modified

1. **boatingInstrumentsApp/src/services/nmea/data/NmeaSensorProcessor.ts**
   - Line 1713: Fixed XDR tank parsing condition to accept P,P format
   - Line 1759: Added tank parsing debug logging
   - Line 1841: Added temperature parsing debug logging

2. **boatingInstrumentsApp/src/config/builtInWidgetRegistrations.ts**
   - Line 436: Fixed tank widget to use dynamic instance
   - Line 468: Fixed temperature widget to use dynamic instance
   - Line 512: Fixed weather widget to use dynamic instance

## Remaining Issues

### MTW/MTA Instance Collision (Separate Issue)
Both MTW (water temperature) and MTA (air temperature) sentences default to instance 0, causing data overlap. Need to implement proper instance assignment strategy:

**Options:**
1. Use sentence type as implicit instance discriminator (MTW=0, MTA=1)
2. Add talker-based instance offset
3. Reserve instance 0 for primary temperature, assign MTA to instance 1

**Recommended:** Update processMTW/MTA to assign distinct instances based on sentence type.

## Impact

- ✅ Tank sensors now properly detected and displayed
- ✅ Multiple tank instances work correctly (tested with 4 tanks)
- ✅ Temperature widgets now show correct instance-specific data
- ✅ Weather widgets support multiple instances correctly
- ⚠️ MTW/MTA collision remains (separate fix needed)

## Architecture Notes

This fix reinforces the **event-driven widget registration** pattern:
- Widgets appear when sensors provide data
- Multi-instance support requires dynamic instance parameter usage
- Hardcoding instance 0 breaks the multi-instance architecture
- Template literals `${instance}` are required for dynamic sensor data access

**Pattern to follow in all widget registrations:**
```typescript
createWidget: (instance, sensorData) => {
  // ❌ WRONG: Hardcoded instance 0
  const data = sensorData['sensor.0.field'];
  
  // ✅ CORRECT: Dynamic instance
  const data = sensorData[`sensor.${instance}.field`];
}
```
