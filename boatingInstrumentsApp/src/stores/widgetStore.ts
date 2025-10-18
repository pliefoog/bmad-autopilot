import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { instanceDetectionService, type DetectedInstance } from '../services/nmea/instanceDetection';

export interface WidgetLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  locked?: boolean;
  visible?: boolean;
}

export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  settings: Record<string, any>;
  layout: WidgetLayout;
  enabled: boolean;
  order: number;
  // Enhanced state management (Story 2.15)
  isPinned?: boolean;
  isExpanded?: boolean;
  lastInteraction?: number;
  autoCollapseTimeout?: number;
}

export interface DashboardConfig {
  id: string;
  name: string;
  widgets: WidgetConfig[];
  gridSize: number;
  snapToGrid: boolean;
  columns: number;
  rows: number;
  backgroundColor?: string;
}

export interface WidgetPreset {
  id: string;
  name: string;
  description: string;
  widgets: Omit<WidgetConfig, 'id'>[];
  category: 'sailing' | 'motoring' | 'fishing' | 'racing' | 'custom';
}

interface WidgetState {
  availableWidgets: string[];
  selectedWidgets: string[];
  currentDashboard: string;
  dashboards: DashboardConfig[];
  presets: WidgetPreset[];
  editMode: boolean;
  gridVisible: boolean;
  widgetExpanded: Record<string, boolean>;
}

interface WidgetActions {
  addWidget: (widgetType: string, position?: { x: number; y: number }) => void;
  removeWidget: (widgetId: string) => void;
  updateWidget: (widgetId: string, updates: Partial<WidgetConfig>) => void;
  updateWidgetLayout: (widgetId: string, layout: Partial<WidgetLayout>) => void;
  updateWidgetSettings: (widgetId: string, settings: Record<string, any>) => void;
  setSelectedWidgets: (widgets: string[]) => void;
  toggleWidget: (widgetType: string) => void;
  reorderWidgets: (widgets: WidgetConfig[]) => void;
  setEditMode: (enabled: boolean) => void;
  setGridVisible: (visible: boolean) => void;
  createDashboard: (name: string, preset?: string) => void;
  deleteDashboard: (dashboardId: string) => void;
  switchDashboard: (dashboardId: string) => void;
  updateDashboard: (dashboardId: string, updates: Partial<DashboardConfig>) => void;
  exportDashboard: (dashboardId: string) => DashboardConfig;
  importDashboard: (dashboard: DashboardConfig) => void;
  toggleWidgetExpanded: (widgetId: string) => void;
  setWidgetExpanded: (widgetId: string, expanded: boolean) => void;
  // Enhanced state management actions (Story 2.15)
  pinWidget: (widgetId: string) => void;
  unpinWidget: (widgetId: string) => void;
  toggleWidgetPin: (widgetId: string) => void;
  isWidgetPinned: (widgetId: string) => boolean;
  initializeWidgetStatesOnAppStart: () => void;
  updateWidgetInteraction: (widgetId: string) => void;
  resetLayout: () => void;
  applyPreset: (presetId: string) => void;
  // Instance widget management methods
  createInstanceWidget: (instanceId: string, instanceType: 'engine' | 'battery' | 'tank', title: string, position?: { x: number; y: number }) => void;
  removeInstanceWidget: (instanceId: string) => void;
  updateInstanceWidgets: (detectedInstances: { engines: DetectedInstance[]; batteries: DetectedInstance[]; tanks: DetectedInstance[] }) => void;
  startInstanceMonitoring: () => void;
  stopInstanceMonitoring: () => void;
  // Runtime management methods
  cleanupOrphanedWidgets: () => void;
  getInstanceWidgetMetrics: () => { totalInstanceWidgets: number; orphanedWidgets: number; lastCleanupTime: number };
  forceInstanceCleanup: () => void;
}

type WidgetStore = WidgetState & WidgetActions;

const defaultDashboard: DashboardConfig = {
  id: 'default',
  name: 'Main Dashboard',
  widgets: [],
  gridSize: 10,
  snapToGrid: true,
  columns: 6,
  rows: 8,
};

