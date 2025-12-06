import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { useRudderPresentation } from '../presentation/useDataPresentation';
import { MetricDisplayData } from '../types/MetricDisplayData';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import SecondaryMetricCell from '../components/SecondaryMetricCell';

interface RudderWidgetProps {
  id: string;
  title: string;
  width?: number;  // Widget width for responsive scaling
  height?: number; // Widget height for responsive scaling
}

/**
 * RudderWidget - Rudder angle display with SVG visualization per ui-architecture.md v2.3
 * Primary Grid (2×1): Rudder angle with direction + Rate
 * Secondary: SVG rudder visualization with boat outline
 */
export const RudderWidget: React.FC<RudderWidgetProps> = React.memo(({ id, title, width, height }) => {
  const theme = useTheme();
  const { scaleFactor, fontSize, spacing } = useResponsiveScale(width, height);

  
  // Widget state management per ui-architecture.md v2.3
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
  const toggleWidgetPin = useWidgetStore((state) => state.toggleWidgetPin);
  
  // NMEA data selectors - Phase 1 Optimization: Selective field subscriptions with shallow equality
  const rudderAngle = useNmeaStore((state) => state.nmeaData.sensors.autopilot?.[0]?.rudderPosition ?? 0, (a, b) => a === b);
  const rudderTimestamp = useNmeaStore((state) => state.nmeaData.sensors.autopilot?.[0]?.timestamp, (a, b) => a === b);
  
  // Extract rudder data with defaults
  const isStale = !rudderTimestamp;
  
  // Epic 9 Enhanced Presentation System for rudder angle
  const anglePresentation = useDataPresentation('angle');

  // Rudder angle display data using Epic 9 presentation system
  const getRudderAngleDisplay = useCallback((
    presentation: any,
    value: number,
    rudderMnemonic: string = 'RUD',
    fallbackSymbol: string = '°',
    fallbackName: string = 'Degrees'
  ): MetricDisplayData => {
    const presDetails = presentation.presentation;
    
    if (!presentation.isValid || !presDetails) {
      return {
        mnemonic: rudderMnemonic, // NMEA source abbreviation
        value: Math.abs(value).toFixed(1),
        unit: fallbackSymbol, // Presentation symbol
        rawValue: Math.abs(value),
        layout: {
          minWidth: 60,
          alignment: 'right'
        },
        presentation: {
          id: 'fallback',
          name: fallbackName,
          pattern: 'xxx.x'
        },
        status: {
          isValid: true,
          isFallback: true
        }
      };
    }
    
    return {
      mnemonic: rudderMnemonic, // NMEA source abbreviation like "RUD" 
      value: presentation.convertAndFormat(Math.abs(value)),
      unit: presDetails.symbol, // Presentation symbol like "°"
      rawValue: Math.abs(value),
      layout: {
        minWidth: 60,
        alignment: 'right'
      },
      presentation: {
        id: presDetails.id,
        name: presDetails.name,
        pattern: 'xxx.x'
      },
      status: {
        isValid: true,
        isFallback: false
      }
    };
  }, []);

  const rudderAngleDisplay = useMemo(() =>
    getRudderAngleDisplay(anglePresentation, rudderAngle, 'RUD'),
    [anglePresentation, rudderAngle, getRudderAngleDisplay]
  );
  
  // Marine safety evaluation for rudder position
  const getRudderState = useCallback((angle: number) => {
    const absAngle = Math.abs(angle);
    if (absAngle > 30) return 'alarm';    // Extreme rudder angle warning
    if (absAngle > 20) return 'warning';  // Caution zone
    return 'normal';
  }, []);

  const rudderState = getRudderState(rudderAngle);

  // Format rudder display with direction and proper unit conversion
  const formatRudderDisplay = useCallback((angle: number) => {
    if (angle === 0) return { value: '0', unit: rudderAngleDisplay.unit };
    
    const side = angle >= 0 ? 'STBD' : 'PORT';
    
    return {
      value: `${rudderAngleDisplay.value} ${side}`,
      unit: rudderAngleDisplay.unit
    };
  }, [rudderAngleDisplay]);

  const handleLongPressOnPin = useCallback(() => {
    toggleWidgetPin(id);
  }, [id, toggleWidgetPin]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      height: '100%',
      backgroundColor: theme.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: rudderState === 'alarm' ? theme.error :
                   rudderState === 'warning' ? theme.warning :
                   theme.border,
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    title: {
      fontSize: 11,
      fontWeight: 'bold',
      letterSpacing: 0.5,
      color: theme.textSecondary,
      textTransform: 'uppercase',
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    controlButton: {
      padding: 4,
      minWidth: 24,
      alignItems: 'center',
    },
    caret: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.textSecondary,
    },
    pinIcon: {
      fontSize: 12,
      color: theme.primary,
    },
    primaryGrid: {
      alignItems: 'center',
      height: '50%',
      justifyContent: 'center',
    },
    // Horizontal separator between primary and secondary views
    separator: {
      height: 1,
      marginVertical: 12,
    },
    rudderVisualization: {
      alignItems: 'center',
      marginTop: 12,
    },
    statusIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: rudderState === 'alarm' ? theme.error :
                       rudderState === 'warning' ? theme.warning :
                       theme.success,
      opacity: isStale ? 0.3 : 1,
    },
    warningText: {
      fontSize: 12,
      fontWeight: 'bold',
      textAlign: 'center',
      marginTop: 8,
      color: rudderState === 'alarm' ? theme.error :
             rudderState === 'warning' ? theme.warning :
             theme.textSecondary,
    },
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.8}
    >
      {/* Widget Header with Title and Controls */}
      <View style={styles.header}>
        <Text style={[styles.title, { fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5, textTransform: 'uppercase', color: theme.textSecondary }]}>{title}</Text>
        
        {/* Pin Control */}
        {pinned && (
          <View style={styles.controls}>
            <TouchableOpacity
              onLongPress={handleLongPressOnPin}
              style={styles.controlButton}
              testID={`pin-button-${id}`}
            >
              <UniversalIcon name="pin" size={16} color={theme.iconPrimary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Primary Grid (1×1): Rudder angle with direction */}
      <View style={styles.primaryGrid}>
        <PrimaryMetricCell
          data={rudderAngleDisplay}
          state={getRudderState(rudderAngle)}
          fontSize={{
            mnemonic: fontSize.primaryLabel,
            value: fontSize.primaryValue,
            unit: fontSize.primaryUnit,
          }}
        />
      </View>

      {/* Secondary: SVG rudder visualization */}
      {/* Horizontal separator */}
      <View style={[styles.separator, { backgroundColor: theme.border }]} />

      {/* RUDDER VISUALIZATION */}
      <View style={styles.rudderVisualization}>
          <RudderIndicator angle={rudderAngle} theme={theme} />
          <Text style={styles.warningText}>
            {rudderState === 'alarm' ? 'EXTREME ANGLE!' : 
             rudderState === 'warning' ? 'High Angle' : 
             isStale ? 'No Data' : 'Normal Position'}
          </Text>
        </View>
    </TouchableOpacity>
  );
});

