# Testing Strategy for NMEA Marine Instrument Display

This document defines the comprehensive testing strategy for the BMad Autopilot marine instrument display system, focusing on synthetic NMEA test recordings and systematic validation approaches.

## Overview

The BMad Autopilot testing strategy leverages synthetic NMEA data recordings to provide predictable, repeatable testing scenarios for all marine widgets and system components. This approach enables comprehensive testing without requiring physical marine hardware or real-world conditions.

## Testing Philosophy

### Principles
- **Predictable Data:** All tests use known, synthetic NMEA data for consistent results
- **Isolated Testing:** Each widget can be tested independently with specific data patterns
- **Cross-Platform Validation:** Identical behavior verification across web, iOS, and Android
- **Performance Validation:** Stress testing with high-frequency data streams
- **Protocol Coverage:** Testing both NMEA 0183 and NMEA 2000 bridge modes

### Testing Pyramid
1. **Unit Tests** - Individual component logic and data parsing
2. **Integration Tests** - Widget behavior with synthetic NMEA streams  
3. **System Tests** - End-to-end scenarios with complete data flows
4. **Performance Tests** - High-frequency data and stress conditions
5. **Cross-Platform Tests** - Behavior consistency validation

## Test Data Strategy

### Synthetic NMEA Recordings Library

The testing strategy centers on a comprehensive library of synthetic NMEA recordings organized by scenario and widget type:

```
boatingInstrumentsApp/server/recordings/
├── navigation/          # GPS, course, position data
│   ├── nmea0183/       # NMEA 0183 format recordings
│   └── nmea2000/       # NMEA 2000 format recordings
├── environmental/       # Depth, temperature, weather
├── engine/             # Engine monitoring and alarms
├── battery/            # Battery system data
├── tank/               # Fuel and water tank data
├── autopilot/          # Autopilot control sequences
├── multi-instance/     # Multiple equipment instances
├── performance/        # High-frequency stress tests
└── archived/           # Legacy recordings
```

### Recording Categories

#### 1. Widget-Specific Recordings
- **Navigation:** Basic navigation, coastal sailing, deep water passage
- **Environmental:** Weather conditions, depth variations, temperature changes
- **Engine:** Single engine, twin engines, alarm conditions
- **Battery:** Single battery, multi-battery systems, charge/discharge cycles
- **Tank:** Fuel tanks, water tanks, complete tank systems

#### 2. Autopilot Control Recordings
- **Engagement:** Manual to autopilot transitions
- **Heading Adjustments:** Course changes and corrections
- **Tack Sequences:** Sailing maneuvers with autopilot
- **Failure Recovery:** Emergency disengagement scenarios

#### 3. Multi-Instance Detection Recordings
- **Progressive Discovery:** Systems coming online gradually
- **Instance Removal:** Equipment shutdown scenarios  
- **Maximum Configuration:** Stress test with 16 instances per type
- **Validation Data:** Instance mapping verification

#### 4. Performance and Stress Recordings
- **High-Frequency:** 500+ messages/second for 10+ minutes
- **Malformed Data:** Error handling validation
- **Protocol Switching:** NMEA 0183 ↔ NMEA 2000 transitions
- **Intermittent Connections:** Disconnect/reconnect patterns

## Testing Workflows

### Developer Workflow

```bash
# 1. Select appropriate recording for widget under development
cd /path/to/bmad-autopilot/boatingInstrumentsApp

# 2. Start simulator with specific recording
node server/nmea-bridge-simulator.js --recording server/recordings/navigation/nmea0183/basic-navigation.json

# 3. Run widget tests with predictable data
npm test -- --testNamePattern="DepthWidget"

# 4. Switch recordings for different scenarios
node server/nmea-bridge-simulator.js --recording server/recordings/environmental/nmea2000/weather-conditions.json

# 5. Validate behavior across protocols
npm test -- --testNamePattern="CrossPlatform"
```

### QA Workflow

