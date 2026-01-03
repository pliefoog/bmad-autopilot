/**
 * PlaceholderWidget - Visual placeholder for drag-and-drop
 *
 * Shows a dashed gray box at the drop target position during widget drag.
 * This widget is inserted into the widget array during drag to provide
 * iOS-style reflow where other widgets shift to make space.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../store/themeStore';

interface PlaceholderWidgetProps {
  id: string; // Required prop (matches widget interface)
  instanceNumber?: number; // Optional (matches widget interface)
}

/**
 * Placeholder widget - renders as gray dashed box
 * Inserted in widget array during drag to show drop target
 */
export const PlaceholderWidget: React.FC<PlaceholderWidgetProps> = React.memo(() => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.placeholder,
        {
          borderColor: theme?.colors?.primary || '#007AFF',
          backgroundColor: `${theme?.colors?.primary || '#007AFF'}15`, // 15 = ~8% opacity
        },
      ]}
      testID="drag-placeholder-widget"
    />
  );
});

PlaceholderWidget.displayName = 'PlaceholderWidget';

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
