# PM Agent Handoff Document: Story 7.4 Creation

**Date:** 2025-10-18
**From:** Mary (Business Analyst)
**To:** PM Agent
**Subject:** Create Story 7.4 - Synthetic NMEA Test Recordings Library

---

## Executive Summary

User (Pieter) has requested creation of a new brownfield story within Epic 7 to establish a comprehensive library of synthetic NMEA test recordings for widget-specific testing, protocol validation, and QA workflows. This story addresses a critical gap in the testing infrastructure and will enable consistent, repeatable testing across all development and QA activities.

**Key Insight:** Current simulator lacks proper NMEA 2000 ↔ NMEA 0183 protocol conversion (only changes output format). Physical WiFi bridges perform actual conversion using native sentence mapping + $PCDIN encapsulation.

---

## Story Scope Request

### Proposed Story Details

**Story ID:** Story 7.4
**Story Title:** Synthetic NMEA Test Recordings Library
**Epic:** Epic 7 - NMEA Bridge Simulator Testing Infrastructure
**Story Type:** Brownfield Addition
**Priority:** High
**Estimated Story Points:** 8

### User Story Statement

**As a** developer and QA engineer testing marine widgets and autopilot functionality
**I want** a comprehensive library of pre-built synthetic NMEA test recordings organized by use case and widget type
**So that** I can test widgets in isolation with predictable, repeatable data and validate behavior across NMEA 0183 and NMEA 2000 bridge modes without physical hardware.

---

## Detailed Scope Breakdown

### Phase 1: Core Recording Library (30+ Files)

#### 1. Widget-Specific Recordings (9 files)

**Navigation Widgets:**
- `recording-basic-navigation.json` - Standard cruising (depth, speed, GPS, compass, wind)
- `recording-coastal-sailing.json` - Variable depth with tidal effects
- `recording-deep-water.json` - Ocean conditions

**Environmental Widgets:**
- `recording-weather-conditions.json` - Water temp, barometric pressure, wind shifts

**Engine & Systems:**
- `recording-single-engine.json` - PGN 127488 single engine data
- `recording-twin-engines.json` - PGN 127488 dual source addresses

**Battery & Electrical:**
- `recording-single-battery.json` - PGN 127508 single battery (House)
- `recording-multi-battery.json` - Multiple instances (House, Engine, Thruster, Generator)

**Tank Monitoring:**
- `recording-fuel-tanks.json` - PGN 127505 fuel system
- `recording-all-tanks.json` - Complete tank system (fuel, water, gray, black)

#### 2. Autopilot-Specific Recordings (4 files)

- `recording-autopilot-engagement.json` - Full engagement sequence
- `recording-autopilot-heading-changes.json` - Active mode with heading adjustments
- `recording-autopilot-tack.json` - Sailing tack maneuver
- `recording-autopilot-failure.json` - Failure and emergency disengagement

#### 3. Multi-Instance Detection (4 files)

**Critical for Story 6.10:**
- `recording-progressive-discovery.json` - Systems coming online gradually
- `recording-instance-removal.json` - Equipment shutdown and timeout scenarios
- `recording-maximum-instances.json` - 16 engines/batteries/tanks stress test
- `recording-instance-validation.json` - Instance mapping table validation

#### 4. Performance & Stress Testing (3 files)

- `recording-high-frequency-50hz.json` - 500+ messages/second for 10 minutes
- `recording-malformed-data.json` - Error resilience testing
- `recording-protocol-switching.json` - NMEA 0183 ↔ NMEA 2000 transitions

#### 5. Dual-Mode Protocol Recordings (6 files)

**NMEA 0183 Bridge Mode:**
- `recording-nmea0183-basic-nav.json`
- `recording-nmea0183-twin-engines.json` (RPM sentences)
- `recording-nmea0183-multi-battery.json` ($PCDIN for PGN 127508)

**NMEA 2000 Bridge Mode:**
- `recording-nmea2000-basic-nav.json`
- `recording-nmea2000-twin-engines.json` (native PGN 127488)
- `recording-nmea2000-multi-battery.json` (native PGN 127508)

