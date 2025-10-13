# NMEA Calculated Metrics: Technical Research Document

**Research Date:** October 12, 2025
**Topic:** Calculating Derived Metrics from NMEA Marine Data
**Scope:** Sailboat navigation, wind calculations, position tracking, and performance metrics

---

## Executive Summary

This document provides comprehensive technical information on how to calculate derived metrics from standard NMEA (National Marine Electronics Association) data streams. NMEA 0183 and NMEA 2000 are the industry standards for communication between marine electronics, providing raw sensor data that can be processed to generate higher-level navigation and performance metrics.

Many important sailing and navigation metrics are **calculated/derived** rather than directly measured, requiring algorithms that combine multiple NMEA data sources. This research covers the formulas, data requirements, and practical implementations for the most common calculated parameters.

---

## Table of Contents

1. [NMEA Standards Overview](#nmea-standards-overview)
2. [True Wind Speed and Direction Calculation](#true-wind-speed-and-direction-calculation)
3. [Magnetic Variation/Declination](#magnetic-variation-declination)
4. [Course and Heading Conversions](#course-and-heading-conversions)
5. [Velocity Made Good (VMG)](#velocity-made-good-vmg)
6. [Cross Track Error (XTE)](#cross-track-error-xte)
7. [Other Derived Navigation Parameters](#other-derived-navigation-parameters)
8. [Implementation Considerations](#implementation-considerations)
9. [NMEA Sentence Reference](#nmea-sentence-reference)
10. [Dashboard Integration Guide](#dashboard-integration-guide)
11. [Broadcasting Calculated Metrics](#broadcasting-calculated-metrics)

---

## NMEA Standards Overview

### NMEA 0183

**NMEA 0183** is a combined electrical and data specification using ASCII serial communications protocol. Data is transmitted in "sentences" from one "talker" to multiple "listeners."

**Latest Version:** NMEA 0183 Version 4.30 (December 2023)
- Replaces Version 4.11 (2018)
- Enhanced GNSS support for GPS, GLONASS, GALILEO, BDS, QZSS, and NavIC
- New integrity and high-accuracy positioning sentences

**Sentence Structure:**
```
$<TalkerID><SentenceID>,<Field1>,<Field2>,...,<FieldN>*<Checksum><CR><LF>
```

**Components:**
- **Talker ID:** Two-character device identifier (e.g., GP=GPS, II=Integrated Instrumentation)
- **Sentence ID:** Three-character sentence type (e.g., GGA, RMC, MWV)
- **Data Fields:** Comma-separated values
- **Checksum:** Two-character XOR checksum for data integrity

### Common NMEA Sentence Types

| Sentence | Description | Key Data |
|----------|-------------|----------|
| GGA | Global Positioning System Fix Data | Time, position, fix quality |
| RMC | Recommended Minimum Navigation Info | Time, position, SOG, COG, magnetic variation |
| VTG | Track Made Good and Ground Speed | True track, speed over ground |
| MWV | Wind Speed and Angle | Apparent/True wind speed and angle |
| MWD | Wind Direction and Speed | Wind direction and speed |
| HDG | Heading | Magnetic heading, deviation, variation |
| VHW | Water Speed and Heading | Heading, speed through water |
| APB | Autopilot Sentence B | XTE, bearing to waypoint, steering |
| XTE | Cross-Track Error | Distance off planned track |
| RMB | Recommended Minimum Navigation Info | Range, bearing, XTE to waypoint |
| BOD | Bearing Origin to Destination | True/magnetic bearing between waypoints |

---

## True Wind Speed and Direction Calculation

### Overview

**True Wind** is the actual wind velocity relative to the Earth's surface. Sailboats measure **Apparent Wind** - the wind experienced on the moving vessel, which is a vector combination of the true wind and the boat's velocity.

**Key Concept:** The Apparent Wind vector = True Wind vector + Boat Speed vector

To calculate true wind from apparent wind, we perform **vector subtraction**.

### Required NMEA Data

| Parameter | NMEA Sentence | Field | Description |
|-----------|---------------|-------|-------------|
| Apparent Wind Speed (AWS) | MWV | Field 3 | Wind speed relative to vessel |
| Apparent Wind Angle (AWA) | MWV | Field 1 | Wind angle relative to bow |
| Speed Over Ground (SOG) | RMC or VTG | RMC Field 7 / VTG Field 5 | Vessel speed over ground |
| Course Over Ground (COG) | RMC or VTG | RMC Field 8 / VTG Field 1 | Vessel course over ground |
| Heading (HDT/HDG) | HDT or HDG | Varies | Vessel heading |

### Calculation Method 1: Vector Components (X-Y Coordinates)

This method is ideal for implementation in code/spreadsheets and works with COG/SOG data from GPS.

**Step 1:** Convert Apparent Wind to Earth-referenced coordinates

First, convert AWA (relative to bow) to absolute direction:
```
AWD (Apparent Wind Direction) = Heading + AWA
```

**Step 2:** Calculate velocity components

```
u = SOG × sin(COG) - AWS × sin(AWD)
v = SOG × cos(COG) - AWS × cos(AWD)
```

**Step 3:** Calculate True Wind Speed and Direction

```
TWS (True Wind Speed) = √(u² + v²)
TWD (True Wind Direction) = atan2(u, v)
```

**Note:** All angles should be in radians for trigonometric functions, or ensure your implementation uses degree-based trig functions.

### Calculation Method 2: Polar Coordinates (Simplified Case)

When the boat is sailing on a steady course and you know the heading:

**True Wind Angle (TWA):**
```
TWA = arctan((sin(AWA) × AWS) / (BS + cos(AWA) × AWS))
```

**True Wind Speed (TWS):**
```
TWS = √((sin(AWA) × AWS)² + (BS + cos(AWA) × AWS)²)
```

Where:
- **BS** = Boat Speed (through water)
- **AWS** = Apparent Wind Speed
- **AWA** = Apparent Wind Angle (relative to bow)

### Calculation Method 3: Reverse Calculation (True to Apparent)

If you have true wind and want to calculate what the apparent wind should be:

**Apparent Wind Angle:**
```
AWA = arctan((sin(TWA) × TWS) / (BS + cos(TWA) × TWS))
```

**Apparent Wind Speed:**
```
AWS = √((sin(TWA) × TWS)² + (BS + cos(TWA) × TWS)²)
```

### NMEA Output Format

**MWV Sentence for Apparent Wind (Reference R):**
```
$IIMWV,<angle>,R,<speed>,<units>,A*<checksum>
```
Example: `$IIMWV,045,R,12.5,N,A*2C`
- 45° relative to bow
- 12.5 knots
- Reference: Relative (R)

**MWV Sentence for True Wind (Reference T):**
```
$IIMWV,<angle>,T,<speed>,<units>,A*<checksum>
```
Example: `$IIMWV,270,T,15.2,N,A*1F`
- 270° true (wind from west)
- 15.2 knots
- Reference: True (T)

### Implementation Notes

1. **Coordinate System:** Angles are typically measured clockwise from north (0°/360°)
2. **Units:** Ensure consistent units (knots, m/s, km/h) throughout calculations
3. **Update Rate:** True wind calculations should update at the same rate as the fastest changing input (typically AWS/AWA at 1-10 Hz)
4. **Filtering:** Apply smoothing/filtering to reduce noise, especially in light winds
5. **Edge Cases:** Handle division by zero when boat speed or wind speed approaches zero

---

## Magnetic Variation/Declination

### Overview

**Magnetic Variation** (also called **Magnetic Declination**) is the angle between True North and Magnetic North at a specific location on Earth. This value changes based on:
- Geographic location (latitude/longitude)
- Time (secular variation over years)
- Local magnetic anomalies

**Key Finding:** GPS satellites do NOT transmit magnetic variation data. Most consumer GPS receivers either:
1. Use an internal lookup table based on the World Magnetic Model (WMM)
2. Do not provide magnetic variation at all
3. Provide outdated/approximate values

### NMEA Magnetic Variation Data

**RMC Sentence includes Magnetic Variation:**
```
$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A
```

Fields:
- Field 10: `003.1` - Magnetic variation in degrees
- Field 11: `W` - Direction (E=East, W=West)

**Important Limitations:**

1. **Not all GPS receivers output this field** - SiRF chipsets, for example, do not support magnetic declination
2. **Accuracy varies** - Consumer devices may use simplified models
3. **Update frequency** - Lookup tables may be outdated

### Calculating Magnetic Variation

**Method 1: World Magnetic Model (WMM)**

The WMM is the international standard for magnetic field modeling, maintained by NOAA and the British Geological Survey.

**Implementation Options:**
- Use NOAA's online calculator API
- Implement WMM algorithm (complex, requires spherical harmonics)
- Use third-party libraries (e.g., `geomag` libraries in Python, JavaScript)
- Embed lookup tables with interpolation

**NOAA Calculator:** https://www.ngdc.noaa.gov/geomag-web/

**Method 2: Lookup Tables**

For performance-critical applications, precompute variation values for a grid:
- Resolution: 1° or 5° grid squares
- Include year for temporal interpolation
- Use bilinear interpolation between grid points

**Example Lookup Table Entry:**
```json
{
  "lat": 37.5,
  "lon": -122.5,
  "year": 2025,
  "declination": 13.2,
  "direction": "E"
}
```

### Validation and Updates

**Secular Variation:** Magnetic variation changes over time
- Typical change: 0.1° to 0.5° per year depending on location
- Update lookup tables every 5 years minimum
- WMM is updated every 5 years (latest: WMM2020, valid 2020-2025)

**Testing:** Compare calculated values against known reference points or NOAA calculator

### Implementation Recommendations

**For High Accuracy Applications:**
- Implement full WMM calculation
- Update model coefficients when new WMM releases
- Calculate variation in real-time based on current position

**For Typical Marine Applications:**
- Use lookup table with interpolation
- Update tables from WMM every 5 years
- Adequate for navigation accuracy requirements

**Fallback Strategy:**
- Primary: Calculate from WMM
- Secondary: Use NMEA RMC field if available and recent
- Tertiary: Use last known value for region
- Alert user if data is stale (>5 years old)

---

## Course and Heading Conversions

### Three Types of North and Heading

Navigation uses three different reference systems for direction:

1. **True North** - Geographic North Pole (direction of Earth's axis)
2. **Magnetic North** - Direction a compass needle points (magnetic pole)
3. **Compass North** - What the vessel's compass actually shows (includes local errors)

Correspondingly, there are three types of headings/courses:
- **True Heading/Course (T)** - Relative to True North
- **Magnetic Heading/Course (M)** - Relative to Magnetic North
- **Compass Heading/Course (C)** - What the steering compass shows

### Key Terms

**Variation (Var):** The angle between True North and Magnetic North
- Depends on geographic location
- Changes slowly over time
- East or West designation

**Deviation (Dev):** The angle between Magnetic North and Compass North
- Caused by vessel's magnetic fields (engine, electronics, metal)
- Unique to each vessel
- Varies with vessel's heading
- Determined by compass swing/calibration
- East or West designation

### Conversion Formulas

**The Master Equation:**
```
True Course = Compass Course + Deviation + Variation
```

Or more simply:
```
T = C + Dev + Var
```

**Sign Convention:**
- **Easterly** variation/deviation: Add (+)
- **Westerly** variation/deviation: Subtract (-)

### Mnemonic Devices

**CADET / CDMVT (Compass to True - Add East):**
```
Compass → Deviation → Magnetic → Variation → True
         Add East              Add East
```

**TVMDC (True to Compass - Add West):**
```
True → Variation → Magnetic → Deviation → Compass
      Add West              Add West
```

**Alternative Phrase:** "Can Dead Men Vote Twice" (C-D-M-V-T) with "Add East"

### Detailed Conversion Examples

**Example 1: Compass to True (Easterly)**
- Compass Course: 090° C
- Deviation: 3° E
- Variation: 12° E

```
Magnetic Course = 090° + 3° = 093° M
True Course = 093° + 12° = 105° T
```

**Example 2: Compass to True (Westerly)**
- Compass Course: 270° C
- Deviation: 2° W (-2°)
- Variation: 15° W (-15°)

```
Magnetic Course = 270° - 2° = 268° M
True Course = 268° - 15° = 253° T
```

**Example 3: True to Compass**
- True Course: 180° T
- Variation: 10° E
- Deviation: 5° E

For True to Compass, we reverse the process and subtract Easterly values:
```
Magnetic Course = 180° - 10° = 170° M
Compass Course = 170° - 5° = 165° C
```

### Required NMEA Data

| Parameter | NMEA Sentence | Fields | Notes |
|-----------|---------------|--------|-------|
| Compass Heading | HDG | Field 1 | Magnetic sensor heading |
| Magnetic Heading | HDM | Field 1 | Already compensated for deviation |
| True Heading | HDT | Field 1 | True heading (rare on small vessels) |
| Deviation | HDG | Field 2-3 | Deviation value and E/W |
| Variation | HDG or RMC | HDG: 4-5, RMC: 10-11 | Variation value and E/W |
| Course Over Ground (True) | RMC, VTG | RMC: 8, VTG: 1 | GPS-derived true course |

### HDG Sentence Example

```
$IIHDG,098,,,12,E*1C
```

Fields:
- Field 1: `098` - Magnetic sensor heading (degrees)
- Field 2-3: Empty (no deviation stored)
- Field 4: `12` - Magnetic variation (degrees)
- Field 5: `E` - Variation direction (East)

### Implementation Algorithm

```pseudocode
function convertCompassToTrue(compassCourse, deviation, devDirection, variation, varDirection):
    // Apply deviation
    if devDirection == 'E':
        magneticCourse = compassCourse + deviation
    else:  // 'W'
        magneticCourse = compassCourse - deviation

    // Apply variation
    if varDirection == 'E':
        trueCourse = magneticCourse + variation
    else:  // 'W'
        trueCourse = magneticCourse - variation

    // Normalize to 0-360
    trueCourse = trueCourse % 360
    if trueCourse < 0:
        trueCourse += 360

    return trueCourse

function convertTrueToCompass(trueCourse, deviation, devDirection, variation, varDirection):
    // Apply variation (reverse)
    if varDirection == 'E':
        magneticCourse = trueCourse - variation
    else:  // 'W'
        magneticCourse = trueCourse + variation

    // Apply deviation (reverse)
    if devDirection == 'E':
        compassCourse = magneticCourse - deviation
    else:  // 'W'
        compassCourse = magneticCourse + deviation

    // Normalize to 0-360
    compassCourse = compassCourse % 360
    if compassCourse < 0:
        compassCourse += 360

    return compassCourse
```

### Deviation Tables

**Compass Deviation** varies by vessel heading. It is determined during a **compass swing** and recorded in a **deviation table**.

**Example Deviation Table:**

| Ship's Head (Mag) | Deviation | Compass Heading |
|-------------------|-----------|-----------------|
| 000° M | 5° E | 355° C |
| 030° M | 4° E | 026° C |
| 060° M | 2° E | 058° C |
| 090° M | 0° | 090° C |
| 120° M | 2° W | 122° C |
| 150° M | 4° W | 154° C |
| 180° M | 5° W | 185° C |
| ... | ... | ... |

**Interpolation:** For headings between table values, use linear interpolation.

### Practical Considerations

1. **Perform Regular Compass Swings:** Deviation can change when:
   - New electronic equipment is installed
   - Metal cargo or equipment is moved
   - Vessel undergoes structural changes
   - Every 1-2 years as best practice

2. **GPS Course vs. Compass:**
   - GPS COG is TRUE course
   - Compass heading is COMPASS or MAGNETIC
   - Never mix reference systems in calculations

3. **Rate Gyro Compasses:** Modern gyro compasses may output true heading directly (HDT sentence)

4. **Electronic Compasses:** Often include automatic deviation compensation, outputting magnetic heading (HDM sentence)

---

## Velocity Made Good (VMG)

### Overview

**Velocity Made Good (VMG)** represents the component of a vessel's speed toward a specific target - either a waypoint (VMC) or the wind direction (VMG upwind/downwind).

**Why VMG Matters:**
- Sailboats cannot sail directly into the wind
- Optimal sailing angle balances pointing ability vs. boat speed
- In racing, highest average VMG wins on windward/leeward courses
- Critical for tactical decision-making

### VMG Types

**1. VMG to Waypoint (also called VMC - Velocity Made Good on Course)**
- Component of speed toward a geographic destination
- Independent of wind direction
- Used for passage planning and ETA calculations

**2. VMG to Wind (VMG Upwind/Downwind)**
- Component of speed toward or away from wind direction
- Used for optimizing sailing angles
- Critical for racing performance

### Required NMEA Data

**For VMG to Waypoint (VMC):**

| Parameter | NMEA Sentence | Field | Description |
|-----------|---------------|-------|-------------|
| Speed Over Ground (SOG) | RMC or VTG | RMC: 7, VTG: 5 | Vessel speed |
| Course Over Ground (COG) | RMC or VTG | RMC: 8, VTG: 1 | Vessel course |
| Waypoint Latitude | RMB or APB | RMB: 5-7 | Destination position |
| Waypoint Longitude | RMB or APB | RMB: 6-8 | Destination position |
| Current Position | GGA or RMC | Varies | Vessel position |

**For VMG to Wind:**

| Parameter | NMEA Sentence | Field | Description |
|-----------|---------------|-------|-------------|
| Boat Speed (BS) | VHW | Field 5 | Speed through water |
| True Wind Angle (TWA) | MWV (T) | Field 1 | Wind angle off bow |
| True Wind Speed (TWS) | MWV (T) | Field 3 | True wind speed |
| Speed Over Ground (SOG) | RMC or VTG | Varies | Alternative to BS |

### VMG to Waypoint Calculation

**Formula:**
```
VMG = SOG × cos(θ)
```

Where `θ` is the angle between the vessel's course (COG) and the bearing to the waypoint.

**Step-by-Step Algorithm:**

1. **Calculate bearing to waypoint** (using great circle or rhumb line formula)
2. **Calculate angle difference** between COG and waypoint bearing
3. **Apply cosine formula**

**Example:**
- SOG: 6.5 knots
- COG: 045° T
- Bearing to waypoint: 030° T
- Angle difference: |045° - 030°| = 15°

```
VMG = 6.5 × cos(15°) = 6.5 × 0.9659 = 6.28 knots
```

### VMG to Wind Calculation

**Formula:**
```
VMG = BS × cos(TWA)
```

Where:
- **BS** = Boat Speed (through water)
- **TWA** = True Wind Angle (angle between heading and true wind direction)

**Sign Convention:**
- **Positive VMG** = making progress to windward
- **Negative VMG** = making progress downwind
- **Zero VMG** = sailing at 90° to wind (beam reach)

**Example 1 - Upwind:**
- Boat Speed: 6.0 knots
- True Wind Angle: 45° (close hauled)

```
VMG upwind = 6.0 × cos(45°) = 6.0 × 0.707 = 4.24 knots
```

**Example 2 - Downwind:**
- Boat Speed: 7.5 knots
- True Wind Angle: 135° (broad reach)

```
VMG downwind = 7.5 × cos(135°) = 7.5 × (-0.707) = -5.30 knots
```

The negative value indicates downwind progress.

### VMG Optimization

**Target VMG:** Racing sailboats use polar diagrams to determine optimal angles for maximum VMG.

**Polar Speed Charts** show boat speed at different wind speeds and angles. The optimal VMG angle is found by:

1. Draw a line from the wind origin (0,0) tangent to the polar curve
2. The tangent point shows the optimal TWA for maximum VMG
3. Typically occurs at 40-50° for upwind, 140-150° for downwind

**Real-time Optimization:**
- Compare actual VMG to target VMG from polars
- Adjust heading and sail trim to maximize VMG
- Monitor continuously as wind conditions change

### NMEA Output

**RMB Sentence includes VMC:**
```
$GPRMB,A,0.66,L,003,004,4917.24,N,12309.57,W,001.3,052.5,000.5,V*20
```

Fields relevant to VMG:
- Field 10: `001.3` - Range to waypoint (nautical miles)
- Field 11: `052.5` - Bearing to waypoint (degrees true)
- Field 12: `000.5` - Closing velocity (VMC in knots)

**Custom VMG Sentence (Proprietary):**
Many instruments output custom sentences for performance data:
```
$IIVMG,4.24,T,5.30,T*<checksum>
```
- VMG upwind: 4.24 knots
- VMG downwind: 5.30 knots (shown as positive)

### Implementation Pseudocode

```pseudocode
function calculateVMGtoWaypoint(SOG, COG, waypointLat, waypointLon, currentLat, currentLon):
    // Calculate bearing to waypoint
    bearing = calculateBearing(currentLat, currentLon, waypointLat, waypointLon)

    // Calculate angle difference
    angleDiff = abs(COG - bearing)

    // Normalize to 0-180
    if angleDiff > 180:
        angleDiff = 360 - angleDiff

    // Calculate VMG
    VMG = SOG * cos(radians(angleDiff))

    return VMG

function calculateVMGtoWind(boatSpeed, trueWindAngle):
    // Ensure TWA is 0-180 (take absolute value of both sides of bow)
    TWA = abs(trueWindAngle)
    if TWA > 180:
        TWA = 360 - TWA

    // Calculate VMG (positive = upwind, negative = downwind)
    VMG = boatSpeed * cos(radians(TWA))

    return VMG

function getTargetVMGfromPolars(polarData, trueWindSpeed, mode):
    // mode: 'upwind' or 'downwind'
    // polarData: lookup table of boat speed vs TWA at given TWS

    maxVMG = 0
    optimalTWA = 0

    if mode == 'upwind':
        angleRange = range(30, 60)  // Search 30-60 degrees
    else:
        angleRange = range(120, 160)  // Search 120-160 degrees

    for TWA in angleRange:
        boatSpeed = interpolatePolars(polarData, TWA, trueWindSpeed)
        VMG = boatSpeed * cos(radians(TWA))

        if abs(VMG) > abs(maxVMG):
            maxVMG = VMG
            optimalTWA = TWA

    return (maxVMG, optimalTWA)
```

### Performance Metrics Display

**Typical Racing Display:**
```
Target Speed:  7.2 kts    (from polars at current TWA/TWS)
Boat Speed:    6.8 kts    (actual)
Target VMG:    4.5 kts    (optimal from polars)
Actual VMG:    4.2 kts    (current performance)
VMG %:         93%        (actual/target)
Optimal TWA:   42°        (for max VMG)
Current TWA:   45°        (actual)
```

### Practical Considerations

1. **Use STW not SOG for Wind VMG:** Boat Speed through water (from paddlewheel/log) is correct for wind VMG. SOG includes current effects.

2. **Current Compensation:** For VMG to waypoint, SOG is correct as it includes current effects.

3. **Tacking/Gybing Decisions:** VMG helps determine when course changes improve performance.

4. **Update Rate:** Calculate VMG at 1 Hz or faster for responsive feedback.

5. **Filtering:** Apply smoothing to reduce oscillations, especially in choppy conditions.

---

## Cross Track Error (XTE)

### Overview

**Cross Track Error (XTE)**, also called **Cross Track Distance (XTD)**, is the perpendicular distance between a vessel's current position and the intended track line.

**Use Cases:**
- Autopilot steering corrections
- Navigation accuracy monitoring
- Alert generation when exceeding limits
- Route following in constrained waters

### Required NMEA Data

| Parameter | NMEA Sentence | Field | Description |
|-----------|---------------|-------|-------------|
| Cross Track Error | XTE | Field 3 | Distance off track |
| XTE Direction | XTE | Field 4 | L (left) or R (right) |
| XTE Units | XTE | Field 5 | N (nautical miles) or K (km) |
| Current Position | GGA or RMC | Varies | Vessel position |
| Origin Waypoint | RMB | Fields 2-3 | Start of leg |
| Destination Waypoint | RMB | Fields 5-7 | End of leg |

### NMEA Sentence Formats

**XTE Sentence:**
```
$GPXTE,A,A,0.67,L,N*6F
```

Fields:
- Field 1: `A` = Valid (V = warning/invalid)
- Field 2: `A` = Cycle lock flag (not used for GPS)
- Field 3: `0.67` = Cross track error magnitude
- Field 4: `L` = Direction to steer (L=left, R=right) to correct
- Field 5: `N` = Units (N=nautical miles, K=kilometers)

**APB Sentence (Autopilot Sentence B - includes XTE):**
```
$GPAPB,A,A,0.10,R,N,V,V,011.2,M,DEST,011.2,M,011.2,M*3C
```

Relevant fields:
- Field 3: `0.10` = Cross track error magnitude
- Field 4: `R` = Steer right to correct
- Field 5: `N` = Units

**RMB Sentence (Recommended Minimum Navigation Information):**
```
$GPRMB,A,0.66,L,003,004,4917.24,N,12309.57,W,001.3,052.5,000.5,V*20
```

Fields:
- Field 2: `0.66` = Cross track error (nm)
- Field 3: `L` = Steer left to correct

### Calculating XTE

**Method 1: Great Circle XTE**

For longer distances, use great circle calculations (spherical geometry):

**Formula:**
```
XTE = asin(sin(distance_SO) × sin(bearing_SO - bearing_SD)) × R
```

Where:
- **distance_SO** = Great circle distance from Start to Observer (vessel)
- **bearing_SO** = Initial bearing from Start to Observer
- **bearing_SD** = Initial bearing from Start to Destination
- **R** = Earth's radius (3440.065 nm or 6371 km)

**Step-by-Step:**

1. Calculate distance and bearing from Start waypoint to current position (Observer)
2. Calculate bearing from Start waypoint to Destination waypoint
3. Find the angular difference between the bearings
4. Apply the cross track formula
5. Determine direction (left/right)

**Detailed Algorithm:**

```pseudocode
function calculateGreatCircleXTE(startLat, startLon, destLat, destLon, currentLat, currentLon):
    // Constants
    R = 3440.065  // Earth radius in nautical miles

    // Calculate distance from start to current position
    dist_SO = greatCircleDistance(startLat, startLon, currentLat, currentLon)

    // Calculate bearings
    bearing_SO = initialBearing(startLat, startLon, currentLat, currentLon)
    bearing_SD = initialBearing(startLat, startLon, destLat, destLon)

    // Calculate XTE in radians
    XTE_radians = asin(sin(dist_SO / R) * sin(radians(bearing_SO - bearing_SD)))

    // Convert to nautical miles
    XTE_nm = XTE_radians * R

    // Determine direction
    if (bearing_SO - bearing_SD + 360) % 360 > 180:
        direction = 'L'  // Steer left
    else:
        direction = 'R'  // Steer right

    return (abs(XTE_nm), direction)
```

**Method 2: Rhumb Line XTE**

For shorter distances or when constant-bearing navigation is used:

**Formula:**
```
XTE = distance_SO × sin(bearing_SO - bearing_SD)
```

This is simpler but less accurate over long distances.

**Method 3: Perpendicular Distance (Cartesian Approximation)**

For very short distances in small areas, use Cartesian approximation:

1. Convert lat/lon to local XY coordinates (meters)
2. Calculate perpendicular distance from point to line
3. Convert back to nautical miles

**Formula:**
```
XTE = |ax + by + c| / √(a² + b²)
```

Where the track line equation is: ax + by + c = 0

### XTE Direction Convention

**Left (L) vs. Right (R):**

The direction indicates **which way to steer** to get back on track:

- **L (Left):** Vessel is to the RIGHT of track → Steer LEFT to correct
- **R (Right):** Vessel is to the LEFT of track → Steer RIGHT to correct

**Visual Representation:**
```
Start ----------------> Destination

Case 1: Vessel is below track line
Start ----V----------- Destination
          (Vessel is to RIGHT of track → Steer LEFT → XTE: L)

Case 2: Vessel is above track line
          V
Start --------------- Destination
          (Vessel is to LEFT of track → Steer RIGHT → XTE: R)
```

### Autopilot Integration

**PID Controller for XTE Correction:**

Autopilots use XTE as input to a PID (Proportional-Integral-Derivative) controller:

```pseudocode
function autopilotSteering(XTE, XTE_direction, XTE_rate):
    // PID gains (tuned for vessel)
    Kp = 2.0   // Proportional gain
    Ki = 0.1   // Integral gain
    Kd = 0.5   // Derivative gain

    // Convert direction to sign
    if XTE_direction == 'R':
        XTE_signed = XTE
    else:
        XTE_signed = -XTE

    // Calculate PID terms
    P = Kp * XTE_signed
    I = Ki * integral(XTE_signed)  // Accumulated error
    D = Kd * XTE_rate               // Rate of change

    // Calculate steering correction (degrees)
    correction = P + I + D

    // Limit correction angle
    correction = clamp(correction, -30, 30)

    return correction
```

### XTE Alerts and Limits

**Typical Alert Thresholds:**

| Scenario | XTE Limit | Action |
|----------|-----------|--------|
| Open ocean passage | 0.5 - 1.0 nm | Warning alarm |
| Coastal navigation | 0.1 - 0.25 nm | Warning alarm |
| Harbor approach | 0.05 nm (100m) | Critical alarm |
| Narrow channel | 0.02 nm (37m) | Critical alarm + visual |

**Implementation:**
```pseudocode
function checkXTEalerts(XTE, XTE_units, navigationMode):
    // Convert to nautical miles
    if XTE_units == 'K':
        XTE_nm = XTE / 1.852
    else:
        XTE_nm = XTE

    // Define thresholds based on mode
    if navigationMode == 'OCEAN':
        warnThreshold = 0.5
        criticalThreshold = 1.0
    elif navigationMode == 'COASTAL':
        warnThreshold = 0.15
        criticalThreshold = 0.25
    elif navigationMode == 'HARBOR':
        warnThreshold = 0.03
        criticalThreshold = 0.05

    // Check and alert
    if XTE_nm > criticalThreshold:
        triggerAlarm('CRITICAL', 'XTE exceeds safe limit')
    elif XTE_nm > warnThreshold:
        triggerAlarm('WARNING', 'Off track')
    else:
        clearAlarm()
```

### Practical Considerations

1. **GPS Accuracy:** XTE accuracy depends on GPS position accuracy (typically ±5-10m for consumer GPS)

2. **Update Rate:** XTE should update at 1 Hz minimum for smooth autopilot operation

3. **Route Segments:** When approaching a waypoint, the track line reference changes to the next leg - this can cause sudden XTE jumps

4. **GoTo vs. Route:**
   - **GoTo:** Track starts from position when GoTo was initiated
   - **Route:** Track is pre-defined between waypoints

5. **Wind/Current:** XTE shows deviation from track but doesn't indicate cause (steering error vs. environmental forces)

6. **Filtering:** Apply smoothing to reduce GPS position noise effects on XTE

---

## Other Derived Navigation Parameters

### 1. Bearing and Distance to Waypoint

**Required Data:** Current position (GGA/RMC), Waypoint position

**Great Circle Bearing Formula:**
```
bearing = atan2(sin(Δλ) × cos(φ₂),
                cos(φ₁) × sin(φ₂) - sin(φ₁) × cos(φ₂) × cos(Δλ))
```

Where:
- φ₁, φ₂ = latitude of point 1 and point 2 (radians)
- Δλ = difference in longitude (radians)

**Great Circle Distance Formula (Haversine):**
```
a = sin²(Δφ/2) + cos(φ₁) × cos(φ₂) × sin²(Δλ/2)
c = 2 × atan2(√a, √(1-a))
distance = R × c
```

Where R = Earth radius (3440.065 nm)

**NMEA Output:** RMB, BOD sentences

### 2. Estimated Time of Arrival (ETA) / Time to Go (TTG)

**Required Data:** Distance to waypoint, Speed Over Ground (SOG)

**Formula:**
```
TTG (hours) = Distance (nm) / SOG (knots)
ETA = Current Time + TTG
```

**Considerations:**
- Use VMC instead of SOG for better accuracy
- Account for tides and currents
- Update continuously as speed varies

**NMEA Output:** Custom proprietary sentences, or calculated from RMB/RMC data

### 3. Heel Angle and Leeway

**Heel Angle:**
- Measured directly by: Accelerometers / IMU
- NMEA: XDR sentence (transducer measurements)

**Leeway (Side Slip):**

Leeway is the sideways drift of a sailboat due to wind pressure.

**Estimation Formula:**
```
Leeway angle = k × (Heel angle)
```

Where k is a boat-specific constant (typically 0.05 to 0.15)

**More Accurate Calculation:**
```
Leeway angle = arctan((SOG × sin(COG - HDG)) / (SOG × cos(COG - HDG)))
```

Requires:
- Heading (HDG)
- Course Over Ground (COG)
- Speed Over Ground (SOG)

**Effect on True Course:**
```
True Course Made Good = Heading + Leeway angle
```

### 4. Speed Through Water (STW) vs. Speed Over Ground (SOG)

**Current Velocity:**
```
Current Vector = SOG Vector - STW Vector
```

**Current Set (Direction):**
```
Current Set = atan2(SOG_x - STW_x, SOG_y - STW_y)
```

**Current Drift (Speed):**
```
Current Drift = √((SOG_x - STW_x)² + (SOG_y - STW_y)²)
```

**Required Data:**
- SOG: From RMC/VTG (GPS)
- STW: From VHW (paddle wheel / electromagnetic log)
- Heading: From HDG/HDT

### 5. Rate of Turn (ROT)

**Calculation:**
```
ROT (degrees/minute) = (Current Heading - Previous Heading) / Time Interval × 60
```

**NMEA Output:** ROT sentence
```
$GPROT,35.6,A*<checksum>
```
- Field 1: 35.6 degrees/minute
- Field 2: A = valid

**Uses:**
- Autopilot control
- Collision avoidance (ARPA)
- Turn radius calculation

### 6. Set and Drift

**Set:** Direction of current (degrees True)
**Drift:** Speed of current (knots)

**Calculation requires:**
- At least two position fixes separated in time
- Dead reckoning position (based on heading and STW)
- Actual position (from GPS)

**Formula:**
```
Set = atan2(Actual_Lon - DR_Lon, Actual_Lat - DR_Lat)
Drift = distance(DR_position, Actual_position) / time_interval
```

### 7. Arrival Alert / Waypoint Proximity

**Arrival Circle:** Defined radius around waypoint

**Check:**
```
if distance_to_waypoint < arrival_radius:
    trigger_arrival_alert()
```

Typical radius: 0.05 to 0.25 nm depending on navigation context

**NMEA:** RMB Field 1 shows arrival status (A = arrived, V = not arrived)

### 8. Depth Below Keel (DBK)

**Given:**
- Depth Below Transducer (DBT) - measured
- Transducer Offset (keel to transducer distance)

**Calculation:**
```
DBK = DBT - transducer_offset
```

**NMEA Sentences:**
- DBT: Depth Below Transducer
- DBK: Depth Below Keel
- DBS: Depth Below Surface

### 9. Tidal Height and Correction

**Tidal Height Calculation:** Requires:
- Tide station data
- Current time
- Vessel position

**Formula (Harmonic Method):**
```
Height = Mean_Level + Σ(A_n × cos(ω_n × t + φ_n))
```

Where:
- A_n = Amplitude of constituent n
- ω_n = Angular frequency of constituent n
- φ_n = Phase of constituent n
- t = Time

Typically computed from tide tables or external API, not directly from NMEA data.

**Application:**
```
Depth_Corrected = Depth_Sounded + (Current_Tide_Height - Chart_Datum)
```

### 10. Sail Performance Ratios

**Polar Performance:**
```
Performance % = (Actual Boat Speed / Target Polar Speed) × 100
```

**Target Beat Angle (TBA):**

Optimal upwind angle for maximum VMG from polar diagram.

**Target Gybe Angle (TGA):**

Optimal downwind angle for maximum VMG from polar diagram.

**Target Speed (from Polars):**

Look up speed from polar table based on TWA and TWS:
```
Target_Speed = polarLookup(TWA, TWS)
```

### 11. Wind Shear and Gradient

**Wind Gradient (altitude/height adjustment):**

Wind speed varies with height above water.

**Formula (Power Law):**
```
V_h = V_ref × (h / h_ref)^α
```

Where:
- V_h = Wind speed at height h
- V_ref = Reference wind speed at height h_ref
- α = Wind shear exponent (typically 0.11 to 0.14 over water)

**Example:**
- Wind at 10m (masthead): 15 knots
- Calculate wind at 2m (deck level):

```
V_2m = 15 × (2/10)^0.11 = 15 × 0.82 = 12.3 knots
```

Not directly from NMEA, but useful for wind instrument placement corrections.

---

## Implementation Considerations

### 1. Data Quality and Validation

**GPS Fix Quality (GGA Sentence Field 6):**
- 0 = Invalid
- 1 = GPS fix (SPS)
- 2 = DGPS fix
- 3 = PPS fix
- 4 = Real Time Kinematic (RTK)
- 5 = Float RTK
- 6 = Estimated (dead reckoning)

**Validation Checks:**
- Reject data with invalid fix quality
- Check HDOP (Horizontal Dilution of Precision) < 2.0 for good accuracy
- Verify checksum on all NMEA sentences
- Implement timeout detection (data staleness)

### 2. Update Rates and Timing

**Typical NMEA Data Rates:**

| Data Type | Typical Rate | Max Useful Rate |
|-----------|--------------|-----------------|
| GPS Position (GGA/RMC) | 1 Hz | 10 Hz |
| Heading (HDG/HDT) | 1-10 Hz | 20 Hz |
| Wind (MWV) | 1-10 Hz | 20 Hz |
| Depth (DBT/DBK) | 1 Hz | 5 Hz |
| Speed (VHW) | 1 Hz | 10 Hz |

**Synchronization:**
- Timestamp all incoming data
- Use most recent data for calculations
- Implement interpolation for rate mismatches

### 3. Coordinate Systems and Conversions

**Latitude/Longitude Formats:**

NMEA uses **DDDMM.MMMM** format:
- Degrees: Fixed width (2 for lat, 3 for lon)
- Minutes: Decimal minutes

**Conversion to Decimal Degrees:**
```pseudocode
function nmeaToDecimal(nmea_coord, hemisphere):
    if len(nmea_coord) == 9:  // Latitude (DDMM.MMMM)
        degrees = int(nmea_coord[0:2])
        minutes = float(nmea_coord[2:])
    else:  // Longitude (DDDMM.MMMM)
        degrees = int(nmea_coord[0:3])
        minutes = float(nmea_coord[3:])

    decimal = degrees + (minutes / 60.0)

    if hemisphere in ['S', 'W']:
        decimal = -decimal

    return decimal
```

**Example:**
- NMEA: `3723.2475,N`
- Decimal: 37 + (23.2475/60) = 37.387458° N

### 4. Unit Conversions

**Speed:**
- 1 knot = 1.852 km/h = 0.514444 m/s
- 1 m/s = 1.94384 knots

**Distance:**
- 1 nautical mile = 1.852 km = 1852 meters
- 1 degree latitude ≈ 60 nautical miles

**Angle:**
- Convert degrees to radians: `radians = degrees × π / 180`
- Convert radians to degrees: `degrees = radians × 180 / π`

### 5. Error Handling

**Common Issues:**

1. **Missing Fields:** NMEA sentences may have empty fields
2. **Invalid Checksums:** Detect and reject corrupted data
3. **Out of Range Values:** Validate data ranges (e.g., lat: -90 to 90)
4. **Data Staleness:** Implement timeout detection
5. **Sensor Failures:** Graceful degradation when sensors fail

**Best Practices:**
```pseudocode
function parseNMEA(sentence):
    // Validate checksum
    if not validateChecksum(sentence):
        log_error("Invalid checksum")
        return None

    // Parse fields
    fields = sentence.split(',')

    // Check required fields exist and are not empty
    for field in required_fields:
        if field >= len(fields) or fields[field] == '':
            log_warning("Missing required field")
            return None

    // Validate data ranges
    if not validateRanges(fields):
        log_warning("Data out of range")
        return None

    // Check timestamp freshness
    if timestamp_age > MAX_AGE:
        log_warning("Stale data")
        return None

    return parsedData
```

### 6. Filtering and Smoothing

**Exponential Moving Average (EMA):**
```pseudocode
function EMA_filter(new_value, previous_ema, alpha):
    // alpha: smoothing factor (0 < alpha < 1)
    // lower alpha = more smoothing
    return alpha * new_value + (1 - alpha) * previous_ema
```

**Typical alpha values:**
- Position: 0.2 - 0.3 (moderate smoothing)
- Speed: 0.3 - 0.5 (light smoothing)
- Wind: 0.1 - 0.2 (heavy smoothing due to gusts)

**Kalman Filter:**

For more sophisticated applications, implement Kalman filtering for optimal state estimation combining multiple sensor inputs.

### 7. Circular Statistics (Angles)

**Averaging Angles:**

Cannot simply average angles (e.g., average of 350° and 10° is not 180°!)

**Correct Method:**
```pseudocode
function averageAngles(angles):
    sum_sin = 0
    sum_cos = 0

    for angle in angles:
        sum_sin += sin(radians(angle))
        sum_cos += cos(radians(angle))

    avg_sin = sum_sin / len(angles)
    avg_cos = sum_cos / len(angles)

    avg_angle = degrees(atan2(avg_sin, avg_cos))

    // Normalize to 0-360
    if avg_angle < 0:
        avg_angle += 360

    return avg_angle
```

### 8. Performance Optimization

**For Real-time Systems:**

1. **Pre-compute constants:** Trigonometric tables, conversion factors
2. **Avoid repeated calculations:** Cache intermediate results
3. **Use integer math where possible:** GPS coordinates to fixed-point
4. **Batch updates:** Process multiple sentences before recalculating derived values
5. **Prioritize calculations:** High-priority (autopilot) vs. low-priority (statistics)

### 9. Testing and Validation

**Unit Tests:**
- Test conversion functions with known values
- Validate trigonometric calculations
- Check edge cases (poles, date line, etc.)

**Integration Tests:**
- Use recorded NMEA logs from actual voyages
- Compare calculated values to known good instruments
- Simulate various scenarios (calm, rough, high speed, etc.)

**Test Data Sources:**
- NMEA simulators (GPSd, OpenCPN)
- Recorded logs from instrumented vessels
- Synthetic data generators

---

## NMEA Sentence Reference

### Essential Sentences for Calculated Metrics

#### GGA - Global Positioning System Fix Data
```
$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47
```

| Field | Example | Description |
|-------|---------|-------------|
| 1 | 123519 | UTC Time (hhmmss) |
| 2 | 4807.038 | Latitude (ddmm.mmmm) |
| 3 | N | Latitude hemisphere (N/S) |
| 4 | 01131.000 | Longitude (dddmm.mmmm) |
| 5 | E | Longitude hemisphere (E/W) |
| 6 | 1 | Fix quality (0=invalid, 1=GPS, 2=DGPS, etc.) |
| 7 | 08 | Number of satellites |
| 8 | 0.9 | Horizontal dilution of precision (HDOP) |
| 9 | 545.4 | Altitude above MSL (meters) |
| 10 | M | Altitude units (meters) |
| 11 | 46.9 | Geoidal separation (meters) |
| 12 | M | Separation units (meters) |
| 13 | (empty) | Age of DGPS data (seconds) |
| 14 | (empty) | DGPS station ID |

#### RMC - Recommended Minimum Navigation Information
```
$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A
```

| Field | Example | Description |
|-------|---------|-------------|
| 1 | 123519 | UTC Time (hhmmss) |
| 2 | A | Status (A=active/valid, V=void/invalid) |
| 3 | 4807.038 | Latitude (ddmm.mmmm) |
| 4 | N | Latitude hemisphere |
| 5 | 01131.000 | Longitude (dddmm.mmmm) |
| 6 | E | Longitude hemisphere |
| 7 | 022.4 | Speed over ground (knots) |
| 8 | 084.4 | Course over ground (degrees true) |
| 9 | 230394 | Date (ddmmyy) |
| 10 | 003.1 | Magnetic variation (degrees) |
| 11 | W | Variation direction (E/W) |

#### MWV - Wind Speed and Angle
```
$IIMWV,045,R,12.5,N,A*2C
```

| Field | Example | Description |
|-------|---------|-------------|
| 1 | 045 | Wind angle (0-180° left, 180-360° right OR 0-359°) |
| 2 | R | Reference (R=Relative/Apparent, T=True) |
| 3 | 12.5 | Wind speed |
| 4 | N | Speed units (K=km/h, M=m/s, N=knots, S=statute miles/h) |
| 5 | A | Status (A=valid, V=invalid) |

#### HDG - Heading, Deviation, and Variation
```
$IIHDG,098,,,12,E*1C
```

| Field | Example | Description |
|-------|---------|-------------|
| 1 | 098 | Magnetic sensor heading (degrees) |
| 2 | (empty) | Magnetic deviation (degrees) |
| 3 | (empty) | Deviation direction (E/W) |
| 4 | 12 | Magnetic variation (degrees) |
| 5 | E | Variation direction (E/W) |

#### VHW - Water Speed and Heading
```
$IIVHW,,,098,M,6.5,N,12.0,K*5A
```

| Field | Example | Description |
|-------|---------|-------------|
| 1 | (empty) | Heading degrees true |
| 2 | (empty) | T (true) |
| 3 | 098 | Heading degrees magnetic |
| 4 | M | M (magnetic) |
| 5 | 6.5 | Speed through water (knots) |
| 6 | N | N (knots) |
| 7 | 12.0 | Speed through water (km/h) |
| 8 | K | K (km/h) |

#### VTG - Track Made Good and Ground Speed
```
$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K*48
```

| Field | Example | Description |
|-------|---------|-------------|
| 1 | 054.7 | Track degrees true |
| 2 | T | T (true) |
| 3 | 034.4 | Track degrees magnetic |
| 4 | M | M (magnetic) |
| 5 | 005.5 | Speed over ground (knots) |
| 6 | N | N (knots) |
| 7 | 010.2 | Speed over ground (km/h) |
| 8 | K | K (km/h) |

#### XTE - Cross-Track Error
```
$GPXTE,A,A,0.67,L,N*6F
```

| Field | Example | Description |
|-------|---------|-------------|
| 1 | A | Status (A=valid, V=warning) |
| 2 | A | Cycle lock flag (not used for GPS) |
| 3 | 0.67 | Cross track error magnitude |
| 4 | L | Direction to steer (L=left, R=right) |
| 5 | N | Units (N=nautical miles, K=kilometers) |

#### RMB - Recommended Minimum Navigation Information
```
$GPRMB,A,0.66,L,003,004,4917.24,N,12309.57,W,001.3,052.5,000.5,V*20
```

| Field | Example | Description |
|-------|---------|-------------|
| 1 | A | Status (A=active, V=void) |
| 2 | 0.66 | Cross track error (nm, max 9.9) |
| 3 | L | Direction to steer (L/R) |
| 4 | 003 | Origin waypoint ID |
| 5 | 004 | Destination waypoint ID |
| 6 | 4917.24 | Destination waypoint latitude |
| 7 | N | Destination latitude hemisphere |
| 8 | 12309.57 | Destination waypoint longitude |
| 9 | W | Destination longitude hemisphere |
| 10 | 001.3 | Range to destination (nm) |
| 11 | 052.5 | Bearing to destination (degrees true) |
| 12 | 000.5 | Destination closing velocity (VMC, knots) |
| 13 | V | Arrival status (A=arrived, V=not arrived) |

#### APB - Autopilot Sentence B
```
$GPAPB,A,A,0.10,R,N,V,V,011.2,M,DEST,011.2,M,011.2,M*3C
```

| Field | Example | Description |
|-------|---------|-------------|
| 1 | A | Status (A=valid, V=warning) |
| 2 | A | Status (A=valid, V=warning) |
| 3 | 0.10 | Cross track error magnitude |
| 4 | R | Direction to steer (L/R) |
| 5 | N | Cross track units (N=nm, K=km) |
| 6 | V | Arrival circle entered (A=entered, V=not entered) |
| 7 | V | Perpendicular passed at waypoint (A/V) |
| 8 | 011.2 | Bearing origin to destination (degrees) |
| 9 | M | Bearing type (M=magnetic, T=true) |
| 10 | DEST | Destination waypoint ID |
| 11 | 011.2 | Bearing present position to destination |
| 12 | M | Bearing type (M=magnetic, T=true) |
| 13 | 011.2 | Heading to steer to destination |
| 14 | M | Heading type (M=magnetic, T=true) |

---

## Conclusion

This document has covered the primary calculated/derived metrics available from NMEA data streams:

1. **True Wind Speed and Direction** - Critical for sailing performance
2. **Magnetic Variation/Declination** - Essential for accurate navigation
3. **Course and Heading Conversions** - Converting between true, magnetic, and compass references
4. **VMG (Velocity Made Good)** - Optimizing sailing angles and route efficiency
5. **Cross Track Error** - Staying on course and autopilot integration
6. **Additional Parameters** - Bearing/distance, ETA, leeway, current set/drift, and more

### Key Takeaways

- Most advanced marine metrics are **calculated, not measured directly**
- Calculations typically combine **multiple NMEA sentences**
- **Vector mathematics** is fundamental to wind and current calculations
- **Trigonometry** is essential for navigation calculations
- **Data quality validation** is critical for reliable results
- **Filtering and smoothing** improve usability of derived data
- **Unit consistency** must be maintained throughout calculations

### Further Resources

- **NMEA 0183 Standard:** Available from nmea.org (proprietary)
- **World Magnetic Model:** NOAA NCEI (https://www.ngdc.noaa.gov/geomag/)
- **Navigation Algorithms:** "Geodesy Algorithms" by Bowring, "Aviation Formulary" by Williams
- **Open Source Projects:** OpenCPN, GPSd, Signal K

### Implementation Recommendations

For a comprehensive marine navigation system:

1. Start with **basic GPS position and wind data**
2. Implement **true wind calculations** first (high value for sailors)
3. Add **VMG calculations** for performance tracking
4. Integrate **XTE** for autopilot and route following
5. Include **magnetic variation** handling for course conversions
6. Expand to **advanced metrics** as needed (polar performance, etc.)

---

## Dashboard Integration Guide

### Overview

This section provides practical guidance for integrating calculated NMEA metrics into a modern React Native marine instrument dashboard application with an extensible widget framework.

### Architecture Pattern: Three-Layer Integration

#### **Layer 1: Calculation Engine Service**

Create a dedicated calculation service that implements all derived metric algorithms.

**File Structure:**
```
src/services/
  └── nmeaCalculations.ts  (Calculation engine)
```

**Key Interfaces:**
```typescript
export interface TrueWindResult {
  speed: number;        // knots
  direction: number;    // degrees true
  angle: number;        // degrees relative to bow
  quality: 'good' | 'fair' | 'poor';
}

export interface VMGResult {
  vmgToWaypoint: number;  // knots
  vmgToWind: number;      // knots
  targetVMG?: number;     // from polars (if available)
  efficiency?: number;    // percentage
}

export interface MagneticVariationResult {
  variation: number;      // degrees
  direction: 'E' | 'W';
  source: 'WMM' | 'NMEA' | 'manual';
  confidence: 'high' | 'medium' | 'low';
}
```

**Calculation Service Pattern:**
```typescript
export class NmeaCalculations {
  static calculateTrueWind(
    apparentWindSpeed: number,
    apparentWindAngle: number,
    speedOverGround: number,
    courseOverGround: number,
    heading: number
  ): TrueWindResult {
    // Vector component method
    const awdRad = ((heading + apparentWindAngle) % 360) * Math.PI / 180;
    const cogRad = (courseOverGround * Math.PI) / 180;

    const u = speedOverGround * Math.sin(cogRad) -
              apparentWindSpeed * Math.sin(awdRad);
    const v = speedOverGround * Math.cos(cogRad) -
              apparentWindSpeed * Math.cos(awdRad);

    const trueWindSpeed = Math.sqrt(u * u + v * v);
    const trueWindDirection = (Math.atan2(u, v) * 180 / Math.PI + 360) % 360;

    return {
      speed: trueWindSpeed,
      direction: trueWindDirection,
      angle: (trueWindDirection - heading + 360) % 360,
      quality: this.assessWindQuality(apparentWindSpeed, speedOverGround, trueWindSpeed)
    };
  }

  static calculateVMG(
    boatSpeed: number,
    speedOverGround: number,
    trueWindAngle: number,
    courseOverGround: number,
    waypointBearing?: number
  ): VMGResult {
    // VMG to wind calculation
    const twaRad = (Math.abs(trueWindAngle) * Math.PI) / 180;
    const vmgToWind = boatSpeed * Math.cos(twaRad);

    // VMG to waypoint (if waypoint bearing provided)
    let vmgToWaypoint = 0;
    if (waypointBearing !== undefined) {
      const angleDiff = Math.abs(courseOverGround - waypointBearing);
      const normalizedAngle = angleDiff > 180 ? 360 - angleDiff : angleDiff;
      vmgToWaypoint = speedOverGround * Math.cos((normalizedAngle * Math.PI) / 180);
    }

    return { vmgToWind, vmgToWaypoint };
  }
}
```

#### **Layer 2: State Store Enhancement**

Extend your existing Zustand store to include calculated metrics alongside raw NMEA data.

**Store Pattern:**
```typescript
// Extend NmeaData interface
export interface NmeaData {
  // Raw sensor data
  depth?: number;
  windSpeed?: number;
  windAngle?: number;
  heading?: number;
  // ... other raw data

  // CALCULATED METRICS (new)
  calculated?: {
    trueWind?: TrueWindResult;
    vmg?: VMGResult;
    magneticVariation?: MagneticVariationResult;
    courseData?: CourseConversionResult;
    xte?: { distance: number; direction: 'L' | 'R' };
    currentSetDrift?: { set: number; drift: number };
  };
}

// Add calculation trigger
interface NmeaStore {
  // ... existing actions
  calculateDerivedMetrics: () => void;
}

// Implementation
export const useNmeaStore = create<NmeaStore>((set, get) => ({
  // ... existing state

  calculateDerivedMetrics: () => {
    const { nmeaData } = get();

    // Validate minimum required data
    if (!nmeaData.windSpeed || !nmeaData.sog || !nmeaData.heading) {
      return;
    }

    const calculated: NmeaData['calculated'] = {};

    // Calculate true wind
    if (nmeaData.windSpeed && nmeaData.windAngle && nmeaData.heading) {
      calculated.trueWind = NmeaCalculations.calculateTrueWind(
        nmeaData.windSpeed,
        nmeaData.windAngle,
        nmeaData.sog,
        nmeaData.cog,
        nmeaData.heading
      );
    }

    // Calculate VMG
    if (nmeaData.speed && calculated.trueWind) {
      calculated.vmg = NmeaCalculations.calculateVMG(
        nmeaData.speed,
        nmeaData.sog,
        calculated.trueWind.angle,
        nmeaData.cog
      );
    }

    // Update store
    set((state) => ({
      nmeaData: { ...state.nmeaData, calculated }
    }));
  }
}));
```

**Automatic Calculation Trigger:**
```typescript
// In NMEA processing service
export const processNmeaData = (newData: Partial<NmeaData>) => {
  const store = useNmeaStore.getState();

  // Update raw data
  store.setNmeaData(newData);

  // Trigger derived calculations
  store.calculateDerivedMetrics();
};
```

#### **Layer 3: Widget Implementation**

Create widgets that consume calculated metrics from the store.

**Widget Pattern - True Wind Widget:**
```typescript
import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { WidgetCard } from './WidgetCard';
import { useNmeaStore } from '../core/nmeaStore';
import { useTheme } from '../core/themeStore';

type WindUnit = 'knots' | 'mph' | 'kmh' | 'ms';

export const TrueWindWidget: React.FC = () => {
  // Subscribe only to calculated true wind data (optimized selector)
  const trueWind = useNmeaStore(state => state.nmeaData.calculated?.trueWind);
  const theme = useTheme();
  const [unit, setUnit] = useState<WindUnit>('knots');

  const convertSpeed = (knots: number) => {
    switch (unit) {
      case 'mph': return { value: (knots * 1.15078).toFixed(1), unit: 'mph' };
      case 'kmh': return { value: (knots * 1.852).toFixed(1), unit: 'km/h' };
      case 'ms': return { value: (knots * 0.514444).toFixed(1), unit: 'm/s' };
      default: return { value: knots.toFixed(1), unit: 'kn' };
    }
  };

  const getState = () => {
    if (!trueWind) return 'no-data';
    if (trueWind.quality === 'poor') return 'highlighted';
    if (trueWind.speed > 25) return 'alarm';
    return 'normal';
  };

  const cycleUnit = () => {
    const units: WindUnit[] = ['knots', 'mph', 'kmh', 'ms'];
    setUnit(units[(units.indexOf(unit) + 1) % units.length]);
  };

  const { value, unit: unitStr } = trueWind
    ? convertSpeed(trueWind.speed)
    : { value: '--', unit: 'kn' };

  return (
    <TouchableOpacity onPress={cycleUnit}>
      <WidgetCard
        title="TRUE WIND"
        icon="navigate"
        value={value}
        unit={unitStr}
        state={getState()}
        secondary={
          trueWind
            ? `${Math.round(trueWind.direction)}° T | ${Math.round(trueWind.angle)}° rel`
            : 'Calculating...'
        }
      >
        {/* Wind rose visualization */}
        {trueWind && <WindRoseDisplay angle={trueWind.angle} />}
      </WidgetCard>
    </TouchableOpacity>
  );
};
```

**Widget Registration:**
```typescript
// In src/widgets/registerWidgets.ts
import { WidgetRegistry } from './WidgetRegistry';
import { TrueWindWidget } from './TrueWindWidget';
import { VMGWidget } from './VMGWidget';
import { MagneticVariationWidget } from './MagneticVariationWidget';

// Register calculated metrics widgets
WidgetRegistry.register(
  {
    id: 'true-wind',
    title: 'True Wind',
    icon: 'navigate',
    description: 'Calculated true wind speed and direction',
    category: 'navigation',
    defaultSize: { width: 1, height: 1 },
    configurable: true
  },
  TrueWindWidget
);

WidgetRegistry.register(
  {
    id: 'vmg',
    title: 'VMG',
    icon: 'speedometer',
    description: 'Velocity Made Good to wind and waypoint',
    category: 'navigation',
    defaultSize: { width: 1, height: 1 },
    configurable: true
  },
  VMGWidget
);
```

### Integration Best Practices

#### 1. **Performance Optimization**

**Selective Store Subscriptions:**
```typescript
// GOOD - Only re-renders when trueWind changes
const trueWind = useNmeaStore(state => state.nmeaData.calculated?.trueWind);

// BAD - Re-renders on ANY nmeaData change
const nmeaData = useNmeaStore(state => state.nmeaData);
```

**Throttled Calculations:**
```typescript
// Debounce rapid updates
let calculationTimeout: NodeJS.Timeout;

export const triggerCalculations = () => {
  clearTimeout(calculationTimeout);
  calculationTimeout = setTimeout(() => {
    useNmeaStore.getState().calculateDerivedMetrics();
  }, 100); // 10 Hz max calculation rate
};
```

#### 2. **Data Quality Indicators**

Display calculation confidence to users:

```typescript
const QualityBadge: React.FC<{ quality: string }> = ({ quality }) => {
  const getColor = () => {
    switch (quality) {
      case 'good': return theme.success;
      case 'fair': return theme.warning;
      case 'poor': return theme.error;
    }
  };

  return quality !== 'good' ? (
    <View style={[styles.badge, { backgroundColor: getColor() }]}>
      <Text style={styles.badgeText}>{quality.toUpperCase()}</Text>
    </View>
  ) : null;
};
```

#### 3. **Graceful Degradation**

Handle missing data elegantly:

```typescript
export const TrueWindWidget: React.FC = () => {
  const trueWind = useNmeaStore(state => state.nmeaData.calculated?.trueWind);
  const apparentWind = useNmeaStore(state => state.nmeaData.windSpeed);

  // Fallback to apparent wind if true wind unavailable
  const displayWind = trueWind || { speed: apparentWind, quality: 'poor' };

  return (
    <WidgetCard
      title={trueWind ? "TRUE WIND" : "APPARENT WIND"}
      // ... rest of widget
    />
  );
};
```

#### 4. **User Configuration**

Allow users to control calculations:

```typescript
interface CalculationSettings {
  autoCalculateTrueWind: boolean;
  autoCalculateVMG: boolean;
  useWMMVariation: boolean;
  broadcastCalculated: boolean;
}

// In settings store
export const useSettingsStore = create<SettingsStore>((set) => ({
  calculations: {
    autoCalculateTrueWind: true,
    autoCalculateVMG: true,
    useWMMVariation: true,
    broadcastCalculated: false, // Default: don't conflict with TacktTick
  }
}));

// Conditional calculation
calculateDerivedMetrics: () => {
  const settings = useSettingsStore.getState().calculations;

  if (settings.autoCalculateTrueWind) {
    // Calculate true wind
  }

  if (settings.autoCalculateVMG) {
    // Calculate VMG
  }
}
```

### Dashboard Layout Integration

**Grid Layout Example:**
```typescript
// Default layout with calculated metrics
const defaultLayout = [
  // Row 1: Environmental sensors
  { id: 'depth', x: 0, y: 0, width: 1, height: 1 },
  { id: 'speed', x: 1, y: 0, width: 1, height: 1 },
  { id: 'wind-apparent', x: 2, y: 0, width: 1, height: 1 },
  { id: 'true-wind', x: 3, y: 0, width: 1, height: 1 },

  // Row 2: Navigation & calculated
  { id: 'gps', x: 0, y: 1, width: 1, height: 1 },
  { id: 'compass', x: 1, y: 1, width: 1, height: 1 },
  { id: 'vmg', x: 2, y: 1, width: 1, height: 1 },
  { id: 'magnetic-variation', x: 3, y: 1, width: 1, height: 1 },
];
```

**Widget Selector Categories:**
```typescript
const categories = {
  'Raw Sensors': ['depth', 'wind-apparent', 'water-temp'],
  'Calculated Navigation': ['true-wind', 'vmg', 'xte', 'mag-var'],
  'Performance': ['polar-performance', 'target-speed', 'efficiency'],
};
```

### Testing Strategy

**Unit Tests for Calculations:**
```typescript
describe('NmeaCalculations', () => {
  describe('calculateTrueWind', () => {
    it('should calculate true wind from apparent wind', () => {
      const result = NmeaCalculations.calculateTrueWind(
        12.5, // AWS
        45,   // AWA
        6.5,  // SOG
        90,   // COG
        90    // Heading
      );

      expect(result.speed).toBeGreaterThan(0);
      expect(result.direction).toBeGreaterThanOrEqual(0);
      expect(result.quality).toBe('good');
    });

    it('should mark quality as poor with low wind speed', () => {
      const result = NmeaCalculations.calculateTrueWind(0.5, 45, 6.5, 90, 90);
      expect(result.quality).toBe('poor');
    });
  });
});
```

**Integration Tests:**
```typescript
describe('Dashboard Integration', () => {
  it('should display true wind widget when data available', () => {
    const { getByText } = render(<Dashboard />);

    // Simulate NMEA data update
    act(() => {
      useNmeaStore.getState().setNmeaData({
        windSpeed: 12.5,
        windAngle: 45,
        heading: 90,
        sog: 6.5,
        cog: 90
      });
      useNmeaStore.getState().calculateDerivedMetrics();
    });

    expect(getByText('TRUE WIND')).toBeTruthy();
  });
});
```

### Production Deployment Checklist

- [ ] Implement calculation service with all formulas
- [ ] Extend NMEA store with calculated field
- [ ] Create widget components for key metrics
- [ ] Register widgets in widget registry
- [ ] Add unit tests for calculation functions
- [ ] Add integration tests for widget rendering
- [ ] Implement user settings for calculations
- [ ] Add quality indicators to widgets
- [ ] Optimize store subscriptions for performance
- [ ] Test with real NMEA data streams
- [ ] Document calculated metrics for users
- [ ] Add NMEA broadcasting configuration (if needed)

---

## Broadcasting Calculated Metrics

### Overview

Marine electronics systems expect instruments to share their calculated data on the NMEA bus for consumption by other devices. Broadcasting calculated metrics is standard practice and adds value to the overall marine electronics ecosystem.

### Why Broadcast Calculated Metrics?

#### Industry Standard Practice

Modern marine electronics operate as **distributed computing systems**:
- Each device contributes specialized data
- Devices consume and display data from other sources
- **Calculated data is routinely broadcast** alongside raw sensor data

**Examples:**
- Chartplotters broadcast XTE, VMG, bearing to waypoint
- Instrument displays broadcast true wind calculations
- Weather computers broadcast performance metrics

#### NMEA Protocol Design

The NMEA standard explicitly supports broadcasting calculated data:
- **Talker IDs** identify the source (e.g., `II` = Integrated Instrumentation)
- **Sentence types** don't distinguish between raw vs. calculated data
- Standard sentences (MWV-True, XTE, APB) contain calculated values

#### System Benefits

**For Your Application:**
- Share computational results with less capable devices
- Provide value-added data to legacy instruments
- Enable autopilots to use your calculations
- Display metrics on MFDs, repeaters, tablets

**For the Marine System:**
- **Avoid duplicate calculations** - one device computes, all consume
- **Centralize complex algorithms** - superior algorithms benefit all devices
- **Reduce system load** - distributed intelligence
- **Consistency** - all displays show same calculated values

### What to Broadcast

| Calculated Metric | NMEA Sentence | Priority | Broadcast? |
|-------------------|---------------|----------|------------|
| **True Wind Speed/Direction** | `MWV` (T reference) | HIGH | YES - if better algorithm |
| **True Wind Direction** | `MWD` | HIGH | YES - provides absolute wind |
| **VMG to Waypoint** | `RMB` Field 12 | HIGH | YES - navigation critical |
| **Cross Track Error** | `XTE`, `APB` | CRITICAL | YES - autopilot needs this |
| **Bearing to Waypoint** | `RMB`, `BOD` | HIGH | YES - navigation displays |
| **Magnetic Variation** | `RMC` Field 10-11 | MEDIUM | YES - WMM better than manual |
| **Calculated Heading** | `HDT`, `HDG` | HIGH | YES - if GPS/compass fusion |
| **Performance Metrics** | Proprietary | LOW | OPTIONAL - racing instruments |

### Broadcasting Best Practices

#### 1. Use Standard NMEA Formats

**True Wind Example:**
```
$IIMWV,045,T,15.2,N,A*<checksum>
```
- Talker ID: `II` (Integrated Instrumentation)
- Reference: `T` (True wind)
- Status: `A` (Valid) or `V` (Invalid)

**Magnetic Variation Example:**
```
$IIRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,012.5,E*<checksum>
```
- Field 10: `012.5` - Magnetic variation (degrees)
- Field 11: `E` - Direction (East)

#### 2. Implement Validity Flags

Always include status flags to indicate data quality:

```typescript
export const generateMWVsentence = (trueWind: TrueWindResult): string => {
  const status = trueWind.quality === 'good' ? 'A' : 'V';

  const sentence = `$IIMWV,${trueWind.angle.toFixed(0)},T,${trueWind.speed.toFixed(1)},N,${status}`;
  const checksum = calculateNMEAchecksum(sentence);

  return `${sentence}*${checksum}\r\n`;
};
```

#### 3. Set Appropriate Broadcast Rates

Don't flood the NMEA bus:

```typescript
interface BroadcastConfig {
  trueWind: { enabled: boolean; rate: number };    // 1 Hz
  vmg: { enabled: boolean; rate: number };         // 1 Hz
  xte: { enabled: boolean; rate: number };         // 1 Hz
  magneticVar: { enabled: boolean; rate: number }; // 0.1 Hz (every 10s)
}

// Throttle broadcasts
const broadcastScheduler = {
  trueWind: new ThrottledBroadcast(1000), // 1 Hz
  vmg: new ThrottledBroadcast(1000),
  xte: new ThrottledBroadcast(1000),
  magneticVar: new ThrottledBroadcast(10000), // 0.1 Hz
};
```

#### 4. Provide User Control

**Settings Interface:**
```typescript
interface NmeaBroadcastSettings {
  enabled: boolean;
  sentences: {
    trueWind: boolean;
    vmg: boolean;
    magneticVariation: boolean;
    xte: boolean;
  };
  warningShown: boolean; // Warn about TacktTick conflicts
}
```

**Settings UI Example:**
```typescript
<View style={styles.settingsSection}>
  <Text style={styles.sectionTitle}>NMEA Output</Text>

  <SettingToggle
    label="Broadcast Calculated Metrics"
    value={settings.nmea.enabled}
    onChange={(val) => updateSetting('nmea.enabled', val)}
  />

  {settings.nmea.enabled && (
    <>
      <SettingToggle
        label="True Wind (MWV-T)"
        value={settings.nmea.sentences.trueWind}
        onChange={(val) => updateSetting('nmea.sentences.trueWind', val)}
        description="⚠️ May conflict with existing instruments"
      />

      <SettingToggle
        label="Magnetic Variation (RMC)"
        value={settings.nmea.sentences.magneticVariation}
        onChange={(val) => updateSetting('nmea.sentences.magneticVariation', val)}
        description="✓ WMM calculation - Safe to broadcast"
      />

      <SettingToggle
        label="Cross Track Error (XTE)"
        value={settings.nmea.sentences.xte}
        onChange={(val) => updateSetting('nmea.sentences.xte', val)}
        description="⚠️ DANGER if autopilot connected"
        disabled={!settings.primaryNavigation}
      />
    </>
  )}
</View>
```

### TacktTick Compatibility

#### Conflict Scenarios

**Scenario 1: TacktTick Displays Only (No NMEA Output)**
- ✅ **Safe** - No conflict
- TacktTick wireless loop is independent
- Your broadcasts go to other devices

**Scenario 2: Both Broadcasting Same Metrics**
- ⚠️ **Potential Conflict**
- Listeners may use first/last received
- Could cause flickering displays
- Autopilot may oscillate

**Scenario 3: Your App as Primary Calculator**
- ✅ **Best Practice**
- Disable TacktTick NMEA output of calculated data
- Your app becomes calculation authority
- Consistent data across all devices

#### Recommended Configuration for TacktTick Users

**Conservative Approach (Default):**
```typescript
const defaultBroadcastConfig = {
  // Only broadcast what TacktTick doesn't calculate well
  magneticVariation: true,     // TacktTick uses manual entry
  currentSetDrift: true,       // TacktTick doesn't calculate
  leewayCompensation: true,    // TacktTick doesn't do this

  // DON'T broadcast to avoid conflicts
  trueWind: false,             // TacktTick already does this
  vmg: false,                  // TacktTick already does this
  apparentWind: false,         // TacktTick is source
};
```

**Advanced Override (User Configured):**
```typescript
const advancedConfig = {
  // User has disabled TacktTick NMEA output
  trueWind: true,              // Your superior algorithm
  vmg: true,                   // Better polar data
  magneticVariation: true,     // WMM calculation

  // Still don't override raw sensors
  apparentWind: false,
  depth: false,
};
```

### Implementation Example

**Broadcast Service:**
```typescript
import { NMEAConnection } from './nmeaConnection';

export class NmeaBroadcastService {
  private connection: NMEAConnection;
  private settings: NmeaBroadcastSettings;
  private schedulers: Map<string, ThrottledBroadcast>;

  constructor(connection: NMEAConnection, settings: NmeaBroadcastSettings) {
    this.connection = connection;
    this.settings = settings;
    this.schedulers = new Map();
  }

  broadcastCalculatedMetrics(calculated: NmeaData['calculated']) {
    if (!this.settings.enabled) return;

    // True Wind
    if (this.settings.sentences.trueWind && calculated.trueWind) {
      this.schedulers.get('trueWind')?.broadcast(() => {
        const sentence = this.generateMWVsentence(calculated.trueWind);
        this.connection.send(sentence);
      });
    }

    // Magnetic Variation
    if (this.settings.sentences.magneticVariation && calculated.magneticVariation) {
      this.schedulers.get('magVar')?.broadcast(() => {
        const sentence = this.generateRMCvariation(calculated.magneticVariation);
        this.connection.send(sentence);
      });
    }

    // VMG (via RMB sentence)
    if (this.settings.sentences.vmg && calculated.vmg) {
      this.schedulers.get('vmg')?.broadcast(() => {
        const sentence = this.generateRMBsentence(calculated.vmg);
        this.connection.send(sentence);
      });
    }
  }

  private generateMWVsentence(trueWind: TrueWindResult): string {
    const status = trueWind.quality === 'good' ? 'A' : 'V';
    const sentence = `$IIMWV,${trueWind.angle.toFixed(0)},T,${trueWind.speed.toFixed(1)},N,${status}`;
    return `${sentence}*${this.calculateChecksum(sentence)}\r\n`;
  }

  private calculateChecksum(sentence: string): string {
    let checksum = 0;
    for (let i = 1; i < sentence.length; i++) {
      checksum ^= sentence.charCodeAt(i);
    }
    return checksum.toString(16).toUpperCase().padStart(2, '0');
  }
}

class ThrottledBroadcast {
  private interval: number;
  private lastBroadcast: number = 0;

  constructor(intervalMs: number) {
    this.interval = intervalMs;
  }

  broadcast(fn: () => void): void {
    const now = Date.now();
    if (now - this.lastBroadcast >= this.interval) {
      fn();
      this.lastBroadcast = now;
    }
  }
}
```

### Testing Broadcasting

**Test NMEA Output:**
```typescript
describe('NmeaBroadcastService', () => {
  it('should generate valid MWV sentence for true wind', () => {
    const trueWind: TrueWindResult = {
      speed: 15.2,
      direction: 270,
      angle: 45,
      quality: 'good'
    };

    const service = new NmeaBroadcastService(mockConnection, {
      enabled: true,
      sentences: { trueWind: true }
    });

    service.broadcastCalculatedMetrics({ trueWind });

    expect(mockConnection.send).toHaveBeenCalledWith(
      expect.stringMatching(/^\$IIMWV,45,T,15\.2,N,A\*[0-9A-F]{2}\r\n$/)
    );
  });

  it('should throttle broadcasts to configured rate', () => {
    jest.useFakeTimers();

    const service = new NmeaBroadcastService(mockConnection, settings);

    // Broadcast 10 times rapidly
    for (let i = 0; i < 10; i++) {
      service.broadcastCalculatedMetrics({ trueWind });
    }

    // Only 1 should have been sent (throttled to 1 Hz)
    expect(mockConnection.send).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);
    service.broadcastCalculatedMetrics({ trueWind });

    // Now 2 total (after 1 second)
    expect(mockConnection.send).toHaveBeenCalledTimes(2);
  });
});
```

### Production Considerations

**Bus Capacity Check:**
```typescript
// NMEA 0183 @ 4800 baud = ~60 sentences/second max
// Your broadcast budget:
const broadcastBudget = {
  trueWind: 1,      // 1 Hz = 1 sentence/sec
  vmg: 1,           // 1 Hz = 1 sentence/sec
  magVar: 0.1,      // 0.1 Hz = 0.1 sentence/sec
  xte: 1,           // 1 Hz = 1 sentence/sec
  // Total: ~3 sentences/sec = 5% of bus capacity ✓
};
```

**Conflict Detection:**
```typescript
export class ConflictDetector {
  private receivedSentences = new Map<string, { count: number; talkers: Set<string> }>();

  monitorBus(sentence: string) {
    const type = sentence.substring(3, 6); // e.g., "MWV"
    const talker = sentence.substring(1, 3); // e.g., "II"

    if (!this.receivedSentences.has(type)) {
      this.receivedSentences.set(type, { count: 0, talkers: new Set() });
    }

    const entry = this.receivedSentences.get(type)!;
    entry.count++;
    entry.talkers.add(talker);

    // Detect conflict
    if (entry.talkers.size > 1) {
      console.warn(`Conflict detected: ${type} from multiple talkers:`, Array.from(entry.talkers));
    }
  }
}
```

### Summary: Broadcasting Decision Matrix

| Metric | Broadcast by Default? | Reason |
|--------|----------------------|--------|
| **Magnetic Variation** | ✅ YES | WMM calculation superior to manual entry |
| **True Wind** | ⚠️ CONFIGURABLE | Better algorithm, but may conflict |
| **VMG** | ⚠️ CONFIGURABLE | Better polars, but may conflict |
| **XTE** | ❌ NO | Critical for autopilot - conflict dangerous |
| **Current Set/Drift** | ✅ YES | Advanced calculation, rarely conflicts |
| **Leeway Compensation** | ✅ YES | Most instruments don't calculate this |

**Golden Rule:** When in doubt, give users control and default to conservative (non-conflicting) settings.

---

**Document Version:** 1.1
**Last Updated:** October 12, 2025
**Author:** BMad Master Agent
**Status:** Complete - With Integration Guide

---

*This technical research document provides theoretical and practical guidance for implementing calculated metrics from NMEA data. Implementation details may vary based on specific hardware, software platforms, and use cases.*
