# Project Brief: Boating Instruments App

*Work in Progress - Building section by section*

---

## Executive Summary

**Boating Instruments App** is a cross-platform mobile and desktop application that replicates the functionality of dedicated marine navigation instruments (Raymarine P70 autopilot controller, i70s multifunction displays, Alpha performance displays) through a widget-based dashboard interface. The app connects to existing boat NMEA networks via WiFi bridges, providing recreational boaters with flexible, voice-controlled access to autopilot control, instrument displays, and trip logging without requiring additional hardware investments beyond what's already on their vessel.

**Primary Problem:** Recreational boaters have limited flexibility in accessing and controlling their boat's instruments. Physical instruments are fixed-location, single-function devices with small displays and button-based interfaces. Boaters cannot easily monitor instruments from multiple locations (cockpit, helm, nav station), cannot customize layouts to their specific needs, and lack modern conveniences like voice control, trip logging, and historical data analysis.

**Target Market:** Recreational sailors and powerboaters who have existing NMEA 2000/SeaTalkng networks with WiFi bridges, seeking supplemental instrument displays and autopilot control on their personal devices (phones, tablets, laptops).

**Key Value Proposition:** Transform existing NMEA infrastructure into a flexible, multi-device instrument system with voice control, customizable dashboards, auto-discovery of network parameters, trip logging, and features physical instruments cannot provide—all without additional hardware investment beyond a WiFi bridge.

---

## Problem Statement

Recreational boating instruments have remained largely unchanged for decades, creating significant limitations for modern boaters:

### Current State & Pain Points

Physical marine instruments (depth gauges, speed displays, wind instruments, autopilot controllers) are purpose-built, fixed-location devices mounted at specific locations on a boat. While reliable and specialized, they suffer from inherent limitations:

- **Fixed Location**: Instruments can only be viewed from their mounted position. A solo sailor in the cockpit cannot see the instruments mounted at the nav station, and vice versa.
- **Single Function**: Each instrument displays one type of data. Want to see depth, speed, and wind simultaneously? You need three separate physical displays.
- **Limited Customization**: Physical instruments have preset display modes and limited user configuration. You get what the manufacturer designed.
- **No Historical Data**: Physical instruments show real-time data only. There's no trip logging, no performance trends, no historical analysis.
- **Manual Control Only**: Autopilot adjustments require physical button presses at the controller location. Voice commands, remote operation from multiple locations, and automation are impossible.
- **Expensive Expansion**: Adding more displays requires purchasing additional physical instruments at $200-$800+ each, plus professional installation.

### Impact & Consequences

- **Safety concerns**: Solo sailors must leave the helm to check instruments, taking attention away from boat handling and navigation.
- **Inefficiency**: Crew must verbally relay instrument readings between locations ("What's our depth?" shouted from cockpit to nav station).
- **Limited awareness**: Powerboaters at enclosed helm stations cannot easily monitor instruments mounted outside without leaving the wheel.
- **Missed opportunities**: Without trip logging and performance data, boaters cannot analyze their sailing performance, fuel consumption patterns, or optimize their technique.
- **High costs**: Boaters who want comprehensive instrument coverage across multiple locations face thousands of dollars in additional hardware purchases.

### Why Existing Solutions Fall Short

- **Manufacturer apps** (Raymarine, Garmin): Typically focus on chartplotting and require proprietary MFD systems. Limited instrument display customization and often lack voice control.
- **Physical instruments**: Reliable but suffer all the limitations described above—fixed location, single function, no logging, expensive to expand.
- **All-in-one marine apps**: Apps like Navionics Boating focus on navigation/chartplotting, not instrument display and autopilot control. They don't replicate the dedicated instrument experience boaters are familiar with.
- **DIY solutions**: Open-source projects like SignalK exist but require technical expertise to set up and configure. Not suitable for average recreational boater.

### Urgency & Importance

The recreational boating market is ready for modernization. Boaters carry powerful smartphones and tablets on board—devices with better displays, more processing power, and superior interfaces than their dedicated instruments. WiFi bridges that expose NMEA data are becoming standard equipment. Yet no comprehensive app exists that truly replicates the full suite of dedicated instruments (particularly autopilot control) with modern conveniences like voice commands, customizable dashboards, and trip logging. This is a clear market gap waiting to be filled.

---

## Proposed Solution

**Boating Instruments App** transforms personal devices (smartphones, tablets, Windows/Mac computers) into comprehensive marine instrument displays and autopilot controllers by connecting to existing boat NMEA networks via WiFi bridges.

### Core Concept & Approach

The solution is built around a **widget-based dashboard architecture** where each instrument view (depth gauge, wind display, autopilot controller, speed indicator, etc.) is an independent, repositionable widget. Users compose their ideal dashboard by selecting, arranging, and resizing widgets to match their needs and device capabilities.

