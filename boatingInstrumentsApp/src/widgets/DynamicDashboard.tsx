import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, Dimensions, Alert } from 'react-native';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { useToast } from '../hooks/useToast';
import { WidgetRegistry } from './WidgetRegistry';
import { WidgetSelector } from './WidgetSelector';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';
import { PlatformStyles } from '../utils/animationUtils';
import { DynamicLayoutService, DynamicWidgetLayout } from '../services/dynamicLayoutService';
import { registerAllWidgets } from './registerWidgets';
import { WidgetFactory } from '../services/WidgetFactory';
import UniversalIcon from '../components/atoms/UniversalIcon';

// Render the appropriate widget component using registry
function renderWidget(key: string, onWidgetError?: (widgetId: string) => void): React.ReactElement {
  // Use the local extractBaseWidgetType function for proper multi-instance handling
  const baseType = extractBaseWidgetType(key);
  const registeredWidget = WidgetRegistry.getWidget(baseType);
  
  if (registeredWidget) {
    const Component = registeredWidget.component;
    const title = WidgetFactory.getWidgetTitle(key);
    return <Component key={key} id={key} title={title} />;
  }
  
  console.error(`[DynamicDashboard] Widget lookup failed:`, {
    originalKey: key,
    baseType,
    availableWidgets: WidgetRegistry.getAllWidgets().map(w => w.id)
  });
  
  // Trigger cleanup if callback provided
  if (onWidgetError) {
    console.log(`[DynamicDashboard] Triggering cleanup for invalid widget: ${key}`);
    onWidgetError(key);
  }
  
  throw new Error(`Widget "${key}" (base type: "${baseType}") not found in registry`);
}

// Extract base widget type from instance ID
function extractBaseWidgetType(widgetId: string): string {
  // Handle legacy widget ID mappings
  if (widgetId === 'water-temperature') {
    return 'watertemp';
  }
  
  // Check if this is a multi-instance widget ID (e.g., "engine-0", "battery-1", "tank-0", "temp-0") 
  const multiInstancePatterns = [
    /^engine-\d+$/, // "engine-0", "engine-1", etc.
    /^battery-\d+$/, // "battery-0", "battery-1", etc.
    /^tank-\d+$/, // "tank-0", "tank-1", etc. (new simulator format)
    /^tank-\w+-\d+$/, // "tank-fuel-0", "tank-freshWater-1", etc. (legacy format)
    /^temp-\d+$/, // "temp-0", "temp-1", etc.
  ];
  
  const isMultiInstance = multiInstancePatterns.some(pattern => pattern.test(widgetId));
  
  if (isMultiInstance) {
    const parts = widgetId.split('-');
    const baseType = parts[0];
    
    // Map base types to registered widget types
    switch (baseType) {
      case 'tank': return 'tanks'; // 'tank-0' or 'tank-fuel-0' -> use 'tanks' widget
      case 'engine': return 'engine'; // 'engine-0' -> use 'engine' widget  
      case 'battery': return 'battery'; // 'battery-0' -> use 'battery' widget
      case 'temp': return 'temperature'; // 'temp-0' -> use 'temperature' widget
      default: return baseType;
    }
  }
  
  // Additional legacy widget ID mappings
  const legacyMappings: Record<string, string> = {
    'water-temperature': 'watertemp',
    'water-temp': 'watertemp',
    'temperature': 'watertemp',
  };
  
  return legacyMappings[widgetId] || widgetId;
}

// Generate appropriate title for widget instances


interface DynamicWidgetWrapperProps {
  layout: DynamicWidgetLayout;
  onExpansionChange: (widgetId: string, expanded: boolean) => void;
  children: React.ReactNode;
}

const DynamicWidgetWrapper: React.FC<DynamicWidgetWrapperProps> = ({ 
  layout, 
  onExpansionChange, 
  children 
}) => {
  const theme = useTheme();
  
  // Use simple flexbox with content-based width
  return (
    <View
      style={[
        styles.dynamicWidget,
        {
          minHeight: layout.size.height,
        }
      ]}
      key={layout.id}
    >
      <View style={styles.widgetTouchable}>
        {children}
      </View>
    </View>
  );
};

