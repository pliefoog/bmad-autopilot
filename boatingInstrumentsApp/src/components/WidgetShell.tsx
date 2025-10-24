import React, { useCallback, useRef } from 'react';
import { 
  View, 
  TouchableOpacity, 
  Animated, 
  StyleSheet, 
  Dimensions,
  Platform
} from 'react-native';
import { useTheme } from '../store/themeStore';
import { PlatformStyles } from '../utils/animationUtils';
import { getUseNativeDriver } from '../utils/animationUtils';
import { DynamicLayoutService } from '../services/dynamicLayoutService';

// FIXED: Standardized sizing - only two heights allowed
const COLLAPSED_HEIGHT = 140;  // Fixed collapsed height
const EXPANDED_HEIGHT = 292;   // Fixed expanded height (2 * 140 + 12 spacing)

interface WidgetShellProps {
  /**
   * Widget content to render inside the shell
   */
  children: React.ReactNode;
  
  /**
   * Whether the widget is currently expanded
   */
  expanded: boolean;
  
  /**
   * Fixed width for this widget (determined by content requirements)
   */
  width?: number;
  
  /**
   * Callback when user taps to toggle expansion state
   */
  onToggle: () => void;
  
  /**
   * Whether to disable the shell's TouchableOpacity (for widgets with internal touch elements)
   */
  disableTouch?: boolean;
  
  /**
   * Optional callback for long-press to lock expanded state
   */
  onLongPress?: () => void;
  
  /**
   * Optional test ID for testing
   */
  testID?: string;
}

// Remove duplicate interface since we defined it above

/**
 * WidgetShell - Universal wrapper for all widgets providing expand/collapse functionality
 * 
 * Features:
 * - AC 1-4: Two-state system with tap toggle and smooth animation
 * - AC 19: Animated chevron rotation (180°)
 * - AC 22: Consistent sizing across all widgets
 * - AC 4: 300ms ease-out animation
 */
export const WidgetShell: React.FC<WidgetShellProps> = ({
  children,
  expanded,
  width = 150, // Default width if not specified
  onToggle,
  onLongPress,
  disableTouch = false,
  testID = 'widget-shell',
}) => {
  const theme = useTheme();
  
  // FIXED: Only two heights allowed
  const heightAnimation = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const chevronAnimation = useRef(new Animated.Value(0)).current;
  
  // FIXED: Animate between only two heights
  React.useEffect(() => {
    const targetHeight = expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
    const targetChevronRotation = expanded ? 1 : 0; // 1 = 180 degrees
    
    Animated.parallel([
      Animated.timing(heightAnimation, {
        toValue: targetHeight,
        duration: 300,
        useNativeDriver: false, // Height animation requires layout changes
      }),
      Animated.timing(chevronAnimation, {
        toValue: targetChevronRotation,
        duration: 300,
        useNativeDriver: getUseNativeDriver(), // Transform can use native driver
      }),
    ]).start();
  }, [expanded, heightAnimation, chevronAnimation]);
  
  // AC 2: Handle tap to toggle state
  const handlePress = useCallback(() => {
    onToggle();
  }, [onToggle]);
  
  // Chevron rotation interpolation (0 = ⌄, 180° = ⌃)
  const chevronRotation = chevronAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  
  const styles = createStyles(width);
  
  return (
    <Animated.View
      style={[
        styles.container,
        {
          height: heightAnimation,
        },
      ]}
      testID={testID}
    >
      {disableTouch ? (
        <View style={styles.touchable}>
          <View style={styles.content}>
            {children}
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.touchable}
          onPress={handlePress}
          onLongPress={onLongPress}
          activeOpacity={0.95}
          testID={`${testID}-touchable`}
          accessibilityRole="button"
          accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} widget`}
          accessibilityHint="Double tap to toggle, long press to lock expanded"
        >
          <View style={styles.content}>
            {children}
          </View>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const createStyles = (width: number) => {
  return StyleSheet.create({
    container: {
      width: width, // FIXED: Use provided fixed width
      // Visual styling removed - handled by WidgetCard child
      backgroundColor: 'transparent',
      borderRadius: 0,
      borderWidth: 0,
      // borderColor, shadowColor, shadowOffset, shadowRadius removed - handled by WidgetCard
      overflow: 'visible', // Allow WidgetCard shadow to be visible
    },
    touchable: {
      flex: 1,
      position: 'relative',
    },
    content: {
      flex: 1,
      padding: 0, // Let child components handle their padding
    },
    chevronContainer: {
      position: 'absolute',
      top: 14, // Align with header
      right: 16,
      width: 16,
      height: 16,
      justifyContent: 'center',
      alignItems: 'center',
      pointerEvents: 'none', // Allow touch events to pass through to parent
    },
  });
};