```bash
# 1. Review story acceptance criteria
# 2. Select test recordings matching each acceptance criterion
# 3. Execute comprehensive test suite

# Navigation widget validation
node server/nmea-bridge-simulator.js --recording server/recordings/navigation/nmea0183/coastal-sailing.json
npm run test:widgets -- --group navigation

# Autopilot control validation  
node server/nmea-bridge-simulator.js --recording server/recordings/autopilot/nmea2000/engagement-sequence.json
npm run test:autopilot

# Performance validation
node server/nmea-bridge-simulator.js --recording server/recordings/performance/high-frequency-500hz.json.gz
npm run test:performance

# 4. Document results and validate cross-platform behavior
npm run test:cross-platform
```

### CI/CD Workflow

```yaml
# .github/workflows/test.yml example
test-marine-widgets:
  steps:
    - name: Start NMEA Simulator
      run: |
        cd boatingInstrumentsApp
        node server/nmea-bridge-simulator.js --recording server/recordings/navigation/nmea0183/basic-navigation.json &
        
    - name: Run Widget Tests
      run: npm run test:widgets
      
    - name: Run Cross-Platform Tests
      run: npm run test:cross-platform
      
    - name: Performance Validation
      run: |
        node server/nmea-bridge-simulator.js --recording server/recordings/performance/high-frequency-500hz.json.gz &
        npm run test:performance
```

## Test Categories and Coverage

### 1. Widget Functional Tests

**Navigation Widgets:**
- GPS position accuracy and format validation
- Speed calculations (STW, SOG, average, maximum)
- Wind direction and speed display
- Depth readings and alarm conditions
- Compass heading with magnetic variation

**System Widgets:**
- Engine RPM, temperature, pressure monitoring
- Battery voltage, current, state of charge
- Tank levels and consumption rates
- Autopilot status and control feedback

### 2. Data Protocol Tests

**NMEA 0183 Validation:**
- Standard sentence parsing (GGA, RMC, VTG, DBT, MWV, etc.)
- Checksum validation and error handling
- Sentence timing and frequency validation

**NMEA 2000 Validation:**
- PGN parsing and multi-frame message assembly
- Source address and instance management  
- Fast packet reconstruction
- $PCDIN encapsulation for unsupported sentences

### 3. Performance Tests

**High-Frequency Data Handling:**
- 500+ messages/second sustained processing
- Memory usage and garbage collection impact
- UI responsiveness during data bursts
- Queue depth and message processing latency

**Stress Testing:**
- Malformed message handling and recovery
- Protocol switching without data loss
- Connection interruption and reconnection
- Maximum instance configuration (16 per type)

### 4. Cross-Platform Tests

**Behavior Consistency:**
- Identical widget display across web/iOS/Android
- Unit conversion accuracy and precision
- Theme and styling consistency  
- Touch interaction and responsive layout

**Performance Consistency:**
- Frame rate maintenance during high-frequency data
- Memory usage patterns across platforms
- Battery impact on mobile devices

## Recording File Standards

### JSON Format Specification

```json
{
  "metadata": {
    "name": "Basic Navigation Test",
    "description": "Standard cruising scenario with all basic navigation data",
    "duration": 300.0,
    "message_count": 1500,
    "created": "2025-10-24T10:00:00Z",
    "vessel_type": "40ft Sailboat",
    "scenario_type": "navigation",
    "version": "1.0",
    "bridge_mode": "nmea0183",
    "test_coverage": ["gps", "depth", "speed", "wind", "compass"]
  },
  "messages": [
    {
      "timestamp": 1729764773.131,
      "relative_time": 0.0,
      "sentence": "$GPGGA,123456.00,4030.1234,N,07430.5678,W,1,08,1.0,10.5,M,-34.0,M,,*75",
      "sentence_type": "GGA",
      "description": "GPS Fix Data - Latitude: 40°30.1234'N, Longitude: 74°30.5678'W",
      "sequence": 0
    }
  ]
}
```

### Quality Criteria

**Data Validity:**
- All NMEA sentences must pass checksum validation
- PGN data must conform to NMEA 2000 specifications
- Timestamps must be monotonically increasing
- Relative timing must be preserved for replay accuracy

