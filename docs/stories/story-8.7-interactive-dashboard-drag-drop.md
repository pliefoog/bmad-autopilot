# Story 8.7: Interactive Dashboard Drag & Drop with Live Reflow
## iOS-Style Widget Reordering with Cross-Page Dragging

**Epic:** 8.0 - VIP Platform UI Refactor
**Story ID:** 8.7
**Priority:** P1 (Critical UX Feature)
**Complexity:** H (3-4 sprints)
**Status:** BLOCKED (Waiting for Story 8.5 completion)

**Dependencies:**
- ✅ MUST COMPLETE: Story 8.5 (ResponsiveDashboard with pagination must exist)
- ✅ MUST HAVE: Story 8.2 (Glove mode - affects drag touch targets)
- ✅ MUST HAVE: Existing DraggableWidgetPlatform.tsx (reuse drag logic)

---

## Overview

Implement iOS Home Screen-style drag & drop for the ResponsiveDashboard with live widget reflow, cross-page dragging, and density-aware touch targets. This resolves the critical architectural gap where the app currently has **pagination OR drag & drop, but not both together**.

**Current Problem:**
- `Dashboard.tsx` has drag & drop but **no pagination** (single canvas)
- `ResponsiveDashboard.tsx` has pagination but **no drag & drop** (static grid)
- These are mutually exclusive implementations

**Solution:**
Enhance `ResponsiveDashboard.tsx` with interactive drag & drop while maintaining the pagination system.

**Why This Story:**
- Users expect to customize dashboard layout (iOS/Android standard)
- Current pagination system is read-only (frustrating UX)
- Widget reordering is essential for personalization
- Glove mode requires larger touch targets (64pt) - critical for drag handles

**User Benefit:**
Sailors can quickly reorganize their dashboard with glove-friendly drag & drop, moving widgets between pages as easily as rearranging iOS home screen icons.

---

## User Stories

### US 8.7.1: Basic Widget Drag & Drop in Grid
**As a** user customizing my dashboard layout
**I want** to drag widgets to reorder them within a page
**So that** I can place important metrics in prime viewing positions

**Acceptance Criteria:**
- AC 1.1: Long-press widget (800ms) enters drag mode
- AC 1.2: Widget lifts with scale animation (1.0 → 1.1) and shadow
- AC 1.3: Dragged widget follows finger/cursor with haptic feedback on lift (Medium impact)
- AC 1.4: Other widgets remain in place until drag moves over them
- AC 1.5: Drop completes reorder with spring animation
- AC 1.6: Drag cancelled on tap outside or escape key (web)
- AC 1.7: Touch target for drag: 44pt native mode, 64pt glove mode (density-aware)
- AC 1.8: Works on iOS, Android, Web (platform-specific gesture handling)

