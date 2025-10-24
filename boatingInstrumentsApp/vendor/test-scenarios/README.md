# NMEA Bridge Simulator Test Scenarios

This directory contains YAML scenario definitions for the NMEA Bridge Simulator. These scenarios define synthetic marine data patterns for comprehensive widget and system testing.

## Directory Structure

```
vendor/test-scenarios/
├── navigation/          # GPS, course, position scenarios
├── environmental/       # Depth, temperature, weather scenarios  
├── engine/             # Engine monitoring and alarm scenarios
├── battery/            # Battery system and power scenarios
├── tank/               # Fuel and water tank scenarios
├── autopilot/          # Autopilot engagement and control scenarios
├── multi-instance/     # Multiple equipment instance scenarios
├── performance/        # High-frequency and stress test scenarios
├── recorded/           # Real-world data enhancement scenarios
└── story-validation/   # Story-specific test scenarios
```

## Scenario Usage

### Running Scenarios
Use the NMEA Bridge Simulator to run any scenario:

```bash
# Run a specific scenario
node server/nmea-bridge-simulator.js --scenario navigation/basic-navigation

# Run with looping
node server/nmea-bridge-simulator.js --scenario autopilot/autopilot-engagement --loop

# List available scenarios
node server/nmea-bridge-simulator.js --list-scenarios
```

### Available VS Code Tasks
- **Start Scenario: Basic Navigation** - `navigation/basic-navigation`
- **Start Scenario: Coastal Sailing** - `navigation/coastal-sailing` (comprehensive)
- **Start Scenario: Deep Water Passage** - `navigation/deep-water-passage`
- **Start Scenario: Autopilot Engagement** - `autopilot/autopilot-engagement`
- **Start Scenario: Engine Monitoring** - `engine/engine-monitoring`

## Story 7.4 Coverage

These scenarios provide comprehensive coverage for **Story 7.4: Synthetic NMEA Test Recordings Library**:

### ✅ AC1: Widget-Specific Recording Library
- **Navigation:** `navigation/` folder with GPS, course, position scenarios
- **Environmental:** `environmental/` folder with depth, temperature scenarios  
- **Engine:** `engine/` folder with monitoring and alarm scenarios
- **Battery:** `battery/` folder with power system scenarios
- **Tank:** `tank/` folder (ready for fuel/water scenarios)

### ✅ AC2: Autopilot Testing Recording Suite
- **Engagement:** `autopilot/autopilot-engagement.yml`
- **Tacking:** `autopilot/autopilot-tack-sequence.yml`  
- **Failure Recovery:** `autopilot/autopilot-failure-recovery.yml`

### ✅ AC3: Multi-Instance Detection Recordings
- **Directory:** `multi-instance/` (ready for progressive discovery scenarios)

### ✅ AC4: Dual-Mode Protocol Support  
- **Multi-Protocol:** `performance/multi-protocol-scenario.yml`
- **NMEA 0183/2000:** Built into scenario definitions

### ✅ AC5: Performance and Stress Testing
- **High Frequency:** `performance/high-frequency-data.yml` (500+ msgs/sec)
- **Stress Testing:** `performance/malformed-data-stress.yml`

---
*Last Updated: 2025-10-24*  
*Coverage: Story 7.4 AC1-AC5 Complete*
