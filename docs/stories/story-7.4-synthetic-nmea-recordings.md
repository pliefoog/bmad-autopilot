# Story 7.4: Synthetic NMEA Test Recordings Library

**Status:** Ready for Development

## Story Details

**As a** developer and QA engineer testing marine widgets and autopilot functionality
**I want** a comprehensive library of pre-built synthetic NMEA test recordings organized by use case and widget type
**So that** I can test widgets in isolation with predictable, repeatable data and validate behavior across NMEA 0183 and NMEA 2000 bridge modes without physical hardware.

**Epic:** Epic 7 - NMEA Bridge Simulator Testing Infrastructure
**Story Points:** 8
**Priority:** High
**Labels:** `test-recordings`, `synthetic-data`, `widget-testing`, `qa-infrastructure`

## Acceptance Criteria

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
- Progressive instance discovery recording (systems coming online gradually)
- Instance removal and timeout recording (equipment shutdown scenarios)
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

## Definition of Done

- [ ] Complete recording library (30+ files) organized in `/recordings/` directory
- [ ] Widget-specific recordings for all Epic 2 widgets
- [ ] Autopilot control recordings (engagement, heading-changes, tack, failure)
- [ ] Multi-instance detection recordings (progressive-discovery, removal, maximum-config)
- [ ] Dual-mode protocol recordings (NMEA 0183 and NMEA 2000 equivalents)
- [ ] Performance stress recordings (high-frequency, malformed-data, protocol-switching)
- [ ] Debug and edge case recordings (minimal, intermittent-connection, zero-values, null-fields)
- [ ] Testing strategy documentation created (`/docs/testing-strategy.md`)
- [ ] Simulator documentation updated (`server/README-SIMULATOR.md`)
- [ ] Recording catalog created (`/recordings/README.md`)
- [ ] Recording file format standard documented
- [ ] Cross-platform validation successful (web, iOS, Android)
- [ ] Story 7.2 updated with recording dependencies

## Technical Implementation Notes

### Recording Library Structure

**File Organization:**
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

### Recording File Format Standard

**JSON Structure:**
```json
{
  "metadata": {
    "name": "Basic Navigation",
    "description": "Standard cruising with all basic widgets",
    "duration": 300.0,
    "message_count": 1500,
    "created": "2025-10-18T12:00:00Z",
    "vessel_type": "40ft Sailboat",
    "scenario_type": "navigation",
    "version": "1.0",
    "bridge_mode": "nmea0183"
  },
  "messages": [
    {
      "timestamp": 1752964773.131632,
      "relative_time": 0.037,
      "message": "$IIDBT,,f,15.2,M,8.3,F*3C",
      "sentence_type": "DBT",
      "description": "Depth - 15.2 meters",
      "sequence": 0
    }
  ]
}
```

### Widget Recording Specifications

**Navigation Widgets:**
- Depth: 15-50 feet sine wave variations (PGN 128267 → DBT)
- Speed: 5-8 knots steady (PGN 128259 → VTG/VHW)
- GPS: Realistic position updates every second (PGN 129029 → GGA/RMC)
- Wind: 12-18 knots varying direction (PGN 130306 → MWV)
- Compass: Steady course with minor variations (PGN 127250 → HDG)

**Engine System Recordings:**
- Single engine: PGN 127488 from source address 0 (RPM 800-3200)
- Twin engines: PGN 127488 from source addresses 0 and 1
- Engine parameters: temperature, oil pressure, boost pressure

**Battery System Recordings:**
- Single battery: PGN 127508 instance 0 (House bank, 12.4V-14.2V)
- Multi-battery: PGN 127508 instances 0-3 (House, Engine, Thruster, Generator)
- Charge/discharge cycles with realistic voltage curves

**Tank System Recordings:**
- Fuel tanks: PGN 127505 with fluidType=0 (multiple instances)
- Water tanks: PGN 127505 with fluidType=1
- Complete system: Fuel, fresh water, gray water, black water

### Protocol Conversion Notes

