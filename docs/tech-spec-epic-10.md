# Technical Specification: NMEA Bridge Simulator Architecture Modernization

Date: 2025-10-27
Author: Pieter
Epic ID: 10
Status: Draft

---

## Overview

Epic 10 consolidates three separate NMEA tools into a unified, mode-based architecture that transforms fragmented functionality (hardware bridge + file playback + simulation) into a single entry point with intelligent mode switching. The updated architecture specification defines a clean modular solution that serves all marine development and testing needs through unified CLI commands and standardized API interfaces.

This modernization builds upon the successful Epic 10.1-10.2 achievements (modular component extraction and "Simulator Control API" standardization) to complete the tool consolidation phase, creating a production-ready testing infrastructure that eliminates hardware dependencies while maintaining all existing functionality and performance characteristics.

## Objectives and Scope

**In Scope:**
- ✅ Modular component extraction completed (Epic 10.1) - Clean separation of protocol servers, data sources, and control APIs
- ✅ API standardization completed (Epic 10.2) - "Simulator Control API" naming implemented across all components  
- Tool consolidation into unified `nmea-bridge.js` with mode-based operation (`--live`, `--file`, `--scenario`)
- Complete scenario library covering safety, performance, and autopilot scenarios for comprehensive QA coverage
- Documentation cleanup resolving README conflicts and creating single authoritative architecture source
- Final validation ensuring all three operational modes function correctly with maintained performance targets

**Out of Scope:**
- Docker infrastructure (separate Epic for deployment)
- CI/CD integration (separate Epic for DevOps)
- Scenario-to-recording conversion (removed - over-engineering)
- Advanced monitoring/alerting (separate Epic for observability)
- Multi-parameter evolution engine with sailboat physics (Story 10.6 - separate implementation track)
- Client-side application changes (pure simulator infrastructure consolidation)

## System Architecture Alignment

Epic 10 implements the unified architecture specification that consolidates three separate NMEA tools into a single, mode-based solution with intelligent operation switching:

**Target Unified Architecture:**
- **Single Entry Point:** `nmea-bridge.js` mode router with CLI interface (`--live <host> <port>`, `--file <path> [options]`, `--scenario <name> [options]`)
- **Mode-Specific Data Sources:** Unified interface for hardware connections, file playback, and scenario simulation
- **Protocol-Agnostic Servers:** Multi-protocol stack (TCP:2000, UDP:2000, WebSocket:8080) serves all modes
- ### APIs and Interfaces

**Unified CLI Interface (New):**
```bash
# Hardware Bridge Mode
node nmea-bridge.js --live <host> <port>

# File Playback Mode  
node nmea-bridge.js --file <path> [--rate 1.0] [--loop]

# Scenario Simulation Mode
node nmea-bridge.js --scenario <name> [--loop] [--speed 1.0]
```

**Simulator Control API (Standardized - Port 9090):** Standardized REST interface (port 9090) for external tool integration

**Architecture Compliance:**
The implementation follows the NMEA simulator architecture specification's component boundaries, naming conventions, and file organization patterns while maintaining Epic 10.1-10.2 achievements and all existing functionality.

## Detailed Design

### Services and Modules

| Module | Responsibility | Max Lines | Input | Output | Owner |
|--------|---------------|-----------|-------|--------|-------|
| `nmea-bridge.js` | Mode router & orchestration | <300 | CLI args, config | Mode initialization | Core |
| `lib/protocol-servers.js` | Multi-protocol network servers | 250 | NMEA data | TCP/UDP/WebSocket broadcasts | Network |
| `lib/control-api.js` | REST API server | 200 | HTTP requests | JSON responses | API |
| `lib/data-sources/live.js` | Hardware connection | 150 | TCP/UDP streams | NMEA sentences | Hardware |
| `lib/data-sources/file.js` | File playback | 150 | Recorded files | NMEA sentences | Playback |
| `lib/data-sources/scenario.js` | Scenario simulation | 300 | YAML config | Generated NMEA | Simulation |


### Data Models and Contracts

**Unified CLI Interface Schema:**
```javascript
interface CLIOperation {
  mode: 'live' | 'file' | 'scenario';
  arguments: {
    // Live mode: --live <host> <port>
    host?: string;
    port?: number;
    
    // File mode: --file <path> [rate] [loop]
    filePath?: string;
    playbackRate?: number;
    loop?: boolean;
    
    // Scenario mode: --scenario <name> [options]
    scenarioName?: string;
    scenarioOptions?: object;
  };
}
```

