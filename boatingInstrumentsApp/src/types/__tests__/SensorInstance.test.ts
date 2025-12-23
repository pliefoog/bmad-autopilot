/**
 * SensorInstance Unit Tests
 *
 * Tests complete sensor lifecycle management
 */

import { SensorInstance } from '../SensorInstance';
import { MetricValue } from '../MetricValue';

// Mock MetricValue
jest.mock('../MetricValue');

// Mock SensorConfigRegistry
jest.mock('../../registry/SensorConfigRegistry', () => ({
  getDataFields: jest.fn(() => [
    { key: 'depth', category: 'depth' },
    { key: 'offset', category: 'depth' },
  ]),
}));

// Mock logger
jest.mock('../../utils/logging/logger', () => ({
  log: {
    app: jest.fn(),
  },
}));

describe('SensorInstance', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock MetricValue constructor
    (MetricValue as any).mockImplementation((si_value: number, category: string) => ({
      si_value,
      category,
      enrich: jest.fn(),
      toJSON: jest.fn(() => ({ si_value, category })),
    }));

    // Mock MetricValue.fromPlain
    (MetricValue as any).fromPlain = jest.fn((plain: any) => ({
      ...plain,
      enrich: jest.fn(),
    }));
  });

  describe('Constructor', () => {
    it('should create sensor instance with type and instance number', () => {
      const sensor = new SensorInstance('depth', 0);

      expect(sensor.type).toBe('depth');
      expect(sensor.instance).toBe(0);
    });
  });

  describe('updateMetrics', () => {
    it('should create MetricValue for each field', () => {
      const sensor = new SensorInstance('depth', 0);

      sensor.updateMetrics({ depth: 10.5, offset: 0.5 });

      expect(MetricValue).toHaveBeenCalledWith(10.5, 'depth');
      expect(MetricValue).toHaveBeenCalledWith(0.5, 'depth');
    });

    it('should enrich metrics automatically', () => {
      const sensor = new SensorInstance('depth', 0);

      sensor.updateMetrics({ depth: 10.5 });

      const mockMetric = (MetricValue as any).mock.results[0].value;
      expect(mockMetric.enrich).toHaveBeenCalled();
    });

    it('should skip null/undefined values', () => {
      const sensor = new SensorInstance('depth', 0);

      sensor.updateMetrics({ depth: 10.5, offset: null });

      // Should only create MetricValue for depth, not offset
      expect(MetricValue).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMetric', () => {
    it('should return metric by field name', () => {
      const sensor = new SensorInstance('depth', 0);
      sensor.updateMetrics({ depth: 10.5 });

      const metric = sensor.getMetric('depth');

      expect(metric).toBeDefined();
      expect(metric?.si_value).toBe(10.5);
    });

    it('should return undefined for non-existent metric', () => {
      const sensor = new SensorInstance('depth', 0);

      const metric = sensor.getMetric('depth');

      expect(metric).toBeUndefined();
    });
  });

  describe('getAllMetrics', () => {
    it('should return all metrics as map', () => {
      const sensor = new SensorInstance('depth', 0);
      sensor.updateMetrics({ depth: 10.5, offset: 0.5 });

      const metrics = sensor.getAllMetrics();

      expect(metrics.size).toBe(2);
      expect(metrics.has('depth')).toBe(true);
      expect(metrics.has('offset')).toBe(true);
    });

    it('should return empty map if no metrics', () => {
      const sensor = new SensorInstance('depth', 0);

      const metrics = sensor.getAllMetrics();

      expect(metrics.size).toBe(0);
    });
  });

  describe('updateThresholds', () => {
    it('should increment threshold version', () => {
      const sensor = new SensorInstance('depth', 0);

      const initialVersion = (sensor as any)._thresholdVersion;
      sensor.updateThresholds();
      const newVersion = (sensor as any)._thresholdVersion;

      expect(newVersion).toBe(initialVersion + 1);
    });
  });

  describe('reEnrich', () => {
    it('should re-enrich all metrics', () => {
      const sensor = new SensorInstance('depth', 0);
      sensor.updateMetrics({ depth: 10.5, offset: 0.5 });

      // Clear enrich calls from updateMetrics
      jest.clearAllMocks();

      sensor.reEnrich();

      // Should enrich both metrics
      expect((sensor as any)._metrics.get('depth').enrich).toHaveBeenCalled();
      expect((sensor as any)._metrics.get('offset').enrich).toHaveBeenCalled();
    });

    it('should handle empty metrics gracefully', () => {
      const sensor = new SensorInstance('depth', 0);

      expect(() => sensor.reEnrich()).not.toThrow();
    });
  });

  describe('toJSON / fromPlain', () => {
    it('should serialize to plain object', () => {
      const sensor = new SensorInstance('depth', 0);
      sensor.updateMetrics({ depth: 10.5 });

      const json = sensor.toJSON();

      expect(json).toEqual({
        type: 'depth',
        instance: 0,
        metrics: expect.any(Object),
        thresholds: expect.any(Object),
      });
    });

    it('should deserialize from plain object', () => {
      const plain = {
        type: 'depth' as const,
        instance: 0,
        metrics: {
          depth: { si_value: 10.5, category: 'depth' as const },
        },
        thresholds: {},
      };

      const sensor = SensorInstance.fromPlain(plain);

      expect(sensor).toBeInstanceOf(SensorInstance);
      expect(sensor.type).toBe('depth');
      expect(sensor.instance).toBe(0);
    });
  });

  describe('destroy', () => {
    it('should clear all data', () => {
      const sensor = new SensorInstance('depth', 0);
      sensor.updateMetrics({ depth: 10.5 });

      sensor.destroy();

      expect((sensor as any)._metrics.size).toBe(0);
      expect((sensor as any)._history.size).toBe(0);
    });
  });
});
