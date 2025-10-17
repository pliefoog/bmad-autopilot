import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DynamicLayoutService } from '../services/dynamicLayoutService';

interface ConstrainedWidgetProps {
  children: React.ReactNode;
  widgetId: string;
  expanded: boolean;
}

/**
 * ConstrainedWidget - Enforces standardized heights and fixed widths
 * 
 * This wrapper ensures that widget content MUST fit within the two allowed heights:
 * - Collapsed: 140px
 * - Expanded: 292px (2 * 140 + 12 spacing)
 * 
 * Width is fixed per widget type and never changes on expand/collapse.
 */
export const ConstrainedWidget: React.FC<ConstrainedWidgetProps> = ({
  children,
  widgetId,
  expanded,
}) => {
  // Get fixed dimensions for this widget
  const fixedWidth = DynamicLayoutService.calculateFixedWidgetWidth(widgetId);
  const fixedHeight = DynamicLayoutService.getWidgetHeight(expanded);
  
  const styles = createStyles(fixedWidth, fixedHeight);
  
  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {children}
      </View>
    </View>
  );
};

const createStyles = (width: number, height: number) =>
  StyleSheet.create({
    container: {
      width,
      height,
      // CRITICAL: Enforce size constraints
      overflow: 'hidden', // Clip content that doesn't fit
    },
    contentContainer: {
      flex: 1,
      // Content must adapt to fit within these constraints
    },
  });

export default ConstrainedWidget;