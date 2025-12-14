# Sensor-Based Architecture Conversion Status

## Overview
Converting all NMEA simulator YAML files from sentence-based/data-based architecture to sensor-based architecture for protocol-agnostic design (supports NMEA 0183, NMEA 2000, and hybrid modes).

## Architecture Change

### OLD (Sentence-Based):
```yaml
data:
  depth:
    type: "sine_wave"
nmea_sentences:
  - type: "DPT"
```

### NEW (Sensor-Based):
```yaml
sensors:
  - type: depth_sensor
    data_generation:
      depth:
        type: "sine_wave"
```
Benefits: Same YAML generates NMEA 0183 OR NMEA 2000 based on `bridge_mode` setting.

---

## Conversion Status

### ✅ CONVERTED (2 files)
1. **coastal-sailing.yml** - Primary comprehensive scenario (DONE)
2. **basic-navigation.yml** - Basic navigation scenario (DONE)

### 🔄 ALREADY SENSOR-BASED (2 files)
1. **binary-test-simple.yml** - Already uses sensors
2. **autopilot-full-nmea0183-test.yml** - Already converted

### ⏳ HIGH PRIORITY - Used in VS Code Tasks (9 files)

**Navigation:**
3. ❌ `navigation/deep-water-passage.yml`

**Autopilot:**
4. ❌ `autopilot/autopilot-engagement.yml`

**Engine:**
5. ❌ `engine/basic-engine-monitoring-with-variation.yml` 
6. ❌ `engine/dual-engine-monitoring-with-variation.yml`

**Battery:**
7. ❌ `battery/battery-drain-scenario.yml`

**Tank:**
8. ❌ `tank/multi-tank-system.yml`

**Temperature:**
9. ❌ `temperature/multi-temperature-monitoring.yml`

**Wind:**
10. ❌ `wind/vwr-vwt-wind-test.yml`

**Multi-Instance:**
11. ❌ `multi-instance/multi-equipment-detection.yml`

---

### 📋 MEDIUM PRIORITY - Test/Development Files (10 files)

**Navigation:**
- `navigation/basic-navigation-dev.yml`
- `navigation/comprehensive-navigation.yml`
- `navigation/comprehensive-navigation-nmea2000.yml`

**Autopilot:**
- `autopilot/autopilot-engagement-cycle.yml`
- `autopilot/autopilot-failure-recovery.yml`
- `autopilot/autopilot-tack-sequence.yml`

**NMEA 2000 Specific:**
- `nmea2000/battery-pgn-127508.yml`
- `nmea2000/engine-pgn-127488.yml`
- `nmea2000/mixed-protocol-test.yml`
- `nmea2000/tank-pgn-127505.yml`

---

### 🔬 LOW PRIORITY - Performance/Physics/Recorded (10 files)

**Performance:**
- `performance/high-frequency-data.yml`
- `performance/high-frequency-stress-test.yml`
- `performance/malformed-data-stress.yml`
- `performance/multi-protocol-scenario.yml`

**Physics:**
- `physics/j35-upwind-sailing.yml`
- `physics/j35-coastal-sailing.yml`
- `physics/motor-yacht-cruise.yml`
- `physics/multi-vessel-comparison.yml`

**Recorded:**
- `recorded/real-world-sailing.yml`
- `recorded/synthetic-enhancement.yml`

**Environmental:**
- `environmental/shallow-water-alarm.yml`

---

## Conversion Template

### Sensor Type Mapping:
- `data.depth` → `depth_sensor` (PGN 128267)
- `data.speed` → `speed_sensor` (PGN 128259)
- `data.wind` → `wind_sensor` (PGN 130306)
- `data.gps` → `gps_sensor` (PGN 129029)
- `data.heading` → `heading_sensor` (PGN 127250)
- `data.water_temp` → `temperature_sensor` (PGN 130310)
- `data.engine` → `engine_sensor` (PGN 127488/127489)
- `data.battery` → `battery_sensor` (PGN 127508)
- `data.tank` → `tank_sensor` (PGN 127505)
- `data.rudder` → `rudder_sensor` (PGN 127245)

### Required Parameters Section:
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

## Testing Strategy

### Per File:
1. Backup original file
2. Convert to sensor-based
3. Test with: `node server/nmea-bridge.js --scenario <file> --loop`
4. Verify NMEA 0183 output matches original
5. Test NMEA 2000: `--bridge-mode nmea2000`
6. Verify binary PGNs generated correctly

### Validation:
- Compare message count (NMEA 0183 mode should match original)
- Verify data patterns (sine wave, gaussian, etc. unchanged)
- Check update rates match frequency settings
- Confirm physical properties map correctly

---

## Next Actions

**Immediate (Today):**
1. Convert remaining VS Code task files (9 files)
2. Test each converted file
3. Update this status document

**Short-term (This Week):**
1. Convert medium priority files (10 files)
2. Document any edge cases or special patterns
3. Update documentation with migration guide

**Long-term:**
1. Convert low priority files as needed
2. Deprecate old architecture
3. Update schema to require sensor-based format

---

## Notes

- Old files backed up with `-BACKUP.yml` or `-DEPRECATED.yml` suffix
- All sensor-based files work with both NMEA 0183 and NMEA 2000
- Bridge mode can be changed via CLI: `--bridge-mode nmea2000`
- Default is NMEA 0183 for backward compatibility
- Hybrid mode generates both protocols simultaneously
