import React, { useEffect } from 'react';
import { View } from 'react-native';
import { WidgetCard } from './WidgetCard';
import { useWidgetStore } from '../store/widgetStore';

interface WidgetWrapperProps {
  widgetId: string;
  title: string;
  icon: string;
  value?: string | number;
  unit?: string;
  state?: 'normal' | 'alarm' | 'no-data' | 'highlighted';
  secondary?: string;
  children?: React.ReactNode;
  testID?: string;
}

/**
 * WidgetWrapper - Provides enhanced state management for widgets
 * Integrates WidgetCard with pin functionality and state persistence
 * Story 2.15: Enhanced Widget State Management
 */
export const WidgetWrapper: React.FC<WidgetWrapperProps> = ({
  widgetId,
  title,
  icon,
  value,
  unit,
  state,
  secondary,
  children,
  testID,
}) => {
  const {
    widgetExpanded,
    toggleWidgetExpanded,
    toggleWidgetPin,
    isWidgetPinned,
    updateWidgetInteraction,
  } = useWidgetStore();

  const isPinned = isWidgetPinned(widgetId);
  const isExpanded = widgetExpanded[widgetId] || false;

  // Handle expand/collapse toggle
  const handleExpandToggle = () => {
    toggleWidgetExpanded(widgetId);
    updateWidgetInteraction(widgetId);
  };

  // Handle pin toggle (long press)
  const handlePinToggle = () => {
    toggleWidgetPin(widgetId);
    updateWidgetInteraction(widgetId);
  };

  // Auto-collapse logic for unpinned widgets (30 second timeout)
  useEffect(() => {
    if (!isPinned && isExpanded) {
      const timer = setTimeout(() => {
        toggleWidgetExpanded(widgetId);
      }, 30000); // 30 seconds

      return () => clearTimeout(timer);
    }
  }, [isPinned, isExpanded, widgetId, toggleWidgetExpanded]);

  return (
    <View testID={testID}>
      <WidgetCard
        title={title}
        icon={icon}
        value={value}
        unit={unit}
        state={state}
        secondary={secondary}
        expanded={isExpanded}
        isPinned={isPinned}
        onExpandToggle={handleExpandToggle}
        onPinToggle={handlePinToggle}
        testID={testID}
      >
        {/* Only show children when expanded */}
        {isExpanded && children}
      </WidgetCard>
    </View>
  );
};

export default WidgetWrapper;