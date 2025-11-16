# Technical Specification: v2.3 Completion & Technical Debt Resolution

Date: October 31, 2025
Author: Pieter
Epic ID: 12
Status: Draft

---

## Overview

Epic 12 addresses the final technical integration gaps preventing completion of the v2.3 UI Architecture handoff. Building on the successfully implemented Epic 9 Enhanced Presentation System, this epic systematically resolves remaining integration issues through focused stories that verify and complete component integration, test suite reliability, and performance baseline documentation. The epic serves as a controlled technical debt resolution phase that ensures all v2.3 foundation components are properly integrated and validated before proceeding to VIP Platform development (Epic 8.7).

## Objectives and Scope

**In Scope:**
- AlarmBanner component integration into main UI layout hierarchy (App.tsx/Dashboard.tsx)
- AutopilotControlScreen modal and footer verification and testing
- Settings dialog integration verification (AlarmConfig, UnitsConfig)
- mDNS auto-discovery implementation status investigation and completion
- Test suite stabilization addressing import path issues and test failures
- Performance baseline metrics recording and documentation
- V2.3-COMPLETION-HANDOFF.md checklist verification and sign-off

**Out of Scope:**
- New feature development or architectural changes
- VIP Platform implementation (deferred to Epic 8.7)
- Major refactoring of existing working components
- Enhancement of existing functionality beyond integration completion
- Advanced autopilot features beyond basic control verification

## System Architecture Alignment

This epic operates within the established layered architecture defined in the Architecture document, focusing primarily on the Presentation Layer integration completion. Work aligns with the domain-separated service layer from Epic 6 and leverages the Enhanced Presentation System from Epic 9. The epic ensures proper integration between the Business Logic Layer (NMEA Data Store, Alarm Manager) and Presentation Layer (Dashboard Layout Manager, Settings Screens) without modifying the underlying Data Access Layer (NMEA Connection Manager) which is already stable. All work maintains compatibility with the established React Native + Zustand architecture and the comprehensive testing infrastructure from Epic 11.

## Detailed Design

### Services and Modules

| Module | Responsibility | Input/Output | Owner |
|--------|---------------|-------------|-------|
| **AlarmBanner.tsx** | Display active alarms at screen top | Input: Alarm[] / Output: Visual banner | UI Layer |
| **AutopilotControlScreen.tsx** | Full-screen autopilot controls modal | Input: visible, onClose / Output: Autopilot commands | Widget Layer |
| **LayoutService.ts** | Dashboard layout persistence and management | Input: WidgetLayout[] / Output: Saved layouts | Business Logic |
| **NotificationIntegrationService.ts** | Connect alarms with notification system | Input: Alarm events / Output: Notifications | Integration Layer |
| **mDNS Discovery Module** | Auto-discover NMEA WiFi bridges | Input: Network scan / Output: Bridge endpoints | Data Layer |
| **UnitsConfigDialog.tsx** | Settings UI for unit preferences | Input: Settings state / Output: Updated preferences | UI Layer |
| **Test Infrastructure** | Ensure reliable test execution | Input: Test suites / Output: Coverage reports | Development Layer |

### Data Models and Contracts

```typescript
// AlarmBanner integration contract
interface AlarmBannerProps {
  alarms: Alarm[];
}

interface Alarm {
  id: string;
  level: 'warning' | 'critical' | 'info';
  message: string;
  timestamp: string;
}

// AutopilotControlScreen contract
interface AutopilotControlScreenProps {
  visible: boolean;
  onClose: () => void;
}

// Layout integration models
interface WidgetLayout {
  id: string;
  type: string;
  layout: { x: number; y: number; width: number; height: number };
  visible: boolean;
  order: number;
}

// Settings contracts
interface UnitsConfig {
  depth: 'ft' | 'm';
  speed: 'kts' | 'mph' | 'kmh';
  temperature: 'F' | 'C';
}

// mDNS discovery models
interface BridgeDiscovery {
  ip: string;
  port: number;
  name: string;
  type: 'nmea0183' | 'nmea2000';
}
```

### APIs and Interfaces

**AlarmBanner Integration API:**
- `renderAlarmBanner(alarms: Alarm[]): React.Component` - Render alarm banner at top of layout
- `getActiveAlarms(): Alarm[]` - Retrieve current active alarms from store

