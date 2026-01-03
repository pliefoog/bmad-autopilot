/**
 * Unified Conditional Logging System
 *
 * This logger provides zero-overhead conditional logging with lazy evaluation.
 * Logs only execute when explicitly enabled, preventing performance impact.
 *
 * Usage:
 *   // Basic logging with lazy evaluation
 *   log.depth('Processing depth', () => ({ depth, timestamp }));
 *
 *   // Runtime control (in browser console)
 *   enableLog('nmea.depth')    // Enable depth logs
 *   disableLog('nmea.depth')   // Disable depth logs
 *   listEnabledLogs()          // Show enabled categories
 *
 *   // Global suppression (suppresses ALL console output including direct console.log)
 *   suppressAllLogging()       // Hide everything
 *   restoreLogging()           // Restore console
 *
 * Architecture:
 *   - PRIMARY debugging: Zustand DevTools (state changes, zero performance)
 *   - SECONDARY debugging: Conditional console logs (execution flow only)
 *   - TERTIARY debugging: React Profiler (performance analysis)
 */

// Global console suppression state
let originalConsole: typeof console | null = null;

// Category definitions with hierarchical organization
// NOTE: ALL logging disabled by default. Enable via browser console as needed.
const DEBUG_FLAGS: Record<string, boolean> = {
  // NMEA processing categories
  'nmea.depth': false,
  'nmea.engine': false,
  'nmea.speed': false,
  'nmea.wind': false,
  'nmea.navigation': false,
  'nmea.autopilot': false,
  'nmea.battery': false,
  'nmea.tank': false,
  'nmea.temperature': false,
  'nmea.weather': false,
  nmea: false, // Parent category

  // Widget categories
  'widget.depth': false,
  'widget.engine': false,
  'widget.weather': false,
  'widget.registration': false,
  'widget.rendering': false,
  widget: false, // Parent category

  // Store categories
  'store.updates': false,
  'store.initialization': false,
  store: false, // Parent category

  // Performance categories
  'performance.render': false,
  'performance.network': false,
  performance: false, // Parent category

  // UI categories
  'ui.interaction': false,
  'ui.layout': false,
  'ui.trendline': false,
  ui: false, // Parent category

  // App categories
  'app.lifecycle': false,
  app: false, // Parent category
};

type Category = keyof typeof DEBUG_FLAGS;

/**
 * Check if logging is enabled for a category.
 * Supports hierarchical checking (e.g., 'nmea' enables all 'nmea.*' categories).
 */
function isEnabled(category: string): boolean {
  if (!__DEV__) return false;

  // Check exact match
  if (DEBUG_FLAGS[category]) return true;

  // Check parent categories (e.g., 'nmea.depth' checks 'nmea')
  const parts = category.split('.');
  for (let i = parts.length - 1; i > 0; i--) {
    const parent = parts.slice(0, i).join('.');
    if (DEBUG_FLAGS[parent]) return true;
  }

  return false;
}

/**
 * Core logging interface with conditional execution and lazy evaluation.
 */
export const log = {
  /**
   * Debug log with conditional execution.
   * The dataFn callback only executes if logging is enabled.
   *
   * @param category - Log category (e.g., 'nmea.depth')
   * @param message - Log message
   * @param dataFn - Optional lazy data function (only called if enabled)
   */
  debug: (category: string, message: string, dataFn?: () => any) => {
    if (!isEnabled(category)) return;

    const data = dataFn ? dataFn() : undefined;
    const style = 'color: #00BCD4; font-weight: bold; padding: 2px 6px; border-radius: 3px;';

    if (data !== undefined) {
      console.log(`%c[${category}]`, style, message, data);
    } else {
      console.log(`%c[${category}]`, style, message);
    }
  },

  // NMEA convenience methods
  depth: (msg: string, dataFn?: () => any) => log.debug('nmea.depth', msg, dataFn),
  engine: (msg: string, dataFn?: () => any) => log.debug('nmea.engine', msg, dataFn),
  speed: (msg: string, dataFn?: () => any) => log.debug('nmea.speed', msg, dataFn),
  wind: (msg: string, dataFn?: () => any) => log.debug('nmea.wind', msg, dataFn),
  navigation: (msg: string, dataFn?: () => any) => log.debug('nmea.navigation', msg, dataFn),
  autopilot: (msg: string, dataFn?: () => any) => log.debug('nmea.autopilot', msg, dataFn),
  battery: (msg: string, dataFn?: () => any) => log.debug('nmea.battery', msg, dataFn),
  tank: (msg: string, dataFn?: () => any) => log.debug('nmea.tank', msg, dataFn),
  temperature: (msg: string, dataFn?: () => any) => log.debug('nmea.temperature', msg, dataFn),
  weather: (msg: string, dataFn?: () => any) => log.debug('nmea.weather', msg, dataFn),

  // Widget convenience methods
  widgetDepth: (msg: string, dataFn?: () => any) => log.debug('widget.depth', msg, dataFn),
  widgetEngine: (msg: string, dataFn?: () => any) => log.debug('widget.engine', msg, dataFn),
  widgetWeather: (msg: string, dataFn?: () => any) => log.debug('widget.weather', msg, dataFn),
  widgetRegistration: (msg: string, dataFn?: () => any) =>
    log.debug('widget.registration', msg, dataFn),
  widgetRendering: (msg: string, dataFn?: () => any) => log.debug('widget.rendering', msg, dataFn),
  
  // Drag-and-drop convenience method
  dragDrop: (msg: string, dataFn?: () => any) => log.debug('drag.drop', msg, dataFn),


  // Store convenience methods
  storeUpdate: (msg: string, dataFn?: () => any) => log.debug('store.updates', msg, dataFn),
  storeInit: (msg: string, dataFn?: () => any) => log.debug('store.initialization', msg, dataFn),

  // Performance convenience methods
  perfRender: (msg: string, dataFn?: () => any) => log.debug('performance.render', msg, dataFn),
  perfNetwork: (msg: string, dataFn?: () => any) => log.debug('performance.network', msg, dataFn),

  // UI convenience methods
  uiInteraction: (msg: string, dataFn?: () => any) => log.debug('ui.interaction', msg, dataFn),
  uiLayout: (msg: string, dataFn?: () => any) => log.debug('ui.layout', msg, dataFn),
  uiTrendline: (msg: string, dataFn?: () => any) => log.debug('ui.trendline', msg, dataFn),

  // Legacy aliases for backward compatibility
  layout: (msg: string, dataFn?: () => any) => log.debug('ui.layout', msg, dataFn),
  platform: (msg: string, dataFn?: () => any) => log.debug('ui.layout', msg, dataFn),
  alarm: (msg: string, dataFn?: () => any) => log.debug('ui.interaction', msg, dataFn),

  // App convenience methods
  app: (msg: string, dataFn?: () => any) => log.debug('app.lifecycle', msg, dataFn),
};

