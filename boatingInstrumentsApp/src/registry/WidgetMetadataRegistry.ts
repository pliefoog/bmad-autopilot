/**
 * Widget Metadata Registry - Single Source of Truth
 *
 * Centralized registry for all widget metadata including:
 * - Icons (Ionicon names)
 * - Titles and instance titles
 * - Categories for organization
 * - Instance mapping for multi-instance widgets
 * - Type definitions for consistency
 *
 * This replaces scattered icon/title definitions across the codebase.
 */

export type WidgetCategory = 'navigation' | 'environment' | 'engine' | 'power' | 'fluid';
export type WidgetType = 'single' | 'multi-instance';

export interface InstanceMapping {
  title: string;
  icon?: string; // Optional override icon for specific instances
  priority: number;
  location?: string; // For temperature sensors
  position?: string; // For tanks (PORT, STBD, etc.)
  sourceAddress?: number; // For engines
}

export interface WidgetMetadata {
  id: string;
  type: WidgetType;
  title: string;
  icon: string; // Ionicon name (e.g., 'navigate-outline')
  category: WidgetCategory;
  description?: string;
  instanceMapping?: (instance: number, data?: any) => InstanceMapping;
  maxInstances?: number;
}

// NMEA Engine Instance Mapping (marine convention for vessel layout)
const ENGINE_INSTANCE_MAP: Record<number, InstanceMapping> = {
  0: { title: 'MAIN', priority: 1, position: 'main' },
  1: { title: 'PORT', priority: 2, position: 'port' },
  2: { title: 'STBD', priority: 3, position: 'starboard' },
  3: { title: 'GENERATOR', priority: 4, position: 'generator' },
  4: { title: 'AUX', priority: 5, position: 'auxiliary' },
};

// NMEA Battery Instance Mapping (from existing NMEA standards)
// Supports location-based batteries (e.g., PORT ENGINE, STBD ENGINE)
const BATTERY_INSTANCE_MAP: Record<number, InstanceMapping> = {
  0: { title: 'HOUSE', priority: 1, position: 'house' },
  1: { title: 'ENGINE', priority: 2, position: 'engine' },
  2: { title: 'THRUSTER', priority: 3, position: 'thruster' },
  3: { title: 'GENERATOR', priority: 4, position: 'generator' },
  4: { title: 'PORT ENGINE', priority: 5, position: 'port' },
  5: { title: 'STBD ENGINE', priority: 6, position: 'starboard' },
  6: { title: 'BOW THRUSTER', priority: 7, position: 'bow' },
  7: { title: 'STERN THRUSTER', priority: 8, position: 'stern' },
  8: { title: 'WINDLASS', priority: 9, position: 'bow' },
  9: { title: 'INVERTER', priority: 10, position: 'house' },
};

// NMEA Temperature Source Mapping (based on NMEA 2000 Temperature Source enumeration)
// This maps NMEA 2000 Temperature Source values (0-255) to consistent metadata
const NMEA_TEMPERATURE_SOURCES: Record<number, InstanceMapping> = {
  0: { title: 'SEA WATER', location: 'seawater', priority: 1, icon: 'water-outline' },
  1: { title: 'OUTSIDE AIR', location: 'outside', priority: 2, icon: 'cloudy-outline' },
  2: { title: 'INSIDE AIR', location: 'inside', priority: 3, icon: 'home-outline' },
  3: { title: 'ENGINE ROOM', location: 'engineRoom', priority: 4, icon: 'car-outline' },
  4: { title: 'MAIN CABIN', location: 'mainCabin', priority: 5, icon: 'bed-outline' },
  5: { title: 'LIVE WELL', location: 'liveWell', priority: 6, icon: 'fish-outline' },
  6: { title: 'BAIT WELL', location: 'baitWell', priority: 7, icon: 'fish-outline' },
  7: { title: 'REFRIGERATOR', location: 'refrigeration', priority: 8, icon: 'snow-outline' },
  8: { title: 'HEATING SYS', location: 'heating', priority: 9, icon: 'flame-outline' },
  9: { title: 'DEW POINT', location: 'dewPoint', priority: 10, icon: 'rainy-outline' },
  10: { title: 'APP WIND CHILL', location: 'windChill', priority: 11, icon: 'snow-outline' },
  11: { title: 'HEAT INDEX', location: 'heatIndex', priority: 12, icon: 'sunny-outline' },
  12: { title: 'FREEZER', location: 'freezer', priority: 13, icon: 'snow-outline' },
  13: { title: 'EXHAUST GAS', location: 'exhaust', priority: 14, icon: 'car-outline' },
  14: { title: 'FWD CABIN', location: 'forwardCabin', priority: 15, icon: 'bed-outline' },
  15: { title: 'AFT CABIN', location: 'aftCabin', priority: 16, icon: 'bed-outline' },
};

// Legacy temperature instance mapping (for backward compatibility)
const TEMPERATURE_INSTANCE_MAP: Record<number, InstanceMapping> = NMEA_TEMPERATURE_SOURCES;

