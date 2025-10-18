# Story 7.5: NMEA Protocol Conversion Engine

**Status:** Ready for Development

## Story Details

**As a** marine app developer testing with the NMEA Bridge Simulator
**I want** accurate NMEA 2000 ↔ NMEA 0183 protocol conversion that mirrors physical WiFi bridge behavior
**So that** I can validate widget functionality against both protocol formats with semantically equivalent data, matching how real Actisense, Yacht Devices, and other commercial bridges operate.

**Epic:** Epic 7 - NMEA Bridge Simulator Testing Infrastructure
**Story Points:** 5
**Priority:** High
**Labels:** `protocol-conversion`, `nmea2000`, `nmea0183`, `pcdin-encapsulation`

## Acceptance Criteria

### AC1: Core Protocol Conversion Architecture
**Given** the need for accurate protocol conversion
**When** the simulator operates in NMEA 0183 bridge mode
**Then** the system should:
- Generate NMEA 2000 PGNs internally as single source of truth
- Convert PGNs to NMEA 0183 sentences using NMEAProtocolConverter class
- Use native NMEA 0183 sentences where direct mappings exist
- Use $PCDIN encapsulation for PGNs without NMEA 0183 equivalents
- Maintain semantic equivalence between protocols

### AC2: Native Sentence Conversion Mappings
**Given** NMEA 2000 PGNs with direct NMEA 0183 equivalents
**When** I convert PGNs to NMEA 0183 format
**Then** the system should provide accurate conversion for:
- PGN 128267 → DBT/DPT (Depth Below Transducer)
- PGN 128259 → VHW (Speed Through Water)
- PGN 130306 → MWV (Wind Speed and Angle)
- PGN 129029 → GGA/RMC (GPS Position)
- PGN 127250 → HDG (Heading)
- PGN 127488 → RPM (Engine Speed)
- PGN 130310 → MTW (Water Temperature)
- PGN 130311 → MTA (Air Temperature)

### AC3: $PCDIN Encapsulation for Unmapped PGNs
**Given** NMEA 2000 PGNs without direct NMEA 0183 equivalents
**When** I convert these PGNs in NMEA 0183 bridge mode
**Then** the system should:
- Encapsulate in $PCDIN format: `$PCDIN,<PGN hex>,<src>,<dst>,<data>*checksum`
- Apply to PGN 127505 (Fluid Level - tanks)
- Apply to PGN 127508 (Battery Status - optionally, or convert to XDR)
- Correctly calculate checksums for $PCDIN sentences
- Preserve source address and instance information

### AC4: Bidirectional Conversion Support
**Given** the need for future command processing
**When** NMEA 0183 sentences are received
**Then** the system should support conversion framework for:
- DBT/DPT → PGN 128267
- VHW → PGN 128259
- MWV → PGN 130306
- Extensible architecture for additional conversions

### AC5: Conversion Validation and Testing
**Given** the need for accurate protocol conversion
**When** I validate conversion output
**Then** the system should provide:
- Unit tests for each PGN → sentence mapping
- Validation against Actisense NGW-1 conversion table
- Comparison recordings (same scenario, both protocols)
- Semantic equivalence verification tests

### AC6: Physical Bridge Behavior Compliance
**Given** commercial WiFi bridge reference behavior
**When** I compare simulator output to physical bridges
**Then** the system should match:
- Actisense W2K-1/NGW-1 conversion patterns
- Yacht Devices YBWN-02 protocol handling
- Standard $PCDIN encapsulation format
- Message timing and frequency characteristics

### AC7: Device-Specific Mapping Configuration **[NEW - ESSENTIAL]**
**Given** the need to accurately mimic specific WiFi bridge devices
**When** I configure the simulator to match a specific device make/model
**Then** the system should provide:
- **Device profile configuration** for Actisense W2K-1, NGW-1, Yacht Devices, QK-A032
- **Selectable mapping profiles** via command-line (`--bridge-profile actisense-ngw1`)
- **Device-specific PGN → sentence mappings** matching exact bridge behavior
- **Configurable $PCDIN usage** (some bridges use it more/less than others)
- **Per-device conversion rules** loaded from `config/bridge-profiles/[device].yaml`
- **Default profile** (Actisense NGW-1 - most common recreational bridge)

