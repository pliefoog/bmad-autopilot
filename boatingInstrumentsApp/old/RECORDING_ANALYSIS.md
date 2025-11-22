# NMEA Recording Analysis Report

## Recordings Available
1. `nmea_recording_20250720_003925.json` - Main recording (784 messages)
2. `nmea_recording_20250720_005612.json.gz` - Compressed recording (1,394 messages) 
3. `test_recording` - Test data (300 messages)
4. `large_test_recording.gz` - Large test dataset

## Sentence Types Found in Recordings

### Main Recording (nmea_recording_20250720_003925.json)
- **$IIMWV** (230) - Wind Speed and Angle (Meteorological)
- **$IIVHW** (212) - Water Speed and Heading 
- **$HCHDG** (97) - Heading - Deviation and Variation
- **$GPGLL** (90) - Geographic Position - Latitude/Longitude
- **$TIROT** (73) - Rate of Turn
- **$IIVWR** (41) - Relative Wind Speed and Angle
- **$GPZDA** (20) - Time & Date - UTC, Day, Month, Year
- **$GPVTG** (11) - Track Made Good and Ground Speed
- **$GPRMC** (8) - Recommended Minimum Navigation Information
- **$GPGSA** (2) - GPS DOP and Active Satellites

### Test Recording
- **$IIMWV** (100) - Wind Speed and Angle
- **$IIMWD** (100) - Wind Direction & Speed 
- **$GPRMC** (100) - GPS Navigation Info

## Parser Support Analysis

### ✅ SUPPORTED (Working correctly)
| Sentence | Widget Mapping | Fields Available |
|----------|----------------|------------------|
| **$IIMWV** | WindWidget | windAngle, speed, units, reference |
| **$IIVHW** | SpeedWidget, CompassWidget | speedKnots, degreesMagnetic |
| **$HCHDG** | CompassWidget | heading, deviation, variation |
| **$GPGLL** | GPSWidget | latitude, longitude, time, status |
| **$GPVTG** | SpeedWidget | speedKnots, trackTrue, trackMagnetic |

### ❌ NOT SUPPORTED (Parser fails)
| Sentence | Frequency | Potential Widget | Error |
|----------|-----------|------------------|-------|
| **$IIVWR** | 41 msgs | WindWidget (relative) | "No known parser for sentence ID VWR" |
| **$TIROT** | 73 msgs | CompassWidget (rate of turn) | "No known parser for sentence ID ROT" |
| **$GPRMC** | 8 msgs | GPSWidget, SpeedWidget | "Invalid sentence" (checksum issue) |
| **$IIMWD** | 100 msgs | WindWidget (direction) | "Invalid sentence" (checksum issue) |
| **$GPZDA** | 20 msgs | TimeWidget | Not implemented |
| **$GPGSA** | 2 msgs | GPSWidget (quality) | Not implemented |
| **$GPGSV** | 6 msgs | GPSWidget (satellites) | Not implemented |

## Widget Coverage Analysis

### Available Widgets
- ✅ **WindWidget** - Getting data from $IIMWV
- ✅ **SpeedWidget** - Getting data from $IIVHW, $GPVTG  
- ✅ **CompassWidget** - Getting data from $HCHDG, $IIVHW
- ✅ **GPSWidget** - Getting data from $GPGLL
- ❌ **DepthWidget** - NO depth data in recordings (missing $IIDBT)
- ❌ **EngineWidget** - NO engine data in recordings
- ❌ **BatteryWidget** - NO battery data in recordings
- ❌ **TanksWidget** - NO tank data in recordings
- ❌ **WaterTemperatureWidget** - NO temperature data in recordings

## Recommendations

### 1. Add Support for Missing Parsers
Add custom parsing for unsupported but available sentence types:

```typescript
// Add to parseNmea0183 method
if (sentence.startsWith('$TIROT')) {
  // Parse rate of turn: $TIROT,rate,status*checksum
  const parts = sentence.split(',');
  if (parts.length >= 3) {
    const rate = parseFloat(parts[1]);
    if (!isNaN(rate) && this.shouldUpdate('rateOfTurn')) {
      this.setNmeaData({ rateOfTurn: rate });
    }
  }
  return;
}

if (sentence.startsWith('$IIVWR')) {
  // Parse relative wind: $IIVWR,angle,L/R,speed,N,speed,M,,*checksum
  const parts = sentence.split(',');
  if (parts.length >= 6) {
    const angle = parseFloat(parts[1]);
    const speed = parseFloat(parts[3]);
    if (!isNaN(angle) && !isNaN(speed) && this.shouldUpdate('wind')) {
      this.setNmeaData({ 
        relativeWindAngle: angle,
        relativeWindSpeed: speed 
      });
    }
  }
  return;
}
```

### 2. Fix Checksum Issues
The GPRMC and IIMWD sentences are failing validation. Investigate if:
- Recording has corrupted checksums
- nmea-simple library has strict validation
- Need custom checksum validation

### 3. Widget Enhancements
- **CompassWidget**: Add rate of turn display from $TIROT
- **WindWidget**: Add relative wind from $IIVWR  
- **GPSWidget**: Add time display from $GPZDA
- **GPSWidget**: Add satellite count from $GPGSA/$GPGSV

### 4. Recording Data Gaps
Current recordings lack:
- Depth data ($IIDBT) - DepthWidget will always show "--"
- Engine data ($IIREM) - EngineWidget will always show "--" 
- Battery data - BatteryWidget will always show "--"
- Tank data - TanksWidget will always show "--"

Consider creating synthetic recordings or finding real marine data with these sentence types.

## Current Status: 5/9 Widgets Active
- ✅ Wind, Speed, Compass, GPS widgets display real data
- ❌ Depth, Engine, Battery, Tanks widgets show "--" (no data)
- 🔄 Rate of turn data available but not parsed/displayed