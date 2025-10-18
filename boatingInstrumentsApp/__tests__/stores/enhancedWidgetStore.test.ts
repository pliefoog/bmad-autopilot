import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWidgetStore } from '../../src/stores/widgetStore';
import { createTestWidget, createMixedStateWidgets, createPerformanceTestWidgets, TEST_SCENARIOS } from '../factories/widgetFactory';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock instance detection service
jest.mock('../../src/services/nmea/instanceDetection', () => ({
  instanceDetectionService: {
    detectInstances: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

describe('Enhanced Widget State Management (Story 2.15)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset zustand store
    useWidgetStore.setState({
      widgetExpanded: {},
      dashboards: [{
        id: 'default',
        name: 'Main Dashboard',
        widgets: [],
        gridSize: 10,
        snapToGrid: true,
        columns: 6,
        rows: 8,
      }],
      currentDashboard: 'default',
    });
  });

  describe('2.15-UNIT-001: Pin Functionality (AC 1-5)', () => {
    it('2.15-UNIT-001a: should pin widget and set expanded state (AC 1,4)', () => {
      // Given: A widget store with a depth widget
      const { result } = renderHook(() => useWidgetStore());
      const testWidget = createTestWidget({ type: 'depth', position: { x: 0, y: 0 } });
      act(() => {
        result.current.addWidget(testWidget.type!, testWidget.position);
      });

      const widget = result.current.dashboards[0].widgets[0];
      const widgetId = widget.id;

      // When: The widget is pinned
      act(() => {
        result.current.pinWidget(widgetId);
      });

      // Then: The widget should be pinned and expanded
      expect(result.current.isWidgetPinned(widgetId)).toBe(true);
      expect(result.current.widgetExpanded[widgetId]).toBe(true);

      // And: Widget config should be updated with pin state and timestamp
      const updatedWidget = result.current.dashboards[0].widgets.find(w => w.id === widgetId);
      expect(updatedWidget?.isPinned).toBe(true);
      expect(updatedWidget?.lastInteraction).toBeGreaterThan(0);
    });

    it('2.15-UNIT-001b: should unpin widget and maintain state (AC 1,5)', () => {
      const { result } = renderHook(() => useWidgetStore());

      // Add and pin a widget
      const testWidget = createTestWidget({ type: 'speed', position: { x: 0, y: 0 } });
      act(() => {
        result.current.addWidget(testWidget.type!, testWidget.position);
      });

      const widgetId = result.current.dashboards[0].widgets[0].id;

      act(() => {
        result.current.pinWidget(widgetId);
        result.current.unpinWidget(widgetId);
      });

      // Check unpin state
      expect(result.current.isWidgetPinned(widgetId)).toBe(false);

      const updatedWidget = result.current.dashboards[0].widgets.find(w => w.id === widgetId);
      expect(updatedWidget?.isPinned).toBe(false);
    });

    it('2.15-UNIT-001c: should toggle pin state correctly (AC 1,2)', () => {
      const { result } = renderHook(() => useWidgetStore());

      // Add a widget
      act(() => {
        result.current.addWidget('wind', { x: 0, y: 0 });
      });

      const widgetId = result.current.dashboards[0].widgets[0].id;

      // Toggle pin on (should pin)
      act(() => {
        result.current.toggleWidgetPin(widgetId);
      });

      expect(result.current.isWidgetPinned(widgetId)).toBe(true);

      // Toggle pin off (should unpin)
      act(() => {
        result.current.toggleWidgetPin(widgetId);
      });

      expect(result.current.isWidgetPinned(widgetId)).toBe(false);
    });
  });

  describe('2.15-UNIT-002: State Persistence (AC 6-9)', () => {
    it('2.15-UNIT-002a: should initialize pinned widgets as expanded on app start (AC 4,5,8)', () => {
      const { result } = renderHook(() => useWidgetStore());

      // Setup widgets with different pin states
      act(() => {
        result.current.addWidget('depth', { x: 0, y: 0 });
        result.current.addWidget('speed', { x: 2, y: 0 });
      });

      const [widget1, widget2] = result.current.dashboards[0].widgets;

      // Pin first widget, leave second unpinned
      act(() => {
        result.current.updateWidget(widget1.id, { isPinned: true });
        result.current.updateWidget(widget2.id, { isPinned: false });
      });

      // Initialize states (simulating app start)
      act(() => {
        result.current.initializeWidgetStatesOnAppStart();
      });

      // Check states
      expect(result.current.widgetExpanded[widget1.id]).toBe(true); // Pinned → expanded
      expect(result.current.widgetExpanded[widget2.id]).toBe(false); // Unpinned → collapsed
    });

    it('2.15-UNIT-002b: should handle widgets without pin state - backward compatibility (AC 6,9)', () => {
      const { result } = renderHook(() => useWidgetStore());

      // Add widget without pin state (simulating old data)
      act(() => {
        result.current.addWidget('compass', { x: 0, y: 0 });
      });

      const widgetId = result.current.dashboards[0].widgets[0].id;

      // Initialize states
      act(() => {
        result.current.initializeWidgetStatesOnAppStart();
      });

      // Should default to unpinned/collapsed
      expect(result.current.isWidgetPinned(widgetId)).toBe(false);
      expect(result.current.widgetExpanded[widgetId]).toBe(false);
    });
  });

  describe('2.15-UNIT-003: Widget Interaction Tracking', () => {
    it('2.15-UNIT-003a: should update last interaction timestamp (AC 7)', () => {
      const { result } = renderHook(() => useWidgetStore());

      // Add a widget
      act(() => {
        result.current.addWidget('gps', { x: 0, y: 0 });
      });

      const widgetId = result.current.dashboards[0].widgets[0].id;
      const beforeTime = Date.now();

      // Update interaction
      act(() => {
        result.current.updateWidgetInteraction(widgetId);
      });

      const widget = result.current.dashboards[0].widgets.find(w => w.id === widgetId);
      expect(widget?.lastInteraction).toBeGreaterThanOrEqual(beforeTime);
    });
  });

  describe('2.15-UNIT-004: Performance Requirements (AC 14-16)', () => {
    it('2.15-UNIT-004a: should handle pin state changes quickly <50ms (AC 14)', () => {
      const { result } = renderHook(() => useWidgetStore());

      // Add a widget
      act(() => {
        result.current.addWidget('engine', { x: 0, y: 0 });
      });

      const widgetId = result.current.dashboards[0].widgets[0].id;

      // Measure pin operation time
      const startTime = performance.now();
      
      act(() => {
        result.current.pinWidget(widgetId);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in under 50ms (AC 14) - CI-friendly thresholds
      const PERFORMANCE_THRESHOLD = process.env.CI ? 200 : 50; // More lenient in CI
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
    });

    it('2.15-UNIT-004b: should initialize multiple widgets efficiently (AC 15,16)', () => {
      const { result } = renderHook(() => useWidgetStore());

      // Add multiple widgets using factory
      const testWidgets = createPerformanceTestWidgets(10);
      
      act(() => {
        testWidgets.forEach((widget) => {
          result.current.addWidget(widget.type!, widget.position);
        });
      });

      // Pin some widgets
      const widgets = result.current.dashboards[0].widgets;
      act(() => {
        testWidgets.forEach((testWidget, index) => {
          if (testWidget.isPinned) {
            result.current.updateWidget(widgets[index].id, { isPinned: true });
          }
        });
      });

      // Measure initialization time
      const startTime = performance.now();
      
      act(() => {
        result.current.initializeWidgetStatesOnAppStart();
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle 10+ widgets efficiently (AC 15) - CI-friendly thresholds
      const INITIALIZATION_THRESHOLD = process.env.CI ? 300 : 100; // More lenient in CI
      expect(duration).toBeLessThan(INITIALIZATION_THRESHOLD);
      expect(widgets.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('2.15-UNIT-005: Integration with Existing Functionality (AC 10-13)', () => {
    it('2.15-UNIT-005a: should maintain compatibility with expand/collapse functionality (AC 10,12)', () => {
      const { result } = renderHook(() => useWidgetStore());

      // Add a widget
      act(() => {
        result.current.addWidget('battery', { x: 0, y: 0 });
      });

      const widgetId = result.current.dashboards[0].widgets[0].id;

      // Test existing toggle functionality
      act(() => {
        result.current.toggleWidgetExpanded(widgetId);
      });

      expect(result.current.widgetExpanded[widgetId]).toBe(true);

      // Test existing set functionality
      act(() => {
        result.current.setWidgetExpanded(widgetId, false);
      });

      expect(result.current.widgetExpanded[widgetId]).toBe(false);
    });

    it('2.15-UNIT-005b: should work with widget updates and removals (AC 11,13)', () => {
      const { result } = renderHook(() => useWidgetStore());

      // Add and pin a widget
      act(() => {
        result.current.addWidget('tanks', { x: 0, y: 0 });
      });

      const widgetId = result.current.dashboards[0].widgets[0].id;

      act(() => {
        result.current.pinWidget(widgetId);
      });

      // Update widget settings
      act(() => {
        result.current.updateWidgetSettings(widgetId, { testSetting: 'value' });
      });

      const widget = result.current.dashboards[0].widgets.find(w => w.id === widgetId);
      expect(widget?.isPinned).toBe(true); // Pin state should persist
      expect(widget?.settings.testSetting).toBe('value');

      // Remove widget
      act(() => {
        result.current.removeWidget(widgetId);
      });

      expect(result.current.dashboards[0].widgets).toHaveLength(0);
      expect(result.current.widgetExpanded[widgetId]).toBeUndefined();
    });
  });

  describe('2.15-UNIT-006: Error Handling and Edge Cases', () => {
    it('2.15-UNIT-006a: should handle invalid widget IDs gracefully (AC 11)', () => {
      const { result } = renderHook(() => useWidgetStore());

      // Try to pin non-existent widget
      expect(() => {
        act(() => {
          result.current.pinWidget('non-existent-id');
        });
      }).not.toThrow();

      expect(result.current.isWidgetPinned('non-existent-id')).toBe(false);
    });

    it('2.15-UNIT-006b: should handle missing dashboard gracefully (AC 11)', () => {
      const { result } = renderHook(() => useWidgetStore());

      // Set invalid dashboard
      act(() => {
        useWidgetStore.setState({ currentDashboard: 'invalid-dashboard' });
      });

      expect(() => {
        act(() => {
          result.current.initializeWidgetStatesOnAppStart();
        });
      }).not.toThrow();
    });
  });
});