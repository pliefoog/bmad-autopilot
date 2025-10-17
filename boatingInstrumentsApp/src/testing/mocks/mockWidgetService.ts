// Mock Widget Service for Testing
// Provides controlled widget state management for testing

import { ReactNode } from 'react';
import type { 
  WidgetConfig, 
  WidgetMeta, 
  WidgetState,
  WidgetLayout,
  WidgetType 
} from '../../types';

export interface WidgetMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  errorCount: number;
  lastErrorTime: number;
  memoryUsage: number;
  isVisible: boolean;
  dataFreshness: number;
}

export interface MockWidgetServiceOptions {
  initialWidgets?: WidgetConfig[];
  enableMetricsTracking?: boolean;
  simulatePerformanceIssues?: boolean;
}

export class MockWidgetService {
  private widgets: Map<string, WidgetConfig> = new Map();
  private metrics: Map<string, WidgetMetrics> = new Map();
  private state: WidgetState = 'loading';
  private listeners: ((widgets: WidgetConfig[]) => void)[] = [];
  private metricsListeners: ((metrics: Map<string, WidgetMetrics>) => void)[] = [];
  
  constructor(options: MockWidgetServiceOptions = {}) {
    const {
      initialWidgets = [],
      enableMetricsTracking = true,
    } = options;
    
    // Initialize with provided widgets
    initialWidgets.forEach(widget => {
      this.widgets.set(widget.id, widget);
      
      if (enableMetricsTracking) {
        this.metrics.set(widget.id, {
          renderCount: 0,
          lastRenderTime: 0,
          averageRenderTime: 0,
          errorCount: 0,
          lastErrorTime: 0,
          memoryUsage: 0,
          isVisible: true,
          dataFreshness: Date.now(),
        });
      }
    });
    
    this.state = 'normal';
  }

  // Widget management
  addWidget(widget: WidgetConfig): void {
    this.widgets.set(widget.id, widget);
    
    // Initialize metrics
    this.metrics.set(widget.id, {
      renderCount: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
      errorCount: 0,
      lastErrorTime: 0,
      memoryUsage: 0,
      isVisible: true,
      dataFreshness: Date.now(),
    });
    
    this.notifyWidgetListeners();
  }

  removeWidget(widgetId: string): boolean {
    const removed = this.widgets.delete(widgetId);
    this.metrics.delete(widgetId);
    
    if (removed) {
      this.notifyWidgetListeners();
    }
    
    return removed;
  }

  updateWidget(widgetId: string, updates: Partial<WidgetConfig>): boolean {
    const widget = this.widgets.get(widgetId);
    if (!widget) return false;
    
    const updatedWidget = { ...widget, ...updates };
    this.widgets.set(widgetId, updatedWidget);
    
    this.notifyWidgetListeners();
    return true;
  }

  getWidget(widgetId: string): WidgetConfig | null {
    return this.widgets.get(widgetId) || null;
  }

  getAllWidgets(): WidgetConfig[] {
    return Array.from(this.widgets.values());
  }

  getWidgetsByType(type: WidgetType): WidgetConfig[] {
    return Array.from(this.widgets.values()).filter(w => w.type === type);
  }

  // Metrics tracking
  recordRender(widgetId: string, renderTime: number = 16): void {
    const metrics = this.metrics.get(widgetId);
    if (!metrics) return;
    
    metrics.renderCount++;
    metrics.lastRenderTime = renderTime;
    metrics.averageRenderTime = 
      (metrics.averageRenderTime * (metrics.renderCount - 1) + renderTime) / metrics.renderCount;
    
    this.metrics.set(widgetId, metrics);
    this.notifyMetricsListeners();
  }

  recordError(widgetId: string, error: Error): void {
    const metrics = this.metrics.get(widgetId);
    if (!metrics) return;
    
    metrics.errorCount++;
    metrics.lastErrorTime = Date.now();
    
    this.metrics.set(widgetId, metrics);
    this.notifyMetricsListeners();
  }

  updateVisibility(widgetId: string, isVisible: boolean): void {
    const metrics = this.metrics.get(widgetId);
    if (!metrics) return;
    
    metrics.isVisible = isVisible;
    this.metrics.set(widgetId, metrics);
    this.notifyMetricsListeners();
  }

  getMetrics(widgetId: string): WidgetMetrics | null {
    return this.metrics.get(widgetId) || null;
  }

  getAllMetrics(): Map<string, WidgetMetrics> {
    return new Map(this.metrics);
  }

  // State management
  setState(state: WidgetState): void {
    this.state = state;
  }

  getState(): WidgetState {
    return this.state;
  }

