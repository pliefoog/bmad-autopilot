import React, { useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../store/themeStore';
import { useUIStore } from '../store/uiStore';

/**
 * PersistentHamburger Component
 * 
 * Semi-translucent hamburger icon that appears when header is hidden.
 * Provides access to header menu in immersive instrument mode.
 * 
 * Features:
 * - Only visible when header is hidden
 * - Semi-translucent (40% opacity) to minimize visual weight
 * - Positioned in safe area (below notch/Dynamic Island on iOS)
 * - Hint animation on first appearance (pulses 3 times)
 * - Tap to reveal full header
 */
export const PersistentHamburger: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isHeaderVisible, showHeader, hasSeenHint, markHintSeen } = useUIStore();
  
  // Hint animation (chevron that pulses below hamburger)
  const hintOpacity = useSharedValue(0);
  
  // Trigger hint animation on first hide (only once)
  useEffect(() => {
    if (!isHeaderVisible && !hasSeenHint) {
      // Pulse 3 times: fade in → fade out → fade in → fade out → fade in → fade out
      hintOpacity.value = withSequence(
        withTiming(1, { duration: 300 }),
        withDelay(500, withTiming(0, { duration: 300 })),
        withDelay(500, withTiming(1, { duration: 300 })),
        withDelay(500, withTiming(0, { duration: 300 })),
        withDelay(500, withTiming(1, { duration: 300 })),
        withDelay(500, withTiming(0, { duration: 300 })),
      );
      
      // Mark as seen after animation completes (4 seconds)
      setTimeout(() => {
        markHintSeen();
      }, 4000);
    }
  }, [isHeaderVisible, hasSeenHint, hintOpacity, markHintSeen]);
  
  const hintStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
  }));
  
  // Only show when header is hidden
  if (isHeaderVisible) {
    return null;
  }
  
  return (
    <>
      <TouchableOpacity
        style={[
          styles.hamburgerButton,
          {
            top: insets.top + 60,
            left: 60,
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: '#000',
          },
        ]}
        onPress={showHeader}
        accessibilityRole="button"
        accessibilityLabel="Show menu"
        testID="persistent-hamburger"
      >
        <Text style={[styles.hamburgerIcon, { color: theme.text }]}>☰</Text>
      </TouchableOpacity>
      
      {/* Hint chevron - only shows on first hide */}
      {!hasSeenHint && (
        <Animated.View
          style={[
            styles.hintContainer,
            {
              top: insets.top + 116,
              left: 74,
            },
            hintStyle,
          ]}
          pointerEvents="none"
        >
          <Text style={[styles.hintChevron, { color: theme.text }]}>⌄</Text>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  hamburgerButton: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26, // Circular - nautical porthole aesthetic
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    zIndex: 999,
    // Pronounced floating effect - large diffuse shadow
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12, // Android
  },
  hamburgerIcon: {
    fontSize: 24,
    fontWeight: '600', // Slightly bolder for better visibility
  },
  hintContainer: {
    position: 'absolute',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 998,
  },
  hintChevron: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
