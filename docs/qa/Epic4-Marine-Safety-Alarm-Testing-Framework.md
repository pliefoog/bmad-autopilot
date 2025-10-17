# Marine Safety Alarm Reliability Testing Framework

## Overview

This document defines the testing framework for Epic 4 safety-critical alarm systems that must match or exceed physical marine instrument reliability standards. All alarm systems are classified as **SAFETY_CRITICAL** due to direct impact on marine navigation safety.

## Marine Safety Requirements

### Industry Standards Compliance
- **False Positive Rate:** <1% (prevents alarm fatigue and dangerous dismissal)  
- **False Negative Rate:** <0.1% (critical marine safety - missed alarms can be fatal)
- **Threshold Accuracy:** ±5% of configured value (matches Raymarine i70s accuracy)
- **Audio Alert Level:** 85dB+ at 1 meter (audible over engine/wind noise)
- **Visual Alert Visibility:** Visible in direct sunlight and red-night mode
- **Response Time:** <500ms from threshold breach to alert (faster than physical instruments)

### Marine Environment Validation
- **Boat Motion:** Validate with device acceleration simulation (±30° roll/pitch)
- **Temperature Range:** -10°C to +60°C operational temperature
- **Spray/Moisture:** IP65 equivalent (device in marine case)  
- **Night Vision:** Red-night mode preserves scotopic vision
- **Fatigue Conditions:** 24+ hour passage alarm reliability

## Epic 4 Alarm Categories

### 4.1 Critical Safety Alarms (SAFETY_CRITICAL)
**Marine Classification:** **CRITICAL SAFETY** - Direct navigation hazard prevention

#### Depth Alarm System
- **Purpose:** Prevent grounding in shallow water
- **NMEA Sources:** DPT (NMEA0183), PGN 128267 (NMEA2000)
- **Test Scenarios:**
  ```yaml
  depth_alarm_tests:
    shallow_water_approach:
      description: "Validate depth alarm triggers as boat approaches shallows"
      given: "Depth alarm set to 3.0 meters, boat in 10m water"
      when: "Depth reading decreases: 5m → 4m → 3.2m → 2.8m → 2.5m"
      then: "Alarm triggers at 2.8m (3.0m threshold breached)"
      expected_behavior:
        - Audio alert within 500ms
        - Visual alert (red background, large text)
        - Alert persists until acknowledged or depth > 3.3m (hysteresis)
        - No false positives from depth sounder noise
    
    depth_sensor_failure:
      description: "Handle depth sensor failure gracefully"
      given: "Depth alarm active, receiving valid depth data"
      when: "Depth sensor fails (no NMEA data for >10 seconds)"  
      then: "Display 'DEPTH SENSOR OFFLINE' warning, disable depth alarm"
      
    false_positive_prevention:
      description: "Prevent depth alarm false positives"
      given: "Depth alarm set to 3.0m, boat in 3.5m water with sounder noise"
      when: "Depth readings fluctuate: 3.4m → 2.9m → 3.6m → 2.8m → 3.4m"
      then: "No alarm (require 2+ consecutive readings below threshold)"
  ```

#### Wind Shift Alarm System  
- **Purpose:** Detect dangerous wind shifts during sailing
- **NMEA Sources:** MWV (NMEA0183), PGN 130306 (NMEA2000)
- **Test Scenarios:**
  ```yaml
  wind_shift_tests:
    sudden_wind_shift:
      description: "Detect sudden wind direction changes"
      given: "Wind shift alarm set to ±30°, apparent wind 045° at 12 knots"
      when: "Wind shifts: 045° → 050° → 065° → 080° over 2 minutes"
      then: "Alarm triggers at 075° (30° shift from baseline)"
      
    wind_speed_increase:
      description: "Detect dangerous wind speed increases"
      given: "Wind speed alarm set to >25 knots, current wind 15 knots"
      when: "Wind increases: 15kt → 18kt → 22kt → 28kt → 32kt over 5 minutes"
      then: "Alarm triggers at 28kt (>25kt threshold)"
      
    squall_detection:
      description: "Detect rapid wind increase (squall approach)"
      given: "Wind: 12 knots from 180°"
      when: "Rapid change: 12kt/180° → 28kt/220° in <30 seconds"
      then: "BOTH wind speed AND direction alarms trigger simultaneously"
  ```