**Data Source Interface Contract:**
```javascript
interface DataSource {
  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): SourceStatus;
  on(event: 'data' | 'error' | 'status', callback: Function): void;
}

interface SourceStatus {
  active: boolean;
  connectionState: 'connected' | 'connecting' | 'disconnected';
  messageRate: number;
  errorCount: number;
}
```

**NMEA Message Format (Preserved from Epic 10.1):**
```javascript
interface NMEAMessage {
  sentence: string;        // Raw NMEA sentence with checksum  
  timestamp: Date;         // Generation timestamp
  messageType: string;     // DBT, VTG, MWV, GGA, etc.
  protocol: 'NMEA_0183' | 'NMEA_2000';
  parsed?: object;         // Optional parsed data structure
}
```

**Simulator Configuration Schema:**
```javascript
interface SimulatorConfig {
  server: {
    ports: { tcp: 2000, udp: 2000, websocket: 8080, api: 9090 };
    maxClients: number;
    timeoutMs: number;
  };
  nmea: {
    protocol: 'NMEA_0183' | 'NMEA_2000';
    checksumValidation: boolean;
    maxSentenceLength: number;
  };
  scenarios: {
    defaultPath: string;
    autoLoop: boolean;
    messageFrequencyHz: number;
  };
}
```

**Component Interface Contract:**
```javascript
interface SimulatorComponent {
  async start(config: SimulatorConfig): Promise<void>;
  async stop(): Promise<void>;
  getStatus(): ComponentStatus;
  getMetrics(): ComponentMetrics;
}
```

### APIs and Interfaces

**Simulator Control API (Port 9090) - Complete Endpoint Coverage:**
```javascript
// Mode Management (NEW - Unified Architecture)
POST   /api/mode/switch           // Body: { mode: 'live'|'file'|'scenario', config: object }
GET    /api/mode/status           // Response: { currentMode: string, config: object }

// Scenario Management (Epic 10.2 Complete)
POST   /api/scenarios/start       // Body: { scenario: string, options?: object }
GET    /api/scenarios/status      // Response: { scenario: string, progress: number }
POST   /api/scenarios/stop        // Response: { stopped: boolean }
GET    /api/scenarios/list        // Response: { scenarios: string[] }

// Runtime Control (Epic 10.2 Complete)
POST   /api/inject-data          // Body: { nmea: string[] }
POST   /api/simulate-error       // Body: { errorType: string, duration?: number }
GET    /api/clients/connected    // Response: { clients: ClientInfo[] }

// Session Management
GET    /api/session/state         // Response: SimulatorState
POST   /api/session/save          // Body: { name: string }
POST   /api/session/load          // Body: { name: string }

// Health & Monitoring
GET    /api/health                // Response: { status: 'healthy', uptime: number }
GET    /api/metrics               // Response: PerformanceMetrics
```

**Component Communication Interface:**
```javascript
class SimulatorEventBus {
  emit(event: string, data: object): void;
  on(event: string, callback: Function): void;
  off(event: string, callback: Function): void;
}

// Standard Events
'client_connected'     // { clientId, protocol, timestamp }
'scenario_started'     // { scenarioName, config }
'nmea_data_generated'  // { sentence, timestamp, messageType }
'error_occurred'       // { error, component, timestamp }
```

### Workflows and Sequencing

**Unified Tool Startup Sequence:**
1. Parse CLI arguments to determine operational mode (live/file/scenario)
2. Load and validate configuration files
3. Initialize appropriate data source based on mode selection
4. Start multi-protocol servers (TCP:2000, UDP:2000, WebSocket:8080)
5. Start Simulator Control API server (port 9090)  
6. Emit 'simulator_ready' event and begin data processing

**Mode Switching Workflow:**
1. Gracefully stop current data source
2. Validate new mode configuration
3. Initialize new data source
4. Resume broadcasting with new data stream
5. Update API status endpoints

**Tool Consolidation Sequence:**
1. Extract mode-specific logic from existing tools
2. Create unified CLI interface with mode routing
3. Implement data source abstraction layer
4. Integrate existing protocol servers
5. Test all three operational modes
6. Update VS Code tasks for unified interface


## Non-Functional Requirements

### Performance

