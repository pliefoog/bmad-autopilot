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
  pattern: string; // Marine format pattern (e.g., "xxx.x", "x Bf (Description)")
  decimals: number; // Number of decimal places
  minWidth: number; // Minimum width in characters for layout stability
  layoutRanges: {
    // Renamed from testCases for clarity - used by FontMeasurementService
    min: number; // Minimum test value for worst-case measurement
    max: number; // Maximum test value for worst-case measurement
    typical: number; // Typical value for normal measurement
  };
}

export interface Presentation {
  id: string;
  name: string;
  symbol: string;
  description: string;

  // NEW: Simplified conversion for linear transformations (display = SI * conversionFactor)
  // For identity: conversionFactor = 1, For linear: conversionFactor = number
  // Leave undefined for non-linear conversions (Fahrenheit, Beaufort)
  conversionFactor?: number;

  // Conversion functions (optional - auto-derived from conversionFactor if not provided)
  // Required for non-linear conversions like Fahrenheit, Beaufort
  convert?: (baseValue: number) => number;
  convertBack?: (displayValue: number) => number;

  // Format function (optional - auto-generated from formatSpec.pattern if not provided)
  // Required for custom formats like coordinates with metadata, Beaufort descriptions
  format?: (
    convertedValue: number,
    metadata?: { isLatitude?: boolean; [key: string]: any },
  ) => string;

  // Enhanced format specification for layout stability
  formatSpec: PresentationFormat;

  // UI properties
  isDefault?: boolean;
  // Removed: isMetric, isImperial, isNautical (unused in codebase)

  // Marine region preferences (kept - used by getPresentationsForRegion)
  preferredInRegion?: ('eu' | 'us' | 'uk' | 'international')[];
}

export interface CategoryPresentations {
  category: DataCategory;
  presentations: Presentation[];
}

// ===== UTILITY FUNCTIONS =====

/**
 * Auto-generate format function from formatSpec pattern
 * Handles simple patterns: 'xxx.x' → toFixed(decimals), 'xxx' → Math.round()
 */
function autoGenerateFormat(formatSpec: PresentationFormat): (value: number) => string {
  const { pattern, decimals } = formatSpec;

  // Pattern with decimal point
  if (pattern.includes('.')) {
    return (value: number) => value.toFixed(decimals);
  }

  // Integer pattern
  if (/^x+$/.test(pattern)) {
    return (value: number) => Math.round(value).toString();
  }

  // Percentage pattern
  if (pattern.includes('%')) {
    return (value: number) => `${Math.round(value)}%`;
  }

  // Fallback for unrecognized patterns
  return (value: number) => value.toFixed(decimals);
}

/**
 * Ensure presentation has a format function (use explicit or auto-generate)
 */
export function ensureFormatFunction(
  presentation: Presentation,
): (value: number, metadata?: any) => string {
  if (presentation.format) {
    return presentation.format;
  }
  const autoFormat = autoGenerateFormat(presentation.formatSpec);
  return (value: number) => autoFormat(value);
}

/**
 * Get convert function (use explicit or derive from conversionFactor)
 */
export function getConvertFunction(presentation: Presentation): (baseValue: number) => number {
  if (presentation.convert) {
    return presentation.convert;
  }
  if (presentation.conversionFactor !== undefined) {
    const factor = presentation.conversionFactor;
    return (baseValue: number) => baseValue * factor;
  }
  // Identity conversion as fallback
  return (baseValue: number) => baseValue;
}

/**
 * Get convertBack function (use explicit or derive from conversionFactor)
 */
export function getConvertBackFunction(
  presentation: Presentation,
): (displayValue: number) => number {
  if (presentation.convertBack) {
    return presentation.convertBack;
  }
  if (presentation.conversionFactor !== undefined) {
    const factor = presentation.conversionFactor;
    if (factor === 0) {
      throw new Error(`Invalid conversionFactor: 0 for presentation ${presentation.id}`);
    }
    return (displayValue: number) => displayValue / factor;
  }
  // Identity conversion as fallback
  return (displayValue: number) => displayValue;
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
      testCases: { min: 0.1, max: 999.9, typical: 15.5 },
    },
    isDefault: true,
    isMetric: true,
    preferredInRegion: ['eu', 'international'],
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
      testCases: { min: 1, max: 999, typical: 15 },
    },
    isMetric: true,
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
      testCases: { min: 1, max: 3280, typical: 50 },
    },
    isImperial: true,
    preferredInRegion: ['us'],
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
      testCases: { min: 0.3, max: 3280.8, typical: 50.9 },
    },
    isImperial: true,
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
      testCases: { min: 0.5, max: 546.8, typical: 8.2 },
    },
    isNautical: true,
    preferredInRegion: ['uk'],
  },
];

