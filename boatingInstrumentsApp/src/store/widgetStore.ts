import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { log } from '../utils/logging/logger';
import type { DetectedWidgetInstance } from '../services/WidgetRegistrationService';

// System widgets that must always be present and never expire
const SYSTEM_WIDGETS = [{ id: 'theme', type: 'theme', title: 'Theme' }];

export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  settings: Record<string, any>;
  isSystemWidget?: boolean;
  createdAt?: number;
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
  return new Set([...a].filter((x) => !b.has(x)));
}

export const useWidgetStore = create<WidgetStore>()(
  devtools(
    persist(
      (set, get) => ({
        dashboard: defaultDashboard,
        widgetExpirationTimeout: 300000,
        enableWidgetAutoRemoval: true,
        currentWidgetIds: new Set(SYSTEM_WIDGETS.map((w) => w.id)),

        updateInstanceWidgets: (detectedInstances) => {
          // Set-based widget diffing for efficient updates
          // Guard: Don't process if no instances detected
          if (detectedInstances.length === 0) {
            return;
          }

          const newWidgetIds = new Set<string>([
            ...SYSTEM_WIDGETS.map((w) => w.id), // Always include system widgets
            ...detectedInstances.map((inst) => inst.id),
          ]);

          // Early exit: No changes detected
          const currentIds = get().currentWidgetIds;

          if (setsEqual(currentIds, newWidgetIds)) {
            return;
          }

          // Calculate Set diff: which widgets to add/remove
          const toAdd = setDifference(newWidgetIds, currentIds);
          const toRemove = setDifference(currentIds, newWidgetIds);

          const currentDashboard = get().dashboard;
          if (!currentDashboard) return;

          // STEP 1: Remove widgets that are no longer detected (except system widgets)
          let widgets = currentDashboard.widgets.filter(
            (w) => !toRemove.has(w.id) || w.isSystemWidget,
          );

          // STEP 2: Add widgets for newly detected instances
          const existingWidgetIds = new Set(widgets.map((w) => w.id));
          
          const instancesToAdd = detectedInstances.filter(
            (inst) => toAdd.has(inst.id) && !existingWidgetIds.has(inst.id),
          );

          // STEP 2.5: Update existing widgets that are missing customDefinition
          // Only check if we have widgets to potentially update
          let widgetsModified = false;
          detectedInstances.forEach((instance) => {
            if (instance.widgetConfig && existingWidgetIds.has(instance.id)) {
              const existingWidget = widgets.find(w => w.id === instance.id);
              if (existingWidget && !existingWidget.settings?.customDefinition && 
                  instance.widgetConfig.settings?.customDefinition) {
                // Replace the widget entirely (don't mutate)
                const widgetIndex = widgets.findIndex(w => w.id === instance.id);
                if (widgetIndex !== -1) {
                  widgets[widgetIndex] = {
                    ...instance.widgetConfig,
                    createdAt: existingWidget.createdAt,
                  };
                  widgetsModified = true;
                }
              }
            }
          });
          
          // Only proceed if we added widgets or modified existing ones
          if (instancesToAdd.length === 0 && !widgetsModified) {
            return;
          }

          if (instancesToAdd.length > 0) {
            const now = Date.now();
            instancesToAdd.forEach((instance) => {
              // Use widgetConfig from DetectedWidgetInstance if available (preserves all settings)
              // Otherwise create minimal config for backward compatibility
              const newWidget: WidgetConfig = instance.widgetConfig
                ? {
                    ...instance.widgetConfig,
                    createdAt: now,
                  }
                : {
                    id: instance.id,
                    type: instance.widgetType, // DetectedWidgetInstance uses widgetType not type
                    title: instance.title,
                    settings: {
                      instanceId: instance.id,
                      ...(instance.instance !== undefined && { instance: instance.instance }),
                    },
                    createdAt: now,
                  };

              widgets.push(newWidget);
            });
          }

          // Verify no duplicates in final array
          const finalWidgetIds = new Set(widgets.map((w) => w.id));
          if (finalWidgetIds.size !== widgets.length) {
            widgets = widgets.filter((w, i, arr) => arr.findIndex((x) => x.id === w.id) === i);
          }

          set({
            dashboard: { widgets },
            currentWidgetIds: newWidgetIds,
          });
        },

        resetAppToDefaults: async () => {
          // Step 1: Cleanup widget registration system first
          const { cleanupWidgetSystem, initializeWidgetSystem } = await import(
            '../services/initializeWidgetSystem'
          );
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
          const systemWidgets = SYSTEM_WIDGETS.map((sw) => ({
            id: sw.id,
            type: sw.type,
            title: sw.title,
            settings: {},
            isSystemWidget: true,
            createdAt: now,
          }));

          const resetDashboard: DashboardConfig = {
            widgets: systemWidgets,
          };

          // Step 4: Reset state synchronously (no delay)
          set({
            dashboard: resetDashboard,
            widgetExpirationTimeout: 300000,
            enableWidgetAutoRemoval: true,
            currentWidgetIds: new Set(SYSTEM_WIDGETS.map((w) => w.id)),
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

        // Cleanup expired widgets based on sensor data freshness
        cleanupExpiredWidgetsWithConfig: () => {
          const state = get();
          if (!state.enableWidgetAutoRemoval) return;

          const currentDashboard = state.dashboard;
          if (!currentDashboard) return;

          const now = Date.now();
          const GRACE_PERIOD = 30000;

          // Import services for widget registration and sensor data
          const { widgetRegistrationService } = require('../services/WidgetRegistrationService');
          const { useNmeaStore } = require('./nmeaStore');
          const nmeaState = useNmeaStore.getState();

          // Import SensorDependency type
          type SensorDependency = import('../services/WidgetRegistrationService').SensorDependency;

          const updatedWidgets = currentDashboard.widgets.filter((widget) => {
            // Always keep system widgets
            if (widget.isSystemWidget) return true;

            // Get widget type registration
            const registration = widgetRegistrationService.getWidgetRegistration(widget.type);
            if (!registration) {
              console.warn(`⚠️ No registration found for widget type: ${widget.type}`);
              return true; // Keep unknown widget types
            }

            // Determine timeout (per-widget or global default)
            const timeout = registration.expirationTimeout ?? state.widgetExpirationTimeout;

            // Parse instance from widget settings (e.g., engine-0 has instance: 0)
            const instance = widget.settings?.instance ?? 0;

            // Check all REQUIRED sensors have fresh data
            const allRequiredFresh = registration.requiredSensors.every((dep: SensorDependency) => {
              const targetInstance = dep.instance ?? instance;
              const sensorData = nmeaState.nmeaData.sensors[dep.sensorType]?.[targetInstance];

              if (!sensorData) return false; // Sensor not found

              // Use getMetric to access data from MetricValue
              const metric = sensorData.getMetric?.(dep.metricName);
              if (!metric) return false; // No metric found

              const sensorTimestamp = sensorData.timestamp || 0;
              const age = now - sensorTimestamp;
              return age <= timeout + GRACE_PERIOD; // Fresh enough
            });

            return allRequiredFresh;
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
      },
    ),
    { name: 'Widget Store', enabled: __DEV__ },
  ),
);
