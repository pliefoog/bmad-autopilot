/**
 * Widget Factory Service - Centralized Widget Management
 * 
 * Provides unified API for:
 * - Widget creation and configuration
 * - Title and icon resolution using Widget Metadata Registry
 * - Instance widget management (engines, batteries, tanks, temperatures)
 * - Widget ID parsing and normalization
 * - Legacy widget mapping support
 * 
 * This replaces scattered widget creation logic across multiple files.
 */

import { WidgetMetadataRegistry, type WidgetMetadata, type InstanceMapping } from '../registry/WidgetMetadataRegistry';

export interface WidgetInstance {
  id: string;           // e.g., "engine-0", "battery-1", "temperature-0"  
  baseType: string;     // e.g., "engine", "battery", "temperature"
  instance?: number;    // Instance number (0, 1, 2, ...)
  title: string;        // Display title
  icon: string;         // Ionicon name
  category: string;     // Widget category
  priority: number;     // Display/sort priority
  metadata: InstanceMapping; // Full instance metadata
}

export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  icon: string;
  category: string;
  settings: Record<string, any>;
  enabled: boolean;
  order: number;
  // Enhanced state management
  isPinned?: boolean;
}

/**
 * Widget Factory Service
 * Centralized widget creation and metadata resolution
 */
export class WidgetFactory {
  /**
   * Parse widget ID to extract base type and instance information
   * 
   * Examples:
   * - "gps" -> { baseType: "gps", instance: undefined }
   * - "engine-0" -> { baseType: "engine", instance: 0 }
   * - "tank-fuel-2" -> { baseType: "tanks", instance: 2, fluidType: "fuel" }
   * - "temperature-1" -> { baseType: "watertemp", instance: 1 }
   */
  static parseWidgetId(widgetId: string): {
    baseType: string;
    instance?: number;
    fluidType?: string;
    originalId: string;
  } {
    const originalId = widgetId;
    
    // Handle legacy mappings first
    if (widgetId === 'water-temperature') {
      return { 
        baseType: 'temperature', // Updated to use unified temperature widget
        instance: 0, // Map to seawater source (NMEA 2000 source 0)
        fluidType: 'seawater',
        originalId 
      };
    }

    // Multi-instance widget patterns
    const patterns = {
      engine: /^engine-(\d+)$/,
      battery: /^battery-(\d+)$/,
      tank: /^tank-(\w+)-(\d+)$/,
      tankSimple: /^tank-(\d+)$/,  // Simple tank pattern "tank-0", "tank-1"
      temperature: /^temp-(\d+)$/,  // Consistent pattern "temp-0", "temp-1"
    };

    // Check engine pattern: "engine-0"
    const engineMatch = widgetId.match(patterns.engine);
    if (engineMatch) {
      return {
        baseType: 'engine',
        instance: parseInt(engineMatch[1]),
        originalId
      };
    }

    // Check battery pattern: "battery-1" 
    const batteryMatch = widgetId.match(patterns.battery);
    if (batteryMatch) {
      return {
        baseType: 'battery',
        instance: parseInt(batteryMatch[1]),
        originalId
      };
    }

    // Check simple tank pattern: "tank-0", "tank-1" (new multi-instance pattern)
    const tankSimpleMatch = widgetId.match(patterns.tankSimple);
    if (tankSimpleMatch) {
      return {
        baseType: 'tank',  // Use 'tank' baseType (registered in WidgetMetadataRegistry)
        instance: parseInt(tankSimpleMatch[1]),
        originalId
      };
    }

    // Check legacy tank pattern: "tank-fuel-0"
    const tankMatch = widgetId.match(patterns.tank);
    if (tankMatch) {
      return {
        baseType: 'tanks',
        instance: parseInt(tankMatch[2]),
        fluidType: tankMatch[1],
        originalId
      };
    }

    // Check temperature pattern: "temperature-0" (NMEA 2000 instance-based)
    const tempMatch = widgetId.match(patterns.temperature);
    if (tempMatch) {
      return {
        baseType: 'temperature', // Updated to use unified temperature widget
        instance: parseInt(tempMatch[1]),
        originalId
      };
    }

    // Single widget (no instance)
    return { baseType: widgetId, originalId };
  }

  /**
   * Get widget metadata from registry
   */
  static getWidgetMetadata(widgetId: string): WidgetMetadata | undefined {
    const { baseType } = this.parseWidgetId(widgetId);
    return WidgetMetadataRegistry.getMetadata(baseType);
  }