// ===== SPEED PRESENTATIONS =====
const SPEED_PRESENTATIONS: Presentation[] = [
  {
    id: 'kts_1',
    name: 'Knots (1 decimal)',
    symbol: 'kts',
    description: 'Nautical speed in knots with 1 decimal place',
    convert: (ms) => ms * 1.94384, // m/s to knots
    format: (value) => value.toFixed(1),
    convertBack: (display) => display / 1.94384,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      testCases: { min: 0.1, max: 99.9, typical: 6.5 },
    },
    isDefault: true,
    isNautical: true,
    preferredInRegion: ['eu', 'us', 'uk', 'international'],
  },
  {
    id: 'kts_0',
    name: 'Knots (integer)',
    symbol: 'kts',
    description: 'Nautical speed in knots, whole numbers',
    convert: (ms) => ms * 1.94384, // m/s to knots
    format: (value) => Math.round(value).toString(),
    convertBack: (display) => display / 1.94384,
    formatSpec: {
      pattern: 'xx',
      decimals: 0,
      minWidth: 2,
      testCases: { min: 1, max: 99, typical: 7 },
    },
    isNautical: true,
  },
  {
    id: 'kmh_1',
    name: 'km/h (1 decimal)',
    symbol: 'km/h',
    description: 'Metric speed in kilometers per hour',
    convert: (ms) => ms * 3.6, // m/s to km/h
    format: (value) => value.toFixed(1),
    convertBack: (display) => display / 3.6,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      testCases: { min: 0.2, max: 185.2, typical: 12.0 },
    },
    isMetric: true,
  },
  {
    id: 'mph_1',
    name: 'mph (1 decimal)',
    symbol: 'mph',
    description: 'Imperial speed in miles per hour',
    convert: (ms) => ms * 2.23694, // m/s to mph
    format: (value) => value.toFixed(1),
    convertBack: (display) => display / 2.23694,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      testCases: { min: 0.1, max: 114.8, typical: 7.5 },
    },
    isImperial: true,
  },
];

// ===== WIND PRESENTATIONS =====
const WIND_PRESENTATIONS: Presentation[] = [
  {
    id: 'wind_kts_1',
    name: 'Knots (1 decimal)',
    symbol: 'kt',
    description: 'Wind speed in knots with 1 decimal place',
    convert: (knots) => knots, // knots to knots (identity)
    format: (value) => value.toFixed(1),
    convertBack: (display) => display,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      testCases: { min: 0.0, max: 80.0, typical: 15.5 },
    },
    isDefault: true,
    isNautical: true,
    preferredInRegion: ['eu', 'us', 'uk', 'international'],
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
        'Calm',
        'Light Air',
        'Light Breeze',
        'Gentle Breeze',
        'Moderate Breeze',
        'Fresh Breeze',
        'Strong Breeze',
        'Near Gale',
        'Gale',
        'Strong Gale',
        'Storm',
        'Violent Storm',
        'Hurricane',
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
      testCases: { min: 0, max: 12, typical: 4 },
    },
    isNautical: true,
    preferredInRegion: ['uk'],
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
      testCases: { min: 0, max: 12, typical: 4 },
    },
    isNautical: true,
  },
  {
    id: 'kmh_0',
    name: 'km/h (integer)',
    symbol: 'kmh',
    description: 'Wind speed in kilometers per hour',
    convert: (knots) => knots * 1.852, // knots to km/h
    format: (value) => Math.round(value).toString(),
    convertBack: (display) => display / 1.852,
    formatSpec: {
      pattern: 'xxx',
      decimals: 0,
      minWidth: 3,
      testCases: { min: 0, max: 148, typical: 29 },
    },
    isMetric: true,
  },
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
      testCases: { min: -40.0, max: 50.0, typical: 22.5 },
    },
    isDefault: true,
    isMetric: true,
    preferredInRegion: ['eu', 'uk', 'international'],
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
      testCases: { min: -40, max: 50, typical: 23 },
    },
    isMetric: true,
  },
  {
    id: 'f_1',
    name: 'Fahrenheit (1 decimal)',
    symbol: '°F',
    description: 'Temperature in Fahrenheit with 1 decimal place',
    convert: (celsius) => (celsius * 9) / 5 + 32,
    format: (value) => value.toFixed(1),
    convertBack: (display) => ((display - 32) * 5) / 9,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      testCases: { min: -40.0, max: 122.0, typical: 72.5 },
    },
    isImperial: true,
    preferredInRegion: ['us'],
  },
  {
    id: 'f_0',
    name: 'Fahrenheit (integer)',
    symbol: '°F',
    description: 'Temperature in Fahrenheit, whole degrees',
    convert: (celsius) => (celsius * 9) / 5 + 32,
    format: (value) => Math.round(value).toString(),
    convertBack: (display) => ((display - 32) * 5) / 9,
    formatSpec: {
      pattern: 'xxx',
      decimals: 0,
      minWidth: 3,
      testCases: { min: -40, max: 122, typical: 73 },
    },
    isImperial: true,
  },
];

