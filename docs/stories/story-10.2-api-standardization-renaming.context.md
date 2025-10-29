<story-context id="bmad/bmm/workflows/4-implementation/story-context/template" v="1.0">
  <metadata>
    <epicId>10</epicId>
    <storyId>10.2</storyId>
    <title>API Standardization & Renaming</title>
    <status>Draft</status>
    <generatedAt>2025-01-21</generatedAt>
    <generator>BMAD Story Context Workflow</generator>
    <sourceStoryPath>docs/stories/story-10.2-api-standardization-renaming.md</sourceStoryPath>
  </metadata>

  <story>
    <asA>developer using the NMEA Bridge Simulator API</asA>
    <iWant>clear, standardized API naming and complete endpoint coverage</iWant>
    <soThat>I can integrate external tools and execute documented workflows without confusion or missing functionality</soThat>
    <tasks>
      <task id="T1" ac="1">API Naming Update - Update documentation, code comments, VS Code tasks with consistent "Simulator Control API" naming</task>
      <task id="T2" ac="2,4">Implement Missing Endpoints - Add inject-data, simulate-error, clients/connected, session save/load endpoints</task>
      <task id="T3" ac="3">Complete API Documentation - Generate OpenAPI spec with examples and integration workflows</task>
      <task id="T4" ac="4">External Integration Testing - Test scenario management, data injection, error simulation, session management workflows</task>
      <task id="T5" ac="5">Backward Compatibility Validation - Run existing Epic 7 API tests and validate client integration</task>
      <task id="T6" ac="6">Error Handling Standardization - Implement consistent response format and HTTP status codes</task>
    </tasks>
  </story>

  <acceptanceCriteria>
    <criterion id="AC1">Update all references from "BMAD Agent Integration API" to "Simulator Control API" across codebase</criterion>
    <criterion id="AC2">Implement missing API endpoints: inject-data, simulate-error, clients/connected, session save/load</criterion>
    <criterion id="AC3">Complete OpenAPI documentation with request/response examples and integration workflows</criterion>
    <criterion id="AC4">Validate external tools can execute full documented workflows via API</criterion>
    <criterion id="AC5">Preserve existing API functionality with zero regression and maintained performance</criterion>
    <criterion id="AC6">Implement consistent error handling with standardized response format and HTTP status codes</criterion>
  </acceptanceCriteria>

  <artifacts>
    <docs>
      <doc path="docs/tech-spec-epic-10.md" title="Epic 10 Technical Specification" section="API Standardization" snippet="API naming standardization from BMAD Agent Integration API to Simulator Control API with complete endpoint coverage." />
      <doc path="docs/stories/epic-10-nmea-simulator-modernization.md" title="Epic 10 Story Breakdown" section="Story 10.2" snippet="API standardization and renaming requirements with missing endpoint implementation for external tool integration." />
      <doc path="docs/stories/story-7.3-bmad-agent-integration-testing.md" title="Story 7.3 BMAD Integration" section="REST API Specification" snippet="Complete REST API specification with endpoint definitions and agent integration patterns." />
      <doc path="docs/nmea-bridge-simulator-architecture.md" title="NMEA Bridge Simulator Architecture" section="Simulator API & Control Interface" snippet="RESTful API interface design with scenario management, real-time control, and session management endpoints." />
      <doc path="boatingInstrumentsApp/server/README-SIMULATOR.md" title="Simulator Usage Guide" section="API Integration" snippet="Current API documentation and usage examples requiring standardization and completion." />
    </docs>
    
    <code>
      <artifact path="boatingInstrumentsApp/server/simulator-control-api.js" kind="api-server" symbol="SimulatorControlAPI" lines="1-800" reason="Primary API implementation requiring naming standardization and missing endpoint completion" />
      <artifact path="boatingInstrumentsApp/server/nmea-bridge-simulator.js" kind="main-simulator" symbol="NMEABridgeSimulator" lines="1850-1896" reason="API integration point and naming references requiring updates" />
      <artifact path="boatingInstrumentsApp/server/test-simulator-control-api.sh" kind="api-test" symbol="test script" lines="1-100" reason="Existing API test suite demonstrating current endpoints and validation patterns" />
      <artifact path="docs/stories/story-7.3-bmad-agent-integration-testing.md" kind="api-spec" symbol="REST API specification" lines="177-220" reason="Comprehensive API endpoint specifications and integration patterns" />
      <artifact path=".github/copilot-instructions.md" kind="documentation" symbol="development guidance" lines="1-50" reason="GitHub Copilot instructions requiring API naming consistency updates" />
    </code>
    
    <dependencies>
      <node>
        <express version="^5.1.0" />
        <cors version="^2.8.5" />
        <js-yaml version="^4.1.0" />
      </node>
      <api-documentation>
        <swagger-ui-express version="latest" />
        <openapi-generator-cli version="latest" />
      </api-documentation>
      <testing>
        <supertest version="latest" />
        <jest version="^29.7.0" />
      </testing>
    </dependencies>
  </artifacts>

  <constraints>
    <constraint type="naming-consistency">All API references must use "Simulator Control API" consistently across documentation, code comments, logs, and error messages</constraint>
    <constraint type="backward-compatibility">Zero regression - all existing API endpoints must remain functional with identical behavior</constraint>
    <constraint type="performance">Maintain sub-5ms API response times for all endpoints</constraint>
    <constraint type="rest-conventions">Follow RESTful design principles with proper HTTP methods, status codes, and resource naming</constraint>
    <constraint type="error-handling">Standardized JSON error response format across all endpoints with appropriate HTTP status codes</constraint>
    <constraint type="documentation-completeness">Complete OpenAPI specification with examples for every endpoint and common workflow patterns</constraint>
  </constraints>
  
  <interfaces>
    <interface name="POST /api/inject-data" kind="REST endpoint" signature="POST /api/inject-data { messageType: string, data: object, frequency?: number } → { success: boolean, injectionId: string }" path="boatingInstrumentsApp/server/simulator-control-api.js#inject-data" />
    <interface name="POST /api/simulate-error" kind="REST endpoint" signature="POST /api/simulate-error { errorType: string, severity: string, duration?: number } → { success: boolean, errorId: string }" path="boatingInstrumentsApp/server/simulator-control-api.js#simulate-error" />
    <interface name="GET /api/clients/connected" kind="REST endpoint" signature="GET /api/clients/connected → { clients: [{ id: string, protocol: string, connected_at: string }] }" path="boatingInstrumentsApp/server/simulator-control-api.js#clients-connected" />
    <interface name="POST /api/session/save" kind="REST endpoint" signature="POST /api/session/save { sessionName: string, includeState?: boolean } → { success: boolean, sessionId: string, saved_at: string }" path="boatingInstrumentsApp/server/simulator-control-api.js#session-save" />
    <interface name="POST /api/session/load" kind="REST endpoint" signature="POST /api/session/load { sessionId: string } → { success: boolean, session: object, loaded_at: string }" path="boatingInstrumentsApp/server/simulator-control-api.js#session-load" />
    <interface name="StandardErrorResponse" kind="data-structure" signature="{ success: false, error: string, code: string, timestamp: string, details?: object }" path="API error handling standardization" />
  </interfaces>
  
  <tests>
    <standards>Supertest for API endpoint testing with Express.js. Jest framework for comprehensive API validation. Integration testing with external tool workflow validation. Response time performance testing (sub-5ms requirement). OpenAPI specification validation.</standards>
    <locations>__tests__/api/ directory for API-specific tests (to be created), boatingInstrumentsApp/server/test-simulator-control-api.sh for shell-based integration testing, __tests__/integration/ for workflow validation tests</locations>
    <ideas>
      <test ac="AC1">API naming consistency tests - verify all references use "Simulator Control API" in responses, logs, and documentation</test>
      <test ac="AC2">Missing endpoint implementation tests - validate inject-data, simulate-error, clients/connected, session save/load endpoints</test>
      <test ac="AC3">OpenAPI documentation tests - validate specification completeness and example accuracy</test>
      <test ac="AC4">External tool integration tests - simulate full workflow execution via API calls</test>
      <test ac="AC5">Backward compatibility tests - run existing Epic 7 API test suite without modification</test>
      <test ac="AC6">Error handling standardization tests - validate consistent error response format and HTTP status codes</test>
    </ideas>
  </tests>
</story-context>