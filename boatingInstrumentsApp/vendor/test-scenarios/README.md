# NMEA Bridge Simulator Test Scenarios

This directory contains YAML configuration files for the NMEA Bridge Simulator test scenarios used in Epic 7 development.

## Directory Structure

```
test-scenarios/
├── basic/
│   └── basic-navigation.yml     # Standard navigation scenario
├── autopilot/
│   └── autopilot-engagement.yml # Autopilot testing scenario
└── README.md                    # This file
```

## Scenario Files

### basic-navigation.yml
- **Purpose**: Standard sailing conditions with realistic marine instrument data
- **Duration**: 10 minutes (looped)
- **Data**: Depth, speed, wind, GPS, compass
- **Use Case**: General widget testing and development
- **Bridge Mode**: NMEA 0183 (traditional sentences)

### autopilot-engagement.yml  
- **Purpose**: Full autopilot engagement cycle with bidirectional commands
- **Duration**: 5 minutes (phase-based, no loop)
- **Data**: All navigation data + autopilot commands and status
- **Use Case**: Epic 3 autopilot development and testing
- **Bridge Mode**: NMEA 0183 with $PCDIN encapsulation for NMEA 2000 PGNs
- **Critical Features**: Bidirectional command processing, phase transitions

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