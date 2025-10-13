import { LayoutService, WidgetLayout } from '../src/services/layoutService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('LayoutService', () => {
  const mockLayout: WidgetLayout[] = [
    {
      id: 'depth',
      position: { x: 0, y: 0 },
      size: { width: 160, height: 160 },
      visible: true,
      order: 0,
    },
    {
      id: 'speed',
      position: { x: 170, y: 0 },
      size: { width: 160, height: 160 },
      visible: true,
      order: 1,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveLayout', () => {
    it('should save layout to AsyncStorage', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await LayoutService.saveLayout(mockLayout);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@bmad/widget_layout',
        expect.stringContaining('"widgets"')
      );
    });

    it('should handle save errors', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(LayoutService.saveLayout(mockLayout)).rejects.toThrow('Storage error');
    });
  });

  describe('loadLayout', () => {
    it('should load layout from AsyncStorage', async () => {
      const storedLayout = {
        widgets: mockLayout,
        version: '1.0',
        lastModified: '2025-10-12T10:00:00Z',
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedLayout));

      const result = await LayoutService.loadLayout();

      expect(result).toEqual(mockLayout);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@bmad/widget_layout');
    });

    it('should return default layout when no stored data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await LayoutService.loadLayout();

      expect(result).toHaveLength(6); // Default layout has 6 widgets
      expect(result[0].id).toBe('depth');
    });

    it('should return default layout on parse error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      const result = await LayoutService.loadLayout();

      expect(result).toHaveLength(6); // Default layout
    });
  });

  describe('resetLayout', () => {
    it('should remove layout from AsyncStorage', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await LayoutService.resetLayout();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@bmad/widget_layout');
    });
  });

  describe('getDefaultLayout', () => {
    it('should return default widget layout', () => {
      const defaultLayout = LayoutService.getDefaultLayout();

      expect(defaultLayout).toHaveLength(6);
      expect(defaultLayout[0].id).toBe('depth');
      expect(defaultLayout[1].id).toBe('speed');
      expect(defaultLayout.every(w => w.visible)).toBe(true);
    });
  });

  describe('updateWidgetPosition', () => {
    it('should update widget position in layout', async () => {
      const storedLayout = {
        widgets: mockLayout,
        version: '1.0',
        lastModified: '2025-10-12T10:00:00Z',
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedLayout));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await LayoutService.updateWidgetPosition('depth', { x: 100, y: 100 });

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      // Verify the position was updated in the saved data
      const saveCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const savedData = JSON.parse(saveCall[1]);
      expect(savedData.widgets[0].position).toEqual({ x: 100, y: 100 });
    });
  });

  describe('addWidget', () => {
    it('should add new widget to layout', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        widgets: mockLayout,
        version: '1.0',
      }));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await LayoutService.addWidget('compass', { x: 50, y: 50 });

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const saveCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const savedData = JSON.parse(saveCall[1]);
      expect(savedData.widgets).toHaveLength(3);
      expect(savedData.widgets[2].id).toBe('compass');
    });

    it('should not add widget if already exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        widgets: mockLayout,
        version: '1.0',
      }));

      await LayoutService.addWidget('depth'); // Already exists

      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('removeWidget', () => {
    it('should remove widget from layout', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        widgets: mockLayout,
        version: '1.0',
      }));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await LayoutService.removeWidget('depth');

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const saveCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const savedData = JSON.parse(saveCall[1]);
      expect(savedData.widgets).toHaveLength(1);
      expect(savedData.widgets[0].id).toBe('speed');
    });
  });
});