**Technical Implementation:**
```typescript
// src/components/organisms/ResponsiveDashboard.tsx - Enhanced with Drag & Drop

interface DragState {
  widgetId: string | null;
  sourcePageIndex: number | null;
  sourcePosition: number | null;
  currentPageIndex: number | null;
  currentPosition: { x: number; y: number } | null;
  isDragging: boolean;
}

export const ResponsiveDashboard: React.FC<ResponsiveDashboardProps> = ({
  headerHeight = 60,
  footerHeight = 88,
  pageIndicatorHeight = 30,
  onWidgetPress,
  onWidgetLongPress,
  testID = 'responsive-dashboard',
}) => {
  const theme = useTheme();
  const { density } = useUIDensity(); // From Story 8.2

  // Drag state
  const [dragState, setDragState] = useState<DragState>({
    widgetId: null,
    sourcePageIndex: null,
    sourcePosition: null,
    currentPageIndex: null,
    currentPosition: null,
    isDragging: false,
  });

  // Animation values
  const dragScale = useSharedValue(1);
  const dragElevation = useSharedValue(2);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle long press to initiate drag (AC 1.1, 1.7)
  const handleLongPress = useCallback(async (widgetId: string, pageIndex: number, position: number) => {
    // Haptic feedback (AC 1.3)
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Enter drag mode
    setDragState({
      widgetId,
      sourcePageIndex: pageIndex,
      sourcePosition: position,
      currentPageIndex: pageIndex,
      currentPosition: null,
      isDragging: true,
    });

    // Animate lift (AC 1.2)
    dragScale.value = withSpring(1.1);
    dragElevation.value = withSpring(10);
  }, [dragScale, dragElevation]);

  // Handle drag move (AC 1.3, 1.4)
  const handleDragMove = useCallback((event: GestureResponderEvent) => {
    if (!dragState.isDragging) return;

    const { pageX, pageY } = event.nativeEvent;

    // Update current position
    setDragState(prev => ({
      ...prev,
      currentPosition: { x: pageX, y: pageY },
    }));

    // Calculate target page and grid position
    const targetPage = Math.floor(pageX / scrollViewWidth);
    const gridPosition = calculateGridPositionFromCoordinates(
      pageX % scrollViewWidth,
      pageY,
      responsiveGrid
    );

    // Trigger reflow if position changed (Story 8.7.2)
    if (targetPage !== dragState.currentPageIndex || gridPosition.index !== dragState.sourcePosition) {
      triggerReflow(targetPage, gridPosition.index, dragState.widgetId!);
    }
  }, [dragState, scrollViewWidth, responsiveGrid]);

  // Handle drop (AC 1.5)
  const handleDrop = useCallback(() => {
    if (!dragState.isDragging || !dragState.widgetId) return;

    // Animate drop
    dragScale.value = withSpring(1);
    dragElevation.value = withSpring(2);

    // Commit reorder to store
    reorderWidget(
      dragState.widgetId,
      dragState.sourcePageIndex!,
      dragState.currentPageIndex!,
      dragState.sourcePosition!,
      calculateDropPosition(dragState.currentPosition!, responsiveGrid)
    );

    // Clear drag state
    setDragState({
      widgetId: null,
      sourcePageIndex: null,
      sourcePosition: null,
      currentPageIndex: null,
      currentPosition: null,
      isDragging: false,
    });
  }, [dragState, dragScale, dragElevation, responsiveGrid]);

  // Render draggable widget
  const renderDraggableWidget = useCallback((
    widgetId: string,
    pageIndex: number,
    position: number,
    layout: CellPosition
  ) => {
    const WidgetComponent = widgetComponents[widgetId];
    if (!WidgetComponent) return null;

    const isDragged = dragState.isDragging && dragState.widgetId === widgetId;

    return (
      <DraggableGridWidget
        key={`${widgetId}-${pageIndex}`}
        widgetId={widgetId}
        pageIndex={pageIndex}
        position={position}
        layout={layout}
        isDragged={isDragged}
        onLongPress={() => handleLongPress(widgetId, pageIndex, position)}
        onDragMove={handleDragMove}
        onDrop={handleDrop}
        dragScale={dragScale}
        dragElevation={dragElevation}
        density={density} // AC 1.7: Touch target size
      >
        <WidgetComponent
          onPress={() => !dragState.isDragging && onWidgetPress?.(widgetId)}
        />
      </DraggableGridWidget>
    );
  }, [
    dragState,
    handleLongPress,
    handleDragMove,
    handleDrop,
    dragScale,
    dragElevation,
    density,
    onWidgetPress,
  ]);

  // ... rest of ResponsiveDashboard
};
```

```typescript
// src/components/molecules/DraggableGridWidget.tsx - NEW COMPONENT

interface DraggableGridWidgetProps {
  widgetId: string;
  pageIndex: number;
  position: number;
  layout: CellPosition;
  isDragged: boolean;
  onLongPress: () => void;
  onDragMove: (event: GestureResponderEvent) => void;
  onDrop: () => void;
  dragScale: Animated.SharedValue<number>;
  dragElevation: Animated.SharedValue<number>;
  density: DensityConfig; // From useUIDensity
  children: React.ReactNode;
}

export const DraggableGridWidget: React.FC<DraggableGridWidgetProps> = ({
  widgetId,
  layout,
  isDragged,
  onLongPress,
  onDragMove,
  onDrop,
  dragScale,
  dragElevation,
  density,
  children,
}) => {
  const translateX = useSharedValue(layout.x);
  const translateY = useSharedValue(layout.y);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Long press gesture (AC 1.1, 1.7)
  const handlePressIn = useCallback((event: GestureResponderEvent) => {
    longPressTimer.current = setTimeout(() => {
      onLongPress();
    }, 800); // 800ms for long press
  }, [onLongPress]);

  const handlePressOut = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Gesture handler for drag
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (event) => {
      // Already handled by long press
    },
    onActive: (event) => {
      if (isDragged) {
        translateX.value = layout.x + event.translationX;
        translateY.value = layout.y + event.translationY;
        runOnJS(onDragMove)(event);
      }
    },
    onEnd: (event) => {
      if (isDragged) {
        runOnJS(onDrop)();
      }
    },
  });

  // Animated styles (AC 1.2)
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: isDragged ? dragScale.value : 1 },
    ],
    zIndex: isDragged ? 1000 : 1,
    elevation: isDragged ? dragElevation.value : 2,
    shadowOpacity: isDragged ? 0.3 : 0.1,
  }));

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: layout.x,
            top: layout.y,
            width: layout.width,
            height: layout.height,
          },
          animatedStyle,
        ]}
        onTouchStart={handlePressIn}
        onTouchEnd={handlePressOut}
        // AC 1.7: Density-aware touch target (minimum 64pt in glove mode)
        hitSlop={{
          top: density.touchTargetSize / 4,
          bottom: density.touchTargetSize / 4,
          left: density.touchTargetSize / 4,
          right: density.touchTargetSize / 4,
        }}
      >
        {children}

        {/* Drag handle indicator (shown during drag) */}
        {isDragged && (
          <View style={styles.dragIndicator}>
            <Ionicons name="move" size={24} color="#06B6D4" />
          </View>
        )}
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  dragIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
```

