/**
 * Semantic Data Categories for Marine Instruments
 * 
 * This defines the types of data that marine instruments display,
 * independent of how they're presented (units/formatting).
 * 
 * All values are stored internally in SI base units:
 * - depth: meters
 * - speed: meters/second 
 * - wind: meters/second
 * - temperature: celsius
 * - pressure: pascals
 * - angle: degrees
 */

export type DataCategory = 
  | 'depth'          // Water depth from sounder
  | 'speed'          // Vessel speed (SOG/STW)
  | 'wind'           // Wind speed (apparent/true)
  | 'temperature'    // Water/air temperature
  | 'pressure'       // Atmospheric/engine pressure
  | 'angle'          // Heading, bearing, wind angle
  | 'coordinates'    // GPS position
  | 'voltage'        // Electrical voltage
  | 'current'        // Electrical current
  | 'volume'         // Tank levels
  | 'time'           // Time/date display
  | 'distance';      // Navigation distances/ranges

export interface DataCategoryInfo {
  id: DataCategory;
  name: string;
  description: string;
  baseUnit: string;           // SI unit for internal storage
  icon: string;               // Icon for UI display
  precision: number;          // Default decimal places
  typical_range: [number, number]; // Typical value range in base units
}

export const DATA_CATEGORIES: Record<DataCategory, DataCategoryInfo> = {
  depth: {
    id: 'depth',
    name: 'Depth',
    description: 'Water depth from sounder',
    baseUnit: 'meters',
    icon: '🌊',
    precision: 1,
    typical_range: [0, 200]  // 0-200m typical recreational sailing
  },
  
  speed: {
    id: 'speed', 
    name: 'Speed',
    description: 'Vessel speed through water or over ground',
    baseUnit: 'meters_per_second',
    icon: '⚡',
    precision: 1,
    typical_range: [0, 15]   // 0-15 m/s (0-30 knots)
  },
  
  wind: {
    id: 'wind',
    name: 'Wind',
    description: 'Wind speed (apparent or true)',
    baseUnit: 'meters_per_second', 
    icon: '💨',
    precision: 1,
    typical_range: [0, 25]   // 0-25 m/s (0-50 knots)
  },
  
  temperature: {
    id: 'temperature',
    name: 'Temperature', 
    description: 'Water or air temperature',
    baseUnit: 'celsius',
    icon: '🌡️',
    precision: 1,
    typical_range: [-5, 35]  // -5°C to 35°C
  },
  
  pressure: {
    id: 'pressure',
    name: 'Pressure',
    description: 'Atmospheric or engine pressure',
    baseUnit: 'pascals',
    icon: '🔘',
    precision: 0,
    typical_range: [95000, 105000] // 950-1050 hPa
  },
  
  angle: {
    id: 'angle',
    name: 'Angle',
    description: 'Heading, bearing, or wind direction',
    baseUnit: 'degrees',
    icon: '🧭',
    precision: 0,
    typical_range: [0, 360]
  },
  
  coordinates: {
    id: 'coordinates',
    name: 'Coordinates',
    description: 'GPS position',
    baseUnit: 'decimal_degrees',
    icon: '📍',
    precision: 6,
    typical_range: [-90, 90]  // Latitude range
  },
  
  voltage: {
    id: 'voltage',
    name: 'Voltage',
    description: 'Electrical voltage',
    baseUnit: 'volts',
    icon: '⚡',
    precision: 1,
    typical_range: [10, 15]   // 12V system
  },
  
  current: {
    id: 'current',
    name: 'Current',
    description: 'Electrical current',
    baseUnit: 'amperes',
    icon: '🔌',
    precision: 1,
    typical_range: [0, 100]
  },
  
  volume: {
    id: 'volume',
    name: 'Volume',
    description: 'Tank levels and capacities',
    baseUnit: 'liters',
    icon: '🪣',
    precision: 0,
    typical_range: [0, 500]
  },
  
  time: {
    id: 'time',
    name: 'Time',
    description: 'Time and date display',
    baseUnit: 'iso_datetime',
    icon: '🕐',
    precision: 0,
    typical_range: [0, 86400]  // Seconds in day
  },
  
  distance: {
    id: 'distance',
    name: 'Distance',
    description: 'Navigation distances and ranges',
    baseUnit: 'meters',
    icon: '📏',
    precision: 2,
    typical_range: [0, 185200]  // 0-100 NM in meters
  }
};