#### 6. Development & Debug Recordings (4 files)

- `recording-minimal-5min.json` - Quick smoke testing
- `recording-intermittent-connection.json` - WiFi bridge drop simulation
- `recording-zero-values.json` - Edge case testing
- `recording-null-fields.json` - Missing data validation

---

## Critical Technical Discovery

### Current Simulator Gap

**Problem Identified:**
The current NMEA Bridge Simulator (`nmea-bridge-simulator.js`) does NOT perform actual protocol conversion like physical WiFi bridges. It only changes output format.

**Current Behavior:**
```javascript
if (bridgeMode === 'nmea0183') {
  generateNMEA0183Sentences();  // DBT, VTG, MWV, GGA
  generatePCDINAutopilot();      // $PCDIN for autopilot only
} else {
  generateNativePGNs();          // Pure NMEA 2000
}
```

**Physical WiFi Bridge Behavior (Actisense NGW-1, Yacht Devices):**
```
NMEA 2000 Bus → Conversion Engine → NMEA 0183 Sentences
- Native conversion: PGN 128267 → DBT (depth)
- Native conversion: PGN 130306 → MWV (wind)
- $PCDIN encapsulation: PGN 127505 → $PCDIN,... (tanks - no NMEA 0183 equivalent)
```

### Recommended Approach

**Option A:** Include protocol conversion in Story 7.4 (increases story points to ~13)
**Option B:** Create separate Story 7.5 for protocol conversion engine (recommended)

**Story 7.5 Scope (if separate):**
- Build `NMEAProtocolConverter` class
- Implement PGN ↔ NMEA 0183 mappings (depth, speed, wind, GPS, engines, batteries)
- Implement $PCDIN encapsulation for unmapped PGNs
- Create conversion validation recordings
- Research Actisense NGW-1 conversion table

---

## Dependencies & Integration Points

### Blocking Prerequisites

**Must be completed before Story 7.4:**
- ✅ Story 7.1: Core Multi-Protocol Simulator (COMPLETED)
- ⚠️ Story 7.2: Standardized Test Scenario Library (IN PROGRESS - needs update)

### Stories Enabled by 7.4

**Immediate Beneficiaries:**
- Story 2.8: Display Modes & Themes (IN PROGRESS - needs theme test recordings)
- Story 6.10: Multi-Instance Widget Detection (READY - needs instance recordings)
- All Epic 2 widget stories (testing dependency)

### Documentation Updates Required

**Story 7.2 Updates:**
Add to acceptance criteria:
- AC9: Recording File Creation Workflow
  - Baseline widget recordings for common scenarios created
  - Recording file format documented
  - Recording organization structure established

Add to Definition of Done:
- [ ] Widget-specific test recordings available in `/recordings/` directory
- [ ] Recording playback documentation in README-SIMULATOR.md

**New Documentation Required:**

1. **`/docs/testing-strategy.md`** (CREATE)
   - Recording-based widget testing methodology
   - Developer workflow: selecting and using recordings
   - QA workflow: test execution with recordings
   - Recording library organization
   - Simulator start/stop procedures

2. **`server/README-SIMULATOR.md`** (UPDATE)
   - Add "Working with Test Recordings" section
   - Document starting simulator with recordings
   - Document stopping and switching recordings
   - Document per-client vs global playback modes
   - Add troubleshooting for recording playback

3. **`/recordings/README.md`** (CREATE)
   - Recording library index/catalog
   - Description of each recording file
   - Use case mapping (which recording for which widget/scenario)
   - File naming conventions
   - Recording metadata standards

---

## Acceptance Criteria (Draft for PM Review)

### AC1: Widget-Specific Recording Library
**Given** the need for isolated widget testing
**When** I access the recordings library
**Then** the system should provide:
- Navigation widget recordings (basic-navigation, coastal-sailing, deep-water)
- Environmental widget recordings (weather-conditions)
- Engine system recordings (single-engine, twin-engines)
- Battery system recordings (single-battery, multi-battery)
- Tank system recordings (fuel-tanks, all-tanks)
- Each recording contains semantically correct NMEA data
- Recording metadata includes duration, message count, scenario description