interface RudderIndicatorProps {
  angle: number;
  theme: any;
}

const RudderIndicator: React.FC<RudderIndicatorProps> = ({ angle, theme }) => {
  const size = 80;
  const center = size / 2;
  
  // Clamp angle to ±45 degrees for visualization
  const clampedAngle = Math.max(-45, Math.min(45, angle));
  
  // Convert angle to SVG rotation (negative for correct direction)
  const rotation = -clampedAngle;
  
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Boat hull outline */}
      <Polygon
        points={`${center},5 ${center-15},${size-10} ${center+15},${size-10}`}
        fill="none"
        stroke={theme.border}
        strokeWidth="2"
      />
      
      {/* Center point */}
      <Circle
        cx={center}
        cy={center + 10}
        r="2"
        fill={theme.text}
      />
      
      {/* Rudder indicator */}
      <Line
        x1={center}
        y1={center + 10}
        x2={center}
        y2={center + 25}
        stroke={angle === 0 ? theme.success : 
               Math.abs(angle) > 30 ? theme.error :
               Math.abs(angle) > 20 ? theme.warning : theme.primary}
        strokeWidth="4"
        strokeLinecap="round"
        transform={`rotate(${rotation} ${center} ${center + 10})`}
      />
      
      {/* Angle reference marks */}
      <Line x1={center-20} y1={center+10} x2={center-15} y2={center+10} stroke={theme.border} strokeWidth="1" />
      <Line x1={center+15} y1={center+10} x2={center+20} y2={center+10} stroke={theme.border} strokeWidth="1" />
      
      {/* Port/Starboard labels */}
      <SvgText 
        x={center-25} 
        y={center+15} 
        fontSize="8" 
        fill={theme.textSecondary}
        textAnchor="middle"
      >
        P
      </SvgText>
      <SvgText 
        x={center+25} 
        y={center+15} 
        fontSize="8" 
        fill={theme.textSecondary}
        textAnchor="middle"
      >
        S
      </SvgText>
    </Svg>
  );
};

export default RudderWidget;