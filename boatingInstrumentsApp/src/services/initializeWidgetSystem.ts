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
import { validateAndLogConfiguration } from '../presentation/presentationStore';

let isInitialized = false;

/**
 * Cleanup widget system (for factory reset or app cleanup)
 */
export function cleanupWidgetSystem(): void {
  if (!isInitialized) return;

  // Cleanup registration service (unsubscribes from nmeaStore)
  widgetRegistrationService.cleanup();

  isInitialized = false;
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

  // Step 0: Validate presentation system configuration (dev mode only)
  validateAndLogConfiguration();

  // Step 1: Register all built-in widget types
  registerBuiltInWidgets(widgetRegistrationService);

  // Step 2: Register default custom widgets
  registerDefaultCustomWidgets(widgetRegistrationService);

  // Step 3: Initialize registration service
  // This subscribes to nmeaStore and directly updates widgetStore
  widgetRegistrationService.initialize();

  isInitialized = true;
}
