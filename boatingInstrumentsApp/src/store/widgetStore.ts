import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DetectedInstance } from '../services/nmea/instanceDetection';

// System widgets that must always be present and never expire
const SYSTEM_WIDGETS = [
  { id: 'theme', type: 'theme', title: 'Theme' }
];

export interface WidgetLayout {
  id: string;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  locked?: boolean;
  visible?: boolean;
  // Position determined by index in widgets array
  // Page calculated as: Math.floor(index / widgetsPerPage)
  // Position within page: index % widgetsPerPage
}

export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  settings: Record<string, any>;
  layout: WidgetLayout;
  enabled: boolean;
  // System widget protection
  isSystemWidget?: boolean;
  // Widget lifecycle timestamps
  createdAt?: number;        // When widget was created
  lastDataUpdate?: number;   // Last time widget received sensor data update
}

export interface DashboardConfig {
  id: string;
  name: string;
  widgets: WidgetConfig[];  // Array order determines position, layout computed dynamically
}

interface WidgetState {
  dashboard: DashboardConfig; // Single dashboard
  editMode: boolean;
  gridVisible: boolean;
  
  // Widget expiration configuration
  widgetExpirationTimeout: number;
  enableWidgetAutoRemoval: boolean;
  
  // Track current widget IDs for fast Set-based diffing
  currentWidgetIds: Set<string>;
  
  // Performance metrics
  widgetUpdateMetrics: {
    totalUpdates: number;
    skippedUpdates: number;
    widgetsAdded: number;
    widgetsRemoved: number;
    lastUpdateTime: number;
  };
}

interface WidgetActions {
  // Core widget management
  addWidget: (widgetType: string, options?: { instance?: number, sensorSource?: string }) => void;
  updateWidget: (widgetId: string, updates: Partial<WidgetConfig>) => void;
  updateWidgetLayout: (widgetId: string, layout: Partial<WidgetLayout>) => void;
  updateWidgetSettings: (widgetId: string, settings: Record<string, any>) => void;
  reorderWidgets: (widgets: WidgetConfig[]) => void;
  
  // UI state
  setEditMode: (enabled: boolean) => void;
  setGridVisible: (visible: boolean) => void;
  updateDashboard: (updates: Partial<DashboardConfig>) => void;
  
  // Event-driven instance management
  updateInstanceWidgets: (detectedInstances: { engines: DetectedInstance[]; batteries: DetectedInstance[]; tanks: DetectedInstance[]; temperatures: DetectedInstance[]; instruments: DetectedInstance[] }) => void;
  
  // Widget lifecycle
  updateWidgetDataTimestamp: (widgetId: string, timestamp?: number) => void;
  setWidgetExpirationTimeout: (timeoutMs: number) => void;
  setEnableWidgetAutoRemoval: (enabled: boolean) => void;
  cleanupExpiredWidgetsWithConfig: () => void;
  
  // Runtime management
  resetAppToDefaults: () => Promise<void>;
}

type WidgetStore = WidgetState & WidgetActions;

// Dynamic dashboard with event-driven widget detection from NMEA data
const defaultDashboard: DashboardConfig = {
  id: 'default',
  name: 'Main Dashboard',
  widgets: [
    // 🛡️ SYSTEM WIDGET: ThemeWidget is always present and never expires
    {
      id: 'theme',
      type: 'theme',
      title: 'Theme',
      settings: {},
      layout: {
        id: 'theme',
        width: 2,
        height: 2,
        visible: true,
      },
      enabled: true,
      isSystemWidget: true,
      createdAt: Date.now(),
      lastDataUpdate: Date.now(),
    },
    // All other widgets dynamically detected from NMEA messages
  ],
};

// Set utility functions for widget ID comparison
function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

function setDifference<T>(a: Set<T>, b: Set<T>): Set<T> {
  return new Set([...a].filter(x => !b.has(x)));
}

