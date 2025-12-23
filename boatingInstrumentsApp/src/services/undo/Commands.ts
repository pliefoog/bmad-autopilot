import { Command } from './UndoRedoManager';
import { useThemeStore } from '../../store/themeStore';
import { useSettingsStore, ThemeSettings } from '../../store/settingsStore';
import { ThemeMode } from '../../types';

/**
 * Theme Change Command
 * Allows undoing/redoing theme mode changes
 */
export class ThemeChangeCommand implements Command {
  public readonly id: string;
  public readonly description: string;
  public readonly timestamp: number;

  private previousMode: ThemeMode;
  private newMode: ThemeMode;

  constructor(newMode: ThemeMode) {
    this.id = `theme-change-${Date.now()}`;
    this.timestamp = Date.now();
    this.previousMode = useThemeStore.getState().mode;
    this.newMode = newMode;
    this.description = `Change theme from ${this.previousMode} to ${this.newMode}`;
  }

  async execute(): Promise<void> {
    useThemeStore.getState().setMode(this.newMode);
  }

  async undo(): Promise<void> {
    useThemeStore.getState().setMode(this.previousMode);
  }

  canUndo(): boolean {
    return true;
  }

  canRedo(): boolean {
    return true;
  }
}

/**
 * Theme Settings Change Command
 * Allows undoing/redoing theme settings (font size, contrast, etc.)
 */
export class ThemeSettingsChangeCommand implements Command {
  public readonly id: string;
  public readonly description: string;
  public readonly timestamp: number;

  private previousSettings: Partial<ThemeSettings>;
  private newSettings: Partial<ThemeSettings>;

  constructor(newSettings: Partial<ThemeSettings>, description?: string) {
    this.id = `theme-settings-change-${Date.now()}`;
    this.timestamp = Date.now();
    this.previousSettings = { ...useSettingsStore.getState().themeSettings };
    this.newSettings = newSettings;

    // Generate description from changed settings
    if (description) {
      this.description = description;
    } else {
      const changes = Object.keys(newSettings).join(', ');
      this.description = `Change theme settings: ${changes}`;
    }
  }

  async execute(): Promise<void> {
    useSettingsStore.getState().updateThemeSettings(this.newSettings);
  }

  async undo(): Promise<void> {
    useSettingsStore.getState().updateThemeSettings(this.previousSettings);
  }

  canUndo(): boolean {
    return true;
  }

  canRedo(): boolean {
    return true;
  }
}

/**
 * Widget Add Command
 * Allows undoing/redoing widget additions
 */
export class WidgetAddCommand implements Command {
  public readonly id: string;
  public readonly description: string;
  public readonly timestamp: number;

  private widgetId: string;
  private onAdd: (widgetId: string) => void;
  private onRemove: (widgetId: string) => void;

  constructor(
    widgetId: string,
    onAdd: (widgetId: string) => void,
    onRemove: (widgetId: string) => void,
  ) {
    this.id = `widget-add-${widgetId}-${Date.now()}`;
    this.timestamp = Date.now();
    this.widgetId = widgetId;
    this.onAdd = onAdd;
    this.onRemove = onRemove;
    this.description = `Add ${widgetId} widget`;
  }

  async execute(): Promise<void> {
    this.onAdd(this.widgetId);
  }

  async undo(): Promise<void> {
    this.onRemove(this.widgetId);
  }

  canUndo(): boolean {
    return true;
  }

  canRedo(): boolean {
    return true;
  }
}

/**
 * Widget Remove Command
 * Allows undoing/redoing widget removals
 */
export class WidgetRemoveCommand implements Command {
  public readonly id: string;
  public readonly description: string;
  public readonly timestamp: number;

  private widgetId: string;
  private onAdd: (widgetId: string) => void;
  private onRemove: (widgetId: string) => void;

  constructor(
    widgetId: string,
    onAdd: (widgetId: string) => void,
    onRemove: (widgetId: string) => void,
  ) {
    this.id = `widget-remove-${widgetId}-${Date.now()}`;
    this.timestamp = Date.now();
    this.widgetId = widgetId;
    this.onAdd = onAdd;
    this.onRemove = onRemove;
    this.description = `Remove ${widgetId} widget`;
  }

