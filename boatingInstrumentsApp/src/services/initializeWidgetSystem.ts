/**
 * Widget System Initialization
 * 
 * Central initialization point for the new event-driven widget registration system.
 * Call this once during app startup to register all widgets and start detection.
 * 
 * Order of operations:
 * 1. Register built-in widgets with WidgetRegistrationService
 * 2. Register default custom widgets (Sailing Dashboard)
 * 3. Initialize event-driven instance detection
 * 4. Subscribe to widget detection events
 * 5. Connect to widgetStore for widget creation
 */

import { widgetRegistrationService } from '../services/WidgetRegistrationService';
import { registerBuiltInWidgets } from '../config/builtInWidgetRegistrations';
import { registerDefaultCustomWidgets } from '../config/defaultCustomWidgets';
import { 
  initializeInstanceDetection,
  cleanupInstanceDetection,
  onWidgetInstancesDetected 
} from '../services/nmea/instanceDetectionNew';
import type { DetectedWidgetInstance } from '../services/WidgetRegistrationService';

let isInitialized = false;

/**
 * Cleanup widget system (for factory reset or app cleanup)
 */
export function cleanupWidgetSystem(): void {
  if (!isInitialized) return;
  
  console.log('[WidgetSystem] 🧹 Cleaning up widget system...');
  
  // Cleanup event-driven detection
  cleanupInstanceDetection();
  
  // Clear all detected instances
  widgetRegistrationService.clearDetectedInstances();
  
  isInitialized = false;
  console.log('[WidgetSystem] ✅ Widget system cleaned up');
}

/**
 * Initialize the widget system
 * Should be called once during app startup, before rendering the dashboard
 */
export function initializeWidgetSystem(): void {
  if (isInitialized) {
    console.warn('[WidgetSystem] ⚠️ Widget system already initialized');
    return;
  }
  
  console.log('[WidgetSystem] 🚀 Initializing event-driven widget system...');
  
  // Step 1: Register all built-in widget types
  registerBuiltInWidgets(widgetRegistrationService);
  
  // Step 2: Register default custom widgets
  registerDefaultCustomWidgets(widgetRegistrationService);
  
  // Step 3: Initialize event-driven instance detection
  initializeInstanceDetection();
  
  // Step 4: Subscribe to widget detection events
  // This replaces the old callback system in instanceDetectionService
  onWidgetInstancesDetected((instances: DetectedWidgetInstance[]) => {
    console.log(`[WidgetSystem] 📡 Detected ${instances.length} widget instance(s)`);
    
    // Convert to format expected by widgetStore.updateInstanceWidgets
    const groupedInstances = groupInstancesByType(instances);
    
    // Import widgetStore dynamically to avoid circular dependency
    import('../store/widgetStore').then(({ useWidgetStore }) => {
      const store = useWidgetStore.getState();
      if (store.updateInstanceWidgets) {
        store.updateInstanceWidgets(groupedInstances as any);
      }
    });
  });
  
  isInitialized = true;
  console.log('[WidgetSystem] ✅ Widget system initialized successfully');
}

/**
 * Group detected instances by type for widgetStore compatibility
 */
function groupInstancesByType(instances: DetectedWidgetInstance[]): {
  engines: any[];
  batteries: any[];
  tanks: any[];
  temperatures: any[];
  instruments: any[];
} {
  const grouped = {
    engines: [] as any[],
    batteries: [] as any[],
    tanks: [] as any[],
    temperatures: [] as any[],
    instruments: [] as any[],
  };
  
  instances.forEach(instance => {
    // Convert DetectedWidgetInstance to DetectedInstance format
    const legacyInstance = {
      id: `${instance.widgetType}-${instance.instance}`,
      type: instance.widgetType,
      instance: instance.instance,
      title: instance.title,
      icon: instance.icon,
      priority: instance.priority,
      lastSeen: Date.now(),
      category: getCategoryForWidgetType(instance.widgetType),
    };
    
    switch (instance.widgetType) {
      case 'engine':
        grouped.engines.push(legacyInstance);
        break;
      case 'battery':
        grouped.batteries.push(legacyInstance);
        break;
      case 'tank':
        grouped.tanks.push(legacyInstance);
        break;
      case 'temperature':
        grouped.temperatures.push(legacyInstance);
        break;
      // Navigation widgets → instruments
      case 'depth':
      case 'speed':
      case 'wind':
      case 'compass':
      case 'gps':
      case 'autopilot':
        grouped.instruments.push(legacyInstance);
        break;
      default:
        console.warn(`[WidgetSystem] Unknown widget type: ${instance.widgetType}`);
    }
  });
  
  return grouped;
}

/**
 * Get category for widget type (backward compatibility)
 */
function getCategoryForWidgetType(widgetType: string): string {
  const categoryMap: Record<string, string> = {
    'depth': 'navigation',
    'speed': 'navigation',
    'wind': 'environment',
    'compass': 'navigation',
    'gps': 'navigation',
    'autopilot': 'navigation',
    'engine': 'engine',
    'battery': 'power',
    'tank': 'fluid',
    'temperature': 'environment',
  };
  
  return categoryMap[widgetType] || 'navigation';
}

/**
 * Reset the widget system (useful for testing or reconnection)
 */
export function resetWidgetSystem(): void {
  console.log('[WidgetSystem] 🔄 Resetting widget system...');
  
  widgetRegistrationService.reset();
  isInitialized = false;
  
  console.log('[WidgetSystem] ✅ Widget system reset complete');
}

/**
 * Get widget system status
 */
export function getWidgetSystemStatus(): {
  initialized: boolean;
  registeredWidgets: number;
  detectedInstances: number;
} {
  return {
    initialized: isInitialized,
    registeredWidgets: widgetRegistrationService.getRegisteredWidgets().length,
    detectedInstances: widgetRegistrationService.getDetectedInstances().length,
  };
}
