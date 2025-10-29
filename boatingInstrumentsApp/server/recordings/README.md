# NMEA Test Recordings Library

This directory contains actual NMEA data recordings (.json, .gz files) organized by widget type and protocol for systematic testing.

## Directory Structure

```
server/recordings/
├── navigation/
│   ├── nmea0183/        # NMEA 0183 navigation recordings
│   └── nmea2000/        # NMEA 2000 navigation recordings
├── environmental/
│   ├── nmea0183/        # NMEA 0183 environmental recordings  
│   └── nmea2000/        # NMEA 2000 environmental recordings
├── engine/
│   ├── nmea0183/        # NMEA 0183 engine recordings
│   └── nmea2000/        # NMEA 2000 engine recordings
├── battery/
│   ├── nmea0183/        # NMEA 0183 battery recordings
│   └── nmea2000/        # NMEA 2000 battery recordings  
├── tank/
│   ├── nmea0183/        # NMEA 0183 tank recordings
│   └── nmea2000/        # NMEA 2000 tank recordings
├── autopilot/
│   ├── nmea0183/        # NMEA 0183 autopilot recordings
│   └── nmea2000/        # NMEA 2000 autopilot recordings
├── multi-instance/      # Multi-equipment instance recordings
├── performance/         # High-frequency and stress test recordings
├── safety/             # Alarm and safety scenario recordings
└── archived/           # Legacy/unorganized recordings
```

## Usage

### Playing Recordings
Use the NMEA Bridge Simulator to play recordings:

```bash
```bash
# Basic playback using file mode
node server/nmea-bridge.js --file server/recordings/navigation/nmea0183/basic-nav.nmea

# With looping
node server/nmea-bridge.js --file server/recordings/autopilot/nmea2000/engagement.nmea --loop
```

# Available VS Code task
"Start NMEA Bridge Simulator (Recording)" - Uses archived/nmea_recording_20250720_003925.json
```

### Generating Recordings from Scenarios
To create new recordings from scenario definitions:

```bash
```bash
# Generate new recording from scenario using the unified tool
node server/nmea-bridge.js --scenario basic-navigation > server/recordings/navigation/nmea0183/basic-navigation.nmea
```
```

## Recording Format

All recordings follow this JSON format:
```json
{
  "metadata": {
    "name": "Recording Name",
    "description": "Brief description", 
    "duration": 300,
    "message_count": 1500,
    "scenario": "navigation/basic-navigation",
    "protocol": "NMEA_0183",
    "created": "2025-10-24T10:00:00Z"
  },
  "messages": [
    {
      "timestamp": 0,
      "sentence": "$GPGGA,123456.00,4030.1234,N,07430.5678,W,1,08,1.0,10.5,M,-34.0,M,,*75"
    }
  ]
}
```

## Current Status

### Available Recordings
- **Archived Legacy:** Historical recordings moved to `archived/` folder
  - `nmea_recording_20250720_003925.json` - Real sailing data
  - `nmea_recording_20250720_005612.json.gz` - Compressed sailing data  
  - `large_test_recording.gz` - Large dataset for performance testing
  - `test_recording` - Basic test data

### Missing Recordings (To Be Generated)
The organized category folders are ready for recordings to be generated from the comprehensive scenario library in `vendor/test-scenarios/`.

## Story 7.4 Implementation Status

### ✅ Completed
- Organized directory structure for all widget categories
- Protocol separation (NMEA 0183/2000)
- Archive of existing recordings
- Comprehensive documentation

### 🔄 In Progress  
- Generation of recordings from scenario definitions
- Metadata standardization for existing recordings
- Coverage validation for all acceptance criteria

### 📋 TODO
- Automated recording generation from scenarios
- Multi-instance detection test recordings
- Performance stress test recordings
- Protocol conversion validation recordings

## Related Files

- **Scenario Definitions:** `vendor/test-scenarios/` - YAML definitions for generating recordings
- **NMEA Bridge:** `server/nmea-bridge.js` - Unified tool for live, file, and scenario modes
- **Story Documentation:** `docs/stories/story-7.4-synthetic-nmea-recordings.md`

---
*Last Updated: 2025-10-24*  
*Part of Story 7.4: Synthetic NMEA Test Recordings Library*
