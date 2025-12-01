import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Animated,
  GestureResponderEvent,
  Dimensions,
  Platform,
} from 'react-native';
import { PanGestureHandler, State, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { useTheme } from '../../store/themeStore';
import { useWidgetStore } from '../../store/widgetStore';
import { useResponsiveGrid, type ResponsiveGridState } from '../../hooks/useResponsiveGrid';
import { PaginationDots } from '../molecules/PaginationDots';
import { AddWidgetButton, AddWidgetButtonPositioned } from '../atoms/AddWidgetButton';
import {
  calculatePageLayouts,
  calculateGridPositions,
  type LayoutConstraints,
  type PageLayout,
  createPageTransitionConfig,
} from '../../utils/layoutUtils';
import { WidgetSelector } from '../../widgets/WidgetSelector';

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

interface ResponsiveDashboardProps {
  headerHeight?: number;
  footerHeight?: number;
  pageIndicatorHeight?: number;
  onWidgetPress?: (widgetId: string) => void;
  onWidgetLongPress?: (widgetId: string) => void;
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
 */
export const ResponsiveDashboard: React.FC<ResponsiveDashboardProps> = ({
  headerHeight = 60,
  footerHeight = 88,
  pageIndicatorHeight = 30,
  onWidgetPress,
  onWidgetLongPress,
  testID = 'responsive-dashboard',
}) => {
  const theme = useTheme();
  
  // Widget store integration
  const {
    selectedWidgets,
    currentPage,
    totalPages,
    pageWidgets,
    maxWidgetsPerPage,
    isAnimatingPageTransition,
    navigateToPage,
    navigateToNextPage,
    navigateToPreviousPage,
    recalculatePages,
    getWidgetsForPage,
    addWidgetToOptimalPage,
  } = useWidgetStore();

  // Responsive grid system (AC 1-5)
  const responsiveGrid: ResponsiveGridState = useResponsiveGrid(
    headerHeight,
    footerHeight,
    pageIndicatorHeight
  );

  // Widget selector modal state
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);

  // Animation values for page transitions (AC 10)
  const scrollViewRef = useRef<ScrollView>(null);
  const pageAnimatedValue = useRef(new Animated.Value(0)).current;
  const [scrollViewWidth, setScrollViewWidth] = useState(0);

  // Gesture handling for swipe navigation (AC 8)
  const panResponderRef = useRef<PanGestureHandler>(null);

  // Widget component mapping
  const widgetComponents: Record<string, React.ComponentType<any>> = {
    depth: DepthWidget,
    speed: SpeedWidget,
    wind: WindWidget,
    gps: GPSWidget,
    compass: CompassWidget,
    engine: EngineWidget,
    battery: BatteryWidget,
    tanks: TanksWidget,
    autopilot: AutopilotWidget,
  };

  // AC 4: Real-time adaptation - recalculate pages when grid changes
  useEffect(() => {
    if (!responsiveGrid.isLoading) {
      recalculatePages(responsiveGrid.layout.widgetsPerPage);
    }
  }, [
    responsiveGrid.layout.widgetsPerPage,
    responsiveGrid.isLoading,
    recalculatePages,
  ]);

  // Update scroll position when page changes (AC 9: Page State Persistence)
  useEffect(() => {
    if (scrollViewRef.current && scrollViewWidth > 0) {
      const scrollX = currentPage * scrollViewWidth;
      scrollViewRef.current.scrollTo({ x: scrollX, animated: !isAnimatingPageTransition });
    }
  }, [currentPage, scrollViewWidth, isAnimatingPageTransition]);

  // Calculate layout constraints from responsive grid
  const layoutConstraints: LayoutConstraints = {
    containerWidth: responsiveGrid.layout.containerWidth,
    containerHeight: responsiveGrid.layout.containerHeight,
    cols: responsiveGrid.layout.cols,
    rows: responsiveGrid.layout.rows,
    gap: 8, // From WIDGET_CONSTRAINTS in useResponsiveGrid
    cellWidth: responsiveGrid.layout.cellWidth,
    cellHeight: responsiveGrid.layout.cellHeight,
  };

  // Calculate page layouts
  const pageLayouts: PageLayout[] = calculatePageLayouts(selectedWidgets, layoutConstraints);

  // Handle swipe gestures for page navigation (AC 8)
  const handleSwipeGesture = useCallback((event: PanGestureHandlerGestureEvent) => {
    const { translationX, velocityX, state } = event.nativeEvent;

    if (state === State.END) {
      const threshold = 50; // Minimum swipe distance
      const velocityThreshold = 500; // Minimum swipe velocity

      if (Math.abs(translationX) > threshold || Math.abs(velocityX) > velocityThreshold) {
        if (translationX > 0 || velocityX > 0) {
          // Swipe right - previous page
          navigateToPreviousPage();
        } else {
          // Swipe left - next page
          navigateToNextPage();
        }
      }
    }
  }, [navigateToNextPage, navigateToPreviousPage]);

  // Handle keyboard navigation (AC 18)
  const handleKeyPress = useCallback((event: any) => {
    if (Platform.OS === 'web') {
      switch (event.key) {
        case 'ArrowLeft':
          navigateToPreviousPage();
          break;
        case 'ArrowRight':
          navigateToNextPage();
          break;
        case 'Enter':
        case ' ':
          setShowWidgetSelector(true);
          break;
      }
    }
  }, [navigateToNextPage, navigateToPreviousPage]);

  // Handle scroll for page detection
  const handleScroll = useCallback((event: any) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(scrollX / scrollViewWidth);
    
    if (pageIndex !== currentPage && pageIndex >= 0 && pageIndex < totalPages) {
      navigateToPage(pageIndex);
    }

    // Update animated value for pagination dots
    pageAnimatedValue.setValue(scrollX / scrollViewWidth);
  }, [scrollViewWidth, currentPage, totalPages, navigateToPage, pageAnimatedValue]);

  // Render individual widget
  const renderWidget = useCallback((widgetId: string, index: number, pageLayout: PageLayout) => {
    const WidgetComponent = widgetComponents[widgetId];
    if (!WidgetComponent) return null;

    const position = pageLayout.cells[index];
    if (!position) return null;

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
        <WidgetComponent
          onPress={() => onWidgetPress?.(widgetId)}
          onLongPress={() => onWidgetLongPress?.(widgetId)}
        />
      </View>
    );
  }, [widgetComponents, onWidgetPress, onWidgetLongPress]);

  // Render page content (AC 2: Dynamic Layout Algorithm)
  const renderPage = useCallback((pageLayout: PageLayout, pageIndex: number) => {
    const isLastPage = pageIndex === totalPages - 1;
    
    return (
      <View
        key={`page-${pageIndex}`}
        style={[
          styles.pageContainer,
          {
            width: scrollViewWidth,
            height: responsiveGrid.layout.containerHeight,
          },
        ]}
        testID={`dashboard-page-${pageIndex}`}
      >
        {/* Widget grid */}
        <View style={styles.gridContainer}>
          {pageLayout.widgets.map((widgetId, index) =>
            renderWidget(widgetId, index, pageLayout)
          )}
        </View>

        {/* Add widget button at end of flow (AC 7) */}
        {isLastPage && (
          <AddWidgetButtonPositioned
            position="end-of-grid"
            onPress={() => setShowWidgetSelector(true)}
            testID="add-widget-button"
            accessibilityLabel="Add new widget to dashboard"
          />
        )}
      </View>
    );
  }, [
    totalPages,
    scrollViewWidth,
    responsiveGrid.layout.containerHeight,
    renderWidget,
  ]);

  // AC 14: Empty State Display
  if (selectedWidgets.length === 0) {
    return (
      <View style={styles.emptyStateContainer} testID="dashboard-empty-state">
        <AddWidgetButton
          onPress={() => setShowWidgetSelector(true)}
          size={80}
          testID="add-first-widget-button"
          accessibilityLabel="Add your first widget to get started"
        />
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
      accessibilityLabel={`Dashboard with ${totalPages} pages, currently on page ${currentPage + 1}`}
    >
      {/* Main dashboard area - AC 11: Header-Dashboard-Footer Hierarchy */}
      <PanGestureHandler
        ref={panResponderRef}
        onHandlerStateChange={handleSwipeGesture}
        enabled={totalPages > 1} // Only enable swipe when multiple pages
      >
        <Animated.View style={styles.dashboardArea}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onLayout={(event) => setScrollViewWidth(event.nativeEvent.layout.width)}
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
      </PanGestureHandler>

      {/* Pagination dots - AC 6: Page Indicator Dots */}
      <PaginationDots
        currentPage={currentPage}
        totalPages={totalPages}
        onPagePress={navigateToPage}
        animatedValue={pageAnimatedValue}
        testID="dashboard-pagination"
      />

      {/* Widget selector modal */}
      <WidgetSelector
        visible={showWidgetSelector}
        selected={selectedWidgets}
        onChange={(newSelectedWidgets) => {
          // Handle widget selection changes here
          setShowWidgetSelector(false);
        }}
        onClose={() => setShowWidgetSelector(false)}
      />
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
});

export default ResponsiveDashboard;