// ===== ATMOSPHERIC PRESSURE PRESENTATIONS =====
const ATMOSPHERIC_PRESSURE_PRESENTATIONS: Presentation[] = [
  {
    id: 'hpa_1',
    name: 'Hectopascals (1 decimal)',
    symbol: 'hPa',
    description: 'Standard meteorological pressure unit - hPa = mbar',
    convert: (pascals: number) => pascals / 100,
    format: (hpa: number) => hpa.toFixed(1),
    convertBack: (hpa: number) => hpa * 100,
    formatSpec: {
      pattern: 'xxxx.x',
      decimals: 1,
      minWidth: 6,
      testCases: { min: 950.0, max: 1050.0, typical: 1013.2 },
    },
    isDefault: true,
    isMetric: true,
    preferredInRegion: ['eu', 'international', 'uk'],
  },
  {
    id: 'mbar_1',
    name: 'Millibars (1 decimal)',
    symbol: 'mbar',
    description: 'Alternative name for hPa (1 mbar = 1 hPa)',
    convert: (pascals: number) => pascals / 100,
    format: (mbar: number) => mbar.toFixed(1),
    convertBack: (mbar: number) => mbar * 100,
    formatSpec: {
      pattern: 'xxxx.x',
      decimals: 1,
      minWidth: 6,
      testCases: { min: 950.0, max: 1050.0, typical: 1013.2 },
    },
    isMetric: true,
    preferredInRegion: ['international'],
  },
  {
    id: 'bar_3',
    name: 'Bar (3 decimals)',
    symbol: 'bar',
    description: 'Metric pressure in bar - atmospheric range',
    convert: (pascals: number) => pascals / 100000,
    format: (bar: number) => bar.toFixed(3),
    convertBack: (bar: number) => bar * 100000,
    formatSpec: {
      pattern: 'x.xxx',
      decimals: 3,
      minWidth: 5,
      testCases: { min: 0.95, max: 1.05, typical: 1.013 },
    },
    isMetric: true,
    preferredInRegion: ['eu'],
  },
  {
    id: 'inhg_2',
    name: 'Inches Mercury (2 decimals)',
    symbol: 'inHg',
    description: 'Imperial atmospheric pressure',
    convert: (pascals: number) => pascals / 3386.39,
    format: (inhg: number) => inhg.toFixed(2),
    convertBack: (inhg: number) => inhg * 3386.39,
    formatSpec: {
      pattern: 'xx.xx',
      decimals: 2,
      minWidth: 5,
      testCases: { min: 28.0, max: 31.0, typical: 29.92 },
    },
    isImperial: true,
    preferredInRegion: ['us'],
  },
];

// ===== MECHANICAL PRESSURE PRESENTATIONS =====
const MECHANICAL_PRESSURE_PRESENTATIONS: Presentation[] = [
  {
    id: 'bar_1',
    name: 'Bar (1 decimal)',
    symbol: 'bar',
    description: 'Metric mechanical pressure - ideal for engine oil pressure',
    convert: (pascals: number) => pascals / 100000,
    format: (bar: number) => bar.toFixed(1),
    convertBack: (bar: number) => bar * 100000,
    formatSpec: {
      pattern: 'x.x',
      decimals: 1,
      minWidth: 3,
      testCases: { min: 2.0, max: 6.0, typical: 4.0 },
    },
    isDefault: true,
    isMetric: true,
    preferredInRegion: ['eu', 'international'],
  },
  {
    id: 'kpa_0',
    name: 'Kilopascals (integer)',
    symbol: 'kPa',
    description: 'Metric mechanical pressure in kilopascals',
    convert: (pascals: number) => pascals / 1000,
    format: (kpa: number) => Math.round(kpa).toString(),
    convertBack: (kpa: number) => kpa * 1000,
    formatSpec: {
      pattern: 'xxx',
      decimals: 0,
      minWidth: 3,
      testCases: { min: 200, max: 600, typical: 400 },
    },
    isMetric: true,
    preferredInRegion: ['international'],
  },
  {
    id: 'psi_1',
    name: 'PSI (1 decimal)',
    symbol: 'psi',
    description: 'Imperial mechanical pressure - pounds per square inch',
    convert: (pascals: number) => pascals / 6894.76,
    format: (psi: number) => psi.toFixed(1),
    convertBack: (psi: number) => psi * 6894.76,
    formatSpec: {
      pattern: 'xx.x',
      decimals: 1,
      minWidth: 4,
      testCases: { min: 30.0, max: 90.0, typical: 58.0 },
    },
    isDefault: true,
    isImperial: true,
    preferredInRegion: ['us'],
  },
];

