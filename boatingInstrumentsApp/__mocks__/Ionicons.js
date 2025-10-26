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

// Enhanced Web-compatible Ionicons replacement with registry integration
const IconMap = {
  // Marine instrument icons (monochromatic web-compatible symbols)
  'water': '▢',           // Square for depth (monochromatic)
  'water-outline': '▢',   // Square outline for depth  
  'car-outline': '⚙',     // Simple gear for engine (no emoji variation)
  'cube-outline': '□',     // Square outline for tanks
  'thermometer': '|',     // Simple line for temperature
  'thermometer-outline': '|',
  'speedometer': '◐',     // Semi-circle for speed (gauge-like)
  'speedometer-outline': '◐',
  'location': '⊙',        // Target symbol for GPS position
  'navigate': '↗',        // Arrow for navigation
  'navigate-outline': '↗',
  'boat': '△',           // Triangle for boat 
  'boat-outline': '△',
  'leaf': '◦',           // Small circle for wind
  'battery-charging-outline': '▮',  // Rectangle for battery
  'compass': '⊕',        // Cross in circle for compass
  'compass-outline': '⊕',
  'swap-horizontal-outline': '⇄',  // Double arrow for autopilot
  'cloud-outline': '◦',   // Circle for wind
  'color-palette-outline': '◨',
  
  // Tank-specific icons
  'fuel-pump': '□',      // Square for fuel tank
  'droplet': '◦',        // Circle for water tank
  'toilet': '▢',         // Square for waste tank
  
  // Generic metrics
  'bar-chart': '▤',      // Grid pattern for charts
  'chart-bar': '▤',      // Alternative naming
  'analytics': '▤',      // Alternative naming
  
  // HamburgerMenu icons (simple Unicode symbols for web compatibility)
  'settings-outline': '⚙',
  'grid-outline': '▦',
  'alert-circle-outline': '⚠',
  'wifi-outline': '◉',
  'information-circle-outline': 'ℹ',
  
  // Footer/UI icons (simple Unicode symbols for web compatibility)
  'notifications-outline': '○',
  'warning-outline': '⚠',
  
  // Additional UI icons
  'add': '+',
  'pin': '◉',
  'checkmark-circle-outline': '✓',
  'close-outline': '×',
  'refresh-outline': '↻',
  'remove': '−',
  'layers-outline': '≡',
  
  // Common fallbacks
  'default': '●',
};

const Ionicons = ({ name, size = 16, color = '#000', style = {} }) => {
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
          navigation: '◎',     // Target for navigation
          environment: '◦',    // Circle for environment
          engine: '⚙',         // Gear for engine
          power: '▮',          // Rectangle for power
          fluid: '□'           // Square for fluid
        };
        iconSymbol = categoryIcons[widget.category] || '●';
      }
    } catch (e) {
      // Ignore registry errors
    }
  }
  
  // Final fallback
  if (!iconSymbol) {
    iconSymbol = IconMap['default'];
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
        // Convert emoji to monochromatic using advanced CSS filters
        // This technique converts colored emoji to single-color monochromatic icons
        filter: `
          grayscale(100%) 
          brightness(${brightness * 2}) 
          contrast(2) 
          sepia(100%) 
          saturate(0%) 
          hue-rotate(0deg)
        `,
        // Additional properties to ensure monochromatic appearance
        WebkitFilter: `grayscale(100%) brightness(${brightness * 2}) contrast(2)`,
        willChange: 'filter',
        // Ensure the icon doesn't affect parent layout
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