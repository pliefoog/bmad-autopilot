/**
 * Widget System Initialization
 * 
 * Simplified initialization for the widget registration system.
 * Call this once during app startup to register all widgets and start detection.
 * 
 * Order of operations:
 * 1. Register built-in widgets with WidgetRegistrationService
 * 2. Register default custom widgets (Sailing Dashboard)
 * 3. Initialize WidgetRegistrationService (subscribes to nmeaStore, updates widgetStore)
 */

import { widgetRegistrationService } from '../services/WidgetRegistrationService';
import { registerBuiltInWidgets } from '../config/builtInWidgetRegistrations';
import { registerDefaultCustomWidgets } from '../config/defaultCustomWidgets';

let isInitialized = false;

/**
 * Cleanup widget system (for factory reset or app cleanup)
 */
export function cleanupWidgetSystem(): void {
  if (!isInitialized) return;
  
  console.log('[WidgetSystem] 🧹 Cleaning up widget system...');
  
  // Cleanup registration service (unsubscribes from nmeaStore)
  widgetRegistrationService.cleanup();
  
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
  
  console.log('[WidgetSystem] 🚀 Initializing widget system...');
  
  // Step 1: Register all built-in widget types
  registerBuiltInWidgets(widgetRegistrationService);
  
  // Step 2: Register default custom widgets
  registerDefaultCustomWidgets(widgetRegistrationService);
  
  // Step 3: Initialize registration service
  // This subscribes to nmeaStore and directly updates widgetStore
  widgetRegistrationService.initialize();
  
  isInitialized = true;
  console.log('[WidgetSystem] ✅ Widget system initialized');
}

/**
 * Reset the widget system (useful for testing or reconnection)
 */
export function resetWidgetSystem(): void {
  console.log('[WidgetSystem] 🔄 Resetting widget system...');
  
  widgetRegistrationService.reset();
  widgetRegistrationService.initialize();
  
  console.log('[WidgetSystem] ✅ Widget system reset complete');
}
