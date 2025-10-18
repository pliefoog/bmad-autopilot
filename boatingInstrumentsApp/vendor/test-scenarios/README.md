# NMEA Bridge Simulator Test Scenarios

This directory contains YAML configuration files for the NMEA Bridge Simulator test scenarios used in Epic 7 development.

## Directory Structure

```
test-scenarios/
├── basic/
│   ├── basic-navigation.yml     # Standard navigation scenario  
│   ├── coastal-sailing.yml      # Variable depth with tidal effects
│   └── deep-water-passage.yml   # Ocean conditions, deep water
├── autopilot/
│   ├── autopilot-engagement.yml # Basic autopilot testing scenario
│   ├── autopilot-tack-sequence.yml # Sailing tack maneuver
│   └── autopilot-failure-recovery.yml # Error conditions and recovery
├── safety/
│   ├── shallow-water-alarm.yml  # Progressive depth decrease
│   ├── engine-temperature-alarm.yml # Engine monitoring scenario
│   └── battery-drain-scenario.yml # Electrical system monitoring
├── performance/
│   ├── high-frequency-data.yml  # High message rate testing
│   ├── malformed-data-stress.yml # Error resilience testing
│   └── multi-protocol-scenario.yml # NMEA 0183 ↔ 2000 transitions
├── recorded/
│   └── recorded-regatta.nmea    # Real-world racing data
└── README.md                    # This file
```

## Scenario Files

### Basic Navigation Scenarios

**basic-navigation.yml**
- **Purpose**: Standard depth, speed, wind, GPS data for fundamental testing
- **Duration**: 5 minutes (as per AC1)
- **Data**: Depth (15±5 feet), Speed (6±0.5 knots), Wind, GPS, Compass
- **Use Case**: General widget testing and development
- **Bridge Mode**: NMEA 0183 (traditional sentences)

**coastal-sailing.yml**
- **Purpose**: Variable depth (5-100 feet) with tidal effects simulation
- **Duration**: 10 minutes with depth profile
- **Data**: Tidal depth variations, coastal wind patterns, GPS track
- **Use Case**: Depth alarm testing, tidal calculations
- **Bridge Mode**: NMEA 0183 with depth focus

**deep-water-passage.yml**  
- **Purpose**: Ocean conditions with consistent deep water (>1000 feet)
- **Duration**: 15 minutes ocean passage simulation
- **Data**: Deep water (1000+ feet), ocean swells, steady conditions
- **Use Case**: Ocean passage widgets, steady-state testing
- **Bridge Mode**: NMEA 0183, minimal depth variation

### Autopilot Control Scenarios

**autopilot-engagement.yml**  
- **Purpose**: Complete engagement sequence (manual → auto → heading adjustments → disengagement)
- **Duration**: 5 minutes (phase-based, no loop)
- **Data**: All navigation data + autopilot commands and status
- **Use Case**: Epic 3 autopilot development and testing
- **Bridge Mode**: NMEA 0183 with $PCDIN encapsulation for NMEA 2000 PGNs
- **Phases**: manual_steering → engagement → heading_adjustments → disengagement

**autopilot-tack-sequence.yml**
- **Purpose**: Sailing tack maneuver with 5-second countdown and wind transition
- **Duration**: 3 minutes per tack sequence
- **Data**: Wind shift simulation, heading changes, boat speed variations
- **Use Case**: Sailing autopilot testing, tacking maneuvers
- **Bridge Mode**: NMEA 0183 with autopilot PGNs

**autopilot-failure-recovery.yml**
- **Purpose**: Error conditions with emergency disengagement simulation
- **Duration**: 8 minutes including failure scenarios
- **Data**: Autopilot error states, manual override sequences
- **Use Case**: Safety testing, failure recovery procedures
- **Bridge Mode**: NMEA 0183 with error message simulation

## Scenario Usage

### Loading Scenarios in Simulator
```javascript
// In server/nmea-bridge-simulator.js
const scenario = await loadScenario('basic/basic-navigation.yml');
await simulator.startScenario(scenario);
```

### Command Line Usage
```bash
# Start simulator with specific scenario
node server/nmea-bridge-simulator.js --scenario basic-navigation

# Start autopilot testing scenario
node server/nmea-bridge-simulator.js --scenario autopilot-engagement
```

### API Usage
```bash
# Switch scenarios via REST API
curl -X POST http://localhost:8080/api/scenarios/start \
  -H "Content-Type: application/json" \
  -d '{"scenario": "basic/basic-navigation"}'
```

## Scenario File Format

Each YAML scenario file contains:

- **metadata**: Name, description, duration, loop settings
- **timing**: Update frequencies for different data types  
- **data_sources**: NMEA sentence generation patterns
- **events**: Timed scenario changes (optional)
- **validation**: Testing and quality rules
- **sample_output**: Reference NMEA sentences

### Bridge Mode Support

Scenarios support both WiFi bridge operating modes:

- **nmea0183**: Traditional NMEA 0183 sentences + $PCDIN-encapsulated NMEA 2000 PGNs
- **nmea2000**: Native NMEA 2000 PGN messages for all data

## Development Notes

### Adding New Scenarios

1. Create new YAML file in appropriate subdirectory
2. Follow existing format with metadata, timing, data_sources sections
3. Test with simulator before committing
4. Update this README with scenario description

### Testing Scenarios

```bash
# Validate YAML syntax
npm run validate-scenarios

# Test scenario loading
npm test -- scenarios

# Integration test with simulator
npm run test-simulator -- --scenario basic-navigation
```

### Epic 3 Autopilot Requirements

The `autopilot-engagement.yml` scenario specifically supports:

- Autopilot engagement/disengagement commands
- Heading change commands with realistic turn simulation  
- Status message broadcasting at 4 Hz
- Command timeout and validation testing
- Phase-based testing (manual → auto → heading changes → manual)

## Related Documentation

- Story 7.1: Core Multi-Protocol Simulator implementation
- `docs/nmea-research-findings.md`: NMEA protocol details
- `docs/architecture.md`: Overall system architecture
- `server/nmea-bridge-simulator.js`: Simulator implementation