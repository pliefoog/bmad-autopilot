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
  // Lifecycle management for auto-detection
  createdAt?: number;
  lastDataUpdate?: number;
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
  dashboards: DashboardConfig[];
  currentDashboard: string;
  selectedWidgets: string[];
  editMode: boolean;
  gridVisible: boolean;
  presets: WidgetPreset[];
  widgetExpanded: Record<string, boolean>;
  // Dynamic widget lifecycle configuration
  widgetExpirationTimeout: number; // Milliseconds - widgets removed if no data received for this duration
  enableWidgetAutoRemoval: boolean; // Feature toggle for automatic widget removal
}

interface WidgetActions {
  addWidget: (widgetType: string, position?: { x: number; y: number }, options?: { instance?: number, sensorSource?: string }) => void;
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
  // Dynamic widget lifecycle actions
  setWidgetExpirationTimeout: (timeoutMs: number) => void;
  setEnableWidgetAutoRemoval: (enabled: boolean) => void;
  cleanupExpiredWidgetsWithConfig: () => void;
  updateDashboard: (dashboardId: string, updates: Partial<DashboardConfig>) => void;
  exportDashboard: (dashboardId: string) => DashboardConfig;
  importDashboard: (dashboard: DashboardConfig) => void;
  toggleWidgetExpanded: (widgetId: string) => void;
  setWidgetExpanded: (widgetId: string, expanded: boolean) => void;
  isWidgetExpanded: (widgetId: string) => boolean;
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
  updateInstanceWidgets: (detectedInstances: { engines: DetectedInstance[]; batteries: DetectedInstance[]; tanks: DetectedInstance[]; temperatures: DetectedInstance[]; instruments: DetectedInstance[] }) => void;
  startInstanceMonitoring: () => void;
  stopInstanceMonitoring: () => void;
  // Runtime management methods
  cleanupOrphanedWidgets: () => void;
  getInstanceWidgetMetrics: () => { totalInstanceWidgets: number; orphanedWidgets: number; lastCleanupTime: number };
  forceInstanceCleanup: () => void;
  resetAppToDefaults: () => Promise<void>;
  emergencyReset: () => void;
  // TODO: Pagination methods (Story 6.11) - temporarily disabled for dynamic widget focus
}

type WidgetStore = WidgetState & WidgetActions;

