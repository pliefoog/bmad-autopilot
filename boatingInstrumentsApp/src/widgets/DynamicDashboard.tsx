import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, Dimensions, Alert } from 'react-native';
import { useTheme, ThemeColors } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { useToast } from '../hooks/useToast';
import { WidgetRegistry } from './WidgetRegistry';
import { WidgetSelector } from './WidgetSelector';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';
import { PlatformStyles } from '../utils/animationUtils';
import { DynamicLayoutService, DynamicWidgetLayout, GridConfig } from '../services/dynamicLayoutService';
import { registerAllWidgets } from './registerWidgets';
import { WidgetFactory } from '../services/WidgetFactory';
import UniversalIcon from '../components/atoms/UniversalIcon';

// Render the appropriate widget component using registry
function renderWidget(
  key: string, 
  onWidgetError?: (widgetId: string) => void,
  width?: number,
  height?: number
): React.ReactElement | null {
  // Use the local extractBaseWidgetType function for proper multi-instance handling
  const baseType = extractBaseWidgetType(key);
  const registeredWidget = WidgetRegistry.getWidget(baseType);
  
  if (registeredWidget) {
    const Component = registeredWidget.component;
    const title = WidgetFactory.getWidgetTitle(key);
    
    // Components are already memoized, just return directly with stable key
    return <Component key={key} id={key} title={title} width={width} height={height} />;
  }
  
  // Trigger cleanup if callback provided
  if (onWidgetError) {
    onWidgetError(key);
  }
  
  // Return null instead of throwing to prevent crashes
  return null;
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

export const DynamicDashboard: React.FC = () => {
  // Selective subscriptions to prevent re-renders on widget timestamp updates
  const currentDashboard = useWidgetStore(state => state.currentDashboard);
  const storeWidgets = useWidgetStore(state => {
    const dashboard = state.dashboards.find(d => d.id === state.currentDashboard);
    return dashboard?.widgets || [];
  });
  
  const [layout, setLayout] = useState<DynamicWidgetLayout[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [isDragMode, setIsDragMode] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<string>('default');
  const [currentPage, setCurrentPage] = useState(0);
  const [dimensions, setDimensions] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });
  const [widgetHeights, setWidgetHeights] = useState<Map<string, number>>(new Map());
  const [removedWidget, setRemovedWidget] = useState<{
    widget: DynamicWidgetLayout;
    index: number;
  } | null>(null);
  
  const theme = useTheme();
  const toast = useToast();
  
  // Calculate grid config for proper spacing and sizing
  const gridConfig = useMemo(() => {
    const headerHeight = 60;
    const footerHeight = 88;
    const visibleWidgetCount = storeWidgets.filter(w => w.layout?.visible !== false).length;
    const config = DynamicLayoutService.getGridConfig(headerHeight, footerHeight, visibleWidgetCount);
    return config;
  }, [dimensions, storeWidgets]);
  
  const styles = useMemo(() => createStyles(theme, gridConfig), [theme, gridConfig]);

  // Register all widgets on mount
  useEffect(() => {
    registerAllWidgets();
  }, []);

  // Listen for dimension changes (window resize)
  useEffect(() => {
    // React Native Dimensions API listener
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
      setCurrentPage(0);
    });

    // Web-specific window resize listener for more reliable updates
    const handleResize = () => {
      const { width, height } = Dimensions.get('window');
      setDimensions({ width, height });
      setCurrentPage(0);
    };

    // Add web listener if running on web (check for addEventListener method)
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      subscription?.remove();
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []); // Empty dependency array - only set up once

  // ✨ NEW: Grid-based layout calculation with fixed widget sizes
  const calculateGridLayout = useCallback((widgets: any[]): DynamicWidgetLayout[] => {
    const headerHeight = 60;
    const footerHeight = 88;
    
    // Convert store widgets to WidgetLayout format expected by service
    const widgetLayouts = widgets.map(w => ({
      id: w.id,
      type: w.type || extractBaseWidgetType(w.id),
      visible: w.layout?.visible ?? true,
      order: w.order ?? 0,
      position: w.layout?.position || { x: 0, y: 0 },
      size: w.layout?.size || { width: 200, height: 140 },
      expanded: w.layout?.expanded ?? true,
    }));
    
    // Convert to DynamicWidgetLayout using new grid system
    const gridLayout = DynamicLayoutService.toDynamicLayout(widgetLayouts, headerHeight, footerHeight);
    
    return gridLayout;
  }, [dimensions]);

  // ✨ PURE WIDGET STORE: Update layout when widget store changes or dimensions change
  useEffect(() => {
    const gridLayout = calculateGridLayout(storeWidgets);
    setLayout(gridLayout);
  }, [storeWidgets, calculateGridLayout, dimensions]);

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
    } catch (error) {
      // Silent fail - layout updates are non-critical
    }
  }, [storeWidgets]);

  // Handle widget expansion/collapse with responsive heights
  const handleExpansionChange = useCallback(async (widgetId: string, expanded: boolean) => {
    // Update widget store with expanded state
    const updatedWidgets = storeWidgets.map(widget => {
      if (widget.id === widgetId) {
        return {
          ...widget,
          layout: {
            ...widget.layout,
            expanded
          }
        };
      }
      return widget;
    });
    
    const { updateDashboard, currentDashboard } = useWidgetStore.getState();
    updateDashboard(currentDashboard, { widgets: updatedWidgets });
    
    // Recalculate grid layout with new expanded state
    const recalculatedLayout = calculateGridLayout(updatedWidgets);
    setLayout(recalculatedLayout);
  }, [storeWidgets, calculateGridLayout]);

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
  }, [storeWidgets]);

  // Handle undo remove (pure widget store)
  const handleUndoRemove = useCallback(async () => {
    if (!removedWidget) return;

    // Find the removed widget in the original store state
    const originalWidget = storeWidgets.find(w => w.id === removedWidget.widget.id);
    if (!originalWidget) {
      return;
    }

    // Restore widget to store
    const restoredWidgets = [...storeWidgets];
    restoredWidgets.splice(removedWidget.index, 0, originalWidget);
    
    const { updateDashboard, currentDashboard } = useWidgetStore.getState();
    updateDashboard(currentDashboard, { widgets: restoredWidgets });
    
    setRemovedWidget(null);
    toast.showSuccess(`Restored ${originalWidget.id} widget`, { source: 'dashboard' });
  }, [removedWidget, storeWidgets]);

  // Handle widget rendering errors by cleaning up invalid widgets
  const handleWidgetError = useCallback((widgetId: string) => {
    // Trigger cleanup of orphaned widgets using getState()
    useWidgetStore.getState().cleanupOrphanedWidgets();
  }, []);

  // Group widgets into rows for rendering
  const widgetRows = useMemo(() => {
    const screenWidth = dimensions.width;
    const margin = 0;
    const spacing = 0;
    const availableWidth = screenWidth - (2 * margin);
    
    const rows: DynamicWidgetLayout[][] = [];
    let currentRow: DynamicWidgetLayout[] = [];
    let currentRowWidth = 0;
    
    layout.filter(w => w.visible).forEach((widget, index) => {
      const widgetWidth = widget.size.width;
      
      // Check if widget fits in current row (with spacing)
      const needsSpacing = currentRow.length > 0 ? spacing : 0;
      const wouldExceed = currentRowWidth + needsSpacing + widgetWidth > availableWidth;
      
      if (wouldExceed && currentRow.length > 0) {
        // Start new row - widget doesn't fit
        rows.push(currentRow);
        currentRow = [widget];
        currentRowWidth = widgetWidth;
      } else {
        // Add to current row - widget fits
        currentRow.push(widget);
        currentRowWidth += (needsSpacing + widgetWidth);
      }
    });
    
    // Add last row
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }
    
    return rows;
  }, [layout, dimensions]);

  // Measure widget height when it renders
  const handleWidgetLayout = useCallback((widgetId: string, height: number) => {
    setWidgetHeights(prev => {
      const newMap = new Map(prev);
      newMap.set(widgetId, height);
      return newMap;
    });
  }, []);

  // Calculate pages based on accumulated widget heights
  // Calculate total pages using new grid system
  const totalPages = useMemo(() => {
    const headerHeight = 60;
    const footerHeight = 88;
    return DynamicLayoutService.getTotalPages(layout, headerHeight, footerHeight);
  }, [layout, dimensions]);

  // Get widgets for current page using new grid system  
  const currentPageWidgets = useMemo(() => {
    return DynamicLayoutService.getWidgetsForPage(layout, currentPage);
  }, [layout, currentPage]);

  const usePagination = totalPages > 1;
  
  // Determine if we should use scroll mode (mobile) or pagination (tablet/desktop)
  const useScrollMode = useMemo(() => {
    const isScrollMode = dimensions.width < 768;
    return isScrollMode;
  }, [dimensions.width]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const goToPrevPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const goToPage = useCallback((pageIndex: number) => {
    if (pageIndex >= 0 && pageIndex < totalPages) {
      setCurrentPage(pageIndex);
    }
  }, [totalPages]);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Widget Display Area - Conditional: ScrollView (mobile) or Fixed Grid (tablet/desktop) */}
      {useScrollMode ? (
        // MOBILE: Scrollable grid that fills screen height
        <ScrollView 
          style={styles.pageContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.widgetGridContainer}>
            {currentPageWidgets.map((widget) => (
              <View 
                key={widget.id} 
                style={[
                  styles.widgetGridItem,
                  {
                    width: widget.width,
                    height: widget.height,
                  }
                ]}
              >
                <WidgetErrorBoundary
                  widgetId={widget.id}
                  theme={theme}
                  onReload={() => {
                    // Force re-render
                    setLayout(prev => [...prev]);
                  }}
                  onRemove={() => handleRemoveWidget(widget.id)}
                >
                  <View style={styles.widgetContentWrapper}>
                    {renderWidget(widget.id, handleWidgetError, widget.width, widget.height)}
                  </View>
                </WidgetErrorBoundary>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        // TABLET/DESKTOP: Fixed grid with pagination
        <View style={styles.paginatedContainer}>
          <View style={styles.widgetGridContainer}>
              {currentPageWidgets.map((widget) => (
                <View 
                  key={widget.id} 
                  style={[
                    styles.widgetGridItem,
                    {
                      width: widget.width,
                      height: widget.height,
                    }
                  ]}
                >
                  <WidgetErrorBoundary
                    widgetId={widget.id}
                    theme={theme}
                    onReload={() => {
                      // Force re-render
                      setLayout(prev => [...prev]);
                    }}
                    onRemove={() => handleRemoveWidget(widget.id)}
                  >
                    <View style={styles.widgetContentWrapper}>
                      {renderWidget(widget.id, handleWidgetError, widget.width, widget.height)}
                    </View>
                  </WidgetErrorBoundary>
                </View>
              ))}
            </View>
        </View>
      )}
      
      {/* Pagination Controls - show only for tablet/desktop with multiple pages */}
      {!useScrollMode && usePagination && (
        <View style={styles.paginationContainer}>
          {/* Previous Page Button */}
          <TouchableOpacity
            style={[styles.paginationArrow, currentPage === 0 && styles.paginationArrowDisabled]}
            onPress={goToPrevPage}
            disabled={currentPage === 0}
            activeOpacity={0.7}
          >
            <UniversalIcon 
              name="chevron-left" 
              size={24} 
              color={currentPage === 0 ? theme.textSecondary : theme.text} 
            />
          </TouchableOpacity>

          {/* Page Dots */}
          <View style={styles.paginationDots}>
            {Array.from({ length: totalPages }).map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.paginationDot,
                  index === currentPage && styles.paginationDotActive,
                  { 
                    backgroundColor: index === currentPage ? theme.primary : theme.border 
                  }
                ]}
                onPress={() => goToPage(index)}
                activeOpacity={0.7}
              />
            ))}
          </View>

          {/* Next Page Button */}
          <TouchableOpacity
            style={[styles.paginationArrow, currentPage === totalPages - 1 && styles.paginationArrowDisabled]}
            onPress={goToNextPage}
            disabled={currentPage === totalPages - 1}
            activeOpacity={0.7}
          >
            <UniversalIcon 
              name="chevron-right" 
              size={24} 
              color={currentPage === totalPages - 1 ? theme.textSecondary : theme.text} 
            />
          </TouchableOpacity>
        </View>
      )}

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

const createStyles = (theme: ThemeColors, gridConfig: GridConfig) => StyleSheet.create({
  root: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
  },
  scrollContent: {
    // Let widgets flow naturally without forcing growth
  },
  paginatedContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  scrollContainer: {
    flex: 1,
  },
  widgetContainer: {
    paddingBottom: 0,
  },
  widgetFlexContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  widgetGridContainer: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'stretch',
  },
  widgetGridItem: {
    // Fixed size set inline based on grid config
    overflow: 'hidden',
  },
  widgetContentWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  widgetWrapper: {
    // Let widgets size naturally based on content
    alignSelf: 'flex-start',
  },
  widgetRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.surface,
  },
  paginationArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 0,
  },
  paginationArrowDisabled: {
    opacity: 0.3,
  },
  paginationDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 0,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 0,
  },
  paginationDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  fabContainer: {
    position: 'absolute',
    right: 24,
    bottom: 80, // Moved up to make room for pagination
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