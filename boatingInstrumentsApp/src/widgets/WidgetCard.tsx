import React from 'react';
import { View, Text } from 'react-native';
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
  testID = 'widget-card',
}) => {
  const theme = useTheme();
  const widgetStyles = createWidgetStyles(theme);
  const displayColor = getStateColor(state, theme);
  
  return (
    <View style={widgetStyles.widgetContainer} testID={testID}>
      
      {/* Widget Header with Chevron */}
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
        {/* AC 17: Show chevron (⌄ collapsed, ⌃ expanded) */}
        <Text 
          style={widgetStyles.widgetChevron}
          testID={`${testID}-chevron`}
        >
          {expanded ? '⌃' : '⌄'}
        </Text>
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