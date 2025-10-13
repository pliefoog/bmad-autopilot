# Requirements

## Overview & User Value Context

This Requirements section defines the functional and non-functional capabilities needed to deliver the Boating Instruments App MVP. Requirements are organized by user value themes and mapped to phased delivery milestones (Month 1, 3, 5, 6-7) to support the 7-month iOS/Android launch timeline.

---

## User Value Theme 1: Solo Sailors Can Monitor Boat from Any Location

**WHY:** Addresses Project Brief pain point: "Solo sailors must leave the helm to check instruments at the nav station, taking attention away from boat handling, creating safety concerns."

**Functional Requirements:**

**FR1:** The system shall connect to NMEA WiFi bridges via TCP/UDP sockets and maintain persistent connection with automatic reconnection on failure.

**FR2:** The system shall parse NMEA 0183 sentences and NMEA 2000 PGNs from the WiFi bridge data stream in real-time.

**FR3:** The system shall provide a widget library containing 10 predefined instrument widgets for MVP: Depth, Speed, Wind (Apparent), GPS Position, Compass, Engine, Battery, Tank Levels, Autopilot Status, and Rudder Position. _(Architectural note: Widget framework shall be designed with extensibility to support custom user-defined widgets in Phase 1.5+ per NFR17.)_

**FR7:** The system shall display depth data in user-configured units (meters, feet, fathoms) with both digital and analog visualization options.

**FR8:** The system shall display speed data (STW and/or SOG) in user-configured units (knots, km/h, mph).

**FR9:** The system shall display apparent wind angle and speed with analog compass rose visualization option.

**FR10:** The system shall display GPS position (lat/long), Course Over Ground (COG), and Speed Over Ground (SOG).

**FR11:** The system shall display compass heading (magnetic or true) with analog compass rose visualization.

**FR28:** The system shall provide global settings for unit preferences (speed, depth, temperature, distance, wind speed).

**FR29:** The system shall provide a connection settings interface for WiFi bridge configuration allowing users to manually enter IP address or hostname, accessible both from first-run wizard and global settings.

**FR32:** The system shall handle missing NMEA data gracefully by displaying "--" or "N/A" in widgets when data is unavailable, and shall continue to display persisted widgets even when their corresponding NMEA data source becomes unavailable.

**FR33:** The system shall update widget displays in real-time with <1 second latency when NMEA data changes.

**FR36:** The system shall display a discrete connection status indicator (colored dot) in a persistent header/status bar visible across all screens showing: Red (not connected to WiFi bridge), Orange (connected but no NMEA data flowing), Green (connected with active NMEA data stream).

---

## User Value Theme 2: Flexible Dashboard Customization Replaces Fixed Physical Instruments

**WHY:** Addresses Project Brief value proposition: "Widget-based dashboard architecture enables customization impossible with physical instruments - users compose their ideal instrument panel matching their specific needs and device capabilities."

**Functional Requirements:**

**FR4:** The system shall allow users to drag-and-drop widgets onto a customizable dashboard canvas.

**FR5:** The system shall allow users to resize widgets by dragging corner handles.

**FR6:** The system shall persist custom dashboard layouts per physical device across app restarts, with no synchronization between devices in MVP.

**FR39:** The system shall provide a widget selector interface allowing users to browse the widget library and add selected widgets to their dashboard.

**FR43:** The system shall auto-detect all NMEA parameters available on the network and present them in a browseable list for user selection during widget configuration and alarm setup. _(Foundation for Phase 1.5 custom widget composition.)_

---

## User Value Theme 3: Powerboaters Get Comprehensive Engine & Systems Monitoring

**WHY:** Addresses Project Brief secondary user segment: "Powerboaters (40-50ft motor yachts) need comprehensive engine monitoring, fuel management, and systems health tracking without adding more physical gauges to enclosed helm stations."

**Functional Requirements:**

**FR12:** The system shall display engine metrics (RPM, coolant temperature, oil pressure) with the Engine Widget automatically adapting to show single-engine data in full widget space, or split the widget to display Engine 1 metrics in left half and Engine 2 metrics in right half when dual-engine NMEA data is detected.