// NMEA 0183 Location Mapping (for temperature-location based IDs)
// Maps location strings to NMEA 2000 source equivalents for consistency
const NMEA0183_LOCATION_MAP: Record<string, { source: number; instance?: number }> = {
  seawater: { source: 0 },
  sea: { source: 0 },
  water: { source: 0 },
  outside: { source: 1 },
  air: { source: 1 },
  ambient: { source: 1 },
  inside: { source: 2 },
  cabin: { source: 2 },
  engine: { source: 3 },
  engineroom: { source: 3 },
  engineRoom: { source: 3 },
  maincabin: { source: 4 },
  mainCabin: { source: 4 },
  livewell: { source: 5 },
  liveWell: { source: 5 },
  baitwell: { source: 6 },
  baitWell: { source: 6 },
  refrigeration: { source: 7 },
  fridge: { source: 7 },
  heating: { source: 8 },
  heater: { source: 8 },
  dewpoint: { source: 9 },
  dewPoint: { source: 9 },
  windchill: { source: 10 },
  windChill: { source: 10 },
  heatindex: { source: 11 },
  heatIndex: { source: 11 },
  freezer: { source: 12 },
  exhaust: { source: 13 },
  forwardcabin: { source: 14 },
  forwardCabin: { source: 14 },
  aftcabin: { source: 15 },
  aftCabin: { source: 15 },
};

// Tank Position Mapping for different fluid types
const TANK_POSITIONS: Record<string, string[]> = {
  fuel: ['PORT', 'STBD', 'CENTER', 'MAIN'],
  freshWater: ['FRESH', 'POTABLE'],
  grayWater: ['GRAY', 'WASTE'],
  blackWater: ['BLACK', 'SEWAGE'],
  liveWell: ['LIVE', 'BAIT'],
  ballast: ['BALLAST'],
};

/**
 * Complete Widget Metadata Registry
 * All widgets must be defined here with consistent metadata
 */
export const WIDGET_METADATA_REGISTRY: Record<string, WidgetMetadata> = {
  // Single Marine Instruments (detected from NMEA data)
  gps: {
    id: 'gps',
    type: 'single',
    title: 'GPS',
    icon: 'navigate-outline',
    category: 'navigation',
    description: 'Global Positioning System position and navigation data',
  },

  compass: {
    id: 'compass',
    type: 'single',
    title: 'Compass',
    icon: 'compass-outline',
    category: 'navigation',
    description: 'Vessel heading and compass bearing',
  },

  speed: {
    id: 'speed',
    type: 'single',
    title: 'Speed',
    icon: 'speedometer-outline',
    category: 'navigation',
    description: 'Speed over ground and through water',
  },

  wind: {
    id: 'wind',
    type: 'single',
    title: 'Wind',
    icon: 'cloud-outline',
    category: 'environment',
    description: 'Wind speed and direction data',
  },

  depth: {
    id: 'depth',
    type: 'single',
    title: 'Depth',
    icon: 'water-outline',
    category: 'navigation',
    description: 'Water depth from sounder',
  },

  // Multi-Instance Devices
  engine: {
    id: 'engine',
    type: 'multi-instance',
    title: 'Engine',
    icon: 'car-outline',
    category: 'engine',
    description: 'Engine parameters and performance data',
    maxInstances: 8,
    instanceMapping: (instance: number, data?: any) => {
      const mapping = ENGINE_INSTANCE_MAP[instance];
      return (
        mapping || {
          title: `ENGINE #${instance + 1}`,
          priority: instance + 10,
          position: `engine${instance + 1}`,
        }
      );
    },
  },

  battery: {
    id: 'battery',
    type: 'multi-instance',
    title: 'Battery',
    icon: 'battery-charging-outline',
    category: 'power',
    description: 'Battery voltage, current, and status',
    maxInstances: 8,
    instanceMapping: (instance: number) => {
      const mapping = BATTERY_INSTANCE_MAP[instance];
      return mapping || { title: `BATTERY #${instance + 1}`, priority: instance + 10 };
    },
  },

  tanks: {
    id: 'tanks',
    type: 'multi-instance',
    title: 'Tank',
    icon: 'cube-outline',
    category: 'fluid',
    description: 'Fluid tank levels and status',
    maxInstances: 16,
    instanceMapping: (instance: number, data?: any) => {
      const fluidType = data?.fluidType || 'fuel';
      const positions = TANK_POSITIONS[fluidType] || ['TANK'];
      const position = positions[instance % positions.length] || `#${instance + 1}`;

      return {
        title: `${fluidType.toUpperCase()} ${position}`,
        priority: instance + 1,
        position,
        // Use different icons based on fluid type
        icon:
          fluidType === 'fuel'
            ? 'cube-outline'
            : fluidType === 'freshWater'
            ? 'water-outline'
            : 'cube-outline',
      };
    },
  },

  // Tank Widget (singular) - for backward compatibility with createInstanceWidget
  tank: {
    id: 'tank',
    type: 'multi-instance',
    title: 'Tank',
    icon: 'cube-outline',
    category: 'fluid',
    description: 'Individual tank level and status',
    maxInstances: 16,
    instanceMapping: (instance: number, data?: any) => {
      return {
        title: `Tank ${instance + 1}`,
        priority: instance + 1,
        position: `#${instance + 1}`,
        icon: 'cube-outline',
      };
    },
  },

  // Temperature Widgets (supporting both NMEA 2000 and NMEA 0183)
  temperature: {
    id: 'temperature',
    type: 'multi-instance',
    title: 'Temperature',
    icon: 'thermometer-outline',
    category: 'environment',
    description: 'Temperature sensors with NMEA 2000 source enumeration support',
    maxInstances: 255, // NMEA 2000 supports instance 0-255
    instanceMapping: (instance: number, data?: any) => {
      // Handle location-based mapping for NMEA 0183 compatibility
      if (data?.fluidType || data?.location) {
        const location = data.fluidType || data.location;
        const mappedSource = NMEA0183_LOCATION_MAP[location.toLowerCase()];
        if (mappedSource) {
          const sourceMapping = NMEA_TEMPERATURE_SOURCES[mappedSource.source];
          if (sourceMapping) {
            return {
              ...sourceMapping,
              // Preserve instance if provided, otherwise use source as default
              priority: sourceMapping.priority + (instance || 0),
            };
          }
        }
      }

      // Direct NMEA 2000 source mapping
      const mapping = NMEA_TEMPERATURE_SOURCES[instance];
      return (
        mapping || {
          title: `TEMP SENSOR ${instance}`,
          priority: instance + 100,
          location: `sensor${instance}`,
          icon: 'thermometer-outline',
        }
      );
    },
  },
};