---

### US 8.7.2: Live Widget Reflow
**As a** user dragging a widget
**I want** other widgets to automatically slide out of the way
**So that** I can see where my widget will land before I drop it

**Acceptance Criteria:**
- AC 2.1: As dragged widget moves over another widget, that widget slides to next available position
- AC 2.2: Reflow uses spring physics (duration 300ms, tension 40, friction 7)
- AC 2.3: Multiple widgets reflow simultaneously if needed (domino effect)
- AC 2.4: Reflow algorithm maintains grid alignment (no overlaps)
- AC 2.5: Drop preview shows highlighted grid cell where widget will land
- AC 2.6: Preview updates in real-time as drag moves across grid
- AC 2.7: Invalid drop zones (full pages) show visual feedback (red tint)
- AC 2.8: Reflow performance: <16ms per frame (60fps) for up to 12 widgets/page

**Technical Implementation:**
```typescript
// src/utils/reflowAlgorithm.ts - NEW FILE

export interface ReflowResult {
  widgetId: string;
  fromPosition: number;
  toPosition: number;
  animation: 'spring' | 'none';
}

/**
 * Calculate widget reflow when a dragged widget hovers over a position
 * Implements iOS Home Screen-style reflow algorithm
 */
export const calculateReflow = (
  widgets: string[],
  draggedWidgetId: string,
  draggedFromPosition: number,
  hoverPosition: number,
  maxWidgetsPerPage: number
): ReflowResult[] => {
  const reflowResults: ReflowResult[] = [];

  // Remove dragged widget from current layout
  const layoutWithoutDragged = widgets.filter(id => id !== draggedWidgetId);

  // If hovering over empty space at end, no reflow needed
  if (hoverPosition >= layoutWithoutDragged.length) {
    return reflowResults;
  }

  // Check if page would overflow
  if (widgets.length >= maxWidgetsPerPage && hoverPosition < widgets.length) {
    // Page is full - no reflow allowed
    return [];
  }

  // Calculate shifts (widgets after hover position shift down by 1)
  layoutWithoutDragged.forEach((widgetId, currentIndex) => {
    let newPosition = currentIndex;

    // If this widget is at or after hover position, shift it down
    if (currentIndex >= hoverPosition) {
      newPosition = currentIndex + 1;
    }

    // If position changed, add to reflow results
    if (newPosition !== currentIndex) {
      reflowResults.push({
        widgetId,
        fromPosition: currentIndex,
        toPosition: newPosition,
        animation: 'spring',
      });
    }
  });

  return reflowResults;
};

/**
 * Trigger reflow animations for widgets
 */
export const triggerReflowAnimation = (
  reflowResults: ReflowResult[],
  widgetAnimations: Map<string, Animated.SharedValue<{ x: number; y: number }>>,
  calculateGridPosition: (position: number, grid: ResponsiveGridState) => CellPosition,
  grid: ResponsiveGridState
) => {
  reflowResults.forEach(({ widgetId, toPosition }) => {
    const animationValue = widgetAnimations.get(widgetId);
    if (!animationValue) return;

    const newCell = calculateGridPosition(toPosition, grid);

    // Spring animation (AC 2.2)
    animationValue.value = withSpring(
      { x: newCell.x, y: newCell.y },
      {
        damping: 15,      // tension
        stiffness: 40,    // friction
        mass: 1,
        velocity: 0,
      }
    );
  });
};
```