/**
 * Runtime control functions (only available in development).
 * These are exposed to the browser console for dynamic logging control.
 */
if (__DEV__ && typeof window !== 'undefined') {
  /**
   * Enable logging for a category.
   * Supports wildcards: enableLog('nmea') enables all nmea.* categories.
   */
  (window as any).enableLog = (category: string) => {
    if (category in DEBUG_FLAGS) {
      DEBUG_FLAGS[category] = true;
      console.log(`✅ Enabled logging for: ${category}`);
    } else {
      console.warn(
        `⚠️ Unknown category: ${category}. Use listLogCategories() to see available categories.`,
      );
    }
  };

  /**
   * Disable logging for a category.
   */
  (window as any).disableLog = (category: string) => {
    if (category in DEBUG_FLAGS) {
      DEBUG_FLAGS[category] = false;
      console.log(`🔇 Disabled logging for: ${category}`);
    } else {
      console.warn(`⚠️ Unknown category: ${category}`);
    }
  };

  /**
   * List all enabled log categories.
   */
  (window as any).listEnabledLogs = () => {
    const enabled = Object.entries(DEBUG_FLAGS)
      .filter(([_, v]) => v)
      .map(([k, _]) => k);

    if (enabled.length === 0) {
      console.log('No log categories enabled');
    } else {
      console.log('Enabled log categories:', enabled);
    }
  };

  /**
   * List all available log categories.
   */
  (window as any).listLogCategories = () => {
    const categories = Object.keys(DEBUG_FLAGS).sort();
    console.table(categories.map((cat) => ({ category: cat, enabled: DEBUG_FLAGS[cat] })));
  };

  /**
   * Enable all logs in a namespace (e.g., 'nmea' enables all 'nmea.*').
   */
  (window as any).enableLogNamespace = (namespace: string) => {
    let count = 0;
    Object.keys(DEBUG_FLAGS).forEach((key) => {
      if (key === namespace || key.startsWith(`${namespace}.`)) {
        DEBUG_FLAGS[key] = true;
        count++;
      }
    });
    console.log(`✅ Enabled ${count} categories in '${namespace}' namespace`);
  };

  /**
   * Disable all logs in a namespace.
   */
  (window as any).disableLogNamespace = (namespace: string) => {
    let count = 0;
    Object.keys(DEBUG_FLAGS).forEach((key) => {
      if (key === namespace || key.startsWith(`${namespace}.`)) {
        DEBUG_FLAGS[key] = false;
        count++;
      }
    });
    console.log(`🔇 Disabled ${count} categories in '${namespace}' namespace`);
  };

  /**
   * Disable all logging.
   */
  (window as any).disableAllLogs = () => {
    Object.keys(DEBUG_FLAGS).forEach((key) => {
      DEBUG_FLAGS[key] = false;
    });
    console.log('🔇 All log categories disabled');
  };

  /**
   * Suppress ALL console output (including direct console.log calls).
   * Use this when console spam makes CLI unusable.
   */
  (window as any).suppressAllLogging = () => {
    if (!originalConsole) {
      originalConsole = { ...console };
      const noop = () => {};
      console.log = noop;
      console.info = noop;
      console.warn = noop;
      console.debug = noop;
      // Keep console.error for critical issues
      console.table = noop;
      console.trace = noop;
      console.group = noop;
      console.groupCollapsed = noop;
      console.groupEnd = noop;

      // Show confirmation using original console
      originalConsole.log(
        '%c🔇 ALL CONSOLE OUTPUT SUPPRESSED',
        'color: red; font-weight: bold; font-size: 14px;',
      );
      originalConsole.log('%cRun restoreLogging() to restore console', 'color: orange;');
    }
  };

  /**
   * Restore console after suppression.
   */
  (window as any).restoreLogging = () => {
    if (originalConsole) {
      Object.assign(console, originalConsole);
      originalConsole = null;
    }
  };
}