// ===== LEGACY PRESSURE PRESENTATIONS (DEPRECATED - for backwards compatibility) =====
const PRESSURE_PRESENTATIONS: Presentation[] = [
  {
    id: 'bar_1',
    name: 'Bar (1 decimal)',
    symbol: 'bar',
    description: 'Metric pressure in bar, 1 decimal place - ideal for engine oil pressure',
    convert: (pascals: number) => pascals / 100000,
    format: (bar: number) => bar.toFixed(1),
    convertBack: (bar: number) => bar * 100000,
    formatSpec: {
      pattern: 'x.x',
      decimals: 1,
      minWidth: 3,
      testCases: { min: 2.0, max: 5.5, typical: 3.4 },
    },
    isDefault: true,
    isMetric: true,
    preferredInRegion: ['eu', 'international'],
  },
  {
    id: 'bar_3',
    name: 'Bar (3 decimals)',
    symbol: 'bar',
    description: 'Metric pressure in bar, 3 decimal places - for atmospheric pressure',
    convert: (pascals: number) => pascals / 100000,
    format: (bar: number) => bar.toFixed(3),
    convertBack: (bar: number) => bar * 100000,
    formatSpec: {
      pattern: 'x.xxx',
      decimals: 3,
      minWidth: 5,
      testCases: { min: 0.95, max: 1.05, typical: 1.013 },
    },
    isMetric: true,
    preferredInRegion: ['eu', 'international'],
  },
  {
    id: 'psi_1',
    name: 'PSI (1 decimal)',
    symbol: 'psi',
    description: 'Imperial pressure in pounds per square inch',
    convert: (pascals: number) => pascals / 6894.76,
    format: (psi: number) => psi.toFixed(1),
    convertBack: (psi: number) => psi * 6894.76,
    formatSpec: {
      pattern: 'xx.x',
      decimals: 1,
      minWidth: 4,
      testCases: { min: 13.8, max: 15.2, typical: 14.7 },
    },
    isImperial: true,
    preferredInRegion: ['us'],
  },
  {
    id: 'inhg_2',
    name: 'Inches Mercury (2 decimals)',
    symbol: 'inHg',
    description: 'Imperial pressure in inches of mercury',
    convert: (pascals: number) => pascals / 3386.39,
    format: (inhg: number) => inhg.toFixed(2),
    convertBack: (inhg: number) => inhg * 3386.39,
    formatSpec: {
      pattern: 'xx.xx',
      decimals: 2,
      minWidth: 5,
      testCases: { min: 28.0, max: 31.0, typical: 29.92 },
    },
    isImperial: true,
    preferredInRegion: ['us', 'uk'],
  },
];

// ===== ANGLE PRESENTATIONS =====
const ANGLE_PRESENTATIONS: Presentation[] = [
  {
    id: 'deg_0',
    name: 'Degrees (integer)',
    symbol: '°',
    description: 'Angle in degrees, integer value',
    convert: (degrees: number) => degrees,
    format: (deg: number) => Math.round(deg).toString(),
    convertBack: (deg: number) => deg,
    formatSpec: {
      pattern: 'xxx',
      decimals: 0,
      minWidth: 3,
      testCases: { min: 0, max: 360, typical: 180 },
    },
    isDefault: true,
    isNautical: true,
    preferredInRegion: ['eu', 'us', 'uk', 'international'],
  },
  {
    id: 'deg_1',
    name: 'Degrees (1 decimal)',
    symbol: '°',
    description: 'Angle in degrees, 1 decimal place',
    convert: (degrees: number) => degrees,
    format: (deg: number) => deg.toFixed(1),
    convertBack: (deg: number) => deg,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      testCases: { min: 0.0, max: 360.0, typical: 180.5 },
    },
    isNautical: true,
    preferredInRegion: ['international'],
  },
];

// ===== COORDINATES PRESENTATIONS =====
const COORDINATES_PRESENTATIONS: Presentation[] = [
  {
    id: 'dd_6',
    name: 'Decimal Degrees (6 decimals)',
    symbol: 'DD',
    description: 'Decimal degrees with 6 decimal places',
    convert: (degrees: number) => degrees,
    format: (deg: number, metadata?: { isLatitude?: boolean }) => {
      const absValue = Math.abs(deg);
      if (metadata?.isLatitude !== undefined) {
        const direction =
          deg >= 0 ? (metadata.isLatitude ? 'N' : 'E') : metadata.isLatitude ? 'S' : 'W';
        return `${absValue.toFixed(6)}° ${direction}`;
      }
      return deg.toFixed(6); // Fallback without hemisphere
    },
    convertBack: (deg: number) => deg,
    formatSpec: {
      pattern: 'xxx.xxxxxx° X',
      decimals: 6,
      minWidth: 14,
      testCases: { min: 0.0, max: 180.0, typical: 73.123456 },
    },
    isDefault: true,
    isNautical: true,
    preferredInRegion: ['international'],
  },
  {
    id: 'ddm_3',
    name: 'Degrees Decimal Minutes (3 decimals)',
    symbol: 'DDM',
    description: 'Degrees and decimal minutes format',
    convert: (degrees: number) => degrees,
    format: (deg: number, metadata?: { isLatitude?: boolean }) => {
      const absValue = Math.abs(deg);
      const d = Math.floor(absValue);
      const m = (absValue - d) * 60;
      const baseFormat = `${d}° ${m.toFixed(3).padStart(6, '0')}′`;

      if (metadata?.isLatitude !== undefined) {
        const direction =
          deg >= 0 ? (metadata.isLatitude ? 'N' : 'E') : metadata.isLatitude ? 'S' : 'W';
        return `${baseFormat} ${direction}`;
      }
      return deg < 0 ? `-${baseFormat}` : baseFormat;
    },
    convertBack: (deg: number) => deg,
    formatSpec: {
      pattern: 'xxx° xx.xxx′ X',
      decimals: 3,
      minWidth: 15,
      testCases: { min: 0, max: 180, typical: 73.5 },
    },
    isNautical: true,
    preferredInRegion: ['eu', 'us', 'uk'],
  },
  {
    id: 'dms_1',
    name: 'Degrees Minutes Seconds (1 decimal)',
    symbol: 'DMS',
    description: 'Degrees, minutes, and seconds format',
    convert: (degrees: number) => degrees,
    format: (deg: number, metadata?: { isLatitude?: boolean }) => {
      const absValue = Math.abs(deg);
      const d = Math.floor(absValue);
      const minTotal = (absValue - d) * 60;
      const m = Math.floor(minTotal);
      const s = (minTotal - m) * 60;
      // Compact format with minimal spacing
      const baseFormat = `${d}°${m.toString().padStart(2, '0')}′${s.toFixed(1).padStart(4, '0')}″`;

      if (metadata?.isLatitude !== undefined) {
        const direction =
          deg >= 0 ? (metadata.isLatitude ? 'N' : 'E') : metadata.isLatitude ? 'S' : 'W';
        return `${baseFormat}\u2009${direction}`; // Thin space (U+2009) for compact but readable separation
      }
      return deg < 0 ? `-${baseFormat}` : baseFormat;
    },
    convertBack: (deg: number) => deg,
    formatSpec: {
      pattern: `xxx°xx′xx.x″ X`,
      decimals: 1,
      minWidth: 15,
      testCases: { min: 0, max: 180, typical: 73.5 },
    },
    isNautical: true,
    preferredInRegion: ['uk', 'international'],
  },
  {
    id: 'utm',
    name: 'UTM (Placeholder)',
    symbol: 'UTM',
    description: 'Universal Transverse Mercator - placeholder implementation',
    convert: (degrees: number) => degrees,
    format: (deg: number) => {
      // TODO: Implement proper UTM conversion (requires utm library)
      return `UTM ${Math.floor(Math.abs(deg))}`;
    },
    convertBack: (deg: number) => deg,
    formatSpec: {
      pattern: 'UTM xxx',
      decimals: 0,
      minWidth: 8,
      testCases: { min: 0, max: 60, typical: 32 },
    },
    isNautical: false,
    preferredInRegion: ['international'],
  },
];