```typescript
// src/components/organisms/ResponsiveDashboard.tsx - Reflow Integration

export const ResponsiveDashboard: React.FC = () => {
  // ... existing state ...

  const [reflowPreview, setReflowPreview] = useState<ReflowResult[]>([]);
  const [dropPreview, setDropPreview] = useState<{ pageIndex: number; position: number } | null>(null);
  const widgetAnimations = useRef(new Map<string, Animated.SharedValue<{ x: number; y: number }>>()).current;

  // Trigger reflow when drag moves (AC 2.1-2.4)
  const triggerReflow = useCallback((
    targetPageIndex: number,
    hoverPosition: number,
    draggedWidgetId: string
  ) => {
    const pageWidgets = getWidgetsForPage(targetPageIndex);
    const draggedFromPosition = pageWidgets.findIndex(id => id === draggedWidgetId);

    // Calculate reflow
    const reflowResults = calculateReflow(
      pageWidgets,
      draggedWidgetId,
      draggedFromPosition,
      hoverPosition,
      maxWidgetsPerPage
    );

    // Check if page would overflow (AC 2.7)
    if (reflowResults.length === 0 && pageWidgets.length >= maxWidgetsPerPage) {
      // Show invalid drop preview (red tint)
      setDropPreview(null);
      return;
    }

    // Update reflow preview (AC 2.5, 2.6)
    setReflowPreview(reflowResults);
    setDropPreview({ pageIndex: targetPageIndex, position: hoverPosition });

    // Trigger animations (AC 2.2, 2.3)
    triggerReflowAnimation(
      reflowResults,
      widgetAnimations,
      calculateGridPosition,
      responsiveGrid
    );
  }, [getWidgetsForPage, maxWidgetsPerPage, widgetAnimations, responsiveGrid]);

  // Render drop preview (AC 2.5, 2.6)
  const renderDropPreview = useCallback(() => {
    if (!dropPreview || !dragState.isDragging) return null;

    const previewCell = calculateGridPosition(dropPreview.position, responsiveGrid);

    return (
      <View
        style={[
          styles.dropPreview,
          {
            position: 'absolute',
            left: previewCell.x,
            top: previewCell.y,
            width: previewCell.width,
            height: previewCell.height,
            backgroundColor: 'rgba(6, 182, 212, 0.2)',
            borderWidth: 2,
            borderColor: '#06B6D4',
            borderRadius: 12,
            borderStyle: 'dashed',
          },
        ]}
      />
    );
  }, [dropPreview, dragState.isDragging, responsiveGrid]);

  // ... rest of component
};
```

---

### US 8.7.3: Cross-Page Widget Dragging
**As a** user organizing widgets across multiple pages
**I want** to drag a widget from one page to another
**So that** I can group related metrics on the same page

**Acceptance Criteria:**
- AC 3.1: Dragging widget near left/right edge (within 50px) triggers page scroll
- AC 3.2: Page auto-scrolls at 200ms intervals while drag held near edge
- AC 3.3: Page indicator highlights target page during cross-page drag
- AC 3.4: Widget disappears from source page, appears on target page with reflow
- AC 3.5: Drop on target page commits cross-page move
- AC 3.6: Cancelling drag returns widget to original page/position
- AC 3.7: Cross-page drag works for all platforms (iOS, Android, Web)
- AC 3.8: Haptic feedback on page transition (Light impact)

