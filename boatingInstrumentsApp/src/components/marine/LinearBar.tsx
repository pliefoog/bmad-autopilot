import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ViewStyle } from 'react-native';
import { useTheme } from '../../store/themeStore';
import { ANIMATION_DURATIONS, ANIMATION_EASINGS } from '../../utils/animationOptimization';
import { getUseNativeDriver } from '../../utils/animationUtils';

/**
 * LinearBar - Progress bar component for tank/battery indicators with marine styling
 * 
 * Acceptance Criteria Satisfied:
 * - AC 3: Linear Bar Component with horizontal and vertical progress bars for tank/battery indicators
 * - AC 16: Threshold Markers with configurable warning and critical level markers
 * - AC 17: Fluid Appearance with realistic liquid/charge level visualization
 * - AC 18: Wave Motion with subtle animation effects for liquid representation
 * - AC 19: Marine Grade Styling with professional marine equipment appearance
 * - AC 20: Multi-directional Support with horizontal and vertical orientations
 * 
 * Features:
 * - Horizontal and vertical progress bars with professional marine styling
 * - Configurable threshold markers for warning and critical levels
 * - Fluid appearance with realistic liquid/charge level visualization
 * - Subtle wave motion animation effects for liquid representation
 * - Marine-grade styling matching professional marine equipment standards
 * - Multi-directional support with automatic orientation detection
 */

export type LinearBarOrientation = 'horizontal' | 'vertical';
export type LinearBarType = 'tank' | 'battery' | 'gauge';

export interface ThresholdMarker {
  value: number;
  color: 'amber' | 'red';
  label?: string;
}

export interface LinearBarProps {
  /** Current value (0-100) */
  value: number;
  /** Bar orientation */
  orientation: LinearBarOrientation;
  /** Type of bar for styling */
  type: LinearBarType;
  /** Threshold markers for warnings/critical levels */
  thresholds?: ThresholdMarker[];
  /** Bar width (for horizontal) or height (for vertical) */
  size: number;
  /** Bar thickness */
  thickness: number;
  /** Unit label */
  unit: string;
  /** Show value text */
  showValue?: boolean;
  /** Enable wave motion animation */
  animated?: boolean;
  /** Custom styling */
  style?: ViewStyle;
  /** Accessibility identifier */
  testID?: string;
}