### AC8: Conversion Configuration and Documentation
**Given** the need for maintainable conversion system
**When** I configure or extend conversions
**Then** the system should provide:
- Device-specific conversion profiles (YAML configuration)
- PGN mapping table documentation per device profile
- $PCDIN format specification
- Extension guide for adding new device profiles

## Definition of Done

- [ ] NMEAProtocolConverter class implemented in `src/services/nmea/`
- [ ] Native conversion mappings for 8+ core PGNs
- [ ] $PCDIN encapsulation for unmapped PGNs
- [ ] Bidirectional conversion framework (NMEA 0183 → PGN)
- [ ] **Device-specific bridge profiles** for Actisense NGW-1, W2K-1, Yacht Devices, QK-A032
- [ ] **Command-line profile selection** (`--bridge-profile actisense-ngw1`)
- [ ] **Profile configuration files** in `config/bridge-profiles/` directory
- [ ] **Default profile** (Actisense NGW-1) for recreational boating
- [ ] Unit tests for all conversion mappings (>90% coverage)
- [ ] **Per-profile conversion validation** against device specifications
- [ ] Comparison recordings validating conversion accuracy
- [ ] **Device profile documentation** with conversion mapping tables
- [ ] Documentation of conversion rules and mappings
- [ ] Integration with existing bridge simulator
- [ ] Validation against Actisense NGW-1 reference behavior
- [ ] Story 7.4 recordings updated to use conversion engine

## Technical Implementation Notes

### NMEAProtocolConverter Architecture

**Class Structure:**
```typescript
// src/services/nmea/protocolConverter.ts

export class NMEAProtocolConverter {
  private conversionRules: ConversionRuleSet;

  /**
   * Convert NMEA 2000 PGN to NMEA 0183 sentence(s)
   * May return multiple sentences for single PGN
   */
  convertPGNToSentences(pgn: number, data: PGNData): string[] {
    // Check for native conversion first
    if (this.hasNativeConversion(pgn)) {
      return this.performNativeConversion(pgn, data);
    }

    // Fall back to $PCDIN encapsulation
    return [this.encapsulatePCDIN(pgn, data)];
  }

  /**
   * Convert NMEA 0183 sentence to NMEA 2000 PGN
   * For bidirectional support
   */
  convertSentenceToPGN(sentence: string): PGNData | null {
    const sentenceType = this.extractSentenceType(sentence);
    const conversionRule = this.conversionRules.getRule(sentenceType);

    if (conversionRule) {
      return this.performReverseConversion(sentence, conversionRule);
    }

    return null;
  }

  /**
   * Encapsulate PGN in $PCDIN format
   */
  private encapsulatePCDIN(pgn: number, data: PGNData): string {
    const pgnHex = pgn.toString(16).toUpperCase().padStart(6, '0');
    const src = (data.sourceAddress || 0).toString(16).padStart(2, '0');
    const dst = 'FF'; // Broadcast
    const dataBytes = this.formatDataBytes(data.data);

    const sentence = `$PCDIN,${pgnHex},${src},${dst},${dataBytes}`;
    return this.addChecksum(sentence);
  }
}
```

### Conversion Mapping Table

**Core PGN → NMEA 0183 Mappings:**

| NMEA 2000 PGN | PGN Name | NMEA 0183 | Conversion Type |
|---------------|----------|-----------|-----------------|
| 128267 | Water Depth | DBT, DPT | Native |
| 128259 | Speed Through Water | VHW | Native |
| 130306 | Wind Data | MWV | Native |
| 129029 | GNSS Position | GGA, RMC | Native |
| 127250 | Vessel Heading | HDG | Native |
| 127488 | Engine Parameters | RPM | Native |
| 130310 | Water Temperature | MTW | Native |
| 130311 | Air Temperature | MTA | Native |
| 127505 | Fluid Level | $PCDIN | Encapsulation |
| 127508 | Battery Status | XDR or $PCDIN | Conditional |
| 127513 | Battery Config | $PCDIN | Encapsulation |

### Sample Conversion Implementations

