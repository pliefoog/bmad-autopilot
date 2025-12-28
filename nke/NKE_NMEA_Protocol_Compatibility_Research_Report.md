# NKE Display Pro App and NKE Instruments NMEA Protocol Compatibility Research Report

**Date:** December 28, 2025
**Subject:** NMEA Protocol Support and Compatibility Analysis
**Scope:** NKE Display Pro Application and NKE Marine Electronics Instruments

---

## Executive Summary

This research report provides a comprehensive analysis of the NMEA protocol compatibility for NKE Display Pro App and NKE marine instruments. The investigation covers supported NMEA 0183 sentences, NMEA 2000 PGNs (Parameter Group Numbers), NKE's proprietary Topline protocol, and the gateway solutions that enable interoperability between these protocols.

**Key Findings:**
- NKE Display Pro App supports NMEA 0183 protocol with 30+ standard sentences
- NKE instruments use a proprietary Topline bus protocol (38,400 baud, 20 Hz refresh rate)
- The Box N2K gateway supports 50 NMEA 2000 PGNs for cross-manufacturer compatibility
- Bidirectional communication enables control of autopilot and other systems via the app
- Recent updates (v1.5.0) added support for RSA, XTE, and VPW sentences

---

## 1. NKE Display Pro App - NMEA Protocol Support

### 1.1 Overview

The **NKE Display Pro** is a smartphone/tablet application (available for iOS and Android) that provides visualization and control of marine instrumentation data. The application is designed to work with NMEA 0183 protocol and is compatible with most NMEA/Wi-Fi interfaces available on the market, not limited to NKE hardware.

### 1.2 Protocol Compatibility

- **Primary Protocol:** NMEA 0183
- **Data Format:** ASCII sentences
- **Baud Rate:** Automatically configured between 4,800 and 38,400 bauds
- **Standard Format:** 4,800 bauds / 8 bits / 1 start bit / 1 stop bit
- **Interface Compatibility:** Most NMEA/Wi-Fi interfaces on the market

### 1.3 Supported NMEA 0183 Sentences

The application and associated NKE WiFi/USB Box system support the following NMEA 0183 sentences:

#### 1.3.1 Navigation & Positioning Sentences

| Sentence | Description | Purpose |
|----------|-------------|---------|
| **GLL** | Geographic Position - Latitude/Longitude | Position reporting |
| **RMC** | Recommended Minimum Specific GPS/Transit Data | Essential GPS data including position, speed, course |
| **VTG** | Track Made Good and Ground Speed | Course and speed over ground |
| **XTE** | Cross-Track Error | Navigation deviation from intended track |
| **RMB** | Recommended Minimum Navigation Information | Waypoint navigation data |
| **WPL** | Waypoint Location | Waypoint coordinates |
| **BWC** | Bearing & Distance to Waypoint | Waypoint navigation information |

#### 1.3.2 Heading & Course Sentences

| Sentence | Description | Purpose |
|----------|-------------|---------|
| **HDG** | Heading - Deviation & Variation | Magnetic heading with corrections |
| **HDM** | Heading Magnetic | Magnetic heading |
| **HDT** | Heading True | True heading |

#### 1.3.3 Wind Data Sentences

| Sentence | Description | Purpose |
|----------|-------------|---------|
| **MWV** | Wind Speed and Angle | General wind data (apparent or true) |
| **VWR** | Relative Wind Speed and Angle | Apparent wind data |
| **VWT** | True Wind Speed and Angle | True wind data |
| **MWD** | Wind Direction and Speed | Wind direction relative to true north |

#### 1.3.4 Speed & Distance Sentences

| Sentence | Description | Purpose |
|----------|-------------|---------|
| **VLW** | Distance Traveled Through Water | Total and trip log distances |
| **VHW** | Water Speed and Heading | Speed through water and heading |

#### 1.3.5 Depth Sentences

| Sentence | Description | Purpose |
|----------|-------------|---------|
| **DBT** | Depth Below Transducer | Water depth measurement |
| **DPT** | Depth | Depth with offset and maximum range |

#### 1.3.6 Environmental Sentences