### AC2: Autopilot Testing Recording Suite
**Given** autopilot control development and testing requirements
**When** I load autopilot test recordings
**Then** the system should provide:
- Autopilot engagement sequence recording
- Heading adjustment recording with command/response patterns
- Sailing tack sequence recording
- Failure and emergency disengagement recording
- Bidirectional command validation data

### AC3: Multi-Instance Detection Recordings
**Given** Story 6.10 multi-instance widget detection requirements
**When** I execute instance detection testing
**Then** the system should provide:
- Progressive instance discovery recording (systems coming online)
- Instance removal and timeout recording
- Maximum configuration stress test (16 instances per type)
- Instance mapping table validation data
- Support for engines, batteries, and tanks detection scenarios

### AC4: Dual-Mode Protocol Support
**Given** NMEA 0183 and NMEA 2000 bridge mode requirements
**When** I test widget behavior across bridge modes
**Then** the system should provide:
- Equivalent recordings in both NMEA 0183 and NMEA 2000 formats
- NMEA 0183 recordings use native sentences where available
- NMEA 0183 recordings use $PCDIN encapsulation where no native sentence exists
- Semantically identical data between protocol versions
- Protocol conversion validation recordings

### AC5: Performance and Stress Testing Recordings
**Given** performance validation requirements
**When** I execute stress testing scenarios
**Then** the system should provide:
- High-frequency data recording (500+ messages/second, 10+ minutes)
- Malformed data stress recording with error patterns
- Protocol switching recording (NMEA 0183 ↔ NMEA 2000 transitions)
- Intermittent connection recording (disconnect/reconnect patterns)

### AC6: Developer and QA Workflow Documentation
**Given** the need for consistent testing processes
**When** developers and QA engineers use the recording library
**Then** the system should provide:
- Testing strategy documentation (`/docs/testing-strategy.md`)
- Simulator recording workflow guide (updated `README-SIMULATOR.md`)
- Recording library catalog (`/recordings/README.md`)
- Clear instructions for starting/stopping simulator with recordings
- Recording selection guidance based on widget/scenario
- Troubleshooting guide for common recording playback issues

### AC7: Recording File Format and Standards
**Given** the need for maintainable recording library
**When** I create or use recording files
**Then** the system should enforce:
- Standardized JSON format with metadata block
- Message array with timestamp and relative_time fields
- Compression support (.json.gz) for large recordings
- Semantic descriptions for each message
- Version tracking in metadata
- File naming conventions documented

### AC8: Cross-Platform Validation Support
**Given** web, iOS, and Android platform requirements
**When** I validate widget behavior across platforms
**Then** the system should provide:
- Platform validation recording with deterministic output
- Identical behavior verification data
- Known expected outputs for automated testing
- CI/CD integration test fixtures

---

## Task Breakdown (Estimated)

### Phase 1: Recording Infrastructure (8 hours)
- Task A: Define recording file format standard (2h)
- Task B: Create recording metadata schema (2h)
- Task C: Set up recording directory structure (1h)
- Task D: Create recording catalog template (1h)
- Task E: Document file naming conventions (2h)

### Phase 2: Widget Recording Creation (16 hours)
- Task F: Navigation widget recordings (3h)
- Task G: Environmental widget recordings (2h)
- Task H: Engine system recordings (3h)
- Task I: Battery system recordings (3h)
- Task J: Tank system recordings (3h)
- Task K: Multi-instance detection recordings (2h)

### Phase 3: Autopilot & Scenario Recordings (10 hours)
- Task L: Autopilot engagement recordings (3h)
- Task M: Autopilot control recordings (3h)
- Task N: Performance stress recordings (4h)

### Phase 4: Dual-Mode Protocol Recordings (12 hours)
- Task O: NMEA 0183 mode recordings (6h)
- Task P: NMEA 2000 mode recordings (6h)

### Phase 5: Documentation (8 hours)
- Task Q: Create testing-strategy.md (4h)
- Task R: Update README-SIMULATOR.md (2h)
- Task S: Create recordings/README.md catalog (2h)