**Coverage Requirements:**
- Each recording must cover specific widget/scenario completely
- Duration must be sufficient for meaningful testing (minimum 30 seconds)
- Message frequency must match real-world patterns
- Edge cases and boundary conditions must be included

## Test Automation

### Automated Recording Validation

```javascript
// Example validation test
describe('Recording Validation', () => {
  test('NMEA sentences have valid checksums', () => {
    const recording = loadRecording('navigation/basic-navigation.json');
    recording.messages.forEach(msg => {
      expect(validateNMEAChecksum(msg.sentence)).toBe(true);
    });
  });
  
  test('Timestamps are monotonically increasing', () => {
    const recording = loadRecording('navigation/basic-navigation.json');
    for (let i = 1; i < recording.messages.length; i++) {
      expect(recording.messages[i].timestamp)
        .toBeGreaterThanOrEqual(recording.messages[i-1].timestamp);
    }
  });
});
```

### Widget Behavior Testing

```javascript
// Example widget test with synthetic data
describe('DepthWidget with Synthetic Data', () => {
  beforeEach(() => {
    startSimulator('environmental/depth-variations.json');
  });
  
  test('displays depth values correctly', async () => {
    const widget = renderDepthWidget();
    
    // Wait for first data
    await waitFor(() => {
      expect(widget.getByText(/\d+\.\d+ ft/)).toBeInTheDocument();
    });
    
    // Validate specific depth value from known recording
    expect(widget.getByText('15.2 ft')).toBeInTheDocument();
  });
  
  test('triggers shallow water alarm', async () => {
    const widget = renderDepthWidget();
    
    // Recording contains shallow water condition at known time
    await waitFor(() => {
      expect(widget.getByText('SHALLOW WATER')).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
```

## Success Metrics

### Coverage Metrics
- 100% of marine widgets have dedicated test recordings
- All autopilot scenarios covered with recordings  
- Multi-instance detection fully validated
- Both NMEA protocols supported and tested

### Quality Metrics
- Zero playback errors in simulator logs
- Consistent output across 10+ playback cycles
- Cross-platform validation successful
- Performance targets met (500+ msg/sec)

### Development Metrics
- 50% reduction in test setup time
- 90%+ developer satisfaction with recording utility
- 100% team can independently start simulator with recordings
- Zero test failures due to data inconsistencies

## Tools and Integration

### Simulator Integration
- **NMEA Bridge Simulator** - Primary tool for recording playback
- **VS Code Tasks** - Integrated development workflow
- **CI/CD Pipelines** - Automated testing with recordings

### Development Tools
- **Jest** - Unit and integration testing framework
- **React Native Testing Library** - Component testing
- **Performance Profiler** - Memory and performance validation

### Documentation Tools
- **README Files** - Recording catalogs and usage guides
- **Scenario Definitions** - YAML-based test scenario library
- **API Documentation** - Simulator and testing API reference

---

## Appendix

### Recording Creation Guidelines

1. **Planning:** Define test scenario and expected widget behavior
2. **Generation:** Use simulator or capture real data for baseline
3. **Validation:** Verify NMEA sentence accuracy and completeness  
4. **Metadata:** Add comprehensive description and test coverage info
5. **Cataloging:** Update README with scenario description and usage
6. **Testing:** Validate recording produces expected widget behavior

### Troubleshooting Common Issues

**Recording Playback Fails:**
- Verify file path and JSON format validity
- Check simulator logs for specific error messages
- Ensure recording file is not corrupted or truncated

**Widget Not Updating:**
- Confirm WebSocket connection to simulator
- Verify NMEA sentence types match widget expectations
- Check widget subscription to correct data streams

**Performance Issues:**
- Monitor memory usage during high-frequency recordings
- Adjust playback speed if processing cannot keep up
- Use compressed (.gz) recordings for large datasets

**Cross-Platform Inconsistencies:**
- Validate identical NMEA data across all platforms
- Check platform-specific rendering differences
- Ensure consistent timing and data processing

---

*This testing strategy supports Story 7.4: Synthetic NMEA Test Recordings Library and provides the foundation for comprehensive, predictable testing of all marine instrument functionality.*
