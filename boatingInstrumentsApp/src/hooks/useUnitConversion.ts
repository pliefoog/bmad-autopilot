// useUnitConversion Hook
// Custom hook for unit conversion management with dynamic preferences and real-time conversion

import { useCallback, useMemo, useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';

// Unit system definitions
export type UnitSystem = 'metric' | 'imperial' | 'nautical';

export interface UnitDefinition {
  id: string;
  name: string;
  symbol: string;
  system: UnitSystem;
  category: string;
  baseUnit: string; // Reference unit for conversions
  conversionFactor: number; // Multiplier to convert from base unit
  conversionOffset?: number; // Offset for non-linear conversions (e.g., temperature)
  precision: number; // Decimal places for display
  format?: (value: number) => string; // Custom formatting function
}

export interface ConversionPreference {
  category: string;
  preferredUnit: string;
  displayPrecision?: number;
  showBothUnits?: boolean; // Show original and converted
  roundingMode?: 'round' | 'floor' | 'ceil' | 'trunc';
}

export interface UseUnitConversionOptions {
  // Global preferences
  defaultSystem?: UnitSystem;
  autoDetectSystem?: boolean;
  
  // Conversion behavior
  enableRealTimeConversion?: boolean;
  cacheConversions?: boolean;
  validateUnits?: boolean;
  
  // Display preferences
  showUnitSymbols?: boolean;
  abbreviateUnits?: boolean;
  
  // Callbacks
  onUnitChanged?: (category: string, newUnit: string) => void;
  onSystemChanged?: (newSystem: UnitSystem) => void;
  onError?: (error: string) => void;
}

export interface UseUnitConversionReturn {
  // Current system and preferences
  currentSystem: UnitSystem;
  preferences: ConversionPreference[];
  availableUnits: UnitDefinition[];
  
  // System management
  setSystem: (system: UnitSystem) => void;
  switchToMetric: () => void;
  switchToImperial: () => void;
  switchToNautical: () => void;
  
  // Unit preferences
  setPreferredUnit: (category: string, unitId: string) => void;
  getPreferredUnit: (category: string) => UnitDefinition | undefined;
  resetPreferences: (category?: string) => void;
  
  // Conversion functions
  convert: (value: number, fromUnit: string, toUnit: string) => number | null;
  convertToPreferred: (value: number, fromUnit: string) => { value: number; unit: UnitDefinition } | null;
  convertFromBase: (value: number, category: string, targetUnit?: string) => { value: number; unit: UnitDefinition };
  
  // Formatting functions
  format: (value: number, unit: string, options?: { precision?: number; showSymbol?: boolean }) => string;
  formatWithPreferred: (value: number, fromUnit: string, options?: { showBoth?: boolean; precision?: number }) => string;
  
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

// Comprehensive unit definitions
const UNIT_DEFINITIONS: UnitDefinition[] = [
  // Distance/Length
  { id: 'meter', name: 'Meter', symbol: 'm', system: 'metric', category: 'distance', baseUnit: 'meter', conversionFactor: 1, precision: 2 },
  { id: 'kilometer', name: 'Kilometer', symbol: 'km', system: 'metric', category: 'distance', baseUnit: 'meter', conversionFactor: 1000, precision: 2 },
  { id: 'centimeter', name: 'Centimeter', symbol: 'cm', system: 'metric', category: 'distance', baseUnit: 'meter', conversionFactor: 0.01, precision: 1 },
  { id: 'foot', name: 'Foot', symbol: 'ft', system: 'imperial', category: 'distance', baseUnit: 'meter', conversionFactor: 0.3048, precision: 2 },
  { id: 'yard', name: 'Yard', symbol: 'yd', system: 'imperial', category: 'distance', baseUnit: 'meter', conversionFactor: 0.9144, precision: 2 },
  { id: 'mile', name: 'Mile', symbol: 'mi', system: 'imperial', category: 'distance', baseUnit: 'meter', conversionFactor: 1609.344, precision: 2 },
  { id: 'nautical_mile', name: 'Nautical Mile', symbol: 'NM', system: 'nautical', category: 'distance', baseUnit: 'meter', conversionFactor: 1852, precision: 2 },
  { id: 'fathom', name: 'Fathom', symbol: 'fth', system: 'nautical', category: 'distance', baseUnit: 'meter', conversionFactor: 1.8288, precision: 2 },

  // Speed
  { id: 'mps', name: 'Meters per Second', symbol: 'm/s', system: 'metric', category: 'speed', baseUnit: 'mps', conversionFactor: 1, precision: 2 },
  { id: 'kmh', name: 'Kilometers per Hour', symbol: 'km/h', system: 'metric', category: 'speed', baseUnit: 'mps', conversionFactor: 0.277778, precision: 1 },
  { id: 'mph', name: 'Miles per Hour', symbol: 'mph', system: 'imperial', category: 'speed', baseUnit: 'mps', conversionFactor: 0.44704, precision: 1 },
  { id: 'knots', name: 'Knots', symbol: 'kts', system: 'nautical', category: 'speed', baseUnit: 'mps', conversionFactor: 0.514444, precision: 1 },
  { id: 'fps', name: 'Feet per Second', symbol: 'ft/s', system: 'imperial', category: 'speed', baseUnit: 'mps', conversionFactor: 0.3048, precision: 2 },

  // Temperature
  { id: 'celsius', name: 'Celsius', symbol: '°C', system: 'metric', category: 'temperature', baseUnit: 'celsius', conversionFactor: 1, precision: 1 },
  { id: 'fahrenheit', name: 'Fahrenheit', symbol: '°F', system: 'imperial', category: 'temperature', baseUnit: 'celsius', conversionFactor: 1, conversionOffset: 32, precision: 1,
    format: (value: number) => ((value * 9/5) + 32).toFixed(1) + '°F' },
  { id: 'kelvin', name: 'Kelvin', symbol: 'K', system: 'metric', category: 'temperature', baseUnit: 'celsius', conversionFactor: 1, conversionOffset: 273.15, precision: 1 },

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

  // Angular
  { id: 'degree', name: 'Degree', symbol: '°', system: 'metric', category: 'angle', baseUnit: 'degree', conversionFactor: 1, precision: 1 },
  { id: 'radian', name: 'Radian', symbol: 'rad', system: 'metric', category: 'angle', baseUnit: 'degree', conversionFactor: 57.2958, precision: 4 },
  { id: 'mil', name: 'Mil', symbol: 'mil', system: 'imperial', category: 'angle', baseUnit: 'degree', conversionFactor: 0.05625, precision: 2 },

  // Electrical
  { id: 'volt', name: 'Volt', symbol: 'V', system: 'metric', category: 'voltage', baseUnit: 'volt', conversionFactor: 1, precision: 2 },
  { id: 'millivolt', name: 'Millivolt', symbol: 'mV', system: 'metric', category: 'voltage', baseUnit: 'volt', conversionFactor: 0.001, precision: 1 },
  { id: 'ampere', name: 'Ampere', symbol: 'A', system: 'metric', category: 'current', baseUnit: 'ampere', conversionFactor: 1, precision: 2 },
  { id: 'milliampere', name: 'Milliampere', symbol: 'mA', system: 'metric', category: 'current', baseUnit: 'ampere', conversionFactor: 0.001, precision: 0 },
];

// Default unit preferences by system
const SYSTEM_DEFAULTS: Record<UnitSystem, Record<string, string>> = {
  metric: {
    distance: 'meter',
    speed: 'kmh',
    temperature: 'celsius',
    pressure: 'bar',
    volume: 'liter',
    weight: 'kilogram',
    angle: 'degree',
    voltage: 'volt',
    current: 'ampere',
  },
  imperial: {
    distance: 'foot',
    speed: 'mph',
    temperature: 'fahrenheit',
    pressure: 'psi',
    volume: 'gallon_us',
    weight: 'pound',
    angle: 'degree',
    voltage: 'volt',
    current: 'ampere',
  },
  nautical: {
    distance: 'nautical_mile',
    speed: 'knots',
    temperature: 'celsius',
    pressure: 'bar',
    volume: 'liter',
    weight: 'kilogram',
    angle: 'degree',
    voltage: 'volt',
    current: 'ampere',
  },
};

export function useUnitConversion(options: UseUnitConversionOptions = {}): UseUnitConversionReturn {
  const {
    defaultSystem = 'nautical',
    autoDetectSystem = false,
    enableRealTimeConversion = true,
    cacheConversions = true,
    validateUnits = true,
    showUnitSymbols = true,
    abbreviateUnits = true,
    onUnitChanged,
    onSystemChanged,
    onError,
  } = options;

  // Settings store access
  const settingsStore = useSettingsStore();
  const { units, setUnit } = settingsStore;

  // Local state for preferences
  const [preferences, setPreferences] = useState<ConversionPreference[]>([]);
  const [conversionCache, setConversionCache] = useState<Map<string, number>>(new Map());

  // Infer current system from unit preferences
  const currentSystem = useMemo((): UnitSystem => {
    if (units.distance === 'nautical' && units.speed === 'knots') return 'nautical';
    if (units.distance === 'metric' && units.speed === 'kmh') return 'metric';
    if (units.distance === 'statute' && units.speed === 'mph') return 'imperial';
    return defaultSystem;
  }, [units, defaultSystem]);

  // Memoized unit definitions
  const availableUnits = useMemo(() => UNIT_DEFINITIONS, []);

  // System management
  const setSystem = useCallback((system: UnitSystem) => {
    // Update individual unit settings based on system
    const systemDefaults = SYSTEM_DEFAULTS[system];
    
    // Map our categories to store unit categories
    if (systemDefaults.distance) {
      const distanceMapping: Record<string, any> = {
        'meter': 'metric',
        'foot': 'statute', 
        'nautical_mile': 'nautical'
      };
      const mappedDistance = distanceMapping[systemDefaults.distance];
      if (mappedDistance) setUnit('distance', mappedDistance);
    }
    
    if (systemDefaults.speed) {
      const speedMapping: Record<string, any> = {
        'kmh': 'kmh',
        'mph': 'mph',
        'knots': 'knots'
      };
      const mappedSpeed = speedMapping[systemDefaults.speed];
      if (mappedSpeed) setUnit('speed', mappedSpeed);
    }
    
    onSystemChanged?.(system);
  }, [setUnit, onSystemChanged]);

  const switchToMetric = useCallback(() => setSystem('metric'), [setSystem]);
  const switchToImperial = useCallback(() => setSystem('imperial'), [setSystem]);
  const switchToNautical = useCallback(() => setSystem('nautical'), [setSystem]);

  // Unit preference management
  const setPreferredUnit = useCallback((category: string, unitId: string) => {
    setPreferences(prev => {
      const filtered = prev.filter(p => p.category !== category);
      return [...filtered, { category, preferredUnit: unitId }];
    });
    onUnitChanged?.(category, unitId);
  }, [onUnitChanged]);

  const getPreferredUnit = useCallback((category: string): UnitDefinition | undefined => {
    const preference = preferences.find(p => p.category === category);
    const unitId = preference?.preferredUnit || SYSTEM_DEFAULTS[currentSystem][category];
    return availableUnits.find(u => u.id === unitId);
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
    
    // Special handling for temperature
    if (fromDef.category === 'temperature') {
      if (fromUnit === 'celsius' && toUnit === 'fahrenheit') {
        result = (value * 9/5) + 32;
      } else if (fromUnit === 'fahrenheit' && toUnit === 'celsius') {
        result = (value - 32) * 5/9;
      } else if (fromUnit === 'celsius' && toUnit === 'kelvin') {
        result = value + 273.15;
      } else if (fromUnit === 'kelvin' && toUnit === 'celsius') {
        result = value - 273.15;
      } else if (fromUnit === 'fahrenheit' && toUnit === 'kelvin') {
        result = ((value - 32) * 5/9) + 273.15;
      } else if (fromUnit === 'kelvin' && toUnit === 'fahrenheit') {
        result = ((value - 273.15) * 9/5) + 32;
      } else {
        result = value; // Same unit
      }
    } else {
      // Standard linear conversion through base unit
      const baseValue = value * fromDef.conversionFactor;
      result = baseValue / toDef.conversionFactor;
    }
    
    if (cacheConversions) {
      setConversionCache(prev => new Map(prev).set(cacheKey, result));
    }
    
    return result;
  }, [availableUnits, cacheConversions, conversionCache, onError]);

  const convertToPreferred = useCallback((value: number, fromUnit: string) => {
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
  const format = useCallback((value: number, unitId: string, options: { precision?: number; showSymbol?: boolean } = {}) => {
    const unit = availableUnits.find(u => u.id === unitId);
    if (!unit) return value.toString();
    
    const precision = options.precision ?? unit.precision;
    const formattedValue = value.toFixed(precision);
    
    if (unit.format) {
      return unit.format(value);
    }
    
    if (options.showSymbol ?? showUnitSymbols) {
      return `${formattedValue} ${abbreviateUnits ? unit.symbol : unit.name}`;
    }
    
    return formattedValue;
  }, [availableUnits, showUnitSymbols, abbreviateUnits]);

  const formatWithPreferred = useCallback((value: number, fromUnit: string, options: { showBoth?: boolean; precision?: number } = {}) => {
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

  const findUnit = useCallback((unitId: string) => {
    return availableUnits.find(u => u.id === unitId);
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

  return {
    // Current system and preferences
    currentSystem,
    preferences,
    availableUnits,
    
    // System management
    setSystem,
    switchToMetric,
    switchToImperial,
    switchToNautical,
    
    // Unit preferences
    setPreferredUnit,
    getPreferredUnit,
    resetPreferences,
    
    // Conversion functions
    convert,
    convertToPreferred,
    convertFromBase,
    
    // Formatting functions
    format,
    formatWithPreferred,
    
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