**FR13:** The system shall display battery voltage for house and/or engine batteries.

**FR14:** The system shall display tank levels (fuel, water, waste water) with bar graph visualization. Users shall be able to customize the tank widget title to clarify tank type (grey water, drinking water, fuel, holding tank) based on their boat configuration.

**FR35:** The system shall allow users to configure which NMEA data source each widget displays when multiple sources of the same data type are available on the network (e.g., selecting Port vs. Starboard engine, House vs. Engine battery).

---

## User Value Theme 4: Safe Hands-Free Autopilot Control from Cockpit

**WHY:** Addresses Project Brief primary use case: "Solo sailors need cockpit access to autopilot control - don't want to go below deck to adjust course while trimming sails. P70 autopilot controller replacement functionality is core value proposition."

**Functional Requirements:**

**FR15:** The system shall display autopilot status including current mode (Auto/Standby/Wind/Track), target heading, and active/inactive status.

**FR16:** The system shall display rudder position with angle indicator visualization.

**FR17:** The system shall send bi-directional autopilot control commands to Raymarine Evolution autopilots via NMEA using the EVO protocol.

**FR18:** The system shall allow users to adjust autopilot heading in ±1° and ±10° increments via touch interface.

**FR19:** The system shall allow users to switch autopilot modes (Auto, Standby, Wind Vane, Track, Power Steer) via touch interface.

**FR20:** The system shall provide visual confirmation feedback when autopilot commands are sent successfully.

**FR21:** The system shall display clear error messages when autopilot commands fail.

**FR37:** The system shall implement a 5-second countdown with abort button for Tack and Gybe autopilot commands before transmitting instruction to boat.

---

## User Value Theme 5: Safety-Critical Alarms and Monitoring

**WHY:** Addresses Project Brief safety requirements: "Solo sailors and powerboaters need reliable alarms for depth, wind shift, engine parameters, battery voltage - matching or exceeding physical instrument alarm capabilities."

**Functional Requirements:**

**FR22:** The system shall allow users to configure threshold alarms for depth, wind shift (angle and intensity), speed, and battery voltage. _(Pre-defined alarm templates for common scenarios.)_

**FR23:** The system shall trigger visual and audio alerts when alarm thresholds are met.

**FR24:** The system shall allow users to acknowledge alarms via touch to dismiss alerts.

**FR25:** The system shall maintain alarm state until explicitly acknowledged by user.

**FR41:** The system shall provide alarm history log displaying the last 10 triggered alarms with timestamp, alarm name, parameter value that triggered the alarm, and acknowledgment status.

**FR42:** The system shall provide grouped alarm widgets that display multiple related alarm conditions in a single widget panel, showing each alarm's current value, threshold, and status (OK/WARNING/ALARM) with color coding (green/yellow/red). Pre-defined templates shall include "Motor Alarms" (engine temp, oil pressure, coolant level) and "Sailing Alarms" (depth, wind shift, speed).

**FR44:** The system shall allow users to configure alarm thresholds (upper and/or lower bounds) for any NMEA parameter detected on the network, and group multiple alarms into pre-defined templates (Motor Alarms, Sailing Alarms) or custom alarm groups for their specific boat configuration.

---

## User Value Theme 6: Night Sailing and Multi-Environment Use

**WHY:** Addresses Project Brief user segment needs: "Solo sailors making overnight passages need red-night mode to preserve night vision. All users need displays optimized for different lighting conditions (bright sun, dusk, overnight)."

**Functional Requirements:**

**FR26:** The system shall provide three display modes: Day (full color), Night (dimmed), and Red Night (red-only spectrum to preserve night vision).

**FR27:** The system shall allow users to manually switch between display modes or configure automatic switching based on time.

---

## User Value Theme 7: Onboarding, Settings, and Usability

**WHY:** Addresses Project Brief success metrics: "98%+ first-connection success rate requires clear setup guidance. User retention requires intuitive onboarding and persistent settings."

**Functional Requirements:**

**FR30:** The system shall persist all user settings across app restarts.