**Performance Targets (Epic 10.1/10.2 Validated):**
- **Message Rate:** 500+ NMEA messages/second sustained for 10+ minutes (maintained during modular refactoring)
- **Concurrent Connections:** 50+ simultaneous clients with no performance degradation
- **Memory Usage:** <100MB RAM for typical scenarios (validated post-component extraction)
- **CPU Utilization:** <10% on modern development machines 
- **Startup Time:** <3 seconds cold start to fully operational
- **Mode Switching:** <1 second transition between operational modes
- **Response Latency:** <1ms for message dispatch, <50ms for API endpoints

**Consolidation Performance Requirements:**
- All three operational modes (live, file, scenario) maintain identical performance characteristics
- No performance regression from tool consolidation
- Memory footprint remains under 100MB across all modes
- **Concurrent Connections:** 50+ simultaneous client connections without degradation
- **Memory Usage:** <100MB RAM during typical scenarios
- **CPU Utilization:** <10% on modern development machines (M1/Intel)
- **Startup Time:** <3 seconds cold start to ready state
- **Response Latency:** <1ms message dispatch from generation to client transmission



### Security

**Local Development Security:**
- **Network Binding:** All servers bind to localhost only (no external network exposure)
- **WebSocket Origin:** Restrict WebSocket connections to localhost origins in development
- **Input Validation:** Validate all NMEA sentence formats, checksums, and API inputs
- **File System Security:** Restrict file operations to designated scenario and recording directories
- **Configuration Validation:** JSON schema validation for all configuration files

**Dependency Security:**
- **Version Locking:** Use exact version pinning for all npm dependencies (maintained from Epic 10.1)
- **Vulnerability Management:** Regular npm audit with automated security updates
- **Code Quality:** ESLint security rules and TypeScript strict mode enforcement

### Reliability/Availability

**Reliability Targets:**
- **Component Isolation:** Individual module failures don't cascade to other components
- **Mode Switching Reliability:** 99.9% success rate for mode transitions with rollback capability  
- **Connection Resilience:** Handle 50+ concurrent client connections with graceful disconnection
- **Scenario Execution:** 99%+ success rate for scenario loading and execution
- **Error Recovery:** Automatic fallback to basic navigation if custom scenarios fail

**Consolidation Reliability:**
- **Backward Compatibility:** All existing Epic 7 functionality preserved during tool consolidation
- **Migration Safety:** Zero data loss during transition from separate tools to unified architecture
- **Rollback Capability:** Ability to revert to separate tools if consolidation issues arise


### Observability

**Observability Requirements:**
- **Structured Logging:** JSON format with timestamp, level, component, and context fields
- **Performance Monitoring:** Real-time metrics for message rates, memory usage, and client connections
- **Component Health:** Status endpoints for each modular component (`/api/health`)
- **Unified Tool Tracking:** Mode transitions, data source changes, and operational status logging
- **Development Integration:** VS Code task output and terminal integration for debugging

**Metrics Collection (Epic 10.2 API Enhancement):**
- Message generation rates per protocol (TCP/UDP/WebSocket)
- Client connection statistics and error rates  
- Mode transition success/failure rates
- Component performance metrics (memory, CPU, latency)
- Scenario execution statistics and error tracking

## Dependencies and Integrations

**Core Runtime Dependencies (Validated Epic 10.1):**
```json
{
  "runtime": {
    "node": ">=20",
    "npm": ">=10"
  },
  "core_dependencies": {
    "express": "^5.1.0",
    "ws": "^8.18.1", 
    "cors": "^2.8.5",
    "js-yaml": "^4.1.0",
    "ajv": "^8.17.1"
  },
  "nmea_processing": {
    "nmea-simple": "^3.3.0",
    "@canboat/canboatjs": "^3.11.0"
  },
  "development": {
    "jest": "^29.7.0",
    "typescript": "^5.8.3",
    "eslint": "^8.57.1"
  }
}
```

**Tool Consolidation Dependencies:**
- **Existing Tools:** `nmea-websocket-bridge-enhanced.js`, `nmea-bridge-simulator.js`, `simulator-control-api.js`
- **VS Code Tasks:** Updated task definitions for unified CLI interface
- **Configuration Files:** Scenario YAML files, recording JSON files, config schemas
- **Test Infrastructure:** Jest test suites, integration tests, performance benchmarks

**External Integration Points:**
- **React Native App:** TCP socket connections for live NMEA data
- **Web Development:** WebSocket connections on port 8080 for browser testing  
- **VS Code Extension:** Task runner integration and terminal output
- **GitHub Copilot:** Updated instructions for unified tool usage
- **BMAD Agents:** API endpoints for automated testing workflows
- **Metrics Endpoint:** GET /api/metrics for performance dashboard integration
- **Error Tracking:** Structured error logs for debugging and issue resolution