const defaultPresets: WidgetPreset[] = [
  {
    id: 'sailing-basic',
    name: 'Basic Sailing',
    description: 'Essential widgets for sailing',
    category: 'sailing',
    widgets: [
      {
        type: 'wind',
        title: 'Wind',
        settings: {},
        layout: { id: '', x: 0, y: 0, width: 2, height: 2 },
        enabled: true,
        order: 0,
      },
      {
        type: 'depth',
        title: 'Depth',
        settings: {},
        layout: { id: '', x: 2, y: 0, width: 2, height: 2 },
        enabled: true,
        order: 1,
      },
      {
        type: 'speed',
        title: 'Speed',
        settings: {},
        layout: { id: '', x: 4, y: 0, width: 2, height: 2 },
        enabled: true,
        order: 2,
      },
      {
        type: 'compass',
        title: 'Compass',
        settings: {},
        layout: { id: '', x: 0, y: 2, width: 3, height: 3 },
        enabled: true,
        order: 3,
      },
      {
        type: 'gps',
        title: 'GPS',
        settings: {},
        layout: { id: '', x: 3, y: 2, width: 3, height: 3 },
        enabled: true,
        order: 4,
      },
    ],
  },
  {
    id: 'motoring-full',
    name: 'Full Motoring',
    description: 'Complete setup for power boating',
    category: 'motoring',
    widgets: [
      {
        type: 'engine',
        title: 'Engine',
        settings: {},
        layout: { id: '', x: 0, y: 0, width: 3, height: 3 },
        enabled: true,
        order: 0,
      },
      {
        type: 'tanks',
        title: 'Tanks',
        settings: {},
        layout: { id: '', x: 3, y: 0, width: 3, height: 3 },
        enabled: true,
        order: 1,
      },
      {
        type: 'speed',
        title: 'Speed',
        settings: {},
        layout: { id: '', x: 0, y: 3, width: 2, height: 2 },
        enabled: true,
        order: 2,
      },
      {
        type: 'depth',
        title: 'Depth',
        settings: {},
        layout: { id: '', x: 2, y: 3, width: 2, height: 2 },
        enabled: true,
        order: 3,
      },
      {
        type: 'battery',
        title: 'Battery',
        settings: {},
        layout: { id: '', x: 4, y: 3, width: 2, height: 2 },
        enabled: true,
        order: 4,
      },
    ],
  },
];

