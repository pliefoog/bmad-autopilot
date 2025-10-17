/**
 * Web Polyfills for Node.js globals and Expo environment variables
 *
 * This file provides browser-compatible replacements for Node.js-specific
 * APIs and ensures Expo environment variables are properly set for web builds.
 */

// Polyfill process.env for web
if (typeof process === 'undefined') {
  global.process = {
    env: {
      NODE_ENV: __DEV__ ? 'development' : 'production',
      EXPO_OS: 'web',
      EXPO_PUBLIC_USE_STATIC: '1',
    },
    cwd: () => '/',
    platform: 'web',
  };
} else if (typeof process.env === 'undefined') {
  process.env = {
    NODE_ENV: __DEV__ ? 'development' : 'production',
    EXPO_OS: 'web',
    EXPO_PUBLIC_USE_STATIC: '1',
  };
} else {
  // Ensure EXPO_OS is set
  process.env.EXPO_OS = process.env.EXPO_OS || 'web';
  process.env.EXPO_PUBLIC_USE_STATIC = process.env.EXPO_PUBLIC_USE_STATIC || '1';
}

// Polyfill __dirname and __filename for web (not available in browser)
if (typeof __dirname === 'undefined') {
  global.__dirname = '/';
  global.__filename = '/index.js';
}

// Polyfill Buffer if needed
if (typeof Buffer === 'undefined') {
  global.Buffer = {
    isBuffer: () => false,
    from: (str) => new TextEncoder().encode(str),
  };
}

console.log('[Web Polyfills] Initialized:', {
  platform: typeof process !== 'undefined' ? process.platform : 'unknown',
  EXPO_OS: typeof process !== 'undefined' && process.env ? process.env.EXPO_OS : 'undefined',
  NODE_ENV: typeof process !== 'undefined' && process.env ? process.env.NODE_ENV : 'undefined',
});
