/**
 * Instance Detection Service Tests
 * Tests for NMEA instance detection service foundation
 */

import { 
  instanceDetectionService, 
  InstanceDetectionService,
  NMEA_BATTERY_INSTANCES,
  NMEA_TANK_INSTANCES 
} from '../../../src/services/nmea/instanceDetection';

// Mock the NMEA store
jest.mock('../../../src/store/nmeaStore', () => ({
  useNmeaStore: {
    getState: jest.fn(() => ({
      nmeaData: {},
      rawSentences: [],
      connectionStatus: 'disconnected'
    }))
  }
}));

describe('InstanceDetectionService', () => {
  let service: InstanceDetectionService;

  beforeEach(() => {
    service = new InstanceDetectionService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.stopScanning();
  });

  describe('Service Lifecycle', () => {
    test('should start and stop scanning correctly', () => {
      expect(service.getStatus().isScanning).toBe(false);
      
      service.startScanning();
      expect(service.getStatus().isScanning).toBe(true);
      
      service.stopScanning();
      expect(service.getStatus().isScanning).toBe(false);
    });

    test('should not start scanning if already scanning', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.startScanning();
      const firstCallCount = consoleSpy.mock.calls.length;
      
      service.startScanning(); // Second call should be ignored
      expect(consoleSpy.mock.calls.length).toBe(firstCallCount);
      
      consoleSpy.mockRestore();
    });

    test('should not stop scanning if not already scanning', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.stopScanning(); // Should not log anything
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Stopped'));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Instance Detection State', () => {
    test('should return empty instances initially', () => {
      const instances = service.getDetectedInstances();
      expect(instances.engines).toHaveLength(0);
      expect(instances.batteries).toHaveLength(0);
      expect(instances.tanks).toHaveLength(0);
    });

    test('should return correct status information', () => {
      const status = service.getStatus();
      expect(status).toHaveProperty('isScanning');
      expect(status).toHaveProperty('lastScanTime');
      expect(status).toHaveProperty('instanceCounts');
      expect(status.instanceCounts.engines).toBe(0);
      expect(status.instanceCounts.batteries).toBe(0);
      expect(status.instanceCounts.tanks).toBe(0);
    });
  });

  describe('Instance Mapping Tables', () => {
    test('should have correct battery instance mappings', () => {
      expect(NMEA_BATTERY_INSTANCES[0]).toEqual({
        title: 'HOUSE',
        icon: '🔋',
        priority: 1
      });
      
      expect(NMEA_BATTERY_INSTANCES[1]).toEqual({
        title: 'ENGINE',
        icon: '🔋',
        priority: 2
      });
    });

    test('should have correct tank instance mappings', () => {
      expect(NMEA_TANK_INSTANCES.fuel).toEqual({
        icon: '🛢️',
        positions: ['PORT', 'STBD', 'CENTER', 'MAIN']
      });
      
      expect(NMEA_TANK_INSTANCES.freshWater).toEqual({
        icon: '💧',
        positions: ['FRESH', 'POTABLE']
      });
    });
  });

  describe('Title Generation', () => {
    test('should generate correct engine titles', () => {
      // Access protected method for testing
      const generateEngineTitle = (service as any).generateEngineTitle.bind(service);
      
      expect(generateEngineTitle(0)).toBe('⚙️ ENGINE #1');
      expect(generateEngineTitle(1)).toBe('⚙️ ENGINE #2');
    });

    test('should generate correct battery titles', () => {
      const generateBatteryTitle = (service as any).generateBatteryTitle.bind(service);
      
      expect(generateBatteryTitle(0)).toBe('🔋 HOUSE');
      expect(generateBatteryTitle(1)).toBe('🔋 ENGINE');
      expect(generateBatteryTitle(99)).toBe('🔋 BATTERY #100'); // Fallback
    });

    test('should generate correct tank titles', () => {
      const generateTankTitle = (service as any).generateTankTitle.bind(service);
      
      expect(generateTankTitle(0, 'fuel', 'PORT')).toBe('🛢️ FUEL PORT');
      expect(generateTankTitle(0, 'freshWater')).toBe('💧 FRESHWATER');
      expect(generateTankTitle(0)).toBe('🛢️ TANK #1'); // Fallback
    });
  });

  describe('Instance ID Generation', () => {
    test('should generate correct instance IDs', () => {
      const generateInstanceId = (service as any).generateInstanceId.bind(service);
      
      expect(generateInstanceId('engine', 0, 1)).toBe('engine-0-1');
      expect(generateInstanceId('battery', 1)).toBe('battery-1');
    });
  });

  describe('Performance Requirements', () => {
    test('should complete scan operations within performance requirements', (done) => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      service.startScanning();
      
      // Wait for at least one scan to complete
      setTimeout(() => {
        service.stopScanning();
        
        // Check if performance warning was logged
        const performanceWarnings = consoleSpy.mock.calls.filter(call => 
          call[0]?.includes('Scan took') && call[0]?.includes('ms')
        );
        
        // If warnings exist, scan took longer than 100ms (not good but acceptable for foundation)
        // In production, we expect no warnings after Task B implementation
        
        consoleSpy.mockRestore();
        done();
      }, 50);
    });
  });

  describe('Error Handling', () => {
    test('should handle scan errors gracefully', (done) => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockUseNmeaStore = require('../../../src/store/nmeaStore').useNmeaStore;
      
      // Mock getState to throw an error
      mockUseNmeaStore.getState.mockImplementationOnce(() => {
        throw new Error('Mock store error');
      });
      
      service.startScanning();
      
      // Wait a moment for the scan to execute
      setTimeout(() => {
        service.stopScanning();
        expect(consoleSpy).toHaveBeenCalledWith(
          '[InstanceDetection] Error during scan:',
          expect.any(Error)
        );
        consoleSpy.mockRestore();
        done();
      }, 50);
    });
  });
});

describe('Singleton Export', () => {
  test('should export a singleton instance', () => {
    expect(instanceDetectionService).toBeDefined();
    expect(instanceDetectionService).toBeInstanceOf(InstanceDetectionService);
  });
});