# Testing Infrastructure Documentation

## Overview

This document describes the comprehensive testing infrastructure for the BMad Autopilot React Native application. The testing framework is designed to support domain-separated architecture with specialized utilities for marine instrument testing.

## Structure

```
src/testing/
├── index.ts                 # Main exports and utilities
├── fixtures/               # Test data fixtures
│   └── nmeaFixtures.ts     # NMEA data samples and generators
├── mocks/                  # Mock services and implementations
│   ├── mockNmeaService.ts  # Mock NMEA data service
│   └── mockWidgetService.ts # Mock widget management service
├── helpers/                # Test utilities and helpers
│   └── testHelpers.ts      # Core testing utilities
└── __tests__/              # Example test suites
    └── useNMEAData.enhanced.test.ts # Comprehensive hook testing
```

## Core Features

### 1. NMEA Data Testing

#### Fixtures
Comprehensive NMEA data fixtures for all marine instrument types:
- GPS navigation data
- Wind measurements
- Engine telemetry
- Environmental sensors
- Autopilot status
- Emergency scenarios

```typescript
import { sampleNmeaData, createTestNmeaData, generateTimeSeriesData } from '@testing/fixtures/nmeaFixtures';

// Basic usage
const testData = createTestNmeaData({
  speed: 15.5,
  heading: 275.0
});

// Time series for performance testing
const series = generateTimeSeriesData(sampleNmeaData, 100, 1000);
```

#### Mock Service
Controllable NMEA data service for testing:
- Real-time data simulation
- Data quality control
- Connection simulation
- Anomaly injection

```typescript
import { createMockNmeaService } from '@testing/mocks/mockNmeaService';

const mockService = createMockNmeaService();

// Start real-time updates
mockService.start(1000); // 1 second interval

// Simulate data quality changes
mockService.setQuality('poor');

// Simulate connection issues
mockService.simulateDisconnection(5000);

// Inject anomalies
mockService.simulateAnomaly('speed', 999, 2000);
```

### 2. Enhanced Rendering

#### Provider Wrapper
Enhanced render function with NMEA data context:

```typescript
import { renderWithProviders } from '@testing/helpers/testHelpers';

const { result, mockNmeaService } = renderWithProviders(
  <MyComponent />,
  {
    nmeaData: { speed: 12.5, heading: 180 }
  }
);

// Update data during test
result.updateNmeaData({ speed: 15.0 });
```

### 3. Performance Testing

#### Performance Profiler
Track rendering performance and identify bottlenecks:

```typescript
import { PerformanceProfiler } from '@testing/helpers/testHelpers';

const profiler = new PerformanceProfiler();

profiler.start();
// ... perform operations
profiler.mark('operation-complete');

const stats = profiler.getStats('operation-complete');
expect(stats.avg).toBeLessThan(16); // 60fps threshold
```

#### Memory Monitoring
Monitor memory usage to detect leaks:

```typescript
import { measureMemoryUsage } from '@testing/helpers/testHelpers';

const before = measureMemoryUsage();
// ... perform memory-intensive operations
const after = measureMemoryUsage();

const increase = after.heapUsed - before.heapUsed;
expect(increase).toBeLessThan(50); // 50MB threshold
```

### 4. Network Simulation

#### Network Conditions
Simulate various network conditions:

```typescript
import { NetworkSimulator } from '@testing/helpers/testHelpers';

const networkSim = new NetworkSimulator();

// Add latency
networkSim.setLatency(200);

// Simulate packet loss
networkSim.setErrorRate(0.1);

// Test with simulated conditions
await networkSim.simulateRequest(() => {
  return fetchNmeaData();
});
```

### 5. Time Control

#### Mock Timers
Control time flow in tests:

```typescript
import { mockTimers } from '@testing/helpers/testHelpers';

const timers = mockTimers();

// Advance time
timers.advance(5000);

// Run all pending timers
timers.runAll();

// Cleanup
timers.restore();
```

## Testing Patterns

### 1. Hook Testing

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useNMEAData } from '../hooks/useNMEAData';

describe('useNMEAData', () => {
  it('should provide real-time data', async () => {
    const { result } = renderHook(() => useNMEAData());
    
    expect(result.current.isReceiving).toBe(true);
    expect(result.current.hasData).toBe(true);
  });
});
```

### 2. Component Testing

```typescript
import { renderWithProviders } from '@testing/helpers/testHelpers';
import { SpeedWidget } from '../components/SpeedWidget';

