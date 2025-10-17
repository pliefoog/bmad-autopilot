# Epic List

Based on the phased delivery milestones and agile team perspective analysis, the following epic structure delivers value incrementally while de-risking technical unknowns early. Each epic delivers a significant, end-to-end, fully deployable increment of testable functionality.

---

## **Epic 1: Foundation, NMEA0183 & Autopilot Spike**

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

## **Epic 2: NMEA2000, Widget Framework & Complete Instrument Suite**

**Goal:** Add NMEA2000 support (including PGN encapsulation), build extensible widget framework, and implement all 10 core instrument widgets. Deliver a comprehensive, professional-grade instrument display app with consistent UX and polished navigation that boaters can use to monitor all boat parameters from their phone/tablet.

**Timeline:** Month 2-3 (Checkpoint Gate at Month 3)

**Value Delivered:**
- Solo sailors and powerboaters can monitor all 10 instrument types (depth, speed, wind, GPS, compass, engine, battery, tanks, autopilot status, rudder) from any location
- Dashboard customization enables personalized layouts
- Replaces need to check 10 physical instruments
- Widget framework architecture supports Phase 1.5 custom widgets (NFR17)
- **Professional mobile navigation** with clean header design and intuitive settings access
- **Consistent widget presentation** with standardized metric formatting across all instruments
- **Theme system integration** enabling seamless day/night/red-night mode switching
- **Collapsed/expanded widget states** for efficient dashboard space management

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
- **Professional header** with hamburger menu (left), app title (center), connection LED only (right) - no status text (Story 2.9)
- **Zero hardcoded colors** in widgets - all use centralized theme system (Story 2.10)
- **Consistent metric format** across all widgets using MNEMONIC + VALUE + UNIT pattern (Story 2.11)
- **Collapsed/expanded widget states** implemented with 180×180pt collapsed, 180×280pt expanded (Story 2.12)
- **Centralized theme stylesheet** created enabling rapid widget development (Story 2.13)
- Theme switching (day/night/red-night) updates all widgets instantly with no visual artifacts

**Parallel Track:** Begin beta tester recruitment (target 50 users by Month 6)

**Risk Mitigation:**
- **If NMEA2000 parsing too complex:** Focus on most common PGNs first, defer exotic PGNs to Phase 1.5
- **If widget framework complexity causes delay:** Reduce to 7-8 widgets, defer remaining to Epic 4
- **If dual-engine support complex:** Ship with single-engine only, add dual-engine in Phase 1.5

---

## **Epic 3: Autopilot Control & Early Beta**

**Goal:** Implement Raymarine Evolution autopilot control with bi-directional communication, enabling solo sailors to control autopilot from cockpit. Begin closed beta testing with early adopters to get real-world feedback.

**Timeline:** Month 4-5 (Checkpoint Gate at Month 5)  
**Prerequisites:** Epic 7.1 Core Multi-Protocol Simulator (hardware access mitigation)

**Value Delivered:**
- Solo sailors can control autopilot from phone/tablet without going below deck
- P70 autopilot controller replacement functionality (key differentiator)  
- Safety features (5-second countdown for tack/gybe) demonstrate responsible design
- Real-world beta feedback identifies issues before public launch
- **Hardware Mitigation:** Development and testing possible without physical WiFi bridge access

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

## **Epic 4: Alarms, Display Modes, UX Polish & Beta Expansion**

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

## **Epic 5: Quality Gates, Launch Preparation & Public Release**

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

## **Epic 6: UI Architecture Alignment & Framework Modernization**

**Goal:** Transform the existing React Native implementation to align with the UI Architecture specification, improving maintainability, developer experience, and code quality through proper architectural patterns.

**Timeline:** Month 6-7 (6-8 weeks parallel to Epic 4-5)

**Value Delivered:**
- Framework foundation enables rapid Epic 3 autopilot feature development
- Atomic Design architecture reduces component duplication by 60%
- Type safety improvements reduce marine safety-related runtime errors by 80%
- Developer onboarding time reduced from 5 days to 2 days
- Maintainable codebase supports long-term feature evolution

**Requirements Covered:**
- NFR17 (widget architecture extensibility), NFR18 (continuous test coverage)
- Architecture alignment with UI Architecture specification
- Technical debt resolution for framework foundation
- Developer experience improvements