**FR34:** The system shall provide a first-run setup wizard guiding users through WiFi bridge manual connection (via FR29), widget selection (via FR39), and safety disclaimers. The wizard may be skipped to allow users to enter the app in demo/playback mode with sample data.

---

## User Value Theme 8: Development, Testing, and Demo Capabilities

**WHY:** Addresses Project Brief development constraints: "Limited access to physical boats for testing. Beta testers need easy demonstration capability. App store marketing requires demo videos."

**Functional Requirements:**

**FR31:** The system shall support playback mode allowing users to load and replay recorded NMEA message files, simulating both incoming NMEA data streams and outgoing autopilot command transmission for development, testing, and demonstration purposes.

**FR38:** The system shall treat playback mode and live WiFi bridge connection as mutually exclusive - when playback mode is active, no real WiFi bridge connection shall be established; when connected to WiFi bridge, playback mode shall be unavailable.

**FR40:** The system shall provide a file picker interface for selecting and loading NMEA recording files in playback mode.

---

## Non Functional Requirements

---

## Reliability & Success Metrics (Aligned with Project Brief Goals)

**NFR1:** The system shall achieve 98% or higher first-connection success rate across Quark-Elec A032, Actisense W2K-1, and at least one other WiFi bridge model.

**NFR2:** The system shall achieve 99% or higher autopilot command success rate (commands execute correctly on boat).

**NFR3:** The system shall achieve 99.5% or higher crash-free session rate (less than 1 crash per 200 app sessions).

**NFR14:** The system shall implement crash reporting (Sentry or similar) to enable monitoring of 99.5% crash-free rate target.

**NFR16:** The system shall handle corrupt or out-of-range NMEA data gracefully without crashes, logging errors for developer analysis.

**NFR18:** The system shall maintain automated test coverage of ≥70% for core functionality including NMEA parsing, widget rendering, autopilot control, and alarm processing to ensure maintainability and quality gates are met.

---

## Performance Requirements

**NFR4:** The system shall maintain responsive UI performance with 10 or more active widgets displaying real-time data, with widget updates rendering within 100ms of NMEA data changes and no perceptible lag during user interactions (drag-drop, resize, navigation).

**NFR5:** The system shall operate efficiently to enable at least 8 hours of continuous use on a fully charged mobile device battery.

**NFR10:** The system shall handle incoming NMEA data streams of up to 500 messages per second without performance degradation (realistic upper bound for NMEA2000 CAN bus traffic at 250 kbit/s), while limiting outgoing autopilot command transmission to a maximum of 3 commands per second to respect boat system processing constraints.

**NFR11:** The system shall handle WiFi connection failures gracefully with automatic reconnection attempts and clear status indicators.

---

## Platform & Deployment Requirements

**NFR6:** The system shall function fully offline (no internet connection required) using only local WiFi connection to NMEA bridge.

**NFR7:** The system shall use a single codebase to deploy native apps on **iOS 15+ and Android 10+ for MVP launch (Month 7)**. Windows 10/11 and macOS 11+ (Intel and Apple Silicon) platform support shall be delivered in **Phase 1.5 (Month 8-9)** using React Native for Windows and React Native for macOS.

**NFR8:** The system shall adapt UI responsively across device sizes from 5" phone screens to 27" desktop monitors.

**NFR9:** The system shall support both portrait and landscape device orientations without loss of functionality.

**NFR12:** The system shall comply with iOS App Store, Google Play Store, Microsoft Store, and Mac App Store submission requirements including privacy policies and age ratings.

**NFR13:** The system shall store all user data locally (settings, layouts, cached data) with no cloud storage or external data transmission in MVP.

---

## Architecture & Maintainability Requirements

**NFR15:** The system shall be maintainable by a solo developer or small team (2-3 people) throughout the 7-month development timeline.

**NFR17:** The system's widget framework architecture shall be designed with extensibility to support future custom widget composition (Phase 1.5+), where users can create custom widgets by selecting base widget templates (Data Grid, Gauge, Bar Graph, Status Panel, Compass) and populating them with any compatible NMEA parameters. MVP shall ship with 10 pre-defined widgets, with the architectural foundation enabling custom composition post-MVP without major refactoring.

---