export const useWidgetStore = create<WidgetStore>()(
  persist(
    (set, get) => ({
      // State
      dashboard: defaultDashboard,
      editMode: false,
      gridVisible: false,
      widgetExpirationTimeout: 300000,  // 5 minutes
      enableWidgetAutoRemoval: true,
      
      // Initialize tracking structures
      currentWidgetIds: new Set(SYSTEM_WIDGETS.map(w => w.id)),
      widgetUpdateMetrics: {
        totalUpdates: 0,
        skippedUpdates: 0,
        widgetsAdded: 0,
        widgetsRemoved: 0,
        lastUpdateTime: Date.now()
      },

      // Actions
      addWidget: (widgetType: string, options?: { instance?: number, sensorSource?: string }) => {
        const currentDashboard = get().dashboard;
        
        // Generate instance-based ID
        let widgetId: string;
        if (options?.instance !== undefined) {
          if (options.sensorSource) {
            widgetId = `${widgetType}-${options.sensorSource}`;
          } else {
            widgetId = options.instance === 0 ? widgetType : `${widgetType}-${options.instance}`;
          }
        } else {
          // Single-instance widget - check if one already exists
          const existingWidget = currentDashboard.widgets.find(w => w.type === widgetType);
          if (existingWidget) return;
          widgetId = widgetType;
        }

        const now = Date.now();
        const widget: WidgetConfig = {
          id: widgetId,
          type: widgetType,
          title: widgetType.charAt(0).toUpperCase() + widgetType.slice(1),
          settings: {},
          layout: {
            id: widgetId,
            width: 2,
            height: 2,
            visible: true,
          },
          enabled: true,
          createdAt: now,
          lastDataUpdate: now,
        };

        set((state) => ({
          dashboard: { ...state.dashboard, widgets: [...state.dashboard.widgets, widget] },
        }));
      },

      updateWidget: (widgetId: string, updates: Partial<WidgetConfig>) =>
        set((state) => ({
          dashboard: {
            ...state.dashboard,
            widgets: state.dashboard.widgets.map((w) =>
              w.id === widgetId ? { ...w, ...updates } : w
            ),
          },
        })),

      updateWidgetLayout: (widgetId: string, layout: Partial<WidgetLayout>) => {
        const widget = get().dashboard.widgets.find(w => w.id === widgetId);
        if (widget?.layout) {
          get().updateWidget(widgetId, { 
            layout: { ...widget.layout, ...layout } 
          });
        }
      },

      updateWidgetSettings: (widgetId: string, settings: Record<string, any>) =>
        get().updateWidget(widgetId, { settings }),

      reorderWidgets: (widgets: WidgetConfig[]) =>
        set((state) => ({
          dashboard: { ...state.dashboard, widgets },
        })),

      setEditMode: (enabled: boolean) =>
        set({ editMode: enabled }),

      setGridVisible: (visible: boolean) =>
        set({ gridVisible: visible }),

      updateDashboard: (updates: Partial<DashboardConfig>) =>
        set((state) => ({
          dashboard: { ...state.dashboard, ...updates },
        })),

      updateInstanceWidgets: (detectedInstances) => {
        // Set-based widget diffing for efficient updates
        
        // Guard: Don't process if ALL instance arrays are empty
        const totalInstances = detectedInstances.engines.length + 
                              detectedInstances.batteries.length +
                              detectedInstances.tanks.length +
                              detectedInstances.temperatures.length +
                              detectedInstances.instruments.length;
        
        if (totalInstances === 0) {
          set((state) => ({
            widgetUpdateMetrics: {
              ...state.widgetUpdateMetrics,
              totalUpdates: state.widgetUpdateMetrics.totalUpdates + 1,
              skippedUpdates: state.widgetUpdateMetrics.skippedUpdates + 1,
            },
          }));
          return;
        }
        
        // Build Set of all required widget IDs from detected instances
        const allDetectedInstances = [
          ...detectedInstances.engines,
          ...detectedInstances.batteries,
          ...detectedInstances.tanks,
          ...detectedInstances.temperatures,
          ...detectedInstances.instruments
        ];
        
        const newWidgetIds = new Set<string>([
          ...SYSTEM_WIDGETS.map(w => w.id), // Always include system widgets
          ...allDetectedInstances.map(inst => inst.id)
        ]);
        
        // Early exit: No changes detected
        const currentIds = get().currentWidgetIds;
        
        if (setsEqual(currentIds, newWidgetIds)) {
          set((state) => ({
            widgetUpdateMetrics: {
              ...state.widgetUpdateMetrics,
              totalUpdates: state.widgetUpdateMetrics.totalUpdates + 1,
              skippedUpdates: state.widgetUpdateMetrics.skippedUpdates + 1,
            },
          }));
          return;
        }
        
        // Calculate Set diff: which widgets to add/remove
        const toAdd = setDifference(newWidgetIds, currentIds);
        const toRemove = setDifference(currentIds, newWidgetIds);
        
        const currentDashboard = get().dashboard;
        if (!currentDashboard) return;
        
        // STEP 1: Remove widgets that are no longer detected (except system widgets)
        let widgets = currentDashboard.widgets.filter(w => 
          !toRemove.has(w.id) || w.isSystemWidget
        );
        
        // Deduplicate if needed
        const widgetIds = new Set(widgets.map(w => w.id));
        if (widgetIds.size !== widgets.length) {
          widgets = widgets.filter((w, i, arr) => arr.findIndex(x => x.id === w.id) === i);
        }
        
        // STEP 2: Add widgets for newly detected instances
        const existingWidgetIds = new Set(widgets.map(w => w.id));
        const instancesToAdd = allDetectedInstances.filter(inst => 
          toAdd.has(inst.id) && !existingWidgetIds.has(inst.id)
        );
        
        if (instancesToAdd.length > 0) {
          const now = Date.now();
          instancesToAdd.forEach(instance => {
            const newWidget: WidgetConfig = {
              id: instance.id,
              type: instance.type,
              title: instance.title,
              settings: {
                instanceId: instance.id,
                instanceType: instance.instanceType,
                ...(instance.location && { location: instance.location }),
              },
              layout: {
                id: instance.id,
                width: 2,
                height: 2,
                visible: true,
              },
              enabled: true,
              createdAt: now,
              lastDataUpdate: now,
            };
            
            widgets.push(newWidget);
          });
        }
        
        // Verify no duplicates in final array
        const finalWidgetIds = new Set(widgets.map(w => w.id));
        if (finalWidgetIds.size !== widgets.length) {
          widgets = widgets.filter((w, i, arr) => arr.findIndex(x => x.id === w.id) === i);
        }
        
        // Update dashboard and metrics atomically
        get().updateDashboard({ widgets });
        
        set((state) => ({
          currentWidgetIds: newWidgetIds,
          widgetUpdateMetrics: {
            ...state.widgetUpdateMetrics,
            totalUpdates: state.widgetUpdateMetrics.totalUpdates + 1,
            widgetsAdded: state.widgetUpdateMetrics.widgetsAdded + instancesToAdd.length,
            widgetsRemoved: state.widgetUpdateMetrics.widgetsRemoved + toRemove.size,
            lastUpdateTime: Date.now(),
          },
        }));
      },

      updateWidgetDataTimestamp: (widgetId: string, timestamp?: number) => {
        const now = timestamp || Date.now();
        const currentDashboard = get().dashboard;
        if (!currentDashboard) return;
        
        const widgetIndex = currentDashboard.widgets.findIndex(w => w.id === widgetId);
        if (widgetIndex === -1) return;
        
        const updatedWidgets = [...currentDashboard.widgets];
        updatedWidgets[widgetIndex] = {
          ...updatedWidgets[widgetIndex],
          lastDataUpdate: now
        };
        
        set((state) => ({
          dashboard: {
            ...state.dashboard,
            widgets: updatedWidgets
          }
        }));
      },

      resetAppToDefaults: async () => {
        // Cleanup widget registration system
        const { cleanupWidgetSystem, initializeWidgetSystem } = await import('../services/initializeWidgetSystem');
        cleanupWidgetSystem();

        // Create clean dashboard with only system widgets
        const now = Date.now();
        const systemWidgets = SYSTEM_WIDGETS.map(sw => ({
          id: sw.id,
          type: sw.type,
          title: sw.title,
          settings: {},
          layout: {
            id: sw.id,
            width: 2,
            height: 2,
            visible: true,
          },
          enabled: true,
          isSystemWidget: true,
          createdAt: now,
          lastDataUpdate: now,
        }));

        const resetDashboard: DashboardConfig = {
          id: 'default',
          name: 'Default Dashboard',
          widgets: systemWidgets,
        };

        // Reset store state to defaults
        set({
          dashboard: resetDashboard,
          editMode: false,
          gridVisible: false,
          widgetExpirationTimeout: 300000,
          enableWidgetAutoRemoval: true,
          currentWidgetIds: new Set(SYSTEM_WIDGETS.map(w => w.id)),
          widgetUpdateMetrics: {
            totalUpdates: 0,
            skippedUpdates: 0,
            widgetsAdded: 0,
            widgetsRemoved: 0,
            lastUpdateTime: 0,
          },
        });

        // Clear localStorage (fail silently if not available)
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem('widget-store');
          }
        } catch {
          // localStorage not available or blocked - continue without error
        }

        // Reinitialize widget system
        await new Promise(resolve => setTimeout(resolve, 100));
        initializeWidgetSystem();
      },
      
      // Dynamic widget lifecycle actions
      setWidgetExpirationTimeout: (timeoutMs: number) => {
        set({ widgetExpirationTimeout: timeoutMs });
      },

      setEnableWidgetAutoRemoval: (enabled: boolean) => {
        set({ enableWidgetAutoRemoval: enabled });
      },

      // Cleanup expired widgets
      cleanupExpiredWidgetsWithConfig: () => {
        const state = get();
        if (!state.enableWidgetAutoRemoval) return;

        const currentDashboard = state.dashboard;
        if (!currentDashboard) {
          return;
        }

        const now = Date.now();
        const timeout = state.widgetExpirationTimeout;
        const GRACE_PERIOD = 30000; // 30s hysteresis to prevent flapping
        let expiredCount = 0;
        
        // Filter expired widgets with grace period
        const updatedWidgets = currentDashboard.widgets.filter((widget) => {
          // 🛡️ System widgets are always protected
          if (widget.isSystemWidget) {
            return true;
          }

          // Use lastDataUpdate or createdAt, fall back to 0 (not 'now') to catch missing timestamps
          const lastUpdate = widget.lastDataUpdate || widget.createdAt || 0;
          const age = now - lastUpdate;
          const isExpired = age > (timeout + GRACE_PERIOD);
          
          if (isExpired) expiredCount++;
          
          return !isExpired;
        });

        // Early exit if no widgets expired
        if (expiredCount === 0) return;

        set({
          dashboard: {
            ...currentDashboard,
            widgets: updatedWidgets,
          },
        });
      },

    }),
    {
      name: 'widget-store',
      partialize: (state) => ({
        dashboard: state.dashboard,
        widgetExpirationTimeout: state.widgetExpirationTimeout,
        enableWidgetAutoRemoval: state.enableWidgetAutoRemoval,
        // Exclude: editMode, gridVisible, currentWidgetIds, widgetUpdateMetrics (transient)
      }),
    }
  )
);