// ===== VOLTAGE PRESENTATIONS =====
const VOLTAGE_PRESENTATIONS: Presentation[] = [
  {
    id: 'v_2',
    name: 'Volts (2 decimals)',
    symbol: 'V',
    description: 'Electrical voltage in volts, 2 decimal places',
    convert: (volts: number) => volts,
    format: (v: number) => v.toFixed(2),
    convertBack: (v: number) => v,
    formatSpec: {
      pattern: 'xx.xx',
      decimals: 2,
      minWidth: 5,
      testCases: { min: 10.5, max: 14.8, typical: 12.6 },
    },
    isDefault: true,
    isMetric: true,
    preferredInRegion: ['eu', 'us', 'uk', 'international'],
  },
  {
    id: 'v_1',
    name: 'Volts (1 decimal)',
    symbol: 'V',
    description: 'Electrical voltage in volts, 1 decimal place',
    convert: (volts: number) => volts,
    format: (v: number) => v.toFixed(1),
    convertBack: (v: number) => v,
    formatSpec: {
      pattern: 'xx.x',
      decimals: 1,
      minWidth: 4,
      testCases: { min: 10.5, max: 14.8, typical: 12.6 },
    },
    isMetric: true,
    preferredInRegion: ['international'],
  },
];

// ===== CURRENT PRESENTATIONS =====
const CURRENT_PRESENTATIONS: Presentation[] = [
  {
    id: 'a_2',
    name: 'Amperes (2 decimals)',
    symbol: 'A',
    description: 'Electrical current in amperes, 2 decimal places',
    convert: (amperes: number) => amperes,
    format: (a: number) => a.toFixed(2),
    convertBack: (a: number) => a,
    formatSpec: {
      pattern: 'xxx.xx',
      decimals: 2,
      minWidth: 6,
      testCases: { min: 0.0, max: 100.0, typical: 5.25 },
    },
    isDefault: true,
    isMetric: true,
    preferredInRegion: ['eu', 'us', 'uk', 'international'],
  },
  {
    id: 'a_1',
    name: 'Amperes (1 decimal)',
    symbol: 'A',
    description: 'Electrical current in amperes, 1 decimal place',
    convert: (amperes: number) => amperes,
    format: (a: number) => a.toFixed(1),
    convertBack: (a: number) => a,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      testCases: { min: 0.0, max: 100.0, typical: 5.2 },
    },
    isMetric: true,
    preferredInRegion: ['international'],
  },
];

// ===== VOLUME PRESENTATIONS =====
const VOLUME_PRESENTATIONS: Presentation[] = [
  {
    id: 'l_0',
    name: 'Liters (integer)',
    symbol: 'L',
    description: 'Volume in liters, integer value',
    convert: (liters: number) => liters,
    format: (l: number) => Math.round(l).toString(),
    convertBack: (l: number) => l,
    formatSpec: {
      pattern: 'xxx',
      decimals: 0,
      minWidth: 3,
      testCases: { min: 0, max: 500, typical: 150 },
    },
    isDefault: true,
    isMetric: true,
    preferredInRegion: ['eu', 'international'],
  },
  {
    id: 'gal_us_1',
    name: 'US Gallons (1 decimal)',
    symbol: 'gal',
    description: 'Volume in US gallons, 1 decimal place',
    convert: (liters: number) => liters / 3.78541,
    format: (gal: number) => gal.toFixed(1),
    convertBack: (gal: number) => gal * 3.78541,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      testCases: { min: 0.0, max: 132.1, typical: 39.6 },
    },
    isImperial: true,
    preferredInRegion: ['us'],
  },
  {
    id: 'gal_uk_1',
    name: 'Imperial Gallons (1 decimal)',
    symbol: 'gal',
    description: 'Volume in imperial gallons, 1 decimal place',
    convert: (liters: number) => liters / 4.54609,
    format: (gal: number) => gal.toFixed(1),
    convertBack: (gal: number) => gal * 4.54609,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      testCases: { min: 0.0, max: 110.0, typical: 33.0 },
    },
    isImperial: true,
    preferredInRegion: ['uk'],
  },
];

