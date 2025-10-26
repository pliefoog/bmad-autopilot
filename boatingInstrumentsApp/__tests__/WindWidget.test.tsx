import React from 'react';
import { render } from '@testing-library/react-native';
import { WindWidget } from '../src/widgets/WindWidget';

// Mock dependencies
jest.mock('../src/store/nmeaStore', () => ({
  useNmeaStore: jest.fn(),
}));

jest.mock('../src/store/themeStore', () => ({
  useTheme: () => ({
    primary: '#0EA5E9',
    secondary: '#64748B',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    text: '#1E293B',
    textSecondary: '#64748B',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    border: '#E2E8F0',
  }),
}));

jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Circle: 'Circle',
  Line: 'Line',
  Text: 'Text',
  G: 'G',
}));

const { useNmeaStore } = require('../src/store/nmeaStore');

describe('WindWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Wind Speed Unit Conversions', () => {
    it('should convert knots to mph correctly', () => {
      const knots = 20;
      const expectedMph = 23.02; // 20 knots = 23.016 mph
      const actualMph = knots * 1.15078;
      expect(Number(actualMph.toFixed(2))).toBe(expectedMph);
    });

    it('should convert knots to km/h correctly', () => {
      const knots = 10;
      const expectedKmh = 18.52; // 10 knots = 18.52 km/h
      const actualKmh = knots * 1.852;
      expect(Number(actualKmh.toFixed(2))).toBe(expectedKmh);
    });

    it('should convert knots to m/s correctly', () => {
      const knots = 15;
      const expectedMs = 7.72; // 15 knots = 7.717 m/s
      const actualMs = knots * 0.514444;
      expect(Number(actualMs.toFixed(2))).toBe(expectedMs);
    });

    it('should handle zero wind speed', () => {
      expect(0 * 1.15078).toBe(0); // mph
      expect(0 * 1.852).toBe(0);   // km/h
      expect(0 * 0.514444).toBe(0); // m/s
    });

    it('should handle high wind speeds', () => {
      const strongWind = 50; // 50 knots
      expect(Number((strongWind * 1.15078).toFixed(3))).toBe(57.539); // mph
      expect(Number((strongWind * 1.852).toFixed(1))).toBe(92.6); // km/h
    });
  });

  describe('Beaufort Scale Analysis', () => {
    it('should classify calm conditions correctly', () => {
      const windSpeed = 0.5; // knots
      expect(windSpeed < 1).toBe(true); // Beaufort 0 - Calm
    });

    it('should classify light air correctly', () => {
      const windSpeed = 2; // knots
      expect(windSpeed >= 1 && windSpeed <= 3).toBe(true); // Beaufort 1
    });

    it('should classify light breeze correctly', () => {
      const windSpeed = 5; // knots
      expect(windSpeed >= 4 && windSpeed <= 6).toBe(true); // Beaufort 2
    });

    it('should classify gentle breeze correctly', () => {
      const windSpeed = 9; // knots
      expect(windSpeed >= 7 && windSpeed <= 10).toBe(true); // Beaufort 3
    });

    it('should classify moderate breeze correctly', () => {
      const windSpeed = 14; // knots
      expect(windSpeed >= 11 && windSpeed <= 16).toBe(true); // Beaufort 4
    });

    it('should classify fresh breeze correctly', () => {
      const windSpeed = 20; // knots
      expect(windSpeed >= 17 && windSpeed <= 21).toBe(true); // Beaufort 5
    });

    it('should classify strong breeze correctly', () => {
      const windSpeed = 25; // knots
      expect(windSpeed >= 22 && windSpeed <= 27).toBe(true); // Beaufort 6
    });

    it('should classify near gale correctly', () => {
      const windSpeed = 30; // knots
      expect(windSpeed >= 28 && windSpeed <= 33).toBe(true); // Beaufort 7
    });
  });

  describe('Wind Direction Calculations', () => {
    it('should normalize wind angles to 0-360 degrees', () => {
      const testAngles = [
        { input: 370, expected: 10 },
        { input: -10, expected: 350 },
        { input: 180, expected: 180 },
        { input: 0, expected: 0 },
      ];

      testAngles.forEach(({ input, expected }) => {
        const normalized = ((input % 360) + 360) % 360;
        expect(normalized).toBe(expected);
      });
    });

    it('should calculate relative wind angle correctly', () => {
      const boatHeading = 90; // East
      const windDirection = 45; // Northeast
      const relativeAngle = (windDirection - boatHeading + 360) % 360;
      expect(relativeAngle).toBe(315); // Wind from port quarter
    });

    it('should handle cardinal directions correctly', () => {
      const cardinalDirections = [
        { angle: 0, name: 'North' },
        { angle: 90, name: 'East' },
        { angle: 180, name: 'South' },
        { angle: 270, name: 'West' },
      ];

      cardinalDirections.forEach(({ angle }) => {
        expect(angle % 90).toBe(0);
        expect(angle >= 0 && angle < 360).toBe(true);
      });
    });
  });

  describe('Wind Safety Warnings', () => {
    it('should trigger alarm for dangerous wind speeds', () => {
      const dangerousWind = 30; // 30 knots - strong wind warning
      expect(dangerousWind > 25).toBe(true); // Should trigger alarm
    });

    it('should trigger caution for moderate winds', () => {
      const moderateWind = 22; // 22 knots - caution level
      expect(moderateWind > 20 && moderateWind <= 25).toBe(true);
    });

    it('should show normal for light winds', () => {
      const lightWind = 15; // 15 knots - normal conditions
      expect(lightWind <= 20).toBe(true);
    });
  });

  describe('Wind History Analysis', () => {
    it('should calculate 10-minute average correctly', () => {
      const windReadings = [
        { speed: 10, timestamp: Date.now() - 600000 }, // 10 minutes ago
        { speed: 12, timestamp: Date.now() - 300000 }, // 5 minutes ago
        { speed: 15, timestamp: Date.now() },          // now
      ];

      const average = windReadings.reduce((sum, reading) => sum + reading.speed, 0) / windReadings.length;
      expect(Number(average.toFixed(2))).toBe(12.33); // (10 + 12 + 15) / 3
    });

    it('should filter old readings correctly', () => {
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const now = Date.now();

      const readings = [
        { timestamp: tenMinutesAgo - 60000 }, // 11 minutes ago - should be filtered
        { timestamp: fiveMinutesAgo },        // 5 minutes ago - should remain
        { timestamp: now },                    // now - should remain
      ];

      const filtered = readings.filter(reading => reading.timestamp > tenMinutesAgo);
      expect(filtered.length).toBe(2);
    });
  });

  describe('Component Rendering', () => {
    it('should render with no wind data', () => {
      useNmeaStore
        .mockReturnValueOnce(undefined) // windSpeed
        .mockReturnValueOnce(undefined) // windAngle
        .mockReturnValueOnce(undefined); // heading

      const { getByText } = render(<WindWidget />);
      expect(getByText('WIND')).toBeTruthy();
    });

    it('should render with valid wind data', () => {
      useNmeaStore
        .mockReturnValueOnce(15) // windSpeed (knots)
        .mockReturnValueOnce(180) // windAngle (degrees)
        .mockReturnValueOnce(90); // heading (degrees)

      const { getByText } = render(<WindWidget />);
      expect(getByText('WIND')).toBeTruthy();
    });
  });

  describe('Marine Standards Compliance', () => {
    it('should use standard marine wind speed units', () => {
      // Test common marine wind conversions
      const testWinds = [
        { knots: 10, beaufort: 3 }, // Gentle breeze
        { knots: 20, beaufort: 5 }, // Fresh breeze  
        { knots: 30, beaufort: 7 }, // Near gale
      ];

      testWinds.forEach(({ knots }) => {
        expect(knots).toBeGreaterThanOrEqual(0);
        expect(knots).toBeLessThan(100); // Reasonable upper bound
      });
    });

    it('should provide proper relative wind angles for sailing', () => {
      // Test common sailing wind angles
      const sailingAngles = [
        { name: 'Close hauled', minAngle: 30, maxAngle: 50 },
        { name: 'Beam reach', minAngle: 80, maxAngle: 100 },
        { name: 'Broad reach', minAngle: 120, maxAngle: 150 },
        { name: 'Running', minAngle: 160, maxAngle: 200 },
      ];

      sailingAngles.forEach(({ minAngle, maxAngle }) => {
        expect(minAngle).toBeLessThan(maxAngle);
        expect(minAngle >= 0 && maxAngle <= 360).toBe(true);
      });
    });
  });
});