# Boating Instruments App - Testing Strategy

## Overview

This document outlines the comprehensive testing strategy for the Boating Instruments App, ensuring we meet the PRD requirement of **≥70% test coverage** (NFR18) and **99.5% crash-free session rate** (NFR3).

---

## Test Pyramid

```
                    ▲
                   /E\         E2E Tests (Future)
                  /   \        - Real boat integration
                 /     \       - Full user workflows
                /───────\
               /    I    \     Integration Tests (~15%)
              /           \    - Multi-component workflows
             /             \   - Connection resilience
            /───────────────\  - Mode switching
           /                 \
          /        U          \ Unit Tests (~85%)
         /                     \ - Widgets, Services, Stores
        /                       \ - NMEA parsing, Utils
       /─────────────────────────\
```

**Distribution:**
- **85% Unit Tests:** Fast, isolated component testing
- **15% Integration Tests:** Multi-component interaction testing
- **Future E2E Tests:** Real boat validation (beta testing phase)

---

## Test Categories

### 1. Unit Tests

Test individual components, functions, and modules in isolation.

#### Widget Tests

**Coverage Target:** 75%+

**Files:**
```
__tests__/
├── DepthWidget.test.tsx
├── SpeedWidget.test.tsx
├── WindWidget.test.tsx
├── CompassWidget.test.tsx
├── AutopilotStatusWidget.test.tsx
├── RudderPositionWidget.test.tsx
├── GPSWidget.test.tsx
├── EngineWidget.test.tsx
├── BatteryWidget.test.tsx
├── TanksWidget.test.tsx
└── WaterTemperatureWidget.test.tsx
```

**What We Test:**
- Rendering with valid NMEA data
- Handling null/undefined data (display "--")
- Unit conversions (feet ↔ meters, knots ↔ mph, etc.)
- Stale data indicators (>5 seconds old)
- Theme support (Day/Night/Red-Night modes)
- Accessibility (touch targets, labels)

**Example Test:**
```typescript
describe('DepthWidget', () => {
  it('renders depth value correctly', () => {
    const { getByText } = render(<DepthWidget value={12.4} unit="ft" />);
    expect(getByText('12.4')).toBeTruthy();
    expect(getByText('ft')).toBeTruthy();
  });

  it('displays -- when value is null', () => {
    const { getByText } = render(<DepthWidget value={null} unit="ft" />);
    expect(getByText('--')).toBeTruthy();
  });

  it('converts meters to feet correctly', () => {
    const { getByText } = render(<DepthWidget value={10} unit="m" />);
    // 10m = 32.8ft
    expect(getByText('32.8')).toBeTruthy();
  });
});
```

**Run Widget Tests:**
```bash
npm test -- Widget.test.tsx
npm test -- DepthWidget.test.tsx
npm test -- AutopilotStatusWidget.test.tsx
```

#### Service Tests

**Coverage Target:** 80%+

**Files:**
```
__tests__/
├── services/
│   ├── nmeaParser.test.ts
│   ├── autopilotCommands.test.ts
│   ├── layoutService.test.ts
│   └── playbackService.test.ts
├── nmeaConnection.test.ts
├── nmea2000Connection.test.ts
└── WidgetRegistry.test.ts
```

**What We Test:**
- NMEA 0183 sentence parsing
- NMEA 2000 PGN decoding
- Autopilot command encoding (Raymarine EVO protocol)
- Widget layout persistence
- Playback mode functionality
- Connection state management

**Example Test:**
```typescript
describe('NMEAParser', () => {
  it('parses NMEA 0183 depth sentence', () => {
    const parser = new NMEAParser();
    const result = parser.parse('$SDDBT,12.4,f,3.8,M,2.1,F*3A');

    expect(result).toEqual({
      type: 'depth',
      value: 12.4,
      unit: 'feet',
      timestamp: expect.any(Number),
    });
  });

  it('validates NMEA checksum', () => {
    const parser = new NMEAParser();
    const result = parser.parse('$SDDBT,12.4,f*FF'); // Invalid checksum

    expect(result).toBeNull();
  });

  it('handles malformed sentences gracefully', () => {
    const parser = new NMEAParser();
    expect(() => parser.parse('garbage data')).not.toThrow();
  });
});
```

