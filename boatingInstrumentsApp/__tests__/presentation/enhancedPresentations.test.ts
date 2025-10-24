/**
 * Enhanced Presentations Tests
 * 
 * Tests for enhanced presentation definitions with format field validation,
 * marine pattern compliance, and unique ID validation
 */

import { 
  PRESENTATIONS, 
  findPresentation, 
  getDefaultPresentation,
  getPresentationsForCategory,
  getPresentationsForRegion
} from '../../src/presentation/presentations';

describe('Enhanced Presentations', () => {
  describe('Format Field Validation (AC: #1)', () => {
    it('should have formatSpec field on all presentations', () => {
      Object.values(PRESENTATIONS).forEach(categoryData => {
        categoryData.presentations.forEach(presentation => {
          expect(presentation.formatSpec).toBeDefined();
          expect(presentation.formatSpec.pattern).toBeDefined();
          expect(presentation.formatSpec.decimals).toBeDefined();
          expect(presentation.formatSpec.minWidth).toBeDefined();
          expect(presentation.formatSpec.testCases).toBeDefined();
        });
      });
    });

    it('should have valid test cases for all presentations', () => {
      Object.values(PRESENTATIONS).forEach(categoryData => {
        categoryData.presentations.forEach(presentation => {
          const { testCases } = presentation.formatSpec;
          
          expect(typeof testCases.min).toBe('number');
          expect(typeof testCases.max).toBe('number');
          expect(typeof testCases.typical).toBe('number');
          expect(testCases.min).toBeLessThanOrEqual(testCases.typical);
          expect(testCases.typical).toBeLessThanOrEqual(testCases.max);
        });
      });
    });
  });

  describe('Marine Format Patterns (AC: #1)', () => {
    it('should use xxx.x pattern for speed presentations with 1 decimal', () => {
      const speedPresentations = getPresentationsForCategory('speed');
      
      speedPresentations.forEach(presentation => {
        if (presentation.formatSpec.decimals === 1) {
          expect(presentation.formatSpec.pattern).toMatch(/x+\.x/);
          expect(presentation.formatSpec.decimals).toBe(1);
        }
      });
    });

    it('should have unique wind presentation IDs vs speed IDs', () => {
      const speedPresentations = getPresentationsForCategory('speed');
      const windPresentations = getPresentationsForCategory('wind');
      
      const speedIds = speedPresentations.map(p => p.id);
      const windIds = windPresentations.map(p => p.id);
      
      // Check for specific known conflicts
      expect(speedIds).toContain('kts_1');
      expect(windIds).toContain('wind_kts_1');
      expect(speedIds).not.toContain('wind_kts_1');
      expect(windIds).not.toContain('kts_1');
    });

    it('should use "x Bf (Description)" format for Beaufort scale', () => {
      const beaufortPresentation = findPresentation('wind', 'bf_desc');
      
      expect(beaufortPresentation).toBeDefined();
      expect(beaufortPresentation!.formatSpec.pattern).toBe('x Bf (Description)');
      
      // Test actual formatting
      const testValue = beaufortPresentation!.convert(15); // ~4 Bf
      const formatted = beaufortPresentation!.format(testValue);
      
      expect(formatted).toMatch(/\d+ Bf \(.+\)/);
    });
  });

  describe('Test Cases for Font Measurement', () => {
    it('should have realistic test cases for speed presentations', () => {
      const speedPresentations = getPresentationsForCategory('speed');
      
      speedPresentations.forEach(presentation => {
        const { testCases } = presentation.formatSpec;
        
        // Speed test cases should cover marine range 
        expect(testCases.min).toBeGreaterThanOrEqual(0);
        expect(testCases.max).toBeGreaterThan(testCases.min);
        expect(testCases.max).toBeLessThanOrEqual(200); // Reasonable max for marine (includes converted units)
      });
    });

    it('should have realistic test cases for depth presentations', () => {
      const depthPresentations = getPresentationsForCategory('depth');
      
      depthPresentations.forEach(presentation => {
        const { testCases } = presentation.formatSpec;
        
        // Depth test cases should cover marine range
        expect(testCases.min).toBeGreaterThanOrEqual(0);
        expect(testCases.max).toBeGreaterThan(testCases.min);
      });
    });

    it('should have appropriate test cases for Beaufort scale', () => {
      const beaufortPresentation = findPresentation('wind', 'bf_desc');
      
      expect(beaufortPresentation).toBeDefined();
      
      const { testCases } = beaufortPresentation!.formatSpec;
      expect(testCases.min).toBe(0);  // Calm
      expect(testCases.max).toBe(12); // Hurricane  
      expect(testCases.typical).toBeGreaterThan(0);
      expect(testCases.typical).toBeLessThan(12);
    });
  });

  describe('Marine Precision Standards', () => {
    it('should format speed values with marine precision', () => {
      const knotPresentation = findPresentation('speed', 'kts_1');
      
      expect(knotPresentation).toBeDefined();
      expect(knotPresentation!.format(15.567)).toBe('15.6');
      expect(knotPresentation!.format(5.23)).toBe('5.2');
      expect(knotPresentation!.format(0.05)).toBe('0.1');
    });

    it('should format depth values with marine precision', () => {
      const meterPresentation = findPresentation('depth', 'm_1');
      
      expect(meterPresentation).toBeDefined();
      expect(meterPresentation!.format(12.847)).toBe('12.8');
      expect(meterPresentation!.format(0.123)).toBe('0.1');
    });

    it('should handle edge cases properly', () => {
      const presentations = [
        findPresentation('speed', 'kts_1'),
        findPresentation('depth', 'm_1'),
        findPresentation('temperature', 'c_1')
      ];

      presentations.forEach(presentation => {
        if (presentation) {
          // Test zero
          expect(() => presentation.format(0)).not.toThrow();
          
          // Test large values
          expect(() => presentation.format(999.99)).not.toThrow();
          
          // Test negative (where applicable)
          if (presentation.id.includes('c_') || presentation.id.includes('f_')) {
            expect(() => presentation.format(-10)).not.toThrow();
          }
        }
      });
    });
  });

  describe('Presentation Registry Functions', () => {
    it('should find presentations by ID correctly', () => {
      const speedPresentation = findPresentation('speed', 'kts_1');
      expect(speedPresentation).toBeDefined();
      expect(speedPresentation!.id).toBe('kts_1');
      
      const windPresentation = findPresentation('wind', 'wind_kts_1');
      expect(windPresentation).toBeDefined();
      expect(windPresentation!.id).toBe('wind_kts_1');
    });

    it('should return undefined for non-existent presentations', () => {
      const nonExistent = findPresentation('speed', 'nonexistent');
      expect(nonExistent).toBeUndefined();
    });

    it('should return default presentations correctly', () => {
      const defaultSpeed = getDefaultPresentation('speed');
      expect(defaultSpeed).toBeDefined();
      expect(defaultSpeed!.isDefault).toBe(true);
      
      const defaultDepth = getDefaultPresentation('depth');
      expect(defaultDepth).toBeDefined();
      expect(defaultDepth!.isDefault).toBe(true);
    });

    it('should filter presentations by region correctly', () => {
      const usRegionPresentations = getPresentationsForRegion('depth', 'us');
      const euRegionPresentations = getPresentationsForRegion('depth', 'eu');
      
      // US should include feet, EU should include meters
      const usIds = usRegionPresentations.map(p => p.id);
      const euIds = euRegionPresentations.map(p => p.id);
      
      expect(usIds.some(id => id.includes('ft'))).toBe(true);
      expect(euIds.some(id => id.includes('m_'))).toBe(true);
    });
  });

  describe('Format Pattern Validation', () => {
    it('should have consistent pattern lengths and minWidth', () => {
      Object.values(PRESENTATIONS).forEach(categoryData => {
        categoryData.presentations.forEach(presentation => {
          const { pattern, minWidth } = presentation.formatSpec;
          
          // MinWidth should be reasonable for the pattern
          expect(minWidth).toBeGreaterThan(0);
          expect(minWidth).toBeLessThan(100); // Sanity check
          
          // Pattern should be meaningful
          expect(pattern.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have decimal formats match decimal count', () => {
      Object.values(PRESENTATIONS).forEach(categoryData => {
        categoryData.presentations.forEach(presentation => {
          const { pattern, decimals } = presentation.formatSpec;
          
          if (decimals > 0) {
            expect(pattern).toContain('.');
          } else if (decimals === 0 && !pattern.includes('Description')) {
            expect(pattern).not.toContain('.');
          }
        });
      });
    });
  });

  describe('Conversion Accuracy', () => {
    it('should maintain conversion accuracy for common values', () => {
      // Test speed conversions
      const knotsToMph = findPresentation('speed', 'mph_1');
      const knotsToKmh = findPresentation('speed', 'kmh_1');
      
      expect(knotsToMph!.convert(10)).toBeCloseTo(11.5078, 2);
      expect(knotsToKmh!.convert(10)).toBeCloseTo(18.52, 2);
      
      // Test depth conversions
      const metersToFeet = findPresentation('depth', 'ft_1');
      expect(metersToFeet!.convert(10)).toBeCloseTo(32.8084, 2);
      
      // Test temperature conversions
      const celsiusToFahrenheit = findPresentation('temperature', 'f_1');
      expect(celsiusToFahrenheit!.convert(20)).toBeCloseTo(68, 1);
    });

    it('should have reversible conversions where applicable', () => {
      const presentations = [
        findPresentation('speed', 'mph_1'),
        findPresentation('depth', 'ft_1'),
        findPresentation('temperature', 'f_1')
      ];

      presentations.forEach(presentation => {
        if (presentation) {
          const testValue = 10;
          const converted = presentation.convert(testValue);
          const convertedBack = presentation.convertBack(converted);
          
          expect(convertedBack).toBeCloseTo(testValue, 1);
        }
      });
    });
  });
});