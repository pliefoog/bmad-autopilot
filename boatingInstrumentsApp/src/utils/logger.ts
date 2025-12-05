/**
 * Centralized Logger - Selective console output control
 * 
 * Replace all console.log/warn/info with this logger to control output.
 * Set category flags to enable specific logging areas.
 */

// Master toggle - set to false to disable ALL logging
const ENABLE_LOGGING = false; // ✅ DISABLED BY DEFAULT - enable categories as needed

// Selective logging categories
const LOG_CATEGORIES = {
  LAYOUT: false,        // DynamicLayoutService, grid calculations
  DIMENSIONS: false,    // Screen dimensions, orientation changes
  PLATFORM: false,      // Platform detection (iPad, iPhone, etc.)
  WIDGETS: false,       // Widget lifecycle, rendering
  THEME: false,         // Theme changes
  DRAG: false,          // Drag and drop operations
  NAVIGATION: false,    // Navigation, routing
  NETWORK: false,       // NMEA connections, data
  PERFORMANCE: false,   // Performance metrics
  REACT_ERRORS: true,   // React error boundaries
};

// Create logger with category support
const noop = () => {};

export const logger = {
  // General logging (use sparingly)
  log: ENABLE_LOGGING ? console.log.bind(console) : noop,
  warn: ENABLE_LOGGING ? console.warn.bind(console) : noop,
  info: ENABLE_LOGGING ? console.info.bind(console) : noop,
  debug: ENABLE_LOGGING ? console.debug.bind(console) : noop,
  error: ENABLE_LOGGING ? console.error.bind(console) : noop,
  
  // Always show (for critical diagnostics)
  always: console.log.bind(console),
  
  // Category-specific logging
  layout: (...args: any[]) => LOG_CATEGORIES.LAYOUT && ENABLE_LOGGING && console.log('[Layout]', ...args),
  dimensions: (...args: any[]) => LOG_CATEGORIES.DIMENSIONS && ENABLE_LOGGING && console.log('[Dimensions]', ...args),
  platform: (...args: any[]) => LOG_CATEGORIES.PLATFORM && ENABLE_LOGGING && console.log('[Platform]', ...args),
  widgets: (...args: any[]) => LOG_CATEGORIES.WIDGETS && ENABLE_LOGGING && console.log('[Widgets]', ...args),
  theme: (...args: any[]) => LOG_CATEGORIES.THEME && ENABLE_LOGGING && console.log('[Theme]', ...args),
  drag: (...args: any[]) => LOG_CATEGORIES.DRAG && ENABLE_LOGGING && console.log('[Drag]', ...args),
  navigation: (...args: any[]) => LOG_CATEGORIES.NAVIGATION && ENABLE_LOGGING && console.log('[Navigation]', ...args),
  network: (...args: any[]) => LOG_CATEGORIES.NETWORK && ENABLE_LOGGING && console.log('[Network]', ...args),
  performance: (...args: any[]) => LOG_CATEGORIES.PERFORMANCE && ENABLE_LOGGING && console.log('[Performance]', ...args),
};

// Runtime control functions (available in dev console)
if (typeof window !== 'undefined' && __DEV__) {
  (window as any).enableLog = (category: keyof typeof LOG_CATEGORIES) => {
    if (category in LOG_CATEGORIES) {
      LOG_CATEGORIES[category] = true;
      console.log(`✅ ${category} logging enabled`);
    } else {
      console.log(`❌ Unknown category: ${category}. Available:`, Object.keys(LOG_CATEGORIES));
    }
  };
  
  (window as any).disableLog = (category: keyof typeof LOG_CATEGORIES) => {
    if (category in LOG_CATEGORIES) {
      LOG_CATEGORIES[category] = false;
      console.log(`🔇 ${category} logging disabled`);
    }
  };
  
  (window as any).enableAllLogs = () => {
    Object.keys(LOG_CATEGORIES).forEach(key => {
      LOG_CATEGORIES[key as keyof typeof LOG_CATEGORIES] = true;
    });
    console.log('✅ All logging categories enabled');
  };
  
  (window as any).disableAllLogs = () => {
    Object.keys(LOG_CATEGORIES).forEach(key => {
      LOG_CATEGORIES[key as keyof typeof LOG_CATEGORIES] = false;
    });
    console.log('🔇 All logging categories disabled');
  };
  
  (window as any).showLogStatus = () => {
    console.log('📊 Logging Status:', LOG_CATEGORIES);
  };
  
  console.log('📝 Logging controls: enableLog("LAYOUT") | disableLog("LAYOUT") | enableAllLogs() | disableAllLogs() | showLogStatus()');
}

// 🚨 NUCLEAR OPTION: Override global console to respect ENABLE_LOGGING flag
// This catches ALL console.log/warn/info calls throughout the entire app
if (!ENABLE_LOGGING && typeof window !== 'undefined' && __DEV__) {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    info: console.info,
  };
  
  // Save original console for logger to use
  (window as any).__originalConsole = originalConsole;
  
  // Override console methods - only allow errors and explicitly allowed messages
  console.log = (...args: any[]) => {
    // Allow messages that start with ✅, 📝, 🔇, 📊 (our logger controls)
    const firstArg = String(args[0] || '');
    if (firstArg.match(/^[✅📝🔇📊❌⚠️]/)) {
      originalConsole.log(...args);
    }
    // Otherwise silently drop
  };
  
  console.warn = () => {}; // Silence all warnings
  console.info = () => {}; // Silence all info
  // Keep console.error untouched for critical errors
}