  /**
   * Get widget title (with instance support)
   */
  static getWidgetTitle(widgetId: string, instanceData?: any): string {
    const { baseType, instance, fluidType } = this.parseWidgetId(widgetId);
    const metadata = WidgetMetadataRegistry.getMetadata(baseType);
    
    if (!metadata) {
      console.warn(`[WidgetFactory] No metadata found for widget: ${widgetId}`);
      return widgetId.toUpperCase();
    }

    // Handle multi-instance widgets
    if (metadata.type === 'multi-instance' && instance !== undefined) {
      const data = { ...instanceData };
      if (fluidType) data.fluidType = fluidType;
      
      return WidgetMetadataRegistry.getTitle(baseType, instance, data);
    }

    return metadata.title;
  }

  /**
   * Get widget icon (with instance support)
   */
  static getWidgetIcon(widgetId: string, instanceData?: any): string {
    const { baseType, instance, fluidType } = this.parseWidgetId(widgetId);
    const metadata = WidgetMetadataRegistry.getMetadata(baseType);
    
    if (!metadata) {
      console.warn(`[WidgetFactory] No metadata found for widget: ${widgetId}`);
      return 'help-outline';
    }

    // Handle multi-instance widgets
    if (metadata.type === 'multi-instance' && instance !== undefined) {
      const data = { ...instanceData };
      if (fluidType) data.fluidType = fluidType;
      
      return WidgetMetadataRegistry.getIcon(baseType, instance, data);
    }

    return metadata.icon;
  }

  /**
   * Get widget category
   */
  static getWidgetCategory(widgetId: string): string {
    const { baseType } = this.parseWidgetId(widgetId);
    return WidgetMetadataRegistry.getCategory(baseType) || 'navigation';
  }

  /**
   * Create a widget instance object with complete metadata
   */
  static createWidgetInstance(
    widgetId: string, 
    instanceData?: any,
    priority?: number
  ): WidgetInstance {
    const { baseType, instance } = this.parseWidgetId(widgetId);
    const metadata = WidgetMetadataRegistry.getMetadata(baseType);
    
    if (!metadata) {
      throw new Error(`Cannot create widget instance: No metadata for ${widgetId}`);
    }

    const title = this.getWidgetTitle(widgetId, instanceData);
    const icon = this.getWidgetIcon(widgetId, instanceData);
    const category = this.getWidgetCategory(widgetId);

    // Get instance metadata if applicable
    let instanceMetadata: InstanceMapping = { 
      title, 
      priority: priority || 0 
    };

    if (metadata.type === 'multi-instance' && instance !== undefined && metadata.instanceMapping) {
      instanceMetadata = metadata.instanceMapping(instance, instanceData);
    }

    return {
      id: widgetId,
      baseType,
      instance,
      title,
      icon,
      category,
      priority: instanceMetadata.priority,
      metadata: instanceMetadata,
    };
  }

  /**
   * Create a complete widget configuration
   */
  static createWidgetConfig(
    widgetId: string,
    instanceData?: any,
    overrides?: Partial<WidgetConfig>
  ): WidgetConfig {
    const instance = this.createWidgetInstance(widgetId, instanceData);
    
    return {
      id: widgetId,
      type: instance.baseType,
      title: instance.title,
      icon: instance.icon,
      category: instance.category,
      settings: {},
      enabled: true,
      order: instance.priority,
      isPinned: false,
      ...overrides,
    };
  }

  /**
   * Check if a widget type supports multiple instances
   */
  static isMultiInstanceWidget(widgetType: string): boolean {
    return WidgetMetadataRegistry.isMultiInstance(widgetType);
  }

  /**
   * Get all available widget types
   */
  static getAvailableWidgetTypes(): string[] {
    return WidgetMetadataRegistry.getAllMetadata().map(meta => meta.id);
  }

  /**
   * Get widget types by category
   */
  static getWidgetTypesByCategory(category: string): string[] {
    return WidgetMetadataRegistry.getByCategory(category as any).map(meta => meta.id);
  }

  /**
   * Validate widget ID format
   */
  static isValidWidgetId(widgetId: string): boolean {
    try {
      const { baseType } = this.parseWidgetId(widgetId);
      return WidgetMetadataRegistry.getMetadata(baseType) !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Generate widget ID for instance widgets
   */
  static generateInstanceWidgetId(
    baseType: string, 
    instance: number, 
    fluidType?: string
  ): string {
    if (fluidType) {
      return `tank-${fluidType}-${instance}`;
    }
    return `${baseType}-${instance}`;
  }

  /**
   * Get display order priority for widget
   */
  static getWidgetPriority(widgetId: string, instanceData?: any): number {
    const instance = this.createWidgetInstance(widgetId, instanceData);
    return instance.priority;
  }

  /**
   * Sort widget instances by priority
   */
  static sortWidgetsByPriority(widgets: WidgetInstance[]): WidgetInstance[] {
    return widgets.sort((a, b) => a.priority - b.priority);
  }
}

// Export for convenience
export default WidgetFactory;