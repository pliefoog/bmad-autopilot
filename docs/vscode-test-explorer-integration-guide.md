# VS Code Test Explorer Integration Guide

## Overview

This guide covers the enhanced VS Code Test Explorer integration implemented in **Story 11.7: VS Code Test Explorer Integration**. The integration provides professional test tooling with marine safety focus, real-time coverage visualization, simulator status monitoring, and performance threshold validation.

## Features

### 1. Professional Test Documentation Display (AC1)

**Enhanced Test Names**: Tests are displayed with marine domain icons and requirement traceability:
- 🧭 Navigation domain tests
- ⚙️ Engine system tests  
- 🌊 Environment monitoring tests
- 🎯 Autopilot control tests
- ⚠️ Safety-critical tests
- 📋 General tests

**Test Organization**: Automatic categorization by marine domain based on professional test documentation headers (PURPOSE, REQUIREMENT, METHOD).

**Requirement Traceability**: View requirement mappings directly in test results via `coverage/requirement-traceability.json`.

### 2. Real-Time Coverage Visualization (AC2)

**Marine Safety Thresholds**:
- **Widgets**: 85% minimum coverage (Marine UI components)
- **Services**: 80% minimum coverage (NMEA services & state management)  
- **Integration**: 90% minimum coverage (End-to-end marine workflows)
- **Safety-Critical**: 95% minimum coverage (Navigation, Autopilot, NMEA parsing)

**Real-Time Updates**: Coverage overlay updates with <100ms latency during test execution.

**Coverage Gaps**: Automatic identification of coverage gaps in navigation, engine, environment, and autopilot domains.

### 3. Simulator Connection Status (AC3)

**Auto-Discovery**: Automatic discovery of NMEA Bridge Simulator on ports [9090, 8080].

**Connection Health**: Real-time monitoring with retry attempt tracking and fallback mode indicators.

**Status Display**: Simulator connection status visible in VS Code Test Explorer with health indicators.

### 4. Performance Monitoring Integration (AC4)

**Threshold Violations**: Real-time warnings for:
- **Render Performance**: >16ms widget updates (60fps requirement)
- **Memory Usage**: >50MB increase per test operation
- **Data Latency**: >100ms NMEA sentence → widget update

**Performance Alerts**: Violations displayed as warnings in VS Code Test Explorer with actionable recommendations.

### 5. Development Workflow Enhancement (AC5)

**Test Execution Timing**: Bottleneck identification with tier-specific thresholds (unit: <50ms, integration: <2000ms, E2E: <30s).

**Domain-Based Organization**: Test suite organization by marine domains (navigation, engine, environment, autopilot).

**Quick Failure Analysis**: Stack trace navigation and failure context in VS Code Test Explorer.

## Usage

### Running Tests with Enhanced Integration

1. **Standard Test Execution**:
   ```bash
   npm test
   ```

2. **With Coverage Visualization**:
   ```bash
   npm test -- --coverage
   ```

3. **VS Code Test Explorer**: Use `Ctrl+Shift+P` → `Test: Run All Tests` or the Test Explorer panel.

### Viewing Results

**Test Results**: Enhanced results available in:
- VS Code Test Explorer panel
- `coverage/vscode-test-explorer.json`
- `coverage/requirement-traceability.json`

**Coverage Data**: Real-time coverage in:
- VS Code coverage gutters
- `coverage/vscode-coverage-overlay.json`  

**Simulator Status**: Connection status in:
- VS Code Test Explorer
- `coverage/simulator-status.json`
- `.vscode/simulator-status.json`

**Performance Warnings**: Threshold violations in:
- VS Code Test Explorer warnings
- `coverage/performance-warnings.json`
- `coverage/performance-summary.json`

### Professional Test Documentation

To leverage enhanced test display, include professional headers in test files:

```typescript
/**
 * PURPOSE: Validate autopilot heading control with marine safety requirements
 * REQUIREMENT: AC-3.2.1 - Autopilot Course Control Interface
 * METHOD: Mock NMEA autopilot messages with heading deviation testing
 * EXPECTED: Heading changes processed within 100ms with safety validation
 * ERROR CONDITIONS: Invalid heading values, connection failures, safety threshold violations
 */
describe('Autopilot Heading Control', () => {
  // Test implementation
});
```

## Configuration

### VS Code Settings

The following settings are automatically configured for optimal Test Explorer integration:

```json
{
  "jest.showCoverageOnLoad": true,
  "testing.openTesting": "openOnTestStart",
  "coverage-gutters.showLineCoverage": true,
  "testing.automaticallyOpenTestResults": "openOnTestStart"
}
```

### Jest Configuration

Enhanced reporters are automatically configured in `jest.config.js`:

- Professional Test Documentation Reporter
- Real-Time Marine Coverage Reporter
- Simulator Status Integration
- Performance Monitoring Integration

## Troubleshooting

### Simulator Connection Issues

If simulator connection fails:

1. **Check Simulator Status**: Look for connection warnings in Test Explorer
2. **Start Simulator**: Use VS Code task "Start NMEA Bridge: Scenario - Basic Navigation"
3. **Verify Ports**: Ensure ports 9090 or 8080 are available
4. **Fallback Mode**: Tests will run in mock mode if simulator unavailable

### Performance Warnings

If performance thresholds are exceeded:

1. **Review Warnings**: Check `coverage/performance-warnings.json`
2. **Follow Recommendations**: Apply suggested optimizations
3. **Monitor Trends**: Use performance summary for trend analysis
4. **Optimize Code**: Focus on marine widget rendering and NMEA processing

### Coverage Issues

If coverage thresholds not met:

1. **Review Gaps**: Check `coverage/vscode-coverage-overlay.json`
2. **Focus on Safety-Critical**: Prioritize navigation, autopilot, NMEA domains
3. **Add Tests**: Target specific coverage gaps identified
4. **Monitor Real-Time**: Use coverage gutters for immediate feedback

## Integration with Epic 11

This VS Code Test Explorer integration builds on the Epic 11 Professional-Grade Testing Architecture:

- **Story 11.1**: Triple Testing Strategy Implementation (PerformanceProfiler)
- **Story 11.3**: Automatic Simulator Discovery (SimulatorTestClient)
- **Story 11.4**: Professional Test Documentation Standards
- **Story 11.5**: Marine Domain Validation Standards
- **Story 11.6**: Coverage and Performance Thresholds

## Marine Safety Focus

The integration emphasizes marine safety through:

- **Safety-Critical Coverage**: 95% minimum for navigation, autopilot, NMEA parsing
- **Performance Thresholds**: Marine-specific latency and responsiveness requirements
- **Domain Organization**: Clear separation of navigation, engine, environment, autopilot concerns
- **Real-Time Monitoring**: Immediate feedback on safety-critical performance metrics

## Next Steps

1. **Run Test Suite**: Execute tests to see enhanced VS Code Test Explorer integration
2. **Review Results**: Examine professional test documentation display and coverage visualization
3. **Monitor Performance**: Use real-time performance monitoring for optimization
4. **Optimize Coverage**: Target identified gaps in marine safety domains
5. **Leverage Integration**: Use simulator status and performance data for continuous improvement

For additional support, refer to:
- [Epic 11 Professional-Grade Testing Architecture](../stories/epic-11-professional-grade-testing-architecture.md)
- [Testing Infrastructure Documentation](../TESTING.md)
- [Architecture Documentation](../architecture.md)