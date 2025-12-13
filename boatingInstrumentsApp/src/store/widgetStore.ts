import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Dimensions } from 'react-native';
import type { DetectedInstance } from '../services/nmea/instanceDetection';
import { logger } from '../utils/logger';

// Master toggle for widgetStore logging (currently produces 68+ logs)
const ENABLE_WIDGET_STORE_LOGGING = false;
const log = (...args: any[]) => ENABLE_WIDGET_STORE_LOGGING && console.log('[WidgetStore]', ...args);
const warn = (...args: any[]) => ENABLE_WIDGET_STORE_LOGGING && console.warn('[WidgetStore]', ...args);

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
  order: number;
  // System widget protection
  isSystemWidget?: boolean;
  // Widget lifecycle timestamps
  createdAt?: number;        // When widget was created
  lastDataUpdate?: number;   // Last time widget received sensor data update
}

export interface DashboardConfig {
  id: string;
  name: string;
  widgets: WidgetConfig[];  // Array order determines position
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
  dashboard: DashboardConfig; // Single dashboard
  selectedWidgets: string[];
  editMode: boolean;
  gridVisible: boolean;
  
  // Widget expiration configuration
  widgetExpirationTimeout: number;
  enableWidgetAutoRemoval: boolean;
  
  // Phase 2 optimization: Track current widget IDs for fast comparison
  currentWidgetIds: Set<string>;
  
  // Phase 2 optimization: Performance metrics
  widgetUpdateMetrics: {
    totalUpdates: number;
    skippedUpdates: number;
    widgetsAdded: number;
    widgetsRemoved: number;
    lastUpdateTime: number;
  };
}

interface WidgetActions {
  // Core widget management (used)
  addWidget: (widgetType: string, position?: { x: number; y: number }, options?: { instance?: number, sensorSource?: string }) => void;
  updateWidget: (widgetId: string, updates: Partial<WidgetConfig>) => void;
  updateWidgetLayout: (widgetId: string, layout: Partial<WidgetLayout>) => void;
  updateWidgetSettings: (widgetId: string, settings: Record<string, any>) => void;
  reorderWidgets: (widgets: WidgetConfig[]) => void;  // Array reordering for drag-drop
  
  // UI state (used)
  setEditMode: (enabled: boolean) => void;
  setGridVisible: (visible: boolean) => void;
  updateDashboard: (updates: Partial<DashboardConfig>) => void;
  
  // Event-driven instance management (used)
  updateInstanceWidgets: (detectedInstances: { engines: DetectedInstance[]; batteries: DetectedInstance[]; tanks: DetectedInstance[]; temperatures: DetectedInstance[]; instruments: DetectedInstance[] }) => void;
  
  // Widget lifecycle (used)
  updateWidgetDataTimestamp: (widgetId: string, timestamp?: number) => void;
  setWidgetExpirationTimeout: (timeoutMs: number) => void;
  setEnableWidgetAutoRemoval: (enabled: boolean) => void;
  cleanupExpiredWidgetsWithConfig: () => void;
  
  // Runtime management (used)
  resetAppToDefaults: () => Promise<void>;
}

type WidgetStore = WidgetState & WidgetActions;

// FULLY DYNAMIC DASHBOARD - No static widgets, all based on detected NMEA data
// FULLY DYNAMIC DASHBOARD - No static widgets, all based on detected NMEA data
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
      order: -1000,
      isSystemWidget: true,
      createdAt: Date.now(),
      lastDataUpdate: Date.now(),
    },
    // All other widgets are now dynamically detected from NMEA messages:
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

// Preset system removed - event-driven widget discovery handles all use cases

