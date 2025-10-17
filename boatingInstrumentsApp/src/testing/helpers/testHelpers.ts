// Test Helpers for React Native Testing
// Comprehensive utilities for testing components, hooks, and services

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import { createMockNmeaService } from '../mocks/mockNmeaService';
import { sampleNmeaData } from '../fixtures/nmeaFixtures';
import type { NmeaData } from '../../types';

// Extended render options for React Native Testing Library
export interface TestRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  nmeaData?: Partial<NmeaData>;
  initialProps?: Record<string, any>;
}

// Create a test wrapper with providers
export function createTestWrapper(options: TestRenderOptions = {}) {
  const { 
    nmeaData = sampleNmeaData,
  } = options;

  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(React.Fragment, null, children);
  };
}

// Enhanced render function with test utilities
export function renderWithProviders(
  ui: ReactElement,
  options: TestRenderOptions = {}
) {
  const { 
    nmeaData = sampleNmeaData,
    ...renderOptions 
  } = options;

  const Wrapper = createTestWrapper({ nmeaData });

  const renderResult = render(ui, {
    wrapper: Wrapper,
    ...renderOptions,
  });

  // Create mock NMEA service for testing
  const mockNmeaService = createMockNmeaService(nmeaData);

  return {
    ...renderResult,
    mockNmeaService,
    // Utility functions
    updateNmeaData: (updates: Partial<NmeaData>) => {
      mockNmeaService.updateData(updates);
    },
    simulateDataQualityChange: (quality: 'excellent' | 'good' | 'fair' | 'poor' | 'invalid') => {
      mockNmeaService.setQuality(quality);
    },
    simulateDisconnection: (duration = 5000) => {
      mockNmeaService.simulateDisconnection(duration);
    },
  };
}

// Wait for specific conditions in tests
export const waitForCondition = async (
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) return;
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
};

// Performance testing utilities
export class PerformanceProfiler {
  private startTime: number = 0;
  private measurements: Record<string, number[]> = {};

  start(): void {
    this.startTime = performance.now();
  }

  mark(label: string): void {
    const elapsed = performance.now() - this.startTime;
    
    if (!this.measurements[label]) {
      this.measurements[label] = [];
    }
    
    this.measurements[label].push(elapsed);
  }

  getStats(label: string): { avg: number; min: number; max: number; count: number } | null {
    const measurements = this.measurements[label];
    if (!measurements || measurements.length === 0) return null;

    const avg = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);

    return { avg, min, max, count: measurements.length };
  }

  reset(): void {
    this.measurements = {};
    this.startTime = 0;
  }

  getAllStats(): Record<string, ReturnType<PerformanceProfiler['getStats']>> {
    const stats: Record<string, ReturnType<PerformanceProfiler['getStats']>> = {};
    
    Object.keys(this.measurements).forEach(label => {
      stats[label] = this.getStats(label);
    });

    return stats;
  }
}

// Memory usage testing utilities
export function measureMemoryUsage(): {
  heapUsed: number;
  heapTotal: number;
  external: number;
} {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed / 1024 / 1024, // MB
      heapTotal: usage.heapTotal / 1024 / 1024, // MB
      external: usage.external / 1024 / 1024, // MB
    };
  }

  // Fallback for environments without process.memoryUsage
  return {
    heapUsed: 0,
    heapTotal: 0,
    external: 0,
  };
}

// Mock timers utilities
export function mockTimers() {
  jest.useFakeTimers();
  
  return {
    advance: (ms: number) => jest.advanceTimersByTime(ms),
    runAll: () => jest.runAllTimers(),
    runPending: () => jest.runOnlyPendingTimers(),
    restore: () => jest.useRealTimers(),
  };
}

// Network simulation utilities
export class NetworkSimulator {
  private isOnline = true;
  private latency = 0;
  private errorRate = 0;

  setOnline(online: boolean): void {
    this.isOnline = online;
  }

  setLatency(ms: number): void {
    this.latency = ms;
  }

  setErrorRate(rate: number): void {
    this.errorRate = Math.max(0, Math.min(1, rate));
  }

  async simulateRequest<T>(
    request: () => Promise<T>,
    options: { timeout?: number } = {}
  ): Promise<T> {
    const { timeout = 5000 } = options;

    // Check if offline
    if (!this.isOnline) {
      throw new Error('Network offline');
    }

    // Simulate error rate
    if (Math.random() < this.errorRate) {
      throw new Error('Simulated network error');
    }

    // Add latency
    if (this.latency > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latency));
    }

    // Execute request with timeout
    return Promise.race([
      request(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      ),
    ]);
  }

  reset(): void {
    this.isOnline = true;
    this.latency = 0;
    this.errorRate = 0;
  }
}

// Data generation utilities for stress testing
export function generateBulkNmeaData(count: number, baseData: NmeaData = sampleNmeaData): NmeaData[] {
  const data: NmeaData[] = [];
  
  for (let i = 0; i < count; i++) {
    const variation = Math.sin(i * 0.1) * 0.1;
    
    data.push({
      ...baseData,
      timestamp: Date.now() + i * 1000,
      speed: Math.max(0, (baseData.speed || 0) + variation * 2),
      heading: ((baseData.heading || 0) + variation * 10) % 360,
      latitude: (baseData.latitude || 0) + variation * 0.001,
      longitude: (baseData.longitude || 0) + variation * 0.001,
    });
  }
  
  return data;
}

// Error boundary testing utilities
export function createTestErrorBoundary() {
  let lastError: Error | null = null;
  
  function TestErrorBoundary({ children }: { children: React.ReactNode }) {
    const [hasError, setHasError] = React.useState(false);
    
    React.useEffect(() => {
      const errorHandler = (error: ErrorEvent) => {
        lastError = error.error;
        setHasError(true);
      };
      
      window.addEventListener('error', errorHandler);
      return () => window.removeEventListener('error', errorHandler);
    }, []);
    
    if (hasError) {
      return React.createElement(Text, { testID: 'error-boundary' }, 'Error caught');
    }
    
    return React.createElement(React.Fragment, null, children);
  }
  
  return {
    ErrorBoundary: TestErrorBoundary,
    getLastError: () => lastError,
    clearError: () => {
      lastError = null;
    },
  };
}

// Test data validation utilities
export function validateTestData(data: any, schema: Record<string, string>): boolean {
  for (const [key, expectedType] of Object.entries(schema)) {
    if (!(key in data)) {
      console.warn(`Missing required field: ${key}`);
      return false;
    }
    
    const actualType = typeof data[key];
    if (actualType !== expectedType) {
      console.warn(`Type mismatch for ${key}: expected ${expectedType}, got ${actualType}`);
      return false;
    }
  }
  
  return true;
}

// Re-export commonly used testing utilities
export { 
  createMockNmeaService,
} from '../mocks/mockNmeaService';

export { 
  sampleNmeaData,
  createTestNmeaData,
  generateTimeSeriesData 
} from '../fixtures/nmeaFixtures';