/**
 * Widget Metadata Registry Service
 * Provides clean API for accessing widget metadata
 */
export class WidgetMetadataRegistry {
  /**
   * Get widget metadata by ID
   */
  static getMetadata(widgetId: string): WidgetMetadata | undefined {
    // Handle legacy mappings
    if (widgetId === 'water-temperature') {
      return WIDGET_METADATA_REGISTRY.temperature;
    }

    return WIDGET_METADATA_REGISTRY[widgetId];
  }

  /**
   * Map NMEA 0183 temperature location to NMEA 2000 source
   * This ensures consistency between NMEA 0183 and NMEA 2000 temperature handling
   */
  static mapLocationToNmeaSource(
    location: string,
  ): { source: number; mapping: InstanceMapping } | undefined {
    const normalized = location.toLowerCase();
    const sourceInfo = NMEA0183_LOCATION_MAP[normalized];
    if (sourceInfo) {
      const mapping = NMEA_TEMPERATURE_SOURCES[sourceInfo.source];
      if (mapping) {
        return { source: sourceInfo.source, mapping };
      }
    }
    return undefined;
  }

  /**
   * Get temperature source mapping by NMEA 2000 source ID
   */
  static getTemperatureSourceMapping(source: number): InstanceMapping | undefined {
    return NMEA_TEMPERATURE_SOURCES[source];
  }

  /**
   * Get all available widget metadata
   */
  static getAllMetadata(): WidgetMetadata[] {
    return Object.values(WIDGET_METADATA_REGISTRY);
  }

  /**
   * Get widgets by category
   */
  static getByCategory(category: WidgetCategory): WidgetMetadata[] {
    return Object.values(WIDGET_METADATA_REGISTRY).filter((meta) => meta.category === category);
  }

  /**
   * Get multi-instance widgets only
   */
  static getMultiInstanceWidgets(): WidgetMetadata[] {
    return Object.values(WIDGET_METADATA_REGISTRY).filter((meta) => meta.type === 'multi-instance');
  }

  /**
   * Check if widget supports multiple instances
   */
  static isMultiInstance(widgetId: string): boolean {
    const metadata = this.getMetadata(widgetId);
    return metadata?.type === 'multi-instance';
  }

  /**
   * Get widget icon name (Ionicon)
   */
  static getIcon(widgetId: string, instance?: number, data?: any): string {
    const metadata = this.getMetadata(widgetId);
    if (!metadata) return 'help-outline';

    if (metadata.type === 'multi-instance' && metadata.instanceMapping && instance !== undefined) {
      const instanceData = metadata.instanceMapping(instance, data);
      return instanceData.icon || metadata.icon;
    }

    return metadata.icon;
  }

  /**
   * Get widget title (with instance support)
   */
  static getTitle(widgetId: string, instance?: number, data?: any): string {
    const metadata = this.getMetadata(widgetId);
    if (!metadata) return widgetId.toUpperCase();

    if (metadata.type === 'multi-instance' && metadata.instanceMapping && instance !== undefined) {
      const instanceData = metadata.instanceMapping(instance, data);
      // Return format: "BASE_TYPE - INSTANCE_TITLE" (e.g., "ENGINE - PORT", "BATTERY - HOUSE")
      return `${metadata.title.toUpperCase()} - ${instanceData.title}`;
    }

    return metadata.title;
  }

  /**
   * Get widget category
   */
  static getCategory(widgetId: string): WidgetCategory | undefined {
    const metadata = this.getMetadata(widgetId);
    return metadata?.category;
  }
}

// Export for convenience
export default WidgetMetadataRegistry;
