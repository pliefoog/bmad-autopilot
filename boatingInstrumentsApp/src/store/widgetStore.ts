import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../utils/logging/logger';
import type { DetectedWidgetInstance } from '../services/WidgetRegistrationService';
import { DRAG_CONFIG } from '../config/dragConfig';

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

  // Drag-and-drop actions
  reorderWidget: (fromIndex: number, toIndex: number) => void;
  insertPlaceholder: (index: number) => void;
  removePlaceholder: () => void;
  startDrag: (widgetId: string, sourceIndex: number) => WidgetConfig | null;
  finishDrag: (draggedWidget: WidgetConfig, targetIndex?: number) => void;
  moveWidgetCrossPage: (
    draggedWidget: WidgetConfig,
    fromPageIndex: number,
    toPageIndex: number,
    toPosition: number,
    widgetsPerPage: number,
  ) => void;
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
          // RACE CONDITION PREVENTION (Jan 2026):
          // Block sensor updates during active drag to prevent corruption of placeholder position.
          // Without this guard, NMEA sensor updates at 2Hz can insert new widgets mid-drag,
          // causing placeholder to shift unexpectedly and widgets to drop at wrong locations.
          if (get().dashboard.widgets.some(w => w.id === DRAG_CONFIG.PLACEHOLDER_ID)) {
            return;
          }
          
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
              const existingWidget = widgets.find((w) => w.id === instance.id);
              if (
                existingWidget &&
                !existingWidget.settings?.customDefinition &&
                instance.widgetConfig.settings?.customDefinition
              ) {
                // Replace the widget entirely (don't mutate)
                const widgetIndex = widgets.findIndex((w) => w.id === instance.id);
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

          // Step 2: Clear all AsyncStorage keys (including onboarding flag)
          try {
            const AsyncStorage = await import('@react-native-async-storage/async-storage');
            await AsyncStorage.default.clear();
          } catch (error) {
            console.warn('Failed to clear AsyncStorage during factory reset:', error);
          }

          // Step 3: Clear localStorage (fail silently if not available)
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.clear();
            }
          } catch {
            // localStorage not available or blocked - continue without error
          }

          // Step 4: Create clean dashboard with only system widgets
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

          // Step 5: Reset state synchronously (no delay)
          set({
            dashboard: resetDashboard,
            widgetExpirationTimeout: 300000,
            enableWidgetAutoRemoval: true,
            currentWidgetIds: new Set(SYSTEM_WIDGETS.map((w) => w.id)),
          });

          // Step 6: Reinitialize widget system immediately (synchronous)
          // Use Promise.resolve().then() to defer to next microtask but keep it fast
          await Promise.resolve();
          initializeWidgetSystem();
        },

        // Dynamic widget lifecycle actions
        setWidgetExpirationTimeout: (timeoutMs: number) => {
          set({ widgetExpirationTimeout: timeoutMs });
          
          // Sync threshold to WidgetRegistrationService
          import('../services/WidgetRegistrationService').then(({ widgetRegistrationService }) => {
            widgetRegistrationService.setSensorDataStalenessThreshold(timeoutMs);
          });
        },

        setEnableWidgetAutoRemoval: (enabled: boolean) => {
          set({ enableWidgetAutoRemoval: enabled });
        },

        cleanupExpiredWidgetsWithConfig: () => {
          // No-op: Widget expiration handled by WidgetRegistrationService.checkExpiredWidgets()
        },

        // ========================================
        // DRAG-AND-DROP ACTIONS
        // ========================================

        /**
         * Reorder widget within array (simple array splice)
         * Array index = display order (left-to-right, top-to-bottom)
         */
        reorderWidget: (fromIndex: number, toIndex: number) => {
          const currentDashboard = get().dashboard;
          if (!currentDashboard) return;

          const newWidgets = [...currentDashboard.widgets];

          // Validate indices
          if (fromIndex < 0 || fromIndex >= newWidgets.length) return;
          if (toIndex < 0 || toIndex >= newWidgets.length) return;
          if (fromIndex === toIndex) return;

          // Remove from source
          const [removed] = newWidgets.splice(fromIndex, 1);

          // Insert at target
          newWidgets.splice(toIndex, 0, removed);

          set({
            dashboard: {
              ...currentDashboard,
              widgets: newWidgets,
            },
          });

          console.log('[DRAG] Widget reordered:', {
            widgetId: removed.id,
            fromIndex,
            toIndex,
          });
        },

        /**
         * Insert placeholder for drag preview (iOS-style reflow)
         * Placeholder shows where widget will drop
         */
        insertPlaceholder: (index: number) => {
          const currentDashboard = get().dashboard;
          if (!currentDashboard) return;

          // Remove existing placeholder first (prevents duplicates)
          const withoutPlaceholder = currentDashboard.widgets.filter(
            (w) => w.id !== DRAG_CONFIG.PLACEHOLDER_ID,
          );

          // Insert new placeholder at index
          const newWidgets = [...withoutPlaceholder];
          newWidgets.splice(index, 0, {
            id: DRAG_CONFIG.PLACEHOLDER_ID,
            type: 'placeholder',
            title: '',
            settings: {},
          });

          set({
            dashboard: {
              ...currentDashboard,
              widgets: newWidgets,
            },
          });
        },

        /**
         * Remove placeholder (after drag ends or cancels)
         */
        removePlaceholder: () => {
          const currentDashboard = get().dashboard;
          if (!currentDashboard) return;

          const newWidgets = currentDashboard.widgets.filter(
            (w) => w.id !== DRAG_CONFIG.PLACEHOLDER_ID,
          );

          // Only update if placeholder existed
          if (newWidgets.length === currentDashboard.widgets.length) return;

          set({
            dashboard: {
              ...currentDashboard,
              widgets: newWidgets,
            },
          });
        },

        /**
         * Start drag - remove widget from array, insert placeholder at source position
         * Returns the removed widget for tracking
         */
        startDrag: (widgetId: string, sourceIndex: number) => {
          const currentDashboard = get().dashboard;
          if (!currentDashboard) return null;

          const widget = currentDashboard.widgets[sourceIndex];
          if (!widget || widget.id !== widgetId) return null;

          // Remove dragged widget, insert placeholder at same position
          const newWidgets = currentDashboard.widgets.filter((w) => w.id !== widgetId);
          newWidgets.splice(sourceIndex, 0, {
            id: DRAG_CONFIG.PLACEHOLDER_ID,
            type: 'placeholder',
            title: '',
            settings: {},
          });

          set({
            dashboard: {
              ...currentDashboard,
              widgets: newWidgets,
            },
          });

          console.log('[DRAG] Drag started:', { widgetId, sourceIndex });
          return widget;
        },

        /**
         * Finish drag - replace placeholder with dragged widget at target index
         * If targetIndex provided, removes placeholder and inserts widget at exact position
         * If no targetIndex, just replaces placeholder in place
         */
        finishDrag: (draggedWidget: WidgetConfig, targetIndex?: number) => {
          const currentDashboard = get().dashboard;
          if (!currentDashboard) return;

          const newWidgets = [...currentDashboard.widgets];
          const placeholderIdx = newWidgets.findIndex(
            (w) => w.id === DRAG_CONFIG.PLACEHOLDER_ID,
          );
          
          if (placeholderIdx === -1) {
            console.log('[DRAG] ⚠️ No placeholder found during finish drag');
            return;
          }

          // Remove placeholder
          newWidgets.splice(placeholderIdx, 1);

          // If targetIndex provided, insert at exact position (no adjustment needed)
          // Otherwise insert back where placeholder was
          const insertIndex = targetIndex !== undefined ? targetIndex : placeholderIdx;
          newWidgets.splice(insertIndex, 0, draggedWidget);

          set({
            dashboard: {
              ...currentDashboard,
              widgets: newWidgets,
            },
          });

          console.log('[DRAG] Drag finished:', {
            widgetId: draggedWidget.id,
            placeholderWasAt: placeholderIdx,
            insertedAt: insertIndex,
          });
        },

        /**
         * Move widget across pages (Jan 2026: Cross-page dragging)
         * Converts page + position to absolute index, then reorders
         * 
         * BOUNDS CHECKING (Critical Fix):
         * - Validates toPageIndex ≤ maxAllowedPage (prevents multiple empty pages)
         * - Clamps toIndex to prevent array overflow when dropping beyond last widget
         * - maxAllowedPage = Math.floor(widgets.length / widgetsPerPage) ensures max one empty page
         * 
         * Example: 10 widgets, 6 per page:
         *   - Page 0: widgets[0-5]
         *   - Page 1: widgets[6-9] + 2 empty slots
         *   - Page 2 (maxAllowed): all empty slots OK
         *   - Page 3+: BLOCKED (would create second empty page)
         */
        moveWidgetCrossPage: (
          draggedWidget: WidgetConfig,
          fromPageIndex: number,
          toPageIndex: number,
          toPosition: number,
          widgetsPerPage: number,
        ) => {
          const currentDashboard = get().dashboard;
          if (!currentDashboard) {
            console.log('[DRAG] No dashboard found');
            return;
          }

          console.log('[DRAG] moveWidgetCrossPage called:', {
            widgetId: draggedWidget.id,
            fromPage: fromPageIndex,
            toPage: toPageIndex,
            toPosition,
            widgetsPerPage,
            totalWidgets: currentDashboard.widgets.length,
          });

          // CRITICAL: Remove placeholder first (it's in the array from drag start)
          const newWidgets = [...currentDashboard.widgets];
          const placeholderIdx = newWidgets.findIndex((w) => w.id === DRAG_CONFIG.PLACEHOLDER_ID);
          
          if (placeholderIdx === -1) {
            console.warn('[DRAG] No placeholder found during cross-page move');
            return;
          }
          
          console.log('[DRAG] Found placeholder at index:', placeholderIdx);
          newWidgets.splice(placeholderIdx, 1); // Remove placeholder

          // Prevent multiple empty pages - allow max one empty page beyond last populated
          // Use newWidgets.length since we removed placeholder
          const maxAllowedPage = Math.ceil(newWidgets.length / widgetsPerPage);
          if (toPageIndex > maxAllowedPage) {
            console.warn('[DRAG] Cannot drop on empty page:', { toPageIndex, maxAllowedPage });
            return;
          }

          // Calculate target absolute index with bounds checking
          const calculatedIndex = toPageIndex * widgetsPerPage + toPosition;
          const toIndex = Math.min(calculatedIndex, newWidgets.length);

          // Insert widget at target position (same as finishDrag pattern)
          newWidgets.splice(toIndex, 0, draggedWidget);

          set({
            dashboard: {
              ...currentDashboard,
              widgets: newWidgets,
            },
          });

          console.log('[DRAG] Widget moved cross-page:', {
            widgetId: draggedWidget.id,
            fromPage: fromPageIndex,
            toPage: toPageIndex,
            placeholderWasAt: placeholderIdx,
            insertedAt: toIndex,
            totalWidgets: newWidgets.length,
          });
        },
      }),
      {
        name: 'widget-store',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          dashboard: {
            ...state.dashboard,
            // CRITICAL: Filter out placeholder before persisting
            widgets: state.dashboard.widgets.filter((w) => w.id !== DRAG_CONFIG.PLACEHOLDER_ID),
          },
          widgetExpirationTimeout: state.widgetExpirationTimeout,
          enableWidgetAutoRemoval: state.enableWidgetAutoRemoval,
        }),
      },
    ),
    { name: 'Widget Store', enabled: __DEV__ },
  ),
);
