import { WidgetRegistry } from './WidgetRegistry';
import { DepthWidget } from './DepthWidget';
import { SpeedWidget } from './SpeedWidget';
import { WindWidget } from './WindWidget';
import { GPSWidget } from './GPSWidget';
import { CompassWidget } from './CompassWidget';
import { NavigationWidget } from './NavigationWidget';
import { EngineWidget } from './EngineWidget';
import { BatteryWidget } from './BatteryWidget';
import { TanksWidget } from './TanksWidget';
import { AutopilotWidget } from './AutopilotWidget';
import { RudderWidget } from './RudderWidget';
import { TemperatureWidget } from './TemperatureWidget';
import { ThemeWidget } from './ThemeWidget';

/**
 * Register all available widgets with the registry system
 * This replaces the hardcoded widget lists in Dashboard and WidgetSelector
 */
export function registerAllWidgets(): void {
  // Navigation widgets
  WidgetRegistry.register(
    {
      id: 'depth',
      title: 'Depth',
      icon: 'water-outline',
      description: 'Water depth sounder display',
      category: 'navigation',
      defaultSize: { width: 160, height: 160 },
      configurable: true,
    },
    DepthWidget
  );

  WidgetRegistry.register(
    {
      id: 'speed',
      title: 'Speed',
      icon: 'speedometer-outline',
      description: 'Vessel speed over ground',
      category: 'navigation',
      defaultSize: { width: 160, height: 160 },
      configurable: true,
    },
    SpeedWidget
  );

  WidgetRegistry.register(
    {
      id: 'gps',
      title: 'GPS',
      icon: 'navigate-outline',
      description: 'GPS position and status',
      category: 'navigation',
      defaultSize: { width: 160, height: 160 },
      configurable: true,
    },
    GPSWidget
  );

  WidgetRegistry.register(
    {
      id: 'compass',
      title: 'Compass',
      icon: 'compass-outline',
      description: 'Digital compass heading',
      category: 'navigation',
      defaultSize: { width: 160, height: 160 },
      configurable: true,
    },
    CompassWidget
  );

  WidgetRegistry.register(
    {
      id: 'navigation',
      title: 'Navigation',
      icon: 'navigate-circle-outline',
      description: 'Waypoint navigation and course tracking',
      category: 'navigation',
      defaultSize: { width: 200, height: 200 },
      configurable: true,
    },
    NavigationWidget
  );

  // Environment widgets
  WidgetRegistry.register(
    {
      id: 'wind',
      title: 'Wind',
      icon: 'cloud-outline',
      description: 'Wind speed and direction',
      category: 'environment',
      defaultSize: { width: 160, height: 160 },
      configurable: true,
    },
    WindWidget
  );

  // Register multi-instance temperature widget (supports all NMEA temperature zones)
  WidgetRegistry.register(
    {
      id: 'temperature',
      title: 'Temperature',
      icon: 'thermometer-outline',
      description: 'Multi-instance temperature sensors (water, air, engine room, etc.)',
      category: 'environment',
      defaultSize: { width: 160, height: 160 },
      configurable: true,
    },
    TemperatureWidget
  );

  // Engine widgets
  WidgetRegistry.register(
    {
      id: 'engine',
      title: 'Engine',
      icon: 'car-outline',
      description: 'Engine RPM and parameters',
      category: 'engine',
      defaultSize: { width: 160, height: 160 },
      configurable: true,
    },
    EngineWidget
  );

  // Electrical widgets
  WidgetRegistry.register(
    {
      id: 'battery',
      title: 'Battery',
      icon: 'battery-charging-outline',
      description: 'Battery voltage and status',
      category: 'electrical',
      defaultSize: { width: 160, height: 160 },
      configurable: true,
    },
    BatteryWidget
  );

  WidgetRegistry.register(
    {
      id: 'tanks',
      title: 'Tanks',
      icon: 'cube-outline',
      description: 'Fuel, water, and waste tank levels',
      category: 'electrical',
      defaultSize: { width: 160, height: 160 },
      configurable: true,
    },
    TanksWidget
  );

  // Register individual tank widget (for multi-instance tank-0, tank-1, etc.)
  console.log('[registerAllWidgets] Registering tank widget...');
  WidgetRegistry.register(
    {
      id: 'tank',
      title: 'Tank',
      icon: 'cube-outline',
      description: 'Individual tank level and status',
      category: 'electrical',
      defaultSize: { width: 160, height: 160 },
      configurable: true,
    },
    TanksWidget
  );
  console.log('[registerAllWidgets] Tank widget registered successfully');

  // Autopilot widgets
  WidgetRegistry.register(
    {
      id: 'autopilot',
      title: 'Autopilot',
      icon: 'swap-horizontal-outline',
      description: 'Autopilot mode and status',
      category: 'autopilot',
      defaultSize: { width: 160, height: 160 },
      configurable: true,
    },
    AutopilotWidget
  );

  WidgetRegistry.register(
    {
      id: 'rudder',
      title: 'Rudder',
      icon: 'boat-outline',
      description: 'Rudder position indicator',
      category: 'autopilot',
      defaultSize: { width: 160, height: 160 },
      configurable: true,
    },
    RudderWidget
  );

  // Utility widgets
  WidgetRegistry.register(
    {
      id: 'theme',
      title: 'Theme',
      icon: 'color-palette-outline',
      description: 'Day/night theme switcher',
      category: 'navigation', // Default category for utility
      defaultSize: { width: 400, height: 300 },
      configurable: true,
    },
    ThemeWidget
  );
}