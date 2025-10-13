# Boating Instruments App Product Requirements Document (PRD)

---

## Goals and Background Context

### Goals

- Launch a functional MVP of the Boating Instruments App within 7 months that transforms smartphones, tablets, and desktop devices into comprehensive marine instrument displays and autopilot controllers
- Enable solo/short-handed sailors to safely monitor all critical boat parameters and control autopilot from any location on the vessel without requiring additional hardware beyond existing WiFi bridges
- Provide powerboaters with comprehensive engine and systems monitoring through customizable widget-based dashboards that adapt to any screen size
- Achieve 99.5% crash-free session rate and 98%+ NMEA connection success rate across multiple WiFi bridge models, establishing reliability standards matching physical marine instruments
- Acquire 50 beta users (Month 6-7) and 150 paying users by Month 12 at $79.99 one-time purchase pricing, generating $12,000 revenue
- Establish credibility through 10+ documented successful Raymarine Evolution autopilot control sessions with video proof before public launch

### Background Context

Recreational boating instruments have remained largely unchanged for decades. Physical marine instruments—depth gauges, speed displays, wind instruments, autopilot controllers—are reliable but suffer from inherent limitations: they're fixed-location devices that can only be viewed from their mounted position, display single functions, offer limited customization, provide no historical data, and are expensive to expand ($200-$800+ per additional display plus installation). Solo sailors must leave the helm to check instruments at the nav station, taking attention away from boat handling. Powerboaters at enclosed helm stations cannot easily monitor instruments mounted outside. The market gap is clear: boaters carry powerful smartphones and tablets on board with better displays and interfaces than their dedicated instruments, and WiFi bridges that expose NMEA data are becoming standard equipment, yet no comprehensive app exists that truly replicates the full suite of dedicated instruments (particularly autopilot control) with modern conveniences.

The Boating Instruments App addresses this by connecting to existing boat NMEA networks via WiFi bridges, providing a widget-based dashboard architecture where users compose their ideal instrument layout. The MVP focuses on 10 core instrument widgets (depth, speed, wind, GPS, compass, engine, battery, tanks, autopilot status, rudder) plus full Raymarine Evolution autopilot control via touch interface, display modes (day/night/red-night), basic alarms, and cross-platform support (iOS, Android, Windows, Mac). Voice commands and trip logging—originally considered for MVP—have been deferred to Phase 2 to reduce complexity and ensure launch timeline is achievable.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-08 | 1.0 | Initial PRD creation from Project Brief | PM Agent |

---

## Technical Architecture

### Technology Stack

**UI Framework:** React Native (v0.76+)
- **Mobile:** React Native core for iOS and Android
- **Desktop:** React Native for Windows and React Native for macOS (Microsoft-maintained)
- **Language:** TypeScript for type safety and maintainability
- **State Management:** React Context API + Zustand (or Redux Toolkit) for global state

**Networking Layer:**
- **TCP/UDP Sockets:**
  - `react-native-tcp-socket` (v6.3+) - TCP socket API for Android, iOS, and macOS with SSL/TLS support
  - `react-native-udp` - UDP socket API for Android and iOS
- **NMEA Parsing:**
  - `nmea-simple` - NMEA 0183 sentence parser with TypeScript support
  - `@canboat/canboatjs` - TypeScript library for NMEA 2000 PGN parsing and encoding
- **Connection Management:** Custom reconnection logic with exponential backoff

**UI Components:**
- **Cross-Platform:** React Native core components (View, Text, TouchableOpacity, etc.)
- **Advanced UI:** React Native Reanimated for smooth animations and gestures
- **Drag & Drop:** React Native Gesture Handler + custom drag-drop implementation
- **Charts/Gauges:** React Native SVG + custom instrument components (analog compass rose, bar graphs, angle indicators)

**Platform-Specific Adaptations:**
- **Windows:** React Native for Windows + WinUI 3 controls where needed
- **macOS:** React Native for macOS + AppKit integration for native feel
- **Mobile:** Standard React Native iOS/Android APIs

**Data Persistence:**
- **Settings & Layouts:** AsyncStorage (mobile) with platform-specific equivalents (UserDefaults/SharedPreferences)
- **Recorded NMEA Files:** File system access via `react-native-fs` or platform-specific file APIs

**Error Tracking & Monitoring:**
- **Crash Reporting:** Sentry React Native SDK
- **Analytics:** Minimal telemetry for crash-free rate monitoring (NFR3: 99.5%+)

**Development Tools:**
- **Build System:** Metro bundler (React Native default)
- **Testing:** Jest + React Native Testing Library
- **Linting:** ESLint + Prettier
- **Type Checking:** TypeScript strict mode

### Architecture Patterns

**Layer Architecture:**
```
┌─────────────────────────────────────┐
│   Presentation Layer (UI)           │
│   - Widgets (Depth, Speed, etc.)    │
│   - Dashboard Layout Manager        │
│   - Settings Screens                │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Business Logic Layer              │
│   - NMEA Data Store (state)         │
│   - Autopilot Command Handler       │
│   - Alarm Manager                   │
│   - Unit Converter                  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Data Access Layer                 │
│   - NMEA Connection Manager         │
│   - TCP/UDP Socket Abstraction      │
│   - NMEA 0183/2000 Parser           │
│   - Settings Persistence            │
└─────────────────────────────────────┘
```

**Key Design Decisions:**

1. **Single Codebase Strategy:** React Native core codebase (~95% shared) with platform-specific extensions for Windows/macOS where needed. Platform files use `.ios.tsx`, `.android.tsx`, `.windows.tsx`, `.macos.tsx` suffixes.

2. **Widget System:** Component-based architecture where each widget is a self-contained React component that subscribes to relevant NMEA data streams via context/state management.

3. **Real-Time Data Flow:**
   - TCP/UDP socket receives raw NMEA bytes
   - Parser converts to structured data objects
   - State manager updates subscribed widget components
   - React's rendering engine updates UI (<1s latency per FR33)

4. **Connection Resilience:** Automatic reconnection with exponential backoff (1s, 2s, 4s, 8s, 15s max) and clear connection status indicators in UI.