### Phase 6: Story 7.2 Integration (4 hours)
- Task T: Update Story 7.2 acceptance criteria (2h)
- Task U: Update Story 7.2 definition of done (2h)

**Total Estimated Time:** 58 hours (Story Points: 8)

---

## Risks and Mitigations

### Risk 1: Protocol Conversion Complexity
**Risk:** Implementing accurate NMEA 2000 ↔ NMEA 0183 conversion may be more complex than anticipated
**Probability:** Medium
**Impact:** High
**Mitigation:**
- Recommend separate Story 7.5 for protocol conversion engine
- Start with essential PGN mappings only (depth, speed, wind, GPS)
- Use $PCDIN encapsulation as fallback for unmapped PGNs
- Research Actisense NGW-1 conversion table for guidance

### Risk 2: Recording File Size and Storage
**Risk:** 30+ recording files with high-frequency data may consume significant disk space
**Probability:** Medium
**Impact:** Low
**Mitigation:**
- Use .json.gz compression for large recordings
- Limit recording duration to minimum needed for testing
- Document storage requirements in catalog
- Implement recording cleanup procedures

### Risk 3: Recording Maintenance Burden
**Risk:** Recording library may become outdated as NMEA standards evolve
**Probability:** Low
**Impact:** Medium
**Mitigation:**
- Version recordings in metadata
- Document recording creation process for regeneration
- Include recording validation tests
- Establish periodic review schedule

### Risk 4: Developer/QA Adoption
**Risk:** Team may not adopt recording-based testing methodology
**Probability:** Low
**Impact:** High
**Mitigation:**
- Comprehensive documentation with examples
- Clear workflow integration
- Demonstrate efficiency gains
- Provide troubleshooting support

---

## Success Metrics

### Coverage Metrics
- [ ] 100% of Epic 2 widgets have dedicated test recordings
- [ ] All autopilot scenarios from Story 7.2 have recordings
- [ ] Multi-instance detection scenarios (Story 6.10) fully covered
- [ ] Both NMEA 0183 and NMEA 2000 modes supported

### Quality Metrics
- [ ] Recordings produce consistent output across 10 playback cycles
- [ ] Zero playback errors in simulator logs
- [ ] Cross-platform validation successful (web/iOS/Android identical behavior)

### Adoption Metrics
- [ ] Developer feedback: 90%+ find recordings useful
- [ ] QA efficiency: 50%+ reduction in test setup time
- [ ] Documentation clarity: 100% of team can start simulator with recording independently

### Performance Metrics
- [ ] High-frequency recordings maintain 500+ msg/sec rate
- [ ] Playback timing accuracy within 5% of target
- [ ] Memory usage under 100MB for typical recording playback

---

## Open Questions for PM Agent

1. **Story Splitting:** Should protocol conversion be included in Story 7.4 or separate Story 7.5?
   - **Analyst Recommendation:** Separate Story 7.5 (cleaner scope, better estimation)

2. **Priority:** Should Story 7.4 be elevated to CRITICAL priority given Story 2.8 and 6.10 dependencies?
   - **Analyst Recommendation:** Yes, HIGH priority minimum

3. **Phasing:** Should recordings be created incrementally (Phase 1: essentials, Phase 2: comprehensive)?
   - **Analyst Recommendation:** Yes, prioritize widget-specific and autopilot recordings first

4. **Documentation Location:** Should testing-strategy.md be in `/docs/` or `/docs/testing/`?
   - **Analyst Recommendation:** `/docs/` for visibility, or create `/docs/testing/` if multiple test docs expected

5. **Recording Storage:** Should recordings be in repository or separate asset storage?
   - **Analyst Recommendation:** Repository for essential recordings, external storage for large stress test recordings

---

## Recommended PM Workflow Execution

### Step 1: Review and Refine Scope
- Review this handoff document
- Determine if protocol conversion should be Story 7.4 or Story 7.5
- Adjust story points based on final scope
- Validate acceptance criteria completeness

### Step 2: Create Story 7.4 Using BMAD Workflow
- Use `*create-brownfield-story` command
- Epic: Epic 7
- Input refined scope and acceptance criteria
- Generate story file: `story-7.4-synthetic-nmea-recordings.md`

