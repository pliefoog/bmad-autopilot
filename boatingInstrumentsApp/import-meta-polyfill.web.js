/**
 * Import.meta polyfill for web builds
 * This must be loaded before any code that uses import.meta
 */

// Check if we're in a web environment and import.meta doesn't exist
if (typeof window !== 'undefined' && typeof importMetaPolyfillApplied === 'undefined') {
  // Create a global flag to prevent multiple applications
  window.importMetaPolyfillApplied = true;
  
  // Monkey-patch the global scope to provide import.meta
  if (typeof globalThis !== 'undefined') {
    globalThis.importMeta = {
      url: typeof window !== 'undefined' ? window.location.href : '',
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
      }
    };
  }
  
  // Also try to patch the window object
  if (typeof window !== 'undefined') {
    window.importMeta = {
      url: window.location.href,
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
      }
    };
  }
  
  console.log('Import.meta polyfill applied for web environment');
}

export {};