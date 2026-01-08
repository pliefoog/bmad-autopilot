/**
 * @file presentations.ts
 * @module presentation
 *
 * # Data Presentation Architecture
 *
 * Central registry for unit conversions and formatting across all marine sensor data.
 * Defines how raw SI sensor values are converted and formatted for display to users.
 *
 * ## Architecture Overview
 *
 * This file uses a **streamlined architecture** with three conversion patterns:
 *
 * ### 1. Identity Conversion (conversionFactor: 1)
 * For units that match SI base units:
 * - Celsius (°C), meters (m), volts (V), amperes (A), degrees (°)
 * - Example: `{ conversionFactor: 1 }` → display = SI value
 *
 * ### 2. Linear Conversion (conversionFactor: number)
 * For simple multiplicative conversions:
 * - Feet (3.28084), knots (1.94384), kPa (0.001), hPa (0.01)
 * - Example: `{ conversionFactor: 3.28084 }` → feet = meters × 3.28084
 * - Auto-generates convert/convertBack functions via helper utilities
 *
 * ### 3. Non-Linear Conversion (explicit convert/convertBack)
 * For complex formulas requiring explicit functions:
 * - Fahrenheit: `(C × 9/5) + 32` (affine transformation)
 * - Beaufort scale: conditional lookup table (wind speed ranges)
 * - Example: `{ convert: (c) => (c * 9/5) + 32, convertBack: (f) => ((f - 32) * 5/9) }`
 *
 * ## Format Auto-Generation
 *
 * Format functions are auto-generated from `formatSpec.pattern`:
 * - `'xxx.x'` → `value.toFixed(1)` (1 decimal)
 * - `'xxx'` → `Math.round(value).toString()` (integer)
 * - `'xxx%'` → `value.toFixed(0) + '%'` (percentage)
 *
 * **Custom format functions** are required for:
 * - Coordinates (dd_6, ddm_3, dms_1): metadata parameter for hemisphere direction
 * - Beaufort (bf_desc): lookup table with wind condition descriptions
 *
 * ## Usage Patterns
 *
 * ### In Widgets (Read-Only):
 * ```typescript
 * // Current value with formatting
 * const depthInstance = useNmeaStore(state => state.nmeaData.sensors.depth?.[0]);
 * const metric = depthInstance?.getMetric('depth'); // Returns enriched MetricValue
 * const display = metric?.formattedValue; // "8.2" (pre-formatted, no unit)
 * const unit = metric?.unit; // "ft"
 *
 * // Session statistics (min/max/avg) with formatting
 * const stats = depthInstance?.getFormattedSessionStats('depth');
 * stats?.formattedMinValue;  // "5.2" (formatted in user's units)
 * stats?.formattedMaxValue;  // "8.7" (formatted in user's units)
 * stats?.formattedAvgValue;  // "6.5" (formatted in user's units)
 * stats?.unit;               // "ft"
 * ```
 *
 * ### In Services (Conversion/Formatting):
 * ```typescript
 * import { getConvertFunction, ensureFormatFunction } from './presentations';
 *
 * const presentation = getPresentationById('ft_0');
 * const convertFn = getConvertFunction(presentation); // Auto-derived or explicit
 * const formatFn = ensureFormatFunction(presentation); // Auto-generated or explicit
 *
 * const displayValue = convertFn(2.5); // 8.2 feet
 * const formatted = formatFn(displayValue); // "8"
 * ```
 *
 * ### In Configuration Dialogs:
 * ```typescript
 * const enriched = ThresholdPresentationService.getEnrichedThresholds(
 *   sensor, metric, presentation
 * );
 * // Returns display values with convertFn/formatFn for editing
 * ```
 *
 * ## Migration History (Dec 2024)
 *
 * **Before:** All presentations had explicit convert/format/convertBack functions
 * - 46 presentations with redundant linear conversion code
 * - 450+ lines of duplicate formatting logic
 * - Violated DRY principle
 *
 * **After:** Streamlined architecture with helper utilities
 * - conversionFactor for 46 linear/identity presentations
 * - Auto-generation for format functions
 * - Explicit functions only for 9 non-linear/custom cases
 * - 143 net lines removed
 *
 * ## Non-Linear Presentations (Explicit Functions Required)
 *
 * These 9 presentations cannot use conversionFactor due to complexity:
 *
 * 1. **f_1, f_0** (Fahrenheit): Affine transformation `(C × 9/5) + 32`
 * 2. **bf_desc, bf_0** (Beaufort): Non-linear lookup with conditional ranges
 * 3. **dd_6, ddm_3, dms_1** (Coordinates): Custom format with metadata parameter
 * 4. **utm** (UTM Coordinates): Complex zone calculations
 *
 * ## Backward Compatibility
 *
 * - Helper functions support both old and new formats transparently
 * - Services use `getConvertFunction()` which checks for explicit convert or derives from conversionFactor
 * - Services use `ensureFormatFunction()` which checks for explicit format or auto-generates
 * - No breaking changes for consuming components
 *
 * @see {@link ConversionRegistry} - Service that uses these definitions
 * @see {@link ThresholdPresentationService} - Enrichment for threshold editing
 * @see {@link SensorPresentationCache} - Display caching for widgets
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
 * Auto-generate format function from formatSpec pattern.
 *
 * Parses simple format patterns and returns appropriate formatting function:
 * - `'xxx.x'` → `value.toFixed(1).padStart(5)` (1 decimal, right-aligned in minWidth)
 * - `'xxx'` → `Math.round(value).toString().padStart(3)` (integer, right-aligned)
 * - `'xxx%'` → `value.toFixed(0) + '%'` (percentage with symbol)
 *
 * **CRITICAL:** Uses minWidth for consistent visual alignment. Numbers are padded with
 * leading spaces so "10.0" occupies same space as "123.4" for layout stability.
 *
 * Used by `ensureFormatFunction()` when presentation doesn't provide explicit format.
 *
 * @param formatSpec - Presentation format specification with pattern and decimals
 * @returns Format function that converts number to formatted string with padding
 *
 * @example
 * ```typescript
 * const spec = { pattern: 'xxx.x', decimals: 1, minWidth: 5, layoutRanges: {...} };
 * const format = autoGenerateFormat(spec);
 * format(12.3);  // "12.3" (width 4, padded to 5: " 12.3")
 * format(123.4); // "123.4" (width 5)
 * format(10.0);  // "10.0" (trailing zero preserved, padded: " 10.0")
 * ```
 *
 * @internal Not exported - used internally by ensureFormatFunction
 */