5. **Responsive Layout:** Flexbox-based layout system that adapts widget grid dynamically based on screen dimensions, with separate phone/tablet/desktop breakpoints.

### Deployment Strategy

**Mobile:**
- iOS: Xcode build → App Store submission
- Android: Gradle build → Google Play Store submission

**Desktop:**
- Windows: React Native Windows build → MSIX packaging → Microsoft Store
- macOS: React Native macOS build → .app bundle → Mac App Store (notarized)

**Code Signing:** Platform-specific certificates (Apple Developer, Google Play, Microsoft Partner Center)

**Update Strategy:** App store updates for MVP; future over-the-air updates via CodePush for non-native changes

---

## Requirements

### Overview & User Value Context

This Requirements section defines the functional and non-functional capabilities needed to deliver the Boating Instruments App MVP. Requirements are organized by user value themes and mapped to phased delivery milestones (Month 1, 3, 5, 6-7) to support the 7-month iOS/Android launch timeline.

---

### User Value Theme 1: Solo Sailors Can Monitor Boat from Any Location

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

### User Value Theme 2: Flexible Dashboard Customization Replaces Fixed Physical Instruments

**WHY:** Addresses Project Brief value proposition: "Widget-based dashboard architecture enables customization impossible with physical instruments - users compose their ideal instrument panel matching their specific needs and device capabilities."

**Functional Requirements:**

**FR4:** The system shall allow users to drag-and-drop widgets onto a customizable dashboard canvas.

**FR5:** The system shall allow users to resize widgets by dragging corner handles.

**FR6:** The system shall persist custom dashboard layouts per physical device across app restarts, with no synchronization between devices in MVP.

**FR39:** The system shall provide a widget selector interface allowing users to browse the widget library and add selected widgets to their dashboard.

**FR43:** The system shall auto-detect all NMEA parameters available on the network and present them in a browseable list for user selection during widget configuration and alarm setup. _(Foundation for Phase 1.5 custom widget composition.)_

---

### User Value Theme 3: Powerboaters Get Comprehensive Engine & Systems Monitoring

**WHY:** Addresses Project Brief secondary user segment: "Powerboaters (40-50ft motor yachts) need comprehensive engine monitoring, fuel management, and systems health tracking without adding more physical gauges to enclosed helm stations."

**Functional Requirements:**

**FR12:** The system shall display engine metrics (RPM, coolant temperature, oil pressure) with the Engine Widget automatically adapting to show single-engine data in full widget space, or split the widget to display Engine 1 metrics in left half and Engine 2 metrics in right half when dual-engine NMEA data is detected.

**FR13:** The system shall display battery voltage for house and/or engine batteries.

**FR14:** The system shall display tank levels (fuel, water, waste water) with bar graph visualization. Users shall be able to customize the tank widget title to clarify tank type (grey water, drinking water, fuel, holding tank) based on their boat configuration.

**FR35:** The system shall allow users to configure which NMEA data source each widget displays when multiple sources of the same data type are available on the network (e.g., selecting Port vs. Starboard engine, House vs. Engine battery).

---

### User Value Theme 4: Safe Hands-Free Autopilot Control from Cockpit

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

### User Value Theme 5: Safety-Critical Alarms and Monitoring

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

### User Value Theme 6: Night Sailing and Multi-Environment Use

**WHY:** Addresses Project Brief user segment needs: "Solo sailors making overnight passages need red-night mode to preserve night vision. All users need displays optimized for different lighting conditions (bright sun, dusk, overnight)."

**Functional Requirements:**

**FR26:** The system shall provide three display modes: Day (full color), Night (dimmed), and Red Night (red-only spectrum to preserve night vision).

**FR27:** The system shall allow users to manually switch between display modes or configure automatic switching based on time.

---

### User Value Theme 7: Onboarding, Settings, and Usability

**WHY:** Addresses Project Brief success metrics: "98%+ first-connection success rate requires clear setup guidance. User retention requires intuitive onboarding and persistent settings."

**Functional Requirements:**

**FR30:** The system shall persist all user settings across app restarts.

**FR34:** The system shall provide a first-run setup wizard guiding users through WiFi bridge manual connection (via FR29), widget selection (via FR39), and safety disclaimers. The wizard may be skipped to allow users to enter the app in demo/playback mode with sample data.

---

### User Value Theme 8: Development, Testing, and Demo Capabilities

**WHY:** Addresses Project Brief development constraints: "Limited access to physical boats for testing. Beta testers need easy demonstration capability. App store marketing requires demo videos."

**Functional Requirements:**

**FR31:** The system shall support playback mode allowing users to load and replay recorded NMEA message files, simulating both incoming NMEA data streams and outgoing autopilot command transmission for development, testing, and demonstration purposes.

**FR38:** The system shall treat playback mode and live WiFi bridge connection as mutually exclusive - when playback mode is active, no real WiFi bridge connection shall be established; when connected to WiFi bridge, playback mode shall be unavailable.

**FR40:** The system shall provide a file picker interface for selecting and loading NMEA recording files in playback mode.

---

### Non Functional Requirements

---

### Reliability & Success Metrics (Aligned with Project Brief Goals)

**NFR1:** The system shall achieve 98% or higher first-connection success rate across Quark-Elec A032, Actisense W2K-1, and at least one other WiFi bridge model.

**NFR2:** The system shall achieve 99% or higher autopilot command success rate (commands execute correctly on boat).

**NFR3:** The system shall achieve 99.5% or higher crash-free session rate (less than 1 crash per 200 app sessions).

**NFR14:** The system shall implement crash reporting (Sentry or similar) to enable monitoring of 99.5% crash-free rate target.

**NFR16:** The system shall handle corrupt or out-of-range NMEA data gracefully without crashes, logging errors for developer analysis.

**NFR18:** The system shall maintain automated test coverage of ≥70% for core functionality including NMEA parsing, widget rendering, autopilot control, and alarm processing to ensure maintainability and quality gates are met.

---

### Performance Requirements

**NFR4:** The system shall maintain responsive UI performance with 10 or more active widgets displaying real-time data, with widget updates rendering within 100ms of NMEA data changes and no perceptible lag during user interactions (drag-drop, resize, navigation).