**PGN 128267 → DBT (Depth):**
```typescript
convertDepthToDBT(pgnData: DepthPGNData): string {
  const depthMeters = pgnData.depth;
  const depthFeet = depthMeters * 3.28084;
  const depthFathoms = depthMeters * 0.546807;

  // $IIDBT,<feet>,f,<meters>,M,<fathoms>,F*checksum
  const sentence = `$IIDBT,${depthFeet.toFixed(1)},f,${depthMeters.toFixed(1)},M,${depthFathoms.toFixed(1)},F`;
  return this.addChecksum(sentence);
}
```

**PGN 130306 → MWV (Wind):**
```typescript
convertWindToMWV(pgnData: WindPGNData): string {
  const windAngle = pgnData.angle; // degrees
  const windSpeed = pgnData.speed; // m/s to knots
  const windSpeedKnots = windSpeed * 1.94384;
  const reference = pgnData.reference === 'true' ? 'T' : 'R'; // True or Relative

  // $IIMWV,<angle>,R,<speed>,N,A*checksum
  const sentence = `$IIMWV,${windAngle.toFixed(1)},${reference},${windSpeedKnots.toFixed(1)},N,A`;
  return this.addChecksum(sentence);
}
```

**PGN 127505 → $PCDIN (Tanks - No Native Equivalent):**
```typescript
convertTankToPCDIN(pgnData: TankPGNData): string {
  const pgn = 127505; // 0x01F505
  const pgnHex = '01F505';
  const src = '00';
  const dst = 'FF';

  // Encode tank data: instance, fluid type, level
  const instance = pgnData.instance.toString(16).padStart(2, '0');
  const fluidType = pgnData.fluidType.toString(16).padStart(2, '0');
  const levelValue = Math.round(pgnData.level * 250); // 0-100% to 0-25000
  const levelBytes = this.encodeUInt16(levelValue);

  const dataBytes = `${instance},${fluidType},${levelBytes},00,00,00`;
  const sentence = `$PCDIN,${pgnHex},${src},${dst},${dataBytes}`;
  return this.addChecksum(sentence);
}
```

### Device-Specific Bridge Profiles **[NEW]**

**Profile Directory Structure:**
```
config/bridge-profiles/
├── actisense-ngw1.yaml      # Actisense NGW-1 (DEFAULT - most common)
├── actisense-w2k1.yaml      # Actisense W2K-1 WiFi Gateway
├── yacht-devices-ybwn.yaml  # Yacht Devices YBWN-02
├── qk-a032.yaml             # QK-A032 Gateway
└── default.yaml             # Symlink to actisense-ngw1.yaml
```

**Example Profile: Actisense NGW-1**
```yaml
# config/bridge-profiles/actisense-ngw1.yaml
device:
  manufacturer: "Actisense"
  model: "NGW-1"
  description: "NMEA 2000 to NMEA 0183 Gateway"
  reference_url: "https://actisense.com/products/nmea-2000-gateway-ngw-1/"

conversion_strategy:
  # Actisense NGW-1 prefers native conversion over $PCDIN
  prefer_native: true
  pcdin_fallback: true
  unknown_pgn_behavior: "drop"  # or "pcdin" or "log"

pgn_mappings:
  128267:  # Water Depth
    priority: "native"
    nmea0183: ["DBT", "DPT"]
    notes: "NGW-1 generates both DBT and DPT"

  130306:  # Wind Data
    priority: "native"
    nmea0183: ["MWV"]
    notes: "Apparent and true wind both as MWV"

  127505:  # Fluid Level (Tanks)
    priority: "drop"  # NGW-1 doesn't convert tanks by default
    nmea0183: []
    notes: "Tanks not converted unless specifically configured"
    # Alternative: priority: "pcdin" for some NGW-1 configurations

  127508:  # Battery Status
    priority: "xdr"  # NGW-1 converts to XDR format
    nmea0183: ["XDR"]
    notes: "Battery voltage/current as XDR transducer reading"

  127488:  # Engine Parameters
    priority: "native"
    nmea0183: ["RPM", "XDR"]
    notes: "RPM + temperature/pressure as XDR"
```