## Dependencies and Integrations

## Acceptance Criteria (Authoritative)

### AC1: Unified Tool Consolidation ✅ **[CRITICAL]**
1. Single `nmea-bridge.js` entry point replaces three separate tools
2. Mode-based operation via CLI arguments: `--live`, `--file`, `--scenario`
3. All existing functionality from hardware bridge, file playback, and simulation preserved
4. No functional regressions from tool consolidation process
5. Unified configuration management across all operational modes

### AC2: Modular Architecture Implementation ✅ **[COMPLETED Epic 10.1]**
1. Main orchestration file reduced to <300 lines with clear component separation
2. Protocol servers extracted to `lib/protocol-servers.js` (<250 lines)
3. Data source abstraction layer with mode-specific implementations
4. Control API extracted to `lib/control-api.js` (<200 lines)
5. All components follow single responsibility principle with clear interfaces

### AC3: API Standardization and Completeness ✅ **[COMPLETED Epic 10.2]**
1. "Simulator Control API" naming consistently applied across all documentation
2. All 13 documented REST endpoints operational on port 9090
3. Mode management endpoints: `/api/mode/switch`, `/api/mode/status`
4. Complete scenario management: start, stop, status, list scenarios
5. Runtime control: data injection, error simulation, client monitoring
6. Health and metrics endpoints for external monitoring integration

### AC4: Complete Scenario Library Coverage
1. Safety scenarios implemented: shallow-water-alarm, engine-temperature-alarm, battery-drain-scenario  
2. Performance scenarios implemented: high-frequency-data, malformed-data-stress, multi-protocol-scenario
3. Autopilot scenarios implemented: autopilot-tack-sequence, autopilot-failure-recovery
4. All scenarios integrate with existing testing infrastructure
5. YAML schema validation for all scenario configurations

### AC5: Documentation Consolidation and Tooling Updates
1. Single authoritative architecture document (conflicts removed)
2. Unified README.md documentation for consolidated tool
3. VS Code tasks updated for unified CLI interface
4. GitHub Copilot instructions reflect task-first workflow
5. All legacy documentation explicitly removed from Git

### AC6: Performance and Quality Preservation ✅ **[VALIDATED Epic 10.1/10.2]**
1. Performance targets maintained: 500+ msg/sec, <100MB RAM, 50+ connections
2. 90%+ test coverage across all modular components
3. Cross-platform compatibility (web/iOS/Android) preserved
4. Backward compatibility with all existing Epic 7 functionality
5. No breaking changes for existing React Native app integration

### AC7: Developer Experience Enhancement
1. Task-first development workflow operational via VS Code tasks
2. All scenario types accessible via standardized task definitions
3. External tool integration via Simulator Control API endpoints
4. Professional logging and debugging capabilities
5. Clean migration path from separate tools documented

### External System Dependencies

**Development Environment:**
- **VS Code:** Task runner integration with standardized scenario tasks
- **GitHub Copilot:** Updated instructions for Epic 10 workflow patterns
- **Docker:** Container deployment for CI/CD integration
- **npm/Node.js:** Package management and runtime execution

**Testing Infrastructure:**
- **Jest Framework:** Unit tests for all modular components
- **WebSocket Clients:** Browser and Node.js test client compatibility
- **TCP/UDP Clients:** Native mobile client validation
- **Performance Monitors:** Memory and CPU usage validation tools

## Acceptance Criteria (Authoritative)

### AC-10.1: Modular Component Extraction (Story 10.1)
1. **Simulator main file reduced from 1896 lines to <500 lines** with core orchestration only
2. **All Epic 7 functionality preserved** - existing test suite passes without modification
3. **Component isolation achieved** - lib/protocol-servers.js, lib/nmea-generator.js, lib/message-scheduler.js, lib/session-recorder.js created with clear interfaces
4. **Performance characteristics maintained** - 500+ msg/sec, <100MB RAM, 50+ connections validated
5. **Configuration management centralized** - JSON/YAML configuration system with validation
6. **Error handling enhanced** - graceful degradation across component failures

