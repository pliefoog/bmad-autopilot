/**
 * Widget Storage Service
 * Handles persistence of widget layouts and configurations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Legacy storage service - no longer used
// widgetStore.ts now handles persistence via Zustand persist middleware
// This file kept for migration/compatibility only

export interface WidgetConfig {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  settings: Record<string, any>;
  visible: boolean;
}

export interface WidgetStorageService {
  saveLayout(widgets: WidgetConfig[]): Promise<void>;
  loadLayout(): Promise<WidgetConfig[]>;
  clearLayout(): Promise<void>;
  saveWidgetSettings(widgetId: string, settings: Record<string, any>): Promise<void>;
  loadWidgetSettings(widgetId: string): Promise<Record<string, any> | null>;
}

class WidgetStorageServiceImpl implements WidgetStorageService {
  private static instance: WidgetStorageServiceImpl;
  private readonly LAYOUT_KEY = 'widget_layout';
  private readonly WIDGET_SETTINGS_PREFIX = 'widget_settings_';

  static getInstance(): WidgetStorageServiceImpl {
    if (!WidgetStorageServiceImpl.instance) {
      WidgetStorageServiceImpl.instance = new WidgetStorageServiceImpl();
    }
    return WidgetStorageServiceImpl.instance;
  }

  async saveLayout(widgets: WidgetConfig[]): Promise<void> {
    try {
      const layoutData = JSON.stringify(widgets);
      await AsyncStorage.setItem(this.LAYOUT_KEY, layoutData);
    } catch (error) {
      console.error('Failed to save widget layout:', error);
      throw new Error(`Widget layout save failed: ${error}`);
    }
  }

  async loadLayout(): Promise<WidgetConfig[]> {
    try {
      const layoutData = await AsyncStorage.getItem(this.LAYOUT_KEY);
      if (!layoutData) {
        return [];
      }

      const widgets = JSON.parse(layoutData) as WidgetConfig[];
      return widgets;
    } catch (error) {
      console.error('Failed to load widget layout:', error);
      throw new Error(`Widget layout load failed: ${error}`);
    }
  }

  async clearLayout(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.LAYOUT_KEY);
    } catch (error) {
      console.error('Failed to clear widget layout:', error);
      throw new Error(`Widget layout clear failed: ${error}`);
    }
  }

  async saveWidgetSettings(widgetId: string, settings: Record<string, any>): Promise<void> {
    try {
      const key = this.WIDGET_SETTINGS_PREFIX + widgetId;
      await AsyncStorage.setItem(key, JSON.stringify(settings));
    } catch (error) {
      console.error(`Failed to save settings for widget ${widgetId}:`, error);
      throw new Error(`Widget settings save failed: ${error}`);
    }
  }

  async loadWidgetSettings(widgetId: string): Promise<Record<string, any> | null> {
    try {
      const key = this.WIDGET_SETTINGS_PREFIX + widgetId;
      const settingsData = await AsyncStorage.getItem(key);

      if (!settingsData) {
        return null;
      }

      const settings = JSON.parse(settingsData);
      return settings;
    } catch (error) {
      console.error(`Failed to load settings for widget ${widgetId}:`, error);
      throw new Error(`Widget settings load failed: ${error}`);
    }
  }
}

// Export singleton instance
export const widgetStorageService = WidgetStorageServiceImpl.getInstance();
