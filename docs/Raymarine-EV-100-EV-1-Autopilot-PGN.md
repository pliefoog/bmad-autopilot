# Raymarine EV-100 EV-1 Autopilot - NMEA 2000 PGN Support

## Overview

This document details the NMEA 2000 Parameter Group Numbers (PGNs) supported by Raymarine EV-100 autopilot system components:
- **EV-1 / EV-2**: Fluxgate compass sensor cores
- **ACU-100**: Autopilot Control Unit

Source: Raymarine Installation Manual Annexes D & E

---

## Annex D: NMEA 2000 PGN - EV-1 and EV-2

EV-1 and EV-2 support the following NMEA 2000 messages.

| PGN    | Message Description                          | Transmit | Receive |
|--------|----------------------------------------------|:--------:|:-------:|
| 59392  | ISO Acknowledgment                           |          | ●       |
| 59904  | ISO Request                                  | ●        | ●       |
| 60928  | ISO Address Claim                            | ●        | ●       |
| 65240  | ISO Commanded Address                        |          | ●       |
| 126208 | NMEA - Request Group Function                | ●        | ●       |
| 126208 | NMEA - Command Group Function                | ●        | ●       |
| 126208 | NMEA - Acknowledge Group Function            | ●        | ●       |
| 126464 | PGN List (Transmit and Receive)              | ●        | ●       |
| 126996 | Product Information                          | ●        |         |
| 127245 | Rudder                                       | ●        | ●       |
| 127250 | Vessel Heading                               | ●        | ●       |
| 127258 | Magnetic Variation                           | ●        |         |
| 128259 | Speed (Water Referenced - STW)               |          | ●       |
| 129026 | COG & SOG, Rapid Update                      |          | ●       |
| 129029 | GNSS Position Data                           |          | ●       |
| 129283 | Cross Track Error                            |          | ●       |
| 129284 | Navigation Data                              |          | ●       |
| 129285 | Navigation - Route/WP Information            |          | ●       |
| 130306 | Wind Data                                    |          | ●       |

### PGN 126996 - Product Information Details

The EV-1/EV-2 transmits the following product information fields:

- NMEA 2000 Database Version
- NMEA Manufacturer's Product Code
- NMEA Manufacturer's Model ID
- Manufacturer's Software Version Code
- Manufacturer's Model Version
- Manufacturer's Model Serial Code
- NMEA 2000 Certification Level
- Load Equivalency

### PGN 129029 - GNSS Position Data Details

The EV-1/EV-2 receives position information including:

- Date
- Time
- Latitude
- Longitude

### PGN 129284 - Navigation Data Details

The EV-1/EV-2 receives the following navigation waypoint data:

- Active Leg Distance to Waypoint (DTW)
- Reference Bearing/Course
- Perpendicular Crossed
- Arrival Circle Entered
- Calculation Type
- Estimated Time of Arrival (ETA)
- Estimated Date of Arrival
- Active Leg Bearing Origin to Destination (BOD)
- Active Leg Bearing to Waypoint (BTW)
- Active Leg Origin Waypoint ID
- Active Waypoint ID
- Destination Waypoint Latitude
- Destination Waypoint Longitude
- Waypoint Closing Velocity

---

## Annex E: NMEA 2000 PGN - ACU (Autopilot Control Unit)

The ACU supports the following NMEA 2000 messages.

| PGN    | Message Description                          | Transmit | Receive |
|--------|----------------------------------------------|:--------:|:-------:|
| 59392  | ISO Acknowledgment                           |          | ●       |
| 59904  | ISO Request                                  | ●        | ●       |
| 60928  | ISO Address Claim                            | ●        | ●       |
| 65240  | ISO Commanded Address                        |          | ●       |
| 126208 | NMEA - Request Group Function                |          | ●       |
| 126208 | NMEA - Command Group Function                |          | ●       |
| 126208 | NMEA - Acknowledge Group Function            | ●        | ●       |
| 126464 | PGN List (Transmit and Receive)              | ●        | ●       |
| 126996 | Product Information                          | ●        |         |
| 127245 | Rudder                                       | ●        | ●       |

### PGN 126996 - Product Information Details

The ACU transmits the following product information fields:

- NMEA 2000 Database Version
- NMEA Manufacturer's Product Code
- NMEA Manufacturer's Model ID
- Manufacturer's Software Version Code
- Manufacturer's Model Version
- Manufacturer's Model Serial Code
- NMEA 2000 Certification Level
- Load Equivalency

---

## Key Differences: EV-1/EV-2 vs ACU

### EV-1/EV-2 (Compass Sensor Core)

**Primary Role:** Heading sensor and data aggregator

- **Transmits:** Heading (127250), Magnetic Variation (127258)
- **Receives:** Navigation data (waypoints, COG/SOG, wind, speed)
- **Function:** Measures vessel heading and forwards navigation data to ACU

### ACU (Autopilot Control Unit)

**Primary Role:** Steering control and rudder feedback

- **Transmits:** Rudder position (127245)
- **Receives:** Rudder commands (127245) from EV-1/EV-2
- **Function:** Controls steering actuator based on heading and navigation commands

---

## Implementation Notes for Simulator

### Current Implementation Status

✅ **PGN 127250 (Vessel Heading)** - Implemented in `pgnParser.ts` and `autopilotService.ts`

### Recommended Additions for Full EV-100 Simulation

1. **PGN 127258 (Magnetic Variation)** - EV-1 transmits this
2. **PGN 127245 (Rudder)** - Bidirectional between EV-1 and ACU
3. **PGN 129026 (COG & SOG Rapid Update)** - EV-1 receives from GPS
4. **PGN 129029 (GNSS Position Data)** - EV-1 receives from GPS
5. **PGN 128259 (Speed Through Water)** - EV-1 receives from speed sensor
6. **PGN 130306 (Wind Data)** - EV-1 receives from wind instrument

### Data Flow Architecture
```
GPS → [PGN 129029, 129026] → EV-1 → [PGN 127250] → ACU → [PGN 127245] → Steering
                                  ↑
Wind Instrument → [PGN 130306] ──┤
Speed Sensor → [PGN 128259] ──────┘
```

---

## References

- Raymarine EV-100 Installation Manual (Dutch version)
- NMEA 2000 Standard (IEC 61162-3)
- Raymarine Product Code: 1574 (EV-1)
- System: Evolution Autopilot

## Related Documentation

- [NMEA Architecture Critical Review](../NMEA-ARCHITECTURE-CRITICAL-REVIEW.md)
- [Autopilot Service Implementation](../boatingInstrumentsApp/src/services/autopilotService.ts)
- [PGN Parser Implementation](../boatingInstrumentsApp/src/services/nmea/pgnParser.ts)

---

**Last Updated:** January 11, 2026  
**Document Version:** 1.0