#### Engine Temperature Alarm System
- **Purpose:** Prevent engine overheating damage
- **NMEA Sources:** XDR (temperature), PGN 127489 (engine parameters)
- **Test Scenarios:**
  ```yaml
  engine_temp_tests:
    overheating_protection:
      description: "Engine coolant temperature monitoring"
      given: "Engine temp alarm set to 85°C, current temp 70°C"
      when: "Temperature rises: 70°C → 75°C → 82°C → 87°C → 90°C"
      then: "Alarm triggers at 87°C with CRITICAL severity"
      expected_behavior:
        - Continuous audio alert (non-dismissible until temp drops)
        - Red background with "ENGINE OVERHEAT" message
        - Display current temp and threshold
        
    dual_engine_monitoring:
      description: "Monitor port and starboard engines independently"
      given: "Dual engine boat, temp alarms 85°C both engines"
      when: "Port engine: 88°C, Starboard engine: 72°C"
      then: "Alarm only for port engine, display both temperatures clearly"
  ```

#### Battery Voltage Alarm System
- **Purpose:** Prevent battery damage and system failures
- **NMEA Sources:** XDR (battery voltage), PGN 127508 (battery status)
- **Test Scenarios:**
  ```yaml
  battery_voltage_tests:
    low_voltage_warning:
      description: "House battery low voltage detection"
      given: "House battery alarm set to 12.0V, current 12.8V"
      when: "Voltage drops: 12.8V → 12.4V → 12.1V → 11.8V → 11.5V"
      then: "Warning at 12.1V, ALARM at 11.8V (below 12.0V)"
      
    multiple_battery_monitoring:
      description: "Monitor house and engine batteries separately"
      given: "House: 12.0V alarm, Engine: 11.5V alarm"
      when: "House: 11.8V, Engine: 11.6V, Start: 12.4V"
      then: "Alarms for house and engine, no alarm for start battery"
  ```

### 4.2 Grouped Alarm Management (FUNCTIONAL)
**Marine Classification:** **PERFORMANCE_CRITICAL** - Operational efficiency

#### Motor Alarms Group
- **Components:** Engine temp, oil pressure, coolant level, alternator output
- **Test Scenarios:**
  ```yaml
  motor_alarms_group:
    multiple_engine_issues:
      description: "Handle multiple simultaneous engine alarms"
      given: "Motor alarm group configured with temp, oil pressure"
      when: "Engine temp: 88°C (ALARM), Oil pressure: 15psi (WARNING)"
      then: "Group widget shows RED status with 'MOTOR ALARMS (2)'"
      expected_display:
        - Group widget background: RED (highest severity)
        - Text: "MOTOR ALARMS (2)" 
        - Expandable details show individual alarm status
  ```

#### Sailing Alarms Group
- **Components:** Depth, wind shift, speed limits
- **Test Scenarios:**
  ```yaml
  sailing_alarms_group:
    night_sailing_scenario:
      description: "Multiple sailing alarms during night passage"
      given: "Sailing group: depth 3m, wind shift ±30°, speed >8kt"
      when: "Night sailing: depth 2.8m, wind shift 35°, speed 6kt"
      then: "Group shows YELLOW (2 alarms: depth, wind shift)"
  ```

## Testing Implementation Framework

