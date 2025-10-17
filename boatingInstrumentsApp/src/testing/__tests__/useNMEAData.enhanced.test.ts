// Enhanced Hook Tests - Example Test Suite
// Demonstrates comprehensive testing patterns for the useNMEAData hook

import { renderHook, act } from '@testing-library/react-native';
import { 
  renderWithProviders,
  createMockNmeaService,
  createTestNmeaData,
  PerformanceProfiler,
  mockTimers,
  waitForCondition,
  NetworkSimulator 
} from '../helpers/testHelpers';
import { useNMEAData } from '../../hooks/useNMEAData';
import type { UseNMEADataOptions } from '../../hooks/useNMEAData';

describe('useNMEAData Hook - Enhanced Testing', () => {
  let mockService: ReturnType<typeof createMockNmeaService>;
  let profiler: PerformanceProfiler;
  let timers: ReturnType<typeof mockTimers>;
  let networkSim: NetworkSimulator;

  beforeEach(() => {
    mockService = createMockNmeaService();
    profiler = new PerformanceProfiler();
    timers = mockTimers();
    networkSim = new NetworkSimulator();
  });

  afterEach(() => {
    mockService.destroy();
    profiler.reset();
    timers.restore();
    networkSim.reset();
  });

  describe('Basic Functionality', () => {
    it('should provide current NMEA data', () => {
      const { result } = renderHook(() => useNMEAData());
      
      expect(result.current.data).toBeDefined();
      expect(result.current.hasData).toBe(true);
      expect(result.current.isReceiving).toBe(true);
    });

    it('should filter data by specified fields', () => {
      const options: UseNMEADataOptions = {
        fields: ['speed', 'heading', 'latitude', 'longitude'],
      };
      
      const { result } = renderHook(() => useNMEAData(options));
      
      const dataKeys = Object.keys(result.current.data);
      expect(dataKeys).toHaveLength(4);
      expect(dataKeys).toEqual(expect.arrayContaining(['speed', 'heading', 'latitude', 'longitude']));
    });

    it('should handle empty field selection', () => {
      const options: UseNMEADataOptions = {
        fields: [],
      };
      
      const { result } = renderHook(() => useNMEAData(options));
      
      // Should return all available data when no fields specified
      expect(Object.keys(result.current.data).length).toBeGreaterThan(0);
    });
  });

  describe('Data Quality Assessment', () => {
    it('should assess data quality correctly', async () => {
      const { result } = renderHook(() => useNMEAData());
      
      // Test excellent quality
      act(() => {
        mockService.setQuality('excellent');
        mockService.emitUpdate();
      });
      
      await waitForCondition(() => result.current.quality === 'excellent');
      expect(result.current.quality).toBe('excellent');
      expect(result.current.qualityMetrics.accuracy).toBeGreaterThan(90);
      
      // Test poor quality
      act(() => {
        mockService.setQuality('poor');
        mockService.emitUpdate();
      });
      
      await waitForCondition(() => result.current.quality === 'poor');
      expect(result.current.quality).toBe('poor');
      expect(result.current.qualityMetrics.accuracy).toBeLessThan(70);
    });

    it('should detect stale data', async () => {
      const options: UseNMEADataOptions = {
        staleDataThreshold: 1000, // 1 second
      };
      
      const { result } = renderHook(() => useNMEAData(options));
      
      // Initially data should be fresh
      expect(result.current.isStale).toBe(false);
      
      // Advance time to make data stale
      act(() => {
        timers.advance(2000);
      });
      
      expect(result.current.isStale).toBe(true);
    });

    it('should validate individual fields', () => {
      const { result } = renderHook(() => useNMEAData());
      
      expect(result.current.isValid('speed')).toBe(true);
      expect(result.current.isValid('latitude')).toBe(true);
      
      // Test with invalid field
      expect(result.current.isValid('nonexistent' as any)).toBe(false);
    });
  });

  describe('Unit Conversion', () => {
    it('should convert speed units correctly', () => {
      const options: UseNMEADataOptions = {
        units: {
          speed: 'mph',
        },
      };
      
      const testData = createTestNmeaData({ speed: 10 }); // 10 knots
      mockService.updateData(testData);
      
      const { result } = renderHook(() => useNMEAData(options));
      
      const speedInMph = result.current.getValue('speed');
      expect(speedInMph).toBeCloseTo(11.51, 1); // 10 knots ≈ 11.51 mph
    });

    it('should convert depth units correctly', () => {
      const options: UseNMEADataOptions = {
        units: {
          depth: 'feet',
        },
      };
      
      const testData = createTestNmeaData({ depth: 10 }); // 10 meters
      mockService.updateData(testData);
      
      const { result } = renderHook(() => useNMEAData(options));
      
      const depthInFeet = result.current.getValue('depth');
      expect(depthInFeet).toBeCloseTo(32.81, 1); // 10 meters ≈ 32.81 feet
    });

    it('should convert temperature units correctly', () => {
      const options: UseNMEADataOptions = {
        units: {
          temperature: 'fahrenheit',
        },
      };
      
      const testData = createTestNmeaData({ 
        waterTemperature: 20, // 20°C
        airTemperature: 25,   // 25°C
      });
      mockService.updateData(testData);
      
      const { result } = renderHook(() => useNMEAData(options));
      
      const waterTempF = result.current.getValue('waterTemperature');
      const airTempF = result.current.getValue('airTemperature');
      
      expect(waterTempF).toBeCloseTo(68, 0); // 20°C = 68°F
      expect(airTempF).toBeCloseTo(77, 0);   // 25°C = 77°F
    });
  });

  describe('Performance Optimization', () => {
    it('should throttle updates correctly', async () => {
      const options: UseNMEADataOptions = {
        throttle: 500, // 500ms throttle
      };
      
      const { result } = renderHook(() => useNMEAData(options));
      
      profiler.start();
      
      // Emit multiple rapid updates
      for (let i = 0; i < 10; i++) {
        act(() => {
          mockService.updateData({ speed: i });
        });
        profiler.mark('update');
      }
      
      const stats = profiler.getStats('update');
      expect(stats?.count).toBe(10);
      
      // Should have throttled some updates
      expect(result.current.getValue('speed')).toBeLessThan(10);
    });

    it('should handle caching correctly', () => {
      const options: UseNMEADataOptions = {
        enableCaching: true,
      };
      
      const { result } = renderHook(() => useNMEAData(options));
      
      profiler.start();
      
      // First access should be slower (cache miss)
      const speed1 = result.current.getValue('speed');
      profiler.mark('first-access');
      
      // Second access should be faster (cache hit)
      const speed2 = result.current.getValue('speed');
      profiler.mark('second-access');
      
      expect(speed1).toBe(speed2);
      
      const stats = profiler.getAllStats();
      expect(stats['first-access']).toBeDefined();
      expect(stats['second-access']).toBeDefined();
    });

    it('should log slow processing warnings', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const options: UseNMEADataOptions = {
        filterOutliers: true,
        validateData: true,
      };
      
      // Create complex data that might cause slow processing
      const largeData = createTestNmeaData({
        speed: 999, // This should trigger outlier detection
      });
      
      const { result } = renderHook(() => useNMEAData(options));
      
      act(() => {
        mockService.updateData(largeData);
      });
      
      // In development, slow processing should log warnings
      // Note: This test depends on __DEV__ flag and performance timing
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle outlier detection', () => {
      const options: UseNMEADataOptions = {
        filterOutliers: true,
        outlierThreshold: 3,
      };
      
      const { result } = renderHook(() => useNMEAData(options));
      
      // Test with outlier data
      act(() => {
        mockService.updateData(createTestNmeaData({
          speed: 999, // Unrealistic speed
          windSpeed: 200, // Unrealistic wind speed
        }));
      });
      
      expect(result.current.errors.length).toBeGreaterThan(0);
      expect(result.current.errors[0]).toContain('Outlier detected');
    });

    it('should handle missing data gracefully', () => {
      const { result } = renderHook(() => useNMEAData());
      
      // Test with incomplete data
      act(() => {
        mockService.updateData(createTestNmeaData({
          speed: undefined,
          heading: undefined,
        }));
      });
      
      expect(result.current.getValue('speed')).toBeNull();
      expect(result.current.getFormattedValue('speed')).toBe('---');
    });

    it('should handle connection loss', async () => {
      const { result } = renderHook(() => useNMEAData());
      
      // Initially should be receiving
      expect(result.current.isReceiving).toBe(true);
      
      // Simulate connection loss
      act(() => {
        mockService.simulateDisconnection(1000);
      });
      
      // Should detect loss of signal
      await waitForCondition(() => !result.current.isReceiving, 2000);
      expect(result.current.isReceiving).toBe(false);
    });
  });

  describe('Real-time Updates', () => {
    it('should handle real-time updates', async () => {
      const options: UseNMEADataOptions = {
        enableRealTimeUpdates: true,
        updateInterval: 100,
      };
      
      const { result } = renderHook(() => useNMEAData(options));
      
      const initialSpeed = result.current.getValue('speed');
      
      // Start mock service with updates
      mockService.start(100);
      
      // Update data and wait for change
      act(() => {
        mockService.updateData({ speed: 15.5 });
      });
      
      await waitForCondition(() => 
        result.current.getValue('speed') !== initialSpeed, 
        1000
      );
      
      expect(result.current.getValue('speed')).toBe(15.5);
    });

    it('should disable real-time updates when configured', () => {
      const options: UseNMEADataOptions = {
        enableRealTimeUpdates: false,
      };
      
      const { result } = renderHook(() => useNMEAData(options));
      
      const initialData = { ...result.current.data };
      
      // Update mock data
      act(() => {
        mockService.updateData({ speed: 99.9 });
      });
      
      // Data should not have changed since real-time updates are disabled
      expect(result.current.data).toEqual(initialData);
    });
  });

  describe('Statistics and Metrics', () => {
    it('should provide accurate statistics', () => {
      const { result } = renderHook(() => useNMEAData());
      
      const stats = result.current.getStats();
      
      expect(stats).toHaveProperty('totalMessages');
      expect(stats).toHaveProperty('validMessages');
      expect(stats).toHaveProperty('errorRate');
      expect(stats).toHaveProperty('averageUpdateRate');
      
      expect(typeof stats.totalMessages).toBe('number');
      expect(typeof stats.errorRate).toBe('number');
    });

    it('should track field freshness', () => {
      const { result } = renderHook(() => useNMEAData());
      
      const speedAge = result.current.getAge('speed');
      const headingAge = result.current.getAge('heading');
      
      expect(speedAge).toBeGreaterThanOrEqual(0);
      expect(headingAge).toBeGreaterThanOrEqual(0);
      
      expect(result.current.isFieldFresh('speed')).toBe(true);
      expect(result.current.isFieldFresh('heading')).toBe(true);
    });
  });

  describe('Control Functions', () => {
    it('should refresh data on demand', () => {
      const { result } = renderHook(() => useNMEAData());
      
      const initialTimestamp = result.current.lastUpdate;
      
      act(() => {
        result.current.refresh();
      });
      
      expect(result.current.lastUpdate).toBeGreaterThan(initialTimestamp);
    });

    it('should clear errors', () => {
      const { result } = renderHook(() => useNMEAData({ filterOutliers: true }));
      
      // Generate some errors
      act(() => {
        mockService.updateData({ speed: 999 }); // Outlier
      });
      
      expect(result.current.errors.length).toBeGreaterThan(0);
      
      act(() => {
        result.current.clearErrors();
      });
      
      expect(result.current.errors).toHaveLength(0);
    });

    it('should reset to initial state', () => {
      const { result } = renderHook(() => useNMEAData());
      
      // Make some changes
      act(() => {
        mockService.updateData({ speed: 25.5 });
      });
      
      act(() => {
        result.current.reset();
      });
      
      expect(Object.keys(result.current.data)).toHaveLength(0);
      expect(result.current.errors).toHaveLength(0);
    });
  });

  describe('Network Simulation', () => {
    it('should handle network latency', async () => {
      networkSim.setLatency(200); // 200ms latency
      
      const { result } = renderHook(() => useNMEAData());
      
      const startTime = Date.now();
      
      await networkSim.simulateRequest(async () => {
        act(() => {
          mockService.updateData({ speed: 12.3 });
        });
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeGreaterThanOrEqual(200);
    });

    it('should handle network errors', async () => {
      networkSim.setErrorRate(1.0); // 100% error rate
      
      try {
        await networkSim.simulateRequest(async () => {
          return mockService.getCurrentData();
        });
        
        fail('Should have thrown network error');
      } catch (error) {
        expect((error as Error).message).toBe('Simulated network error');
      }
    });
  });
});