**Technical Implementation:**
```typescript
// src/hooks/useAutoScroll.ts - NEW FILE

export const useAutoScroll = (
  scrollViewRef: React.RefObject<ScrollView>,
  scrollViewWidth: number,
  currentPage: number,
  totalPages: number,
  navigateToPage: (page: number) => void
) => {
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [edgeScrollDirection, setEdgeScrollDirection] = useState<'left' | 'right' | null>(null);

  // Check if drag is near edge (AC 3.1)
  const checkEdgeProximity = useCallback((x: number): 'left' | 'right' | null => {
    const EDGE_THRESHOLD = 50;

    if (x < EDGE_THRESHOLD && currentPage > 0) {
      return 'left';
    } else if (x > scrollViewWidth - EDGE_THRESHOLD && currentPage < totalPages - 1) {
      return 'right';
    }
    return null;
  }, [scrollViewWidth, currentPage, totalPages]);

  // Start auto-scroll (AC 3.2)
  const startAutoScroll = useCallback((direction: 'left' | 'right') => {
    if (autoScrollTimer.current) return; // Already scrolling

    autoScrollTimer.current = setInterval(() => {
      if (direction === 'left' && currentPage > 0) {
        navigateToPage(currentPage - 1);

        // Haptic feedback (AC 3.8)
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } else if (direction === 'right' && currentPage < totalPages - 1) {
        navigateToPage(currentPage + 1);

        // Haptic feedback (AC 3.8)
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } else {
        stopAutoScroll();
      }
    }, 200); // 200ms intervals
  }, [currentPage, totalPages, navigateToPage]);

  // Stop auto-scroll
  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
    setEdgeScrollDirection(null);
  }, []);

  // Update auto-scroll based on drag position
  const updateAutoScroll = useCallback((x: number) => {
    const direction = checkEdgeProximity(x);

    if (direction !== edgeScrollDirection) {
      if (direction) {
        startAutoScroll(direction);
      } else {
        stopAutoScroll();
      }
      setEdgeScrollDirection(direction);
    }
  }, [edgeScrollDirection, checkEdgeProximity, startAutoScroll, stopAutoScroll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAutoScroll();
  }, [stopAutoScroll]);

  return { updateAutoScroll, stopAutoScroll, isAutoScrolling: edgeScrollDirection !== null };
};
```

```typescript
// src/components/organisms/ResponsiveDashboard.tsx - Cross-Page Drag Integration

export const ResponsiveDashboard: React.FC = () => {
  // ... existing state ...

  const { updateAutoScroll, stopAutoScroll, isAutoScrolling } = useAutoScroll(
    scrollViewRef,
    scrollViewWidth,
    currentPage,
    totalPages,
    navigateToPage
  );

  // Handle drag move with cross-page detection (AC 3.1-3.4)
  const handleDragMove = useCallback((event: GestureResponderEvent) => {
    if (!dragState.isDragging) return;

    const { pageX, pageY } = event.nativeEvent;

    // Update current position
    setDragState(prev => ({
      ...prev,
      currentPosition: { x: pageX, y: pageY },
    }));

    // Check for edge scroll (AC 3.1, 3.2)
    const pageRelativeX = pageX % scrollViewWidth;
    updateAutoScroll(pageRelativeX);

    // Calculate target page
    const targetPage = Math.floor(pageX / scrollViewWidth);

    // Update current page if changed (AC 3.4)
    if (targetPage !== dragState.currentPageIndex && targetPage >= 0 && targetPage < totalPages) {
      setDragState(prev => ({
        ...prev,
        currentPageIndex: targetPage,
      }));
    }

    // Calculate grid position on target page
    const gridPosition = calculateGridPositionFromCoordinates(
      pageRelativeX,
      pageY,
      responsiveGrid
    );

    // Trigger reflow on target page
    triggerReflow(targetPage, gridPosition.index, dragState.widgetId!);
  }, [
    dragState,
    scrollViewWidth,
    totalPages,
    responsiveGrid,
    updateAutoScroll,
    triggerReflow,
  ]);

  // Handle drop with cross-page commit (AC 3.5)
  const handleDrop = useCallback(() => {
    if (!dragState.isDragging || !dragState.widgetId) return;

    // Stop auto-scroll
    stopAutoScroll();

    // Animate drop
    dragScale.value = withSpring(1);
    dragElevation.value = withSpring(2);

    const targetPosition = dropPreview?.position ?? dragState.sourcePosition!;
    const targetPage = dragState.currentPageIndex ?? dragState.sourcePageIndex!;

    // Commit cross-page move (AC 3.4, 3.5)
    if (targetPage !== dragState.sourcePageIndex) {
      moveWidgetCrossPage(
        dragState.widgetId,
        dragState.sourcePageIndex!,
        targetPage,
        targetPosition
      );
    } else {
      // Same-page reorder
      reorderWidgetOnPage(
        dragState.widgetId,
        dragState.sourcePageIndex!,
        dragState.sourcePosition!,
        targetPosition
      );
    }

    // Clear drag state
    setDragState({
      widgetId: null,
      sourcePageIndex: null,
      sourcePosition: null,
      currentPageIndex: null,
      currentPosition: null,
      isDragging: false,
    });

    setDropPreview(null);
    setReflowPreview([]);
  }, [
    dragState,
    dropPreview,
    dragScale,
    dragElevation,
    stopAutoScroll,
    moveWidgetCrossPage,
    reorderWidgetOnPage,
  ]);

  // Render page indicator with target highlighting (AC 3.3)
  const renderPaginationDots = () => (
    <PaginationDots
      currentPage={currentPage}
      totalPages={totalPages}
      targetPage={dragState.currentPageIndex} // Highlight target page
      onPagePress={navigateToPage}
      animatedValue={pageAnimatedValue}
      testID="dashboard-pagination"
    />
  );

  // ... rest of component
};
```

