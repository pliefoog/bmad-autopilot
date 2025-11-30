// useUnitConversion Hook
// Custom hook for unit conversion management with dynamic preferences and real-time conversion

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';

// Unit system definitions
export type UnitSystem = 'metric' | 'imperial' | 'nautical';

// Format types for different display modes
export type DisplayFormat = {
  id: string;
  name: string;
  precision: number; // Decimal places
  condition?: (value: number) => boolean; // When this format applies
  formatter: (value: number) => string; // How to format the value
  isDefault?: boolean; // Default format for this unit
};

export interface UnitDefinition {
  id: string;
  name: string;
  symbol: string;
  system: UnitSystem;
  category: string;
  baseUnit: string; // Reference unit for conversions
  conversionFactor: number; // Multiplier to convert from base unit
  conversionOffset?: number; // Offset for non-linear conversions (e.g., temperature)
  precision: number; // Default decimal places for display (backward compatibility)
  format?: (value: number) => string; // Custom formatting function (backward compatibility)
  displayFormats?: DisplayFormat[]; // Multiple format options for this unit
  marineRegionDefaults?: { // Regional format preferences
    'eu': string; // Format ID for EU/Mediterranean
    'us': string; // Format ID for US/Caribbean  
    'uk': string; // Format ID for UK
    'international': string; // Format ID for International waters
  };
}

export interface ConversionPreference {
  category: string;
  preferredUnit: string;
  preferredFormat?: string; // Format ID for this unit
  displayPrecision?: number;
  showBothUnits?: boolean; // Show original and converted
  roundingMode?: 'round' | 'floor' | 'ceil' | 'trunc';
  marineRegion?: 'eu' | 'us' | 'uk' | 'international'; // Regional formatting preference
}

export interface UseUnitConversionOptions {
  // Global preferences
  defaultSystem?: UnitSystem;
  autoDetectSystem?: boolean;
  defaultMarineRegion?: 'eu' | 'us' | 'uk' | 'international'; // Regional formatting preference
  
  // Conversion behavior
  enableRealTimeConversion?: boolean;
  cacheConversions?: boolean;
  validateUnits?: boolean;
  
  // Display preferences
  showUnitSymbols?: boolean;
  abbreviateUnits?: boolean;
  
  // Callbacks
  onUnitChanged?: (category: string, newUnit: string) => void;
  onFormatChanged?: (category: string, unitId: string, formatId: string) => void;
  onSystemChanged?: (newSystem: UnitSystem) => void;
  onError?: (error: string) => void;
}

export interface UseUnitConversionReturn {
  // Current system and preferences
  currentSystem: UnitSystem;
  preferences: ConversionPreference[];
  availableUnits: UnitDefinition[];
  marineRegion: 'eu' | 'us' | 'uk' | 'international';
  
  // System management
  setSystem: (system: UnitSystem) => void;
  setMarineRegion: (region: 'eu' | 'us' | 'uk' | 'international') => void;
  switchToMetric: () => void;
  switchToImperial: () => void;
  switchToNautical: () => void;
  
  // Unit preferences
  setPreferredUnit: (category: string, unitId: string) => void;
  setPreferredFormat: (category: string, unitId: string, formatId: string) => void;
  getPreferredUnit: (category: string) => UnitDefinition | undefined;
  getPreferredFormat: (category: string, unitId: string) => DisplayFormat | undefined;
  resetPreferences: (category?: string) => void;
  
  // Format utilities
  getAvailableFormats: (unitId: string) => DisplayFormat[];
  getDefaultFormat: (unitId: string, region?: 'eu' | 'us' | 'uk' | 'international') => DisplayFormat | undefined;
  
  // Conversion functions
  convert: (value: number, fromUnit: string, toUnit: string) => number | null;
  convertToPreferred: (value: number, fromUnit: string) => { value: number; unit: UnitDefinition } | null;
  convertFromBase: (value: number, category: string, targetUnit?: string) => { value: number; unit: UnitDefinition };
  
  // Formatting functions
  format: (value: number, unit: string, options?: { precision?: number; showSymbol?: boolean; formatId?: string }) => string;
  formatWithPreferred: (value: number, fromUnit: string, options?: { showBoth?: boolean; precision?: number; formatId?: string }) => string;
  
  // NEW SIMPLIFIED FUNCTIONS FOR WIDGETS
  getPreferredUnitSymbol: (category: string) => string;
  convertAndFormat: (value: number | null | undefined, category: string, fromUnit?: string) => string;
  getFormattedValueWithUnit: (value: number | null | undefined, category: string, fromUnit?: string) => { value: string; unit: string };
  getConsistentWidth: (category: string, unitSymbol?: string, unitId?: string) => { 
    minWidth: number; 
    textAlign: 'right' | 'center' | 'left';
    letterSpacing?: number;
    formatPattern?: string;
  };
  
  // DATE/TIME FORMATTING FOR MARITIME APPLICATIONS
  getFormattedDateTime: (date: Date, type: 'date' | 'time', customTimezone?: string) => { value: string; unit: string };
  getFormattedDateTimeWithTimezone: (date: Date) => { date: string; time: string; timezone: string };
  getGpsFormattedDateTime: (date: Date) => { date: string; time: string; timezone: string };
  getShipFormattedDateTime: (date: Date) => { date: string; time: string; timezone: string };
  
  // Unit utilities
  getUnitsInCategory: (category: string) => UnitDefinition[];
  getUnitsBySystem: (system: UnitSystem) => UnitDefinition[];
  findUnit: (unitId: string) => UnitDefinition | undefined;
  getCategories: () => string[];
  
  // Validation
  validateConversion: (fromUnit: string, toUnit: string) => { valid: boolean; error?: string };
  isCompatible: (unit1: string, unit2: string) => boolean;
  
  // Presets and bulk operations
  applySystemPreset: (system: UnitSystem) => void;
  bulkConvert: (values: Array<{ value: number; unit: string }>, targetSystem: UnitSystem) => Array<{ value: number; unit: UnitDefinition }>;
  
  // Import/Export
  exportPreferences: () => ConversionPreference[];
  importPreferences: (preferences: ConversionPreference[]) => void;
}

// Beaufort Scale utilities for marine wind speed
function knotsToBeaufort(knots: number): number {
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
}

function beaufortToKnots(beaufort: number): number {
  // Returns the midpoint knots value for each Beaufort scale
  const knotsRanges = [0.5, 2.5, 5.5, 9, 13.5, 19, 25, 31.5, 37.5, 44.5, 52, 60, 68];
  return knotsRanges[Math.max(0, Math.min(12, beaufort))] || 0;
}

function getBeaufortDescription(beaufort: number): string {
  const descriptions = [
    'Calm', 'Light Air', 'Light Breeze', 'Gentle Breeze', 'Moderate Breeze',
    'Fresh Breeze', 'Strong Breeze', 'Near Gale', 'Gale', 'Strong Gale',
    'Storm', 'Violent Storm', 'Hurricane'
  ];
  return descriptions[Math.max(0, Math.min(12, beaufort))] || 'Unknown';
}

// GPS Coordinate formatting utilities
function formatDecimalDegrees(value: number, precision: number = 6): string {
  return value.toFixed(precision) + '°';
}

function formatDegreesMinutes(value: number, isLatitude: boolean = true): string {
  const direction = value >= 0 ? (isLatitude ? 'N' : 'E') : (isLatitude ? 'S' : 'W');
  const absValue = Math.abs(value);
  const degrees = Math.floor(absValue);
  const minutes = (absValue - degrees) * 60;
  return `${degrees}° ${minutes.toFixed(3)}' ${direction}`;
}

