#!/usr/bin/env node
/**
 * Theme Validation Script
 * Run with: npm run validate-themes
 * Only validates red-night theme for night vision compliance
 */

const { validateThemeColorsInDev } = require('../src/utils/themeCompliance');

// Import theme definitions
const dayTheme = {
  backgroundPrimary: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
  backgroundMedium: '#E8E8E8',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  primary: '#2196F3',
  secondary: '#FFC107',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  info: '#00BCD4',
  borderGray: '#DDDDDD',
  borderDark: '#CCCCCC',
  shadow: '#000000',
  transparent: '#00000000',
  iconPrimary: '#2196F3',
  iconSecondary: '#666666',
  iconAccent: '#FF5722',
  iconDisabled: '#CCCCCC',
};

const redNightTheme = {
  backgroundPrimary: '#000000',
  backgroundSecondary: '#110000',
  backgroundMedium: '#220000',
  textPrimary: '#FF0000',
  textSecondary: '#CC0000',
  textTertiary: '#880000',
  primary: '#FF0000',
  secondary: '#CC0000',
  success: '#FF0000',
  error: '#FF0000',
  warning: '#FF0000',
  info: '#FF0000',
  borderGray: '#440000',
  borderDark: '#660000',
  shadow: '#000000',
  transparent: '#00000000',
  iconPrimary: '#FF0000',
  iconSecondary: '#CC0000',
  iconAccent: '#FF0000',
  iconDisabled: '#330000',
};

console.log('🔍 Validating Marine Theme Compliance...\n');

// Set validation environment variable
process.env.VALIDATE_THEMES = 'true';

console.log('📋 Day Theme: Expected to have blue/green colors - SKIPPING validation');
console.log('📋 Night Theme: Expected to have blue/green colors - SKIPPING validation');
console.log('🌊 Red-Night Theme: Validating for night vision compliance...\n');

validateThemeColorsInDev('red-night', redNightTheme);

console.log('\n✅ Theme validation complete!');
console.log('💡 To run validation during development: VALIDATE_THEMES=true npm run web');
