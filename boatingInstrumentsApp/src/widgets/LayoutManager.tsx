import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '../store/themeStore';

const WIDGET_MIN_HEIGHT = 120;
const SCREEN_WIDTH = Dimensions.get('window').width;

export interface LayoutWidget {
  key: string;
  render: () => React.ReactNode;
}

export const LayoutManager: React.FC<{ widgets: LayoutWidget[] }> = ({ widgets }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  // For demo: simple vertical drag-and-drop, resizable widgets
  const [sizes, setSizes] = useState<{ [key: string]: { width: number; height: number } }>(
    Object.fromEntries(widgets.map(w => [w.key, { width: SCREEN_WIDTH - 48, height: WIDGET_MIN_HEIGHT }]))
  );

  // Resizing logic: simple handle to increase/decrease height
  const handleResize = (key: string, delta: number) => {
    setSizes(s => ({
      ...s,
      [key]: {
        ...s[key],
        height: Math.max(WIDGET_MIN_HEIGHT, s[key].height + delta),
      },
    }));
  };

  return (
    <View>
      {widgets.map(widget => (
        <View key={widget.key} style={[styles.widget, { height: sizes[widget.key]?.height || WIDGET_MIN_HEIGHT, width: sizes[widget.key]?.width || SCREEN_WIDTH - 48 }]}> 
          {widget.render()}
          <View style={styles.resizeBar}>
            <Animated.View style={styles.resizeHandle}>
              <View
                style={styles.handleArea}
                onTouchStart={() => handleResize(widget.key, 20)}
                onTouchEnd={() => handleResize(widget.key, -20)}
              />
            </Animated.View>
          </View>
        </View>
      ))}
    </View>
  );
};

const createStyles = (theme: typeof useTheme extends () => infer R ? R : never) => StyleSheet.create({
  widget: {
    marginBottom: 16,
    backgroundColor: theme.surface,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
    position: 'relative',
  },
  resizeBar: {
    height: 18,
    backgroundColor: theme.surfaceDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resizeHandle: {
    width: 40,
    height: 18,
    backgroundColor: theme.borderDark,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleArea: {
    width: 40,
    height: 18,
  },
});
