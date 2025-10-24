import React from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../store/themeStore';

interface PaginationDotsProps {
  currentPage: number;
  totalPages: number;
  onPagePress?: (pageIndex: number) => void;
  dotSize?: number;
  dotSpacing?: number;
  animatedValue?: Animated.Value;
  testID?: string;
}

/**
 * PaginationDots - Page indicator component for dashboard pagination
 * Implements AC 6: Page Indicator Dots below widget grid
 * Shows current page position and total pages available
 */
export const PaginationDots: React.FC<PaginationDotsProps> = ({
  currentPage,
  totalPages,
  onPagePress,
  dotSize = 8,
  dotSpacing = 16,
  animatedValue,
  testID = 'pagination-dots',
}) => {
  const theme = useTheme();

  // Don't render if there's only one page or no pages
  if (totalPages <= 1) {
    return null;
  }

  const renderDot = (index: number) => {
    const isActive = index === currentPage;
    
    // Animated dot scale if animation value provided
    const animatedStyle = animatedValue ? {
      transform: [
        {
          scale: animatedValue.interpolate({
            inputRange: [index - 1, index, index + 1],
            outputRange: [0.8, 1.2, 0.8],
            extrapolate: 'clamp',
          }),
        },
      ],
    } : {};

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            backgroundColor: isActive ? theme.primary : theme.textSecondary,
            marginHorizontal: dotSpacing / 2,
            opacity: isActive ? 1 : 0.4,
          },
        ]}
        onPress={() => onPagePress?.(index)}
        activeOpacity={0.7}
        testID={`${testID}-dot-${index}`}
        accessibilityRole="button"
        accessibilityLabel={`Go to page ${index + 1} of ${totalPages}`}
        accessibilityState={{ selected: isActive }}
      >
        <Animated.View
          style={[
            {
              width: '100%',
              height: '100%',
              borderRadius: dotSize / 2,
              backgroundColor: isActive ? theme.primary : theme.textSecondary,
            },
            animatedStyle,
          ]}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { paddingVertical: dotSpacing / 2 }
      ]}
      testID={testID}
      accessibilityRole="tablist"
      accessibilityLabel={`Page ${currentPage + 1} of ${totalPages}`}
    >
      <View style={styles.dotsContainer}>
        {Array.from({ length: totalPages }, (_, index) => renderDot(index))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 30, // Minimum height to ensure touch targets
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    borderRadius: 50, // Will be overridden by dynamic size
    // Minimum touch target of 44pt per accessibility guidelines (AC 20)
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PaginationDots;