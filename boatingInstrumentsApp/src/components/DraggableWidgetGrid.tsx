import React, { useMemo, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Pressable, Text, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useWidgetStore, WidgetConfig } from '../store/widgetStore';
import { WidgetFactory } from '../services/WidgetFactory';
import { WidgetRegistry } from '../widgets/WidgetRegistry';
import { DynamicLayoutService } from '../services/dynamicLayoutService';
import { useTheme } from '../store/themeStore';
import { logger } from '../utils/logger';

interface DraggableWidgetGridProps {
  pageIndex: number;
  onMoveToPage?: (widgetId: string, targetPage: number) => void;
  availableWidth?: number;
  availableHeight?: number;
}

// Memoized widget component to prevent unnecessary re-renders
interface MemoizedWidgetProps {
  widgetId: string;
  width: number;
  height: number;
}

const MemoizedWidget = React.memo<MemoizedWidgetProps>(
  ({ widgetId, width, height }) => {
    const { baseType } = WidgetFactory.parseWidgetId(widgetId);
    const registeredWidget = WidgetRegistry.getWidget(baseType);
    
    if (!registeredWidget) return null;
    
    const Component = registeredWidget.component;
    const title = WidgetFactory.getWidgetTitle(widgetId);
    
    return <Component id={widgetId} title={title} width={width} height={height} />;
  },
  (prevProps, nextProps) => {
    // Only re-render if dimensions or widget ID change
    return (
      prevProps.widgetId === nextProps.widgetId &&
      prevProps.width === nextProps.width &&
      prevProps.height === nextProps.height
    );
  }
);

// Draggable widget wrapper with animations (gesture-handler pattern)
interface DraggableWidgetProps {
  isActive: boolean;
  translation: { x: Animated.SharedValue<number>; y: Animated.SharedValue<number> };
  width: number;
  height: number;
  initialPosition?: { x: number; y: number };
  touchOffset?: { x: number; y: number };
  children: React.ReactNode;
}

