import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  Text,
  ActivityIndicator,
  Animated as RNAnimated,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../../store/themeStore';
import { useWidgetStore } from '../../store/widgetStore';
import { useResponsiveGrid, type ResponsiveGridState } from '../../hooks/useResponsiveGrid';
import { PaginationDots } from '../molecules/PaginationDots';
import {
  calculatePageLayouts,
  type LayoutConstraints,
  type PageLayout,
} from '../../utils/layoutUtils';
import { log as logger } from '../../utils/logging/logger';
import { WidgetVisibilityProvider } from '../../contexts/WidgetVisibilityContext';
import { DEFAULT_CUSTOM_WIDGETS } from '../../config/defaultCustomWidgets';
import { DRAG_CONFIG } from '../../config/dragConfig';
import { dragHaptics } from '../../utils/dragHaptics';
import { calculateHoverIndex, isDragSignificant } from '../../utils/dragHelpers';

// Import widget components
import { DepthWidget } from '../../widgets/DepthWidget';
import { SpeedWidget } from '../../widgets/SpeedWidget';
import { WindWidget } from '../../widgets/WindWidget';
import { GPSWidget } from '../../widgets/GPSWidget';
import { CompassWidget } from '../../widgets/CompassWidget';
import { EngineWidget } from '../../widgets/EngineWidget';
import { BatteryWidget } from '../../widgets/BatteryWidget';
import { TanksWidget } from '../../widgets/TanksWidget';
import { AutopilotWidget } from '../../widgets/AutopilotWidget';
import { ThemeWidget } from '../../widgets/ThemeWidget';
import { NavigationWidget } from '../../widgets/NavigationWidget';
import { TemperatureWidget } from '../../widgets/TemperatureWidget';
import { WeatherWidget } from '../../widgets/WeatherWidget';
import { RudderWidget } from '../../widgets/RudderWidget';
import CustomWidget from '../../widgets/CustomWidget';
import { PlaceholderWidget } from '../../widgets/PlaceholderWidget';
import type { WidgetConfig } from '../../store/widgetStore';

// ========================================
// MAIN COMPONENT
// ========================================

interface ResponsiveDashboardProps {
  headerHeight?: number;
  testID?: string;
}

/**
 * ResponsiveDashboard - Main dashboard component with responsive grid system and pagination
 * Implements Story 6.11: Dashboard Pagination & Responsive Grid System
 *
 * Features:
 * - AC 1-5: Responsive Grid System with platform-specific density
 * - AC 6-10: Pagination System with dots, navigation, and persistence
 * - AC 11-15: Layout Integration with performance optimization
 * - AC 16-20: Cross-Platform Compatibility with touch, mouse, and keyboard
 * - Drag-and-Drop: Long press (800ms) to drag widgets, reorder within page
 */