**NFR5:** The system shall operate efficiently to enable at least 8 hours of continuous use on a fully charged mobile device battery.

**NFR10:** The system shall handle incoming NMEA data streams of up to 500 messages per second without performance degradation (realistic upper bound for NMEA2000 CAN bus traffic at 250 kbit/s), while limiting outgoing autopilot command transmission to a maximum of 3 commands per second to respect boat system processing constraints.

**NFR11:** The system shall handle WiFi connection failures gracefully with automatic reconnection attempts and clear status indicators.

---

### Platform & Deployment Requirements

**NFR6:** The system shall function fully offline (no internet connection required) using only local WiFi connection to NMEA bridge.

**NFR7:** The system shall use a single codebase to deploy native apps on **iOS 15+ and Android 10+ for MVP launch (Month 7)**. Windows 10/11 and macOS 11+ (Intel and Apple Silicon) platform support shall be delivered in **Phase 1.5 (Month 8-9)** using React Native for Windows and React Native for macOS.

**NFR8:** The system shall adapt UI responsively across device sizes from 5" phone screens to 27" desktop monitors.

**NFR9:** The system shall support both portrait and landscape device orientations without loss of functionality.

**NFR12:** The system shall comply with iOS App Store, Google Play Store, Microsoft Store, and Mac App Store submission requirements including privacy policies and age ratings.

**NFR13:** The system shall store all user data locally (settings, layouts, cached data) with no cloud storage or external data transmission in MVP.

---

### Architecture & Maintainability Requirements

**NFR15:** The system shall be maintainable by a solo developer or small team (2-3 people) throughout the 7-month development timeline.

**NFR17:** The system's widget framework architecture shall be designed with extensibility to support future custom widget composition (Phase 1.5+), where users can create custom widgets by selecting base widget templates (Data Grid, Gauge, Bar Graph, Status Panel, Compass) and populating them with any compatible NMEA parameters. MVP shall ship with 10 pre-defined widgets, with the architectural foundation enabling custom composition post-MVP without major refactoring.

---

## Phased Delivery Milestones

Requirements are mapped to Project Brief checkpoint gates to support iterative development and risk management:

---

### **Month 1 Gate: NMEA Connectivity Spike**

**Objective:** Prove NMEA connectivity with real WiFi bridge. Parse NMEA 0183 and 2000 messages. Display raw data.

**Requirements in Scope:**
- FR1, FR2, FR29, FR30, FR32, FR36
- NFR1, NFR6, NFR11, NFR16

**Success Criteria:** Can reliably connect to WiFi bridge, parse incoming NMEA data, display connection status, handle connection failures gracefully.

**Risk Mitigation:** If connectivity unreliable, reassess technical approach or WiFi bridge compatibility.

---

### **Month 3 Gate: Widget Framework + 5 Core Widgets**

**Objective:** Dashboard responsive on phone/tablet with 5 functional widgets displaying real-time NMEA data.

**Requirements in Scope:**
- FR3, FR4, FR5, FR6, FR28, FR33, FR39
- FR7 (Depth), FR8 (Speed), FR9 (Wind), FR10 (GPS), FR11 (Compass)
- NFR4, NFR8, NFR9, NFR17 (architecture foundation)

**Success Criteria:** Users can add widgets to dashboard, drag-drop, resize, persist layouts. 5 widgets display live NMEA data with <1s latency.

**Risk Mitigation:** If widget framework too complex, reduce scope to 3 widgets or defer drag-drop to Month 4.

---

### **Month 5 Gate: Autopilot Control Working**

**Objective:** Raymarine EVO autopilot commands work on at least one test boat.

**Requirements in Scope:**
- FR15 (Autopilot Status widget - if not in Month 3)
- FR17, FR18, FR19, FR20, FR21, FR37
- FR31, FR38, FR40 (playback mode for testing)
- NFR2, NFR10

**Success Criteria:** Can send autopilot heading adjustments, mode switches. Commands execute on boat with 99%+ success. Tack/Gybe countdown works.

**Risk Mitigation:** If autopilot control fails, consider instruments-only MVP (defer autopilot to Phase 2). This is highest technical risk item.

---

### **Month 6: Remaining Widgets + Features**

**Objective:** Complete all 10 widgets, alarms, display modes, onboarding.

**Requirements in Scope:**
- FR12, FR13, FR14, FR16 (remaining widgets)
- FR22, FR23, FR24, FR25, FR41, FR42, FR43, FR44 (alarms)
- FR26, FR27 (display modes)
- FR34, FR35 (onboarding, widget configuration)
- NFR5, NFR17 (performance, architecture)

**Success Criteria:** All widgets functional. Alarms trigger reliably. First-run wizard complete. 8+ hour battery life achieved.

---

### **Month 7: Beta Testing + Launch Prep**

**Objective:** 50 beta users, achieve quality gates, prepare app store submissions.

**Requirements in Scope:**
- NFR3, NFR14, NFR18 (quality/testing gates)
- Bug fixes, performance optimization
- App store compliance (NFR12)

**Success Criteria:**
- 99.5%+ crash-free rate sustained for 2 weeks
- 98%+ NMEA connection success across 3+ WiFi bridge models
- 10+ documented autopilot sessions
- All requirements validated by beta users

**Launch Decision:** If success criteria met, proceed to public launch. If not, extend beta period.

---

### **Phase 1.5 (Month 8-9): Desktop Platforms + Custom Widgets**

**Post-MVP Enhancements:**
- NFR7: Windows/macOS platform support
- NFR17: Custom widget composition capability
- Additional widgets based on user feedback (generator, transmission, bilge)

---

## Requirements Priority (MoSCoW)

---

### **Must-Have for MVP Launch (Month 7):**
- All FR1-FR44 (with FR43 limited to parameter browsing, full custom composition deferred)
- NFR1-NFR6, NFR8-NFR11, NFR13-NFR16, NFR18
- NFR7 (iOS/Android only)

### **Should-Have (Phase 1.5, Month 8-9):**
- NFR7 (Windows/macOS platforms)
- NFR17 (Custom widget composition)

