import React, { useRef, useMemo } from 'react';
import { Text, StyleSheet, Animated, ViewStyle, TextStyle, TouchableOpacity, GestureResponderEvent } from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { ANIMATION_DURATIONS, ANIMATION_EASINGS } from '../../utils/animationOptimization';
import { getUseNativeDriver } from '../../utils/animationUtils';

/**
 * MarineButton - Professional tactile button component for marine interfaces
 * 
 * Acceptance Criteria Satisfied:
 * - AC 5: Marine Button Component with professional tactile buttons for marine control interfaces
 * - AC 24: Professional Marine Styling with pressed/unpressed states and tactile feedback
 * 
 * Features:
 * - Professional tactile buttons matching marine control interface standards
 * - Clear pressed/unpressed visual states with realistic depth effects
 * - Haptic-style visual feedback for marine environment usability
 * - Multiple size variants for different interface contexts
 * - Support for primary, secondary, and emergency button types
 * - Professional marine equipment styling with beveled edges and depth
 */

export type MarineButtonVariant = 'primary' | 'secondary' | 'emergency' | 'toggle';
export type MarineButtonSize = 'small' | 'medium' | 'large';

export interface MarineButtonProps {
  /** Button text */
  title: string;
  /** Button press handler */
  onPress: (event: GestureResponderEvent) => void;
  /** Button variant for styling */
  variant?: MarineButtonVariant;
  /** Button size */
  size?: MarineButtonSize;
  /** Disabled state */
  disabled?: boolean;
  /** Toggle state for toggle variant */
  isToggled?: boolean;
  /** Custom styling */
  style?: ViewStyle;
  /** Custom text styling */
  textStyle?: TextStyle;
  /** Accessibility identifier */
  testID?: string;
}