**Key architectural principles:**
- **Responsive design**: Single codebase adapts to all screen sizes—phone users swipe between widgets, tablet users see multiple widgets simultaneously, desktop users maximize screen real estate
- **NMEA-agnostic**: Display ANY parameter available on the NMEA network, not just pre-defined instrument types
- **Auto-discovery**: App automatically detects available NMEA parameters and creates appropriate widgets
- **Bi-directional control**: Not just display—send commands to autopilot and other controllable NMEA devices

### Key Differentiators from Existing Solutions

**1. Voice Control Integration**
Hands-free operation for critical functions—adjust autopilot course, switch instrument views, acknowledge alarms, change display modes. Essential for solo sailors and active helming scenarios.

**2. Unlimited Extensibility**
Physical Raymarine i70s displays have fixed parameter support. Our app displays ANY NMEA 2000 PGN or NMEA 0183 sentence available on the network, with automatic widget generation for unsupported parameters.

**3. Raymarine Evolution Autopilot Control**
Full bi-directional autopilot control compatible with Raymarine EVO protocol (reference: github.com/matztam/raymarine-evo-pilot-remote). Users get P70-equivalent functionality on their phone.

**4. Trip Logging with Configurable Parameters**
Record trips to GPX format with user-selected NMEA parameters beyond standard GPS position. Analyze performance, fuel consumption, wind patterns over time. Generate trip statistics (current trip, historical trips, seasonal accumulated data).

**5. Calculated Parameters**
Auto-calculate derived values like true wind from apparent wind + boat data, eliminating need for additional sensors that physical instruments require.

**6. Safety Features for Passage Making**
Watch timer, watch keeper alarm ("dead man's switch" requiring periodic check-ins), integration with NMEA buzzer for crew alerts—features designed for long-distance cruising scenarios.

**7. No Additional Hardware Investment**
Works with existing NMEA WiFi bridges (Quark-Elec A032, similar products). No proprietary hardware, no vendor lock-in.

### Why This Solution Will Succeed

**Market timing**: WiFi bridges are now standard equipment, smartphones/tablets are ubiquitous on boats, boaters are comfortable with app-based solutions (Navionics proves this).

**Familiar mental model**: App replicates physical instruments boaters already know (P70, i70s, Alpha), reducing learning curve while adding modern conveniences.

**Fast time-to-market**: Focus MVP on core instrument display + autopilot control. Defer advanced features (analytics, multi-device sync, community features) to roadmap. Ship quickly, iterate based on user feedback.

**Value proposition clarity**: "Use your phone/tablet as unlimited boat instruments—no additional hardware to buy." Simple, compelling message.

### High-Level Product Vision

**MVP (Months 0-3)**: Widget dashboard, NMEA connectivity, core instrument widgets (depth, speed, wind, GPS, engine, autopilot control), voice commands (core set), basic alarms, trip logging, day/night/red-night modes, responsive cross-platform UI.

**Phase 2 (Months 4-6)**: Auto-discovery of NMEA parameters, custom screen builder, preset profiles (sailing/motoring/racing/cruising), advanced trip statistics, watch keeper alarm, wind history widgets.

**Phase 3 (Months 7-12)**: IP camera integration, 3D navigation view, predictive analytics, multi-device sync, community features (share layouts/trips).

The product grows from "instrument replacement" to "intelligent sailing assistant" over time, but delivers core value immediately.

---

## Target Users

The Boating Instruments App serves multiple segments within the recreational boating market, each with distinct needs and use patterns:

### Primary User Segment: Solo / Short-Handed Sailors (35-45ft Sailboats)

**Profile:**
- Own or regularly sail cruising sailboats (35-45 feet)
- Frequently sail single-handed or with one crew member
- Technically comfortable (understand NMEA networks, install WiFi bridges, use marine apps)
- Age range: 40-65, mix of weekend cruisers and liveaboards
- Have existing NMEA 2000 networks with autopilot systems

**Current Behaviors & Workflows:**
- Must physically move between cockpit and nav station to check different instruments
- Rely heavily on autopilot for solo sailing
- Make frequent small autopilot course adjustments while trimming sails
- Struggle with hands-free operation—often have both hands on sheets/winches
- Keep phones in waterproof cases in cockpit for communication/navigation

