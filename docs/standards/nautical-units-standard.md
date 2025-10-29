# Nautical Units Standard - BMad Autopilot Project

## Overview

This document defines the **Nautical (EU) unit standard** used throughout the BMad Autopilot project, including NMEA Bridge scenarios, vessel profiles, and BMM method documentation.

## Authority

All units follow the **Boating Instruments App Nautical (EU) configuration** as defined in:
- `src/components/dialogs/UnitsConfigDialog.tsx` 
- `src/hooks/useUnitConversion.ts`
- `src/presentation/presentations.ts`

## Standard Unit Definitions

### Navigation & Position
- **Distance**: `nm` (Nautical Miles) - 1 NM = 1852 meters
- **Depth**: `meters` - EU standard (NOT fathoms)  
- **Speed**: `knots` - 1 knot = 1.852 km/h
- **Coordinates**: Decimal Degrees (DD) format internally

### Environmental  
- **Temperature**: `celsius` - EU standard
- **Pressure**: `bar` - EU standard (NOT psi)
- **Wind Speed**: `knots` - maritime standard

### Vessel Parameters
- **Length/Beam/Draft**: `meters` - EU standard
- **Weight/Mass**: `kg` - metric standard
- **Volume**: `liters` - metric standard

### Electrical & Engine
- **Voltage**: `volts`
- **Current**: `amps` 
- **Engine RPM**: `rpm`
- **Flow Rate**: `liters per hour` (lph)

### Angular Measurements
- **Heading/Bearing**: `degrees` (0-360°)
- **Heel/Trim**: `degrees`

## GPS Coordinate Format

### Internal Storage Format
All GPS coordinates are stored as **Decimal Degrees (DD)**:

```yaml
# Example: Coordinates for Brittany, France
gps:
  start_position:
    latitude: 48.63665    # Positive = North
    longitude: -2.02335   # Negative = West
```

### Display Formats Supported
The Boating Instruments App supports multiple display formats:

1. **DD** (Decimal Degrees): `48.63665° N`
2. **DDM** (Degrees Decimal Minutes): `48° 38.199′ N` 
3. **DMS** (Degrees Minutes Seconds): `48° 38′ 11.9″ N`

**Note**: Internal scenarios always use DD format. Display format is user-configurable.

## Implementation Guidelines

### For NMEA Bridge Scenarios  
- Use only approved unit enum values
- Convert existing scenarios from imperial units
- Validate against schema before deployment

### For Vessel Profiles
- Convert manufacturer specifications to Nautical (EU)
- Maintain original values in comments for reference
- Use appropriate precision for maritime applications

---

**Document Version**: 1.0  
**Last Updated**: October 28, 2025  
**Authority**: BMad Autopilot Development Team