// FULLY DYNAMIC DASHBOARD - No static widgets, all based on detected NMEA data
const defaultDashboard: DashboardConfig = {
  id: 'default',
  name: 'Main Dashboard',
  widgets: [
    // All widgets are now dynamically detected from NMEA messages:
    // - GPS widgets appear when GPS NMEA sentences are detected
    // - Speed widgets appear when SOG/STW data is detected  
    // - Wind widgets appear when wind data is detected
    // - Depth widgets appear when depth data is detected
    // - Temperature widgets appear when temperature sensors are detected
    // - Engine widgets appear when engine data is detected
    // - Battery widgets appear when battery data is detected
    // - Tank widgets appear when tank data is detected
    // User layout preferences are preserved across sessions
  ],
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
      // Dynamic widget lifecycle configuration
      widgetExpirationTimeout: 60000, // 60 seconds - configurable timeout for widget removal
      enableWidgetAutoRemoval: true,   // Enable automatic removal of widgets when data stops flowing

      // Actions
      addWidget: (widgetType, position = { x: 0, y: 0 }, options?: { instance?: number, sensorSource?: string }) => {
        const currentState = get();
        const currentDashboard = currentState.dashboards.find(d => d.id === currentState.currentDashboard);
        
        // Generate proper instance-based ID
        let widgetId: string;
        if (options?.instance !== undefined) {
          // Multi-instance widget (e.g., engine-0, engine-1, temperature-engine, temperature-seawater)
          if (options.sensorSource) {
            widgetId = `${widgetType}-${options.sensorSource}`;
          } else {
            widgetId = options.instance === 0 ? widgetType : `${widgetType}-${options.instance}`;
          }
        } else {
          // Single-instance widget - check if one already exists
          const existingWidget = currentDashboard?.widgets.find(w => w.type === widgetType);
          if (existingWidget) {
            console.warn(`[addWidget] Widget of type '${widgetType}' already exists: ${existingWidget.id}`);
            return; // Don't create duplicate single-instance widgets
          }
          widgetId = widgetType; // Simple ID for single-instance (depth, gps, speed, compass)
        }

        const widget: WidgetConfig = {
          id: widgetId,
          type: widgetType,
          title: widgetType.charAt(0).toUpperCase() + widgetType.slice(1),
          settings: {},
          layout: {
            id: widgetId,
            x: position.x,
            y: position.y,
            width: 2,
            height: 2,
            visible: true,
          },
          enabled: true,
          order: currentState.selectedWidgets.length,
          // Add timestamp for expiration/lifecycle management
          createdAt: Date.now(),
          lastDataUpdate: Date.now(),
        };

        set((state) => ({
          dashboards: state.dashboards.map((dashboard) =>
            dashboard.id === state.currentDashboard
              ? { ...dashboard, widgets: [...dashboard.widgets, widget] }
              : dashboard
          ),
          selectedWidgets: [...state.selectedWidgets, widgetType],
        }));
        
        // Clean up any invalid widgets after adding new ones
        setTimeout(() => get().cleanupOrphanedWidgets(), 100);
      },

      // Update widget's last data timestamp (for expiration tracking)
      updateWidgetDataTimestamp: (widgetId: string) => {
        set((state) => ({
          dashboards: state.dashboards.map((dashboard) => ({
            ...dashboard,
            widgets: dashboard.widgets.map((widget) =>
              widget.id === widgetId
                ? { ...widget, lastDataUpdate: Date.now() }
                : widget
            ),
          })),
        }));
      },

      // Clean up expired widgets (no data for specified duration) - LEGACY METHOD
      cleanupExpiredWidgets: (maxAge?: number) => {
        // Use configurable cleanup system instead
        const state = get();
        if (maxAge) {
          // Temporarily override the timeout for this call
          const originalTimeout = state.widgetExpirationTimeout;
          get().setWidgetExpirationTimeout(maxAge);
          get().cleanupExpiredWidgetsWithConfig();
          get().setWidgetExpirationTimeout(originalTimeout);
        } else {
          get().cleanupExpiredWidgetsWithConfig();
        }
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

      isWidgetExpanded: (widgetId) => {
        const state = get();
        return !!state.widgetExpanded[widgetId];
      },

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
        let dashboard = state.dashboards.find(d => d.id === state.currentDashboard);
        
        console.log('[WidgetStore] initializeWidgetStatesOnAppStart - Dashboard widgets:', {
          dashboardId: state.currentDashboard,
          widgetCount: dashboard?.widgets.length,
          widgetIds: dashboard?.widgets.map(w => w.id)
        });
        
        // 🔧 MIGRATION: Ensure base widgets are always present
        if (dashboard) {
          // NO static base widgets - all widgets are dynamically detected from NMEA data
          const baseWidgetIds: string[] = []; // Fully dynamic detection system
          const existingWidgetIds = new Set(dashboard.widgets.map(w => w.id));
          const missingBaseWidgets = baseWidgetIds.filter(id => !existingWidgetIds.has(id));
          
          if (missingBaseWidgets.length > 0) {
            console.log('[WidgetStore] Missing base widgets detected:', missingBaseWidgets);
            console.log('[WidgetStore] Adding missing base widgets to dashboard');
            
            // Get base widgets from default dashboard
            const defaultBaseWidgets = defaultDashboard.widgets.filter(w => 
              missingBaseWidgets.includes(w.id)
            );
            
            // Add missing base widgets
            const updatedWidgets = [...dashboard.widgets, ...defaultBaseWidgets];
            get().updateDashboard(state.currentDashboard, {
              widgets: updatedWidgets
            });
            
            // Update local reference
            dashboard = get().dashboards.find(d => d.id === state.currentDashboard);
            console.log('[WidgetStore] Base widgets restored. Total widgets now:', dashboard?.widgets.length);
          }
        }
        
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
        console.log('[WidgetStore] updateInstanceWidgets called with:', {
          engines: detectedInstances.engines.length,
          batteries: detectedInstances.batteries.length,
          tanks: detectedInstances.tanks.length,
          temperatures: detectedInstances.temperatures.length,
          instruments: detectedInstances.instruments.length
        });
        
        const currentDashboard = get().dashboards.find(d => d.id === get().currentDashboard);
        if (!currentDashboard) {
          console.log('[WidgetStore] No current dashboard found');
          return;
        }

        // Keep ALL existing widgets (both instance and non-instance)
        const allExistingWidgets = [...currentDashboard.widgets];
        console.log('[WidgetStore] All existing widgets:', allExistingWidgets.map(w => ({
          id: w.id,
          type: w.type,
          hasInstanceId: !!w.settings?.instanceId,
          hasInstanceType: !!w.settings?.instanceType,
          settings: w.settings
        })));
        
        // Track existing instance widgets separately for updates
        const existingInstanceWidgets = allExistingWidgets.filter(w => {
          const hasInstanceId = w.settings && typeof w.settings.instanceId === 'string' && w.settings.instanceId.length > 0;
          const hasInstanceType = w.settings && typeof w.settings.instanceType === 'string' && w.settings.instanceType.length > 0;
          return hasInstanceId && hasInstanceType;
        });
        
        // Keep all non-instance widgets (Speed, Wind, GPS, etc.)
        const nonInstanceWidgets = allExistingWidgets.filter(w => {
          const hasInstanceId = w.settings && typeof w.settings.instanceId === 'string' && w.settings.instanceId.length > 0;
          const hasInstanceType = w.settings && typeof w.settings.instanceType === 'string' && w.settings.instanceType.length > 0;
          return !(hasInstanceId && hasInstanceType);
        });
        
        console.log('[WidgetStore] Classification result:', {
          allCount: allExistingWidgets.length,
          nonInstanceCount: nonInstanceWidgets.length,
          instanceCount: existingInstanceWidgets.length,
          nonInstanceWidgets: nonInstanceWidgets.map(w => w.id),
          instanceWidgets: existingInstanceWidgets.map(w => w.id)
        });

        console.log('[WidgetStore] Dashboard state:', {
          total: allExistingWidgets.length,
          nonInstance: nonInstanceWidgets.length,
          existingInstance: existingInstanceWidgets.length,
          nonInstanceIds: nonInstanceWidgets.map(w => w.id),
          instanceIds: existingInstanceWidgets.map(w => w.id)
        });

        // Create sets of current instance IDs for comparison
        const currentEngineIds = new Set(detectedInstances.engines.map(e => e.id));
        const currentBatteryIds = new Set(detectedInstances.batteries.map(b => b.id));
        const currentTankIds = new Set(detectedInstances.tanks.map(t => t.id));
        const currentTemperatureIds = new Set(detectedInstances.temperatures.map(t => t.id));
        const currentInstrumentIds = new Set(detectedInstances.instruments.map(i => i.id));

        // Remove widgets for instances that no longer exist
        const validInstanceWidgets = existingInstanceWidgets.filter(widget => {
          const { instanceId, instanceType } = widget.settings;
          switch (instanceType) {
            case 'engine': return currentEngineIds.has(instanceId);
            case 'battery': return currentBatteryIds.has(instanceId);
            case 'tank': return currentTankIds.has(instanceId);
            case 'temperature': return currentTemperatureIds.has(instanceId);
            case 'instrument': return currentInstrumentIds.has(instanceId);
            default: return true;
          }
        });

        // Add new widgets for newly detected instances
        const existingInstanceIds = new Set(validInstanceWidgets.map(w => w.settings?.instanceId));
        console.log('[WidgetStore] Existing instance IDs:', Array.from(existingInstanceIds));

        // Helper to find next available position (considering ALL existing widgets)
        const findNextPosition = (allWidgets: WidgetConfig[]) => {
          const maxX = Math.max(0, ...allWidgets.map(w => w.layout.x + w.layout.width));
          const maxY = Math.max(0, ...allWidgets.map(w => w.layout.y + w.layout.height));
          const position = { x: maxX > 8 ? 0 : maxX, y: maxX > 8 ? maxY : 0 };
          console.log('[WidgetStore] Next position calculated:', position, 'from', allWidgets.length, 'total widgets');
          return position;
        };

        // Start with valid instance widgets (keep existing instance widgets)
        let updatedInstanceWidgets = [...validInstanceWidgets];
        console.log('[WidgetStore] Starting with', updatedInstanceWidgets.length, 'valid instance widgets');

        // Add engine widgets
        detectedInstances.engines.forEach(engine => {
          if (!existingInstanceIds.has(engine.id)) {
            console.log('[WidgetStore] Creating engine widget for:', engine.id, engine.title);
            const allCurrentWidgets = [...nonInstanceWidgets, ...updatedInstanceWidgets];
            const position = findNextPosition(allCurrentWidgets);
            const widgetId = engine.id; // Use instance ID directly (already includes type)
            updatedInstanceWidgets.push({
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
              order: updatedInstanceWidgets.length,
            });
          } else {
            console.log('[WidgetStore] Engine widget already exists:', engine.id);
          }
        });
        console.log('[WidgetStore] After adding engines:', updatedInstanceWidgets.length, 'instance widgets');

        // Add battery widgets  
        detectedInstances.batteries.forEach(battery => {
          if (!existingInstanceIds.has(battery.id)) {
            console.log('[WidgetStore] Creating battery widget for:', battery.id, battery.title);
            const allCurrentWidgets = [...nonInstanceWidgets, ...updatedInstanceWidgets];
            const position = findNextPosition(allCurrentWidgets);
            const widgetId = battery.id; // Use instance ID directly (already includes type)
            updatedInstanceWidgets.push({
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
              order: updatedInstanceWidgets.length,
            });
          } else {
            console.log('[WidgetStore] Battery widget already exists:', battery.id);
          }
        });
        console.log('[WidgetStore] After adding batteries:', updatedInstanceWidgets.length, 'instance widgets');

        // Add tank widgets
        detectedInstances.tanks.forEach(tank => {
          if (!existingInstanceIds.has(tank.id)) {
            const allCurrentWidgets = [...nonInstanceWidgets, ...updatedInstanceWidgets];
            const position = findNextPosition(allCurrentWidgets);
            const widgetId = tank.id; // Use instance ID directly (already includes type)
            updatedInstanceWidgets.push({
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
              order: updatedInstanceWidgets.length,
            });
          }
        });

        // Add temperature widgets
        detectedInstances.temperatures.forEach(temperature => {
          if (!existingInstanceIds.has(temperature.id)) {
            console.log('[WidgetStore] Creating temperature widget for:', temperature.id, temperature.title);
            const allCurrentWidgets = [...nonInstanceWidgets, ...updatedInstanceWidgets];
            const position = findNextPosition(allCurrentWidgets);
            const widgetId = temperature.id; // Use instance ID directly (already includes type)
            updatedInstanceWidgets.push({
              id: widgetId,
              type: 'watertemp', // Use existing water temperature widget type
              title: temperature.title,
              settings: {
                instanceId: temperature.id,
                instanceType: 'temperature',
                location: temperature.location, // Store sensor location
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
              order: updatedInstanceWidgets.length,
            });
          } else {
            console.log('[WidgetStore] Temperature widget already exists:', temperature.id);
          }
        });
        console.log('[WidgetStore] After adding temperatures:', updatedInstanceWidgets.length, 'instance widgets');

        // Add marine instrument widgets
        detectedInstances.instruments.forEach(instrument => {
          if (!existingInstanceIds.has(instrument.id)) {
            console.log('[WidgetStore] Creating marine instrument widget for:', instrument.id, instrument.title);
            const allCurrentWidgets = [...nonInstanceWidgets, ...updatedInstanceWidgets];
            const position = findNextPosition(allCurrentWidgets);
            const widgetId = instrument.id; // Use instance ID directly (already includes type)
            updatedInstanceWidgets.push({
              id: widgetId,
              type: instrument.type, // Use the detected instrument type (gps, speed, wind, depth, compass)
              title: instrument.title,
              settings: {
                instanceId: instrument.id,
                instanceType: 'instrument',
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
              order: updatedInstanceWidgets.length,
            });
          } else {
            console.log('[WidgetStore] Marine instrument widget already exists:', instrument.id);
          }
        });
        console.log('[WidgetStore] After adding marine instruments:', updatedInstanceWidgets.length, 'instance widgets');

        // Combine all widgets: non-instance (original) + instance (detected)
        const finalWidgets = [...nonInstanceWidgets, ...updatedInstanceWidgets];
        console.log('[WidgetStore] Final widget update:', {
          nonInstance: nonInstanceWidgets.length,
          instanceWidgets: updatedInstanceWidgets.length,
          total: finalWidgets.length
        });

        get().updateDashboard(get().currentDashboard, {
          widgets: finalWidgets
        });
        
        console.log('[WidgetStore] Dashboard updated with new widgets');
      },

      startInstanceMonitoring: () => {
        console.log('[WidgetStore] Starting instance monitoring...');
        
        // Subscribe to instance detection updates
        instanceDetectionService.onInstancesDetected((detectedInstances) => {
          console.log('[WidgetStore] Instances detected callback triggered:', {
            engines: detectedInstances.engines.length,
            batteries: detectedInstances.batteries.length, 
            tanks: detectedInstances.tanks.length,
            temperatures: detectedInstances.temperatures.length,
            instruments: detectedInstances.instruments.length
          });
          
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
          ...detectedInstances.tanks.map(t => t.id),
          ...detectedInstances.temperatures.map(t => t.id),
          ...detectedInstances.instruments.map(i => i.id)
        ]);

        // Find orphaned instance widgets (widgets with instanceId but no matching detected instance)
        const orphanedInstanceWidgets = currentDashboard.widgets.filter(widget => 
          widget.settings?.instanceId && 
          widget.settings?.instanceType && 
          !activeInstanceIds.has(widget.settings.instanceId)
        );

        // Find invalid registry widgets (widgets that don't exist in the widget registry)
        const invalidRegistryWidgets = currentDashboard.widgets.filter(widget => {
          try {
            // Import WidgetFactory to check if widget can be resolved
            const { WidgetFactory } = require('../services/WidgetFactory');
            const { baseType } = WidgetFactory.parseWidgetId(widget.id);
            
            // Check if widget is resolvable via WidgetFactory
            WidgetFactory.getWidgetMetadata(widget.id);
            return false; // Widget is valid
          } catch (error) {
            // Widget cannot be resolved - it's invalid
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(`[WidgetStore] Invalid widget found: ${widget.id} - ${errorMessage}`);
            return true;
          }
        });

        // Find timestamp-based widget IDs (legacy from preset/duplication operations)
        const timestampBasedWidgets = currentDashboard.widgets.filter(widget => 
          /^[a-z]+-[0-9]{13}-[0-9]+$/.test(widget.id) // Pattern: type-timestamp-index
        );

        const allOrphanedWidgets = [
          ...orphanedInstanceWidgets,
          ...invalidRegistryWidgets,
          ...timestampBasedWidgets
        ];

        // Remove duplicates by ID
        const uniqueOrphanedWidgets = allOrphanedWidgets.filter((widget, index, arr) => 
          arr.findIndex(w => w.id === widget.id) === index
        );

        if (uniqueOrphanedWidgets.length > 0) {
          console.log(`[WidgetStore] Cleaning up ${uniqueOrphanedWidgets.length} orphaned widgets:`, 
            uniqueOrphanedWidgets.map(w => `${w.id} (${w.type})`));
          
          // Remove orphaned widgets
          const cleanWidgets = currentDashboard.widgets.filter(widget => 
            !uniqueOrphanedWidgets.some(orphan => orphan.id === widget.id)
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
          ...detectedInstances.tanks.map(t => t.id),
          ...detectedInstances.temperatures.map(t => t.id),
          ...detectedInstances.instruments.map(i => i.id)
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

      resetAppToDefaults: async () => {
        console.log('[WidgetStore] Executing factory reset...');

        // First, clear ALL storage comprehensively
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            // Clear the specific Zustand persist key first
            window.localStorage.removeItem('widget-store');
            
            // Clear all widget-related localStorage
            const keysToRemove = [];
            for (let i = 0; i < window.localStorage.length; i++) {
              const key = window.localStorage.key(i);
              if (key && (
                key.startsWith('widget-') || 
                key.startsWith('dashboard-') || 
                key.startsWith('nmea-') ||
                key.includes('WidgetStore') ||
                key.includes('widgetStore') ||
                key.startsWith('@bmad_autopilot:')
              )) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(key => window.localStorage.removeItem(key));
            console.log('[WidgetStore] Cleared localStorage keys:', keysToRemove);
            
            // Force storage event to trigger persist middleware cleanup
            window.dispatchEvent(new StorageEvent('storage', {
              key: 'widget-store',
              oldValue: null,
              newValue: null,
              url: window.location.href
            }));
          }
        } catch (error) {
          console.error('[WidgetStore] Error clearing localStorage:', error);
        }

        const initialState = {
          // Core widget state
          availableWidgets: [
            'depth', 'speed', 'wind', 'gps', 'compass', 'engine', 
            'battery', 'tanks', 'autopilot', 'weather', 'navigation'
          ],
          selectedWidgets: [],
          currentDashboard: 'default',
          dashboards: [
            {
              id: 'default',
              name: 'Default Dashboard',
              widgets: [],
              gridSize: 20,
              snapToGrid: true,
              columns: 12,
              rows: 8,
              backgroundColor: themeStore.getState().colors.surface
            }
          ],
          presets: [],
          editMode: false,
          gridVisible: false,
          widgetExpanded: {},
          // Dynamic widget lifecycle configuration
          widgetExpirationTimeout: 60000,
          enableWidgetAutoRemoval: true,
        };

        // Apply the reset state - this will trigger persist middleware to save the clean state
        set(initialState);

        // Force a small delay to let persist middleware complete
        await new Promise(resolve => setTimeout(resolve, 100));

        // Double-check that localStorage is cleared after state reset
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem('widget-store');
            console.log('[WidgetStore] Double-cleared widget-store key after state reset');
          }
        } catch (error) {
          console.error('[WidgetStore] Error in double-clear:', error);
        }

        // Clear AsyncStorage (React Native)
        try {
          if (typeof window === 'undefined') {
            // React Native environment
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            AsyncStorage.clear().catch((error: Error) => {
              console.error('[WidgetStore] Error clearing AsyncStorage:', error);
            });
          }
        } catch (error) {
          console.error('[WidgetStore] Error accessing AsyncStorage:', error);
        }

        // Reset other stores
        try {
          // Import and reset other stores
          const { useNmeaStore } = require('./nmeaStore');
          const { useConnectionStore } = require('./connectionStore');
          const { useSettingsStore } = require('./settingsStore');
          const { useAlarmStore } = require('./alarmStore');

          // Reset all stores to their initial state
          useNmeaStore.getState().reset?.();
          useConnectionStore.getState().reset?.();
          useSettingsStore.getState().reset?.();
          useAlarmStore.getState().reset?.();
        } catch (error) {
          console.error('[WidgetStore] Error resetting other stores:', error);
        }

        console.log('[WidgetStore] Factory reset completed');
        
        // Final verification - log current state after reset
        const finalState = get();
        console.log('[WidgetStore] Final state after reset:', {
          selectedWidgets: finalState.selectedWidgets,
          dashboards: finalState.dashboards,
          currentDashboard: finalState.currentDashboard
        });
      },
      
      // Emergency reset method that completely bypasses persist middleware
      emergencyReset: () => {
        console.log('[WidgetStore] EMERGENCY RESET - Bypassing persist middleware');
        
        // Clear localStorage aggressively
        if (typeof window !== 'undefined' && window.localStorage) {
          // Clear absolutely everything widget-related
          const allKeys = Object.keys(window.localStorage);
          allKeys.forEach(key => {
            if (key.includes('widget') || key.includes('dashboard') || key.includes('bmad')) {
              window.localStorage.removeItem(key);
              console.log(`[WidgetStore] Emergency cleared: ${key}`);
            }
          });
          
          // Also clear the persist key
          window.localStorage.removeItem('widget-store');
        }
        
        // Force page reload to completely reset all stores
        if (typeof window !== 'undefined') {
          console.log('[WidgetStore] Forcing page reload to complete reset');
          window.location.reload();
        }
      },

      // Dynamic widget lifecycle actions
      setWidgetExpirationTimeout: (timeoutMs: number) => {
        set({ widgetExpirationTimeout: timeoutMs });
        console.log(`[WidgetStore] Widget expiration timeout set to ${timeoutMs}ms`);
      },

      setEnableWidgetAutoRemoval: (enabled: boolean) => {
        set({ enableWidgetAutoRemoval: enabled });
        console.log(`[WidgetStore] Widget auto-removal ${enabled ? 'enabled' : 'disabled'}`);
      },

      // Enhanced cleanup system with configurable expiration
      cleanupExpiredWidgetsWithConfig: () => {
        const state = get();
        if (!state.enableWidgetAutoRemoval) {
          console.log('[WidgetStore] Widget auto-removal is disabled');
          return;
        }

        const now = Date.now();
        const timeout = state.widgetExpirationTimeout;
        let removedCount = 0;

        set((currentState) => ({
          dashboards: currentState.dashboards.map((dashboard) => ({
            ...dashboard,
            widgets: dashboard.widgets.filter((widget) => {
              // Skip theme widget - it's a system widget
              if (widget.id === 'themes' || widget.type === 'themes') {
                return true;
              }

              const lastUpdate = widget.lastDataUpdate || widget.createdAt || now;
              const isExpired = now - lastUpdate > timeout;
              
              if (isExpired) {
                console.log(`[WidgetStore] 🗑️ Removing expired widget: ${widget.id} (no data for ${Math.round((now - lastUpdate) / 1000)}s)`);
                removedCount++;
              }
              
              return !isExpired;
            }),
          })),
          selectedWidgets: currentState.selectedWidgets.filter((widgetType) => {
            // Keep widget type if any widget of that type still exists after cleanup
            return currentState.dashboards.some((dashboard) =>
              dashboard.widgets.some((widget) => widget.type === widgetType && 
                (widget.id === 'themes' || widget.type === 'themes' || 
                 now - (widget.lastDataUpdate || widget.createdAt || now) <= timeout))
            );
          }),
        }));

        if (removedCount > 0) {
          console.log(`[WidgetStore] 🧹 Removed ${removedCount} expired widgets`);
        }
      },

      // TODO: Pagination methods (Story 6.11) - temporarily disabled
      /* Pagination features will be re-implemented after dynamic widget lifecycle is stable
      setCurrentPage: (page) => {
        const { totalPages } = get();
        const clampedPage = Math.max(0, Math.min(totalPages - 1, page));
        set({ currentPage: clampedPage });
      },

      navigateToPage: (page) => {
        const { totalPages, setCurrentPage } = get();
        if (page >= 0 && page < totalPages) {
          set({ isAnimatingPageTransition: true });
          setCurrentPage(page);
          // Reset animation flag after transition
          setTimeout(() => set({ isAnimatingPageTransition: false }), 300);
        }
      },

      navigateToNextPage: () => {
        const { currentPage, totalPages, navigateToPage } = get();
        if (currentPage < totalPages - 1) {
          navigateToPage(currentPage + 1);
        }
      },

      navigateToPreviousPage: () => {
        const { currentPage, navigateToPage } = get();
        if (currentPage > 0) {
          navigateToPage(currentPage - 1);
        }
      },

      addWidgetToOptimalPage: (widgetType) => {
        const { pageWidgets, maxWidgetsPerPage, recalculatePages } = get();
        
        // Find first page with available space
        let targetPage = 0;
        for (const [pageIndex, widgets] of Object.entries(pageWidgets)) {
          if (widgets.length < maxWidgetsPerPage) {
            targetPage = parseInt(pageIndex);
            break;
          }
          targetPage = parseInt(pageIndex) + 1;
        }

        // Add widget using existing method
        get().addWidget(widgetType);
        
        // Recalculate pages to ensure proper distribution
        recalculatePages(maxWidgetsPerPage);
      },

      recalculatePages: (maxWidgetsPerPage) => {
        const { selectedWidgets } = get();
        const newPageWidgets: Record<number, string[]> = {};
        let pageIndex = 0;
        
        for (let i = 0; i < selectedWidgets.length; i += maxWidgetsPerPage) {
          newPageWidgets[pageIndex] = selectedWidgets.slice(i, i + maxWidgetsPerPage);
          pageIndex++;
        }
        
        const totalPages = Math.max(1, Object.keys(newPageWidgets).length);
        const currentPage = Math.min(get().currentPage, totalPages - 1);
        
        set({
          pageWidgets: newPageWidgets,
          totalPages,
          currentPage,
          maxWidgetsPerPage,
        });
      },

      getWidgetsForPage: (pageIndex) => {
        const { pageWidgets } = get();
        return pageWidgets[pageIndex] || [];
      },

      moveWidgetToPage: (widgetId, targetPage) => {
        const { pageWidgets, totalPages } = get();
        const clampedTargetPage = Math.max(0, Math.min(totalPages - 1, targetPage));
        
        // Remove widget from current page
        let sourcePageIndex = -1;
        const newPageWidgets = { ...pageWidgets };
        
        for (const [pageIndex, widgets] of Object.entries(newPageWidgets)) {
          const widgetIndex = widgets.findIndex(id => id === widgetId);
          if (widgetIndex !== -1) {
            sourcePageIndex = parseInt(pageIndex);
            widgets.splice(widgetIndex, 1);
            break;
          }
        }
        
        // Add to target page
        if (sourcePageIndex !== -1) {
          if (!newPageWidgets[clampedTargetPage]) {
            newPageWidgets[clampedTargetPage] = [];
          }
          newPageWidgets[clampedTargetPage].push(widgetId);
          
          set({ pageWidgets: newPageWidgets });
        }
      */ 
      // End of commented pagination methods
    }),
    {
      name: 'widget-store',
      partialize: (state) => ({
        selectedWidgets: state.selectedWidgets,
        currentDashboard: state.currentDashboard,
        dashboards: state.dashboards,
        widgetExpanded: state.widgetExpanded,
        // Dynamic widget lifecycle configuration
        widgetExpirationTimeout: state.widgetExpirationTimeout,
        enableWidgetAutoRemoval: state.enableWidgetAutoRemoval,
      }),
    }
  )
);