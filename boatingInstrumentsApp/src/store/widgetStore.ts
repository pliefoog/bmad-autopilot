import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DetectedWidgetInstance } from '../services/WidgetRegistrationService';

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
  updateInstanceWidgets: (detectedInstances: DetectedWidgetInstance[]) => void;
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
        console.log(`🔧 [WidgetStore] updateInstanceWidgets called with ${detectedInstances.length} instances`);
        console.log(`🔧 [WidgetStore] Instances:`, detectedInstances.map(i => i.id).join(', '));
        
        // Guard: Don't process if no instances detected
        if (detectedInstances.length === 0) {
          console.log('⚠️ [WidgetStore] No instances to process');
          return;
        }
        
        const newWidgetIds = new Set<string>([
          ...SYSTEM_WIDGETS.map(w => w.id), // Always include system widgets
          ...detectedInstances.map(inst => inst.id)
        ]);
        
        console.log(`🔧 [WidgetStore] newWidgetIds:`, Array.from(newWidgetIds).join(', '));
        
        // Early exit: No changes detected
        const currentIds = get().currentWidgetIds;
        console.log(`🔧 [WidgetStore] currentIds:`, Array.from(currentIds).join(', '));
        
        if (setsEqual(currentIds, newWidgetIds)) {
          console.log('🔧 [WidgetStore] Sets are equal, no changes needed');
          return;
        }
        
        // Calculate Set diff: which widgets to add/remove
        const toAdd = setDifference(newWidgetIds, currentIds);
        const toRemove = setDifference(currentIds, newWidgetIds);
        
        console.log(`🔧 [WidgetStore] toAdd (${toAdd.size}):`, Array.from(toAdd).join(', '));
        console.log(`🔧 [WidgetStore] toRemove (${toRemove.size}):`, Array.from(toRemove).join(', '));
        
        const currentDashboard = get().dashboard;
        if (!currentDashboard) return;
        
        // STEP 1: Remove widgets that are no longer detected (except system widgets)
        let widgets = currentDashboard.widgets.filter(w => 
          !toRemove.has(w.id) || w.isSystemWidget
        );
        
        // STEP 2: Add widgets for newly detected instances
        const existingWidgetIds = new Set(widgets.map(w => w.id));
        const instancesToAdd = detectedInstances.filter(inst => 
          toAdd.has(inst.id) && !existingWidgetIds.has(inst.id)
        );
        
        if (instancesToAdd.length > 0) {
          const now = Date.now();
          instancesToAdd.forEach(instance => {
            const newWidget: WidgetConfig = {
              id: instance.id,
              type: instance.widgetType, // DetectedWidgetInstance uses widgetType not type
              title: instance.title,
              settings: {
                instanceId: instance.id,
                ...(instance.instance !== undefined && { instance: instance.instance }),
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
        // Step 1: Cleanup widget registration system first
        const { cleanupWidgetSystem, initializeWidgetSystem } = await import('../services/initializeWidgetSystem');
        cleanupWidgetSystem();

        // Step 2: Clear localStorage (fail silently if not available)
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem('widget-store');
          }
        } catch {
          // localStorage not available or blocked - continue without error
        }

        // Step 3: Create clean dashboard with only system widgets
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

        // Step 4: Reset state synchronously (no delay)
        set({
          dashboard: resetDashboard,
          widgetExpirationTimeout: 300000,
          enableWidgetAutoRemoval: true,
          currentWidgetIds: new Set(SYSTEM_WIDGETS.map(w => w.id)),
        });

        // Step 5: Reinitialize widget system immediately (synchronous)
        // Use Promise.resolve().then() to defer to next microtask but keep it fast
        await Promise.resolve();
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