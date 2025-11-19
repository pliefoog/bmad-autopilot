import React from 'react';

// Import Widget Metadata Registry for consistent icon mapping
// Note: Dynamic import to avoid circular dependencies in mock
let WidgetMetadataRegistry;
try {
  WidgetMetadataRegistry = require('../src/registry/WidgetMetadataRegistry').WidgetMetadataRegistry;
} catch (e) {
  // Fallback if registry not available
  WidgetMetadataRegistry = null;
}

// Enhanced Web-compatible Ionicons replacement with emoji-based icons
// Emojis are converted to monochromatic using CSS filters for theme compatibility
const IconMap = {
  // Marine instrument icons (actively used in widgets)
  'water-outline': '💧',           // Water droplet for depth
  'car-outline': '⚙️',             // Gear for engine
  'cube-outline': '📦',            // Box for tanks
  'thermometer-outline': '🌡️',    // Thermometer for temperature
  'speedometer-outline': '⏱️',     // Stopwatch for speed
  'navigate-outline': '📍',        // Pin/location for navigation/GPS
  'compass-outline': '🧭',         // Compass for heading
  'battery-charging-outline': '🔋', // Battery
  'swap-horizontal-outline': '🔄', // Arrows for autopilot
  'cloud-outline': '☁️',           // Cloud for wind/weather
  'boat-outline': '⛵',            // Sailboat for trip widget
  'color-palette-outline': '🎨',   // Theme switcher
  
  // UI/Navigation icons (actively used)
  'settings-outline': '⚙️',
  'grid-outline': '▦',
  'alert-circle-outline': '⚠️',
  'wifi-outline': '📶',
  'information-circle-outline': 'ℹ️',
  'information-circle': 'ℹ️',      // Tooltip (no outline variant)
  'notifications-outline': '🔔',
  'warning-outline': '⚠️',
  'add': '➕',
  'pin': '📌',
  'checkmark-circle-outline': '✅',
  'close-outline': '❌',
  'refresh-outline': '🔄',
  'remove': '➖',
  'layers-outline': '📚',
  'trash-outline': '🗑️',          // Undo/Redo clear history
  'help-circle-outline': '❓',     // Help button
  
  // Undo/Redo icons
  'arrow-undo': '↶',
  'arrow-redo': '↷',
  
  // Common fallback
  'default': '⚫',
};

const Ionicons = ({ name, size = 16, color = '#000', style = {} }) => {
  // Debug logging to verify mock is loaded
  if (typeof window !== 'undefined' && !window.__ioniconsDebugLogged) {
    console.log('✅ Ionicons MOCK loaded on web platform');
    window.__ioniconsDebugLogged = true;
  }
  
  // Try to get icon from registry first, then fallback to static map
  let iconSymbol = IconMap[name];
  
  // Enhanced icon resolution with registry integration
  if (!iconSymbol && WidgetMetadataRegistry) {
    // Check if this icon name corresponds to a widget in the registry
    try {
      const allWidgets = WidgetMetadataRegistry.getAllMetadata();
      const widget = allWidgets.find(w => w.icon === name);
      if (widget) {
        // Use the icon mapping for the widget's category
        const categoryIcons = {
          navigation: '🧭',     // Compass for navigation
          environment: '🌡️',    // Thermometer for environment
          engine: '⚙️',         // Gear for engine
          power: '🔋',          // Battery for power
          fluid: '💧'           // Droplet for fluid
        };
        iconSymbol = categoryIcons[widget.category] || '⚫';
      }
    } catch (e) {
      // Ignore registry errors
    }
  }
  
  // Final fallback
  if (!iconSymbol) {
    iconSymbol = IconMap['default'];
  }
  
  // Debug: Log first few icon requests to verify mock is working
  if (typeof window !== 'undefined') {
    window.__iconRequests = window.__iconRequests || [];
    if (window.__iconRequests.length < 5) {
      console.log(`🎨 Icon request #${window.__iconRequests.length + 1}:`, { 
        name, 
        symbol: iconSymbol, 
        color, 
        size,
        found: !!IconMap[name]
      });
      window.__iconRequests.push({ name, symbol: iconSymbol, color, size });
    }
  }
  
  // Convert hex color to brightness value for filter
  const getBrightness = (hexColor) => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    // Calculate relative luminance
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  };
  
  // Calculate brightness from color
  const colorBrightness = color.startsWith('#') ? getBrightness(color) : 0.5;
  
  // Invert logic: dark colors (day mode) need HIGH filter brightness
  // Light colors (night mode) need LOW filter brightness
  // This ensures grayscale emojis match the intended theme color
  const filterBrightness = colorBrightness < 0.5 
    ? 1.8  // Dark color (day mode) -> bright grayscale
    : 0.8; // Light color (night mode) -> dim grayscale
  
  return (
    <span
      style={{
        fontSize: size,
        lineHeight: 1,
        display: 'inline-block',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontWeight: 'normal',
        textAlign: 'center',
        width: size,
        height: size,
        // Convert emoji to grayscale and adjust brightness to match theme
        filter: `grayscale(100%) brightness(${filterBrightness}) contrast(1.2)`,
        willChange: 'filter',
        position: 'relative',
        isolation: 'isolate',
        ...style,
      }}
      role="img"
      aria-label={name}
    >
      {iconSymbol}
    </span>
  );
};

export default Ionicons;