### Automated Test Suite Structure
```
__tests__/alarms/
├── unit/
│   ├── AlarmThresholdCalculator.test.ts
│   ├── AlarmAudioManager.test.ts
│   └── AlarmVisualIndicator.test.ts
├── integration/
│   ├── NMEADataToAlarmFlow.test.ts
│   ├── GroupedAlarmAggregation.test.ts
│   └── AlarmPersistence.test.ts
├── scenarios/
│   ├── MarineEnvironmentSimulation.test.ts
│   ├── MultipleAlarmCascade.test.ts
│   └── NightSailingAlarms.test.ts
└── performance/
    ├── AlarmLatencyBenchmark.test.ts
    └── MemoryLeakDetection.test.ts
```

### Marine Safety Test Data Generator
```typescript
// Example test data generator for marine scenarios
export const generateMarineAlarmScenarios = {
  shallowWaterApproach: {
    timelineMinutes: 10,
    depthReadings: [15, 12, 8, 5, 4, 3.2, 2.8, 2.5, 2.2], // meters
    expectedAlarmAt: 2.8, // threshold breach
    boatSpeed: 5, // knots
    conditions: "calm water, accurate sounder"
  },
  
  squallApproach: {
    timelineMinutes: 5,
    windData: [
      { angle: 180, speed: 12 },
      { angle: 185, speed: 15 },
      { angle: 195, speed: 22 },
      { angle: 220, speed: 28 }, // alarm triggers
      { angle: 235, speed: 35 }
    ],
    expectedAlarms: ["wind_shift", "wind_speed"],
    conditions: "sudden weather change"
  }
};
```

### Manual Marine Environment Testing Checklist
- [ ] **Device Motion Testing:** Mount device on boat, validate alarms during normal operation
- [ ] **Sunlight Visibility:** Test alarm visibility in direct sunlight (>100,000 lux)
- [ ] **Night Vision:** Validate red-night mode preserves scotopic vision
- [ ] **Audio Testing:** Measure alarm volume at 1m distance with marine background noise
- [ ] **Fatigue Testing:** 24-hour continuous operation with periodic alarms
- [ ] **Temperature Testing:** Device in marine case, -10°C to +60°C operational range

## QA Gate Criteria

### Story 4.1 - Critical Safety Alarms
```yaml
marine_safety_classification:
  category: SAFETY_CRITICAL
  impact_level: HIGH
  systems_affected: ["alarm_systems", "emergency_systems"]
  validation_required: "False positive <1%, false negative <0.1%, marine environment validation"

acceptance_criteria:
  - All 4 alarm types (depth, wind, engine, battery) functional
  - Threshold accuracy within ±5% 
  - Audio alerts >85dB at 1m
  - Response time <500ms
  - Marine environment testing completed
  - No false positives during 8-hour continuous testing
  - Alarm persistence and acknowledgment working correctly
```

### Story 4.2 - Grouped Alarm Management  
```yaml
marine_safety_classification:
  category: PERFORMANCE_CRITICAL
  impact_level: MEDIUM
  systems_affected: ["alarm_systems"]
  validation_required: "Group aggregation accuracy, visual hierarchy clarity"

acceptance_criteria:
  - Motor and Sailing alarm groups functional
  - Correct severity aggregation (RED > YELLOW > GREEN)
  - Clear visual indication of group status
  - Expandable details showing individual alarms
  - Custom alarm group configuration working
```

## Failure Scenarios and Recovery

### Sensor Failure Handling
- **NMEA Data Loss:** Display "SENSOR OFFLINE" warning, disable affected alarms
- **Corrupt Data:** Filter invalid readings, use last known good value for <30 seconds
- **Multiple Sensor Failure:** Graceful degradation, clear status indication

### Performance Under Load
- **High NMEA Traffic:** Maintain <500ms alarm response time up to 500 msg/sec
- **Memory Constraints:** No memory leaks during 24+ hour operation
- **UI Responsiveness:** Alarm UI updates don't block navigation or autopilot controls

This framework ensures Epic 4 alarm systems meet marine safety standards and provide comprehensive test coverage for QA validation.