**Run Service Tests:**
```bash
npm test -- services/
npm test -- nmeaConnection.test.ts
npm test -- autopilotCommands.test.ts
```

#### Store Tests

**Coverage Target:** 80%+

**Files:**
```
__tests__/
├── nmeaStore.test.ts
├── themeStore.test.ts
└── layoutService.test.ts (covers widgetStore)
```

**What We Test:**
- State updates when NMEA data received
- Zustand store actions and selectors
- State persistence (layout, settings)
- Theme switching (Day/Night/Red-Night)
- Widget configuration changes

**Example Test:**
```typescript
describe('nmeaStore', () => {
  it('updates depth data correctly', () => {
    const store = useNMEAStore.getState();
    store.updateDepth(12.4, 'feet');

    expect(store.depth).toBe(12.4);
    expect(store.depthUnit).toBe('feet');
    expect(store.depthTimestamp).toBeLessThanOrEqual(Date.now());
  });

  it('resets all data on disconnect', () => {
    const store = useNMEAStore.getState();
    store.updateDepth(12.4, 'feet');
    store.updateSpeed(5.2, 4.8, 'knots');
    store.resetAllData();

    expect(store.depth).toBeNull();
    expect(store.speedOverGround).toBeNull();
  });
});
```

**Run Store Tests:**
```bash
npm test -- Store.test.ts
npm test -- nmeaStore.test.ts
```

#### Utility Tests

**Coverage Target:** 70%+

**Files:**
```
__tests__/utils/
├── unitConversion.test.ts
└── validation.test.ts
```

**What We Test:**
- Unit conversion functions
- IP address validation
- Number formatting
- Date/time formatting

**Run Utility Tests:**
```bash
npm test -- utils/
```

---

### 2. Integration Tests

Test multiple components working together and realistic workflows.

**Coverage Target:** Integration tests cover ~15% of codebase

**Files:**
```
__tests__/integration/
├── connectionResilience.test.ts    # Connection failure recovery
├── malformedStress.test.ts         # Malformed NMEA handling
├── playbackUi.test.tsx             # Playback mode UI integration
├── modeToggleWidgets.test.tsx      # Live ↔ Playback switching
├── mockServerValidation.test.ts    # End-to-end mock server test
└── autopilotControl.test.ts        # Autopilot command flow (future)
```

#### Connection Resilience Tests

**Purpose:** Verify app handles connection failures gracefully per FR1 requirements.

**Test Scenarios:**
- Initial connection timeout
- Connection drops during operation
- Auto-reconnection with exponential backoff
- Max retry limit reached
- WiFi bridge becomes unreachable

**Run Test:**
```bash
npm run test:integration:connection
```

**Example Test:**
```typescript
describe('Connection Resilience', () => {
  it('automatically reconnects after connection drop', async () => {
    const connection = new NMEAConnection('192.168.1.10', 10110);
    await connection.connect();

    // Simulate connection drop
    connection.socket.emit('close');

    // Wait for auto-reconnect attempt
    await waitFor(() => {
      expect(connection.status).toBe('connecting');
    }, { timeout: 2000 });

    // Mock successful reconnection
    connection.socket.emit('connect');

    expect(connection.status).toBe('connected');
    expect(connection.reconnectAttempts).toBeGreaterThan(0);
  });
});
```

#### Malformed Data Stress Tests

**Purpose:** Verify app handles corrupt/invalid NMEA data per NFR16 requirements.

**Test Scenarios:**
- Invalid checksums
- Truncated sentences
- Garbage data
- Missing delimiters
- Out-of-range values (e.g., depth = -1000)
- Mixed NMEA 0183/2000 format issues

**Run Test:**
```bash
npm run test:integration:malformed
```

**Example Test:**
```typescript
describe('Malformed NMEA Handling', () => {
  it('does not crash on corrupt data stream', () => {
    const parser = new NMEAParser();
    const malformedData = [
      'garbage',
      '$SDDBT,999999,f*FF',  // Invalid checksum
      '$GPGGA',              // Incomplete sentence
      '\x00\x01\x02',        // Binary junk
      '$SDDBT,12.4,f,3.8',   // Missing checksum
    ];

    malformedData.forEach(sentence => {
      expect(() => parser.parse(sentence)).not.toThrow();
    });

    // App should remain stable
    expect(parser.errorCount).toBeGreaterThan(0);
    expect(parser.validCount).toBe(0);
  });
});
```