  async execute(): Promise<void> {
    this.onRemove(this.widgetId);
  }

  async undo(): Promise<void> {
    this.onAdd(this.widgetId);
  }

  canUndo(): boolean {
    return true;
  }

  canRedo(): boolean {
    return true;
  }
}

/**
 * Connection Settings Command
 * Allows undoing/redoing connection configuration changes
 */
export interface ConnectionConfig {
  ip: string;
  port: number;
  protocol: 'tcp' | 'udp' | 'websocket';
}

export class ConnectionSettingsCommand implements Command {
  public readonly id: string;
  public readonly description: string;
  public readonly timestamp: number;

  private previousConfig: ConnectionConfig;
  private newConfig: ConnectionConfig;
  private onApply: (config: ConnectionConfig) => void;

  constructor(
    previousConfig: ConnectionConfig,
    newConfig: ConnectionConfig,
    onApply: (config: ConnectionConfig) => void,
  ) {
    this.id = `connection-settings-${Date.now()}`;
    this.timestamp = Date.now();
    this.previousConfig = previousConfig;
    this.newConfig = newConfig;
    this.onApply = onApply;
    this.description = `Change connection to ${newConfig.ip}:${newConfig.port} (${newConfig.protocol})`;
  }

  async execute(): Promise<void> {
    this.onApply(this.newConfig);
  }

  async undo(): Promise<void> {
    this.onApply(this.previousConfig);
  }

  canUndo(): boolean {
    return true;
  }

  canRedo(): boolean {
    return true;
  }
}

/**
 * Display Settings Command
 * Allows undoing/redoing display settings changes
 */
export class DisplaySettingsCommand implements Command {
  public readonly id: string;
  public readonly description: string;
  public readonly timestamp: number;

  private previousSettings: Partial<ReturnType<typeof useSettingsStore.getState>['display']>;
  private newSettings: Partial<ReturnType<typeof useSettingsStore.getState>['display']>;

  constructor(
    newSettings: Partial<ReturnType<typeof useSettingsStore.getState>['display']>,
    description?: string,
  ) {
    this.id = `display-settings-${Date.now()}`;
    this.timestamp = Date.now();
    this.previousSettings = { ...useSettingsStore.getState().display };
    this.newSettings = newSettings;

    if (description) {
      this.description = description;
    } else {
      const changes = Object.keys(newSettings).join(', ');
      this.description = `Change display settings: ${changes}`;
    }
  }

  async execute(): Promise<void> {
    useSettingsStore.getState().updateDisplaySettings(this.newSettings);
  }

  async undo(): Promise<void> {
    useSettingsStore.getState().updateDisplaySettings(this.previousSettings);
  }

  canUndo(): boolean {
    return true;
  }

  canRedo(): boolean {
    return true;
  }
}

/**
 * Unit Change Command
 * Allows undoing/redoing unit preference changes
 */
export class UnitChangeCommand implements Command {
  public readonly id: string;
  public readonly description: string;
  public readonly timestamp: number;

  private category: keyof ReturnType<typeof useSettingsStore.getState>['units'];
  private previousUnit: string;
  private newUnit: string;

  constructor(
    category: keyof ReturnType<typeof useSettingsStore.getState>['units'],
    newUnit: string,
  ) {
    this.id = `unit-change-${category}-${Date.now()}`;
    this.timestamp = Date.now();
    this.category = category;
    this.previousUnit = useSettingsStore.getState().units[category];
    this.newUnit = newUnit;
    this.description = `Change ${category} unit from ${this.previousUnit} to ${this.newUnit}`;
  }

  async execute(): Promise<void> {
    useSettingsStore.getState().setUnit(this.category, this.newUnit);
  }

  async undo(): Promise<void> {
    useSettingsStore.getState().setUnit(this.category, this.previousUnit);
  }

  canUndo(): boolean {
    return true;
  }

  canRedo(): boolean {
    return true;
  }
}
