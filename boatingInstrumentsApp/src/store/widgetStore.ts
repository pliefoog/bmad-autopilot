import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Dimensions } from 'react-native';
import { instanceDetectionService, type DetectedInstance } from '../services/nmea/instanceDetection';
import { logger } from '../utils/logger';

// Master toggle for widgetStore logging (currently produces 68+ logs)
const ENABLE_WIDGET_STORE_LOGGING = false;
const log = (...args: any[]) => ENABLE_WIDGET_STORE_LOGGING && log(...args);
const warn = (...args: any[]) => ENABLE_WIDGET_STORE_LOGGING && warn(...args);

// System widgets that must always be present and never expire
const SYSTEM_WIDGETS = [
  { id: 'theme', type: 'theme', title: 'Theme' }
];

export interface WidgetLayout {
  id: string;
  x: number;              // DEPRECATED: Legacy positioning
  y: number;              // DEPRECATED: Legacy positioning
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  locked?: boolean;
  visible?: boolean;
  // Array-based positioning: index in widgets array determines position
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
  // Positioning mode flag
  userPositioned?: boolean; // false = auto-discovery order, true = user-arranged with page/positionOrder
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
  presets: WidgetPreset[];
  
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
  updateDashboard: (updates: Partial<DashboardConfig>) => void;
  // Enhanced state management actions
  initializeWidgetStatesOnAppStart: () => void;
  resetLayout: () => void;
  applyPreset: (presetId: string) => void;
  // User-arranged positioning actions (Phase 3)
  enableUserPositioning: () => void;
  resetLayoutToAutoDiscovery: () => void;
  reorderWidget: (fromIndex: number, toIndex: number) => void;
  reorderWidgetsOnPage: (pageIndex: number, widgetIds: string[]) => void;
  moveWidgetToPage: (widgetId: string, targetPage: number, targetPosition: number) => void;
  compactPagePositions: (pageIndex: number) => void;
  redistributeWidgetsAcrossPages: () => void;
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
        x: 0,
        y: 0,
        width: 2,
        height: 2,
        visible: true,
      },
      enabled: true,
      order: -1000,
      isSystemWidget: true,
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
      availableWidgets: [
        'depth', 'speed', 'wind', 'gps', 'compass', 'engine', 
        'battery', 'tanks', 'autopilot', 'weather', 'navigation'
      ],
      selectedWidgets: ['depth', 'speed', 'wind', 'gps', 'compass'],
      dashboard: defaultDashboard,
      presets: defaultPresets,
      editMode: false,
      gridVisible: false,
      
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
        };

        set((state) => ({
          dashboard: { ...state.dashboard, widgets: [...state.dashboard.widgets, widget] },
          selectedWidgets: [...state.selectedWidgets, widgetType],
        }));
        
        // Clean up any invalid widgets after adding new ones
        setTimeout(() => get().cleanupOrphanedWidgets(), 100);
      },

      removeWidget: (widgetId) =>
        set((state) => ({
          dashboard: {
            ...state.dashboard,
            widgets: state.dashboard.widgets.filter((w) => w.id !== widgetId),
          },
        })),

      updateWidget: (widgetId, updates) =>
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
          dashboard: { ...state.dashboard, widgets },
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
      initializeWidgetStatesOnAppStart: () => {
        const state = get();
        let dashboard = state.dashboard;
        
        log('[WidgetStore] initializeWidgetStatesOnAppStart - Dashboard widgets:', {
          dashboardId: state.currentDashboard,
          widgetCount: dashboard?.widgets.length,
          widgetIds: dashboard?.widgets.map(w => w.id)
        });
        
        // 🛡️ SYSTEM WIDGET PROTECTION: Ensure system widgets are always present
        if (dashboard) {
          const existingWidgetIds = new Set(dashboard.widgets.map(w => w.id));
          const missingSystemWidgets = SYSTEM_WIDGETS.filter(sw => !existingWidgetIds.has(sw.id));
          
          if (missingSystemWidgets.length > 0) {
            log('[WidgetStore] 🛡️ Missing system widgets detected:', missingSystemWidgets.map(w => w.id));
            
            // Create system widget configs
            const systemWidgetConfigs = missingSystemWidgets.map((sw, index) => ({
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
              order: -1000 + index, // System widgets appear first
              isSystemWidget: true, // Mark as protected system widget
              createdAt: Date.now(),
            }));
            
            // Add missing system widgets at the start
            const updatedWidgets = [...systemWidgetConfigs, ...dashboard.widgets];
            get().updateDashboard({
              widgets: updatedWidgets
            });
            
            log('[WidgetStore] ✅ System widgets restored. Total widgets now:', updatedWidgets.length);
          }
          
          // Mark existing system widgets if not already marked
          const needsSystemWidgetFlag = dashboard.widgets.some(w => 
            SYSTEM_WIDGETS.some(sw => sw.id === w.id) && !w.isSystemWidget
          );
          
          if (needsSystemWidgetFlag) {
            log('[WidgetStore] 🔧 Marking existing system widgets');
            const updatedWidgets = dashboard.widgets.map(widget => {
              if (SYSTEM_WIDGETS.some(sw => sw.id === widget.id)) {
                return { ...widget, isSystemWidget: true };
              }
              return widget;
            });
            get().updateDashboard({
              widgets: updatedWidgets
            });
          }
        }
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

        get().updateDashboard({ widgets: resetWidgets });
      },

      applyPreset: (presetId) => {
        const preset = get().presets.find((p) => p.id === presetId);
        if (!preset) return;

        const widgets = preset.widgets.map((w, index) => ({
          ...w,
          id: `${w.type}-${Date.now()}-${index}`,
          layout: { ...w.layout, id: `${w.type}-${Date.now()}-${index}` },
        }));

        get().updateDashboard({ widgets });
        set({ selectedWidgets: widgets.map((w) => w.type) });
      },

      // User-arranged positioning actions (Phase 3: Drag-and-Drop)
      enableUserPositioning: () => {
        const state = get();
        const dashboard = state.dashboard;
        if (!dashboard || dashboard.userPositioned) return;

        log('[WidgetStore] 🎯 Enabling user positioning mode');
        
        // Switch to user-arranged mode
        get().updateDashboard({
          userPositioned: true
        });
      },

      resetLayoutToAutoDiscovery: () => {
        const state = get();
        const dashboard = state.dashboard;
        if (!dashboard) return;

        log('[WidgetStore] 🔄 Resetting to auto-discovery layout');
        
        // Switch back to auto-discovery mode (array stays as-is)
        get().updateDashboard({
          userPositioned: false
        });
      },

      // Simple array-based widget reordering using global indices
      reorderWidget: (fromIndex: number, toIndex: number) => {
        const state = get();
        const dashboard = state.dashboard;
        if (!dashboard) return;

        log(`[WidgetStore] 🔄 Reordering widget: index ${fromIndex} → ${toIndex}`);
        
        // Pure array splice
        const widgets = [...dashboard.widgets];
        const [movedWidget] = widgets.splice(fromIndex, 1);
        widgets.splice(toIndex, 0, movedWidget);
        
        log(`[WidgetStore] ✅ Moved widget ${movedWidget.id} from ${fromIndex} to ${toIndex}`);
        log(`[WidgetStore] New array:`, widgets.map((w, i) => `${i}:${w.id}`).join(', '));
        
        get().updateDashboard({
          widgets,
          userPositioned: true,
        });
      },

      reorderWidgetsOnPage: (pageIndex, widgetIds) => {
        const state = get();
        const dashboard = state.dashboard;
        if (!dashboard) return;

        log(`[WidgetStore] 📝 Reordering ${widgetIds.length} widgets on page ${pageIndex}`);
        log(`[WidgetStore] New order:`, widgetIds);
        
        // Calculate widgets per page based on current grid
        const { width } = Dimensions.get('window');
        const columns = width < 600 ? 1 : width < 768 ? 2 : width < 1024 ? 3 : width < 1280 ? 5 : width < 1920 ? 6 : 8;
        const rows = 4;
        const widgetsPerPage = columns * rows;
        
        // Get current page range in the full array
        const pageStartIndex = pageIndex * widgetsPerPage;
        const pageEndIndex = pageStartIndex + widgetIds.length;
        
        log(`[WidgetStore] Page ${pageIndex} range: ${pageStartIndex} to ${pageEndIndex}`);
        
        // Build new array by replacing the page range with reordered widgets
        const widgetIdSet = new Set(widgetIds);
        const reorderedWidgets = widgetIds
          .map(id => dashboard.widgets.find(w => w.id === id))
          .filter((w): w is WidgetConfig => w !== undefined);
        
        // Build new array: before page + reordered page + after page
        const newWidgets = [
          ...dashboard.widgets.slice(0, pageStartIndex),
          ...reorderedWidgets,
          ...dashboard.widgets.slice(pageEndIndex)
        ];
        
        log(`[WidgetStore] ✅ Reordered ${reorderedWidgets.length} widgets at page ${pageIndex}`);
        log(`[WidgetStore] Widget IDs in new array:`, newWidgets.map(w => w.id));
        
        get().updateDashboard({
          widgets: newWidgets
        });
      },

      moveWidgetToPage: (widgetId, targetPage, targetPosition) => {
        const state = get();
        const dashboard = state.dashboard;
        if (!dashboard) return;

        log(`[WidgetStore] 🔀 Moving widget ${widgetId} to page ${targetPage}, position ${targetPosition}`);
        
        // Calculate absolute index from page + position
        // widgetsPerPage is calculated from grid config in DynamicLayoutService
        const { width } = Dimensions.get('window');
        const columns = width < 600 ? 1 : width < 768 ? 2 : width < 1024 ? 3 : width < 1280 ? 5 : width < 1920 ? 6 : 8;
        const rows = 4;
        const widgetsPerPage = columns * rows;
        const targetIndex = targetPage * widgetsPerPage + targetPosition;
        
        // Remove widget from current position
        const widgets = [...dashboard.widgets];
        const currentIndex = widgets.findIndex(w => w.id === widgetId);
        if (currentIndex === -1) return;
        
        const [movedWidget] = widgets.splice(currentIndex, 1);
        
        // Insert at target index
        widgets.splice(Math.min(targetIndex, widgets.length), 0, movedWidget);
        
        get().updateDashboard({
          widgets
        });
      },

      compactPagePositions: (pageIndex) => {
        // No-op: Array-based positioning is inherently compact
        // Index in array IS the position - no gaps possible
        log(`[WidgetStore] 🗜️ Compact requested for page ${pageIndex} - skipped (array-based positioning)`);
      },

      redistributeWidgetsAcrossPages: () => {
        // No-op: Array-based positioning automatically redistributes
        // Page is calculated on-the-fly from index: Math.floor(index / widgetsPerPage)
        // No need to update metadata - array order is the source of truth
        log('[WidgetStore] 📐 Redistribute requested - skipped (array-based positioning calculates pages on-the-fly)');
      },

      // Instance widget management methods
      createInstanceWidget: (instanceId, instanceType, title, position) => {
        const widgetId = `${instanceType}-${instanceId}`;
        
        // Check if widget already exists
        const currentDashboard = get().dashboard;
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

        get().updateDashboard({
          widgets: [...currentDashboard.widgets, newWidget]
        });
      },

      removeInstanceWidget: (instanceId) => {
        const currentDashboard = get().dashboard;
        if (!currentDashboard) return;

        // Remove widgets that match any instance type for this instanceId
        const filteredWidgets = currentDashboard.widgets.filter(w => 
          !w.settings?.instanceId || w.settings.instanceId !== instanceId
        );

        get().updateDashboard({
          widgets: filteredWidgets
        });
      },
      
      // Phase 2 optimization: Set helper functions
      // These are defined here to avoid polluting global scope

      updateInstanceWidgets: (detectedInstances) => {
        // Phase 2 CLEAN IMPLEMENTATION: Set-based widget diffing
        const metrics = get().widgetUpdateMetrics;
        metrics.totalUpdates++;
        
        console.log('🔧 [Phase 2] Widget update triggered:', {
          engines: detectedInstances.engines.length,
          batteries: detectedInstances.batteries.length,
          tanks: detectedInstances.tanks.length,
          temperatures: detectedInstances.temperatures.length,
          instruments: detectedInstances.instruments.length,
        });
        
        // Guard: Don't process if ALL instance arrays are empty
        const totalInstances = detectedInstances.engines.length + 
                              detectedInstances.batteries.length +
                              detectedInstances.tanks.length +
                              detectedInstances.temperatures.length +
                              detectedInstances.instruments.length;
        
        if (totalInstances === 0) {
          console.warn('⚠️ [Phase 2] No instances detected - skipping to prevent widget removal');
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
        
        console.log(`📊 [Phase 2] Required widgets: ${newWidgetIds.size} (${totalInstances} instances + ${SYSTEM_WIDGETS.length} system)`);
        
        // Early exit: No changes detected
        const currentIds = get().currentWidgetIds;
        
        console.log(`🔍 [Phase 2] Set comparison:`, {
          currentIdsSize: currentIds.size,
          newIdsSize: newWidgetIds.size,
          currentIds: Array.from(currentIds).sort(),
          newIds: Array.from(newWidgetIds).sort(),
          areEqual: setsEqual(currentIds, newWidgetIds)
        });
        
        if (setsEqual(currentIds, newWidgetIds)) {
          metrics.skippedUpdates++;
          console.log(`✅ [Phase 2] SKIPPED - No widget changes detected`);
          
          // Log efficiency every 100 updates
          if (metrics.totalUpdates % 100 === 0) {
            const efficiency = ((metrics.skippedUpdates / metrics.totalUpdates) * 100).toFixed(1);
            console.log(`📈 [Phase 2] Efficiency: ${efficiency}% skipped (${metrics.totalUpdates} total, +${metrics.widgetsAdded}/-${metrics.widgetsRemoved})`);
          }
          
          return; // No changes
        }
        
        // Calculate Set diff: which widgets to add/remove
        const toAdd = setDifference(newWidgetIds, currentIds);
        const toRemove = setDifference(currentIds, newWidgetIds);
        
        console.log(`🔄 [Phase 2] Widget diff: +${toAdd.size} to add, -${toRemove.size} to remove`);
        
        // Phase 2: Clean Set-based implementation - NO legacy forEach loops
        const currentDashboard = get().dashboard;
        if (!currentDashboard) {
          console.error('❌ [Phase 2] No dashboard found');
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
        
        console.log(`📊 [Phase 2] Instance metadata map: ${instanceMetadata.size} entries`);
        
        // STEP 1: Remove widgets that are no longer detected (except system widgets)
        let widgets = currentDashboard.widgets.filter(w => 
          !toRemove.has(w.id) || w.isSystemWidget
        );
        
        if (toRemove.size > 0) {
          console.log(`🗑️ [Phase 2] Removing ${toRemove.size} widgets:`, Array.from(toRemove));
        }
        
        // STEP 2: Add widgets for newly detected instances
        
        if (toAdd.size > 0) {
          console.log(`➕ [Phase 2] Adding ${toAdd.size} widgets:`, Array.from(toAdd));
          
          // Helper to find next available position
          const findNextPosition = () => {
            const maxX = Math.max(0, ...widgets.map(w => w.layout.x + w.layout.width));
            const maxY = Math.max(0, ...widgets.map(w => w.layout.y + w.layout.height));
            return { x: maxX > 8 ? 0 : maxX, y: maxX > 8 ? maxY : 0 };
          };
          
          // Create widgets for all instances in toAdd set
          toAdd.forEach(instanceId => {
            const metadata = instanceMetadata.get(instanceId);
            if (!metadata) {
              console.warn(`⚠️ [Phase 2] No metadata for instance: ${instanceId}`);
              return;
            }
            
            const position = findNextPosition();
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
                x: position.x,
                y: position.y,
                width: 2,
                height: 2,
                visible: true,
              },
              enabled: true,
              order: widgets.length,
            };
            
            widgets.push(newWidget);
            console.log(`  ✅ Created ${metadata.type} widget: ${instanceId}`);
          });
        }
        
        console.log(`🎯 [Phase 2] Final dashboard: ${widgets.length} widgets (was ${currentDashboard.widgets.length})`);
        
        // Update metrics
        metrics.widgetsAdded += toAdd.size;
        metrics.widgetsRemoved += toRemove.size;
        metrics.lastUpdateTime = Date.now();
        
        // Update dashboard with new widget array
        get().updateDashboard({ widgets });
        
        // Phase 2 optimization: Update tracked widget IDs AFTER successful update
        set({ currentWidgetIds: newWidgetIds });
        
        // Log efficiency metrics every 100 updates
        if (metrics.totalUpdates % 100 === 0) {
          const efficiency = ((metrics.skippedUpdates / metrics.totalUpdates) * 100).toFixed(1);
          console.log(`📊 [Phase 2] Widget update efficiency: ${efficiency}% skipped (${metrics.totalUpdates} total, +${metrics.widgetsAdded}/-${metrics.widgetsRemoved} changes)`);
        }
        
        log('[WidgetStore] Dashboard updated with new widgets');
      },

      startInstanceMonitoring: () => {
        log('[WidgetStore] Starting instance monitoring...');
        
        // Subscribe to instance detection updates
        instanceDetectionService.onInstancesDetected((detectedInstances) => {
          log('[WidgetStore] Instances detected callback triggered:', {
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

        log('[WidgetStore] Instance monitoring started with automatic cleanup');
      },

      stopInstanceMonitoring: () => {
        instanceDetectionService.stopScanning();
      },

      cleanupOrphanedWidgets: () => {
        log('[WidgetStore] 🧹 cleanupOrphanedWidgets TRIGGERED');
        const currentDashboard = get().dashboard;
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
        // NOTE: Only remove if instance has been missing for a significant time to avoid
        // removing widgets during temporary NMEA dropouts
        const orphanedInstanceWidgets = currentDashboard.widgets.filter(widget => {
          if (!widget.settings?.instanceId || !widget.settings?.instanceType) return false;
          const isOrphaned = !activeInstanceIds.has(widget.settings.instanceId);
          if (isOrphaned && __DEV__) {
            console.warn(`⚠️ Orphaned instance widget detected: ${widget.id} (instanceId: ${widget.settings.instanceId})`);
          }
          // TODO: Add timestamp-based cleanup - only remove after 5+ minutes missing
          return false; // DISABLED: Don't auto-remove instance widgets for now
        });

        // Find invalid registry widgets (widgets that don't exist in the widget registry)
        const invalidRegistryWidgets = currentDashboard.widgets.filter(widget => {
          // Skip system widgets - they don't need to be in the registry
          if (widget.isSystemWidget) {
            return false;
          }
          
          try {
            // Import WidgetFactory to check if widget can be resolved
            const { WidgetFactory } = require('../services/WidgetFactory');
            const parseResult = WidgetFactory.parseWidgetId(widget.id);
            
            // Check if widget is resolvable via WidgetFactory
            const metadata = WidgetFactory.getWidgetMetadata(widget.id);
            
            if (!metadata) {
              log(`[WidgetStore] ⚠️ Invalid registry widget (no metadata): ${widget.id} (baseType: ${parseResult.baseType})`);
              return true; // Widget is invalid
            }
            
            return false; // Widget is valid
          } catch (error) {
            // Widget cannot be resolved - it's invalid
            const errorMessage = error instanceof Error ? error.message : String(error);
            log(`[WidgetStore] ⚠️ Invalid registry widget (parse error): ${widget.id} - ${errorMessage}`);
            return true;
          }
        });

        // Find timestamp-based widget IDs (legacy from preset/duplication operations)
        const timestampBasedWidgets = currentDashboard.widgets.filter(widget => {
          const isTimestampBased = /^[a-z]+-[0-9]{13}-[0-9]+$/.test(widget.id); // Pattern: type-timestamp-index
          if (isTimestampBased) {
            log(`[WidgetStore] ⚠️ Timestamp-based widget found: ${widget.id}`);
          }
          return isTimestampBased;
        });

        if (invalidRegistryWidgets.length > 0) {
          log(`[WidgetStore] 🗑️ cleanupOrphanedWidgets found ${invalidRegistryWidgets.length} invalid registry widgets:`, invalidRegistryWidgets.map(w => w.id));
        }
        if (timestampBasedWidgets.length > 0) {
          log(`[WidgetStore] 🗑️ cleanupOrphanedWidgets found ${timestampBasedWidgets.length} timestamp-based widgets:`, timestampBasedWidgets.map(w => w.id));
        }

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
          log(`[WidgetStore] Cleaning up ${uniqueOrphanedWidgets.length} orphaned widgets:`, 
            uniqueOrphanedWidgets.map(w => `${w.id} (${w.type})`));
          
          // Remove orphaned widgets
          const cleanWidgets = currentDashboard.widgets.filter(widget => 
            !uniqueOrphanedWidgets.some(orphan => orphan.id === widget.id)
          );

          get().updateDashboard({
            widgets: cleanWidgets
          });
        }
      },

      getInstanceWidgetMetrics: () => {
        const currentDashboard = get().dashboard;
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
        
        log('[WidgetStore] Force cleanup completed for instances and widgets');
      },

      resetAppToDefaults: async () => {
        log('[WidgetStore] Executing factory reset...');

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
            log('[WidgetStore] Cleared localStorage keys:', keysToRemove);
            
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
              widgets: [
                // 🛡️ SYSTEM WIDGET: ThemeWidget is always present
                {
                  id: 'theme',
                  type: 'theme',
                  title: 'Theme',
                  settings: {},
                  layout: {
                    id: 'theme',
                    x: 0,
                    y: 0,
                    width: 2,
                    height: 2,
                    visible: true,
                  },
                  enabled: true,
                  order: -1000,
                  isSystemWidget: true,
                  createdAt: Date.now(),
                },
              ],
              gridSize: 20,
              snapToGrid: true,
              columns: 12,
              rows: 8,
            }
          ],
          presets: [],
          editMode: false,
          gridVisible: false,
          // Dynamic widget lifecycle configuration
          widgetExpirationTimeout: 60000,
          enableWidgetAutoRemoval: true,
        };

        // Apply the reset state - this will trigger persist middleware to save the clean state
        set(initialState);

        // Force a small delay to let persist middleware complete
        await new Promise(resolve => setTimeout(resolve, 100));

        // 🛡️ CRITICAL: Restore system widgets after reset
        log('[WidgetStore] Restoring system widgets after factory reset...');
        get().initializeWidgetStatesOnAppStart();

        // Double-check that localStorage is cleared after state reset
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem('widget-store');
            log('[WidgetStore] Double-cleared widget-store key after state reset');
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

        log('[WidgetStore] Factory reset completed');
        
        // Final verification - log current state after reset
        const finalState = get();
        log('[WidgetStore] Final state after reset:', {
          selectedWidgets: finalState.selectedWidgets,
          dashboards: finalState.dashboards,
          currentDashboard: finalState.currentDashboard
        });
      },
      
      // Emergency reset method that completely bypasses persist middleware
      emergencyReset: () => {
        log('[WidgetStore] EMERGENCY RESET - Bypassing persist middleware');
        
        // Clear localStorage aggressively
        if (typeof window !== 'undefined' && window.localStorage) {
          // Clear absolutely everything widget-related
          const allKeys = Object.keys(window.localStorage);
          allKeys.forEach(key => {
            if (key.includes('widget') || key.includes('dashboard') || key.includes('bmad')) {
              window.localStorage.removeItem(key);
              log(`[WidgetStore] Emergency cleared: ${key}`);
            }
          });
          
          // Also clear the persist key
          window.localStorage.removeItem('widget-store');
        }
        
        // Force page reload to completely reset all stores
        if (typeof window !== 'undefined') {
          log('[WidgetStore] Forcing page reload to complete reset');
          window.location.reload();
        }
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
          log('[WidgetStore] Widget auto-removal is disabled');
          return;
        }

        const now = Date.now();
        const timeout = state.widgetExpirationTimeout;
        
        // First pass: check if any widgets are actually expired
        let hasExpiredWidgets = false;
        const expiredWidgetIds: string[] = [];
        
        for (const dashboard of state.dashboards) {
          for (const widget of dashboard.widgets) {
            // 🛡️ Skip system widgets - they never expire
            if (widget.isSystemWidget) {
              continue;
            }
            
            const lastUpdate = widget.lastDataUpdate || widget.createdAt || now;
            const isExpired = now - lastUpdate > timeout;
            
            if (isExpired) {
              hasExpiredWidgets = true;
              expiredWidgetIds.push(widget.id);
            }
          }
        }
        
        // Only update store if we actually have expired widgets
        if (!hasExpiredWidgets) {
          return;
        }
        
        log(`[WidgetStore] 🧹 Found ${expiredWidgetIds.length} expired widgets:`, expiredWidgetIds);

        // Second pass: remove expired widgets
        set((currentState) => ({
          dashboards: currentState.dashboards.map((dashboard) => {
            const updatedWidgets = dashboard.widgets.filter((widget) => {
              // 🛡️ System widgets are always protected
              if (widget.isSystemWidget) {
                return true;
              }

              const lastUpdate = widget.lastDataUpdate || widget.createdAt || now;
              const isExpired = now - lastUpdate > timeout;
              
              if (isExpired) {
                log(`[WidgetStore] 🗑️ Removing expired widget: ${widget.id} (no data for ${Math.round((now - lastUpdate) / 1000)}s)`);
              }
              
              return !isExpired;
            });

            // Array-based positioning: removal automatically compacts (index = position)
            log(`[WidgetStore] ✅ Updated widget array: ${updatedWidgets.length} widgets remaining`);

            return {
              ...dashboard,
              widgets: updatedWidgets,
            };
          }),
          selectedWidgets: currentState.selectedWidgets.filter((widgetType) => {
            // Keep widget type if any widget of that type still exists after cleanup
            return currentState.dashboards.some((dashboard) =>
              dashboard.widgets.some((widget) => widget.type === widgetType && 
                (widget.isSystemWidget || now - (widget.lastDataUpdate || widget.createdAt || now) <= timeout))
            );
          }),
        }));

        log(`[WidgetStore] ✅ Cleanup complete - removed ${expiredWidgetIds.length} widgets`);
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
        dashboard: state.dashboard,
      }),
    }
  )
);