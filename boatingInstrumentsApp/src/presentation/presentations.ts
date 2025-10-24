/**
 * Data Presentation Definitions
 * 
 * Defines how each data category can be presented to users.
 * Each presentation combines unit conversion + formatting.
 * 
 * Marine-focused with common sailing preferences.
 */

import { DataCategory } from './categories';

export interface PresentationFormat {
  pattern: string;        // Marine format pattern (e.g., "xxx.x", "x Bf (Description)")
  decimals: number;       // Number of decimal places
  minWidth: number;       // Minimum width in characters for layout stability
  testCases: {
    min: number;          // Minimum test value for worst-case measurement
    max: number;          // Maximum test value for worst-case measurement  
    typical: number;      // Typical value for normal measurement
  };
}

export interface Presentation {
  id: string;
  name: string;
  symbol: string;
  description: string;
  
  // Conversion from base unit to display unit
  convert: (baseValue: number) => number;
  
  // Format the converted value for display  
  format: (convertedValue: number) => string;
  
  // Reverse conversion for input/settings
  convertBack: (displayValue: number) => number;
  
  // Enhanced format specification for layout stability
  formatSpec: PresentationFormat;
  
  // UI properties
  isDefault?: boolean;
  isMetric?: boolean;
  isImperial?: boolean;
  isNautical?: boolean;
  
  // Marine region preferences
  preferredInRegion?: ('eu' | 'us' | 'uk' | 'international')[];
}

export interface CategoryPresentations {
  category: DataCategory;
  presentations: Presentation[];
}

// ===== DEPTH PRESENTATIONS =====
const DEPTH_PRESENTATIONS: Presentation[] = [
  {
    id: 'm_1',
    name: 'Meters (1 decimal)',
    symbol: 'm',
    description: 'Metric depth in meters with 1 decimal place',
    convert: (meters) => meters,
    format: (value) => value.toFixed(1),
    convertBack: (display) => display,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 6,
      testCases: { min: 0.1, max: 999.9, typical: 15.5 }
    },
    isDefault: true,
    isMetric: true,
    preferredInRegion: ['eu', 'international']
  },
  {
    id: 'm_0', 
    name: 'Meters (integer)',
    symbol: 'm',
    description: 'Metric depth in meters, whole numbers only',
    convert: (meters) => meters,
    format: (value) => Math.round(value).toString(),
    convertBack: (display) => display,
    formatSpec: {
      pattern: 'xxx',
      decimals: 0,
      minWidth: 3,
      testCases: { min: 1, max: 999, typical: 15 }
    },
    isMetric: true
  },
  {
    id: 'ft_0',
    name: 'Feet (integer)', 
    symbol: 'ft',
    description: 'Imperial depth in feet, whole numbers',
    convert: (meters) => meters * 3.28084,
    format: (value) => Math.round(value).toString(),
    convertBack: (display) => display / 3.28084,
    formatSpec: {
      pattern: 'xxx',
      decimals: 0,
      minWidth: 4,
      testCases: { min: 1, max: 3280, typical: 50 }
    },
    isImperial: true,
    preferredInRegion: ['us']
  },
  {
    id: 'ft_1',
    name: 'Feet (1 decimal)',
    symbol: 'ft', 
    description: 'Imperial depth in feet with 1 decimal place',
    convert: (meters) => meters * 3.28084,
    format: (value) => value.toFixed(1),
    convertBack: (display) => display / 3.28084,
    formatSpec: {
      pattern: 'xxxx.x',
      decimals: 1,
      minWidth: 6,
      testCases: { min: 0.3, max: 3280.8, typical: 50.9 }
    },
    isImperial: true
  },
  {
    id: 'fth_1',
    name: 'Fathoms (1 decimal)',
    symbol: 'fth',
    description: 'Nautical depth in fathoms with 1 decimal place',
    convert: (meters) => meters * 0.546807,
    format: (value) => value.toFixed(1), 
    convertBack: (display) => display / 0.546807,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      testCases: { min: 0.5, max: 546.8, typical: 8.2 }
    },
    isNautical: true,
    preferredInRegion: ['uk']
  }
];