**AutopilotControlScreen API:**
- `openAutopilotModal(): void` - Display full-screen autopilot controls
- `closeAutopilotModal(): void` - Close autopilot modal and return to dashboard
- `executeAutopilotCommand(command: AutopilotCommand): Promise<boolean>` - Send command to autopilot

**Settings Integration API:**
- `openUnitsDialog(): void` - Display units configuration dialog
- `saveUnitsConfig(config: UnitsConfig): Promise<void>` - Persist unit preferences
- `getUnitsConfig(): UnitsConfig` - Retrieve current unit settings

**mDNS Discovery API:**
- `startBridgeDiscovery(): Promise<BridgeDiscovery[]>` - Scan for NMEA WiFi bridges
- `connectToBridge(bridge: BridgeDiscovery): Promise<boolean>` - Establish connection

**Test Integration API:**
- `validateComponent(component: string): TestResult` - Verify component functionality
- `measurePerformance(scenario: string): PerformanceMetrics` - Record performance data

### Workflows and Sequencing

**Story 12.1: AlarmBanner Integration Workflow**
1. Identify AlarmBanner component location (src/widgets/AlarmBanner.tsx)
2. Determine main layout container (App.tsx or DashboardScreen.tsx)
3. Insert AlarmBanner at top of layout hierarchy with proper z-index
4. Test alarm triggering from store → banner display
5. Verify theme system compatibility (day/night/red-night modes)

**Story 12.2: AutopilotControlScreen Verification Workflow**
1. Test modal visibility toggle functionality
2. Verify footer AutopilotFooter component integration
3. Test full-screen autopilot command interface
4. Validate safety confirmation dialogs
5. Ensure proper modal closing and return to dashboard

**Story 12.3: Settings Integration Workflow**
1. Test UnitsConfigDialog accessibility and functionality
2. Verify AlarmConfigurationManager UI integration
3. Test settings persistence and immediate propagation
4. Validate enhanced presentation system compatibility

**Story 12.4: mDNS Auto-Discovery Workflow**
1. Investigate current implementation status
2. Implement or complete mDNS bridge discovery service
3. Test network scanning and bridge detection
4. Integrate with connection management system

**Story 12.5: Test Suite Stabilization Workflow**
1. Analyze import path failures (src/core → src/store migration)
2. Update test mocks for new architecture
3. Fix failing tests and achieve >60% coverage
4. Validate performance thresholds in CI

**Story 12.6: Performance Documentation Workflow**
1. Record baseline metrics for all core widgets
2. Document render performance benchmarks
3. Capture memory usage patterns
4. Generate performance regression testing data

## Non-Functional Requirements

### Performance

**Integration Performance Targets:**
- AlarmBanner render time: <16ms (avoid main thread blocking)
- AutopilotControlScreen modal open/close: <200ms
- Settings dialog load time: <100ms
- mDNS discovery scan completion: <5 seconds
- Test suite execution time: <120 seconds for full suite

**Baseline Metrics Requirements:**
- Widget render performance: Document current 95th percentile render times
- Memory usage patterns: Record baseline heap usage for each widget type
- Connection latency: Measure NMEA bridge connection establishment time
- Performance regression detection: Establish thresholds for CI monitoring

### Security

**Integration Security Requirements:**
- AlarmBanner: No sensitive data exposure in alarm messages displayed on screen
- AutopilotControlScreen: Safety confirmation dialogs for all critical commands
- Settings persistence: Secure storage of configuration data using AsyncStorage encryption
- mDNS discovery: Validate bridge authenticity and prevent malicious endpoint connection
- Test isolation: Ensure test environment cannot access production network resources

### Reliability/Availability

**Integration Reliability Standards:**
- AlarmBanner: Must handle null/empty alarm arrays gracefully without crashes
- AutopilotControlScreen: Fallback behavior when autopilot connection unavailable
- Settings: Graceful degradation when storage operations fail (use defaults)
- mDNS discovery: Timeout and retry mechanisms for network scanning
- Test stability: >95% test pass rate in CI environment across all platforms

**Error Handling:**
- Component-level error boundaries to prevent cascade failures
- Connection resilience during network interruptions
- Graceful fallback to cached settings when persistence fails