export const DynamicDashboard: React.FC = () => {
  // ✨ NEW: Subscribe to widget store for dynamic widgets
  const { dashboards, currentDashboard, cleanupOrphanedWidgets } = useWidgetStore();
  const currentDashboardData = dashboards.find(d => d.id === currentDashboard);
  const storeWidgets = currentDashboardData?.widgets || [];
  
  console.log('[DynamicDashboard] Store widgets:', storeWidgets.length, 'dashboard:', currentDashboard);
  
  const [layout, setLayout] = useState<DynamicWidgetLayout[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [isDragMode, setIsDragMode] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<string>('default');
  const [removedWidget, setRemovedWidget] = useState<{
    widget: DynamicWidgetLayout;
    index: number;
  } | null>(null);
  
  const theme = useTheme();
  const toast = useToast();

  console.log('[DynamicDashboard] Widget store state:', {
    currentDashboard,
    dashboardCount: dashboards.length,
    widgetCount: storeWidgets.length,
    widgetIds: storeWidgets.map(w => w.id)
  });

  // Register all widgets on mount
  useEffect(() => {
    registerAllWidgets();
  }, []);

  // ✨ NEW: Convert widget store widgets to dynamic layout format
  const convertWidgetStoreToDynamicLayout = useCallback((widgets: any[]): DynamicWidgetLayout[] => {
    return widgets.map((widget, index) => {
      const fixedWidth = DynamicLayoutService.calculateFixedWidgetWidth(widget.type || widget.id);
      const fixedHeight = DynamicLayoutService.getWidgetHeight(false); // Start collapsed
      
      return {
        id: widget.id,
        position: widget.layout?.x && widget.layout?.y 
          ? { x: widget.layout.x, y: widget.layout.y }
          : { x: 0, y: 0 },
        size: { 
          width: widget.layout?.width || fixedWidth, 
          height: widget.layout?.height || fixedHeight 
        },
        visible: widget.layout?.visible ?? true,
        order: widget.order ?? index,
        expanded: false, // Widget expansion handled by widget store
        gridPosition: { row: 0, col: 0 },
        gridSize: { width: 1, height: 1 },
        fixedWidth,
      };
    });
  }, []);

  // ✨ PURE WIDGET STORE: Update layout when widget store changes
  useEffect(() => {
    console.log('[DynamicDashboard] Converting', storeWidgets.length, 'store widgets to layout');
    const dynamicLayout = convertWidgetStoreToDynamicLayout(storeWidgets);
    setLayout(dynamicLayout);
  }, [storeWidgets, convertWidgetStoreToDynamicLayout]);

  // Handle orientation changes - recalculate layout
  useEffect(() => {
    const handleOrientationChange = () => {
      setTimeout(() => {
        if (layout.length > 0) {
          const recalculatedLayout = DynamicLayoutService.calculateFlowLayout(layout);
          setLayout(recalculatedLayout);
        }
      }, 100);
    };

    const subscription = Dimensions.addEventListener('change', handleOrientationChange);
    return () => subscription?.remove();
  }, [layout]);

  // Save layout to widget store (pure widget store architecture)
  const saveLayout = useCallback(async (newLayout: DynamicWidgetLayout[]) => {
    try {
      // Update widget store directly - no legacy conversion needed
      const updatedWidgets = storeWidgets.map(widget => {
        const layoutWidget = newLayout.find(l => l.id === widget.id);
        if (layoutWidget) {
          return {
            ...widget,
            layout: {
              ...widget.layout,
              x: layoutWidget.position.x,
              y: layoutWidget.position.y,
              width: layoutWidget.size.width,
              height: layoutWidget.size.height,
              visible: layoutWidget.visible,
            },
            order: layoutWidget.order ?? widget.order,
          };
        }
        return widget;
      });
      
      const { updateDashboard, currentDashboard } = useWidgetStore.getState();
      updateDashboard(currentDashboard, { widgets: updatedWidgets });
      setLayout(newLayout);
      
      console.log('[DynamicDashboard] Layout saved to widget store');
    } catch (error) {
      console.error('[DynamicDashboard] Failed to save layout:', error);
    }
  }, [storeWidgets]);

  // Handle widget expansion/collapse with simpler logic
  const handleExpansionChange = useCallback(async (widgetId: string, expanded: boolean) => {
    const updatedLayout = layout.map(widget => {
      if (widget.id === widgetId) {
        const newHeight = expanded 
          ? DynamicLayoutService.getWidgetHeight(true)   // 292px 
          : DynamicLayoutService.getWidgetHeight(false); // 140px
          
        return {
          ...widget,
          expanded,
          size: {
            ...widget.size,
            height: newHeight
          }
        };
      }
      return widget;
    });
    
    // Don't recalculate complex positions - just update heights
    await saveLayout(updatedLayout);
  }, [layout, saveLayout]);

  // Handle adding widgets from selector (pure widget store)
  const handleAddWidget = useCallback(async (selectedIds: string[]) => {
    const currentIds = storeWidgets.map(w => w.id);
    const newIds = selectedIds.filter(id => !currentIds.includes(id));
    
    if (newIds.length === 0) return;

    // Create new widget configs for widget store
    const newWidgetConfigs = newIds.map((id, index) => ({
      id,
      type: id,
      title: id.charAt(0).toUpperCase() + id.slice(1), // Simple title capitalization
      settings: {},
      layout: {
        id,
        x: (storeWidgets.length + index) % 3 * 2, // Simple grid positioning
        y: Math.floor((storeWidgets.length + index) / 3) * 2,
        width: 2,
        height: 2,
        visible: true,
      },
      enabled: true,
      order: storeWidgets.length + index,
    }));

    // Add to widget store directly
    const { updateDashboard, currentDashboard } = useWidgetStore.getState();
    updateDashboard(currentDashboard, {
      widgets: [...storeWidgets, ...newWidgetConfigs]
    });
    
    setShowSelector(false);
    console.log('[DynamicDashboard] Added', newIds.length, 'widgets to store');
  }, [storeWidgets]);

  // Handle removing widgets (pure widget store)
  const handleRemoveWidget = useCallback(async (widgetId: string) => {
    const widgetIndex = storeWidgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) return;

    const widget = storeWidgets[widgetIndex];
    const updatedWidgets = storeWidgets.filter(w => w.id !== widgetId);
    
    // Store removed widget for undo functionality
    setRemovedWidget({ 
      widget: { id: widgetId, order: widgetIndex } as any, // Simplified for undo
      index: widgetIndex 
    });
    
    // Update widget store directly
    const { updateDashboard, currentDashboard } = useWidgetStore.getState();
    updateDashboard(currentDashboard, { widgets: updatedWidgets });
    
    // Show undo toast using global toast system
    if (removedWidget) {
      toast.showInfo(`Removed ${removedWidget.widget.id} widget`, {
        duration: 5000,
        source: 'dashboard',
        action: {
          label: 'Undo',
          action: () => handleUndoRemove(),
          style: 'primary'
        }
      });
    }
    console.log('[DynamicDashboard] Removed widget:', widgetId);
  }, [storeWidgets]);

  // Handle undo remove (pure widget store)
  const handleUndoRemove = useCallback(async () => {
    if (!removedWidget) return;

    // Find the removed widget in the original store state
    const originalWidget = storeWidgets.find(w => w.id === removedWidget.widget.id);
    if (!originalWidget) {
      console.error('[DynamicDashboard] Cannot restore widget - not found in store');
      return;
    }

    // Restore widget to store
    const restoredWidgets = [...storeWidgets];
    restoredWidgets.splice(removedWidget.index, 0, originalWidget);
    
    const { updateDashboard, currentDashboard } = useWidgetStore.getState();
    updateDashboard(currentDashboard, { widgets: restoredWidgets });
    
    setRemovedWidget(null);
    toast.showSuccess(`Restored ${originalWidget.id} widget`, { source: 'dashboard' });
    console.log('[DynamicDashboard] Restored widget:', originalWidget.id);
  }, [removedWidget, storeWidgets]);

  // Handle widget rendering errors by cleaning up invalid widgets
  const handleWidgetError = useCallback((widgetId: string) => {
    console.log(`[DynamicDashboard] Handling widget error for: ${widgetId}`);
    // Trigger cleanup of orphaned widgets
    cleanupOrphanedWidgets();
  }, [cleanupOrphanedWidgets]);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Widget container with flow layout */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.widgetContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Render widgets in flex flow layout */}
        <View style={styles.widgetFlowContainer}>
          {layout
            .filter(w => w.visible)
            .map((widgetLayout) => (
              <DynamicWidgetWrapper
                key={widgetLayout.id}
                layout={widgetLayout}
                onExpansionChange={handleExpansionChange}
              >
                <WidgetErrorBoundary
                  widgetId={widgetLayout.id}
                  onReload={() => {
                    // Force re-render by updating layout
                    setLayout(prev => [...prev]);
                  }}
                  onRemove={() => handleRemoveWidget(widgetLayout.id)}
                >
                  {renderWidget(widgetLayout.id, handleWidgetError)}
                </WidgetErrorBoundary>
              </DynamicWidgetWrapper>
            ))}
        </View>
      </ScrollView>

      {/* FAB Container */}
      <View style={styles.fabContainer}>
        {/* Add Widget FAB */}
        <TouchableOpacity
          style={[styles.fab, styles.addFab, { backgroundColor: theme.primary }]}
          onPress={() => setShowSelector(true)}
          activeOpacity={0.8}
        >
          <UniversalIcon name="add" size={24} color={theme.surface} />
        </TouchableOpacity>
      </View>

      {/* Widget Selector Modal */}
      {showSelector && (
        <WidgetSelector
          visible={showSelector}
          onClose={() => setShowSelector(false)}
          selected={[]}
          onChange={handleAddWidget}
        />
      )}


    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  widgetContainer: {
    padding: 16, // Consistent margin
    paddingBottom: 100, // Space for FABs
  },
  widgetFlowContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  dynamicWidget: {
    marginRight: 12, // Horizontal spacing
    marginBottom: 12, // Vertical spacing between rows
  },
  widgetTouchable: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fabContainer: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    flexDirection: 'column',
    gap: 16,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...PlatformStyles.boxShadow(theme.shadowDark, { x: 0, y: 2 }, 4, 0.3),
    elevation: 6,
  },
  addFab: {
    // Uses base fab styles
  },
});