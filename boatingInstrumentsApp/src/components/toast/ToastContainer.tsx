import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useToastStore } from '../../store/toastStore';
import { ToastItem } from './ToastItem';

export interface ToastContainerProps {
  position?: 'top' | 'bottom' | 'center';
  maxToasts?: number;
  stackDirection?: 'vertical' | 'horizontal';
  containerStyle?: any;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'top',
  maxToasts = 3,
  stackDirection = 'vertical',
  containerStyle,
}) => {
  const { toasts } = useToastStore();

  // Sort toasts by priority and timestamp
  const sortedToasts = [...toasts]
    .sort((a, b) => {
      // First by priority (critical > high > normal > low)
      const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
      const priorityA = priorityOrder[a.priority || 'normal'];
      const priorityB = priorityOrder[b.priority || 'normal'];
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Higher priority first
      }
      
      // Then by timestamp (newer first)
      return b.timestamp - a.timestamp;
    });

  // Limit number of visible toasts
  const visibleToasts = sortedToasts.slice(0, maxToasts);

  if (visibleToasts.length === 0) {
    return null;
  }

  const containerStyles = [
    styles.container,
    styles[`position_${position}`],
    styles[`stack_${stackDirection}`],
    containerStyle,
  ];

  return (
    <View style={containerStyles} pointerEvents="box-none">
      {visibleToasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          index={index}
          position={position}
          stackDirection={stackDirection}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999, // Ensure toasts are above everything
    pointerEvents: 'box-none',
  },
  
  // Position styles
  position_top: {
    top: Platform.OS === 'web' ? 80 : 60, // Account for HeaderBar
  },
  
  position_center: {
    top: '50%',
    transform: [{ translateY: -50 }],
  },
  
  position_bottom: {
    bottom: Platform.OS === 'web' ? 100 : 120, // Account for AutopilotFooter
  },
  
  // Stack direction styles
  stack_vertical: {
    flexDirection: 'column',
  },
  
  stack_horizontal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
});