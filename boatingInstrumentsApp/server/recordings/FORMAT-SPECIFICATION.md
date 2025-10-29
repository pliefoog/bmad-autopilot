# NMEA Recording File Format Specification

This document defines the standard JSON format for NMEA test recordings used in the BMad Autopilot synthetic test data library.

## Version

**Format Version:** 1.0  
**Date:** 2025-10-24  
**Compatibility:** NMEA Bridge Simulator v2.0+

## File Format Overview

All NMEA recordings are stored as JSON files with a standardized structure containing metadata and message arrays. Large recordings may be compressed using gzip (.json.gz extension).

### Basic Structure

```json
{
  "metadata": {
    // Recording information and parameters
  },
  "messages": [
    // Array of NMEA messages with timing
  ]
}
```

## Metadata Schema

The metadata object provides essential information about the recording content, creation context, and intended usage.

### Required Fields

```json
{
  "metadata": {
    "name": "string",              // Human-readable recording name
    "description": "string",       // Detailed scenario description
    "duration": number,            // Total duration in seconds (float)
    "message_count": number,       // Total number of messages (integer)
    "created": "ISO-8601-string",  // Creation timestamp
    "version": "string",           // Format version (currently "1.0")
    "bridge_mode": "string"        // "nmea0183" or "nmea2000"
  }
}
```

### Optional Fields

```json
{
  "metadata": {
    "vessel_type": "string",       // e.g., "40ft Sailboat", "Motor Yacht"
    "scenario_type": "string",     // e.g., "navigation", "autopilot", "engine"
    "test_coverage": ["string"],   // Array of tested components
    "conditions": {               // Environmental conditions
      "wind_speed": "string",
      "sea_state": "string", 
      "weather": "string"
    },
    "equipment": {                // Simulated equipment configuration
      "engines": number,
      "batteries": number,
      "tanks": number
    },
    "author": "string",           // Recording creator
    "tags": ["string"],           // Searchable tags
    "related_stories": ["string"] // BMM story references
  }
}
```

## Message Schema

Each message in the messages array represents a single NMEA sentence or PGN with precise timing information.

### Required Message Fields

```json
{
  "timestamp": number,           // Unix timestamp (float, with microseconds)
  "relative_time": number,       // Time offset from start in seconds (float)
  "sentence": "string",          // Complete NMEA sentence or PGN
  "sentence_type": "string",     // NMEA sentence type or PGN number
  "sequence": number             // Message sequence number (integer)
}
```

### Optional Message Fields

```json
{
  "description": "string",       // Human-readable message description
  "source": "string",           // Source device/system identifier
  "instance": number,           // Equipment instance number
  "priority": number,           // Message priority (NMEA 2000)
  "pgn": number,                // PGN number (NMEA 2000 only)
  "src_address": number,        // Source address (NMEA 2000 only)
  "dst_address": number,        // Destination address (255 = broadcast)
  "data_length": number,        // Data payload length
  "checksum_valid": boolean,    // Checksum validation result
  "parsed_data": object         // Structured parsed data (optional)
}
```

## Complete Example

### NMEA 0183 Recording

```json
{
  "metadata": {
    "name": "Basic Navigation Test",
    "description": "Standard coastal sailing with GPS, depth, speed, and wind data",
    "duration": 300.0,
    "message_count": 1500,
    "created": "2025-10-24T10:00:00Z",
    "vessel_type": "40ft Sailboat",
    "scenario_type": "navigation",
    "version": "1.0",
    "bridge_mode": "nmea0183",
    "test_coverage": ["gps", "depth", "speed", "wind", "compass"],
    "conditions": {
      "wind_speed": "12-15 knots",
      "sea_state": "calm",
      "weather": "clear"
    },
    "author": "BMad Test Suite",
    "tags": ["navigation", "basic", "widgets"],
    "related_stories": ["story-7.4", "story-2.3"]
  },
  "messages": [
    {
      "timestamp": 1729764773.131632,
      "relative_time": 0.0,
      "sentence": "$GPGGA,123456.00,4030.1234,N,07430.5678,W,1,08,1.0,10.5,M,-34.0,M,,*75",
      "sentence_type": "GGA",
      "description": "GPS Fix Data - Lat: 40°30.1234'N, Lon: 74°30.5678'W, Alt: 10.5m",
      "sequence": 0,
      "checksum_valid": true,
      "parsed_data": {
        "latitude": 40.502056,
        "longitude": -74.511296,
        "altitude": 10.5,
        "fix_quality": 1,
        "satellites": 8
      }
    },
    {
      "timestamp": 1729764773.194205,
      "relative_time": 0.063,
      "sentence": "$IIDBT,,f,15.2,M,8.3,F*3C",
      "sentence_type": "DBT",
      "description": "Depth Below Transducer - 15.2 meters / 8.3 fathoms",
      "sequence": 1,
      "checksum_valid": true,
      "parsed_data": {
        "depth_meters": 15.2,
        "depth_fathoms": 8.3
      }
    }
  ]
}
```