  // Event listeners
  onWidgetsChange(callback: (widgets: WidgetConfig[]) => void): () => void {
    this.listeners.push(callback);
    
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  onMetricsChange(callback: (metrics: Map<string, WidgetMetrics>) => void): () => void {
    this.metricsListeners.push(callback);
    
    return () => {
      const index = this.metricsListeners.indexOf(callback);
      if (index > -1) {
        this.metricsListeners.splice(index, 1);
      }
    };
  }

  // Test utilities
  simulateSlowRender(widgetId: string, duration = 100): void {
    setTimeout(() => {
      this.recordRender(widgetId, duration);
    }, duration);
  }

  simulateError(widgetId: string, errorMessage = 'Mock error'): void {
    this.recordError(widgetId, new Error(errorMessage));
  }

  simulateLayoutChange(newLayout: Partial<WidgetLayout>): void {
    // Update all widgets with new layout
    Array.from(this.widgets.values()).forEach(widget => {
      this.updateWidget(widget.id, {
        layout: {
          ...widget.layout,
          ...newLayout,
        },
      });
    });
  }

  // Bulk operations for testing
  addMultipleWidgets(widgets: WidgetConfig[]): void {
    widgets.forEach(widget => {
      this.widgets.set(widget.id, widget);
      this.metrics.set(widget.id, {
        renderCount: 0,
        lastRenderTime: 0,
        averageRenderTime: 0,
        errorCount: 0,
        lastErrorTime: 0,
        memoryUsage: 0,
        isVisible: true,
        dataFreshness: Date.now(),
      });
    });
    
    this.notifyWidgetListeners();
  }

  clearAllWidgets(): void {
    this.widgets.clear();
    this.metrics.clear();
    this.notifyWidgetListeners();
    this.notifyMetricsListeners();
  }

  // Private helpers
  private notifyWidgetListeners(): void {
    const widgets = this.getAllWidgets();
    this.listeners.forEach(callback => callback(widgets));
  }

  private notifyMetricsListeners(): void {
    this.metricsListeners.forEach(callback => callback(this.metrics));
  }

  // Cleanup
  destroy(): void {
    this.widgets.clear();
    this.metrics.clear();
    this.listeners = [];
    this.metricsListeners = [];
  }
}

// Factory functions for common test scenarios
export function createMockWidgetService(options?: MockWidgetServiceOptions): MockWidgetService {
  return new MockWidgetService(options);
}

// Pre-configured mock services
export const mockWidgetServices = {
  // Empty service
  empty: () => createMockWidgetService(),
  
  // Service with basic navigation widgets
  navigation: () => createMockWidgetService({
    initialWidgets: [
      {
        id: 'speed-widget',
        type: 'speed',
        title: 'Speed',
        enabled: true,
        settings: { units: 'knots', precision: 1 },
        layout: {
          id: 'speed-widget',
          type: 'speed',
          position: { x: 0, y: 0 },
          dimensions: { width: 2, height: 2 },
          visible: true,
        },
      },
      {
        id: 'compass-widget',
        type: 'compass',
        title: 'Compass',
        enabled: true,
        settings: { showLabels: true },
        layout: {
          id: 'compass-widget',
          type: 'compass',
          position: { x: 2, y: 0 },
          dimensions: { width: 2, height: 2 },
          visible: true,
        },
      },
      {
        id: 'gps-widget',
        type: 'gps',
        title: 'GPS',
        enabled: true,
        settings: { format: 'decimal', precision: 4 },
        layout: {
          id: 'gps-widget',
          type: 'gps',
          position: { x: 0, y: 2 },
          dimensions: { width: 4, height: 2 },
          visible: true,
        },
      },
    ],
  }),
  
  // Service with engine monitoring widgets
  engine: () => createMockWidgetService({
    initialWidgets: [
      {
        id: 'engine-rpm-widget',
        type: 'engine',
        title: 'Engine RPM',
        layout: { x: 0, y: 0, width: 2, height: 2 },
        config: { metric: 'rpm', maxValue: 4000 },
        isVisible: true,
        priority: 1,
      },
      {
        id: 'engine-temp-widget',
        type: 'engine',
        title: 'Engine Temp',
        layout: { x: 2, y: 0, width: 2, height: 2 },
        config: { metric: 'temperature', units: 'celsius' },
        isVisible: true,
        priority: 2,
      },
      {
        id: 'fuel-widget',
        type: 'fuel',
        title: 'Fuel Level',
        layout: { x: 0, y: 2, width: 2, height: 2 },
        config: { showPercentage: true },
        isVisible: true,
        priority: 3,
      },
    ],
  }),
  
  // Service with performance issues
  slow: () => {
    const service = createMockWidgetService({
      simulatePerformanceIssues: true,
      initialWidgets: [
        {
          id: 'slow-widget',
          type: 'custom',
          title: 'Slow Widget',
          layout: { x: 0, y: 0, width: 2, height: 2 },
          config: {},
          isVisible: true,
          priority: 1,
        },
      ],
    });
    
    // Simulate slow renders
    setTimeout(() => {
      service.simulateSlowRender('slow-widget', 100);
    }, 100);
    
    return service;
  },
  
  // Service with errors
  error: () => {
    const service = createMockWidgetService({
      initialWidgets: [
        {
          id: 'error-widget',
          type: 'custom',
          title: 'Error Widget',
          layout: { x: 0, y: 0, width: 2, height: 2 },
          config: {},
          isVisible: true,
          priority: 1,
        },
      ],
    });
    
    // Simulate errors
    setTimeout(() => {
      service.simulateError('error-widget', 'Mock widget error');
    }, 50);
    
    return service;
  },
};