import React, { useRef } from 'react';
import { View, Dimensions } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';
import { WidgetLayout } from '../services/layoutService';
import { StyleSheet, TouchableOpacity } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_SIZE = 20; // Snap-to-grid size
const WIDGET_MIN_SIZE = 160;
const WIDGET_MAX_SIZE = 400;

// Standard widget sizes for responsive layout
const WIDGET_SIZES = {
  '1x1': { width: 160, height: 160 },
  '1x2': { width: 160, height: 340 },
  '2x1': { width: 340, height: 160 },
  '2x2': { width: 340, height: 340 },
};

// ResizeHandle Component
interface ResizeHandleProps {
  widgetId: string;
  layout: WidgetLayout;
  position: 'bottom-right' | 'bottom' | 'right';
  onSizeChange: (widgetId: string, size: { width: number; height: number }) => void;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ widgetId, layout, position, onSizeChange }) => {
  const getHandleStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      backgroundColor: '#06B6D4',
      borderRadius: 6,
      zIndex: 1001,
    };

    switch (position) {
      case 'bottom-right':
        return {
          ...baseStyle,
          bottom: -4,
          right: -4,
          width: 12,
          height: 12,
        };
      case 'bottom':
        return {
          ...baseStyle,
          bottom: -4,
          left: (layout.size.width / 2) - 6,
          width: 12,
          height: 8,
        };
      case 'right':
        return {
          ...baseStyle,
          right: -4,
          top: (layout.size.height / 2) - 6,
          width: 8,
          height: 12,
        };
      default:
        return baseStyle;
    }
  };

  const handleResize = () => {
    // Cycle through standard sizes based on current size
    const currentSize = layout.size;
    const sizeKeys = Object.keys(WIDGET_SIZES) as Array<keyof typeof WIDGET_SIZES>;
    
    // Find current size or default to first
    let currentIndex = sizeKeys.findIndex(key => 
      WIDGET_SIZES[key].width === currentSize.width && 
      WIDGET_SIZES[key].height === currentSize.height
    );
    
    if (currentIndex === -1) currentIndex = 0;
    
    // Get next size
    const nextIndex = (currentIndex + 1) % sizeKeys.length;
    const nextSize = WIDGET_SIZES[sizeKeys[nextIndex]];
    
    onSizeChange(widgetId, nextSize);
  };

  return (
    <TouchableOpacity
      style={getHandleStyle()}
      onPress={handleResize}
      activeOpacity={0.7}
    />
  );
};

interface DraggableWidgetProps {
  widgetId: string;
  layout: WidgetLayout;
  onPositionChange: (widgetId: string, position: { x: number; y: number }) => void;
  onSizeChange?: (widgetId: string, size: { width: number; height: number }) => void;
  onLongPress?: (widgetId: string) => void;
  isDragMode?: boolean;
  children: React.ReactNode;
}

export const DraggableWidget: React.FC<DraggableWidgetProps> = ({
  widgetId,
  layout,
  onPositionChange,
  onSizeChange,
  onLongPress,
  isDragMode = false,
  children,
}) => {
  const translateX = useSharedValue(layout.position.x);
  const translateY = useSharedValue(layout.position.y);
  const isDragging = useSharedValue(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Snap to grid function
  const snapToGrid = (value: number): number => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

  // Constrain to screen bounds
  const constrainToScreen = (x: number, y: number): { x: number; y: number } => {
    const maxX = SCREEN_WIDTH - layout.size.width;
    const maxY = SCREEN_HEIGHT - layout.size.height - 100; // Account for FAB
    
    return {
      x: Math.max(0, Math.min(maxX, x)),
      y: Math.max(0, Math.min(maxY, y)),
    };
  };

  // Update position in layout service
  const updatePosition = (x: number, y: number) => {
    const snappedX = snapToGrid(x);
    const snappedY = snapToGrid(y);
    const constrained = constrainToScreen(snappedX, snappedY);
    onPositionChange(widgetId, constrained);
  };

  // Handle long press detection
  const startLongPress = () => {
    longPressTimer.current = setTimeout(() => {
      if (onLongPress) {
        runOnJS(onLongPress)(widgetId);
      }
    }, 800); // 800ms for long press
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Gesture handler
  const gestureHandler = (event: any) => {
    'worklet';
    
    if (event.nativeEvent.state === State.BEGAN) {
      isDragging.value = true;
      runOnJS(startLongPress)();
    } else if (event.nativeEvent.state === State.ACTIVE) {
      runOnJS(cancelLongPress)();
      
      if (isDragMode) {
        translateX.value = layout.position.x + event.nativeEvent.translationX;
        translateY.value = layout.position.y + event.nativeEvent.translationY;
      }
    } else if (event.nativeEvent.state === State.END || event.nativeEvent.state === State.CANCELLED) {
      isDragging.value = false;
      runOnJS(cancelLongPress)();
      
      if (isDragMode) {
        const finalX = layout.position.x + event.nativeEvent.translationX;
        const finalY = layout.position.y + event.nativeEvent.translationY;
        
        const snapped = constrainToScreen(snapToGrid(finalX), snapToGrid(finalY));
        
        translateX.value = withSpring(snapped.x);
        translateY.value = withSpring(snapped.y);
        
        runOnJS(updatePosition)(snapped.x, snapped.y);
      } else {
        // Return to original position if not in drag mode
        translateX.value = withSpring(layout.position.x);
        translateY.value = withSpring(layout.position.y);
      }
    }
  };

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
      zIndex: isDragging.value ? 1000 : 1,
      elevation: isDragging.value ? 10 : 1,
      opacity: isDragMode ? (isDragging.value ? 0.8 : 0.9) : 1,
    };
  });

  // Update shared values when layout changes from external sources
  React.useEffect(() => {
    translateX.value = withSpring(layout.position.x);
    translateY.value = withSpring(layout.position.y);
  }, [layout.position.x, layout.position.y]);

  return (
    <PanGestureHandler onGestureEvent={gestureHandler} onHandlerStateChange={gestureHandler}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: layout.size.width,
            height: layout.size.height,
          },
          animatedStyle,
        ]}
      >
        <View style={{ flex: 1 }}>
          {children}
        </View>
        
        {/* Visual feedback for drag mode */}
        {isDragMode && (
          <>
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderWidth: 2,
                borderColor: '#06B6D4',
                borderRadius: 8,
                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                pointerEvents: 'none',
              }}
            />
            
            {/* Resize Handles */}
            {onSizeChange && (
              <>
                {/* Bottom-right resize handle */}
                <ResizeHandle
                  widgetId={widgetId}
                  layout={layout}
                  position="bottom-right"
                  onSizeChange={onSizeChange}
                />
                
                {/* Bottom resize handle */}
                <ResizeHandle
                  widgetId={widgetId}
                  layout={layout}
                  position="bottom"
                  onSizeChange={onSizeChange}
                />
                
                {/* Right resize handle */}
                <ResizeHandle
                  widgetId={widgetId}
                  layout={layout}
                  position="right"
                  onSizeChange={onSizeChange}
                />
              </>
            )}
          </>
        )}
      </Animated.View>
    </PanGestureHandler>
  );
};

export default DraggableWidget;