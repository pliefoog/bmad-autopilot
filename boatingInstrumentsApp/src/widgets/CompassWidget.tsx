import React, { useMemo, useCallback, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { WidgetCard } from './WidgetCard';
import { PrimaryMetricCell } from '../components/PrimaryMetricCell';
import { useNmeaStore } from '../core/nmeaStore';
import { useTheme } from '../core/themeStore';

// Memoized CompassWidget with performance monitoring
export const CompassWidget: React.FC = memo(() => {
  // Optimized store selectors - only select what we need
  const heading = useNmeaStore(useCallback((state: any) => state.nmeaData.heading, []));
  const rateOfTurn = useNmeaStore(useCallback((state: any) => state.nmeaData.rateOfTurn, []));

  // Memoized display values to prevent recalculation on every render
  const displayValues = useMemo(() => {
    const displayHeading = heading !== undefined && heading !== null 
      ? `${Math.round(heading)}` 
      : '--';
      
    const displayROT = rateOfTurn !== undefined && rateOfTurn !== null
      ? `${rateOfTurn > 0 ? '+' : ''}${rateOfTurn.toFixed(1)}`
      : '--';
    
    const state: 'normal' | 'no-data' | 'alarm' | 'highlighted' | undefined = 
      heading === undefined || heading === null ? 'no-data' : 'normal';

    // Determine ROT state for color coding
    const getROTState = (): 'normal' | 'warning' | 'alarm' | undefined => {
      if (rateOfTurn === undefined || rateOfTurn === null) return undefined;
      const absROT = Math.abs(rateOfTurn);
      if (absROT > 10) return 'warning'; // Fast turn
      return 'normal';
    };

    const rotState = getROTState();

    return {
      displayHeading,
      displayROT,
      state,
      rotState,
    };
  }, [heading, rateOfTurn]);

  // Memoized compass rose props to prevent unnecessary re-renders
  const compassRoseProps = useMemo(() => ({
    heading: heading ?? 0,
    shouldRender: heading !== undefined && heading !== null,
  }), [heading]);

  return (
    <WidgetCard
      title="COMPASS"
      icon="navigate"
      state={displayValues.state}
    >
      <View style={styles.metricGrid}>
        <PrimaryMetricCell
          mnemonic="HDG"
          value={displayValues.displayHeading}
          unit="°"
          state={heading !== undefined && heading !== null ? 'normal' : undefined}
          style={styles.metricCell}
        />
        <PrimaryMetricCell
          mnemonic="ROT"
          value={displayValues.displayROT}
          unit="°/min"
          state={displayValues.rotState}
          style={styles.metricCell}
        />
      </View>
      {compassRoseProps.shouldRender && (
        <View 
          style={styles.compassContainer}
          accessible={true}
          accessibilityLabel={`Compass heading ${Math.round(compassRoseProps.heading)} degrees`}
          accessibilityRole="image"
        >
          <CompassRose heading={compassRoseProps.heading} />
        </View>
      )}
    </WidgetCard>
  );
});

CompassWidget.displayName = 'CompassWidget';

interface CompassRoseProps {
  heading: number;
}

// Memoized CompassRose component with optimized SVG rendering
const CompassRose: React.FC<CompassRoseProps> = memo(({ heading }) => {
  const theme = useTheme();
  
  // Memoized constants to prevent recalculation
  const compassConfig = useMemo(() => ({
    size: 100,
    center: 50,
    radius: 40,
  }), []);

  const { size, center, radius } = compassConfig;
  
  // Memoized normalized heading calculation
  const normalizedHeading = useMemo(() => 
    ((heading % 360) + 360) % 360
  , [heading]);
  
  // Memoized cardinal directions with theme colors
  const cardinals = useMemo(() => [
    { label: 'N', angle: 0, color: theme.error }, // North in red (marine standard)
    { label: 'E', angle: 90, color: theme.text },
    { label: 'S', angle: 180, color: theme.text },
    { label: 'W', angle: 270, color: theme.text },
  ], [theme.error, theme.text]);
  
  // Memoized cardinal positions calculation
  const cardinalPositions = useMemo(() => {
    const getCardinalPosition = (angle: number) => {
      const adjustedAngle = (angle - normalizedHeading) * (Math.PI / 180);
      return {
        x: center + radius * Math.sin(adjustedAngle),
        y: center - radius * Math.cos(adjustedAngle),
      };
    };

    return cardinals.map(cardinal => ({
      ...cardinal,
      position: getCardinalPosition(cardinal.angle),
    }));
  }, [cardinals, normalizedHeading, center, radius]);
  
  // Memoized tick marks calculation - only recalculate when heading changes significantly
  const tickMarks = useMemo(() => {
    const ticks = Array.from({ length: 12 }, (_, i) => i * 30);
    
    return ticks.map((angle) => {
      const isCardinal = angle % 90 === 0;
      const tickLength = isCardinal ? 8 : 4;
      const adjustedAngle = (angle - normalizedHeading) * (Math.PI / 180);
      const x1 = center + (radius - tickLength) * Math.sin(adjustedAngle);
      const y1 = center - (radius - tickLength) * Math.cos(adjustedAngle);
      const x2 = center + radius * Math.sin(adjustedAngle);
      const y2 = center - radius * Math.cos(adjustedAngle);
      
      return {
        angle,
        isCardinal,
        x1,
        y1,
        x2,
        y2,
      };
    });
  }, [normalizedHeading, center, radius]);
  
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
        {tickMarks.map((tick) => (
          <Line
            key={tick.angle}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={theme.border}
            strokeWidth={tick.isCardinal ? "2" : "1"}
          />
        ))}
        
        {/* Cardinal directions */}
        {cardinalPositions.map((cardinal) => (
          <SvgText
            key={cardinal.label}
            x={cardinal.position.x}
            y={cardinal.position.y + 5}
            fontSize="14"
            fontWeight="bold"
            fill={cardinal.color}
            textAnchor="middle"
          >
            {cardinal.label}
          </SvgText>
        ))}
        
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
});

CompassRose.displayName = 'CompassRose';

const styles = StyleSheet.create({
  metricGrid: {
    flexDirection: 'row',
    flex: 1,
  },
  metricCell: {
    flex: 1,
  },
  compassContainer: {
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
