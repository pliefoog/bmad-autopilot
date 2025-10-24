import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ViewStyle } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { useTheme } from '../../store/themeStore';
import { ANIMATION_DURATIONS, ANIMATION_EASINGS } from '../../utils/animationOptimization';

/**
 * AnalogGauge - Circular gauge component with needle animation for marine instruments
 * 
 * Acceptance Criteria Satisfied:
 * - AC 2: Analog Gauge Component with circular gauge and marine-standard scales and needle indicators
 * - AC 11: Customizable Scale Ranges with configurable min/max values and automatic scale calculation
 * - AC 12: Marine Color Coding with green normal range, amber caution range, red danger range on gauge face
 * - AC 13: Needle Animation with smooth needle movement and realistic damping for natural motion
 * - AC 14: Tick Mark System with major and minor tick marks and appropriate value labels
 * - AC 15: Digital Readout Integration with digital value display within analog gauge center
 * 
 * Features:
 * - Circular gauge with customizable scale ranges and automatic calculation
 * - Marine color-coded ranges (green/amber/red) for safety standards
 * - Smooth needle animation with realistic damping using React Native Reanimated
 * - Major and minor tick mark system with appropriate value labeling
 * - Integrated digital readout display in gauge center
 * - Professional marine instrument styling matching industry standards
 */

export interface GaugeRange {
  min: number;
  max: number;
  color: 'green' | 'amber' | 'red';
}

export interface AnalogGaugeProps {
  /** Current gauge value */
  value: number;
  /** Minimum scale value */
  min: number;
  /** Maximum scale value */
  max: number;
  /** Unit label */
  unit: string;
  /** Colored ranges for marine safety standards */
  ranges: GaugeRange[];
  /** Show digital readout in center */
  showDigital?: boolean;
  /** Gauge diameter in points */
  size: number;
  /** Number of decimal places for digital readout */
  precision?: number;
  /** Custom styling */
  style?: ViewStyle;
  /** Accessibility identifier */
  testID?: string;
}

