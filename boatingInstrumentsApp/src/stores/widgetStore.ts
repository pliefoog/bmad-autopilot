import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  resetLayout: () => void;
  applyPreset: (presetId: string) => void;
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
        set((state) => ({
          dashboards: state.dashboards.map((dashboard) =>
            dashboard.id === state.currentDashboard
              ? {
                  ...dashboard,
                  widgets: dashboard.widgets.filter((w) => w.id !== widgetId),
                }
              : dashboard
          ),
        })),

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