**Specific Needs & Pain Points:**
- **Voice control is critical**: Cannot spare hands to press buttons while sail handling
- Need cockpit access to autopilot control (don't want to go below to adjust course)
- Want to see wind instruments and depth gauge simultaneously on single device
- Safety concern: Leaving helm unattended to check instruments
- Alarms that work when below deck (watch keeper alarm for passages)

**Goals:**
- Sail more safely and efficiently single-handed
- Reduce trips between cockpit and nav station
- Monitor all critical parameters from helming position
- Control autopilot hands-free while actively sailing

**Key Features for This Segment:**
- Voice-controlled autopilot adjustments
- Voice commands for tack/gybe
- Wind shift alarms (angle and intensity)
- Depth alarms
- Multi-widget phone interface optimized for one-handed use
- Watch keeper alarm for overnight passages

---

### Secondary User Segment: Powerboaters (40-50ft Motor Yachts)

**Profile:**
- Own powerboats or motor yachts (40-50 feet)
- Cruise at 15-25 knots, often with family/friends
- Have enclosed helm stations with space for tablets
- Focus on engine monitoring, fuel management, systems status
- Less concerned with wind data, more interested in engine/systems health
- Age range: 45-70, typically weekend/vacation use

**Current Behaviors & Workflows:**
- Monitor engine gauges continuously during operation
- Track fuel consumption for range planning
- Use autopilot primarily for long straight runs (navigation mode)
- Check battery levels, coolant temps, oil pressure frequently
- Enclosed helm has fixed instrument panel—hard to add more displays

**Specific Needs & Pain Points:**
- Want comprehensive engine monitoring without adding more physical gauges
- Need clear, large displays viewable from helm seat
- Concerned about engine health—want trend data over time
- Fuel consumption tracking for trip planning
- RPM and temperature monitoring most critical

**Goals:**
- Maintain situational awareness of all engine/systems parameters
- Detect engine problems early through monitoring
- Track fuel consumption and optimize cruising speed
- Simplify helm station setup (tablet vs. multiple physical gauges)

**Key Features for This Segment:**
- Engine metrics widgets (RPM, temperatures, oil pressure)
- Fuel/tank level monitoring
- Battery voltage tracking
- Multi-widget tablet dashboards
- "Motoring" preset profile emphasizing engine data
- Trip fuel consumption logging

---

## Goals & Success Metrics

### Business Objectives

- **Launch functional MVP within 7 months** - Realistic timeline: 6 months development + 1 month beta/QA. Breakdown: Months 1-2 (NMEA infrastructure), Months 3-4 (core widgets), Months 5-6 (autopilot control), Month 7 (beta testing with real users). Accept that "done right" beats "done fast" for safety-critical marine use.

- **One-time purchase pricing: $79.99** - Decision made upfront to inform MVP scope. No subscription management complexity in MVP. Simple monetization: Pay once, own forever. Consider premium subscription tier in Phase 2 for cloud features (multi-device sync, analytics).

- **Acquire 50 beta users (Month 6-7), 150 paying users by Month 12** - Realistic given niche market. Beta users recruited through: Cruisers Forum partnerships, Raymarine owner Facebook groups, WiFi bridge manufacturer co-marketing (Quark-Elec), YouTube sailing channel sponsorships. Target users who already have WiFi bridges installed.

- **Revenue target: $12,000 by Month 12** - 150 users × $79.99 = $11,998. Covers portion of development costs but acknowledge this is passion project with long-term business potential, not immediate ROI.

- **Achieve 99.5% crash-free session rate** - Higher standard appropriate for safety-critical autopilot control. Physical instruments don't crash; app must match that reliability expectation. Monitored via crash reporting (Sentry, Firebase Crashlytics).

- **Achieve 4.5+ star rating on app stores with >20 reviews** - Quality over quantity. 20+ reviews provides social proof while maintaining high bar.

- **Document 10+ successful autopilot control sessions with video proof** - Establish credibility through user testimonials and screencasts showing real-world Raymarine EVO compatibility. Critical for overcoming "will it actually work on my boat?" skepticism.

### User Success Metrics

- **Effective autopilot control rate >90%** - Users successfully adjust course, change modes, and control autopilot without errors or confusion. Method (touch interface) doesn't matter—efficacy does. _(Note: Voice commands deferred to Phase 2 to reduce MVP complexity)_

- **Core feature adoption within first 3 sessions**:
  - 90% successfully connect to NMEA network
  - 70% customize at least one widget
  - 60% control autopilot (among users with compatible systems)

- **Trip logging active usage >40%** - Among users who enable trip logging, 40%+ review their recorded trips (not just enable and forget)

- **Support ticket volume <5% of user base per month** - Low support load indicates good UX and reliability

- **Competitive app displacement >30%** - Among users who previously used manufacturer apps, 30%+ report using Boating Instruments App as primary/only instrument app

### Key Performance Indicators (KPIs)

- **Monthly Active Users (MAU)**: Target 30 MAU by Month 7 (beta), 100 MAU by Month 12, accounting for boating seasonality (summer peaks, winter valleys in northern hemisphere)

- **NMEA Connection Success Rate >98%**: First-connection success rate (raised from 95%). If users can't connect to their WiFi bridge, app is useless. Test with minimum 3 WiFi bridge models.

- **Autopilot Command Success Rate >99%**: When user sends autopilot command (course change, mode switch), it executes correctly on boat. Failure scenarios must have clear error handling and user feedback.

- **Crash-Free Sessions >99.5%**: Less than 1 crash per 200 sessions. Requires extensive beta testing with real users on real boats.

- **Net Promoter Score (NPS) >40**: Strong word-of-mouth potential. Boating community is tight-knit; recommendations matter more than ads.

- **User Retention**:
  - 7-day: >60% (users return during same boating trip/weekend)
  - 30-day: >40% (monthly boaters return)
  - 90-day: >25% (seasonal retention accounting for winter/weather)

### MVP Launch Criteria (Gate Checklist)

**Minimum criteria to exit beta and launch publicly:**
- [ ] 99.5%+ crash-free rate sustained for 2 consecutive weeks with 50+ beta users
- [ ] 98%+ NMEA connection success across 3+ WiFi bridge models (Quark-Elec, Actisense, others)
- [ ] 10+ documented successful autopilot control sessions (different boats/users with video proof)
- [ ] <5% beta user support ticket rate
- [ ] No critical safety issues reported
- [ ] Comprehensive test coverage including connection failures, stress tests, device compatibility
- [ ] All core widgets functional (depth, speed, wind, GPS, engine, autopilot, battery, tanks)

**If criteria not met: Extend beta, do not launch publicly.** Reputation damage from buggy release in safety-critical domain is unrecoverable.

### Development Checkpoint Gates

- **Month 1 Gate**: NMEA connectivity spike successful—can parse real NMEA 0183 & 2000 data from at least one WiFi bridge model. If not: Reassess technical approach.
- **Month 3 Gate**: Widget framework + 5 core widgets functional. Dashboard responsive on phone/tablet. If not: Extend timeline or reduce widget count.
- **Month 5 Gate**: Autopilot control working with Raymarine EVO on at least one test boat. If not: Consider instruments-only MVP (defer autopilot to Phase 2).

---

## MVP Scope

The MVP focuses on core instrument display and autopilot control functionality, delivering immediate value while establishing foundation for future enhancements.

### Core Features (Must Have)

**1. NMEA Network Connectivity**
- **Description:** Connect to NMEA WiFi bridges (Quark-Elec A032, Actisense W2K-1, similar products). Parse NMEA 0183 sentences and NMEA 2000 PGNs. Auto-detect available parameters on network.
- **Rationale:** Foundation for all other features. Without reliable NMEA connectivity, app is non-functional. Must support both protocols since boats use mixed networks.
- **Acceptance Criteria:** 98%+ first-connection success rate across 3+ WiFi bridge models. Graceful error handling for connection failures.

**2. Widget-Based Dashboard**
- **Description:** Drag-and-drop interface for arranging instrument widgets. Resize widgets by dragging corners. Save custom layouts per device. Responsive design adapts to phone (swipe between widgets), tablet (multi-widget view), desktop (maximum screen space).
- **Rationale:** Core architectural principle that enables flexibility and customization. Differentiator from fixed-layout physical instruments.
- **Acceptance Criteria:** Users can create custom dashboard in <5 minutes. Layout persists across app restarts. No performance degradation with 10+ widgets.

**3. Core Instrument Widgets (10 widgets)**
- **Depth Widget:** Digital and/or analog display of water depth. Configurable units (m/ft/fathoms).
- **Speed Widget:** Speed through water (STW) and/or Speed Over Ground (SOG). Configurable units (knots/km/h/mph).
- **Wind Widget (Apparent):** Apparent wind angle and speed. Analog compass rose display option.
- **GPS Position Widget:** Lat/long, COG, SOG. Digital display.
- **Compass Widget:** Heading display (magnetic or true). Analog compass rose.
- **Engine Widget:** RPM, coolant temp, oil pressure. Configurable for single or twin engines.
- **Battery Widget:** Voltage display for house and/or engine batteries.
- **Tank Levels Widget:** Fuel, water, waste water levels. Bar graph visualization.
- **Autopilot Status Widget:** Current mode (Auto/Standby/Wind/Track), target heading, active status.
- **Rudder Position Widget:** Rudder angle indicator.
- **Rationale:** These 10 widgets cover 90% of instrument data recreational boaters need. Based on Raymarine i70s display capabilities and brainstorming session user needs.
- **Acceptance Criteria:** Each widget correctly displays NMEA data when available. Handles missing data gracefully (shows "--" or "N/A"). Updates in real-time (<1 second latency).

**4. Raymarine Evolution Autopilot Control**
- **Description:** Bi-directional autopilot control via touch interface. Adjust heading (±1°, ±10°), switch modes (Auto/Standby/Wind Vane/Track/Power Steer), engage/disengage autopilot. Implements Raymarine EVO protocol (reference: github.com/matztam/raymarine-evo-pilot-remote).
- **Rationale:** Primary use case for solo sailors. P70 replacement functionality is core value proposition.
- **Acceptance Criteria:** 99%+ autopilot command success rate. Commands execute within 2 seconds. User receives confirmation feedback. Error states clearly communicated.

**5. Basic Alarms**
- **Description:** Configurable threshold alarms for depth, wind shift (angle and intensity), speed, battery voltage. Visual and audio alerts. Touch-to-acknowledge.
- **Rationale:** Safety feature matching physical instrument capabilities.
- **Acceptance Criteria:** Alarms trigger reliably when thresholds met. User can configure thresholds easily. Alarm state persists until acknowledged.

**6. Display Modes (Day/Night/Red Night)**
- **Description:** Three color schemes optimized for different lighting conditions. Day: full color. Night: dimmed. Red Night: red-only to preserve night vision. Manual switching or auto based on time.
- **Rationale:** Essential for nighttime sailing safety and comfort.
- **Acceptance Criteria:** Modes switch instantly. Red night mode uses only red spectrum colors. Auto mode switches at sunset/sunrise (based on GPS location if available).

**7. Global Settings**
- **Description:** Unit preferences (speed, depth, temperature, distance, wind speed). Connection settings (WiFi bridge IP/hostname). Alarm thresholds. Display mode preference.
- **Rationale:** Basic app configuration requirements.
- **Acceptance Criteria:** Settings persist across app restarts. Changes take effect immediately.

**8. Playback Mode (Development/Testing)**
- **Description:** Load and playback recorded NMEA message files for testing and demonstration without live boat connection.
- **Rationale:** Essential for development, testing, and user demonstrations/training.
- **Acceptance Criteria:** Can load NMEA recording files provided by user. Playback simulates real-time data flow. All widgets respond to playback data.

**9. Cross-Platform Support**
- **Description:** Single codebase runs on iOS, Android, Windows, Mac with responsive UI adaptation.
- **Rationale:** Core requirement from project scope. Users want to run on any device they have.
- **Acceptance Criteria:** App available on all 4 platforms. Functionality identical across platforms. UI adapts appropriately to each platform's conventions.

---

### Out of Scope for MVP

The following features are explicitly deferred to Phase 2 or later:

- **Trip logging to GPX** - GPS track recording and export deferred to Phase 2. Adds development complexity (background recording, file management, GPX format generation). MVP focuses on real-time display and control.
- **Voice commands** - Adds 60+ hours development time and complex testing. Touch interface sufficient for MVP.
- **True wind calculation** - Derived parameter calculation deferred. MVP shows only direct NMEA data.
- **Auto-discovery of unknown NMEA parameters** - Dynamic widget generation complex. MVP shows only pre-defined widgets.
- **Custom screen builder** - User-configurable widget creation deferred. MVP provides standard widgets only.
- **Preset profiles** (Sailing/Motoring/Racing) - Pre-configured layouts deferred. Users create own layouts.
- **Watch keeper alarm / "dead man's switch"** - Passage-making safety feature deferred to Phase 2.
- **AIS target display** - While i70s supports this, it adds complexity (target list management, collision calculations). Phase 2.
- **Wind history/trend graphs** - Time-series visualization deferred. MVP shows current values only.
- **Trip statistics** - Max speed, avg speed, fuel consumption analytics deferred to Phase 2.
- **3D navigation view** - Alpha-style route visualization deferred. Complex 3D rendering out of MVP scope.
- **IP camera integration** - Video streaming deferred to Phase 3.
- **Multi-device synchronization** - Cloud sync across devices deferred to Phase 3.
- **Community features** - Sharing layouts/trips deferred to Phase 3.
- **NMEA buzzer control** - External alarm device control deferred to Phase 2.
- **Configurable GPX parameters** - Extended parameter logging deferred to Phase 2.

---

### MVP Success Criteria

The MVP is considered successful and ready for public launch when:

1. **All 10 core widgets functional** - Display correct NMEA data, handle edge cases, real-time updates
2. **Autopilot control validated** - 10+ successful sessions on different boats with video documentation
3. **Dashboard customization works** - Users can create/save custom layouts in <5 minutes
4. **99.5%+ crash-free rate** - Sustained over 2 weeks of beta testing with 50+ users
5. **98%+ NMEA connection success** - Works with Quark-Elec, Actisense, and one other WiFi bridge model
6. **User feedback is positive** - Beta testers report value, express willingness to pay, NPS >40
7. **No critical safety issues** - No reports of autopilot control failures, data corruption, or dangerous malfunctions

---

## Post-MVP Vision

### Phase 2 Features (Months 8-12)

**Trip Logging & Analytics**
- GPX track recording with start/stop controls
- Trip statistics widgets (current trip, trip history, seasonal stats)
- Max/avg speed, distance traveled, fuel consumption tracking
- Export and share trip data

**Voice Commands**
- Voice-controlled autopilot adjustments ("course plus ten", "tack now")
- Voice widget navigation ("show wind", "show depth")
- Voice alarm acknowledgment ("snooze alarm")
- Preset profile switching ("sailing mode", "night mode")

**Enhanced Instrument Capabilities**
- True wind calculation (TWA/TWS from apparent wind + boat data)
- Wind history/trend graphs (time-series visualization)
- Auto-discovery of unknown NMEA parameters with dynamic widget generation
- Custom screen builder for user-defined instrument pages

**Safety & Passage Making**
- Watch keeper alarm / "dead man's switch" with periodic check-ins
- NMEA buzzer control for crew alerts
- Escalating alarm behaviors (visual → audio → buzzer)
- Watch timer for shift management

**User Experience Enhancements**
- Preset profiles (Sailing, Motoring, Racing, Cruising) with optimized layouts
- AIS target display (list of closest 25 vessels)
- Configurable alarm logic (compound conditions, geo-fencing)
- Enhanced playback mode controls (speed, pause, jump to timestamp)

### Long-Term Vision (Year 2+)

**Intelligent Assistant Evolution**
- Predictive analytics on trip data (fuel consumption patterns, performance optimization)
- Contextual suggestions (anchor watch mode, optimal tack timing, shallow water warnings)
- 3D navigation view with cross-track error visualization (Alpha-style)

**Extended Connectivity**
- IP camera integration (bow/stern/engine room video feeds)
- Multi-device synchronization (settings and layouts sync across devices)
- Cloud storage for trip history and analytics

**Community & Social**
- Share custom dashboard layouts with community
- Export trips as shareable links
- Download community-created widget configurations
- Crowdsourced best practices and tips

### Expansion Opportunities

**Broader Autopilot Compatibility**
- Garmin autopilot support (Reactor, GHP series)
- Simrad/B&G autopilot support (NAC series)
- Generic NMEA autopilot command support

**Additional Instrument Types**
- Weather instruments (barometer, humidity)
- Performance instruments (VMG, polar diagrams, laylines)
- Navigation instruments (waypoint management, route display without full chartplotter)

**Platform Extensions**
- Apple Watch companion app (quick glance at depth/speed/wind)
- Wear OS support for Android users
- CarPlay/Android Auto integration for helm stations with displays

**Business Model Evolution**
- Freemium tier: Basic instruments free, premium features (autopilot control, trip logging, voice commands) via subscription
- Enterprise tier: Multi-boat fleet management for sailing schools, charter companies
- Hardware partnerships: Bundle app with WiFi bridge purchases

---

## Technical Considerations

### Platform Requirements

**Target Platforms:**
- iOS 15+ (iPhone, iPad)
- Android 10+ (phones, tablets)
- Windows 10/11
- macOS 11+ (Intel and Apple Silicon)

**Browser/OS Support:**
- Native apps preferred over web apps for performance and offline reliability
- Responsive design: 5" phone screens to 27" desktop monitors
- Support device rotation (portrait/landscape)

**Performance Requirements:**
- Real-time NMEA data display with <1 second latency
- Smooth UI (60fps) with 10+ widgets active
- Battery-efficient (4+ hours continuous use on phone)
- Works offline (no internet required, only local WiFi to NMEA bridge)

### Technology Preferences

**Frontend:**
- **Option 1 (Recommended): Flutter** - Single codebase for all platforms, excellent performance, growing marine app ecosystem
- **Option 2: React Native + Electron** - React Native for mobile, Electron for desktop, larger developer community
- **Option 3: Progressive Web App** - Web-based, universal compatibility, but limited offline capabilities and performance

**Backend:**
- **Minimal backend for MVP** - No cloud services required, all processing client-side
- **Phase 2 backend** - Node.js/Express for trip sync, cloud storage (AWS S3 or similar), user accounts (if needed)

**Database:**
- **Local storage**: SQLite for settings, dashboard layouts, cached data
- **Phase 2 cloud**: PostgreSQL for user accounts, trip history sync (if subscription model adopted)

**Key Libraries/Dependencies:**
- NMEA parsing: Custom implementation or adapt existing libraries (nmea-simple for JS, rust-nmea for performance)
- Voice recognition: Platform-native APIs (iOS Speech, Android SpeechRecognizer, Web Speech API)
- Charts/graphs: Chart.js or D3.js for wind history, trip statistics
- Drag-drop: react-dnd, flutter_reorderable, or platform-native solutions

**Hosting/Infrastructure:**
- **MVP**: No hosting required (client-side only apps)
- **Phase 2**: AWS, Google Cloud, or DigitalOcean for backend APIs, S3/Cloud Storage for trip data
- **Distribution**: iOS App Store, Google Play Store, Microsoft Store, Mac App Store, GitHub releases

### Architecture Considerations

**Repository Structure:**
- Monorepo approach with shared core logic and platform-specific UI layers
- Separate packages for: NMEA parser, widget framework, autopilot protocols, core business logic
- Platform folders: /ios, /android, /windows, /macos

**Service Architecture:**
- Client-side architecture for MVP (no microservices needed)
- NMEA connection service (handles WiFi bridge connectivity, message parsing)
- Widget rendering engine (manages dashboard layout, widget lifecycle)
- Autopilot control service (Raymarine EVO protocol implementation)
- Settings/storage service (persist user preferences, layouts)

**Integration Requirements:**
- WiFi bridge connectivity via TCP/UDP sockets (port 10110 typical for NMEA TCP)
- NMEA 2000 PGN decoding (requires PGN database/reference)
- Raymarine EVO protocol (reference: github.com/matztam/raymarine-evo-pilot-remote)
- Platform-specific permissions: Location (GPS), Network (WiFi), Microphone (voice), Storage (playback files)

**Security/Compliance:**
- No user data collection in MVP (privacy-friendly)
- Local storage only (no cloud vulnerabilities)
- Network traffic stays on boat's local WiFi (no internet exposure)
- App Store compliance: Privacy policy, terms of service, age rating (4+ / Everyone)

---

## Constraints & Assumptions

### Constraints

**Budget:**
- Bootstrap project with personal funds or small angel investment
- Development budget: $0-$25K (assumes solo developer or small team with equity compensation)
- Marketing budget: $1-2K for initial outreach (forum ads, YouTube sponsorships)
- Hardware budget: $500-1000 for WiFi bridges, NMEA cables, testing equipment

**Timeline:**
- 7-month MVP target (6 months dev + 1 month beta)
- Flexible but pressure to launch before next boating season (Northern Hemisphere: aim for April-May launch)
- Solo developer or 1-2 person team (limited parallel work capacity)

**Resources:**
- Limited access to physical boats for testing (primary constraint)
- Dependent on user-provided NMEA recording files for development
- Beta testers must have compatible hardware (Raymarine EVO, WiFi bridges)
- No existing marine industry partnerships (must build from scratch)

**Technical:**
- Must work with existing WiFi bridge hardware (cannot require custom hardware)
- Limited Raymarine EVO protocol documentation (reverse engineering required)
- NMEA 2000 PGN database incomplete (some proprietary manufacturer PGNs undocumented)
- Cross-platform requirement increases complexity vs. single-platform approach
- Offline-first requirement (cannot depend on cloud services for core functionality)

### Key Assumptions

- Target users have technical literacy to install and configure WiFi bridges (not plug-and-play)
- Recreational boaters willing to pay $79.99 for instrument app (price point validated through forums, not formal research)
- Raymarine EVO autopilot protocol can be reverse-engineered from community resources (matztam GitHub repo proves feasibility)
- WiFi bridges reliably expose NMEA data (quality varies by manufacturer—Quark-Elec and Actisense considered reliable)
- Users accept app as supplement to physical instruments, not complete replacement (liability/safety concern)
- Cross-platform development achievable with single codebase (Flutter or React Native assumption)
- Voice recognition works adequately in cockpit noise environment (unvalidated—may require testing to confirm)
- Boating market is underserved by existing apps (Raymarine/Garmin apps focus on chartplotting, not dedicated instruments)
- Word-of-mouth marketing effective in tight-knit boating community (forums, Facebook groups, YouTube)
- App Store approval process straightforward (no regulatory hurdles for marine instrument apps)

---

## Risks & Open Questions

### Key Risks

- **Raymarine EVO protocol compatibility**: Reverse-engineered protocol may be incomplete or Raymarine may change it in firmware updates, breaking autopilot control. **Mitigation**: Test extensively with beta users on different EVO firmware versions. Maintain relationship with matztam (GitHub reference) for protocol updates.

- **Limited market size**: Recreational boaters with NMEA networks + WiFi bridges + Raymarine EVO autopilots is small subset. May struggle to reach 150 paying users. **Mitigation**: Expand to other autopilot brands in Phase 2. Consider freemium model to grow user base.

- **Hardware access for testing**: Cannot thoroughly test without physical boat access. Risk of shipping bugs that only appear on real boats. **Mitigation**: Recruit beta testers early (Month 4-5). Provide free lifetime licenses to beta testers in exchange for extensive testing. Use playback mode extensively.

- **Cross-platform development complexity**: Single codebase for 4 platforms may introduce platform-specific bugs, performance issues. **Mitigation**: Choose proven framework (Flutter recommended). Budget 20% extra time for platform-specific polish.

- **Safety liability**: App controls autopilot—malfunctions could cause dangerous situations (boat going off course, collisions). **Mitigation**: Extensive testing. Clear disclaimers that app is supplement to physical instruments. Consider liability insurance. Do not market as primary/safety-critical system.

- **Competition from manufacturers**: Raymarine, Garmin could release competing apps with better integration. **Mitigation**: Ship quickly to establish market presence. Focus on features manufacturers won't prioritize (voice control, custom dashboards, cross-platform).

- **App Store rejection**: Apple/Google may reject app for unclear reasons (permission usage, safety concerns). **Mitigation**: Follow App Store guidelines carefully. Prepare clear explanations for permission usage. Have beta TestFlight version before submission.

- **Boating seasonality**: Development during winter means fewer beta testers available. Launch timing critical. **Mitigation**: Target Southern Hemisphere users for winter testing. Use playback mode for development when boats inaccessible.

### Open Questions

**Technical Questions:**
- Which cross-platform framework will we choose? (Flutter vs. React Native vs. PWA)
- What WiFi bridge models should be officially supported beyond Quark-Elec and Actisense?
- How reliably does voice recognition work in 60+ dB cockpit noise environments?
- Can we decode all necessary NMEA 2000 PGNs, or are some proprietary/undocumented?
- What's the realistic battery consumption for 4-hour sailing session with real-time NMEA monitoring?

**User Experience Questions:**
- Are analog or digital displays preferred for different widgets? (User testing needed)
- How should widget overflow be handled on phone—swipe pages or scrolling canvas?
- What's the right balance between automatic features and user control? (e.g., auto-switching night mode)
- Should default widget sizes be uniform or variable based on data importance?

**Business Questions:**
- Is $79.99 the right price point, or should it be higher ($99-129) or lower ($49)?
- Should we offer regional pricing (lower prices in developing countries)?
- Will users accept in-app purchases for Phase 2 features, or must we bundle everything?
- Should we pursue partnerships with WiFi bridge manufacturers for bundled sales?
- Is there opportunity for B2B sales (sailing schools, charter companies) beyond consumer market?

**Market Questions:**
- What's the total addressable market? (How many recreational boats have NMEA + WiFi bridges?)
- How do we find and reach our target users effectively?
- Will users actually pay $79.99, or is this a "nice to have but not worth paying for" product?
- Are there geographic markets we should prioritize? (US, Europe, Australia have different boating cultures)

**Regulatory/Legal Questions:**
- Do we need marine industry certifications or compliance? (NMEA membership? CE marking?)
- What liability insurance do we need for autopilot control app?
- What disclaimers/warnings must be included in app and marketing materials?
- Are there maritime regulations about using apps for navigation/autopilot control?

### Areas Needing Further Research

- **Competitive deep dive**: Thorough analysis of Raymarine app, Garmin ActiveCaptain, WilhelmSK, iSailor capabilities and user reviews
- **User interviews**: Talk to 10-20 target users about pain points, willingness to pay, feature priorities
- **Technical feasibility spike**: Month 1 NMEA connectivity spike will validate core technical assumptions
- **Raymarine EVO protocol documentation**: Deep dive into matztam repo and community forums for protocol edge cases
- **Framework evaluation**: Build proof-of-concept widget in Flutter vs. React Native to compare developer experience
- **Voice recognition testing**: Test speech recognition APIs in simulated cockpit noise environment
- **Market sizing**: Research number of boats with NMEA 2000 networks, WiFi bridge sales data, Raymarine EVO install base

---

## Next Steps

### Immediate Actions

1. **Choose cross-platform framework** (Week 1) - Evaluate Flutter vs. React Native with proof-of-concept widget. Decision: Flutter recommended for performance and single codebase benefits.

2. **Set up development environment** (Week 1) - Repository structure, CI/CD pipeline, crash reporting (Sentry), analytics (if needed).

3. **Acquire NMEA recording files** (Week 1-2) - Collect sample recordings from different WiFi bridges and boat configurations for development/testing.

4. **Month 1 Technical Spike** (Weeks 1-4) - Prove NMEA connectivity with real WiFi bridge. Parse NMEA 0183 and 2000 messages. Display raw data. Checkpoint gate: Can we reliably connect and parse?

5. **Recruit beta testers** (Month 2-3) - Post in Cruisers Forum, Raymarine owner groups, reach out to WiFi bridge manufacturers. Target: 50 committed testers by Month 5.

6. **Begin widget development** (Month 2-4) - Build widget framework and first 5 core widgets (depth, speed, wind, GPS, autopilot status).

7. **Study Raymarine EVO protocol** (Month 3-5) - Deep dive into matztam GitHub repo. Test autopilot commands with simulator or cooperative boat owner.

8. **Establish pricing and distribution** (Month 3) - Confirm $79.99 pricing. Set up App Store developer accounts. Prepare app store listings.

9. **Beta testing program** (Month 6-7) - Release to 50 beta testers. Collect feedback, fix bugs, validate launch criteria.

10. **Public launch** (Month 7-8) - Submit to app stores. Execute marketing plan (forum posts, YouTube sponsorships, press release). Monitor reviews and support requests.

---

## PM Handoff

This Project Brief provides the full context for **Boating Instruments App**.

**Key Decisions Made:**
- 7-month MVP timeline (6 dev + 1 beta)
- $79.99 one-time purchase pricing
- 9 core features, voice commands and trip logging deferred to Phase 2
- Flutter recommended for cross-platform development
- Focus on Raymarine EVO autopilot compatibility initially

**Critical Success Factors:**
- 99.5%+ crash-free rate (safety-critical standard)
- 98%+ NMEA connection success across multiple WiFi bridges
- 10+ documented autopilot control sessions before public launch
- Strong beta testing program with real boats

**Next Phase:**
Please review this brief thoroughly and create the PRD (Product Requirements Document) section by section, asking for clarification or suggesting improvements as needed. The PRD should translate this strategic brief into detailed technical specifications and user stories for development.

---

*Project Brief completed. Ready for PRD generation phase.*