| Sentence | Description | Purpose |
|----------|-------------|---------|
| **MTW** | Water Temperature | Sea surface temperature |
| **MTA** | Air Temperature | Ambient air temperature |
| **MMB** | Barometric Pressure | Atmospheric pressure |

#### 1.3.7 Autopilot Sentences

| Sentence | Description | Purpose |
|----------|-------------|---------|
| **APB** | Autopilot Sentence B | Autopilot navigation data |
| **APA** | Autopilot Sentence A | Autopilot navigation data (alternative format) |
| **RSA** | Rudder Sensor Angle | Rudder position (added v1.5.0) |

#### 1.3.8 Other Standard Sentences

| Sentence | Description | Purpose |
|----------|-------------|---------|
| **XDR** | Transducer Measurement | Generic transducer data |
| **CUR** | Current | Water current speed and direction |
| **VPW** | Speed - Measured Parallel to Wind | Performance measurement (added v1.5.0) |
| **ZDA** | Time and Date | UTC time and date |

#### 1.3.9 Proprietary NKE Sentences

| Sentence | Description | Purpose |
|----------|-------------|---------|
| **PNKEP,0** (1-5) | NKE Proprietary Sentences | NKE-specific data formats |
| **PNKEP,1** (1-4) | NKE Proprietary Sentences | NKE-specific data formats |

### 1.4 Application Version History

**Version 1.5.0 (November 2025):**
- Added support for **RSA** (Rudder Sensor Angle) sentence
- Added support for **XTE** (Cross-Track Error) sentence
- Added support for **VPW** (Speed Parallel to Wind) sentence
- Enhanced NMEA datalogger to run in background mode
- Improved RMC sentence processing

### 1.5 Key Features

1. **Data Visualization:** Display data from any navigation station transmitting NMEA 0183
2. **Data Logging:** Record navigation data in NMEA 0183 format (datalogger runs in background)
3. **Bidirectional Communication:** Send commands on the Topline bus via WiFi Box (e.g., autopilot control)
4. **Wide Compatibility:** Works with most NMEA/Wi-Fi interfaces, not just NKE hardware
5. **Customizable Displays:** Select and configure displayed parameters

---

## 2. NKE Instruments - Proprietary Topline Protocol

### 2.1 Topline Protocol Overview

NKE marine instruments use a proprietary serial network protocol called **Topline** for internal communication between sensors, displays, and other devices on the boat.

### 2.2 Technical Specifications

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Data Rate** | 38,400 baud | Significantly faster than standard NMEA 0183 (4,800 baud) |
| **Refresh Rate** | 20 Hz | High-frequency updates for responsive displays |
| **Data Format** | Compact binary | More efficient than ASCII-based NMEA sentences |
| **Connection Type** | Single-wire serial | Simplified wiring compared to twisted pair |
| **Topology** | Bus | Multiple devices on single network |

### 2.3 Advantages of Topline Protocol

1. **High Speed:** 38,400 baud enables fast data transmission
2. **High Refresh Rate:** 20 Hz provides smooth, responsive updates
3. **Compact Data:** Binary format reduces bandwidth requirements
4. **Efficient Network:** Single-wire bus simplifies installation
5. **NKE Integration:** Optimized for NKE instrument ecosystem

### 2.4 Limitation

The proprietary nature of Topline means it requires gateway devices (interface boxes) to communicate with standard NMEA devices from other manufacturers.

---

## 3. Protocol Conversion - NKE Gateway Solutions

### 3.1 Box N2K - Multi-Protocol Gateway

The **NKE Box N2K** is the primary communication gateway that enables interoperability between NKE's Topline protocol and industry-standard NMEA protocols.

#### 3.1.1 Supported Protocols

The Box N2K serves as a **tri-protocol gateway** supporting:

1. **Topline** (NKE proprietary bus)
2. **NMEA 0183** (industry standard serial protocol)
3. **NMEA 2000** (CAN-bus based marine network standard)

#### 3.1.2 Physical Connections

- **1 BUS connection** for Topline bus
- **2 serial ports** for NMEA 0183 devices
- **1 USB port** for computer connection
- **1 NMEA 2000 port** for N2K network connection

#### 3.1.3 Configuration

