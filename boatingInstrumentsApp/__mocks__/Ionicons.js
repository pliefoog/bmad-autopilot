import React from 'react';

// Web-compatible Ionicons replacement using emoji with monochromatic styling
const IconMap = {
  // Marine instrument icons (user-specified descriptive symbols)
  'water': '🌊',           // Water Wave for depth
  'water-outline': '🌊', 
  'car-outline': '⚙️',     // Gear for engine
  'cube-outline': '⛽',     // Fuel Pump for tanks (generic)
  'thermometer': '🌡️',     // Thermometer for temperature
  'thermometer-outline': '🌡️',
  'speedometer': '💨',     // Dashing Away for speed
  'speedometer-outline': '💨',
  'location': '📍',        // Round Pushpin for GPS position
  'navigate': '🧭',        // Compass for navigation
  'navigate-outline': '🧭',
  'boat': '⛵',           // Sailboat 
  'boat-outline': '⛵',
  'leaf': '💨',           // Dashing Away for wind (movement)
  'battery-charging-outline': '🔋',  // Battery symbol
  'compass': '🧭',        // Compass symbol
  'compass-outline': '🧭',
  'swap-horizontal-outline': '🤖',  // Robot Face for autopilot
  'cloud-outline': '💨',   // Dashing Away for wind
  'color-palette-outline': '🎨',
  
  // Tank-specific icons
  'fuel-pump': '⛽',      // Fuel Pump for fuel tank
  'droplet': '💧',        // Droplet for water tank
  'toilet': '🚽',         // Toilet for waste tank
  
  // Generic metrics
  'bar-chart': '📊',      // Bar Chart for generic NMEA metrics widget
  'chart-bar': '📊',      // Alternative naming
  'analytics': '📊',      // Alternative naming
  
  // HamburgerMenu icons (simple Unicode symbols for web compatibility)
  'settings-outline': '⚙',
  'grid-outline': '▦',
  'alert-circle-outline': '⚠',
  'wifi-outline': '◉',
  'information-circle-outline': 'ℹ',
  
  // Footer/UI icons (simple Unicode symbols for web compatibility)
  'notifications-outline': '○',
  'warning-outline': '⚠',
  
  // Common fallbacks
  'default': '●',
};

const Ionicons = ({ name, size = 16, color = '#000', style = {} }) => {
  const iconSymbol = IconMap[name] || IconMap['default'];
  
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
        // Convert emoji to grayscale and adjust brightness to match theme
        // Use will-change to isolate the filter effects
        filter: `grayscale(100%) brightness(${brightness * 1.5}) contrast(1.2)`,
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