// ===== TIME PRESENTATIONS =====
const TIME_PRESENTATIONS: Presentation[] = [
  {
    id: 'h_1',
    name: 'Hours (1 decimal)',
    symbol: 'h',
    description: 'Time in hours, 1 decimal place',
    convert: (hours: number) => hours,
    format: (h: number) => h.toFixed(1),
    convertBack: (h: number) => h,
    formatSpec: {
      pattern: 'xxxx.x',
      decimals: 1,
      minWidth: 6,
      testCases: { min: 0.0, max: 9999.9, typical: 123.5 },
    },
    isDefault: true,
    isMetric: true,
    preferredInRegion: ['eu', 'us', 'uk', 'international'],
  },
  {
    id: 'h_0',
    name: 'Hours (integer)',
    symbol: 'h',
    description: 'Time in hours, integer value',
    convert: (hours: number) => hours,
    format: (h: number) => Math.round(h).toString(),
    convertBack: (h: number) => h,
    formatSpec: {
      pattern: 'xxxx',
      decimals: 0,
      minWidth: 4,
      testCases: { min: 0, max: 9999, typical: 123 },
    },
    isMetric: true,
    preferredInRegion: ['international'],
  },
];

// ===== DISTANCE PRESENTATIONS =====
const DISTANCE_PRESENTATIONS: Presentation[] = [
  {
    id: 'nm_1',
    name: 'Nautical Miles (1 decimal)',
    symbol: 'NM',
    description: 'Distance in nautical miles, 1 decimal place',
    convert: (meters: number) => meters / 1852,
    format: (nm: number) => nm.toFixed(1),
    convertBack: (nm: number) => nm * 1852,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      testCases: { min: 0.0, max: 100.0, typical: 12.5 },
    },
    isDefault: true,
    isNautical: true,
    preferredInRegion: ['eu', 'us', 'uk', 'international'],
  },
  {
    id: 'km_1',
    name: 'Kilometers (1 decimal)',
    symbol: 'km',
    description: 'Distance in kilometers, 1 decimal place',
    convert: (meters: number) => meters / 1000,
    format: (km: number) => km.toFixed(1),
    convertBack: (km: number) => km * 1000,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      testCases: { min: 0.0, max: 185.2, typical: 23.1 },
    },
    isMetric: true,
    preferredInRegion: ['eu'],
  },
  {
    id: 'mi_1',
    name: 'Miles (1 decimal)',
    symbol: 'mi',
    description: 'Distance in statute miles, 1 decimal place',
    convert: (meters: number) => meters / 1609.344,
    format: (mi: number) => mi.toFixed(1),
    convertBack: (mi: number) => mi * 1609.344,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      testCases: { min: 0.0, max: 115.1, typical: 14.3 },
    },
    isImperial: true,
    preferredInRegion: ['us'],
  },
];

// ===== CAPACITY PRESENTATIONS =====
const CAPACITY_PRESENTATIONS: Presentation[] = [
  {
    id: 'ah_0',
    name: 'Amp-hours (integer)',
    symbol: 'Ah',
    description: 'Battery capacity in amp-hours, integer value',
    convert: (ampHours: number) => ampHours,
    format: (ah: number) => Math.round(ah).toString(),
    convertBack: (ah: number) => ah,
    formatSpec: {
      pattern: 'xxx',
      decimals: 0,
      minWidth: 3,
      testCases: { min: 50, max: 800, typical: 200 },
    },
    isDefault: true,
    isMetric: true,
    preferredInRegion: ['eu', 'us', 'uk', 'international'],
  },
  {
    id: 'kwh_1',
    name: 'Kilowatt-hours (1 decimal)',
    symbol: 'kWh',
    description: 'Energy capacity in kilowatt-hours',
    convert: (ampHours: number) => (ampHours * 12) / 1000, // Assuming 12V system
    format: (kwh: number) => kwh.toFixed(1),
    convertBack: (kwh: number) => (kwh * 1000) / 12,
    formatSpec: {
      pattern: 'xx.x',
      decimals: 1,
      minWidth: 4,
      testCases: { min: 0.6, max: 9.6, typical: 2.4 },
    },
    isMetric: true,
    preferredInRegion: ['eu', 'international'],
  },
];

