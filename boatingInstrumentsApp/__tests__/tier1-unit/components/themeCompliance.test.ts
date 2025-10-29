/**
 * Basic Theme System Tests
 * Tests for Story 2.14: Marine-Compliant Theme System
 */

import * as themeCompliance from "../../../src/utils/themeCompliance";

describe('Marine Theme Compliance Tests', () => {
  describe('RGB Color Analysis', () => {
    test('hexToRgb should convert valid hex colors', () => {
      expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
    });

    test('hexToRgb should handle invalid hex colors', () => {
      expect(hexToRgb('#INVALID')).toBeNull();
      expect(hexToRgb('not-hex')).toBeNull();
    });
  });

  describe('Red-Night Compliance', () => {
    test('pure red colors should be red-night safe', () => {
      const redCompliance = analyzeColorCompliance('#FF0000');
      expect(redCompliance.isRedNightSafe).toBe(true);
      expect(redCompliance.hasBlueGreenLight).toBe(false);
      expect(redCompliance.marineSafetyLevel).toBe('safe');
    });

    test('colors with blue/green should not be red-night safe', () => {
      const blueCompliance = analyzeColorCompliance('#0284C7');
      expect(blueCompliance.isRedNightSafe).toBe(false);
      expect(blueCompliance.hasBlueGreenLight).toBe(true);
      expect(blueCompliance.marineSafetyLevel).toBe('unsafe');
    });

    test('black should be red-night safe', () => {
      const blackCompliance = analyzeColorCompliance('#000000');
      expect(blackCompliance.isRedNightSafe).toBe(true); // Black is safe for red-night (no blue/green)
      expect(blackCompliance.hasBlueGreenLight).toBe(false);
      expect(blackCompliance.marineSafetyLevel).toBe('safe');
    });
  });

  describe('Marine Theme Validation', () => {
    const redNightTheme = {
      primary: '#FF0000',
      background: '#000000', 
      surface: '#330000',
      text: '#FF0000',
      error: '#CC0000'
    };

    const dayTheme = {
      primary: '#0284C7',
      background: '#D1D5DB',
      surface: '#FFFFFF',
      text: '#0F172A',
      success: '#059669'
    };

    test('red-night theme should pass purity test', () => {
      const tests = getThemeComplianceTests();
      const result = tests.redNightPurity(redNightTheme);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    test('day theme should fail red-night purity test', () => {
      const tests = getThemeComplianceTests();
      const result = tests.redNightPurity(dayTheme);
      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    test('themes should meet basic marine standards', () => {
      const tests = getThemeComplianceTests();
      
      const redNightResult = tests.marineStandards(redNightTheme);
      expect(redNightResult.passed).toBe(true);
      
      // Day theme is expected to have blue/green colors for visibility
      const dayResult = tests.marineStandards(dayTheme);
      expect(dayResult.passed).toBe(false); // Day theme intentionally has blue/green colors
      expect(dayResult.violations.length).toBeGreaterThan(0);
    });
  });

  describe('Wavelength Analysis', () => {
    test('should identify red spectrum correctly', () => {
      const redCompliance = analyzeColorCompliance('#FF0000');
      expect(redCompliance.wavelengthRange).toBe('620-750nm (red spectrum)');
    });

    test('should identify blue spectrum correctly', () => {
      const blueCompliance = analyzeColorCompliance('#0000FF');
      expect(blueCompliance.wavelengthRange).toBe('450-495nm (blue spectrum)');
    });

    test('should identify green spectrum correctly', () => {
      const greenCompliance = analyzeColorCompliance('#00FF00');
      expect(greenCompliance.wavelengthRange).toBe('495-570nm (green spectrum)');
    });
  });
});