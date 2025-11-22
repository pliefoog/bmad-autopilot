/**
 * Custom Expo Router context for web builds
 *
 * This file replaces expo-router/_ctx.web.js to fix the Metro bundler issue
 * where process.env variables cannot be used in require.context.
 *
 * Metro/webpack require.context needs literal string values at compile time,
 * not runtime environment variables.
 *
 * This is aliased in metro.config.js using resolver.alias
 */

export const ctx = require.context(
  './app',
  true,
  /^(?:\.\/)(?!(?:(?:(?:.*\+api)|(?:\+middleware)|(?:\+(html|native-intent))))\.[tj]sx?$).*(?:\.android|\.ios|\.native)?\.[tj]sx?$/,
  'sync'
);

console.log('[Expo Router Context] Loaded routes:', ctx.keys());
