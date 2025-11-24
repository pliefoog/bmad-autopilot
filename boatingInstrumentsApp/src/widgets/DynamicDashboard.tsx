import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, Dimensions, Alert } from 'react-native';
import { useTheme, ThemeColors } from '../store/themeStore';
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
function renderWidget(key: string, onWidgetError?: (widgetId: string) => void): React.ReactElement | null {
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
    registryCount: WidgetRegistry.getCount(),
    availableWidgets: WidgetRegistry.getAllWidgets().map(w => w.id)
  });
  
  // Trigger cleanup if callback provided
  if (onWidgetError) {
    console.log(`[DynamicDashboard] Triggering cleanup for invalid widget: ${key}`);
    onWidgetError(key);
  }
  
  // Return null instead of throwing to prevent crashes
  console.warn(`[DynamicDashboard] Rendering placeholder for missing widget: ${key}`);
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
  // ✨ NEW: Subscribe to widget store for dynamic widgets
  const { dashboards, currentDashboard, cleanupOrphanedWidgets } = useWidgetStore();
  const currentDashboardData = dashboards.find(d => d.id === currentDashboard);
  const storeWidgets = currentDashboardData?.widgets || [];
  
  // Subscribe to widget expanded state for pagination recalculation
  const widgetExpanded = useWidgetStore((state) => state.widgetExpanded);
  
  console.log('[DynamicDashboard] Store widgets:', storeWidgets.length, 'dashboard:', currentDashboard);
  
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
  const styles = useMemo(() => createStyles(theme), [theme]);
  const toast = useToast();

  console.log('[DynamicDashboard] Widget store state:', {
    currentDashboard,
    dashboardCount: dashboards.length,
    widgetCount: storeWidgets.length,
    widgetIds: storeWidgets.map(w => w.id)
  });

  // Register all widgets on mount
  useEffect(() => {
    console.log('[DynamicDashboard] Registering all widgets...');
    registerAllWidgets();
    console.log('[DynamicDashboard] Widget registry count:', WidgetRegistry.getCount());
    console.log('[DynamicDashboard] Registered widgets:', WidgetRegistry.getAllWidgets().map(w => w.id));
  }, []);

  // Listen for dimension changes (window resize)
  useEffect(() => {
    // React Native Dimensions API listener
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      console.log('[DynamicDashboard] RN Dimensions changed:', { 
        width: window.width, 
        height: window.height
      });
      setDimensions({ width: window.width, height: window.height });
      setCurrentPage(0);
    });

    // Web-specific window resize listener for more reliable updates
    const handleResize = () => {
      const { width, height } = Dimensions.get('window');
      console.log('[DynamicDashboard] Web window resize:', { width, height });
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

  // ✨ Flow layout calculation that prevents overlapping
  const calculateFlowLayout = useCallback((widgets: any[]): DynamicWidgetLayout[] => {
    const screenWidth = dimensions.width;
    const screenHeight = dimensions.height;
    const margin = 0;
    const spacing = 0;
    const availableWidth = screenWidth - (2 * margin);
    
    console.log('[DynamicDashboard] Layout calculation:', {
      screenWidth,
      availableWidth,
      totalWidgets: widgets.length
    });
    
    // Row-based layout: widgets flow left-to-right using natural widths
    let currentX = 0;
    let currentY = 0;
    let currentRow = 0;
    let rowMaxHeight = 0;
    let currentRowWidth = 0;
    const rowHeights: number[] = [];
    
    return widgets.map((widget, index) => {
      // Get widget's natural dimensions from registry
      const registeredWidget = WidgetRegistry.getWidget(widget.type);
      const baseWidth = registeredWidget?.meta.defaultSize.width || 200;
      const baseCollapsedHeight = registeredWidget?.meta.defaultSize.height || 140;
      const baseExpandedHeight = baseCollapsedHeight * 2.086; // Maintain ratio
      
      const isExpanded = widget.layout?.expanded || false;
      const widgetWidth = baseWidth;
      const widgetHeight = isExpanded ? baseExpandedHeight : baseCollapsedHeight;
      
      // Check if widget fits in current row (considering spacing)
      const needsSpacing = currentRowWidth > 0 ? spacing : 0;
      const wouldExceed = currentRowWidth + needsSpacing + widgetWidth > availableWidth;
      
      if (wouldExceed && currentRowWidth > 0) {
        // Save current row's max height
        rowHeights[currentRow] = rowMaxHeight;
        
        // Move to next row - widget doesn't fit
        console.log('[DynamicDashboard] Starting new row:', {
          widgetId: widget.id,
          widgetType: widget.type,
          currentRowWidth,
          widgetWidth,
          availableWidth,
          rowNumber: currentRow + 1
        });
        
        currentRow++;
        currentX = 0;
        currentY += rowMaxHeight + spacing;
        currentRowWidth = 0;
        rowMaxHeight = 0;
      }
      
      // Place widget at current position
      const position = { x: currentX, y: currentY };
      
      // Track tallest widget in this row
      rowMaxHeight = Math.max(rowMaxHeight, widgetHeight);
      
      // Update position for next widget
      currentX += widgetWidth + spacing;
      currentRowWidth += (needsSpacing + widgetWidth);
      
      return {
        id: widget.id,
        position,
        size: { 
          width: widgetWidth, 
          height: widgetHeight 
        },
        visible: widget.layout?.visible ?? true,
        order: widget.order ?? index,
        expanded: isExpanded,
        gridPosition: { row: currentRow, col: 0 },
        gridSize: { width: 1, height: 1 },
        fixedWidth: widgetWidth,
        collapsedHeight: baseCollapsedHeight,
        expandedHeight: baseExpandedHeight,
      };
    });
  }, [dimensions]);

  // ✨ PURE WIDGET STORE: Update layout when widget store changes or dimensions change
  useEffect(() => {
    console.log('[DynamicDashboard] Layout recalculation triggered:', {
      reason: 'storeWidgets or dimensions changed',
      widgetCount: storeWidgets.length,
      dimensions: dimensions,
      timestamp: Date.now()
    });
    const dynamicLayout = calculateFlowLayout(storeWidgets);
    console.log('[DynamicDashboard] New layout calculated:', {
      layoutCount: dynamicLayout.length,
      firstWidget: dynamicLayout[0] ? {
        id: dynamicLayout[0].id,
        position: dynamicLayout[0].position,
        size: dynamicLayout[0].size
      } : null
    });
    setLayout(dynamicLayout);
  }, [storeWidgets, calculateFlowLayout, dimensions]);

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
    
    // Recalculate entire layout since row heights affect all subsequent rows
    const recalculatedLayout = calculateFlowLayout(updatedWidgets);
    setLayout(recalculatedLayout);
  }, [storeWidgets, calculateFlowLayout]);

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

  // Group widgets into rows for rendering
  const widgetRows = useMemo(() => {
    const screenWidth = dimensions.width;
    const margin = 0;
    const spacing = 0;
    const availableWidth = screenWidth - (2 * margin);
    
    const rows: DynamicWidgetLayout[][] = [];
    let currentRow: DynamicWidgetLayout[] = [];
    let currentRowWidth = 0;
    
    console.log('[DynamicDashboard] Grouping widgets into rows:', {
      totalWidgets: layout.filter(w => w.visible).length,
      screenWidth,
      availableWidth
    });
    
    layout.filter(w => w.visible).forEach((widget, index) => {
      const widgetWidth = widget.size.width;
      
      // Check if widget fits in current row (with spacing)
      const needsSpacing = currentRow.length > 0 ? spacing : 0;
      const wouldExceed = currentRowWidth + needsSpacing + widgetWidth > availableWidth;
      
      if (wouldExceed && currentRow.length > 0) {
        // Start new row - widget doesn't fit
        console.log('[DynamicDashboard] Row completed, starting new row:', {
          completedRowWidgets: currentRow.length,
          completedRowWidth: currentRowWidth,
          carryoverWidget: widget.id,
          carryoverWidth: widgetWidth,
          availableWidth
        });
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
      console.log('[DynamicDashboard] Final row:', {
        widgetCount: currentRow.length,
        rowWidth: currentRowWidth
      });
    }
    
    console.log('[DynamicDashboard] Total rows created:', rows.length);
    
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
  const { pages, totalPages } = useMemo(() => {
    const headerHeight = 60; // HeaderBar height
    const footerHeight = 88; // AutopilotFooter base height (without safe area)
    const paginationControlsHeight = 60; // Page indicators
    const fabHeight = 100; // FAB button
    const availableHeight = dimensions.height - headerHeight - footerHeight - paginationControlsHeight - fabHeight;
    
    const visibleWidgets = storeWidgets.filter(w => w.layout?.visible ?? true);
    
    // Group widgets into pages based on flex wrap rows and height
    const pgs: typeof visibleWidgets[][] = [];
    let currentPageWidgets: typeof visibleWidgets = [];
    let currentPageHeight = 0;
    let currentRowWidth = 0;
    let currentRowMaxHeight = 0;
    
    visibleWidgets.forEach((widget) => {
      // Get widget dimensions from registry or measured heights
      const registeredWidget = WidgetRegistry.getWidget(widget.type);
      const baseWidth = registeredWidget?.meta.defaultSize.width || 200;
      const measuredHeight = widgetHeights.get(widget.id);
      const isExpanded = widgetExpanded[widget.id] || false; // Use store's expanded state
      const baseHeight = registeredWidget?.meta.defaultSize.height || 140;
      const widgetHeight = measuredHeight || (isExpanded ? baseHeight * 2.086 : baseHeight);
      
      // Check if widget wraps to new row
      const wouldWrapToNewRow = currentRowWidth + baseWidth > dimensions.width;
      
      if (wouldWrapToNewRow && currentRowWidth > 0) {
        // Commit current row height
        currentPageHeight += currentRowMaxHeight;
        currentRowWidth = baseWidth;
        currentRowMaxHeight = widgetHeight;
        
        // Check if new row exceeds page height
        if (currentPageHeight + currentRowMaxHeight > availableHeight && currentPageWidgets.length > 0) {
          // Start new page
          pgs.push(currentPageWidgets);
          currentPageWidgets = [widget];
          currentPageHeight = currentRowMaxHeight;
        } else {
          // Add to current page
          currentPageWidgets.push(widget);
        }
      } else {
        // Add to current row
        currentRowWidth += baseWidth;
        currentRowMaxHeight = Math.max(currentRowMaxHeight, widgetHeight);
        currentPageWidgets.push(widget);
      }
    });
    
    // Add final page
    if (currentPageWidgets.length > 0) {
      pgs.push(currentPageWidgets);
    }
    
    console.log('[DynamicDashboard] Pagination:', {
      totalPages: pgs.length,
      availableHeight,
      widgetHeightsCount: widgetHeights.size
    });
    
    return { pages: pgs, totalPages: pgs.length };
  }, [storeWidgets, dimensions, widgetHeights, widgetExpanded]);

  // Get widgets for current page
  const currentPageWidgets = useMemo(() => {
    if (totalPages <= 1) {
      return storeWidgets.filter(w => w.layout?.visible ?? true);
    }
    return pages[currentPage] || [];
  }, [pages, currentPage, totalPages, storeWidgets]);

  const usePagination = totalPages > 1;

  console.log('[DynamicDashboard] Render mode:', {
    totalPages,
    usePagination,
    currentPage,
    widgetCount: currentPageWidgets.length,
    dimensions
  });

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
      {/* Widget container with flex wrap layout */}
      <View style={styles.pageContainer}>
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.widgetContainer}
          showsVerticalScrollIndicator={!usePagination}
          scrollEnabled={!usePagination}
        >
          {/* Flex wrap container - widgets automatically flow into rows */}
          <View style={styles.widgetFlexContainer}>
            {currentPageWidgets.map((widget) => (
              <View 
                key={widget.id} 
                style={styles.widgetWrapper}
                onLayout={(event) => {
                  const { height } = event.nativeEvent.layout;
                  handleWidgetLayout(widget.id, height);
                }}
              >
                <WidgetErrorBoundary
                  widgetId={widget.id}
                  onReload={() => {
                    // Force re-render
                    setLayout(prev => [...prev]);
                  }}
                  onRemove={() => handleRemoveWidget(widget.id)}
                >
                  {renderWidget(widget.id, handleWidgetError)}
                </WidgetErrorBoundary>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Pagination Controls - show when using pagination */}
      {usePagination && (
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

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  root: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  widgetContainer: {
    paddingBottom: 20,
  },
  widgetFlexContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
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
    marginHorizontal: 8,
  },
  paginationArrowDisabled: {
    opacity: 0.3,
  },
  paginationDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
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