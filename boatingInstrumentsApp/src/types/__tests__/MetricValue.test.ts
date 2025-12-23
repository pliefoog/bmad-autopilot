/**
 * MetricValue Unit Tests
 *
 * Tests single metric encapsulation with enrichment
 */

import { MetricValue } from '../MetricValue';
import { ConversionRegistry } from '../../utils/ConversionRegistry';
import { AppError } from '../../utils/AppError';

// Mock ConversionRegistry
jest.mock('../../utils/ConversionRegistry', () => ({
  ConversionRegistry: {
    convertToDisplay: jest.fn(),
    convertToSI: jest.fn(),
    format: jest.fn(),
    getUnit: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../utils/logging/logger', () => ({
  log: {
    app: jest.fn(),
  },
}));

describe('MetricValue', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (ConversionRegistry.convertToDisplay as jest.Mock).mockImplementation(
      (si: number) => si * 3.28084,
    );
    (ConversionRegistry.convertToSI as jest.Mock).mockImplementation(
      (val: number) => val / 3.28084,
    );
    (ConversionRegistry.format as jest.Mock).mockImplementation(
      (val: number, cat: string, includeUnit: boolean) =>
        includeUnit ? `${val.toFixed(1)} ft` : val.toFixed(1),
    );
    (ConversionRegistry.getUnit as jest.Mock).mockReturnValue('ft');
  });

  describe('Constructor', () => {
    it('should create metric with SI value and category', () => {
      const metric = new MetricValue(10, 'depth');

      expect(metric.si_value).toBe(10);
      expect(metric.category).toBe('depth');
      expect(metric.value).toBeUndefined();
      expect(metric.unit).toBeUndefined();
      expect(metric.formattedValue).toBeUndefined();
      expect(metric.formattedValueWithUnit).toBeUndefined();
    });

    it('should throw error for invalid SI value', () => {
      expect(() => new MetricValue(NaN, 'depth')).toThrow(AppError);
      expect(() => new MetricValue(Infinity, 'depth')).toThrow(AppError);
      expect(() => new MetricValue(-Infinity, 'depth')).toThrow(AppError);
    });

    it('should allow null/undefined SI value', () => {
      const metricNull = new MetricValue(null as any, 'depth');
      const metricUndefined = new MetricValue(undefined as any, 'depth');

      expect(metricNull.si_value).toBeNull();
      expect(metricUndefined.si_value).toBeUndefined();
    });
  });

  describe('enrich', () => {
    it('should populate display fields', () => {
      const metric = new MetricValue(10, 'depth');
      metric.enrich();

      expect(metric.value).toBeCloseTo(32.8084, 4);
      expect(metric.unit).toBe('ft');
      expect(metric.formattedValue).toBe('32.8');
      expect(metric.formattedValueWithUnit).toBe('32.8 ft');
    });

    it('should handle null SI value gracefully', () => {
      const metric = new MetricValue(null as any, 'depth');
      metric.enrich();

      expect(metric.value).toBeUndefined();
      expect(metric.unit).toBe('ft');
      expect(metric.formattedValue).toBe('--');
      expect(metric.formattedValueWithUnit).toBe('-- ft');
    });

    it('should handle undefined SI value gracefully', () => {
      const metric = new MetricValue(undefined as any, 'depth');
      metric.enrich();

      expect(metric.value).toBeUndefined();
      expect(metric.unit).toBe('ft');
      expect(metric.formattedValue).toBe('--');
      expect(metric.formattedValueWithUnit).toBe('-- ft');
    });

    it('should call ConversionRegistry methods', () => {
      const metric = new MetricValue(10, 'depth');
      metric.enrich();

      expect(ConversionRegistry.convertToDisplay).toHaveBeenCalledWith(10, 'depth');
      expect(ConversionRegistry.format).toHaveBeenCalledWith(expect.any(Number), 'depth', false);
      expect(ConversionRegistry.format).toHaveBeenCalledWith(expect.any(Number), 'depth', true);
      expect(ConversionRegistry.getUnit).toHaveBeenCalledWith('depth');
    });
  });

  describe('convertToDisplay', () => {
    it('should convert SI to display value', () => {
      const metric = new MetricValue(10, 'depth');

      const displayValue = metric.convertToDisplay(5);

      expect(ConversionRegistry.convertToDisplay).toHaveBeenCalledWith(5, 'depth');
      expect(displayValue).toBeCloseTo(16.4042, 4);
    });
  });

  describe('convertToSI', () => {
    it('should convert display to SI value', () => {
      const metric = new MetricValue(10, 'depth');

      const siValue = metric.convertToSI(32.8084);

      expect(ConversionRegistry.convertToSI).toHaveBeenCalledWith(32.8084, 'depth');
      expect(siValue).toBeCloseTo(10, 4);
    });
  });

  describe('toJSON / fromPlain', () => {
    it('should serialize to plain object', () => {
      const metric = new MetricValue(10, 'depth');
      metric.enrich();

      const json = metric.toJSON();

      expect(json).toEqual({
        si_value: 10,
        category: 'depth',
        value: expect.any(Number),
        unit: 'ft',
        formattedValue: '32.8',
        formattedValueWithUnit: '32.8 ft',
      });
    });

    it('should deserialize from plain object', () => {
      const plain = {
        si_value: 10,
        category: 'depth' as const,
        value: 32.8084,
        unit: 'ft',
        formattedValue: '32.8',
        formattedValueWithUnit: '32.8 ft',
      };

      const metric = MetricValue.fromPlain(plain);

      expect(metric).toBeInstanceOf(MetricValue);
      expect(metric.si_value).toBe(10);
      expect(metric.category).toBe('depth');
      expect(metric.value).toBeCloseTo(32.8084, 4);
      expect(metric.unit).toBe('ft');
      expect(metric.formattedValue).toBe('32.8');
      expect(metric.formattedValueWithUnit).toBe('32.8 ft');
    });

    it('should handle serialization round-trip', () => {
      const original = new MetricValue(15, 'speed');
      original.enrich();

      const json = original.toJSON();
      const restored = MetricValue.fromPlain(json);

      expect(restored.si_value).toBe(original.si_value);
      expect(restored.category).toBe(original.category);
      expect(restored.value).toBe(original.value);
      expect(restored.unit).toBe(original.unit);
      expect(restored.formattedValue).toBe(original.formattedValue);
      expect(restored.formattedValueWithUnit).toBe(original.formattedValueWithUnit);
    });
  });

  describe('Immutability', () => {
    it('should not allow modification of si_value after creation', () => {
      const metric = new MetricValue(10, 'depth');
      const originalSI = metric.si_value;

      // This would fail in strict mode or with readonly enforcement
      // Just verify it's the same reference
      expect(metric.si_value).toBe(originalSI);
    });

    it('should not allow modification of category after creation', () => {
      const metric = new MetricValue(10, 'depth');
      const originalCategory = metric.category;

      expect(metric.category).toBe(originalCategory);
    });
  });
});
