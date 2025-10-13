# Phased Delivery Milestones

Requirements are mapped to Project Brief checkpoint gates to support iterative development and risk management:

---

## **Month 1 Gate: NMEA Connectivity Spike**

**Objective:** Prove NMEA connectivity with real WiFi bridge. Parse NMEA 0183 and 2000 messages. Display raw data.

**Requirements in Scope:**
- FR1, FR2, FR29, FR30, FR32, FR36
- NFR1, NFR6, NFR11, NFR16

**Success Criteria:** Can reliably connect to WiFi bridge, parse incoming NMEA data, display connection status, handle connection failures gracefully.

**Risk Mitigation:** If connectivity unreliable, reassess technical approach or WiFi bridge compatibility.

---

## **Month 3 Gate: Widget Framework + 5 Core Widgets**

**Objective:** Dashboard responsive on phone/tablet with 5 functional widgets displaying real-time NMEA data.

**Requirements in Scope:**
- FR3, FR4, FR5, FR6, FR28, FR33, FR39
- FR7 (Depth), FR8 (Speed), FR9 (Wind), FR10 (GPS), FR11 (Compass)
- NFR4, NFR8, NFR9, NFR17 (architecture foundation)

**Success Criteria:** Users can add widgets to dashboard, drag-drop, resize, persist layouts. 5 widgets display live NMEA data with <1s latency.

**Risk Mitigation:** If widget framework too complex, reduce scope to 3 widgets or defer drag-drop to Month 4.

---

## **Month 5 Gate: Autopilot Control Working**

**Objective:** Raymarine EVO autopilot commands work on at least one test boat.

**Requirements in Scope:**
- FR15 (Autopilot Status widget - if not in Month 3)
- FR17, FR18, FR19, FR20, FR21, FR37
- FR31, FR38, FR40 (playback mode for testing)
- NFR2, NFR10

**Success Criteria:** Can send autopilot heading adjustments, mode switches. Commands execute on boat with 99%+ success. Tack/Gybe countdown works.

**Risk Mitigation:** If autopilot control fails, consider instruments-only MVP (defer autopilot to Phase 2). This is highest technical risk item.

---

## **Month 6: Remaining Widgets + Features**

**Objective:** Complete all 10 widgets, alarms, display modes, onboarding.

**Requirements in Scope:**
- FR12, FR13, FR14, FR16 (remaining widgets)
- FR22, FR23, FR24, FR25, FR41, FR42, FR43, FR44 (alarms)
- FR26, FR27 (display modes)
- FR34, FR35 (onboarding, widget configuration)
- NFR5, NFR17 (performance, architecture)

**Success Criteria:** All widgets functional. Alarms trigger reliably. First-run wizard complete. 8+ hour battery life achieved.

---

## **Month 7: Beta Testing + Launch Prep**

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

## **Phase 1.5 (Month 8-9): Desktop Platforms + Custom Widgets**

**Post-MVP Enhancements:**
- NFR7: Windows/macOS platform support
- NFR17: Custom widget composition capability
- Additional widgets based on user feedback (generator, transmission, bilge)

---