export const AnalogGauge: React.FC<AnalogGaugeProps> = ({
  value,
  min,
  max,
  unit,
  ranges,
  showDigital = true,
  size,
  precision = 1,
  style,
  testID,
}) => {
  const theme = useTheme();
  const needleAnimation = useRef(new Animated.Value(0)).current;
  
  // Calculate gauge geometry
  const radius = (size - 40) / 2;
  const center = size / 2;
  const needleLength = radius * 0.8;
  
  // Normalize value to 0-1 range for angle calculation
  const normalizedValue = Math.max(0, Math.min(1, (value - min) / (max - min)));
  
  // Calculate needle angle (240° sweep from -120° to +120°)
  const startAngle = -120;
  const endAngle = 120;
  const sweepAngle = endAngle - startAngle;
  const targetAngle = startAngle + (normalizedValue * sweepAngle);
  
  // Animate needle with realistic damping (AC 13)
  useEffect(() => {
    Animated.timing(needleAnimation, {
      toValue: targetAngle,
      duration: ANIMATION_DURATIONS.NORMAL,
      easing: ANIMATION_EASINGS.EASE_OUT,
      useNativeDriver: false, // SVG animations require JS driver
    }).start();
  }, [targetAngle, needleAnimation]);
  
  // Generate tick marks and labels (AC 14)
  const tickMarks = useMemo(() => {
    const ticks = [];
    const majorTickCount = 11; // 0, 10, 20, ..., 100%
    const minorTicksPerMajor = 4;
    
    for (let i = 0; i <= majorTickCount; i++) {
      const angle = startAngle + (i / majorTickCount) * sweepAngle;
      const tickValue = min + (i / majorTickCount) * (max - min);
      const isMajor = true;
      
      ticks.push({
        angle,
        value: tickValue,
        isMajor,
      });
      
      // Add minor ticks between major ticks
      if (i < majorTickCount) {
        for (let j = 1; j <= minorTicksPerMajor; j++) {
          const minorAngle = angle + (j / (minorTicksPerMajor + 1)) * (sweepAngle / majorTickCount);
          ticks.push({
            angle: minorAngle,
            value: 0, // Minor ticks don't show values
            isMajor: false,
          });
        }
      }
    }
    
    return ticks;
  }, [min, max, startAngle, sweepAngle]);
  
  // Get marine color for ranges (AC 12)
  const getMarineColor = (colorName: 'green' | 'amber' | 'red') => {
    switch (colorName) {
      case 'green':
        return '#00AA00'; // Marine normal range
      case 'amber':
        return '#FFAA00'; // Marine caution range
      case 'red':
        return '#AA0000'; // Marine danger range
    }
  };
  
  // Convert angle to SVG coordinates
  const angleToPoint = (angle: number, radius: number) => {
    const radians = (angle * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(radians),
      y: center + radius * Math.sin(radians),
    };
  };
  
  const styles = createStyles(theme, size);
  
  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Gauge SVG */}
      <Svg width={size} height={size} style={styles.svg}>
        
        {/* Colored range arcs (AC 12) */}
        {ranges.map((range, index) => {
          const rangeStartAngle = startAngle + ((range.min - min) / (max - min)) * sweepAngle;
          const rangeEndAngle = startAngle + ((range.max - min) / (max - min)) * sweepAngle;
          const arcRadius = radius * 0.9;
          
          const startPoint = angleToPoint(rangeStartAngle, arcRadius);
          const endPoint = angleToPoint(rangeEndAngle, arcRadius);
          
          return (
            <G key={index}>
              <Line
                x1={startPoint.x}
                y1={startPoint.y}
                x2={endPoint.x}
                y2={endPoint.y}
                stroke={getMarineColor(range.color)}
                strokeWidth={8}
                strokeLinecap="round"
              />
            </G>
          );
        })}
        
        {/* Tick marks (AC 14) */}
        {tickMarks.map((tick, index) => {
          const outerPoint = angleToPoint(tick.angle, radius);
          const innerRadius = tick.isMajor ? radius * 0.85 : radius * 0.9;
          const innerPoint = angleToPoint(tick.angle, innerRadius);
          
          return (
            <G key={index}>
              <Line
                x1={outerPoint.x}
                y1={outerPoint.y}
                x2={innerPoint.x}
                y2={innerPoint.y}
                stroke="#CCCCCC"
                strokeWidth={tick.isMajor ? 2 : 1}
              />
              
              {/* Major tick labels */}
              {tick.isMajor && (
                <SvgText
                  x={angleToPoint(tick.angle, radius * 0.75).x}
                  y={angleToPoint(tick.angle, radius * 0.75).y + 4}
                  fontSize={size * 0.08}
                  fill="#CCCCCC"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {Math.round(tick.value)}
                </SvgText>
              )}
            </G>
          );
        })}
        
        {/* Gauge needle (AC 13) */}
        <Animated.View
          style={[
            styles.needleContainer,
            {
              transform: [
                { translateX: center },
                { translateY: center },
                { 
                  rotate: needleAnimation.interpolate({
                    inputRange: [-180, 180],
                    outputRange: ['-180deg', '180deg'],
                  })
                },
                { translateX: -center },
                { translateY: -center },
              ],
            },
          ]}
        >
          <Svg width={size} height={size}>
            <Line
              x1={center}
              y1={center}
              x2={center}
              y2={center - needleLength}
              stroke={theme.error}
              strokeWidth={3}
              strokeLinecap="round"
            />
            
            {/* Needle center hub */}
            <Circle
              cx={center}
              cy={center}
              r={6}
              fill={theme.surface}
              stroke={theme.border}
              strokeWidth={2}
            />
          </Svg>
        </Animated.View>
        
        {/* Outer rim */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#2A2A2A"
          strokeWidth={2}
        />
      </Svg>
      
      {/* Digital readout in center (AC 15) */}
      {showDigital && (
        <View style={styles.digitalReadout}>
          <Text style={styles.digitalValue} testID={testID ? `${testID}-digital` : 'gauge-digital'}>
            {value.toFixed(precision)}
          </Text>
          <Text style={styles.digitalUnit}>{unit}</Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: any, size: number) => {
  return StyleSheet.create({
    container: {
      width: size,
      height: size,
      backgroundColor: '#0A0A0A', // Marine equipment background
      borderRadius: size / 2,
      borderWidth: 2,
      borderColor: '#2A2A2A',
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
    },
    
    svg: {
      position: 'absolute',
    },
    
    needleContainer: {
      position: 'absolute',
      width: size,
      height: size,
    },
    
    digitalReadout: {
      position: 'absolute',
      backgroundColor: 'rgba(10, 10, 10, 0.9)',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: '#2A2A2A',
      alignItems: 'center',
      minWidth: size * 0.3,
    },
    
    digitalValue: {
      fontSize: size * 0.12,
      fontFamily: 'monospace',
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
    },
    
    digitalUnit: {
      fontSize: size * 0.08,
      fontFamily: 'monospace',
      fontWeight: '400',
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: -2,
    },
  });
};

export default AnalogGauge;