export const ResponsiveDashboard: React.FC<ResponsiveDashboardProps> = ({
  headerHeight = 60,
  testID = 'responsive-dashboard',
}) => {
  const theme = useTheme();

  // Responsive grid system (AC 1-5)
  const responsiveGrid: ResponsiveGridState = useResponsiveGrid(headerHeight);

  // Widget store integration - use actual widget array (must be called before any conditional returns)
  const dashboard = useWidgetStore((state) => state.dashboard);
  const widgets = useMemo(() => dashboard?.widgets || [], [dashboard?.widgets]);

  // Local page state management
  const [currentPage, setCurrentPage] = useState(0);
  const [isAnimatingPageTransition, setIsAnimatingPageTransition] = useState(false);

  // Drag state management - simplified store-based approach
  const [dragState, setDragState] = useState<{
    draggedWidget: WidgetConfig | null; // Widget being dragged (removed from array)
    sourceIndex: number | null;
    isDragging: boolean;
  }>({
    draggedWidget: null,
    sourceIndex: null,
    isDragging: false,
  });

  // Floating widget position for drag overlay
  const [floatingPos, setFloatingPos] = useState<{ x: number; y: number } | null>(null);

  // Debounce drag end to prevent rapid triggers
  const lastDragEndTime = useRef(0);

  // Animation values for page transitions (AC 10)
  const scrollViewRef = useRef<ScrollView>(null);
  const pageAnimatedValue = useRef(new RNAnimated.Value(0)).current;
  const [scrollViewWidth, setScrollViewWidth] = useState(0);
  const handleScrollViewLayout = useCallback((event: any) => {
    const width = event?.nativeEvent?.layout?.width ?? 0;
    setScrollViewWidth((prev) => (prev !== width ? width : prev));
  }, []);

  // Widget component mapping - memoized to prevent recreation on every render
  const widgetComponents = React.useMemo(() => {
    // Build custom widget mappings dynamically from definitions
    const customWidgetMappings = DEFAULT_CUSTOM_WIDGETS.reduce((acc, definition) => {
      acc[definition.id] = CustomWidget;
      return acc;
    }, {} as Record<string, React.ComponentType<any>>);

    return {
      depth: DepthWidget,
      speed: SpeedWidget,
      wind: WindWidget,
      gps: GPSWidget,
      compass: CompassWidget,
      engine: EngineWidget,
      battery: BatteryWidget,
      tank: TanksWidget, // Note: type is 'tank' (singular) but component is TanksWidget
      autopilot: AutopilotWidget,
      theme: ThemeWidget,
      navigation: NavigationWidget,
      temperature: TemperatureWidget,
      weather: WeatherWidget,
      rudder: RudderWidget,
      placeholder: PlaceholderWidget, // Drag-and-drop placeholder
      // Dynamically add all custom widget types
      ...customWidgetMappings,
    };
  }, []);

  // Update scroll position when page changes (AC 9: Page State Persistence)
  useEffect(() => {
    if (scrollViewRef.current && scrollViewWidth > 0) {
      const scrollX = currentPage * scrollViewWidth;
      scrollViewRef.current.scrollTo({ x: scrollX, animated: !isAnimatingPageTransition });
    }
  }, [currentPage, scrollViewWidth, isAnimatingPageTransition]);

  // Calculate layout constraints and page layouts - memoized for performance
  // Uses widget store array order as source of truth (array index = display position)
  const { pageLayouts, totalPages } = React.useMemo(() => {
    // Don't calculate layouts while loading (prevents accessing uninitialized stores)
    if (responsiveGrid.isLoading || widgets.length === 0) {
      return { pageLayouts: [], totalPages: 0 };
    }

    // useResponsiveGrid already calculated optimal cellWidth and cellHeight
    // It accounts for gaps: cellWidth = (containerWidth - totalGapWidth) / cols
    // where totalGapWidth = (cols - 1) * gap
    // So we can back-calculate the gap: gap = (containerWidth - cellWidth * cols) / (cols - 1)
    const gap =
      responsiveGrid.layout.cols > 1
        ? (responsiveGrid.layout.containerWidth -
            responsiveGrid.layout.cellWidth * responsiveGrid.layout.cols) /
          (responsiveGrid.layout.cols - 1)
        : 0;

    const constraints: LayoutConstraints = {
      containerWidth: responsiveGrid.layout.containerWidth,
      containerHeight: responsiveGrid.layout.containerHeight,
      cols: responsiveGrid.layout.cols,
      rows: responsiveGrid.layout.rows,
      gap,
      cellWidth: responsiveGrid.layout.cellWidth,
      cellHeight: responsiveGrid.layout.cellHeight,
    };

    // Use widget IDs from store array - ORDER MATTERS: array[0] = top-left, array[n] = bottom-right
    const widgetIds = widgets.map((w) => w.id);
    const layouts = calculatePageLayouts(widgetIds, constraints);
    logger.layout('Calculated pages:', () => ({
      totalWidgets: widgetIds.length,
      totalPages: layouts.length,
      cols: responsiveGrid.layout.cols,
      rows: responsiveGrid.layout.rows,
    }));
    return { pageLayouts: layouts, totalPages: layouts.length };
  }, [
    responsiveGrid.isLoading,
    widgets,
    responsiveGrid.layout.containerWidth,
    responsiveGrid.layout.containerHeight,
    responsiveGrid.layout.cols,
    responsiveGrid.layout.rows,
    responsiveGrid.layout.cellWidth,
    responsiveGrid.layout.cellHeight,
  ]);

  // Page navigation functions
  const navigateToPage = useCallback(
    (page: number) => {
      if (page >= 0 && page < totalPages) {
        // Avoid redundant state churn if already on this page
        setCurrentPage((prev) => {
          if (prev === page) {
            return prev;
          }
          setIsAnimatingPageTransition(true);
          setTimeout(() => setIsAnimatingPageTransition(false), 300);
          return page;
        });
      }
    },
    [totalPages],
  );

  const navigateToNextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      navigateToPage(currentPage + 1);
    }
  }, [currentPage, totalPages, navigateToPage]);

  const navigateToPreviousPage = useCallback(() => {
    if (currentPage > 0) {
      navigateToPage(currentPage - 1);
    }
  }, [currentPage, navigateToPage]);

  // ========================================
  // DRAG-AND-DROP HANDLERS
  // ========================================

  /**
   * Handle long press start - activates drag mode
   */
  const handleLongPressStart = useCallback(
    (widgetId: string, index: number, pageIndex: number, touchX: number, touchY: number) => {
      console.log('[DRAG] Long press start:', { widgetId, index, pageIndex, touchX, touchY });

      dragHaptics.onLift();

      // Remove widget from array, insert placeholder at source
      const removedWidget = useWidgetStore.getState().startDrag(widgetId, index);
      if (!removedWidget) {
        console.error('[DRAG] Failed to start drag - widget not found');
        return;
      }

      // Calculate initial floating position (widget's grid position)
      const pageLayout = pageLayouts[pageIndex];
      const cellPosition = pageLayout?.cells[index];
      if (!cellPosition) {
        console.error('[DRAG] Failed to get cell position');
        return;
      }

      setDragState({
        draggedWidget: removedWidget,
        sourceIndex: index,
        isDragging: true,
      });

      setFloatingPos({
        x: cellPosition.x,
        y: cellPosition.y,
      });

      logger.dragDrop('Widget lifted', () => ({ widgetId, index, pageIndex, touchX, touchY }));
    },
    [pageLayouts],
  );

  /**
   * Handle drag move - update floating position and placeholder
   */
  const handleDragMove = useCallback(
    (translationX: number, translationY: number, absoluteX: number, absoluteY: number) => {
      if (!dragState.isDragging || !floatingPos) return;

      console.log('[DRAG] Move:', { translationX, translationY, absoluteX, absoluteY });

      // Update floating widget position (follows cursor)
      setFloatingPos({
        x: floatingPos.x + translationX,
        y: floatingPos.y + translationY,
      });

      // Calculate hover index (which cell is being hovered over)
      const hoverIndex = calculateHoverIndex(absoluteX, absoluteY, responsiveGrid, currentPage);

      // Update placeholder position if hovering over different cell
      if (hoverIndex !== -1 && isDragSignificant(translationX, translationY)) {
        console.log('[DRAG] Move placeholder to index:', hoverIndex);
        useWidgetStore.getState().insertPlaceholder(hoverIndex);
      }
    },
    [dragState.isDragging, floatingPos, responsiveGrid, currentPage],
  );

  /**
   * Handle drag end - complete reorder by replacing placeholder with widget
   */
  const handleDragEnd = useCallback(
    (translationX: number, translationY: number, absoluteX: number, absoluteY: number) => {
      if (!dragState.isDragging || !dragState.draggedWidget) return;

      // Debounce: prevent double-trigger from rapid gestures
      const now = Date.now();
      if (now - lastDragEndTime.current < DRAG_CONFIG.DRAG_END_DEBOUNCE) {
        return;
      }
      lastDragEndTime.current = now;

      // Replace placeholder with dragged widget
      useWidgetStore.getState().finishDrag(dragState.draggedWidget);

      // Haptic feedback
      if (isDragSignificant(translationX, translationY)) {
        dragHaptics.onDrop();
      } else {
        dragHaptics.onCancel();
      }

      // Reset drag state
      setDragState({
        draggedWidget: null,
        sourceIndex: null,
        isDragging: false,
      });
      setFloatingPos(null);

      logger.dragDrop('Widget dropped', () => ({
        widgetId: dragState.draggedWidget!.id,
      }));
    },
    [dragState.isDragging, dragState.draggedWidget],
  );

  /**
   * Cancel drag (Escape key or widget unmounted) - return widget to original position
   */
  const handleDragCancel = useCallback(() => {
    if (!dragState.isDragging || !dragState.draggedWidget) return;

    dragHaptics.onCancel();

    // Replace placeholder with dragged widget (returns to last placeholder position)
    useWidgetStore.getState().finishDrag(dragState.draggedWidget);

    // Reset drag state
    setDragState({
      draggedWidget: null,
      sourceIndex: null,
      isDragging: false,
    });
    setFloatingPos(null);

    logger.dragDrop('Drag cancelled', () => ({ widgetId: dragState.draggedWidget!.id }));
  }, [dragState.isDragging, dragState.draggedWidget]);

  // Escape key cancels drag (web only)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragState.isDragging) {
        handleDragCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dragState.isDragging, handleDragCancel]);

  // Cancel drag if dragged widget no longer exists (safety check)
  useEffect(() => {
    if (dragState.isDragging && dragState.draggedWidget) {
      const widgetExists = widgets.some((w) => w.id === dragState.draggedWidget!.id);
      if (!widgetExists) {
        handleDragCancel();
      }
    }
  }, [widgets, dragState.isDragging, dragState.draggedWidget, handleDragCancel]);

  // ========================================
  // PAGE SWIPE GESTURE (New Gesture API)
  // ========================================

  /**
   * Page swipe gesture - disabled during widget drag
   */
  const pageSwipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10]) // Only activate if horizontal movement > 10px
        .failOffsetY([-5, 5]) // Fail if vertical movement detected
        .onEnd((event) => {
          const { translationX, velocityX } = event;
          const threshold = 50;
          const velocityThreshold = 500;

          if (Math.abs(translationX) > threshold || Math.abs(velocityX) > velocityThreshold) {
            if (translationX > 0 || velocityX > 0) {
              runOnJS(navigateToPreviousPage)();
            } else {
              runOnJS(navigateToNextPage)();
            }
          }
        })
        .enabled(totalPages > 1 && !dragState.isDragging), // Disable during drag
    [totalPages, dragState.isDragging, navigateToNextPage, navigateToPreviousPage],
  );

  // Handle swipe gestures for page navigation (AC 8) - OLD CODE REMOVED
  // Migrated to new Gesture API above (pageSwipeGesture)

  // Handle keyboard navigation (AC 18)
  const handleKeyPress = useCallback(
    (event: any) => {
      if (Platform.OS === 'web') {
        switch (event.key) {
          case 'ArrowLeft':
            navigateToPreviousPage();
            break;
          case 'ArrowRight':
            navigateToNextPage();
            break;
          // REMOVED: Manual widget addition keyboard shortcut
        }
      }
    },
    [navigateToNextPage, navigateToPreviousPage],
  );

  // Handle scroll for page detection
  const handleScroll = useCallback(
    (event: any) => {
      if (scrollViewWidth <= 0) return;
      const scrollX = event.nativeEvent.contentOffset.x;
      const pageIndex = Math.round(scrollX / scrollViewWidth);

      if (pageIndex !== currentPage && pageIndex >= 0 && pageIndex < totalPages) {
        navigateToPage(pageIndex);
      }

      // Update animated value for pagination dots
      pageAnimatedValue.setValue(scrollX / scrollViewWidth);
    },
    [scrollViewWidth, currentPage, totalPages, navigateToPage, pageAnimatedValue],
  );

  // Render individual widget
  // Now simplified: widgets come from store array (includes placeholder during drag)
  // Skip rendering the dragged widget (it's in floating overlay instead)
  const renderWidget = useCallback(
    (widgetId: string, index: number, pageLayout: PageLayout) => {
      const position = pageLayout.cells[index];
      if (!position) {
        return null;
      }

      // Skip rendering the dragged widget - it's in the floating overlay
      if (dragState.isDragging && dragState.draggedWidget?.id === widgetId) {
        return null;
      }

      // Find the widget config from store
      const widgetConfig = widgets.find((w) => w.id === widgetId);
      if (!widgetConfig) {
        return null;
      }

      // Use widget TYPE to look up component
      const WidgetComponent = widgetComponents[widgetConfig.type];
      if (!WidgetComponent) {
        logger.widgetRegistration(
          `⚠️ No component found for widget type: ${widgetConfig.type}`,
          () => ({
            widgetId,
            widgetType: widgetConfig.type,
            availableTypes: Object.keys(widgetComponents),
          }),
        );
        return null;
      }

      // Extract instance number from widget ID (e.g., "depth-0" -> 0)
      const instanceNumber = widgetId.includes('-')
        ? parseInt(widgetId.split('-').pop() || '0', 10)
        : 0;

      // Long press gesture activates drag mode
      const longPressGesture = Gesture.LongPress()
        .minDuration(DRAG_CONFIG.LONG_PRESS_DURATION)
        .onStart((event) => {
          runOnJS(handleLongPressStart)(widgetId, index, pageLayout.pageIndex, event.x, event.y);
        });

      // Render widget with gesture detector for long press (no drag animation here)
      return (
        <GestureDetector key={`${widgetId}-${pageLayout.pageIndex}`} gesture={longPressGesture}>
          <View
            style={[
              styles.widgetContainer,
              {
                position: 'absolute',
                left: position.x,
                top: position.y,
                width: position.width,
                height: position.height,
              },
            ]}
            testID={`widget-${widgetId}`}
          >
            <WidgetComponent id={widgetId} instanceNumber={instanceNumber} />
          </View>
        </GestureDetector>
      );
    },
    [widgets, widgetComponents, dragState, handleLongPressStart],
  );

  // Render page content (AC 2: Dynamic Layout Algorithm)
  // Widgets flow left-to-right, top-to-bottom based on widget store array order
  // Wrapped with WidgetVisibilityProvider for render optimization
  // Note: Widgets stay mounted but hidden with pointerEvents/opacity to prevent hook order issues
  const renderPage = useCallback(
    (pageLayout: PageLayout, pageIndex: number) => {
      const isPageVisible = pageIndex === currentPage;

      return (
        <WidgetVisibilityProvider
          key={`page-${pageIndex}`}
          pageIndex={pageIndex}
          currentPage={currentPage}
          preloadBuffer={0} // Only render visible page (0 = no preload)
        >
          <View
            style={[
              styles.pageContainer,
              {
                width: scrollViewWidth,
                height: responsiveGrid.layout.containerHeight,
                // Hide off-screen pages but keep them mounted to prevent hook order issues
                opacity: isPageVisible ? 1 : 0,
                pointerEvents: isPageVisible ? 'auto' : 'none',
              },
            ]}
            testID={`dashboard-page-${pageIndex}`}
          >
            {/* Widget grid - positioned via calculateGridPositions (row-by-row, left-to-right) */}
            <View style={styles.gridContainer}>
              {pageLayout.widgets.map((widgetId, index) =>
                renderWidget(widgetId, index, pageLayout),
              )}
            </View>
          </View>
        </WidgetVisibilityProvider>
      );
    },
    [scrollViewWidth, responsiveGrid.layout.containerHeight, renderWidget, currentPage],
  );

  // Wait for grid to be ready (gives stores time to initialize on first render)
  if (responsiveGrid.isLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.emptyStateContainer,
          { backgroundColor: theme.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.text} />
        <Text style={[styles.emptyStateText, { color: theme.textSecondary, marginTop: 16 }]}>
          Initializing...
        </Text>
      </View>
    );
  }

  // AC 14: Empty State Display (auto-discovery handles widget creation)
  if (widgets.length === 0) {
    return (
      <View style={styles.emptyStateContainer} testID="dashboard-empty-state">
        {/* Widgets will auto-appear when NMEA data detected */}
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.background }]}
      testID={testID}
      // AC 18: Keyboard Navigation support
      {...(Platform.OS === 'web' && {
        onKeyDown: handleKeyPress,
        tabIndex: 0,
      })}
      // AC 19: Accessibility support
      accessible={true}
      accessibilityRole="none"
      accessibilityLabel={`Dashboard with ${totalPages} pages, currently on page ${
        currentPage + 1
      }`}
    >
      {/* Main dashboard area - AC 11: Header-Dashboard-Footer Hierarchy */}
      <GestureDetector gesture={pageSwipeGesture}>
        <Animated.View style={styles.dashboardArea}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={!dragState.isDragging} // Disable scroll during widget drag
            onLayout={handleScrollViewLayout}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            testID="dashboard-scroll-view"
            // AC 19: Accessibility
            accessible={false} // Let individual widgets be accessible
          >
            {pageLayouts.map((pageLayout) => renderPage(pageLayout, pageLayout.pageIndex))}
          </ScrollView>
        </Animated.View>
      </GestureDetector>

      {/* Pagination dots - AC 6: Page Indicator Dots (Overlays bottom of widgets) */}
      {/* {logger.layout('Rendering pagination:', () => ({
        currentPage,
        totalPages,
        navigateToPage: !!navigateToPage,
      }))} */}
      <View style={styles.paginationOverlay}>
        <PaginationDots
          currentPage={currentPage}
          totalPages={totalPages}
          onPagePress={navigateToPage}
          animatedValue={pageAnimatedValue}
          testID="dashboard-pagination"
        />
      </View>

      {/* Floating dragged widget overlay */}
      {dragState.isDragging && dragState.draggedWidget && floatingPos && (() => {
        const widgetConfig = dragState.draggedWidget;
        const WidgetComponent = widgetComponents[widgetConfig.type];
        
        if (!WidgetComponent) {
          return null;
        }

        // Extract instance number from widget ID
        const instanceNumber = widgetConfig.id.includes('-')
          ? parseInt(widgetConfig.id.split('-').pop() || '0', 10)
          : 0;

        // Pan gesture for dragging the floating overlay
        const panGesture = Gesture.Pan()
          .runOnJS(true)
          .onUpdate((event) => {
            runOnJS(handleDragMove)(
              event.translationX,
              event.translationY,
              event.absoluteX,
              event.absoluteY,
            );
          })
          .onEnd((event) => {
            runOnJS(handleDragEnd)(
              event.translationX,
              event.translationY,
              event.absoluteX,
              event.absoluteY,
            );
          });

        return (
          <GestureDetector gesture={panGesture}>
            <View
              style={[
                styles.floatingOverlay,
                {
                  left: floatingPos.x,
                  top: floatingPos.y,
                  width: responsiveGrid.layout.cellWidth,
                  height: responsiveGrid.layout.cellHeight,
                  opacity: DRAG_CONFIG.DRAGGED_WIDGET_OPACITY,
                },
              ]}
              pointerEvents="box-only"
              testID="floating-dragged-widget"
            >
              <WidgetComponent id={widgetConfig.id} instanceNumber={instanceNumber} />
            </View>
          </GestureDetector>
        );
      })()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dashboardArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexDirection: 'row',
  },
  paginationOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    pointerEvents: 'box-none', // Allow touches only on pagination, not overlay
  },
  pageContainer: {
    position: 'relative',
    // AC 5: Equal cell sizing with 8pt gaps handled in layout calculations
  },
  gridContainer: {
    flex: 1,
    position: 'relative',
  },
  widgetContainer: {
    // Position and size set dynamically in renderWidget
  },
  floatingOverlay: {
    position: 'absolute',
    zIndex: 1000,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default ResponsiveDashboard;