// ===== SPEED PRESENTATIONS =====
const SPEED_PRESENTATIONS: Presentation[] = [
  {
    id: 'kts_1',
    name: 'Knots (1 decimal)',
    symbol: 'kts',
    description: 'Nautical speed in knots with 1 decimal place',
    convert: (knots) => knots, // knots to knots (identity)
    format: (value) => value.toFixed(1),
    convertBack: (display) => display,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      testCases: { min: 0.1, max: 99.9, typical: 6.5 }
    },
    isDefault: true,
    isNautical: true,
    preferredInRegion: ['eu', 'us', 'uk', 'international']
  },
  {
    id: 'kts_0',
    name: 'Knots (integer)',
    symbol: 'kts', 
    description: 'Nautical speed in knots, whole numbers',
    convert: (knots) => knots, // knots to knots (identity)
    format: (value) => Math.round(value).toString(),
    convertBack: (display) => display,
    formatSpec: {
      pattern: 'xx',
      decimals: 0,
      minWidth: 2,
      testCases: { min: 1, max: 99, typical: 7 }
    },
    isNautical: true
  },
  {
    id: 'kmh_1',
    name: 'km/h (1 decimal)',
    symbol: 'km/h',
    description: 'Metric speed in kilometers per hour',
    convert: (knots) => knots * 1.852, // knots to km/h
    format: (value) => value.toFixed(1),
    convertBack: (display) => display / 1.852,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      testCases: { min: 0.2, max: 185.2, typical: 12.0 }
    },
    isMetric: true
  },
  {
    id: 'mph_1',
    name: 'mph (1 decimal)',
    symbol: 'mph',
    description: 'Imperial speed in miles per hour',
    convert: (knots) => knots * 1.15078, // knots to mph
    format: (value) => value.toFixed(1),
    convertBack: (display) => display / 1.15078,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      testCases: { min: 0.1, max: 114.8, typical: 7.5 }
    },
    isImperial: true
  }
];

// ===== WIND PRESENTATIONS =====  
const WIND_PRESENTATIONS: Presentation[] = [
  {
    id: 'wind_kts_1',
    name: 'Knots (1 decimal)',
    symbol: 'kts',
    description: 'Wind speed in knots with 1 decimal place',
    convert: (knots) => knots, // knots to knots (identity)
    format: (value) => value.toFixed(1),
    convertBack: (display) => display,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      testCases: { min: 0.0, max: 80.0, typical: 15.5 }
    },
    isDefault: true,
    isNautical: true,
    preferredInRegion: ['eu', 'us', 'uk', 'international']
  },
  {
    id: 'bf_desc',
    name: 'Beaufort with description',
    symbol: 'Bf',
    description: 'Beaufort scale with wind description',
    convert: (knots) => {
      // Convert knots to Beaufort scale
      if (knots < 1) return 0;
      if (knots < 4) return 1;
      if (knots < 7) return 2;
      if (knots < 11) return 3;
      if (knots < 16) return 4;
      if (knots < 22) return 5;
      if (knots < 28) return 6;
      if (knots < 34) return 7;
      if (knots < 41) return 8;
      if (knots < 48) return 9;
      if (knots < 56) return 10;
      if (knots < 64) return 11;
      return 12;
    },
    format: (bf) => {
      const descriptions = [
        'Calm', 'Light Air', 'Light Breeze', 'Gentle Breeze',
        'Moderate Breeze', 'Fresh Breeze', 'Strong Breeze', 'Near Gale',
        'Gale', 'Strong Gale', 'Storm', 'Violent Storm', 'Hurricane'
      ];
      return `${Math.round(bf)} Bf (${descriptions[Math.round(bf)] || 'Extreme'})`;
    },
    convertBack: (bf) => {
      // Rough conversion from Beaufort back to knots
      const bfToKnots = [0.5, 2, 5, 9, 13, 19, 25, 31, 38, 46, 54, 63, 72];
      return bfToKnots[Math.round(bf)] || 0;
    },
    formatSpec: {
      pattern: 'x Bf (Description)',
      decimals: 0,
      minWidth: 22,
      testCases: { min: 0, max: 12, typical: 4 }
    },
    isNautical: true,
    preferredInRegion: ['uk']
  },
  {
    id: 'bf_0',
    name: 'Beaufort scale',
    symbol: 'Bf',
    description: 'Beaufort scale number only',
    convert: (knots) => {
      // Convert knots to Beaufort scale
      if (knots < 1) return 0;
      if (knots < 4) return 1;
      if (knots < 7) return 2;
      if (knots < 11) return 3;
      if (knots < 16) return 4;
      if (knots < 22) return 5;
      if (knots < 28) return 6;
      if (knots < 34) return 7;
      if (knots < 41) return 8;
      if (knots < 48) return 9;
      if (knots < 56) return 10;
      if (knots < 64) return 11;
      return 12;
    },
    format: (bf) => Math.round(bf).toString(),
    convertBack: (bf) => {
      const bfToKnots = [0.5, 2, 5, 9, 13, 19, 25, 31, 38, 46, 54, 63, 72];
      return bfToKnots[Math.round(bf)] || 0;
    },
    formatSpec: {
      pattern: 'xx',
      decimals: 0,
      minWidth: 2,
      testCases: { min: 0, max: 12, typical: 4 }
    },
    isNautical: true
  },
  {
    id: 'kmh_0',
    name: 'km/h (integer)',
    symbol: 'km/h',
    description: 'Wind speed in kilometers per hour',
    convert: (knots) => knots * 1.852, // knots to km/h
    format: (value) => Math.round(value).toString(),
    convertBack: (display) => display / 1.852,
    formatSpec: {
      pattern: 'xxx',
      decimals: 0,
      minWidth: 3,
      testCases: { min: 0, max: 148, typical: 29 }
    },
    isMetric: true
  }
];