**Success Criteria:**
- Expo Router 3.5+ file-based navigation replaces manual App.tsx routing
- Atomic Design component architecture implemented with 95% type coverage
- Multi-domain Zustand store architecture replacing single store
- React Context ThemeProvider system enabling instant theme switching
- Custom React hooks infrastructure reducing code duplication
- Domain-organized service architecture replacing flat structure
- Centralized TypeScript type system with 100% IntelliSense coverage
- Project structure aligned with UI Architecture specification

**Key Architecture Deliverables:**
- **Story 6.1:** Atomic Design Component Architecture (atoms, molecules, organisms)
- **Story 6.2:** Multi-Store Zustand Architecture Implementation
- **Story 6.3:** ThemeProvider Context System Implementation
- **Story 6.4:** Custom React Hooks Infrastructure
- **Story 6.5:** Service Layer Organization & Architecture
- **Story 6.6:** Shared TypeScript Types System
- **Story 6.7:** Expo Router Migration & File-Based Navigation
- **Story 6.8:** Project Structure Alignment

**Risk Mitigation:**
- **If framework migration causes regressions:** Maintain parallel routing system until migration complete
- **If atomic design complexity delays Epic 3:** Prioritize autopilot-related components first
- **If type system overhaul breaks existing code:** Incremental migration with comprehensive testing

**Strategic Context:** This epic addresses technical debt accumulated during Epic 2 implementation and provides the architectural foundation required for Epic 3's complex autopilot features. Essential for marine safety due to improved type safety and maintainability.

---

## **Epic 7: NMEA Bridge Simulator Testing Infrastructure**

**Goal:** Develop comprehensive NMEA Bridge Simulator with multi-protocol support, standardized test scenario library, and BMAD agent integration to enable hardware-independent development and automated testing of marine instrument functionality and autopilot control systems.

**Timeline:** Month 6-7 (Supporting Development & QA Infrastructure)

**Value Delivered:**
- Hardware mitigation enables Epic 3 autopilot development without physical WiFi bridge access
- Standardized test scenarios provide comprehensive QA validation across all user stories
- BMAD agent integration enables automated testing workflows and performance validation
- Cross-platform testing infrastructure supports web, iOS, and Android development
- Realistic marine data simulation for comprehensive feature testing

**Requirements Covered:**
- FR31 (Enhanced playbook mode with autopilot simulation)
- NFR18 (continuous testing infrastructure)
- Hardware dependency mitigation for development teams
- Automated testing infrastructure for BMAD agent workflows

**Success Criteria:**
- Enhanced Multi-Protocol NMEA Bridge Simulator operational (TCP port 2000, WebSocket port 8080)
- NMEA 0183 and NMEA 2000 bridge mode support with bidirectional autopilot command simulation
- Standardized test scenario library covering navigation, autopilot, safety alarms, and performance testing
- YAML-based scenario configuration with algorithmic NMEA data generation
- BMAD agent integration supporting Dev, QA, and Architect automated workflows
- Cross-platform compatibility validation (web/iOS/Android identical behavior)
- Performance targets: 50+ concurrent connections, 500+ NMEA sentences/second, <100MB RAM usage

**Key Infrastructure Deliverables:**
- **Story 7.1:** Core Multi-Protocol Simulator (Hardware Mitigation Priority)
- **Story 7.2:** Standardized Test Scenario Library  
- **Story 7.3:** BMAD Agent Integration & Testing Infrastructure

**Strategic Dependencies:**
- **Blocks:** Epic 3 (Autopilot Control) - Story 3.1 requires simulator for development without hardware
- **Supports:** Epic 4 (Alarms & Polish), Epic 5 (Launch Preparation) - QA scenarios for comprehensive testing
- **Integrates:** Existing WebSocket bridge, Sample NMEA data, Testing infrastructure

**Risk Mitigation:**
- **If simulator development delays Epic 3:** Prioritize autopilot command simulation features first
- **If YAML scenario complexity causes delays:** Start with basic navigation scenarios, expand incrementally
- **If BMAD agent integration complex:** Defer advanced automation features to post-launch

**Strategic Context:** This epic provides critical testing infrastructure that removes hardware dependencies for development, enables comprehensive QA validation, and supports the BMAD agent workflow. Essential for scaling development and ensuring quality across all platforms.

---