function autoGenerateFormat(formatSpec: PresentationFormat): (value: number) => string {
  const { pattern, decimals, minWidth } = formatSpec;

  // Pattern with decimal point - preserve trailing zeros and pad to minWidth
  if (pattern.includes('.')) {
    return (value: number) => value.toFixed(decimals).padStart(minWidth, ' ');
  }

  // Integer pattern - pad to minWidth for alignment
  if (/^x+$/.test(pattern)) {
    return (value: number) => Math.round(value).toString().padStart(minWidth, ' ');
  }

  // Percentage pattern - no padding (includes % symbol)
  if (pattern.includes('%')) {
    return (value: number) => `${Math.round(value)}%`;
  }

  // Fallback for unrecognized patterns - use toFixed with padding
  return (value: number) => value.toFixed(decimals).padStart(minWidth, ' ');
}

/**
 * Ensure presentation has a format function (explicit or auto-generated).
 *
 * Returns the presentation's explicit format function if provided,
 * otherwise auto-generates one from formatSpec.pattern.
 *
 * **Services should always use this** instead of accessing presentation.format directly.
 *
 * @param presentation - Presentation definition
 * @returns Format function (explicit or auto-generated)
 *
 * @example
 * ```typescript
 * const presentation = getPresentationById('ft_0');
 * const formatFn = ensureFormatFunction(presentation);
 * formatFn(8.2); // "8"
 * ```
 *
 * @see {@link autoGenerateFormat} - Used internally for auto-generation
 * @see {@link ConversionRegistry.format} - Primary consumer
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
 * Get conversion function (explicit or auto-derived from conversionFactor).
 *
 * Returns SI → display conversion function. Checks in order:
 * 1. Explicit presentation.convert (for non-linear: Fahrenheit, Beaufort)
 * 2. Auto-derived from conversionFactor: `display = SI × factor`
 * 3. Identity function (returns value unchanged)
 *
 * **Services should always use this** instead of accessing presentation.convert directly.
 *
 * @param presentation - Presentation definition
 * @returns Convert function (explicit or auto-derived)
 *
 * @example
 * ```typescript
 * const presentation = getPresentationById('ft_0'); // conversionFactor: 3.28084
 * const convertFn = getConvertFunction(presentation);
 * convertFn(2.5); // 8.2021 feet
 * ```
 *
 * @see {@link getConvertBackFunction} - Inverse conversion (display → SI)
 * @see {@link ConversionRegistry.convertToDisplay} - Primary consumer
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
 * Get inverse conversion function (explicit or auto-derived from conversionFactor).
 *
 * Returns display → SI conversion function. Checks in order:
 * 1. Explicit presentation.convertBack (for non-linear: Fahrenheit, Beaufort)
 * 2. Auto-derived from conversionFactor: `SI = display ÷ factor`
 * 3. Identity function (returns value unchanged)
 *
 * **Throws error** if conversionFactor is 0 (would cause division by zero).
 *
 * **Services should always use this** instead of accessing presentation.convertBack directly.
 *
 * @param presentation - Presentation definition
 * @returns Inverse convert function (explicit or auto-derived)
 * @throws {Error} If conversionFactor is 0
 *
 * @example
 * ```typescript
 * const presentation = getPresentationById('ft_0'); // conversionFactor: 3.28084
 * const convertBackFn = getConvertBackFunction(presentation);
 * convertBackFn(8.2); // 2.499... meters
 * ```
 *
 * @see {@link getConvertFunction} - Forward conversion (SI → display)
 * @see {@link ConversionRegistry.convertToSI} - Primary consumer
 * @see {@link ThresholdPresentationService} - Used for threshold editing
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
    conversionFactor: 1,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 6,
      layoutRanges: { min: 0.1, max: 999.9, typical: 15.5 },
    },
    isDefault: true,
    preferredInRegion: ['eu', 'international'],
  },
  {
    id: 'm_0',
    name: 'Meters (integer)',
    symbol: 'm',
    description: 'Metric depth in meters, whole numbers only',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'xxx',
      decimals: 0,
      minWidth: 3,
      layoutRanges: { min: 1, max: 999, typical: 15 },
    },
  },
  {
    id: 'ft_0',
    name: 'Feet (integer)',
    symbol: 'ft',
    description: 'Imperial depth in feet, whole numbers',
    conversionFactor: 3.28084,
    formatSpec: {
      pattern: 'xxx',
      decimals: 0,
      minWidth: 4,
      layoutRanges: { min: 1, max: 3280, typical: 50 },
    },
    preferredInRegion: ['us'],
  },
  {
    id: 'ft_1',
    name: 'Feet (1 decimal)',
    symbol: 'ft',
    description: 'Imperial depth in feet with 1 decimal place',
    conversionFactor: 3.28084,
    formatSpec: {
      pattern: 'xxxx.x',
      decimals: 1,
      minWidth: 6,
      layoutRanges: { min: 0.3, max: 3280.8, typical: 50.9 },
    },
  },
  {
    id: 'fth_1',
    name: 'Fathoms (1 decimal)',
    symbol: 'fth',
    description: 'Nautical depth in fathoms with 1 decimal place',
    conversionFactor: 0.546807,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      layoutRanges: { min: 0.5, max: 546.8, typical: 8.2 },
    },
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
    conversionFactor: 1.94384, // m/s to knots
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      layoutRanges: { min: 0.1, max: 99.9, typical: 6.5 },
    },
    isDefault: true,
    preferredInRegion: ['eu', 'us', 'uk', 'international'],
  },
  {
    id: 'kts_0',
    name: 'Knots (integer)',
    symbol: 'kts',
    description: 'Nautical speed in knots, whole numbers',
    conversionFactor: 1.94384, // m/s to knots
    formatSpec: {
      pattern: 'xx',
      decimals: 0,
      minWidth: 2,
      layoutRanges: { min: 1, max: 99, typical: 7 },
    },
  },
  {
    id: 'kmh_1',
    name: 'km/h (1 decimal)',
    symbol: 'km/h',
    description: 'Metric speed in kilometers per hour',
    conversionFactor: 3.6, // m/s to km/h
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      layoutRanges: { min: 0.2, max: 185.2, typical: 12.0 },
    },
  },
  {
    id: 'mph_1',
    name: 'mph (1 decimal)',
    symbol: 'mph',
    description: 'Imperial speed in miles per hour',
    conversionFactor: 2.23694, // m/s to mph
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      layoutRanges: { min: 0.1, max: 114.8, typical: 7.5 },
    },
  },
];

// ===== WIND PRESENTATIONS =====
const WIND_PRESENTATIONS: Presentation[] = [
  {
    id: 'wind_kts_1',
    name: 'Knots (1 decimal)',
    symbol: 'kt',
    description: 'Wind speed in knots with 1 decimal place',
    conversionFactor: 1, // knots to knots (identity)
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      layoutRanges: { min: 0.0, max: 80.0, typical: 15.5 },
    },
    isDefault: true,
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
      layoutRanges: { min: 0, max: 12, typical: 4 },
    },
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
      layoutRanges: { min: 0, max: 12, typical: 4 },
    },
  },
  {
    id: 'kmh_0',
    name: 'km/h (integer)',
    symbol: 'kmh',
    description: 'Wind speed in kilometers per hour',
    conversionFactor: 1.852, // knots to km/h
    formatSpec: {
      pattern: 'xxx',
      decimals: 0,
      minWidth: 3,
      layoutRanges: { min: 0, max: 148, typical: 29 },
    },
  },
];

// ===== TEMPERATURE PRESENTATIONS =====
const TEMPERATURE_PRESENTATIONS: Presentation[] = [
  {
    id: 'c_1',
    name: 'Celsius (1 decimal)',
    symbol: '°C',
    description: 'Temperature in Celsius with 1 decimal place',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'xx.x',
      decimals: 1,
      minWidth: 4,
      layoutRanges: { min: -40.0, max: 50.0, typical: 22.5 },
    },
    isDefault: true,
    preferredInRegion: ['eu', 'uk', 'international'],
  },
  {
    id: 'c_0',
    name: 'Celsius (integer)',
    symbol: '°C',
    description: 'Temperature in Celsius, whole degrees',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'xx',
      decimals: 0,
      minWidth: 3,
      layoutRanges: { min: -40, max: 50, typical: 23 },
    },
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
      layoutRanges: { min: -40.0, max: 122.0, typical: 72.5 },
    },
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
      layoutRanges: { min: -40, max: 122, typical: 73 },
    },
  },
];

// ===== ATMOSPHERIC PRESSURE PRESENTATIONS =====
const ATMOSPHERIC_PRESSURE_PRESENTATIONS: Presentation[] = [
  {
    id: 'hpa_1',
    name: 'Hectopascals (1 decimal)',
    symbol: 'hPa',
    description: 'Standard meteorological pressure unit - hPa = mbar',
    conversionFactor: 0.01, // Pa to hPa
    formatSpec: {
      pattern: 'xxxx',
      decimals: 0,
      minWidth: 6,
      layoutRanges: { min: 950.0, max: 1050.0, typical: 1013.2 },
    },
    isDefault: true,
    preferredInRegion: ['eu', 'international', 'uk'],
  },
  {
    id: 'mbar_1',
    name: 'Millibars',
    symbol: 'mbar',
    description: 'Alternative name for hPa (1 mbar = 1 hPa)',
    conversionFactor: 0.01, // Pa to mbar
    formatSpec: {
      pattern: 'xxxx',
      decimals: 0,
      minWidth: 6,
      layoutRanges: { min: 950.0, max: 1050.0, typical: 1013.2 },
    },
    preferredInRegion: ['international'],
  },
  {
    id: 'bar_3',
    name: 'Bar (3 decimals)',
    symbol: 'bar',
    description: 'Metric pressure in bar - atmospheric range',
    conversionFactor: 0.00001, // Pa to bar
    formatSpec: {
      pattern: 'x.xxx',
      decimals: 3,
      minWidth: 5,
      layoutRanges: { min: 0.95, max: 1.05, typical: 1.013 },
    },
    preferredInRegion: ['eu'],
  },
  {
    id: 'inhg_2',
    name: 'Inches Mercury (2 decimals)',
    symbol: 'inHg',
    description: 'Imperial atmospheric pressure',
    conversionFactor: 0.0002953, // Pa to inHg
    formatSpec: {
      pattern: 'xx.xx',
      decimals: 2,
      minWidth: 5,
      layoutRanges: { min: 28.0, max: 31.0, typical: 29.92 },
    },
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
    conversionFactor: 0.00001, // Pa to bar
    formatSpec: {
      pattern: 'x.x',
      decimals: 1,
      minWidth: 3,
      layoutRanges: { min: 2.0, max: 6.0, typical: 4.0 },
    },
    isDefault: true,
    preferredInRegion: ['eu', 'international'],
  },
  {
    id: 'kpa_0',
    name: 'Kilopascals (integer)',
    symbol: 'kPa',
    description: 'Metric mechanical pressure in kilopascals',
    conversionFactor: 0.001, // Pa to kPa
    formatSpec: {
      pattern: 'xxx',
      decimals: 0,
      minWidth: 3,
      layoutRanges: { min: 200, max: 600, typical: 400 },
    },
    preferredInRegion: ['international'],
  },
  {
    id: 'psi_1',
    name: 'PSI (1 decimal)',
    symbol: 'psi',
    description: 'Imperial mechanical pressure - pounds per square inch',
    conversionFactor: 0.000145038, // Pa to psi
    formatSpec: {
      pattern: 'xx.x',
      decimals: 1,
      minWidth: 4,
      layoutRanges: { min: 30.0, max: 90.0, typical: 58.0 },
    },
    isDefault: true,
    preferredInRegion: ['us'],
  },
];

// ===== LEGACY PRESSURE PRESENTATIONS (DEPRECATED - for backwards compatibility) =====
// ===== ANGLE PRESENTATIONS =====
const ANGLE_PRESENTATIONS: Presentation[] = [
  {
    id: 'deg_0',
    name: 'Degrees (integer)',
    symbol: '°',
    description: 'Angle in degrees, integer value',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'xxx',
      decimals: 0,
      minWidth: 3,
      layoutRanges: { min: 0, max: 360, typical: 180 },
    },
    isDefault: true,
    preferredInRegion: ['eu', 'us', 'uk', 'international'],
  },
  {
    id: 'deg_1',
    name: 'Degrees (1 decimal)',
    symbol: '°',
    description: 'Angle in degrees, 1 decimal place',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      layoutRanges: { min: 0.0, max: 360.0, typical: 180.5 },
    },
    preferredInRegion: ['international'],
  },
];

// ===== COORDINATES PRESENTATIONS =====
const COORDINATES_PRESENTATIONS: Presentation[] = [
  {
    id: 'dd_6',
    name: 'Decimal Degrees (6 decimals)',
    symbol: 'DD',
    description: 'Decimal degrees with 6 decimal places and hemisphere indicator',
    convert: (degrees: number) => degrees,
    format: (deg: number, metadata?: { isLatitude?: boolean }) => {
      const absValue = Math.abs(deg);
      // Default to longitude (E/W) if metadata not provided
      const isLat = metadata?.isLatitude ?? false;
      const direction = deg >= 0 ? (isLat ? 'N' : 'E') : isLat ? 'S' : 'W';
      return `${absValue.toFixed(6)}° ${direction}`;
    },
    convertBack: (deg: number) => deg,
    formatSpec: {
      pattern: 'xxx.xxxxxx° X',
      decimals: 6,
      minWidth: 14,
      layoutRanges: { min: 0.0, max: 180.0, typical: 73.123456 },
    },
    isDefault: true,
    preferredInRegion: ['international'],
  },
  {
    id: 'ddm_3',
    name: 'Degrees Decimal Minutes (3 decimals)',
    symbol: 'DDM',
    description: 'Degrees and decimal minutes format with hemisphere indicator',
    convert: (degrees: number) => degrees,
    format: (deg: number, metadata?: { isLatitude?: boolean }) => {
      const absValue = Math.abs(deg);
      const d = Math.floor(absValue);
      const m = (absValue - d) * 60;
      const baseFormat = `${d}° ${m.toFixed(3).padStart(6, '0')}′`;

      // Default to longitude (E/W) if metadata not provided
      const isLat = metadata?.isLatitude ?? false;
      const direction = deg >= 0 ? (isLat ? 'N' : 'E') : isLat ? 'S' : 'W';
      return `${baseFormat} ${direction}`;
    },
    convertBack: (deg: number) => deg,
    formatSpec: {
      pattern: 'xxx° xx.xxx′ X',
      decimals: 3,
      minWidth: 15,
      layoutRanges: { min: 0, max: 180, typical: 73.5 },
    },
    preferredInRegion: ['eu', 'us', 'uk'],
  },
  {
    id: 'dms_1',
    name: 'Degrees Minutes Seconds (1 decimal)',
    symbol: 'DMS',
    description: 'Degrees, minutes, and seconds format with hemisphere indicator',
    convert: (degrees: number) => degrees,
    format: (deg: number, metadata?: { isLatitude?: boolean }) => {
      const absValue = Math.abs(deg);
      const d = Math.floor(absValue);
      const minTotal = (absValue - d) * 60;
      const m = Math.floor(minTotal);
      const s = (minTotal - m) * 60;
      // Compact format with minimal spacing
      const baseFormat = `${d}°${m.toString().padStart(2, '0')}′${s.toFixed(1).padStart(4, '0')}″`;

      // Default to longitude (E/W) if metadata not provided
      const isLat = metadata?.isLatitude ?? false;
      const direction = deg >= 0 ? (isLat ? 'N' : 'E') : isLat ? 'S' : 'W';
      return `${baseFormat}\u2009${direction}`; // Thin space (U+2009) for compact but readable separation
    },
    convertBack: (deg: number) => deg,
    formatSpec: {
      pattern: `xxx°xx′xx.x″ X`,
      decimals: 1,
      minWidth: 15,
      layoutRanges: { min: 0, max: 180, typical: 73.5 },
    },
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
      layoutRanges: { min: 0, max: 60, typical: 32 },
    },
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
    conversionFactor: 1,
    formatSpec: {
      pattern: 'xx.xx',
      decimals: 2,
      minWidth: 5,
      layoutRanges: { min: 10.5, max: 14.8, typical: 12.6 },
    },
    isDefault: true,
    preferredInRegion: ['eu', 'us', 'uk', 'international'],
  },
  {
    id: 'v_1',
    name: 'Volts (1 decimal)',
    symbol: 'V',
    description: 'Electrical voltage in volts, 1 decimal place',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'xx.x',
      decimals: 1,
      minWidth: 4,
      layoutRanges: { min: 10.5, max: 14.8, typical: 12.6 },
    },
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
    conversionFactor: 1,
    formatSpec: {
      pattern: 'xxx.xx',
      decimals: 2,
      minWidth: 6,
      layoutRanges: { min: 0.0, max: 100.0, typical: 5.25 },
    },
    isDefault: true,
    preferredInRegion: ['eu', 'us', 'uk', 'international'],
  },
  {
    id: 'a_1',
    name: 'Amperes (1 decimal)',
    symbol: 'A',
    description: 'Electrical current in amperes, 1 decimal place',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      layoutRanges: { min: 0.0, max: 100.0, typical: 5.2 },
    },
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
    conversionFactor: 1,
    formatSpec: {
      pattern: 'xxx',
      decimals: 0,
      minWidth: 3,
      layoutRanges: { min: 0, max: 500, typical: 150 },
    },
    isDefault: true,
    preferredInRegion: ['eu', 'international'],
  },
  {
    id: 'gal_us_1',
    name: 'US Gallons (1 decimal)',
    symbol: 'gal',
    description: 'Volume in US gallons, 1 decimal place',
    conversionFactor: 0.264172, // liters to US gallons
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      layoutRanges: { min: 0.0, max: 132.1, typical: 39.6 },
    },
    preferredInRegion: ['us'],
  },
  {
    id: 'gal_uk_1',
    name: 'Imperial Gallons (1 decimal)',
    symbol: 'gal',
    description: 'Volume in imperial gallons, 1 decimal place',
    conversionFactor: 0.219969, // liters to imperial gallons
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      layoutRanges: { min: 0.0, max: 110.0, typical: 33.0 },
    },
    preferredInRegion: ['uk'],
  },
];

// ===== DURATION PRESENTATIONS (renamed from TIME) =====
const DURATION_PRESENTATIONS: Presentation[] = [
  {
    id: 'h_1',
    name: 'Hours (1 decimal)',
    symbol: 'h',
    description: 'Duration in hours, 1 decimal place',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'xxxx.x',
      decimals: 1,
      minWidth: 6,
      layoutRanges: { min: 0.0, max: 9999.9, typical: 123.5 },
    },
    isDefault: true,
    preferredInRegion: ['eu', 'us', 'uk', 'international'],
  },
  {
    id: 'h_0',
    name: 'Hours (integer)',
    symbol: 'h',
    description: 'Duration in hours, integer value',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'xxxx',
      decimals: 0,
      minWidth: 4,
      layoutRanges: { min: 0, max: 9999, typical: 123 },
    },
    preferredInRegion: ['international'],
  },
];

// ===== TIME-OF-DAY PRESENTATIONS (NEW) =====
const TIME_PRESENTATIONS: Presentation[] = [
  {
    id: 'time_24h_full',
    name: '24-Hour Full (HH:MM:SS)',
    symbol: '', // Dynamic based on timezone
    description: 'Full 24-hour time with seconds',
    conversionFactor: 1, // Not used - special formatting
    formatSpec: {
      pattern: 'custom',
      decimals: 0,
      minWidth: 8,
      layoutRanges: { min: 0, max: 0, typical: 0 },
    },
    isDefault: true,
    preferredInRegion: ['eu', 'international'],
  },
  {
    id: 'time_24h',
    name: '24-Hour (HH:MM)',
    symbol: '',
    description: '24-hour time without seconds',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'custom',
      decimals: 0,
      minWidth: 5,
      layoutRanges: { min: 0, max: 0, typical: 0 },
    },
    preferredInRegion: ['eu', 'international'],
  },
  {
    id: 'time_12h',
    name: '12-Hour (HH:MM AM/PM)',
    symbol: '',
    description: '12-hour time with AM/PM',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'custom',
      decimals: 0,
      minWidth: 8,
      layoutRanges: { min: 0, max: 0, typical: 0 },
    },
    preferredInRegion: ['us'],
  },
  {
    id: 'time_12h_full',
    name: '12-Hour Full (HH:MM:SS AM/PM)',
    symbol: '',
    description: '12-hour time with seconds and AM/PM',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'custom',
      decimals: 0,
      minWidth: 11,
      layoutRanges: { min: 0, max: 0, typical: 0 },
    },
    preferredInRegion: ['us'],
  },
  {
    id: 'time_compact',
    name: 'Compact (HH.MM)',
    symbol: '',
    description: 'Compact time format with dot separator',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'custom',
      decimals: 0,
      minWidth: 5,
      layoutRanges: { min: 0, max: 0, typical: 0 },
    },
    preferredInRegion: ['international'],
  },
];

// ===== DATE PRESENTATIONS (NEW) =====
const DATE_PRESENTATIONS: Presentation[] = [
  {
    id: 'nautical_date',
    name: 'Nautical (Day Mon DD, YYYY)',
    symbol: '',
    description: 'Maritime standard date format',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'custom',
      decimals: 0,
      minWidth: 15,
      layoutRanges: { min: 0, max: 0, typical: 0 },
    },
    isDefault: true,
    preferredInRegion: ['international'],
  },
  {
    id: 'iso_date',
    name: 'ISO (YYYY-MM-DD)',
    symbol: '',
    description: 'ISO 8601 standard date',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'custom',
      decimals: 0,
      minWidth: 10,
      layoutRanges: { min: 0, max: 0, typical: 0 },
    },
    preferredInRegion: ['international'],
  },
  {
    id: 'us_date',
    name: 'US (MM/DD/YYYY)',
    symbol: '',
    description: 'US date format',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'custom',
      decimals: 0,
      minWidth: 10,
      layoutRanges: { min: 0, max: 0, typical: 0 },
    },
    preferredInRegion: ['us'],
  },
  {
    id: 'eu_date',
    name: 'EU (DD.MM.YYYY)',
    symbol: '',
    description: 'European date format',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'custom',
      decimals: 0,
      minWidth: 10,
      layoutRanges: { min: 0, max: 0, typical: 0 },
    },
    preferredInRegion: ['eu'],
  },
  {
    id: 'uk_date',
    name: 'UK (DD/MM/YYYY)',
    symbol: '',
    description: 'UK date format',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'custom',
      decimals: 0,
      minWidth: 10,
      layoutRanges: { min: 0, max: 0, typical: 0 },
    },
    preferredInRegion: ['uk'],
  },
];

// ===== DISTANCE PRESENTATIONS =====
const DISTANCE_PRESENTATIONS: Presentation[] = [
  {
    id: 'nm_1',
    name: 'Nautical Miles (1 decimal)',
    symbol: 'NM',
    description: 'Distance in nautical miles, 1 decimal place',
    conversionFactor: 0.000539957, // meters to nautical miles (1/1852)
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      layoutRanges: { min: 0.0, max: 100.0, typical: 12.5 },
    },
    isDefault: true,
    preferredInRegion: ['eu', 'us', 'uk', 'international'],
  },
  {
    id: 'km_1',
    name: 'Kilometers (1 decimal)',
    symbol: 'km',
    description: 'Distance in kilometers, 1 decimal place',
    conversionFactor: 0.001, // meters to kilometers (1/1000)
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      layoutRanges: { min: 0.0, max: 185.2, typical: 23.1 },
    },
    preferredInRegion: ['eu'],
  },
  {
    id: 'mi_1',
    name: 'Miles (1 decimal)',
    symbol: 'mi',
    description: 'Distance in statute miles, 1 decimal place',
    conversionFactor: 0.000621371, // meters to miles (1/1609.344)
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      layoutRanges: { min: 0.0, max: 115.1, typical: 14.3 },
    },
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
    conversionFactor: 1,
    formatSpec: {
      pattern: 'xxx',
      decimals: 0,
      minWidth: 3,
      layoutRanges: { min: 50, max: 800, typical: 200 },
    },
    isDefault: true,
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
      layoutRanges: { min: 0.6, max: 9.6, typical: 2.4 },
    },
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
    conversionFactor: 1,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      layoutRanges: { min: 0.0, max: 50.0, typical: 8.5 },
    },
    isDefault: true,
    preferredInRegion: ['eu', 'international'],
  },
  {
    id: 'gph_us_1',
    name: 'US Gallons/hour (1 decimal)',
    symbol: 'GPH',
    description: 'Flow rate in US gallons per hour',
    conversionFactor: 0.264172, // L/h to US gal/h
    formatSpec: {
      pattern: 'xx.x',
      decimals: 1,
      minWidth: 4,
      layoutRanges: { min: 0.0, max: 13.2, typical: 2.2 },
    },
    preferredInRegion: ['us'],
  },
  {
    id: 'gph_uk_1',
    name: 'Imperial Gallons/hour (1 decimal)',
    symbol: 'GPH',
    description: 'Flow rate in imperial gallons per hour',
    conversionFactor: 0.219969, // L/h to imperial gal/h
    formatSpec: {
      pattern: 'xx.x',
      decimals: 1,
      minWidth: 4,
      layoutRanges: { min: 0.0, max: 11.0, typical: 1.9 },
    },
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
    conversionFactor: 1,
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      layoutRanges: { min: 45.0, max: 65.0, typical: 60.0 },
    },
    isDefault: true,
    preferredInRegion: ['eu', 'us', 'uk', 'international'],
  },
  {
    id: 'hz_0',
    name: 'Hertz (integer)',
    symbol: 'Hz',
    description: 'Frequency in hertz, integer value',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'xxx',
      decimals: 0,
      minWidth: 3,
      layoutRanges: { min: 45, max: 65, typical: 60 },
    },
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
    conversionFactor: 0.001, // watts to kilowatts (1/1000)
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      layoutRanges: { min: 0.0, max: 100.0, typical: 22.4 },
    },
    isDefault: true,
    preferredInRegion: ['eu', 'international'],
  },
  {
    id: 'hp_0',
    name: 'Horsepower (integer)',
    symbol: 'HP',
    description: 'Power in horsepower, integer value',
    conversionFactor: 0.00134102, // watts to horsepower (1/745.7)
    formatSpec: {
      pattern: 'xxx',
      decimals: 0,
      minWidth: 3,
      layoutRanges: { min: 0, max: 134, typical: 30 },
    },
    preferredInRegion: ['us', 'uk'],
  },
  {
    id: 'w_0',
    name: 'Watts (integer)',
    symbol: 'W',
    description: 'Power in watts, integer value',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'xxxxx',
      decimals: 0,
      minWidth: 5,
      layoutRanges: { min: 0, max: 100000, typical: 22400 },
    },
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
    conversionFactor: 1,
    formatSpec: {
      pattern: 'xxxx',
      decimals: 0,
      minWidth: 4,
      layoutRanges: { min: 0, max: 6000, typical: 2200 },
    },
    isDefault: true,
    preferredInRegion: ['eu', 'us', 'uk', 'international'],
  },
  {
    id: 'rps_1',
    name: 'Revolutions/second (1 decimal)',
    symbol: 'RPS',
    description: 'Rotational speed in revolutions per second',
    conversionFactor: 0.0166667, // RPM to RPS (1/60)
    formatSpec: {
      pattern: 'xxx.x',
      decimals: 1,
      minWidth: 5,
      layoutRanges: { min: 0.0, max: 100.0, typical: 36.7 },
    },
    preferredInRegion: ['international'],
  },
];

// ===== ANGULAR VELOCITY PRESENTATIONS =====
const ANGULAR_VELOCITY_PRESENTATIONS: Presentation[] = [
  {
    id: 'deg_per_min_0',
    name: 'Degrees per minute (1 decimal)',
    symbol: '°/min',
    description: 'Rate of turn in degrees per minute',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'xx.x',
      decimals: 1,
      minWidth: 4,
      layoutRanges: { min: -10, max: 10, typical: 3 },
    },
    isDefault: true,
    preferredInRegion: ['eu', 'us', 'uk', 'international'],
  },
  {
    id: 'deg_per_sec_1',
    name: 'Degrees per second (2 decimals)',
    symbol: '°/s',
    description: 'Rate of turn in degrees per second',
    conversionFactor: 0.0166667, // degrees/min to degrees/sec (1/60)
    formatSpec: {
      pattern: 'x.xx',
      decimals: 2,
      minWidth: 4,
      layoutRanges: { min: -0.17, max: 0.17, typical: 0.05 },
    },
    preferredInRegion: ['international'],
  },
];

const PERCENTAGE_PRESENTATIONS: Presentation[] = [
  {
    id: 'pct_0',
    name: 'Percentage',
    symbol: '%',
    description: 'Percentage display (0-100%)',
    conversionFactor: 1,
    format: (value: number) => Math.round(value).toString(),
    formatSpec: {
      pattern: 'xxx%',
      decimals: 0,
      minWidth: 4,
      layoutRanges: { min: 0, max: 100, typical: 65 },
    },
    isDefault: true,
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
  timestamp: {
    category: 'timestamp',
    presentations: [], // Internal use only - no user-facing presentations
  },
  time: {
    category: 'time',
    presentations: TIME_PRESENTATIONS,
  },
  date: {
    category: 'date',
    presentations: DATE_PRESENTATIONS,
  },
  duration: {
    category: 'duration',
    presentations: DURATION_PRESENTATIONS,
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
  angularVelocity: {
    category: 'angularVelocity',
    presentations: ANGULAR_VELOCITY_PRESENTATIONS,
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
 * For time/date formats, shows actual formatted example with current time/date
 * Use this in settings/configuration interfaces for clarity
 */
export function getPresentationConfigLabel(presentation: Presentation): string {
  // Special handling for time formats - show actual formatted time
  if (presentation.id.startsWith('time_')) {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    
    switch (presentation.id) {
      case 'time_24h_full':
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      case 'time_24h':
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      case 'time_12h': {
        const hours12 = hours % 12 || 12;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        return `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      }
      case 'time_12h_full': {
        const hours12 = hours % 12 || 12;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        return `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampm}`;
      }
      case 'time_compact':
        return `${hours.toString().padStart(2, '0')}.${minutes.toString().padStart(2, '0')}`;
      default:
        return presentation.name;
    }
  }
  
  // Special handling for date formats - show actual formatted date
  if (presentation.id.includes('_date')) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    switch (presentation.id) {
      case 'nautical_date':
        return `${dayNames[now.getDay()]} ${monthNames[month - 1]} ${day.toString().padStart(2, '0')}, ${year}`;
      case 'iso_date':
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      case 'us_date':
        return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
      case 'eu_date':
        return `${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}.${year}`;
      case 'uk_date':
        return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
      default:
        return presentation.name;
    }
  }

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
