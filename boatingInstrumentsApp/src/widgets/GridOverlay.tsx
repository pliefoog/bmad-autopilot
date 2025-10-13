import React from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_SIZE = 20;

interface GridOverlayProps {
  visible: boolean;
  gridColor?: string;
}

export const GridOverlay: React.FC<GridOverlayProps> = ({
  visible,
  gridColor = 'rgba(6, 182, 212, 0.3)',
}) => {
  if (!visible) {
    return null;
  }

  // Calculate grid lines
  const verticalLines = Math.floor(SCREEN_WIDTH / GRID_SIZE);
  const horizontalLines = Math.floor(SCREEN_HEIGHT / GRID_SIZE);

  const renderGridLines = () => {
    const lines = [];

    // Vertical lines
    for (let i = 0; i <= verticalLines; i++) {
      lines.push(
        <View
          key={`v-${i}`}
          style={[
            styles.gridLine,
            {
              left: i * GRID_SIZE,
              width: 1,
              height: SCREEN_HEIGHT,
              backgroundColor: gridColor,
            },
          ]}
        />
      );
    }

    // Horizontal lines
    for (let i = 0; i <= horizontalLines; i++) {
      lines.push(
        <View
          key={`h-${i}`}
          style={[
            styles.gridLine,
            {
              top: i * GRID_SIZE,
              height: 1,
              width: SCREEN_WIDTH,
              backgroundColor: gridColor,
            },
          ]}
        />
      );
    }

    return lines;
  };

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={styles.overlay}
      pointerEvents="none"
    >
      {renderGridLines()}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  gridLine: {
    position: 'absolute',
  },
});