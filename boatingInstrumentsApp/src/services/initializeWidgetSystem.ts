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
import { validateAllThresholdFormulas } from '../utils/validateThresholdFormulas';
import { log } from '../utils/logging/logger';

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
    log.app('Widget system already initialized', () => ({}));
    return;
  }

  // Step 0: Validate threshold formulas (catches schema errors early)
  try {
    validateAllThresholdFormulas();
    log.app('Threshold formulas validated successfully', () => ({}));
  } catch (error) {
    // Log error but don't crash the app - formulas will fail gracefully at runtime
    log.app('Threshold formula validation failed', () => ({
      error: error instanceof Error ? error.message : String(error),
    }));
    // In development, we want to see these errors immediately
    if (__DEV__) {
      console.error('Threshold formula validation failed:', error);
    }
  }

  // Step 1: Validate presentation system configuration (dev mode only)
  validateAndLogConfiguration();

  // Step 2: Register all built-in widget types
  registerBuiltInWidgets(widgetRegistrationService);

  // Step 3: Register default custom widgets
  registerDefaultCustomWidgets(widgetRegistrationService);

  // Step 4: Initialize registration service
  // This subscribes to nmeaStore and directly updates widgetStore
  widgetRegistrationService.initialize();

  isInitialized = true;
}