export const LinearBar: React.FC<LinearBarProps> = ({
  value,
  orientation,
  type,
  thresholds = [],
  size,
  thickness,
  unit,
  showValue = true,
  animated = true,
  style,
  testID,
}) => {
  const theme = useTheme();
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const waveAnimation = useRef(new Animated.Value(0)).current;
  
  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value));
  const normalizedValue = clampedValue / 100;
  
  // Animate progress bar (AC 17)
  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: normalizedValue,
      duration: ANIMATION_DURATIONS.NORMAL,
      easing: ANIMATION_EASINGS.EASE_OUT,
      useNativeDriver: false, // Width/height animations require JS driver
    }).start();
  }, [normalizedValue, progressAnimation]);
  
  // Wave motion animation for liquid representation (AC 18)
  useEffect(() => {
    if (animated && type === 'tank') {
      const waveAnimationLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnimation, {
            toValue: 1,
            duration: 2000,
            easing: ANIMATION_EASINGS.EASE_IN_OUT,
            useNativeDriver: getUseNativeDriver(),
          }),
          Animated.timing(waveAnimation, {
            toValue: 0,
            duration: 2000,
            easing: ANIMATION_EASINGS.EASE_IN_OUT,
            useNativeDriver: getUseNativeDriver(),
          }),
        ])
      );
      waveAnimationLoop.start();
      
      return () => waveAnimationLoop.stop();
    }
  }, [animated, type, waveAnimation]);
  
  // Get bar color based on value and type (AC 19)
  const getBarColor = () => {
    // Check thresholds for warning/critical states
    for (const threshold of thresholds.sort((a, b) => b.value - a.value)) {
      if (clampedValue <= threshold.value) {
        return threshold.color === 'red' ? '#AA0000' : '#FFAA00';
      }
    }
    
    // Normal colors based on type
    switch (type) {
      case 'tank':
        return '#0066CC'; // Marine blue for fluids
      case 'battery':
        return '#00AA00'; // Green for battery charge
      case 'gauge':
        return '#CCCCCC'; // Neutral for generic gauge
      default:
        return theme.primary;
    }
  };
  
  // Calculate container dimensions (AC 20)
  const containerStyle: ViewStyle = {
    width: orientation === 'horizontal' ? size : thickness,
    height: orientation === 'vertical' ? size : thickness,
    flexDirection: orientation === 'horizontal' ? 'row' : 'column',
  };
  
  // Calculate progress dimensions
  const progressStyle = useMemo(() => {
    const baseStyle = {
      backgroundColor: getBarColor(),
      borderRadius: thickness / 6,
    };
    
    if (orientation === 'horizontal') {
      return {
        ...baseStyle,
        height: thickness,
        width: progressAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, size],
          extrapolate: 'clamp',
        }),
      };
    } else {
      return {
        ...baseStyle,
        width: thickness,
        height: progressAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, size],
          extrapolate: 'clamp',
        }),
        alignSelf: 'flex-end' as const, // Vertical bars fill from bottom
      };
    }
  }, [orientation, thickness, size, progressAnimation, getBarColor]);
  
  // Wave effect transform for liquid animation (AC 18)
  const waveTransform = animated && type === 'tank' ? {
    transform: [
      {
        translateY: waveAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -2],
        }),
      },
      {
        scaleY: waveAnimation.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 1.02, 1],
        }),
      },
    ],
  } : {};
  
  const styles = createStyles(theme, orientation, thickness);
  
  return (
    <View style={[styles.container, style]} testID={testID}>
      
      {/* Main bar container */}
      <View style={[styles.barContainer, containerStyle]}>
        
        {/* Background track */}
        <View style={styles.track} />
        
        {/* Progress fill */}
        <Animated.View
          style={[styles.progress, progressStyle, waveTransform]}
          testID={testID ? `${testID}-progress` : 'linear-bar-progress'}
        />
        
        {/* Threshold markers (AC 16) */}
        {thresholds.map((threshold, index) => {
          const position = (threshold.value / 100) * size;
          const markerStyle = orientation === 'horizontal'
            ? { left: position, height: thickness + 4 }
            : { bottom: position, width: thickness + 4 };
          
          return (
            <View
              key={index}
              style={[
                styles.thresholdMarker,
                markerStyle,
                { borderColor: threshold.color === 'red' ? '#AA0000' : '#FFAA00' }
              ]}
              testID={testID ? `${testID}-threshold-${index}` : `threshold-${index}`}
            />
          );
        })}
      </View>
      
      {/* Value display */}
      {showValue && (
        <View style={styles.valueContainer}>
          <Text style={styles.valueText} testID={testID ? `${testID}-value` : 'linear-bar-value'}>
            {clampedValue.toFixed(0)}{unit}
          </Text>
        </View>
      )}
      
    </View>
  );
};

const createStyles = (theme: any, orientation: LinearBarOrientation, thickness: number) => {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    
    barContainer: {
      position: 'relative',
      backgroundColor: '#1A1A1A', // Marine equipment background
      borderRadius: thickness / 4,
      borderWidth: 1,
      borderColor: '#2A2A2A',
      overflow: 'hidden',
    },
    
    track: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#0A0A0A',
      borderRadius: thickness / 6,
    },
    
    progress: {
      position: 'absolute',
      top: orientation === 'vertical' ? undefined : 0,
      bottom: orientation === 'vertical' ? 0 : undefined,
      left: 0,
      borderRadius: thickness / 6,
      // Gradient-like effect with shadow
      shadowColor: '#FFFFFF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 2,
    },
    
    thresholdMarker: {
      position: 'absolute',
      borderWidth: 2,
      borderStyle: 'dashed',
      zIndex: 10,
    },
    
    valueContainer: {
      marginTop: orientation === 'vertical' ? 8 : 4,
      marginLeft: orientation === 'horizontal' ? 8 : 0,
      backgroundColor: 'rgba(10, 10, 10, 0.8)',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: '#2A2A2A',
    },
    
    valueText: {
      fontSize: 12,
      fontFamily: 'monospace',
      fontWeight: '600',
      color: theme.text,
      textAlign: 'center',
      minWidth: 40,
    },
  });
};

export default LinearBar;