#### Mode Toggle Tests

**Purpose:** Verify switching between Live and Playback modes per FR31/FR38 requirements.

**Test Scenarios:**
- Switch from live to playback
- Switch from playback to live
- Widgets update correctly after mode switch
- No stale data from previous mode
- Connection status indicator updates

**Run Test:**
```bash
npm test -- modeToggleWidgets.test.tsx
```

#### Playback UI Tests

**Purpose:** Verify playback mode UI and data flow per FR31 requirements.

**Test Scenarios:**
- Load NMEA file
- Start playback
- Pause playback
- Stop playback
- Widgets update during playback
- Playback controls work correctly

**Run Test:**
```bash
npm test -- playbackUi.test.tsx
```

#### Mock Server Validation

**Purpose:** End-to-end test of NMEA connection, parsing, and widget updates.

**Test Scenario:**
1. Start mock TCP server (port 10110)
2. App connects to mock server
3. Mock server streams NMEA sentences
4. App parses sentences
5. Widgets update with data
6. App disconnects cleanly

**Run Test:**
```bash
npm run dev:mock
```

---

### 3. Performance Tests

Verify app meets performance requirements per NFR4 and NFR10.

#### Throughput Test

**Requirement:** Handle 500 messages/second without performance degradation (NFR10)

**Test:**
```bash
npm run dev:bench -- vendor/sample-data/high_density.nmea 500 5
# Streams 500 msg/sec for 5 seconds

# Expected output:
# Messages parsed: 2500
# Parse errors: 0
# Average latency: <50ms
# Max latency: <200ms
# Memory usage: <100MB increase
```

#### Widget Update Latency Test

**Requirement:** Widget updates within 100ms of NMEA data changes (NFR4)

**Test:**
```typescript
describe('Widget Performance', () => {
  it('updates widget within 100ms of data change', async () => {
    const startTime = Date.now();

    // Update store
    useNMEAStore.getState().updateDepth(12.4, 'feet');

    // Wait for widget re-render
    await waitFor(() => {
      expect(screen.getByText('12.4')).toBeTruthy();
    });

    const latency = Date.now() - startTime;
    expect(latency).toBeLessThan(100);
  });
});
```

#### Battery Life Test (Manual)

**Requirement:** 8+ hours continuous use on mobile (NFR5)

**Test Procedure:**
1. Fully charge device
2. Connect to WiFi bridge (or playback mode)
3. Display dashboard with 10 widgets
4. Monitor battery percentage every 30 minutes
5. Record time until 10% battery remaining

**Expected Result:** ≥8 hours usage time

---

### 4. E2E Tests (Future - Beta Phase)

Real boat integration testing with physical hardware.

#### Beta Testing Checklist

**Month 6-7 Beta Phase:**

- [ ] Connect to Quark-Elec A032 WiFi bridge
- [ ] Connect to Actisense W2K-1 WiFi bridge
- [ ] Connect to third-party WiFi bridge
- [ ] Parse NMEA 0183 data from real boat
- [ ] Parse NMEA 2000 data from real boat
- [ ] Display all 10 widgets with live data
- [ ] Test autopilot heading adjustments (±1°, ±10°)
- [ ] Test autopilot mode switches
- [ ] Test Tack command with 5-second countdown
- [ ] Test Gybe command with 5-second countdown
- [ ] Trigger depth alarm (shallow water)
- [ ] Trigger wind shift alarm
- [ ] Trigger engine temperature alarm
- [ ] Test Night mode in overnight passage
- [ ] Test Red-Night mode in overnight passage
- [ ] Test connection drop and auto-reconnect
- [ ] Test app backgrounding and resume
- [ ] Test 8-hour battery life goal
- [ ] Document any crashes (target: 99.5% crash-free)

**Beta Success Criteria (NFR1, NFR2, NFR3):**
- 98%+ first-connection success rate
- 99%+ autopilot command success rate
- 99.5%+ crash-free session rate (sustained for 2 weeks)

