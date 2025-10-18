import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../core/themeStore';
import { createWidgetStyles, getStateColor } from '../styles/widgetStyles';

type WidgetCardProps = {
  title: string;
  icon: string;
  value?: string | number;
  unit?: string;
  state?: 'normal' | 'alarm' | 'no-data' | 'highlighted';
  secondary?: string;
  children?: React.ReactNode;
  expanded?: boolean; // AC 17: Add expanded prop for chevron display
  isPinned?: boolean; // Story 2.15: Pin state for visual indicator
  onExpandToggle?: () => void; // Story 2.15: Handle tap to expand/collapse
  onPinToggle?: () => void; // Story 2.15: Handle long-press to pin/unpin
  testID?: string;
};

/**
 * WidgetCard - Pure presentational component for widget content
 * Now designed to work inside WidgetShell wrapper
 */
export const WidgetCard: React.FC<WidgetCardProps> = ({
  title,
  icon,
  value,
  unit,
  state = 'normal',
  secondary,
  children,
  expanded = false,
  isPinned = false,
  onExpandToggle,
  onPinToggle,
  testID = 'widget-card',
}) => {
  const theme = useTheme();
  const widgetStyles = createWidgetStyles(theme);
  const displayColor = getStateColor(state, theme);

  const handleCaretPress = () => {
    onExpandToggle?.();
  };

  const handleCaretLongPress = () => {
    onPinToggle?.();
  };
  
  return (
    <View style={widgetStyles.widgetContainer} testID={testID}>
      
      {/* Widget Header with Chevron/Pin Indicator */}
      <View style={widgetStyles.widgetHeader}>
        <Ionicons 
          name={icon} 
          size={12} 
          color={theme.textSecondary} 
          style={widgetStyles.widgetIcon} 
        />
        <Text style={widgetStyles.widgetTitle} testID={`${testID}-title`}>
          {title.toUpperCase()}
        </Text>
        
        {/* Story 2.15: Pin indicator or chevron */}
        <TouchableOpacity
          onPress={handleCaretPress}
          onLongPress={handleCaretLongPress}
          style={widgetStyles.caretContainer}
          testID={`${testID}-caret`}
          delayLongPress={500}
        >
          {isPinned ? (
            <Ionicons 
              name="pin" 
              size={12} 
              color={theme.accent}
            />
          ) : (
            <Text 
              style={widgetStyles.widgetChevron}
              testID={`${testID}-chevron`}
            >
              {expanded ? '⌃' : '⌄'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Widget Content */}
      <View style={widgetStyles.widgetContent} testID={`${testID}-content`}>
        {/* Primary value display - show when value provided and either no children or value explicitly set */}
        {value !== undefined && (
          <View style={widgetStyles.valueContainer}>
            <Text style={[widgetStyles.metricValue, { color: displayColor }]}>
              {value !== null ? value : '---'}
            </Text>
            {unit && <Text style={widgetStyles.metricUnit}>{unit}</Text>}
          </View>
        )}
        
        {/* Secondary Info */}
        {secondary && (
          <Text style={widgetStyles.secondaryText} testID={`${testID}-secondary`}>
            {secondary}
          </Text>
        )}
        
        {/* Main Content (PrimaryMetricCells, graphs, etc.) */}
        {children}
      </View>
      
    </View>
  );
};

// All styles now managed by widgetStyles.ts - no more hardcoded colors!