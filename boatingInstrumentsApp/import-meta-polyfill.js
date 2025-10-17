/**
 * Import.meta polyfill for web builds
 * Replaces import.meta usage with compatible alternatives
 */

// Define a global polyfill for import.meta if it doesn't exist
if (typeof globalThis !== 'undefined') {
  globalThis.importMetaPolyfill = {
    url: typeof window !== 'undefined' && window.location 
      ? window.location.href 
      : 'http://localhost:8082/',
    env: process.env || {},
    resolve: function(specifier) {
      // Basic resolve functionality
      if (specifier.startsWith('./') || specifier.startsWith('../')) {
        const base = this.url;
        return new URL(specifier, base).href;
      }
      return specifier;
    }
  };
}

// Replace import.meta references
if (typeof window !== 'undefined') {
  // For web environments, create a basic import.meta shim
  if (!window.import) {
    window.import = {};
  }
  if (!window.import.meta) {
    window.import.meta = globalThis.importMetaPolyfill;
  }
}

module.exports = globalThis.importMetaPolyfill;