### **Could-Have (Post-MVP Roadmap):**
- Analytics/telemetry (descoped from MVP per user feedback)
- In-app feedback/rating prompts (descoped)
- Autopilot session logging/export (descoped)
- Trip logging to GPX (deferred to Phase 2 per Brief)
- Voice commands (deferred to Phase 2 per Brief)

---

## User Interface Design Goals

### Overall UX Vision

The Boating Instruments App replicates the familiar look and feel of physical Raymarine instruments (P70 autopilot controller, i70s displays) while adding modern flexibility through a widget-based architecture. The interface prioritizes **glanceability** (instant data recognition from any distance), **touch-friendliness** (large, easy-to-hit targets for use while boat is moving), and **clarity in all lighting conditions** (day/night/red-night modes). The design philosophy is "familiar instruments, flexible arrangement" - boaters should instantly recognize each widget type while enjoying customization impossible with physical hardware.

### Key Interaction Paradigms

**Widget-Centric Dashboard:**
Users compose their ideal instrument panel by selecting widgets from a library and arranging them freely on a canvas. Phone users swipe between focused widget views or scroll through a vertical list. Tablet/desktop users see multiple widgets simultaneously in a grid layout that adapts to screen real estate.

**Direct Manipulation:**
Drag-and-drop widget placement, corner-drag resizing, and tap-to-configure interactions follow modern UI conventions. No hidden menus or complex navigation - all controls are visible and direct.

**Autopilot Control Zone:**
Autopilot controls (when widget is active) use large, clearly labeled buttons with visual feedback. Critical operations (Tack/Gybe) include countdown timers with prominent abort buttons. Mode switches use toggle-style selectors.

**Contextual Settings:**
Long-press or right-click on widgets reveals contextual menus (configure units, change visualization style, set alarms). Global settings accessible via hamburger menu or settings icon.

### Core Screens and Views

- **Dashboard/Canvas Screen** - Primary view where widgets display NMEA data in real-time (FR4-FR6, FR36)
- **Widget Library/Selector** - Gallery of available widgets to add to dashboard (FR39)
- **First-Run Setup Wizard** - Onboarding flow for WiFi bridge connection and initial widget selection (FR34)
- **Connection Settings** - WiFi bridge IP/hostname configuration and connection status (FR29)
- **Global Settings** - Unit preferences, display mode, alarm configurations (FR28)
- **Playback Mode Screen** - Load/control NMEA recording playback for testing/demo (FR31, FR40)
- **Widget Configuration Modal** - Per-widget settings (units, data source, visualization style) (FR35)
- **Alarm History Screen** - View last 10 triggered alarms (FR41)

### Accessibility: WCAG AA

Target WCAG AA compliance to ensure usability for recreational boaters with vision or motor impairments:
- Minimum 4.5:1 color contrast ratios for text/data
- Touch targets minimum 44x44pt for marine environment use (boat motion, gloves, wet hands)
- Support platform accessibility features (VoiceOver, TalkBack, Windows Narrator, macOS accessibility)
- Red-night mode preserves night vision while maintaining readability
- Keyboard navigation for desktop platforms
- Screen reader compatibility for analog gauges (provide numeric fallback announcements)

### Branding: Marine Instrument Aesthetic

Clean, professional design inspired by Raymarine instrument styling:
- High contrast displays with bold typography
- Analog gauge aesthetics where appropriate (compass roses, bar graphs, needle indicators)
- Nautical color palette: blues, whites, blacks with accent colors for warnings (yellow) and alarms (red)
- Ensure accessible color palette meets WCAG AA contrast requirements
- **Platform conventions apply to chrome only** (navigation, menus, system dialogs) - **widgets maintain consistent Raymarine visual language across all platforms**

### Target Platforms: Web Responsive (Mobile Priority)

- **Primary:** iOS/Android smartphones (5"-6.7" screens) used in cockpit or helm
- **Secondary:** iOS/Android tablets (7"-13" screens) mounted at nav station or helm
- **Tertiary (Phase 1.5):** Windows/macOS desktop/laptop (13"-27" screens) for nav stations with dedicated displays

