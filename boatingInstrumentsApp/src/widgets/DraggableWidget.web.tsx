import React, { useRef, useState, useCallback } from 'react';
import { View, Dimensions } from 'react-native';
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

// ResizeHandle Component for Web
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
      cursor: 'pointer' as const,
    };

    switch (position) {
      case 'bottom-right':
        return {
          ...baseStyle,
          bottom: -4,
          right: -4,
          width: 12,
          height: 12,
          cursor: 'nw-resize' as const,
        };
      case 'bottom':
        return {
          ...baseStyle,
          bottom: -4,
          left: (layout.size.width / 2) - 6,
          width: 12,
          height: 8,
          cursor: 'n-resize' as const,
        };
      case 'right':
        return {
          ...baseStyle,
          right: -4,
          top: (layout.size.height / 2) - 6,
          width: 8,
          height: 12,
          cursor: 'e-resize' as const,
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
  const [position, setPosition] = useState(layout.position);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
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
  const updatePosition = useCallback((x: number, y: number) => {
    const snappedX = snapToGrid(x);
    const snappedY = snapToGrid(y);
    const constrained = constrainToScreen(snappedX, snappedY);
    setPosition(constrained);
    onPositionChange(widgetId, constrained);
  }, [widgetId, onPositionChange]);

  // Handle long press detection
  const startLongPress = () => {
    longPressTimer.current = setTimeout(() => {
      if (onLongPress) {
        onLongPress(widgetId);
      }
    }, 800); // 800ms for long press
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Web-compatible drag handlers
  const handleMouseDown = (event: any) => {
    if (!isDragMode) return;
    
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    
    dragStartPos.current = { x: startX, y: startY };
    setIsDragging(true);
    startLongPress();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartPos.current) return;
      
      cancelLongPress();
      const deltaX = moveEvent.clientX - dragStartPos.current.x;
      const deltaY = moveEvent.clientY - dragStartPos.current.y;
      
      const newX = layout.position.x + deltaX;
      const newY = layout.position.y + deltaY;
      
      const constrained = constrainToScreen(newX, newY);
      setPosition(constrained);
    };

    const handleMouseUp = () => {
      if (!dragStartPos.current) return;
      
      setIsDragging(false);
      cancelLongPress();
      
      // Finalize position with snapping
      const finalX = snapToGrid(position.x);
      const finalY = snapToGrid(position.y);
      const constrained = constrainToScreen(finalX, finalY);
      
      updatePosition(constrained.x, constrained.y);
      
      dragStartPos.current = null;
      
      // Remove event listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Update position when layout changes from external sources
  React.useEffect(() => {
    setPosition(layout.position);
  }, [layout.position.x, layout.position.y]);

  const containerStyle = {
    position: 'absolute' as const,
    left: position.x,
    top: position.y,
    width: layout.size.width,
    height: layout.size.height,
    zIndex: isDragging ? 1000 : 1,
    opacity: isDragMode ? (isDragging ? 0.8 : 0.9) : 1,
    cursor: isDragMode ? 'move' : 'default',
    transition: isDragging ? 'none' : 'all 0.2s ease-out',
  };

  return (
    <View
      style={containerStyle}
      onMouseDown={handleMouseDown}
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
    </View>
  );
};

export default DraggableWidget;