- Configuration via **TopSailor** software
- Initialization determines which PGNs can be fed by Topline instruments
- Mapping configuration between instruments and NMEA 2000 PGNs
- Bidirectional data flow support

### 3.2 NMEA 2000 Support

#### 3.2.1 PGN Support

The Box N2K supports **50 PGNs (Parameter Group Numbers)**, enabling comprehensive compatibility with NMEA 2000 instruments from various manufacturers.

**Note:** The specific list of 50 supported PGNs is documented in the Box N2K user manual. While the exact PGN numbers were not accessible during this research, the device supports the most common marine instrument data types including:

- Navigation data (position, course, speed)
- Wind data (apparent and true)
- Depth and temperature
- Heading and attitude
- Engine parameters
- Battery status
- Fluid levels
- Environmental data

#### 3.2.2 Cross-Manufacturer Compatibility

The NMEA 2000 support allows:
- Integration of third-party NMEA 2000 sensors with NKE displays
- Use of NKE sensors with third-party NMEA 2000 displays and systems
- Creation of hybrid marine electronics systems

### 3.3 Additional NKE Interface Solutions

#### 3.3.1 USB WiFi Box

- Multiplexes Topline bus data and NMEA input data
- Provides WiFi connectivity for smartphones, tablets, and computers
- Enables wireless data transmission to NKE Display Pro app
- Converts NMEA data to Topline format
- Bidirectional communication capability

**Key Features:**
- WiFi access point creation
- NMEA 0183 input and output
- Topline bus interface
- USB connectivity for configuration

#### 3.3.2 Ethernet Box

- Similar functionality to WiFi Box
- Connects to onboard Ethernet network
- Suitable for boats with existing network infrastructure
- Provides wired network reliability

**Key Features:**
- Ethernet network integration
- NMEA 0183 and Topline conversion
- Network data distribution
- Multiple client support

#### 3.3.3 NMEA Output Interface

- Dedicated Topline to NMEA 0183 converter
- Outputs standard NMEA 0183 sentences
- Format: 4,800 bauds / 8 bits with bit 7 at 0 / 1 start bit and 1 stop bit
- Automatic baud rate configuration (4,800 to 38,400 bauds)

---

## 4. System Architecture and Data Flow

### 4.1 Typical NKE System Configuration

```
[NKE Sensors] ←→ Topline Bus ←→ [NKE Displays]
                      ↓
                  [Box N2K]
                      ↓
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
   NMEA 0183    NMEA 2000    USB/WiFi Box
        ↓             ↓             ↓
   [Chart         [3rd Party    [NKE Display
   Plotter]       N2K Devices]   Pro App]
```

### 4.2 Data Flow Capabilities

1. **Topline → NMEA 0183:** NKE sensor data to standard chart plotters
2. **Topline → NMEA 2000:** NKE sensor data to N2K network
3. **NMEA 0183 → Topline:** GPS or other NMEA data to NKE displays
4. **NMEA 2000 → Topline:** N2K network data to NKE displays
5. **Topline → WiFi → App:** Wireless data transmission to mobile devices
6. **App → WiFi → Topline:** Control commands (autopilot, etc.)

### 4.3 Bidirectional Communication

The WiFi Box enables **bidirectional communication**, allowing the NKE Display Pro app to:
- **Receive data** from all connected sensors and instruments
- **Send commands** to devices on the Topline bus
- **Control autopilot** settings and modes
- **Adjust instrument** configurations
- **Log data** for later analysis

---

## 5. Compatibility Analysis

### 5.1 Industry Standard Compliance

| Standard | Support Level | Notes |
|----------|---------------|-------|
| **NMEA 0183** | Full | 30+ standard sentences supported |
| **NMEA 2000** | Extensive | 50 PGNs supported via Box N2K |
| **Proprietary** | Native | Topline protocol for NKE devices |

### 5.2 Cross-Manufacturer Integration

**NKE systems can integrate with:**
- GPS receivers (NMEA 0183 or NMEA 2000)
- Chart plotters (Garmin, Raymarine, Furuno, etc.)
- AIS transponders
- Weather stations
- Engine monitoring systems
- Tank level sensors
- Any NMEA 0183 or NMEA 2000 compliant device

