/**
 * Default Custom Widgets
 * 
 * Pre-configured custom widgets that ship with the app.
 * Similar to ThemeWidget, these are system-provided widgets that demonstrate
 * the custom widget system's capabilities.
 * 
 * Current default widgets:
 * 1. Sailing Dashboard - Depth + Speed Over Ground (essential sailing metrics)
 */

import type { WidgetRegistration, SensorDependency, SensorValueMap } from '../services/WidgetRegistrationService';
import type { WidgetConfig } from '../types/widget.types';

/**
 * Custom Widget Definition
 * Extended configuration for user-defined or system-provided custom widgets
 */
export interface CustomWidgetDefinition {
  /** Unique widget identifier */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Widget description */
  description: string;
  
  /** Widget category */
  category: 'navigation' | 'engine' | 'environment' | 'autopilot' | 'utility' | 'custom';
  
  /** Icon name (Ionicons) */
  icon: string;
  
  /** Is this widget deletable? (false = protected like ThemeWidget) */
  deletable: boolean;
  
  /** Is this a system widget? */
  isSystemWidget?: boolean;
  
  /** Sensor bindings for this widget */
  sensorBindings: {
    /** Required sensors */
    required: SensorDependency[];
    
    /** Optional sensors */
    optional: SensorDependency[];
  };
  
  /** Metric cell layout configuration */
  layout: {
    /** Primary metrics (shown larger) */
    primaryMetrics: Array<{
      /** Sensor key (e.g., "depth.0.depth") */
      sensorKey: string;
      
      /** Display label */
      label: string;
      
      /** Mnemonic (e.g., "DBT", "SOG") */
      mnemonic: string;
      
      /** Unit of measurement */
      unit: string;
    }>;
    
    /** Secondary metrics (shown smaller) */
    secondaryMetrics?: Array<{
      sensorKey: string;
      label: string;
      mnemonic: string;
      unit: string;
    }>;
  };
  
  /** Priority for widget ordering */
  priority: number;
  
  /** Multi-instance support */
  multiInstance: boolean;
}

/**
 * Helper to create widget configuration for custom widgets
 */
function createCustomWidgetConfig(
  definition: CustomWidgetDefinition,
  instance: number
): WidgetConfig {
  const widgetId = `${definition.id}-${instance}`;
  
  return {
    id: widgetId,
    type: definition.id, // Use definition.id as type so it matches registration widgetType
    title: definition.name,
    enabled: true,
    settings: {
      icon: definition.icon,
      customDefinition: definition,
      isSystemWidget: definition.isSystemWidget,
      deletable: definition.deletable,
    },
    layout: {
      id: widgetId,
      type: definition.id, // Use definition.id as type
      position: { x: 0, y: 0 },
      dimensions: { width: 2, height: 2 },
      visible: true,
      locked: !definition.deletable,
    },
  };
}

/**
 * Default Custom Widget: Sailing Dashboard
 * 
 * A essential sailing metrics widget showing:
 * - Depth Below Transducer (DBT) - Required
 * - Speed Over Ground (SOG) - Required
 * 
 * This widget is deletable (unlike ThemeWidget) and demonstrates the custom widget system.
 */
export const CUSTOM_T1_DEFINITION: CustomWidgetDefinition = {
  id: 'customT1',
  name: 'Custom T1',
  description: 'Essential sailing metrics: Depth and Speed',
  category: 'navigation',
  icon: 'analytics-outline',
  deletable: true, // Users can remove this widget
  isSystemWidget: true, // Ships with the app
  priority: 88, // Between depth (90) and wind (85)
  multiInstance: false, // Only one instance
  
  sensorBindings: {
    required: [
      {
        category: 'depth',
        measurementType: 'depth',
        instance: 0, // Use first depth sensor (with dynamic fallback)
        required: true,
        label: 'Depth Below Transducer',
      },
      {
        category: 'speed',
        measurementType: 'overGround',
        instance: 0, // Use first speed sensor (with dynamic fallback)
        required: true,
        label: 'Speed Over Ground',
      },
    ],
    optional: [],
  },
  
  layout: {
    primaryMetrics: [
      {
        sensorKey: 'depth.0.depth',
        label: 'Depth',
        mnemonic: 'DBT',
        unit: 'm',
      },
      {
        sensorKey: 'speed.0.overGround',
        label: 'Speed',
        mnemonic: 'SOG',
        unit: 'kn',
      },
    ],
    secondaryMetrics: [],
  },
};

/**
 * Convert CustomWidgetDefinition to WidgetRegistration
 * This allows custom widgets to use the same registration system as built-in widgets
 */
export function customWidgetToRegistration(
  definition: CustomWidgetDefinition
): WidgetRegistration {
  return {
    widgetType: definition.id,
    displayName: definition.name,
    category: definition.category,
    icon: definition.icon,
    multiInstance: definition.multiInstance,
    maxInstances: definition.multiInstance ? -1 : 1,
    priority: definition.priority,
    
    requiredSensors: definition.sensorBindings.required,
    optionalSensors: definition.sensorBindings.optional,
    
    createWidget: (instance: number, sensorData: SensorValueMap): WidgetConfig => {
      return createCustomWidgetConfig(definition, instance);
    },
    
    validateData: (sensorData: SensorValueMap): boolean => {
      // Ensure all required sensors have valid numeric values
      return definition.sensorBindings.required.every(dep => {
        const key = `${dep.category}.${dep.instance ?? 0}.${dep.measurementType}`;
        const value = sensorData[key];
        return typeof value === 'number' && !isNaN(value);
      });
    },
  };
}

/**
 * All default custom widget definitions
 */
export const DEFAULT_CUSTOM_WIDGETS: CustomWidgetDefinition[] = [
  CUSTOM_T1_DEFINITION,
];

/**
 * Register all default custom widgets with the registration service
 */
export function registerDefaultCustomWidgets(
  registrationService: any // WidgetRegistrationService
): void {
  console.log('📋 Registering default custom widgets...');
  
  DEFAULT_CUSTOM_WIDGETS.forEach(definition => {
    const registration = customWidgetToRegistration(definition);
    registrationService.registerWidget(registration);
  });
  
  console.log(`✅ Registered ${DEFAULT_CUSTOM_WIDGETS.length} default custom widget(s)`);
}