// Phase 2 optimization: Set utility functions for widget ID comparison
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
      selectedWidgets: ['depth', 'speed', 'wind', 'gps', 'compass'],
      dashboard: defaultDashboard,
      editMode: false,
      gridVisible: false,
      widgetExpirationTimeout: 300000,  // 5 minutes
      enableWidgetAutoRemoval: true,
      
      // Phase 2 optimization: Initialize tracking structures
      currentWidgetIds: new Set(SYSTEM_WIDGETS.map(w => w.id)),
      widgetUpdateMetrics: {
        totalUpdates: 0,
        skippedUpdates: 0,
        widgetsAdded: 0,
        widgetsRemoved: 0,
        lastUpdateTime: Date.now()
      },

      // Actions
      addWidget: (widgetType, position = { x: 0, y: 0 }, options?: { instance?: number, sensorSource?: string }) => {
        const currentState = get();
        const currentDashboard = currentState.dashboard;
        
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
          const existingWidget = currentDashboard.widgets.find(w => w.type === widgetType);
          if (existingWidget) {
            warn(`[addWidget] Widget of type '${widgetType}' already exists: ${existingWidget.id}`);
            return; // Don't create duplicate single-instance widgets
          }
          widgetId = widgetType; // Simple ID for single-instance (depth, gps, speed, compass)
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
          order: currentState.selectedWidgets.length,
          createdAt: now,
          lastDataUpdate: now,
        };

        set((state) => ({
          dashboard: { ...state.dashboard, widgets: [...state.dashboard.widgets, widget] },
          selectedWidgets: [...state.selectedWidgets, widgetType],
        }));
      },

      removeWidget: (widgetId: string) =>
        set((state) => ({
          dashboard: {
            ...state.dashboard,
            widgets: state.dashboard.widgets.filter((w) => w.id !== widgetId),
          },
        })),

      updateWidget: (widgetId: string, updates: Partial<WidgetConfig>) =>
        set((state) => ({
          dashboard: {
            ...state.dashboard,
            widgets: state.dashboard.widgets.map((w) =>
              w.id === widgetId ? { ...w, ...updates } : w
            ),
          },
        })),

      updateWidgetLayout: (widgetId, layout) => {
        const widget = get().dashboard.widgets.find(w => w.id === widgetId);
        if (widget?.layout) {
          get().updateWidget(widgetId, { 
            layout: { ...widget.layout, ...layout } 
          });
        }
      },

      updateWidgetSettings: (widgetId, settings) =>
        get().updateWidget(widgetId, { settings }),

      setSelectedWidgets: (widgets: string[]) =>
        set({ selectedWidgets: widgets }),

      toggleWidget: (widgetType: string) =>
        set((state) => ({
          selectedWidgets: state.selectedWidgets.includes(widgetType)
            ? state.selectedWidgets.filter((w) => w !== widgetType)
            : [...state.selectedWidgets, widgetType],
        })),

      reorderWidgets: (widgets) =>
        set((state) => ({
          dashboard: { ...state.dashboard, widgets },
        })),

      setEditMode: (enabled) =>
        set({ editMode: enabled }),

      setGridVisible: (visible) =>
        set({ gridVisible: visible }),

      updateDashboard: (updates) => {
        if (__DEV__ && updates.widgets) {
          const current = get().dashboard;
          if (current.widgets.length !== updates.widgets.length) {
            const stack = new Error().stack;
            console.log('🔧 updateDashboard called - widget count changed:', {
              from: current.widgets.length,
              to: updates.widgets.length,
              caller: stack?.split('\n')[2]?.trim()
            });
          }
        }
        
        set((state) => ({
          dashboard: { ...state.dashboard, ...updates },
        }));
      },

      // Enhanced state management implementations
      // All positioning and manual instance methods removed:
      // - User positioning is automatic via array index
      // - Instance widgets managed via updateInstanceWidgets event-driven flow
      
      // Phase 2 optimization: Set helper functions
      // These are defined here to avoid polluting global scope

      updateInstanceWidgets: (detectedInstances) => {
        // Phase 2 CLEAN IMPLEMENTATION: Set-based widget diffing
        const metrics = get().widgetUpdateMetrics;
        metrics.totalUpdates++;
        
        // Guard: Don't process if ALL instance arrays are empty
        const totalInstances = detectedInstances.engines.length + 
                              detectedInstances.batteries.length +
                              detectedInstances.tanks.length +
                              detectedInstances.temperatures.length +
                              detectedInstances.instruments.length;
        
        if (totalInstances === 0) {
          metrics.skippedUpdates++;
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
          metrics.skippedUpdates++;
          return; // No changes
        }
        
        // Calculate Set diff: which widgets to add/remove
        const toAdd = setDifference(newWidgetIds, currentIds);
        const toRemove = setDifference(currentIds, newWidgetIds);
        
        // Phase 2: Clean Set-based implementation - NO legacy forEach loops
        const currentDashboard = get().dashboard;
        if (!currentDashboard) {
          return;
        }

        // Build instance metadata map for fast lookup during widget creation
        const instanceMetadata = new Map<string, { 
          title: string; 
          type: string; 
          instanceType: string;
          location?: string;
        }>();
        
        detectedInstances.engines.forEach(e => 
          instanceMetadata.set(e.id, { title: e.title, type: 'engine', instanceType: 'engine' }));
        detectedInstances.batteries.forEach(b => 
          instanceMetadata.set(b.id, { title: b.title, type: 'battery', instanceType: 'battery' }));
        detectedInstances.tanks.forEach(t => 
          instanceMetadata.set(t.id, { title: t.title, type: 'tanks', instanceType: 'tank' }));
        detectedInstances.temperatures.forEach(t => 
          instanceMetadata.set(t.id, { title: t.title, type: 'watertemp', instanceType: 'temperature', location: t.location }));
        detectedInstances.instruments.forEach(i => 
          instanceMetadata.set(i.id, { title: i.title, type: i.type, instanceType: 'instrument' }));
        
        // STEP 1: Remove widgets that are no longer detected (except system widgets)
        let widgets = currentDashboard.widgets.filter(w => 
          !toRemove.has(w.id) || w.isSystemWidget
        );
        
        // Verify no duplicates after removal
        const widgetIds = new Set(widgets.map(w => w.id));
        if (widgetIds.size !== widgets.length) {
          console.error('❌ [Phase 2] DUPLICATE WIDGETS AFTER REMOVAL:', {
            total: widgets.length,
            unique: widgetIds.size,
            duplicates: widgets.filter((w, i, arr) => arr.findIndex(x => x.id === w.id) !== i).map(w => w.id)
          });
          // Deduplicate: keep only first occurrence of each ID
          widgets = widgets.filter((w, i, arr) => arr.findIndex(x => x.id === w.id) === i);
        }
        
        // STEP 2: Add widgets for newly detected instances
        // CRITICAL: Recalculate toAdd after deduplication to exclude widgets that already exist
        const existingWidgetIds = new Set(widgets.map(w => w.id));
        const actualToAdd = new Set([...toAdd].filter(id => !existingWidgetIds.has(id)));
        
        if (actualToAdd.size > 0) {
          // Helper - not used since array position determines placement
          // Kept for compatibility with old addWidget signature
          const findNextPosition = () => ({ x: 0, y: 0 });
          
          // Create widgets for all instances in actualToAdd set
          actualToAdd.forEach(instanceId => {
            const metadata = instanceMetadata.get(instanceId);
            if (!metadata) {
              console.warn(`⚠️ [Phase 2] No metadata for instance: ${instanceId}`);
              return;
            }
            
            const now = Date.now();
            const newWidget: WidgetConfig = {
              id: instanceId,
              type: metadata.type as any,
              title: metadata.title,
              settings: {
                instanceId,
                instanceType: metadata.instanceType,
                ...(metadata.location && { location: metadata.location }),
              },
              layout: {
                id: instanceId,
                width: 2,
                height: 2,
                visible: true,
              },
              enabled: true,
              order: widgets.length,
              createdAt: now,
              lastDataUpdate: now,  // Initialize both timestamps to prevent race condition
            };
            
            widgets.push(newWidget);
          });
        }
        
        // Verify no duplicates in final array
        const finalWidgetIds = new Set(widgets.map(w => w.id));
        if (finalWidgetIds.size !== widgets.length) {
          console.error('❌ [Phase 2] DUPLICATE WIDGETS IN FINAL ARRAY:', {
            total: widgets.length,
            unique: finalWidgetIds.size,
            duplicates: widgets.filter((w, i, arr) => arr.findIndex(x => x.id === w.id) !== i).map(w => w.id)
          });
          // Deduplicate: keep only first occurrence of each ID
          widgets = widgets.filter((w, i, arr) => arr.findIndex(x => x.id === w.id) === i);
        }
        
        // Update metrics (use actualToAdd if it was calculated, otherwise toAdd)
        metrics.widgetsAdded += actualToAdd?.size || toAdd.size;
        metrics.widgetsRemoved += toRemove.size;
        metrics.lastUpdateTime = Date.now();
        
        // Update dashboard with new widget array
        get().updateDashboard({ widgets });
        
        // Phase 2 optimization: Update tracked widget IDs AFTER successful update
        set({ currentWidgetIds: newWidgetIds });
      },

      updateWidgetDataTimestamp: (widgetId: string, timestamp?: number) => {
        const now = timestamp || Date.now();
        const currentDashboard = get().dashboard;
        if (!currentDashboard) return;
        
        const widgetIndex = currentDashboard.widgets.findIndex(w => w.id === widgetId);
        if (widgetIndex === -1) {
          // Widget doesn't exist yet - this can happen if detection event fires
          // before widget creation completes. Not an error - widget will have
          // timestamp set during creation.
          log(`updateWidgetDataTimestamp: Widget ${widgetId} not found (may not be created yet)`);
          return;
        }
        
        // Update lastDataUpdate timestamp
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
        
        log(`Updated timestamp for widget ${widgetId}`);
      },

      resetAppToDefaults: async () => {
        log('[WidgetStore] Factory reset initiated');
        
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
            x: 0,
            y: 0,
            width: 2,
            height: 2,
            visible: true,
          },
          enabled: true,
          order: -1000,
          isSystemWidget: true,
          createdAt: now,
          lastDataUpdate: now,  // System widgets never expire
        }));

        const resetDashboard: DashboardConfig = {
          id: 'default',
          name: 'Default Dashboard',
          widgets: systemWidgets,
          gridSize: 20,
          snapToGrid: true,
          columns: 12,
          rows: 8,
        };

        // Reset store state to defaults
        set({
          selectedWidgets: [],
          dashboard: resetDashboard,
          editMode: false,
          gridVisible: false,
          widgetExpirationTimeout: 300000,  // 5 minutes - appropriate for intermittent marine data
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

        // Clear localStorage
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem('widget-store');
          }
        } catch (error) {
          console.error('[WidgetStore] Error clearing localStorage:', error);
        }

        // Reinitialize widget system
        await new Promise(resolve => setTimeout(resolve, 100));
        initializeWidgetSystem();

        log('[WidgetStore] Factory reset completed - dashboard reset to system widgets only');
      },
      
      // Dynamic widget lifecycle actions
      setWidgetExpirationTimeout: (timeoutMs: number) => {
        set({ widgetExpirationTimeout: timeoutMs });
        log(`[WidgetStore] Widget expiration timeout set to ${timeoutMs}ms`);
      },

      setEnableWidgetAutoRemoval: (enabled: boolean) => {
        set({ enableWidgetAutoRemoval: enabled });
        log(`[WidgetStore] Widget auto-removal ${enabled ? 'enabled' : 'disabled'}`);
      },

      // Enhanced cleanup system with configurable expiration
      cleanupExpiredWidgetsWithConfig: () => {
        const state = get();
        if (!state.enableWidgetAutoRemoval) {
          log('Widget auto-removal is disabled');
          return;
        }

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
          
          if (isExpired) {
            expiredCount++;
            log(`🗑️ Removing expired widget: ${widget.id} (no data for ${Math.round(age / 1000)}s)`);
          }
          
          return !isExpired;
        });

        // Early exit if no widgets expired - prevents unnecessary state updates
        if (expiredCount === 0) {
          return;
        }

        // Update selectedWidgets using the NEW filtered widget list (not stale currentState)
        const updatedSelectedWidgets = state.selectedWidgets.filter((widgetType) => {
          return updatedWidgets.some((widget) => widget.type === widgetType);
        });

        set({
          dashboard: {
            ...currentDashboard,
            widgets: updatedWidgets,
          },
          selectedWidgets: updatedSelectedWidgets,
        });

        log(`✅ Cleanup complete - removed ${expiredCount} expired widget(s)`);
      },

      // Pagination removed - array-based positioning calculates pages on-the-fly
    }),
    {
      name: 'widget-store',
      partialize: (state) => ({
        selectedWidgets: state.selectedWidgets,
        dashboard: state.dashboard,
      }),
    }
  )
);