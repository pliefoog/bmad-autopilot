import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ViewStyle } from 'react-native';
import { useTheme } from '../../store/themeStore';
import { ANIMATION_DURATIONS } from '../../utils/animationOptimization';
import { getUseNativeDriver } from '../../utils/animationUtils';

/**
 * StatusIndicator - Multi-state LED indicator component for marine safety status
 * 
 * Acceptance Criteria Satisfied:
 * - AC 4: Status Indicator Component with multi-state LED indicators for various marine equipment status
 * - AC 23: Marine Safety Colors with standard green (normal), amber (caution), red (alarm) color coding
 * 
 * Features:
 * - Multi-state LED indicators matching marine safety standards
 * - Standard marine color coding: green (normal), amber (caution), red (alarm)
 * - Pulsing animation for active alarm states
 * - Professional marine equipment appearance with realistic LED styling
 * - Accessibility support with clear status labeling
 * - Size variants for different display contexts (small, medium, large)
 */

export type StatusState = 'normal' | 'caution' | 'alarm' | 'off' | 'unknown';
export type StatusSize = 'small' | 'medium' | 'large';

export interface StatusIndicatorProps {
  /** Current status state */
  status: StatusState;
  /** Indicator size variant */
  size?: StatusSize;
  /** Status label text */
  label?: string;
  /** Enable pulsing animation for alarm states */
  animated?: boolean;
  /** Show status text below indicator */
  showStatusText?: boolean;
  /** Custom styling */
  style?: ViewStyle;
  /** Accessibility identifier */
  testID?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'medium',
  label,
  animated = true,
  showStatusText = true,
  style,
  testID,
}) => {
  const theme = useTheme();
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  
  // Get marine safety colors (AC 23) - theme-aware for red-night mode compliance
  const getStatusColor = (state: StatusState): string => {
    switch (state) {
      case 'normal':
        return theme.success; // Theme-aware success color (green in day/night, red in red-night)
      case 'caution':
        return theme.warning; // Theme-aware warning color (amber/yellow)
      case 'alarm':
        return theme.error; // Theme-aware error color (red)
      case 'off':
        return '#2A2A2A'; // Dark gray for off state
      case 'unknown':
        return '#666666'; // Medium gray for unknown state
      default:
        return '#2A2A2A';
    }
  };
  
  // Get status text
  const getStatusText = (state: StatusState): string => {
    switch (state) {
      case 'normal':
        return 'NORMAL';
      case 'caution':
        return 'CAUTION';
      case 'alarm':
        return 'ALARM';
      case 'off':
        return 'OFF';
      case 'unknown':
        return 'UNKNOWN';
      default:
        return 'OFF';
    }
  };
  
  // Get size dimensions
  const getSizeDimensions = (sizeVariant: StatusSize) => {
    switch (sizeVariant) {
      case 'small':
        return { led: 12, font: 10, container: 16 };
      case 'medium':
        return { led: 16, font: 12, container: 20 };
      case 'large':
        return { led: 24, font: 14, container: 32 };
      default:
        return { led: 16, font: 12, container: 20 };
    }
  };
  
  const dimensions = getSizeDimensions(size);
  
  // Pulsing animation for alarm states
  useEffect(() => {
    if (animated && status === 'alarm') {
      const pulseSequence = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 0.3,
            duration: ANIMATION_DURATIONS.FAST,
            useNativeDriver: getUseNativeDriver(),
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: ANIMATION_DURATIONS.FAST,
            useNativeDriver: getUseNativeDriver(),
          }),
        ])
      );
      pulseSequence.start();
      
      return () => pulseSequence.stop();
    } else {
      // Reset to full opacity for non-alarm states
      Animated.timing(pulseAnimation, {
        toValue: 1,
        duration: ANIMATION_DURATIONS.FAST,
        useNativeDriver: getUseNativeDriver(),
      }).start();
    }
  }, [animated, status, pulseAnimation]);
  
  const statusColor = getStatusColor(status);
  const statusText = getStatusText(status);
  const isActive = status !== 'off' && status !== 'unknown';
  
  const styles = createStyles(theme, dimensions, statusColor, isActive);
  
  return (
    <View style={[styles.container, style]} testID={testID}>
      
      {/* LED Indicator */}
      <Animated.View
        style={[
          styles.ledContainer,
          { opacity: pulseAnimation }
        ]}
        testID={testID ? `${testID}-led` : 'status-led'}
      >
        <View style={styles.ledOuter}>
          <View style={styles.ledInner} />
          {/* Glow effect for active states */}
          {isActive && <View style={styles.ledGlow} />}
        </View>
      </Animated.View>
      
      {/* Status Text */}
      {showStatusText && (
        <Text 
          style={styles.statusText}
          testID={testID ? `${testID}-text` : 'status-text'}
        >
          {statusText}
        </Text>
      )}
      
      {/* Optional Label */}
      {label && (
        <Text 
          style={styles.labelText}
          testID={testID ? `${testID}-label` : 'status-label'}
        >
          {label}
        </Text>
      )}
      
    </View>
  );
};

const createStyles = (
  theme: any, 
  dimensions: { led: number; font: number; container: number }, 
  statusColor: string,
  isActive: boolean
) => {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: dimensions.container * 3,
      paddingVertical: 4,
    },
    
    ledContainer: {
      width: dimensions.container,
      height: dimensions.container,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    
    ledOuter: {
      width: dimensions.led,
      height: dimensions.led,
      borderRadius: dimensions.led / 2,
      backgroundColor: statusColor,
      borderWidth: 1,
      borderColor: '#0A0A0A',
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      // Outer shadow for depth
      shadowColor: statusColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: isActive ? 0.6 : 0.2,
      shadowRadius: 3,
      elevation: 3,
    },
    
    ledInner: {
      width: dimensions.led * 0.7,
      height: dimensions.led * 0.7,
      borderRadius: (dimensions.led * 0.7) / 2,
      backgroundColor: isActive ? theme.text : statusColor,
      opacity: isActive ? 0.8 : 0.3,
    },
    
    ledGlow: {
      position: 'absolute',
      width: dimensions.led * 1.5,
      height: dimensions.led * 1.5,
      borderRadius: (dimensions.led * 1.5) / 2,
      backgroundColor: statusColor,
      opacity: 0.3,
      zIndex: -1,
    },
    
    statusText: {
      fontSize: dimensions.font,
      fontFamily: 'monospace',
      fontWeight: '700',
      color: statusColor,
      textAlign: 'center',
      marginTop: 2,
      letterSpacing: 0.5,
    },
    
    labelText: {
      fontSize: dimensions.font - 2,
      fontFamily: 'monospace',
      fontWeight: '400',
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 2,
      maxWidth: 80,
    },
  });
};

export default StatusIndicator;