// ===== TEMPERATURE PRESENTATIONS =====
const TEMPERATURE_PRESENTATIONS: Presentation[] = [
  {
    id: 'c_1',
    name: 'Celsius (1 decimal)',
    symbol: '°C',
    description: 'Temperature in Celsius with 1 decimal place',
    convert: (celsius) => celsius,
    format: (value) => value.toFixed(1),
    convertBack: (display) => display,
    formatSpec: {
      pattern: 'xx.x',
      decimals: 1,
      minWidth: 4,
      testCases: { min: -40.0, max: 50.0, typical: 22.5 }
    },
    isDefault: true,
    isMetric: true,
    preferredInRegion: ['eu', 'uk', 'international']
  },
  {
    id: 'c_0',
    name: 'Celsius (integer)',
    symbol: '°C',
    description: 'Temperature in Celsius, whole degrees',
    convert: (celsius) => celsius,
    format: (value) => Math.round(value).toString(),
    convertBack: (display) => display,
    formatSpec: {
      pattern: 'xx',
      decimals: 0,
      minWidth: 3,
      testCases: { min: -40, max: 50, typical: 23 }
    },
    isMetric: true
  },
  {
    id: 'f_1',
    name: 'Fahrenheit (1 decimal)',
    symbol: '°F',
    description: 'Temperature in Fahrenheit with 1 decimal place',
    convert: (celsius) => celsius * 9/5 + 32,
    format: (value) => value.toFixed(1),
    convertBack: (display) => (display - 32) * 5/9,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      testCases: { min: -40.0, max: 122.0, typical: 72.5 }
    },
    isImperial: true,
    preferredInRegion: ['us']
  },
  {
    id: 'f_0',
    name: 'Fahrenheit (integer)',
    symbol: '°F',
    description: 'Temperature in Fahrenheit, whole degrees',
    convert: (celsius) => celsius * 9/5 + 32,
    format: (value) => Math.round(value).toString(),
    convertBack: (display) => (display - 32) * 5/9,
    formatSpec: {
      pattern: 'xxx',
      decimals: 0,
      minWidth: 3,
      testCases: { min: -40, max: 122, typical: 73 }
    },
    isImperial: true
  }
];

// ===== PRESENTATION REGISTRY =====
export const PRESENTATIONS: Record<DataCategory, CategoryPresentations> = {
  depth: {
    category: 'depth',
    presentations: DEPTH_PRESENTATIONS
  },
  speed: {
    category: 'speed', 
    presentations: SPEED_PRESENTATIONS
  },
  wind: {
    category: 'wind',
    presentations: WIND_PRESENTATIONS
  },
  temperature: {
    category: 'temperature',
    presentations: TEMPERATURE_PRESENTATIONS
  },
  
  // Placeholder for other categories - will implement as needed
  pressure: { category: 'pressure', presentations: [] },
  angle: { category: 'angle', presentations: [] },
  coordinates: { category: 'coordinates', presentations: [] },
  voltage: { category: 'voltage', presentations: [] },
  current: { category: 'current', presentations: [] },
  volume: { category: 'volume', presentations: [] },
  time: { category: 'time', presentations: [] },
  distance: { category: 'distance', presentations: [] }
};

// ===== HELPER FUNCTIONS =====

/**
 * Get all available presentations for a data category
 */
export function getPresentationsForCategory(category: DataCategory): Presentation[] {
  return PRESENTATIONS[category]?.presentations || [];
}

/**
 * Get default presentation for a category
 */
export function getDefaultPresentation(category: DataCategory): Presentation | undefined {
  const presentations = getPresentationsForCategory(category);
  return presentations.find(p => p.isDefault) || presentations[0];
}

/**
 * Find a specific presentation by ID
 */
export function findPresentation(category: DataCategory, presentationId: string): Presentation | undefined {
  const presentations = getPresentationsForCategory(category);
  return presentations.find(p => p.id === presentationId);
}

/**
 * Get presentations suitable for a specific marine region
 */
export function getPresentationsForRegion(
  category: DataCategory, 
  region: 'eu' | 'us' | 'uk' | 'international'
): Presentation[] {
  const presentations = getPresentationsForCategory(category);
  return presentations.filter(p => 
    !p.preferredInRegion || p.preferredInRegion.includes(region)
  );
}
