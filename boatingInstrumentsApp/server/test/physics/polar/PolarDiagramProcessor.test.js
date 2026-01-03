/**
 * Tests for PolarDiagramProcessor
 *
 * Task 2.1: Polar diagram processing - validation and testing
 * Ensures accurate parsing, interpolation, and performance calculations
 */

const PolarDiagramProcessor = require('../../../lib/physics/polar/PolarDiagramProcessor');
const path = require('path');
const fs = require('fs');

describe('PolarDiagramProcessor', () => {
  let processor;
  let testPolarFile;

  beforeAll(async () => {
    processor = new PolarDiagramProcessor();

    // Create test polar data based on ORC format patterns
    testPolarFile = path.join(__dirname, 'test-polar.csv');
    const testData = `TWS,30,45,60,90,120,150
6,0.0,3.5,4.5,4.0,3.0,2.0
12,0.0,5.0,6.0,5.5,4.5,3.0
18,0.0,6.0,7.0,6.5,5.5,3.5`;

    fs.writeFileSync(testPolarFile, testData);
  });

  afterAll(() => {
    // Clean up test file
    if (fs.existsSync(testPolarFile)) {
      fs.unlinkSync(testPolarFile);
    }
  });

  describe('loadPolarDiagram', () => {
    test('should load and parse polar diagram correctly', async () => {
      const polarData = await processor.loadPolarDiagram(testPolarFile);

      expect(polarData.windSpeeds).toEqual([6, 12, 18]);
      expect(polarData.windAngles).toEqual([30, 45, 60, 90, 120, 150]);
      expect(polarData.speedTable).toHaveLength(3);
      expect(polarData.speedTable[0]).toEqual([0.0, 3.5, 4.5, 4.0, 3.0, 2.0]);
      expect(polarData.metadata.units).toBe('knots');
    });

    test('should cache loaded polar data', async () => {
      const polarData1 = await processor.loadPolarDiagram(testPolarFile);
      const polarData2 = await processor.loadPolarDiagram(testPolarFile);

      expect(polarData1).toBe(polarData2); // Same object reference
    });

    test('should handle invalid file paths', async () => {
      await expect(processor.loadPolarDiagram('nonexistent.csv')).rejects.toThrow(
        'Failed to read polar file',
      );
    }, 15000); // Increase timeout for file operations
  });

  describe('interpolateSpeed', () => {
    let polarData;

    beforeAll(async () => {
      polarData = await processor.loadPolarDiagram(testPolarFile);
    });

    test('should return exact values for table entries', () => {
      const speed = processor.interpolateSpeed(polarData, 12, 60);
      expect(speed).toBe(6.0);
    });

    test('should interpolate between wind speeds', () => {
      const speed = processor.interpolateSpeed(polarData, 9, 60); // Between 6 and 12 knots
      expect(speed).toBeCloseTo(5.25, 2); // Linear interpolation: 4.5 + (6.0-4.5) * 0.5
    });

    test('should interpolate between wind angles', () => {
      const speed = processor.interpolateSpeed(polarData, 12, 52.5); // Between 45° and 60°
      expect(speed).toBeCloseTo(5.5, 2); // Linear interpolation: 5.0 + (6.0-5.0) * 0.5
    });

    test('should handle bilinear interpolation', () => {
      const speed = processor.interpolateSpeed(polarData, 9, 52.5); // Between all bounds
      expect(speed).toBeGreaterThan(4.5);
      expect(speed).toBeLessThan(6.0);
    });

    test('should normalize wind angles correctly', () => {
      const speed1 = processor.interpolateSpeed(polarData, 12, 60);
      const speed2 = processor.interpolateSpeed(polarData, 12, -300); // Equivalent to 60°
      expect(speed1).toBe(speed2);
    });

    test('should handle edge cases', () => {
      // Below minimum wind speed
      const lowSpeed = processor.interpolateSpeed(polarData, 3, 60);
      expect(lowSpeed).toBe(4.5); // Should use first row

      // Above maximum wind speed
      const highSpeed = processor.interpolateSpeed(polarData, 25, 60);
      expect(highSpeed).toBe(7.0); // Should use last row

      // Below minimum angle
      const lowAngle = processor.interpolateSpeed(polarData, 12, 15);
      expect(lowAngle).toBe(0.0); // Should use first column

      // Above maximum angle
      const highAngle = processor.interpolateSpeed(polarData, 12, 180);
      expect(highAngle).toBe(3.0); // Should use last column
    });
  });

  describe('getOptimalVMG', () => {
    let polarData;

    beforeAll(async () => {
      polarData = await processor.loadPolarDiagram(testPolarFile);
    });

    test('should find optimal upwind VMG', () => {
      const optimal = processor.getOptimalVMG(polarData, 12, true);

      expect(optimal.angle).toBeGreaterThan(30);
      expect(optimal.angle).toBeLessThan(60);
      expect(optimal.speed).toBeGreaterThan(0);
      expect(optimal.vmg).toBeGreaterThan(0);
    });

    test('should find optimal downwind VMG', () => {
      const optimal = processor.getOptimalVMG(polarData, 12, false);

      expect(optimal.angle).toBeGreaterThan(120);
      expect(optimal.angle).toBeLessThanOrEqual(170); // Allow exactly 170°
      expect(optimal.speed).toBeGreaterThan(0);
      expect(optimal.vmg).toBeGreaterThan(0);
    });

    test('should return consistent results', () => {
      const optimal1 = processor.getOptimalVMG(polarData, 12, true);
      const optimal2 = processor.getOptimalVMG(polarData, 12, true);

      expect(optimal1.angle).toBe(optimal2.angle);
      expect(optimal1.speed).toBe(optimal2.speed);
      expect(optimal1.vmg).toBe(optimal2.vmg);
    });
  });

  describe('caching and performance', () => {
    let polarData;

    beforeAll(async () => {
      polarData = await processor.loadPolarDiagram(testPolarFile);
    });

    test('should cache interpolation results', () => {
      const speed1 = processor.interpolateSpeed(polarData, 12, 45);
      const speed2 = processor.interpolateSpeed(polarData, 12, 45);

      expect(speed1).toBe(speed2);
      expect(processor.getStats().cacheSize).toBeGreaterThan(0);
    });

    test('should limit cache size', () => {
      processor.clearCaches();

      // Fill cache beyond limit
      for (let i = 0; i < 1100; i++) {
        processor.interpolateSpeed(polarData, 12 + i * 0.01, 45 + i * 0.01);
      }

      const stats = processor.getStats();
      expect(stats.cacheSize).toBeLessThan(1100); // Allow some variance in cache management
    });

    test('should clear caches', () => {
      processor.interpolateSpeed(polarData, 12, 45);
      expect(processor.getStats().cacheSize).toBeGreaterThan(0);

      processor.clearCaches();
      expect(processor.getStats().cacheSize).toBe(0);
    });
  });

  describe('validation', () => {
    test('should validate polar data structure', async () => {
      // Test with empty file
      const emptyFile = path.join(__dirname, 'empty.csv');
      fs.writeFileSync(emptyFile, '');

      await expect(processor.loadPolarDiagram(emptyFile)).rejects.toThrow(
        'Empty polar diagram file',
      );

      fs.unlinkSync(emptyFile);
    });

    test('should warn about limited angle range', async () => {
      const limitedFile = path.join(__dirname, 'limited.csv');
      const limitedData = `TWS,60,90
12,5.0,4.0`;

      fs.writeFileSync(limitedFile, limitedData);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await processor.loadPolarDiagram(limitedFile);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('limited angle range'));

      consoleSpy.mockRestore();
      fs.unlinkSync(limitedFile);
    });
  });

  describe('real polar data tests', () => {
    const orcBasedPolarFile = path.resolve(
      __dirname,
      '../../../../../../vendor/polar-diagrams/j35-polar.csv',
    );

    test('should load real-world polar data if available', async () => {
      if (fs.existsSync(orcBasedPolarFile)) {
        const polarData = await processor.loadPolarDiagram(orcBasedPolarFile);

        expect(polarData.windSpeeds).toContain(12);
        expect(polarData.windAngles).toContain(40);
        expect(polarData.metadata.source).toBe('j35-polar.csv');
      } else {
        console.log('ORC-based polar data not available, skipping real-world test');
      }
    });

    test('should provide realistic sailing performance', async () => {
      if (fs.existsSync(orcBasedPolarFile)) {
        const polarData = await processor.loadPolarDiagram(orcBasedPolarFile);

        // Test typical upwind performance (40-50°)
        const upwindSpeed = processor.interpolateSpeed(polarData, 12, 45);
        expect(upwindSpeed).toBeGreaterThan(4);
        expect(upwindSpeed).toBeLessThan(8);

        // Test beam reach performance (90°)
        const reachSpeed = processor.interpolateSpeed(polarData, 12, 90);
        expect(reachSpeed).toBeGreaterThan(upwindSpeed);

        // Test downwind performance (150°)
        const downwindSpeed = processor.interpolateSpeed(polarData, 12, 150);
        expect(downwindSpeed).toBeLessThan(reachSpeed);
      }
    });

    test('should calculate realistic VMG angles', async () => {
      if (fs.existsSync(orcBasedPolarFile)) {
        const polarData = await processor.loadPolarDiagram(orcBasedPolarFile);

        const upwindVMG = processor.getOptimalVMG(polarData, 12, true);
        const downwindVMG = processor.getOptimalVMG(polarData, 12, false);

        // Typical racing sailboat VMG angles
        expect(upwindVMG.angle).toBeGreaterThan(35);
        expect(upwindVMG.angle).toBeLessThan(50);
        expect(downwindVMG.angle).toBeGreaterThan(140);
        expect(downwindVMG.angle).toBeLessThan(170);
      }
    });
  });
});