---

## Test Execution Strategy

### Local Development

**Run before every commit:**
```bash
npm test
```

**Check coverage:**
```bash
npm test -- --coverage
# Target: ≥70% overall
# Core modules: ≥80%
```

### Continuous Integration (CI)

**Fast CI Checks (PR validation):**
```bash
npm run test:ci-fast
# Runs critical tests in <5 minutes
# - Playback tests
# - Mode toggle tests
# - Service tests
```

**Full CI Suite (pre-merge):**
```bash
npm test
npm run test:integration
# Runs all tests
# Time: 10-15 minutes
```

### Pre-Release Testing

**Before every release (Month 7 Launch):**

1. **Run full test suite:**
   ```bash
   npm test -- --coverage
   npm run test:integration
   ```

2. **Run performance benchmarks:**
   ```bash
   npm run dev:bench -- vendor/sample-data/high_density.nmea 500 5
   ```

3. **Manual testing:**
   - Test on physical iOS device
   - Test on physical Android device
   - Test all 10 widgets
   - Test autopilot control (if available)
   - Test playback mode
   - Test all three display modes (Day/Night/Red-Night)

4. **Beta tester validation:**
   - Deploy to 50 beta testers
   - Monitor crash reports (Sentry)
   - Review feedback
   - Verify success criteria met

---

## Coverage Goals

### Overall Target: ≥70% (NFR18)

**Breakdown by Module:**

| Module | Target | Priority | Notes |
|--------|--------|----------|-------|
| **NMEA Parsing** | 80%+ | CRITICAL | Core functionality, high complexity |
| **Widget Rendering** | 75%+ | HIGH | User-facing, many edge cases |
| **Autopilot Control** | 85%+ | CRITICAL | Safety-critical, highest risk |
| **Alarm Processing** | 80%+ | HIGH | Safety-critical, complex logic |
| **Connection Management** | 75%+ | HIGH | Reliability requirement |
| **State Management** | 70%+ | MEDIUM | Well-tested library (Zustand) |
| **UI Components** | 60%+ | MEDIUM | Visual testing via snapshots |
| **Utilities** | 70%+ | MEDIUM | Simple functions, high reuse |

**Current Coverage Status:**
```bash
# Check current coverage
npm test -- --coverage

# View detailed report
open coverage/lcov-report/index.html
```

---

## Test Data

### Sample NMEA Files

**Location:** `vendor/sample-data/`

**Available Files:**

1. **high_density.nmea** - Stress test data
   - 500+ messages/second
   - Mixed NMEA 0183/2000
   - Duration: 60 seconds
   - Use: Performance testing

2. **sailing_session.nmea** - Typical sailboat data
   - GPS, depth, wind, compass
   - Realistic update rates (1-10 Hz)
   - Duration: 5 minutes
   - Use: Widget testing

3. **motor_session.nmea** - Powerboat data
   - Dual engine data
   - Tank levels
   - Battery voltage
   - Duration: 3 minutes
   - Use: Engine widget testing

4. **autopilot_commands.nmea** - Autopilot test data
   - Raymarine EVO PGNs
   - Mode switches
   - Heading adjustments
   - Duration: 2 minutes
   - Use: Autopilot testing

**Creating Custom Test Data:**

```bash
# Record live NMEA data (future feature)
# Settings → Developer → Record NMEA → Start
# Perform boat operations
# Settings → Developer → Stop Recording
# File saved to: Documents/nmea_recordings/

# Or manually create NMEA file:
cat > custom_test.nmea << EOF
\$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47
\$SDDBT,12.4,f,3.8,M,2.1,F*3A
\$WIMWV,045,R,12.5,N,A*27
EOF
```

---

## Mocking Strategy

### Native Modules

All native modules are mocked in `__tests__/setup.ts`:

```typescript
// TCP Socket mock
jest.mock('react-native-tcp-socket', () => ({
  createConnection: jest.fn(() => ({
    on: jest.fn(),
    write: jest.fn(),
    destroy: jest.fn(),
    connect: jest.fn(),
  })),
}));

// UDP Socket mock
jest.mock('react-native-udp', () => ({
  createSocket: jest.fn(() => ({
    bind: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
  })),
}));

// AsyncStorage mock
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// File system mock
jest.mock('react-native-fs', () => ({
  readFile: jest.fn(() => Promise.resolve('')),
  writeFile: jest.fn(() => Promise.resolve()),
  exists: jest.fn(() => Promise.resolve(true)),
}));
```

### NMEA Data Mock

```typescript
export const mockNMEAData = {
  depth: {
    sentence: '$SDDBT,12.4,f,3.8,M,2.1,F*3A',
    parsed: { type: 'depth', value: 12.4, unit: 'feet' },
  },
  speed: {
    sentence: '$VWVHW,,,045,M,5.2,N,9.6,K*5A',
    parsed: { type: 'speed', stw: 5.2, unit: 'knots' },
  },
  wind: {
    sentence: '$WIMWV,045,R,12.5,N,A*27',
    parsed: { type: 'wind', angle: 45, speed: 12.5 },
  },
  // ... more mock data
};
```

---

## Debugging Tests

### Run Single Test
```bash
npm test -- DepthWidget.test.tsx
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Debug Test with Logs
```bash
npm test -- --verbose --no-coverage DepthWidget.test.tsx
```

### Debug Hanging Tests
```bash
# Run serially to identify which test hangs
npm test -- --runInBand
```

### Clear Jest Cache
```bash
npx jest --clearCache
```

---

## Test Maintenance

### Adding New Tests

**When adding a new feature:**

1. **Write tests first** (TDD approach)
2. **Ensure tests fail** before implementation
3. **Implement feature**
4. **Verify tests pass**
5. **Check coverage** increased appropriately

**Test file naming:**
```
src/widgets/DepthWidget.tsx
  → __tests__/DepthWidget.test.tsx

src/services/nmea/NMEAParser.ts
  → __tests__/services/nmeaParser.test.ts
```

### Updating Tests

**When modifying code:**

1. Run affected tests
2. Update test expectations if behavior changed intentionally
3. Add new test cases for new edge cases
4. Ensure coverage doesn't decrease

### Removing Dead Code

**When removing features:**

1. Remove corresponding test files
2. Update integration tests that referenced feature
3. Verify coverage target still met
4. Clean up mock data if applicable

---

## Quality Gates

### Pre-Commit
- [ ] All tests pass
- [ ] No linting errors
- [ ] Code formatted (Prettier)

### Pre-PR
- [ ] All tests pass (including integration)
- [ ] Coverage ≥70%
- [ ] No new console warnings
- [ ] Updated documentation if needed

### Pre-Release (Month 7 Launch)
- [ ] All tests pass (100% pass rate)
- [ ] Coverage ≥70% sustained
- [ ] No critical bugs in issue tracker
- [ ] Beta tester validation complete
- [ ] 99.5% crash-free rate (2 weeks sustained)
- [ ] Performance benchmarks pass
- [ ] Manual testing checklist complete

---

## Testing Tools Reference

### Jest
- **Purpose:** Test runner and assertion library
- **Docs:** [jestjs.io](https://jestjs.io/)
- **Config:** `jest.config.js`

### React Native Testing Library
- **Purpose:** Component testing utilities
- **Docs:** [callstack.github.io/react-native-testing-library](https://callstack.github.io/react-native-testing-library/)
- **Key APIs:** `render`, `fireEvent`, `waitFor`, `screen`

### @testing-library/jest-native
- **Purpose:** Custom Jest matchers for RN
- **Matchers:** `toBeVisible`, `toHaveTextContent`, `toBeDisabled`

---

## Continuous Improvement

### Monthly Review
- Review test coverage trends
- Identify untested edge cases
- Update test data with new scenarios
- Refactor slow/flaky tests

### Post-Beta Learnings
- Add tests for beta-discovered bugs
- Improve integration test coverage for real-world scenarios
- Create regression test suite for critical issues
- Update performance benchmarks based on beta data

---

**Document Version:** 1.0
**Last Updated:** 2025-10-12
**Coverage Target:** ≥70% (NFR18)
**Crash-Free Target:** 99.5% (NFR3)