### Observability

**Integration Monitoring Requirements:**
- AlarmBanner: Log alarm render events and display metrics
- AutopilotControlScreen: Track modal usage patterns and command success rates
- Settings: Monitor configuration change frequency and persistence success
- mDNS discovery: Log bridge discovery attempts, success/failure rates, and connection timing
- Performance: Real-time render performance monitoring with Flipper integration

**Required Logging Signals:**
- Component integration success/failure events
- Performance threshold violations (>16ms renders)
- Network discovery and connection events
- Test execution metrics and coverage data
- Error boundaries activation and recovery

## Dependencies and Integrations

**External Dependencies:**
- `react-native-tcp-socket: ^6.3.0` - TCP connectivity for NMEA bridges (mDNS integration)
- `@react-native-async-storage/async-storage: ^2.2.0` - Settings persistence 
- `react-native-sound: ^0.12.0` - Audio feedback for autopilot controls
- `@sentry/react-native: ~7.2.0` - Error tracking for integration failures

**Internal Architecture Dependencies:**
- **Epic 9: Enhanced Presentation System** - AlarmBanner must use presentation hooks
- **Zustand State Stores** - Settings integration requires store compatibility
- **Theme System** - All components must support day/night/red-night modes
- **NMEA Service Layer** - mDNS discovery integrates with connection management
- **Widget Store v2.0** - Layout persistence must work with current widget architecture

**Integration Points:**
- `src/store/alarmStore.ts` - AlarmBanner data source
- `src/store/settingsStore.ts` - Settings dialog persistence
- `src/services/autopilotService.ts` - AutopilotControlScreen command interface
- `src/services/connectionManager.ts` - mDNS bridge discovery integration
- `__tests__/**/*.test.ts` - Test infrastructure compatibility

**Platform Compatibility Requirements:**
- iOS/Android: Native modal presentation for AutopilotControlScreen
- Web: DOM-based alarm banner positioning with proper z-index
- Cross-platform: Consistent settings persistence across all platforms

## Acceptance Criteria (Authoritative)

**AC 1: AlarmBanner Integration Complete**
1.1. AlarmBanner renders at top of main layout hierarchy without z-index conflicts
1.2. Alarm triggering displays visual indicators correctly across all themes
1.3. Component handles null/empty alarm arrays gracefully
1.4. Integration maintains compatibility with day/night/red-night theme modes

**AC 2: AutopilotControlScreen Modal Verified**
2.1. Modal opens/closes properly from AutopilotFooter trigger
2.2. All P70-inspired controls are functional and responsive
2.3. Safety confirmations work correctly for large heading adjustments (>20°)
2.4. Modal presentation has no conflicts with underlying dashboard

**AC 3: Settings Integration Complete**
3.1. UnitsConfigDialog integrates properly with enhanced presentation system
3.2. AlarmConfigurationDialog UI component created and fully functional
3.3. Settings changes propagate immediately to all affected widgets
3.4. Settings accessible via hamburger menu without navigation issues

**AC 4: mDNS Auto-Discovery Implemented**
4.1. mDNS scanning discovers available NMEA WiFi bridges on network
4.2. Auto-discovery integrates with connection settings UI workflow
4.3. Discovered devices can be selected and connection established
4.4. Graceful error handling when no devices are discovered

**AC 5: Test Suite Stabilized**
5.1. All critical tests pass with zero failing test cases
5.2. Unit test coverage achieves >60% threshold requirement
5.3. Performance tests meet <16ms render time targets
5.4. Integration tests successfully connect to simulator environment

**AC 6: Performance Baseline Documented**
6.1. Baseline metrics recorded using React DevTools Profiler
6.2. Performance benchmarks documented for regression detection
6.3. Memory usage profiles established for all core widgets
6.4. Bundle size targets validated for iOS/Android/Web platforms

**AC 7: v2.3 Handoff Complete**
7.1. All V2.3-COMPLETION-HANDOFF.md checklist items verified
7.2. Manual testing completed successfully on all target platforms
7.3. Code cleanup completed (unused imports, TODOs, console statements)
7.4. Epic 8.7 VIP Platform development officially unblocked

## Traceability Mapping