### NMEA 2000 Recording

```json
{
  "metadata": {
    "name": "Engine Monitoring Test",
    "description": "Twin engine monitoring with RPM, temperature, and pressure data",
    "duration": 180.0,
    "message_count": 720,
    "created": "2025-10-24T10:00:00Z",
    "vessel_type": "Motor Yacht",
    "scenario_type": "engine",
    "version": "1.0",
    "bridge_mode": "nmea2000",
    "test_coverage": ["engine", "rpm", "temperature", "pressure"],
    "equipment": {
      "engines": 2,
      "batteries": 3,
      "tanks": 4
    },
    "author": "BMad Test Suite",
    "tags": ["engine", "twin", "monitoring"]
  },
  "messages": [
    {
      "timestamp": 1729764773.131632,
      "relative_time": 0.0,
      "sentence": "$PCDIN,01F200,00,FF,A0,0F,00,00,FF,FF,FF,7F*4E",
      "sentence_type": "PGN",
      "description": "Engine Parameters - Engine #1 RPM: 2000",
      "sequence": 0,
      "pgn": 127488,
      "src_address": 0,
      "dst_address": 255,
      "priority": 3,
      "data_length": 8,
      "checksum_valid": true,
      "parsed_data": {
        "engine_instance": 0,
        "engine_speed": 2000,
        "engine_boost_pressure": null,
        "engine_tilt_trim": null
      }
    }
  ]
}
```

## Validation Rules

### Metadata Validation

1. **Required fields must be present and correctly typed**
2. **Duration must be positive number**
3. **Message count must match actual message array length**
4. **Created timestamp must be valid ISO-8601 format**
5. **Bridge mode must be "nmea0183" or "nmea2000"**
6. **Version must be supported format version**

### Message Validation

1. **Timestamps must be monotonically increasing**
2. **Relative times must be non-negative and increasing**
3. **Sequence numbers must be unique and increasing**
4. **NMEA sentences must have valid format and checksum**
5. **Sentence types must match actual sentence content**
6. **PGN numbers must be valid NMEA 2000 specifications**

### Data Integrity

1. **JSON must be valid and parseable**
2. **File size should be reasonable for duration and message count**
3. **Compressed files must decompress to valid JSON**
4. **No missing or truncated messages**
5. **Consistent timing intervals for data types**

## File Naming Convention

### Standard Pattern

```
<category>-<scenario>-<protocol>-<duration>.<format>
```

### Examples

```
navigation-basic-nmea0183-5min.json
autopilot-engagement-nmea2000-3min.json
engine-twin-monitoring-nmea0183-10min.json.gz
performance-high-frequency-nmea2000-15min.json.gz
```

### Category Codes

- `navigation` - GPS, compass, speed, wind data
- `environmental` - Depth, temperature, weather conditions  
- `engine` - Engine monitoring and control
- `battery` - Battery and electrical system data
- `tank` - Fuel and fluid tank systems
- `autopilot` - Autopilot control and status
- `multi-instance` - Multiple equipment instances
- `performance` - High-frequency and stress testing
- `debug` - Minimal or edge case scenarios

## Compression Guidelines

### When to Compress

- **File size > 1MB**
- **Duration > 10 minutes**  
- **Message rate > 100 Hz**
- **Archive/storage purposes**

### Compression Format

- **Use gzip compression**
- **Maintain .json.gz extension**
- **Compression level 6 (balance of size/speed)**
- **Preserve original filename in metadata**

### Example Compression

```bash
# Compress large recording
gzip navigation-coastal-sailing-nmea0183-60min.json

# Results in:
navigation-coastal-sailing-nmea0183-60min.json.gz
```

