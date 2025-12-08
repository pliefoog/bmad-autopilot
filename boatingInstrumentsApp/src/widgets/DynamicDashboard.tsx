import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, Dimensions, Alert } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import { useTheme, ThemeColors } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { useToast } from '../hooks/useToast';
import { logger } from '../utils/logger';
import { useDashboardLayout } from '../contexts/DashboardLayoutContext';
import { WidgetRegistry } from './WidgetRegistry';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';
import { PlatformStyles } from '../utils/animationUtils';
import { DynamicLayoutService, DynamicWidgetLayout, GridConfig } from '../services/dynamicLayoutService';
import { registerAllWidgets } from './registerWidgets';
import { WidgetFactory } from '../services/WidgetFactory';
import UniversalIcon from '../components/atoms/UniversalIcon';
import { DraggableWidgetGrid } from '../components/DraggableWidgetGrid';
import { DashboardSettingsMenu } from '../components/DashboardSettingsMenu';

// Render the appropriate widget component using registry
function renderWidget(
  key: string, 
  onWidgetError?: (widgetId: string) => void,
  width?: number,
  height?: number
): React.ReactElement | null {
  // Use WidgetFactory for proper multi-instance handling
  const { baseType } = WidgetFactory.parseWidgetId(key);
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

export const DynamicDashboard: React.FC = () => {
  // Get measured dimensions from context
  const { width: contextWidth, height: contextHeight, isReady: contextReady } = useDashboardLayout();
  
  // Selective subscriptions to prevent re-renders on widget timestamp updates
  const currentDashboard = useWidgetStore(state => state.currentDashboard);
  const storeWidgets = useWidgetStore(state => {
    const dashboard = state.dashboards.find(d => d.id === state.currentDashboard);
    return dashboard?.widgets || [];
  });
  const dashboardConfig = useWidgetStore(state => 
    state.dashboards.find(d => d.id === state.currentDashboard)
  );
  const { moveWidgetToPage, redistributeWidgetsAcrossPages } = useWidgetStore();
  
  const [layout, setLayout] = useState<DynamicWidgetLayout[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [dimensions, setDimensions] = useState({ width: contextWidth, height: contextHeight });
  const [dimensionsReady, setDimensionsReady] = useState(false);
  const [removedWidget, setRemovedWidget] = useState<{
    widget: DynamicWidgetLayout;
    index: number;
  } | null>(null);
  const [failedWidgets, setFailedWidgets] = useState<Set<string>>(new Set());
  const [settingsVisible, setSettingsVisible] = useState(false);
  
  const theme = useTheme();
  const toast = useToast();
  
  // Update dimensions when context provides new measurements
  useEffect(() => {
    if (contextReady && (contextWidth !== dimensions.width || contextHeight !== dimensions.height)) {
      logger.dimensions(`Context dimensions updated: ${contextWidth}×${contextHeight}`);
      DynamicLayoutService.clearCache();
      setDimensions({ width: contextWidth, height: contextHeight });
      setDimensionsReady(true);
    }
  }, [contextWidth, contextHeight, contextReady]);
  
  // Calculate grid config for proper spacing and sizing
  const gridConfig = useMemo(() => {
    const visibleWidgetCount = storeWidgets.filter(w => w.layout?.visible !== false).length;
    // Pass measured dimensions from context - no header/footer needed as dimensions already exclude them
    const config = DynamicLayoutService.getGridConfig(0, 0, visibleWidgetCount, dimensions.width, dimensions.height);
    return config;
  }, [dimensions.width, dimensions.height, storeWidgets]);
  
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Register all widgets on mount
  useEffect(() => {
    registerAllWidgets();
  }, []);

  // ✨ NEW: Grid-based layout calculation with fixed widget sizes
  const calculateGridLayout = useCallback((widgets: any[]): DynamicWidgetLayout[] => {
    
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
    const gridLayout = DynamicLayoutService.toDynamicLayout(widgetLayouts, 0, 0);
    
    return gridLayout;
  }, [dimensions.width, dimensions.height]);

  // ✨ PURE WIDGET STORE: Update layout when widget store changes or dimensions change
  useEffect(() => {
    const gridLayout = calculateGridLayout(storeWidgets);
    setLayout(gridLayout);
  }, [storeWidgets, calculateGridLayout]);

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

  // Handle removing widgets (pure widget store)
  const handleRemoveWidget = useCallback(async (widgetId: string) => {
    const widgetIndex = storeWidgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) return;

    const widget = storeWidgets[widgetIndex];
    const updatedWidgets = storeWidgets.filter(w => w.id !== widgetId);
    
    // Store full widget snapshot (not reference) for reliable undo
    setRemovedWidget({ 
      widget: JSON.parse(JSON.stringify(widget)), // Deep clone to prevent stale references
      index: widgetIndex 
    });
    
    // Update widget store directly
    const { updateDashboard, currentDashboard } = useWidgetStore.getState();
    updateDashboard(currentDashboard, { widgets: updatedWidgets });
    
    // Show undo toast using global toast system
    toast.showInfo(`Removed ${widget.title || widget.id} widget`, {
      duration: 5000,
      source: 'dashboard',
      action: {
        label: 'Undo',
        action: () => handleUndoRemove(),
        style: 'primary'
      }
    });
  }, [storeWidgets, toast]);

  // Handle undo remove (pure widget store)
  const handleUndoRemove = useCallback(async () => {
    if (!removedWidget) return;

    // Use the stored snapshot directly (no lookup needed)
    const restoredWidget = removedWidget.widget;
    
    // Restore widget to store at original position
    const currentWidgets = useWidgetStore.getState().dashboards.find(
      d => d.id === useWidgetStore.getState().currentDashboard
    )?.widgets || [];
    
    const restoredWidgets = [...currentWidgets];
    restoredWidgets.splice(removedWidget.index, 0, restoredWidget);
    
    const { updateDashboard, currentDashboard } = useWidgetStore.getState();
    updateDashboard(currentDashboard, { widgets: restoredWidgets });
    
    setRemovedWidget(null);
    toast.showSuccess(`Restored ${restoredWidget.title || restoredWidget.id} widget`, { source: 'dashboard' });
  }, [removedWidget, toast]);

  // Handle widget rendering errors with isolated recovery (no full layout recalc)
  const handleWidgetError = useCallback((widgetId: string) => {
    // Add to failed widgets set for isolated handling
    setFailedWidgets(prev => new Set(prev).add(widgetId));
    
    // Schedule automatic retry after 2 seconds
    setTimeout(() => {
      setFailedWidgets(prev => {
        const next = new Set(prev);
        next.delete(widgetId);
        return next;
      });
    }, 2000);
    
    // Only cleanup orphaned widgets (don't force full layout recalc)
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
    const footerHeight = 0; // No footer - widgets extend to bottom
    return DynamicLayoutService.getTotalPages(layout, 0, footerHeight);
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

  // Swipe gesture handling for page navigation
  const panGestureRef = useRef(null);
  const handleSwipeGesture = useCallback((event: any) => {
    const { translationX, velocityX, state } = event.nativeEvent;

    if (state === State.END) {
      const swipeThreshold = 50; // Minimum swipe distance
      const velocityThreshold = 500; // Minimum swipe velocity

      if (Math.abs(translationX) > swipeThreshold || Math.abs(velocityX) > velocityThreshold) {
        if (translationX > 0 || velocityX > 0) {
          // Swipe right - previous page
          goToPrevPage();
        } else {
          // Swipe left - next page
          goToNextPage();
        }
      }
    }
  }, [goToNextPage, goToPrevPage]);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Widget Display Area - Conditional: ScrollView (mobile) or Fixed Grid (tablet/desktop) */}
      {useScrollMode ? (
        // MOBILE: Scrollable draggable grid
        <ScrollView 
          style={styles.pageContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <DraggableWidgetGrid
            pageIndex={currentPage}
            onMoveToPage={moveWidgetToPage}
          />
        </ScrollView>
      ) : (
        // TABLET/DESKTOP: Fixed grid with pagination and drag-and-drop
        <PanGestureHandler
          ref={panGestureRef}
          onHandlerStateChange={handleSwipeGesture}
          enabled={usePagination} // Only enable swipe when multiple pages
        >
          <View style={styles.paginatedContainer}>
            <DraggableWidgetGrid
              pageIndex={currentPage}
              onMoveToPage={moveWidgetToPage}
            />
          </View>
        </PanGestureHandler>
      )}
      
      {/* Pagination Controls - show only for tablet/desktop with multiple pages */}
      {!useScrollMode && usePagination && (
        <View style={styles.paginationContainer} pointerEvents="box-none">
          {/* Previous Page Button */}
          <TouchableOpacity
            style={[styles.paginationArrow, currentPage === 0 && styles.paginationArrowDisabled]}
            onPress={goToPrevPage}
            disabled={currentPage === 0}
            activeOpacity={0.7}
          >
            <UniversalIcon 
              name="chevron-back-outline" 
              size={28} 
              color={currentPage === 0 ? theme.textSecondary : theme.text} 
            />
          </TouchableOpacity>

          {/* Page Dots */}
          <View style={styles.paginationDots} pointerEvents="auto">
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
              name="chevron-forward-outline" 
              size={28} 
              color={currentPage === totalPages - 1 ? theme.textSecondary : theme.text} 
            />
          </TouchableOpacity>
        </View>
      )}
      
      {/* Dashboard Settings Menu */}
      <DashboardSettingsMenu
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />
    </View>
  );
};

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  root: {
    flex: 1,
  },
  modeIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  modeIndicatorIcon: {
    marginRight: 4,
  },
  modeIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
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
    paddingBottom: 0, // No padding - let pagination float over content
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
    position: 'absolute', // Float over content
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    pointerEvents: 'box-none', // Allow touches to pass through to widgets below
  },
  paginationArrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16, // More space on iPad per HIG
  },
  paginationArrowDisabled: {
    opacity: 0.3,
  },
  paginationDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20, // Space from arrows
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 6, // Apple HIG: 12pt spacing between dots (6pt each side)
  },
  paginationDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 4, // Adjust for larger size to keep visual spacing consistent
  },
});