| Acceptance Criteria | Tech Spec Section | Component/API | Test Strategy |
|-------------------|------------------|--------------|-------------|
| **AC 1.1-1.4: AlarmBanner Integration** | Detailed Design → AlarmBanner.tsx | AlarmBanner component, Layout integration | Visual rendering tests, Theme compatibility tests |
| **AC 2.1-2.4: AutopilotControlScreen Modal** | APIs → AutopilotControlScreen API | AutopilotControlScreen.tsx, Modal presentation | Modal interaction tests, Safety confirmation tests |
| **AC 3.1-3.4: Settings Integration** | APIs → Settings Integration API | UnitsConfigDialog.tsx, AlarmConfigurationDialog | Settings persistence tests, UI integration tests |
| **AC 4.1-4.4: mDNS Auto-Discovery** | APIs → mDNS Discovery API | mDNS service module, Connection manager | Network discovery tests, Connection workflow tests |
| **AC 5.1-5.4: Test Suite Stabilized** | Test Strategy → Test infrastructure | Jest configuration, Mock services | Test execution validation, Coverage reporting |
| **AC 6.1-6.4: Performance Baseline** | NFR Performance → Baseline metrics | Performance monitoring, Profiler integration | Performance benchmark tests, Memory profiling |
| **AC 7.1-7.4: v2.3 Handoff Complete** | Overview → Epic completion | V2.3-COMPLETION-HANDOFF.md checklist | Manual testing protocol, Handoff verification |

## Risks, Assumptions, Open Questions

**Risks:**
- **R1: Integration Breaking Existing Functionality** - Adding AlarmBanner to layout hierarchy could disrupt current widget positioning or cause render performance issues
- **R2: Test Infrastructure Complexity** - Import path issues may indicate deeper architectural migration problems requiring more extensive refactoring than planned
- **R3: mDNS Implementation Scope** - Network discovery functionality may require platform-specific native modules not currently available
- **R4: Performance Regression** - Integration work could introduce render performance degradation affecting user experience

**Assumptions:**
- **A1: Epic 9 Foundation Stable** - Enhanced Presentation System provides reliable foundation for integration work
- **A2: Current Components Functional** - Existing AlarmBanner and AutopilotControlScreen components work correctly in isolation
- **A3: Test Environment Accessible** - NMEA Bridge Simulator and test infrastructure remain functional throughout epic
- **A4: Platform Compatibility Maintained** - Integration changes will not break existing iOS/Android/Web platform support

**Open Questions:**
- **Q1: mDNS Library Selection** - Which React Native-compatible mDNS library should be used for network discovery implementation?
- **Q2: Performance Threshold Adjustment** - Should performance targets be adjusted based on current architecture capabilities or maintained as stretch goals?
- **Q3: Test Coverage Methodology** - How should coverage be calculated given the mixed unit/integration test architecture?
- **Q4: VIP Platform Dependencies** - Are there any undocumented Epic 8.7 requirements that should be addressed in this technical debt resolution?

## Test Strategy Summary

**Test Levels:**
- **Unit Tests:** Component integration validation, API contract verification, settings persistence testing
- **Integration Tests:** Full UI workflow testing, NMEA Bridge Simulator connectivity, cross-component data flow
- **Performance Tests:** Render timing validation, memory usage profiling, bundle size monitoring
- **Manual Tests:** Cross-platform verification, user workflow validation, theme system compatibility

**Test Framework Usage:**
- **Jest + React Native Testing Library:** Component render and interaction testing
- **NMEA Bridge Simulator:** Realistic data flow and connection testing
- **React DevTools Profiler:** Performance measurement and baseline establishment
- **VS Code Test Explorer:** Unified test execution and reporting

**Coverage Strategy:**
- **Critical Path Coverage:** Alarm display, autopilot control, settings persistence - 90%+ coverage
- **Integration Points:** Component communication, state management, service layer - 80%+ coverage
- **Overall Project:** Maintain >60% coverage threshold while prioritizing marine safety-critical code
- **Edge Cases:** Error conditions, network failures, malformed data handling

**Quality Gates:**
- All existing tests must continue passing (zero regressions)
- New integration points must have corresponding test coverage
- Performance tests must validate <16ms render time targets
- Manual testing must verify functionality across iOS/Android/Web platforms
- CI pipeline must successfully execute all test suites without failures