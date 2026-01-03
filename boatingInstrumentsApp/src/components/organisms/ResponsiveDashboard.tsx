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

// ========================================
// DRAGGABLE WIDGET COMPONENT
// ========================================
// Separate component to properly use hooks for drag animations
interface DraggableWidgetProps {
  widgetId: string;
  index: number;
  pageIndex: number;
  position: { x: number; y: number; width: number; height: number };
  WidgetComponent: React.ComponentType<any>;
  instanceNumber: number;
  isBeingDragged: boolean;
  isDragging: boolean;
  dragX: Animated.SharedValue<number>;
  dragY: Animated.SharedValue<number>;
  dragScale: Animated.SharedValue<number>;
  dragElevation: Animated.SharedValue<number>;
  touchOffset: { x: number; y: number } | null;
  onLongPressStart: (
    widgetId: string,
    index: number,
    pageIndex: number,
    touchX: number,
    touchY: number,
  ) => void;
  onDragMove: (
    translateX: number,
    translateY: number,
    absoluteX: number,
    absoluteY: number,
  ) => void;
  onDragEnd: (translateX: number, translateY: number, absoluteX: number, absoluteY: number) => void;
}

const DraggableWidget: React.FC<DraggableWidgetProps> = React.memo(
  ({
    widgetId,
    index,
    pageIndex,
    position,
    WidgetComponent,
    instanceNumber,
    isBeingDragged,
    isDragging,
    dragX,
    dragY,
    dragScale,
    dragElevation,
    touchOffset,
    onLongPressStart,
    onDragMove,
    onDragEnd,
  }) => {
    // Long press gesture activates drag mode
    const longPressGesture = Gesture.LongPress()
      .minDuration(DRAG_CONFIG.LONG_PRESS_DURATION)
      .onStart((event) => {
        runOnJS(onLongPressStart)(widgetId, index, pageIndex, event.x, event.y);
      });

    // Pan gesture for dragging - always calls handlers, they check drag state internally
    const panGesture = Gesture.Pan()
      .runOnJS(true)
      .onUpdate((event) => {
        // Always call handler - it checks dragState.isDragging internally
        runOnJS(onDragMove)(
          event.translationX,
          event.translationY,
          event.absoluteX,
          event.absoluteY,
        );
      })
      .onEnd((event) => {
        // Always call handler - it checks dragState.isDragging internally
        runOnJS(onDragEnd)(
          event.translationX,
          event.translationY,
          event.absoluteX,
          event.absoluteY,
        );
      });

    // Combine gestures: long press can trigger while panning
    const combinedGesture = Gesture.Simultaneous(longPressGesture, panGesture);

    // Animated style for dragged widget
    const animatedStyle = useAnimatedStyle(() => {
      if (!isBeingDragged) {
        return {};
      }

      // dragX/dragY are translation values (relative movement from start)
      // We apply them directly as the widget moves relative to its initial position
      return {
        transform: [
          { translateX: dragX.value },
          { translateY: dragY.value },
          { scale: dragScale.value },
        ],
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: dragElevation.value,
        zIndex: 999, // Bring to front
      };
    }, [isBeingDragged]);

    return (
      <GestureDetector gesture={combinedGesture}>
        <Animated.View
          style={[
            styles.widgetContainer,
            {
              position: 'absolute',
              left: position.x,
              top: position.y,
              width: position.width,
              height: position.height,
              opacity: isBeingDragged ? DRAG_CONFIG.DRAGGED_WIDGET_OPACITY : 1,
            },
            animatedStyle,
          ]}
          testID={`widget-${widgetId}`}
        >
          <WidgetComponent id={widgetId} instanceNumber={instanceNumber} />
        </Animated.View>
      </GestureDetector>
    );
  },
);

