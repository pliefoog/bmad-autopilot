import React, { useRef, useCallback, useState } from 'react';
import { View, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { WidgetLayout } from '../services/layoutService';
import { StyleSheet } from 'react-native';
import { useTheme } from '../store/themeStore';

// Import gesture handler only for mobile platforms
let PanGestureHandler: any;
let State: any;
let Animated: any;
let useSharedValue: any;
let useAnimatedStyle: any;
let runOnJS: any;
let withSpring: any;

if (Platform.OS !== 'web') {
  const gestureHandler = require('react-native-gesture-handler');
  const reanimated = require('react-native-reanimated');
  
  PanGestureHandler = gestureHandler.PanGestureHandler;
  State = gestureHandler.State;
  Animated = reanimated.default;
  useSharedValue = reanimated.useSharedValue;
  useAnimatedStyle = reanimated.useAnimatedStyle;
  runOnJS = reanimated.runOnJS;
  withSpring = reanimated.withSpring;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_SIZE = 20; // Snap-to-grid size

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
  const theme = useTheme();
  
  const getHandleStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      backgroundColor: theme.primary,
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

// Shared drag logic and utilities
const useDragUtils = (layout: WidgetLayout, widgetId: string, onPositionChange: (widgetId: string, position: { x: number; y: number }) => void) => {
  // Snap to grid function
  const snapToGrid = useCallback((value: number): number => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }, []);

  // Constrain to screen bounds
  const constrainToScreen = useCallback((x: number, y: number): { x: number; y: number } => {
    const maxX = SCREEN_WIDTH - layout.size.width;
    const maxY = SCREEN_HEIGHT - layout.size.height - 100; // Account for FAB
    
    return {
      x: Math.max(0, Math.min(maxX, x)),
      y: Math.max(0, Math.min(maxY, y)),
    };
  }, [layout.size.width, layout.size.height]);

  // Update position in layout service
  const updatePosition = useCallback((x: number, y: number) => {
    const snappedX = snapToGrid(x);
    const snappedY = snapToGrid(y);
    const constrained = constrainToScreen(snappedX, snappedY);
    onPositionChange(widgetId, constrained);
  }, [snapToGrid, constrainToScreen, widgetId, onPositionChange]);

  return {
    snapToGrid,
    constrainToScreen,
    updatePosition,
  };
};

// Web-specific drag implementation
const WebDraggableWidget: React.FC<DraggableWidgetProps> = ({
  widgetId,
  layout,
  onPositionChange,
  onSizeChange,
  onLongPress,
  isDragMode = false,
  children,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentPosition, setCurrentPosition] = useState(layout.position);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragUtils = useDragUtils(layout, widgetId, onPositionChange);

  // Handle mouse down (start drag)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isDragMode) return;
    
    e.preventDefault();
    setIsDragging(true);
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });

    // Long press detection
    longPressTimer.current = setTimeout(() => {
      if (onLongPress) {
        onLongPress(widgetId);
      }
    }, 800);
  }, [isDragMode, onLongPress, widgetId]);

  // Handle mouse move (drag)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !isDragMode) return;
    
    e.preventDefault();
    
    // Cancel long press on movement
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    const constrained = dragUtils.constrainToScreen(newX, newY);
    setCurrentPosition(constrained);
  }, [isDragging, isDragMode, dragOffset, dragUtils]);

  // Handle mouse up (end drag)
  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Cancel long press
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    if (isDragMode) {
      // Snap to grid and update position
      const snapped = {
        x: dragUtils.snapToGrid(currentPosition.x),
        y: dragUtils.snapToGrid(currentPosition.y),
      };
      const constrained = dragUtils.constrainToScreen(snapped.x, snapped.y);
      
      setCurrentPosition(constrained);
      dragUtils.updatePosition(constrained.x, constrained.y);
    } else {
      // Return to original position if not in drag mode
      setCurrentPosition(layout.position);
    }
  }, [isDragging, isDragMode, currentPosition, dragUtils, layout.position]);

  // Set up global mouse event listeners
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Update position when layout changes externally
  React.useEffect(() => {
    setCurrentPosition(layout.position);
  }, [layout.position]);

  const containerStyle = {
    position: 'absolute' as const,
    left: currentPosition.x,
    top: currentPosition.y,
    width: layout.size.width,
    height: layout.size.height,
    cursor: isDragMode ? (isDragging ? 'grabbing' : 'grab') : 'default',
    zIndex: isDragging ? 1000 : 1,
    opacity: isDragMode ? (isDragging ? 0.8 : 0.9) : 1,
    transition: isDragging ? 'none' : 'all 0.2s ease-out',
    userSelect: 'none' as const,
  };

  return (
    <div
      style={containerStyle}
      onMouseDown={handleMouseDown}
      draggable={false}
    >
      <div style={{ width: '100%', height: '100%' }}>
        {children}
      </div>
      
      {/* Visual feedback for drag mode */}
      {isDragMode && (
        <>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              border: '2px solid #06B6D4',
              borderRadius: '8px',
              backgroundColor: 'rgba(6, 182, 212, 0.1)',
              pointerEvents: 'none',
            }}
          />
          
          {/* Resize Handles */}
          {onSizeChange && (
            <>
              <ResizeHandle
                widgetId={widgetId}
                layout={layout}
                position="bottom-right"
                onSizeChange={onSizeChange}
              />
              
              <ResizeHandle
                widgetId={widgetId}
                layout={layout}
                position="bottom"
                onSizeChange={onSizeChange}
              />
              
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
    </div>
  );
};

// Mobile-specific drag implementation (original gesture handler)
const MobileDraggableWidget: React.FC<DraggableWidgetProps> = ({
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
  const dragUtils = useDragUtils(layout, widgetId, onPositionChange);

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
        
        const snapped = dragUtils.constrainToScreen(dragUtils.snapToGrid(finalX), dragUtils.snapToGrid(finalY));
        
        translateX.value = withSpring(snapped.x);
        translateY.value = withSpring(snapped.y);
        
        runOnJS(dragUtils.updatePosition)(snapped.x, snapped.y);
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
                <ResizeHandle
                  widgetId={widgetId}
                  layout={layout}
                  position="bottom-right"
                  onSizeChange={onSizeChange}
                />
                
                <ResizeHandle
                  widgetId={widgetId}
                  layout={layout}
                  position="bottom"
                  onSizeChange={onSizeChange}
                />
                
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

// Platform-specific export using Platform.select pattern
export const DraggableWidget = Platform.select({
  web: WebDraggableWidget,
  default: MobileDraggableWidget,
});

export default DraggableWidget;