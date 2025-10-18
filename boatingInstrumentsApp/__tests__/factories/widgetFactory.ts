/**
 * Widget Test Factory - Story 2.15 Test Improvements
 * Provides reusable test data creation functions for widget testing
 */

export interface TestWidgetOptions {
  type?: string;
  position?: { x: number; y: number };
  title?: string;
  isPinned?: boolean;
  isExpanded?: boolean;
  settings?: Record<string, any>;
}

export interface TestDashboardOptions {
  id?: string;
  name?: string;
  gridSize?: number;
  columns?: number;
  rows?: number;
}

/**
 * Creates test widget configuration with sensible defaults
 */
export const createTestWidget = (overrides: TestWidgetOptions = {}): TestWidgetOptions => ({
  type: 'depth',
  position: { x: 0, y: 0 },
  title: 'Test Widget',
  isPinned: false,
  isExpanded: false,
  settings: {},
  ...overrides
});

/**
 * Creates multiple test widgets with different types
 */
export const createTestWidgets = (count: number = 3): TestWidgetOptions[] => {
  const widgetTypes = ['depth', 'speed', 'wind', 'gps', 'compass', 'engine', 'battery', 'tanks', 'autopilot', 'weather'];
  
  return Array.from({ length: count }, (_, index) => createTestWidget({
    type: widgetTypes[index % widgetTypes.length],
    position: { x: index % 3, y: Math.floor(index / 3) },
    title: `${widgetTypes[index % widgetTypes.length].charAt(0).toUpperCase()}${widgetTypes[index % widgetTypes.length].slice(1)} Widget`
  }));
};

/**
 * Creates test widget with pin state variations
 */
export const createPinnedTestWidget = (overrides: TestWidgetOptions = {}): TestWidgetOptions => 
  createTestWidget({
    isPinned: true,
    isExpanded: true,
    ...overrides
  });

export const createUnpinnedTestWidget = (overrides: TestWidgetOptions = {}): TestWidgetOptions => 
  createTestWidget({
    isPinned: false,
    isExpanded: false,
    ...overrides
  });

/**
 * Creates mixed pinned/unpinned widgets for testing state persistence
 */
export const createMixedStateWidgets = (): TestWidgetOptions[] => [
  createPinnedTestWidget({ type: 'depth', position: { x: 0, y: 0 } }),
  createUnpinnedTestWidget({ type: 'speed', position: { x: 2, y: 0 } }),
  createPinnedTestWidget({ type: 'wind', position: { x: 4, y: 0 } }),
  createUnpinnedTestWidget({ type: 'gps', position: { x: 0, y: 2 } })
];

/**
 * Creates test dashboard configuration
 */
export const createTestDashboard = (overrides: TestDashboardOptions = {}): TestDashboardOptions => ({
  id: 'test-dashboard',
  name: 'Test Dashboard',
  gridSize: 10,
  columns: 6,
  rows: 8,
  ...overrides
});

/**
 * Common widget types for testing
 */
export const WIDGET_TYPES = {
  NAVIGATION: ['depth', 'speed', 'gps', 'compass'],
  ENVIRONMENTAL: ['wind', 'weather'],
  SYSTEMS: ['engine', 'battery', 'tanks'],
  AUTOPILOT: ['autopilot'],
  ALL: ['depth', 'speed', 'wind', 'gps', 'compass', 'engine', 'battery', 'tanks', 'autopilot', 'weather', 'navigation']
} as const;

/**
 * Performance testing helper - creates many widgets for scale testing
 */
export const createPerformanceTestWidgets = (count: number = 10): TestWidgetOptions[] => {
  return Array.from({ length: count }, (_, index) => createTestWidget({
    type: WIDGET_TYPES.ALL[index % WIDGET_TYPES.ALL.length],
    position: { x: index % 3, y: Math.floor(index / 3) },
    isPinned: index % 2 === 0, // Pin every other widget
  }));
};

/**
 * Creates widgets for specific test scenarios
 */
export const TEST_SCENARIOS = {
  /**
   * Widgets for testing pin functionality (AC 1-5)
   */
  pinFunctionality: () => [
    createTestWidget({ type: 'depth' }),
    createTestWidget({ type: 'speed' }),
    createTestWidget({ type: 'wind' })
  ],

  /**
   * Widgets for testing state persistence (AC 6-9)
   */
  statePersistence: () => createMixedStateWidgets(),

  /**
   * Widgets for testing performance requirements (AC 14-16)
   */
  performance: () => createPerformanceTestWidgets(10),

  /**
   * Widgets for testing integration (AC 10-13)
   */
  integration: () => [
    createTestWidget({ type: 'battery', settings: { testSetting: 'initial' } }),
    createPinnedTestWidget({ type: 'tanks' })
  ]
};