---

### US 8.7.4: Visual Feedback & Polish
**As a** user interacting with the dashboard
**I want** clear visual and haptic feedback during drag operations
**So that** I understand what's happening and feel confident in my actions

**Acceptance Criteria:**
- AC 4.1: Drag handle icon appears on widget during long-press (move icon)
- AC 4.2: Dragged widget has elevated shadow (8dp) and 110% scale
- AC 4.3: Drop preview shows dashed outline of grid cell
- AC 4.4: Invalid drop zones show red tint (page full or out of bounds)
- AC 4.5: Haptic feedback: Lift (Medium), Page transition (Light), Drop (Success notification)
- AC 4.6: All animations use spring physics (natural feel, no linear easing)
- AC 4.7: Cancel drag shows return-to-origin animation (spring to original position)
- AC 4.8: VoiceOver/TalkBack announces: "Widget [name] being moved. Moved to page [X], position [Y]"

**Technical Implementation:**
```typescript
// Haptic feedback patterns (AC 4.5)
export const DragHaptics = {
  onLift: async () => {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  },
  onPageTransition: async () => {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  },
  onDrop: async () => {
    if (Platform.OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  },
  onCancel: async () => {
    if (Platform.OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  },
};

// Accessibility announcements (AC 4.8)
export const announceDragStart = (widgetName: string) => {
  AccessibilityInfo.announceForAccessibility(
    `Widget ${widgetName} being moved. Drag to reposition.`
  );
};

export const announceDragMove = (widgetName: string, pageIndex: number, position: number) => {
  AccessibilityInfo.announceForAccessibility(
    `Widget ${widgetName} moved to page ${pageIndex + 1}, position ${position + 1}.`
  );
};

export const announceDragDrop = (widgetName: string, pageIndex: number) => {
  AccessibilityInfo.announceForAccessibility(
    `Widget ${widgetName} placed on page ${pageIndex + 1}.`
  );
};

// Visual feedback styles (AC 4.1-4.4)
const dragStyles = StyleSheet.create({
  dragHandle: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropPreviewValid: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderWidth: 2,
    borderColor: '#06B6D4',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  dropPreviewInvalid: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 2,
    borderColor: '#EF4444',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
});
```

---

## Testing Requirements

### Unit Tests
- [ ] `calculateReflow()` algorithm tests:
  - [ ] Reflow calculates correct positions when dragging over widgets
  - [ ] No overlaps in final layout
  - [ ] Handles page overflow correctly (returns empty array)
  - [ ] Domino effect: moving widget at position 0 shifts all widgets
- [ ] `useAutoScroll` hook tests:
  - [ ] Detects edge proximity (50px threshold)
  - [ ] Starts auto-scroll after 200ms delay
  - [ ] Stops when drag moves away from edge
  - [ ] Navigates to previous/next page correctly
- [ ] `DraggableGridWidget` tests:
  - [ ] Long-press triggers drag mode after 800ms
  - [ ] Touch target respects density (44pt native, 64pt glove)
  - [ ] Drag follows finger/cursor
  - [ ] Drop commits reorder

### Integration Tests
- [ ] Drag widget within page → widget reorders, others shift
- [ ] Drag widget across pages → widget moves, both pages reflow
- [ ] Drag to full page → shows invalid drop preview (red tint)
- [ ] Cancel drag → widget returns to original position
- [ ] WiFi Bridge scenario + drag → glove mode touch targets work (64pt)

### Manual Testing (WiFi Bridge Scenarios)

**Basic Drag & Drop:**
- [ ] Load "idle-at-marina" → Long-press DepthWidget → drag to position 5
- [ ] Other widgets slide aside smoothly (spring animation)
- [ ] Drop → DepthWidget stays at position 5
- [ ] Layout persists after app reload

