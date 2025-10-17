// Mock NMEA Service for Testing
// Provides controlled NMEA data simulation for comprehensive testing

import type { NmeaData, DataQuality } from '../../types';
import { 
  sampleNmeaData, 
  createTestNmeaData, 
  generateTimeSeriesData 
} from '../fixtures/nmeaFixtures';

export class MockNmeaService {
  private data: NmeaData = sampleNmeaData;
  private quality: DataQuality = 'good';
  private listeners: ((data: NmeaData) => void)[] = [];
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private updateRate = 1000; // ms
  private messageCount = 0;

  constructor(initialData?: Partial<NmeaData>, initialQuality?: DataQuality) {
    if (initialData) {
      this.data = createTestNmeaData(initialData);
    }
    if (initialQuality) {
      this.quality = initialQuality;
    }
  }

  // Start emitting data updates
  start(updateRate = 1000): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.updateRate = updateRate;
    
    this.interval = setInterval(() => {
      this.emitUpdate();
    }, updateRate);
  }

  // Stop emitting updates
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
  }

  // Subscribe to data updates
  subscribe(callback: (data: NmeaData) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Manually emit data update
  emitUpdate(): void {
    this.messageCount++;
    const updatedData: NmeaData = {
      ...this.data,
      timestamp: Date.now(),
    };
    
    this.listeners.forEach(callback => callback(updatedData));
  }

  // Update specific data fields
  updateData(updates: Partial<NmeaData>): void {
    this.data = { ...this.data, ...updates };
    this.emitUpdate();
  }

  // Simulate data quality changes
  setQuality(quality: DataQuality): void {
    this.quality = quality;
    
    // Adjust data based on quality
    switch (quality) {
      case 'poor':
      case 'invalid':
        // Add some noise or missing data
        this.updateData({
          latitude: (this.data.latitude || 0) + (Math.random() - 0.5) * 0.001,
          longitude: (this.data.longitude || 0) + (Math.random() - 0.5) * 0.001,
        });
        break;
      case 'excellent':
        // Clean, precise data
        this.updateData({
          latitude: Math.round((this.data.latitude || 0) * 10000) / 10000,
          longitude: Math.round((this.data.longitude || 0) * 10000) / 10000,
        });
        break;
    }
  }

  // Simulate connection issues
  simulateDisconnection(duration = 5000): void {
    this.stop();
    setTimeout(() => {
      this.start(this.updateRate);
    }, duration);
  }

  // Simulate data spikes/anomalies
  simulateAnomaly(field: keyof NmeaData, value: any, duration = 2000): void {
    const originalValue = this.data[field];
    this.updateData({ [field]: value });
    
    setTimeout(() => {
      this.updateData({ [field]: originalValue });
    }, duration);
  }

  // Generate batch data for testing
  generateBatchData(count: number, intervalMs = 1000): NmeaData[] {
    return generateTimeSeriesData(this.data, count, intervalMs);
  }

  // Get current data
  getCurrentData(): NmeaData {
    return { ...this.data, timestamp: Date.now() };
  }

  // Get current quality
  getCurrentQuality(): DataQuality {
    return this.quality;
  }

  // Reset to initial state
  reset(initialData?: Partial<NmeaData>): void {
    this.stop();
    this.messageCount = 0;
    this.listeners = [];
    
    if (initialData) {
      this.data = createTestNmeaData(initialData);
    } else {
      this.data = sampleNmeaData;
    }
  }

  // Cleanup
  destroy(): void {
    this.stop();
    this.listeners = [];
  }
}

// Factory function for creating mock service instances
export function createMockNmeaService(
  initialData?: Partial<NmeaData>,
  quality?: DataQuality
): MockNmeaService {
  return new MockNmeaService(initialData, quality);
}

// Pre-configured mock services for common test scenarios
export const mockServices = {
  // Standard test service with good quality data
  standard: () => createMockNmeaService(),
  
  // Service with incomplete data
  incomplete: () => createMockNmeaService({
    latitude: 37.7749,
    longitude: -122.4194,
    speed: 8.5,
    // Missing other fields
  }, 'poor'),
  
  // Service with stale data
  stale: () => {
    const service = createMockNmeaService();
    service.updateData({
      timestamp: Date.now() - 10000, // 10 seconds old
    });
    return service;
  },
  
  // Service for autopilot testing
  autopilot: () => createMockNmeaService({
    autopilotStatus: 'active',
    autopilotMode: 'compass',
    autopilotHeading: 275.0,
  }),
  
  // Service for emergency scenarios
  emergency: () => createMockNmeaService({
    depth: 2.1, // Shallow water
    windSpeed: 45.0, // High wind
    batteryVoltage: 10.8, // Low battery
    autopilotStatus: 'alarm',
  }, 'poor'),
  
  // Service with no data (disconnected)
  disconnected: () => {
    const service = createMockNmeaService();
    service.stop();
    return service;
  },
};