**Responsive Strategy:**
- **Phone (≤6.7"):** Vertical scroll canvas, 1-2 widgets visible simultaneously
- **Tablet (7"-13"):** Grid layout, 4-9 widgets visible simultaneously depending on widget sizes
- **Desktop (13"+):** Maximize screen real estate, 6-16+ widgets visible simultaneously

All platforms support both portrait and landscape orientations with automatic layout reflow (NFR9).

---

## Technical Assumptions

### Repository Structure: Monorepo

**Decision:** Single repository containing shared core logic and platform-specific UI layers.

**Rationale:** Simplifies dependency management, enables code sharing across platforms (NMEA parsing, business logic, widget framework), and reduces overhead for solo developer or small team (NFR15). Aligns with React Native best practices.

**Structure:**
- `/src/core` - Shared TypeScript: NMEA parsing, widget framework, autopilot protocols, business logic
- `/src/mobile` - React Native mobile app (iOS + Android)
- `/src/desktop` - React Native Windows/macOS extensions (Phase 1.5)
- `/src/widgets` - Reusable widget components
- `/src/services` - NMEA connection, settings persistence, alarm management

### Service Architecture: Client-Side Monolith

**Decision:** MVP is entirely client-side with no backend services.

**Rationale:**
- No cloud dependencies reduces complexity and meets 7-month timeline constraint
- Aligns with NFR6 (offline-first) and NFR13 (local storage only)
- Boat's local WiFi network is isolated environment (no internet required)
- Eliminates hosting costs, backend maintenance, user account management

**Architecture:**
- NMEA Connection Service: Manages TCP/UDP socket connections to WiFi bridge
- Widget Rendering Engine: Manages dashboard layout and widget lifecycle
- Autopilot Control Service: Implements Raymarine EVO protocol
- Settings/Storage Service: Persists user preferences and layouts locally
- Alarm Manager: Monitors NMEA data streams and triggers configured alarms

**Phase 2 Consideration:** If analytics/telemetry or multi-device sync added post-MVP, will introduce minimal backend (Node.js/Express, PostgreSQL, AWS S3) - but descoped from MVP per user feedback.

### Testing Requirements: Automated + Real-Boat Validation

**Decision:** ≥70% automated test coverage (NFR18) plus extensive real-boat beta testing.

**Test Strategy:**
- **Unit tests:** NMEA parsing, widget logic, alarm triggers (Jest + React Native Testing Library)
- **Integration tests:** NMEA connection, autopilot command transmission, settings persistence
- **Playback mode tests:** All widgets and features validated against recorded NMEA files
- **Real-boat validation:** Month 6-7 beta with 50 users, 10+ documented autopilot sessions
- **Stress testing:** NFR10 validation (500 messages/second realistic load based on NMEA2000 CAN bus bandwidth)

**Key Testing Challenges:**
- Limited physical boat access during development (mitigated by playback mode - FR31)
- Raymarine EVO protocol reverse-engineered (requires extensive beta testing across firmware versions)
- WiFi bridge compatibility matrix (must test Quark-Elec, Actisense, + 1 other - NFR1)

### Frontend: React Native with TypeScript

**Decision:** React Native (v0.76+) with TypeScript for all platforms.

**Rationale:**
- Single codebase achieves iOS + Android + Windows + macOS (NFR7)
- TypeScript provides type safety critical for NMEA parsing and autopilot control
- Large ecosystem and community support
- Proven in production apps (reduces risk vs. newer frameworks)
- Platform extensions (React Native for Windows/macOS) mature and Microsoft-maintained

**Key Libraries:**
- UI: React Native core components, React Native Reanimated (smooth animations), React Native Gesture Handler (drag-drop)
- Networking: `react-native-tcp-socket` (v6.3+), `react-native-udp`
- NMEA Parsing: `nmea-simple` (NMEA0183), `@canboat/canboatjs` (NMEA2000 PGNs)
- Charts/Gauges: React Native SVG + custom instrument components
- Storage: AsyncStorage (mobile), platform-specific equivalents for desktop
- Error Tracking: Sentry React Native SDK

### Backend: None for MVP

**Decision:** No backend, cloud services, or APIs in MVP.

**Rationale:** Meets NFR13 (local storage only), NFR6 (offline-first), and 7-month timeline. All data processing happens client-side.

**Phase 1.5+ Consideration:** If user feedback drives need for cloud features (trip sync, analytics), will evaluate Node.js/Express + PostgreSQL + AWS S3.

### Database: Local Storage Only

**Decision:**
- **Mobile:** AsyncStorage backed by SQLite for settings, dashboard layouts, alarm history
- **Desktop (Phase 1.5):** Platform-native storage (UserDefaults/macOS, LocalStorage/Windows)

**Rationale:** No cloud sync in MVP (NFR13), so simple local persistence sufficient. SQLite provides relational queries if needed for alarm history (FR41).

**Data Stored:**
- User settings (FR30): Unit preferences, display mode, WiFi bridge config
- Dashboard layouts (FR6): Widget positions, sizes, configurations per device
- Alarm history (FR41): Last 10 triggered alarms
- NMEA parameter mappings (FR35, FR43): User-configured data source selections

### Integration: NMEA WiFi Bridges

**Decision:** Support Quark-Elec A032, Actisense W2K-1, and ≥1 additional WiFi bridge via TCP/UDP sockets.

**Connection Details:**
- **TCP port 2000** (industry standard for marine WiFi bridges)
- **UDP port 2000** (client connects to specific IP address and port - not broadcast)
- **WiFi bridge IP address:** User-configured via FR29 (typically 192.168.x.x on boat's local network)

**Data Format Variations:**
The app must handle three NMEA data format variations per FR2:
1. **NMEA0183 ASCII sentences** (e.g., `$GPGGA`, `$WIMWV`)
2. **NMEA2000 PGNs in binary format** (Actisense N2K format)
3. **NMEA2000 PGNs encapsulated in NMEA0183 sentences** (`$PCDIN` format)
   - Critical for Raymarine EVO autopilot control via NMEA0183-only WiFi bridges
   - Autopilot commands sent as NMEA2000 PGNs wrapped in NMEA0183 wrapper sentences

**NMEA2000 CAN Bus Characteristics:**
- NMEA2000 uses CAN 2.0B at **250 kbit/s** bandwidth
- Typical marine networks generate **50-200 messages/second**
- High-traffic boats (many instruments) may reach **300-500 messages/second** peak
- NFR10 stress testing uses 500 messages/second as realistic upper bound

**Integration Requirements (FR1, FR2, NFR1):**
- TCP/UDP socket connection with automatic reconnection (exponential backoff per FR1)
- Parse all three NMEA data format variations
- Decode NMEA2000 PGNs using `@canboat/canboatjs` library
- Implement Raymarine EVO autopilot protocol (reference: github.com/matztam/raymarine-evo-pilot-remote)
- Handle PGN encapsulation/de-encapsulation for NMEA0183 bridges

**Assumptions:**
- WiFi bridges handle SeaTalkng → NMEA2000 protocol conversion if needed
- Boat's WiFi network is local only (no internet gateway required per NFR6)

**Risk:** Some proprietary PGNs may be undocumented - will handle gracefully per NFR16.

### Hosting/Infrastructure: App Store Distribution + Direct Testing

**Decision:** Distribute via app stores for public launch, but support direct installation for development/beta testing to avoid App Store review delays.

**Development & Beta Testing (Month 1-7):**
- **iOS Development:** Xcode direct install to developer devices (no App Store involvement)
- **iOS Beta:** TestFlight distribution (up to 10,000 beta testers, no App Store review required for beta builds)
- **Android Development:** Direct APK sideloading for development
- **Android Beta:** Google Play Internal/Closed Testing (no public review required)
- **Desktop (Phase 1.5):** Direct installation of unsigned builds for development

**Public Launch (Month 7-8):**
- **iOS App Store** (requires App Store review, but only for public launch)
- **Google Play Store** (requires Play Store review, but only for public launch)
- **Microsoft Store** (Phase 1.5)
- **Mac App Store** (Phase 1.5)

**Key Point:** MVP development and beta testing (Month 1-7) completely bypasses App Store review hassles. Only public launch requires store approval. This protects the 7-month timeline from App Store review delays.

**Code Signing:**
- Apple Developer account ($99/year) - required for TestFlight and App Store
- Google Play Developer account ($25 one-time) - required for beta and public release
- Microsoft Partner Center (free) - Phase 1.5

### Security/Compliance: Privacy-First, Local-Only

**Decision:** No user data collection, no cloud transmission, no user accounts in MVP.

**Privacy/Security Implications:**
- No privacy policy conflicts (no data leaves device per NFR13)
- No GDPR/CCPA compliance burden
- No security vulnerabilities from cloud exposure
- Network traffic stays on boat's local WiFi (NFR6)
- Crash reporting (NFR14) requires user opt-in consent (FR34 wizard)

**App Store Compliance (NFR12):**
- Privacy policy required (even if "we don't collect data")
- Terms of service for liability disclaimers (autopilot control safety)
- Age rating: 4+ / Everyone (navigation app)

### Additional Technical Assumptions from Brief

**Cross-Platform Development:**
- React Native provides ~95% code sharing across iOS/Android
- Desktop platforms (Phase 1.5) have slightly less sharing due to platform extensions
- Platform-specific code uses `.ios.tsx`, `.android.tsx`, `.windows.tsx`, `.macos.tsx` file suffixes
- Performance differences between platforms acceptable as long as NFR4 (responsive UI) met on all

**Voice Recognition (Phase 2):**
- Deferred to Phase 2 per Brief
- When implemented: Use platform-native APIs (iOS Speech, Android SpeechRecognizer, Web Speech API)
- Assumption unvalidated: Voice recognition works adequately in 60+ dB cockpit noise environment

**Battery Life (NFR5):**
- 8+ hours continuous use requirement achievable through:
  - Efficient React Native rendering (avoid unnecessary re-renders)
  - Throttled NMEA data updates (max 1/second to UI per FR33)
  - Background processing optimization
  - Screen dimming in Night/Red-Night modes (FR26)

**Raymarine EVO Protocol:**
- Assumption: Reverse-engineered protocol from matztam GitHub repo is complete and accurate
- Risk: Raymarine may change protocol in firmware updates
- Mitigation: Test extensively with beta users on different EVO firmware versions (Month 5-7)
- NMEA2000 PGN-based commands work via NMEA0183 bridges using `$PCDIN` encapsulation

**Market Timing:**
- Assumption: Target users have technical literacy to install/configure WiFi bridges
- Assumption: Users willing to pay $79.99 for instrument app (price point from forum research, not formal validation)
- Assumption: Word-of-mouth marketing effective in boating community forums

---

## Epic List

Based on the phased delivery milestones and agile team perspective analysis, the following epic structure delivers value incrementally while de-risking technical unknowns early. Each epic delivers a significant, end-to-end, fully deployable increment of testable functionality.

---

### **Epic 1: Foundation, NMEA0183 & Autopilot Spike**

**Goal:** Establish project infrastructure, NMEA0183 connectivity, autopilot protocol feasibility validation, and testing infrastructure. Deliver a minimal functioning app that connects to boat's NMEA network, displays raw data, and validates autopilot protocol before committing significant development effort.

**Timeline:** Month 1 (Checkpoint Gate)

**Value Delivered:**
- Developers can connect to WiFi bridges (NMEA0183 only) and see data flowing
- Autopilot protocol feasibility validated (highest risk item)
- Testing infrastructure (playback mode, stress testing) enables continuous testing from Epic 2 onward
- Foundation for all subsequent development

**Requirements Covered:**
- FR1 (TCP/UDP connection - NMEA0183 focus), FR2 (NMEA0183 parsing only), FR29, FR30, FR32, FR36
- FR31 (Basic playback mode for testing), FR38, FR40
- Autopilot protocol spike (research matztam GitHub repo, validate PGN structure)
- NFR1 (NMEA0183 bridge connection success), NFR6, NFR11, NFR16, NFR18 (test infrastructure)

**Success Criteria:**
- Can connect to Quark-Elec A032 and Actisense W2K-1 via TCP port 2000
- Parses NMEA0183 sentences (e.g., $GPGGA, $WIMWV)
- Connection status indicator shows red/orange/green states
- Handles connection failures with automatic reconnection
- Settings persist across app restarts
- Playback mode can load and replay recorded NMEA files for testing
- Stress testing tool generates 500 msg/sec synthetic NMEA data
- **Autopilot protocol spike complete:** PGN structure validated, command format confirmed, risk assessment documented

**Risk Mitigation:**
- **If NMEA0183 connectivity fails:** Reassess technical approach or WiFi bridge compatibility (CRITICAL - project fails without this)
- **If autopilot protocol incomplete:** Document gaps, assess feasibility, decide go/no-go by end of Month 1

**Key Decision Point:** End of Month 1 - Autopilot feasibility GO/NO-GO decision. If protocol looks unworkable, pivot to instruments-only MVP.

---

### **Epic 2: NMEA2000, Widget Framework & Complete Instrument Suite**

**Goal:** Add NMEA2000 support (including PGN encapsulation), build extensible widget framework, and implement all 10 core instrument widgets. Deliver a comprehensive instrument display app that boaters can use to monitor all boat parameters from their phone/tablet.

**Timeline:** Month 2-3 (Checkpoint Gate at Month 3)

**Value Delivered:**
- Solo sailors and powerboaters can monitor all 10 instrument types (depth, speed, wind, GPS, compass, engine, battery, tanks, autopilot status, rudder) from any location
- Dashboard customization enables personalized layouts
- Replaces need to check 10 physical instruments
- Widget framework architecture supports Phase 1.5 custom widgets (NFR17)

**Requirements Covered:**
- FR2 (NMEA2000 PGN parsing, $PCDIN encapsulation/de-encapsulation)
- FR3, FR4, FR5, FR6, FR28, FR33, FR39, FR43
- FR7 (Depth), FR8 (Speed), FR9 (Wind), FR10 (GPS), FR11 (Compass)
- FR12 (Engine - dual-engine support), FR13 (Battery), FR14 (Tanks - customizable titles)
- FR15 (Autopilot Status), FR16 (Rudder Position)
- FR35 (NMEA data source mapping)
- NFR4, NFR8, NFR9, NFR17 (widget architecture extensibility), NFR18 (continuous test coverage)

**Success Criteria:**
- Can parse NMEA2000 PGNs in Actisense N2K format and $PCDIN encapsulated format
- Widget selector allows browsing and adding all 10 widgets to dashboard
- Drag-drop and resize widgets work smoothly on phone and tablet
- All 10 widgets display live NMEA data with <1s latency
- Engine widget automatically adapts for single vs. dual engines
- Tank widget titles are user-customizable
- NMEA parameter browser shows all detected parameters on network
- Dashboard layouts persist per device
- Responsive design: Phone (1-2 widgets visible), Tablet (4-9 widgets), smooth scrolling
- Widget framework architecture documented with extensibility points for Phase 1.5
- Test coverage ≥70% for widget framework and NMEA parsing

**Parallel Track:** Begin beta tester recruitment (target 50 users by Month 6)

**Risk Mitigation:**
- **If NMEA2000 parsing too complex:** Focus on most common PGNs first, defer exotic PGNs to Phase 1.5
- **If widget framework complexity causes delay:** Reduce to 7-8 widgets, defer remaining to Epic 4
- **If dual-engine support complex:** Ship with single-engine only, add dual-engine in Phase 1.5

---

### **Epic 3: Autopilot Control & Early Beta**

**Goal:** Implement Raymarine Evolution autopilot control with bi-directional communication, enabling solo sailors to control autopilot from cockpit. Begin closed beta testing with early adopters to get real-world feedback.

**Timeline:** Month 4-5 (Checkpoint Gate at Month 5)

**Value Delivered:**
- Solo sailors can control autopilot from phone/tablet without going below deck
- P70 autopilot controller replacement functionality (key differentiator)
- Safety features (5-second countdown for tack/gybe) demonstrate responsible design
- Real-world beta feedback identifies issues before public launch

**Requirements Covered:**
- FR17, FR18, FR19, FR20, FR21, FR37
- FR31 (Enhanced playback mode with autopilot simulation), FR38, FR40
- NFR2, NFR10, NFR18 (continuous testing)

**Success Criteria:**
- Autopilot commands (±1°, ±10° heading adjustments) execute on boat with 99%+ success rate
- Mode switches (Auto/Standby/Wind/Track/Power Steer) work reliably
- Tack/Gybe 5-second countdown with abort button functions correctly
- Visual feedback confirms command transmission, error messages display when commands fail
- Autopilot commands sent as NMEA2000 PGNs (via $PCDIN encapsulation for NMEA0183 bridges)
- Playback mode accurately simulates autopilot control for testing without live boat
- **10 closed beta testers recruited** (Month 4-5) providing feedback on autopilot control
- Test coverage ≥70% for autopilot control logic

**Parallel Track:** Closed beta with 10 early adopters (users with Raymarine EVO systems)

**Risk Mitigation:**
- **If autopilot control fails Month 5 gate:** Pivot to instruments-only MVP (defer autopilot to Phase 2). This is the final go/no-go decision point.
- **If beta reveals major UX issues:** Allocate 2 weeks in Month 6 for autopilot UX refinement

**Key Decision Point:** End of Month 5 - Autopilot control validated on ≥3 real boats OR decision to pivot to instruments-only MVP.

---

### **Epic 4: Alarms, Display Modes, UX Polish & Beta Expansion**

**Goal:** Implement safety-critical alarms, night mode support, onboarding/usability features, and expand beta testing to 50 users. Transform the app from "functional" to "polished MVP ready for public launch."

**Timeline:** Month 6

**Value Delivered:**
- Safety alarms (depth, wind shift, engine temp, battery voltage) match physical instrument capabilities
- Grouped alarm widgets provide at-a-glance status for multiple related alarms
- Night sailing support with red-night mode for overnight passages
- First-run wizard reduces setup friction for new users
- Alarm history provides situational awareness
- 50 beta users provide comprehensive feedback across diverse boat configurations

**Requirements Covered:**
- FR22, FR23, FR24, FR25, FR41, FR42, FR44 (alarms)
- FR26, FR27 (display modes)
- FR34 (first-run wizard)
- NFR5 (8-hour battery life), NFR18 (test coverage)

**Success Criteria:**
- Pre-defined alarm templates (Motor Alarms, Sailing Alarms) configured easily
- Grouped alarm widgets display multiple alarms in single panel with color coding (green/yellow/red)
- Users can configure custom alarm thresholds (upper/lower bounds) for any NMEA parameter
- Alarms trigger reliably with visual and audio alerts
- Alarm history log shows last 10 triggered alarms with timestamps
- Day/Night/Red-Night modes switch instantly, red-night mode preserves night vision
- First-run wizard guides WiFi bridge setup (IP/hostname entry), widget selection, safety disclaimers
- Wizard can be skipped for demo/playback mode
- App achieves 8+ hour battery life on mobile devices (tested on iPhone 13 baseline)
- **50 beta users actively testing** across different boat types (sailboats, powerboats)
- Test coverage ≥70% for alarm logic and display modes

**Parallel Track:** Beta expansion from 10 to 50 users

**Risk Mitigation:**
- **If grouped alarm widget UX complex:** Ship with simple threshold alarms, defer grouped alarms to Phase 1.5
- **If battery life falls short:** Optimize rendering pipeline, reduce update frequency
- **If beta feedback reveals major issues:** Allocate first 2 weeks of Month 7 for critical fixes

---

### **Epic 5: Quality Gates, Launch Preparation & Public Release**

**Goal:** Achieve all quality gates from Project Brief, fix beta-identified bugs, optimize performance, ensure App Store compliance, and launch publicly on iOS App Store and Google Play Store.

**Timeline:** Month 7

**Value Delivered:**
- 99.5% crash-free rate sustained (safety-critical standard)
- 98%+ NMEA connection success validated across 3+ WiFi bridge models
- 10+ documented successful Raymarine EVO autopilot sessions with video proof
- App Store compliance complete (privacy policy, terms of service, age ratings)
- Production-ready app available for public purchase ($79.99)

**Requirements Covered:**
- NFR3, NFR14, NFR18 (quality/testing gates)
- NFR12 (App Store compliance)
- Bug fixes and performance optimization from beta feedback
- All 44 functional requirements validated by beta users

**Success Criteria:**
- 99.5%+ crash-free rate sustained for 2 consecutive weeks with 50+ beta users
- 98%+ NMEA connection success across Quark-Elec A032, Actisense W2K-1, + 1 other bridge
- 10+ successful autopilot control sessions documented with video proof (different boats/users)
- <5% beta user support ticket rate
- No critical safety issues reported
- All 44 functional requirements validated
- Comprehensive test coverage including connection failures, stress tests, device compatibility
- iOS and Android builds approved by App Store and Google Play Store
- App Store listings complete (screenshots, descriptions, video demos, privacy policy, terms of service)
- Marketing materials ready (website, social media, forum posts, YouTube videos)

**Launch Activities:**
- Submit to iOS App Store (requires Apple review, 2-5 days)
- Submit to Google Play Store (requires Google review, 1-3 days)
- Announce in Cruisers Forum, Raymarine owner Facebook groups
- Co-marketing with WiFi bridge manufacturers (Quark-Elec outreach)
- YouTube sailing channel sponsorships/demos

**Success Criteria for Public Launch:**
- App Store and Google Play approvals received
- Initial reviews from beta users (target 4.5+ star rating)
- Zero critical bugs reported in first week post-launch
- 150 paying users by Month 12 (tracked post-launch)

**Risk Mitigation:**
- **If quality gates not met:** Extend beta period by 2-4 weeks, delay public launch
- **If App Store rejection:** Address review feedback within 3-5 days, resubmit
- **If critical bug discovered in Month 7:** Emergency fix, re-test with beta users before launch

---

## Epic Summary Table

| Epic | Timeline | FRs | NFRs | Primary Value | Key Risk | Mitigation |
|------|----------|-----|------|---------------|----------|------------|
| 1: Foundation & Spike | Month 1 | 8 | 5 | NMEA connectivity + Autopilot feasibility | WiFi bridge compat, Autopilot protocol | GO/NO-GO decision end Month 1 |
| 2: Widgets & NMEA2000 | Month 2-3 | 18 | 4 | Complete instrument suite | Widget complexity | Reduce widget count if needed |
| 3: Autopilot & Beta | Month 4-5 | 7 | 2 | Autopilot control (differentiator) | Raymarine EVO protocol | Pivot to instruments-only if fails |
| 4: Alarms & Polish | Month 6 | 9 | 1 | Safety features + UX polish | Alarm reliability | Simplify grouped alarms if needed |
| 5: Quality & Launch | Month 7 | 0 | 3 | Public release | Quality gates | Extend beta if quality gates not met |
| **Total** | **7 months** | **42** | **15** | **Comprehensive MVP** | **Timeline pressure** | **Continuous testing + early de-risking** |

---

## Epic Sequencing Rationale

**Why this revised order?**

1. **Epic 1: Autopilot spike moved to Month 1** - De-risks highest technical unknown early. If protocol doesn't work, we know by Month 1 (not Month 5), saving 4 months of wasted effort.

2. **Epic 1: Playback mode in Month 1** - Enables continuous testing from Epic 2 onward. Can't properly test widgets without NMEA data source.

3. **Epic 2: All 10 widgets by Month 3** - Merged original Epic 4 here. Accelerates value delivery, enables comprehensive beta testing in Epic 3-4.

4. **Epic 3: Closed beta starts Month 4** - Get real-world feedback early (not waiting until Month 7). 10 early adopters with Raymarine EVO systems validate autopilot.

5. **Epic 4: Alarms + UX polish in Month 6** - Complete feature set before public launch. Beta expands to 50 users for comprehensive feedback.

6. **Epic 5: Quality gates + Launch in Month 7** - Focus solely on achieving quality standards and App Store compliance. No new features.

**Key Improvements Over Original:**
- ✅ Autopilot risk de-risked 3 months earlier
- ✅ Testing infrastructure built in Month 1 (not Month 3)
- ✅ All 10 widgets delivered 2.5 months earlier
- ✅ Beta testing starts Month 4 (not Month 7) - 3 months more feedback
- ✅ Continuous testing from Epic 2 onward (not back-loaded to Epic 6)

---

## Cross-Cutting Concerns

The following requirements flow through multiple epics rather than being isolated to one:

- **FR30 (Settings persistence)** - Epic 1 foundation, used in all subsequent epics
- **FR32 (Missing data handling)** - Epic 1 foundation, applied to all widgets in Epic 2-4
- **FR33 (Real-time updates <1s)** - Epic 2 foundation, applies to all widgets and autopilot
- **NFR4 (Responsive UI)** - Epic 2 foundation, validated in all subsequent epics
- **NFR17 (Widget architecture extensibility)** - Epic 2 architectural decisions enable Phase 1.5 custom widgets
- **NFR18 (70% test coverage)** - Built incrementally in Epic 1-5, validated continuously

---

## Risk Management by Epic

Each epic has explicit fallback strategies documented:

| Epic | Primary Risk | Fallback Strategy | Impact |
|------|--------------|-------------------|--------|
| Epic 1 | NMEA connectivity fails | Reassess tech approach, evaluate different libraries | CRITICAL - project fails |
| Epic 1 | Autopilot protocol incomplete | Document gaps, pivot to instruments-only MVP | Major - lose key differentiator |
| Epic 2 | Widget complexity causes delay | Reduce to 7-8 widgets, defer 2-3 to Phase 1.5 | Minor - still viable MVP |
| Epic 3 | Autopilot control fails Month 5 gate | Final decision: Instruments-only MVP | Major - lose key differentiator |
| Epic 4 | Grouped alarm UX too complex | Ship simple threshold alarms only | Minor - alarms still functional |
| Epic 5 | Quality gates not met | Extend beta 2-4 weeks, delay launch | Minor - timeline slip acceptable |

---