// ===== FLOW RATE PRESENTATIONS =====
const FLOW_RATE_PRESENTATIONS: Presentation[] = [
  {
    id: 'lph_1',
    name: 'Liters/hour (1 decimal)',
    symbol: 'L/h',
    description: 'Flow rate in liters per hour, 1 decimal place',
    convert: (litersPerHour: number) => litersPerHour,
    format: (lph: number) => lph.toFixed(1),
    convertBack: (lph: number) => lph,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      testCases: { min: 0.0, max: 50.0, typical: 8.5 },
    },
    isDefault: true,
    isMetric: true,
    preferredInRegion: ['eu', 'international'],
  },
  {
    id: 'gph_us_1',
    name: 'US Gallons/hour (1 decimal)',
    symbol: 'GPH',
    description: 'Flow rate in US gallons per hour',
    convert: (litersPerHour: number) => litersPerHour / 3.78541,
    format: (gph: number) => gph.toFixed(1),
    convertBack: (gph: number) => gph * 3.78541,
    formatSpec: {
      pattern: 'xx.x',
      decimals: 1,
      minWidth: 4,
      testCases: { min: 0.0, max: 13.2, typical: 2.2 },
    },
    isImperial: true,
    preferredInRegion: ['us'],
  },
  {
    id: 'gph_uk_1',
    name: 'Imperial Gallons/hour (1 decimal)',
    symbol: 'GPH',
    description: 'Flow rate in imperial gallons per hour',
    convert: (litersPerHour: number) => litersPerHour / 4.54609,
    format: (gph: number) => gph.toFixed(1),
    convertBack: (gph: number) => gph * 4.54609,
    formatSpec: {
      pattern: 'xx.x',
      decimals: 1,
      minWidth: 4,
      testCases: { min: 0.0, max: 11.0, typical: 1.9 },
    },
    isImperial: true,
    preferredInRegion: ['uk'],
  },
];

// ===== FREQUENCY PRESENTATIONS =====
const FREQUENCY_PRESENTATIONS: Presentation[] = [
  {
    id: 'hz_1',
    name: 'Hertz (1 decimal)',
    symbol: 'Hz',
    description: 'Frequency in hertz, 1 decimal place',
    convert: (hertz: number) => hertz,
    format: (hz: number) => hz.toFixed(1),
    convertBack: (hz: number) => hz,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      testCases: { min: 45.0, max: 65.0, typical: 60.0 },
    },
    isDefault: true,
    isMetric: true,
    preferredInRegion: ['eu', 'us', 'uk', 'international'],
  },
  {
    id: 'hz_0',
    name: 'Hertz (integer)',
    symbol: 'Hz',
    description: 'Frequency in hertz, integer value',
    convert: (hertz: number) => hertz,
    format: (hz: number) => Math.round(hz).toString(),
    convertBack: (hz: number) => hz,
    formatSpec: {
      pattern: 'xxx',
      decimals: 0,
      minWidth: 3,
      testCases: { min: 45, max: 65, typical: 60 },
    },
    isMetric: true,
    preferredInRegion: ['international'],
  },
];

// ===== POWER PRESENTATIONS =====
const POWER_PRESENTATIONS: Presentation[] = [
  {
    id: 'kw_1',
    name: 'Kilowatts (1 decimal)',
    symbol: 'kW',
    description: 'Power in kilowatts, 1 decimal place',
    convert: (watts: number) => watts / 1000,
    format: (kw: number) => kw.toFixed(1),
    convertBack: (kw: number) => kw * 1000,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      testCases: { min: 0.0, max: 100.0, typical: 22.4 },
    },
    isDefault: true,
    isMetric: true,
    preferredInRegion: ['eu', 'international'],
  },
  {
    id: 'hp_0',
    name: 'Horsepower (integer)',
    symbol: 'HP',
    description: 'Power in horsepower, integer value',
    convert: (watts: number) => watts / 745.7,
    format: (hp: number) => Math.round(hp).toString(),
    convertBack: (hp: number) => hp * 745.7,
    formatSpec: {
      pattern: 'xxx',
      decimals: 0,
      minWidth: 3,
      testCases: { min: 0, max: 134, typical: 30 },
    },
    isImperial: true,
    preferredInRegion: ['us', 'uk'],
  },
  {
    id: 'w_0',
    name: 'Watts (integer)',
    symbol: 'W',
    description: 'Power in watts, integer value',
    convert: (watts: number) => watts,
    format: (w: number) => Math.round(w).toString(),
    convertBack: (w: number) => w,
    formatSpec: {
      pattern: 'xxxxx',
      decimals: 0,
      minWidth: 5,
      testCases: { min: 0, max: 100000, typical: 22400 },
    },
    isMetric: true,
    preferredInRegion: ['international'],
  },
];

// ===== RPM PRESENTATIONS =====
const RPM_PRESENTATIONS: Presentation[] = [
  {
    id: 'rpm_0',
    name: 'RPM (integer)',
    symbol: 'RPM',
    description: 'Rotational speed in revolutions per minute',
    convert: (rpm: number) => rpm,
    format: (r: number) => Math.round(r).toString(),
    convertBack: (r: number) => r,
    formatSpec: {
      pattern: 'xxxx',
      decimals: 0,
      minWidth: 4,
      testCases: { min: 0, max: 6000, typical: 2200 },
    },
    isDefault: true,
    isMetric: true,
    preferredInRegion: ['eu', 'us', 'uk', 'international'],
  },
  {
    id: 'rps_1',
    name: 'Revolutions/second (1 decimal)',
    symbol: 'RPS',
    description: 'Rotational speed in revolutions per second',
    convert: (rpm: number) => rpm / 60,
    format: (rps: number) => rps.toFixed(1),
    convertBack: (rps: number) => rps * 60,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      testCases: { min: 0.0, max: 100.0, typical: 36.7 },
    },
    isMetric: true,
    preferredInRegion: ['international'],
  },
];

