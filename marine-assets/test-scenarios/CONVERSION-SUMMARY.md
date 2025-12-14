# Sensor-Based Conversion - Completed Summary

## Status: IN PROGRESS

**Date:** December 14, 2025  
**Converted:** 2 of 31 files  
**Schema Update:** PENDING

---

## ✅ COMPLETED CONVERSIONS

### 1. coastal-sailing.yml (DONE)
- **Status:** ✅ Converted to sensor-based
- **Architecture:** Full sensor-based with 10+ sensors
- **Supports:** NMEA 0183, NMEA 2000, Hybrid
- **Data:** Depth, STW/SOG speeds, wind, GPS track, heading, water temp, engine, batteries (2x), tanks (4x), rudder
- **VS Code Task:** Updated ✅

### 2. basic-navigation.yml (DONE)
- **Status:** ✅ Converted to sensor-based
- **Architecture:** Simple sensor-based (4 sensors)
- **Supports:** NMEA 0183, NMEA 2000, Hybrid
- **Data:** Depth, speed, wind, GPS
- **VS Code Task:** Updated ✅

---

## 🔄 SCHEMA UPDATE REQUIRED

**Current Schema Status:**
- ❌ Still allows old `data:` property
- ❌ Doesn't define `sensors:` property
- ❌ No validation for sensor-based format

**Required Schema Changes:**
1. Add `sensors` array property definition
2. Define sensor type registry in schema
3. Add physical_properties validation
4. Add data_generation validation
5. Eventually deprecate `data:` property
6. Make `bridge_mode` a top-level property

**Recommendation:**
- Convert all files FIRST
- Test thoroughly with existing schema (permissive)
- Then update schema to enforce sensor-based format
- This prevents breaking scenarios during transition

---

## 📋 REMAINING FILES (29 total)

### HIGH PRIORITY - VS Code Tasks (7 files)
```
❌ navigation/deep-water-passage.yml
❌ autopilot/autopilot-engagement.yml  
❌ engine/basic-engine-monitoring-with-variation.yml
❌ engine/dual-engine-monitoring-with-variation.yml
❌ battery/battery-drain-scenario.yml
❌ tank/multi-tank-system.yml
❌ temperature/multi-temperature-monitoring.yml
```

### MEDIUM PRIORITY (15 files)
```
❌ wind/vwr-vwt-wind-test.yml
❌ multi-instance/multi-equipment-detection.yml
❌ navigation/basic-navigation-dev.yml
❌ navigation/comprehensive-navigation.yml
❌ navigation/comprehensive-navigation-nmea2000.yml
❌ autopilot/autopilot-engagement-cycle.yml
❌ autopilot/autopilot-failure-recovery.yml
❌ autopilot/autopilot-tack-sequence.yml
❌ nmea2000/battery-pgn-127508.yml
❌ nmea2000/engine-pgn-127488.yml
❌ nmea2000/mixed-protocol-test.yml
❌ nmea2000/tank-pgn-127505.yml
❌ environmental/shallow-water-alarm.yml
❌ autopilot/autopilot-full-nmea0183-test.yml (may already be converted)
❌ recorded/real-world-sailing.yml
```

### LOW PRIORITY (7 files)
```
❌ performance/high-frequency-data.yml
❌ performance/high-frequency-stress-test.yml
❌ performance/malformed-data-stress.yml
❌ performance/multi-protocol-scenario.yml
❌ physics/j35-upwind-sailing.yml
❌ physics/j35-coastal-sailing.yml
❌ physics/motor-yacht-cruise.yml
❌ physics/multi-vessel-comparison.yml
❌ recorded/synthetic-enhancement.yml
```

---

## CONVERSION APPROACH

### Per-File Process:
1. **Backup:** Create `-BACKUP.yml` copy
2. **Convert:** Transform to sensor-based architecture
3. **Test NMEA 0183:** Verify output matches original
4. **Test NMEA 2000:** Verify PGNs generate correctly
5. **Update Tasks:** If referenced in VS Code tasks

### Sensor Mapping Pattern:
```yaml
OLD: data.depth → NEW: depth_sensor with data_generation.depth
OLD: data.speed → NEW: speed_sensor with data_generation.speed  
OLD: data.wind → NEW: wind_sensor with data_generation.wind_speed/wind_angle
OLD: data.gps → NEW: gps_sensor with data_generation.position
OLD: data.engine → NEW: engine_sensor with data_generation.rpm/temp/pressure
OLD: data.battery → NEW: battery_sensor with data_generation.voltage/current
OLD: data.tank → NEW: tank_sensor with data_generation.level
OLD: nmea_sentences → NEW: sensors (implicit from sensor types)
```

### Required Parameters Template:
```yaml
parameters:
  vessel:
    keel_offset: 1.8
  sonar:
    max_range: 100.0
  gps:
    quality: 1
    satellites: 8
    hdop: 1.0
  compass:
    magnetic_deviation: 0.0
    magnetic_variation: -15.0
  autopilot:
    max_heading_rate: 10
    cross_track_tolerance: 0.1
    arrival_radius: 0.2
```

---

## NEXT ACTIONS

**Immediate:**
1. ✅ Complete batch conversion of HIGH PRIORITY files (7 remaining)
2. ⏳ Test each converted file with NMEA bridge
3. ⏳ Update schema to support `sensors:` property
4. ⏳ Update schema documentation with examples

**Short-term:**
1. Convert MEDIUM PRIORITY files
2. Update schema to make `sensors:` preferred
3. Add migration guide to documentation
4. Deprecation warnings for `data:` usage

**Long-term:**
1. Convert LOW PRIORITY files
2. Make `sensors:` REQUIRED in schema
3. Remove `data:` support entirely
4. Clean up all BACKUP/DEPRECATED files

---

## TESTING STRATEGY

### Validation Per File:
```bash
# Test NMEA 0183 (default)
node server/nmea-bridge.js --scenario <file>.yml --loop

# Test NMEA 2000
node server/nmea-bridge.js --scenario <file>.yml --bridge-mode nmea2000 --loop

# Test Hybrid
node server/nmea-bridge.js --scenario <file>.yml --bridge-mode hybrid --loop
```

### Verification Checklist:
- [ ] Same message count as original (NMEA 0183 mode)
- [ ] Data patterns match (sine wave, gaussian, etc.)
- [ ] Update rates correct (frequency → update_rate)
- [ ] Physical properties map correctly
- [ ] NMEA 2000 PGNs generate when bridge_mode=nmea2000
- [ ] VS Code tasks work with new files

---

## NOTES

- All old files preserved with `-BACKUP.yml` or `-DEPRECATED.yml` suffix
- Sensor-based files are backward compatible (default to NMEA 0183)
- Schema remains permissive during migration
- Can switch between protocols without changing YAML
- Binary PGNs (NMEA 2000) require sensor-based format

**DO NOT delete old files until all conversions tested and validated!**
