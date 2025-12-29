// NMEA Data Fixtures for Testing
// Comprehensive test data for all marine instrument types

import type { NmeaData, DataQuality, DataQualityMetrics } from '../../types';

export const sampleNmeaData: NmeaData = {
  // GPS Navigation
  latitude: 37.7749,
  longitude: -122.4194,
  altitude: 15.2,
  speed: 8.5, // knots
  magneticHeading: 275.3,
  course: 273.1,

  // Wind Data
  windDirection: 185.0,
  windSpeed: 12.3,
  apparentWindDirection: 25.7,

  // Engine Data
  engineRpm: 2450,
  engineTemperature: 87.5,
  fuelLevel: 75.5,

  // Environmental
  depth: 42.8,
  waterTemperature: 18.3,
  airTemperature: 22.1,
  barometricPressure: 1013.25,
  humidity: 68.5,

  // Electrical
  batteryVoltage: 12.6,

  // Autopilot
  autopilotStatus: 'standby',
  autopilotMode: 'compass',
  autopilotHeading: 275.0,

  // System
  timestamp: Date.now(),
};

export const staleNmeaData: NmeaData = {
  ...sampleNmeaData,
  timestamp: Date.now() - 15000, // 15 seconds old
};

export const incompleteNmeaData: Partial<NmeaData> = {
  latitude: 37.7749,
  longitude: -122.4194,
  speed: 8.5,
  timestamp: Date.now(),
};

export const invalidNmeaData: NmeaData = {
  ...sampleNmeaData,
  latitude: 999.0, // Invalid latitude
  longitude: -999.0, // Invalid longitude
  speed: -5.0, // Invalid negative speed
  depth: -10.0, // Invalid negative depth
  windSpeed: 200.0, // Unrealistic wind speed
};

export const emergencyNmeaData: NmeaData = {
  ...sampleNmeaData,
  depth: 2.1, // Shallow water
  windSpeed: 45.0, // High wind
  batteryVoltage: 10.8, // Low battery
  engineTemperature: 105.0, // High engine temp
  autopilotStatus: 'alarm',
};

export const qualityMetricsExcellent: DataQualityMetrics = {
  accuracy: 98,
  completeness: 95,
  freshness: 500,
  consistency: 92,
  validity: true,
  source: 'nmea-bridge',
  timestamp: Date.now(),
};

export const qualityMetricsGood: DataQualityMetrics = {
  accuracy: 88,
  completeness: 85,
  freshness: 2000,
  consistency: 87,
  validity: true,
  source: 'nmea-bridge',
  timestamp: Date.now(),
};

export const qualityMetricsPoor: DataQualityMetrics = {
  accuracy: 65,
  completeness: 45,
  freshness: 8000,
  consistency: 60,
  validity: false,
  source: 'nmea-bridge',
  timestamp: Date.now(),
};

export const autopilotTestData = {
  standby: {
    ...sampleNmeaData,
    autopilotStatus: 'standby' as const,
    autopilotMode: 'compass' as const,
    rudderAngle: 0,
  },
  active: {
    ...sampleNmeaData,
    autopilotStatus: 'active' as const,
    autopilotMode: 'compass' as const,
    rudderAngle: -1.2,
    setHeading: 275.0,
  },
  alarm: {
    ...sampleNmeaData,
    autopilotStatus: 'alarm' as const,
    autopilotMode: 'compass' as const,
    rudderAngle: 15.0, // Large rudder angle indicating problem
  },
};

export const weatherTestData = {
  calm: {
    ...sampleNmeaData,
    windSpeed: 3.2,
    windDirection: 180,
    barometricPressure: 1020.5,
  },
  moderate: {
    ...sampleNmeaData,
    windSpeed: 18.5,
    windDirection: 225,
    barometricPressure: 1015.3,
  },
  rough: {
    ...sampleNmeaData,
    windSpeed: 35.2,
    windDirection: 270,
    barometricPressure: 995.8,
  },
};

export const navigationTestData = {
  harbor: {
    ...sampleNmeaData,
    speed: 3.2,
    depth: 15.6,
    latitude: 37.808,
    longitude: -122.4177, // San Francisco Bay
  },
  coastal: {
    ...sampleNmeaData,
    speed: 12.8,
    depth: 85.3,
    latitude: 37.7,
    longitude: -122.5,
  },
  offshore: {
    ...sampleNmeaData,
    speed: 18.5,
    depth: 350.7,
    latitude: 37.5,
    longitude: -123.0,
  },
};

// Helper function to create test data with specific values
export function createTestNmeaData(overrides: Partial<NmeaData> = {}): NmeaData {
  return {
    ...sampleNmeaData,
    ...overrides,
    timestamp: Date.now(),
  };
}

// Helper function to create data quality metrics
export function createTestQualityMetrics(quality: DataQuality): DataQualityMetrics {
  const baseMetrics = {
    source: 'nmea-bridge' as const,
    timestamp: Date.now(),
  };

  switch (quality) {
    case 'excellent':
      return { ...qualityMetricsExcellent, ...baseMetrics };
    case 'good':
      return { ...qualityMetricsGood, ...baseMetrics };
    case 'fair':
      return {
        accuracy: 75,
        completeness: 70,
        freshness: 4000,
        consistency: 72,
        validity: true,
        ...baseMetrics,
      };
    case 'poor':
      return { ...qualityMetricsPoor, ...baseMetrics };
    case 'invalid':
      return {
        accuracy: 30,
        completeness: 20,
        freshness: 15000,
        consistency: 25,
        validity: false,
        ...baseMetrics,
      };
    default:
      return { ...qualityMetricsGood, ...baseMetrics };
  }
}

// Time-series data for testing performance and updates
export function generateTimeSeriesData(
  baseData: NmeaData = sampleNmeaData,
  count: number = 10,
  intervalMs: number = 1000,
): NmeaData[] {
  const series: NmeaData[] = [];
  const startTime = Date.now() - count * intervalMs;

  for (let i = 0; i < count; i++) {
    const timestamp = startTime + i * intervalMs;
    const variation = Math.sin(i * 0.5) * 0.1; // Small variation

    series.push({
      ...baseData,
      timestamp,
      speed: Math.max(0, (baseData.speed || 0) + variation * 2),
      magneticHeading: ((baseData.magneticHeading || 0) + variation * 5) % 360,
      windSpeed: Math.max(0, (baseData.windSpeed || 0) + variation * 3),
      depth: Math.max(0, (baseData.depth || 0) + variation * 1),
    });
  }

  return series;
}