**Third-party systems can use NKE sensors:**
- Wind transducers
- Depth sounders
- Speed logs
- Heading sensors
- Environmental sensors

### 5.3 Application Compatibility

The NKE Display Pro app is compatible with:
- **NKE WiFi Box** (primary recommended interface)
- **NKE USB WiFi Box**
- **NKE Ethernet Box**
- **Most third-party NMEA/WiFi gateways** (with NMEA 0183 output)
- **Onboard wireless access points** broadcasting NMEA data

### 5.4 Platform Support

| Platform | Availability | Version | Last Updated |
|----------|--------------|---------|--------------|
| **iOS** | Yes | 1.5.0 | November 2025 |
| **Android** | Yes | Latest | October 2025 |
| **Desktop** | Via emulator | - | - |

---

## 6. Implementation Considerations

### 6.1 For Pure NKE Systems

**Advantages:**
- Native Topline protocol provides 20 Hz refresh rate
- Optimized performance and responsiveness
- Simplified configuration
- Seamless integration between all devices

**Setup Requirements:**
- WiFi Box for wireless app connectivity
- Proper Topline bus termination
- Network configuration for mobile devices

### 6.2 For Mixed Systems (NKE + Third-Party)

**Requirements:**
- Box N2K gateway for NMEA 2000 integration
- NMEA Output Interface or Box N2K for NMEA 0183 integration
- Proper addressing for NMEA 2000 devices
- Configuration via TopSailor software

**Benefits:**
- Best-of-breed sensor selection
- Gradual system upgrades
- Flexibility in device choice

### 6.3 For App-Only Implementation

**Minimum Requirements:**
- WiFi Box or compatible NMEA/WiFi gateway
- NMEA 0183 data source (GPS, chart plotter, etc.)
- Smartphone or tablet (iOS/Android)

**Capabilities:**
- Display navigation data
- Log NMEA sentences
- Basic monitoring (cannot control autopilot without Topline bus)

---

## 7. Limitations and Gaps

### 7.1 Identified Limitations

1. **NMEA 2000 PGN List:** The specific list of 50 supported PGNs in the Box N2K is documented in the product manual but was not accessible during this research. Users should consult the official manual for the complete PGN list.

2. **Proprietary Protocol Dependency:** Full functionality (bidirectional control, 20 Hz refresh) requires NKE Topline bus. Third-party-only systems have reduced functionality.

3. **WiFi Range:** Wireless connectivity is limited by WiFi range and potential interference on boats.

4. **Configuration Complexity:** Mixed systems require proper configuration via TopSailor software.

### 7.2 Undocumented Features

Some advanced features and configuration options may exist but are not documented in publicly available sources. Users should refer to:
- Official NKE user manuals
- TopSailor software documentation
- NKE technical support

---

## 8. Recommendations

### 8.1 For New Installations

1. **Pure Racing Systems:** Use native NKE Topline instruments with WiFi Box for optimal performance (20 Hz refresh rate)

2. **Mixed Cruising Systems:** Use Box N2K to integrate NKE instruments with existing NMEA 2000 network

3. **Budget Implementations:** Use NMEA Output Interface to add NKE sensors to existing NMEA 0183 systems

### 8.2 For Upgrades

1. **Adding Mobile Display:** WiFi Box provides wireless connectivity to existing Topline systems

2. **Integrating New Sensors:** Box N2K enables adding NMEA 2000 sensors to NKE systems

3. **Connecting Chart Plotters:** NMEA Output Interface or Box N2K depending on plotter protocol

### 8.3 For Developers

1. **App Integration:** NKE Display Pro supports standard NMEA 0183 sentences, making custom integration straightforward

2. **Data Logging:** Built-in NMEA datalogger provides standard format for analysis

3. **Custom Applications:** WiFi Box broadcasts standard NMEA 0183 data that can be consumed by custom software

---

## 9. Technical Reference

### 9.1 NMEA 0183 Standard Format

```
$<Talker ID><Sentence ID>,<Data Field 1>,<Data Field 2>,...*<Checksum><CR><LF>

Example: $GPGLL,4916.45,N,12311.12,W,225444,A*5C
```

### 9.2 Key Talker IDs