### AC-10.2: API Standardization & Renaming (Story 10.2)
7. **All references standardized** using "Simulator Control API" naming 
8. **Complete endpoint implementation** - /api/scenarios/*, /api/inject-data, /api/simulate-error, /api/clients/connected operational
9. **Session management** - /api/session/save and /api/session/load endpoints functional
10. **Health monitoring** - /api/health and /api/metrics endpoints provide real-time status
11. **API documentation complete** - All endpoints documented with request/response schemas
12. **Integration tests pass** - External tool workflows validated via REST API

### AC-10.3: Scenario Library Completion (Story 10.3)
13. **Safety scenarios implemented** - shallow-water-alarm.yml, engine-temperature-alarm.yml, battery-drain-scenario.yml
14. **Performance scenarios implemented** - high-frequency-data.yml (1000+ msg/sec), malformed-data-stress.yml, multi-protocol-scenario.yml
15. **Autopilot scenarios enhanced** - autopilot-tack-sequence.yml, autopilot-failure-recovery.yml
16. **Scenario validation automated** - All scenarios pass YAML schema validation
17. **VS Code task integration** - Each scenario executable via standardized tasks

### AC-10.4: Documentation & Tooling (Story 10.4)  
18. **Single authoritative architecture document** - docs/architecture/nmea-simulator-architecture.md v2.0 published
19. **Conflicting documentation removed** - Old v1.0 documents deleted via Git
20. **VS Code tasks standardized** - 12+ scenario tasks with consistent naming convention
21. **GitHub Copilot instructions updated** - Task-first workflow emphasized
22. **API reference complete** - Simulator Control API fully documented

### AC-10.5: Test Coverage & Quality (Story 10.5)
23. **90%+ unit test coverage** achieved across all modular components  
24. **Integration tests operational** - Multi-protocol functionality validated
25. **Performance regression tests** - Automated validation of Epic 7 performance targets
26. **Scenario validation tests** - All YAML scenarios automatically tested
27. **CI/CD integration ready** - Docker and automated testing pipeline compatible

## Traceability Mapping

| Acceptance Criteria | Specification Section | Component/API | Test Strategy |
|-------------------|----------------------|---------------|---------------|
| **AC1: Tool Consolidation** | System Architecture Alignment | `nmea-bridge.js`, data sources | Integration testing of all three modes |
| **AC2: Modular Architecture** | Services and Modules | `lib/protocol-servers.js`, `lib/control-api.js` | Unit tests for each extracted component |
| **AC3: API Standardization** | APIs and Interfaces | Simulator Control API endpoints | API endpoint validation and documentation tests |  
| **AC4: Scenario Coverage** | Detailed Design | `scenarios/` directory, YAML validation | Scenario execution and validation testing |
| **AC5: Documentation Cleanup** | Dependencies and Integrations | VS Code tasks, GitHub Copilot instructions | Manual validation and documentation review |
| **AC6: Performance Preservation** | Non-Functional Requirements | All components | Performance regression testing and benchmarks |
| **AC7: Developer Experience** | Workflows and Sequencing | Task definitions, API responses | End-to-end workflow testing and usability validation |
| **AC-10.4.18** | Architecture Overview | Architecture v2.0 | N/A | Documentation review |
| **AC-10.4.20** | VS Code Tasks | Task standardization | N/A | Task validation |
## Risks, Assumptions, Open Questions

### Risks & Mitigations

**RISK-10.1: Tool Consolidation Breaking Changes** ✅ **[MITIGATED - Epic 10.1/10.2 Complete]**  
*Risk:* Unified tool breaks existing developer workflows and React Native integration  
*Impact:* High - Development team productivity and Epic 3 blocker  
*Mitigation:* ✅ **RESOLVED** - Modular extraction and API standardization completed successfully with no regressions

**RISK-10.2: Mode Switching Reliability**  
*Risk:* Unified architecture introduces instability when switching between live/file/scenario modes  
*Impact:* Medium - Intermittent testing failures and development friction  
*Mitigation:* Graceful degradation patterns, comprehensive mode transition testing, rollback capability to separate tools

**RISK-10.3: Performance Impact from Unification**  
*Risk:* Consolidated architecture introduces overhead compared to specialized tools  
*Impact:* Medium - Performance targets not met, testing infrastructure unreliable  
*Mitigation:* ✅ **VALIDATED** - Epic 10.1/10.2 maintained all performance characteristics; continue benchmarking during consolidation

**RISK-10.4: Documentation Consolidation Conflicts**  
*Risk:* Merging three tool documentation sets introduces inconsistencies or missing information  
*Impact:* Low - Developer confusion, slower onboarding  
*Mitigation:* Use architecture specification as single source of truth, explicit removal of conflicting documents

### Assumptions

**ASSUMPTION-10.1:** ✅ **VALIDATED** - Epic 10.1/10.2 modular components can be unified without architectural redesign  
**ASSUMPTION-10.2:** Existing scenario YAML files are compatible with unified tool architecture  
**ASSUMPTION-10.3:** VS Code task standardization doesn't require breaking changes to existing task configurations  
**ASSUMPTION-10.4:** External tools (React Native app, BMAD agents) can adopt unified CLI interface without major changes

### Open Questions

**QUESTION-10.1:** Should multi-parameter evolution engine (Story 10.6) be implemented in parallel or deferred to separate epic?  
*Status:* **DEFERRED** - Architecture specification designates Story 10.6 as separate implementation track  

**QUESTION-10.2:** How should legacy recording files be handled during tool consolidation?  
*Recommendation:* Maintain backward compatibility for existing recording playback functionality  
**ASSUMPTION-10.3:** Node.js 20.19.5 LTS provides stable foundation for production deployment  
**ASSUMPTION-10.4:** Current 1896-line monolithic architecture contains separable concerns suitable for modularization  
**ASSUMPTION-10.5:** REST API on port 9090 won't conflict with existing development infrastructure



## Test Strategy Summary

### Test Pyramid Structure

## Test Strategy Summary

### Testing Approach

**Epic 10 Testing Strategy builds upon Epic 10.1/10.2 validation:**
- ✅ **Component Testing:** Unit tests for modular components validated during Epic 10.1 extraction
- ✅ **API Testing:** Simulator Control API endpoints validated during Epic 10.2 standardization  
- **Integration Testing:** Tool consolidation requires comprehensive mode transition and workflow testing
- **Performance Testing:** Regression validation to ensure consolidated tool maintains all performance targets

### Test Coverage Framework

**Unit Tests (90%+ target for critical components):**
- **Data Source Components:** `lib/data-sources/` with mocked hardware/file/scenario inputs
- **Protocol Servers:** Network connection handling, message broadcasting, client management
- **API Routes:** REST endpoint validation, request/response schemas, error handling
- **CLI Interface:** Mode parsing, argument validation, configuration loading
- **Utility Functions:** NMEA validation, checksum calculation, timing algorithms

**Integration Tests (Complete workflow coverage):**
- **Mode Transition Testing:** Live → File → Scenario mode switching with data continuity
- **Multi-Protocol Validation:** Concurrent TCP/UDP/WebSocket connections across all modes
- **API Workflow Testing:** Complete scenario execution via REST endpoints from external tools
- **VS Code Task Integration:** Task execution validation for all scenario types
- **React Native Compatibility:** Existing app integration with unified tool interface

**Performance Regression Tests:**
- **Load Testing:** 500+ msg/sec sustained across all operational modes
- **Memory Profiling:** <100MB RAM usage validation during mode transitions
- **Connection Scaling:** 50+ concurrent client connections with no degradation
- **API Response Times:** <50ms for all Simulator Control API endpoints

**Consolidation-Specific Testing:**
- **Legacy Compatibility:** All existing Epic 7 functionality preserved and validated
- **Configuration Migration:** Scenario files and settings work across all modes
- **Documentation Validation:** Instructions and examples execute successfully
- **Rollback Testing:** Ability to revert to separate tools if issues arise
- **Component Interaction:** Message flow between protocol servers and generators
- **Backward Compatibility:** Epic 7 functionality preservation validation

**End-to-End Tests (10% coverage target):**
- **Full Simulator Lifecycle:** Startup → scenario load → client connections → shutdown
- **Performance Validation:** Epic 7 performance targets under modular architecture
- **Cross-Platform Integration:** Web, iOS, Android client compatibility
- **Scenario Library Validation:** All documented scenarios execute successfully

### Test Automation Framework

**Continuous Integration:**
- **Pre-commit:** ESLint, TypeScript compilation, fast unit tests
- **PR Validation:** Full test suite, performance benchmarks, coverage reports
- **Post-merge:** Extended integration tests, scenario validation
- **Nightly:** Performance regression testing, memory leak detection

**Test Infrastructure:**
```javascript
// Test Organization
test/
├── unit/lib/                    # Component unit tests
├── integration/api/             # REST API integration tests  
├── performance/                 # Performance and load tests
├── scenarios/                   # Scenario validation tests
└── fixtures/                    # Test data and mock scenarios
```

**Performance Testing:**
- **Load Testing:** 1000+ NMEA messages/second sustained validation
- **Memory Profiling:** <100MB RAM usage verification across extended runs
- **Connection Scaling:** 50+ simultaneous client connection validation
- **Latency Measurement:** <1ms message dispatch timing validation