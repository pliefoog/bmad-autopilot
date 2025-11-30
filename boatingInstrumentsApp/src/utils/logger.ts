/**
 * Centralized Logger - Disable all logging by default
 * 
 * Replace all console.log/warn/info with this logger to control output.
 * Set ENABLE_LOGGING = true to see logs again.
 */

// Toggle this to enable/disable all logging
const ENABLE_LOGGING = false;

// Toggle this to show React errors/warnings (separate from general logging)
const SHOW_REACT_ERRORS = false;

// Selective logging flags
let THEME_LOGGING_ENABLED = false;

// Create silent no-op functions
const noop = () => {};

export const logger = {
  log: ENABLE_LOGGING ? console.log.bind(console) : noop,
  warn: ENABLE_LOGGING ? console.warn.bind(console) : noop,
  info: ENABLE_LOGGING ? console.info.bind(console) : noop,
  debug: ENABLE_LOGGING ? console.debug.bind(console) : noop,
  error: ENABLE_LOGGING ? console.error.bind(console) : noop,
  
  // Special: Always show (for diagnostics)
  always: (() => {
    const _console = console;
    return _console.log.bind(_console);
  })(),
};

// Override global console in production
if (typeof window !== 'undefined' && !ENABLE_LOGGING) {
  // Save original console before any overrides
  (window as any).__originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console),
    error: console.error.bind(console),
  };
  
  const originalConsole = (window as any).__originalConsole;
  
  // Suppress everything
  console.log = noop;
  console.warn = noop;
  console.info = noop;
  console.debug = noop;
  console.error = SHOW_REACT_ERRORS ? originalConsole.error : noop;
  
  // Provide way to restore
  (window as any).enableLogging = () => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
    console.error = originalConsole.error;
    logger.always('✅ Logging enabled');
  };
  
  (window as any).disableLogging = () => {
    console.log = noop;
    console.warn = noop;
    console.info = noop;
    console.debug = noop;
    console.error = noop;
    logger.always('🔇 Logging disabled');
  };
  
  (window as any).showReactErrors = () => {
    console.error = originalConsole.error;
    logger.always('✅ React errors visible');
  };
  
  (window as any).hideReactErrors = () => {
    console.error = noop;
    logger.always('🔇 React errors hidden');
  };

  (window as any).showThemeLogging = () => {
    THEME_LOGGING_ENABLED = true;
    logger.always('✅ Theme logging enabled');
  };

  (window as any).hideThemeLogging = () => {
    THEME_LOGGING_ENABLED = false;
    logger.always('🔇 Theme logging disabled');
  };

  (window as any).isThemeLoggingEnabled = () => THEME_LOGGING_ENABLED;
  
  // Initial message using original error (before suppression)
  originalConsole.error('🔇 All console output suppressed. Commands: enableLogging() | disableLogging() | showReactErrors() | hideReactErrors() | showThemeLogging() | hideThemeLogging()');
}
