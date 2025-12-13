/**
 * Centralized Logger - Selective console output control
 * 
 * Replace all console.log/warn/info with this logger to control output.
 * Set category flags to enable specific logging areas.
 */

// Master toggle - can be enabled at runtime
let ENABLE_LOGGING = false; // ✅ DISABLED BY DEFAULT - enable categories as needed

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
  ALARM: false,         // Alarm configuration, triggers, audio
  REACT_ERRORS: true,   // React error boundaries
};

// Create logger with category support
// All functions check flags DYNAMICALLY at call time
const noop = () => {};

// Store original console before any overrides
const originalConsole = {
  log: console.log,
  warn: console.warn,
  info: console.info,
  error: console.error,
};

export const logger = {
  // General logging (use sparingly) - check flag dynamically
  log: (...args: any[]) => ENABLE_LOGGING && originalConsole.log(...args),
  warn: (...args: any[]) => ENABLE_LOGGING && originalConsole.warn(...args),
  info: (...args: any[]) => ENABLE_LOGGING && originalConsole.info(...args),
  debug: (...args: any[]) => ENABLE_LOGGING && originalConsole.log('[DEBUG]', ...args),
  error: (...args: any[]) => ENABLE_LOGGING && originalConsole.error(...args),
  
  // Always show (for critical diagnostics)
  always: (...args: any[]) => originalConsole.log(...args),
  
  // Category-specific logging - check ONLY category flag, not master flag
  layout: (...args: any[]) => LOG_CATEGORIES.LAYOUT && originalConsole.log('[Layout]', ...args),
  dimensions: (...args: any[]) => LOG_CATEGORIES.DIMENSIONS && originalConsole.log('[Dimensions]', ...args),
  platform: (...args: any[]) => LOG_CATEGORIES.PLATFORM && originalConsole.log('[Platform]', ...args),
  widgets: (...args: any[]) => LOG_CATEGORIES.WIDGETS && originalConsole.log('[Widgets]', ...args),
  theme: (...args: any[]) => LOG_CATEGORIES.THEME && originalConsole.log('[Theme]', ...args),
  drag: (...args: any[]) => LOG_CATEGORIES.DRAG && originalConsole.log('[Drag]', ...args),
  navigation: (...args: any[]) => LOG_CATEGORIES.NAVIGATION && originalConsole.log('[Navigation]', ...args),
  network: (...args: any[]) => LOG_CATEGORIES.NETWORK && originalConsole.log('[Network]', ...args),
  performance: (...args: any[]) => LOG_CATEGORIES.PERFORMANCE && originalConsole.log('[Performance]', ...args),
  alarm: (...args: any[]) => LOG_CATEGORIES.ALARM && originalConsole.log('[Alarm]', ...args),
};

// Runtime control functions (available in dev console)
if (typeof window !== 'undefined' && __DEV__) {
  (window as any).getLogCategories = () => {
    const categories = Object.keys(LOG_CATEGORIES);
    originalConsole.log('📋 Available log categories:', categories.join(', '));
    originalConsole.log('💡 Usage: enableLog("ALARM") or disableLog("ALARM")');
    return categories;
  };
  
  (window as any).enableLog = (category: keyof typeof LOG_CATEGORIES) => {
    if (category in LOG_CATEGORIES) {
      LOG_CATEGORIES[category] = true;
      // Don't set ENABLE_LOGGING = true globally, keep it selective
      originalConsole.log(`✅ ${category} logging enabled`);
    } else {
      originalConsole.log(`❌ Unknown category: ${category}. Available:`, Object.keys(LOG_CATEGORIES));
    }
  };
  
  (window as any).disableLog = (category: keyof typeof LOG_CATEGORIES) => {
    if (category in LOG_CATEGORIES) {
      LOG_CATEGORIES[category] = false;
      originalConsole.log(`🔇 ${category} logging disabled`);
    }
  };
  
  (window as any).enableAllLogs = () => {
    ENABLE_LOGGING = true; // Enable master flag
    Object.keys(LOG_CATEGORIES).forEach(key => {
      LOG_CATEGORIES[key as keyof typeof LOG_CATEGORIES] = true;
    });
    originalConsole.log('✅ All logging categories enabled');
  };
  
  (window as any).disableAllLogs = () => {
    Object.keys(LOG_CATEGORIES).forEach(key => {
      LOG_CATEGORIES[key as keyof typeof LOG_CATEGORIES] = false;
    });
    originalConsole.log('🔇 All logging categories disabled');
  };
  
  (window as any).showLogStatus = () => {
    originalConsole.log('📊 Logging Status:', LOG_CATEGORIES);
    originalConsole.log('📊 Master flag ENABLE_LOGGING:', ENABLE_LOGGING);
  };
  
  originalConsole.log('📝 Logging controls: getLogCategories() | enableLog("ALARM") | disableLog("ALARM") | enableAllLogs() | disableAllLogs() | showLogStatus()');
  
  // Override global console to block unwanted logs when ENABLE_LOGGING is false
  console.log = (...args: any[]) => {
    // Always allow logger control messages
    const firstArg = String(args[0] || '');
    if (firstArg.match(/^[✅📝🔇📊❌⚠️💡]/)) {
      originalConsole.log(...args);
      return;
    }
    // Only allow other logs when ENABLE_LOGGING is true
    if (ENABLE_LOGGING) {
      originalConsole.log(...args);
    }
  };
  
  console.warn = (...args: any[]) => {
    if (ENABLE_LOGGING) {
      originalConsole.warn(...args);
    }
  };
  
  console.info = (...args: any[]) => {
    if (ENABLE_LOGGING) {
      originalConsole.info(...args);
    }
  };
}