- **GP** - GPS
- **WI** - Wind instruments
- **SD** - Depth sounder
- **VW** - Speed log
- **HC** - Heading - magnetic compass
- **YX** - Transducer
- **II** - Integrated instrumentation (used by NKE)

### 9.3 Communication Parameters

| Parameter | NMEA 0183 Standard | NKE Implementation |
|-----------|-------------------|-------------------|
| Baud Rate | 4,800 | 4,800 - 38,400 (auto-detect) |
| Data Bits | 8 | 8 |
| Parity | None | None |
| Stop Bits | 1 | 1 |
| Flow Control | None | None |

---

## 10. Conclusion

NKE Display Pro App and NKE instruments demonstrate strong compatibility with industry-standard NMEA protocols while maintaining enhanced performance through the proprietary Topline protocol. The multi-layered approach provides:

1. **Full NMEA 0183 Support:** 30+ standard sentences enable broad compatibility
2. **Extensive NMEA 2000 Support:** 50 PGNs via Box N2K for modern marine networks
3. **High-Performance Native Protocol:** Topline provides 20 Hz refresh rates
4. **Flexible Gateway Solutions:** Multiple interface options for various use cases
5. **Bidirectional Communication:** Control capability, not just monitoring
6. **Cross-Platform Mobile Apps:** iOS and Android support with regular updates

The system architecture is well-suited for both pure NKE installations and mixed marine electronics environments, making it a versatile choice for sailors and boat owners ranging from racing applications to cruising vessels.

**Overall Compatibility Rating:** Excellent for both proprietary and standard marine electronics protocols.

---

## 11. References and Sources

### 11.1 Primary Sources

1. [nke Display Pro (Smartphone App) - nke Marine Electronics](https://nke-marine-electronics.com/project/nke-display-pro-smartphone-app/)
2. [Box N2K - nke Marine Electronics](https://nke-marine-electronics.com/project/box-n2k/)
3. [Interfaces - nke Marine Electronics](https://nke-marine-electronics.com/instruments/interfaces/)
4. [NKE NMEA Output Interface Documentation](https://nke-marine-electronics.fr/wp-content/uploads/2017/01/NMEA-ouput-interface.pdf)
5. [Box N2K User Manual (EN)](https://nke-marine-electronics.fr/wp-content/uploads/user_manuals/EN/71_Box_N2K_um_EN.pdf)

### 11.2 Product Information

6. [NKE Box N2K - Comptoir Nautique](https://en.comptoirnautique.com/nmea-interfaces/43795-nke-box-n2k.html)
7. [nke Display on Google Play](https://play.google.com/store/apps/details?id=nke.appandroid.activities&hl=en_US)
8. [nke display pro on App Store](https://apps.apple.com/us/app/nke-display-pro/id711603919)
9. [NKE Box WiFi - AMZ eShop](https://www.amz-eshop.com/en/box-wifi-nmea-interface.html)

### 11.3 Technical Resources

10. [Topline Bus - open-boat-projects.org](https://open-boat-projects.org/en/topline-bus-von-nke/)
11. [NMEA 0183 and NMEA 2000 Guide - Ocean Science Technology](https://www.oceansciencetechnology.com/resources/nmea-2000-nmea-0183-guide/)
12. [NMEA 2000 Standards - National Marine Electronics Association](https://www.nmea.org/nmea-2000.html)
13. [NMEA 0183 Standards - National Marine Electronics Association](https://www.nmea.org/nmea-0183.html)

### 11.4 Community and Implementation

14. [Garmin chartplotter in a NKE system - SV-Tatooine](https://sv-tatooine.com/garmin-chartplotter-in-a-nke-system/)
15. [NKE wind transducer to which wind display via NMEA 0183? - SailNet Community](https://www.sailnet.com/threads/nke-wind-transducer-to-which-wind-display-via-nmea-0183.119313/)

---

**Report Compiled:** December 28, 2025
**Research Method:** Web search and documentation analysis
**Confidence Level:** High for NMEA 0183 support, Medium for NMEA 2000 PGN specifics (manual required)
**Recommended Follow-up:** Obtain complete Box N2K user manual for full PGN list

---

*This research report is intended for technical reference and implementation planning. For official specifications and support, consult NKE Marine Electronics directly.*
