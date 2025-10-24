import React, { useRef } from 'react';
import { Text, StyleSheet, Animated, ViewStyle, TextStyle, TouchableOpacity, GestureResponderEvent } from 'react-native';
import { useTheme } from '../../store/themeStore';
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
          background: '#1E4A6B',
          backgroundPressed: '#0F2A3B',
          border: '#3A6A8B',
          text: '#FFFFFF',
        };
      case 'secondary':
        return {
          background: '#2A2A2A',
          backgroundPressed: '#1A1A1A',
          border: '#4A4A4A',
          text: '#CCCCCC',
        };
      case 'emergency':
        return {
          background: '#8B0000',
          backgroundPressed: '#4B0000',
          border: '#AA0000',
          text: '#FFFFFF',
        };
      case 'toggle':
        return {
          background: isToggled ? '#00AA00' : '#2A2A2A',
          backgroundPressed: isToggled ? '#008800' : '#1A1A1A',
          border: isToggled ? '#00CC00' : '#4A4A4A',
          text: isToggled ? '#FFFFFF' : '#CCCCCC',
        };
      default:
        return {
          background: '#1E4A6B',
          backgroundPressed: '#0F2A3B',
          border: '#3A6A8B',
          text: '#FFFFFF',
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
  
  const styles = createStyles(theme, colors, dimensions, disabled);
  
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
  theme: any, 
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
      borderColor: disabled ? '#333333' : colors.border,
      minWidth: dimensions.minWidth,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      opacity: disabled ? 0.5 : 1,
      // Professional marine styling with depth
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      // Beveled appearance
      borderTopColor: disabled ? '#333333' : colors.border,
      borderLeftColor: disabled ? '#333333' : colors.border,
      borderBottomColor: disabled ? '#222222' : '#1A1A1A',
      borderRightColor: disabled ? '#222222' : '#1A1A1A',
    },
    
    buttonText: {
      fontSize: dimensions.fontSize,
      fontFamily: 'monospace',
      fontWeight: '700',
      color: disabled ? '#666666' : colors.text,
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
      backgroundColor: '#FFFFFF',
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
      backgroundColor: '#000000',
      borderBottomLeftRadius: dimensions.borderRadius - 2,
      borderBottomRightRadius: dimensions.borderRadius - 2,
      zIndex: 1,
    },
  });
};

export default MarineButton;