DraggableWidget.displayName = 'DraggableWidget';

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

  // Drag state management
  const [dragState, setDragState] = useState<{
    widgetId: string | null;
    sourceIndex: number | null;
    sourcePageIndex: number | null;
    isDragging: boolean;
    touchOffset: { x: number; y: number } | null;
    placeholderIndex: number | null; // LOCAL placeholder position, not in widget array
  }>({
    widgetId: null,
    sourceIndex: null,
    sourcePageIndex: null,
    isDragging: false,
    touchOffset: null,
    placeholderIndex: null,
  });

  // Shared values for drag animations (Reanimated)
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragScale = useSharedValue(1);
  const dragElevation = useSharedValue(2);

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

      setDragState({
        widgetId,
        sourceIndex: index,
        sourcePageIndex: pageIndex,
        isDragging: true,
        touchOffset: { x: touchX, y: touchY },
        placeholderIndex: index, // Start with placeholder at source position
      });

      // Animate widget lift
      dragScale.value = withSpring(
        DRAG_CONFIG.DRAGGED_WIDGET_SCALE,
        DRAG_CONFIG.DROP_SPRING_CONFIG,
      );
      dragElevation.value = withTiming(DRAG_CONFIG.DRAGGED_WIDGET_ELEVATION);

      logger.dragDrop('Widget lifted', () => ({ widgetId, index, pageIndex, touchX, touchY }));
    },
    [dragScale, dragElevation],
  );

  /**
   * Handle drag move - update position and placeholder
   */
  const handleDragMove = useCallback(
    (translationX: number, translationY: number, absoluteX: number, absoluteY: number) => {
      if (!dragState.isDragging) return;

      console.log('[DRAG] Move:', { translationX, translationY, absoluteX, absoluteY });

      // Update shared values directly - no spring animation on every frame for smooth tracking
      dragX.value = translationX;
      dragY.value = translationY;

      console.log('[DRAG] Updated shared values:', dragX.value, dragY.value);

      // Calculate hover index (which cell is being hovered over)
      const hoverIndex = calculateHoverIndex(absoluteX, absoluteY, responsiveGrid, currentPage);

      // Update placeholder if hovering over different position
      if (hoverIndex !== -1 && hoverIndex !== dragState.placeholderIndex) {
        if (isDragSignificant(translationX, translationY)) {
          console.log('[DRAG] Update placeholder:', dragState.placeholderIndex, '→', hoverIndex);
          setDragState((prev) => ({ ...prev, placeholderIndex: hoverIndex }));
        }
      }
    },
    [dragState.isDragging, dragState.placeholderIndex, dragX, dragY, responsiveGrid, currentPage],
  );

  /**
   * Handle drag end - complete reorder or cancel
   */
  const handleDragEnd = useCallback(
    (translationX: number, translationY: number, absoluteX: number, absoluteY: number) => {
      if (!dragState.isDragging || !dragState.widgetId) return;

      // Debounce: prevent double-trigger from rapid gestures
      const now = Date.now();
      if (now - lastDragEndTime.current < DRAG_CONFIG.DRAG_END_DEBOUNCE) {
        return;
      }
      lastDragEndTime.current = now;

      // Calculate final drop position
      const dropIndex = calculateHoverIndex(absoluteX, absoluteY, responsiveGrid, currentPage);

      // Only reorder if moved to different position and movement was significant
      if (
        dropIndex !== -1 &&
        dropIndex !== dragState.sourceIndex &&
        isDragSignificant(translationX, translationY)
      ) {
        useWidgetStore.getState().reorderWidget(dragState.sourceIndex!, dropIndex);
        dragHaptics.onDrop();

        logger.dragDrop('Widget dropped', () => ({
          widgetId: dragState.widgetId,
          fromIndex: dragState.sourceIndex,
          toIndex: dropIndex,
        }));
      } else {
        dragHaptics.onCancel();
      }

      // Animate back to normal first, THEN reset state
      // This ensures spring animation completes while widget is still in drag mode
      dragScale.value = withSpring(1, DRAG_CONFIG.DROP_SPRING_CONFIG);
      dragElevation.value = withTiming(2);
      dragX.value = withSpring(0, DRAG_CONFIG.DROP_SPRING_CONFIG);
      dragY.value = withSpring(0, DRAG_CONFIG.DROP_SPRING_CONFIG);

      // Delay state reset until animation completes (spring takes ~300ms to settle)
      setTimeout(() => {
        setDragState({
          widgetId: null,
          sourceIndex: null,
          sourcePageIndex: null,
          isDragging: false,
          touchOffset: null,
          placeholderIndex: null,
        });
      }, 300);
    },
    [
      dragState.isDragging,
      dragState.widgetId,
      dragState.sourceIndex,
      dragX,
      dragY,
      dragScale,
      dragElevation,
      responsiveGrid,
      currentPage,
    ],
  );

  /**
   * Cancel drag (Escape key or widget unmounted)
   */
  const handleDragCancel = useCallback(() => {
    if (!dragState.isDragging) return;

    dragHaptics.onCancel();

    setDragState({
      widgetId: null,
      sourceIndex: null,
      sourcePageIndex: null,
      isDragging: false,
      touchOffset: null,
      placeholderIndex: null,
    });

    // Animate back to original position
    dragScale.value = withSpring(1, DRAG_CONFIG.DROP_SPRING_CONFIG);
    dragElevation.value = withTiming(2);
    dragX.value = withSpring(0, DRAG_CONFIG.DROP_SPRING_CONFIG);
    dragY.value = withSpring(0, DRAG_CONFIG.DROP_SPRING_CONFIG);

    logger.dragDrop('Drag cancelled', () => ({ widgetId: dragState.widgetId }));
  }, [dragState.isDragging, dragScale, dragElevation, dragX, dragY]);

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
    if (dragState.isDragging && dragState.widgetId) {
      const widgetExists = widgets.some((w) => w.id === dragState.widgetId);
      if (!widgetExists) {
        handleDragCancel();
      }
    }
  }, [widgets, dragState.isDragging, dragState.widgetId, handleDragCancel]);

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
  const renderWidget = useCallback(
    (widgetId: string, index: number, pageLayout: PageLayout) => {
      const position = pageLayout.cells[index];
      if (!position) {
        return null;
      }

      const isActiveWidget = dragState.isDragging && dragState.widgetId === widgetId;
      const isSourcePosition = dragState.isDragging && index === dragState.sourceIndex;
      const isPlaceholderPosition = dragState.isDragging && index === dragState.placeholderIndex;

      // ========================================
      // PLACEHOLDER RENDERING (at hover position)
      // ========================================
      if (isPlaceholderPosition && !isSourcePosition) {
        return (
          <View
            key={`placeholder-${index}`}
            style={[
              styles.widgetContainer,
              {
                position: 'absolute',
                left: position.x,
                top: position.y,
                width: position.width,
                height: position.height,
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: theme?.colors?.primary || '#007AFF',
                backgroundColor: 'rgba(0, 122, 255, 0.1)',
                borderRadius: 8,
              },
            ]}
            testID="drag-placeholder"
          />
        );
      }

      // ========================================
      // NORMAL WIDGET RENDERING
      // ========================================
      // Note: We render DraggableWidget for all widgets, including the one being dragged.
      // The DraggableWidget component handles making it translucent and animated when isBeingDragged=true.

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

      // Check if this widget is being dragged
      const isBeingDragged = dragState.isDragging && dragState.widgetId === widgetId;

      return (
        <DraggableWidget
          key={`${widgetId}-${pageLayout.pageIndex}`}
          widgetId={widgetId}
          index={index}
          pageIndex={pageLayout.pageIndex}
          position={position}
          WidgetComponent={WidgetComponent}
          instanceNumber={instanceNumber}
          isBeingDragged={isBeingDragged}
          isDragging={dragState.isDragging}
          dragX={dragX}
          dragY={dragY}
          dragScale={dragScale}
          dragElevation={dragElevation}
          touchOffset={isBeingDragged ? dragState.touchOffset : null}
          onLongPressStart={handleLongPressStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        />
      );
    },
    [
      widgets,
      widgetComponents,
      theme,
      dragState,
      dragX,
      dragY,
      dragScale,
      dragElevation,
      handleLongPressStart,
      handleDragMove,
      handleDragEnd,
    ],
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