**Example Profile: Yacht Devices YBWN-02**
```yaml
# config/bridge-profiles/yacht-devices-ybwn.yaml
device:
  manufacturer: "Yacht Devices"
  model: "YBWN-02"
  description: "NMEA 2000 Wi-Fi Gateway"
  reference_url: "https://www.yachtd.com/products/wifi_gateway.html"

conversion_strategy:
  # Yacht Devices more liberal with $PCDIN
  prefer_native: true
  pcdin_fallback: true
  unknown_pgn_behavior: "pcdin"  # More permissive

pgn_mappings:
  127505:  # Fluid Level
    priority: "pcdin"  # Yacht Devices uses $PCDIN for tanks
    nmea0183: []
    notes: "Tanks encapsulated in $PCDIN"

  127508:  # Battery Status
    priority: "pcdin"  # Yacht Devices uses $PCDIN for batteries
    nmea0183: []
    notes: "Battery data in $PCDIN format"
```

**Simulator Usage with Profiles:**
```bash
# Use default profile (Actisense NGW-1)
node server/nmea-bridge-simulator.js --scenario basic-navigation

# Use specific device profile
node server/nmea-bridge-simulator.js --scenario basic-navigation --bridge-profile yacht-devices-ybwn

# Use with recordings (profile affects conversion)
node server/nmea-bridge-simulator.js --recording file.json --bridge-profile actisense-w2k1
```

### Conversion Rules Configuration

**conversion-rules.yaml (Generic - Used as Base):**
```yaml
# NMEA Protocol Conversion Rules
version: "1.0"
description: "PGN to NMEA 0183 sentence conversion mappings"

conversions:
  - pgn: 128267
    name: "Water Depth"
    nmea0183:
      sentences: [DBT, DPT]
      priority: native
    fields:
      depth:
        pgn_field: "depth"
        unit_conversion: "meters"
        sentences:
          DBT: ["feet", "meters", "fathoms"]
          DPT: ["meters", "offset"]

  - pgn: 130306
    name: "Wind Data"
    nmea0183:
      sentences: [MWV]
      priority: native
    fields:
      windSpeed:
        pgn_field: "speed"
        unit_conversion: "m/s to knots"
      windAngle:
        pgn_field: "angle"
        unit_conversion: "degrees"
      reference:
        pgn_field: "reference"
        values: {true: "T", apparent: "R"}

  - pgn: 127505
    name: "Fluid Level"
    nmea0183:
      sentences: []
      priority: pcdin
    reason: "No direct NMEA 0183 equivalent exists"
```

### Integration with Bridge Simulator

**Modified Simulator Architecture:**
```javascript
class NMEABridgeSimulator {
  constructor() {
    this.internalFormat = 'nmea2000'; // Always generate PGNs internally
    this.outputFormat = 'nmea0183';    // Bridge mode determines output
    this.converter = new NMEAProtocolConverter();
  }

  generateAndBroadcastData() {
    // STEP 1: Generate NMEA 2000 PGNs (single source of truth)
    const pgns = this.generatePGNs();

    // STEP 2: Convert based on bridge mode
    const messages = this.bridgeMode === 'nmea0183'
      ? this.convertToNMEA0183(pgns)
      : this.formatNativePGNs(pgns);

    // STEP 3: Broadcast
    this.broadcastMessages(messages);
  }

  convertToNMEA0183(pgns) {
    const sentences = [];
    pgns.forEach(({ pgn, data }) => {
      const converted = this.converter.convertPGNToSentences(pgn, data);
      sentences.push(...converted);
    });
    return sentences;
  }
}
```

## Dependencies

**Internal Dependencies:**
- Story 7.1 (Core Multi-Protocol Simulator) - COMPLETED
- Story 7.4 (Synthetic NMEA Recordings) - Should complete Story 7.4 first
- Existing PGN parser (`src/services/nmea/pgnParser.ts`)
- NMEA sentence generator utilities

**External Dependencies:**
- Actisense NGW-1 conversion table (research reference)
- NMEA 2000/0183 specification documents
- Physical WiFi bridge for validation testing (optional)

**Story Dependencies:**
- **Prerequisites:** Story 7.1 completed, Story 7.4 recommended
- **Blockers:** None identified
- **Enables:** Accurate dual-mode testing for all widget stories
- **Related:** Story 7.4 recordings should use this conversion engine

## Risks and Mitigations

**Risk 1: Conversion Accuracy vs. Physical Bridges**
- **Probability:** Medium
- **Impact:** High
- **Mitigation:** Research Actisense NGW-1 conversion table; validate against physical bridge output; start with core PGNs only

