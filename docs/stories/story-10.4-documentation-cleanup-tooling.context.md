<story-context id="story-10.4-documentation-cleanup-tooling" v="1.0">
  <metadata>
    <epicId>10</epicId>
    <storyId>10.4</storyId>
    <title>Documentation Cleanup & Tooling</title>
    <status>Drafted</status>
    <generatedAt>2025-10-27</generatedAt>
    <generator>BMAD Story Context Workflow</generator>
    <sourceStoryPath>docs/stories/story-10.4-documentation-cleanup-tooling.md</sourceStoryPath>
  </metadata>

  <story>
    <asA>developer using the NMEA Bridge Simulator</asA>
    <iWant>unified, conflict-free documentation and standardized development tooling</iWant>
    <soThat>I can quickly understand and use the consolidated tool without confusion or outdated information</soThat>
    <tasks>5 main tasks with 25 detailed subtasks covering documentation consolidation, VS Code task standardization, GitHub Copilot updates, architecture cleanup, and API documentation audit</tasks>
  </story>

  <acceptanceCriteria>
    <criterion id="AC1">Documentation Consolidation - Resolve README conflicts and create unified documentation</criterion>
    <criterion id="AC2">VS Code Task Standardization - Update all tasks for unified CLI interface</criterion>
    <criterion id="AC3">GitHub Copilot Instructions Update - Reflect unified CLI patterns and task-first workflow</criterion>
    <criterion id="AC4">Architecture Documentation Cleanup - Ensure single authoritative documentation source</criterion>
    <criterion id="AC5">API Documentation Completeness - Validate Simulator Control API documentation</criterion>
  </acceptanceCriteria>

  <artifacts>
    <docs>
      <doc>
        <path>boatingInstrumentsApp/server/README.md</path>
        <title>NMEA WebSocket Bridge Server</title>
        <section>Live Mode and File Playbook Documentation</section>
        <snippet>Documents legacy separate tools (nmea-websocket-bridge-enhanced.js) that need to be updated for unified CLI interface. Contains usage examples that need consolidation.</snippet>
      </doc>
      <doc>
        <path>boatingInstrumentsApp/server/README-SIMULATOR.md</path>
        <title>NMEA Bridge Simulator - Usage Guide</title>
        <section>Comprehensive Simulator Documentation</section>
        <snippet>Complete documentation for simulator tool including startup output, scenarios, autopilot commands, and API reference. Needs consolidation with README.md.</snippet>
      </doc>
      <doc>
        <path>docs/nmea-bridge-simulator-architecture.md</path>
        <title>NMEA Bridge Simulator Architecture</title>
        <section>Single Authoritative Architecture Document</section>
        <snippet>Comprehensive architecture specification including high-level design, component organization, and development integration patterns. Represents the single source of truth for architecture.</snippet>
      </doc>
      <doc>
        <path>.github/copilot-instructions.md</path>
        <title>GitHub Copilot Instructions - BMad Autopilot</title>
        <section>VS Code Tasks and Simulator Control API</section>
        <snippet>Contains current task definitions and API references that need updating for unified CLI. Documents task-first workflow patterns and Simulator Control API naming.</snippet>
      </doc>
      <doc>
        <path>docs/testing-strategy.md</path>
        <title>Testing Strategy for NMEA Marine Instrument Display</title>
        <section>Simulator Integration and Development Tools</section>
        <snippet>Documents testing tools integration including NMEA Bridge Simulator, VS Code tasks, and documentation standards that support the unified architecture.</snippet>
      </doc>
    </docs>
    <code>
      <artifact>
        <path>.vscode/tasks.json</path>
        <kind>configuration</kind>
        <symbol>VS Code task definitions</symbol>
        <lines>1-375</lines>
        <reason>Contains task definitions that need standardization for unified CLI interface. Currently uses unified nmea-bridge.js but task naming needs standardization.</reason>
      </artifact>
      <artifact>
        <path>boatingInstrumentsApp/server/nmea-bridge.js</path>
        <kind>main</kind>
        <symbol>Unified NMEA Bridge CLI entry point</symbol>
        <lines>1-400</lines>
        <reason>Main unified CLI tool that documentation needs to reference. Supports --live, --file, and --scenario modes.</reason>
      </artifact>
      <artifact>
        <path>boatingInstrumentsApp/server/lib/protocol-servers.js</path>
        <kind>service</kind>
        <symbol>Protocol server management</symbol>
        <lines>1-250</lines>
        <reason>Epic 10.1 modular component that documentation should reference for architecture alignment.</reason>
      </artifact>
      <artifact>
        <path>boatingInstrumentsApp/server/simulator-control-api.js</path>
        <kind>api</kind>
        <symbol>SimulatorControlAPI class</symbol>
        <lines>1-300</lines>
        <reason>Epic 10.2 API standardization result with "Simulator Control API" naming that documentation must reference consistently.</reason>
      </artifact>
      <artifact>
        <path>boatingInstrumentsApp/server/openapi.yaml</path>
        <kind>documentation</kind>
        <symbol>OpenAPI 3.0.3 specification</symbol>
        <lines>1-500</lines>
        <reason>Complete API specification that needs validation for completeness and accuracy in unified documentation.</reason>
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
    <constraint>Epic 10.1/10.2/10.3 Foundation: Must reference completed modular architecture and unified CLI interface without changing functionality</constraint>
    <constraint>Single Source of Truth: Create unified documentation that eliminates conflicts and provides single authoritative reference</constraint>
    <constraint>Backward Compatibility: All existing integration patterns must continue to work after documentation updates</constraint>
    <constraint>Task-First Workflow: VS Code task definitions must follow established naming conventions and support unified CLI interface</constraint>
    <constraint>API Consistency: All documentation must use "Simulator Control API" naming consistently and reference correct endpoints</constraint>
    <constraint>Developer Experience: Documentation updates must improve clarity and reduce confusion without changing underlying functionality</constraint>
  </constraints>
  <interfaces>
    <interface>
      <name>Unified CLI Interface</name>
      <kind>CLI</kind>
      <signature>node nmea-bridge.js --live <host> <port> | --file <path> [--rate] [--loop] | --scenario <name> [--loop] [--speed]</signature>
      <path>boatingInstrumentsApp/server/nmea-bridge.js</path>
    </interface>
    <interface>
      <name>Simulator Control API</name>
      <kind>REST API</kind>
      <signature>13 REST endpoints on port 9090 including /api/health, /api/scenarios/, /api/inject-data, /api/simulate-error</signature>
      <path>boatingInstrumentsApp/server/simulator-control-api.js</path>
    </interface>
    <interface>
      <name>VS Code Task Definition</name>
      <kind>configuration</kind>
      <signature>Task schema with standardized naming: "Start NMEA Bridge: <Mode> - <Description>"</signature>
      <path>.vscode/tasks.json</path>
    </interface>
    <interface>
      <name>Documentation Structure</name>
      <kind>markdown</kind>
      <signature>Unified README.md with sections for all three operational modes, usage examples, and API reference</signature>
      <path>boatingInstrumentsApp/server/README.md</path>
    </interface>
  </interfaces>
  <tests>
    <standards>Documentation testing using Jest framework with validation of CLI examples, API endpoint examples, and VS Code task execution. Manual testing of all documented workflows and integration patterns. Documentation review process to ensure single source of truth and no conflicting information.</standards>
    <locations>boatingInstrumentsApp/__tests__/, boatingInstrumentsApp/server/__tests__/, docs/testing-strategy.md validation procedures</locations>
    <ideas>
      <idea ac="AC1">Documentation consolidation tests - validate all CLI examples execute successfully, ensure no broken links or references</idea>
      <idea ac="AC2">VS Code task validation tests - automated testing of all task definitions with unified CLI interface</idea>
      <idea ac="AC3">GitHub Copilot instruction validation - verify all examples and patterns reference current architecture</idea>
      <idea ac="AC4">Architecture documentation consistency tests - validate single source of truth and no conflicting references</idea>
      <idea ac="AC5">API documentation completeness tests - validate all 13 endpoints documented with working examples</idea>
    </ideas>
  </tests>
</story-context>