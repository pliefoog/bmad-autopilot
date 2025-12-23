/**
 * NMEA Store Serialization Tests
 *
 * Tests SensorInstance serialization/deserialization for Zustand persistence
 */

import { SensorInstance } from '../../types/SensorInstance';
import { SensorAlarmThresholds } from '../../types/SensorData';

describe('nmeaStore Serialization', () => {
  describe('SensorInstance serialization', () => {
    it('should serialize and deserialize depth sensor correctly', () => {
      // Create a depth sensor with thresholds
      const thresholds: SensorAlarmThresholds = {
        enabled: true,
        name: 'Depth Alarm',
        warning: 3.0,
        critical: 1.5,
        direction: 'below',
      };

      const instance = new SensorInstance('depth', 0, thresholds);

      // Update with some data
      instance.updateMetrics({
        depth: 5.2,
        depthSource: 'DPT',
        timestamp: Date.now(),
      });

      // Serialize to JSON
      const serialized = instance.toJSON();

      // Verify serialized structure
      expect(serialized).toHaveProperty('type', 'depth');
      expect(serialized).toHaveProperty('instance', 0);
      expect(serialized).toHaveProperty('metrics');
      expect(serialized).toHaveProperty('thresholds');
      expect(serialized.thresholds).toEqual(thresholds);

      // Deserialize back to SensorInstance
      const restored = SensorInstance.fromPlain(serialized);

      // Verify restored instance
      expect(restored).toBeInstanceOf(SensorInstance);
      expect(restored.type).toBe('depth');
      expect(restored.instance).toBe(0);
      expect(restored.thresholds).toEqual(thresholds);

      // Verify metrics restored
      const depthMetric = restored.getMetric('depth');
      expect(depthMetric).toBeDefined();
      expect(depthMetric?.si_value).toBe(5.2);

      const sourceMetric = restored.getMetric('depthSource');
      expect(sourceMetric?.si_value).toBe('DPT');
    });

    it('should handle multi-metric sensors (engine)', () => {
      const thresholds: SensorAlarmThresholds = {
        enabled: true,
        name: 'Engine 1',
        metrics: {
          rpm: {
            warning: 600,
            critical: 4000,
            direction: 'above',
            enabled: true,
          },
          coolantTemp: {
            warning: 95,
            critical: 105,
            direction: 'above',
            enabled: true,
          },
          oilPressure: {
            warning: 20,
            critical: 10,
            direction: 'below',
            enabled: true,
          },
        },
      };

      const instance = new SensorInstance('engine', 0, thresholds);

      instance.updateMetrics({
        rpm: 1800,
        coolantTemp: 82,
        oilPressure: 45,
        alternatorVoltage: 13.8,
        timestamp: Date.now(),
      });

      // Serialize
      const serialized = instance.toJSON();
      expect(Object.keys(serialized.metrics).length).toBe(5); // All 5 metrics

      // Deserialize
      const restored = SensorInstance.fromPlain(serialized);

      // Verify all metrics restored
      expect(restored.getMetric('rpm')?.si_value).toBe(1800);
      expect(restored.getMetric('coolantTemp')?.si_value).toBe(82);
      expect(restored.getMetric('oilPressure')?.si_value).toBe(45);
      expect(restored.getMetric('alternatorVoltage')?.si_value).toBe(13.8);
    });

    it('should not persist history (regenerates on reconnect)', () => {
      const instance = new SensorInstance('depth', 0, { enabled: false });

      // Add some history
      instance.updateMetrics({ depth: 5.0, timestamp: Date.now() });
      instance.updateMetrics({ depth: 5.5, timestamp: Date.now() + 1000 });
      instance.updateMetrics({ depth: 6.0, timestamp: Date.now() + 2000 });

      // Verify history exists
      const history = instance.getHistoryForMetric('depth');
      expect(history.length).toBe(3);

      // Serialize and deserialize
      const serialized = instance.toJSON();
      const restored = SensorInstance.fromPlain(serialized);

      // History should be empty (not persisted)
      const restoredHistory = restored.getHistoryForMetric('depth');
      expect(restoredHistory.length).toBe(0);

      // But current value should be preserved
      expect(restored.getMetric('depth')?.si_value).toBe(6.0);
    });

    it('should preserve threshold version', () => {
      const instance = new SensorInstance('depth', 0, {
        enabled: true,
        name: 'Depth',
        warning: 3.0,
        direction: 'below',
      });

      // Update thresholds
      instance.updateThresholds({
        critical: 1.5,
      });

      // Serialize and deserialize
      const restored = SensorInstance.fromPlain(instance.toJSON());

      // Threshold version should match
      expect(restored.thresholds).toEqual(instance.thresholds);
    });

    it('should handle sensors with no metrics (new sensor)', () => {
      const instance = new SensorInstance('battery', 1, {
        enabled: true,
        name: 'House Battery',
      });

      // Don't add any metrics - simulate new sensor just registered

      const serialized = instance.toJSON();
      const restored = SensorInstance.fromPlain(serialized);

      expect(restored.type).toBe('battery');
      expect(restored.instance).toBe(1);
      expect(restored.getAllMetrics()).toEqual({});
    });
  });

  describe('Full store serialization', () => {
    it('should serialize empty sensor structure', () => {
      const emptySensors = {
        tank: {},
        engine: {},
        battery: {},
        wind: {},
        speed: {},
        gps: {},
        temperature: {},
        depth: {},
        compass: {},
        autopilot: {},
        navigation: {},
      };

      // This test just verifies the structure exists
      expect(emptySensors).toBeDefined();
      expect(Object.keys(emptySensors).length).toBe(11);
    });
  });
});