export const MarineButton: React.FC<MarineButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  isToggled = false,
  style,
  textStyle,
  testID,
}) => {
  const theme = useTheme();
  const pressAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  
  // Get variant colors
  const getVariantColors = (buttonVariant: MarineButtonVariant) => {
    switch (buttonVariant) {
      case 'primary':
        return {
          background: theme.interactive,
          backgroundPressed: theme.interactiveActive,
          border: theme.border,
          text: theme.text,
        };
      case 'secondary':
        return {
          background: theme.surfaceDim,
          backgroundPressed: theme.surface,
          border: theme.border,
          text: theme.textSecondary,
        };
      case 'emergency':
        return {
          background: theme.error,
          backgroundPressed: theme.error,
          border: theme.borderDark,
          text: theme.text,
        };
      case 'toggle':
        return {
          background: isToggled ? theme.success : theme.surfaceDim,
          backgroundPressed: isToggled ? theme.success : theme.surface,
          border: isToggled ? theme.success : theme.border,
          text: isToggled ? theme.text : theme.textSecondary,
        };
      default:
        return {
          background: theme.interactive,
          backgroundPressed: theme.interactiveActive,
          border: theme.border,
          text: theme.text,
        };
    }
  };
  
  // Get size dimensions
  const getSizeDimensions = (buttonSize: MarineButtonSize) => {
    switch (buttonSize) {
      case 'small':
        return { 
          paddingHorizontal: 12, 
          paddingVertical: 6, 
          fontSize: 12, 
          minWidth: 60,
          borderRadius: 6,
        };
      case 'medium':
        return { 
          paddingHorizontal: 20, 
          paddingVertical: 10, 
          fontSize: 14, 
          minWidth: 80,
          borderRadius: 8,
        };
      case 'large':
        return { 
          paddingHorizontal: 28, 
          paddingVertical: 14, 
          fontSize: 16, 
          minWidth: 120,
          borderRadius: 10,
        };
      default:
        return { 
          paddingHorizontal: 20, 
          paddingVertical: 10, 
          fontSize: 14, 
          minWidth: 80,
          borderRadius: 8,
        };
    }
  };
  
  const colors = getVariantColors(variant);
  const dimensions = getSizeDimensions(size);
  const styles = useMemo(() => createStyles(theme, colors, dimensions, disabled), [theme, colors, dimensions, disabled]);
  
  // Handle press in with animation (AC 24)
  const handlePressIn = () => {
    if (disabled) return;
    
    Animated.parallel([
      Animated.timing(pressAnimation, {
        toValue: 1,
        duration: ANIMATION_DURATIONS.FAST,
        easing: ANIMATION_EASINGS.EASE_OUT,
        useNativeDriver: false,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 0.95,
        duration: ANIMATION_DURATIONS.FAST,
        easing: ANIMATION_EASINGS.EASE_OUT,
        useNativeDriver: getUseNativeDriver(),
      }),
    ]).start();
  };
  
  // Handle press out with animation
  const handlePressOut = () => {
    if (disabled) return;
    
    Animated.parallel([
      Animated.timing(pressAnimation, {
        toValue: 0,
        duration: ANIMATION_DURATIONS.FAST,
        easing: ANIMATION_EASINGS.EASE_OUT,
        useNativeDriver: false,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: ANIMATION_DURATIONS.FAST,
        easing: ANIMATION_EASINGS.EASE_OUT,
        useNativeDriver: getUseNativeDriver(),
      }),
    ]).start();
  };
  
  // Animated styles for pressed state
  const animatedBackgroundColor = pressAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.background, colors.backgroundPressed],
  });
  
  const animatedElevation = pressAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 1],
  });
  
  const animatedShadowOpacity = pressAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.1],
  });
  
  return (
    <TouchableOpacity
      activeOpacity={1}
      disabled={disabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      testID={testID}
    >
      <Animated.View
        style={[
          styles.button,
          {
            backgroundColor: animatedBackgroundColor,
            elevation: animatedElevation,
            shadowOpacity: animatedShadowOpacity,
            transform: [{ scale: scaleAnimation }],
          },
          style,
        ]}
      >
        {/* Top highlight for depth effect */}
        <Animated.View 
          style={[
            styles.topHighlight,
            {
              opacity: pressAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 0.1],
              }),
            },
          ]} 
        />
        
        {/* Button text */}
        <Text 
          style={[styles.buttonText, textStyle]}
          testID={testID ? `${testID}-text` : 'marine-button-text'}
        >
          {title}
        </Text>
        
        {/* Bottom shadow for depth effect */}
        <Animated.View 
          style={[
            styles.bottomShadow,
            {
              opacity: pressAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0.4, 0.8],
              }),
            },
          ]} 
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const createStyles = (
  theme: ThemeColors, 
  colors: any, 
  dimensions: any,
  disabled: boolean
) => {
  return StyleSheet.create({
    button: {
      paddingHorizontal: dimensions.paddingHorizontal,
      paddingVertical: dimensions.paddingVertical,
      borderRadius: dimensions.borderRadius,
      borderWidth: 2,
      borderColor: disabled ? theme.borderDark : colors.border,
      minWidth: dimensions.minWidth,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      opacity: disabled ? 0.5 : 1,
      // Professional marine styling with depth
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      // Beveled appearance
      borderTopColor: disabled ? theme.borderDark : colors.border,
      borderLeftColor: disabled ? theme.borderDark : colors.border,
      borderBottomColor: disabled ? theme.surface : theme.surfaceDim,
      borderRightColor: disabled ? theme.surface : theme.surfaceDim,
    },
    
    buttonText: {
      fontSize: dimensions.fontSize,
      fontFamily: 'monospace',
      fontWeight: '700',
      color: disabled ? theme.interactiveDisabled : colors.text,
      textAlign: 'center',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      zIndex: 2,
    },
    
    topHighlight: {
      position: 'absolute',
      top: 1,
      left: 1,
      right: 1,
      height: '30%',
      backgroundColor: theme.surfaceHighlight,
      borderTopLeftRadius: dimensions.borderRadius - 2,
      borderTopRightRadius: dimensions.borderRadius - 2,
      zIndex: 1,
    },
    
    bottomShadow: {
      position: 'absolute',
      bottom: 1,
      left: 1,
      right: 1,
      height: '20%',
      backgroundColor: theme.shadow,
      borderBottomLeftRadius: dimensions.borderRadius - 2,
      borderBottomRightRadius: dimensions.borderRadius - 2,
      zIndex: 1,
    },
  });
};

export default MarineButton;