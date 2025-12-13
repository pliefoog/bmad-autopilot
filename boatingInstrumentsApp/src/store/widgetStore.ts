import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DetectedInstance } from '../services/nmea/instanceDetection';

// System widgets that must always be present and never expire
const SYSTEM_WIDGETS = [
  { id: 'theme', type: 'theme', title: 'Theme' }
];

export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  settings: Record<string, any>;
  isSystemWidget?: boolean;
  createdAt?: number;
  lastDataUpdate?: number;
}

export interface DashboardConfig {
  widgets: WidgetConfig[];
}

interface WidgetState {
  dashboard: DashboardConfig;
  widgetExpirationTimeout: number;
  enableWidgetAutoRemoval: boolean;
  currentWidgetIds: Set<string>;
}

interface WidgetActions {
  updateInstanceWidgets: (detectedInstances: { engines: DetectedInstance[]; batteries: DetectedInstance[]; tanks: DetectedInstance[]; temperatures: DetectedInstance[]; instruments: DetectedInstance[] }) => void;
  updateWidgetDataTimestamp: (widgetId: string, timestamp?: number) => void;
  setWidgetExpirationTimeout: (timeoutMs: number) => void;
  setEnableWidgetAutoRemoval: (enabled: boolean) => void;
  cleanupExpiredWidgetsWithConfig: () => void;
  resetAppToDefaults: () => Promise<void>;
}

type WidgetStore = WidgetState & WidgetActions;

const defaultDashboard: DashboardConfig = {
  widgets: [
    {
      id: 'theme',
      type: 'theme',
      title: 'Theme',
      settings: {},
      isSystemWidget: true,
      createdAt: Date.now(),
      lastDataUpdate: Date.now(),
    },
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
      dashboard: defaultDashboard,
      widgetExpirationTimeout: 300000,
      enableWidgetAutoRemoval: true,
      currentWidgetIds: new Set(SYSTEM_WIDGETS.map(w => w.id)),

      updateInstanceWidgets: (detectedInstances) => {
        // Set-based widget diffing for efficient updates
        
        // Guard: Don't process if ALL instance arrays are empty
        const totalInstances = detectedInstances.engines.length + 
                              detectedInstances.batteries.length +
                              detectedInstances.tanks.length +
                              detectedInstances.temperatures.length +
                              detectedInstances.instruments.length;
        
        if (totalInstances === 0) return;
        
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
        
        if (setsEqual(currentIds, newWidgetIds)) return;
        
        // Calculate Set diff: which widgets to add/remove
        const toAdd = setDifference(newWidgetIds, currentIds);
        const toRemove = setDifference(currentIds, newWidgetIds);
        
        const currentDashboard = get().dashboard;
        if (!currentDashboard) return;
        
        // STEP 1: Remove widgets that are no longer detected (except system widgets)
        let widgets = currentDashboard.widgets.filter(w => 
          !toRemove.has(w.id) || w.isSystemWidget
        );
        
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
                ...(instance.instance !== undefined && { instance: instance.instance }),
                ...(instance.location && { location: instance.location }),
                ...(instance.fluidType && { fluidType: instance.fluidType }),
              },
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
        
        set({ 
          dashboard: { widgets },
          currentWidgetIds: newWidgetIds 
        });
      },

      updateWidgetDataTimestamp: (widgetId: string, timestamp?: number) =>
        set((state) => {
          const widgetIndex = state.dashboard.widgets.findIndex(w => w.id === widgetId);
          if (widgetIndex === -1) return state;
          
          const widgets = [...state.dashboard.widgets];
          widgets[widgetIndex] = {
            ...widgets[widgetIndex],
            lastDataUpdate: timestamp || Date.now()
          };
          
          return { dashboard: { widgets } };
        }),

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
          isSystemWidget: true,
          createdAt: now,
          lastDataUpdate: now,
        }));

        const resetDashboard: DashboardConfig = {
          widgets: systemWidgets,
        };

        set({
          dashboard: resetDashboard,
          widgetExpirationTimeout: 300000,
          enableWidgetAutoRemoval: true,
          currentWidgetIds: new Set(SYSTEM_WIDGETS.map(w => w.id)),
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
        const GRACE_PERIOD = 30000;
        
        const updatedWidgets = currentDashboard.widgets.filter((widget) => {
          if (widget.isSystemWidget) return true;
          const lastUpdate = widget.lastDataUpdate || widget.createdAt || 0;
          const age = now - lastUpdate;
          return age <= (timeout + GRACE_PERIOD);
        });

        if (updatedWidgets.length === currentDashboard.widgets.length) return;

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
      }),
    }
  )
);