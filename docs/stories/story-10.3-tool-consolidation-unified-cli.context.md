<story-context id="story-10.3-tool-consolidation-unified-cli" v="1.0">
  <metadata>
    <epicId>10</epicId>
    <storyId>10.3</storyId>
    <title>Tool Consolidation & Unified CLI</title>
    <status>Draft</status>
    <generatedAt>2025-10-27</generatedAt>
    <generator>BMAD Story Context Workflow</generator>
    <sourceStoryPath>docs/stories/story-10.3-tool-consolidation-unified-cli.md</sourceStoryPath>
  </metadata>

  <story>
    <asA>marine development team member</asA>
    <iWant>a single unified NMEA bridge tool with mode-based operation (`--live`, `--file`, `--scenario`)</iWant>
    <soThat>I can access all NMEA testing functionality through one CLI interface without managing three separate tools</soThat>
    <tasks>5 main tasks with 25 detailed subtasks covering unified CLI creation, data source extraction, protocol server integration, VS Code task updates, and comprehensive testing</tasks>
  </story>

  <acceptanceCriteria>
    <criterion id="AC1">Unified Entry Point Implementation - Single nmea-bridge.js entry point with mode-based CLI operation</criterion>
    <criterion id="AC2">Data Source Abstraction Layer - Create lib/data-sources/ with live.js, file.js, scenario.js providers</criterion>
    <criterion id="AC3">Protocol Server Integration - Unified protocol layer serving all modes with Epic 10.1/10.2 components</criterion>
    <criterion id="AC4">VS Code Task Integration - Updated tasks for unified CLI with standardized naming</criterion>
  </acceptanceCriteria>

  <artifacts>
    <docs>
      <doc>
        <path>docs/tech-spec-epic-10.md</path>
        <title>Technical Specification: NMEA Bridge Simulator Architecture Modernization</title>
        <section>Detailed Design - Services and Modules</section>
        <snippet>Defines unified nmea-bridge.js entry point with mode routing, data source abstraction layer, and protocol server integration. Specifies maximum line counts: main entry (<300 lines), protocol servers (250), data sources (150 each).</snippet>
      </doc>
      <doc>
        <path>docs/architecture/nmea-simulator-architecture.md</path>
        <title>NMEA Bridge Unified Architecture</title>
        <section>Target Architecture - Tool Consolidation</section>
        <snippet>Comprehensive architecture specification for consolidating three tools into unified mode-based solution. Details component boundaries, file organization, and Epic 10.1/10.2 foundation work.</snippet>
      </doc>
      <doc>
        <path>docs/prd.md</path>
        <title>Boating Instruments App Product Requirements Document</title>
        <section>Epic 7: NMEA Bridge Simulator Testing Infrastructure</section>
        <snippet>Performance requirements: 50+ concurrent connections, 500+ NMEA sentences/second, <100MB RAM usage. Multi-protocol support and cross-platform compatibility validation.</snippet>
      </doc>
      <doc>
        <path>boatingInstrumentsApp/server/README-SIMULATOR.md</path>
        <title>NMEA Bridge Simulator - Usage Guide</title>
        <section>Command Line Options and Quick Start</section>
        <snippet>Current CLI interface: --scenario, --bridge-mode, --recording, --speed, --loop options. Startup output shows TCP/UDP:2000, WebSocket:8080, Control API:9090.</snippet>
      </doc>
    </docs>
    <code>
      <artifact>
        <path>boatingInstrumentsApp/server/nmea-bridge-simulator.js</path>
        <kind>simulator</kind>
        <symbol>NMEABridgeSimulator class, parseArguments function</symbol>
        <lines>1-1900</lines>
        <reason>Current monolithic simulator implementation to be consolidated. Contains CLI parsing, multi-protocol servers, and scenario engine to extract.</reason>
      </artifact>
      <artifact>
        <path>boatingInstrumentsApp/server/nmea-websocket-bridge-enhanced.js</path>
        <kind>bridge</kind>
        <symbol>Hardware connection logic</symbol>
        <lines>1-400</lines>
        <reason>Hardware bridge functionality to extract into lib/data-sources/live.js for TCP/UDP connection handling.</reason>
      </artifact>
      <artifact>
        <path>boatingInstrumentsApp/server/simulator-control-api.js</path>
        <kind>api</kind>
        <symbol>SimulatorControlAPI class</symbol>
        <lines>1-300</lines>
        <reason>REST API server (Epic 10.2) to integrate with unified tool. Port 9090 endpoints for external control.</reason>
      </artifact>
    </code>
    <dependencies>
      <node>
        <express>^5.1.0</express>
        <ws>^8.18.1</ws>
        <cors>^2.8.5</cors>
        <js-yaml>^4.1.0</js-yaml>
        <ajv>^8.17.1</ajv>
      </node>
      <nmea>
        <nmea-simple>^3.3.0</nmea-simple>
        <canboat-canboatjs>^3.11.0</canboat-canboatjs>
      </nmea>
      <development>
        <jest>^29.7.0</jest>
        <typescript>^5.8.3</typescript>
        <eslint>^8.57.1</eslint>
      </development>
    </dependencies>
  </artifacts>

  <constraints>
    <constraint>Epic 10.1/10.2 Foundation: Must integrate existing modular components (lib/protocol-servers.js, lib/control-api.js) without architectural changes</constraint>
    <constraint>Performance Preservation: Maintain 500+ msg/sec, <100MB RAM, 50+ connections across all three operational modes</constraint>
    <constraint>Backward Compatibility: All existing Epic 7 functionality must be preserved during consolidation</constraint>
    <constraint>File Size Limits: Main entry point <300 lines, protocol servers <250 lines, data sources <150 lines each per tech spec</constraint>
    <constraint>Mode Switching: <1 second transition between live/file/scenario modes with graceful degradation</constraint>
    <constraint>VS Code Integration: All existing tasks must work with unified CLI interface, maintain task-first workflow</constraint>
  </constraints>
  <interfaces>
    <interface>
      <name>DataSource Interface</name>
      <kind>interface</kind>
      <signature>interface DataSource { start(): Promise<void>; stop(): Promise<void>; getStatus(): SourceStatus; on(event: 'data' | 'error' | 'status', callback: Function): void; }</signature>
      <path>docs/tech-spec-epic-10.md</path>
    </interface>
    <interface>
      <name>SimulatorComponent Interface</name>
      <kind>interface</kind>
      <signature>interface SimulatorComponent { async start(config: SimulatorConfig): Promise<void>; async stop(): Promise<void>; getStatus(): ComponentStatus; getMetrics(): ComponentMetrics; }</signature>
      <path>boatingInstrumentsApp/server/lib/types.js</path>
    </interface>
    <interface>
      <name>Simulator Control API</name>
      <kind>REST API</kind>
      <signature>POST /api/mode/switch, GET /api/mode/status, POST /api/scenarios/start, GET /api/scenarios/status, GET /api/health, GET /api/metrics (port 9090)</signature>
      <path>boatingInstrumentsApp/server/simulator-control-api.js</path>
    </interface>
    <interface>
      <name>CLI Interface</name>
      <kind>CLI</kind>
      <signature>node nmea-bridge.js --live <host> <port> | --file <path> [--rate] [--loop] | --scenario <name> [--loop] [--speed]</signature>
      <path>docs/tech-spec-epic-10.md</path>
    </interface>
  </interfaces>
  <tests>
    <standards>Jest testing framework with TypeScript support. Integration tests in __tests__/ directories, unit tests co-located with components. Test coverage target 90%+ for critical components. Performance benchmarking with 500+ msg/sec validation. CI/CD integration with GitHub Actions workflows.</standards>
    <locations>boatingInstrumentsApp/__tests__/, boatingInstrumentsApp/src/**/__tests__/, __tests__/integration/, __tests__/services/</locations>
    <ideas>
      <idea ac="AC1">CLI interface unit tests - argument parsing, mode validation, help text generation, configuration loading</idea>
      <idea ac="AC2">Data source abstraction tests - interface compliance, live/file/scenario provider isolation, error handling</idea>
      <idea ac="AC3">Protocol server integration tests - multi-protocol functionality, API integration, performance validation</idea>
      <idea ac="AC4">VS Code task integration tests - task execution validation, CLI compatibility, workflow preservation</idea>
      <idea ac="All">End-to-end consolidation tests - mode transition testing, performance regression validation, backward compatibility</idea>
    </ideas>
  </tests>
</story-context>