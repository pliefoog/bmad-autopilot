import { WidgetRegistry } from './WidgetRegistry';
import { DepthWidget } from './DepthWidget';
import { SpeedWidget } from './SpeedWidget';
import { WindWidget } from './WindWidget';
import { GPSWidget } from './GPSWidget';
import { CompassWidget } from './CompassWidget';
import { EngineWidget } from './EngineWidget';
import { BatteryWidget } from './BatteryWidget';
import { TanksWidget } from './TanksWidget';
import { AutopilotStatusWidget } from './AutopilotStatusWidget';
import { RudderPositionWidget } from './RudderPositionWidget';
import { DynamicTemperatureWidget } from './DynamicTemperatureWidget';
import { ThemeSwitcher } from './ThemeSwitcher';

/**
 * Register all available widgets with the registry system
 * This replaces the hardcoded widget lists in Dashboard and WidgetSelector
 */
export function registerAllWidgets(): void {
  // Navigation widgets (data-driven)
  WidgetRegistry.register(
    {
      id: 'depth',
      title: 'Depth',
      icon: 'water-outline',
      description: 'Water depth sounder display',
      category: 'navigation',
      defaultSize: { width: 160, height: 160 },
      configurable: true,
      isPermanent: false,
      requiresNmeaData: true,
      isMultiInstance: false,
      canBeRemoved: true,
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
      isPermanent: false,
      requiresNmeaData: true,
      isMultiInstance: false,
      canBeRemoved: true,
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
      isPermanent: false,
      requiresNmeaData: true,
      isMultiInstance: false,
      canBeRemoved: true,
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
      isPermanent: false,
      requiresNmeaData: true,
      isMultiInstance: false,
      canBeRemoved: true,
    },
    CompassWidget
  );

  // Environment widgets (data-driven)
  WidgetRegistry.register(
    {
      id: 'wind',
      title: 'Wind',
      icon: 'cloud-outline',
      description: 'Wind speed and direction',
      category: 'environment',
      defaultSize: { width: 160, height: 160 },
      configurable: true,
      isPermanent: false,
      requiresNmeaData: true,
      isMultiInstance: false,
      canBeRemoved: true,
    },
    WindWidget
  );

  WidgetRegistry.register(
    {
      id: 'watertemp',
      title: 'Water Temp',
      icon: 'thermometer-outline',
      description: 'Water temperature sensor',
      category: 'environment',
      defaultSize: { width: 160, height: 160 },
      configurable: true,
      isPermanent: false,
      requiresNmeaData: true,
      isMultiInstance: false,
      canBeRemoved: true,
    },
    DynamicTemperatureWidget
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
      isPermanent: false,
      requiresNmeaData: true,
      isMultiInstance: true,
      canBeRemoved: true,
    },
    DynamicTemperatureWidget
  );

  // Engine widgets (multi-instance)
  WidgetRegistry.register(
    {
      id: 'engine',
      title: 'Engine',
      icon: 'car-outline',
      description: 'Engine RPM and parameters',
      category: 'engine',
      defaultSize: { width: 160, height: 160 },
      configurable: true,
      isPermanent: false,
      requiresNmeaData: true,
      isMultiInstance: true,
      canBeRemoved: true,
    },
    EngineWidget
  );

  // Electrical widgets (multi-instance)
  WidgetRegistry.register(
    {
      id: 'battery',
      title: 'Battery',
      icon: 'battery-charging-outline',
      description: 'Battery voltage and status',
      category: 'electrical',
      defaultSize: { width: 160, height: 160 },
      configurable: true,
      isPermanent: false,
      requiresNmeaData: true,
      isMultiInstance: true,
      canBeRemoved: true,
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
      isPermanent: false,
      requiresNmeaData: true,
      isMultiInstance: true,
      canBeRemoved: true,
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
      isPermanent: false,
      requiresNmeaData: true,
      isMultiInstance: true,
      canBeRemoved: true,
    },
    TanksWidget
  );
  console.log('[registerAllWidgets] Tank widget registered successfully');

  // Autopilot widgets (data-driven)
  WidgetRegistry.register(
    {
      id: 'autopilot',
      title: 'Autopilot',
      icon: 'swap-horizontal-outline',
      description: 'Autopilot mode and status',
      category: 'autopilot',
      defaultSize: { width: 160, height: 160 },
      configurable: true,
      isPermanent: false,
      requiresNmeaData: true,
      isMultiInstance: false,
      canBeRemoved: true,
    },
    AutopilotStatusWidget
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
      isPermanent: false,
      requiresNmeaData: true,
      isMultiInstance: false,
      canBeRemoved: true,
    },
    RudderPositionWidget
  );

  // System widgets (always present)
  WidgetRegistry.register(
    {
      id: 'theme',
      title: 'Theme',
      icon: 'color-palette-outline',
      description: 'Day/night theme switcher',
      category: 'system',
      defaultSize: { width: 160, height: 160 },
      configurable: false,
      isPermanent: true,
      requiresNmeaData: false,
      isMultiInstance: false,
      canBeRemoved: false,
    },
    ThemeSwitcher
  );
}