const DraggableWidget: React.FC<DraggableWidgetProps> = ({
  isActive,
  translation,
  width,
  height,
  initialPosition,
  touchOffset,
  children,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    // Only apply transforms when actively dragging
    if (!isActive) {
      return {
        transform: [
          { translateX: 0 },
          { translateY: 0 },
        ],
      };
    }
    
    return {
      transform: [
        { translateX: translation.x.value },
        { translateY: translation.y.value },
      ],
    };
  });
  
  const containerStyle = isActive ? {
    position: 'absolute' as const,
    // Position widget so the touch point stays under the pointer
    left: (initialPosition?.x || 0) - (touchOffset?.x || 0),
    top: (initialPosition?.y || 0) - (touchOffset?.y || 0),
    zIndex: 999,
    opacity: 0.7,
  } : {};
  
  return (
    <Animated.View
      style={[
        styles.autoDiscoveryWidget,
        { width, height },
        containerStyle,
        animatedStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
};

export const DraggableWidgetGrid: React.FC<DraggableWidgetGridProps> = ({
  pageIndex,
  onMoveToPage,
  availableWidth,
  availableHeight,
}) => {
  const theme = useTheme();
  
  // Get current dashboard config
  const dashboard = useWidgetStore(state => state.dashboard);
  
  const reorderWidgetsOnPage = useWidgetStore(state => state.reorderWidgetsOnPage);
  const moveWidgetToPage = useWidgetStore(state => state.moveWidgetToPage);
  const widgetExpirationTimeout = useWidgetStore(state => state.widgetExpirationTimeout);
  const enableWidgetAutoRemoval = useWidgetStore(state => state.enableWidgetAutoRemoval);
  
  // Modern drag state with Reanimated SharedValues
  const [dragActive, setDragActive] = useState(false);
  const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState<number | null>(null);
  
  // SharedValues for smooth animations
  const activeWidgetTranslation = {
    x: useSharedValue(0),
    y: useSharedValue(0),
  };
  
  // Track initial position for calculations
  const [activeWidgetInitialPosition, setActiveWidgetInitialPosition] = useState({ x: 0, y: 0 });
  const [activeWidgetGlobalIndex, setActiveWidgetGlobalIndex] = useState<number>(-1);
  const [initialTouchOffset, setInitialTouchOffset] = useState({ x: 0, y: 0 });
  
  // Refs to track current values without causing re-renders that interfere with gestures
  const pressedWidgetIdRef = useRef<string | null>(null);
  const placeholderIndexRef = useRef<number | null>(null);

  // Compute visible widget count separately to avoid array reference changes
  const visibleWidgetCount = useMemo(
    () => (dashboard?.widgets || []).filter(w => w.layout?.visible !== false).length,
    [dashboard?.widgets]
  );

  // Calculate grid config for consistent widget sizing
  const gridConfig = useMemo(() => {
    // Don't calculate if dimensions aren't available yet
    if (!availableWidth || !availableHeight || availableWidth === 0 || availableHeight === 0) {
      return {
        columns: 1,
        rows: 1,
        widgetWidth: 100,
        widgetHeight: 100,
        spacing: 0,
        margin: 0,
        availableHeight: 100,
        availableWidth: 100,
      };
    }
    
    const headerHeight = 0; // Dimensions already exclude header
    const footerHeight = 0; // No footer - widgets extend to bottom
    return DynamicLayoutService.getGridConfig(headerHeight, footerHeight, visibleWidgetCount, availableWidth, availableHeight);
  }, [visibleWidgetCount, availableWidth, availableHeight]);
  
  // Grid sizing constants (must come after gridConfig)
  const TILE_SIZE = gridConfig.widgetWidth;
  const TILE_WITH_MARGIN_SIZE = gridConfig.widgetWidth;
  const ROW_HEIGHT = gridConfig.widgetHeight;
  
  // Calculate global index from page and local index (must come after gridConfig)
  const widgetsPerPage = useMemo(() => gridConfig.columns * gridConfig.rows, [gridConfig.columns, gridConfig.rows]);
  const pageStartIndex = useMemo(() => pageIndex * widgetsPerPage, [pageIndex, widgetsPerPage]);

  // Get widgets for this page
  const pageWidgets = useMemo(() => {
    if (!dashboard) return [];
    
    const widgets = dashboard.widgets || [];
    const widgetsPerPage = gridConfig.columns * gridConfig.rows;
    
    if (!dashboard.userPositioned) {
      // Auto-discovery mode: sort by creation order, then paginate
      const sortedWidgets = widgets.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      // Calculate page bounds
      const startIndex = pageIndex * widgetsPerPage;
      const endIndex = startIndex + widgetsPerPage;
      
      // Return only widgets for this page
      return sortedWidgets.slice(startIndex, endIndex);
    }

    // User-positioned mode: calculate page from array index
    return widgets.filter((widget, index) => {
      const widgetPage = Math.floor(index / widgetsPerPage);
      return widgetPage === pageIndex;
    });
  }, [dashboard, pageIndex, gridConfig.columns, gridConfig.rows]);

  // Calculate grid position from gesture coordinates (gesture-handler pattern)
  const getWidgetCenterPosition = useCallback((index: number | null) => {
    if (index === null || index < 0) return null;
    
    // Simple grid math: row and column from index
    const row = Math.floor(index / gridConfig.columns);
    const col = index % gridConfig.columns;
    
    // Calculate center positions
    const xCenterPosition = col * TILE_WITH_MARGIN_SIZE + TILE_SIZE / 2;
    const yCenterPosition = row * ROW_HEIGHT + TILE_SIZE / 2;
    
    logger.drag('[getWidgetCenterPosition] index:', index, 'row:', row, 'col:', col, 'pos:', { x: xCenterPosition, y: yCenterPosition });
    return { x: xCenterPosition, y: yCenterPosition };
  }, [gridConfig.columns, ROW_HEIGHT, TILE_SIZE, TILE_WITH_MARGIN_SIZE]);
  
  // Calculate placeholder index from gesture position
  const calculatePlaceholderIndex = useCallback((translationX: number, translationY: number) => {
    // Current position after drag
    const x = activeWidgetInitialPosition.x + translationX;
    const y = activeWidgetInitialPosition.y + translationY;
    
    // Calculate which row (0-indexed)
    const row = Math.max(0, Math.floor(y / ROW_HEIGHT));
    
    // Calculate which column in that row (0-indexed)
    const col = Math.max(0, Math.min(gridConfig.columns - 1, Math.floor(x / TILE_WITH_MARGIN_SIZE)));
    
    // Convert row + col to linear index
    const newPlaceholderIndex = Math.min(
      row * gridConfig.columns + col,
      pageWidgets.length
    );
    
    logger.drag('[calculatePlaceholderIndex] x:', x.toFixed(1), 'y:', y.toFixed(1), '→ row:', row, 'col:', col, '→ index:', newPlaceholderIndex);
    
    return newPlaceholderIndex;
  }, [activeWidgetInitialPosition, ROW_HEIGHT, gridConfig.columns, TILE_WITH_MARGIN_SIZE, pageWidgets.length]);

  // Enable dragging for a widget (called on long press)
  const enableDragging = useCallback((widgetId: string, touchX: number, touchY: number) => {
    logger.drag('[DraggableWidgetGrid] 🟢 Enabling drag for:', widgetId, 'touch at:', touchX, touchY);
    const localIndex = pageWidgets.findIndex(w => w.id === widgetId);
    const globalIndex = pageStartIndex + localIndex;
    
    logger.drag('[DraggableWidgetGrid] Local index:', localIndex, '→ Global index:', globalIndex);
    
    setActiveWidgetId(widgetId);
    setActiveWidgetGlobalIndex(globalIndex);
    setDragActive(true);
    
    // Calculate widget's top-left position in grid
    const row = Math.floor(localIndex / gridConfig.columns);
    const col = localIndex % gridConfig.columns;
    const widgetLeft = col * TILE_WITH_MARGIN_SIZE;
    const widgetTop = row * ROW_HEIGHT;
    
    // Touch offset is where user pressed relative to widget's top-left
    const touchOffsetX = touchX;
    const touchOffsetY = touchY;
    
    logger.drag('[DraggableWidgetGrid] Widget position:', { left: widgetLeft, top: widgetTop });
    logger.drag('[DraggableWidgetGrid] Touch offset:', { x: touchOffsetX, y: touchOffsetY });
    
    // Store the touch point in grid coordinates
    const touchPointX = widgetLeft + touchOffsetX;
    const touchPointY = widgetTop + touchOffsetY;
    
    setActiveWidgetInitialPosition({ x: touchPointX, y: touchPointY });
    setInitialTouchOffset({ x: touchOffsetX, y: touchOffsetY });
    setPlaceholderIndex(localIndex);
    placeholderIndexRef.current = localIndex;
    
    // Haptic feedback
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, [pageWidgets, pageStartIndex, gridConfig.columns, ROW_HEIGHT, TILE_WITH_MARGIN_SIZE]);
  
  // Handle position update during drag
  const onPositionUpdate = useCallback((translationX: number, translationY: number) => {
    logger.drag('[DraggableWidgetGrid] 📍 Position update:', translationX.toFixed(1), translationY.toFixed(1));
    
    // Update placeholder based on current gesture position
    const newPlaceholderIndex = calculatePlaceholderIndex(translationX, translationY);
    logger.drag('[DraggableWidgetGrid] Current placeholder:', placeholderIndex, '→ New:', newPlaceholderIndex);
    
    if (newPlaceholderIndex !== placeholderIndex) {
      logger.drag('[DraggableWidgetGrid] 🔄 Updating placeholder from', placeholderIndex, 'to', newPlaceholderIndex);
      // Don't use LayoutAnimation during gesture - it can interrupt the pan gesture
      setPlaceholderIndex(newPlaceholderIndex);
      placeholderIndexRef.current = newPlaceholderIndex;
    }
    
    // Update translation with spring animation for smooth follow
    activeWidgetTranslation.x.value = withSpring(translationX, { mass: 0.5 });
    activeWidgetTranslation.y.value = withSpring(translationY, { mass: 0.5 });
  }, [placeholderIndex, calculatePlaceholderIndex, activeWidgetTranslation]);
  
  // Handle drag end
  const onDragEnd = useCallback(() => {
    // Use ref to get the latest placeholder value (avoid stale closure)
    const currentPlaceholder = placeholderIndexRef.current;
    logger.drag('[DraggableWidgetGrid] 🏁 Drag end - activeWidgetId:', activeWidgetId, 'placeholderIndex:', currentPlaceholder);
    if (!activeWidgetId || currentPlaceholder === null) {
      updateDataOnEnd();
      return;
    }
    
    // Animate to final position
    const newPlacePosition = getWidgetCenterPosition(currentPlaceholder);
    if (newPlacePosition !== null) {
      activeWidgetTranslation.x.value = withTiming(
        newPlacePosition.x - activeWidgetInitialPosition.x,
        { duration: 100 }
      );
      activeWidgetTranslation.y.value = withTiming(
        newPlacePosition.y - activeWidgetInitialPosition.y,
        { duration: 100 },
        () => {
          // Callback after animation completes
          runOnJS(updateDataOnEnd)();
        }
      );
    } else {
      updateDataOnEnd();
    }
  }, [activeWidgetId, getWidgetCenterPosition, activeWidgetTranslation, activeWidgetInitialPosition]);
  
  // Update widget order after drag - Use global array indices
  const updateDataOnEnd = useCallback(() => {
    // Use ref to get the latest placeholder value (avoid stale state)
    const currentPlaceholder = placeholderIndexRef.current;
    logger.drag('[DraggableWidgetGrid] 📦 Update data on end - activeWidgetId:', activeWidgetId, 'placeholder:', currentPlaceholder);
    
    // Clear pressed widget ref immediately
    pressedWidgetIdRef.current = null;
    placeholderIndexRef.current = null;
    
    if (!activeWidgetId || currentPlaceholder === null || activeWidgetGlobalIndex === -1) {
      setDragActive(false);
      setActiveWidgetId(null);
      setPlaceholderIndex(null);
      setActiveWidgetGlobalIndex(-1);
      activeWidgetTranslation.x.value = 0;
      activeWidgetTranslation.y.value = 0;
      return;
    }
    
    // Calculate global indices
    const globalFromIndex = activeWidgetGlobalIndex;
    const globalToIndex = pageStartIndex + currentPlaceholder;
    
    logger.drag('[DraggableWidgetGrid] 🌐 Global indices:', {
      localFrom: activeWidgetGlobalIndex - pageStartIndex,
      localTo: currentPlaceholder,
      globalFrom: globalFromIndex,
      globalTo: globalToIndex,
    });
    
    // Reset animation state BEFORE updating store
    activeWidgetTranslation.x.value = 0;
    activeWidgetTranslation.y.value = 0;
    setDragActive(false);
    setActiveWidgetId(null);
    setPlaceholderIndex(null);
    setActiveWidgetGlobalIndex(-1);
    
    // Skip update if no movement
    if (globalFromIndex === globalToIndex) {
      logger.drag('[DraggableWidgetGrid] ⏭️ No movement, skipping update');
      return;
    }
    
    logger.drag('[DraggableWidgetGrid] ✅ Reordering widget in array');
    
    // Update store with simple global index reorder
    if (!dashboard?.userPositioned) {
      // First drag: enable user positioning
      useWidgetStore.getState().enableUserPositioning();
    }
    
    useWidgetStore.getState().reorderWidget(globalFromIndex, globalToIndex);
  }, [activeWidgetId, placeholderIndex, activeWidgetGlobalIndex, pageStartIndex, dashboard, activeWidgetTranslation]);

  // Pan gesture (always listening, conditionally processes based on dragActive state)
  const dragGesture = Gesture.Pan()
    .runOnJS(true)
    .onUpdate((event) => {
      if (dragActive) {
        runOnJS(onPositionUpdate)(event.translationX, event.translationY);
      }
    })
    .onEnd(() => {
      if (dragActive) {
        logger.drag('[DraggableWidgetGrid] 🛑 Pan ended');
        runOnJS(onDragEnd)();
      }
    });

  // Tap gesture for canceling drag
  const tapEndedGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd((_, isFinished) => {
      if (isFinished && dragActive) {
        logger.drag('[DraggableWidgetGrid] 👆 Tap to cancel');
        runOnJS(updateDataOnEnd)();
      }
    });

  // Render widgets with gesture handlers (gesture-handler pattern)
  const renderWidgetList = () => {
    const activeIndex = pageWidgets.findIndex(w => w.id === activeWidgetId);
    const activeWidget = pageWidgets.find(w => w.id === activeWidgetId);
    
    return (
      <View style={styles.widgetListContainer}>
        {pageWidgets.map((widget, index) => {
          const isActiveWidget = widget.id === activeWidgetId;
          
          // Show placeholder where the active widget currently is
          if (dragActive && index === placeholderIndex && activeIndex !== -1) {
            return (
              <View
                key={`placeholder-${index}`}
                style={[
                  styles.autoDiscoveryWidget,
                  styles.placeholder,
                  {
                    width: gridConfig.widgetWidth,
                    height: gridConfig.widgetHeight,
                  },
                ]}
              />
            );
          }
          
          // Hide the active widget at its original position
          if (dragActive && isActiveWidget && index === activeIndex) {
            return (
              <View
                key={widget.id}
                style={[
                  styles.autoDiscoveryWidget,
                  {
                    width: gridConfig.widgetWidth,
                    height: gridConfig.widgetHeight,
                    opacity: 0,
                  },
                ]}
              />
            );
          }
          
          // Create long-press gesture for this widget (gesture-handler pattern)
          const widgetId = widget.id;
          
          const longPressGesture = Gesture.LongPress()
            .minDuration(500)
            .onStart((event) => {
              runOnJS(enableDragging)(widgetId, event.x, event.y);
              pressedWidgetIdRef.current = widgetId;
            })
            .simultaneousWithExternalGesture(dragGesture)
            .simultaneousWithExternalGesture(tapEndedGesture);
          
          return (
            <GestureDetector key={widget.id} gesture={longPressGesture}>
              <DraggableWidget
                isActive={false}
                translation={activeWidgetTranslation}
                width={gridConfig.widgetWidth}
                height={gridConfig.widgetHeight}
                initialPosition={isActiveWidget ? activeWidgetInitialPosition : undefined}
              >
                <MemoizedWidget 
                  widgetId={widget.id}
                  width={gridConfig.widgetWidth}
                  height={gridConfig.widgetHeight}
                />
              </DraggableWidget>
            </GestureDetector>
          );
        })}
        
        {/* Render floating translucent widget outside the grid - always visible during drag */}
        {dragActive && activeWidget && (
          <DraggableWidget
            isActive={true}
            translation={activeWidgetTranslation}
            width={gridConfig.widgetWidth}
            height={gridConfig.widgetHeight}
            initialPosition={activeWidgetInitialPosition}
            touchOffset={initialTouchOffset}
          >
            <MemoizedWidget 
              widgetId={activeWidget.id}
              width={gridConfig.widgetWidth}
              height={gridConfig.widgetHeight}
            />
          </DraggableWidget>
        )}
      </View>
    );
  };

  // Render with gesture handlers
  return (
    <GestureDetector gesture={Gesture.Exclusive(dragGesture, tapEndedGesture)}>
      <View style={styles.autoDiscoveryContainer}>
        {renderWidgetList()}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  autoDiscoveryContainer: {
    flex: 1,
    padding: 0,
  },
  widgetListContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    position: 'relative',
  },
  autoDiscoveryWidget: {
    margin: 0,
    position: 'relative',
  },
  placeholder: {
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(128, 128, 128, 0.5)',
    borderRadius: 8,
  },
});
