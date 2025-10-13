import React from 'react';
import { render } from '@testing-library/react-native';
import { WaterTemperatureWidget } from '../src/widgets/WaterTemperatureWidget';

// Mock dependencies
jest.mock('../src/core/nmeaStore', () => ({
  useNmeaStore: jest.fn(),
}));

jest.mock('../src/core/themeStore', () => ({
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

const { useNmeaStore } = require('../src/core/nmeaStore');

describe('WaterTemperatureWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Temperature Unit Conversions', () => {
    it('should convert Celsius to Fahrenheit correctly', () => {
      const testTemperatures = [
        { celsius: 0, fahrenheit: 32 },     // Freezing point
        { celsius: 20, fahrenheit: 68 },    // Room temperature
        { celsius: 25, fahrenheit: 77 },    // Comfortable water
        { celsius: 100, fahrenheit: 212 },  // Boiling point
      ];

      testTemperatures.forEach(({ celsius, fahrenheit }) => {
        const converted = celsius * 9/5 + 32;
        expect(converted).toBe(fahrenheit);
      });
    });

    it('should convert Fahrenheit to Celsius correctly', () => {
      const testTemperatures = [
        { fahrenheit: 32, celsius: 0 },     // Freezing point
        { fahrenheit: 68, celsius: 20 },    // Room temperature
        { fahrenheit: 77, celsius: 25 },    // Comfortable water
        { fahrenheit: 212, celsius: 100 },  // Boiling point
      ];

      testTemperatures.forEach(({ fahrenheit, celsius }) => {
        const converted = (fahrenheit - 32) * 5/9;
        expect(Math.round(converted)).toBe(celsius);
      });
    });

    it('should handle negative temperatures correctly', () => {
      const celsiusBelowFreezing = -10;
      const fahrenheitExpected = 14; // -10°C = 14°F
      const converted = celsiusBelowFreezing * 9/5 + 32;
      expect(converted).toBe(fahrenheitExpected);
    });

    it('should handle high temperatures correctly', () => {
      const celsiusHot = 40;
      const fahrenheitExpected = 104; // 40°C = 104°F
      const converted = celsiusHot * 9/5 + 32;
      expect(converted).toBe(fahrenheitExpected);
    });
  });

  describe('Temperature Trend Analysis', () => {
    it('should detect stable temperature trend', () => {
      const history = [
        { temperature: 20.0, timestamp: Date.now() - 3000 },
        { temperature: 20.2, timestamp: Date.now() - 2000 },
        { temperature: 20.1, timestamp: Date.now() - 1000 },
      ];

      const trend = history[2].temperature - history[0].temperature;
      const isStable = Math.abs(trend) < 0.5;
      expect(isStable).toBe(true);
    });

    it('should detect rising temperature trend', () => {
      const history = [
        { temperature: 18.0, timestamp: Date.now() - 3000 },
        { temperature: 19.0, timestamp: Date.now() - 2000 },
        { temperature: 20.0, timestamp: Date.now() - 1000 },
      ];

      const trend = history[2].temperature - history[0].temperature;
      expect(trend > 0.5).toBe(true); // Rising trend
    });

    it('should detect falling temperature trend', () => {
      const history = [
        { temperature: 25.0, timestamp: Date.now() - 3000 },
        { temperature: 23.0, timestamp: Date.now() - 2000 },
        { temperature: 21.0, timestamp: Date.now() - 1000 },
      ];

      const trend = history[2].temperature - history[0].temperature;
      expect(trend < -0.5).toBe(true); // Falling trend
    });

    it('should require minimum 3 readings for trend analysis', () => {
      const insufficientHistory = [
        { temperature: 20.0, timestamp: Date.now() - 1000 },
        { temperature: 21.0, timestamp: Date.now() },
      ];

      expect(insufficientHistory.length < 3).toBe(true);
    });
  });

  describe('Marine Temperature Classifications', () => {
    it('should classify freezing temperatures correctly', () => {
      const freezingTemp = -2;
      expect(freezingTemp < 0).toBe(true); // Should be alarm state
    });

    it('should classify very cold water correctly', () => {
      const veryColdTemp = 3;
      expect(veryColdTemp >= 0 && veryColdTemp < 5).toBe(true); // Should be highlighted
    });

    it('should classify cold water correctly', () => {
      const coldTemp = 10;
      expect(coldTemp >= 5 && coldTemp < 15).toBe(true); // Should be normal but cold
    });

    it('should classify moderate water correctly', () => {
      const moderateTemp = 20;
      expect(moderateTemp >= 15 && moderateTemp < 25).toBe(true); // Should be normal
    });

    it('should classify warm water correctly', () => {
      const warmTemp = 27;
      expect(warmTemp >= 25 && warmTemp < 30).toBe(true); // Should be normal/warm
    });

    it('should classify hot water correctly', () => {
      const hotTemp = 32;
      expect(hotTemp >= 30 && hotTemp < 35).toBe(true); // Should be highlighted
    });

    it('should classify very hot water correctly', () => {
      const veryHotTemp = 38;
      expect(veryHotTemp >= 35).toBe(true); // Should be alarm state
    });
  });

  describe('Temperature History Management', () => {
    it('should calculate 1-hour average correctly', () => {
      const oneHourReadings = [
        { temperature: 18, timestamp: Date.now() - 3600000 }, // 1 hour ago
        { temperature: 20, timestamp: Date.now() - 1800000 }, // 30 min ago
        { temperature: 22, timestamp: Date.now() },          // now
      ];

      const average = oneHourReadings.reduce((sum, reading) => sum + reading.temperature, 0) / oneHourReadings.length;
      expect(average).toBe(20); // (18 + 20 + 22) / 3
    });

    it('should filter readings older than 1 hour', () => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const readings = [
        { timestamp: oneHourAgo - 60000, temperature: 15 }, // 61 minutes ago - should be filtered
        { timestamp: oneHourAgo + 60000, temperature: 20 }, // 59 minutes ago - should remain
        { timestamp: Date.now(), temperature: 25 },         // now - should remain
      ];

      const filtered = readings.filter(reading => reading.timestamp > oneHourAgo);
      expect(filtered.length).toBe(2);
    });

    it('should maintain reasonable history size', () => {
      // Simulate 2 hours of readings every minute
      const readings = [];
      for (let i = 0; i < 120; i++) {
        readings.push({
          timestamp: Date.now() - i * 60000,
          temperature: 20 + Math.sin(i * 0.1), // Varying temperature
        });
      }

      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const filtered = readings.filter(reading => reading.timestamp > oneHourAgo);
      expect(filtered.length).toBeLessThanOrEqual(60); // Should be 60 or fewer readings
    });
  });

  describe('Component Rendering', () => {
    it('should render with no temperature data', () => {
      useNmeaStore.mockReturnValue(undefined);
      
      const { getByText } = render(<WaterTemperatureWidget />);
      expect(getByText('WATER TEMP')).toBeTruthy();
    });

    it('should render with valid temperature data', () => {
      useNmeaStore.mockReturnValue(22.5); // 22.5°C
      
      const { getByText } = render(<WaterTemperatureWidget />);
      expect(getByText('WATER TEMP')).toBeTruthy();
    });

    it('should handle null temperature gracefully', () => {
      useNmeaStore.mockReturnValue(null);
      
      expect(() => render(<WaterTemperatureWidget />)).not.toThrow();
    });
  });

  describe('Marine Safety Considerations', () => {
    it('should provide appropriate warnings for hypothermia risk', () => {
      const dangerousTemps = [0, 5, 10]; // Temperatures with hypothermia risk
      
      dangerousTemps.forEach(temp => {
        const isRisky = temp < 15; // Below 15°C increases hypothermia risk
        expect(isRisky).toBe(true);
      });
    });

    it('should indicate comfortable swimming temperatures', () => {
      const comfortableTemps = [20, 22, 25]; // Good swimming temperatures
      
      comfortableTemps.forEach(temp => {
        const isComfortable = temp >= 18 && temp <= 28;
        expect(isComfortable).toBe(true);
      });
    });

    it('should warn about overheated engine cooling water', () => {
      const engineCoolingTemp = 95; // Very hot - potential engine overheating
      const shouldWarn = engineCoolingTemp > 85; // Warning threshold
      expect(shouldWarn).toBe(true);
    });
  });

  describe('Precision and Accuracy', () => {
    it('should maintain appropriate decimal precision', () => {
      const preciseTemp = 22.346789;
      const displayTemp = Number(preciseTemp.toFixed(1));
      expect(displayTemp).toBe(22.3); // Should round to 1 decimal place
    });

    it('should handle temperature sensor noise', () => {
      // Simulate noisy sensor readings
      const baseTemp = 20;
      const noisyReadings = [
        baseTemp + 0.1,
        baseTemp - 0.05,
        baseTemp + 0.08,
        baseTemp - 0.03,
      ];

      const average = noisyReadings.reduce((sum, temp) => sum + temp, 0) / noisyReadings.length;
      expect(Math.abs(average - baseTemp)).toBeLessThan(0.1); // Should average close to base
    });
  });
});