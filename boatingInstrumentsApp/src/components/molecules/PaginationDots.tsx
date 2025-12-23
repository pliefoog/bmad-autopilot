import React from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../store/themeStore';
import { UniversalIcon } from '../atoms/UniversalIcon';
import { log as logger } from '../../utils/logging/logger';

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

  // Debug logging
  logger.layout('PaginationDots rendering:', () => ({ currentPage, totalPages, hasIcons: true }));

  // Don't render if there's only one page or no pages
  if (totalPages <= 1) {
    logger.layout('PaginationDots not rendering - only one page or less');
    return null;
  }

  const renderDot = (index: number) => {
    const isActive = index === currentPage;

    // Animated dot scale if animation value provided
    const animatedStyle = animatedValue
      ? {
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [index - 1, index, index + 1],
                outputRange: [0.8, 1.2, 0.8],
                extrapolate: 'clamp',
              }),
            },
          ],
        }
      : {};

    return (
      <TouchableOpacity
        key={index}
        style={styles.dotTouchArea}
        onPress={() => onPagePress?.(index)}
        activeOpacity={0.7}
        testID={`${testID}-dot-${index}`}
        accessibilityRole="button"
        accessibilityLabel={`Go to page ${index + 1} of ${totalPages}`}
        accessibilityState={{ selected: isActive }}
      >
        <Animated.View
          style={[
            styles.dotCircle,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: isActive ? theme.primary : theme.textSecondary,
              opacity: isActive ? 1 : 0.4,
            },
            animatedStyle,
          ]}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[styles.container, { paddingVertical: dotSpacing / 2 }]}
      testID={testID}
      accessibilityRole="tablist"
      accessibilityLabel={`Page ${currentPage + 1} of ${totalPages}`}
    >
      <View style={styles.navigationContainer}>
        {/* Previous button */}
        <TouchableOpacity
          style={[styles.arrowButton, currentPage === 0 && styles.arrowButtonDisabled]}
          onPress={() => currentPage > 0 && onPagePress?.(currentPage - 1)}
          disabled={currentPage === 0}
          testID={`${testID}-prev`}
          accessibilityRole="button"
          accessibilityLabel="Previous page"
          accessibilityState={{ disabled: currentPage === 0 }}
        >
          <UniversalIcon
            name="chevron-back-outline"
            size={24}
            color={currentPage === 0 ? theme.textSecondary + '40' : theme.textSecondary}
          />
        </TouchableOpacity>

        {/* Dots container */}
        <View style={styles.dotsContainer}>
          {Array.from({ length: totalPages }, (_, index) => renderDot(index))}
        </View>

        {/* Next button */}
        <TouchableOpacity
          style={[styles.arrowButton, currentPage === totalPages - 1 && styles.arrowButtonDisabled]}
          onPress={() => currentPage < totalPages - 1 && onPagePress?.(currentPage + 1)}
          disabled={currentPage === totalPages - 1}
          testID={`${testID}-next`}
          accessibilityRole="button"
          accessibilityLabel="Next page"
          accessibilityState={{ disabled: currentPage === totalPages - 1 }}
        >
          <UniversalIcon
            name="chevron-forward-outline"
            size={24}
            color={
              currentPage === totalPages - 1 ? theme.textSecondary + '40' : theme.textSecondary
            }
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // Minimum height to ensure touch targets
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 8,
  },
  arrowButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    marginHorizontal: 8,
  },
  arrowButtonDisabled: {
    opacity: 0.3,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotTouchArea: {
    // Minimum 44pt touch target per accessibility guidelines (AC 20)
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  dotCircle: {
    // Actual visual dot - small and circular
    // Size controlled dynamically via props (default 8pt)
  },
});

export default PaginationDots;