**Cross-Page Dragging:**
- [ ] Load "underway-manual" (9 widgets, 2 pages) → Drag SpeedWidget near right edge
- [ ] Page auto-scrolls to Page 2 after 200ms
- [ ] SpeedWidget appears on Page 2, Page 1 reflows
- [ ] Drop → SpeedWidget committed to Page 2
- [ ] Navigate back to Page 1 → SpeedWidget gone

**Glove Mode Touch Targets:**
- [ ] Load "underway-manual" (glove mode active, SOG > 2.0)
- [ ] Long-press widget → touch target is 64pt (easy to activate with gloves)
- [ ] Drag widget → visual feedback clear (large shadow, scale 110%)
- [ ] Drop → haptic success feedback

**Invalid Drop Handling:**
- [ ] Create page with 12 widgets (max for grid)
- [ ] Drag 13th widget from another page → red tint shows page full
- [ ] Release → widget returns to source page (spring animation)

**Accessibility:**
- [ ] Enable VoiceOver (iOS) or TalkBack (Android)
- [ ] Long-press widget → announces "Widget Depth being moved"
- [ ] Drag to new position → announces "Moved to page 1, position 3"
- [ ] Drop → announces "Widget Depth placed on page 1"

**Performance:**
- [ ] Dashboard with 12 widgets per page (24 widgets total)
- [ ] Drag widget → reflow maintains 60fps (no frame drops)
- [ ] Use React DevTools Profiler → <16ms render time per frame

---

## Definition of Done

- [ ] All 4 user stories completed (ACs met)
- [ ] Basic drag & drop working (lift, drag, drop, reorder)
- [ ] Live widget reflow implemented (spring animations, domino effect)
- [ ] Cross-page dragging working (edge scroll, page transitions)
- [ ] Visual feedback complete (drag handle, drop preview, invalid zones)
- [ ] Haptic feedback working (lift, page transition, drop)
- [ ] Accessibility tested (VoiceOver announcements, screen reader)
- [ ] Glove mode touch targets verified (64pt in glove mode)
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All WiFi Bridge scenario tests passing
- [ ] Performance profiled (60fps maintained with 24 widgets)
- [ ] Works on all platforms (iOS, Android, Web)
- [ ] No regressions (ResponsiveDashboard still supports static mode)
- [ ] Code review complete
- [ ] Documentation updated (drag & drop interaction patterns)

---

## Context Files for bmm-dev

**Load Before Starting:**
1. `story-8.2-glove-mode-system.md` (useUIDensity for touch targets)
2. `story-8.5-dashboard-widget-integration.md` (ResponsiveDashboard structure)
3. Current `ResponsiveDashboard.tsx` (will enhance with drag & drop)
4. Current `DraggableWidgetPlatform.tsx` (reuse drag gesture logic)
5. Current `useResponsiveGrid.ts` (grid calculations)

**Reference for Patterns:**
- iOS Home Screen drag & drop behavior (live reflow, cross-page)
- React Beautiful DnD (drop preview patterns)
- react-native-draggable-flatlist (reflow algorithm)

---

## Story Owner

**Product Owner:** [TBD]
**Scrum Master:** Bob (BMM Workflow)
**Dev Team:** [Assigned when v2.3 complete]

---

## Dev Agent Record

### Context Reference
- **Story Context File:** [story-context-8.7.xml](story-context-8.7.xml)
- **Generated:** 2025-10-20
- **Status:** Ready for Development (once Story 8.5 complete)

### Implementation Notes
This story addresses the **critical architectural gap** where pagination and drag & drop are currently mutually exclusive. The solution enhances `ResponsiveDashboard.tsx` with interactive drag & drop while maintaining its pagination system.

**Key Technical Decisions:**
- Reuse gesture handling from `DraggableWidgetPlatform.tsx`
- Implement reflow algorithm similar to iOS Home Screen
- Use `useUIDensity` from Story 8.2 for glove-friendly touch targets (64pt)
- Spring physics for all animations (natural feel)
- Platform-specific accessibility (VoiceOver/TalkBack)

**Dependencies:**
- Story 8.5 must be complete (ResponsiveDashboard with pagination)
- Story 8.2 must be complete (useUIDensity hook)

**Estimated Effort:** 3-4 sprints (complex reflow algorithm + cross-platform testing)