**Risk 2: Incomplete NMEA Specifications**
- **Probability:** Medium
- **Impact:** Medium
- **Mitigation:** Use multiple reference sources; rely on real-world bridge behavior; document ambiguities

**Risk 3: Performance Impact of Conversion**
- **Probability:** Low
- **Impact:** Low
- **Mitigation:** Optimize conversion functions; cache conversion results; benchmark against target 500+ msg/sec

**Risk 4: Bidirectional Conversion Complexity**
- **Probability:** Low
- **Impact:** Low
- **Mitigation:** Implement unidirectional (PGN → NMEA 0183) first; add reverse conversion incrementally

## Success Metrics

### Accuracy Metrics
- [ ] 100% semantic equivalence between PGN and converted sentence
- [ ] Validation against Actisense NGW-1 conversion table (8+ PGN mappings)
- [ ] Zero conversion errors in unit tests

### Coverage Metrics
- [ ] All core PGNs (128267, 128259, 130306, 129029, 127250, 127488) converted
- [ ] $PCDIN encapsulation working for unmapped PGNs
- [ ] Unit test coverage >90% for conversion logic

### Performance Metrics
- [ ] Conversion overhead <5% of total message generation time
- [ ] Maintains 500+ messages/second throughput
- [ ] Memory usage increase <10MB for conversion engine

### Integration Metrics
- [ ] Story 7.4 recordings successfully use conversion engine
- [ ] Widget tests pass with both NMEA 0183 and NMEA 2000 modes
- [ ] Zero regressions in existing simulator functionality

## Tasks

### Phase 1: Core Conversion Architecture (8 hours)
- Task A: Design NMEAProtocolConverter class interface (2h)
- Task B: Implement $PCDIN encapsulation function (2h)
- Task C: Create conversion rules configuration structure (2h)
- Task D: Implement checksum calculation utilities (2h)

### Phase 2: Native Conversion Implementations (12 hours)
- Task E: PGN 128267 → DBT/DPT (Depth) (2h)
- Task F: PGN 128259 → VHW (Speed) (2h)
- Task G: PGN 130306 → MWV (Wind) (2h)
- Task H: PGN 129029 → GGA/RMC (GPS) (2h)
- Task I: PGN 127250 → HDG (Heading) (2h)
- Task J: PGN 127488 → RPM (Engine) (2h)

### Phase 3: Simulator Integration (6 hours)
- Task K: Integrate converter into simulator data generation (3h)
- Task L: Update simulator to use PGNs as internal format (3h)

### Phase 4: Testing and Validation (8 hours)
- Task M: Unit tests for all conversion functions (4h)
- Task N: Create comparison recordings (NMEA 0183 vs NMEA 2000) (2h)
- Task O: Validation against Actisense reference behavior (2h)

### Phase 5: Documentation (6 hours)
- Task P: Document conversion rules and mappings (3h)
- Task Q: Create PGN mapping table reference (2h)
- Task R: Update simulator documentation (1h)

**Total Estimated Time:** 40 hours (Story Points: 5)

---

## Dev Notes

*Development implementation details, conversion validation results, and physical bridge comparison data will be added here during implementation.*

### Research References

**Actisense NGW-1 Conversion Table:**
- Available at: actisense.com/NGW-1/Downloads
- Contains complete PGN ↔ NMEA 0183 sentence mappings
- Includes transmission periods and filtering rules

**Physical WiFi Bridges:**
- Actisense W2K-1: TCP/UDP with automatic PGN conversion
- Yacht Devices YBWN-02: Bidirectional conversion support
- QK-A032: USB + WiFi with intelligent gateway features

**NMEA Standards:**
- NMEA 2000 PGN definitions (industry standard)
- NMEA 0183 sentence specifications
- $PCDIN format (Chetco proprietary, widely adopted)

## QA Results

*QA validation results, conversion accuracy measurements, and cross-platform compatibility assessments will be added here during review process.*

---

## Dev Agent Record

*This section is populated by the development agent during implementation*

### Context Reference
- **Story Context XML:** `docs/stories/story-context-7.5.xml` - Comprehensive technical context including NMEA protocol conversion engine, gateway device support, multi-protocol simulation frameworks, conversion accuracy validation systems, and N2K/0183 protocol translation infrastructure

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
| 2025-10-18 | 1.0 | Initial story creation for protocol conversion engine | John (PM) |
