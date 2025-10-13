import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { WidgetCard } from './WidgetCard';
import { useNmeaStore } from '../core/nmeaStore';
import { useTheme } from '../core/themeStore';

export const RudderPositionWidget: React.FC = () => {
  const autopilot = useNmeaStore((state: any) => state.nmeaData.autopilot);
  const theme = useTheme();
  
  const rudderAngle = autopilot?.rudderPosition || 0;
  const displayAngle = Math.abs(rudderAngle).toFixed(1);
  const side = rudderAngle >= 0 ? 'STBD' : 'PORT';
  
  // Determine state based on rudder angle limits
  const getState = () => {
    if (autopilot?.rudderPosition === undefined) return 'no-data';
    const absAngle = Math.abs(rudderAngle);
    if (absAngle > 30) return 'alarm'; // Extreme rudder angle warning
    if (absAngle > 20) return 'highlighted'; // Caution zone
    return 'normal';
  };
  
  const state = getState();
  
  return (
    <WidgetCard
      title="RUDDER POSITION"
      icon="boat"
      value={`${displayAngle}°`}
      unit={side}
      state={state}
    >
      <View style={styles.rudderVisualization}>
        <RudderIndicator angle={rudderAngle} theme={theme} />
      </View>
      <Text style={[styles.warningText, { color: theme.textSecondary }]}>
        {state === 'alarm' ? 'EXTREME ANGLE!' : 
         state === 'highlighted' ? 'High Angle' : 
         state === 'no-data' ? 'No Data' : ''}
      </Text>
    </WidgetCard>
  );
};

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

const styles = StyleSheet.create({
  rudderVisualization: {
    alignItems: 'center',
    marginVertical: 8,
  },
  warningText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
  },
});