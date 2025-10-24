import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, Dimensions, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../store/themeStore';
import { WidgetRegistry } from './WidgetRegistry';
import { WidgetSelector } from './WidgetSelector';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';
import { PlatformStyles } from '../utils/animationUtils';
import { LayoutService, WidgetLayout } from '../services/layoutService';
import { DynamicLayoutService, DynamicWidgetLayout } from '../services/dynamicLayoutService';
import { registerAllWidgets } from './registerWidgets';

// Render the appropriate widget component using registry
function renderWidget(key: string): React.ReactElement {
  const registeredWidget = WidgetRegistry.getWidget(key);
  
  if (registeredWidget) {
    const Component = registeredWidget.component;
    return <Component key={key} id={key} title={registeredWidget.meta.title} />;
  }
  
  throw new Error(`Widget "${key}" not found in registry`);
}

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
  const [layout, setLayout] = useState<DynamicWidgetLayout[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [isDragMode, setIsDragMode] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<string>('default');
  const [toastVisible, setToastVisible] = useState(false);
  const [removedWidget, setRemovedWidget] = useState<{
    widget: DynamicWidgetLayout;
    index: number;
  } | null>(null);
  
  const theme = useTheme();

  // Register all widgets on mount
  useEffect(() => {
    registerAllWidgets();
  }, []);

  // Load layout from storage
  const loadLayout = useCallback(async () => {
    try {
      const legacyLayout = await LayoutService.loadLayout();
      const dynamicLayout = DynamicLayoutService.migrateLegacyLayout(legacyLayout);
      setLayout(dynamicLayout);
    } catch (error) {
      console.error('Failed to load layout:', error);
      // Use default layout
      const defaultLayout = LayoutService.getDefaultLayout();
      const dynamicLayout = DynamicLayoutService.migrateLegacyLayout(defaultLayout);
      setLayout(dynamicLayout);
    }
  }, []);

  useEffect(() => {
    loadLayout();
  }, [loadLayout]);

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

  // Save layout to storage
  const saveLayout = useCallback(async (newLayout: DynamicWidgetLayout[]) => {
    try {
      // Convert back to legacy format for storage
      const legacyLayout: WidgetLayout[] = newLayout.map(widget => ({
        id: widget.id,
        position: widget.position,
        size: widget.size,
        visible: widget.visible,
        order: widget.order,
        expanded: widget.expanded,
      }));
      
      await LayoutService.saveLayout(legacyLayout);
      setLayout(newLayout);
    } catch (error) {
      console.error('Failed to save layout:', error);
    }
  }, []);

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

  // Handle adding widgets from selector
  const handleAddWidget = useCallback(async (selectedIds: string[]) => {
    const currentIds = layout.map(w => w.id);
    const newIds = selectedIds.filter(id => !currentIds.includes(id));
    
    if (newIds.length === 0) return;

    // Create new widget layouts with fixed dimensions
    const newWidgets: DynamicWidgetLayout[] = newIds.map((id, index) => {
      const fixedWidth = DynamicLayoutService.calculateFixedWidgetWidth(id);
      const fixedHeight = DynamicLayoutService.getWidgetHeight(false); // Start collapsed
      
      return {
        id,
        position: { x: 0, y: 0 }, // Not used in flexbox layout
        size: { width: fixedWidth, height: fixedHeight },
        visible: true,
        order: layout.length + index,
        expanded: false,
        gridPosition: { row: 0, col: 0 },
        gridSize: { width: 1, height: 1 },
        fixedWidth,
      };
    });

    // Simple concatenation - no complex layout calculation needed
    const allWidgets = [...layout, ...newWidgets];
    await saveLayout(allWidgets);
    
    setShowSelector(false);
  }, [layout, saveLayout]);

  // Handle removing widgets
  const handleRemoveWidget = useCallback(async (widgetId: string) => {
    const widgetIndex = layout.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) return;

    const widget = layout[widgetIndex];
    const updatedLayout = layout.filter(w => w.id !== widgetId);
    
    // No complex recalculation needed
    setRemovedWidget({ widget, index: widgetIndex });
    await saveLayout(updatedLayout);
    
    // Show undo toast
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 5000);
  }, [layout, saveLayout]);

  // Handle undo remove
  const handleUndoRemove = useCallback(async () => {
    if (!removedWidget) return;

    const restoredLayout = [...layout];
    restoredLayout.splice(removedWidget.index, 0, removedWidget.widget);
    
    // No complex recalculation needed
    await saveLayout(restoredLayout);
    
    setRemovedWidget(null);
    setToastVisible(false);
  }, [removedWidget, layout, saveLayout]);

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
                  {renderWidget(widgetLayout.id)}
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
          <Ionicons name="add" size={24} color={theme.surface} />
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

      {/* Undo Toast */}
      {toastVisible && removedWidget && (
        <View style={[styles.toast, { backgroundColor: theme.surface }]}>
          <Text style={[styles.toastText, { color: theme.text }]}>
            Widget "{removedWidget.widget.id}" removed
          </Text>
          <TouchableOpacity 
            onPress={handleUndoRemove} 
            style={[styles.toastUndo, { backgroundColor: theme.primary }]}
          >
            <Text style={[styles.toastUndoText, { color: theme.surface }]}>Undo</Text>
          </TouchableOpacity>
        </View>
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
    ...PlatformStyles.boxShadow('#000', { x: 0, y: 2 }, 4, 0.3),
    elevation: 6,
  },
  addFab: {
    // Uses base fab styles
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    marginHorizontal: 24,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...PlatformStyles.boxShadow('#000', { x: 0, y: 2 }, 4, 0.2),
    elevation: 8,
  },
  toastText: {
    fontSize: 16,
    marginRight: 16,
  },
  toastUndo: {
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  toastUndoText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
});