import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { WidgetCard } from './WidgetCard';
import { useNmeaStore } from '../core/nmeaStore';
import { useTheme } from '../core/themeStore';

export const CompassWidget: React.FC = () => {
  const heading = useNmeaStore((state: any) => state.nmeaData.heading);
  
  const displayHeading = heading !== undefined && heading !== null 
    ? `${Math.round(heading)}` 
    : '--';
  
  const state = heading === undefined || heading === null ? 'no-data' : 'normal';
  
  return (
    <WidgetCard
      title="COMPASS"
      icon="navigate"
      value={displayHeading}
      unit="°"
      state={state}
    >
      {heading !== undefined && heading !== null && (
        <View 
          style={styles.compassContainer}
          accessible={true}
          accessibilityLabel={`Compass heading ${Math.round(heading)} degrees`}
          accessibilityRole="image"
        >
          <CompassRose heading={heading} />
        </View>
      )}
    </WidgetCard>
  );
};

interface CompassRoseProps {
  heading: number;
}

const CompassRose: React.FC<CompassRoseProps> = ({ heading }) => {
  const theme = useTheme();
  const size = 100;
  const center = size / 2;
  const radius = 40;
  
  // Normalize heading to 0-360
  const normalizedHeading = ((heading % 360) + 360) % 360;
  
  // Cardinal directions - use theme colors for marine-appropriate contrast
  const cardinals = [
    { label: 'N', angle: 0, color: theme.error }, // North in red (marine standard)
    { label: 'E', angle: 90, color: theme.text },
    { label: 'S', angle: 180, color: theme.text },
    { label: 'W', angle: 270, color: theme.text },
  ];
  
  // Calculate positions for cardinal directions
  const getCardinalPosition = (angle: number) => {
    // Rotate by current heading to keep N pointing up
    const adjustedAngle = (angle - normalizedHeading) * (Math.PI / 180);
    return {
      x: center + radius * Math.sin(adjustedAngle),
      y: center - radius * Math.cos(adjustedAngle),
    };
  };
  
  // Tick marks every 30 degrees
  const ticks = Array.from({ length: 12 }, (_, i) => i * 30);
  
  return (
          <Svg height={size} width={size}>
        {/* Compass rose background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke={theme.border}
          strokeWidth="1"
        />
      <G>
        {/* Outer circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme.border}
          strokeWidth="2"
          fill="none"
        />
        
        {/* Tick marks */}
        {ticks.map((angle) => {
          const isCardinal = angle % 90 === 0;
          const tickLength = isCardinal ? 8 : 4;
          const adjustedAngle = (angle - normalizedHeading) * (Math.PI / 180);
          const x1 = center + (radius - tickLength) * Math.sin(adjustedAngle);
          const y1 = center - (radius - tickLength) * Math.cos(adjustedAngle);
          const x2 = center + radius * Math.sin(adjustedAngle);
          const y2 = center - radius * Math.cos(adjustedAngle);
          
          return (
            <Line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={theme.border}
              strokeWidth={isCardinal ? "2" : "1"}
            />
          );
        })}
        
        {/* Cardinal directions */}
        {cardinals.map((cardinal) => {
          const pos = getCardinalPosition(cardinal.angle);
          return (
            <SvgText
              key={cardinal.label}
              x={pos.x}
              y={pos.y + 5}
              fontSize="14"
              fontWeight="bold"
              fill={cardinal.color}
              textAnchor="middle"
            >
              {cardinal.label}
            </SvgText>
          );
        })}
        
        {/* Center dot */}
        <Circle
          cx={center}
          cy={center}
          r={3}
          fill={theme.primary}
        />
        
        {/* Heading needle pointing up */}
        <Line
          x1={center}
          y1={center}
          x2={center}
          y2={center - 25}
          stroke={theme.primary}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
};

const styles = StyleSheet.create({
  compassContainer: {
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