export const useWidgetStore = create<WidgetStore>()(
  persist(
    (set, get) => ({
      // State
      availableWidgets: [
        'depth', 'speed', 'wind', 'gps', 'compass', 'engine', 
        'battery', 'tanks', 'autopilot', 'weather', 'navigation'
      ],
      selectedWidgets: ['depth', 'speed', 'wind', 'gps', 'compass'],
      currentDashboard: 'default',
      dashboards: [defaultDashboard],
      presets: defaultPresets,
      editMode: false,
      gridVisible: false,
      widgetExpanded: {},

      // Actions
      addWidget: (widgetType, position = { x: 0, y: 0 }) => {
        const widget: WidgetConfig = {
          id: `${widgetType}-${Date.now()}`,
          type: widgetType,
          title: widgetType.charAt(0).toUpperCase() + widgetType.slice(1),
          settings: {},
          layout: {
            id: `${widgetType}-${Date.now()}`,
            x: position.x,
            y: position.y,
            width: 2,
            height: 2,
            visible: true,
          },
          enabled: true,
          order: get().selectedWidgets.length,
        };

        set((state) => ({
          dashboards: state.dashboards.map((dashboard) =>
            dashboard.id === state.currentDashboard
              ? { ...dashboard, widgets: [...dashboard.widgets, widget] }
              : dashboard
          ),
          selectedWidgets: [...state.selectedWidgets, widgetType],
        }));
      },

      removeWidget: (widgetId) =>
        set((state) => {
          const newWidgetExpanded = { ...state.widgetExpanded };
          delete newWidgetExpanded[widgetId];
          
          return {
            dashboards: state.dashboards.map((dashboard) =>
              dashboard.id === state.currentDashboard
                ? {
                    ...dashboard,
                    widgets: dashboard.widgets.filter((w) => w.id !== widgetId),
                  }
                : dashboard
            ),
            widgetExpanded: newWidgetExpanded,
          };
        }),

      updateWidget: (widgetId, updates) =>
        set((state) => ({
          dashboards: state.dashboards.map((dashboard) =>
            dashboard.id === state.currentDashboard
              ? {
                  ...dashboard,
                  widgets: dashboard.widgets.map((w) =>
                    w.id === widgetId ? { ...w, ...updates } : w
                  ),
                }
              : dashboard
          ),
        })),

      updateWidgetLayout: (widgetId, layout) => {
        const state = get();
        const dashboard = state.dashboards.find(d => d.id === state.currentDashboard);
        const widget = dashboard?.widgets.find(w => w.id === widgetId);
        if (widget?.layout) {
          get().updateWidget(widgetId, { 
            layout: { ...widget.layout, ...layout } 
          });
        }
      },

      updateWidgetSettings: (widgetId, settings) =>
        get().updateWidget(widgetId, { settings }),

      setSelectedWidgets: (widgets) =>
        set({ selectedWidgets: widgets }),

      toggleWidget: (widgetType) =>
        set((state) => ({
          selectedWidgets: state.selectedWidgets.includes(widgetType)
            ? state.selectedWidgets.filter((w) => w !== widgetType)
            : [...state.selectedWidgets, widgetType],
        })),

      reorderWidgets: (widgets) =>
        set((state) => ({
          dashboards: state.dashboards.map((dashboard) =>
            dashboard.id === state.currentDashboard
              ? { ...dashboard, widgets }
              : dashboard
          ),
        })),

      setEditMode: (enabled) =>
        set({ editMode: enabled }),

      setGridVisible: (visible) =>
        set({ gridVisible: visible }),

      createDashboard: (name, presetId) => {
        const dashboard: DashboardConfig = {
          id: `dashboard-${Date.now()}`,
          name,
          widgets: [],
          gridSize: 10,
          snapToGrid: true,
          columns: 6,
          rows: 8,
        };

        if (presetId) {
          const preset = get().presets.find((p) => p.id === presetId);
          if (preset) {
            dashboard.widgets = preset.widgets.map((w, index) => ({
              ...w,
              id: `${w.type}-${Date.now()}-${index}`,
              layout: { ...w.layout, id: `${w.type}-${Date.now()}-${index}` },
            }));
          }
        }

        set((state) => ({
          dashboards: [...state.dashboards, dashboard],
          currentDashboard: dashboard.id,
        }));
      },

      deleteDashboard: (dashboardId) => {
        if (dashboardId === 'default') return; // Protect default dashboard
        
        set((state) => {
          const remaining = state.dashboards.filter((d) => d.id !== dashboardId);
          return {
            dashboards: remaining,
            currentDashboard: state.currentDashboard === dashboardId 
              ? remaining[0]?.id || 'default' 
              : state.currentDashboard,
          };
        });
      },

      switchDashboard: (dashboardId) =>
        set({ currentDashboard: dashboardId }),

      updateDashboard: (dashboardId, updates) =>
        set((state) => ({
          dashboards: state.dashboards.map((dashboard) =>
            dashboard.id === dashboardId ? { ...dashboard, ...updates } : dashboard
          ),
        })),

      exportDashboard: (dashboardId) => {
        const dashboard = get().dashboards.find((d) => d.id === dashboardId);
        if (!dashboard) throw new Error('Dashboard not found');
        return dashboard;
      },

      importDashboard: (dashboard) => {
        const newDashboard = {
          ...dashboard,
          id: `imported-${Date.now()}`,
        };
        
        set((state) => ({
          dashboards: [...state.dashboards, newDashboard],
        }));
      },

      toggleWidgetExpanded: (widgetId) =>
        set((state) => ({
          widgetExpanded: {
            ...state.widgetExpanded,
            [widgetId]: !state.widgetExpanded[widgetId],
          },
        })),

      setWidgetExpanded: (widgetId, expanded) =>
        set((state) => ({
          widgetExpanded: {
            ...state.widgetExpanded,
            [widgetId]: expanded,
          },
        })),

      // Enhanced state management implementations (Story 2.15)
      pinWidget: (widgetId) => {
        get().updateWidget(widgetId, { 
          isPinned: true, 
          lastInteraction: Date.now() 
        });
        // Update expanded state tracking
        get().setWidgetExpanded(widgetId, true);
      },

      unpinWidget: (widgetId) => {
        get().updateWidget(widgetId, { 
          isPinned: false, 
          lastInteraction: Date.now() 
        });
      },

      toggleWidgetPin: (widgetId) => {
        const state = get();
        const dashboard = state.dashboards.find(d => d.id === state.currentDashboard);
        const widget = dashboard?.widgets.find(w => w.id === widgetId);
        
        if (widget?.isPinned) {
          get().unpinWidget(widgetId);
        } else {
          get().pinWidget(widgetId);
        }
      },

      isWidgetPinned: (widgetId) => {
        const state = get();
        const dashboard = state.dashboards.find(d => d.id === state.currentDashboard);
        const widget = dashboard?.widgets.find(w => w.id === widgetId);
        return widget?.isPinned || false;
      },

      initializeWidgetStatesOnAppStart: () => {
        const state = get();
        const dashboard = state.dashboards.find(d => d.id === state.currentDashboard);
        
        dashboard?.widgets.forEach(widget => {
          if (widget.isPinned) {
            // Pinned widgets start expanded
            get().setWidgetExpanded(widget.id, true);
          } else {
            // Unpinned widgets start collapsed
            get().setWidgetExpanded(widget.id, false);
          }
        });
      },

      updateWidgetInteraction: (widgetId) => {
        get().updateWidget(widgetId, { 
          lastInteraction: Date.now() 
        });
      },

      resetLayout: () => {
        const currentDashboard = get().dashboards.find(
          (d) => d.id === get().currentDashboard
        );
        if (!currentDashboard) return;

        const resetWidgets = currentDashboard.widgets.map((widget, index) => ({
          ...widget,
          layout: {
            ...widget.layout,
            x: (index % 3) * 2,
            y: Math.floor(index / 3) * 2,
            width: 2,
            height: 2,
          },
        }));

        get().updateDashboard(get().currentDashboard, { widgets: resetWidgets });
      },

      applyPreset: (presetId) => {
        const preset = get().presets.find((p) => p.id === presetId);
        if (!preset) return;

        const widgets = preset.widgets.map((w, index) => ({
          ...w,
          id: `${w.type}-${Date.now()}-${index}`,
          layout: { ...w.layout, id: `${w.type}-${Date.now()}-${index}` },
        }));

        get().updateDashboard(get().currentDashboard, { widgets });
        set({ selectedWidgets: widgets.map((w) => w.type) });
      },

      // Instance widget management methods
      createInstanceWidget: (instanceId, instanceType, title, position) => {
        const widgetId = `${instanceType}-${instanceId}`;
        
        // Check if widget already exists
        const currentDashboard = get().dashboards.find(d => d.id === get().currentDashboard);
        if (!currentDashboard) return;

        const existingWidget = currentDashboard.widgets.find(w => w.id === widgetId);
        if (existingWidget) return;

        // Create new instance widget
        const newWidget: WidgetConfig = {
          id: widgetId,
          type: instanceType,
          title,
          settings: {
            instanceId,
            instanceType,
          },
          layout: {
            id: widgetId,
            x: position?.x ?? 0,
            y: position?.y ?? 0,
            width: 2,
            height: 2,
            visible: true,
          },
          enabled: true,
          order: currentDashboard.widgets.length,
        };

        get().updateDashboard(get().currentDashboard, {
          widgets: [...currentDashboard.widgets, newWidget]
        });
      },

      removeInstanceWidget: (instanceId) => {
        const currentDashboard = get().dashboards.find(d => d.id === get().currentDashboard);
        if (!currentDashboard) return;

        // Remove widgets that match any instance type for this instanceId
        const filteredWidgets = currentDashboard.widgets.filter(w => 
          !w.settings?.instanceId || w.settings.instanceId !== instanceId
        );

        get().updateDashboard(get().currentDashboard, {
          widgets: filteredWidgets
        });
      },

      updateInstanceWidgets: (detectedInstances) => {
        const currentDashboard = get().dashboards.find(d => d.id === get().currentDashboard);
        if (!currentDashboard) return;

        // Track existing instance widgets
        const existingInstanceWidgets = currentDashboard.widgets.filter(w => 
          w.settings?.instanceId && w.settings?.instanceType
        );

        // Create sets of current instance IDs for comparison
        const currentEngineIds = new Set(detectedInstances.engines.map(e => e.id));
        const currentBatteryIds = new Set(detectedInstances.batteries.map(b => b.id));
        const currentTankIds = new Set(detectedInstances.tanks.map(t => t.id));

        // Remove widgets for instances that no longer exist
        const validWidgets = existingInstanceWidgets.filter(widget => {
          const { instanceId, instanceType } = widget.settings;
          switch (instanceType) {
            case 'engine': return currentEngineIds.has(instanceId);
            case 'battery': return currentBatteryIds.has(instanceId);
            case 'tank': return currentTankIds.has(instanceId);
            default: return true;
          }
        });

        // Add new widgets for newly detected instances
        const existingInstanceIds = new Set(validWidgets.map(w => w.settings?.instanceId));

        // Helper to find next available position
        const findNextPosition = (existingWidgets: WidgetConfig[]) => {
          const maxX = Math.max(0, ...existingWidgets.map(w => w.layout.x + w.layout.width));
          const maxY = Math.max(0, ...existingWidgets.map(w => w.layout.y + w.layout.height));
          return { x: maxX > 8 ? 0 : maxX, y: maxX > 8 ? maxY : 0 };
        };

        let newWidgets = [...validWidgets];

        // Add engine widgets
        detectedInstances.engines.forEach(engine => {
          if (!existingInstanceIds.has(engine.id)) {
            const position = findNextPosition(newWidgets);
            const widgetId = `engine-${engine.id}`;
            newWidgets.push({
              id: widgetId,
              type: 'engine',
              title: engine.title,
              settings: {
                instanceId: engine.id,
                instanceType: 'engine',
              },
              layout: {
                id: widgetId,
                x: position.x,
                y: position.y,
                width: 2,
                height: 2,
                visible: true,
              },
              enabled: true,
              order: newWidgets.length,
            });
          }
        });

        // Add battery widgets  
        detectedInstances.batteries.forEach(battery => {
          if (!existingInstanceIds.has(battery.id)) {
            const position = findNextPosition(newWidgets);
            const widgetId = `battery-${battery.id}`;
            newWidgets.push({
              id: widgetId,
              type: 'battery',
              title: battery.title,
              settings: {
                instanceId: battery.id,
                instanceType: 'battery',
              },
              layout: {
                id: widgetId,
                x: position.x,
                y: position.y,
                width: 2,
                height: 2,
                visible: true,
              },
              enabled: true,
              order: newWidgets.length,
            });
          }
        });

        // Add tank widgets
        detectedInstances.tanks.forEach(tank => {
          if (!existingInstanceIds.has(tank.id)) {
            const position = findNextPosition(newWidgets);
            const widgetId = `tank-${tank.id}`;
            newWidgets.push({
              id: widgetId,
              type: 'tanks',
              title: tank.title,
              settings: {
                instanceId: tank.id,
                instanceType: 'tank',
              },
              layout: {
                id: widgetId,
                x: position.x,
                y: position.y,
                width: 2,
                height: 2,
                visible: true,
              },
              enabled: true,
              order: newWidgets.length,
            });
          }
        });

        // Include all non-instance widgets
        const nonInstanceWidgets = currentDashboard.widgets.filter(w => 
          !w.settings?.instanceId || !w.settings?.instanceType
        );

        get().updateDashboard(get().currentDashboard, {
          widgets: [...nonInstanceWidgets, ...newWidgets]
        });
      },

      startInstanceMonitoring: () => {
        // Subscribe to instance detection updates
        instanceDetectionService.onInstancesDetected((detectedInstances) => {
          get().updateInstanceWidgets(detectedInstances);
          
          // Perform periodic cleanup of orphaned widgets
          // This runs every time instances are detected to maintain sync
          get().cleanupOrphanedWidgets();
        });

        // Start the detection service if not already running
        if (!instanceDetectionService.isScanning()) {
          instanceDetectionService.startScanning();
        }

        console.log('[WidgetStore] Instance monitoring started with automatic cleanup');
      },

      stopInstanceMonitoring: () => {
        instanceDetectionService.stopScanning();
      },

      cleanupOrphanedWidgets: () => {
        const currentDashboard = get().dashboards.find(d => d.id === get().currentDashboard);
        if (!currentDashboard) return;

        // Get currently detected instances
        const detectedInstances = instanceDetectionService.getDetectedInstances();
        const activeInstanceIds = new Set([
          ...detectedInstances.engines.map(e => e.id),
          ...detectedInstances.batteries.map(b => b.id),
          ...detectedInstances.tanks.map(t => t.id)
        ]);

        // Find orphaned instance widgets (widgets with instanceId but no matching detected instance)
        const orphanedWidgets = currentDashboard.widgets.filter(widget => 
          widget.settings?.instanceId && 
          widget.settings?.instanceType && 
          !activeInstanceIds.has(widget.settings.instanceId)
        );

        if (orphanedWidgets.length > 0) {
          console.log(`[WidgetStore] Cleaning up ${orphanedWidgets.length} orphaned instance widgets`);
          
          // Remove orphaned widgets
          const cleanWidgets = currentDashboard.widgets.filter(widget => 
            !orphanedWidgets.some(orphan => orphan.id === widget.id)
          );

          get().updateDashboard(get().currentDashboard, {
            widgets: cleanWidgets
          });
        }
      },

      getInstanceWidgetMetrics: () => {
        const currentDashboard = get().dashboards.find(d => d.id === get().currentDashboard);
        if (!currentDashboard) return { totalInstanceWidgets: 0, orphanedWidgets: 0, lastCleanupTime: 0 };

        const instanceWidgets = currentDashboard.widgets.filter(widget => 
          widget.settings?.instanceId && widget.settings?.instanceType
        );

        // Get currently detected instances to check for orphans
        const detectedInstances = instanceDetectionService.getDetectedInstances();
        const activeInstanceIds = new Set([
          ...detectedInstances.engines.map(e => e.id),
          ...detectedInstances.batteries.map(b => b.id),
          ...detectedInstances.tanks.map(t => t.id)
        ]);

        const orphanedWidgets = instanceWidgets.filter(widget => 
          !activeInstanceIds.has(widget.settings.instanceId)
        );

        return {
          totalInstanceWidgets: instanceWidgets.length,
          orphanedWidgets: orphanedWidgets.length,
          lastCleanupTime: Date.now() // Could be enhanced to track actual cleanup time
        };
      },

      forceInstanceCleanup: () => {
        // Force cleanup of expired instances in detection service
        instanceDetectionService.forceCleanup();
        
        // Cleanup orphaned widgets in the widget store
        get().cleanupOrphanedWidgets();
        
        console.log('[WidgetStore] Force cleanup completed for instances and widgets');
      },
    }),
    {
      name: 'widget-store',
      partialize: (state) => ({
        selectedWidgets: state.selectedWidgets,
        currentDashboard: state.currentDashboard,
        dashboards: state.dashboards,
        widgetExpanded: state.widgetExpanded,
      }),
    }
  )
);