import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: TextStyle;
  testID?: string;
}

// Simple icon component using Unicode symbols for web compatibility
// This matches the pattern used in the existing Ionicons mock
const Icon: React.FC<IconProps> = ({
  name,
  size = 16,
  color = '#000',
  style,
  testID,
}) => {
  // Icon mapping based on existing Ionicons mock
  const iconMap: { [key: string]: string } = {
    // Marine instrument icons
    'water': '🌊',
    'water-outline': '🌊',
    'car-outline': '⚙️',
    'cube-outline': '⛽',
    'thermometer': '🌡️',
    'thermometer-outline': '🌡️',
    'speedometer': '💨',
    'speedometer-outline': '💨',
    'location': '📍',
    'navigate': '🧭',
    'navigate-outline': '🧭',
    'boat': '⛵',
    'boat-outline': '⛵',
    'leaf': '💨',
    'battery-charging-outline': '🔋',
    'compass': '🧭',
    'compass-outline': '🧭',
    'swap-horizontal-outline': '🤖',
    'cloud-outline': '💨',
    'color-palette-outline': '🎨',
    // Tank-specific icons
    'fuel-pump': '⛽',
    'droplet': '💧',
    'toilet': '🚽',
    // Generic metrics
    'bar-chart': '📊',
    'chart-bar': '📊',
    'analytics': '📊',
    // UI icons
    'settings-outline': '⚙',
    'grid-outline': '▦',
    'alert-circle-outline': '⚠',
    'wifi-outline': '◉',
    'information-circle-outline': 'ℹ',
    'notifications-outline': '○',
    'warning-outline': '⚠',
    // Common fallback
    'default': '●',
  };

  const iconSymbol = iconMap[name] || iconMap['default'];

  const iconStyle = [
    styles.icon,
    {
      fontSize: size,
      color,
      width: size,
      height: size,
    },
    style,
  ];

  return (
    <Text style={iconStyle} testID={testID} role="img" aria-label={name}>
      {iconSymbol}
    </Text>
  );
};

const styles = StyleSheet.create({
  icon: {
    textAlign: 'center',
    lineHeight: 1,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontWeight: 'normal',
  },
});

export default Icon;