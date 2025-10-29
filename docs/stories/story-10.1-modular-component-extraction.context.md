<story-context id="bmad/bmm/workflows/4-implementation/story-context/template" v="1.0">
  <metadata>
    <epicId>10</epicId>
    <storyId>10.1</storyId>
    <title>Modular Component Extraction</title>
    <status>Draft</status>
    <generatedAt>2025-01-21</generatedAt>
    <generator>BMAD Story Context Workflow</generator>
    <sourceStoryPath>docs/stories/story-10.1-modular-component-extraction.md</sourceStoryPath>
  </metadata>

  <story>
    <asA>developer working with the NMEA Bridge Simulator</asA>
    <iWant>the monolithic 1896-line simulator refactored into focused, maintainable components</iWant>
    <soThat>the codebase becomes more maintainable, testable, and follows clean architecture principles while preserving all existing functionality</soThat>
    <tasks>
      <task id="T1" ac="1,2,5">Create Component Architecture - Design interface contracts, create lib/ structure, set up dependency injection</task>
      <task id="T2" ac="1,3">Extract Protocol Servers Component - Move TCP/UDP/WebSocket logic to lib/protocol-servers.js</task>
      <task id="T3" ac="1,3">Extract NMEA Generator Component - Move sentence generation to lib/nmea-generator.js</task>
      <task id="T4" ac="1,3">Extract Message Scheduler Component - Move timing control to lib/message-scheduler.js</task>
      <task id="T5" ac="1,3">Extract Session Recorder Component - Move recording playback to lib/session-recorder.js</task>
      <task id="T6" ac="2,5,6">Refactor Main Orchestrator - Reduce main file to ≤500 lines orchestration</task>
      <task id="T7" ac="3,4">Validation and Testing - Run test suite and performance regression testing</task>
    </tasks>
  </story>

  <acceptanceCriteria>
    <criterion id="AC1">Extract 4 core components from monolithic nmea-bridge-simulator.js with specific line limits</criterion>
    <criterion id="AC2">Reduce simulator-main.js to orchestration core (≤500 lines) with dependency injection</criterion>
    <criterion id="AC3">Preserve all existing Epic 7 functionality - multi-protocol support, scenarios, recording playback</criterion>
    <criterion id="AC4">Maintain Epic 7 performance characteristics - 500+ msg/sec, 50+ connections, &lt;100MB RAM</criterion>
    <criterion id="AC5">Define clear component interfaces with proper TypeScript types</criterion>
    <criterion id="AC6">Preserve existing error handling patterns and graceful shutdown behavior</criterion>
  </acceptanceCriteria>

  <artifacts>
    <docs>
      <doc path="docs/tech-spec-epic-10.md" title="Epic 10 Technical Specification" section="Services and Modules" snippet="Detailed component breakdown with line limits, responsibilities, and interface contracts for modular architecture transformation." />
      <doc path="docs/stories/epic-10-nmea-simulator-modernization.md" title="Epic 10 Story Breakdown" section="Story 10.1" snippet="Modular component extraction requirements with 4 core components and orchestration core reduction." />
      <doc path="docs/nmea-architecture.md" title="NMEA Processing Architecture" section="Component Specifications" snippet="Pure functional programming principles with clear separation of concerns across multiple components." />
      <doc path="docs/nmea-bridge-simulator-architecture.md" title="NMEA Bridge Simulator Architecture" section="Core Components" snippet="Simulator controller responsibilities and multi-protocol server management architecture." />
      <doc path="boatingInstrumentsApp/MODULAR-NMEA-ARCHITECTURE.md" title="Modular NMEA Architecture Implementation" section="New File Structure" snippet="Modular component organization with protocol-agnostic connections and pure parsing components." />
      <doc path="docs/stories/story-7.1-core-multi-protocol-simulator.md" title="Story 7.1 Implementation" section="Dev Agent Record" snippet="Original Epic 7 implementation creating 1896-line monolithic simulator with all functional requirements." />
    </docs>
    
    <code>
      <artifact path="boatingInstrumentsApp/server/nmea-bridge-simulator.js" kind="monolithic-simulator" symbol="NMEABridgeSimulator" lines="1-1896" reason="Primary target for modular refactoring - contains all components to be extracted" />
      <artifact path="boatingInstrumentsApp/server/README-SIMULATOR.md" kind="documentation" symbol="Usage Guide" lines="1-400" reason="Comprehensive simulator documentation showing functionality that must be preserved" />
      <artifact path="src/services/nmea/NmeaService.ts" kind="service-orchestrator" symbol="NmeaService" lines="1-200" reason="Example of clean orchestrator pattern for component coordination" />
      <artifact path="src/services/nmea/connection/PureConnectionManager.ts" kind="component" symbol="PureConnectionManager" lines="1-300" reason="Model for protocol-agnostic connection management component" />
      <artifact path="src/services/nmea/parsing/PureNmeaParser.ts" kind="component" symbol="PureNmeaParser" lines="1-400" reason="Example of pure parsing component with single responsibility" />
      <artifact path="__tests__/nmea-bridge-simulator-network.test.ts" kind="integration-test" symbol="network integration tests" lines="1-200" reason="Existing test suite that must continue to pass after refactoring" />
      <artifact path="vendor/test-scenarios/basic-navigation.yml" kind="scenario-config" symbol="YAML scenario" lines="1-50" reason="Scenario configuration format that components must support" />
    </code>
    
    <dependencies>
      <node>
        <express version="^5.1.0" />
        <js-yaml version="^4.1.0" />
        <cors version="^2.8.5" />
        <yaml version="^2.8.1" />
      </node>
      <testing>
        <jest version="^29.7.0" />
        <types-node version="^20.19.21" />
        <types-ws version="^8.18.1" />
        <types-js-yaml version="^4.0.9" />
      </testing>
    </dependencies>
  </artifacts>

  <constraints>
    <constraint type="performance">Maintain Epic 7 performance: 500+ msg/sec throughput, 50+ concurrent connections, &lt;100MB RAM usage, sub-5ms latency</constraint>
    <constraint type="compatibility">Zero regression - all existing Epic 7 functionality must remain intact including CLI arguments, VS Code tasks, and API endpoints</constraint>
    <constraint type="architecture">Follow component interface pattern with start(), stop(), getStatus(), getMetrics() methods for lifecycle management</constraint>
    <constraint type="line-limits">Strict line count limits: protocol-servers ≤300, nmea-generator ≤400, message-scheduler ≤200, session-recorder ≤300, main orchestrator ≤500</constraint>
    <constraint type="dependency-injection">Main orchestrator coordinates components via dependency injection rather than components accessing globals</constraint>
    <constraint type="external-contracts">Preserve all existing ports (TCP:2000, UDP:2000, WebSocket:8080, API:9090) and protocol interfaces</constraint>
  </constraints>
  
  <interfaces>
    <interface name="SimulatorComponent" kind="TypeScript interface" signature="interface SimulatorComponent { async start(config: SimulatorConfig): Promise&lt;void&gt;; async stop(): Promise&lt;void&gt;; getStatus(): ComponentStatus; getMetrics(): ComponentMetrics; }" path="docs/tech-spec-epic-10.md#component-interface-contract" />
    <interface name="NMEAMessage" kind="data-structure" signature="interface NMEAMessage { sentence: string; timestamp: Date; messageType: string; protocol: 'NMEA_0183' | 'NMEA_2000'; parsed?: object; }" path="docs/tech-spec-epic-10.md#data-models-and-contracts" />
    <interface name="SimulatorConfig" kind="configuration-schema" signature="interface SimulatorConfig { server: { ports: {tcp: 2000, udp: 2000, websocket: 8080, api: 9090}; maxClients: number; timeoutMs: number; }; nmea: {...}; scenarios: {...}; }" path="docs/tech-spec-epic-10.md#simulator-configuration-schema" />
    <interface name="TCP Server" kind="REST endpoint" signature="TCP server on port 2000 for NMEA 0183/2000 bridge mode communication" path="boatingInstrumentsApp/server/nmea-bridge-simulator.js#startTCPServer" />
    <interface name="WebSocket Server" kind="REST endpoint" signature="WebSocket server on port 8080 for web browser development support" path="boatingInstrumentsApp/server/nmea-bridge-simulator.js#startWebSocketServer" />
    <interface name="Simulator Control API" kind="REST endpoint" signature="HTTP API on port 9090 for external simulator control and monitoring" path="boatingInstrumentsApp/server/nmea-bridge-simulator.js#api" />
  </interfaces>
  
  <tests>
    <standards>Jest testing framework with React Native preset. Integration tests using real network connections. Performance regression testing with benchmarks for throughput, memory, and latency. Component unit testing for each extracted module with mock dependencies. Test coverage thresholds: 70% global, 80% for core services.</standards>
    <locations>__tests__/ directory for main test suite, src/testing/ for utility tests, server/__tests__/ for simulator-specific tests (to be created), vendor/test-scenarios/ for scenario configuration tests</locations>
    <ideas>
      <test ac="AC1">Component extraction tests - verify each lib/ component implements SimulatorComponent interface correctly</test>
      <test ac="AC2">Main orchestrator tests - verify simulator-main.js coordinates components without direct implementation logic</test>
      <test ac="AC3">Functionality preservation tests - run existing nmea-bridge-simulator-network.test.ts without modification</test>
      <test ac="AC4">Performance regression tests - benchmark message throughput, memory usage, and connection limits before/after</test>
      <test ac="AC5">Interface contract tests - validate TypeScript interfaces and component lifecycle methods</test>
      <test ac="AC6">Error handling tests - verify graceful shutdown and error recovery patterns preserved</test>
    </ideas>
  </tests>
</story-context>