### Step 3: Update Story 7.2
- Add AC9 for recording file creation
- Update Definition of Done
- Add dependency reference to Story 7.4

### Step 4: Create Documentation Structure
- Outline testing-strategy.md content
- Plan README-SIMULATOR.md updates
- Design recordings/README.md catalog format

### Step 5: If Creating Story 7.5 (Protocol Conversion)
- Define scope for NMEAProtocolConverter class
- List PGN mapping priorities
- Establish conversion validation approach
- Link to Story 7.4 as dependency

---

## Supporting Research & References

### Physical WiFi Bridge Research
- Actisense W2K-1: NMEA 2000 to WiFi with built-in conversion
- Yacht Devices YBWN-02: Bi-directional NMEA 2000/0183 conversion
- QK-A032: Intelligent gateway with USB and WiFi
- Actisense NGW-1: Conversion table available on manufacturer website

### $PCDIN Encapsulation
- Proprietary format used by Chetco and others
- Format: `$PCDIN,<PGN hex>,<src>,<dst>,<data bytes>*checksum`
- Used when no direct NMEA 0183 sentence equivalent exists
- Already partially implemented in current simulator for autopilot commands

### NMEA PGN → NMEA 0183 Common Mappings
- PGN 128267 → DBT/DPT (depth)
- PGN 128259 → VHW (speed through water)
- PGN 130306 → MWV (wind)
- PGN 129029 → GGA/RMC (GPS)
- PGN 127488 → RPM (engine)
- PGN 127508 → XDR (battery - or $PCDIN)
- PGN 127505 → $PCDIN (tanks - no native equivalent)

---

## Next Actions for PM Agent

1. Load and review this handoff document
2. Execute `*create-brownfield-story` workflow
3. Create Story 7.4 file in `/docs/stories/`
4. Update Story 7.2 with dependencies
5. Decide on Story 7.5 creation for protocol conversion
6. Review with Pieter (user) for approval

---

## Appendix: Recording Library Organization (Proposed)

```
/recordings/
├── README.md                           # Catalog and index
├── widgets/
│   ├── navigation/
│   │   ├── recording-basic-navigation.json
│   │   ├── recording-coastal-sailing.json
│   │   └── recording-deep-water.json
│   ├── environmental/
│   │   └── recording-weather-conditions.json
│   ├── engines/
│   │   ├── recording-single-engine.json
│   │   └── recording-twin-engines.json
│   ├── batteries/
│   │   ├── recording-single-battery.json
│   │   └── recording-multi-battery.json
│   └── tanks/
│       ├── recording-fuel-tanks.json
│       └── recording-all-tanks.json
├── autopilot/
│   ├── recording-autopilot-engagement.json
│   ├── recording-autopilot-heading-changes.json
│   ├── recording-autopilot-tack.json
│   └── recording-autopilot-failure.json
├── multi-instance/
│   ├── recording-progressive-discovery.json
│   ├── recording-instance-removal.json
│   ├── recording-maximum-instances.json
│   └── recording-instance-validation.json
├── protocols/
│   ├── nmea0183/
│   │   ├── recording-nmea0183-basic-nav.json
│   │   ├── recording-nmea0183-twin-engines.json
│   │   └── recording-nmea0183-multi-battery.json
│   └── nmea2000/
│       ├── recording-nmea2000-basic-nav.json
│       ├── recording-nmea2000-twin-engines.json
│       └── recording-nmea2000-multi-battery.json
├── performance/
│   ├── recording-high-frequency-50hz.json.gz
│   ├── recording-malformed-data.json
│   └── recording-protocol-switching.json
└── debug/
    ├── recording-minimal-5min.json
    ├── recording-intermittent-connection.json
    ├── recording-zero-values.json
    └── recording-null-fields.json
```

---

**END OF HANDOFF DOCUMENT**

**Document Status:** Ready for PM Agent Review
**Prepared By:** Mary (Business Analyst Agent)
**Date:** 2025-10-18
**Next Agent:** PM Agent