function formatDegreesMinutesSeconds(value: number, isLatitude: boolean = true): string {
  const direction = value >= 0 ? (isLatitude ? 'N' : 'E') : (isLatitude ? 'S' : 'W');
  const absValue = Math.abs(value);
  const degrees = Math.floor(absValue);
  const minutesFloat = (absValue - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  return `${degrees}° ${minutes}' ${seconds.toFixed(1)}" ${direction}`;
}

// Wind speed formatting based on maritime conventions
function formatKnots(value: number, useDecimal: boolean = false): string {
  if (useDecimal && value >= 10) {
    return value.toFixed(1);
  }
  return Math.round(value).toString();
}

function formatBeaufort(knotsValue: number): string {
  const bf = knotsToBeaufort(knotsValue);
  return bf.toString(); // Always integer for Beaufort
}

// Date/Time formatting functions for maritime applications
function formatDate(date: Date, formatId: string, timezone: string = 'utc'): string {
  // Apply timezone offset before formatting
  const workingDate = applyTimezone(date, timezone);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayAbbr = dayNames[workingDate.getDay()]; // DDD - always included for nautical use

  switch (formatId) {
    case 'iso_date':
      return `${dayAbbr} ${workingDate.toISOString().split('T')[0]}`; // DDD YYYY-MM-DD

    case 'us_date':
      return `${dayAbbr} ${(workingDate.getMonth() + 1).toString().padStart(2, '0')}/${workingDate.getDate().toString().padStart(2, '0')}/${workingDate.getFullYear()}`; // DDD MM/DD/YYYY

    case 'eu_date':
      return `${dayAbbr} ${workingDate.getDate().toString().padStart(2, '0')}.${(workingDate.getMonth() + 1).toString().padStart(2, '0')}.${workingDate.getFullYear()}`; // DDD DD.MM.YYYY

    case 'uk_date':
      return `${dayAbbr} ${workingDate.getDate()} ${monthNames[workingDate.getMonth()]} ${workingDate.getFullYear()}`; // DDD DD MMM YYYY

    case 'nautical_date':
      return `${dayAbbr}, ${monthNames[workingDate.getMonth()]} ${workingDate.getDate()}, ${workingDate.getFullYear()}`; // DDD, MMM DD, YYYY

    default:
      return formatDate(date, 'iso_date', timezone);
  }
}

function formatTime(date: Date, formatId: string, timezone: string = 'utc'): string {
  // Apply timezone offset before formatting
  const workingDate = applyTimezone(date, timezone);
  
  const hours = workingDate.getHours();
  const minutes = workingDate.getMinutes();
  const seconds = workingDate.getSeconds();
  
  switch (formatId) {
    case 'time_24h_full':
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
    case 'time_24h':
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
    case 'time_12h_full':
      const hours12Full = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const ampmFull = hours >= 12 ? 'PM' : 'AM';
      return `${hours12Full.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampmFull}`;
      
    case 'time_12h':
      const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      return `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      
    case 'time_compact':
      return `${hours.toString().padStart(2, '0')}.${minutes.toString().padStart(2, '0')}`;
      
    default:
      return formatTime(date, 'time_24h_full', timezone);
  }
}

function getTimezoneDisplay(timezone: string): string {
  switch (timezone) {
    case 'utc':
    case '0':
      return 'UTC';
    case 'local_device':
      // Get device timezone abbreviation
      const deviceOffset = new Date().getTimezoneOffset();
      const sign = deviceOffset <= 0 ? '+' : '-';
      const hours = Math.floor(Math.abs(deviceOffset) / 60);
      const minutes = Math.abs(deviceOffset) % 60;
      return minutes > 0 ? `UTC${sign}${hours}:${minutes.toString().padStart(2, '0')}` : `UTC${sign}${hours}`;
    case 'ship_time':
      return 'Ship';
    case 'utc_plus_offset':
      // For now, return UTC - can be configured later
      return 'UTC±';
    default:
      // Handle explicit UTC offsets like "UTC+5" or "UTC-3:30"
      if (timezone.startsWith('UTC')) {
        return timezone;
      }

      // Parse numeric offset
      const offset = parseInt(timezone);
      if (!isNaN(offset)) {
        if (offset === 0) {
          return 'UTC';
        }
        const sign = offset >= 0 ? '+' : '';
        return `UTC${sign}${offset}`;
      }

      return timezone.toUpperCase();
  }
}

function applyTimezone(date: Date, timezone: string): Date {
  switch (timezone) {
    case 'utc':
      return new Date(date.getTime()); // Already in UTC
      
    case 'local_device':
      // Convert UTC to local device time
      return new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
      
    case 'ship_time':
      // For now, same as UTC - can be customized later
      return new Date(date.getTime());
      
    default:
      return new Date(date.getTime());
  }
}

// Decimal-aligned formatting for professional maritime instrument display
function formatToPattern(value: number, pattern: string): string {
  if (!pattern) return value.toString();
  
  // Extract decimal places from pattern
  const decimalIndex = pattern.indexOf('.');
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  
  if (decimalIndex === -1) {
    // Integer pattern (e.g., "999")
    const integerStr = Math.round(absValue).toString();
    const maxDigits = pattern.length - (pattern.includes('-') ? 1 : 0);
    const paddedStr = integerStr.padStart(maxDigits, ' ');
    return (isNegative ? '-' : ' ') + paddedStr.slice(-(maxDigits));
  } else {
    // Decimal pattern (e.g., "999.9", "-99.9")
    const integerPart = pattern.substring(0, decimalIndex);
    const decimalPart = pattern.substring(decimalIndex + 1);
    const decimalPlaces = decimalPart.length;
    
    // Format the number with fixed decimal places
    const formattedValue = absValue.toFixed(decimalPlaces);
    const [intStr, decStr] = formattedValue.split('.');
    
    // Calculate padding for integer part
    const hasSign = pattern.includes('-');
    const maxIntDigits = integerPart.length - (hasSign ? 1 : 0);
    
    // Right-align integer part with space padding
    const paddedIntStr = intStr.padStart(maxIntDigits, ' ');
    
    // Handle sign placement
    const signChar = isNegative ? '-' : ' ';
    const finalIntStr = hasSign ? signChar + paddedIntStr.slice(1) : paddedIntStr;
    
    return finalIntStr + '.' + decStr;
  }
}

// Consistent width formatting for metric cells to prevent layout jumping
function getConsistentFormatWidth(category: string, unitSymbol: string): { 
  minWidth: number; 
  textAlign: 'right' | 'center' | 'left';
  letterSpacing?: number;
  formatPattern?: string; // Pattern for decimal alignment (e.g., "999.9")
} {
  // Define maximum expected content samples for precise width calculation
  const categoryContentSamples: Record<string, { 
    maxContent: string; 
    align: 'right' | 'center' | 'left';
    useTabularNums: boolean;
    formatPattern: string; // Pattern for decimal-aligned formatting
  }> = {
    'angle': { 
      maxContent: '359°', 
      align: 'right',
      useTabularNums: true, // Critical for navigation - consistent digit alignment
      formatPattern: '999' // Integer angles - no decimal
    },
    'wind_speed': { 
      maxContent: '99.9', 
      align: 'right',
      useTabularNums: true, // Important for trend monitoring
      formatPattern: '99.9' // Always show one decimal place
    },
    'wind_speed_beaufort': { 
      maxContent: '12', 
      align: 'right',
      useTabularNums: true, // Beaufort scale consistency
      formatPattern: '99' // Beaufort is always integer (0-12)
    },
    'vessel_speed': { 
      maxContent: '99.9', 
      align: 'right',
      useTabularNums: true, // Critical for speed monitoring
      formatPattern: '99.9' // Always show one decimal place
    },
    'depth': { 
      maxContent: '999.9', 
      align: 'right',
      useTabularNums: true, // Safety critical - consistent alignment
      formatPattern: '999.9' // Depth with one decimal
    },
    'distance': { 
      maxContent: '999.9', 
      align: 'right',
      useTabularNums: true,
      formatPattern: '999.9' // Distance with one decimal
    },
    'temperature': { 
      maxContent: '-99.9', 
      align: 'right',
      useTabularNums: true, // Include negative sign
      formatPattern: '-99.9' // Temperature with sign and decimal
    },
    'voltage': { 
      maxContent: '99.99', 
      align: 'right',
      useTabularNums: true, // Electrical precision
      formatPattern: '99.99' // Two decimal places for voltage
    },
    'current': { 
      maxContent: '999.9', 
      align: 'right',
      useTabularNums: true, // High current scenarios
      formatPattern: '999.9' // Current with one decimal
    },
    'pressure': { 
      maxContent: '1013.25', 
      align: 'right',
      useTabularNums: true, // Barometric precision
      formatPattern: '1013.25' // Pressure with two decimals
    },
    'coordinates': { 
      maxContent: '12° 34.567\' N', 
      align: 'right',
      useTabularNums: false, // Mixed text/numbers
      formatPattern: '' // No pattern for coordinates
    },
    'date': { 
      maxContent: 'Wed, Oct 21, 2025', 
      align: 'center',
      useTabularNums: false, // Date text formatting
      formatPattern: '' // Pattern varies by locale
    },
    'time': { 
      maxContent: '23:45:59 UTC', 
      align: 'center',
      useTabularNums: true, // Time consistency
      formatPattern: '12:34:56' // Time format
    },
    'timezone': { 
      maxContent: 'UTC+12:00', 
      align: 'center',
      useTabularNums: false, // Timezone abbreviations
      formatPattern: '' // Timezone format varies
    },
    'default': { 
      maxContent: '9999.99', 
      align: 'right',
      useTabularNums: true,
      formatPattern: '9999.99' // Default with two decimals
    }
  };

  const config = categoryContentSamples[category] || categoryContentSamples['default'];
  
  // Calculate width based on actual character content
  // Tabular nums: each digit takes same width, approximately 0.6em
  // Regular chars: approximately 0.5em  
  // Symbols (°, ', "): approximately 0.3em
  const calculateContentWidth = (content: string): number => {
    let width = 0;
    for (const char of content) {
      if (/\d/.test(char)) {
        width += config.useTabularNums ? 0.6 : 0.5; // Digits
      } else if (/[°'":]/.test(char)) {
        width += 0.3; // Symbols
      } else if (char === ' ') {
        width += 0.25; // Spaces
      } else if (/[A-Z]/.test(char)) {
        width += 0.7; // Capital letters (N, S, E, W)
      } else if (char === '.' || char === ',') {
        width += 0.3; // Decimal point
      } else if (char === '-') {
        width += 0.4; // Minus sign
      } else {
        width += 0.5; // Other characters
      }
    }
    return width;
  };

  const contentWidth = calculateContentWidth(config.maxContent);
  // Convert em to points (16pt = 1em typically) + padding
  const minWidth = Math.ceil((contentWidth + 0.5) * 16); // 0.5em padding
  
  const result: {
    minWidth: number; 
    textAlign: 'right' | 'center' | 'left';
    letterSpacing?: number;
    formatPattern?: string;
  } = {
    minWidth,
    textAlign: config.align,
    formatPattern: config.formatPattern
  };

  // Add typography enhancements for numeric categories
  if (config.useTabularNums) {
    // Note: React Native uses monospace font family instead of fontVariantNumeric
    result.letterSpacing = 0.05; // Slight letter spacing for better readability
  }

  return result;
}

// Comprehensive unit definitions
const UNIT_DEFINITIONS: UnitDefinition[] = [
  // Distance (Navigation/Range)
  { id: 'nautical_mile', name: 'Nautical Mile', symbol: 'NM', system: 'nautical', category: 'distance', baseUnit: 'meter', conversionFactor: 1852, precision: 2 },
  { id: 'kilometer', name: 'Kilometer', symbol: 'km', system: 'metric', category: 'distance', baseUnit: 'meter', conversionFactor: 1000, precision: 2 },
  { id: 'mile', name: 'Mile', symbol: 'mi', system: 'imperial', category: 'distance', baseUnit: 'meter', conversionFactor: 1609.344, precision: 2 },
  { id: 'meter', name: 'Meter', symbol: 'm', system: 'metric', category: 'distance', baseUnit: 'meter', conversionFactor: 1, precision: 0 },

  // Depth (Sounder/Water depth)
  { id: 'meter', name: 'Meter', symbol: 'm', system: 'metric', category: 'depth', baseUnit: 'meter', conversionFactor: 1, precision: 1,
    displayFormats: [
      { id: 'shallow', name: 'Shallow (1 decimal)', precision: 1, condition: (v) => v < 50, formatter: (v) => v.toFixed(1), isDefault: true },
      { id: 'deep', name: 'Deep (integer)', precision: 0, condition: (v) => v >= 50, formatter: (v) => Math.round(v).toString() }
    ],
    marineRegionDefaults: { 'eu': 'shallow', 'us': 'shallow', 'uk': 'shallow', 'international': 'shallow' }
  },
  { id: 'foot', name: 'Foot', symbol: 'ft', system: 'imperial', category: 'depth', baseUnit: 'meter', conversionFactor: 0.3048, precision: 0,
    displayFormats: [
      { id: 'integer', name: 'Integer', precision: 0, formatter: (v) => Math.round(v).toString(), isDefault: true }
    ]
  },
  { id: 'fathom', name: 'Fathom', symbol: 'fth', system: 'nautical', category: 'depth', baseUnit: 'meter', conversionFactor: 1.8288, precision: 1,
    displayFormats: [
      { id: 'decimal', name: '1 Decimal', precision: 1, formatter: (v) => v.toFixed(1), isDefault: true }
    ]
  },

  // Vessel Speed (SOG/STW)
  { id: 'knots', name: 'Knots', symbol: 'kts', system: 'nautical', category: 'vessel_speed', baseUnit: 'knots', conversionFactor: 1, precision: 1 },
  { id: 'kmh_vessel', name: 'Kilometers per Hour', symbol: 'km/h', system: 'metric', category: 'vessel_speed', baseUnit: 'knots', conversionFactor: 1.852, precision: 1 },
  { id: 'mph_vessel', name: 'Miles per Hour', symbol: 'mph', system: 'imperial', category: 'vessel_speed', baseUnit: 'knots', conversionFactor: 1.15078, precision: 1 },
  { id: 'mps_vessel', name: 'Meters per Second', symbol: 'm/s', system: 'metric', category: 'vessel_speed', baseUnit: 'knots', conversionFactor: 0.514444, precision: 2 },

  // Wind Speed
  { id: 'knots_wind', name: 'Knots', symbol: 'kts', system: 'nautical', category: 'wind_speed', baseUnit: 'knots', conversionFactor: 1, precision: 1,
    displayFormats: [
      { id: 'integer', name: 'Integer', precision: 0, condition: (v) => v < 10, formatter: (v) => Math.round(v).toString(), isDefault: true },
      { id: 'decimal', name: 'Decimal', precision: 1, condition: (v) => v >= 10, formatter: (v) => v.toFixed(1) }
    ],
    marineRegionDefaults: { 'eu': 'decimal', 'us': 'integer', 'uk': 'decimal', 'international': 'decimal' }
  },
  { id: 'kmh_wind', name: 'Kilometers per Hour', symbol: 'km/h', system: 'metric', category: 'wind_speed', baseUnit: 'knots', conversionFactor: 1.852, precision: 0,
    displayFormats: [
      { id: 'integer', name: 'Integer', precision: 0, formatter: (v) => Math.round(v).toString(), isDefault: true }
    ]
  },
  { id: 'mph_wind', name: 'Miles per Hour', symbol: 'mph', system: 'imperial', category: 'wind_speed', baseUnit: 'knots', conversionFactor: 1.15078, precision: 0,
    displayFormats: [
      { id: 'integer', name: 'Integer', precision: 0, formatter: (v) => Math.round(v).toString(), isDefault: true }
    ]
  },
  { id: 'mps_wind', name: 'Meters per Second', symbol: 'm/s', system: 'metric', category: 'wind_speed', baseUnit: 'knots', conversionFactor: 0.514444, precision: 1,
    displayFormats: [
      { id: 'decimal', name: 'Decimal', precision: 1, formatter: (v) => v.toFixed(1), isDefault: true }
    ]
  },
  { id: 'beaufort', name: 'Beaufort Scale', symbol: 'Bf', system: 'nautical', category: 'wind_speed', baseUnit: 'knots', conversionFactor: 1, precision: 0,
    displayFormats: [
      { id: 'integer', name: 'Scale Value', precision: 0, formatter: (knotsValue) => knotsToBeaufort(knotsValue).toString(), isDefault: true },
      { id: 'description', name: 'With Description', precision: 0, formatter: (knotsValue) => {
        const bf = knotsToBeaufort(knotsValue);
        const description = getBeaufortDescription(bf);
        return `${bf} Bf (${description})`;
      }}
    ],
    marineRegionDefaults: { 'eu': 'integer', 'us': 'description', 'uk': 'integer', 'international': 'integer' },
    format: (knotsValue: number) => {
      const bf = knotsToBeaufort(knotsValue);
      const description = getBeaufortDescription(bf);
      return `${bf} Bf (${description})`;
    }
  },

  // Temperature (Marine environment - Kelvin removed as not practical for nautical use)
  { id: 'celsius', name: 'Celsius', symbol: '°C', system: 'metric', category: 'temperature', baseUnit: 'celsius', conversionFactor: 1, precision: 1 },
  { id: 'fahrenheit', name: 'Fahrenheit', symbol: '°F', system: 'imperial', category: 'temperature', baseUnit: 'celsius', conversionFactor: 1, conversionOffset: 32, precision: 1,
    format: (value: number) => ((value * 9/5) + 32).toFixed(1) + '°F' },

  // Pressure
  { id: 'pascal', name: 'Pascal', symbol: 'Pa', system: 'metric', category: 'pressure', baseUnit: 'pascal', conversionFactor: 1, precision: 0 },
  { id: 'kilopascal', name: 'Kilopascal', symbol: 'kPa', system: 'metric', category: 'pressure', baseUnit: 'pascal', conversionFactor: 1000, precision: 2 },
  { id: 'bar', name: 'Bar', symbol: 'bar', system: 'metric', category: 'pressure', baseUnit: 'pascal', conversionFactor: 100000, precision: 3 },
  { id: 'psi', name: 'Pounds per Square Inch', symbol: 'psi', system: 'imperial', category: 'pressure', baseUnit: 'pascal', conversionFactor: 6894.76, precision: 2 },
  { id: 'mmhg', name: 'Millimeters of Mercury', symbol: 'mmHg', system: 'metric', category: 'pressure', baseUnit: 'pascal', conversionFactor: 133.322, precision: 1 },
  { id: 'inhg', name: 'Inches of Mercury', symbol: 'inHg', system: 'imperial', category: 'pressure', baseUnit: 'pascal', conversionFactor: 3386.39, precision: 2 },

  // Volume
  { id: 'liter', name: 'Liter', symbol: 'L', system: 'metric', category: 'volume', baseUnit: 'liter', conversionFactor: 1, precision: 2 },
  { id: 'milliliter', name: 'Milliliter', symbol: 'mL', system: 'metric', category: 'volume', baseUnit: 'liter', conversionFactor: 0.001, precision: 0 },
  { id: 'gallon_us', name: 'US Gallon', symbol: 'gal', system: 'imperial', category: 'volume', baseUnit: 'liter', conversionFactor: 3.78541, precision: 2 },
  { id: 'gallon_uk', name: 'Imperial Gallon', symbol: 'gal', system: 'imperial', category: 'volume', baseUnit: 'liter', conversionFactor: 4.54609, precision: 2 },
  { id: 'quart', name: 'Quart', symbol: 'qt', system: 'imperial', category: 'volume', baseUnit: 'liter', conversionFactor: 0.946353, precision: 2 },

  // Weight/Mass
  { id: 'kilogram', name: 'Kilogram', symbol: 'kg', system: 'metric', category: 'weight', baseUnit: 'kilogram', conversionFactor: 1, precision: 2 },
  { id: 'gram', name: 'Gram', symbol: 'g', system: 'metric', category: 'weight', baseUnit: 'kilogram', conversionFactor: 0.001, precision: 1 },
  { id: 'pound', name: 'Pound', symbol: 'lb', system: 'imperial', category: 'weight', baseUnit: 'kilogram', conversionFactor: 0.453592, precision: 2 },
  { id: 'ounce', name: 'Ounce', symbol: 'oz', system: 'imperial', category: 'weight', baseUnit: 'kilogram', conversionFactor: 0.0283495, precision: 2 },
  { id: 'ton', name: 'Metric Ton', symbol: 't', system: 'metric', category: 'weight', baseUnit: 'kilogram', conversionFactor: 1000, precision: 3 },

  // Angular - Maritime angles should be integers for navigation clarity
  { id: 'degree', name: 'Degree', symbol: '°', system: 'metric', category: 'angle', baseUnit: 'degree', conversionFactor: 1, precision: 0,
    displayFormats: [
      { id: 'integer', name: 'Integer Degrees', precision: 0, formatter: (v) => Math.round(v).toString(), isDefault: true },
      { id: 'decimal_1', name: '1 Decimal Place', precision: 1, formatter: (v) => v.toFixed(1) },
      { id: 'decimal_2', name: '2 Decimal Places', precision: 2, formatter: (v) => v.toFixed(2) }
    ],
    marineRegionDefaults: { 'eu': 'integer', 'us': 'integer', 'uk': 'integer', 'international': 'integer' }
  },
  { id: 'radian', name: 'Radian', symbol: 'rad', system: 'metric', category: 'angle', baseUnit: 'degree', conversionFactor: 57.2958, precision: 4,
    displayFormats: [
      { id: 'decimal_4', name: '4 Decimal Places', precision: 4, formatter: (v) => v.toFixed(4), isDefault: true }
    ]
  },
  { id: 'mil', name: 'Mil', symbol: 'mil', system: 'imperial', category: 'angle', baseUnit: 'degree', conversionFactor: 0.05625, precision: 0,
    displayFormats: [
      { id: 'integer', name: 'Integer Mils', precision: 0, formatter: (v) => Math.round(v).toString(), isDefault: true }
    ]
  },

  // GPS Coordinates - Using maritime abbreviations (DD, DDM, DMS, UTM)
  { id: 'decimal_degrees', name: 'Decimal Degrees', symbol: 'DD', system: 'nautical', category: 'coordinates', baseUnit: 'decimal_degrees', conversionFactor: 1, precision: 6,
    displayFormats: [
      { id: 'dd_6', name: 'DD (6 decimals)', precision: 6, formatter: (v) => formatDecimalDegrees(v, 6), isDefault: true },
      { id: 'dd_4', name: 'DD (4 decimals)', precision: 4, formatter: (v) => formatDecimalDegrees(v, 4) },
      { id: 'dd_2', name: 'DD (2 decimals)', precision: 2, formatter: (v) => formatDecimalDegrees(v, 2) }
    ],
    marineRegionDefaults: { 'eu': 'dd_6', 'us': 'dd_6', 'uk': 'dd_6', 'international': 'dd_6' }
  },
  { id: 'degrees_minutes', name: 'Degrees Decimal Minutes', symbol: 'DDM', system: 'nautical', category: 'coordinates', baseUnit: 'decimal_degrees', conversionFactor: 1, precision: 4,
    displayFormats: [
      { id: 'ddm_3', name: 'DDM (3 decimal minutes)', precision: 3, formatter: (v) => formatDegreesMinutes(v), isDefault: true },
      { id: 'ddm_2', name: 'DDM (2 decimal minutes)', precision: 2, formatter: (v) => formatDegreesMinutes(v) },
      { id: 'ddm_1', name: 'DDM (1 decimal minutes)', precision: 1, formatter: (v) => formatDegreesMinutes(v) }
    ],
    marineRegionDefaults: { 'eu': 'ddm_3', 'us': 'ddm_2', 'uk': 'ddm_3', 'international': 'ddm_3' }
  },
  { id: 'degrees_minutes_seconds', name: 'Degrees Minutes Seconds', symbol: 'DMS', system: 'nautical', category: 'coordinates', baseUnit: 'decimal_degrees', conversionFactor: 1, precision: 2,
    displayFormats: [
      { id: 'dms_1', name: 'DMS (1 decimal seconds)', precision: 1, formatter: (v) => formatDegreesMinutesSeconds(v), isDefault: true },
      { id: 'dms_0', name: 'DMS (integer seconds)', precision: 0, formatter: (v) => formatDegreesMinutesSeconds(v) }
    ],
    marineRegionDefaults: { 'eu': 'dms_1', 'us': 'dms_1', 'uk': 'dms_1', 'international': 'dms_1' }
  },
  { id: 'utm', name: 'Universal Transverse Mercator', symbol: 'UTM', system: 'metric', category: 'coordinates', baseUnit: 'decimal_degrees', conversionFactor: 1, precision: 0,
    displayFormats: [
      { id: 'utm_standard', name: 'UTM (zone + northing/easting)', precision: 0, formatter: (v) => v.toFixed(0), isDefault: true }
    ]
  },

  // Electrical
  { id: 'volt', name: 'Volt', symbol: 'V', system: 'metric', category: 'voltage', baseUnit: 'volt', conversionFactor: 1, precision: 2 },
  { id: 'millivolt', name: 'Millivolt', symbol: 'mV', system: 'metric', category: 'voltage', baseUnit: 'volt', conversionFactor: 0.001, precision: 1 },
  { id: 'ampere', name: 'Ampere', symbol: 'A', system: 'metric', category: 'current', baseUnit: 'ampere', conversionFactor: 1, precision: 2 },
  { id: 'milliampere', name: 'Milliampere', symbol: 'mA', system: 'metric', category: 'current', baseUnit: 'ampere', conversionFactor: 0.001, precision: 0 },

  // Electrical Capacity (NEW)
  { id: 'ampere_hour', name: 'Ampere Hour', symbol: 'Ah', system: 'metric', category: 'capacity', baseUnit: 'ampere_hour', conversionFactor: 1, precision: 0 },
  { id: 'kilowatt_hour', name: 'Kilowatt Hour', symbol: 'kWh', system: 'metric', category: 'capacity', baseUnit: 'ampere_hour', conversionFactor: 83.33, precision: 2 }, // Approx for 12V system
  { id: 'watt_hour', name: 'Watt Hour', symbol: 'Wh', system: 'metric', category: 'capacity', baseUnit: 'ampere_hour', conversionFactor: 0.083, precision: 1 }, // For 12V system

  // Flow Rate (NEW - Marine fuel consumption, bilge pumps, etc.)
  { id: 'liter_per_hour', name: 'Liters per Hour', symbol: 'L/h', system: 'metric', category: 'flow_rate', baseUnit: 'liter_per_hour', conversionFactor: 1, precision: 2 },
  { id: 'gallon_us_per_hour', name: 'US Gallons per Hour', symbol: 'gal/h', system: 'imperial', category: 'flow_rate', baseUnit: 'liter_per_hour', conversionFactor: 3.78541, precision: 2 },
  { id: 'gallon_uk_per_hour', name: 'Imperial Gallons per Hour', symbol: 'gal/h', system: 'imperial', category: 'flow_rate', baseUnit: 'liter_per_hour', conversionFactor: 4.54609, precision: 2 },
  { id: 'cubic_meter_per_hour', name: 'Cubic Meters per Hour', symbol: 'm³/h', system: 'metric', category: 'flow_rate', baseUnit: 'liter_per_hour', conversionFactor: 1000, precision: 3 },

  // Time (NEW - Engine hours, intervals)
  { id: 'hour', name: 'Hour', symbol: 'h', system: 'metric', category: 'time', baseUnit: 'hour', conversionFactor: 1, precision: 1 },
  { id: 'minute', name: 'Minute', symbol: 'min', system: 'metric', category: 'time', baseUnit: 'hour', conversionFactor: 1/60, precision: 0 },
  { id: 'second', name: 'Second', symbol: 's', system: 'metric', category: 'time', baseUnit: 'hour', conversionFactor: 1/3600, precision: 0 },
  { id: 'day', name: 'Day', symbol: 'd', system: 'metric', category: 'time', baseUnit: 'hour', conversionFactor: 24, precision: 2 },

  // Date Formats - Maritime date display formats with day abbreviations
  { id: 'iso_date', name: 'ISO Date Format', symbol: 'YYYY-MM-DD', system: 'metric', category: 'date', baseUnit: 'iso_date', conversionFactor: 1, precision: 0 },
  { id: 'us_date', name: 'US Date Format', symbol: 'MM/DD/YYYY', system: 'imperial', category: 'date', baseUnit: 'iso_date', conversionFactor: 1, precision: 0 },
  { id: 'eu_date', name: 'European Date Format', symbol: 'DD.MM.YYYY', system: 'metric', category: 'date', baseUnit: 'iso_date', conversionFactor: 1, precision: 0 },
  { id: 'uk_date', name: 'UK Date Format', symbol: 'DD MMM YYYY', system: 'imperial', category: 'date', baseUnit: 'iso_date', conversionFactor: 1, precision: 0 },
  { id: 'nautical_date', name: 'Nautical Date Format', symbol: 'DDD, MMM DD, YYYY', system: 'nautical', category: 'date', baseUnit: 'iso_date', conversionFactor: 1, precision: 0 },

  // Time Formats - Maritime time display with proper HH:mm notation
  { id: 'time_24h_full', name: '24-Hour with Seconds', symbol: 'HH:mm:ss', system: 'metric', category: 'time_format', baseUnit: 'time_24h', conversionFactor: 1, precision: 0 },
  { id: 'time_24h', name: '24-Hour Format', symbol: 'HH:mm', system: 'metric', category: 'time_format', baseUnit: 'time_24h', conversionFactor: 1, precision: 0 },
  { id: 'time_12h_full', name: '12-Hour with Seconds', symbol: 'hh:mm:ss a', system: 'imperial', category: 'time_format', baseUnit: 'time_24h', conversionFactor: 1, precision: 0 },
  { id: 'time_12h', name: '12-Hour Format', symbol: 'hh:mm a', system: 'imperial', category: 'time_format', baseUnit: 'time_24h', conversionFactor: 1, precision: 0 },
  { id: 'time_compact', name: 'Compact Time', symbol: 'HH.mm', system: 'nautical', category: 'time_format', baseUnit: 'time_24h', conversionFactor: 1, precision: 0 },

  // Timezone Options - Maritime timezone management
  { id: 'utc', name: 'Coordinated Universal Time', symbol: 'UTC', system: 'nautical', category: 'timezone', baseUnit: 'utc', conversionFactor: 1, precision: 0 },
  { id: 'local_device', name: 'Device Local Time', symbol: 'LT', system: 'metric', category: 'timezone', baseUnit: 'utc', conversionFactor: 1, precision: 0 },
  { id: 'ship_time', name: 'Ship\'s Time Zone', symbol: 'Ship', system: 'nautical', category: 'timezone', baseUnit: 'utc', conversionFactor: 1, precision: 0 },
  { id: 'utc_plus_offset', name: 'UTC with Offset', symbol: 'UTC±', system: 'nautical', category: 'timezone', baseUnit: 'utc', conversionFactor: 1, precision: 0 },
];

// Default unit preferences by system - Marine-focused with separate vessel/wind speeds and depth
const SYSTEM_DEFAULTS: Record<UnitSystem, Record<string, string>> = {
  metric: {
    distance: 'kilometer',
    depth: 'meter',
    vessel_speed: 'kmh_vessel',
    wind_speed: 'kmh_wind',
    temperature: 'celsius',
    pressure: 'bar',
    volume: 'liter',
    weight: 'kilogram',
    angle: 'degree',
    voltage: 'volt',
    current: 'ampere',
    coordinates: 'decimal_degrees',
    capacity: 'ampere_hour',
    flow_rate: 'liter_per_hour',
    time: 'hour',
    date: 'iso_date',
    time_format: 'time_24h',
    timezone: 'utc',
  },
  imperial: {
    distance: 'mile',
    depth: 'foot',
    vessel_speed: 'mph_vessel',
    wind_speed: 'mph_wind',
    temperature: 'fahrenheit',
    pressure: 'psi',
    volume: 'gallon_us',
    weight: 'pound',
    angle: 'degree',
    voltage: 'volt',
    current: 'ampere',
    coordinates: 'degrees_minutes',
    capacity: 'ampere_hour',
    flow_rate: 'gallon_us_per_hour',
    time: 'hour',
    date: 'us_date',
    time_format: 'time_12h',
    timezone: 'local_device',
  },
  nautical: {
    distance: 'nautical_mile',
    depth: 'meter', // EU standard - meters for depth
    vessel_speed: 'knots',
    wind_speed: 'knots_wind', // EU standard - knots for wind
    temperature: 'celsius',
    pressure: 'bar',
    volume: 'liter',
    weight: 'kilogram',
    angle: 'degree',
    voltage: 'volt',
    current: 'ampere',
    coordinates: 'degrees_minutes',
    capacity: 'ampere_hour',
    flow_rate: 'liter_per_hour',
    time: 'hour',
    date: 'nautical_date',
    time_format: 'time_24h_full',
    timezone: 'utc',
  },
};

export function useUnitConversion(options: UseUnitConversionOptions = {}): UseUnitConversionReturn {
  const {
    defaultSystem = 'nautical',
    autoDetectSystem = false,
    defaultMarineRegion = 'eu', // Default to EU conventions
    enableRealTimeConversion = true,
    cacheConversions = true,
    validateUnits = true,
    showUnitSymbols = true,
    abbreviateUnits = true,
    onUnitChanged,
    onFormatChanged,
    onSystemChanged,
    onError,
  } = options;

  // Settings store access
  const settingsStore = useSettingsStore();
  const { units, gps, shipTime, setUnit, setGpsSetting, setShipTimeSetting } = settingsStore;

  // Local state for preferences
  const [preferences, setPreferences] = useState<ConversionPreference[]>([]);
  const [conversionCache, setConversionCache] = useState<Map<string, number>>(new Map());
  const [marineRegion, setMarineRegionState] = useState<'eu' | 'us' | 'uk' | 'international'>(defaultMarineRegion);

  // Cache size limit: 100 entries (enough for active conversions, prevents unbounded growth)
  const MAX_CACHE_SIZE = 100;

  // Sync settings store units to conversion preferences
  useEffect(() => {
    const categoryMapping: Record<string, string> = {
      'wind': 'wind_speed',
      'speed': 'vessel_speed',
      'depth': 'depth',
      'distance': 'distance',
      'temperature': 'temperature',
      'pressure': 'pressure',
      'volume': 'volume',
    };

    const unitIdMapping: Record<string, Record<string, string>> = {
      wind_speed: {
        'knots': 'knots_wind',
        'mph': 'mph_wind', 
        'kmh': 'kmh_wind',
        'ms': 'mps_wind', // Fixed: 'ms' maps to 'mps_wind' in unit definitions
        'beaufort': 'beaufort',
      },
      vessel_speed: {
        'knots': 'knots',
        'mph': 'mph_vessel',
        'kmh': 'kmh_vessel', 
        'ms': 'mps_vessel', // Fixed: 'ms' maps to 'mps_vessel' in unit definitions
      },
      depth: {
        'meters': 'meter',
        'feet': 'foot',
        'fathoms': 'fathom',
      },
      distance: {
        'nautical': 'nautical_mile',
        'statute': 'mile',
        'metric': 'kilometer',
      },
      temperature: {
        'celsius': 'celsius',
        'fahrenheit': 'fahrenheit',
      },
      pressure: {
        'bar': 'bar',
        'psi': 'psi',
        'kpa': 'kilopascal',
      },
      volume: {
        'liters': 'liter',
        'gallons': 'gallon_us',
        'imperial-gallons': 'gallon_uk',
      },
    };

    const newPreferences: ConversionPreference[] = [];
    
    // Handle regular units
    Object.entries(units).forEach(([storeCategory, storeUnit]) => {
      const conversionCategory = categoryMapping[storeCategory];
      if (conversionCategory && unitIdMapping[conversionCategory]) {
        const preferredUnitId = unitIdMapping[conversionCategory][storeUnit];
        if (preferredUnitId) {
          // Get the unit definition to set proper regional format defaults
          const unit = UNIT_DEFINITIONS.find(u => u.id === preferredUnitId);
          const defaultFormat = unit?.marineRegionDefaults?.[marineRegion] || 
                                unit?.displayFormats?.find(f => f.isDefault)?.id;
          
          newPreferences.push({
            category: conversionCategory,
            preferredUnit: preferredUnitId,
            preferredFormat: defaultFormat,
            marineRegion: marineRegion,
          });
        } else {
          console.warn(`🔧 No unit mapping found for ${storeCategory}:${storeUnit}`);
        }
      } else {
        console.warn(`🔧 No category mapping found for ${storeCategory}`);
      }
    });

    // Handle GPS-specific settings
    newPreferences.push({
      category: 'coordinates',
      preferredUnit: gps.coordinateFormat,
      marineRegion: marineRegion,
    });
    
    newPreferences.push({
      category: 'date',
      preferredUnit: gps.dateFormat,
      marineRegion: marineRegion,
    });
    
    newPreferences.push({
      category: 'time_format',
      preferredUnit: gps.timeFormat,
      marineRegion: marineRegion,
    });
    
    newPreferences.push({
      category: 'timezone',
      preferredUnit: gps.timezone,
      marineRegion: marineRegion,
    });

    // Handle Ship Time settings (separate from GPS)
    newPreferences.push({
      category: 'ship_date',
      preferredUnit: shipTime.dateFormat,
      marineRegion: marineRegion,
    });
    
    newPreferences.push({
      category: 'ship_time_format',
      preferredUnit: shipTime.timeFormat,
      marineRegion: marineRegion,
    });
    
    newPreferences.push({
      category: 'ship_timezone',
      preferredUnit: shipTime.timezone,
      marineRegion: marineRegion,
    });

    setPreferences(newPreferences);
    console.log('🔄 Unit preferences synced:', { 
      units, 
      gps,
      shipTime,
      newPreferences,
      currentWindUnit: units.wind,
      mappedWindPref: newPreferences.find(p => p.category === 'wind_speed'),
      allMappings: Object.fromEntries(newPreferences.map(p => [p.category, p.preferredUnit])),
      timestamp: new Date().toISOString()
    });
  }, [units, gps, shipTime, marineRegion]); // Add gps and shipTime dependencies

  // Infer current system from unit preferences
  const currentSystem = useMemo((): UnitSystem => {
    // Check if we have specific marine preferences that indicate nautical system
    const vesselSpeedPref = preferences.find(p => p.category === 'vessel_speed')?.preferredUnit;
    const windSpeedPref = preferences.find(p => p.category === 'wind_speed')?.preferredUnit;
    
    if (vesselSpeedPref === 'knots' || windSpeedPref === 'beaufort') return 'nautical';
    if (vesselSpeedPref?.includes('kmh') || windSpeedPref?.includes('kmh')) return 'metric';
    if (vesselSpeedPref?.includes('mph') || windSpeedPref?.includes('mph')) return 'imperial';
    
    // Fallback to legacy inference
    if (units.distance === 'nautical' && units.speed === 'knots') return 'nautical';
    if (units.distance === 'metric' && units.speed === 'kmh') return 'metric';
    if (units.distance === 'statute' && units.speed === 'mph') return 'imperial';
    return defaultSystem;
  }, [units, defaultSystem, preferences]);

  // Memoized unit definitions
  const availableUnits = useMemo(() => UNIT_DEFINITIONS, []);

  // Unit lookup utility
  const findUnit = useCallback((unitId: string) => {
    return availableUnits.find(u => u.id === unitId);
  }, [availableUnits]);

  // System management
  const setSystem = useCallback((system: UnitSystem) => {
    // Update individual unit settings based on system
    const systemDefaults = SYSTEM_DEFAULTS[system];
    
    // Map our categories to store unit categories - maintain backward compatibility
    if (systemDefaults.distance) {
      const distanceMapping: Record<string, any> = {
        'meter': 'metric',
        'foot': 'statute', 
        'nautical_mile': 'nautical'
      };
      const mappedDistance = distanceMapping[systemDefaults.distance];
      if (mappedDistance) setUnit('distance', mappedDistance);
    }
    
    // For vessel speed, map to the legacy 'speed' setting for backward compatibility
    if (systemDefaults.vessel_speed) {
      const speedMapping: Record<string, any> = {
        'kmh_vessel': 'kmh',
        'mph_vessel': 'mph',
        'knots': 'knots'
      };
      const mappedSpeed = speedMapping[systemDefaults.vessel_speed];
      if (mappedSpeed) setUnit('speed', mappedSpeed);
    }
    
    // Apply all system defaults to preferences for fine-grained control
    const newPreferences: ConversionPreference[] = Object.entries(systemDefaults).map(([category, unitId]) => ({
      category,
      preferredUnit: unitId,
    }));
    
    setPreferences(newPreferences);
    onSystemChanged?.(system);
  }, [setUnit, onSystemChanged]);

  const switchToMetric = useCallback(() => setSystem('metric'), [setSystem]);
  const switchToImperial = useCallback(() => setSystem('imperial'), [setSystem]);
  const switchToNautical = useCallback(() => setSystem('nautical'), [setSystem]);

  // Marine region management
  const setMarineRegion = useCallback((region: 'eu' | 'us' | 'uk' | 'international') => {
    setMarineRegionState(region);
    // Update all preferences to use regional defaults
    const updatedPreferences = preferences.map(pref => {
      const unit = findUnit(pref.preferredUnit);
      if (unit?.marineRegionDefaults?.[region]) {
        return { ...pref, preferredFormat: unit.marineRegionDefaults[region], marineRegion: region };
      }
      return { ...pref, marineRegion: region };
    });
    setPreferences(updatedPreferences);
  }, [preferences, findUnit]);

  // Unit preference management
  const setPreferredUnit = useCallback((category: string, unitId: string) => {
    const unit = findUnit(unitId);
    const defaultFormat = unit?.marineRegionDefaults?.[marineRegion] || 
                          unit?.displayFormats?.find(f => f.isDefault)?.id;
    
    setPreferences(prev => {
      const filtered = prev.filter(p => p.category !== category);
      return [...filtered, { 
        category, 
        preferredUnit: unitId,
        preferredFormat: defaultFormat,
        marineRegion: marineRegion
      }];
    });
    
    // Also update settings store for persistence
    const settingsCategoryMapping: Record<string, string> = {
      'wind_speed': 'wind',
      'vessel_speed': 'speed',
      'depth': 'depth',
      'distance': 'distance',
      'temperature': 'temperature',
      'pressure': 'pressure',
      'volume': 'volume',
    };

    const settingsUnitMapping: Record<string, Record<string, string>> = {
      wind: {
        'knots_wind': 'knots',
        'mph_wind': 'mph', 
        'kmh_wind': 'kmh',
        'mps_wind': 'ms', // Fixed: 'mps_wind' maps back to 'ms' in settings store
        'beaufort': 'beaufort',
      },
      speed: {
        'knots': 'knots',
        'mph_vessel': 'mph',
        'kmh_vessel': 'kmh', 
        'mps_vessel': 'ms', // Fixed: 'mps_vessel' maps back to 'ms' in settings store
      },
      depth: {
        'meter': 'meters',
        'foot': 'feet',
        'fathom': 'fathoms',
      },
      distance: {
        'nautical_mile': 'nautical',
        'mile': 'statute',
        'kilometer': 'metric',
      },
      temperature: {
        'celsius': 'celsius',
        'fahrenheit': 'fahrenheit',
      },
      pressure: {
        'bar': 'bar',
        'psi': 'psi',
        'kilopascal': 'kpa',
      },
      volume: {
        'liter': 'liters',
        'gallon_us': 'gallons',
        'gallon_uk': 'imperial-gallons',
      },
    };

    const settingsCategory = settingsCategoryMapping[category];
    if (settingsCategory && settingsUnitMapping[settingsCategory]) {
      const settingsUnit = settingsUnitMapping[settingsCategory][unitId];
      if (settingsUnit) {
        console.log('💾 Saving unit to settings store:', { category, unitId, settingsCategory, settingsUnit });
        setUnit(settingsCategory as any, settingsUnit);
      }
    }
    
    onUnitChanged?.(category, unitId);
  }, [onUnitChanged, setUnit, findUnit, marineRegion]);

  // Format preference management
  const setPreferredFormat = useCallback((category: string, unitId: string, formatId: string) => {
    setPreferences(prev => {
      return prev.map(pref => {
        if (pref.category === category && pref.preferredUnit === unitId) {
          return { ...pref, preferredFormat: formatId };
        }
        return pref;
      });
    });
    onFormatChanged?.(category, unitId, formatId);
  }, [onFormatChanged]);

  const getPreferredFormat = useCallback((category: string, unitId: string): DisplayFormat | undefined => {
    const preference = preferences.find(p => p.category === category && p.preferredUnit === unitId);
    const unit = findUnit(unitId);
    
    if (preference?.preferredFormat) {
      return unit?.displayFormats?.find(f => f.id === preference.preferredFormat);
    }
    
    // Fallback to regional default or first default format
    const regionalDefault = unit?.marineRegionDefaults?.[marineRegion];
    if (regionalDefault) {
      return unit?.displayFormats?.find(f => f.id === regionalDefault);
    }
    
    return unit?.displayFormats?.find(f => f.isDefault);
  }, [preferences, findUnit, marineRegion]);

  // Format utilities
  const getAvailableFormats = useCallback((unitId: string): DisplayFormat[] => {
    const unit = findUnit(unitId);
    return unit?.displayFormats || [];
  }, [findUnit]);

  const getDefaultFormat = useCallback((unitId: string, region?: 'eu' | 'us' | 'uk' | 'international'): DisplayFormat | undefined => {
    const unit = findUnit(unitId);
    const targetRegion = region || marineRegion;
    
    const regionalDefault = unit?.marineRegionDefaults?.[targetRegion];
    if (regionalDefault) {
      return unit?.displayFormats?.find(f => f.id === regionalDefault);
    }
    
    return unit?.displayFormats?.find(f => f.isDefault);
  }, [findUnit, marineRegion]);

  const getPreferredUnit = useCallback((category: string): UnitDefinition | undefined => {
    const preference = preferences.find(p => p.category === category);
    const unitId = preference?.preferredUnit || SYSTEM_DEFAULTS[currentSystem][category];
    const result = availableUnits.find(u => u.id === unitId);
    
    return result;
  }, [preferences, currentSystem, availableUnits]);

  const resetPreferences = useCallback((category?: string) => {
    if (category) {
      setPreferences(prev => prev.filter(p => p.category !== category));
    } else {
      setPreferences([]);
    }
  }, []);

  // Core conversion functions
  const convert = useCallback((value: number, fromUnit: string, toUnit: string): number | null => {
    if (fromUnit === toUnit) return value;
    
    const cacheKey = `${value}:${fromUnit}:${toUnit}`;
    if (cacheConversions && conversionCache.has(cacheKey)) {
      return conversionCache.get(cacheKey)!;
    }

    const fromDef = availableUnits.find(u => u.id === fromUnit);
    const toDef = availableUnits.find(u => u.id === toUnit);
    
    if (!fromDef || !toDef) {
      onError?.(`Unknown unit: ${!fromDef ? fromUnit : toUnit}`);
      return null;
    }
    
    if (fromDef.category !== toDef.category) {
      onError?.(`Cannot convert between different categories: ${fromDef.category} and ${toDef.category}`);
      return null;
    }

    let result: number;
    
    // Special handling for wind speed with Beaufort scale
    if (fromDef.category === 'wind_speed' && (fromUnit === 'beaufort' || toUnit === 'beaufort')) {
      if (fromUnit === 'beaufort') {
        // Convert Beaufort to knots first, then to target unit
        const knots = beaufortToKnots(value);
        if (toUnit === 'beaufort') {
          result = value; // Same unit
        } else {
          const knotsDef = availableUnits.find(u => u.id === 'knots_wind');
          if (knotsDef && toDef) {
            result = knots / toDef.conversionFactor;
          } else {
            result = knots;
          }
        }
      } else {
        // Convert from other wind unit to Beaufort via knots
        const baseKnots = value * fromDef.conversionFactor;
        result = knotsToBeaufort(baseKnots);
      }
    } 
    // Special handling for temperature
    else if (fromDef.category === 'temperature') {
      if (fromUnit === 'celsius' && toUnit === 'fahrenheit') {
        result = (value * 9/5) + 32;
      } else if (fromUnit === 'fahrenheit' && toUnit === 'celsius') {
        result = (value - 32) * 5/9;
      } else {
        result = value; // Same unit
      }
    } else {
      // Standard linear conversion through base unit
      const baseValue = value * fromDef.conversionFactor;
      result = baseValue / toDef.conversionFactor;
    }
    
    if (cacheConversions) {
      setConversionCache(prev => {
        const newCache = new Map(prev);
        
        // LRU eviction: if cache is full, remove oldest entry
        if (newCache.size >= MAX_CACHE_SIZE) {
          const firstKey = newCache.keys().next().value;
          newCache.delete(firstKey);
        }
        
        newCache.set(cacheKey, result);
        return newCache;
      });
    }
    
    return result;
  }, [availableUnits, cacheConversions, conversionCache, onError]);

  const convertToPreferred = useCallback((value: number, fromUnit: string) => {
    // Handle null/undefined values
    if (value === null || value === undefined || isNaN(value)) return null;
    
    const fromDef = availableUnits.find(u => u.id === fromUnit);
    if (!fromDef) return null;
    
    const preferredUnit = getPreferredUnit(fromDef.category);
    if (!preferredUnit) return null;
    
    const convertedValue = convert(value, fromUnit, preferredUnit.id);
    if (convertedValue === null) return null;
    
    return { value: convertedValue, unit: preferredUnit };
  }, [availableUnits, getPreferredUnit, convert]);

  const convertFromBase = useCallback((value: number, category: string, targetUnit?: string) => {
    const unit = targetUnit ? availableUnits.find(u => u.id === targetUnit) : getPreferredUnit(category);
    if (!unit) {
      // Fallback to first unit in category
      const fallbackUnit = availableUnits.find(u => u.category === category);
      if (!fallbackUnit) throw new Error(`No units found for category: ${category}`);
      return { value, unit: fallbackUnit };
    }
    
    return { value, unit };
  }, [availableUnits, getPreferredUnit]);

  // Formatting functions
  const format = useCallback((value: number, unitId: string, options: { precision?: number; showSymbol?: boolean; formatId?: string } = {}) => {
    const unit = availableUnits.find(u => u.id === unitId);
    if (!unit) return value.toString();
    
    // Use specific format if provided
    if (options.formatId) {
      const displayFormat = unit.displayFormats?.find(f => f.id === options.formatId);
      if (displayFormat) {
        const formattedValue = displayFormat.formatter(value);
        if (options.showSymbol ?? showUnitSymbols) {
          return `${formattedValue} ${abbreviateUnits ? unit.symbol : unit.name}`;
        }
        return formattedValue;
      }
    }
    
    // Use preferred format for this unit
    const preferredFormat = getPreferredFormat(unit.category, unitId);
    if (preferredFormat) {
      // Check if format condition is met
      if (!preferredFormat.condition || preferredFormat.condition(value)) {
        const formattedValue = preferredFormat.formatter(value);
        if (options.showSymbol ?? showUnitSymbols) {
          return `${formattedValue} ${abbreviateUnits ? unit.symbol : unit.name}`;
        }
        return formattedValue;
      }
    }
    
    // Fallback to legacy format function or precision
    if (unit.format) {
      return unit.format(value);
    }
    
    const precision = options.precision ?? unit.precision;
    const formattedValue = value.toFixed(precision);
    
    if (options.showSymbol ?? showUnitSymbols) {
      return `${formattedValue} ${abbreviateUnits ? unit.symbol : unit.name}`;
    }
    
    return formattedValue;
  }, [availableUnits, showUnitSymbols, abbreviateUnits, getPreferredFormat]);

  const formatWithPreferred = useCallback((value: number, fromUnit: string, options: { showBoth?: boolean; precision?: number; formatId?: string } = {}) => {
    const converted = convertToPreferred(value, fromUnit);
    if (!converted) return format(value, fromUnit, options);
    
    const preferredFormatted = format(converted.value, converted.unit.id, options);
    
    if (options.showBoth && fromUnit !== converted.unit.id) {
      const originalFormatted = format(value, fromUnit, options);
      return `${preferredFormatted} (${originalFormatted})`;
    }
    
    return preferredFormatted;
  }, [convertToPreferred, format]);

  // Unit utilities
  const getUnitsInCategory = useCallback((category: string) => {
    return availableUnits.filter(u => u.category === category);
  }, [availableUnits]);

  const getUnitsBySystem = useCallback((system: UnitSystem) => {
    return availableUnits.filter(u => u.system === system);
  }, [availableUnits]);

  const getCategories = useCallback(() => {
    return [...new Set(availableUnits.map(u => u.category))];
  }, [availableUnits]);

  // Validation
  const validateConversion = useCallback((fromUnit: string, toUnit: string): { valid: boolean; error?: string } => {
    const fromDef = findUnit(fromUnit);
    const toDef = findUnit(toUnit);
    
    if (!fromDef) {
      return { valid: false, error: `Unknown source unit: ${fromUnit}` };
    }
    
    if (!toDef) {
      return { valid: false, error: `Unknown target unit: ${toUnit}` };
    }
    
    if (fromDef.category !== toDef.category) {
      return { valid: false, error: `Cannot convert between ${fromDef.category} and ${toDef.category}` };
    }
    
    return { valid: true };
  }, [findUnit]);

  const isCompatible = useCallback((unit1: string, unit2: string): boolean => {
    const def1 = findUnit(unit1);
    const def2 = findUnit(unit2);
    return !!(def1 && def2 && def1.category === def2.category);
  }, [findUnit]);

  // Presets and bulk operations
  const applySystemPreset = useCallback((system: UnitSystem) => {
    const systemDefaults = SYSTEM_DEFAULTS[system];
    const newPreferences: ConversionPreference[] = Object.entries(systemDefaults).map(([category, unitId]) => ({
      category,
      preferredUnit: unitId,
    }));
    
    setPreferences(newPreferences);
    setSystem(system);
  }, [setSystem]);

  const bulkConvert = useCallback((values: Array<{ value: number; unit: string }>, targetSystem: UnitSystem) => {
    return values.map(({ value, unit }) => {
      const fromDef = findUnit(unit);
      if (!fromDef) return { value, unit: { id: unit, name: unit, symbol: unit } as UnitDefinition };
      
      const targetUnitId = SYSTEM_DEFAULTS[targetSystem][fromDef.category];
      const targetUnit = findUnit(targetUnitId);
      if (!targetUnit) return { value, unit: fromDef };
      
      const convertedValue = convert(value, unit, targetUnitId);
      return {
        value: convertedValue ?? value,
        unit: targetUnit,
      };
    });
  }, [findUnit, convert]);

  // Import/Export
  const exportPreferences = useCallback(() => {
    return preferences;
  }, [preferences]);

  const importPreferences = useCallback((newPreferences: ConversionPreference[]) => {
    // Validate preferences before importing
    const validPreferences = newPreferences.filter(pref => {
      const unit = findUnit(pref.preferredUnit);
      return unit && unit.category === pref.category;
    });
    
    setPreferences(validPreferences);
  }, [findUnit]);

  // ===== NEW SIMPLIFIED FUNCTIONS FOR WIDGET USAGE =====
  
  /**
   * Get the preferred unit symbol for a category
   * @param category - Unit category (e.g., 'voltage', 'current', 'temperature')
   * @returns Unit symbol string (e.g., 'V', 'A', '°C')
   */
  const getPreferredUnitSymbol = useCallback((category: string): string => {
    const preferredUnit = getPreferredUnit(category);
    return preferredUnit?.symbol || '';
  }, [getPreferredUnit]);

  /**
   * Convert and format a value with error handling
   * @param value - Raw value (can be null/undefined)
   * @param category - Unit category for conversion
   * @param fromUnit - Source unit ID (optional, will infer from category)
   * @returns Formatted string value ('---' for null/undefined)
   */
  const convertAndFormat = useCallback((
    value: number | null | undefined, 
    category: string, 
    fromUnit?: string
  ): string => {
    if (value === null || value === undefined || isNaN(value)) return '---';
    
    // Determine source unit - use fromUnit or infer from category
    const sourceUnit = fromUnit || (() => {
      // Map categories to their base units for conversion
      const categoryBaseUnits: Record<string, string> = {
        'voltage': 'volt',
        'current': 'ampere', 
        'temperature': 'celsius',
        'vessel_speed': 'knots',
        'wind_speed': 'knots_wind',
        'depth': 'meter',
        'distance': 'meter',
        'angle': 'degree',
        'pressure': 'pascal',
        'volume': 'liter',
        'weight': 'kilogram',
        'capacity': 'ampere_hour',
        'flow_rate': 'liter_per_hour',
        'time': 'hour',
      };
      return categoryBaseUnits[category] || 'meter';
    })();
    
    const converted = convertToPreferred(value, sourceUnit);
    if (converted) {
      return converted.value.toFixed(converted.unit.precision || 1);
    }
    
    // Fallback to original value with reasonable precision
    return value.toFixed(1);
  }, [convertToPreferred]);

  /**
   * Get consistent width styling for metric cells to prevent layout jumping
   * @param category - Unit category 
   * @param unitSymbol - Optional unit symbol for additional context
   * @param unitId - Optional specific unit ID to get unit-specific formatting
   * @returns Object with minWidth, textAlign, typography properties, and format pattern for consistent cell sizing
   */
  const getConsistentWidth = useCallback((
    category: string, 
    unitSymbol?: string,
    unitId?: string
  ): { 
    minWidth: number; 
    textAlign: 'right' | 'center' | 'left';
    letterSpacing?: number;
    formatPattern?: string;
  } => {
    // If specific unit ID provided, get unit-specific pattern
    if (unitId) {
      if (unitId === 'beaufort') {

        // Use the same width as wind_speed category for consistent grid alignment
        const windSpeedWidth = getConsistentFormatWidth('wind_speed', unitSymbol || '');
        return {
          minWidth: windSpeedWidth.minWidth, // Same width as other wind speeds for grid alignment
          textAlign: 'right',
          letterSpacing: 0.05,
          formatPattern: '99' // Beaufort scale is 0-12, but use same space as decimal
        };
      } else if (unitId === 'degree') {
        return {
          minWidth: getConsistentFormatWidth('angle', unitSymbol || '').minWidth,
          textAlign: 'right', 
          letterSpacing: 0.05,
          formatPattern: '999' // Angles are integers
        };
      }
    }
    
    return getConsistentFormatWidth(category, unitSymbol || '');
  }, []);

  /**
   * Get formatted value with unit for direct use in MetricCells
   * @param value - Raw value (can be null/undefined)
   * @param category - Unit category for conversion
   * @param fromUnit - Source unit ID (optional, will infer from category)
   * @returns Object with formatted value and unit symbol
   */
  const getFormattedValueWithUnit = useCallback((
    value: number | null | undefined,
    category: string,
    fromUnit?: string
  ): { value: string; unit: string } => {
    if (value === null || value === undefined) {
      return {
        value: '---',
        unit: getPreferredUnitSymbol(category) || ''
      };
    }

    // Get the format pattern for decimal alignment - will be updated based on actual converted unit
    let formatPattern: string | undefined;

    // Determine source unit
    const sourceUnit = fromUnit || (() => {
      const categoryBaseUnits: Record<string, string> = {
        'voltage': 'volt',
        'current': 'ampere',
        'temperature': 'celsius', 
        'vessel_speed': 'knots',
        'wind_speed': 'knots_wind',
        'depth': 'meter',
        'distance': 'meter', 
        'angle': 'degree',
        'pressure': 'pascal',
        'volume': 'liter',
        'weight': 'kilogram',
        'capacity': 'ampere_hour',
        'flow_rate': 'liter_per_hour',
        'time': 'hour',
      };
      return categoryBaseUnits[category] || 'meter';
    })();

    const converted = convertToPreferred(value, sourceUnit);
    const debugInfo = { 
      value, 
      category, 
      sourceUnit, 
      converted,
      formatPattern,
      preferences: preferences.filter(p => p.category === category),
      timestamp: new Date().toISOString(),
      settingsStoreUnits: units
    };
    console.log('🔄 Unit conversion debug:', debugInfo);
    
    if (converted) {
      // Determine format pattern based on the actual converted unit
      if (converted.unit.id === 'beaufort') {
        formatPattern = '99'; // Beaufort is always integer (0-12)
      } else if (converted.unit.category === 'wind_speed') {
        formatPattern = '99.9'; // Other wind speeds use decimal
      } else if (converted.unit.category === 'angle') {
        formatPattern = '999'; // Angles are integers for navigation
      } else {
        // Use the category default pattern
        const widthInfo = getConsistentWidth(category);
        formatPattern = widthInfo.formatPattern;
      }

      // Use the new format system for proper formatting
      const preferredFormat = getPreferredFormat(category, converted.unit.id);
      let formattedValue: string;
      
      if (preferredFormat) {
        // Check if format condition is met, then use formatter
        if (!preferredFormat.condition || preferredFormat.condition(converted.value)) {
          formattedValue = preferredFormat.formatter(converted.value);
        } else {
          // Find alternative format that matches the condition
          const unit = findUnit(converted.unit.id);
          const alternativeFormat = unit?.displayFormats?.find(f => 
            f.id !== preferredFormat.id && (!f.condition || f.condition(converted.value))
          );
          formattedValue = alternativeFormat ? 
            alternativeFormat.formatter(converted.value) : 
            converted.value.toFixed(converted.unit.precision || 1);
        }
      } else {
        formattedValue = converted.value.toFixed(converted.unit.precision || 1);
      }
      
      // Apply decimal-aligned formatting if pattern is available
      if (formatPattern) {
        formattedValue = formatToPattern(parseFloat(formattedValue), formatPattern);
      }
      
      return {
        value: formattedValue,
        unit: converted.unit.symbol
      };
    }

    // Fallback - get preferred unit symbol even if conversion failed
    const preferredUnit = getPreferredUnit(category);
    if (value === null || value === undefined || isNaN(value)) {
      return {
        value: '---',
        unit: preferredUnit?.symbol || ''
      };
    }
    
    // Determine format pattern for fallback based on preferred unit
    if (preferredUnit?.id === 'beaufort') {
      formatPattern = '99'; // Beaufort is always integer
    } else if (preferredUnit?.category === 'wind_speed') {
      formatPattern = '99.9'; // Other wind speeds use decimal
    } else if (preferredUnit?.category === 'angle') {
      formatPattern = '999'; // Angles are integers
    } else {
      // Use the category default pattern
      const widthInfo = getConsistentWidth(category);
      formatPattern = widthInfo.formatPattern;
    }
    
    // Apply pattern formatting to fallback value too
    let fallbackFormatted = value.toFixed(1);
    if (formatPattern) {
      fallbackFormatted = formatToPattern(value, formatPattern);
    }
    
    return {
      value: fallbackFormatted,
      unit: preferredUnit?.symbol || ''
    };
  }, [convertToPreferred, getPreferredUnitSymbol, getPreferredUnit, getPreferredFormat, findUnit, preferences, units, getConsistentWidth]);

  // ===== DATE/TIME FORMATTING FOR MARITIME APPLICATIONS =====
  
  /**
   * Get formatted date or time with preferred formatting
   * @param date - Date object to format
   * @param type - 'date' or 'time'
   * @param customTimezone - Optional timezone override
   * @returns Formatted date/time with appropriate timezone display
   */
  const getFormattedDateTime = useCallback((
    date: Date, 
    type: 'date' | 'time', 
    customTimezone?: string
  ): { value: string; unit: string } => {
    const timezone = customTimezone || getPreferredUnit('timezone')?.id || 'utc';
    
    if (type === 'date') {
      const dateFormat = getPreferredUnit('date')?.id || 'nautical_date';
      const formattedDate = formatDate(date, dateFormat, timezone);
      return {
        value: formattedDate,
        unit: ''
      };
    } else {
      const timeFormat = getPreferredUnit('time_format')?.id || 'time_24h';
      const formattedTime = formatTime(date, timeFormat, timezone);
      const timezoneDisplay = getTimezoneDisplay(timezone);
      return {
        value: formattedTime,
        unit: timezoneDisplay
      };
    }
  }, [getPreferredUnit]);

  /**
   * Get complete formatted date/time information for widgets
   * @param date - Date object to format
   * @returns Complete date/time formatting with timezone
   */
  const getFormattedDateTimeWithTimezone = useCallback((date: Date): { 
    date: string; 
    time: string; 
    timezone: string 
  } => {
    const timezone = getPreferredUnit('timezone')?.id || 'utc';
    const dateFormat = getPreferredUnit('date')?.id || 'nautical_date';
    const timeFormat = getPreferredUnit('time_format')?.id || 'time_24h';
    
    return {
      date: formatDate(date, dateFormat, timezone),
      time: formatTime(date, timeFormat, timezone),
      timezone: getTimezoneDisplay(timezone)
    };
  }, [getPreferredUnit]);

  /**
   * Get GPS-specific formatted date/time information using GPS settings
   * @param date - Date object to format
   * @returns GPS date/time formatting with GPS timezone
   */
  const getGpsFormattedDateTime = useCallback((date: Date): {
    date: string;
    time: string;
    timezone: string
  } => {
    const timezone = gps.timezone || 'utc';
    const dateFormat = gps.dateFormat || 'nautical_date';
    const timeFormat = gps.timeFormat || 'time_24h';

    return {
      date: formatDate(date, dateFormat, timezone),
      time: formatTime(date, timeFormat, timezone),
      timezone: getTimezoneDisplay(timezone)
    };
  }, [gps.timezone, gps.dateFormat, gps.timeFormat]);

  /**
   * Get Ship Time-specific formatted date/time information using Ship Time settings
   * @param date - Date object to format
   * @returns Ship Time date/time formatting with Ship Time timezone
   */
  const getShipFormattedDateTime = useCallback((date: Date): {
    date: string;
    time: string;
    timezone: string
  } => {
    const timezone = shipTime.timezone || 'utc';
    const dateFormat = shipTime.dateFormat || 'nautical_date';
    const timeFormat = shipTime.timeFormat || 'time_24h';

    return {
      date: formatDate(date, dateFormat, timezone),
      time: formatTime(date, timeFormat, timezone),
      timezone: getTimezoneDisplay(timezone)
    };
  }, [shipTime.timezone, shipTime.dateFormat, shipTime.timeFormat]);

  return {
    // Current system and preferences
    currentSystem,
    preferences,
    availableUnits,
    marineRegion,
    
    // System management
    setSystem,
    setMarineRegion,
    switchToMetric,
    switchToImperial,
    switchToNautical,
    
    // Unit preferences
    setPreferredUnit,
    setPreferredFormat,
    getPreferredUnit,
    getPreferredFormat,
    resetPreferences,
    
    // Format utilities
    getAvailableFormats,
    getDefaultFormat,
    
    // Conversion functions
    convert,
    convertToPreferred,
    convertFromBase,
    
    // Formatting functions
    format,
    formatWithPreferred,
    
    // NEW SIMPLIFIED FUNCTIONS
    getPreferredUnitSymbol,
    convertAndFormat,
    getFormattedValueWithUnit,
    getConsistentWidth,
    
    // DATE/TIME FORMATTING
    getFormattedDateTime,
    getFormattedDateTimeWithTimezone,
    getGpsFormattedDateTime,
    getShipFormattedDateTime,
    
    // Unit utilities
    getUnitsInCategory,
    getUnitsBySystem,
    findUnit,
    getCategories,
    
    // Validation
    validateConversion,
    isCompatible,
    
    // Presets and bulk operations
    applySystemPreset,
    bulkConvert,
    
    // Import/Export
    exportPreferences,
    importPreferences,
  };
}