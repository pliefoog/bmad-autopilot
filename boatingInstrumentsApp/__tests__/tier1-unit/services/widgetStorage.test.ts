/**
 * Widget Storage Service Tests
 */

import { widgetStorageService, WidgetConfig } from "../../../src/services/storage/widgetStorage";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('WidgetStorageService', () => {
  const sampleWidgets: WidgetConfig[] = [
    {
      id: 'widget1',
      type: 'speed',
      position: { x: 0, y: 0 },
      size: { width: 200, height: 100 },
      settings: { units: 'knots' },
      visible: true,
    },
    {
      id: 'widget2',
      type: 'depth',
      position: { x: 200, y: 0 },
      size: { width: 200, height: 100 },
      settings: { units: 'feet' },
      visible: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveLayout', () => {
    it('should save widget layout to AsyncStorage', async () => {
      mockAsyncStorage.setItem.mockResolvedValue();

      await widgetStorageService.saveLayout(sampleWidgets);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'widget_layout',
        JSON.stringify(sampleWidgets)
      );
    });

    it('should throw error when save fails', async () => {
      const error = new Error('Storage error');
      mockAsyncStorage.setItem.mockRejectedValue(error);

      await expect(widgetStorageService.saveLayout(sampleWidgets))
        .rejects.toThrow('Widget layout save failed: Error: Storage error');
    });
  });

  describe('loadLayout', () => {
    it('should load widget layout from AsyncStorage', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(sampleWidgets));

      const result = await widgetStorageService.loadLayout();

      expect(result).toEqual(sampleWidgets);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('widget_layout');
    });

    it('should return empty array when no layout exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await widgetStorageService.loadLayout();

      expect(result).toEqual([]);
    });

    it('should throw error when load fails', async () => {
      const error = new Error('Storage error');
      mockAsyncStorage.getItem.mockRejectedValue(error);

      await expect(widgetStorageService.loadLayout())
        .rejects.toThrow('Widget layout load failed: Error: Storage error');
    });
  });

  describe('clearLayout', () => {
    it('should clear widget layout from AsyncStorage', async () => {
      mockAsyncStorage.removeItem.mockResolvedValue();

      await widgetStorageService.clearLayout();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('widget_layout');
    });
  });

  describe('widget settings', () => {
    const widgetId = 'test-widget';
    const settings = { theme: 'dark', precision: 2 };

    it('should save widget settings', async () => {
      mockAsyncStorage.setItem.mockResolvedValue();

      await widgetStorageService.saveWidgetSettings(widgetId, settings);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        `widget_settings_${widgetId}`,
        JSON.stringify(settings)
      );
    });

    it('should load widget settings', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(settings));

      const result = await widgetStorageService.loadWidgetSettings(widgetId);

      expect(result).toEqual(settings);
    });

    it('should return null when no settings exist', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await widgetStorageService.loadWidgetSettings(widgetId);

      expect(result).toBeNull();
    });
  });
});