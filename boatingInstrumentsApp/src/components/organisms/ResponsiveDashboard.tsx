import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  Text,
  ActivityIndicator,
  Animated as RNAnimated,
  Dimensions,
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
 * 
 * Cross-Page Drag-and-Drop (Jan 2026 Implementation):
 * -------------------------------------------------------
 * Enables dragging widgets between dashboard pages with the following features:
 * 
 * 1. Edge-Triggered Auto-Scroll:
 *    - Detects when drag enters 15% edge zones (left/right)
 *    - Triggers page transition after 500ms hover delay
 *    - Visual blue indicators show active edge zones
 *    - Prevents multiple empty pages (max one beyond last populated)
 * 
 * 2. Memory Leak Prevention:
 *    - All timers properly cleared on drag end and unmount
 *    - Refs nulled to release large objects
 *    - Animated values stopped and listeners removed
 *    - Orientation change listener persists without re-subscription
 * 
 * 3. React Native Best Practices:
 *    - All hooks unconditional at top level (no violations)
 *    - Ternary rendering prevents text node leaks
 *    - runOnJS() wraps all store calls from gestures
 *    - State-based edge indicators for reactivity
 *    - currentPageRef prevents stale closure issues
 * 
 * 4. Race Condition Prevention:
 *    - Sensor updates blocked during drag (placeholder guard)
 *    - Direction captured as string to avoid timer closure capture
 *    - currentPageRef synced via useEffect for accurate page tracking
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

  // Drag state - only used to disable scroll during drag
  const [isDragging, setIsDragging] = useState(false);

  // Refs for gesture callbacks to prevent closure issues and useMemo recreation
  const draggedWidgetRef = useRef<WidgetConfig | null>(null);
  const lastMovedIndexRef = useRef(-1); // Prevents duplicate movePlaceholder calls
  const lastPlaceholderUpdateRef = useRef(0); // Throttles placeholder movement
  const initialTouchOffsetRef = useRef({ x: 0, y: 0 }); // Touch offset within widget
  const pageLayoutsRef = useRef<PageLayout[]>([]); // For hit detection
  const responsiveGridRef = useRef<ResponsiveGridState>(responsiveGrid); // For hover calculation
  
  // Cross-page drag refs and state
  // --------------------------------
  // These enable cross-page widget dragging while preventing memory leaks and stale closures:
  // 
  // - animationTimerRef: Tracks page transition animation timeout for cleanup
  // - edgeTimerRef: Tracks edge-hover timeout for auto-scroll cleanup
  // - sourcePageRef: Records page where drag started (for cross-page detection)
  // - currentPageRef: Synced with currentPage state to avoid stale closure in gestures
  // - totalPagesRef: Synced with totalPages to avoid stale closure in edge detection
  // - isNearEdge: State (not ref!) to trigger React re-renders for visual indicators
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const edgeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sourcePageRef = useRef(0);
  const currentPageRef = useRef(0);
  const totalPagesRef = useRef(0);
  const [isNearEdge, setIsNearEdge] = useState({ left: false, right: false });

  // Floating widget overlay position (updated during drag)
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Animation values for page transitions (AC 10)
  const scrollViewRef = useRef<ScrollView>(null);
  const pageAnimatedValue = useRef(new RNAnimated.Value(0)).current;
  const [scrollViewWidth, setScrollViewWidth] = useState(0);
  const handleScrollViewLayout = useCallback((event: any) => {
    const width = event?.nativeEvent?.layout?.width ?? 0;
    if (width > 0) {
      setScrollViewWidth(width);
      logger.dragDrop('[LAYOUT] ScrollView width updated', () => ({ width }));
    }
  }, []);

  // Fallback: Use responsive grid container width if ScrollView layout didn't fire
  // This ensures edge detection works even if onLayout is delayed
  const effectiveScrollViewWidth = scrollViewWidth > 0 
    ? scrollViewWidth 
    : responsiveGrid.layout.containerWidth;

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
    if (responsiveGrid.isLoading) {
      logger.layout('[LAYOUT] Grid still loading, skipping layout calculation', () => ({}));
      return { pageLayouts: [], totalPages: 0 };
    }
    
    if (widgets.length === 0) {
      logger.layout('[LAYOUT] No widgets, skipping layout calculation', () => ({}));
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

  // Update pageLayouts ref whenever it changes (must be after pageLayouts is calculated)
  useEffect(() => {
    pageLayoutsRef.current = pageLayouts;
    responsiveGridRef.current = responsiveGrid;
  }, [pageLayouts, responsiveGrid]);

  // Update currentPageRef when currentPage changes (for gesture callbacks)
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Update totalPagesRef when totalPages changes (for gesture callbacks)
  // CRITICAL: Prevents stale closure capturing totalPages=0 from initial mount
  useEffect(() => {
    totalPagesRef.current = totalPages;
  }, [totalPages]);

  // Animated style for floating widget overlay
  const floatingStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    opacity: isDragging ? 0.6 : 0,
    width: responsiveGrid.layout.cellWidth,
    height: responsiveGrid.layout.cellHeight,
  }));

  // Page navigation functions
  // -------------------------
  // MEMORY LEAK FIX (Jan 2026): Uses animationTimerRef for proper timer cleanup.
  // Previous bug: setTimeout without ref caused state updates on unmounted component.
  const navigateToPage = useCallback(
    (page: number) => {
      // Use ref to avoid stale closure - totalPages might be 0 at callback creation time
      logger.dragDrop('[NAV] navigateToPage called', () => ({ 
        requestedPage: page, 
        totalPages: totalPagesRef.current,
        willNavigate: page >= 0 && page < totalPagesRef.current
      }));
      
      if (page >= 0 && page < totalPagesRef.current) {
        // Avoid redundant state churn if already on this page
        setCurrentPage((prev) => {
          if (prev === page) {
            logger.dragDrop('[NAV] Already on page, skipping', () => ({ page }));
            return prev;
          }
          
          logger.dragDrop('[NAV] Changing page', () => ({ from: prev, to: page }));
          
          // Clear any existing animation timer to prevent multiple timers
          if (animationTimerRef.current) {
            clearTimeout(animationTimerRef.current);
          }
          
          setIsAnimatingPageTransition(true);
          animationTimerRef.current = setTimeout(() => {
            setIsAnimatingPageTransition(false);
            animationTimerRef.current = null;
          }, 300);
          return page;
        });
      } else {
        logger.dragDrop('[NAV] Page out of bounds, blocked', () => ({ 
          page, 
          totalPages: totalPagesRef.current 
        }));
      }
    },
    [], // No dependencies - uses ref instead
  );

  const navigateToNextPage = useCallback(() => {
    // Use refs to avoid stale closure in gesture handlers
    if (currentPageRef.current < totalPagesRef.current - 1) {
      navigateToPage(currentPageRef.current + 1);
    }
  }, [navigateToPage]);

  const navigateToPreviousPage = useCallback(() => {
    // Use refs to avoid stale closure in gesture handlers
    if (currentPageRef.current > 0) {
      navigateToPage(currentPageRef.current - 1);
    }
  }, [navigateToPage]);

  // ========================================
  // DRAG-AND-DROP HANDLERS
  // ========================================

  /**
   * Handle long press - swap widget with placeholder and start drag tracking
   */
  const handleLongPressStart = useCallback(
    (widgetId: string, index: number, pageIndex: number, touchX: number, touchY: number) => {
      logger.dragDrop('[DRAG] Long press start', () => ({ widgetId, index, pageIndex, touchX, touchY }));

      dragHaptics.onLift();

      // Track source page for cross-page drag detection
      sourcePageRef.current = pageIndex;

      // Remove widget from array, insert placeholder at source
      const removedWidget = useWidgetStore.getState().startDrag(widgetId, index);
      if (!removedWidget) {
        console.error('[DRAG] Failed to start drag - widget not found');
        return;
      }

      // Update refs for gesture callbacks
      draggedWidgetRef.current = removedWidget;
      lastMovedIndexRef.current = index; // Start at source position
      
      // Calculate touch offset within the widget cell
      const pageLayout = pageLayoutsRef.current[pageIndex];
      const cell = pageLayout?.cells[index];
      if (cell) {
        initialTouchOffsetRef.current = {
          x: touchX - cell.x,
          y: touchY - cell.y,
        };
      }
      
      // Set initial floating position (maintain touch offset + 5px shift)
      translateX.value = touchX - initialTouchOffsetRef.current.x + 5;
      translateY.value = touchY - initialTouchOffsetRef.current.y + 5;
      
      // Update state to disable scroll
      setIsDragging(true);

      logger.dragDrop('[DRAG] Widget swapped with placeholder', () => ({ widgetId, index }));
    },
    [],
  );

  // Dashboard-level long press gesture with hit detection
  const dashboardGesture = useMemo(
    () => {
      const longPress = Gesture.LongPress()
        .minDuration(DRAG_CONFIG.LONG_PRESS_DURATION)
        .runOnJS(true)
        .onStart((event) => {
          // Hit detection: find which widget was pressed
          const touchX = event.x;
          const touchY = event.y;
          
          // Find the page layout for current page (use ref to avoid closure issues)
          const pageLayout = pageLayoutsRef.current[currentPage];
          if (!pageLayout) return;

          // Check each widget cell to see if touch is inside
          for (let i = 0; i < pageLayout.widgets.length; i++) {
            const widgetId = pageLayout.widgets[i];
            const cell = pageLayout.cells[i];
            if (!cell) continue;

            // Check if touch is within this widget's bounds
            if (
              touchX >= cell.x &&
              touchX <= cell.x + cell.width &&
              touchY >= cell.y &&
              touchY <= cell.y + cell.height
            ) {
              // Convert page-relative index to global array index
              const widgetsPerPage = responsiveGrid.layout.cols * responsiveGrid.layout.rows;
              const globalIndex = currentPage * widgetsPerPage + i;
              
              logger.dragDrop('[DRAG] Hit detected on widget', () => ({ 
                widgetId, 
                pageIndex: i, 
                globalIndex,
                touchX, 
                touchY 
              }));
              handleLongPressStart(widgetId, globalIndex, currentPage, touchX, touchY);
              break;
            }
          }
        });

      const pan = Gesture.Pan()
        .runOnJS(true)
        .onUpdate((event) => {
          // Move floating widget maintaining touch offset within widget (+5px shift)
          translateX.value = event.absoluteX - initialTouchOffsetRef.current.x + 5;
          translateY.value = event.absoluteY - initialTouchOffsetRef.current.y + 5;

          // Edge detection for cross-page auto-scroll
          // ------------------------------------------
          // CRITICAL: Uses currentPageRef (not currentPage) to avoid stale closure.
          // Detects when drag enters 15% edge zones and triggers page transition after 500ms.
          // 
          // Bug Fix History:
          // - Used currentPage: gesture closure captured stale value after auto-scroll
          // - Used isNearLeft/Right in timer callback: captured at timer creation time
          // - Solution: currentPageRef synced via useEffect, direction passed as string
          // - Jan 2026: Added fallback to responsiveGrid width when ScrollView layout doesn't fire
          // - Jan 2026: Use totalPagesRef to avoid stale closure capturing totalPages=0
          const edgeThreshold = effectiveScrollViewWidth * 0.15; // 15% of screen width
          const isNearLeft = event.absoluteX < edgeThreshold && currentPageRef.current > 0;
          const isNearRight = event.absoluteX > effectiveScrollViewWidth - edgeThreshold && currentPageRef.current < totalPagesRef.current - 1;
          
          // Debug logging for edge detection
          runOnJS((x: number, width: number, threshold: number, left: boolean, right: boolean, page: number, total: number) => {
            logger.dragDrop('[EDGE] Detection', () => ({
              absoluteX: x,
              scrollViewWidth: width,
              edgeThreshold: threshold,
              leftZone: `0 - ${threshold}`,
              rightZone: `${width - threshold} - ${width}`,
              isNearLeft: left,
              isNearRight: right,
              currentPage: page,
              totalPages: total,
            }));
          })(event.absoluteX, effectiveScrollViewWidth, edgeThreshold, isNearLeft, isNearRight, currentPageRef.current, totalPagesRef.current);
          
          // Update edge state for visual indicators (state triggers React re-render)
          runOnJS(setIsNearEdge)({ left: isNearLeft, right: isNearRight });
          
          // Start edge timer if near edge, clear if moved away
          if (isNearLeft || isNearRight) {
            if (!edgeTimerRef.current) {
              // Capture direction as string to avoid closure capture bug
              const direction = isNearLeft ? 'left' : 'right';
              logger.dragDrop('[TIMER] Starting edge timer', () => ({ direction, delay: 500 }));
              runOnJS((dir: string) => {
                edgeTimerRef.current = setTimeout(() => {
                  logger.dragDrop('[TIMER] Timer fired, navigating', () => ({ direction: dir }));
                  if (dir === 'left') {
                    navigateToPreviousPage();
                  } else {
                    navigateToNextPage();
                  }
                  edgeTimerRef.current = null;
                }, 500);
                logger.dragDrop('[TIMER] Timer created', () => ({ timerId: edgeTimerRef.current }));
              })(direction);
            } else {
              logger.dragDrop('[TIMER] Timer already running', () => ({ timerId: edgeTimerRef.current }));
            }
          } else {
            if (edgeTimerRef.current) {
              logger.dragDrop('[TIMER] Clearing timer', () => ({ timerId: edgeTimerRef.current }));
              runOnJS(() => {
                if (edgeTimerRef.current) {
                  clearTimeout(edgeTimerRef.current);
                  edgeTimerRef.current = null;
                  logger.dragDrop('[TIMER] Timer cleared', () => ({}));
                }
              })();
            }
          }

          // Calculate which widget index is being hovered
          const hoverIndex = calculateHoverIndex(
            event.absoluteX,
            event.absoluteY,
            responsiveGridRef.current,
            currentPageRef.current,
          );

          // Track hover index (store update causes gesture interruption)
          if (hoverIndex !== -1 && hoverIndex !== lastMovedIndexRef.current) {
            logger.dragDrop('[DRAG] Hovering over index', () => ({ hoverIndex }));
            lastMovedIndexRef.current = hoverIndex;
          }
        })
        .onEnd(() => {
          // Clear edge timer
          if (edgeTimerRef.current) {
            clearTimeout(edgeTimerRef.current);
            edgeTimerRef.current = null;
          }
          
          if (draggedWidgetRef.current) {
            const finalIndex = lastMovedIndexRef.current;
            const sourcePage = sourcePageRef.current;
            const targetPage = currentPageRef.current;
            
            logger.dragDrop('[DRAG] Dropped at final position', () => ({ finalIndex, sourcePage, targetPage }));
            
            // Check if this is a cross-page drag
            if (sourcePage !== targetPage) {
              // Cross-page move
              const widgetsPerPage = responsiveGrid.layout.cols * responsiveGrid.layout.rows;
              const positionInPage = finalIndex % widgetsPerPage;
              
              logger.dragDrop('[DRAG] Cross-page move calculation', () => ({
                finalIndex,
                widgetsPerPage,
                positionInPage,
                calculatedTargetIndex: targetPage * widgetsPerPage + positionInPage,
              }));
              
              runOnJS(useWidgetStore.getState().moveWidgetCrossPage)(
                draggedWidgetRef.current,
                sourcePage,
                targetPage,
                positionInPage,
                widgetsPerPage
              );
            } else {
              // Same page reorder
              // If finalIndex is -1 (no hover detected), pass undefined to use placeholder position
              const targetIndex = finalIndex >= 0 ? finalIndex : undefined;
              runOnJS(useWidgetStore.getState().finishDrag)(draggedWidgetRef.current, targetIndex);
            }
            
            // Reset
            draggedWidgetRef.current = null;
            lastMovedIndexRef.current = -1;
            runOnJS(setIsDragging)(false);
            runOnJS(setIsNearEdge)({ left: false, right: false });
          }
        });

      // Simultaneous: both gestures active, long press activates drag, pan tracks movement
      return Gesture.Simultaneous(longPress, pan);
    },
    [currentPage, handleLongPressStart],
  );

  // Handle keyboard navigation (AC 18) - with proper cleanup
  // ----------------------------------------------------------
  // MEMORY LEAK FIX (Jan 2026): Moved from inline callback to useEffect with cleanup.
  // Previous bug: No removeEventListener, causing memory leak on unmount.
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleKeyDown = (event: KeyboardEvent) => {
        switch (event.key) {
          case 'ArrowLeft':
            navigateToPreviousPage();
            break;
          case 'ArrowRight':
            navigateToNextPage();
            break;
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [navigateToNextPage, navigateToPreviousPage]);

  // Handle scroll for page detection
  const handleScroll = useCallback(
    (event: any) => {
      if (effectiveScrollViewWidth <= 0) return;
      const scrollX = event.nativeEvent.contentOffset.x;
      const pageIndex = Math.round(scrollX / effectiveScrollViewWidth);

      if (pageIndex !== currentPage && pageIndex >= 0 && pageIndex < totalPages) {
        navigateToPage(pageIndex);
      }

      // Update animated value for pagination dots
      pageAnimatedValue.setValue(scrollX / effectiveScrollViewWidth);
    },
    [effectiveScrollViewWidth, currentPage, totalPages, navigateToPage, pageAnimatedValue],
  );

  // Comprehensive cleanup on unmount - prevents memory leaks
  // ---------------------------------------------------------
  // CRITICAL: Consolidates all cleanup to prevent 9 identified memory leaks:
  // 1. animationTimerRef - page transition timer
  // 2. edgeTimerRef - auto-scroll timer
  // 3. draggedWidgetRef - large widget object
  // 4. pageLayoutsRef - array of layout objects
  // 5. scrollViewRef - ScrollView component reference
  // 6. pageAnimatedValue - RN Animated value with listeners
  // 7. translateX - Reanimated shared value
  // 8. translateY - Reanimated shared value
  // 9. (keyboard listener cleanup handled in separate useEffect)
  useEffect(() => {
    return () => {
      // Clear all timers
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
      if (edgeTimerRef.current) {
        clearTimeout(edgeTimerRef.current);
      }
      
      // Null out refs holding large objects
      draggedWidgetRef.current = null;
      pageLayoutsRef.current = [];
      scrollViewRef.current = null;
      
      // Stop animated value
      pageAnimatedValue.stopAnimation();
      pageAnimatedValue.removeAllListeners();
      
      // Cancel running Reanimated animations
      translateX.value = 0;
      translateY.value = 0;
    };
  }, [pageAnimatedValue, translateX, translateY]);

  // Cancel drag on orientation change
  // ----------------------------------
  // OPTIMIZATION (Jan 2026): Empty deps array prevents unnecessary re-subscription.
  // Previous bug: isDragging dependency caused listener to be removed/re-added on every drag state change.
  // Fix: Check drag state via draggedWidgetRef at callback time (always fresh).
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      // Check isDragging at callback time (not closure capture)
      if (draggedWidgetRef.current !== null) {
        // Cancel drag and restore widget
        useWidgetStore.getState().removePlaceholder();
        draggedWidgetRef.current = null;
        setIsDragging(false);
        setIsNearEdge({ left: false, right: false });
      }
    });
    
    return () => subscription?.remove();
  }, []); // Empty deps - listener persists for component lifetime

  // Render individual widget
  // Now simplified: widgets come from store array (includes placeholder during drag)
  // Skip rendering the dragged widget (it's in floating overlay instead)
  const renderWidget = useCallback(
    (widgetId: string, index: number, pageLayout: PageLayout) => {
      const position = pageLayout.cells[index];
      if (!position) {
        return null;
      }

      // Widgets render normally from store array (includes placeholder)

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

      // Render widget (gesture is on dashboard container, not individual widgets)
      return (
        <View
          key={`${widgetId}-${pageLayout.pageIndex}`}
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
      );
    },
    [widgets, widgetComponents, isDragging, handleLongPressStart],
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
      // AC 18: Keyboard Navigation support (handled via useEffect)
      {...(Platform.OS === 'web' && {
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
      <GestureDetector gesture={dashboardGesture}>
        <View style={styles.dashboardArea}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={!isDragging} // Disable scroll during widget drag
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
        </View>
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

      {/* Edge zone indicators for cross-page drag */}
      {/* ------------------------------------------ */}
      {/* REACTIVITY FIX: Uses state (not ref) to trigger re-renders. */}
      {/* TERNARY PATTERN: Prevents double-&& text node leaks per copilot-instructions. */}
      {isDragging ? (
        isNearEdge.left && currentPage > 0 ? (
          <Animated.View style={styles.leftEdgeIndicator} pointerEvents="none" />
        ) : null
      ) : null}
      
      {isDragging ? (
        isNearEdge.right && currentPage < totalPages - 1 ? (
          <Animated.View style={styles.rightEdgeIndicator} pointerEvents="none" />
        ) : null
      ) : null}

      {/* Floating widget overlay during drag */}
      {isDragging && draggedWidgetRef.current && (
        <Animated.View
          style={[styles.floatingOverlay, floatingStyle]}
          pointerEvents="none"
        >
          {(() => {
            const WidgetComponent = widgetComponents[draggedWidgetRef.current.type];
            if (!WidgetComponent) return null;
            
            const instanceNumber = draggedWidgetRef.current.id.includes('-')
              ? parseInt(draggedWidgetRef.current.id.split('-').pop() || '0', 10)
              : 0;
            
            return (
              <WidgetComponent 
                id={draggedWidgetRef.current.id} 
                instanceNumber={instanceNumber}
              />
            );
          })()}
        </Animated.View>
      )}
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
  leftEdgeIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 50,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    zIndex: 999,
  },
  rightEdgeIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 50,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    zIndex: 999,
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