## Usage Guidelines

### Recording Creation

1. **Start with scenario definition** from test-scenarios library
2. **Generate data** using NMEA Bridge Simulator  
3. **Capture with timing** preserving microsecond precision
4. **Add comprehensive metadata** describing scenario and coverage
5. **Validate format** using automated validation tools
6. **Compress if needed** following size guidelines
7. **Update catalog** with recording description and usage

### Recording Playback

```bash
```bash
# Basic file playback (unified tool supports NMEA files)
node server/nmea-bridge.js --file path/to/recording.nmea

# With looping
node server/nmea-bridge.js --file path/to/recording.nmea --loop

# Speed control via rate
node server/nmea-bridge.js --file path/to/recording.nmea --rate 20
```
```

### Quality Assurance

1. **Validate JSON structure** before committing
2. **Test playback** with simulator
3. **Verify widget behavior** matches expectations
4. **Check timing accuracy** with known scenarios
5. **Validate cross-platform** behavior consistency

## Error Handling

### Common Issues

**Invalid JSON Format:**
```json
{
  "error": "SyntaxError: Unexpected token",
  "fix": "Validate JSON syntax and structure"
}
```

**Missing Required Fields:**
```json
{
  "error": "Missing required metadata field: duration",
  "fix": "Add duration field to metadata object"
}
```

**Invalid Timestamps:**
```json
{
  "error": "Non-monotonic timestamp at sequence 42",
  "fix": "Ensure timestamps increase monotonically"
}
```

**Checksum Validation Failure:**
```json
{
  "error": "Invalid NMEA checksum in sentence: $GPGGA...",
  "fix": "Recalculate and correct NMEA sentence checksum"
}
```

## Backward Compatibility

### Version Migration

- **Version 1.0:** Current specification
- **Future versions:** Will maintain backward compatibility for metadata
- **Message format:** Core fields will remain stable
- **New fields:** Added as optional to preserve compatibility

### Legacy Recording Support

- **Pre-v1.0 recordings:** May lack some metadata fields
- **Migration tools:** Available for format conversion
- **Validation warnings:** Non-breaking for missing optional fields

---

## Implementation Tools

### Validation Utilities

```javascript
// Example validation function
function validateRecording(recording) {
  const errors = [];
  
  // Validate metadata
  if (!recording.metadata) errors.push("Missing metadata object");
  if (!recording.metadata.duration) errors.push("Missing duration");
  if (!recording.metadata.message_count) errors.push("Missing message_count");
  
  // Validate messages
  if (!Array.isArray(recording.messages)) {
    errors.push("Messages must be an array");
  } else {
    // Check message count matches metadata
    if (recording.messages.length !== recording.metadata.message_count) {
      errors.push(`Message count mismatch: expected ${recording.metadata.message_count}, got ${recording.messages.length}`);
    }
    
    // Validate timestamp ordering
    for (let i = 1; i < recording.messages.length; i++) {
      if (recording.messages[i].timestamp < recording.messages[i-1].timestamp) {
        errors.push(`Non-monotonic timestamp at index ${i}`);
      }
    }
  }
  
  return errors;
}
```

### Format Conversion

```javascript
// Convert legacy recording to v1.0 format
function upgradeRecording(legacyRecording) {
  return {
    metadata: {
      name: legacyRecording.name || "Untitled Recording",
      description: legacyRecording.description || "Legacy recording",
      duration: legacyRecording.duration || calculateDuration(legacyRecording.messages),
      message_count: legacyRecording.messages.length,
      created: legacyRecording.created || new Date().toISOString(),
      version: "1.0",
      bridge_mode: legacyRecording.bridge_mode || "nmea0183",
      ...legacyRecording.metadata
    },
    messages: legacyRecording.messages.map((msg, index) => ({
      timestamp: msg.timestamp,
      relative_time: msg.relative_time || (msg.timestamp - legacyRecording.messages[0].timestamp),
      sentence: msg.sentence || msg.message,
      sentence_type: msg.sentence_type || extractSentenceType(msg.sentence),
      sequence: msg.sequence || index,
      ...msg
    }))
  };
}
```

---

*This format specification supports Story 7.4: Synthetic NMEA Test Recordings Library and ensures consistent, maintainable test data for comprehensive marine instrument validation.*