const PERCENTAGE_PRESENTATIONS: Presentation[] = [
  {
    id: 'pct_0',
    name: 'Percentage',
    symbol: '%',
    description: 'Percentage display (0-100%)',
    convert: (value: number) => value, // Identity conversion
    format: (value: number) => `${Math.round(value)}%`,
    convertBack: (value: number) => value,
    formatSpec: {
      pattern: 'xxx%',
      decimals: 0,
      minWidth: 4,
      testCases: { min: 0, max: 100, typical: 65 },
    },
    isDefault: true,
    isMetric: true,
    preferredInRegion: ['eu', 'us', 'uk', 'international'],
  },
];

// ===== PRESENTATION REGISTRY =====
export const PRESENTATIONS: Record<DataCategory, CategoryPresentations> = {
  depth: {
    category: 'depth',
    presentations: DEPTH_PRESENTATIONS,
  },
  speed: {
    category: 'speed',
    presentations: SPEED_PRESENTATIONS,
  },
  wind: {
    category: 'wind',
    presentations: WIND_PRESENTATIONS,
  },
  temperature: {
    category: 'temperature',
    presentations: TEMPERATURE_PRESENTATIONS,
  },

  atmospheric_pressure: {
    category: 'atmospheric_pressure',
    presentations: ATMOSPHERIC_PRESSURE_PRESENTATIONS,
  },
  mechanical_pressure: {
    category: 'mechanical_pressure',
    presentations: MECHANICAL_PRESSURE_PRESENTATIONS,
  },
  pressure: {
    category: 'pressure',
    presentations: PRESSURE_PRESENTATIONS,
  },
  angle: {
    category: 'angle',
    presentations: ANGLE_PRESENTATIONS,
  },
  coordinates: {
    category: 'coordinates',
    presentations: COORDINATES_PRESENTATIONS,
  },
  voltage: {
    category: 'voltage',
    presentations: VOLTAGE_PRESENTATIONS,
  },
  current: {
    category: 'current',
    presentations: CURRENT_PRESENTATIONS,
  },
  volume: {
    category: 'volume',
    presentations: VOLUME_PRESENTATIONS,
  },
  time: {
    category: 'time',
    presentations: TIME_PRESENTATIONS,
  },
  distance: {
    category: 'distance',
    presentations: DISTANCE_PRESENTATIONS,
  },
  capacity: {
    category: 'capacity',
    presentations: CAPACITY_PRESENTATIONS,
  },
  flowRate: {
    category: 'flowRate',
    presentations: FLOW_RATE_PRESENTATIONS,
  },
  frequency: {
    category: 'frequency',
    presentations: FREQUENCY_PRESENTATIONS,
  },
  power: {
    category: 'power',
    presentations: POWER_PRESENTATIONS,
  },
  rpm: {
    category: 'rpm',
    presentations: RPM_PRESENTATIONS,
  },
  percentage: {
    category: 'percentage',
    presentations: PERCENTAGE_PRESENTATIONS,
  },
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
  return presentations.find((p) => p.isDefault) || presentations[0];
}

/**
 * Find a specific presentation by ID
 */
export function findPresentation(
  category: DataCategory,
  presentationId: string,
): Presentation | undefined {
  const presentations = getPresentationsForCategory(category);
  return presentations.find((p) => p.id === presentationId);
}

/**
 * Get presentations suitable for a specific marine region
 */
export function getPresentationsForRegion(
  category: DataCategory,
  region: 'eu' | 'us' | 'uk' | 'international',
): Presentation[] {
  const presentations = getPresentationsForCategory(category);
  return presentations.filter((p) => !p.preferredInRegion || p.preferredInRegion.includes(region));
}

/**
 * Get display label for configuration UI showing symbol with pattern
 * Examples: "kts (xxx.x)", "°C (xx.x)", "m (xxx)"
 * Use this in settings/configuration interfaces for clarity
 */
export function getPresentationConfigLabel(presentation: Presentation): string {
  // For units with same symbol but different regions (e.g., US vs Imperial gallons)
  // show the full name to distinguish them
  const hasRegionVariant =
    presentation.name.includes('US ') ||
    presentation.name.includes('Imperial ') ||
    presentation.name.includes('UK ');

  if (hasRegionVariant) {
    // Extract the unit type and region: "US Gallons/hour" -> "GPH (US)"
    const isUS = presentation.name.includes('US ');
    const isUK = presentation.name.includes('UK ') || presentation.name.includes('Imperial ');
    const region = isUS ? 'US' : isUK ? 'UK' : '';
    return region
      ? `${presentation.symbol} (${region}) (${presentation.formatSpec.pattern})`
      : `${presentation.symbol} (${presentation.formatSpec.pattern})`;
  }

  return `${presentation.symbol} (${presentation.formatSpec.pattern})`;
}

/**
 * Get presentation symbol only for widget display
 * Use this in MetricCell unit strings and widget displays
 */
export function getPresentationSymbol(presentation: Presentation): string {
  return presentation.symbol;
}