describe('SpeedWidget', () => {
  it('should display speed data', () => {
    const { getByTestId } = renderWithProviders(
      <SpeedWidget />,
      { nmeaData: { speed: 15.5 } }
    );
    
    expect(getByTestId('speed-value')).toHaveTextContent('15.5');
  });
});
```

### 3. Integration Testing

```typescript
import { testSetup } from '@testing';

describe('NMEA Integration', () => {
  beforeAll(() => {
    testSetup.setupIntegrationTest();
  });
  
  afterAll(() => {
    testSetup.cleanupTestEnvironment();
  });
  
  it('should handle end-to-end data flow', () => {
    // Integration test implementation
  });
});
```

## Configuration

### Jest Configuration

The testing infrastructure extends the Jest configuration with:

- Module path mapping for `@testing/*` imports
- Coverage thresholds for critical modules
- Test environment setup
- Mock cleanup automation

### Performance Thresholds

Default performance expectations:
- Render time: <16ms (60fps)
- Memory increase: <50MB per operation
- Data staleness: <5000ms for critical data

### Quality Thresholds

Data quality assessment criteria:
- **Excellent**: >95% accuracy, >90% completeness, <1s freshness
- **Good**: >85% accuracy, >75% completeness, <3s freshness
- **Fair**: >70% accuracy, >50% completeness, <5s freshness
- **Poor**: >50% accuracy, >25% completeness, <10s freshness

## Best Practices

### 1. Test Organization

- Group tests by feature domain (navigation, engine, etc.)
- Use descriptive test names that explain the scenario
- Include both positive and negative test cases
- Test edge cases and error conditions

### 2. Data Management

- Use fixtures for consistent test data
- Generate random data for stress testing
- Test with both complete and incomplete data sets
- Validate data quality in tests

### 3. Performance Testing

- Include performance assertions in unit tests
- Use profiler for identifying bottlenecks
- Test with realistic data volumes
- Monitor memory usage patterns

### 4. Error Testing

- Test error boundaries and recovery
- Simulate network failures
- Test with invalid or corrupted data
- Verify graceful degradation

## Utilities Reference

### Test Assertions

Pre-built assertions for common scenarios:

```typescript
import { testAssertions } from '@testing';

// Data quality
testAssertions.expectGoodDataQuality(qualityMetrics);

// Performance
testAssertions.expectFastRender(renderTime);

// Data validation
testAssertions.expectValidCoordinates(lat, lon);
testAssertions.expectValidSpeed(speed);
```

### Domain-Specific Utilities

Specialized utilities for different marine domains:

```typescript
import { 
  navigationTestUtils,
  engineTestUtils,
  environmentTestUtils,
  autopilotTestUtils 
} from '@testing';

// Create domain-specific test data
const gpsData = navigationTestUtils.createGpsData(37.7749, -122.4194);
const engineData = engineTestUtils.createEngineData(2500, 85);
const windData = environmentTestUtils.createWindData(15, 180);
const autopilotData = autopilotTestUtils.createActiveState(275);
```

## Migration Guide

### From Basic Jest to Enhanced Testing

1. **Update imports**: Replace direct imports with `@testing/*` paths
2. **Use enhanced render**: Replace `render()` with `renderWithProviders()`
3. **Add performance checks**: Include render time and memory assertions
4. **Use mock services**: Replace manual mocking with provided mock services
5. **Add data quality tests**: Verify data quality metrics in tests

### Example Migration

Before:
```typescript
import { render } from '@testing-library/react-native';

const { getByTestId } = render(<SpeedWidget />);
```

After:
```typescript
import { renderWithProviders } from '@testing/helpers/testHelpers';

const { getByTestId, mockNmeaService } = renderWithProviders(
  <SpeedWidget />,
  { nmeaData: { speed: 15.5 } }
);
```

## Troubleshooting

### Common Issues

1. **Mock Service Not Updating**: Ensure `act()` wrapper around service calls
2. **Performance Tests Failing**: Check that __DEV__ flag is set correctly
3. **Network Tests Inconsistent**: Use deterministic network simulation
4. **Memory Tests Flaky**: Run garbage collection before measurements

### Debug Mode

Enable debug logging for test infrastructure:

```typescript
process.env.TEST_DEBUG = 'true';
```

This will provide detailed logging of:
- Mock service operations
- Performance measurements
- Network simulation events
- Data quality calculations

## Contributing

When adding new testing utilities:

1. Follow the established patterns for mocks and fixtures
2. Include comprehensive documentation and examples
3. Add performance and quality assertions
4. Ensure TypeScript types are properly defined
5. Update this documentation with new features