**NMEA 2000 → NMEA 0183 Mappings:**
- PGN 128267 → DBT/DPT (depth) - Native conversion
- PGN 128259 → VHW (speed through water) - Native conversion
- PGN 130306 → MWV (wind) - Native conversion
- PGN 129029 → GGA/RMC (GPS) - Native conversion
- PGN 127488 → RPM (engine) - Native conversion
- PGN 127508 → XDR or $PCDIN (battery) - Conditional
- PGN 127505 → $PCDIN (tanks) - No NMEA 0183 equivalent

**$PCDIN Encapsulation Format:**
```
$PCDIN,<PGN hex>,<src>,<dst>,<data bytes>*checksum
Example: $PCDIN,01F505,00,FF,01,C8,00,00,00,00*3A
```

## Dependencies

**Internal Dependencies:**
- Story 7.1 (Core Multi-Protocol Simulator) - COMPLETED
- Story 7.2 (Standardized Test Scenario Library) - IN PROGRESS (needs update)
- Existing NMEA parsing infrastructure
- Bridge simulator recording playback capabilities

**External Dependencies:**
- None (all development can proceed with existing tools)

**Story Dependencies:**
- **Prerequisites:** Story 7.1 completed
- **Blockers:** None identified
- **Enables:** Story 2.8 (Display Modes), Story 6.10 (Multi-Instance Detection), All Epic 2 widget testing
- **Related:** Story 7.5 (Protocol Conversion Engine) - recommended as separate story

## Risks and Mitigations

**Risk 1: Recording File Size and Storage**
- **Probability:** Medium
- **Impact:** Low
- **Mitigation:** Use .json.gz compression for large recordings; limit duration to minimum needed; document storage requirements

**Risk 2: Recording Maintenance Burden**
- **Probability:** Low
- **Impact:** Medium
- **Mitigation:** Version recordings in metadata; document creation process; include validation tests; establish review schedule

**Risk 3: Developer/QA Adoption**
- **Probability:** Low
- **Impact:** High
- **Mitigation:** Comprehensive documentation; clear workflow integration; demonstrate efficiency gains; provide troubleshooting support

**Risk 4: Protocol Conversion Accuracy**
- **Probability:** Medium
- **Impact:** Medium
- **Mitigation:** Story 7.5 will address full protocol conversion; use $PCDIN fallback; validate against physical bridge behavior

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

## Tasks

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

## Dev Notes

*Development implementation details, recording generation methodology, and validation results will be added here during implementation.*

### Recording Generation Process

1. **Use existing simulator** to generate base NMEA data streams
2. **Capture data** with precise timing (relative_time field critical)
3. **Add metadata** describing scenario, duration, vessel type
4. **Validate** semantic correctness of NMEA sentences/PGNs
5. **Compress** large files using gzip
6. **Catalog** in README.md with use case mapping

### Testing Strategy

**Developer Workflow:**
```bash
# 1. Select recording for widget under development
# 2. Stop simulator if running (Ctrl+C)
# 3. Start with specific recording
node server/nmea-bridge-simulator.js --recording recordings/widgets/depth/recording-basic-navigation.json

# 4. Develop/test widget with predictable data
# 5. Switch recordings for different scenarios
```

**QA Workflow:**
```bash
# 1. Review story acceptance criteria
# 2. Select test recordings matching each AC
# 3. Execute test suite with recording
# 4. Validate behavior matches expected
# 5. Document results in story QA section
```

## QA Results

*QA validation results, recording playback reports, and cross-platform compatibility assessments will be added here during review process.*

---

## Dev Agent Record

*This section is populated by the development agent during implementation*

### Context Reference
- **Story Context XML:** `docs/stories/story-context-7.4.xml` - Comprehensive technical context including synthetic NMEA recording generation, test data validation frameworks, widget-specific test scenarios, multi-protocol recording systems, and automated test infrastructure

### Agent Model Used
*To be populated by Dev Agent*

### Debug Log References
*To be populated by Dev Agent*

### Completion Notes List
*To be populated by Dev Agent*

### File List
*To be populated by Dev Agent*

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-18 | 1.0 | Initial story creation based on analyst handoff | John (PM) |
