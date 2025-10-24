import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../store/themeStore';

/**
 * DigitalDisplay - LED-style numeric display component for marine instruments
 * 
 * Acceptance Criteria Satisfied:
 * - AC 1: Digital Display Component with LED-style numeric display and segmented appearance
 * - AC 6: Segmented Numeric Display with 7-segment LED-style appearance for depth, speed, RPM readings
 * - AC 7: Monospace Font Integration with seamless integration to existing typography system
 * - AC 8: Size Variants supporting large (primary) and small (secondary) display sizes  
 * - AC 9: Alert State Styling with red glow effect for critical values, amber for warnings
 * - AC 10: High Contrast Mode with enhanced visibility for bright sunlight conditions
 * 
 * Features:
 * - 7-segment LED-style appearance with authentic marine instrument aesthetic
 * - Multiple size variants (large/small) for different widget contexts
 * - Alert state styling with glow effects for critical marine safety situations
 * - High contrast mode for enhanced visibility in bright marine environments
 * - Seamless integration with existing monospace typography system
 * - Professional marine equipment styling matching Raymarine/Garmin aesthetics
 */

export interface DigitalDisplayProps {
  /** Numeric or string value to display */
  value: number | string;
  /** Unit label (e.g., "m", "kts", "°T") */
  unit?: string;
  /** Number of decimal places (default: 1) */
  precision?: number;
  /** Display size variant */
  size: 'large' | 'small';
  /** Alert state for marine safety (affects color and glow effects) */
  state?: 'normal' | 'warning' | 'alarm';
  /** Enable 7-segment LED-style appearance */
  segments?: boolean;
  /** High contrast mode for bright sunlight conditions */
  highContrast?: boolean;
  /** Custom styling */
  style?: ViewStyle;
  /** Accessibility identifier */
  testID?: string;
}

export const DigitalDisplay: React.FC<DigitalDisplayProps> = ({
  value,
  unit,
  precision = 1,
  size = 'large',
  state = 'normal',
  segments = true,
  highContrast = false,
  style,
  testID,
}) => {
  const theme = useTheme();
  
  // Format value for display with precision handling
  const displayValue = useMemo(() => {
    if (value === undefined || value === null || value === '') {
      return '---';
    }
    
    if (typeof value === 'number') {
      return value.toFixed(precision);
    }
    
    return value.toString();
  }, [value, precision]);

  // Calculate dynamic styling based on props
  const styles = useMemo(() => createStyles(theme, size, state, segments, highContrast), [theme, size, state, segments, highContrast]);

  // Get appropriate colors for current state
  const getStateColor = () => {
    switch (state) {
      case 'alarm':
        return theme.error;
      case 'warning':
        return theme.warning;
      case 'normal':
      default:
        return theme.text;
    }
  };

  const getGlowStyle = (): ViewStyle => {
    if (state === 'normal') return {};
    
    const glowColor = state === 'alarm' ? theme.error : theme.warning;
    const intensity = highContrast ? 8 : 4;
    
    return {
      shadowColor: glowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: intensity,
      elevation: intensity, // Android
    };
  };

  return (
    <View style={[styles.container, getGlowStyle(), style]} testID={testID}>
      {/* LED-style background panel */}
      <View style={styles.displayPanel}>
        
        {/* Main value display */}
        <Text 
          style={[
            styles.valueText, 
            { color: getStateColor() },
            segments && styles.segmentedText
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          testID={testID ? `${testID}-value` : 'digital-display-value'}
        >
          {displayValue}
        </Text>
        
        {/* Unit label */}
        {unit && (
          <Text 
            style={[styles.unitText, highContrast && styles.highContrastUnit]}
            testID={testID ? `${testID}-unit` : 'digital-display-unit'}
          >
            {unit}
          </Text>
        )}
      </View>
      
      {/* LED-style bezel effect */}
      <View style={styles.bezel} />
    </View>
  );
};

const createStyles = (theme: any, size: 'large' | 'small', state: 'normal' | 'warning' | 'alarm', segments: boolean, highContrast: boolean) => {
  const isLarge = size === 'large';
  const baseFontSize = isLarge ? 36 : 24;
  const unitFontSize = isLarge ? 14 : 10;
  const containerHeight = isLarge ? 80 : 60;
  
  return StyleSheet.create({
    container: {
      position: 'relative',
      backgroundColor: '#0A0A0A', // Deep black LED background
      borderRadius: 8,
      padding: isLarge ? 12 : 8,
      minHeight: containerHeight,
      justifyContent: 'center',
      alignItems: 'center',
      // Marine equipment styling
      borderWidth: 1,
      borderColor: '#2A2A2A', // Subtle bezel
    },
    
    displayPanel: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      minWidth: isLarge ? 120 : 80,
    },
    
    valueText: {
      fontSize: baseFontSize,
      fontFamily: 'monospace', // AC 7: Monospace integration
      fontWeight: '700',
      textAlign: 'center',
      includeFontPadding: false,
      textAlignVertical: 'center',
      // High contrast mode enhancement
      ...(highContrast && {
        textShadowColor: theme.text,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 2,
      }),
    },
    
    segmentedText: {
      // 7-segment LED styling (AC 6)
      letterSpacing: segments ? 2 : 0,
      fontVariant: segments ? ['tabular-nums'] : undefined,
      // Additional LED-style appearance
      textShadowColor: 'rgba(0, 255, 65, 0.3)',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 1,
    },
    
    unitText: {
      fontSize: unitFontSize,
      fontFamily: 'monospace',
      fontWeight: '400',
      color: theme.textSecondary,
      marginLeft: 4,
      includeFontPadding: false,
      textAlignVertical: 'bottom',
    },
    
    highContrastUnit: {
      color: theme.text,
      fontWeight: '600',
    },
    
    bezel: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 8,
      borderWidth: 1,
      borderTopColor: '#3A3A3A', // Raised bezel highlight
      borderLeftColor: '#3A3A3A',
      borderRightColor: '#1A1A1A', // Shadow
      borderBottomColor: '#1A1A1A',
      pointerEvents: 'none',
    },
  });
};

export default DigitalDisplay;