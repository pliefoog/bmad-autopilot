import { WidgetRegistry } from '../src/widgets/WidgetRegistry';
import { WidgetMeta } from '../src/widgets/WidgetBase';
import React from 'react';

// Mock React component for testing
const MockWidget: React.FC<any> = () => null;

describe('WidgetRegistry', () => {
  const mockWidgetMeta: WidgetMeta = {
    id: 'test-widget',
    title: 'Test Widget',
    icon: 'test-icon',
    description: 'A test widget',
    category: 'navigation',
    defaultSize: { width: 160, height: 160 },
    configurable: true,
  };

  beforeEach(() => {
    // Clear registry before each test
    WidgetRegistry.clear();
  });

  describe('Widget Registration', () => {
    it('should register a widget successfully', () => {
      WidgetRegistry.register(mockWidgetMeta, MockWidget);
      
      expect(WidgetRegistry.isRegistered('test-widget')).toBe(true);
      expect(WidgetRegistry.getCount()).toBe(1);
    });

    it('should retrieve registered widget', () => {
      WidgetRegistry.register(mockWidgetMeta, MockWidget);
      
      const widget = WidgetRegistry.getWidget('test-widget');
      expect(widget).toBeDefined();
      expect(widget?.meta.id).toBe('test-widget');
      expect(widget?.component).toBe(MockWidget);
    });

    it('should return undefined for unregistered widget', () => {
      const widget = WidgetRegistry.getWidget('nonexistent');
      expect(widget).toBeUndefined();
    });
  });

  describe('Widget Metadata Management', () => {
    it('should return all widget metadata', () => {
      const widget1: WidgetMeta = { ...mockWidgetMeta, id: 'widget1', title: 'Widget 1' };
      const widget2: WidgetMeta = { ...mockWidgetMeta, id: 'widget2', title: 'Widget 2', category: 'engine' };

      WidgetRegistry.register(widget1, MockWidget);
      WidgetRegistry.register(widget2, MockWidget);

      const allWidgets = WidgetRegistry.getAllWidgets();
      expect(allWidgets).toHaveLength(2);
      expect(allWidgets.map(w => w.id)).toContain('widget1');
      expect(allWidgets.map(w => w.id)).toContain('widget2');
    });

    it('should filter widgets by category', () => {
      const navWidget: WidgetMeta = { ...mockWidgetMeta, id: 'nav-widget', category: 'navigation' };
      const engineWidget: WidgetMeta = { ...mockWidgetMeta, id: 'engine-widget', category: 'engine' };

      WidgetRegistry.register(navWidget, MockWidget);
      WidgetRegistry.register(engineWidget, MockWidget);

      const navWidgets = WidgetRegistry.getWidgetsByCategory('navigation');
      const engineWidgets = WidgetRegistry.getWidgetsByCategory('engine');

      expect(navWidgets).toHaveLength(1);
      expect(navWidgets[0].id).toBe('nav-widget');
      expect(engineWidgets).toHaveLength(1);
      expect(engineWidgets[0].id).toBe('engine-widget');
    });

    it('should return available categories', () => {
      const widget1: WidgetMeta = { ...mockWidgetMeta, id: 'widget1', category: 'navigation' };
      const widget2: WidgetMeta = { ...mockWidgetMeta, id: 'widget2', category: 'engine' };
      const widget3: WidgetMeta = { ...mockWidgetMeta, id: 'widget3', category: 'navigation' };

      WidgetRegistry.register(widget1, MockWidget);
      WidgetRegistry.register(widget2, MockWidget);
      WidgetRegistry.register(widget3, MockWidget);

      const categories = WidgetRegistry.getCategories();
      expect(categories).toHaveLength(2);
      expect(categories).toContain('navigation');
      expect(categories).toContain('engine');
    });
  });

  describe('Registry Management', () => {
    it('should unregister a widget', () => {
      WidgetRegistry.register(mockWidgetMeta, MockWidget);
      expect(WidgetRegistry.isRegistered('test-widget')).toBe(true);

      const success = WidgetRegistry.unregister('test-widget');
      expect(success).toBe(true);
      expect(WidgetRegistry.isRegistered('test-widget')).toBe(false);
    });

    it('should return false when unregistering nonexistent widget', () => {
      const success = WidgetRegistry.unregister('nonexistent');
      expect(success).toBe(false);
    });

    it('should clear all widgets', () => {
      WidgetRegistry.register(mockWidgetMeta, MockWidget);
      WidgetRegistry.register({ ...mockWidgetMeta, id: 'widget2' }, MockWidget);
      
      expect(WidgetRegistry.getCount()).toBe(2);
      
      WidgetRegistry.clear();
      expect(WidgetRegistry.getCount()).toBe(0);
      expect(WidgetRegistry.getAllWidgets()).toHaveLength(0);
    });

    it('should track widget count correctly', () => {
      expect(WidgetRegistry.getCount()).toBe(0);
      
      WidgetRegistry.register(mockWidgetMeta, MockWidget);
      expect(WidgetRegistry.getCount()).toBe(1);
      
      WidgetRegistry.register({ ...mockWidgetMeta, id: 'widget2' }, MockWidget);
      expect(WidgetRegistry.getCount()).toBe(2);
      
      WidgetRegistry.unregister('test-widget');
      expect(WidgetRegistry.getCount()).toBe(1);
    });
  });
});