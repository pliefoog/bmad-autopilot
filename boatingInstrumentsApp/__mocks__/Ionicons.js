import React from 'react';
import { Text, Platform } from 'react-native';

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
  'water-outline': '💧', // Water droplet for depth
  'arrow-down-outline': '⭣', // Downward arrow with bar (depth indicator)
  'arrow-forward-outline': '⇉', // Triple right arrows (speed/velocity)
  'car-outline': '⚙️', // Gear for engine
  'cube-outline': '📦', // Box for tanks
  'thermometer-outline': '🌡️', // Thermometer for temperature
  'speedometer-outline': '⏱️', // Stopwatch for speed
  'navigate-outline': '📍', // Pin/location for navigation/GPS
  'arrows-horizontal-outline': '↔', // Left-right arrow for distance
  'angle-outline': '∠', // Angle symbol for angles
  'compass-outline': '🧭', // Compass for heading
  'battery-charging-outline': '🔋', // Battery
  'flash-outline': '⚡', // Lightning for electrical current
  'swap-horizontal-outline': '🔄', // Arrows for autopilot
  'cloud-outline': '☁️', // Cloud for wind/weather
  'boat-outline': '⛵', // Sailboat for trip widget
  'color-palette-outline': '🎨', // Theme switcher

  // Additional marine icons from Widget Metadata Registry
  'cloudy-outline': '☁️', // Outside air temperature
  'home-outline': '🏠', // Inside air / main cabin
  'bed-outline': '🛏️', // Cabin locations
  'fish-outline': '🐟', // Live well / bait well
  'snow-outline': '❄️', // Freezer / refrigeration / wind chill
  'flame-outline': '🔥', // Heating system / exhaust gas
  'rainy-outline': '🌧️', // Dew point
  'sunny-outline': '☀️', // Heat index

  // UI/Navigation icons (actively used)
  'settings-outline': '⚙️',
  'grid-outline': '▦',
  'alert-circle-outline': '⚠️',
  'wifi-outline': '📶',
  'cellular-outline': '📶', // Signal bars for voltage levels
  'information-circle-outline': 'ℹ️',
  'information-circle': 'ℹ️', // Tooltip (no outline variant)
  'notifications-outline': '🔔',
  'warning-outline': '⚠️',
  add: '➕',
  pin: '📌',
  'checkmark-circle-outline': '✅',
  'close-outline': '❌',
  close: '✕', // Close button (simpler X)
  'refresh-outline': '🔄',
  remove: '➖',
  'chevron-forward-outline': '›', // Right chevron for navigation
  'chevron-back-outline': '‹', // Left chevron for back navigation
  'chevron-down-outline': '⌄', // Down chevron for dropdowns
  'chevron-down': '⌄', // Down chevron (non-outline variant)
  'chevron-up': '⌃', // Up chevron for collapse
  'volume-high-outline': '🔊', // Sound/volume
  'layers-outline': '📚',
  'trash-outline': '🗑️', // Undo/Redo clear history
  'help-circle-outline': '❓', // Help button

  // Onboarding icons
  'arrow-back': '←', // Back arrow
  'arrow-forward': '→', // Forward arrow
  'accessibility-outline': '♿', // Accessibility
  'contrast-outline': '◐', // Contrast/half circle
  'text-outline': 'T', // Text icon
  'hand-left-outline': '✋', // Hand gesture
  'location-outline': '📍', // GPS/location pin

  // Undo/Redo icons
  'arrow-undo': '↶',
  'arrow-redo': '↷',

  // Common fallback
  default: '⚫',
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
      const widget = allWidgets.find((w) => w.icon === name);
      if (widget) {
        // Use the icon mapping for the widget's category
        const categoryIcons = {
          navigation: '🧭', // Compass for navigation
          environment: '🌡️', // Thermometer for environment
          engine: '⚙️', // Gear for engine
          power: '🔋', // Battery for power
          fluid: '💧', // Droplet for fluid
        };
        iconSymbol = categoryIcons[widget.category] || '⚫';
      }
    } catch (e) {
      // Ignore registry errors
    }
  }

  // Final fallback
  if (!iconSymbol) {
    iconSymbol = IconMap.default;
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
        found: !!IconMap[name],
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

  const brightness = color.startsWith('#') ? getBrightness(color) : 0.5;

  // Scale up certain Unicode symbols that render smaller than emojis
  const needsScaling = ['∠', '↔', '⚡', '⭣', '⇉', '›', '‹'].includes(iconSymbol);
  const scale = needsScaling ? 1.4 : 1;

  // Use platform-appropriate component (Text for native, span for web)
  if (Platform.OS === 'web') {
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
          transform: `scale(${scale})`,
          // Convert emoji to grayscale and adjust brightness to match theme
          filter: `grayscale(100%) brightness(${brightness * 2.5}) contrast(1.2)`,
          willChange: 'filter',
          position: 'relative',
          isolation: 'isolate',
          ...style,
        }}
      >
        {iconSymbol}
      </span>
    );
  }

  // Native platforms (iOS/Android) - use Text component
  return (
    <Text
      style={{
        fontSize: size,
        lineHeight: size,
        fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
        fontWeight: 'normal',
        textAlign: 'center',
        width: size,
        height: size,
        color: color,
        ...style,
      }}
    >
      {iconSymbol}
    </Text>
  );
};

export default Ionicons;
